"use client";

import { motion } from "framer-motion";

interface RadarChartProps {
  stats: { label: string; value: number; color: string }[];
  size?: number;
  maxValue?: number;
}

export function RadarChart({ stats, size = 220, maxValue = 100 }: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.38;
  const levels = 4;
  const angleStep = (2 * Math.PI) / stats.length;
  const startAngle = -Math.PI / 2; // Start from top

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / maxValue) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Grid rings
  const gridRings = Array.from({ length: levels }, (_, i) => {
    const r = ((i + 1) / levels) * radius;
    const points = stats.map((_, idx) => {
      const angle = startAngle + idx * angleStep;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    });
    return points.join(" ");
  });

  // Axis lines
  const axes = stats.map((_, idx) => {
    const angle = startAngle + idx * angleStep;
    return {
      x2: center + radius * Math.cos(angle),
      y2: center + radius * Math.sin(angle),
    };
  });

  // Data polygon
  const dataPoints = stats.map((s, idx) => {
    const pt = getPoint(idx, Math.min(s.value, maxValue));
    return `${pt.x},${pt.y}`;
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {gridRings.map((points, i) => (
          <polygon
            key={`ring-${i}`}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        {axes.map((axis, i) => (
          <line
            key={`axis-${i}`}
            x1={center}
            y1={center}
            x2={axis.x2}
            y2={axis.y2}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon fill */}
        <motion.polygon
          points={dataPoints.join(" ")}
          fill="rgba(96, 165, 250, 0.12)"
          stroke="rgba(96, 165, 250, 0.6)"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Data points */}
        {stats.map((s, idx) => {
          const pt = getPoint(idx, Math.min(s.value, maxValue));
          return (
            <motion.circle
              key={`dot-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill={s.color}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="1.5"
              initial={{ opacity: 0, r: 0 }}
              animate={{ opacity: 1, r: 4 }}
              transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
            />
          );
        })}
      </svg>

      {/* Labels */}
      {stats.map((s, idx) => {
        const angle = startAngle + idx * angleStep;
        const labelR = radius + 28;
        const lx = center + labelR * Math.cos(angle);
        const ly = center + labelR * Math.sin(angle);
        return (
          <div
            key={`label-${idx}`}
            className="absolute flex flex-col items-center"
            style={{
              left: lx,
              top: ly,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: s.color }}>
              {s.label}
            </span>
            <span className="text-sm font-bold text-white">
              {Math.round(s.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
