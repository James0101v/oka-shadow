/**
 * WebSocket real-time session client.
 *
 * Connects to ws://localhost:8001/api/v2/ws/session?token=<jwt>
 * Streams landmark frames and receives live feedback events.
 */

const _apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const WS_BASE = _apiBase
  .replace(/^https:\/\//, "wss://")
  .replace(/^http:\/\//, "ws://");

export type FeedbackSeverity = "good" | "minor" | "opening";

export interface StrikeFeedback {
  type: "jab" | "cross" | "hook" | "uppercut" | "rear-roundhouse";
  hand: "left" | "right";
  velocity: number;
  hip_rotation: number;
  severity: FeedbackSeverity;
  timestamp_ms: number;
}

export interface ErrorFeedback {
  type: "error";
  error: "guard-drop" | "chin-lift" | "weak-hip-rotation" | "poor-pronation";
  message: string;
  timestamp_ms: number;
}

export interface SummaryFeedback {
  type: "summary";
  stats: Record<string, unknown>;
  frame_count: number;
  duration_seconds: number;
}

export type SessionEvent =
  | StrikeFeedback
  | ErrorFeedback
  | SummaryFeedback
  | { type: "ready"; user_id: string }
  | { type: "ping" }
  | { type: "error"; message: string };

export interface SessionCallbacks {
  onReady?: (userId: string) => void;
  onStrike?: (ev: StrikeFeedback) => void;
  onError?: (ev: ErrorFeedback) => void;
  onSummary?: (ev: SummaryFeedback) => void;
  onDisconnect?: () => void;
  onConnectionError?: (msg: string) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private callbacks: SessionCallbacks;
  private connected = false;
  private frameQueue: object[] = [];
  private drainInterval: ReturnType<typeof setInterval> | null = null;

  constructor(callbacks: SessionCallbacks) {
    this.callbacks = callbacks;
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${WS_BASE}/api/v2/ws/session?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        // Drain any frames queued before connection was established
        this._startDrain();
      };

      this.ws.onmessage = (ev) => {
        try {
          const msg: SessionEvent = JSON.parse(ev.data as string);
          this._dispatch(msg);
          if (msg.type === "ready") resolve();
        } catch {
          // ignore malformed
        }
      };

      this.ws.onerror = () => {
        const msg = "WebSocket connection failed";
        this.callbacks.onConnectionError?.(msg);
        reject(new Error(msg));
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._stopDrain();
        this.callbacks.onDisconnect?.();
      };
    });
  }

  sendFrame(landmarks: object[], timestampMs: number): void {
    const frame = { type: "frame", landmarks, timestamp_ms: timestampMs };
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    } else {
      // Buffer up to 30 frames while connecting
      if (this.frameQueue.length < 30) this.frameQueue.push(frame);
    }
  }

  endSession(durationSeconds: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "end", duration_seconds: durationSeconds }));
    }
  }

  disconnect(): void {
    this._stopDrain();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private _dispatch(msg: SessionEvent): void {
    switch (msg.type) {
      case "ready":
        this.callbacks.onReady?.(msg.user_id);
        break;
      case "jab":
      case "cross":
      case "hook":
      case "uppercut":
      case "rear-roundhouse":
        this.callbacks.onStrike?.(msg as StrikeFeedback);
        break;
      case "error":
        if ("error" in msg) {
          this.callbacks.onError?.(msg as ErrorFeedback);
        } else {
          this.callbacks.onConnectionError?.(msg.message);
        }
        break;
      case "summary":
        this.callbacks.onSummary?.(msg as SummaryFeedback);
        break;
    }
  }

  private _startDrain(): void {
    if (this.drainInterval) return;
    this.drainInterval = setInterval(() => {
      if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) return;
      while (this.frameQueue.length > 0) {
        const frame = this.frameQueue.shift()!;
        this.ws!.send(JSON.stringify(frame));
      }
    }, 16);
  }

  private _stopDrain(): void {
    if (this.drainInterval) {
      clearInterval(this.drainInterval);
      this.drainInterval = null;
    }
  }
}
