"use client";

import { motion } from "framer-motion";

export function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-lg bg-white/[0.04] ${className}`}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function ProfileSkeleton() {
  return (
    <div className="px-6 pt-14 pb-24 space-y-4">
      <SkeletonPulse className="h-8 w-48" />
      <SkeletonPulse className="h-4 w-24" />
      <SkeletonPulse className="h-24 w-full rounded-2xl" />
      <SkeletonPulse className="h-[220px] w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-2">
        <SkeletonPulse className="h-20 rounded-xl" />
        <SkeletonPulse className="h-20 rounded-xl" />
        <SkeletonPulse className="h-20 rounded-xl" />
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="px-6 pt-14 pb-24 space-y-4">
      <SkeletonPulse className="h-5 w-32" />
      <SkeletonPulse className="h-9 w-56" />
      <SkeletonPulse className="h-12 w-full rounded-xl" />
      <SkeletonPulse className="h-16 w-full rounded-xl" />
      <div className="space-y-3 mt-6">
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-20 w-full rounded-2xl" />
        <SkeletonPulse className="h-20 w-full rounded-2xl" />
        <SkeletonPulse className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Icon size={24} className="text-neutral-600" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-neutral-500 text-center max-w-xs">{description}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-100 transition-colors"
        >
          {action}
        </button>
      )}
    </motion.div>
  );
}
