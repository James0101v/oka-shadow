"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Shield, Zap, ChevronRight, Flame } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Oka Shadow",
    subtitle: "Your AI-powered shadow boxing coach",
    icon: Swords,
    color: "text-white",
  },
  {
    id: "stance",
    title: "What's your stance?",
    subtitle: "This helps us tailor your training",
    icon: Shield,
    color: "text-emerald-400",
  },
  {
    id: "level",
    title: "Experience level?",
    subtitle: "We'll adjust difficulty to match",
    icon: Zap,
    color: "text-blue-400",
  },
  {
    id: "ready",
    title: "You're all set!",
    subtitle: "Record your first round to start earning XP",
    icon: Flame,
    color: "text-orange-400",
  },
];

const STANCES = [
  { value: "orthodox", label: "Orthodox", desc: "Left foot forward (most common)" },
  { value: "southpaw", label: "Southpaw", desc: "Right foot forward" },
];

const LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Just getting started" },
  { value: "intermediate", label: "Intermediate", desc: "Know the basics" },
  { value: "advanced", label: "Advanced", desc: "Experienced fighter" },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [stance, setStance] = useState("orthodox");
  const [level, setLevel] = useState("beginner");

  const current = STEPS[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Save preferences
      try {
        localStorage.setItem("oka-onboarded", "true");
        localStorage.setItem("oka-stance", stance);
        localStorage.setItem("oka-level", level);
      } catch {}
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-14 pb-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i <= step ? "bg-white" : "bg-white/[0.1]"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-6">
              <Icon size={28} className={current.color} />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{current.title}</h2>
            <p className="text-sm text-neutral-500 mb-8">{current.subtitle}</p>

            {/* Stance selection */}
            {current.id === "stance" && (
              <div className="space-y-3 mb-4">
                {STANCES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStance(s.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors text-left ${
                      stance === s.value
                        ? "bg-white/[0.06] border-white/[0.15]"
                        : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      stance === s.value ? "bg-emerald-500/15" : "bg-white/[0.04]"
                    }`}>
                      <Shield size={18} className={stance === s.value ? "text-emerald-400" : "text-neutral-500"} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{s.label}</p>
                      <p className="text-xs text-neutral-500">{s.desc}</p>
                    </div>
                    {stance === s.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Level selection */}
            {current.id === "level" && (
              <div className="space-y-3 mb-4">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors text-left ${
                      level === l.value
                        ? "bg-white/[0.06] border-white/[0.15]"
                        : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      level === l.value ? "bg-blue-500/15" : "bg-white/[0.04]"
                    }`}>
                      <Zap size={18} className={level === l.value ? "text-blue-400" : "text-neutral-500"} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{l.label}</p>
                      <p className="text-xs text-neutral-500">{l.desc}</p>
                    </div>
                    {level === l.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Welcome features */}
            {current.id === "welcome" && (
              <div className="space-y-3 text-left mb-4">
                {[
                  { emoji: "📹", text: "Record rounds with real-time pose detection" },
                  { emoji: "⚔️", text: "Earn RPG stats: Power, Speed, Stamina" },
                  { emoji: "🎯", text: "Get targeted drills for your weak spots" },
                  { emoji: "🔥", text: "Build streaks and complete daily quests" },
                ].map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]"
                  >
                    <span className="text-lg">{f.emoji}</span>
                    <span className="text-xs text-neutral-300">{f.text}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Ready screen */}
            {current.id === "ready" && (
              <div className="space-y-2 mb-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Stance</span>
                    <span className="text-white font-medium capitalize">{stance}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-neutral-500">Level</span>
                    <span className="text-white font-medium capitalize">{level}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      <div className="px-8 pb-12">
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
        >
          {step === STEPS.length - 1 ? "Start Training" : "Continue"}
          <ChevronRight size={16} />
        </button>

        {step > 0 && step < STEPS.length - 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-2 py-2.5 text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Back
          </button>
        )}
      </div>
    </motion.div>
  );
}
