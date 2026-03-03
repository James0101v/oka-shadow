"use client";

import { motion } from "framer-motion";
import { TimelineEvent } from "@/lib/types";
import { severityDot } from "@/lib/utils";

interface TimelineBarProps {
  events: TimelineEvent[];
  totalDuration: number;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export function TimelineBar({
  events,
  totalDuration,
  currentTime = 0,
  onSeek,
}: TimelineBarProps) {
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="w-full space-y-2">
      <div
        className="relative w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.04] overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (!onSeek) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pct = x / rect.width;
          onSeek(pct * totalDuration);
        }}
      >
        <motion.div
          className="absolute top-0 left-0 h-full bg-white/[0.06]"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />

        {events.map((event, i) => {
          const left = (event.timestamp / totalDuration) * 100;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.03 }}
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left: `${left}%` }}
            >
              <div
                className={`w-2 h-2 rounded-full ${severityDot(event.severity)} ring-2 ring-background`}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-neutral-800 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {event.label}
              </div>
            </motion.div>
          );
        })}

        <div
          className="absolute top-0 h-full w-0.5 bg-white/60"
          style={{ left: `${progress}%` }}
        />
      </div>

      <div className="flex gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">
            Good
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">
            Minor
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">
            Opening
          </span>
        </div>
      </div>
    </div>
  );
}
