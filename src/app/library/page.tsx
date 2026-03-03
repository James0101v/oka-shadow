"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { SEED_SESSIONS } from "@/lib/mock-data";
import { SessionCard } from "@/components/ui/session-card";
import { AppShell } from "@/components/layout/app-shell";

export default function LibraryPage() {
  const { sessions, addSession } = useAppStore();

  useEffect(() => {
    if (sessions.length === 0) {
      SEED_SESSIONS.forEach((s) => addSession(s));
    }
  }, []);

  return (
    <AppShell>
      <div className="px-6 pt-14 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Your Rounds
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {sessions.length} sessions recorded
          </p>
        </motion.div>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
              <span className="text-2xl text-neutral-600">0</span>
            </div>
            <p className="text-sm text-neutral-500 text-center">
              No rounds yet. Start your first session to see your history here.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, i) => (
              <SessionCard key={session.id} session={session} index={i} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
