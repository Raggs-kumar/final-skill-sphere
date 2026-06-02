/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { 
  User, 
  Gig, 
  Proposal, 
  Payment, 
  Message, 
  Review, 
  Notification, 
  Dispute,
  AdminLog,
  Booking
} from "../types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DatabaseSchema {
  users: User[];
  gigs: Gig[];
  proposals: Proposal[];
  payments: Payment[];
  messages: Message[];
  reviews: Review[];
  notifications: Notification[];
  disputes: Dispute[];
  adminLogs: AdminLog[];
  bookings: Booking[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  gigs: [],
  proposals: [],
  payments: [],
  messages: [],
  reviews: [],
  notifications: [],
  disputes: [],
  adminLogs: [],
  bookings: []
};

// Ensure databases exist on load
function initDB(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
    return DEFAULT_DB;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    
    // Merge missing keys if schema updates
    let updated = false;
    const dbKeys = Object.keys(DEFAULT_DB) as (keyof DatabaseSchema)[];
    for (const key of dbKeys) {
      if (!parsed[key]) {
        parsed[key] = DEFAULT_DB[key];
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    }
    return parsed;
  } catch (err) {
    console.error("Failed to parse local db.json. Resetting database to seed.", err);
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
    return DEFAULT_DB;
  }
}

