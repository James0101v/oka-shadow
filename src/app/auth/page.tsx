"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Swords, ChevronRight } from "lucide-react";
import { apiV2 } from "@/lib/api-v2";

type Mode = "login" | "register";
type RegStep = "account" | "fighter";

const STANCES = [
  { value: "orthodox", label: "Orthodox", desc: "Left hand leads" },
  { value: "southpaw", label: "Southpaw", desc: "Right hand leads" },
];

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "< 6 months" },
  { value: "intermediate", label: "Intermediate", desc: "6 months – 2 years" },
  { value: "advanced", label: "Advanced", desc: "2+ years" },
  { value: "competitive", label: "Competitive", desc: "Amateur / Pro" },
];

const WEIGHT_CLASSES = [
  { value: "flyweight", label: "Flyweight", desc: "≤ 112 lbs" },
  { value: "bantamweight", label: "Bantamweight", desc: "≤ 118 lbs" },
  { value: "featherweight", label: "Featherweight", desc: "≤ 126 lbs" },
  { value: "lightweight", label: "Lightweight", desc: "≤ 135 lbs" },
  { value: "welterweight", label: "Welterweight", desc: "≤ 147 lbs" },
  { value: "middleweight", label: "Middleweight", desc: "≤ 160 lbs" },
  { value: "light_heavyweight", label: "Light Heavy", desc: "≤ 175 lbs" },
  { value: "heavyweight", label: "Heavyweight", desc: "175+ lbs" },
];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [regStep, setRegStep] = useState<RegStep>("account");

  // Account fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Fighter profile fields
  const [stance, setStance] = useState("orthodox");
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [weightClass, setWeightClass] = useState("welterweight");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccountNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setRegStep("fighter");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await apiV2.register({
          username,
          email,
          password,
          display_name: displayName || username,
          stance,
          skill_level: skillLevel,
          weight_class: weightClass,
        });
      } else {
        await apiV2.login(username, password);
      }
      router.push("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col overflow-y-auto">
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto px-6 pb-12 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Swords size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === "login" ? "Welcome Back" : "Join the Arena"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {mode === "login"
              ? "Sign in to continue your training"
              : "Create your fighter profile"}
          </p>
        </motion.div>

        {/* Mode Toggle */}
        <div className="flex w-full max-w-sm rounded-xl bg-white/[0.04] p-1 mb-6">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? "bg-white text-black"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Login form ─────────────────────────────────── */}
          {mode === "login" && (
            <motion.form
              key="login"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="w-full max-w-sm space-y-3"
            >
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white/20 transition-colors"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white/20 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p className="text-sm text-red-400 text-center py-1">{error}</p>}
              <button type="submit" disabled={loading}
                className={`w-full py-4 rounded-2xl font-semibold text-base tracking-tight transition-all ${
                  loading ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" : "bg-white text-black hover:bg-neutral-100"
                }`}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </motion.form>
          )}

          {/* ── Register Step 1: Account ────────────────────── */}
          {mode === "register" && regStep === "account" && (
            <motion.form
              key="reg-account"
              onSubmit={handleAccountNext}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="w-full max-w-sm space-y-3"
            >
              <p className="text-xs text-neutral-500 text-center mb-1">Step 1 of 2 — Account</p>
              <input
                type="text"
                placeholder="Display Name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white/20 transition-colors"
              />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white/20 transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white/20 transition-colors"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white/20 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p className="text-sm text-red-400 text-center py-1">{error}</p>}
              <button type="submit"
                className="w-full py-4 rounded-2xl font-semibold text-base tracking-tight bg-white text-black hover:bg-neutral-100 transition-all flex items-center justify-center gap-2">
                Next <ChevronRight size={16} />
              </button>
            </motion.form>
          )}

          {/* ── Register Step 2: Fighter Profile ───────────── */}
          {mode === "register" && regStep === "fighter" && (
            <motion.form
              key="reg-fighter"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="w-full max-w-sm space-y-5"
            >
              <p className="text-xs text-neutral-500 text-center">Step 2 of 2 — Fighter Profile</p>

              {/* Stance */}
              <div>
                <p className="text-xs text-neutral-400 font-medium mb-2">Stance</p>
                <div className="grid grid-cols-2 gap-2">
                  {STANCES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStance(s.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        stance === s.value
                          ? "bg-white/10 border-white/30"
                          : "bg-white/[0.03] border-white/[0.06] hover:border-white/15"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{s.label}</p>
                      <p className="text-[11px] text-neutral-500">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill Level */}
              <div>
                <p className="text-xs text-neutral-400 font-medium mb-2">Experience Level</p>
                <div className="grid grid-cols-2 gap-2">
                  {SKILL_LEVELS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSkillLevel(s.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        skillLevel === s.value
                          ? "bg-white/10 border-white/30"
                          : "bg-white/[0.03] border-white/[0.06] hover:border-white/15"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{s.label}</p>
                      <p className="text-[11px] text-neutral-500">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight Class */}
              <div>
                <p className="text-xs text-neutral-400 font-medium mb-2">Weight Class</p>
                <div className="grid grid-cols-2 gap-2">
                  {WEIGHT_CLASSES.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => setWeightClass(w.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        weightClass === w.value
                          ? "bg-white/10 border-white/30"
                          : "bg-white/[0.03] border-white/[0.06] hover:border-white/15"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{w.label}</p>
                      <p className="text-[11px] text-neutral-500">{w.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-400 text-center py-1">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRegStep("account"); setError(""); }}
                  className="flex-1 py-4 rounded-2xl font-semibold text-sm border border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/20 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-[2] py-4 rounded-2xl font-semibold text-base tracking-tight transition-all ${
                    loading ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" : "bg-white text-black hover:bg-neutral-100"
                  }`}
                >
                  {loading ? "Creating..." : "Enter the Arena"}
                </button>
              </div>
            </motion.form>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
