/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Trash, IndianRupee, Calendar, MapPin, X, ArrowRight } from "lucide-react";
import { Milestone } from "../types";

interface CreateGigModalProps {
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateGigModal({ token, onClose, onSuccess }: CreateGigModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("20000");
  const [location, setLocation] = useState("Bangalore, Karnataka");
  const [skillsStr, setSkillsStr] = useState("React, Tailwind CSS, UI Design");
  
  // Milestones editor array
  const [milestones, setMilestones] = useState<{ title: string; amount: string; deadline: string }[]>([
    { title: "Milestone 1: Figma UI Drafts", amount: "10000", deadline: "2026-06-10" },
    { title: "Milestone 2: App Code Integration & Build Deliverable", amount: "10000", deadline: "2026-06-25" }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      { title: `Milestone ${milestones.length + 1}: Deliverable`, amount: "500", deadline: "" }
    ]);
  };

  const removeMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const handleMilestoneChange = (idx: number, field: string, val: string) => {
    const updated = [...milestones];
    updated[idx] = { ...updated[idx], [field]: val };
    setMilestones(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const numericBudget = Number(budget);
    const parsedSkills = skillsStr.split(",").map(s => s.trim()).filter(Boolean);
    const totalMilestonesSum = milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);

    if (totalMilestonesSum !== numericBudget) {
      setError(`Sum of milestones (₹${totalMilestonesSum.toLocaleString()}) must match the exact budget (₹${numericBudget.toLocaleString()}) !`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/gigs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          budget: numericBudget,
          location,
          skills: parsedSkills,
          milestones
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gig creation rejected");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto font-sans text-xs text-slate-700">
      <div className="bg-white border border-green-200 w-full max-w-2xl rounded-xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-2"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-sm font-bold text-green-900 flex items-center gap-2 uppercase tracking-widest">
            <Plus className="w-5 h-5 text-green-700" />
            CREATE NEW CONTRACT REQUIREMENT
          </h2>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            Specify job criteria, proximity preferences, and milestone payment splits. Sum of split deliverables must equal the raw total volume.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-650 text-xs rounded-lg mb-4">
            [ERROR]: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-green-850 uppercase tracking-wider mb-1.5">
                Contract Title
              </label>
              <input
                type="text"
                required
                placeholder="React Native Farmer Geotracking Portal"
                className="w-full px-3 py-2 bg-green-50/20 border border-green-200 rounded text-green-900 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-green-850 uppercase tracking-wider mb-1.5">
                Escrow Budget (₹ INR)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-green-600/50" />
                <input
                  type="number"
                  required
                  placeholder="20000"
                  className="w-full pl-9 pr-3 py-2 bg-green-50/20 border border-green-200 rounded text-green-950 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none font-sans"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-green-850 uppercase tracking-wider mb-1.5">
                Technical Skill Tags (comma-separated)
              </label>
              <input
                type="text"
                required
                placeholder="React, CSS, MapBox, Georef"
                className="w-full px-3 py-2 bg-green-50/20 border border-green-200 rounded text-green-900 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-green-850 uppercase tracking-wider mb-1.5">
                Physical Work Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-green-600/50" />
                <input
                  type="text"
                  required
                  placeholder="Bangalore, Karnataka"
                  className="w-full pl-9 pr-3 py-2 bg-green-50/20 border border-green-200 rounded text-green-900 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-green-850 uppercase tracking-wider mb-1.5">
              Task Scope & Deliverable Objective
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide clean instructions mapping active components, geofencing limits and expected milestones..."
              className="w-full px-3 py-2 bg-green-50/20 border border-green-200 rounded text-green-900 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* MILESTONES WORKFLOW EDITOR */}
          <div className="border border-green-150 bg-green-50/40 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-green-850 uppercase tracking-widest">
                // ACTIVE DELIVERABLES SEQUENCE //
              </span>
              <button
                type="button"
                onClick={addMilestone}
                className="text-[11px] text-green-700 hover:text-green-900 flex items-center gap-1 font-bold tracking-widest"
              >
                <Plus className="w-3.5 h-3.5" /> [Add Milestone]
              </button>
            </div>

            {milestones.map((milestone, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-green-200 border-l-4 border-l-green-600">
                <div className="md:col-span-5">
                  <input
                    type="text"
                    required
                    placeholder="Describe specific milestone outcome..."
                    className="w-full px-2 py-1.5 bg-white border border-green-150 rounded text-slate-800 text-xs font-sans focus:outline-none focus:border-green-400"
                    value={milestone.title}
                    onChange={(e) => handleMilestoneChange(idx, "title", e.target.value)}
                  />
                </div>
                <div className="md:col-span-3 relative">
                  <IndianRupee className="absolute left-1.5 top-2.5 w-3.5 h-3.5 text-green-600" />
                  <input
                    type="number"
                    required
                    placeholder="Split Amount"
                    className="w-full pl-5 pr-1 py-1.5 bg-white border border-green-150 rounded text-green-800 text-xs font-sans focus:outline-none focus:border-green-400"
                    value={milestone.amount}
                    onChange={(e) => handleMilestoneChange(idx, "amount", e.target.value)}
                  />
                </div>
                <div className="md:col-span-3 relative">
                  <Calendar className="absolute left-1.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    required
                    className="w-full pl-5 pr-1 py-1.5 bg-white border border-green-150 rounded text-slate-700 text-[11px] font-sans focus:outline-none focus:border-green-400"
                    value={milestone.deadline}
                    onChange={(e) => handleMilestoneChange(idx, "deadline", e.target.value)}
                  />
                </div>
                <div className="md:col-span-1 text-center font-sans">
                  <button
                    type="button"
                    onClick={() => removeMilestone(idx)}
                    disabled={milestones.length <= 1}
                    className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1 cursor-pointer"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold tracking-wider"
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-green-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 hover:bg-green-700 cursor-pointer shadow"
            >
              {loading ? "INITIALIZING SECURE ESCROW..." : "Commit Escrow Requirements"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
