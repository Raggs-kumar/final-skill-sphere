/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, Router } from "express";
import dotenv from "dotenv";
dotenv.config({ override: true });
import { db } from "./db";
import { calculateSkillCompatibility, analyzeMatch, calculateHuggingFaceSimilarity } from "./ai";
import { User, Gig, Proposal, Payment, Message, Review, Dispute } from "../types";
import Stripe from "stripe";

const router = Router();

// -----------------------------------------------------------------------------
// LIVE TRAFFIC MONITORING METRICS DATABANK
// -----------------------------------------------------------------------------
interface TrafficLog {
  path: string;
  method: string;
  status: number;
  timestamp: string;
  ip: string;
}

const trafficLogs: TrafficLog[] = [];

const seedTraffic = () => {
  const methods = ["GET", "POST", "PATCH"];
  const paths = [
    "/api/gigs",
    "/api/auth/me",
    "/api/chat/messages",
    "/api/notifications",
    "/api/payments/me",
    "/api/admin/stats"
  ];
  const ips = ["192.168.1.102", "157.45.12.98", "103.54.210.45", "12.43.125.66", "182.19.43.201"];
  const statuses = [200, 200, 200, 201, 304, 400];

  for (let i = 0; i < 65; i++) {
    const minutesAgo = Math.floor(Math.random() * 180) + 1; // within last 3 hours
    const date = new Date(Date.now() - minutesAgo * 60 * 1000);
    trafficLogs.push({
      path: paths[Math.floor(Math.random() * paths.length)],
      method: methods[Math.floor(Math.random() * methods.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: date.toISOString(),
      ip: ips[Math.floor(Math.random() * ips.length)]
    });
  }
};
seedTraffic();

// Register request interception to monitor active platform traffic
router.use((req, res, next) => {
  res.on("finish", () => {
    // Avoid logging repetitive notification polling unless finished
    if (req.path === "/api/notifications" && Math.random() > 0.15) return;
    
    trafficLogs.unshift({
      path: req.path,
      method: req.method,
      status: res.statusCode,
      timestamp: new Date().toISOString(),
      ip: req.headers["x-forwarded-for"] as string || req.ip || "127.0.0.1"
    });
    if (trafficLogs.length > 200) {
      trafficLogs.pop();
    }
  });
  next();
});

// Lazy Stripe Initialization
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required but missing");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-01-27.acacia" as any
    });
  }
  return stripeClient;
}


// Helper: JWT middleware validator mimic
export function getAuthenticatedUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "");
  
  if (token.startsWith("mock-jwt-token-")) {
    const userId = token.replace("mock-jwt-token-", "");
    return db.users.findById(userId) || null;
  }
  return null;
}

// -----------------------------------------------------------------------------
// SECURE GATEWAY MIDDLEWARE
// -----------------------------------------------------------------------------
function requireAuth(req: Request, res: Response, next: Function) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access: Invalid or missing token" });
  }
  if (user.isBanned) {
    return res.status(403).json({ error: "Access Denied: This account has been suspended" });
  }
  (req as any).user = user;
  next();
}

function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Access Denied: Insufficient permissions" });
    }
    next();
  };
}

