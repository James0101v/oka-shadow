"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Target, Play, Pause, RotateCcw, Camera, CameraOff } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SEED_SESSIONS } from "@/lib/mock-data";
import { DrillSuggestion, RoundSession } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import type { SubmitRoundResponse } from "@/lib/api-v2";
import { getToken, isAuthenticated } from "@/lib/api-v2";
import {
  initPoseLandmarker,
  destroyPoseLandmarker,
  detectPose,
  drawSkeleton,
  isMobileDevice,
} from "@/lib/pose-detection";
import { LiveSession, StrikeFeedback, ErrorFeedback } from "@/lib/ws-session";

// ── Drill generation from real MotionEngine errors ──────────
const DRILL_DB: Record<string, DrillSuggestion> = {
  "guard-drop": {
    id: "drill-guard",
    name: "Jab-Cross Guard Return",
    rounds: 3,
    durationPerRound: 60,
    description: "Throw jab-cross, immediately snap guard back to chin. Focus on returning the lead hand before the cross lands.",
    focusArea: "guard-drop",
  },
  "chin-lift": {
    id: "drill-chin",
    name: "Chin Down Hook Drill",
    rounds: 2,
    durationPerRound: 60,
    description: "Throw hooks while keeping chin tucked to shoulder. Use mirror to verify head position throughout.",
    focusArea: "chin-lift",
  },
  "weak-hip-rotation": {
    id: "drill-hips",
    name: "Hip Rotation Power Drill",
    rounds: 3,
    durationPerRound: 45,
    description: "Slow-motion crosses and hooks focusing exclusively on hip engagement. Turn hips fully before arm extends.",
    focusArea: "weak-hip-rotation",
  },
  "low-volume": {
    id: "drill-volume",
    name: "Volume Rounds",
    rounds: 3,
    durationPerRound: 60,
    description: "Non-stop output for 60 seconds. Focus on keeping a steady pace — at least 1 strike per second. Light and fast.",
    focusArea: "jab",
  },
  "slow-retraction": {
    id: "drill-snap",
    name: "Snap Back Speed Drill",
    rounds: 2,
    durationPerRound: 45,
    description: "Throw single shots and focus entirely on retraction speed. The hand should come back faster than it went out.",
    focusArea: "jab",
  },
  "combo-drill": {
    id: "drill-combo",
    name: "Combination Builder",
    rounds: 3,
    durationPerRound: 60,
    description: "Chain 2-3 punch combos with no pause. Jab-cross, jab-hook-cross, jab-cross-hook. Keep combos flowing.",
    focusArea: "cross",
  },
};

function generateDrillsFromStats(stats: SubmitRoundResponse["stats"]): DrillSuggestion[] {
  const drills: DrillSuggestion[] = [];
  const errors = stats.error_breakdown || {};

  // Add drills for detected errors (highest priority)
  if (errors["guard-drop"]) drills.push({ ...DRILL_DB["guard-drop"], id: `drill-guard-${Date.now()}` });
  if (errors["chin-lift"]) drills.push({ ...DRILL_DB["chin-lift"], id: `drill-chin-${Date.now()}` });
  if (errors["weak-hip-rotation"]) drills.push({ ...DRILL_DB["weak-hip-rotation"], id: `drill-hips-${Date.now()}` });

  // Low volume drill
  if (stats.total_strikes > 0 && stats.duration_seconds > 10) {
    const rate = stats.total_strikes / stats.duration_seconds;
    if (rate < 0.5) drills.push({ ...DRILL_DB["low-volume"], id: `drill-vol-${Date.now()}` });
  }

  // Slow retraction drill
  if (stats.avg_retraction_ms > 350) {
    drills.push({ ...DRILL_DB["slow-retraction"], id: `drill-snap-${Date.now()}` });
  }

  // Combo drill if low combos
  if (stats.combo_count < 2 && stats.total_strikes >= 5) {
    drills.push({ ...DRILL_DB["combo-drill"], id: `drill-combo-${Date.now()}` });
  }

  // Always suggest at least one drill
  if (drills.length === 0) {
    drills.push({ ...DRILL_DB["combo-drill"], id: `drill-default-${Date.now()}` });
  }

  return drills.slice(0, 4);
}

