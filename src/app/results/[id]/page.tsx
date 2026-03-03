"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Pause,
  Bookmark,
  ListChecks,
  Share2,
  Swords,
  Zap,
  Heart,
  Star,
  Shield,
  TrendingUp,
  RotateCw,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SEED_SESSIONS } from "@/lib/mock-data";
import { RoundSession, TimelineEvent } from "@/lib/types";
import { ScoreRing } from "@/components/ui/score-ring";
import { InsightBadge } from "@/components/ui/insight-badge";
import { TimelineBar } from "@/components/ui/timeline-bar";
import { formatDuration } from "@/lib/utils";
import type { SubmitRoundResponse } from "@/lib/api-v2";
import { drawSkeleton } from "@/lib/pose-detection";
import type { PoseFrame } from "@/lib/pose-detection";
import { getFrames } from "@/lib/frame-store";

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { sessions } = useAppStore();

  const session: RoundSession | undefined =
    sessions.find((s) => s.id === sessionId) ||
    SEED_SESSIONS.find((s) => s.id === sessionId);

  // Try to load real v2 MotionEngine results
  const [v2Data, setV2Data] = useState<SubmitRoundResponse | null>(null);
  // Real recorded pose frames for playback
  const [poseFrames, setPoseFrames] = useState<PoseFrame[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`v2-round-${sessionId}`);
      if (raw) setV2Data(JSON.parse(raw));
    } catch {}
    // Load real pose frames — in-memory store first (no quota limit),
    // fall back to sessionStorage for smaller rounds
    const memFrames = getFrames(sessionId);
    if (memFrames && memFrames.length > 0) {
      // Downsample to every 2nd frame (~15fps) for canvas perf
      setPoseFrames(memFrames.filter((_, i) => i % 2 === 0));
    } else {
      try {
        const poseRaw = sessionStorage.getItem(`pose-data-${sessionId}`);
        if (poseRaw) {
          const parsed = JSON.parse(poseRaw);
          const frames: PoseFrame[] = (parsed.frames ?? []).filter(
            (_: PoseFrame, i: number) => i % 2 === 0
          );
          setPoseFrames(frames);
        }
      } catch {}
    }
  }, [sessionId]);

  const hasRealData = !!v2Data?.stats;
  const realStats = v2Data?.stats;

  // Use real timeline if available, fall back to mock
  const timeline: TimelineEvent[] = hasRealData && realStats?.timeline_events
    ? realStats.timeline_events.map((e) => ({
        id: e.id || String(Math.random()),
        timestamp: e.timestamp,
        type: e.type as TimelineEvent["type"],
        label: e.label,
        severity: (e.severity || "good") as TimelineEvent["severity"],
      }))
    : session?.timeline || [];

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCaption, setActiveCaption] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = realStats?.duration_seconds || session?.durationSeconds || 30;
  const displayScore = hasRealData ? (realStats?.score ?? 0) : (session?.score ?? 0);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalDuration]);

  useEffect(() => {
    if (!timeline.length) return;
    const event = timeline.find(
      (e) => Math.abs(e.timestamp - currentTime) < 0.5
    );
    if (event) {
      setActiveCaption(getCaptionForEvent(event));
      const timeout = setTimeout(() => setActiveCaption(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [Math.floor(currentTime * 2), timeline]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-500">Session not found</p>
      </div>
    );
  }

  // Generate top issues from real error data or use mock
  const topIssues: string[] = hasRealData && realStats?.error_breakdown
    ? Object.entries(realStats.error_breakdown).map(
        ([type, count]) =>
          `${(type as string).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} (${count}x)`
      )
    : session.topIssues;

  // Generate insights from real data
  const insights = hasRealData
    ? generateRealInsights(realStats!)
    : session.insights;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative w-full bg-neutral-900 overflow-hidden" style={{ height: "min(65vh, 520px)" }}>
        {poseFrames.length > 0 ? (
          <PoseReplay
            frames={poseFrames}
            totalDuration={totalDuration}
            currentTime={currentTime}
            isPlaying={isPlaying}
          />
        ) : (
          <VideoSimulation
            session={session}
            timeline={timeline}
            currentTime={currentTime}
            isPlaying={isPlaying}
            activeCaption={activeCaption}
          />
        )}

        {/* Event label overlay — shown on top of either playback mode */}
        {(() => {
          const nearbyEvent = timeline.find((e) => Math.abs(e.timestamp - currentTime) < 1);
          return nearbyEvent ? (
            <motion.div
              key={nearbyEvent.id + Math.floor(currentTime)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-20"
            >
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                nearbyEvent.severity === "good"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : nearbyEvent.severity === "minor"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-red-500/20 text-red-300"
              }`}>
                {nearbyEvent.label}
              </div>
            </motion.div>
          ) : null;
        })()}

        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex gap-2">
            {v2Data && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500/20 backdrop-blur-sm">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">
                  +{v2Data.xp_earned} XP
                </span>
              </div>
            )}
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Bookmark size={16} className="text-white" />
            </button>
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Share2 size={16} className="text-white" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              {isPlaying ? (
                <Pause size={20} className="text-white" fill="currentColor" />
              ) : (
                <Play
                  size={20}
                  className="text-white ml-0.5"
                  fill="currentColor"
                />
              )}
            </button>
            <div className="flex-1">
              <TimelineBar
                events={timeline}
                totalDuration={totalDuration}
                currentTime={currentTime}
                onSeek={(time) => setCurrentTime(time)}
              />
            </div>
          </div>
          <div className="flex justify-between mt-2 px-16">
            <span className="text-[10px] text-neutral-400 font-mono">
              {formatDuration(Math.floor(currentTime))}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {formatDuration(totalDuration)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 pb-24 max-w-lg mx-auto">
        {/* Score + RPG Stats */}
        <div className="flex items-center gap-6 mb-6">
          <ScoreRing score={displayScore} size={100} strokeWidth={5} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Round Score
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {Math.round(totalDuration)}s round &middot;{" "}
              {hasRealData ? `${realStats?.total_strikes ?? 0} strikes` : `${timeline.length} events`}
            </p>
            {v2Data?.level_up && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-amber-400 font-medium mt-1"
              >
                Level Up! → Level {v2Data.new_level}
              </motion.p>
            )}
          </div>
        </div>

        {/* RPG Stat Bars (real data only) */}
        {hasRealData && realStats && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
          >
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
              Fighter Stats
            </h3>
            <div className="space-y-3">
              <StatBar icon={Swords} label="Power" sublabel="STR" value={realStats.power_str} color="bg-red-400" textColor="text-red-400" />
              <StatBar icon={Zap} label="Speed" sublabel="AGI" value={realStats.speed_agi} color="bg-blue-400" textColor="text-blue-400" />
              <StatBar icon={Heart} label="Stamina" sublabel="END" value={realStats.stamina_end} color="bg-emerald-400" textColor="text-emerald-400" />
            </div>
          </motion.div>
        )}

        {/* Strike Breakdown (real data only) */}
        {hasRealData && realStats?.strike_breakdown && Object.keys(realStats.strike_breakdown).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
              Strike Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(realStats.strike_breakdown).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <Swords size={12} className="text-neutral-500" />
                  <span className="text-sm text-white font-medium flex-1 capitalize">{type}</span>
                  <span className="text-sm text-neutral-400 font-mono">{count as number}</span>
                </div>
              ))}
            </div>
            {realStats.combo_count > 0 && (
              <div className="flex items-center gap-2 mt-2 p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/10">
                <Zap size={12} className="text-cyan-400" />
                <span className="text-sm text-cyan-300 font-medium flex-1">Combos</span>
                <span className="text-sm text-cyan-400 font-mono">{realStats.combo_count}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Key Metrics (real data only) */}
        {hasRealData && realStats && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="grid grid-cols-3 gap-2 mb-2">
              <MetricTile icon={Shield} label="Guard" value={`${Math.round(realStats.guard_uptime * 100)}%`} color="text-emerald-400" />
              <MetricTile icon={Zap} label="Retract" value={`${Math.round(realStats.avg_retraction_ms)}ms`} color="text-blue-400" />
              <MetricTile icon={Star} label="Clean" value={`${realStats.clean_strikes}/${realStats.total_strikes}`} color="text-amber-400" />
            </div>
            {/* Wrist rotation row — only shown when we have data */}
            {(realStats.avg_wrist_rotation_deg ?? 0) > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center gap-3">
                  <RotateCw size={14} className="text-violet-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{realStats.avg_wrist_rotation_deg}°</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Wrist Rotation</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center gap-3">
                  <RotateCw size={14} className={`flex-shrink-0 ${
                    (realStats.pronation_rate ?? 0) >= 0.7 ? "text-emerald-400" :
                    (realStats.pronation_rate ?? 0) >= 0.4 ? "text-amber-400" : "text-red-400"
                  }`} />
                  <div>
                    <p className="text-sm font-bold text-white">{Math.round((realStats.pronation_rate ?? 0) * 100)}%</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Pronation Rate</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Top Issues */}
        {topIssues.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
              Top Issues
            </h3>
            <div className="space-y-2">
              {topIssues.map((issue, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10"
                >
                  <span className="text-sm text-red-300 font-medium w-5 text-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-red-300">{issue}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="mb-8">
          <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
            Insights
          </h3>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <InsightBadge
                key={insight.id}
                message={insight.message}
                severity={insight.severity}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Quests completed */}
        {v2Data?.quests_completed && v2Data.quests_completed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
              Quests Completed
            </h3>
            {v2Data.quests_completed.map((q) => (
              <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 mb-2">
                <Star size={14} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-emerald-300 flex-1">{q.title}</span>
                <span className="text-xs text-amber-400 font-medium">+{q.xp_reward} XP</span>
              </div>
            ))}
          </motion.div>
        )}

        <button
          onClick={() => router.push(`/drills/${session.id}`)}
          className="w-full py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white font-medium text-sm tracking-tight hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-2"
        >
          <ListChecks size={16} />
          View Drill Suggestions
        </button>
      </div>
    </div>
  );
}

function StatBar({
  icon: Icon,
  label,
  sublabel,
  value,
  color,
  textColor,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  value: number;
  color: string;
  textColor: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className={textColor} />
      <div className="w-10">
        <span className="text-[10px] text-neutral-500 uppercase">{sublabel}</span>
      </div>
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
      <span className="text-sm font-bold text-white w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-center">
      <Icon size={14} className={`${color} mx-auto mb-1`} />
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function generateRealInsights(stats: SubmitRoundResponse["stats"]): { id: string; message: string; severity: "good" | "minor" | "opening"; relatedEvents: string[] }[] {
  const insights: { id: string; message: string; severity: "good" | "minor" | "opening"; relatedEvents: string[] }[] = [];
  const errors = stats.error_breakdown || {};
  const strikes = stats.strike_breakdown || {};

  // Guard insights
  if (stats.guard_uptime >= 0.8) {
    insights.push({ id: "g1", message: `Excellent guard discipline — ${Math.round(stats.guard_uptime * 100)}% uptime`, severity: "good", relatedEvents: [] });
  } else if (stats.guard_uptime < 0.5) {
    insights.push({ id: "g2", message: `Guard drops frequently — only ${Math.round(stats.guard_uptime * 100)}% uptime. Focus on keeping hands up.`, severity: "opening", relatedEvents: [] });
  }

  // Error-based insights
  if (errors["guard-drop"]) {
    insights.push({ id: "e1", message: `Guard dropped ${errors["guard-drop"]}x during strikes — return hand to chin after throwing`, severity: "opening", relatedEvents: [] });
  }
  if (errors["chin-lift"]) {
    insights.push({ id: "e2", message: `Chin lifted ${errors["chin-lift"]}x — tuck chin before throwing hooks and crosses`, severity: "opening", relatedEvents: [] });
  }
  if (errors["weak-hip-rotation"]) {
    insights.push({ id: "e3", message: `Weak hip rotation on ${errors["weak-hip-rotation"]} strikes — commit to full hip turn for more power`, severity: "minor", relatedEvents: [] });
  }

  // Positive insights
  if (stats.clean_strikes > 0 && stats.total_strikes > 0) {
    const cleanPct = Math.round((stats.clean_strikes / stats.total_strikes) * 100);
    if (cleanPct >= 70) {
      insights.push({ id: "p1", message: `${cleanPct}% of strikes thrown with guard maintained — solid technique`, severity: "good", relatedEvents: [] });
    }
  }
  if (stats.combo_count >= 3) {
    insights.push({ id: "p2", message: `${stats.combo_count} combos thrown — good offensive chaining`, severity: "good", relatedEvents: [] });
  }
  if (stats.avg_retraction_ms > 0 && stats.avg_retraction_ms < 250) {
    insights.push({ id: "p3", message: `Fast hand retraction (${Math.round(stats.avg_retraction_ms)}ms avg) — snappy technique`, severity: "good", relatedEvents: [] });
  }

  // Wrist rotation / pronation insights
  const pronRate = stats.pronation_rate ?? 0;
  const avgWristRot = stats.avg_wrist_rotation_deg ?? 0;
  if (avgWristRot > 0) {
    if (pronRate >= 0.75) {
      insights.push({ id: "w1", message: `Great wrist pronation — ${Math.round(pronRate * 100)}% of strikes fully rotated at impact`, severity: "good", relatedEvents: [] });
    } else if (pronRate < 0.4) {
      insights.push({ id: "w2", message: `Wrist not fully rotating on ${Math.round((1 - pronRate) * 100)}% of strikes — pronate fist palm-down at impact for more power`, severity: "opening", relatedEvents: [] });
    }
  }
  if (errors["poor-pronation"]) {
    insights.push({ id: "w3", message: `Fist not pronated on ${errors["poor-pronation"]}x strikes — twist wrist as you extend for a jab or cross`, severity: "minor", relatedEvents: [] });
  }

  // Volume insight
  if (stats.total_strikes > 0) {
    const rate = stats.total_strikes / (stats.duration_seconds || 60);
    if (rate >= 0.8) {
      insights.push({ id: "v1", message: `High output: ${stats.total_strikes} strikes in ${Math.round(stats.duration_seconds)}s (${rate.toFixed(1)}/sec)`, severity: "good", relatedEvents: [] });
    } else if (rate < 0.3 && stats.duration_seconds > 10) {
      insights.push({ id: "v2", message: `Low volume — try to increase strike output. Only ${stats.total_strikes} strikes detected.`, severity: "minor", relatedEvents: [] });
    }
  }

  // Fallback if no insights generated
  if (insights.length === 0) {
    insights.push({ id: "f1", message: "Keep training to generate more detailed insights", severity: "good", relatedEvents: [] });
  }

  return insights;
}

// ── Real pose frame replay ────────────────────────────────────
function PoseReplay({
  frames,
  totalDuration,
  currentTime,
  isPlaying,
}: {
  frames: PoseFrame[];
  totalDuration: number;
  currentTime: number;
  isPlaying: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const playTimeRef = useRef<number>(currentTime);

  // Keep playTimeRef in sync when scrubbing (not playing)
  useEffect(() => {
    if (!isPlaying) playTimeRef.current = currentTime;
  }, [currentTime, isPlaying]);

  const renderFrame = useCallback((playT: number) => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;

    // Map playback time → frame index
    const pct = Math.min(playT / Math.max(totalDuration, 1), 1);
    const idx = Math.min(Math.floor(pct * frames.length), frames.length - 1);
    const frame = frames[idx];
    if (!frame) return;

    // Fit canvas to its display size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Scale by height — a person is taller than wide, so height is the limiting dimension
    const s = Math.max(canvas.width, canvas.height) / 480;
    drawSkeleton(canvas, frame, { lineWidth: 3, scale: s });
  }, [frames, totalDuration]);

  // Animate when playing
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderFrame(currentTime);
      return;
    }

    lastTimeRef.current = performance.now();
    playTimeRef.current = currentTime;

    const tick = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      playTimeRef.current = Math.min(playTimeRef.current + dt, totalDuration);
      renderFrame(playTimeRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, currentTime, renderFrame, totalDuration]);

  // Render on scrub
  useEffect(() => {
    if (!isPlaying) renderFrame(currentTime);
  }, [currentTime, isPlaying, renderFrame]);

  return (
    <div className="absolute inset-0 bg-neutral-950 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      <div className="absolute bottom-20 left-3 right-3 text-center pointer-events-none">
        <span className="text-[10px] text-neutral-600 font-mono">
          {frames.length} frames recorded
        </span>
      </div>
    </div>
  );
}

function VideoSimulation({
  session,
  timeline,
  currentTime,
  isPlaying,
  activeCaption,
}: {
  session: RoundSession;
  timeline: TimelineEvent[];
  currentTime: number;
  isPlaying: boolean;
  activeCaption: string | null;
}) {
  const nearbyEvent = timeline.find(
    (e) => Math.abs(e.timestamp - currentTime) < 1
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
      <div className="relative w-full h-full flex items-center justify-center">
        <FighterSilhouette currentTime={currentTime} isPlaying={isPlaying} />

        {nearbyEvent && nearbyEvent.severity !== "good" && (
          <ShadowPartner currentTime={currentTime} />
        )}

        {nearbyEvent && (
          <motion.div
            key={nearbyEvent.id + currentTime}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 mt-16"
          >
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                nearbyEvent.severity === "good"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : nearbyEvent.severity === "minor"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-red-500/20 text-red-300"
              }`}
            >
              {nearbyEvent.label}
            </div>
          </motion.div>
        )}

        {activeCaption && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute bottom-32 left-0 right-0 text-center"
          >
            <span className="px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm text-sm text-white font-medium">
              {activeCaption}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Fighter pose keyframes (orthodox stance) ────────────────
const FIGHTER_POSES = [
  { // Guard up — orthodox stance
    head: { x: 100, y: 32 },
    shoulderL: { x: 82, y: 62 }, shoulderR: { x: 118, y: 62 },
    elbowL: { x: 72, y: 50 }, elbowR: { x: 126, y: 48 },
    wristL: { x: 80, y: 38 }, wristR: { x: 118, y: 36 },
    hip: { x: 100, y: 110 },
    hipL: { x: 88, y: 112 }, hipR: { x: 112, y: 108 },
    kneeL: { x: 78, y: 148 }, kneeR: { x: 118, y: 144 },
    footL: { x: 70, y: 186 }, footR: { x: 128, y: 182 },
  },
  { // Jab extended
    head: { x: 98, y: 34 },
    shoulderL: { x: 80, y: 64 }, shoulderR: { x: 116, y: 60 },
    elbowL: { x: 54, y: 48 }, elbowR: { x: 124, y: 46 },
    wristL: { x: 30, y: 40 }, wristR: { x: 116, y: 34 },
    hip: { x: 100, y: 112 },
    hipL: { x: 86, y: 114 }, hipR: { x: 114, y: 110 },
    kneeL: { x: 74, y: 150 }, kneeR: { x: 120, y: 146 },
    footL: { x: 64, y: 186 }, footR: { x: 130, y: 182 },
  },
  { // Cross thrown — hip rotated
    head: { x: 96, y: 33 },
    shoulderL: { x: 78, y: 62 }, shoulderR: { x: 114, y: 58 },
    elbowL: { x: 70, y: 48 }, elbowR: { x: 98, y: 42 },
    wristL: { x: 78, y: 36 }, wristR: { x: 38, y: 38 },
    hip: { x: 98, y: 110 },
    hipL: { x: 84, y: 112 }, hipR: { x: 112, y: 106 },
    kneeL: { x: 76, y: 148 }, kneeR: { x: 122, y: 142 },
    footL: { x: 66, y: 186 }, footR: { x: 126, y: 178 },
  },
  { // Hook position — compact
    head: { x: 98, y: 32 },
    shoulderL: { x: 80, y: 62 }, shoulderR: { x: 116, y: 62 },
    elbowL: { x: 56, y: 56 }, elbowR: { x: 128, y: 50 },
    wristL: { x: 46, y: 44 }, wristR: { x: 120, y: 36 },
    hip: { x: 100, y: 110 },
    hipL: { x: 86, y: 112 }, hipR: { x: 114, y: 108 },
    kneeL: { x: 76, y: 150 }, kneeR: { x: 120, y: 146 },
    footL: { x: 68, y: 186 }, footR: { x: 130, y: 184 },
  },
];

function lerpPt(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function getFighterPose(time: number) {
  const speed = 1.6;
  const t = (time * speed) % FIGHTER_POSES.length;
  const i = Math.floor(t);
  const frac = t - i;
  const smooth = frac * frac * (3 - 2 * frac); // smoothstep
  const a = FIGHTER_POSES[i % FIGHTER_POSES.length];
  const b = FIGHTER_POSES[(i + 1) % FIGHTER_POSES.length];
  const keys = Object.keys(a) as (keyof typeof a)[];
  const result: Record<string, { x: number; y: number }> = {};
  for (const k of keys) result[k] = lerpPt(a[k], b[k], smooth);
  return result;
}

function FighterSilhouette({
  currentTime,
  isPlaying,
}: {
  currentTime: number;
  isPlaying: boolean;
}) {
  const p = getFighterPose(currentTime);

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className="w-44 h-44"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={isPlaying ? { y: [0, -3, 0] } : {}}
      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <radialGradient id="head-glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="limb-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="body-glow">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Floor shadow */}
      <ellipse cx={p.hip.x} cy="194" rx="28" ry="4"
        fill="rgba(255,255,255,0.04)"
      />

      {/* Torso fill */}
      <path
        d={`M${p.shoulderL.x},${p.shoulderL.y} L${p.shoulderR.x},${p.shoulderR.y} L${p.hipR.x},${p.hipR.y} L${p.hipL.x},${p.hipL.y} Z`}
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />

      {/* Legs — thick rounded limbs with glow */}
      <g filter="url(#limb-glow)">
        {/* Left leg */}
        <line x1={p.hipL.x} y1={p.hipL.y} x2={p.kneeL.x} y2={p.kneeL.y}
          stroke="rgba(255,255,255,0.35)" strokeWidth="6" />
        <line x1={p.kneeL.x} y1={p.kneeL.y} x2={p.footL.x} y2={p.footL.y}
          stroke="rgba(255,255,255,0.3)" strokeWidth="5" />
        {/* Right leg */}
        <line x1={p.hipR.x} y1={p.hipR.y} x2={p.kneeR.x} y2={p.kneeR.y}
          stroke="rgba(255,255,255,0.4)" strokeWidth="6" />
        <line x1={p.kneeR.x} y1={p.kneeR.y} x2={p.footR.x} y2={p.footR.y}
          stroke="rgba(255,255,255,0.35)" strokeWidth="5" />
      </g>

      {/* Spine / torso core */}
      <line x1={(p.shoulderL.x + p.shoulderR.x) / 2} y1={(p.shoulderL.y + p.shoulderR.y) / 2}
            x2={p.hip.x} y2={p.hip.y}
        stroke="rgba(255,255,255,0.25)" strokeWidth="5" />

      {/* Shoulder bar */}
      <line x1={p.shoulderL.x} y1={p.shoulderL.y} x2={p.shoulderR.x} y2={p.shoulderR.y}
        stroke="rgba(255,255,255,0.35)" strokeWidth="5" />

      {/* Arms with glow */}
      <g filter="url(#body-glow)">
        {/* Left arm (lead) */}
        <line x1={p.shoulderL.x} y1={p.shoulderL.y} x2={p.elbowL.x} y2={p.elbowL.y}
          stroke="rgba(52,211,153,0.5)" strokeWidth="5" />
        <line x1={p.elbowL.x} y1={p.elbowL.y} x2={p.wristL.x} y2={p.wristL.y}
          stroke="rgba(52,211,153,0.6)" strokeWidth="4.5" />
        {/* Left fist */}
        <circle cx={p.wristL.x} cy={p.wristL.y} r="5"
          fill="rgba(52,211,153,0.7)" stroke="rgba(52,211,153,0.9)" strokeWidth="1.5" />

        {/* Right arm (rear) */}
        <line x1={p.shoulderR.x} y1={p.shoulderR.y} x2={p.elbowR.x} y2={p.elbowR.y}
          stroke="rgba(96,165,250,0.5)" strokeWidth="5" />
        <line x1={p.elbowR.x} y1={p.elbowR.y} x2={p.wristR.x} y2={p.wristR.y}
          stroke="rgba(96,165,250,0.6)" strokeWidth="4.5" />
        {/* Right fist */}
        <circle cx={p.wristR.x} cy={p.wristR.y} r="5"
          fill="rgba(96,165,250,0.7)" stroke="rgba(96,165,250,0.9)" strokeWidth="1.5" />
      </g>

      {/* Knee joints */}
      <circle cx={p.kneeL.x} cy={p.kneeL.y} r="3.5" fill="rgba(255,255,255,0.2)" />
      <circle cx={p.kneeR.x} cy={p.kneeR.y} r="3.5" fill="rgba(255,255,255,0.2)" />

      {/* Elbow joints */}
      <circle cx={p.elbowL.x} cy={p.elbowL.y} r="3" fill="rgba(52,211,153,0.3)" />
      <circle cx={p.elbowR.x} cy={p.elbowR.y} r="3" fill="rgba(96,165,250,0.3)" />

      {/* Feet */}
      <ellipse cx={p.footL.x} cy={p.footL.y + 2} rx="8" ry="3"
        fill="rgba(255,255,255,0.15)" />
      <ellipse cx={p.footR.x} cy={p.footR.y + 2} rx="8" ry="3"
        fill="rgba(255,255,255,0.15)" />

      {/* Head */}
      <circle cx={p.head.x} cy={p.head.y} r="14"
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
      <circle cx={p.head.x} cy={p.head.y} r="14" fill="url(#head-glow)" />

      {/* Neck */}
      <line x1={p.head.x} y1={p.head.y + 14}
            x2={(p.shoulderL.x + p.shoulderR.x) / 2} y2={(p.shoulderL.y + p.shoulderR.y) / 2}
        stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
    </motion.svg>
  );
}

function ShadowPartner({ currentTime }: { currentTime: number }) {
  const p = getFighterPose(currentTime + 1.5); // offset pose

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 0.3, x: 0 }}
      exit={{ opacity: 0 }}
      className="absolute right-4"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-36 h-36"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <filter id="red-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Torso */}
        <path
          d={`M${p.shoulderL.x},${p.shoulderL.y} L${p.shoulderR.x},${p.shoulderR.y} L${p.hipR.x},${p.hipR.y} L${p.hipL.x},${p.hipL.y} Z`}
          fill="rgba(239,68,68,0.03)"
          stroke="rgba(239,68,68,0.08)"
          strokeWidth="1"
        />

        {/* Legs */}
        <line x1={p.hipL.x} y1={p.hipL.y} x2={p.kneeL.x} y2={p.kneeL.y}
          stroke="rgba(239,68,68,0.25)" strokeWidth="5" />
        <line x1={p.kneeL.x} y1={p.kneeL.y} x2={p.footL.x} y2={p.footL.y}
          stroke="rgba(239,68,68,0.2)" strokeWidth="4" />
        <line x1={p.hipR.x} y1={p.hipR.y} x2={p.kneeR.x} y2={p.kneeR.y}
          stroke="rgba(239,68,68,0.25)" strokeWidth="5" />
        <line x1={p.kneeR.x} y1={p.kneeR.y} x2={p.footR.x} y2={p.footR.y}
          stroke="rgba(239,68,68,0.2)" strokeWidth="4" />

        {/* Spine */}
        <line x1={(p.shoulderL.x + p.shoulderR.x) / 2} y1={(p.shoulderL.y + p.shoulderR.y) / 2}
              x2={p.hip.x} y2={p.hip.y}
          stroke="rgba(239,68,68,0.2)" strokeWidth="4" />

        {/* Arms */}
        <g filter="url(#red-glow)">
          <line x1={p.shoulderL.x} y1={p.shoulderL.y} x2={p.elbowL.x} y2={p.elbowL.y}
            stroke="rgba(239,68,68,0.35)" strokeWidth="4" />
          <line x1={p.elbowL.x} y1={p.elbowL.y} x2={p.wristL.x} y2={p.wristL.y}
            stroke="rgba(239,68,68,0.4)" strokeWidth="3.5" />
          <circle cx={p.wristL.x} cy={p.wristL.y} r="4"
            fill="rgba(239,68,68,0.5)" />
          <line x1={p.shoulderR.x} y1={p.shoulderR.y} x2={p.elbowR.x} y2={p.elbowR.y}
            stroke="rgba(239,68,68,0.35)" strokeWidth="4" />
          <line x1={p.elbowR.x} y1={p.elbowR.y} x2={p.wristR.x} y2={p.wristR.y}
            stroke="rgba(239,68,68,0.4)" strokeWidth="3.5" />
          <circle cx={p.wristR.x} cy={p.wristR.y} r="4"
            fill="rgba(239,68,68,0.5)" />
        </g>

        {/* Head */}
        <circle cx={p.head.x} cy={p.head.y} r="12"
          fill="rgba(239,68,68,0.04)" stroke="rgba(239,68,68,0.3)" strokeWidth="2" />
        <line x1={p.head.x} y1={p.head.y + 12}
              x2={(p.shoulderL.x + p.shoulderR.x) / 2} y2={(p.shoulderL.y + p.shoulderR.y) / 2}
          stroke="rgba(239,68,68,0.2)" strokeWidth="3" />
      </svg>
    </motion.div>
  );
}

function getCaptionForEvent(event: TimelineEvent): string {
  switch (event.type) {
    case "guard-drop":
      return "Guard up";
    case "chin-lift":
      return "Tuck chin";
    case "weak-hip-rotation":
      return "Rotate hips more";
    case "no-rear-pivot":
      return "Pivot more";
    case "feet-crossing":
      return "Watch your feet";
    case "jab":
      return event.severity === "good" ? "Nice jab" : "Snap it back";
    case "cross":
      return event.severity === "good" ? "Nice rotation" : "More power";
    case "hook":
      return event.severity === "good" ? "Good hook" : "Chin down";
    case "uppercut":
      return event.severity === "good" ? "Nice uppercut" : "Drive from the legs";
    case "rear-roundhouse":
      return event.severity === "good" ? "Great kick" : "Turn hip over";
    case "poor-pronation":
      return "Rotate fist at impact";
    default:
      return "";
  }
}
