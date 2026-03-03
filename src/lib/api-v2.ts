/**
 * V2 API Client — Auth, Rounds (with RPG stats), Quests, Leaderboard.
 * Token is stored in localStorage and attached to all authenticated requests.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const TOKEN_KEY = "oka-shadow-token";

// ── Types ─────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string;
  stance: string;
  skill_level: string;
  weight_class: string;
  elo: number;
  rank: string;
  xp: number;
  level: number;
  weekly_goal: number;
  power_str: number;
  speed_agi: number;
  stamina_end: number;
  current_streak: number;
  best_streak: number;
  last_training_date: string | null;
  created_at: string;
  sessions_this_week?: number;
  // Combat Grade System
  combat_grade: string;
  combat_xp: number;
  combat_xp_cap: number;
  combat_xp_pct: number;
  reawakening_eligible: boolean;
}

export interface RoundResult {
  id: string;
  user_id: string;
  duration_seconds: number;
  score: number;
  power_str: number;
  speed_agi: number;
  stamina_end: number;
  total_strikes: number;
  clean_strikes: number;
  guard_uptime: number;
  avg_retraction_ms: number;
  avg_extension_velocity: number;
  avg_hip_rotation_deg: number;
  avg_wrist_rotation_deg: number;
  pronation_rate: number;
  combo_count: number;
  strike_breakdown: Record<string, number>;
  error_breakdown: Record<string, number>;
  timeline_events: TimelineEvent[];
  xp_earned: number;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: string;
  label: string;
  severity: string;
  hand?: string;
  velocity?: number;
  count?: number;
}

export interface SubmitRoundResponse {
  round_id: string;
  stats: RoundResult;
  xp_earned: number;
  level_up: boolean;
  new_level: number;
  quests_completed: Quest[];
  combat_xp_awarded: number;
  combat_graded_up: boolean;
  combat_new_grade: string;
  combat_reawakening: boolean;
}

export interface Quest {
  id: string;
  user_id: string;
  quest_date: string;
  quest_type: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  progress: number;
  xp_reward: number;
  completed: boolean;
  completed_at: string | null;
}

export interface UserStats {
  total_rounds: number;
  avg_score: number;
  avg_power: number;
  avg_speed: number;
  avg_stamina: number;
  total_strikes: number;
  total_xp_earned: number;
  best_round: RoundResult | null;
  current_stats: {
    power_str: number;
    speed_agi: number;
    stamina_end: number;
  };
  elo: number;
  rank: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
}

export interface LeaderboardEntry {
  rank_position: number;
  id: string;
  username: string;
  display_name: string;
  elo: number;
  rank: string;
  level: number;
  power_str: number;
  speed_agi: number;
  stamina_end: number;
}

// ── Token management ──────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ── Request helper ────────────────────────────────────────────

async function request<T>(
  path: string,
  options?: RequestInit & { auth?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  // Attach token if auth required (default true for v2 routes)
  if (options?.auth !== false) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── API methods ───────────────────────────────────────────────

export const apiV2 = {
  // Auth
  async register(data: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    stance?: string;
    skill_level?: string;
    weight_class?: string;
  }): Promise<{ token: string; user: UserProfile }> {
    const result = await request<{ token: string; user: UserProfile }>(
      "/api/v2/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        auth: false,
      }
    );
    setToken(result.token);
    return result;
  },

  async login(username: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const result = await request<{ token: string; user: UserProfile }>(
      "/api/v2/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        auth: false,
      }
    );
    setToken(result.token);
    return result;
  },

  logout(): void {
    clearToken();
  },

  // Profile
  async getMyProfile(): Promise<UserProfile> {
    return request("/api/v2/me");
  },

  async updateProfile(data: {
    display_name?: string;
    stance?: string;
    skill_level?: string;
    weight_class?: string;
    weekly_goal?: number;
  }): Promise<UserProfile> {
    return request("/api/v2/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async getPublicProfile(username: string): Promise<UserProfile> {
    return request(`/api/v2/users/${username}`, { auth: false });
  },

  // Rounds
  async submitRound(data: {
    frames: unknown[];
    fps?: number;
    duration_seconds?: number;
  }): Promise<SubmitRoundResponse> {
    return request("/api/v2/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async getMyRounds(limit = 20, offset = 0): Promise<RoundResult[]> {
    return request(`/api/v2/rounds?limit=${limit}&offset=${offset}`);
  },

  async getRound(roundId: string): Promise<RoundResult> {
    return request(`/api/v2/rounds/${roundId}`);
  },

  // Stats
  async getMyStats(): Promise<UserStats> {
    return request("/api/v2/me/stats");
  },

  // Quests
  async getDailyQuests(): Promise<Quest[]> {
    return request("/api/v2/quests");
  },

  // Leaderboard
  async getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    return request(`/api/v2/leaderboard?limit=${limit}`, { auth: false });
  },
};
