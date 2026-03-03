"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { RoundSession } from "@/lib/types";
import { formatTimeAgo, scoreColor } from "@/lib/utils";

interface SessionCardProps {
  session: RoundSession;
  index: number;
}

export function SessionCard({ session, index }: SessionCardProps) {
  const router = useRouter();
  const roundNumber =
    session.id.split("-")[1] || String(index + 1);

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => router.push(`/results/${session.id}`)}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors text-left group"
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center">
        <span className={`text-lg font-semibold ${scoreColor(session.score)}`}>
          {session.score}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          Round {roundNumber}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {formatTimeAgo(session.createdAt)} &middot; {session.durationSeconds}s
        </p>
      </div>
      <ChevronRight
        size={16}
        className="text-neutral-600 group-hover:text-neutral-400 transition-colors flex-shrink-0"
      />
    </motion.button>
  );
}
