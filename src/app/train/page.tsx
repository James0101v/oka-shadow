"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, Flame,
  Shield, Zap, Target, Clock, ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { initPoseLandmarker, detectPose, drawSkeleton } from "@/lib/pose-detection";
import { apiV2, isAuthenticated } from "@/lib/api-v2";
import type { SubmitRoundResponse } from "@/lib/api-v2";

// ── Drill catalog ──────────────────────────────────────────────
interface DrillDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  rounds: number;
  workSeconds: number;
  restSeconds: number;
  cues: string[];
  focusLandmarks?: number[];
}

const DRILLS: DrillDef[] = [
  {
    id: "jab-cross",
    name: "Jab-Cross Combos",
    description: "Throw jab-cross combinations with full hip rotation. Focus on snapping the hands back.",
    icon: Zap,
    color: "text-blue-400",
    rounds: 3,
    workSeconds: 30,
    restSeconds: 10,
    cues: [
      "Hands up, chin down",
      "Jab — snap it back!",
      "Cross — rotate those hips!",
      "Jab-cross — keep it flowing",
      "Faster! Don't drop your guard",
      "Last push — everything you've got!",
    ],
  },
  {
    id: "guard-drill",
    name: "Guard Discipline",
    description: "Practice keeping your guard tight between combinations. Hands at chin level.",
    icon: Shield,
    color: "text-emerald-400",
    rounds: 3,
    workSeconds: 30,
    restSeconds: 10,
    cues: [
      "Hands up to your chin",
      "Throw — guard up immediately",
      "Don't let those hands drop",
      "Jab — snap back to guard!",
      "Stay tight, stay protected",
      "Great guard work!",
    ],
  },
  {
    id: "volume",
    name: "Volume Round",
    description: "Non-stop striking output. Keep a steady pace — at least one punch per second.",
    icon: Flame,
    color: "text-orange-400",
    rounds: 3,
    workSeconds: 45,
    restSeconds: 15,
    cues: [
      "Keep throwing — don't stop!",
      "Jab jab jab — keep the pace",
      "Mix it up — hooks, crosses",
      "Don't slow down!",
      "Push through the burn!",
      "Finish strong!",
    ],
  },
  {
    id: "accuracy",
    name: "Precision Strikes",
    description: "Slow, deliberate strikes with perfect form. Quality over quantity.",
    icon: Target,
    color: "text-red-400",
    rounds: 3,
    workSeconds: 30,
    restSeconds: 10,
    cues: [
      "Slow and controlled",
      "Full extension on each punch",
      "Retract faster than you extend",
      "Rotate the hips fully",
      "Perfect form > speed",
      "Beautiful technique!",
    ],
  },
];

type Phase = "select" | "countdown" | "work" | "rest" | "done";