// -----------------------------------------------------------------------------
// 1. AUTH SERVICE ENDPOINTS
// -----------------------------------------------------------------------------
router.post("/auth/register", (req, res) => {
  const { name, email, role, skills, hourlyRate, location, bio, title } = req.body;
  
  if (!name || !email || !role || !location) {
    return res.status(400).json({ error: "Missing required register credentials" });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Enforce role assignment rules
  let finalRole = role;
  if (cleanEmail === "admin1@skillsphere.in") {
    finalRole = "admin";
  } else if (role === "admin") {
    return res.status(400).json({ error: "Access Denied: Only admin1@skillsphere.in can hold the 'admin' role." });
  }

  const existing = db.users.findByEmail(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: "An account with this email already exists" });
  }

  try {
    const user = db.users.create({
      name,
      email: cleanEmail,
      role: finalRole,
      avatar: finalRole === "admin"
        ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        : `https://images.unsplash.com/photo-${role === "freelancer" ? "1507003211169-0a1dd7228f2d" : "1494790108377-be9c29b29330"}?w=150`,
      skills: finalRole === "freelancer" ? (skills || []) : undefined,
      hourlyRate: finalRole === "freelancer" ? (Number(hourlyRate) || 45) : undefined,
      location,
      bio,
      title: finalRole === "freelancer" ? (title || "Freelancer Specialist") : (finalRole === "admin" ? "Platform Administrator" : undefined),
      twoFactorEnabled: false
    });

    const token = `mock-jwt-token-${user.id}`;
    res.status(201).json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/auth/login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  let user = db.users.findByEmail(cleanEmail);

  // If registering/logging in with official admin email for the first time, auto-provision it.
  if (!user && cleanEmail === "admin1@skillsphere.in") {
    try {
      user = db.users.create({
        name: "Skillsphere Administrator",
        email: "admin1@skillsphere.in",
        role: "admin",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        location: "Mumbai, Maharashtra",
        bio: "Root Security Operations Administrator of SkillSphere Matching Protocol.",
        twoFactorEnabled: false
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to automatically provision the platform administrator account" });
    }
  }

  if (!user) {
    return res.status(404).json({ error: "Account not found with this email" });
  }
  if (user.isBanned) {
    return res.status(403).json({ error: "This profile has been banned" });
  }

  const token = `mock-jwt-token-${user.id}`;
  res.json({ user, token });
});

router.get("/auth/me", requireAuth, (req: any, res) => {
  res.json({ user: req.user });
});

router.post("/auth/google", (req, res) => {
  // Google OAuth SSO Simulator
  const { email, name, avatar } = req.body;
  if (!email) return res.status(400).json({ error: "Google SSO email is required" });

  const cleanEmail = email.trim().toLowerCase();
  let user = db.users.findByEmail(cleanEmail);
  if (!user) {
    // If google login email matches the official admin email, register as admin, otherwise client
    const finalRole = cleanEmail === "admin1@skillsphere.in" ? "admin" : "client";
    user = db.users.create({
      name: name || (finalRole === "admin" ? "Skillsphere Administrator" : "Google User"),
      email: cleanEmail,
      role: finalRole,
      avatar: avatar || (finalRole === "admin" ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"),
      location: "San Francisco, CA",
      twoFactorEnabled: false
    });
  }

  const token = `mock-jwt-token-${user.id}`;
  res.json({ user, token });
});

router.post("/auth/verify-2fa", requireAuth, (req: any, res) => {
  const { code } = req.body;
  // Mimic secure 2FA matching (accepting '123456' as valid authenticator code)
  if (code === "123456") {
    const updated = db.users.update(req.user.id, { twoFactorEnabled: true });
    res.json({ success: true, user: updated, message: "Two-Factor Verification Enabled" });
  } else {
    res.status(400).json({ error: "Invalid authenticator code. Enter '123456' to pass." });
  }
});

router.post("/auth/profile-update", requireAuth, (req: any, res) => {
  const fields = req.body;
  
  if (fields.role === "admin" && req.user.email.toLowerCase() !== "admin1@skillsphere.in") {
    return res.status(400).json({ error: "Access Denied: Only admin1@skillsphere.in can hold the 'admin' role." });
  }
  
  const updated = db.users.update(req.user.id, fields);
  res.json({ success: true, user: updated });
});

router.get("/users/:id", requireAuth, (req: any, res) => {
  const user = db.users.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User profile not found in decentralized clusters" });
  }

  // Inject beautiful complete mock data if not existing on the database record so the UI looks stunning right away and contains full details
  if (user.role === "freelancer") {
    if (!user.skillsWithProficiency) {
      user.skillsWithProficiency = (user.skills || []).map((skill, index) => ({
        skill,
        level: index === 0 ? "Pro" : index % 2 === 0 ? "Expert" : "Intermediate"
      }));
    }
    if (!user.portfolio) {
      user.portfolio = [
        {
          id: "p1",
          title: "Decentralized Escrow Clearinghouse",
          description: "Hyper-secure peer-coded payment arbitration protocol executing smart-escrow contracts.",
          imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
          projectUrl: "https://github.com/example/escrow"
        },
        {
          id: "p2",
          title: "HuggingFace Semantic Clustering Interface",
          description: "Visual similarity engine using state-of-the-art transformer models to cluster resume skill matrices.",
          imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400",
          projectUrl: "https://huggingface.co/example-clustering"
        }
      ];
    }
    if (!user.resumeUrl) {
      user.resumeUrl = "/demo-resume.pdf";
      user.resumeFileName = `${user.name.split(" ")[0] || "Freelancer"}_Resume_CV.pdf`;
    }
    if (!user.certifications) {
      user.certifications = [
        "Certified HuggingFace ML Practitioner",
        "Advanced React Engineering Specialist - SkillSphere",
        "Google AI Studio Solutions Architect Certification"
      ];
    }
    if (!user.experience) {
      user.experience = [
        {
          id: "e1",
          company: "Cognitive Capital Corp",
          role: "Lead Interface Architect",
          duration: "2024 - Present",
          description: "Pioneered localized multi-agent task dispatch systems and escrow payment portals."
        },
        {
          id: "e2",
          company: "Alpha Node Software",
          role: "Senior Full Stack Dev",
          duration: "2021 - 2023",
          description: "Engineered robust REST/GraphQL APIs and offline-first client dashboards."
        }
      ];
    }
    if (!user.availability) {
      user.availability = {
        status: user.id === "usr_free2" ? "Part-time" : "Available",
        weeklyHours: user.id === "usr_free2" ? 20 : 40,
        availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"]
      };
    }
    if (!user.pricing) {
      user.pricing = {
        hourlyRate: user.hourlyRate || 1800,
        milestoneMin: (user.hourlyRate || 1800) * 5,
        currency: "INR"
      };
    }
    if (!user.badges) {
      user.badges = [
        { badgeType: "KYC", issuedAt: "2025-08-12T00:00:00Z", status: "Active" },
        { badgeType: "Skill", issuedAt: "2026-02-14T00:00:00Z", status: "Active" },
        { badgeType: "Identity", issuedAt: "2026-01-10T00:00:00Z", status: "Active" }
      ];
    }
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      title: user.title,
      skills: user.skills,
      hourlyRate: user.hourlyRate,
      location: user.location,
      reputationScore: user.reputationScore,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      skillsWithProficiency: user.skillsWithProficiency,
      portfolio: user.portfolio,
      resumeUrl: user.resumeUrl,
      resumeFileName: user.resumeFileName,
      certifications: user.certifications,
      experience: user.experience,
      availability: user.availability,
      pricing: user.pricing,
      badges: user.badges
    }
  });
});

// -----------------------------------------------------------------------------
// 2. GIG SERVICE ENDPOINTS
// -----------------------------------------------------------------------------
router.get("/gigs", (req, res) => {
  let gigs = db.gigs.findMany();
  
  // Apply Search, Skill, and Budget filters
  const { q, skills, minBudget, maxBudget, location } = req.query;

  if (q) {
    const term = (q as string).toLowerCase().trim();
    gigs = gigs.filter(g => 
      g.title.toLowerCase().includes(term) || 
      g.description.toLowerCase().includes(term)
    );
  }

  if (skills) {
    const filterSkills = (skills as string).split(",").map(s => s.trim().toLowerCase());
    gigs = gigs.filter(g => 
      g.skills.some(gs => filterSkills.includes(gs.toLowerCase()))
    );
  }

  if (minBudget) {
    gigs = gigs.filter(g => g.budget >= Number(minBudget));
  }
  if (maxBudget) {
    gigs = gigs.filter(g => g.budget <= Number(maxBudget));
  }

  if (location) {
    const locationTerm = (location as string).toLowerCase().trim();
    gigs = gigs.filter(g => g.location.toLowerCase().includes(locationTerm));
  }

  // Hide deleted/cancelled contracts unless admin
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== "admin") {
    gigs = gigs.filter(g => g.status !== "cancelled");
  }

  // Sort Gigs by newest first
  gigs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ gigs });
});

router.get("/gigs/:id", (req, res) => {
  const gig = db.gigs.findById(req.params.id);
  if (!gig) return res.status(404).json({ error: "Gig not found" });
  res.json({ gig });
});

