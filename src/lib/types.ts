export type Stance = "orthodox" | "southpaw";
export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type StrikeType = "jab" | "cross" | "hook" | "rear-roundhouse" | "uppercut";
export type ErrorType =
  | "guard-drop"
  | "chin-lift"
  | "feet-crossing"
  | "poor-pronation"
  | "weak-hip-rotation"
  | "no-rear-pivot";

export type Severity = "good" | "minor" | "opening";

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: StrikeType | ErrorType;
  label: string;
  severity: Severity;
}

export interface Insight {
  id: string;
  message: string;
  severity: Severity;
  relatedEvents: string[];
}

export interface DrillSuggestion {
  id: string;
  name: string;
  rounds: number;
  durationPerRound: number;
  description: string;
  focusArea: ErrorType | StrikeType;
}

export interface RoundSession {
  id: string;
  createdAt: string;
  durationSeconds: number;
  score: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  timeline: TimelineEvent[];
  insights: Insight[];
  drills: DrillSuggestion[];
  topIssues: string[];
}

export interface UserProfile {
  stance: Stance;
  skillLevel: SkillLevel;
  weeklyGoal: number;
  sessionsThisWeek: number;
}

export type RecordingPhase =
  | "setup"
  | "countdown"
  | "recording"
  | "processing"
  | "complete";

export interface AppState {
  profile: UserProfile;
  sessions: RoundSession[];
  currentRecordingPhase: RecordingPhase;
  currentSessionId: string | null;
  isBodyDetected: boolean;

  setProfile: (profile: Partial<UserProfile>) => void;
  setRecordingPhase: (phase: RecordingPhase) => void;
  setBodyDetected: (detected: boolean) => void;
  addSession: (session: RoundSession) => void;
  setCurrentSessionId: (id: string | null) => void;
  getSession: (id: string) => RoundSession | undefined;
  getRecentSessions: (count: number) => RoundSession[];
}
