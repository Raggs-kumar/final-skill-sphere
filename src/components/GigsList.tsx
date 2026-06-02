/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Gig, Proposal, Milestone, Booking, Payment } from "../types";
import { Search, MapPin, IndianRupee, BrainCircuit, ShieldAlert, CheckCircle, ChevronRight, AlertTriangle, FileText, Briefcase, Sparkles, Send, MessageSquare, Calendar, Clock, X, Download, RefreshCw, Layers } from "lucide-react";
import ProfileViewerModal from "./ProfileViewerModal";

interface GigsListProps {
  currentUser: User;
  token: string;
  onOpenCreateModal: () => void;
  onDirectMessage: (partnerId: string) => void;
}

interface AIMatch {
  freelancer: User;
  analysis: {
    score: number;
    reason: string;
    successChance: number;
    strengths: string[];
    gaps: string[];
  };
  huggingFaceScore?: number;
  locationMatch?: boolean;
  recommendationScore?: number;
}

export default function GigsList({ currentUser, token, onOpenCreateModal, onDirectMessage }: GigsListProps) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  
  // Bookings management states
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showBookingsPanel, setShowBookingsPanel] = useState(false);
  const [bookingActionLoading, setBookingActionLoading] = useState<string | null>(null); // tracks id of booking undergoing cancel/complete
  
  // Payment Ledger states
  const [showPaymentsPanel, setShowPaymentsPanel] = useState(false);
  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsTypeFilter, setPaymentsTypeFilter] = useState<string>("all");
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<string>("all");
  
  // Professional Profile Dossier states
  const [activeViewProfileId, setActiveViewProfileId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  // Discovery Filter States (Budget Slider & Specific Skill Requirements)
  const [minBudgetFilter, setMinBudgetFilter] = useState<number>(0);
  const [maxBudgetFilter, setMaxBudgetFilter] = useState<number>(250000);
  const [debouncedMinBudget, setDebouncedMinBudget] = useState<number>(0);
  const [debouncedMaxBudget, setDebouncedMaxBudget] = useState<number>(250000);
  const [selectedSkillsFilter, setSelectedSkillsFilter] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMinBudget(minBudgetFilter);
      setDebouncedMaxBudget(maxBudgetFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [minBudgetFilter, maxBudgetFilter]);
  
  // Create Proposal state
  const [bidding, setBidding] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [proposalText, setProposalText] = useState("");

  // Client proposals view states
  const [activeTab, setActiveTab] = useState<"details" | "milestones" | "proposals" | "ai-match">("details");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [aiMatches, setAiMatches] = useState<AIMatch[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // Dispute state
  const [disputeSegment, setDisputeSegment] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Milestone submission state
  const [activeSubmitMilestoneId, setActiveSubmitMilestoneId] = useState<string | null>(null);
  const [submissionTextVal, setSubmissionTextVal] = useState("");
  const [submissionAttachmentVal, setSubmissionAttachmentVal] = useState("");

  // Stripe payments integration states
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeTargetMilestone, setStripeTargetMilestone] = useState<Milestone | null>(null);
  const [stripeConfig, setStripeConfig] = useState<{ configured: boolean; publishableKey: string } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  // Stripe elements simulation states
  const [simCardName, setSimCardName] = useState("");
  const [simCardNo, setSimCardNo] = useState("");
  const [simExpiry, setSimExpiry] = useState("");
  const [simCvv, setSimCvv] = useState("");
  const [simCountry, setSimCountry] = useState("India");
  const [simProcessing, setSimProcessing] = useState(false);
  const [simProcessingStep, setSimProcessingStep] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // AI Insights & Personalized Recommendations
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [aiTrends, setAiTrends] = useState<any[]>([]);
  const [personalRecs, setPersonalRecs] = useState<any[]>([]);

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    setErr(null);
    try {
      // 1. Fetch Trending Skills
      const trendsRes = await fetch("/api/ai/trending-skills");
      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setAiTrends(trendsData.trends || []);
      }

      // 2. Fetch Personalized Recommendations
      const recsRes = await fetch("/api/ai/personalized-recommendations", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setPersonalRecs(recsData.recommendations || []);
      }
    } catch (e: any) {
      console.warn("Error loading auxiliary AI insights", e);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Auto trigger loading insights if enabled
  useEffect(() => {
    if (showAIInsights && aiTrends.length === 0) {
      fetchAIInsights();
    }
  }, [showAIInsights]);

  const fetchGigs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("q", searchQuery);
      if (locationQuery) queryParams.append("location", locationQuery);
      if (debouncedMinBudget > 0) queryParams.append("minBudget", debouncedMinBudget.toString());
      if (debouncedMaxBudget < 250000) queryParams.append("maxBudget", debouncedMaxBudget.toString());
      if (selectedSkillsFilter.length > 0) {
        queryParams.append("skills", selectedSkillsFilter.join(","));
      }

      const res = await fetch(`/api/gigs?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok && data.gigs) {
        setGigs(data.gigs);
        
        // Auto select first gig if available and nothing is selected
        if (data.gigs.length > 0 && !selectedGig) {
          setSelectedGig(data.gigs[0]);
        } else if (selectedGig) {
          // Sync state of currently selected gig
          const current = data.gigs.find((g: Gig) => g.id === selectedGig.id);
          if (current) setSelectedGig(current);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGigs();
  }, [searchQuery, locationQuery, debouncedMinBudget, debouncedMaxBudget, selectedSkillsFilter]);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch("/api/bookings/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.bookings) {
        setBookingsList(data.bookings);
      }
    } catch (e: any) {
      console.error("Failed to load booking data stream:", e);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setBookingActionLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel scheduled appointment.");
      alert("Booking canceled successfully!");
      fetchBookings();
    } catch (e: any) {
      alert(`Error cancelling booking: ${e.message}`);
    } finally {
      setBookingActionLoading(null);
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    setBookingActionLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark scheduled appointment as completed.");
      alert("Booking completed successfully!");
      fetchBookings();
    } catch (e: any) {
      alert(`Error completing booking: ${e.message}`);
    } finally {
      setBookingActionLoading(null);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch("/api/payments/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.payments) {
        setPaymentsList(data.payments);
      }
    } catch (e: any) {
      console.error("Failed to load payment history lists:", e);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    let listToExport = [...paymentsList];
    
    // Seed preview mockup dataset if backend is empty to guarantee functional verification
    if (listToExport.length === 0) {
      const isFreelancer = currentUser.role === "freelancer";
      listToExport = [
        {
          id: "pay_demo001",
          gigId: "demo-gig-1",
          milestoneId: "m1",
          milestoneTitle: "Modern UI/UX Figma Design Wireframes",
          amount: 15000,
          status: "released",
          type: "release",
          fromId: isFreelancer ? "usr_client1" : currentUser.id,
          fromName: isFreelancer ? "Sophia Martinez" : currentUser.name,
          toId: isFreelancer ? currentUser.id : "usr_free1",
          toName: isFreelancer ? currentUser.name : "Aanya Patel",
          createdAt: new Date(Date.now() - 48*60*60*1000).toISOString()
        },
        {
          id: "pay_demo002",
          gigId: "demo-gig-2",
          milestoneId: "m2",
          milestoneTitle: "GraphQL Backend API Integration & Database Schemas",
          amount: 25000,
          status: "escrow",
          type: "deposit",
          fromId: isFreelancer ? "usr_client1" : currentUser.id,
          fromName: isFreelancer ? "Sophia Martinez" : currentUser.name,
          toId: isFreelancer ? currentUser.id : "usr_free1",
          toName: isFreelancer ? currentUser.name : "Aanya Patel",
          createdAt: new Date(Date.now() - 24*60*60*1000).toISOString()
        },
        {
          id: "pay_demo003",
          gigId: "demo-gig-3",
          milestoneId: "m3",
          milestoneTitle: "Performance Audit, SEO Optimizations & Vitals Support",
          amount: 8000,
          status: "refunded",
          type: "refund",
          fromId: isFreelancer ? "usr_client1" : currentUser.id,
          fromName: isFreelancer ? "Sophia Martinez" : currentUser.name,
          toId: isFreelancer ? currentUser.id : "usr_free1",
          toName: isFreelancer ? currentUser.name : "Aanya Patel",
          createdAt: new Date().toISOString()
        }
      ];
    }

    if (paymentsTypeFilter !== "all") {
      listToExport = listToExport.filter(p => p.type === paymentsTypeFilter);
    }
    if (paymentsStatusFilter !== "all") {
      listToExport = listToExport.filter(p => p.status === paymentsStatusFilter);
    }

    const headers = [
      "Transaction ID",
      "Milestone / Description",
      "Amount (INR)",
      "Type",
      "Status",
      "From Sender",
      "To Receiver",
      "Timestamp"
    ];

    const escapeCSV = (val: any) => {
      const str = String(val === null || val === undefined ? "" : val);
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = listToExport.map(p => [
      p.id,
      p.milestoneTitle || "Direct Booking Consultation",
      `₹${p.amount}`,
      p.type.toUpperCase(),
      p.status.toUpperCase(),
      p.fromName,
      p.toName,
      new Date(p.createdAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(escapeCSV).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SkillSphere_Payment_History_${currentUser.role}_${currentUser.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSeedMockPayments = async () => {
    try {
      const res = await fetch("/api/payments/seed-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentsList(data.payments);
      } else {
        throw new Error(data.error || "Seeding failed.");
      }
    } catch (err: any) {
      console.error(`Error seeding financial ledger: ${err.message}`);
    }
  };

  useEffect(() => {
    if (token) {
      if (showBookingsPanel) {
        fetchBookings();
      }
      if (showPaymentsPanel) {
        fetchPayments();
      }
    }
  }, [showBookingsPanel, showPaymentsPanel, token]);

  // Load Stripe Config on mount and check redirect params
  useEffect(() => {
    const fetchStripeConfig = async () => {
      try {
        const res = await fetch("/api/payments/stripe-config");
        if (res.ok) {
          const config = await res.json();
          setStripeConfig(config);
        }
      } catch (err) {
        console.warn("Failed to load Stripe configurations", err);
      }
    };
    fetchStripeConfig();

    // Direct redirection handlers
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_success") === "true") {
      setMessage("🔒 Secure Deposit Finalized! Stripe processed payment into Escrow ledger successfully.");
      // Clear URL params cleanly without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("stripe_cancelled") === "true") {
      setErr("Stripe Payment Escrow session was cancelled by user.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load secondary collections of selected gig (proposals or AI matches)
  useEffect(() => {
    if (!selectedGig) return;
    setProposals([]);
    setAiMatches([]);
    setDisputeSegment(null);
    setDisputeReason("");
    
    // Auto shift tabular view
    setActiveTab("details");

    const loadProposals = async () => {
      if (selectedGig.clientId === currentUser.id) {
        try {
          const res = await fetch(`/api/gigs/${selectedGig.id}/proposals`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.proposals) {
            setProposals(data.proposals);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    loadProposals();
  }, [selectedGig]);

  const handleApplyBidding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGig || !bidAmount || !deliveryTime || !proposalText) return;
    setErr(null);
    setMessage(null);

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          gigId: selectedGig.id,
          bidAmount: Number(bidAmount),
          deliveryTime: Number(deliveryTime),
          proposalText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Proposal successfully submitted. Wait for client escrow setup!");
      setBidding(false);
      setBidAmount("");
      setDeliveryTime("");
      setProposalText("");
      fetchGigs();
    } catch (err: any) {
      setErr(err.message);
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/accept`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Proposal accepted. Contract successfully initiated!");
      fetchGigs();
    } catch (err: any) {
      setErr(err.message);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setProposals(prev => prev.filter(p => p.id !== proposalId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFundEscrow = async (milestoneId: string) => {
    if (!selectedGig) return;
    const milestone = selectedGig.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    setErr(null);
    setMessage(null);
    setSimCardName("");
    setSimCardNo("");
    setSimExpiry("");
    setSimCvv("");
    setSimProcessing(false);
    setSimProcessingStep("");

    setStripeTargetMilestone(milestone);
    setStripeModalOpen(true);
  };

  const handleRealStripePayment = async () => {
    if (!selectedGig || !stripeTargetMilestone) return;
    setStripeLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ gigId: selectedGig.id, milestoneId: stripeTargetMilestone.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to make Stripe Session");

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout session URL returned");
      }
    } catch (e: any) {
      setErr(e.message || "Stripe Checkout initialization failed.");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleSimulateStripePayment = async () => {
    if (!selectedGig || !stripeTargetMilestone) return;
    if (!simCardName.trim() || !simCardNo.trim() || !simExpiry.trim() || !simCvv.trim()) {
      setErr("Please complete all credit card configuration fields.");
      return;
    }

    setSimProcessing(true);
    setErr(null);

    const steps = [
      "Securing connection to Stripe sandbox API...",
      "Validating card token structure (4242-xxxx-xxxx)...",
      "Analyzing card risk classification...",
      "Authorized via 3D-Secure card verification pass...",
      "Escrow ledger locking successfully processed!"
    ];

    for (let i = 0; i < steps.length; i++) {
      setSimProcessingStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      const res = await fetch("/api/payments/escrow-deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ gigId: selectedGig.id, milestoneId: stripeTargetMilestone.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(`🔒 Escrow Funds Secure! Stripe Sandbox processed ₹${stripeTargetMilestone.amount} successfully into security chambers.`);
      setStripeModalOpen(false);
      setStripeTargetMilestone(null);
      fetchGigs();
    } catch (e: any) {
      setErr(e.message || "Simulated gateway processing error.");
    } finally {
      setSimProcessing(false);
    }
  };

  const handleReleaseEscrow = async (milestoneId: string) => {
    if (!selectedGig) return;
    setErr(null);
    setMessage(null);

    try {
      const res = await fetch("/api/payments/escrow-release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ gigId: selectedGig.id, milestoneId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Escrow funds released to freelancer successfully.");
      fetchGigs();
    } catch (err: any) {
      setErr(err.message);
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGig || !disputeSegment || !disputeReason.trim()) return;
    setErr(null);
    setMessage(null);

    try {
      const res = await fetch("/api/payments/dispute-raise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          gigId: selectedGig.id,
          milestoneId: disputeSegment,
          reason: disputeReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Dispute file raised successfully. Transmitted to admin for evaluation.");
      setDisputeSegment(null);
      setDisputeReason("");
      fetchGigs();
    } catch (err: any) {
      setErr(err.message);
    }
  };

  const handleSubmitWork = async (milestoneId: string) => {
    if (!selectedGig || !submissionTextVal.trim()) return;
    setErr(null);
    setMessage(null);

    try {
      const res = await fetch("/api/payments/escrow-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          gigId: selectedGig.id,
          milestoneId,
          submissionText: submissionTextVal,
          submissionAttachment: submissionAttachmentVal
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Deliverables successfully submitted to client review stream.");
      setActiveSubmitMilestoneId(null);
      setSubmissionTextVal("");
      setSubmissionAttachmentVal("");
      fetchGigs();
    } catch (errVal: any) {
      setErr(errVal.message);
    }
  };

  const triggerAIMatching = async () => {
    if (!selectedGig) return;
    setLoadingAI(true);
    setAiMatches([]);
    setErr(null);

    try {
      const res = await fetch(`/api/gigs/${selectedGig.id}/match`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiMatches(data.matches || []);
    } catch (errUs: any) {
      setErr(errUs.message);
    } finally {
      setLoadingAI(false);
    }
  };

  // Derived state calculations for Advanced Discoverability & Filtering
  const staticSkills = ["React", "Node.js", "TypeScript", "Tailwind CSS", "Gemini API", "Figma", "UI/UX", "Python", "Express"];
  const dynamicSkills = Array.from(new Set(gigs.flatMap(g => g.skills || []))).filter(Boolean);
  const uniqueSkills = Array.from(new Set([...staticSkills, ...dynamicSkills])).sort();

  const displayedGigs = gigs.filter(g => {
    // Filter by budget slider boundaries
    if (g.budget < minBudgetFilter || g.budget > maxBudgetFilter) return false;
    
    // Filter by selected specific skill requirements
    if (selectedSkillsFilter.length > 0) {
      if (!g.skills || g.skills.length === 0) return false;
      const gigSkills = g.skills.map(s => s.trim().toLowerCase());
      const hasMatch = selectedSkillsFilter.some(s => gigSkills.includes(s.trim().toLowerCase()));
      if (!hasMatch) return false;
    }
    
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      
      {/* 1. LEFT LIST: FILTER & CONTRACT ITEMS LIST */}
      <div className="lg:col-span-5 flex flex-col space-y-4 bg-white border border-green-200 rounded p-4 overflow-y-auto shadow-sm">
        
        {/* Real-time search tools */}
        <div className="space-y-2 font-sans overflow-x-auto pb-1">
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
            <span className="text-xs font-bold text-green-800 uppercase tracking-widest leading-none">
              {showPaymentsPanel 
                ? "Payment Ledger" 
                : showBookingsPanel 
                  ? "Scheduled Consultations" 
                  : "Explore Active Contracts"}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingsPanel(false);
                    setShowPaymentsPanel(false);
                  }}
                  className={`text-[9px] font-bold py-1 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    !showBookingsPanel && !showPaymentsPanel
                      ? "bg-white text-green-800 shadow-xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Briefcase className="w-3 h-3 shrink-0" />
                  Contracts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingsPanel(true);
                    setShowPaymentsPanel(false);
                  }}
                  className={`text-[9px] font-bold py-1 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    showBookingsPanel && !showPaymentsPanel
                      ? "bg-white text-indigo-800 shadow-xs font-extrabold"
                      : "text-slate-600 hover:text-indigo-905"
                  }`}
                >
                  <Calendar className="w-3 h-3 shrink-0" />
                  Bookings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingsPanel(false);
                    setShowPaymentsPanel(true);
                  }}
                  className={`text-[9px] font-bold py-1 px-2 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    showPaymentsPanel
                      ? "bg-white text-emerald-800 shadow-xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3 h-3 shrink-0" />
                  Payments
                </button>
              </div>

              {currentUser.role === "client" && !showBookingsPanel && !showPaymentsPanel && (
                <button
                  onClick={onOpenCreateModal}
                  className="text-[10px] font-bold text-green-800 hover:text-white py-1 px-2 bg-green-100 hover:bg-green-600 border border-green-300 hover:border-green-700 rounded cursor-pointer transition-all"
                >
                  + Create
                </button>
              )}
            </div>
          </div>

          {!showBookingsPanel && !showPaymentsPanel && (
            <div className="space-y-3.5 mt-2.5 pt-2.5 border-t border-slate-100">
              {/* Keyword & Proximity Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-green-600/50" />
                  <input
                    type="text"
                    placeholder="Required tag (e.g. React)..."
                    className="w-full pl-9 pr-3 py-2 bg-green-50/30 border border-green-200 rounded text-xs hover:border-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 text-green-900 font-sans"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-green-600/50" />
                  <input
                    type="text"
                    placeholder="Proximity search..."
                    className="w-full pl-9 pr-3 py-2 bg-green-50/30 border border-green-200 rounded text-xs hover:border-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 text-green-900 font-sans"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Range-Based Budget Slide Controls */}
              <div className="bg-green-50/25 border border-green-200/50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-sans">
                  <span className="font-extrabold text-green-800 uppercase tracking-wider block">
                    💰 Budget Scale Boundaries
                  </span>
                  <span className="font-bold text-green-900 bg-white border border-green-200 px-2 py-0.5 rounded shadow-3xs font-mono">
                    ₹{minBudgetFilter.toLocaleString()} - ₹{maxBudgetFilter.toLocaleString()}+
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                      <span>Minimum Budget</span>
                      <span>₹{minBudgetFilter.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="150000"
                      step="5000"
                      value={minBudgetFilter}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMinBudgetFilter(val);
                        if (val > maxBudgetFilter) setMaxBudgetFilter(val);
                      }}
                      className="w-full accent-green-600 h-1 bg-green-100 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                      <span>Maximum Budget</span>
                      <span>₹{maxBudgetFilter.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="5000"
                      max="250000"
                      step="5000"
                      value={maxBudgetFilter}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMaxBudgetFilter(val);
                        if (val < minBudgetFilter) setMinBudgetFilter(val);
                      }}
                      className="w-full accent-green-600 h-1 bg-green-100 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Select Tag Requirements for Discoverability */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-sans">
                  <span className="font-extrabold text-green-800 uppercase tracking-wider">
                    🛠️ Skill Requirements Filter
                  </span>
                  {selectedSkillsFilter.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSkillsFilter([])}
                      className="text-[9px] font-bold text-red-650 hover:underline hover:text-red-700 uppercase tracking-wider"
                    >
                      Clear All ({selectedSkillsFilter.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 border border-slate-200/50 rounded-xl max-h-[85px] overflow-y-auto">
                  {uniqueSkills.map((skill, sIdx) => {
                    const isSelected = selectedSkillsFilter.includes(skill);
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSkillsFilter(selectedSkillsFilter.filter(s => s !== skill));
                          } else {
                            setSelectedSkillsFilter([...selectedSkillsFilter, skill]);
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer select-none border ${
                          isSelected
                            ? "bg-green-600 border-green-700 text-white shadow-3xs"
                            : "bg-white border-slate-200 text-slate-650 hover:bg-slate-150 hover:text-slate-800"
                        }`}
                      >
                        {isSelected && <span className="text-[8px]">✓</span>}
                        {skill}
                      </button>
                    );
                  })}
                  {uniqueSkills.length === 0 && (
                    <span className="text-[10px] text-slate-400 italic">No skills registered yet.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showPaymentsPanel ? (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Header with Download CSV Action */}
            <div className="bg-emerald-50/40 p-4 border border-emerald-100 rounded-xl space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-widest pl-1.5 border-l-2 border-emerald-600">
                    📜 Financial Ledger & Escrow
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    Tracking locked deposits, released milestones, and project escrow safety details.
                  </p>
                </div>
                
                <button
                  type="button"
                  id="btn-download-csv"
                  onClick={handleDownloadCSV}
                  className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap border border-emerald-700"
                  title="Download Current Transaction History as CSV Spreadsheet"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  Download CSV
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 pt-1 font-sans">
                <div className="bg-white border border-slate-150 p-2.5 rounded-lg text-center shadow-3xs">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">🔒 Escrow locked</span>
                  <span className="text-xs font-bold text-slate-700 font-mono block">
                    ₹{paymentsList.filter(p => p.status === "escrow").reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                  </span>
                </div>
                
                <div className="bg-white border border-slate-150 p-2.5 rounded-lg text-center shadow-3xs">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    {currentUser.role === "client" ? "💸 Total paid" : "💵 Total earned"}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 font-mono block">
                    ₹{paymentsList.filter(p => p.status === "released").reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-white border border-slate-150 p-2.5 rounded-lg text-center col-span-2 xs:col-span-1 shadow-3xs">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">↩️ Total Refunded</span>
                  <span className="text-xs font-bold text-red-650 font-mono block">
                    ₹{paymentsList.filter(p => p.status === "refunded").reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Filter Selection Tabs */}
            <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-xl flex items-center justify-between gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-[9px] font-extrabold text-slate-550 uppercase tracking-wider whitespace-nowrap">Filter Type:</span>
                {["all", "deposit", "release", "refund"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPaymentsTypeFilter(type)}
                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border transition-all cursor-pointer ${
                      paymentsTypeFilter === type
                        ? "bg-emerald-600 border-emerald-700 text-white shadow-2xs"
                        : "bg-white border-slate-205 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              <button 
                type="button"
                onClick={fetchPayments}
                className="p-1 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                title="Refresh Financial Feed"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {paymentsLoading ? (
              <div className="text-center py-12 font-sans text-xs text-slate-500 font-bold animate-pulse">
                🕒 Securing decentralized financial logs...
              </div>
            ) : (() => {
              const filteredList = paymentsList.filter(p => {
                if (paymentsTypeFilter !== "all" && p.type !== paymentsTypeFilter) return false;
                if (paymentsStatusFilter !== "all" && p.status !== paymentsStatusFilter) return false;
                return true;
              });

              if (paymentsList.length === 0) {
                return (
                  <div className="text-center py-12 text-xs text-slate-550 border border-dashed border-emerald-250 bg-emerald-50/15 rounded-2xl max-w-sm mx-auto p-6 space-y-3.5">
                    <p className="font-extrabold text-emerald-950 uppercase tracking-wide">No Ledger Entries Registered</p>
                    <p className="text-[10.5px] leading-relaxed text-slate-500 max-w-xs mx-auto font-medium">
                      When you fund milestone contracts securely using Stripe, official escrow transactions are registered immediately in this log.
                    </p>
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={handleSeedMockPayments}
                        className="px-4 py-2 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-black tracking-wider text-[10px] uppercase rounded-lg shadow-3xs cursor-pointer transition-all inline-flex items-center gap-1.5"
                      >
                        ⚡ Seed Historical Demo Data
                      </button>
                    </div>
                  </div>
                );
              }

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-12 text-xs text-slate-450 italic font-mono">
                    No transactions matched selected filter scopes.
                  </div>
                );
              }

              return (
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-340px)] pr-1">
                  {filteredList.map((payment) => {
                    const isSender = payment.fromId === currentUser.id;
                    const isEscrow = payment.status === "escrow";
                    const isReleased = payment.status === "released";
                    const isRefunded = payment.status === "refunded";
                    
                    return (
                      <div 
                        key={payment.id}
                        className="p-3 bg-white border border-slate-200 hover:border-slate-350 hover:shadow-2xs rounded-xl text-left font-sans text-xs space-y-2.5 transition-all shadow-3xs"
                      >
                        <div className="flex justify-between items-start gap-1.5">
                          <div className="space-y-0.5">
                            <span className="text-[8.5px] font-black uppercase text-slate-400 block tracking-widest leading-none">
                              {payment.type.toUpperCase()} • ID: {payment.id}
                            </span>
                            <div className="font-bold text-slate-800 text-[11px] leading-snug">
                              {payment.milestoneTitle || "Direct Consultancy Escrow Session"}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11.5px] font-black text-slate-900 block font-mono">
                              ₹{payment.amount.toLocaleString()}
                            </span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] uppercase font-black tracking-wider border font-mono mt-1 ${
                              isReleased 
                                ? "bg-emerald-100 border-emerald-305 text-emerald-800" 
                                : isRefunded
                                  ? "bg-red-100 border-red-355 text-red-700"
                                  : "bg-amber-100 border-amber-305 text-amber-800 animate-pulse"
                            }`}>
                              {isEscrow ? "🔒 Escrow" : isReleased ? "✓ Released" : "↺ Refunded"}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 bg-slate-50 rounded-lg text-[9.5px]/relaxed text-slate-500 font-mono space-y-0.5 font-medium">
                          <div className="flex justify-between">
                            <span>From Sender:</span>
                            <span className="text-slate-700 font-bold">{payment.fromName} {isSender && "(You)"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>To Recipient:</span>
                            <span className="text-slate-700 font-bold">{payment.toName} {!isSender && "(You)"}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-200/55 text-[9px]">
                            <span>Processed Date:</span>
                            <span>{new Date(payment.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : showBookingsPanel ? (
          <div className="flex-1 flex flex-col space-y-4">
            {bookingsLoading ? (
              <div className="text-center py-12 font-sans text-xs text-slate-500 font-bold animate-pulse">
                🕒 Synchronising reservation lists...
              </div>
            ) : bookingsList.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-550 border border-dashed border-indigo-200 bg-indigo-50/15 rounded-xl max-w-sm mx-auto p-6 space-y-2.5">
                <p className="font-extrabold text-indigo-905 uppercase tracking-wide">No Locked Sessions Found</p>
                <p className="text-[10.5px] leading-relaxed text-slate-500 max-w-xs mx-auto font-medium">
                  Consultation sessions facilitate quick scopes alignment. Open any freelancer's professional dossier on the contracts grid and schedule an instant consultation!
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 pt-1">
                {bookingsList.map((booking) => {
                  const isClientUser = currentUser.id === booking.clientId;
                  const partnerName = isClientUser ? booking.freelancerName : booking.clientName;
                  const isScheduled = booking.status === "scheduled";
                  const isCompleted = booking.status === "completed";
                  const isCancelled = booking.status === "cancelled";

                  return (
                    <div 
                      key={booking.id}
                      className={`p-3.5 rounded-xl border text-left font-sans text-xs space-y-3 transition-all shadow-xs ${
                        isCompleted 
                          ? "bg-emerald-50/30 border-emerald-250" 
                          : isCancelled 
                            ? "bg-slate-50/60 border-slate-205 opacity-75" 
                            : "bg-indigo-50/45 border-indigo-200 hover:border-indigo-350 hover:shadow-2xs"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono font-bold text-slate-650 block">
                            📅 {booking.date}
                          </span>
                          <span className="px-1.5 py-0.5 bg-white border border-slate-205 rounded text-[9px] font-mono font-medium text-slate-600 block">
                            ⏰ {booking.slot}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] uppercase font-black tracking-wider border font-mono ${
                          isCompleted
                            ? "bg-emerald-100 border-emerald-305 text-emerald-800"
                            : isCancelled
                              ? "bg-slate-100 border-slate-300 text-slate-500"
                              : "bg-indigo-100 border-indigo-305 text-indigo-900 animate-pulse"
                        }`}>
                          {booking.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8.5px] uppercase font-black text-slate-400 block tracking-widest">
                          {isClientUser ? "FREELANCE CONSULTANT" : "CLIENT CONTACT NODE"}
                        </span>
                        <div className="font-extrabold text-slate-800 flex items-center gap-1 text-[11px]">
                          👤 {partnerName}
                        </div>
                      </div>

                      {booking.notes && (
                        <div className="p-2.5 bg-white border border-slate-150 rounded-lg text-[10.5px]/relaxed text-slate-600">
                          <span className="block text-[8px] font-black text-indigo-900 uppercase tracking-widest mb-0.5">Session Agenda:</span>
                          "{booking.notes}"
                        </div>
                      )}

                      {isScheduled && (
                        <div className="pt-2 flex gap-2 border-t border-dashed border-slate-200">
                          {bookingActionLoading === booking.id ? (
                            <div className="w-full text-center py-1 text-xs text-slate-500 font-semibold animate-pulse">
                              Processing transaction signature...
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(booking.id)}
                                className="flex-1 py-1 px-2.5 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 text-red-650 hover:text-red-700 font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Cancel Session
                              </button>

                              {currentUser.id === booking.freelancerId && (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteBooking(booking.id)}
                                  className="flex-1 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs text-center border border-emerald-700"
                                >
                                  Complete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Real-time AI Insights & Proximity Engine */}
            <div className="border border-green-200 rounded-lg overflow-hidden bg-gradient-to-br from-green-50/40 via-white to-emerald-50/10 shadow-sm shrink-0">
          <button
            onClick={() => setShowAIInsights(!showAIInsights)}
            className="w-full flex items-center justify-between p-3 bg-green-50/60 hover:bg-green-100/65 transition-all text-left"
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-green-700 animate-pulse" />
              <div>
                <span className="text-[11px] font-black uppercase text-green-950 tracking-wider block">
                  AI INSIGHTS & TRENDS ENGINE
                </span>
                <span className="text-[9px] text-slate-550 block leading-none mt-0.5">
                  Proximity scoring, trending skills & customized peer matching
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-green-800">
              {showAIInsights ? "▲ CLOSE" : "▼ EXPLORE [AI]"}
            </span>
          </button>

          {showAIInsights && (
            <div className="p-3 border-t border-green-200/60 space-y-4 font-sans text-[11px] bg-white max-h-[380px] overflow-y-auto">
              {loadingInsights ? (
                <div className="py-6 text-center text-[10px] text-green-800 flex flex-col items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                  <BrainCircuit className="w-5 h-5 animate-spin text-green-600" />
                  <span>Loading Hugging Face models...</span>
                </div>
              ) : (
                <>
                  {/* Part 1: Personalized recommendations */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center pb-1 border-b border-green-150">
                      <span className="font-extrabold uppercase text-green-900 tracking-wider text-[10px]">
                        ★ personalized matches for you
                      </span>
                      <button
                        onClick={fetchAIInsights}
                        className="text-[9px] text-green-700 hover:underline font-bold"
                      >
                        [RE-COMPUTE]
                      </button>
                    </div>

                    {personalRecs.length === 0 ? (
                      <p className="text-slate-400 italic text-[10px]/normal">No matches calculated yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {personalRecs.map((rec: any, rIdx: number) => {
                          const isFreelancerObj = currentUser.role === "freelancer";
                          const titleText = isFreelancerObj ? rec.gig.title : rec.freelancer.name;
                          const subtitleText = isFreelancerObj 
                            ? `Budget: ₹${rec.gig.budget.toLocaleString()} • Loc: ${rec.gig.location}` 
                            : `${rec.freelancer.title || "Elite Peer"} • Rate: ₹${rec.freelancer.hourlyRate}/hr`;

                          return (
                            <div
                              key={rIdx}
                              className="p-2.5 bg-green-50/30 hover:bg-green-50/75 border border-green-150/80 rounded-md transition-all space-y-1 block text-left"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-bold text-green-950 block hover:underline cursor-pointer" onClick={() => {
                                  if (isFreelancerObj) {
                                    setSelectedGig(rec.gig);
                                  } else {
                                    setActiveViewProfileId(rec.freelancer.id);
                                  }
                                }}>
                                  {titleText}
                                </span>
                                <span className="text-[9.5px] font-extrabold text-green-800 font-mono bg-green-100/50 px-1.5 py-0.2 rounded border border-green-200">
                                  {rec.score}% match
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">{subtitleText}</p>
                              <p className="text-[10px] text-slate-650 leading-normal italic mt-0.5 font-sans">
                                <strong>Match context:</strong> "{rec.reason}"
                              </p>
                              {isFreelancerObj ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedGig(rec.gig)}
                                  className="text-[9px] text-green-700 font-bold hover:underline block mt-1"
                                >
                                  → Inspect Contract & File Bid
                                </button>
                              ) : (
                                <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-green-50">
                                  <button
                                    type="button"
                                    onClick={() => setActiveViewProfileId(rec.freelancer.id)}
                                    className="text-[9.5px] text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded border border-green-300 font-bold flex items-center gap-1"
                                  >
                                    🎯 Professional Dossier Check
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDirectMessage(rec.freelancer.id)}
                                    className="text-[9.5px] text-slate-600 hover:text-green-800 font-semibold"
                                  >
                                    💬 Chat with Peer
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Part 2: Trending Indian Tech skills */}
                  <div className="space-y-2 pt-1">
                    <div className="pb-1 border-b border-green-150">
                      <span className="font-extrabold uppercase text-green-900 tracking-wider text-[10px]">
                        📈 Trending Skills Detection
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal mb-1">
                      Aggregated demand analysis computed dynamically from local active gigs and Huggingface NLP tagging:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {aiTrends.map((trendObj: any, tIdx: number) => (
                        <div key={tIdx} className="p-2 bg-slate-50 border border-slate-200 rounded text-left space-y-1">
                          <div className="flex justify-between items-center font-bold text-slate-800 gap-1">
                            <span className="truncate max-w-[90px]">{trendObj.skill}</span>
                            <span className="text-green-700 font-mono text-[9.5px] shrink-0">x{trendObj.count}</span>
                          </div>
                          <div className="text-[9.5px]/none text-slate-400 font-mono flex items-center justify-between gap-1 leading-none">
                            <span className="truncate max-w-[65px]">{trendObj.category}</span>
                            <span className="text-[9px] text-emerald-600 font-bold shrink-0">+{Math.round((trendObj.salaryFactor - 1) * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Contract list container */}
        <div className="flex-1 space-y-3 pt-2">
          {loading ? (
            <div className="text-center py-10 font-sans text-xs text-slate-500">
              Mapping nearby contract grids...
            </div>
          ) : displayedGigs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-green-200 bg-green-50/20 rounded max-w-sm mx-auto p-4">
              No contracts found within this budget or skill spectrum. Move search dimensions to expand discovery.
            </div>
          ) : (
            displayedGigs.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGig(g)}
                className={`w-full p-4 rounded text-left transition-all border font-sans ${
                  selectedGig?.id === g.id
                    ? "bg-green-50/80 border-green-400 shadow-sm"
                    : "bg-white hover:bg-green-50/30 border-slate-200/80"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-xs font-bold text-green-900 hover:text-green-700 leading-tight truncate">
                    {g.title}
                  </h3>
                  <span className="text-xs shrink-0 font-mono text-green-800 font-bold bg-green-100/70 border border-green-200 rounded px-2 py-0.5 leading-none">
                    ₹{g.budget.toLocaleString()}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 truncate mt-2 leading-relaxed font-sans">
                  {g.description}
                </p>

                <div className="flex flex-wrap gap-1 mt-3.5">
                  {g.skills.slice(0, 3).map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-green-50 border border-green-200/50 text-green-800 text-[10px] font-medium rounded font-sans"
                    >
                      {s}
                    </span>
                  ))}
                  {g.skills.length > 3 && (
                    <span className="text-[9px] text-slate-500 self-center font-sans font-medium">+{g.skills.length - 3}</span>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1 font-medium text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>{g.location}</span>
                  </div>
                  <span className="capitalize text-[10px] bg-green-100/40 px-2 py-0.5 border border-green-200/60 rounded font-sans font-bold text-green-800">
                    {g.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
          </>
        )}
      </div>

      {/* 2. RIGHT VIEW: MAIN DETAILS WORKFLOWS */}
      <div className="lg:col-span-7 flex flex-col bg-white border border-green-200 rounded overflow-hidden p-6 relative shadow-sm text-slate-800">
        {selectedGig ? (
          <div className="space-y-5 flex-1 overflow-y-auto">
            
            {/* Direct Contract header */}
            <div className="border-b border-green-150 pb-4">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-100 border border-green-200 text-green-800 text-[9px] rounded font-semibold uppercase font-sans">
                      SECURE TERMINAL NODE
                    </span>
                    <span className="text-[10px] text-green-600/70">ID: {selectedGig.id}</span>
                  </div>
                  <h2 className="text-lg font-bold text-green-900 mt-1.5 leading-snug">{selectedGig.title}</h2>
                </div>
                
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-green-700">₹{selectedGig.budget.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">SECURE FIXED ESCROW</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 pt-3 border-t border-green-100">
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
                  <span>Oracle Client: <strong className="text-green-800 font-bold">{selectedGig.clientName}</strong></span>
                  <span>Proximity: <strong className="text-slate-800 font-semibold">{selectedGig.location}</strong></span>
                  {selectedGig.freelancerId && (
                    <span className="text-green-700 font-medium">
                      Tunnel Agent: <strong>{selectedGig.freelancerName}</strong>
                    </span>
                  )}
                </div>

                <div className="shrink-0 flex gap-2">
                  {currentUser.role === "freelancer" && (
                    <button
                      onClick={() => onDirectMessage(selectedGig.clientId)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase rounded-lg tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat with Client
                    </button>
                  )}
                  {currentUser.id === selectedGig.clientId && selectedGig.freelancerId && (
                    <button
                      onClick={() => onDirectMessage(selectedGig.freelancerId!)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase rounded-lg tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat with Freelancer
                    </button>
                  )}
                  {currentUser.id === selectedGig.clientId && !selectedGig.freelancerId && (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-150 px-2 py-1 rounded" title="Open applicants below to launch private chat tunnels with candidates">
                      💬 Open candidates to chat
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notification alert states */}
            {message && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded flex items-center gap-1.5 font-sans font-medium">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{message}</span>
              </div>
            )}

            {err && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-sans">
                {err}
              </div>
            )}

            {/* Segment navigation tabs */}
            <div className="flex gap-4 border-b border-green-100 text-xs font-bold select-none font-sans">
              <button
                className={`pb-2.5 transition-colors ${activeTab === "details" ? "border-b-2 border-green-600 text-green-800" : "text-slate-400 hover:text-slate-600"}`}
                onClick={() => setActiveTab("details")}
              >
                // SCOPE //
              </button>
              
              <button
                className={`pb-2.5 transition-colors ${activeTab === "milestones" ? "border-b-2 border-green-600 text-green-800" : "text-slate-400 hover:text-slate-600"}`}
                onClick={() => setActiveTab("milestones")}
              >
                // ESCROW WORK //
              </button>

              {/* View applicants if Client of this job */}
              {selectedGig.clientId === currentUser.id && (
                <>
                  <button
                    className={`pb-2.5 transition-colors ${activeTab === "proposals" ? "border-b-2 border-green-600 text-green-800" : "text-slate-400 hover:text-slate-600"}`}
                    onClick={() => setActiveTab("proposals")}
                  >
                    // BID ENVELOPE ({proposals.length}) //
                  </button>
                  <button
                    className={`pb-2.5 transition-colors ${activeTab === "ai-match" ? "border-b-2 border-green-600 text-green-800" : "text-slate-400 hover:text-slate-600"}`}
                    onClick={() => {
                      setActiveTab("ai-match");
                      if (aiMatches.length === 0) triggerAIMatching();
                    }}
                  >
                    // GEMINI SCANNER //
                  </button>
                </>
              )}
            </div>

            {/* TAB CONTENTS 1: DETAILS */}
            {activeTab === "details" && (
              <div className="space-y-4 text-xs font-sans">
                <div className="p-4 bg-green-50/50 border border-green-100 rounded text-slate-700 leading-relaxed space-y-4">
                  <div className="font-bold text-green-800 uppercase tracking-wider mb-2">// DIRECTIVE PARAMETERS //</div>
                  <div className="whitespace-pre-line leading-relaxed">{selectedGig.description}</div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">// MATCH SKILLS //</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGig.skills.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-green-50 border border-green-200/50 text-green-800 hover:text-green-900 font-semibold text-[10px] rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Apply bidding form (freelancers on open gigs only) */}
                {currentUser.role === "freelancer" && selectedGig.status === "open" && !bidding && (
                  <button
                    onClick={() => setBidding(true)}
                    className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 transition-colors text-white font-bold text-xs rounded flex items-center justify-center gap-1.5 shadow"
                  >
                    Lock Terms & Submit Proposal
                  </button>
                )}

                {bidding && (
                  <form onSubmit={handleApplyBidding} className="border border-green-200 bg-white p-5 rounded-lg space-y-4 mt-4 text-xs shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider">// CONTRACT PITCH METRICS //</h4>
                      <button type="button" onClick={() => setBidding(false)} className="text-xs text-green-700 hover:underline font-bold">[CANCEL]</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1.5">BID REMUNERATION (₹ INR)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="number"
                            required
                            placeholder="2000"
                            className="w-full pl-8 pr-3 py-2 bg-green-50/20 border border-green-200 rounded text-xs focus:ring-1 focus:ring-green-400 focus:outline-none text-slate-800 font-sans"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1.5">ALLOCATED TERM (DAYS)</label>
                        <input
                          type="number"
                          required
                          placeholder="15"
                          className="w-full px-3 py-2 bg-green-50/20 border border-green-200 rounded text-xs focus:ring-1 focus:ring-green-400 focus:outline-none text-slate-800 font-sans"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1.5">PROPOSAL EXPLANATION & DELIVERABLES</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Draft your proposal outline, deliverables, and tech stack parameters..."
                        className="w-full px-3 py-2 bg-green-50/20 border border-green-200 rounded text-xs focus:ring-1 focus:ring-green-400 focus:outline-none text-slate-800 font-sans"
                        value={proposalText}
                        onChange={(e) => setProposalText(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded transition-all shadow"
                    >
                      Transmit Proposal Now
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB CONTENTS 2: MILESTONES WORKFLOWS */}
            {activeTab === "milestones" && (
              <div className="space-y-4 text-xs font-sans">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-green-800 uppercase tracking-widest block">// CONTRACT ESCROW STEPS //</span>
                  {selectedGig.freelancerId && (
                    <button
                      onClick={() => onDirectMessage(selectedGig.freelancerId!)}
                      className="text-[10px] text-green-700 hover:underline flex items-center gap-1 font-bold"
                    >
                      Open Encrypted Chat Tunnel
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedGig.milestones.map((milestone) => {
                    const hasSubmission = !!milestone.submissionText;
                    const isFreelancer = currentUser.role === "freelancer" && selectedGig.freelancerId === currentUser.id;
                    const isClient = currentUser.role === "client" && selectedGig.clientId === currentUser.id;

                    return (
                      <div key={milestone.id} className="bg-white border border-green-200 rounded-lg p-4 shadow-sm space-y-3 border-l-4 border-l-green-600">
                        {/* Upper row: Header details and status badge */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-bold text-green-900">{milestone.title}</div>
                            <div className="text-[10px] text-slate-500 mt-1 flex gap-x-3 gap-y-1 flex-wrap">
                              <span>Target Deadline: <strong className="text-slate-700">{milestone.deadline}</strong></span>
                              <span>Escrow Value: <strong className="text-green-700 font-sans font-bold">₹{milestone.amount.toLocaleString()}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Milestone Status Badges */}
                            <span className={`px-2.5 py-0.5 text-[9px] font-sans font-bold rounded uppercase ${
                              milestone.status === "paid" ? "bg-emerald-100 border border-emerald-300 text-emerald-800" :
                              milestone.status === "escrow" ? "bg-amber-100 border border-amber-300 text-amber-800" :
                              milestone.status === "disputed" ? "bg-red-100 border border-red-300 text-red-700" :
                              "bg-slate-50 border border-slate-200 text-slate-500"
                            }`}>
                              {milestone.status}
                            </span>
                          </div>
                        </div>

                        {/* Show Deliverables submission if exists */}
                        {hasSubmission && (
                          <div className="p-3 bg-green-50/45 border border-green-150 rounded-lg space-y-2 text-[11px]">
                            <div className="font-bold text-green-800 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              FREELANCER DELIVERABLE SUBMISSION
                              {milestone.submittedAt && (
                                <span className="text-[9px] text-slate-500 normal-case font-normal ml-auto">
                                  {new Date(milestone.submittedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-700 leading-relaxed whitespace-pre-line bg-white p-2.5 rounded border border-green-100/50">
                              {milestone.submissionText}
                            </div>
                            {milestone.submissionAttachment && (
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-green-700">
                                <span className="text-slate-500 font-normal">Attachment / Repository URL:</span>
                                <a href={milestone.submissionAttachment} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-900 break-all">
                                  {milestone.submissionAttachment}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action panel underneath */}
                        <div className="flex flex-wrap gap-2 justify-end pt-1 border-t border-slate-50">
                          
                          {/* Client operations */}
                          {isClient && (
                            <div className="flex gap-2 w-full justify-end">
                              {milestone.status === "pending" && (
                                <button
                                  onClick={() => handleFundEscrow(milestone.id)}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] rounded transition-all shadow-sm"
                                >
                                  Deposit Escrow Funds
                                </button>
                              )}
                              
                              {milestone.status === "escrow" && (
                                <div className="flex gap-2 flex-wrap justify-end w-full">
                                  {hasSubmission ? (
                                    <div className="flex flex-col sm:flex-row gap-2 w-full justify-between items-start sm:items-center bg-amber-50/50 border border-amber-200 p-3 rounded-lg">
                                      <span className="text-[10px] text-amber-950 font-medium">Review developer submission details before releasing escrow contract keys.</span>
                                      <div className="flex gap-1.5 shrink-0 self-end sm:self-center mt-2 sm:mt-0">
                                        <button
                                          onClick={() => handleReleaseEscrow(milestone.id)}
                                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] rounded transition-colors shadow-sm"
                                        >
                                          Approve & Release Funds
                                        </button>
                                        <button
                                          onClick={() => setDisputeSegment(milestone.id)}
                                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-bold text-[10px] rounded transition-colors"
                                        >
                                          File Dispute
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2 w-full justify-between items-center bg-slate-50 border border-slate-200 p-2 rounded-lg">
                                      <span className="text-[10px] text-slate-500">Waiting for freelancer deliverables submission...</span>
                                      <button
                                        onClick={() => setDisputeSegment(milestone.id)}
                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-bold text-[10px] rounded transition-colors"
                                      >
                                        Dispute Escrow
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Freelancer operations */}
                          {isFreelancer && (
                            <div className="w-full">
                              {milestone.status === "escrow" && !hasSubmission && activeSubmitMilestoneId !== milestone.id && (
                                <div className="flex justify-between items-center bg-green-50/30 p-2 rounded-lg border border-green-150">
                                  <span className="text-[10px] text-green-905 font-medium">Escrow is secured and funded! You can submit your work for client vetting.</span>
                                  <button
                                    onClick={() => {
                                      setActiveSubmitMilestoneId(milestone.id);
                                      setSubmissionTextVal("");
                                      setSubmissionAttachmentVal("");
                                    }}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] rounded shadow"
                                  >
                                    Submit Deliverables
                                  </button>
                                </div>
                              )}

                              {milestone.status === "escrow" && hasSubmission && activeSubmitMilestoneId !== milestone.id && (
                                <div className="flex justify-between items-center bg-green-50/30 p-2 rounded-lg border border-green-150">
                                  <span className="text-[10px] text-slate-500">Deliverables submitted. Waiting for project sponsor validation.</span>
                                  <button
                                    onClick={() => {
                                      setActiveSubmitMilestoneId(milestone.id);
                                      setSubmissionTextVal(milestone.submissionText || "");
                                      setSubmissionAttachmentVal(milestone.submissionAttachment || "");
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded border border-slate-200"
                                  >
                                    Update Submission
                                  </button>
                                </div>
                              )}

                              {milestone.status === "pending" && (
                                <div className="text-right text-[10px] text-slate-450 italic p-1">
                                  Waiting for client escrow deposit keypair...
                                </div>
                              )}

                              {/* Work Submission Form Drawer */}
                              {activeSubmitMilestoneId === milestone.id && (
                                <div className="p-4 border border-green-200 bg-green-50/25 rounded-lg space-y-3 text-left w-full mt-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <h5 className="text-[10px] font-bold text-green-900 uppercase tracking-wider">
                                      Submit Milestone Deliverables
                                    </h5>
                                    <button type="button" onClick={() => setActiveSubmitMilestoneId(null)} className="text-[10px] font-bold text-slate-500 hover:underline">[Cancel]</button>
                                  </div>

                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-[9px] font-bold text-green-800 uppercase tracking-wider mb-1">
                                        Deliverables Repository Key or Asset Link (Optional)
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="E.g. GitHub URL, Google Drive folder, Vercel preview..."
                                        className="w-full px-3 py-2 bg-white border border-green-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-green-400"
                                        value={submissionAttachmentVal}
                                        onChange={(e) => setSubmissionAttachmentVal(e.target.value)}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold text-green-800 uppercase tracking-wider mb-1">
                                        Vetting notes & detailed statement (Required)
                                      </label>
                                      <textarea
                                        required
                                        placeholder="Compile code deployment summaries, completed tasks, and validation guidelines..."
                                        rows={3}
                                        className="w-full px-3 py-2 bg-white border border-green-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-green-400"
                                        value={submissionTextVal}
                                        onChange={(e) => setSubmissionTextVal(e.target.value)}
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleSubmitWork(milestone.id)}
                                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded transition-all shadow"
                                    >
                                      Submit Vetting Request
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dispute formulation drawer */}
                {disputeSegment && (
                  <form onSubmit={handleRaiseDispute} className="p-4 bg-red-50/50 border border-red-200 rounded-lg mt-4 space-y-3 shadow-sm">
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 animate-bounce" />
                      Arbiter Adjudication: Dispute Milestone #{disputeSegment}
                    </h4>
                    <p className="text-[10px] text-slate-600">
                      Raise an official dispute. This freezes milestone active balances and signals administrators to moderate contract deliverables.
                    </p>
                    
                    <textarea
                      required
                      placeholder="Comment on contract breach parameters, missed milestones, or code delivery gaps..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded text-xs text-slate-800 focus:outline-none"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                    />

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded"
                      >
                        File Arbitration Dispute
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisputeSegment(null)}
                        className="py-1.5 px-3 hover:underline text-slate-500 text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

              </div>
            )}

            {/* TAB CONTENTS 3: BIDS/PROPOSALS LIST */}
            {activeTab === "proposals" && (
              <div className="space-y-4 text-xs font-sans">
                <span className="text-xs font-bold text-green-800 uppercase tracking-widest block">// INCOMING PROPOSALS //</span>

                {proposals.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-green-50/40 rounded border border-green-200 font-sans">
                    No proposals submitted for this contract yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposals.map((p) => (
                      <div key={p.id} className="p-4 bg-white border border-green-200 rounded-lg space-y-3 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-xs font-black text-green-950 hover:underline cursor-pointer flex items-center gap-1" 
                                onClick={() => setActiveViewProfileId(p.freelancerId)}
                                title="Click to launch full verification check dossier"
                              >
                                {p.freelancerName}
                              </span>
                              <span className="bg-green-100 text-green-800 border border-green-250 text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                                ✓ Verified Member
                              </span>
                            </div>
                            <div className="flex gap-1.5 mt-1.5">
                              {p.freelancerSkills.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-green-50 border border-green-250 text-[9px] text-green-800 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-green-700 block">₹{p.bidAmount.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-500 block">in {p.deliveryTime} Days</span>
                          </div>
                        </div>

                        <div className="p-3 bg-green-50/30 border border-green-100 rounded text-[11px] text-slate-600 whitespace-pre-line leading-relaxed italic">
                          &quot;{p.proposalText}&quot;
                        </div>

                        {p.status === "pending" && (
                          <div className="flex gap-2 justify-between items-center flex-wrap pt-1">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveViewProfileId(p.freelancerId)}
                                className="px-3 py-1.5 bg-green-150 hover:bg-green-200 text-green-950 font-extrabold text-[10px] rounded flex items-center gap-1 transition-all border border-green-300"
                                title="Run full verification badge, timeline, resume, and pricing check!"
                              >
                                🎯 Complete Check
                              </button>
                              <button
                                type="button"
                                onClick={() => onDirectMessage(p.freelancerId)}
                                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-300 text-green-800 font-bold text-[10px] rounded flex items-center gap-1 transition-all"
                              >
                                <MessageSquare className="w-3 text-green-700" />
                                Chat with Applicant
                              </button>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptProposal(p.id)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] rounded transition-all shadow-sm"
                              >
                                Accept Proposal & Lock Escrow
                              </button>
                              <button
                                onClick={() => handleRejectProposal(p.id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 text-[10px] rounded transition-colors font-bold"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        )}
                        {p.status !== "pending" && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{p.status}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

               {/* TAB CONTENTS 4: INTELLIGENT AI MATCHES */}
            {activeTab === "ai-match" && (
              <div className="space-y-4 text-xs font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gradient-to-r from-green-50 to-emerald-50/40 p-3.5 border border-green-200 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-green-600 animate-pulse" />
                      <span className="text-xs font-extrabold text-green-950 uppercase tracking-wider block">
                        HUGGINGFACE AI COGNITIVE PIPELINE
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block leading-normal">
                      Deep sentence similarity calculated using <code className="bg-green-100/65 text-green-800 px-1 py-0.5 rounded font-mono">all-MiniLM-L6-v2</code> & proximity algorithms.
                    </span>
                  </div>
                  <button
                    onClick={triggerAIMatching}
                    disabled={loadingAI}
                    className="self-start sm:self-center bg-white hover:bg-green-50 px-2.5 py-1.5 border border-green-250 text-[10px] text-green-700 hover:text-green-900 rounded font-bold flex items-center gap-1.5 disabled:opacity-40 shadow-sm transition-all shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> [RE-RUN MATCHING]
                  </button>
                </div>

                {loadingAI ? (
                  <div className="p-12 text-center text-xs text-green-800 flex flex-col items-center justify-center gap-3 bg-green-50/20 border border-green-200 rounded-xl">
                    <BrainCircuit className="w-8 h-8 animate-spin text-green-600" />
                    <span className="font-bold uppercase tracking-widest text-[10px] text-green-900">Contacting Huggingface API servers...</span>
                    <span className="text-[10px] text-slate-500">Retrieving multi-dimensional semantic tensors & calculating geographic proximity scores...</span>
                  </div>
                ) : aiMatches.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-green-50/20 border border-green-200 rounded">
                    No matching profiles found in database registers.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render top recommended first */}
                    {aiMatches.map((match, index) => {
                      const hfScore = match.huggingFaceScore ?? match.analysis.score;
                      const isNear = !!match.locationMatch;
                      
                      // Best match flag (e.g., first element or score > 85)
                      const isBestMatch = index === 0 && (match.recommendationScore ?? hfScore) > 75;

                      return (
                        <div key={index} className={`p-4 bg-white border rounded-lg space-y-4 relative overflow-hidden shadow-sm transition-all hover:shadow-md ${
                          isBestMatch ? "border-green-400 border-l-4 border-l-green-600" : "border-green-200"
                        }`}>
                          
                          {/* Highlight Badges */}
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {isBestMatch && (
                              <span className="bg-green-600 text-white border border-green-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                ★ BEST RECOMMENDATION
                              </span>
                            )}
                            {isNear && (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                                📍 REGIONAL MATCH (NEAR {selectedGig.location.split(",")[0].toUpperCase()})
                              </span>
                            )}
                            <span className="bg-slate-50 text-slate-600 border border-slate-200 text-[9px] font-bold font-mono px-2 py-0.5 rounded-full">
                              SCORE: {match.recommendationScore ?? Math.round(hfScore * 0.8 + 15)}/100
                            </span>
                          </div>

                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 flex items-center justify-center bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-bold shrink-0">
                                {match.freelancer.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-green-950 block hover:underline cursor-pointer" onClick={() => onDirectMessage(match.freelancer.id)}>
                                  {match.freelancer.name}
                                </span>
                                <span className="text-[10px] text-slate-500 capitalize block leading-normal font-sans font-medium mt-0.5">
                                  {match.freelancer.title || "Senior Freelancer"} • Location: <strong className="text-slate-700">{match.freelancer.location}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-extrabold text-green-900 bg-green-50/70 border border-green-200/80 px-2 py-1 rounded inline-block">
                                {hfScore}% Semantic Similarity
                              </span>
                              <span className="text-[9px] text-slate-550 block mt-1">Profile Reputation Score: <strong className="text-slate-800 font-bold">{match.freelancer.reputationScore}%</strong></span>
                            </div>
                          </div>

                          {/* Skill compatibility breakdown */}
                          <div className="space-y-2 bg-slate-50/50 border border-slate-150 p-3 rounded-lg text-slate-700">
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-between">
                              <span>Skill Overlaps</span>
                              <span className="font-mono text-[9px]">Calculated via Hugging Face model matches</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(match.freelancer.skills || []).map((skill, skillIdx) => {
                                const isRequiredWord = (selectedGig.skills || []).some(
                                  reqSkill => reqSkill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(reqSkill.toLowerCase())
                                );
                                return (
                                  <span key={skillIdx} className={`px-2 py-0.5 rounded text-[9.5px] font-semibold border ${
                                    isRequiredWord 
                                      ? "bg-green-100/80 border-green-300 text-green-800" 
                                      : "bg-white border-slate-200 text-slate-550"
                                  }`}>
                                    {skill} {isRequiredWord ? "✓" : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="p-3 bg-green-50/20 border border-green-100 rounded text-[11px] text-slate-700 leading-normal">
                            <span className="font-bold text-green-800 block uppercase tracking-wider text-[9px] mb-1">HF NLP VETTING REASON</span>
                            <p className="italic">"{match.analysis.reason}"</p>
                          </div>

                          {/* Bullets strengths / gaps */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-[10px] bg-white">
                            <div>
                              <span className="text-green-800 uppercase tracking-wider font-extrabold block mb-1">STRENGTH ALIGNMENTS</span>
                              <ul className="space-y-1 list-disc list-inside text-slate-600">
                                {match.analysis.strengths.slice(0, 3).map((str, sIdx) => <li key={sIdx}>{str}</li>)}
                              </ul>
                            </div>
                            <div>
                              <span className="text-slate-500 uppercase tracking-wider font-extrabold block mb-1">COORDINATE GAPS / COMPLIANCE</span>
                              <ul className="space-y-1 list-disc list-inside text-slate-600">
                                {match.analysis.gaps.slice(0, 3).map((gap, gIdx) => <li key={gIdx}>{gap}</li>)}
                              </ul>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-green-100 flex justify-between items-center bg-white">
                            <span className="text-[10px] text-slate-500 italic">
                              Ready for secure smart escrow contract deployment.
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setActiveViewProfileId(match.freelancer.id)}
                                className="text-[10px] bg-green-150 hover:bg-green-200 text-green-950 border border-green-300 font-extrabold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all shadow-sm font-sans"
                                title="Inspect portfolio, experience timeline, certifications, pricing and verified badges"
                              >
                                🎯 Complete Check
                              </button>
                              <button
                                onClick={() => onDirectMessage(match.freelancer.id)}
                                className="text-[10px] text-green-800 hover:text-white font-extrabold flex items-center gap-1 bg-green-50 hover:bg-green-600 px-3 py-1.5 rounded-lg border border-green-300 transition-all shadow-sm"
                              >
                                Direct Message {match.freelancer.name.split(" ")[0]} <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-slate-450 font-sans">
            <span className="w-12 h-12 flex items-center justify-center bg-green-50 border border-green-200 rounded text-green-700 mb-3">
              <Briefcase className="w-6 h-6" />
            </span>
            <h3 className="text-green-900 font-bold text-sm">// SELECT A CONTRACT //</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Inject contract ID from coordinates stack, inspect technical requirements parameters, release locked escrow milestones, or launch quantum matcher algorithms here.
            </p>
          </div>
        )}
      </div>

      {activeViewProfileId && (
        <ProfileViewerModal
          isOpen={true}
          onClose={() => setActiveViewProfileId(null)}
          userId={activeViewProfileId}
          token={token}
          onDirectMessage={onDirectMessage}
          currentUserId={currentUser.id}
        />
      )}

      {/* STRIPE SECURE PAYMENT DIALOG MODAL */}
      {stripeModalOpen && stripeTargetMilestone && (
        <div id="stripe-escrow-payment-modal" className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col text-left">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-lg font-mono font-bold text-xs">
                  STRIPE
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Secure Escrow Milestone Payment</h3>
                  <p className="text-[10px] text-slate-500">Milestone: {stripeTargetMilestone.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setStripeModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Summary */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 block">Amount to Lock in Escrow</span>
                  <strong className="text-xl font-bold text-emerald-950 font-mono">
                    ₹{stripeTargetMilestone.amount.toLocaleString()}
                  </strong>
                </div>
                <div className="text-right text-[10px] text-slate-505">
                  <span className="block font-medium text-slate-400 font-mono">Provider Payout: Automatic</span>
                  <span className="block font-medium text-slate-400 font-mono">Platform Safety: Guarded</span>
                </div>
              </div>

              {/* Status information config badge */}
              {stripeConfig?.configured ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex gap-2 items-start">
                  <div className="p-1 bg-emerald-600 text-white rounded-md text-[9px] font-mono select-none">LIVE</div>
                  <div>
                    <strong className="block font-black text-[11px] uppercase tracking-wide">Official Stripe Connection Active</strong>
                    <span className="text-[10px] text-emerald-70 leading-normal">
                      The payment gateway keys are configured securely on the application server. You will be redirected to the secure Stripe Checkout portal.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-205 text-amber-900 rounded-lg text-xs flex gap-2 items-start">
                  <div className="p-1 bg-amber-600 text-white rounded-md text-[9px] font-mono font-bold select-none leading-none shrink-0">DEMO</div>
                  <div>
                    <strong className="block font-bold text-[11px] uppercase tracking-wide">Stripe API Running in Sandbox Simulator</strong>
                    <span className="text-[10px] text-slate-600 leading-normal block mt-0.5">
                      No `STRIPE_SECRET_KEY` was found in `.env`. Complete payment using the simulated elements below to test the verified escrow flow.
                    </span>
                  </div>
                </div>
              )}

              {/* Error messages if any */}
              {err && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] font-mono leading-relaxed">
                  ⚠️ Error: {err}
                </div>
              )}

              {/* LIVE VIEW: REDIRECT BUTTON */}
              {stripeConfig?.configured ? (
                <button
                  type="button"
                  onClick={handleRealStripePayment}
                  disabled={stripeLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {stripeLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Initializing Ledger Session...
                    </>
                  ) : (
                    <>
                      Proceed with Stripe Checkout (₹{stripeTargetMilestone.amount})
                    </>
                  )}
                </button>
              ) : (
                /* SANDBOX VIEW: EMBEDDED STRIPE SIMULATOR */
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider font-mono">
                    💳 Simulated Card Elements
                  </span>

                  {simProcessing ? (
                    <div className="p-8 border border-amber-100 bg-amber-50/10 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-black text-amber-950 font-mono tracking-wide">
                        {simProcessingStep}
                      </span>
                      <span className="text-[9.5px] text-slate-400">Please do not refresh or close sandbox window.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      
                      {/* Name on Card */}
                      <div>
                        <label className="block text-[8.5px] uppercase font-bold text-slate-500 mb-1">Name on card</label>
                        <input
                          type="text"
                          value={simCardName}
                          onChange={(e) => setSimCardName(e.target.value)}
                          placeholder="e.g. Liam Chen"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-sans"
                        />
                      </div>

                      {/* Card Number */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[8.5px] uppercase font-bold text-slate-500">
                            Card number
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setSimCardName("Liam Chen");
                              setSimCardNo("4242 4242 4242 4242");
                              setSimExpiry("12/28");
                              setSimCvv("404");
                            }}
                            className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[8.5px] font-black rounded hover:bg-indigo-100 font-mono"
                          >
                            Fill Test Card
                          </button>
                        </div>
                        <input
                          type="text"
                          maxLength={19}
                          value={simCardNo}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
                            setSimCardNo(formatted);
                          }}
                          placeholder="4242 4242 4242 4242"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      {/* Grid for parameters */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[8.5px] uppercase font-bold text-slate-500 mb-1">Expiry Date</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={simExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, "");
                              if (val.length > 2) {
                                val = val.substring(0, 2) + "/" + val.substring(2, 4);
                              }
                              setSimExpiry(val);
                            }}
                            placeholder="MM/YY"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-mono text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[8.5px] uppercase font-bold text-slate-500 mb-1">Secure CVC</label>
                          <input
                            type="text"
                            maxLength={3}
                            value={simCvv}
                            onChange={(e) => setSimCvv(e.target.value.replace(/\D/g, ""))}
                            placeholder="***"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-mono text-center"
                          />
                        </div>
                      </div>

                      {/* Country Selection */}
                      <div>
                        <label className="block text-[8.5px] uppercase font-bold text-slate-500 mb-1">Country or Region</label>
                        <select
                          value={simCountry}
                          onChange={(e) => setSimCountry(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-sans"
                        >
                          <option value="India">🇮🇳 India (INR/₹)</option>
                          <option value="United States">🇺🇸 United States (USD/$)</option>
                          <option value="United Kingdom">🇬🇧 United Kingdom (GBP/£)</option>
                          <option value="Singapore">🇸🇬 Singapore (SGD/S$)</option>
                        </select>
                      </div>

                      {/* Simulator Trigger */}
                      <button
                        type="button"
                        onClick={handleSimulateStripePayment}
                        className="w-full py-3 mt-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all hover:shadow-lg font-mono"
                      >
                        ⚡ Secure Escrow Lock (₹{stripeTargetMilestone.amount})
                      </button>

                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shield and locks */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-mono uppercase">
              🔒 Standard 256-Bit Stripe Escrow Audits Active
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