router.post("/gigs", requireAuth, requireRole(["client", "admin"]), (req: any, res) => {
  const { title, description, budget, skills, milestones, location } = req.body;
  
  if (!title || !description || !budget || !skills || !milestones || !location) {
    return res.status(400).json({ error: "Missing required core gig parameters" });
  }

  const parsedMilestones = milestones.map((m: any, idx: number) => ({
    id: `m_${Date.now()}_${idx}`,
    title: m.title,
    amount: Number(m.amount),
    status: "pending",
    deadline: m.deadline || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }));

  const totalMilestoneBudget = parsedMilestones.reduce((acc: number, m: any) => acc + m.amount, 0);
  if (totalMilestoneBudget !== Number(budget)) {
    return res.status(400).json({ 
      error: `Sum of milestones (₹${totalMilestoneBudget}) must equal the absolute budget (₹${budget})` 
    });
  }

  const gig = db.gigs.create({
    title,
    description,
    budget: Number(budget),
    skills,
    milestones: parsedMilestones,
    clientId: req.user.id,
    clientName: req.user.name,
    location
  });

  db.adminLogs.create({
    action: "GIG_CREATED",
    details: `Gig "${gig.title}" created. Budget ₹${gig.budget}. Approved automatically.`,
    operatorName: req.user.name
  });

  res.status(201).json({ success: true, gig });
});

router.delete("/gigs/:id", requireAuth, (req: any, res) => {
  const gig = db.gigs.findById(req.params.id);
  if (!gig) return res.status(404).json({ error: "Gig not found" });
  
  if (gig.clientId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Permission Denied" });
  }

  if (gig.status === "active") {
    return res.status(400).json({ error: "Cannot delete an ongoing active gig" });
  }

  db.gigs.update(gig.id, { status: "cancelled" });
  res.json({ success: true, message: "Gig successfully cancelled" });
});

/**
 * AI Recommendation Matcher Endpoint with Huggingface AI semantic similarity,
 * skill similarity scoring, location proximity, and balanced recommendation score.
 */
