"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

const ANALYSIS_STEPS = [
  { label: "Detecting strikes", duration: 1200 },
  { label: "Checking guard position", duration: 1000 },
  { label: "Analyzing footwork", duration: 800 },
  { label: "Evaluating hip rotation", duration: 900 },
  { label: "Building shadow partner", duration: 1100 },
];

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [activeStep, setActiveStep] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const runStep = (index: number) => {
      if (index >= ANALYSIS_STEPS.length) {
        setComplete(true);
        timeout = setTimeout(() => {
          router.replace(`/results/${sessionId}`);
        }, 600);
        return;
      }
      setActiveStep(index);
      timeout = setTimeout(() => runStep(index + 1), ANALYSIS_STEPS[index].duration);
    };

    timeout = setTimeout(() => runStep(0), 400);
    return () => clearTimeout(timeout);
  }, [router, sessionId]);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <SkeletonAnimation />

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-white mt-10 mb-8 tracking-tight"
        >
          {complete ? "Analysis complete" : "Analyzing your round"}
        </motion.h2>

        <div className="w-full max-w-xs space-y-3">
          {ANALYSIS_STEPS.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                {i < activeStep ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </motion.div>
                ) : i === activeStep ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                )}
              </div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  i < activeStep
                    ? "text-neutral-400"
                    : i === activeStep
                    ? "text-white"
                    : "text-neutral-600"
                }`}
              >
                {step.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function SkeletonAnimation() {
  return (
    <motion.div
      className="relative w-32 h-48"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        viewBox="0 0 100 160"
        className="w-full h-full"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.g
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <circle cx="50" cy="18" r="8" />
          <line x1="50" y1="26" x2="50" y2="70" />
          <motion.line
            x1="50" y1="40"
            animate={{ x2: [25, 20, 25], y2: [58, 55, 58] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.line
            x1="50" y1="40"
            animate={{ x2: [75, 80, 75], y2: [58, 55, 58] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <line x1="50" y1="70" x2="32" y2="110" />
          <line x1="50" y1="70" x2="68" y2="110" />
          <line x1="32" y1="110" x2="28" y2="145" />
          <line x1="68" y1="110" x2="72" y2="145" />
        </motion.g>

        <motion.g
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <circle cx="50" cy="18" r="14" />
          <ellipse cx="50" cy="50" rx="20" ry="30" />
        </motion.g>
      </svg>
    </motion.div>
  );
}
