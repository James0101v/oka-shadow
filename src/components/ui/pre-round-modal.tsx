"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ChevronRight, X, Target } from "lucide-react";

const FRAMING_CHECKS = [
  "Full body visible in frame",
  "6–10 feet from camera",
  "Good lighting on your front",
];

const FOCUS_GOALS = [
  { id: "guard",    emoji: "🛡️", label: "Guard return",        desc: "Hands back after every punch" },
  { id: "pivot",    emoji: "🔄", label: "Pivot on cross",       desc: "Rotate hips fully on rear hand" },
  { id: "chin",     emoji: "👊", label: "Chin down on hooks",   desc: "Tuck chin, don't reach" },
  { id: "retract",  emoji: "⚡", label: "Fast retraction",      desc: "Snap punches back quickly" },
  { id: "combo",    emoji: "🔥", label: "Combo flow",           desc: "Link 3+ punch combinations" },
  { id: "footwork", emoji: "👟", label: "Footwork",             desc: "Stay light, move between combos" },
];

interface PreRoundModalProps {
  onStart: (focus: string) => void;
  onDismiss: () => void;
}

export function PreRoundModal({ onStart, onDismiss }: PreRoundModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);

  const allChecked = checked.every(Boolean);

  const toggleCheck = (i: number) => {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-neutral-950 border border-white/[0.06] rounded-t-3xl px-6 pt-5 pb-10"
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-0.5">
              Step {step} of 2
            </p>
            <h2 className="text-lg font-bold text-white">
              {step === 1 ? "Framing check" : "Pick your focus"}
            </h2>
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center"
          >
            <X size={14} className="text-neutral-400" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm text-neutral-400 mb-5">
                Tap each item to confirm before you start.
              </p>
              <div className="space-y-3 mb-8">
                {FRAMING_CHECKS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => toggleCheck(i)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                      checked[i]
                        ? "bg-emerald-500/[0.08] border-emerald-500/20"
                        : "bg-white/[0.03] border-white/[0.06]"
                    }`}
                  >
                    {checked[i] ? (
                      <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle size={20} className="text-neutral-600 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${checked[i] ? "text-white" : "text-neutral-400"}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!allChecked}
                className={`w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
                  allChecked
                    ? "bg-white text-black hover:bg-neutral-100"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                }`}
              >
                {allChecked ? "I'm set" : "Check all items to continue"}
                {allChecked && <ChevronRight size={18} />}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm text-neutral-400 mb-5">
                One focus makes every session purposeful.
              </p>
              <div className="grid grid-cols-2 gap-2.5 mb-8">
                {FOCUS_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedFocus(goal.id)}
                    className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border transition-all text-left ${
                      selectedFocus === goal.id
                        ? "bg-white/[0.08] border-white/20"
                        : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-xl">{goal.emoji}</span>
                    <span className={`text-sm font-semibold leading-tight ${selectedFocus === goal.id ? "text-white" : "text-neutral-300"}`}>
                      {goal.label}
                    </span>
                    <span className="text-[11px] text-neutral-500 leading-snug">
                      {goal.desc}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setStep(1)}
                  className="w-12 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0"
                >
                  <ChevronRight size={16} className="text-neutral-400 rotate-180" />
                </button>
                <button
                  onClick={() => onStart(selectedFocus ?? "free")}
                  className={`flex-1 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
                    selectedFocus
                      ? "bg-white text-black hover:bg-neutral-100"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  <Target size={16} />
                  {selectedFocus
                    ? `Start — ${FOCUS_GOALS.find((g) => g.id === selectedFocus)?.label}`
                    : "Pick a focus"}
                </button>
              </div>

              <button
                onClick={() => onStart("free")}
                className="w-full mt-3 text-xs text-neutral-600 hover:text-neutral-400 transition-colors py-1"
              >
                Skip — just record
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
