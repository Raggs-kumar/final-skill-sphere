/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "client" | "freelancer" | "admin";

export interface SkillWithProficiency {
  skill: string;
  level: "Beginner" | "Intermediate" | "Expert" | "Pro";
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  projectUrl?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface AvailabilityCalendar {
  status: "Available" | "Part-time" | "Busy";
  weeklyHours: number;
  availableDays: string[];
  availableSlots?: string[]; // e.g. ["09:00 AM", "11:00 AM"]
}

export interface HourlyAndMilestonePricing {
  hourlyRate: number;
  milestoneMin: number;
  currency: string;
}

export interface VerificationBadge {
  badgeType: "KYC" | "Skill" | "Identity" | "Legacy";
  issuedAt: string;
  status: "Active" | "Pending" | "None";
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  bio?: string;
  title?: string;
  skills?: string[];
  hourlyRate?: number;
  location: string;
  isVerified: boolean;
  isBanned: boolean;
  reputationScore: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdAt: string;

  // Extended Profile Fields
  skillsWithProficiency?: SkillWithProficiency[];
  portfolio?: PortfolioItem[];
  resumeUrl?: string;
  resumeFileName?: string;
  certifications?: string[];
  experience?: WorkExperience[];
  availability?: AvailabilityCalendar;
  pricing?: HourlyAndMilestonePricing;
  badges?: VerificationBadge[];
}

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  status: "pending" | "escrow" | "paid" | "disputed";
  deadline: string;
  submissionText?: string;
  submissionAttachment?: string;
  submittedAt?: string;
}

export type GigStatus = "open" | "active" | "completed" | "cancelled";

export interface Gig {
  id: string;
  title: string;
  description: string;
  budget: number;
  skills: string[];
  milestones: Milestone[];
  status: GigStatus;
  clientId: string;
  clientName: string;
  freelancerId?: string;
  freelancerName?: string;
  location: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  gigId: string;
  gigTitle: string;
  freelancerId: string;
  freelancerName: string;
  freelancerSkills: string[];
  bidAmount: number;
  deliveryTime: number; // in days
  proposalText: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Payment {
  id: string;
  gigId: string;
  milestoneId?: string;
  milestoneTitle?: string;
  amount: number;
  status: "escrow" | "released" | "refunded";
  type: "deposit" | "release" | "refund";
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  gigId: string;
  gigTitle: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  // Smart reputation fields
  isVerified?: boolean;
  budgetSize?: number;
  influenceWeight?: number;
  isSuspicious?: boolean;
  fraudRulesTriggered?: string[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "proposal" | "payment" | "chat" | "review" | "system";
  isRead: boolean;
  createdAt: string;
}

export interface Dispute {
  id: string;
  gigId: string;
  gigTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  reason: string;
  evidenceUrl?: string;
  evidenceText?: string;
  status: "pending" | "resolved-to-freelancer" | "resolved-to-client";
  resolution?: string;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  action: string;
  details: string;
  operatorName: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  date: string; // e.g. "2026-06-03"
  slot: string; // e.g. "10:00 AM - 11:00 AM"
  status: "scheduled" | "cancelled" | "completed";
  notes?: string;
  createdAt: string;
}
