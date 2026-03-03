"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Flame, Crown, Scroll, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SEED_SESSIONS } from "@/lib/mock-data";
import { SessionCard } from "@/components/ui/session-card";
import { QuestCard } from "@/components/ui/quest-card";
import { AppShell } from "@/components/layout/app-shell";
import { Onboarding } from "@/components/ui/onboarding";
import { PreRoundModal } from "@/components/ui/pre-round-modal";
import { apiV2, isAuthenticated } from "@/lib/api-v2";
import type { Quest, UserProfile } from "@/lib/api-v2";

export default function HomePage() {
  const router = useRouter();
  const { sessions, profile, addSession } = useAppStore();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [v2User, setV2User] = useState<UserProfile | null>(null);
  const [authed, setAuthed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPreRound, setShowPreRound] = useState(false);

  useEffect(() => {
    if (sessions.length === 0) {
      SEED_SESSIONS.forEach((s) => addSession(s));
    }
    try {
      if (!localStorage.getItem("oka-onboarded")) {
        setShowOnboarding(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthed(true);
      apiV2.getMyProfile().then(setV2User).catch(() => setAuthed(false));
      apiV2.getDailyQuests().then(setQuests).catch(() => {});
    }
  }, []);

  const recentSessions = sessions.slice(0, 5);
  const lastSession = sessions[0] ?? null;
  const weeklyDone = v2User?.sessions_this_week ?? profile.sessionsThisWeek;
  const weeklyGoal = v2User?.weekly_goal ?? profile.weeklyGoal;
  const weeklyPct = Math.min((weeklyDone / weeklyGoal) * 100, 100);
  const streak = v2User?.current_streak ?? 0;

  const handleStartRound = (focus: string) => {
    setShowPreRound(false);
    // Store focus goal for the record page to display
    try { sessionStorage.setItem("round-focus", focus); } catch {}
    router.push("/record");
  };

  return (
    <>
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        )}
        {showPreRound && (
          <PreRoundModal
            onStart={handleStartRound}
            onDismiss={() => setShowPreRound(false)}
          />
        )}
      </AnimatePresence>

      <AppShell>
        <div className="px-6 pt-14 pb-28">

          {/* ── Header ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6"
          >
            <p className="text-xs text-neutral-600 tracking-widest uppercase mb-1">
              Oka Shadow
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
              Round ready?
            </h1>
          </motion.div>

          {/* ── Micro-metrics row ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.35 }}
            className="flex items-center gap-2.5 mb-6"
          >
            {/* Streak pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
              streak > 0
                ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                : "bg-white/[0.03] border-white/[0.06] text-neutral-500"
            }`}>
              <Flame size={12} className={streak > 0 ? "text-orange-400" : "text-neutral-600"} />
              {streak > 0 ? `${streak} day streak` : "Streak: 0 days"}
            </div>

            {/* Last session pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white/[0.03] border-white/[0.06] text-xs text-neutral-500">
              <Clock size={12} className="text-neutral-600" />
              {lastSession
                ? `Last: ${formatRelativeDate(lastSession.createdAt)}`
                : "Last round: —"}
            </div>

            {/* Combat Grade pill (authed only) */}
            {authed && v2User && (() => {
              const r = v2User.combat_grade ?? "F";
              const rankColors: Record<string, string> = {
                F: "bg-neutral-500/10 border-neutral-500/20 text-neutral-400",
                E: "bg-green-500/10 border-green-500/20 text-green-400",
                D: "bg-blue-500/10 border-blue-500/20 text-blue-400",
                C: "bg-violet-500/10 border-violet-500/20 text-violet-400",
                B: "bg-amber-500/10 border-amber-500/20 text-amber-400",
                A: "bg-orange-500/10 border-orange-500/20 text-orange-400",
                S: "bg-red-500/10 border-red-500/20 text-red-400",
              };
              return (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ml-auto ${rankColors[r] ?? rankColors["F"]}`}>
                  <span className="font-black">{r}</span>
                  <span className="font-normal opacity-70">{v2User.combat_xp}/{v2User.combat_xp_cap}</span>
                </div>
              );
            })()}
          </motion.div>

          {/* ── Combat Grade status banners ──────────────────── */}
          {authed && v2User && (() => {
            const last = v2User.last_training_date ? new Date(v2User.last_training_date) : null;
            const hoursInactive = last ? (Date.now() - last.getTime()) / 3600000 : 0;
            const isDecayActive = hoursInactive > 72;
            const isAtRisk = hoursInactive > 48 && hoursInactive <= 72;
            const isReawakening = v2User.reawakening_eligible;
            if (!isDecayActive && !isAtRisk && !isReawakening) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="mb-4"
              >
                {isDecayActive && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-400">Combat Grade Fading</p>
                      <p className="text-[11px] text-red-400/70">Combat readiness declining. Train to stabilize.</p>
                    </div>
                  </div>
                )}
                {isAtRisk && !isDecayActive && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-400">Train within {Math.round(72 - hoursInactive)}h to prevent rank decay</p>
                  </div>
                )}
                {isReawakening && !isDecayActive && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                    <Sparkles size={14} className="text-violet-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-violet-400">Reawakening Bonus Active</p>
                      <p className="text-[11px] text-violet-400/70">Your body remembers. +25% XP this session.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })()}

          {/* ── Mission card: weekly progress + CTA ───────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden mb-5"
          >
            {/* Weekly bar */}
            <div className="px-5 pt-5 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-amber-400" />
                  <span className="text-xs text-neutral-400 font-medium">This week</span>
                </div>
                <span className="text-xs text-neutral-500">
                  {weeklyDone} / {weeklyGoal} rounds
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${weeklyPct}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              {weeklyDone >= weeklyGoal && (
                <p className="text-[11px] text-amber-400/70 mt-2">Weekly goal hit 🎯</p>
              )}
            </div>

            {/* CTA */}
            <div className="px-5 py-4">
              <button
                onClick={() => setShowPreRound(true)}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base tracking-tight hover:bg-neutral-100 active:scale-[0.98] transition-all"
              >
                Start Round
              </button>
              <p className="text-center text-[11px] text-neutral-600 mt-2.5">
                60 seconds · front camera · full-body framing
              </p>
            </div>
          </motion.div>

          {/* ── Sign-in nudge (guest only) ─────────────────── */}
          {!authed && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18 }}
              onClick={() => router.push("/auth")}
              className="w-full mb-6 py-3 rounded-2xl border border-white/[0.06] text-sm text-neutral-500 hover:text-white hover:border-white/10 transition-all"
            >
              Sign in to earn XP &amp; track progress
            </motion.button>
          )}

          {/* ── Daily Quests (authed, compact) ────────────── */}
          {authed && quests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Scroll size={13} className="text-purple-400" />
                <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
                  Daily Quests
                </h2>
              </div>
              <div className="space-y-2">
                {quests.slice(0, 2).map((quest, i) => (
                  <QuestCard key={quest.id} quest={quest} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Recent Sessions ────────────────────────────── */}
          {recentSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
                  Recent Sessions
                </h2>
                <button
                  onClick={() => router.push("/library")}
                  className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-300 transition-colors"
                >
                  View all
                  <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {recentSessions.map((session, i) => (
                  <SessionCard key={session.id} session={session} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </AppShell>
    </>
  );
}

function formatRelativeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  } catch {
    return "—";
  }
}
