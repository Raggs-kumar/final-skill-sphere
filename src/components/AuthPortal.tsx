/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole } from "../types";
import { Briefcase, UserCheck, Shield, Key, Mail, MapPin, IndianRupee, BrainCircuit, Globe } from "lucide-react";

interface AuthPortalProps {
  onSuccess: (user: User, token: string) => void;
}

export default function AuthPortal({ onSuccess }: AuthPortalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "tfa">("login");
  const [role, setRole] = useState<UserRole>("freelancer");
  
  // Login/Register Form inputs
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("Bangalore, Karnataka");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("65");
  const [skills, setSkills] = useState("");
  
  // 2FA Pin State
  const [tfaCode, setTfaCode] = useState("");
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [tempToken, setTempToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Login credentials failed");
      }

      // Check if user has 2FA enabled
      if (data.user.twoFactorEnabled) {
        setTempUser(data.user);
        setTempToken(data.token);
        setMode("tfa");
        setInfo("Secure Two-Factor Authentication has been triggered. Please verify your credentials.");
      } else {
        onSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !location) {
      setError("Please fill out all required parameters.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const parsedSkills = skills.split(",").map(s => s.trim()).filter(Boolean);
      const payload = {
        name,
        email,
        role,
        location,
        bio,
        title: role === "freelancer" ? (title || "Freelancer Specialist") : undefined,
        hourlyRate: role === "freelancer" ? Number(hourlyRate) : undefined,
        skills: role === "freelancer" ? parsedSkills : undefined
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration rejected");
      }

      onSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tempToken}`
        },
        body: JSON.stringify({ code: tfaCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid 2FA Authenticator Code");
      }

      onSuccess(data.user, tempToken);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSSO = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: "google.demo@skillsphere.io",
          name: "Dr. Alistair Vance",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-slate-50 font-sans text-xs select-none">
      {/* Background soft pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#16a34a_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-green-200 p-8 shadow-xl relative z-10 rounded-2xl transition-all duration-300">
        
        {/* Core Branded Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-green-700 text-[10px] font-bold mb-3 tracking-widest uppercase">
            <BrainCircuit className="w-3.5 h-3.5" />
            SECURE ACCESS GATEWAY
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-850">
            SKILLSPHERE v1.99
          </h1>
          <p className="text-[10px] text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Authenticating hyper-local freelance peer nodes. Escrow protected matching router.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-650 text-[11px] rounded-lg flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            <span>[ERROR]: {error}</span>
          </div>
        )}

        {info && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-850 text-[11px] rounded-lg">
            <span>[INFO]: {info}</span>
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-green-800 uppercase tracking-widest mb-1.5">
                NODE EMAIL SIGNATURE
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-green-600/50" />
                <input
                  type="email"
                  required
                  placeholder="agent@skillsphere.in"
                  className="w-full pl-10 pr-4 py-2.5 bg-green-50/20 border border-green-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                DEMO CORRIDOR: Enter <span className="text-green-700 hover:underline cursor-pointer font-semibold underline" onClick={() => setEmail("sophia@bloomstudio.com")}>sophia@bloomstudio.com</span>, <span className="text-green-700 hover:underline cursor-pointer font-semibold underline" onClick={() => setEmail("aanya@pixels.dev")}>aanya@pixels.dev</span>, or Admin: <span className="text-amber-700 hover:underline cursor-pointer font-semibold underline font-bold" onClick={() => setEmail("admin1@skillsphere.in")}>admin1@skillsphere.in</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-green-600 border border-green-700 text-white hover:bg-green-700 font-bold rounded-lg uppercase tracking-wider text-xs transition-all duration-200 cursor-pointer shadow"
            >
              {loading ? "DECRYPTING PRIVATE KEY..." : "Authorize Workspace"}
            </button>

            <div className="relative my-6 text-center">
              <hr className="border-green-100" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-white text-[9px] text-slate-400 uppercase tracking-widest font-semibold">
                OAuth Passkey
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSSO}
              disabled={loading}
              className="w-full py-2.5 bg-white border border-green-200 hover:bg-green-50/30 text-green-800 rounded-lg text-xs flex items-center justify-center gap-2 font-bold tracking-wide uppercase transition-colors"
            >
              <Globe className="w-4 h-4 text-green-600" />
              Bypass with Google Demo
            </button>

            <p className="text-center text-[11px] text-slate-400 mt-6 font-medium">
              New to SkillSphere?{" "}
              <button
                type="button"
                className="text-green-700 hover:underline font-bold"
                onClick={() => setMode("register")}
              >
                Assemble Profile
              </button>
            </p>
          </form>
        )}

        {/* 2. REGISTER MODE */}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2 bg-green-50/40 p-1.5 rounded-lg border border-green-200 mb-4">
              <button
                type="button"
                className={`py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${role === "freelancer" ? "bg-green-600 text-white" : "text-green-800"}`}
                onClick={() => setRole("freelancer")}
              >
                Freelancer
              </button>
              <button
                type="button"
                className={`py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${role === "client" ? "bg-green-600 text-white" : "text-green-800"}`}
                onClick={() => setRole("client")}
              >
                Hiring Client
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">
                Full Display Name *
              </label>
              <input
                type="text"
                required
                placeholder="Devon Cooper"
                className="w-full px-3 py-2 bg-green-50/20 border border-green-150 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="devon@pixels.com"
                className="w-full px-3 py-2 bg-green-50/20 border border-green-150 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-[9px] text-slate-450 mt-1">
                Note: Registering with <strong className="text-green-700 font-semibold font-mono">admin1@skillsphere.in</strong> automatically grants secure admin access.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">
                Hyperlocal Proximity Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-green-600/50" />
                <input
                  type="text"
                  required
                  placeholder="Bangalore, Karnataka"
                  className="w-full pl-9 pr-3 py-2 bg-green-50/20 border border-green-150 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Specify Indian city communities for matching algorithm.</p>
            </div>

            {role === "freelancer" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">
                    Specialist Subtitle
                  </label>
                  <input
                    type="text"
                    placeholder="Senior UI/UX Cryptography Engineer"
                    className="w-full px-3 py-2 bg-green-50/20 border border-green-150 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">
                    Hourly Standard Rate (₹ INR)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-green-600/50" />
                    <input
                      type="number"
                      placeholder="1500"
                      className="w-full pl-9 pr-3 py-2 bg-green-50/20 border border-green-150 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">
                    Skill Keywords (comma-separated list)
                  </label>
                  <input
                    type="text"
                    placeholder="React, Tailwind CSS, Cryptography, Node.js"
                    className="w-full px-3 py-2 bg-green-50/20 border border-green-150 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">
                Profile Bio & Statement
              </label>
              <textarea
                placeholder="A brief background statement..."
                rows={2}
                className="w-full px-3 py-2 bg-green-50/20 border border-green-150 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-green-400 focus:outline-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-green-600 text-white hover:bg-green-700 font-bold rounded-lg uppercase tracking-wider text-xs transition-all duration-150 cursor-pointer shadow"
            >
              {loading ? "INITIALIZING SECURE KEYPAIR..." : "Register Profile & Login"}
            </button>

            <p className="text-center text-[11px] text-slate-400 mt-4">
              Already have an account?{" "}
              <button
                type="button"
                className="text-green-700 hover:underline font-bold"
                onClick={() => setMode("login")}
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* 3. TWO FACTOR SEGMENT */}
        {mode === "tfa" && (
          <form onSubmit={handleTFA} className="space-y-4 text-center">
            <div className="flex justify-center mb-2">
              <Shield className="w-12 h-12 text-green-600 animate-pulse" />
            </div>
            
            <p className="text-[11px] text-slate-600 max-w-xs mx-auto leading-relaxed">
              Cryptographic Multi-Factor protocol has been triggered. Please enter the active verification sequence.
            </p>

            <div className="my-4">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="******"
                className="w-36 text-center text-2xl font-mono tracking-widest py-2 bg-green-50/45 border-2 border-green-300 focus:outline-none focus:border-green-500 rounded text-slate-800 font-bold"
                value={tfaCode}
                onChange={(e) => setTfaCode(e.target.value)}
              />
              <p className="text-[10px] text-slate-500 mt-2">
                TEST BYPASS PIN: <span className="text-green-700 font-bold font-mono">123456</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-green-600 text-white hover:bg-green-700 font-bold rounded-lg uppercase tracking-wide text-xs transition-all focus:ring-1 focus:ring-green-400 shadow"
            >
              {loading ? "DECRYPTING TUNNEL STREAM..." : "Verify Passcode"}
            </button>

            <button
              type="button"
              className="text-xs text-slate-400 hover:underline block mx-auto mt-2"
              onClick={() => {
                setMode("login");
                setTempUser(null);
                setTempToken("");
              }}
            >
              Abort Verification, Back to Sign In
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
