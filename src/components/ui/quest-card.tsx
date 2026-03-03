"use client";

import { motion } from "framer-motion";
import { Swords, Shield, Zap, Target, CheckCircle2 } from "lucide-react";
import type { Quest } from "@/lib/api-v2";

const QUEST_ICONS: Record<string, React.ElementType> = {
  total_strikes: Swords,
  jab_count: Swords,
  cross_count: Swords,
  hook_count: Swords,
  guard_uptime: Shield,
  combo_count: Zap,
  fast_retraction: Zap,
  round_score: Target,
  rounds_completed: Target,
  power_score: Swords,
};

const QUEST_COLORS: Record<string, string> = {
  total_strikes: "text-red-400",
  jab_count: "text-blue-400",
  cross_count: "text-amber-400",
  hook_count: "text-purple-400",
  guard_uptime: "text-emerald-400",
  combo_count: "text-cyan-400",
  fast_retraction: "text-yellow-400",
  round_score: "text-pink-400",
  rounds_completed: "text-green-400",
  power_score: "text-orange-400",
};

const QUEST_BG_COLORS: Record<string, string> = {
  total_strikes: "bg-red-500/10",
  jab_count: "bg-blue-500/10",
  cross_count: "bg-amber-500/10",
  hook_count: "bg-purple-500/10",
  guard_uptime: "bg-emerald-500/10",
  combo_count: "bg-cyan-500/10",
  fast_retraction: "bg-yellow-500/10",
  round_score: "bg-pink-500/10",
  rounds_completed: "bg-green-500/10",
  power_score: "bg-orange-500/10",
};

export function QuestCard({ quest, index }: { quest: Quest; index: number }) {
  const Icon = QUEST_ICONS[quest.quest_type] || Target;
  const color = QUEST_COLORS[quest.quest_type] || "text-neutral-400";
  const bgColor = QUEST_BG_COLORS[quest.quest_type] || "bg-white/[0.06]";
  const progress = Math.min(quest.progress, 1);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        quest.completed
          ? "bg-emerald-500/[0.06] border-emerald-500/20"
          : "bg-white/[0.02] border-white/[0.04]"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        {quest.completed ? (
          <CheckCircle2 size={16} className="text-emerald-400" />
        ) : (
          <Icon size={16} className={color} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${quest.completed ? "text-emerald-300" : "text-white"}`}>
          {quest.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${quest.completed ? "bg-emerald-400" : "bg-blue-400"}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.08 }}
            />
          </div>
          <span className="text-[10px] text-neutral-500 font-mono flex-shrink-0">
            {quest.completed ? "Done" : `${Math.round(progress * 100)}%`}
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <span className="text-[10px] text-amber-400 font-medium">+{quest.xp_reward} XP</span>
      </div>
    </motion.div>
  );
}