export const db = {
  get: (): DatabaseSchema => {
    return initDB();
  },

  save: (data: DatabaseSchema) => {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  },

  users: {
    findMany: (query: Partial<User> = {}): User[] => {
      const data = db.get();
      return data.users.filter(u => {
        for (const k in query) {
          if (u[k as keyof User] !== query[k as keyof User]) return false;
        }
        return true;
      });
    },
    findById: (id: string): User | undefined => {
      return db.get().users.find(u => u.id === id);
    },
    findByEmail: (email: string): User | undefined => {
      return db.get().users.find(u => u.email.toLowerCase() === email.toLowerCase());
    },
    create: (user: Omit<User, "id" | "createdAt" | "isVerified" | "isBanned" | "reputationScore">): User => {
      const data = db.get();
      const newUser: User = {
        ...user,
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        isVerified: user.role === "client", // Clients verified right away, freelancers require manual verification
        isBanned: false,
        reputationScore: 100,
        createdAt: new Date().toISOString()
      };
      data.users.push(newUser);
      db.save(data);
      db.createNotification({
        userId: newUser.id,
        title: "Welcome to SkillSphere!",
        message: `Hello ${newUser.name}, you have successfully signed up as a ${newUser.role}. Let's build together!`,
        type: "system"
      });
      return newUser;
    },
    update: (id: string, updates: Partial<User>): User | undefined => {
      const data = db.get();
      const idx = data.users.findIndex(u => u.id === id);
      if (idx === -1) return undefined;
      data.users[idx] = { ...data.users[idx], ...updates };
      db.save(data);
      return data.users[idx];
    }
  },

  gigs: {
    findMany: (query: Partial<Gig> = {}): Gig[] => {
      const data = db.get();
      return data.gigs.filter(g => {
        for (const k in query) {
          if (g[k as keyof Gig] !== query[k as keyof Gig]) return false;
        }
        return true;
      });
    },
    findById: (id: string): Gig | undefined => {
      return db.get().gigs.find(g => g.id === id);
    },
    create: (gig: Omit<Gig, "id" | "createdAt" | "status">): Gig => {
      const data = db.get();
      const newGig: Gig = {
        ...gig,
        id: "gig_" + Math.random().toString(36).substring(2, 9),
        status: "open",
        createdAt: new Date().toISOString()
      };
      data.gigs.push(newGig);
      db.save(data);
      
      // Notify admin
      db.createNotification({
        userId: "usr_admin",
        title: "New Gig Submitted",
        message: `Gig "${newGig.title}" has been created by ${newGig.clientName}. Needs validation approval.`,
        type: "system"
      });
      return newGig;
    },
    update: (id: string, updates: Partial<Gig>): Gig | undefined => {
      const data = db.get();
      const idx = data.gigs.findIndex(g => g.id === id);
      if (idx === -1) return undefined;
      data.gigs[idx] = { ...data.gigs[idx], ...updates };
      db.save(data);
      return data.gigs[idx];
    },
    delete: (id: string): boolean => {
      const data = db.get();
      const originalLen = data.gigs.length;
      data.gigs = data.gigs.filter(g => g.id !== id);
      db.save(data);
      return data.gigs.length < originalLen;
    }
  },

  proposals: {
    findMany: (query: Partial<Proposal> = {}): Proposal[] => {
      const data = db.get();
      return data.proposals.filter(p => {
        for (const k in query) {
          if (p[k as keyof Proposal] !== query[k as keyof Proposal]) return false;
        }
        return true;
      });
    },
    findById: (id: string): Proposal | undefined => {
      return db.get().proposals.find(p => p.id === id);
    },
    create: (prop: Omit<Proposal, "id" | "createdAt" | "status">): Proposal => {
      const data = db.get();
      const newProp: Proposal = {
        ...prop,
        id: "prop_" + Math.random().toString(36).substring(2, 9),
        status: "pending",
        createdAt: new Date().toISOString()
      };
      data.proposals.push(newProp);
      db.save(data);

      // Find client ID of the gig
      const targetGig = data.gigs.find(g => g.id === prop.gigId);
      if (targetGig) {
        db.createNotification({
          userId: targetGig.clientId,
          title: "New Proposal Received",
          message: `${prop.freelancerName} applied to your gig "${prop.gigTitle}" with a bid of ₹${prop.bidAmount}.`,
          type: "proposal"
        });
      }
      return newProp;
    },
    update: (id: string, updates: Partial<Proposal>): Proposal | undefined => {
      const data = db.get();
      const idx = data.proposals.findIndex(p => p.id === id);
      if (idx === -1) return undefined;
      data.proposals[idx] = { ...data.proposals[idx], ...updates };
      db.save(data);
      return data.proposals[idx];
    }
  },

  payments: {
    findMany: (query: Partial<Payment> = {}): Payment[] => {
      const data = db.get();
      return data.payments.filter(p => {
        for (const k in query) {
          if (p[k as keyof Payment] !== query[k as keyof Payment]) return false;
        }
        return true;
      });
    },
    create: (payment: Omit<Payment, "id" | "createdAt">): Payment => {
      const data = db.get();
      const newPayment: Payment = {
        ...payment,
        id: "pay_" + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString()
      };
      data.payments.push(newPayment);
      db.save(data);
      return newPayment;
    }
  },

  messages: {
    getConversation: (userA: string, userB: string): Message[] => {
      return db.get().messages.filter(
        m => (m.senderId === userA && m.receiverId === userB) ||
             (m.senderId === userB && m.receiverId === userA)
      ).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    create: (msg: Omit<Message, "id" | "createdAt">): Message => {
      const data = db.get();
      const newMsg: Message = {
        ...msg,
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString()
      };
      data.messages.push(newMsg);
      db.save(data);

      db.createNotification({
        userId: msg.receiverId,
        title: "New Chat Message",
        message: `You received a message: "${newMsg.text.length > 50 ? newMsg.text.substring(0, 50) + "..." : newMsg.text}"`,
        type: "chat"
      });
      return newMsg;
    }
  },

  reviews: {
    findMany: (query: Partial<Review> = {}): Review[] => {
      const data = db.get();
      return data.reviews.filter(r => {
        for (const k in query) {
          if (r[k as keyof Review] !== query[k as keyof Review]) return false;
        }
        return true;
      });
    },
    create: (review: Omit<Review, "id" | "createdAt" | "isVerified" | "budgetSize" | "influenceWeight" | "isSuspicious" | "fraudRulesTriggered">): Review => {
      const data = db.get();
      
      // Look up associated gig to extract context-specific variables (budget, timing, status)
      const gig = data.gigs.find(g => g.id === review.gigId);
      const isVerified = !!gig && (gig.status === "completed" || gig.milestones.some(m => m.status === "paid"));
      const budgetSize = gig ? gig.budget : 1000;

      // Smart Fraud Detection Engine Triggers
      const fraudRulesTriggered: string[] = [];
      
      // 1. Peer Reciprocal Co-loop Collusion
      const hasReciprocated = data.reviews.some(
        r => r.reviewerId === review.revieweeId && r.revieweeId === review.reviewerId
      );
      if (hasReciprocated) {
        fraudRulesTriggered.push("Reciprocal rating lock (peer-to-peer reciprocity loop detected)");
      }

      // 2. Speed-run contract completion (under 3 minutes)
      if (gig) {
        const timeElapsedSec = (Date.now() - new Date(gig.createdAt).getTime()) / 1000;
        if (timeElapsedSec < 180) { // Under 3 mins
          fraudRulesTriggered.push("Speed Run (contract completed in under 3 minutes, highly indicative of coordinate farming)");
        }
      }

      // 3. Micro budget validation (rating farmed cheap)
      if (gig && gig.budget < 500) {
        fraudRulesTriggered.push("Micro-budget rating farm (deal size under ₹500 is flagged for reputation inflation)");
      }

      // 4. Duplicate spam footprint
      const isSpammy = data.reviews.some(
        r => r.reviewerId === review.reviewerId && r.comment.trim().toLowerCase() === review.comment.trim().toLowerCase()
      );
      if (isSpammy || review.comment.trim().length < 8) {
        if (isSpammy) {
          fraudRulesTriggered.push("Identical repetitive comment verbatim text footprint");
        } else {
          fraudRulesTriggered.push("Extremely low quality/boilerplate review (length < 8)");
        }
      }

      const isSuspicious = fraudRulesTriggered.length > 0;

      // Base weight: 1.0, scaled with budget log and verified status
      const budgetScale = Math.min(3, Math.max(1, Math.log10(budgetSize) / 2)); // logarithmic scaling
      const statusModifier = isVerified ? 1.5 : 0.5;
      const influenceWeight = isSuspicious ? 0 : Math.round(budgetScale * statusModifier * 10) / 10;

      const newReview: Review = {
        ...review,
        id: "rev_" + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        isVerified,
        budgetSize,
        influenceWeight,
        isSuspicious,
        fraudRulesTriggered
      };
      
      data.reviews.push(newReview);

      // Recalculate reputation score
      const userReviews = data.reviews.filter(r => r.revieweeId === review.revieweeId);
      const nonSuspiciousReviews = userReviews.filter(r => !r.isSuspicious);

      let reputationScore = 70; // Baseline default reputation for fresh nodes
      
      if (nonSuspiciousReviews.length > 0) {
        let totalWeight = 0;
        let sumWeightedRatings = 0;
        nonSuspiciousReviews.forEach(r => {
          const w = r.influenceWeight || 1;
          sumWeightedRatings += r.rating * w;
          totalWeight += w;
        });
        const weightedAvg = sumWeightedRatings / (totalWeight || 1);
        reputationScore = Math.min(100, Math.max(0, Math.round(weightedAvg * 20)));
      } else if (userReviews.length > 0) {
        // Penalty for having ONLY suspicious/fraudulent reviews
        reputationScore = 40;
      }

      const userIdx = data.users.findIndex(u => u.id === review.revieweeId);
      if (userIdx !== -1) {
        data.users[userIdx].reputationScore = reputationScore;
      }

      db.save(data);

      db.createNotification({
        userId: review.revieweeId,
        title: isSuspicious ? "⚠️ Suspicious Review Received" : "New Verified Review",
        message: isSuspicious 
          ? `A review from ${review.reviewerName} was flagged by TrustEngine: "${review.comment}"` 
          : `${review.reviewerName} gave you a ${review.rating}-star review: "${review.comment}"`,
        type: "review"
      });
      return newReview;
    }
  },

  notifications: {
    findByUser: (userId: string): Notification[] => {
      return db.get().notifications
        .filter(n => n.userId === userId)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    markAllRead: (userId: string) => {
      const data = db.get();
      data.notifications = data.notifications.map(n => {
        if (n.userId === userId) {
          return { ...n, isRead: true };
        }
        return n;
      });
      db.save(data);
    }
  },

  disputes: {
    findMany: (): Dispute[] => {
      return db.get().disputes;
    },
    create: (dispute: Omit<Dispute, "id" | "createdAt" | "status">): Dispute => {
      const data = db.get();
      const newDispute: Dispute = {
        ...dispute,
        id: "disp_" + Math.random().toString(36).substring(2, 9),
        status: "pending",
        createdAt: new Date().toISOString()
      };
      data.disputes.push(newDispute);
      db.save(data);

      // Notify Admin
      db.createNotification({
        userId: "usr_admin",
        title: "New Contract Dispute",
        message: `Client ${dispute.clientName} raised a dispute against ${dispute.freelancerName} in gig "${dispute.gigTitle}".`,
        type: "system"
      });
      return newDispute;
    },
    resolve: (id: string, status: "resolved-to-freelancer" | "resolved-to-client", resolution: string): Dispute | undefined => {
      const data = db.get();
      const idx = data.disputes.findIndex(d => d.id === id);
      if (idx === -1) return undefined;
      data.disputes[idx].status = status;
      data.disputes[idx].resolution = resolution;
      
      const disp = data.disputes[idx];
      
      // Update gig / payment state or release escrow based on decision!
      const gigIdx = data.gigs.findIndex(g => g.id === disp.gigId);
      if (gigIdx !== -1) {
        const gig = data.gigs[gigIdx];
        const mileIdx = gig.milestones.findIndex(m => m.id === disp.milestoneId);
        if (mileIdx !== -1) {
          if (status === "resolved-to-freelancer") {
            // Milestone is paid to the freelancer
            gig.milestones[mileIdx].status = "paid";
            // Create payment
            data.payments.push({
              id: "pay_" + Math.random().toString(36).substring(2, 9),
              gigId: gig.id,
              milestoneId: disp.milestoneId,
              milestoneTitle: disp.milestoneTitle,
              amount: gig.milestones[mileIdx].amount,
              status: "released",
              type: "release",
              fromId: disp.clientId,
              fromName: disp.clientName,
              toId: disp.freelancerId,
              toName: disp.freelancerName,
              createdAt: new Date().toISOString()
            });

            db.createNotification({
              userId: disp.freelancerId,
              title: "Dispute Resolved in Your Favor",
              message: `Admin resolved dispute for contract "${disp.gigTitle}". Milestone funds of ₹${gig.milestones[mileIdx].amount} were released to you.`,
              type: "payment"
            });
            db.createNotification({
              userId: disp.clientId,
              title: "Dispute Resolved",
              message: `Admin resolved dispute for contract "${disp.gigTitle}". Milestone funds were released to the freelancer. Reason: ${resolution}`,
              type: "system"
            });
          } else {
            // Refunded to client
            gig.milestones[mileIdx].status = "pending"; // Back to unpaid / pending
            data.payments.push({
              id: "pay_" + Math.random().toString(36).substring(2, 9),
              gigId: gig.id,
              milestoneId: disp.milestoneId,
              milestoneTitle: disp.milestoneTitle,
              amount: gig.milestones[mileIdx].amount,
              status: "refunded",
              type: "refund",
              fromId: disp.freelancerId,
              fromName: disp.freelancerName,
              toId: disp.clientId,
              toName: disp.clientName,
              createdAt: new Date().toISOString()
            });

            db.createNotification({
              userId: disp.clientId,
              title: "Dispute Resolved in Your Favor",
              message: `Admin resolved dispute for contract "${disp.gigTitle}". Escrow of ₹${gig.milestones[mileIdx].amount} has been refunded to your account.`,
              type: "payment"
            });
            db.createNotification({
              userId: disp.freelancerId,
              title: "Dispute Resolved",
              message: `Admin resolved dispute for contract "${disp.gigTitle}". Escrow funds were returned to the client. Reason: ${resolution}`,
              type: "system"
            });
          }
        }
      }

      db.save(data);
      return data.disputes[idx];
    }
  },

  adminLogs: {
    findMany: (): AdminLog[] => {
      return db.get().adminLogs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    create: (log: Omit<AdminLog, "id" | "createdAt">): AdminLog => {
      const data = db.get();
      const newLog: AdminLog = {
        ...log,
        id: "log_" + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString()
      };
      data.adminLogs.push(newLog);
      db.save(data);
      return newLog;
    }
  },

  // Notification helper
  createNotification: (not: Omit<Notification, "id" | "createdAt" | "isRead">): Notification => {
    const data = db.get();
    const newNot: Notification = {
      ...not,
      id: "not_" + Math.random().toString(36).substring(2, 9),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    data.notifications.push(newNot);
    db.save(data);
    return newNot;
  },

  bookings: {
    findMany: (): Booking[] => {
      return db.get().bookings;
    },
    create: (booking: Omit<Booking, "id" | "createdAt" | "status">): Booking => {
      const data = db.get();
      const newBooking: Booking = {
        ...booking,
        id: "bk_" + Math.random().toString(36).substring(2, 9),
        status: "scheduled",
        createdAt: new Date().toISOString()
      };
      data.bookings.push(newBooking);
      db.save(data);
      return newBooking;
    },
    update: (id: string, updates: Partial<Booking>): Booking | undefined => {
      const data = db.get();
      const idx = data.bookings.findIndex(b => b.id === id);
      if (idx === -1) return undefined;
      data.bookings[idx] = { ...data.bookings[idx], ...updates };
      db.save(data);
      return data.bookings[idx];
    }
  }
};
