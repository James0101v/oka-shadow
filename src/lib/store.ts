import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppState, RecordingPhase, RoundSession, UserProfile } from "./types";

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: {
        stance: "orthodox",
        skillLevel: "beginner",
        weeklyGoal: 3,
        sessionsThisWeek: 0,
      },
      sessions: [],
      currentRecordingPhase: "setup" as RecordingPhase,
      currentSessionId: null,
      isBodyDetected: false,

      setProfile: (updates: Partial<UserProfile>) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),

      setRecordingPhase: (phase: RecordingPhase) =>
        set({ currentRecordingPhase: phase }),

      setBodyDetected: (detected: boolean) =>
        set({ isBodyDetected: detected }),

      addSession: (session: RoundSession) =>
        set((state) => ({
          sessions: [session, ...state.sessions],
          profile: {
            ...state.profile,
            sessionsThisWeek: state.profile.sessionsThisWeek + 1,
          },
        })),

      setCurrentSessionId: (id: string | null) =>
        set({ currentSessionId: id }),

      getSession: (id: string) =>
        get().sessions.find((s) => s.id === id),

      getRecentSessions: (count: number) =>
        get().sessions.slice(0, count),
    }),
    {
      name: "oka-shadow-storage",
      partialize: (state) => ({
        profile: state.profile,
        sessions: state.sessions,
      }),
    }
  )
);