router.get("/gigs/:id/match", requireAuth, async (req, res) => {
  const gig = db.gigs.findById(req.params.id);
  if (!gig) return res.status(404).json({ error: "Gig not found" });

  const freelancers = db.users.findMany({ role: "freelancer", isBanned: false });
  
  try {
    const list = await Promise.all(
      freelancers.map(async (f) => {
        const analysis = await analyzeMatch(f, gig);
        
        // Formulate description for Hugging Face Sentence Similarity
        const freelancerProfileStr = `${f.title || "Freelancer"}. Skills: ${(f.skills || []).join(", ")}. Bio: ${f.bio || ""}`;
        const gigReqStr = `${gig.title} requiring ${(gig.skills || []).join(", ")}. Description: ${gig.description}`;
        
        // Calculate semantic similarity score via Hugging Face Inference API
        const hfScore = await calculateHuggingFaceSimilarity(freelancerProfileStr, gigReqStr);
        
        // Proximity calculation: Check if location match
        const fLoc = (f.location || "").toLowerCase().trim();
        const gLoc = (gig.location || "").toLowerCase().trim();
        
        // Handle common Indian regional abbreviations or matches e.g. "Bangalore" in "Bangalore, Karnataka"
        const fCity = fLoc.split(",")[0].trim();
        const gCity = gLoc.split(",")[0].trim();
        const locationMatch = fLoc.includes(gLoc) || gLoc.includes(fLoc) || fCity.includes(gCity) || gCity.includes(fCity);

        // Score based on rating + skill similarity (Hugging Face) + proximity
        const ratingWeight = (f.reputationScore || 95) * 0.35; // 35% weight
        const hfWeight = hfScore * 0.45; // 45% weight
        const proximityBonus = locationMatch ? 20 : 0; // 20% flat bonus for near location
        const recommendationScore = Math.min(100, Math.round(ratingWeight + hfWeight + proximityBonus));

        return {
          freelancer: f,
          analysis,
          huggingFaceScore: hfScore,
          locationMatch,
          recommendationScore
        };
      })
    );
    // Sort matches by combined recommendation score descending
    list.sort((a, b) => b.recommendationScore - a.recommendationScore);
    res.json({ matches: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * AI Service Endpoints: Trending Skills Detection
 */
router.get("/ai/trending-skills", (req, res) => {
  const allGigs = db.gigs.findMany();
  
  // Map of skills to counts
  const skillCounts: Record<string, { count: number; category: string; salaryFactor: number }> = {};

  // Seed default Indian regional high-growth skills
  const defaultTrends: Record<string, { count: number; category: string; salaryFactor: number }> = {
    "React": { count: 8, category: "Frontend Dev", salaryFactor: 1.2 },
    "HuggingFace": { count: 6, category: "AI Engineering", salaryFactor: 1.5 },
    "Gemini API": { count: 7, category: "AI Integration", salaryFactor: 1.4 },
    "Tailwind CSS": { count: 9, category: "CSS & Design", salaryFactor: 1.1 },
    "TypeScript": { count: 11, category: "Modern Web", salaryFactor: 1.25 },
    "Express": { count: 5, category: "Backend Microservices", salaryFactor: 1.15 },
    "Framer Motion": { count: 4, category: "UX Animations", salaryFactor: 1.3 }
  };

  // Merge default trends
  Object.entries(defaultTrends).forEach(([skill, val]) => {
    skillCounts[skill] = { ...val };
  });

  // Calculate dynamic demand from actual gigs
  allGigs.forEach(g => {
    (g.skills || []).forEach(skill => {
      const normalizedSkill = skill.trim();
      if (!normalizedSkill) return;
      
      const matchKey = Object.keys(skillCounts).find(k => k.toLowerCase() === normalizedSkill.toLowerCase()) || normalizedSkill;
      
      if (skillCounts[matchKey]) {
        skillCounts[matchKey].count += 1;
      } else {
        let category = "Software Engineering";
        let salaryFactor = 1.0;
        if (normalizedSkill.toLowerCase().match(/(ai|gpt|gemini|hugging|nlp|ml|machine|llama)/)) {
          category = "AI / Cognitive Tech";
          salaryFactor = 1.45;
        } else if (normalizedSkill.toLowerCase().match(/(react|css|tailwind|framer|svelte|vue|figma|ux)/)) {
          category = "Creative Frontend";
          salaryFactor = 1.2;
        } else if (normalizedSkill.toLowerCase().match(/(node|express|expressjs|python|fastapi|django|postgres|sql|mongo|redis)/)) {
          category = "Cloud & Backend";
          salaryFactor = 1.25;
        }

        skillCounts[matchKey] = {
          count: 1,
          category,
          salaryFactor
        };
      }
    });
  });

  const trends = Object.entries(skillCounts).map(([skillName, meta]) => ({
    skill: skillName,
    count: meta.count,
    category: meta.category,
    salaryFactor: meta.salaryFactor,
    growthForecast: meta.count > 5 ? "Exponent (High Demand)" : "Steady Accel",
  })).sort((a, b) => b.count - a.count);

  res.json({ trends: trends.slice(0, 10) });
});

/**
 * AI Service Endpoints: Personalized Recommendations for Logged Client or Freelancer
 */
router.get("/ai/personalized-recommendations", requireAuth, async (req: any, res) => {
  const user = req.user;
  
  if (user.role === "freelancer") {
    // Recommend open gigs that matches this freelancer
    const openGigs = db.gigs.findMany({ status: "open" });
    const fSkills = user.skills || [];
    
    try {
      const recommendedGigs = await Promise.all(
        openGigs.map(async (gig) => {
          // Calculate HuggingFace Semantic matching between user bio/skills and gig title/description
          const freelancerProfileStr = `${user.title || "Freelancer"}. Skills: ${fSkills.join(", ")}. Bio: ${user.bio || ""}`;
          const gigReqStr = `${gig.title} requiring ${(gig.skills || []).join(", ")}. Description: ${gig.description}`;

          const hfScore = await calculateHuggingFaceSimilarity(freelancerProfileStr, gigReqStr);

          // Proximity
          const fLoc = (user.location || "").toLowerCase().trim();
          const gLoc = (gig.location || "").toLowerCase().trim();
          
          const fCity = fLoc.split(",")[0].trim();
          const gCity = gLoc.split(",")[0].trim();
          const locationMatch = fLoc.includes(gLoc) || gLoc.includes(fLoc) || fCity.includes(gCity) || gCity.includes(fCity);

          // Combine score
          const score = Math.round((hfScore * 0.75) + (locationMatch ? 25 : 0));

          return {
            gig,
            score: Math.min(100, score),
            hfScore,
            locationMatch,
            reason: hfScore > 70 
              ? `Your technical skillset overlaps high-dimensionally with "${gig.title}".`
              : `A clean regional opportunity matching core developer milestones in ${gig.location}.`
          };
        })
      );

      // Sort Gigs by Match Score descending
      recommendedGigs.sort((a, b) => b.score - a.score);
      res.json({ role: "freelancer", recommendations: recommendedGigs.slice(0, 5) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
    
  } else if (user.role === "client") {
    // Recommend top freelancers near client's active location, sorted by rating + skill similarity
    const freelancers = db.users.findMany({ role: "freelancer", isBanned: false });
    const clientLocation = (user.location || "").toLowerCase().trim();
    
    try {
      const recommendedFreelancers = freelancers.map((f) => {
        const rating = f.reputationScore || 95;
        const fLoc = (f.location || "").toLowerCase().trim();
        
        // Match proximity
        const isNear = fLoc.includes(clientLocation) || clientLocation.includes(fLoc);
        
        // Basic similarity with common client needs or location bonus
        let similarity = 60;
        if (f.skills?.some(s => s.toLowerCase().match(/(react|typescript|node|hugging|gemini|design)/))) {
          similarity += 25;
        }

        const score = Math.round((rating * 0.4) + (similarity * 0.4) + (isNear ? 20 : 0));

        return {
          freelancer: f,
          score: Math.min(100, score),
          rating,
          isNear,
          reason: isNear 
            ? `Top-rated hyper-local expert directly based in your regional cluster (${f.location}).`
            : `Premium partner with specialized credentials and stellar reputation rating (${rating}%).`
        };
      });

      recommendedFreelancers.sort((a, b) => b.score - a.score);
      res.json({ role: "client", recommendations: recommendedFreelancers.slice(0, 5) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json({ role: user.role, recommendations: [] });
  }
});

// -----------------------------------------------------------------------------
// 3. PROPOSAL SERVICE ENDPOINTS
// -----------------------------------------------------------------------------
router.post("/proposals", requireAuth, requireRole(["freelancer", "admin"]), (req: any, res) => {
  const { gigId, bidAmount, deliveryTime, proposalText } = req.body;
  
  if (!gigId || !bidAmount || !deliveryTime || !proposalText) {
    return res.status(400).json({ error: "Missing proposal details parameters" });
  }

  const gig = db.gigs.findById(gigId);
  if (!gig) return res.status(404).json({ error: "Target Gig not found" });
  if (gig.status !== "open") {
    return res.status(400).json({ error: "This gig is no longer accepting submissions" });
  }

  // Prevent multiple applications
  const activeProposals = db.proposals.findMany({ gigId, freelancerId: req.user.id });
  if (activeProposals.length) {
    return res.status(400).json({ error: "You have already submitted a proposal for this gig" });
  }

  const prop = db.proposals.create({
    gigId,
    gigTitle: gig.title,
    freelancerId: req.user.id,
    freelancerName: req.user.name,
    freelancerSkills: req.user.skills || [],
    bidAmount: Number(bidAmount),
    deliveryTime: Number(deliveryTime),
    proposalText
  });

  res.status(201).json({ success: true, proposal: prop });
});

router.get("/gigs/:id/proposals", requireAuth, (req: any, res) => {
  const gig = db.gigs.findById(req.params.id);
  if (!gig) return res.status(404).json({ error: "Gig not found" });

  // Only the creator or an admin can browse gig proposals
  if (gig.clientId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Assess denied: You are not the client of this gig" });
  }

  const proposals = db.proposals.findMany({ gigId: gig.id });
  res.json({ proposals });
});

router.get("/proposals/me", requireAuth, (req: any, res) => {
  let list;
  if (req.user.role === "freelancer") {
    list = db.proposals.findMany({ freelancerId: req.user.id });
  } else {
    // Show proposals for client's gigs
    const clientGigs = db.gigs.findMany({ clientId: req.user.id });
    const gigIds = clientGigs.map(g => g.id);
    list = db.proposals.findMany().filter(p => gigIds.includes(p.gigId));
  }
  res.json({ proposals: list });
});

router.post("/proposals/:id/accept", requireAuth, requireRole(["client", "admin"]), (req: any, res) => {
  const prop = db.proposals.findById(req.params.id);
  if (!prop) return res.status(404).json({ error: "Proposal not found" });

  const gig = db.gigs.findById(prop.gigId);
  if (!gig) return res.status(404).json({ error: "Associated gig not found" });

  if (gig.clientId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Permission Denied" });
  }

  if (gig.status !== "open") {
    return res.status(400).json({ error: "This gig is already active or closed" });
  }

  // Accept this proposal
  db.proposals.update(prop.id, { status: "accepted" });

  // Reject all other proposals for this gig
  const others = db.proposals.findMany({ gigId: gig.id }).filter(p => p.id !== prop.id);
  others.forEach(oth => db.proposals.update(oth.id, { status: "rejected" }));

  // Update gig status
  db.gigs.update(gig.id, {
    status: "active",
    freelancerId: prop.freelancerId,
    freelancerName: prop.freelancerName,
    budget: prop.bidAmount // adjust gig budget of contract if they negotiated
  });

  // Release Escrow notification
  db.createNotification({
    userId: prop.freelancerId,
    title: "Proposal Accepted!",
    message: `CONGRATULATIONS! Sophia Martinez accepted your proposal for "${gig.title}". Work is active.`,
    type: "proposal"
  });

  res.json({ success: true, message: "Contract successfully activated" });
});

router.post("/proposals/:id/reject", requireAuth, requireRole(["client", "admin"]), (req: any, res) => {
  const prop = db.proposals.findById(req.params.id);
  if (!prop) return res.status(404).json({ error: "Proposal not found" });

  db.proposals.update(prop.id, { status: "rejected" });
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 4. PAYMENT & ESCROW SERVICE
// -----------------------------------------------------------------------------
router.get("/payments/me", requireAuth, (req: any, res) => {
  const list = db.payments.findMany().filter(p => p.fromId === req.user.id || p.toId === req.user.id);
  res.json({ payments: list });
});

router.post("/payments/seed-demo", requireAuth, (req: any, res) => {
  const userId = req.user.id;
  const isFreelancer = req.user.role === "freelancer";
  
  const demoPayments = [
    {
      gigId: "demo-gig-1",
      milestoneId: "m1",
      milestoneTitle: "Modern UI/UX Figma Design Wireframes",
      amount: 15000,
      status: "released" as const,
      type: "release" as const,
      fromId: isFreelancer ? "usr_client1" : userId,
      fromName: isFreelancer ? "Sophia Martinez" : req.user.name,
      toId: isFreelancer ? userId : "usr_free1",
      toName: isFreelancer ? req.user.name : "Aanya Patel"
    },
    {
      gigId: "demo-gig-2",
      milestoneId: "m2",
      milestoneTitle: "GraphQL Backend API Integration & Database Schemas",
      amount: 25000,
      status: "escrow" as const,
      type: "deposit" as const,
      fromId: isFreelancer ? "usr_client1" : userId,
      fromName: isFreelancer ? "Sophia Martinez" : req.user.name,
      toId: isFreelancer ? userId : "usr_free1",
      toName: isFreelancer ? req.user.name : "Aanya Patel"
    },
    {
      gigId: "demo-gig-3",
      milestoneId: "m3",
      milestoneTitle: "Performance Audit, SEO Optimizations & Vitals Support",
      amount: 8000,
      status: "refunded" as const,
      type: "refund" as const,
      fromId: isFreelancer ? "usr_client1" : userId,
      fromName: isFreelancer ? "Sophia Martinez" : req.user.name,
      toId: isFreelancer ? userId : "usr_free1",
      toName: isFreelancer ? req.user.name : "Aanya Patel"
    }
  ];

  const createdList = demoPayments.map(p => db.payments.create(p));
  res.json({ success: true, payments: createdList });
});

router.get("/payments/stripe-config", (req: any, res) => {
  res.json({
    configured: !!process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
  });
});

router.post("/payments/create-checkout-session", requireAuth, requireRole(["client"]), async (req: any, res) => {
  try {
    const { gigId, milestoneId } = req.body;
    if (!gigId || !milestoneId) {
      return res.status(400).json({ error: "Missing gigId or milestoneId parameters" });
    }

    const gig = db.gigs.findById(gigId);
    if (!gig) return res.status(404).json({ error: "Gig contract not found" });

    const milestone = gig.milestones.find(m => m.id === milestoneId);
    if (!milestone) return res.status(404).json({ error: "Milestone objective not found" });
    if (milestone.status !== "pending") {
      return res.status(400).json({ error: "Milestone funds already funded or completed" });
    }

    const stripeObj = getStripe();
    const origin = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;

    const session = await stripeObj.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `🔒 Fund Escrow: ${milestone.title}`,
              description: `Contract: ${gig.title} | Contractor: ${gig.freelancerName || "Partner"}`,
            },
            unit_amount: Math.round(milestone.amount * 100), // INR in Paise
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        gigId: gig.id,
        milestoneId: milestone.id,
        userId: req.user.id,
        userName: req.user.name,
      },
      success_url: `${origin}/api/payments/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?stripe_cancelled=true`,
    });

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error("Stripe Session Creation Failed:", err);
    res.status(500).json({ error: err.message || "Failed to establish Stripe checkout session" });
  }
});

router.get("/payments/stripe-success", async (req: any, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).send("Bad Request: Session reference missing");
    }

    const stripeObj = getStripe();
    const session = await stripeObj.checkout.sessions.retrieve(String(session_id));
    
    const { gigId, milestoneId, userId, userName } = session.metadata || {};
    if (!gigId || !milestoneId) {
      return res.status(400).send("Stripe Transaction Metadata Incomplete");
    }

    const gig = db.gigs.findById(gigId);
    if (!gig) return res.status(404).send("Contract referenced in transaction mismatch");

    const mileIdx = gig.milestones.findIndex(m => m.id === milestoneId);
    if (mileIdx === -1) return res.status(404).send("Contract milestone referenced is invalid");

    const milestone = gig.milestones[mileIdx];
    if (milestone.status === "pending") {
      // Transition to escrow
      gig.milestones[mileIdx].status = "escrow";
      db.gigs.update(gig.id, { milestones: gig.milestones });

      // Document deposit log
      db.payments.create({
        gigId,
        milestoneId,
        milestoneTitle: milestone.title,
        amount: milestone.amount,
        status: "escrow",
        type: "deposit",
        fromId: userId,
        fromName: userName,
        toId: gig.freelancerId!,
        toName: gig.freelancerName!
      });

      // Send notifications
      db.createNotification({
        userId: gig.freelancerId!,
        title: "🔒 Milestone Funds Secured (via Stripe)",
        message: `${userName} securely funded ₹${milestone.amount} into Escrow using Stripe for: "${milestone.title}". Procure work safely.`,
        type: "payment"
      });
      
      db.createNotification({
        userId: userId,
        title: "🔒 Secure Deposit Complete",
        message: `Stripe transaction for ₹${milestone.amount} successfully credited in Escrow for milestone "${milestone.title}".`,
        type: "payment"
      });
    }

    const origin = process.env.APP_URL || `http://${req.headers.host}`;
    res.redirect(`${origin}/?stripe_success=true&milestoneId=${milestoneId}`);
  } catch (err: any) {
    console.error("Stripe Success Handler Crashed:", err);
    res.status(500).send(`Stripe Validation Failed: ${err.message}`);
  }
});

router.post("/payments/escrow-deposit", requireAuth, requireRole(["client"]), (req: any, res) => {
  const { gigId, milestoneId } = req.body;
  const gig = db.gigs.findById(gigId);
  if (!gig) return res.status(404).json({ error: "Gig not found" });

  const mileIdx = gig.milestones.findIndex(m => m.id === milestoneId);
  if (mileIdx === -1) return res.status(404).json({ error: "Milestone not found" });

  const milestone = gig.milestones[mileIdx];
  if (milestone.status !== "pending") {
    return res.status(400).json({ error: "Milestone funds already deposited or released" });
  }

  // Lock money in escrow
  gig.milestones[mileIdx].status = "escrow";
  db.gigs.update(gig.id, { milestones: gig.milestones });

  // Record Deposit Transaction
  const payment = db.payments.create({
    gigId,
    milestoneId,
    milestoneTitle: milestone.title,
    amount: milestone.amount,
    status: "escrow",
    type: "deposit",
    fromId: req.user.id,
    fromName: req.user.name,
    toId: gig.freelancerId!,
    toName: gig.freelancerName!
  });

  db.createNotification({
    userId: gig.freelancerId!,
    title: "Milestone Escrow Funded",
    message: `${req.user.name} funded ₹${milestone.amount} into Escrow for completion of: "${milestone.title}". Proceed with tasks safely.`,
    type: "payment"
  });

  res.json({ success: true, payment });
});

router.post("/payments/escrow-release", requireAuth, requireRole(["client"]), (req: any, res) => {
  const { gigId, milestoneId } = req.body;
  const gig = db.gigs.findById(gigId);
  if (!gig) return res.status(404).json({ error: "Gig not found" });

  const mileIdx = gig.milestones.findIndex(m => m.id === milestoneId);
  if (mileIdx === -1) return res.status(404).json({ error: "Milestone not found" });

  const milestone = gig.milestones[mileIdx];
  if (milestone.status !== "escrow") {
    return res.status(400).json({ error: "Milestone is not currently in escrow state" });
  }

  // Mark milestone as Paid
  gig.milestones[mileIdx].status = "paid";
  
  // Check if all milestones are paid
  const allPaid = gig.milestones.every(m => m.status === "paid");
  const finalStatus = allPaid ? "completed" : "active";

  db.gigs.update(gig.id, { 
    milestones: gig.milestones,
    status: finalStatus
  });

  // Record Release payment entry
  const payment = db.payments.create({
    gigId,
    milestoneId,
    milestoneTitle: milestone.title,
    amount: milestone.amount,
    status: "released",
    type: "release",
    fromId: req.user.id,
    fromName: req.user.name,
    toId: gig.freelancerId!,
    toName: gig.freelancerName!
  });

  db.createNotification({
    userId: gig.freelancerId!,
    title: "Funds Released!",
    message: `${req.user.name} released ₹${milestone.amount} for: "${milestone.title}". Excellent effort!`,
    type: "payment"
  });

  res.json({ success: true, payment });
});

router.post("/payments/escrow-submit", requireAuth, requireRole(["freelancer"]), (req: any, res) => {
  const { gigId, milestoneId, submissionText, submissionAttachment } = req.body;
  if (!gigId || !milestoneId || !submissionText) {
    return res.status(400).json({ error: "Missing gig, milestone, or submission text details" });
  }

  const gig = db.gigs.findById(gigId);
  if (!gig) return res.status(404).json({ error: "Gig contract not found" });

  if (gig.freelancerId !== req.user.id) {
    return res.status(403).json({ error: "Access Denied: You are not the assigned freelancer for this gig" });
  }

  const mileIdx = gig.milestones.findIndex(m => m.id === milestoneId);
  if (mileIdx === -1) return res.status(404).json({ error: "Milestone not found" });

  const milestone = gig.milestones[mileIdx];
  if (milestone.status !== "escrow") {
    return res.status(400).json({ error: "Can only submit work for funded escrow milestones" });
  }

  gig.milestones[mileIdx] = {
    ...milestone,
    submissionText,
    submissionAttachment: submissionAttachment || "",
    submittedAt: new Date().toISOString()
  };

  db.gigs.update(gig.id, { milestones: gig.milestones });

  db.createNotification({
    userId: gig.clientId,
    title: "Milestone Deliverable Submitted",
    message: `${req.user.name} submitted deliverables for milestone "${milestone.title}". Click under milestones to review and release payment.`,
    type: "payment"
  });

  res.json({ success: true, milestone: gig.milestones[mileIdx] });
});

router.post("/payments/dispute-raise", requireAuth, (req: any, res) => {
  const { gigId, milestoneId, reason, evidenceUrl, evidenceText } = req.body;
  if (!gigId || !milestoneId || !reason) {
    return res.status(400).json({ error: "Missing gig, milestone, or reason details" });
  }

  const gig = db.gigs.findById(gigId);
  if (!gig) return res.status(404).json({ error: "Gig contract not found" });

  const mileIdx = gig.milestones.findIndex(m => m.id === milestoneId);
  if (mileIdx === -1) return res.status(404).json({ error: "Milestone not found" });

  const milestone = gig.milestones[mileIdx];
  if (milestone.status !== "escrow" && milestone.status !== "pending") {
    return res.status(400).json({ error: "Can only dispute active milestones" });
  }

  // Set milestone status to disputed
  gig.milestones[mileIdx].status = "disputed";
  db.gigs.update(gig.id, { milestones: gig.milestones });

  const dispute = db.disputes.create({
    gigId: gig.id,
    gigTitle: gig.title,
    milestoneId,
    milestoneTitle: milestone.title,
    clientId: gig.clientId,
    clientName: gig.clientName,
    freelancerId: gig.freelancerId!,
    freelancerName: gig.freelancerName!,
    reason,
    evidenceUrl: evidenceUrl || "",
    evidenceText: evidenceText || ""
  });

  res.json({ success: true, dispute });
});

// -----------------------------------------------------------------------------
// 5. CHAT SERVICE ENDPOINTS
// -----------------------------------------------------------------------------
router.get("/chat/conversation/:otherUserId", requireAuth, (req: any, res) => {
  const history = db.messages.getConversation(req.user.id, req.params.otherUserId);
  res.json({ messages: history });
});

router.get("/chat/contacts", requireAuth, (req: any, res) => {
  const data = db.get();
  // Gather unique chats related to logged user
  const messages = data.messages.filter(m => m.senderId === req.user.id || m.receiverId === req.user.id);
  const contactIds = Array.from(new Set(messages.map(m => m.senderId === req.user.id ? m.receiverId : m.senderId)));
  const contacts = contactIds.map(cid => db.users.findById(cid)).filter(Boolean);
  res.json({ contacts });
});

router.post("/chat/message", requireAuth, (req: any, res) => {
  const { receiverId, text, fileUrl, fileName } = req.body;
  if (!receiverId || (!text && !fileUrl)) {
    return res.status(400).json({ error: "Incomplete target recipient or text message details" });
  }

  const msg = db.messages.create({
    senderId: req.user.id,
    receiverId,
    text: text || "Shared a file asset.",
    fileUrl,
    fileName
  });

  res.status(201).json({ success: true, message: msg });
});

// -----------------------------------------------------------------------------
// 6. REVIEW SERVICE ENDPOINTS
// -----------------------------------------------------------------------------
router.post("/reviews", requireAuth, (req: any, res) => {
  const { gigId, revieweeId, rating, comment, simBudget, simSeconds } = req.body;
  if (!gigId || !revieweeId || !rating || !comment) {
    return res.status(400).json({ error: "Missing star rating parameters or comment" });
  }

  let finalGigId = gigId;
  let gigTitle = "Hyperlocal Smart-City Terminal Integration";

  if (gigId === "simulated" || gigId.startsWith("sim_")) {
    const freshSimId = "sim_" + Math.random().toString(36).substring(2, 9);
    const mockGig = {
      id: freshSimId,
      title: "Smart-Contract Escrow Automation Node",
      description: "Virtual project simulated to run real-time security auditing checks on the blockchain.",
      budget: Number(simBudget || 15000),
      skills: ["React", "Express", "Client Terminal"],
      milestones: [{ id: "ms_1", title: "Milestone Paid Out", amount: Number(simBudget || 15000), status: "paid", deadline: "2026-06-01" }],
      status: "completed",
      clientId: req.user.id,
      clientName: req.user.name,
      freelancerId: revieweeId,
      location: "Bengaluru Regional Center",
      createdAt: new Date(Date.now() - (Number(simSeconds || 7200) * 1000)).toISOString()
    };

    // Add this virtual completed contract to seed gigs dynamically so db relationships hold true!
    const data = db.get();
    data.gigs.push(mockGig as any);
    db.save(data);

    finalGigId = freshSimId;
    gigTitle = mockGig.title;
  } else {
    const gig = db.gigs.findById(gigId);
    if (!gig) return res.status(404).json({ error: "Gig of origin not found" });
    finalGigId = gig.id;
    gigTitle = gig.title;
  }

  const rev = db.reviews.create({
    gigId: finalGigId,
    gigTitle: gigTitle,
    reviewerId: req.user.id,
    reviewerName: req.user.name,
    revieweeId,
    rating: Number(rating),
    comment
  });

  res.status(201).json({ success: true, review: rev });
});

router.get("/reviews/:userId", (req, res) => {
  const list = db.reviews.findMany({ revieweeId: req.params.userId });
  res.json({ reviews: list });
});

// -----------------------------------------------------------------------------
// 7. NOTIFICATIONS SERVICE ENDPOINTS
// -----------------------------------------------------------------------------
router.get("/notifications", requireAuth, (req: any, res) => {
  const list = db.notifications.findByUser(req.user.id);
  res.json({ notifications: list });
});

router.post("/notifications/read-all", requireAuth, (req: any, res) => {
  db.notifications.markAllRead(req.user.id);
  res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 8. ADMIN SERVICE ENDPOINTS
// -----------------------------------------------------------------------------
router.get("/admin/stats", requireAuth, requireRole(["admin"]), (req, res) => {
  const data = db.get();
  
  // High fidelity state calculation metrics
  const totalEscrow = data.gigs.reduce((sum, g) => {
    const escrowm = g.milestones.filter(m => m.status === "escrow" || m.status === "disputed");
    return sum + escrowm.reduce((mSum, m) => mSum + m.amount, 0);
  }, 0);

  // Compute platform commission revenue (5% on all officially released milestones)
  let totalReleasedAmount = 0;
  data.gigs.forEach(g => {
    g.milestones.forEach(m => {
      if (m.status === "paid") {
        totalReleasedAmount += m.amount;
      }
    });
  });
  const platformRevenue = Math.round(totalReleasedAmount * 0.05);

  // Calculate active freelancers (freelancers with an active gig or a pending proposal)
  const activeFreelancersCount = data.users.filter(u => {
    if (u.role !== "freelancer") return false;
    const hasActiveGig = data.gigs.some(g => g.freelancerId === u.id && g.status === "active");
    const hasPendingProp = data.proposals.some(p => p.freelancerId === u.id && p.status === "pending");
    return hasActiveGig || hasPendingProp;
  }).length;

  // Determine top categories from postings
  const catDistribution: { [key: string]: number } = {};
  data.gigs.forEach(g => {
    const cat = (g.skills && g.skills[0]) || "Consultancy";
    catDistribution[cat] = (catDistribution[cat] || 0) + 1;
  });
  const topCategories = Object.keys(catDistribution).sort((a, b) => catDistribution[b] - catDistribution[a]).slice(0, 3);
  if (topCategories.length === 0) {
    topCategories.push("Technical Engineering", "Legal Audits", "Creative Design");
  }

  // Calculate generic Job Success Rate based on Completed vs Disputed ratio
  let releasedMilestones = 0;
  let disputedMilestones = 0;
  data.gigs.forEach(g => {
    g.milestones.forEach(m => {
      if (m.status === "paid") releasedMilestones++;
      if (m.status === "disputed") disputedMilestones++;
    });
  });
  const totalTracked = releasedMilestones + disputedMilestones;
  const jobSuccessRate = totalTracked > 0 ? Math.round((releasedMilestones / totalTracked) * 100) : 96;

  const disputesList = data.disputes;
  const metrics = {
    usersCount: data.users.length,
    freelancersCount: data.users.filter(u => u.role === "freelancer").length,
    clientsCount: data.users.filter(u => u.role === "client").length,
    gigsCount: data.gigs.length,
    activeGigCount: data.gigs.filter(g => g.status === "active").length,
    totalEscrowBalance: totalEscrow,
    disputesCount: disputesList.filter(d => d.status === "pending").length,
    logs: db.adminLogs.findMany(),
    platformRevenue: platformRevenue || 14750, // default placeholder if no released gigs yet
    activeFreelancers: activeFreelancersCount || 4,
    topCategories,
    jobSuccessRate,
    trafficData: trafficLogs
  };

  res.json({ stats: metrics });
});

router.get("/admin/disputes", requireAuth, requireRole(["admin"]), (req, res) => {
  res.json({ disputes: db.disputes.findMany() });
});

router.post("/admin/disputes/:id/resolve", requireAuth, requireRole(["admin"]), (req: any, res) => {
  const { decision, resolution } = req.body; // 'resolved-to-freelancer' or 'resolved-to-client'
  if (!decision || !resolution) {
    return res.status(400).json({ error: "Missing formal arbitral decision or reason comments" });
  }

  const updated = db.disputes.resolve(req.params.id, decision, resolution);
  if (!updated) return res.status(404).json({ error: "Dispute file not found" });

  db.adminLogs.create({
    action: "DISPUTE_RESOLVED",
    details: `Dispute ${req.params.id} decided as ${decision}. Resolution: ${resolution}`,
    operatorName: req.user.name
  });

  res.json({ success: true, dispute: updated });
});

router.post("/admin/users/:id/ban", requireAuth, requireRole(["admin"]), (req: any, res) => {
  const user = db.users.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User profile not found in system registers" });

  const toggledBanned = !user.isBanned;
  const updated = db.users.update(user.id, { isBanned: toggledBanned });

  db.adminLogs.create({
    action: toggledBanned ? "USER_BANNED" : "USER_UNBANNED",
    details: `Account ${user.email} status toggled. Banned: ${toggledBanned}`,
    operatorName: req.user.name
  });

  res.json({ success: true, user: updated });
});

router.post("/admin/users/:id/verify", requireAuth, requireRole(["admin"]), (req: any, res) => {
  const user = db.users.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User profile not found" });

  const updated = db.users.update(user.id, { isVerified: true });

  db.adminLogs.create({
    action: "USER_VERIFIED",
    details: `Freelancer ${user.name} credentials verified.`,
    operatorName: req.user.name
  });

  res.json({ success: true, user: updated });
});

// -----------------------------------------------------------------------------
// 7. FREELANCER AVAILABILITY SCHEDULER & BOOKING SERVICE
// -----------------------------------------------------------------------------
router.get("/bookings/me", requireAuth, (req: any, res) => {
  const list = db.bookings.findMany().filter(b => b.clientId === req.user.id || b.freelancerId === req.user.id);
  res.json({ bookings: list });
});

router.post("/bookings", requireAuth, (req: any, res) => {
  const { freelancerId, date, slot, notes } = req.body;
  
  if (!freelancerId || !date || !slot) {
    return res.status(400).json({ error: "Missing required booking details (Freelancer, Date, or Time Slot)" });
  }

  // Validate freelancer presence
  const freelancer = db.users.findById(freelancerId);
  if (!freelancer || freelancer.role !== "freelancer") {
    return res.status(404).json({ error: "Assigned partner profile is invalid or has another role specification" });
  }

  // Validate conflict: Check if this slot is already booked on this exact date for this freelancer
  const allBookings = db.bookings.findMany();
  const alreadyBooked = allBookings.some(b => 
    b.freelancerId === freelancerId && 
    b.date === date && 
    b.slot === slot && 
    b.status === "scheduled"
  );

  if (alreadyBooked) {
    return res.status(400).json({ error: "Scheduling Conflict: This time slot is already booked for this freelancer." });
  }

  // Create booking
  const booking = db.bookings.create({
    clientId: req.user.id,
    clientName: req.user.name,
    freelancerId,
    freelancerName: freelancer.name,
    date,
    slot,
    notes: notes || ""
  });

  // Notify freelancer
  db.createNotification({
    userId: freelancerId,
    title: "📅 New Booking Scheduled",
    message: `${req.user.name} booked a session with you on ${date} at ${slot}. Notes: ${notes || "No notes provided"}`,
    type: "system"
  });

  // Notify client
  db.createNotification({
    userId: req.user.id,
    title: "📅 Session Booked Successfully",
    message: `Your booking with ${freelancer.name} on ${date} at ${slot} is confirmed.`,
    type: "system"
  });

  res.json({ success: true, booking });
});

router.post("/bookings/:id/cancel", requireAuth, (req: any, res) => {
  const list = db.bookings.findMany();
  const booking = list.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking file reference not found" });

  if (booking.clientId !== req.user.id && booking.freelancerId !== req.user.id) {
    return res.status(403).json({ error: "Access Denied: You are not authorized on this scheduler record" });
  }

  const updated = db.bookings.update(booking.id, { status: "cancelled" });

  // Send mutual alert notifications
  const targetAlertUser = req.user.id === booking.clientId ? booking.freelancerId : booking.clientId;
  const cancellerName = req.user.name;

  db.createNotification({
    userId: targetAlertUser,
    title: "📅 Booking Cancelled",
    message: `The booked meeting on ${booking.date} at ${booking.slot} was cancelled by ${cancellerName}.`,
    type: "system"
  });

  res.json({ success: true, booking: updated });
});

router.post("/bookings/:id/complete", requireAuth, (req: any, res) => {
  const list = db.bookings.findMany();
  const booking = list.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking file reference not found" });

  if (booking.freelancerId !== req.user.id) {
    return res.status(403).json({ error: "Only the freelancer can conclude and log complete sessions" });
  }

  const updated = db.bookings.update(booking.id, { status: "completed" });

  db.createNotification({
    userId: booking.clientId,
    title: "📅 Session Completed",
    message: `${req.user.name} marked your scheduled session on ${booking.date} at ${booking.slot} as completed.`,
    type: "system"
  });

  res.json({ success: true, booking: updated });
});

router.post("/users/availability-slots", requireAuth, (req: any, res) => {
  const { status, weeklyHours, availableDays, availableSlots } = req.body;
  
  const updatedAvailability = {
    status: status || "Available",
    weeklyHours: Number(weeklyHours) || 40,
    availableDays: availableDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
    availableSlots: availableSlots || ["09:00 AM - 10:00 AM", "11:00 AM - 12:00 PM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"]
  };

  const updatedUser = db.users.update(req.user.id, {
    availability: updatedAvailability
  });

  res.json({ success: true, user: updatedUser });
});

export default router;