export default function DrillsPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { sessions } = useAppStore();

  const session: RoundSession | undefined =
    sessions.find((s) => s.id === sessionId) ||
    SEED_SESSIONS.find((s) => s.id === sessionId);

  // Try to load real v2 data for targeted drill generation
  const [drills, setDrills] = useState<DrillSuggestion[]>([]);
  const [activeDrill, setActiveDrill] = useState<DrillSuggestion | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`v2-round-${sessionId}`);
      if (raw) {
        const v2Data: SubmitRoundResponse = JSON.parse(raw);
        if (v2Data.stats) {
          setDrills(generateDrillsFromStats(v2Data.stats));
          return;
        }
      }
    } catch {}
    // Fallback to session mock drills
    if (session?.drills) setDrills(session.drills);
  }, [sessionId, session]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-500">Session not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-14 pb-24 max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Drill Suggestions
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Based on your round analysis
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {drills.map((drill, i) => (
            <motion.div
              key={drill.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">
                    {drill.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <RotateCcw size={11} className="text-neutral-500" />
                      <span className="text-xs text-neutral-500">
                        {drill.rounds} rounds
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={11} className="text-neutral-500" />
                      <span className="text-xs text-neutral-500">
                        {drill.durationPerRound}s each
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <Target size={14} className="text-neutral-400" />
                </div>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed mt-2">
                {drill.description}
              </p>
              <button
                onClick={() => setActiveDrill(drill)}
                className="mt-3 w-full py-2.5 rounded-xl bg-white/[0.06] text-xs font-medium text-white hover:bg-white/[0.1] transition-colors"
              >
                Start Timer
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeDrill && (
          <DrillTimer
            drill={activeDrill}
            onClose={() => setActiveDrill(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DrillTimer({
  drill,
  onClose,
}: {
  drill: DrillSuggestion;
  onClose: () => void;
}) {
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(drill.durationPerRound);
  const [isRunning, setIsRunning] = useState(false);
  const [isRest, setIsRest] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Camera + pose state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseLoopRef = useRef<number | null>(null);
  const wsRef = useRef<LiveSession | null>(null);
  const isRunningRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [liveFeedback, setLiveFeedback] = useState<string | null>(null);
  const [feedbackColor, setFeedbackColor] = useState("text-emerald-300");
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((text: string, color: string) => {
    setLiveFeedback(text);
    setFeedbackColor(color);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLiveFeedback(null), 1600);
  }, []);

  // Start camera + pose loop
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isMobileDevice() ? "environment" : "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);

      // Load pose model then start loop
      try {
        await initPoseLandmarker();
      } catch { /* continue without skeleton */ }

      const loop = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
          poseLoopRef.current = requestAnimationFrame(loop);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        try {
          const frame = await detectPose(video, performance.now());
          if (frame && canvas) {
            drawSkeleton(canvas, frame, { lineWidth: 2, pointRadius: 3 });
          }
        } catch { /* ignore per-frame errors */ }
        poseLoopRef.current = requestAnimationFrame(loop);
      };
      poseLoopRef.current = requestAnimationFrame(loop);

      // Connect WebSocket for live coaching
      if (isAuthenticated()) {
        const token = getToken();
        if (token) {
          const session = new LiveSession({
            onStrike: (ev: StrikeFeedback) => {
              const labels: Record<string, string> = {
                jab: "Jab ✓", cross: "Cross ✓", hook: "Hook ✓",
                uppercut: "Uppercut ✓", "rear-roundhouse": "Kick ✓",
              };
              const color = ev.severity === "opening"
                ? "text-red-300"
                : ev.severity === "minor"
                ? "text-amber-300"
                : "text-emerald-300";
              showFeedback(labels[ev.type] ?? ev.type, color);
            },
            onError: (ev: ErrorFeedback) => {
              showFeedback(ev.message, "text-red-300");
            },
          });
          try {
            await session.connect(token);
            wsRef.current = session;
          } catch { /* no WS — continue */ }
        }
      }
    } catch {
      setCameraError(true);
    }
  }, [showFeedback]);

  const stopCamera = useCallback(() => {
    if (poseLoopRef.current) cancelAnimationFrame(poseLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    destroyPoseLandmarker();
    setCameraOn(false);
  }, []);

  // Start camera on mount, stop on unmount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Timer logic
  useEffect(() => {
    isRunningRef.current = isRunning;
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (isRest) {
            setIsRest(false);
            setCurrentRound((r) => r + 1);
            return drill.durationPerRound;
          } else if (currentRound < drill.rounds) {
            setIsRest(true);
            return 10;
          } else {
            setIsRunning(false);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isRest, currentRound, drill]);

  const progress = isRest
    ? timeLeft / 10
    : timeLeft / drill.durationPerRound;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Camera feed fills the background */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ transform: isMobileDevice() ? "none" : "scaleX(-1)" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: isMobileDevice() ? "none" : "scaleX(-1)" }}
        />
        {/* Dark overlay so UI is readable */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Camera error / off state */}
      {cameraError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50">
          <CameraOff size={12} className="text-neutral-500" />
          <span className="text-xs text-neutral-500">Camera unavailable</span>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={onClose}
        className="absolute top-6 left-6 z-10 w-10 h-10 rounded-full bg-white/[0.1] backdrop-blur-sm flex items-center justify-center"
      >
        <ArrowLeft size={18} className="text-white" />
      </button>

      {/* Camera indicator */}
      {cameraOn && !cameraError && (
        <div className="absolute top-7 right-6 z-10 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Camera size={12} className="text-white/50" />
        </div>
      )}

      {/* Live feedback pop */}
      <AnimatePresence>
        {liveFeedback && (
          <motion.div
            key={liveFeedback}
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-20 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-sm font-semibold text-sm pointer-events-none ${feedbackColor}`}
          >
            {liveFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main UI — centered over camera */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-8">
        <p className="text-xs text-white/50 mb-1 uppercase tracking-widest">
          {isRest ? "Rest" : `Round ${currentRound} of ${drill.rounds}`}
        </p>

        <h2 className="text-base font-semibold text-white mb-6 text-center">
          {drill.name}
        </h2>

        {/* Circular timer */}
        <div className="relative w-44 h-44 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="4"
            />
            <motion.circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={isRest ? "rgba(251,191,36,0.7)" : "rgba(255,255,255,0.6)"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - progress) }}
              transition={{ duration: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-white font-mono drop-shadow-lg">
              {formatDuration(timeLeft)}
            </span>
          </div>
        </div>

        {/* Play/Pause */}
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition-colors"
        >
          {isRunning ? (
            <Pause size={24} className="text-white" fill="currentColor" />
          ) : (
            <Play size={24} className="text-white ml-1" fill="currentColor" />
          )}
        </button>

        {timeLeft === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-emerald-400 font-semibold"
          >
            Drill complete
          </motion.p>
        )}
      </div>

      {/* Drill description strip at bottom */}
      <div className="relative z-10 px-6 pb-10">
        <p className="text-xs text-white/40 text-center leading-relaxed">
          {drill.description}
        </p>
      </div>
    </motion.div>
  );
}
