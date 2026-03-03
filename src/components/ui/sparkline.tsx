"use client";

import { motion } from "framer-motion";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  showDots?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = "rgba(255,255,255,0.5)",
  fillColor = "rgba(255,255,255,0.05)",
  showDots = false,
  className = "",
}: SparklineProps) {
  if (data.length < 2) return null;

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * w,
    y: pad + h - ((v - min) / range) * h,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const fillPath = `${linePath} L${points[points.length - 1].x},${height - pad} L${points[0].x},${height - pad} Z`;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      {/* Fill area */}
      <motion.path
        d={fillPath}
        fill={fillColor}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {/* Last point dot */}
      {showDots && points.length > 0 && (
        <motion.circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2.5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8 }}
        />
      )}
    </svg>
  );
}
