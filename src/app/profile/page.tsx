"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight, Shield, Gauge, Target, Trophy, Swords,
  Zap, Heart, Star, LogOut, Crown, TrendingUp, Clock, Flame, AlertTriangle, Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Stance, SkillLevel } from "@/lib/types";
import { AppShell } from "@/components/layout/app-shell";
import { RadarChart } from "@/components/ui/radar-chart";
import { Sparkline } from "@/components/ui/sparkline";
import { apiV2, isAuthenticated, clearToken } from "@/lib/api-v2";
import type { UserProfile as V2Profile, UserStats, RoundResult } from "@/lib/api-v2";

const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: "orthodox", label: "Orthodox" },
  { value: "southpaw", label: "Southpaw" },
];

const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const GOAL_OPTIONS = [1, 2, 3, 4, 5, 7];

export default function ProfilePage() {
  const router = useRouter();
  const { profile, setProfile, sessions } = useAppStore();
  const [v2Profile, setV2Profile] = useState<V2Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthed(true);
      apiV2.getMyProfile().then(setV2Profile).catch(() => setAuthed(false));
      apiV2.getMyStats().then(setStats).catch(() => {});
      apiV2.getMyRounds(20, 0).then(setRounds).catch(() => {});
    }
  }, []);

  const totalRounds = stats?.total_rounds ?? sessions.length;
  const avgScore = stats?.avg_score ?? (
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
      : 0
  );

  const powerStr = v2Profile?.power_str ?? 0;
  const speedAgi = v2Profile?.speed_agi ?? 0;
  const staminaEnd = v2Profile?.stamina_end ?? 0;

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setV2Profile(null);
    setStats(null);
  };

  return (
    <AppShell>
      <div className="px-6 pt-14 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {v2Profile?.display_name || "Fighter Profile"}
              </h1>
              {v2Profile && (
                <p className="text-sm text-neutral-500 mt-0.5">
                  @{v2Profile.username}
                </p>
              )}
            </div>
            {authed && (
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center"
              >
                <LogOut size={14} className="text-neutral-500" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Combat Grade Card */}
        {authed && v2Profile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-4"
          >
            <CombatGradeCard profile={v2Profile} />
          </motion.div>
        )}

        {/* RPG Stats Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center py-4 mb-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
        >
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
            Fighter Stats
          </h2>
          <RadarChart
            stats={[
              { label: "STR", value: powerStr, color: "#f87171" },
              { label: "AGI", value: speedAgi, color: "#60a5fa" },
              { label: "END", value: staminaEnd, color: "#34d399" },
            ]}
            size={220}
          />
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-2 mb-6"
        >
          <StatTile icon={Trophy} label="Rounds" value={totalRounds} color="text-amber-400" />
          <StatTile icon={Star} label="Avg Score" value={avgScore || "--"} color="text-blue-400" />
          <StatTile
            icon={Swords}
            label="Strikes"
            value={stats?.total_strikes ?? "--"}
            color="text-red-400"
          />
        </motion.div>

        {/* Detailed Stats (authed) */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-2 mb-6"
          >
            <MiniStat
              icon={Swords}
              label="Power"
              value={`${Math.round(stats.current_stats.power_str)}`}
              sub="STR score"
              color="text-red-400"
            />
            <MiniStat
              icon={Zap}
              label="Speed"
              value={`${Math.round(stats.current_stats.speed_agi)}`}
              sub="AGI score"
              color="text-blue-400"
            />
            <MiniStat
              icon={Heart}
              label="Stamina"
              value={`${Math.round(stats.current_stats.stamina_end)}`}
              sub="END score"
              color="text-emerald-400"
            />
            <MiniStat
              icon={Trophy}
              label="Best Round"
              value={stats.best_round ? `${stats.best_round.score}` : "--"}
              sub="highest score"
              color="text-amber-400"
            />
          </motion.div>
        )}

        {/* Progress Trends */}
        {authed && rounds.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
              Progress Trends
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <TrendCard
                label="Score"
                data={[...rounds].reverse().map((r) => r.score)}
                color="rgba(250,204,21,0.7)"
                fillColor="rgba(250,204,21,0.08)"
              />
              <TrendCard
                label="Power"
                data={[...rounds].reverse().map((r) => r.power_str)}
                color="rgba(248,113,113,0.7)"
                fillColor="rgba(248,113,113,0.08)"
              />
              <TrendCard
                label="Speed"
                data={[...rounds].reverse().map((r) => r.speed_agi)}
                color="rgba(96,165,250,0.7)"
                fillColor="rgba(96,165,250,0.08)"
              />
              <TrendCard
                label="Stamina"
                data={[...rounds].reverse().map((r) => r.stamina_end)}
                color="rgba(52,211,153,0.7)"
                fillColor="rgba(52,211,153,0.08)"
              />
            </div>
          </motion.div>
        )}

        {/* Round History */}
        {authed && rounds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mb-6"
          >
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
              Recent Rounds
            </h2>
            <div className="space-y-2">
              {rounds.slice(0, 10).map((round, i) => (
                <motion.button
                  key={round.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + i * 0.03 }}
                  onClick={() => router.push(`/results/${round.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">{round.score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white font-medium">
                        {round.total_strikes} strikes
                      </span>
                      <span className="text-[10px] text-neutral-600">&middot;</span>
                      <span className="text-[10px] text-neutral-500">
                        {Math.round(round.duration_seconds)}s
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-red-400/70">STR {Math.round(round.power_str)}</span>
                      <span className="text-[10px] text-blue-400/70">AGI {Math.round(round.speed_agi)}</span>
                      <span className="text-[10px] text-emerald-400/70">END {Math.round(round.stamina_end)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-neutral-600">
                      {round.created_at ? formatRelativeDate(round.created_at) : ""}
                    </p>
                    <p className="text-[10px] text-amber-400/60 mt-0.5">+{round.xp_earned} XP</p>
                  </div>
                  <ChevronRight size={12} className="text-neutral-700 flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-2">
            Settings
          </h2>

          <SettingRow
            icon={Shield}
            label="Stance"
            value={profile.stance === "orthodox" ? "Orthodox" : "Southpaw"}
            options={STANCE_OPTIONS.map((o) => o.label)}
            onSelect={(label) => {
              const opt = STANCE_OPTIONS.find((o) => o.label === label);
              if (opt) {
                setProfile({ stance: opt.value });
                if (authed) apiV2.updateProfile({ stance: opt.value }).catch(() => {});
              }
            }}
          />

          <SettingRow
            icon={Gauge}
            label="Skill Level"
            value={
              profile.skillLevel.charAt(0).toUpperCase() +
              profile.skillLevel.slice(1)
            }
            options={SKILL_OPTIONS.map((o) => o.label)}
            onSelect={(label) => {
              const opt = SKILL_OPTIONS.find((o) => o.label === label);
              if (opt) {
                setProfile({ skillLevel: opt.value });
                if (authed) apiV2.updateProfile({ skill_level: opt.value }).catch(() => {});
              }
            }}
          />

          <SettingRow
            icon={Target}
            label="Weekly Goal"
            value={`${profile.weeklyGoal} rounds`}
            options={GOAL_OPTIONS.map((g) => `${g} rounds`)}
            onSelect={(label) => {
              const num = parseInt(label);
              if (!isNaN(num)) {
                setProfile({ weeklyGoal: num });
                if (authed) apiV2.updateProfile({ weekly_goal: num }).catch(() => {});
              }
            }}
          />
        </motion.div>

        {/* Login prompt if not authed */}
        {!authed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-4 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 text-center"
          >
            <p className="text-sm text-blue-300 mb-2">
              Sign in to track your RPG stats, earn XP, and compete on the leaderboard
            </p>
            <a
              href="/auth"
              className="inline-block px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-100 transition-colors"
            >
              Sign In / Register
            </a>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-12 pt-6 border-t border-white/[0.04]"
        >
          <p className="text-xs text-neutral-600 text-center">
            Oka Shadow v2.0
          </p>
        </motion.div>
      </div>
    </AppShell>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-center">
      <Icon size={14} className={`${color} mx-auto mb-1`} />
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
        <Icon size={14} className={color} />
      </div>
      <div>
        <p className="text-sm font-bold text-white">{value}</p>
        <p className="text-[10px] text-neutral-500">{sub}</p>
      </div>
    </div>
  );
}

function TrendCard({
  label,
  data,
  color,
  fillColor,
}: {
  label: string;
  data: number[];
  color: string;
  fillColor: string;
}) {
  const latest = data.length > 0 ? data[data.length - 1] : 0;
  const prev = data.length > 1 ? data[data.length - 2] : latest;
  const diff = latest - prev;
  const trend = diff > 0 ? "+" : "";

  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</span>
        {data.length >= 2 && (
          <span className={`text-[10px] font-mono ${diff >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
            {trend}{Math.round(diff)}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-lg font-bold text-white">{Math.round(latest)}</span>
        <Sparkline data={data} width={70} height={24} color={color} fillColor={fillColor} showDots />
      </div>
    </div>
  );
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const COMBAT_GRADE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  F: { bg: "from-neutral-500/10",  border: "border-neutral-500/20", text: "text-neutral-400",  glow: "bg-neutral-500/20" },
  E: { bg: "from-green-500/10",    border: "border-green-500/20",   text: "text-green-400",    glow: "bg-green-500/20" },
  D: { bg: "from-blue-500/10",     border: "border-blue-500/20",    text: "text-blue-400",     glow: "bg-blue-500/20" },
  C: { bg: "from-violet-500/10",   border: "border-violet-500/20",  text: "text-violet-400",   glow: "bg-violet-500/20" },
  B: { bg: "from-amber-500/10",    border: "border-amber-500/20",   text: "text-amber-400",    glow: "bg-amber-500/20" },
  A: { bg: "from-orange-500/10",   border: "border-orange-500/20",  text: "text-orange-400",   glow: "bg-orange-500/20" },
  S: { bg: "from-red-500/10",      border: "border-red-500/20",     text: "text-red-400",      glow: "bg-red-500/20" },
};

const COMBAT_GRADE_LABELS: Record<string, string> = {
  F: "Beginner Fighter",
  E: "Consistent Trainee",
  D: "Solid Fundamentals",
  C: "Dangerous to Casuals",
  B: "Gym-Level Competitor",
  A: "Advanced Striker",
  S: "Elite — Coach Level",
};

function CombatGradeCard({ profile }: { profile: V2Profile }) {
  const rank = profile.combat_grade ?? "F";
  const xp = profile.combat_xp ?? 0;
  const cap = profile.combat_xp_cap ?? 300;
  const pct = Math.min(xp / cap, 1);
  const colors = COMBAT_GRADE_COLORS[rank] ?? COMBAT_GRADE_COLORS["F"];
  const isDecaying = profile.reawakening_eligible;

  // Days since last training
  let hoursInactive = 0;
  if (profile.last_training_date) {
    const last = new Date(profile.last_training_date);
    hoursInactive = (Date.now() - last.getTime()) / 3600000;
  }
  const inGrace = hoursInactive > 0 && hoursInactive <= 72;
  const isAtRisk = hoursInactive > 48 && hoursInactive <= 72;
  const isDecayActive = hoursInactive > 72;

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${colors.bg} via-transparent to-transparent border ${colors.border}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-14 h-14 rounded-2xl ${colors.glow} flex items-center justify-center flex-shrink-0`}>
          <span className={`text-2xl font-black ${colors.text}`}>{rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-base font-bold ${colors.text}`}>Rank {rank}</p>
            {profile.current_streak > 0 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/15">
                <Flame size={10} className="text-orange-400" />
                <span className="text-[10px] font-bold text-orange-400">{profile.current_streak}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-500 truncate">{COMBAT_GRADE_LABELS[rank]}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-xs font-mono font-bold ${colors.text}`}>{xp} <span className="text-neutral-600">/ {cap}</span></p>
          <p className="text-[10px] text-neutral-600">combat xp</p>
        </div>
      </div>

      {/* XP bar */}
      <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${
            rank === "S" ? "from-red-400 to-red-500" :
            rank === "A" ? "from-orange-400 to-orange-500" :
            rank === "B" ? "from-amber-400 to-amber-500" :
            rank === "C" ? "from-violet-400 to-violet-500" :
            rank === "D" ? "from-blue-400 to-blue-500" :
            rank === "E" ? "from-green-400 to-green-500" :
            "from-neutral-400 to-neutral-500"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
        />
      </div>

      {/* Status row */}
      {isDecayActive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-400">Combat Grade Fading</p>
            <p className="text-[10px] text-red-400/70">Combat readiness declining. Train to stabilize.</p>
          </div>
        </div>
      )}
      {isAtRisk && !isDecayActive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-400">Train within 24h to prevent decay</p>
        </div>
      )}
      {isDecaying && !isDecayActive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <Sparkles size={12} className="text-violet-400 flex-shrink-0" />
          <p className="text-xs text-violet-400">Reawakening bonus active — +25% Combat XP next session</p>
        </div>
      )}
      {!isAtRisk && !isDecayActive && !isDecaying && inGrace && (
        <p className="text-[10px] text-neutral-600 text-center">
          Grace period active &middot; {Math.round(72 - hoursInactive)}h remaining
        </p>
      )}
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
  options,
  onSelect,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4"
      >
        <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-neutral-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs text-neutral-500">{label}</p>
          <p className="text-sm text-white font-medium">{value}</p>
        </div>
        <ChevronRight
          size={14}
          className={`text-neutral-600 transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-white/[0.04] overflow-hidden"
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                opt === value
                  ? "text-white bg-white/[0.04]"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]"
              }`}
            >
              {opt}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
