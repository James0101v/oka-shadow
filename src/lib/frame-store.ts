import type { PoseFrame } from "./pose-detection";

// In-memory store for pose frames — survives client-side navigation without
// hitting sessionStorage's 5MB quota limit.
// Keyed by session ID, holds the last N sessions to avoid unbounded growth.

const MAX_SESSIONS = 3;
const store = new Map<string, PoseFrame[]>();
const order: string[] = [];

export function storeFrames(sessionId: string, frames: PoseFrame[]): void {
  if (store.has(sessionId)) return; // already stored
  store.set(sessionId, frames);
  order.push(sessionId);
  // Evict oldest if over limit
  while (order.length > MAX_SESSIONS) {
    const oldest = order.shift()!;
    store.delete(oldest);
  }
}

export function getFrames(sessionId: string): PoseFrame[] | null {
  return store.get(sessionId) ?? null;
}
