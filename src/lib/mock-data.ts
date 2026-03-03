import { RoundSession, TimelineEvent, Insight, DrillSuggestion } from "./types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

const MOCK_TIMELINE: TimelineEvent[] = [
  {
    id: generateId(),
    timestamp: 2.1,
    type: "jab",
    label: "Jab",
    severity: "good",
  },
  {
    id: generateId(),
    timestamp: 3.4,
    type: "guard-drop",
    label: "Guard dropped",
    severity: "opening",
  },
  {
    id: generateId(),
    timestamp: 5.8,
    type: "cross",
    label: "Cross",
    severity: "good",
  },
  {
    id: generateId(),
    timestamp: 8.2,
    type: "hook",
    label: "Hook",
    severity: "minor",
  },
  {
    id: generateId(),
    timestamp: 9.1,
    type: "chin-lift",
    label: "Chin lifted",
    severity: "opening",
  },
  {
    id: generateId(),
    timestamp: 12.5,
    type: "jab",
    label: "Jab",
    severity: "good",
  },
  {
    id: generateId(),
    timestamp: 13.0,
    type: "cross",
    label: "Cross",
    severity: "good",
  },
  {
    id: generateId(),
    timestamp: 15.3,
    type: "rear-roundhouse",
    label: "Rear roundhouse",
    severity: "good",
  },
  {
    id: generateId(),
    timestamp: 18.7,
    type: "guard-drop",
    label: "Guard dropped",
    severity: "opening",
  },
  {
    id: generateId(),
    timestamp: 22.0,
    type: "hook",
    label: "Hook",
    severity: "good",
  },
  {
    id: generateId(),
    timestamp: 24.5,
    type: "weak-hip-rotation",
    label: "Weak hip rotation",
    severity: "minor",
  },
  {
    id: generateId(),
    timestamp: 27.3,
    type: "jab",
    label: "Jab",
    severity: "good",
  },
  {
    id: generateId(),
    timestamp: 28.1,
    type: "cross",
    label: "Cross",
    severity: "good",
  },
];

const MOCK_INSIGHTS: Insight[] = [
  {
    id: generateId(),
    message: "Guard drops after jab — leaves chin exposed",
    severity: "opening",
    relatedEvents: [],
  },
  {
    id: generateId(),
    message: "Chin lifts on hooks — tuck chin before throwing",
    severity: "opening",
    relatedEvents: [],
  },
  {
    id: generateId(),
    message: "Good hip rotation on cross — keep it up",
    severity: "good",
    relatedEvents: [],
  },
  {
    id: generateId(),
    message: "Solid jab-cross combinations with tight form",
    severity: "good",
    relatedEvents: [],
  },
  {
    id: generateId(),
    message: "Hip rotation on hooks needs more torque",
    severity: "minor",
    relatedEvents: [],
  },
];

const MOCK_DRILLS: DrillSuggestion[] = [
  {
    id: generateId(),
    name: "Jab-Cross Guard Return",
    rounds: 3,
    durationPerRound: 60,
    description:
      "Throw jab-cross, immediately snap guard back to chin. Focus on returning the lead hand before the cross lands.",
    focusArea: "guard-drop",
  },
  {
    id: generateId(),
    name: "Pivot + Cross Drill",
    rounds: 2,
    durationPerRound: 60,
    description:
      "Step at 45 degrees, pivot rear foot, throw cross. Emphasize full hip turn and rear heel lift.",
    focusArea: "no-rear-pivot",
  },
  {
    id: generateId(),
    name: "Chin Down Hook Drill",
    rounds: 2,
    durationPerRound: 60,
    description:
      "Throw hooks while keeping chin tucked to shoulder. Use mirror to verify head position throughout.",
    focusArea: "chin-lift",
  },
  {
    id: generateId(),
    name: "Hip Rotation Power Drill",
    rounds: 3,
    durationPerRound: 45,
    description:
      "Slow-motion crosses and hooks focusing exclusively on hip engagement. Turn hips fully before arm extends.",
    focusArea: "weak-hip-rotation",
  },
];

function generateSession(
  index: number,
  daysAgo: number,
  score: number
): RoundSession {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return {
    id: `session-${index}`,
    createdAt: date.toISOString(),
    durationSeconds: 30 + Math.floor(Math.random() * 30),
    score,
    videoUrl: null,
    thumbnailUrl: null,
    timeline: MOCK_TIMELINE.map((e) => ({ ...e, id: generateId() })),
    insights: MOCK_INSIGHTS.map((i) => ({ ...i, id: generateId() })),
    drills: MOCK_DRILLS.map((d) => ({ ...d, id: generateId() })),
    topIssues: [
      "Guard drops after jab",
      "Chin lifts on hooks",
      "Weak hip rotation on rear roundhouse",
    ],
  };
}

export const SEED_SESSIONS: RoundSession[] = [
  generateSession(15, 0, 82),
  generateSession(14, 1, 76),
  generateSession(13, 2, 79),
  generateSession(12, 3, 71),
  generateSession(11, 5, 68),
  generateSession(10, 7, 74),
  generateSession(9, 8, 65),
  generateSession(8, 10, 72),
];

export function createNewSession(): RoundSession {
  const id = generateId();
  return {
    id,
    createdAt: new Date().toISOString(),
    durationSeconds: 0,
    score: 0,
    videoUrl: null,
    thumbnailUrl: null,
    timeline: [],
    insights: [],
    drills: [],
    topIssues: [],
  };
}

export function simulateAnalysis(session: RoundSession): RoundSession {
  const score = 65 + Math.floor(Math.random() * 25);
  return {
    ...session,
    score,
    timeline: MOCK_TIMELINE.map((e) => ({ ...e, id: generateId() })),
    insights: MOCK_INSIGHTS.map((i) => ({ ...i, id: generateId() })),
    drills: MOCK_DRILLS.map((d) => ({ ...d, id: generateId() })),
    topIssues: [
      "Guard drops after jab",
      "Chin lifts on hooks",
      "Weak hip rotation on rear roundhouse",
    ],
  };
}
