import React, { useState, useEffect } from "react";
import { 
  X, User, MapPin, Award, Calendar, Briefcase, 
  DollarSign, ShieldCheck, ExternalLink, Download, 
  FileText, Check, Plus, Trash, Settings, Save, Sparkles, CheckCircle,
  Clock, Grid, ShieldAlert, Upload, Globe, Trash2,
  Star, TrendingUp, Percent, AlertTriangle, Activity
} from "lucide-react";
import { 
  User as UserType, 
  SkillWithProficiency, 
  PortfolioItem, 
  WorkExperience,
  AvailabilityCalendar,
  HourlyAndMilestonePricing,
  VerificationBadge,
  Review
} from "../types";

interface ProfileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  token: string;
  onDirectMessage?: (partnerId: string) => void;
  currentUserId?: string;
}

export default function ProfileViewerModal({ 
  isOpen, 
  onClose, 
  userId, 
  token, 
  onDirectMessage,
  currentUserId
}: ProfileViewerModalProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Smart reputation reviews states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  
  // Custom interactive test review state hooks
  const [testRating, setTestRating] = useState<number>(5);
  const [testComment, setTestComment] = useState("");
  const [testBudget, setTestBudget] = useState<number>(15000);
  const [testSpeedRun, setTestSpeedRun] = useState<boolean>(false);
  const [testDuplicate, setTestDuplicate] = useState<boolean>(false);
  const [testReciprocal, setTestReciprocal] = useState<boolean>(false);
  const [isDeployingReview, setIsDeployingReview] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);
  const [testErrorMsg, setTestErrorMsg] = useState<string | null>(null);
  
  // Custom states for editing
  const isOwnProfile = profile && currentUserId === profile.id;
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<"core" | "skills" | "history" | "portfolio" | "availability" | "badges">("core");

  // Local Form Buffers (synced on load/cancel)
  const [editTitle, setEditTitle] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState<number>(1500);
  const [editMilestoneMin, setEditMilestoneMin] = useState<number>(7500);
  
  const [skillsList, setSkillsList] = useState<SkillWithProficiency[]>([]);
  const [experienceList, setExperienceList] = useState<WorkExperience[]>([]);
  const [certificationsList, setCertificationsList] = useState<string[]>([]);
  const [portfolioList, setPortfolioList] = useState<PortfolioItem[]>([]);
  
  const [availStatus, setAvailStatus] = useState<"Available" | "Part-time" | "Busy">("Available");
  const [availHours, setAvailHours] = useState<number>(40);
  const [availDays, setAvailDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [availSlots, setAvailSlots] = useState<string[]>(["09:00 AM - 10:00 AM", "11:00 AM - 12:00 PM", "02:05 PM - 03:00 PM", "04:00 PM - 05:00 PM"]);
  
  const [badgesList, setBadgesList] = useState<VerificationBadge[]>([]);
  const [isVerified, setIsVerified] = useState(false);

  // Resume state simulator
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  // Booking scheduler states
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlot, setBookingSlot] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Temp item input buffers for list management
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<"Beginner" | "Intermediate" | "Expert" | "Pro">("Expert");

  const [newCertName, setNewCertName] = useState("");

  const [newExpCompany, setNewExpCompany] = useState("");
  const [newExpRole, setNewExpRole] = useState("");
  const [newExpDuration, setNewExpDuration] = useState("");
  const [newExpDesc, setNewExpDesc] = useState("");

  const [newPortTitle, setNewPortTitle] = useState("");
  const [newPortDesc, setNewPortDesc] = useState("");
  const [newPortImage, setNewPortImage] = useState("");
  const [newPortRepo, setNewPortRepo] = useState("");

  // Stunning stock images to choose from for portfolios
  const portfolioImagePresets = [
    { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400", label: "Dashboard / Analytics" },
    { url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400", label: "Machine Learning / Cyber" },
    { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400", label: "Smart Developer Code" },
    { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400", label: "E-Commerce / Solutions" }
  ];

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
      fetchReviews();
      setTestSuccessMsg(null);
      setTestErrorMsg(null);
      setTestComment("");
      setTestRating(5);
      setTestBudget(15000);
      setTestSpeedRun(false);
      setTestDuplicate(false);
      setTestReciprocal(false);
    }
    setUploadSuccess(false);
    setUploadedFileName("");
  }, [isOpen, userId]);

  const fetchReviews = async () => {
    if (!userId) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.reviews) {
        setReviews(data.reviews);
      }
    } catch (e) {
      console.error("Error fetching reviews", e);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeploySimulatedReview = async () => {
    if (!testComment.trim()) {
      setTestErrorMsg("Warning: Comment text cannot be empty.");
      return;
    }
    setIsDeployingReview(true);
    setTestErrorMsg(null);
    setTestSuccessMsg(null);

    // Formulate test attributes
    const ratingToSend = testRating;
    const commentToSend = testDuplicate 
      ? (reviews[0]?.comment || "Great work!") 
      : testComment;

    // Fast-track collusion check:
    // If user selected reciprocal simulation, we post a mock reciprocal review beforehand
    if (testReciprocal) {
      try {
        await fetch("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            gigId: "simulated",
            revieweeId: currentUserId,
            rating: 5,
            comment: "Direct peer reciprocity simulation handshake."
          })
        });
      } catch (err) {
        console.warn("Reciprocal pre-load error", err);
      }
    }

    try {
      const budgetToSend = testBudget;
      const secondsToSend = testSpeedRun ? 10 : 86400; // 10 seconds triggers fast completion speed run check

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          gigId: "simulated",
          revieweeId: userId,
          rating: ratingToSend,
          comment: commentToSend,
          simBudget: budgetToSend,
          simSeconds: secondsToSend
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to submit audited review");
      }

      setTestSuccessMsg("Audit complete! Sent to TrustEngine.");
      setTestComment("");
      
      // Dynamic updates
      fetchReviews();
      fetchUserProfile();
    } catch (err: any) {
      setTestErrorMsg(err.message || "Failed to submit review");
    } finally {
      setIsDeployingReview(false);
    }
  };

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profile could not be resolved");
      
      const user: UserType = data.user;
      setProfile(user);
      
      // Initialize edit buffers with existing fields or defaults
      setEditTitle(user.title || "");
      setEditBio(user.bio || "");
      setEditLocation(user.location || "Bengaluru, India");
      setEditHourlyRate(user.pricing?.hourlyRate || user.hourlyRate || 1500);
      setEditMilestoneMin(user.pricing?.milestoneMin || 7500);
      
      setSkillsList(user.skillsWithProficiency || (user.skills || []).map(s => ({ skill: s, level: "Expert" })));
      setExperienceList(user.experience || []);
      setCertificationsList(user.certifications || []);
      setPortfolioList(user.portfolio || []);
      
      setAvailStatus(user.availability?.status || "Available");
      setAvailHours(user.availability?.weeklyHours || 40);
      setAvailDays(user.availability?.availableDays || ["Mon", "Tue", "Wed", "Thu", "Fri"]);
      setAvailSlots(user.availability?.availableSlots || ["09:00 AM - 10:00 AM", "11:00 AM - 12:00 PM", "02:05 PM - 03:00 PM", "04:00 PM - 05:00 PM"]);
      
      setBadgesList(user.badges || []);
      setIsVerified(!!user.isVerified);
      setResumeUrl(user.resumeUrl || "");
      setUploadedFileName(user.resumeFileName || "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllChanges = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      // Package all edited items cleanly to save in custom database user object
      const updatePayload = {
        title: editTitle,
        bio: editBio,
        location: editLocation,
        hourlyRate: editHourlyRate,
        skills: skillsList.map(s => s.skill), // keep root compatibility updated
        skillsWithProficiency: skillsList,
        experience: experienceList,
        certifications: certificationsList,
        portfolio: portfolioList,
        availability: {
          status: availStatus,
          weeklyHours: Number(availHours),
          availableDays: availDays,
          availableSlots: availSlots
        },
        pricing: {
          hourlyRate: Number(editHourlyRate),
          milestoneMin: Number(editMilestoneMin),
          currency: "INR"
        },
        badges: badgesList,
        isVerified,
        resumeUrl,
        resumeFileName: uploadedFileName
      };

      const res = await fetch("/api/auth/profile-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to persist dossier payload");
      
      setProfile(data.user);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingSlot) {
      setBookingErrorMsg("Please select both a dynamic booking date and time slot.");
      return;
    }
    setBookingLoading(true);
    setBookingErrorMsg(null);
    setBookingSuccessMsg(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          freelancerId: userId,
          date: bookingDate,
          slot: bookingSlot,
          notes: bookingNotes
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to finalize scheduling transaction.");
      }
      setBookingSuccessMsg(`📅 Session Booked Successfully! Confirmation logged on escrow-network registries.`);
      setBookingDate("");
      setBookingSlot("");
      setBookingNotes("");
    } catch (err: any) {
      setBookingErrorMsg(err.message || "An error occurred during slot locking.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Add Item Helpers
  const addSkill = () => {
    if (!newSkillName.trim()) return;
    if (skillsList.some(s => s.skill.toLowerCase() === newSkillName.trim().toLowerCase())) {
      setNewSkillName("");
      return;
    }
    setSkillsList([...skillsList, { skill: newSkillName.trim(), level: newSkillLevel }]);
    setNewSkillName("");
  };

  const removeSkill = (idx: number) => {
    setSkillsList(skillsList.filter((_, i) => i !== idx));
  };

  const addCert = () => {
    if (!newCertName.trim()) return;
    if (certificationsList.includes(newCertName.trim())) {
      setNewCertName("");
      return;
    }
    setCertificationsList([...certificationsList, newCertName.trim()]);
    setNewCertName("");
  };

  const removeCert = (idx: number) => {
    setCertificationsList(certificationsList.filter((_, i) => i !== idx));
  };

  const addExperience = () => {
    if (!newExpCompany.trim() || !newExpRole.trim()) return;
    const item: WorkExperience = {
      id: "exp_" + Date.now(),
      company: newExpCompany.trim(),
      role: newExpRole.trim(),
      duration: newExpDuration.trim() || "Present",
      description: newExpDesc.trim() || "No responsibilities entered."
    };
    setExperienceList([...experienceList, item]);
    setNewExpCompany("");
    setNewExpRole("");
    setNewExpDuration("");
    setNewExpDesc("");
  };

  const removeExperience = (id: string) => {
    setExperienceList(experienceList.filter(e => e.id !== id));
  };

  const addPortfolio = () => {
    if (!newPortTitle.trim()) return;
    const item: PortfolioItem = {
      id: "port_" + Date.now(),
      title: newPortTitle.trim(),
      description: newPortDesc.trim() || "No details provided.",
      imageUrl: newPortImage.trim() || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400",
      projectUrl: newPortRepo.trim() || undefined
    };
    setPortfolioList([...portfolioList, item]);
    setNewPortTitle("");
    setNewPortDesc("");
    setNewPortImage("");
    setNewPortRepo("");
  };

  const removePortfolio = (id: string) => {
    setPortfolioList(portfolioList.filter(p => p.id !== id));
  };

  const toggleDay = (day: string) => {
    if (availDays.includes(day)) {
      setAvailDays(availDays.filter(d => d !== day));
    } else {
      setAvailDays([...availDays, day]);
    }
  };

  const triggerBadgeCertificationSimulated = () => {
    const instantBadges: VerificationBadge[] = [
      { badgeType: "KYC", issuedAt: new Date().toISOString(), status: "Active" },
      { badgeType: "Skill", issuedAt: new Date().toISOString(), status: "Active" },
      { badgeType: "Identity", issuedAt: new Date().toISOString(), status: "Active" },
      { badgeType: "Legacy", issuedAt: new Date().toISOString(), status: "Active" }
    ];
    setBadgesList(instantBadges);
    setIsVerified(true);
  };

  const handleSimulateResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    setUploadedFileName(file.name);
    setUploadSuccess(false);

    setTimeout(() => {
      setUploadingResume(false);
      setUploadSuccess(true);
      setResumeUrl("/demo-resume.pdf");
    }, 1200);
  };

  const getStarPercentage = (starNum: number) => {
    const totalReviews = reviews.length;
    if (!totalReviews) return 0;
    const cnt = reviews.filter(r => r.rating === starNum).length;
    return Math.round((cnt / totalReviews) * 100);
  };

  const getTrustGrade = (reputation: number, suspiciousCount: number) => {
    if (suspiciousCount > 1 || reputation < 50) {
      return { grade: "F / SUSPICIOUS", desc: "Flagged Node - Audits failed due to multiple suspicious reviews", color: "text-red-700 bg-red-50 border-red-200" };
    }
    if (suspiciousCount === 1) {
      return { grade: "C / WARNED", desc: "Co-collusion warning traces found on the ledger", color: "text-amber-800 bg-amber-50 border-amber-200" };
    }
    if (reputation >= 95) {
      return { grade: "A+ / EXCELLENT", desc: "Perfect authority record, extremely verified credentials", color: "text-emerald-800 bg-emerald-50 border-emerald-250" };
    }
    if (reputation >= 90) {
      return { grade: "A / RELIABLE", desc: "High authority trusted provider", color: "text-green-800 bg-green-50 border-green-250" };
    }
    if (reputation >= 80) {
      return { grade: "B / STABLE", desc: "Standard verified operator credentials", color: "text-slate-700 bg-slate-100 border-slate-200" };
    }
    return { grade: "C / PLAIN", desc: "Default network trust status under initial audits", color: "text-slate-600 bg-slate-50 border-slate-150" };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex justify-center items-center p-4 font-sans">
      <div 
        className="bg-white border-2 border-green-400 w-full max-w-6xl rounded-2xl shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-200"
        id="profile_modal_container"
      >
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-green-200 bg-gradient-to-r from-green-50 to-emerald-50/40">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-700 animate-pulse" />
            <div>
              <span className="text-xs font-black uppercase text-green-950 tracking-wider block">
                {isEditing ? "Dossier Configuration & Custom Display Workspace" : "Secure Freelancer Professional Profile Dossier"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                {isEditing ? "Configure all 8 requirements of your verified freelancing display profile." : "Explore verified member credentials, history & capability metrics."}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 px-3 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white transition-all rounded-lg font-bold text-xs"
            id="close_profile_modal"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Outer body */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40">
          
          {loading && !profile ? (
            <div className="py-24 text-center text-green-800 flex flex-col items-center justify-center gap-3 font-semibold uppercase tracking-widest text-xs h-full">
              <span className="relative flex h-10 w-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-10 w-10 bg-green-600 items-center justify-center text-white font-bold font-mono">HF</span>
              </span>
              <span>Fetching cryptographic node record...</span>
            </div>
          ) : error ? (
            <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center font-bold">
              Failed to pull user credentials: {error}
            </div>
          ) : profile ? (
            
            /* DUAL MODE split */
            isEditing ? (
              
              /* 1. BUILDER / CONFIGURATION MODE space */
              <div className="flex flex-col md:flex-row h-full min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
                
                {/* Side controller tabs */}
                <div className="w-full md:w-64 bg-slate-100 p-4 shrink-0 overflow-y-auto space-y-2 flex md:flex-col gap-1 md:gap-0 flex-wrap">
                  <div className="hidden md:block pb-2 mb-2 border-b border-slate-250 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    CONFIG SECTIONS
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("core")}
                    className={`w-full text-left px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                      activeEditorTab === "core" ? "bg-green-600 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Core Card Info
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("skills")}
                    className={`w-full text-left px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                      activeEditorTab === "skills" ? "bg-green-600 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" /> Skills & Certificates
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("history")}
                    className={`w-full text-left px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                      activeEditorTab === "history" ? "bg-green-600 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200"
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" /> Experience Timeline
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("portfolio")}
                    className={`w-full text-left px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                      activeEditorTab === "portfolio" ? "bg-green-600 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" /> Portfolio Gallery
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("availability")}
                    className={`w-full text-left px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                      activeEditorTab === "availability" ? "bg-green-600 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Availability & Pricing
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveEditorTab("badges")}
                    className={`w-full text-left px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                      activeEditorTab === "badges" ? "bg-green-600 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> KYC & Verification
                  </button>

                  <div className="pt-4 hidden md:block border-t border-slate-200/80 mt-6 text-[10px] text-slate-500 leading-normal">
                    <p className="font-bold text-slate-600">Pro Tip:</p>
                    Ensure your skills match trending market expectations to increase semantic search overlap scoring.
                  </div>
                </div>

                {/* Main panel */}
                <div className="flex-1 p-6 overflow-y-auto bg-white min-h-0 space-y-5">
                  
                  {activeEditorTab === "core" && (
                    <div className="space-y-4 max-w-2xl">
                      <h3 className="text-sm font-extrabold text-green-950 uppercase tracking-wider">// CORE PROFILE BIO & LOCATION //</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-650 font-bold mb-1">Professional Title</label>
                          <input 
                            type="text" 
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                            placeholder="e.g., Senior Full-Stack Node Engine Expert"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-650 font-bold mb-1">Geographical Home-base</label>
                          <input 
                            type="text" 
                            value={editLocation}
                            onChange={e => setEditLocation(e.target.value)}
                            className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                            placeholder="e.g., Bengaluru, India"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-650 font-bold mb-1">Dossier Bio Presentation (Public Overview)</label>
                        <textarea
                          value={editBio}
                          onChange={e => setEditBio(e.target.value)}
                          className="w-full text-xs p-3 border border-slate-300 rounded-lg h-32 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white leading-relaxed"
                          placeholder="Introduce yourself, your primary core values, development stack expertise..."
                        />
                      </div>

                      {/* Resume simulate section inside Core info */}
                      <div className="p-4 border border-green-200 rounded-xl bg-green-50/15 space-y-3.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-green-800" />
                          <span className="text-[11px] font-black uppercase text-green-950">Resume/CV Vetting Document</span>
                        </div>
                        
                        {uploadedFileName && (
                          <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 truncate">{uploadedFileName}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedFileName("");
                                setResumeUrl("");
                              }}
                              className="text-red-650 hover:underline text-[10px]"
                            >
                              Remove Docs
                            </button>
                          </div>
                        )}

                        <div className="relative">
                          <input 
                            type="file" 
                            accept=".pdf"
                            onChange={handleSimulateResumeUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="p-4 border-2 border-dashed border-green-300 rounded-lg text-center hover:bg-green-150/10 cursor-pointer">
                            <span className="text-xs font-bold text-green-800">
                              {uploadingResume ? "Reading system blocks & parsing..." : "Upload New PDF Resume"}
                            </span>
                            <span className="block text-[9px] text-slate-400 mt-1">Accepts raw and formatted .pdf CV documents</span>
                          </div>
                        </div>
                        {uploadSuccess && (
                          <span className="text-[10px] text-green-700 block text-center font-bold">
                            ✓ Document matrix synced & verified!
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {activeEditorTab === "skills" && (
                    <div className="space-y-6">
                      
                      {/* Skill management */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-extrabold text-green-950 uppercase tracking-wider">// SKILL PROFICIENCY MANAGER //</h3>
                        
                        <div className="flex gap-2 bg-slate-50 p-3.5 border border-slate-200 rounded-xl max-w-xl">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={newSkillName}
                              onChange={e => setNewSkillName(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && addSkill()}
                              className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
                              placeholder="Add skill (e.g., Node.js)"
                            />
                          </div>
                          <div>
                            <select
                              value={newSkillLevel}
                              onChange={e => setNewSkillLevel(e.target.value as any)}
                              className="text-xs p-2 border border-slate-300 rounded focus:outline-none bg-white font-semibold text-slate-700"
                            >
                              <option value="Pro">Pro / Senior</option>
                              <option value="Expert">Expert / Specialist</option>
                              <option value="Intermediate">Intermediate / Mid</option>
                              <option value="Beginner">Beginner</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={addSkill}
                            className="px-4 bg-green-700 hover:bg-green-800 text-white font-bold text-xs rounded transition-all flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 max-w-3xl pt-2">
                          {skillsList.map((s, idx) => (
                            <span key={idx} className="bg-white hover:bg-slate-50 pl-3 pr-1.5 py-1.5 border border-slate-350 rounded-xl shadow-sm text-xs font-semibold flex items-center gap-2 text-slate-800">
                              <span>{s.skill}</span>
                              <span className="text-[9px] font-bold text-green-700 font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-full uppercase">
                                {s.level}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => removeSkill(idx)} 
                                className="text-slate-400 hover:text-red-700 p-0.5"
                                title="Remove Skill"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {skillsList.length === 0 && (
                            <span className="text-slate-400 text-xs italic">No skill competencies added yet.</span>
                          )}
                        </div>
                      </div>

                      {/* Certifications management */}
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h3 className="text-sm font-extrabold text-green-950 uppercase tracking-wider">// CERTIFICATIONS & ACCREDITATIONS //</h3>
                        
                        <div className="flex gap-2 bg-slate-50 p-3.5 border border-slate-200 rounded-xl max-w-xl">
                          <input 
                            type="text" 
                            value={newCertName}
                            onChange={e => setNewCertName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addCert()}
                            className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
                            placeholder="Add credential card (e.g., Oracle Certified Professional)"
                          />
                          <button
                            type="button"
                            onClick={addCert}
                            className="px-4 bg-green-700 hover:bg-green-800 text-white font-bold text-xs rounded transition-all shrink-0 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> Add Certificate
                          </button>
                        </div>

                        <div className="space-y-2 max-w-2xl">
                          {certificationsList.map((cert, idx) => (
                            <div key={idx} className="p-2.5 bg-white border border-slate-250 rounded-lg flex items-center justify-between font-medium text-xs text-slate-850">
                              <span className="font-bold">{cert}</span>
                              <button 
                                type="button" 
                                onClick={() => removeCert(idx)} 
                                className="text-slate-400 hover:text-red-650 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {certificationsList.length === 0 && (
                            <span className="text-slate-400 text-xs italic">No certification credentials added yet.</span>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {activeEditorTab === "history" && (
                    <div className="space-y-5">
                      <h3 className="text-sm font-extrabold text-green-950 uppercase tracking-wider">// WORK EXPERIENCE TIME CHRONOLOGY //</h3>
                      
                      {/* Exp entry form */}
                      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3.5 max-w-2xl">
                        <span className="font-extrabold text-[10.5px] uppercase text-slate-550 block">Log Professional Position Timeline Block</span>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-500 font-bold mb-1">Company / Authority</label>
                            <input 
                              type="text" 
                              value={newExpCompany}
                              onChange={e => setNewExpCompany(e.target.value)}
                              className="w-full p-2.5 border border-slate-300 rounded bg-white"
                              placeholder="e.g., Mindspark Tech Ltd"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 font-bold mb-1">Role / Grade</label>
                            <input 
                              type="text" 
                              value={newExpRole}
                              onChange={e => setNewExpRole(e.target.value)}
                              className="w-full p-2.5 border border-slate-300 rounded bg-white"
                              placeholder="e.g., Principal UI Engineer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 text-xs">
                          <div>
                            <label className="block text-slate-500 font-bold mb-1">Duration / Years</label>
                            <input 
                              type="text" 
                              value={newExpDuration}
                              onChange={e => setNewExpDuration(e.target.value)}
                              className="w-full p-2.5 border border-slate-300 rounded bg-white animate-pulse"
                              placeholder="e.g., 2023 - 2025"
                            />
                          </div>
                        </div>

                        <div className="text-xs">
                          <label className="block text-slate-500 font-bold mb-1">Role responsibilities & results logged</label>
                          <textarea
                            value={newExpDesc}
                            onChange={e => setNewExpDesc(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded bg-white h-20"
                            placeholder="Detail your engineering victories, stack details, and contributions..."
                          />
                        </div>

                        <button
                          type="button"
                          onClick={addExperience}
                          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs rounded transition-all"
                        >
                          → Append Position To Timeline
                        </button>
                      </div>

                      {/* Chronology display to delete */}
                      <div className="space-y-4 max-w-2xl pt-2">
                        <span className="font-extrabold text-[10.5px] uppercase text-slate-500 block">Logged Chronology Records:</span>
                        {experienceList.map((item, idx) => (
                          <div key={item.id || idx} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-start justify-between shadow-sm">
                            <div className="space-y-1 text-left text-xs">
                              <h4 className="font-extrabold text-green-950 text-xs">{item.role}</h4>
                              <p className="font-bold text-slate-500 text-[10px]">{item.company} • {item.duration}</p>
                              <p className="text-slate-650 text-[10px] leading-relaxed pt-1">{item.description}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExperience(item.id)}
                              className="text-red-650 hover:bg-red-50 p-2 rounded transition-colors"
                              title="Delete position entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {experienceList.length === 0 && (
                          <span className="text-slate-400 text-xs italic">No chronology steps logged.</span>
                        )}
                      </div>

                    </div>
                  )}

                  {activeEditorTab === "portfolio" && (
                    <div className="space-y-6">
                      <h3 className="text-sm font-extrabold text-green-950 uppercase tracking-wider">// WORK PORTFOLIO GALLERY MANAGER //</h3>
                      
                      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 max-w-2xl">
                        <span className="font-extrabold text-[10.5px] uppercase text-slate-550 block">Log New Showcase Piece</span>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-500 font-bold mb-1">Project Name / Title</label>
                            <input 
                              type="text" 
                              value={newPortTitle}
                              onChange={e => setNewPortTitle(e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded bg-white"
                              placeholder="e.g., Multi-escrow Oracle Gateway"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 font-bold mb-1">Repository / Deployment URL</label>
                            <input 
                              type="text" 
                              value={newPortRepo}
                              onChange={e => setNewPortRepo(e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded bg-white"
                              placeholder="e.g., https://github.com/github"
                            />
                          </div>
                        </div>

                        <div className="text-xs">
                          <label className="block text-slate-500 font-bold mb-1">Project Summary / Vibe description</label>
                          <textarea
                            value={newPortDesc}
                            onChange={e => setNewPortDesc(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded bg-white h-16"
                            placeholder="Describe how this showcases your skills..."
                          />
                        </div>

                        {/* Image selection */}
                        <div className="space-y-2">
                          <label className="block text-xs text-slate-500 font-bold">Showcase Card Backing Image</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {portfolioImagePresets.map((img, iIdx) => (
                              <button
                                key={iIdx}
                                type="button"
                                onClick={() => setNewPortImage(img.url)}
                                className={`p-1 rounded-lg border-2 text-left transition-all ${
                                  newPortImage === img.url ? "border-green-600 bg-green-50/20" : "border-slate-200 bg-white"
                                }`}
                              >
                                <img src={img.url} alt={img.label} className="w-full h-12 object-cover rounded" />
                                <span className="block text-[8px] text-slate-500 font-bold text-center mt-1 truncate">{img.label}</span>
                              </button>
                            ))}
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mt-1">Or paste any public image link below directly:</span>
                            <input 
                              type="text" 
                              value={newPortImage}
                              onChange={e => setNewPortImage(e.target.value)}
                              className="w-full text-xs p-2.5 border border-slate-250 rounded bg-white mt-1"
                              placeholder="https://images.unsplash.com/your-custom-link"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={addPortfolio}
                          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs rounded transition-all"
                        >
                          → Add Showcase Card To Gallery
                        </button>
                      </div>

                      {/* Render Portfolio blocks with option to delete */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl pt-2">
                        {portfolioList.map((port, idx) => (
                          <div key={port.id || idx} className="border border-slate-250 rounded-xl overflow-hidden flex flex-col bg-white hover:border-red-300 transition-all relative">
                            <img src={port.imageUrl} alt={port.title} className="w-full h-24 object-cover" />
                            <div className="p-3 flex-1 flex flex-col justify-between">
                              <div className="space-y-0.5 text-left text-xs">
                                <h4 className="font-extrabold text-green-950">{port.title}</h4>
                                <p className="text-slate-500 text-[10px] line-clamp-2 leading-normal">{port.description}</p>
                              </div>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                {port.projectUrl && (
                                  <span className="text-[9px] text-slate-450 flex items-center gap-0.5 truncate font-mono">
                                    <Globe className="w-3 h-3 text-slate-400" /> Web Link
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removePortfolio(port.id)}
                                  className="text-red-650 hover:underline text-[10px] font-bold uppercase ml-auto"
                                >
                                  Delete Piece
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {portfolioList.length === 0 && (
                          <span className="text-slate-400 text-xs italic sm:col-span-2">No portfolio items listed.</span>
                        )}
                      </div>

                    </div>
                  )}

                  {activeEditorTab === "availability" && (
                    <div className="space-y-5 max-w-2xl">
                      <h3 className="text-sm font-extrabold text-green-950 uppercase tracking-wider">// CONTRACT AVAILABILITY & MILESTONE FEES //</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-650 font-bold mb-1">Weekly Hourly Capacity</label>
                          <input 
                            type="number"
                            value={availHours}
                            onChange={e => setAvailHours(Number(e.target.value))}
                            className="w-full text-xs p-3 border border-slate-350 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-650 font-bold mb-1">Availability Status</label>
                          <select
                            value={availStatus}
                            onChange={e => setAvailStatus(e.target.value as any)}
                            className="w-full text-xs p-3 border border-slate-350 rounded-lg focus:outline-none bg-white font-bold"
                          >
                            <option value="Available">Available (Ready to build)</option>
                            <option value="Part-time">Part-time Slots</option>
                            <option value="Busy">Busy on Escrows</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs text-slate-650 font-bold mb-1">Global Hourly Rate fee (INR)</label>
                          <input 
                            type="number"
                            value={editHourlyRate}
                            onChange={e => setEditHourlyRate(Number(e.target.value))}
                            className="w-full text-xs p-3 border border-slate-350 rounded-lg focus:outline-none bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-650 font-bold mb-1">Minimum Proposed Milestone Size (INR)</label>
                          <input 
                            type="number"
                            value={editMilestoneMin}
                            onChange={e => setEditMilestoneMin(Number(e.target.value))}
                            className="w-full text-xs p-3 border border-slate-350 rounded-lg focus:outline-none bg-white"
                          />
                        </div>
                      </div>

                      {/* Day checkboxes toggle */}
                      <div className="p-3 border border-slate-200 bg-slate-50/50 rounded-xl space-y-2">
                        <span className="text-slate-500 font-extrabold text-[10px] uppercase block">Operational Working Days</span>
                        <div className="flex flex-wrap gap-2.5">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                            const active = availDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all ${
                                  active 
                                    ? "bg-green-600 text-white border-green-700 shadow-sm" 
                                    : "bg-white text-slate-500 border-slate-300"
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Slots builder */}
                      <div className="p-3.5 border border-slate-200 bg-slate-50/50 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-extrabold text-[10px] uppercase block">Hourly Scheduling Slots</span>
                          <span className="text-[9px] text-slate-400 font-mono">Clients book from these availability windows</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availSlots.map((slot) => (
                            <div 
                              key={slot} 
                              className="px-2.5 py-1 bg-white border border-slate-250 hover:border-red-200 rounded-lg text-xs flex items-center gap-1.5 font-mono shadow-xs"
                            >
                              <span>{slot}</span>
                              <button 
                                type="button"
                                onClick={() => setAvailSlots(availSlots.filter(s => s !== slot))}
                                className="text-red-400 hover:text-red-600 text-[10px] font-bold cursor-pointer"
                                title="Delete Slot"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          {availSlots.length === 0 && (
                            <span className="text-xs text-slate-400 italic">No custom slots configured. Clients can request any time.</span>
                          )}
                        </div>

                        {/* Input form element to add slots */}
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            id="new-slot-input"
                            placeholder="e.g. 10:00 AM - 11:30 AM" 
                            className="flex-1 p-2 border border-slate-350 rounded-lg text-xs bg-white focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val && !availSlots.includes(val)) {
                                  setAvailSlots([...availSlots, val]);
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }
                            }}
                          />
                          <button 
                            type="button" 
                            helper-id="add-slot-btn"
                            onClick={() => {
                              const inputEl = document.getElementById("new-slot-input") as HTMLInputElement;
                              const val = inputEl?.value.trim();
                              if (val && !availSlots.includes(val)) {
                                setAvailSlots([...availSlots, val]);
                                inputEl.value = "";
                              }
                            }}
                            className="px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            + Add Time Slot
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {activeEditorTab === "badges" && (
                    <div className="space-y-4 max-w-2xl">
                      <h3 className="text-sm font-extrabold text-green-950 uppercase tracking-wider">// VERIFICATION BADGE & IDENTITY REGISTRY //</h3>
                      <p className="text-slate-550 text-xs leading-relaxed">
                        To lock escrow with elite clients, we recommend upgrading your node verification clearance status. You can instantaneously perform matching, resume credential checking, and secure identity attestation.
                      </p>

                      <div className="p-5 border-2 border-green-300 rounded-xl bg-green-50/20 space-y-4 text-center">
                        <div className="flex justify-center">
                          <CheckCircle className="w-10 h-10 text-green-700 animate-bounce" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-green-950 text-sm">Instantaneous Node KYC Attestation</h4>
                          <p className="text-[10px] text-slate-500">
                            Run automatic verification algorithms to certify identity, skill competence, and background escrow registries.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerBadgeCertificationSimulated();
                            setActiveEditorTab("core");
                          }}
                          className="px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all inline-block"
                        >
                          ★ Simulate Immediate Verification Clearence
                        </button>
                      </div>

                      {/* Display Badges */}
                      <div className="space-y-2">
                        <span className="font-extrabold text-[10px] text-slate-500 uppercase block">Certified Accreditations Status:</span>
                        {badgesList.map((badge, idx) => (
                          <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-green-600" />
                              <div className="text-xs text-left">
                                <span className="font-bold text-slate-800 block text-xs">{badge.badgeType} Cleared</span>
                                <span className="text-[8px] text-slate-400 block font-mono">Blockchain block registry: confirmed</span>
                              </div>
                            </div>
                            <span className="bg-green-100 text-green-800 border-green-250 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                              {badge.status}
                            </span>
                          </div>
                        ))}
                        {badgesList.length === 0 && (
                          <span className="text-slate-400 text-xs italic block mt-1">No credentials vetted in active registries. Upgrade to start billing.</span>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              </div>

            ) : (
              
              /* 2. DOSSIER PREVIEW / CLIENT EXPLORE MODE space (Default) */
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT PROFILE CARD (4 cols) */}
                  <div className="lg:col-span-5 space-y-5">
                    
                    <div className="p-6 border border-green-200 bg-green-50/15 rounded-xl space-y-4 shadow-sm text-center relative overflow-hidden">
                      {/* High-quality display design frame overlay */}
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-green-500 via-emerald-450 to-teal-500" />

                      <div className="relative inline-block mx-auto">
                        <img 
                          src={profile.avatar} 
                          alt={profile.name} 
                          className="w-24 h-24 rounded-full mx-auto border-4 border-green-100 shadow-md object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isVerified && (
                          <span className="absolute bottom-1 right-1 bg-green-650 border-2 border-white p-1 rounded-full text-white shadow" title="Peer Node KYC Verified">
                            <ShieldCheck className="w-4.5 h-4.5" />
                          </span>
                        )}
                      </div>

                      <div>
                        <h2 className="text-base font-black text-green-950 flex items-center justify-center gap-1.5">
                          {profile.name}
                        </h2>
                        <span className="text-[10px] font-black tracking-widest uppercase text-green-700 bg-green-50 border border-green-200/80 px-2.5 py-0.5 rounded-full inline-block mt-1">
                          {profile.title || "Elite Peer Freelancer"}
                        </span>
                        <div className="flex items-center justify-center text-[11px] text-slate-500 gap-1 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{profile.location}</span>
                        </div>
                      </div>

                      {/* Pricing Matrix */}
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-green-100/85 text-left">
                        <div className="p-2.5 bg-white border border-green-100 rounded-lg">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Hourly Rate</span>
                          <strong className="text-sm font-extrabold text-green-900 font-mono">
                            ₹{(profile.pricing?.hourlyRate || profile.hourlyRate || 1500).toLocaleString()}/hr
                          </strong>
                        </div>
                        <div className="p-2.5 bg-white border border-green-100 rounded-lg">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Milestone Min</span>
                          <strong className="text-sm font-extrabold text-green-900 font-mono">
                            ₹{(profile.pricing?.milestoneMin || 7500).toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      {/* Profile Edit or DM buttons */}
                      {isOwnProfile ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(true);
                            setActiveEditorTab("core");
                          }}
                          className="w-full py-2.5 bg-green-700 hover:bg-green-850 text-white font-extrabold hover:shadow border border-green-550 tracking-wider uppercase text-[10.5px] rounded-xl transition-all"
                        >
                          ⚙ Customise & Add Display Credentials
                        </button>
                      ) : (
                        onDirectMessage && (
                          <button
                            type="button"
                            onClick={() => onDirectMessage(profile.id)}
                            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-extrabold uppercase tracking-wider text-[10.5px] rounded-xl shadow transition-all flex items-center justify-center gap-2"
                          >
                            <User className="w-3.5 h-3.5" /> Start Private Escrow Dialogue
                          </button>
                        )
                      )}
                    </div>

                    {/* VERIFICATION BADGES SYSTEM */}
                    <div className="p-4 border border-green-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-green-100/80">
                        <ShieldCheck className="w-4 h-4 text-green-700" />
                        <span className="text-[10px] font-black uppercase text-green-950 tracking-wider">
                          Verification Badge System (KYC Vetted)
                        </span>
                      </div>

                      <div className="space-y-2 text-[10.5px]">
                        {(profile.badges || []).map((badge, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                              <div>
                                <span className="font-bold text-slate-800">{badge.badgeType} Clearance</span>
                                <span className="text-[8px] text-slate-400 block">Issued: {new Date(badge.issuedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <span className="px-1.5 py-0.5 bg-green-100/70 border border-green-300 text-green-800 font-bold text-[8px] uppercase tracking-wider rounded-full">
                              {badge.status}
                            </span>
                          </div>
                        ))}
                        {!profile.badges?.length && (
                          <div className="p-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <span className="text-[10px] text-slate-400 italic block">No credentials logged yet under audited networks</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AVAILABILITY CALENDAR */}
                    <div className="p-4 border border-green-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-green-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-green-700" />
                          <span className="text-[10px] font-black uppercase text-green-950 tracking-wider">
                            Availability Calendar
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-green-850 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase font-black tracking-widest">
                          {profile.availability?.status || "Available"}
                        </span>
                      </div>

                      <div className="space-y-3.5 text-[10.5px]">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Weekly Availability Capacity:</span>
                          <strong className="text-slate-900 font-bold font-mono">{profile.availability?.weeklyHours || 40} Hrs/week</strong>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-450 text-[9px] uppercase tracking-wider font-extrabold block">Preferred Booking Slots</span>
                          <div className="grid grid-cols-5 gap-1 text-center">
                            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => {
                              const isBookable = profile.availability?.availableDays?.includes(day) || !profile.availability;
                              return (
                                <div 
                                  key={day} 
                                  className={`p-1.5 rounded-md border font-bold text-[9px] ${
                                    isBookable 
                                      ? "bg-green-55/70 border-green-200 text-green-800" 
                                      : "bg-slate-50 border-slate-200 text-slate-400"
                                  }`}
                                >
                                  {day}
                                  <span className="block text-[8px] mt-0.5 text-green-600 font-normal">{isBookable ? "Free" : "Busy"}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom slots list */}
                        <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
                          <span className="text-slate-450 text-[9px] uppercase tracking-wider font-extrabold block">Preferred Time Windows</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(profile.availability?.availableSlots || ["09:00 AM - 10:00 AM", "11:00 AM - 12:00 PM", "02:05 PM - 03:00 PM", "04:00 PM - 05:00 PM"]).map((slot) => (
                              <span key={slot} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[9px] font-mono font-medium text-slate-700">
                                🕒 {slot}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Scheduler client booking form */}
                        {profile.id !== currentUserId && (
                          <form onSubmit={handleCreateBooking} className="mt-4 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3.5 text-left font-sans text-xs">
                            <div className="flex items-center gap-1.5 pb-1 border-b border-indigo-100">
                              <Calendar className="w-4 h-4 text-indigo-700 animate-pulse" />
                              <div>
                                <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wide">Instant Schedule Session</span>
                                <span className="text-[9.5px] text-slate-500">Auto-locks calendar slots within escrow guidelines</span>
                              </div>
                            </div>

                            {bookingSuccessMsg && (
                              <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-[10.5px] font-medium leading-relaxed">
                                {bookingSuccessMsg}
                              </div>
                            )}

                            {bookingErrorMsg && (
                              <div className="p-2.5 bg-red-100 border border-red-300 text-red-800 rounded-lg text-[10.5px] font-mono leading-relaxed">
                                ⚠️ {bookingErrorMsg}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-[8.5px] uppercase font-bold text-slate-500 mb-1">Select date</label>
                                <input 
                                  type="date"
                                  value={bookingDate}
                                  onChange={(e) => setBookingDate(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-255 rounded-lg focus:ring-1 focus:ring-indigo-500 text-xs text-slate-700 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[8.5px] uppercase font-bold text-slate-500 mb-1">Select preferred slot</label>
                                <select
                                  value={bookingSlot}
                                  onChange={(e) => setBookingSlot(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-255 rounded-lg focus:ring-1 focus:ring-indigo-500 text-xs text-slate-700 font-bold focus:outline-none"
                                >
                                  <option value="">-- Choose Slot --</option>
                                  {(profile.availability?.availableSlots || ["09:00 AM - 10:00 AM", "11:00 AM - 12:00 PM", "02:05 PM - 03:00 PM", "04:00 PM - 05:00 PM"]).map((slot) => (
                                    <option key={slot} value={slot}>{slot}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[8.5px] uppercase font-bold text-slate-500 mb-1">Consultation Agenda Notes (Optional)</label>
                              <textarea
                                value={bookingNotes}
                                onChange={(e) => setBookingNotes(e.target.value)}
                                placeholder="Describe contract deliverables review or project brief specifications..."
                                className="w-full p-2 bg-white border border-slate-255 rounded-lg focus:ring-1 focus:ring-indigo-500 text-xs focus:outline-none"
                                rows={2}
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={bookingLoading}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-lg shadow-sm transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {bookingLoading ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Booking Slot...
                                </>
                              ) : (
                                "Confirm Consultation Booking"
                              )}
                            </button>

                            <div className="text-center text-[7.5px] text-slate-400 font-mono uppercase tracking-wider">
                              ⚡ Fully integrated with contract workflow audits
                            </div>
                          </form>
                        )}

                      </div>
                    </div>

                    {/* RESUME UPLOAD SECTION (DOWNLOADING/CHECKING) */}
                    <div className="p-4 border border-green-200 rounded-xl bg-slate-50/50 space-y-3">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-green-150">
                        <FileText className="w-4 h-4 text-green-800" />
                        <span className="text-[10px] font-black uppercase text-green-950 tracking-wider">
                          Resumes & Documentation Clearence
                        </span>
                      </div>

                      <div className="space-y-2 text-[10.5px]">
                        {profile.resumeUrl ? (
                          <div className="p-2.5 bg-white border border-slate-250 rounded-lg flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                              <FileText className="w-4 h-4 text-red-505 shrink-0" />
                              <div className="truncate">
                                <span className="font-extrabold text-slate-800 text-[10px] block truncate">{profile.resumeFileName || "Curriculum_Vitae_Official.pdf"}</span>
                                <span className="text-[8px] text-slate-400 block font-mono">PDF Archive • Secure Verified Check</span>
                              </div>
                            </div>
                            <a 
                              href={profile.resumeUrl} 
                              download 
                              className="px-2.5 py-1 bg-green-55/70 hover:bg-green-600 hover:text-white text-green-800 border border-green-250 rounded font-bold text-[9px] uppercase flex items-center gap-1 shadow-sm transition-all"
                            >
                              <Download className="w-3 h-3" /> Get PDF
                            </a>
                          </div>
                        ) : (
                          <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                            <span className="text-[10px] text-slate-400 italic block">No validated document dossiers uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* RIGHT PROFESSIONAL PROFILE SPLIT (7 cols) */}
                  <div className="lg:col-span-7 space-y-5">
                    
                    {/* Dossier Summary BIO */}
                    <div className="p-4 border border-green-150 bg-gradient-to-br from-green-50/20 to-emerald-50/5 rounded-xl space-y-2 text-left">
                      <span className="text-[10px] font-black uppercase text-green-950 tracking-widest block">// CORE CREDENTIAL SUMMARY //</span>
                      <p className="text-[11.5px] text-slate-705 leading-relaxed font-sans whitespace-pre-line">
                        {profile.bio || "This expert has not completed their core credential summary introduction yet."}
                      </p>
                    </div>

                    {/* SKILLS WITH PROFICIENCY LEVEL */}
                    <div className="p-5 border border-green-200 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-green-150">
                        <Award className="w-4 h-4 text-green-800" />
                        <span className="text-[11px] font-black uppercase text-green-950 tracking-wider">
                          Skills & Proficiency Matrices
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[10.5px]">
                        {(profile.skillsWithProficiency || []).map((meta, idx) => {
                          const levelToColor: Record<string, string> = {
                            "Pro": "bg-emerald-600 text-white border-emerald-700",
                            "Expert": "bg-green-500 text-white border-green-600",
                            "Intermediate": "bg-green-100 text-green-850 border-green-250",
                            "Beginner": "bg-slate-100 text-slate-700 border-slate-200"
                          };
                          const widthPercentage: Record<string, string> = {
                            "Pro": "w-full",
                            "Expert": "w-[85%]",
                            "Intermediate": "w-[60%]",
                            "Beginner": "w-[35%]"
                          };

                          return (
                            <div key={idx} className="p-2.5 bg-slate-50/60 border border-slate-200 rounded-lg space-y-1.5 text-left">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-green-950">{meta.skill}</span>
                                <span className={`px-2 py-0.2 border rounded-full font-bold text-[8px] uppercase tracking-wider ${levelToColor[meta.level] || "bg-slate-100"}`}>
                                  {meta.level}
                                </span>
                              </div>
                              
                              {/* Simulated mini progress bar */}
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className={`${widthPercentage[meta.level] || "w-[50%]"} bg-gradient-to-r from-green-500 to-emerald-650 h-full rounded-full`} />
                              </div>
                            </div>
                          );
                        })}
                        {!profile.skillsWithProficiency?.length && (
                          <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 italic font-medium col-span-2">
                            No skills mapped in this expert's matrices.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* WORK EXPERIENCE TIMELINE */}
                    <div className="p-5 border border-green-200 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-green-150">
                        <Briefcase className="w-4 h-4 text-green-800" />
                        <span className="text-[11px] font-black uppercase text-green-950 tracking-wider">
                          Work Experience Timeline
                        </span>
                      </div>

                      <div className="relative pl-6 border-l-2 border-green-200 space-y-5 text-[11px] text-slate-700 text-left">
                        {(profile.experience || []).map((item, idx) => (
                          <div key={item.id || idx} className="relative space-y-1">
                            {/* Timeline visual marker */}
                            <span className="absolute -left-[31px] top-1.5 bg-green-100 border-2 border-green-600 rounded-full w-3.5 h-3.5 block" />
                            
                            <div className="flex flex-wrap items-center justify-between gap-x-2">
                              <strong className="text-sm font-black text-green-950">{item.role}</strong>
                              <span className="text-[9px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {item.duration}
                              </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{item.company}</p>
                            <p className="text-slate-650 text-[10.5px] leading-relaxed pt-1 whitespace-pre-line">{item.description}</p>
                          </div>
                        ))}
                        {!profile.experience?.length && (
                          <div className="py-6 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-xl text-center text-slate-400 italic">
                            No chronologic work positions uploaded
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CERTIFICATIONS */}
                    <div className="p-5 border border-green-200 rounded-xl space-y-3.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-green-150">
                        <Award className="w-4 h-4 text-green-800" />
                        <span className="text-[11px] font-black uppercase text-green-950 tracking-wider">
                          Certifications & Accreditation Keys
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-[10.5px]">
                        {(profile.certifications || []).map((cert, idx) => (
                          <div key={idx} className="p-2.5 bg-green-50/10 hover:bg-green-50/30 border border-green-150 rounded-lg flex items-center justify-between text-left transition-colors">
                            <div className="flex items-center gap-2.5">
                              <Check className="w-4 h-4 text-green-700 shrink-0" />
                              <span className="font-bold text-slate-800">{cert}</span>
                            </div>
                            <span className="text-[8px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full uppercase shrink-0">
                              Verified Key
                            </span>
                          </div>
                        ))}
                        {!profile.certifications?.length && (
                          <div className="py-6 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-xl text-center text-slate-400 italic">
                            No accreditations registered
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PORTFOLIO GALLERY */}
                    <div className="p-5 border border-green-200 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-green-150">
                        <Grid className="w-4 h-4 text-green-800" />
                        <span className="text-[11px] font-black uppercase text-green-950 tracking-wider">
                          Work Showcase Portfolio Gallery
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10.5px]">
                        {(profile.portfolio || []).map((port, idx) => (
                          <div key={port.id || idx} className="border border-green-150/80 rounded-xl hover:shadow-md transition-all overflow-hidden flex flex-col bg-white">
                            <img 
                              src={port.imageUrl} 
                              alt={port.title} 
                              className="w-full h-28 object-cover border-b border-green-100"
                            />
                            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 text-left">
                              <div className="space-y-1">
                                <h4 className="font-bold text-green-950 text-xs truncate" title={port.title}>{port.title}</h4>
                                <p className="text-[10px] text-slate-650 leading-relaxed max-h-[48px] overflow-hidden line-clamp-2">
                                  {port.description}
                                </p>
                              </div>

                              {port.projectUrl && (
                                <a 
                                  href={port.projectUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[9.5px] text-green-700 hover:text-green-900 font-extrabold flex items-center gap-1 hover:underline self-start pt-1.5"
                                >
                                  Inspect Repository <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {!profile.portfolio?.length && (
                          <div className="py-8 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-xl text-center text-slate-400 italic sm:col-span-2">
                            No portfolio components cataloged yet in active galleries
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SMART REPUTATION & REVIEWS AUDIT ENGINE PANEL */}
                    <div id="smart-trust-engine-panel" className="p-5 border-2 border-emerald-500/30 bg-emerald-50/5 rounded-2xl space-y-5 shadow-sm text-left">
                      
                      {/* Section Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-emerald-500 text-white rounded-lg">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase text-emerald-950 tracking-wider">TrustEngine™ Reputation Audit</h3>
                            <p className="text-[10px] text-slate-500">Autonomous weighted evaluation, identity vetting, and fraud checks.</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold font-mono text-[9px] uppercase tracking-wider rounded-md animate-pulse">
                          Audit Active
                        </span>
                      </div>

                      {/* 1. REVIEW ANALYTICS METRICS DASHBOARD */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        
                        {/* Circle Score */}
                        <div className="p-3 bg-white border border-emerald-100 rounded-xl flex flex-col justify-between items-center text-center">
                          <span className="text-[8.5px] uppercase font-black text-slate-400">Weighted Reputation</span>
                          
                          <div className="relative flex items-center justify-center my-2">
                            <svg className="w-14 h-14 transform -rotate-90">
                              <circle cx="28" cy="28" r="24" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                              <circle 
                                cx="28" 
                                cy="28" 
                                r="24" 
                                stroke="#10b981" 
                                strokeWidth="4" 
                                fill="transparent" 
                                strokeDasharray={150} 
                                strokeDashoffset={150 - (150 * (profile?.reputationScore || 70)) / 100} 
                              />
                            </svg>
                            <span className="absolute text-sm font-black text-emerald-950 font-mono">
                              {profile?.reputationScore || 70}%
                            </span>
                          </div>

                          <span className="text-[8px] text-slate-400">Weighted average index</span>
                        </div>

                        {/* Verified Volume */}
                        <div className="p-3 bg-white border border-emerald-100 rounded-xl flex flex-col justify-between">
                          <span className="text-[8.5px] uppercase font-black text-slate-400 block mb-1">Verified Escrow Vol</span>
                          <div className="my-2 text-center">
                            <div className="text-lg font-black text-emerald-800 font-mono">
                              ₹{reviews.filter(r => r.isVerified && !r.isSuspicious).reduce((acc, r) => acc + (r.budgetSize || 0), 0).toLocaleString()}
                            </div>
                            <span className="text-[9px] text-slate-500 block mt-0.5">Across {reviews.filter(r => r.isVerified).length} verified deals</span>
                          </div>
                          <span className="text-[7.5px] text-slate-400 block text-center border-t border-slate-50 pt-1">Escrowed & Paid Contracts</span>
                        </div>

                        {/* Trust Index Level */}
                        <div className="p-3 bg-white border border-emerald-100 rounded-xl flex flex-col justify-between">
                          <span className="text-[8.5px] uppercase font-black text-slate-400 block mb-1">Trust Integrity Risk</span>
                          <div className="my-2 text-center">
                            {(() => {
                              const suspCnt = reviews.filter(r => r.isSuspicious).length;
                              const rep = profile?.reputationScore || 70;
                              const indexCard = getTrustGrade(rep, suspCnt);
                              return (
                                <>
                                  <div className={`px-2 py-1 rounded font-black text-[10px] inline-block uppercase tracking-wider ${indexCard.color}`}>
                                    {indexCard.grade}
                                  </div>
                                  <span className="text-[8px] text-slate-500 block mt-1 leading-tight">{indexCard.desc}</span>
                                </>
                              );
                            })()}
                          </div>
                          <span className="text-[7.5px] text-slate-400 block text-center border-t border-slate-50 pt-1">Fraud rules checking live</span>
                        </div>

                      </div>

                      {/* Stars distribution visual chart details */}
                      <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-black pb-1.5 border-b border-slate-100 font-sans">
                          <span>Star Rating Distribution</span>
                          <span>Weighted Authority Ratio</span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const pct = getStarPercentage(stars);
                            return (
                              <div key={stars} className="flex items-center gap-2.5 text-[9.5px]">
                                <span className="w-3 text-slate-500 font-bold text-right font-mono">{stars}★</span>
                                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-150">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all" 
                                    style={{ width: `${pct}%` }} 
                                  />
                                </div>
                                <span className="w-7 text-right text-slate-500 font-bold font-mono">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. PLAYGROUND: FRAUD & VERIFICATION SIMULATOR TOOL */}
                      {currentUserId && currentUserId !== userId && (
                        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-4 shadow-inner relative overflow-hidden border border-slate-950">
                          <div className="absolute top-0 right-0 p-1.5 bg-amber-500 text-slate-950 font-sans font-bold text-[8px] uppercase tracking-widest rounded-bl-lg">
                            Demo Simulator
                          </div>
                          
                          <div className="space-y-1 border-b border-slate-800 pb-2">
                            <h4 className="text-xs font-black text-amber-400 flex items-center gap-1 font-sans">
                              <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none animate-spin" /> Live Fraud Auditing Simulator
                            </h4>
                            <p className="text-[9px] text-slate-300 leading-tight">
                              Simulate transactions under diverse escrow budgets, contract latency, and peer reciprocal feedback to observe how the TrustEngine filters fake, biased, or microbudget-inflated reviews.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-[10px]">
                            
                            {/* Stars selector & Budget */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[8.5px] uppercase font-black text-slate-400 font-mono mb-1">Set Star Rating:</label>
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                      type="button"
                                      key={s}
                                      onClick={() => setTestRating(s)}
                                      className={`p-1.5 rounded flex-1 font-bold transition-all text-xs border ${
                                        testRating >= s 
                                          ? "bg-amber-400 text-slate-950 border-amber-500" 
                                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                                      }`}
                                    >
                                      {s}★
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-[8.5px] uppercase font-black text-slate-400 font-mono mb-1 font-sans">Contract Budget (INR):</label>
                                <div className="flex gap-2.5 items-center">
                                  <input 
                                    type="range" 
                                    min="100" 
                                    max="100000" 
                                    step="100"
                                    value={testBudget} 
                                    onChange={(e) => setTestBudget(Number(e.target.value))}
                                    className="flex-1 accent-emerald-500"
                                  />
                                  <span className="font-mono bg-slate-800 p-1 rounded font-black text-amber-300 w-16 text-center shrink-0">
                                    ₹{testBudget}
                                  </span>
                                </div>
                                <span className="text-[8px] text-slate-400 mt-0.5 block">
                                  Budgets under ₹500 instantly trigger the **Micro-budget Rating Farm Filter**.
                                </span>
                              </div>
                            </div>

                            {/* Threat factors selection checkboxes */}
                            <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-left">
                              <span className="text-[8.5px] uppercase font-black text-slate-400 block font-mono border-b border-slate-800 pb-1 mb-1">Simulation Threat Vectors:</span>
                              
                              <label className="flex items-center gap-2 select-none cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={testSpeedRun}
                                  onChange={(e) => setTestSpeedRun(e.target.checked)}
                                  className="rounded text-red-500 focus:ring-0 accent-red-500 w-3.5 h-3.5"
                                />
                                <div>
                                  <span className="font-bold text-red-350">Violate Completion Speed</span>
                                  <span className="block text-[8px] text-slate-400">Simulate completing contract in under 3 minutes</span>
                                </div>
                              </label>

                              <label className="flex items-center gap-2 select-none cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={testDuplicate}
                                  onChange={(e) => setTestDuplicate(e.target.checked)}
                                  className="rounded text-red-500 focus:ring-0 accent-red-500 w-3.5 h-3.5"
                                />
                                <div>
                                  <span className="font-bold text-red-355">Simulate Repetitive Spam</span>
                                  <span className="block text-[8px] text-slate-400">Force duplicate comment string reuse filter</span>
                                </div>
                              </label>

                              <label className="flex items-center gap-2 select-none cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={testReciprocal}
                                  onChange={(e) => setTestReciprocal(e.target.checked)}
                                  className="rounded text-red-500 focus:ring-0 accent-red-505 w-3.5 h-3.5"
                                />
                                <div>
                                  <span className="font-bold text-red-355">Simulate Collusion Loop</span>
                                  <span className="block text-[8px] text-slate-400">Pre-feed peer reciprocal review loop handshake</span>
                                </div>
                              </label>

                            </div>

                          </div>

                          {/* Comment input & submit button */}
                          <div className="space-y-2 pt-1.5 border-t border-slate-800 text-left">
                            <label className="block text-[8.5px] uppercase font-black text-slate-400 font-mono">Review Comment Letter (*Required):</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={testComment}
                                onChange={(e) => setTestComment(e.target.value)}
                                placeholder="E.g., Excellent and compliant work setting up secure modules..."
                                className="flex-1 p-2 bg-slate-950 border border-slate-700 text-white rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                              />
                              <button
                                type="button"
                                onClick={handleDeploySimulatedReview}
                                disabled={isDeployingReview}
                                className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-[10px] rounded uppercase shrink-0 flex items-center gap-1 transition-all"
                              >
                                {isDeployingReview ? "Analyzing..." : "Deploy Audit & Post ★"}
                              </button>
                            </div>

                            {testSuccessMsg && (
                              <div className="p-2.5 bg-emerald-950 border border-emerald-500 text-emerald-350 rounded font-bold text-[9px] text-left animate-pulse font-mono">
                                ✅ {testSuccessMsg}
                              </div>
                            )}

                            {testErrorMsg && (
                              <div className="p-2.5 bg-red-950 border border-red-500 text-red-300 rounded font-bold text-[9px] text-left font-mono">
                                ❌ {testErrorMsg}
                              </div>
                            )}
                          </div>

                        </div>
                      )}

                      {/* 3. AUDITED REVIEWS LIST STREAM */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase text-emerald-950 tracking-wider block">Audited Reviews Stream ({reviews.length})</span>
                        
                        {reviewsLoading ? (
                          <div className="py-6 text-center text-slate-400 font-bold text-[9px] animate-pulse">
                            Loading secure reputation audit ledgers...
                          </div>
                        ) : reviews.length === 0 ? (
                          <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                            <span className="text-[10.5px] text-slate-400 block italic">This member has not received any audited reviews yet.</span>
                          </div>
                        ) : (
                          <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                            {reviews.map((r) => (
                              <div 
                                key={r.id} 
                                className={`p-4 border rounded-xl relative transition-all shadow-xs bg-white text-left ${
                                  r.isSuspicious 
                                    ? "border-red-300 bg-red-50/5 hover:bg-red-50/10" 
                                    : "border-slate-200 hover:border-emerald-200"
                                }`}
                              >
                                {/* Header of specific review */}
                                <div className="flex justify-between items-start flex-wrap gap-1 mb-2">
                                  <div>
                                    <strong className="text-xs font-black text-slate-900 block font-sans">{r.reviewerName}</strong>
                                    <span className="text-[8.5px] text-slate-400 block">Project: <strong className="text-slate-600">{r.gigTitle}</strong></span>
                                  </div>
                                  
                                  {/* Badges system */}
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {r.isSuspicious ? (
                                      <span className="px-2 py-0.5 bg-red-105 border border-red-300 text-red-800 font-black text-[7.5px] uppercase tracking-wide rounded-full flex items-center gap-1 font-mono">
                                        <AlertTriangle className="w-2.5 h-2.5 text-red-700 font-bold" /> Fraud Block
                                      </span>
                                    ) : r.isVerified ? (
                                      <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold text-[7.5px] uppercase tracking-wide rounded-full flex items-center gap-1 font-mono">
                                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" /> Verified Escrow Complete
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-slate-105 border border-slate-300 text-slate-600 font-extrabold text-[7.5px] uppercase tracking-wide rounded-full font-mono">
                                        Independent Entry
                                      </span>
                                    )}

                                    {/* Weight display */}
                                    <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-black font-mono uppercase tracking-widest ${r.isSuspicious ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                                      Weight: {r.isSuspicious ? "0.0x" : `${r.influenceWeight || 1.0}x`}
                                    </span>
                                  </div>
                                </div>

                                {/* Stars and dates */}
                                <div className="flex items-center justify-between text-[9px] mb-2 font-mono">
                                  <div className="flex gap-0.5 text-amber-550 font-bold">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <span key={i} className={i < r.rating ? "text-amber-500 font-black text-xs leading-none" : "text-slate-200 text-xs leading-none"}>★</span>
                                    ))}
                                    <span className="ml-1 text-slate-600">({r.rating}.0)</span>
                                  </div>
                                  <span className="text-slate-450">{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>

                                {/* Comment text */}
                                <p className="text-[11px] text-slate-750 leading-relaxed font-sans italic border-l-2 border-slate-100 pl-2.5 py-1">
                                  "{r.comment}"
                                </p>

                                {/* Fraud detection rules explanation */}
                                {r.isSuspicious && r.fraudRulesTriggered && r.fraudRulesTriggered.length > 0 && (
                                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-1">
                                    <span className="text-[8px] font-black text-red-800 uppercase tracking-wider block font-mono">My Smart Reputation Quarantined Reasons:</span>
                                    <ul className="list-disc list-inside space-y-0.5 text-[8.5px] text-red-700 font-mono">
                                      {r.fraudRulesTriggered.map((rule, sidx) => (
                                        <li key={sidx}>{rule}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                </div>
              </div>
            )

          ) : (
            <div className="py-24 text-center text-slate-400 text-xs">
              No matching credentials Dossier records found for this peer.
            </div>
          )}

        </div>

        {/* Builder bottom action controllers */}
        {isEditing && (
          <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 italic block">
              💡 Remember to click Save below so changes are synchronized.
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  // Reset states with fetched profile
                  if (profile) {
                    setEditTitle(profile.title || "");
                    setEditBio(profile.bio || "");
                    setSkillsList(profile.skillsWithProficiency || []);
                    setExperienceList(profile.experience || []);
                    setCertificationsList(profile.certifications || []);
                    setPortfolioList(profile.portfolio || []);
                  }
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-800 font-bold rounded-lg text-xs transition-colors"
              >
                Quit Config
              </button>
              <button
                type="button"
                onClick={handleSaveAllChanges}
                disabled={loading}
                className="px-6 py-2 bg-green-700 hover:bg-green-850 text-white font-extrabold rounded-lg text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Verified Dossier
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