export default function TrainPage() {
  const router = useRouter();
  void router; // used in done phase navigation
  const [selectedDrill, setSelectedDrill] = useState<DrillDef | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentCue, setCurrentCue] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [bodyDetected, setBodyDetected] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  void poseReady;
  const [frameCount, setFrameCount] = useState(0);
  const [roundResult, setRoundResult] = useState<SubmitRoundResponse | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const poseLoopRef = useRef<number>(0);
  const capturedFramesRef = useRef<Record<string, unknown>[]>([]);
  const lastDetectRef = useRef(0);

  // ── Camera + Pose Setup ────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await initPoseLandmarker();
      setPoseReady(true);
    } catch {
      // Camera or pose init failed
    }
  }, []);

  const startPoseLoop = useCallback(() => {
    const INTERVAL_MS = 33; // ~30fps detection
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        poseLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      // Only resize when dimensions change — assigning canvas.width clears the context every frame
      const vw = video.videoWidth || video.clientWidth;
      const vh = video.videoHeight || video.clientHeight;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      const now = performance.now();
      if (now - lastDetectRef.current >= INTERVAL_MS) {
        lastDetectRef.current = now;
        // Use video.currentTime for MediaPipe VIDEO mode — must be monotonically increasing
        const videoTs = video.currentTime * 1000;
        const frame = detectPose(video, videoTs);
        if (frame) {
          setBodyDetected(true);
          drawSkeleton(canvas, frame, {
            lineColor: "rgba(52, 211, 153, 0.5)",
            pointColor: "rgba(52, 211, 153, 0.8)",
            lineWidth: 2,
            pointRadius: 3,
          });
          // Capture frames during work phase
          if (phase === "work") {
            capturedFramesRef.current.push({
              timestamp_ms: videoTs,
              frame_index: capturedFramesRef.current.length,
              landmarks: frame.landmarks.map((lm: any) => ({
                x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility,
              })),
              persons: frame.persons?.map((p: any) => ({
                person_id: p.personId,
                landmarks: p.landmarks.map((lm: any) => ({
                  x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility,
                })),
              })) || [],
            });
            setFrameCount(capturedFramesRef.current.length);
          }
          // Don't clear on null — grace period in detectPose holds last valid frame
        }
      }

      poseLoopRef.current = requestAnimationFrame(loop);
    };
    poseLoopRef.current = requestAnimationFrame(loop);
  }, [phase]);

  // Start camera when drill is selected
  useEffect(() => {
    if (selectedDrill && phase !== "select") {
      startCamera().then(startPoseLoop);
    }
    return () => {
      if (poseLoopRef.current) cancelAnimationFrame(poseLoopRef.current);
    };
  }, [selectedDrill, phase, startCamera, startPoseLoop]);

  // ── Timer Logic ────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !selectedDrill) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (phase === "work") {
            if (currentRound < selectedDrill.rounds) {
              setPhase("rest");
              return selectedDrill.restSeconds;
            } else {
              setPhase("done");
              setIsPlaying(false);
              submitResults();
              return 0;
            }
          } else if (phase === "rest") {
            setCurrentRound((r) => r + 1);
            setPhase("work");
            return selectedDrill.workSeconds;
          } else if (phase === "countdown") {
            setPhase("work");
            return selectedDrill.workSeconds;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, phase, currentRound, selectedDrill]);

  // ── Cue rotation ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "work" || !selectedDrill) return;
    const elapsed = selectedDrill.workSeconds - timeLeft;
    const cueIdx = Math.min(
      Math.floor((elapsed / selectedDrill.workSeconds) * selectedDrill.cues.length),
      selectedDrill.cues.length - 1
    );
    setCurrentCue(selectedDrill.cues[cueIdx]);
  }, [timeLeft, phase, selectedDrill]);

  // ── Submit captured frames ─────────────────────────────────
  const submitResults = async () => {
    if (!isAuthenticated() || capturedFramesRef.current.length < 5) return;
    try {
      const totalDuration = selectedDrill
        ? selectedDrill.workSeconds * selectedDrill.rounds
        : 0;
      const result = await apiV2.submitRound({
        frames: capturedFramesRef.current,
        fps: 15,
        duration_seconds: totalDuration,
      });
      setRoundResult(result);
    } catch {
      // Silently handle
    }
  };

  // ── Start drill ───────────────────────────────────────────
  const startDrill = (drill: DrillDef) => {
    setSelectedDrill(drill);
    setPhase("countdown");
    setCurrentRound(1);
    setTimeLeft(3);
    setIsPlaying(true);
    setFrameCount(0);
    setRoundResult(null);
    capturedFramesRef.current = [];
  };

  const resetDrill = () => {
    setPhase("select");
    setSelectedDrill(null);
    setIsPlaying(false);
    setCurrentRound(1);
    setTimeLeft(0);
    setFrameCount(0);
    setRoundResult(null);
    capturedFramesRef.current = [];
    // Stop camera
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
  };

  // ── Drill Selection ───────────────────────────────────────
  if (phase === "select") {
    return (
      <AppShell>
        <div className="px-6 pt-14 pb-24">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Guided Training
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Pick a drill — your camera coaches you in real time
            </p>
          </motion.div>

          <div className="space-y-3">
            {DRILLS.map((drill, i) => {
              const Icon = drill.icon;
              return (
                <motion.button
                  key={drill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => startDrill(drill)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className={drill.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white">{drill.name}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                      {drill.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <RotateCcw size={10} className="text-neutral-600" />
                        <span className="text-[10px] text-neutral-500">{drill.rounds} rounds</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-neutral-600" />
                        <span className="text-[10px] text-neutral-500">{drill.workSeconds}s work / {drill.restSeconds}s rest</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-600 flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Active Drill Session ──────────────────────────────────
  const totalSeconds = selectedDrill
    ? phase === "countdown" ? 3
      : phase === "work" ? selectedDrill.workSeconds
      : phase === "rest" ? selectedDrill.restSeconds
      : 0
    : 0;
  const progress = totalSeconds > 0 ? timeLeft / totalSeconds : 0;

  return (
    <div className="fixed inset-0 bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-12 flex items-center justify-between z-10">
        <button
          onClick={resetDrill}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="text-center">
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest">
            {selectedDrill?.name}
          </p>
          <p className="text-xs text-white font-medium">
            Round {currentRound} / {selectedDrill?.rounds}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          {bodyDetected ? (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          )}
        </div>
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        {/* Countdown */}
        <AnimatePresence>
          {phase === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="text-center"
            >
              <p className="text-6xl font-bold text-white">{timeLeft}</p>
              <p className="text-sm text-neutral-400 mt-2">Get ready!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Work/Rest timer */}
        {(phase === "work" || phase === "rest") && (
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest mb-2 text-neutral-400">
              {phase === "rest" ? "REST" : "WORK"}
            </p>

            {/* Circular timer */}
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={phase === "rest" ? "rgba(251,191,36,0.6)" : "rgba(52,211,153,0.6)"}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progress) }}
                  transition={{ duration: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white font-mono">{timeLeft}</span>
              </div>
            </div>

            {/* Coaching cue */}
            {phase === "work" && currentCue && (
              <motion.div
                key={currentCue}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-5 py-2.5 rounded-full bg-black/50 backdrop-blur"
              >
                <p className="text-sm font-medium text-white">{currentCue}</p>
              </motion.div>
            )}

            {phase === "rest" && (
              <p className="text-sm text-amber-300 font-medium">Breathe — next round coming</p>
            )}
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center pointer-events-auto"
          >
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-1">Drill Complete!</h2>
            <p className="text-sm text-neutral-400 mb-2">
              {selectedDrill?.rounds} rounds &middot; {frameCount} frames captured
            </p>

            {roundResult && (
              <div className="mt-4 p-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] max-w-xs mx-auto">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-400">{Math.round(roundResult.stats.power_str)}</p>
                    <p className="text-[10px] text-neutral-500">STR</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-400">{Math.round(roundResult.stats.speed_agi)}</p>
                    <p className="text-[10px] text-neutral-500">AGI</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-400">{Math.round(roundResult.stats.stamina_end)}</p>
                    <p className="text-[10px] text-neutral-500">END</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-amber-400 font-medium">
                    +{roundResult.xp_earned} XP
                  </span>
                  {roundResult.level_up && (
                    <span className="text-xs text-emerald-400 font-medium">
                      Level Up! → {roundResult.new_level}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6 justify-center">
              <button
                onClick={resetDrill}
                className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-sm font-medium text-white hover:bg-white/[0.1] transition-colors"
              >
                Back to Drills
              </button>
              <button
                onClick={() => selectedDrill && startDrill(selectedDrill)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
              >
                Go Again
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom controls */}
      {(phase === "work" || phase === "rest") && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            {isPlaying ? (
              <Pause size={24} className="text-white" fill="currentColor" />
            ) : (
              <Play size={24} className="text-white ml-1" fill="currentColor" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
