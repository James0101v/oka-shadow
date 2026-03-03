import { Severity } from "./types";

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case "good":
      return "text-emerald-400";
    case "minor":
      return "text-amber-400";
    case "opening":
      return "text-red-400";
  }
}

export function severityBg(severity: Severity): string {
  switch (severity) {
    case "good":
      return "bg-emerald-500/20 border-emerald-500/30";
    case "minor":
      return "bg-amber-500/20 border-amber-500/30";
    case "opening":
      return "bg-red-500/20 border-red-500/30";
  }
}

export function severityDot(severity: Severity): string {
  switch (severity) {
    case "good":
      return "bg-emerald-400";
    case "minor":
      return "bg-amber-400";
    case "opening":
      return "bg-red-400";
  }
}

export function scoreGrade(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Solid";
  if (score >= 60) return "Developing";
  return "Keep Training";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 65) return "text-amber-400";
  return "text-red-400";
}

export function scoreStroke(score: number): string {
  if (score >= 80) return "stroke-emerald-400";
  if (score >= 65) return "stroke-amber-400";
  return "stroke-red-400";
}
