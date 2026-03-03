"use client";

import { motion } from "framer-motion";
import { Severity } from "@/lib/types";
import { severityBg, severityColor } from "@/lib/utils";

interface InsightBadgeProps {
  message: string;
  severity: Severity;
  index?: number;
}

export function InsightBadge({ message, severity, index = 0 }: InsightBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
      className={`flex items-start gap-3 p-3 rounded-xl border ${severityBg(severity)}`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
          severity === "good"
            ? "bg-emerald-400"
            : severity === "minor"
            ? "bg-amber-400"
            : "bg-red-400"
        }`}
      />
      <span className={`text-sm leading-relaxed ${severityColor(severity)}`}>
        {message}
      </span>
    </motion.div>
  );
}
