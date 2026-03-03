import {
  PoseLandmarker,
  FilesetResolver,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

export interface PersonPose {
  personId: number;
  landmarks: NormalizedLandmark[];
  worldLandmarks: NormalizedLandmark[];
}

export interface PoseFrame {
  timestamp: number;
  landmarks: NormalizedLandmark[];       // backward compat: first person
  worldLandmarks: NormalizedLandmark[];  // backward compat: first person
  persons: PersonPose[];                 // all detected persons
}

export type PoseCallback = (frame: PoseFrame) => void;

// ── Device detection ─────────────────────────────────────────
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// ── LiDAR / WebXR depth sensing ──────────────────────────────
// Supported on iPhone 12 Pro+ / iPad Pro with LiDAR in Safari 15.4+
// via WebXR Device API with depth-sensing feature.

let xrSession: XRSession | null = null;
let xrRefSpace: XRReferenceSpace | null = null;
let latestDepthInfo: XRDepthInformation | null = null;
let xrFrame: XRFrame | null = null;

export function isLiDARAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "xr" in navigator &&
    typeof (navigator as Navigator & { xr?: XRSystem }).xr?.isSessionSupported === "function"
  );
}

export async function startLiDARSession(): Promise<boolean> {
  if (!isLiDARAvailable()) return false;
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) return false;
  try {
    const supported = await xr.isSessionSupported("immersive-ar");
    if (!supported) return false;
    xrSession = await xr.requestSession("immersive-ar", {
      requiredFeatures: ["local"],
      optionalFeatures: ["depth-sensing"],
      depthSensing: {
        usagePreference: ["cpu-optimized"],
        dataFormatPreference: ["luminance-alpha"],
      },
    });
    xrRefSpace = await xrSession.requestReferenceSpace("local");
    xrSession.requestAnimationFrame((_, frame) => {
      xrFrame = frame;
    });
    // Continuously update xrFrame
    const tick = (_: DOMHighResTimeStamp, frame: XRFrame) => {
      xrFrame = frame;
      // Try to get depth info from the frame
      try {
        const views = frame.getViewerPose(xrRefSpace!)?.views;
        if (views && views.length > 0) {
          const di = (frame as XRFrame & { getDepthInformation?: (view: XRView) => XRDepthInformation | null }).getDepthInformation?.(views[0]);
          if (di) latestDepthInfo = di;
        }
      } catch {}
      xrSession?.requestAnimationFrame(tick);
    };
    xrSession.requestAnimationFrame(tick);
    console.log("[LiDAR] WebXR depth session started");
    return true;
  } catch (err) {
    console.warn("[LiDAR] Could not start depth session:", err);
    xrSession = null;
    return false;
  }
}

export function stopLiDARSession(): void {
  if (xrSession) {
    xrSession.end().catch(() => {});
    xrSession = null;
    xrRefSpace = null;
    latestDepthInfo = null;
    xrFrame = null;
  }
}

export function isLiDARActive(): boolean {
  return xrSession !== null;
}

// Sample real metric depth (metres) at a normalised (u,v) position.
// Returns null if no depth data available.
function sampleDepth(u: number, v: number): number | null {
  if (!latestDepthInfo) return null;
  try {
    const d = (latestDepthInfo as XRDepthInformation & { getDepthInMeters?: (u: number, v: number) => number }).getDepthInMeters?.(u, v);
    if (typeof d === "number" && d > 0 && d < 10) return d;
  } catch {}
  return null;
}

let landmarker: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

// Temporal smoothing state
const smoothedLandmarks: Map<number, NormalizedLandmark[]> = new Map();
let lastValidFrame: PoseFrame | null = null;
let framesSinceDetection = 0;
let lastSentTimestampMs = -1;   // Enforce strictly monotonic timestamps for MediaPipe
const SMOOTHING_ALPHA = 0.30;   // Higher = more responsive, lower = smoother
const GRACE_FRAMES = 8;         // Keep showing last pose for N frames after detection loss
// Minimum visibility for core torso landmarks to accept a detection as a real person
const TORSO_VIS_MIN = 0.35;  // Lowered: 0.55 was too strict for typical indoor lighting
// Core landmark indices that must be visible for a valid human detection
const TORSO_ANCHORS = [11, 12, 23, 24]; // left/right shoulder + left/right hip

function smoothLandmarks(
  personId: number,
  raw: NormalizedLandmark[]
): NormalizedLandmark[] {
  const prev = smoothedLandmarks.get(personId);
  if (!prev || prev.length !== raw.length) {
    smoothedLandmarks.set(personId, raw.map(lm => ({ ...lm })));
    return raw;
  }
  const result = raw.map((lm, i) => {
    const p = prev[i];
    const vis = lm.visibility ?? 0;
    const pVis = p.visibility ?? 0;
    // If current visibility is very low, lean more on previous
    const alpha = vis > 0.15 ? SMOOTHING_ALPHA : 0.15;
    return {
      x: p.x + alpha * (lm.x - p.x),
      y: p.y + alpha * (lm.y - p.y),
      z: p.z + alpha * (lm.z - p.z),
      visibility: Math.max(vis, pVis * 0.85), // Slow visibility decay
    } as NormalizedLandmark;
  });
  smoothedLandmarks.set(personId, result);
  return result;
}

// Auto-select model tier based on device capability
function getModelUrl(): string {
  // lite (~3MB) for mobile, heavy (~30MB) for desktop — better hands & face
  const tier = isMobileDevice() ? "lite" : "heavy";
  return `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${tier}/float16/1/pose_landmarker_${tier}.task`;
}

export async function initPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const opts = {
      runningMode: "VIDEO" as const,
      numPoses: 2,
      minPoseDetectionConfidence: 0.50,
      minPosePresenceConfidence: 0.50,
      minTrackingConfidence: 0.50,
    };

    // Try GPU first, fall back to CPU if the delegate fails
    try {
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: getModelUrl(), delegate: "GPU" },
        ...opts,
      });
    } catch (gpuErr) {
      console.warn("[Pose] GPU delegate failed, retrying with CPU:", gpuErr);
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: getModelUrl(), delegate: "CPU" },
        ...opts,
      });
    }

    return landmarker;
  })();

  return initPromise;
}

export function destroyPoseLandmarker(): void {
  if (landmarker) {
    landmarker.close();
    landmarker = null;
    initPromise = null;
  }
  smoothedLandmarks.clear();
  lastValidFrame = null;
  framesSinceDetection = 0;
  lastSentTimestampMs = -1;
  stopLiDARSession();
}

export function detectPose(
  video: HTMLVideoElement,
  timestampMs: number
): PoseFrame | null {
  if (!landmarker) return null;

  // Strictly enforce monotonically increasing timestamps — MediaPipe throws on regressions
  // video.currentTime * 1000 can produce float values that go slightly backwards
  const safeTs = lastSentTimestampMs < 0
    ? Math.floor(timestampMs)
    : Math.max(Math.floor(timestampMs), lastSentTimestampMs + 1);
  lastSentTimestampMs = safeTs;

  let result;
  try {
    result = landmarker.detectForVideo(video, safeTs);
  } catch {
    // Timestamp or graph error — return grace period frame if available
    framesSinceDetection++;
    if (lastValidFrame && framesSinceDetection <= GRACE_FRAMES) return lastValidFrame;
    return null;
  }

  if (!result.landmarks || result.landmarks.length === 0) {
    // Grace period: return smoothed last-known pose for a few frames
    framesSinceDetection++;
    if (lastValidFrame && framesSinceDetection <= GRACE_FRAMES) {
      return lastValidFrame;
    }
    return null;
  }

  framesSinceDetection = 0;

  // Build candidate persons, filtering out detections that lack a visible torso
  // (catches chairs, bags, background objects that partially resemble a human)
  const candidates: PersonPose[] = [];
  result.landmarks.forEach((lm, idx) => {
    // Torso anchor check: all four core landmarks must exceed TORSO_VIS_MIN
    const torsoVisible = TORSO_ANCHORS.every(
      (ai) => (lm[ai]?.visibility ?? 0) >= TORSO_VIS_MIN
    );
    if (!torsoVisible) return; // reject — not a real person

    const smoothed = smoothLandmarks(idx, lm);
    const smoothedWorld = smoothLandmarks(
      idx + 1000,
      result.worldLandmarks?.[idx] || []
    );

    // LiDAR depth refinement
    if (latestDepthInfo) {
      for (const landmark of smoothed) {
        const d = sampleDepth(landmark.x, landmark.y);
        if (d !== null) {
          landmark.z = (2.0 - d) / 2.0;
        }
      }
    }

    candidates.push({ personId: idx, landmarks: smoothed, worldLandmarks: smoothedWorld });
  });

  // If all detections were rejected by the torso check, use grace period
  if (candidates.length === 0) {
    framesSinceDetection++;
    if (lastValidFrame && framesSinceDetection <= GRACE_FRAMES) return lastValidFrame;
    return null;
  }

  // Primary person = largest torso (shoulder-to-hip distance) — most likely the subject
  // This prevents the skeleton jumping to a background person or object
  const primaryPerson = candidates.reduce((best, p) => {
    const torsoSize = (lm: NormalizedLandmark[]) => {
      const dx = (lm[11]?.x ?? 0) - (lm[12]?.x ?? 0);
      const dy = (lm[11]?.y ?? 0) - (lm[23]?.y ?? 0);
      return Math.sqrt(dx * dx + dy * dy);
    };
    return torsoSize(p.landmarks) >= torsoSize(best.landmarks) ? p : best;
  });

  // Re-index persons so primary is always personId 0
  const persons: PersonPose[] = candidates.map((p, i) => ({
    ...p,
    personId: p === primaryPerson ? 0 : i + 1,
  }));

  const frame: PoseFrame = {
    timestamp: timestampMs,
    landmarks: primaryPerson.landmarks,
    worldLandmarks: primaryPerson.worldLandmarks,
    persons,
  };

  lastValidFrame = frame;
  return frame;
}

// ── Anatomical skeleton rendering (multi-person) ─────────────

// Two distinct colour palettes: Fighter 1 (warm) and Fighter 2 (cool)
interface ColorPalette {
  left: string; right: string; torso: string; head: string; foot: string;
  torsoFill: string;
  label: string;
}

const FIGHTER_PALETTES: ColorPalette[] = [
  { // Fighter 1 – warm
    left:  "rgba(52, 211, 153, 0.85)",   // emerald
    right: "rgba(96, 165, 250, 0.85)",   // blue
    torso: "rgba(250, 204, 21, 0.70)",   // amber
    head:  "rgba(248, 113, 113, 0.80)",  // red
    foot:  "rgba(167, 139, 250, 0.80)",  // violet
    torsoFill: "rgba(250, 204, 21, 0.06)",
    label: "Fighter 1",
  },
  { // Fighter 2 – cool
    left:  "rgba(50, 200, 250, 0.85)",   // cyan
    right: "rgba(200, 100, 255, 0.85)",  // magenta
    torso: "rgba(50, 180, 255, 0.70)",   // teal
    head:  "rgba(255, 180, 50, 0.80)",   // orange
    foot:  "rgba(100, 255, 180, 0.80)",  // lime
    torsoFill: "rgba(50, 180, 255, 0.06)",
    label: "Fighter 2",
  },
];

// Bone connections: [start, end, region_key]
const BONE_DEFS: [number, number, keyof Omit<ColorPalette, "torsoFill" | "label">][] = [
  // Face
  [0,1,"head"],[1,2,"head"],[2,3,"head"],[3,7,"head"],
  [0,4,"head"],[4,5,"head"],[5,6,"head"],[6,8,"head"],
  [9,10,"head"],
  // Torso
  [11,12,"torso"],[11,23,"torso"],[12,24,"torso"],[23,24,"torso"],
  // Left arm
  [11,13,"left"],[13,15,"left"],
  [15,17,"left"],[15,19,"left"],[15,21,"left"],[17,19,"left"],
  // Right arm
  [12,14,"right"],[14,16,"right"],
  [16,18,"right"],[16,20,"right"],[16,22,"right"],[18,20,"right"],
  // Left leg
  [23,25,"left"],[25,27,"left"],
  [27,29,"foot"],[27,31,"foot"],[29,31,"foot"],
  // Right leg
  [24,26,"right"],[26,28,"right"],
  [28,30,"foot"],[28,32,"foot"],[30,32,"foot"],
];

// Joint radius by landmark index — major joints are bigger
const JOINT_RADIUS: Record<number, number> = {
  0: 5,
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2,
  7: 3, 8: 3,
  9: 2, 10: 2,
  11: 6, 12: 6,
  13: 5, 14: 5,
  15: 4, 16: 4,
  17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2,
  23: 6, 24: 6,
  25: 5, 26: 5,
  27: 4, 28: 4,
  29: 3, 30: 3, 31: 3, 32: 3,
};

// Map landmark → region key
function jointRegion(idx: number): keyof Omit<ColorPalette, "torsoFill" | "label"> {
  if (idx <= 10) return "head";
  if ([11,13,15,17,19,21,23,25,27].includes(idx)) return "left";
  if ([12,14,16,18,20,22,24,26,28].includes(idx)) return "right";
  if ([29,30,31,32].includes(idx)) return "foot";
  return "torso";
}

const VIS_THRESHOLD = 0.50;

function drawPersonSkeleton(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  w: number, h: number,
  palette: ColorPalette,
  s: number,
  lineWidth: number,
  showLabel: boolean,
): void {
  const px = (i: number): [number, number] => [lm[i].x * w, lm[i].y * h];
  const vis = (i: number): boolean => (lm[i].visibility ?? 0) > VIS_THRESHOLD;

  // 1. Torso fill
  if (vis(11) && vis(12) && vis(23) && vis(24)) {
    const [lsx, lsy] = px(11); const [rsx, rsy] = px(12);
    const [rhx, rhy] = px(24); const [lhx, lhy] = px(23);
    ctx.beginPath();
    ctx.moveTo(lsx, lsy); ctx.lineTo(rsx, rsy);
    ctx.lineTo(rhx, rhy); ctx.lineTo(lhx, lhy);
    ctx.closePath();
    ctx.fillStyle = palette.torsoFill;
    ctx.fill();
  }

  // 2. Limb connections
  for (const [si, ei, region] of BONE_DEFS) {
    if (!vis(si) || !vis(ei)) continue;
    const [x1, y1] = px(si);
    const [x2, y2] = px(ei);
    const col = palette[region];
    // Glow
    ctx.strokeStyle = col.replace(/[\d.]+\)$/, "0.15)");
    ctx.lineWidth = lineWidth + 4 * s;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // Main
    ctx.strokeStyle = col;
    ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  // 3. Joint dots
  for (let i = 0; i < lm.length; i++) {
    if (!vis(i)) continue;
    const [x, y] = px(i);
    const r = (JOINT_RADIUS[i] ?? 3) * s;
    const col = palette[jointRegion(i)];
    // Glow
    ctx.beginPath(); ctx.arc(x, y, r + 2 * s, 0, Math.PI * 2);
    ctx.fillStyle = col.replace(/[\d.]+\)$/, "0.18)");
    ctx.fill();
    // Solid
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    // White highlight on major joints
    if (r >= 4 * s) {
      ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
    }
  }

  // 4. Spine dashed line
  if (vis(11) && vis(12) && vis(23) && vis(24)) {
    const [lsx, lsy] = px(11); const [rsx, rsy] = px(12);
    const [lhx, lhy] = px(23); const [rhx, rhy] = px(24);
    const mx1 = (lsx + rsx) / 2, my1 = (lsy + rsy) / 2;
    const mx2 = (lhx + rhx) / 2, my2 = (lhy + rhy) / 2;
    ctx.strokeStyle = palette.torso;
    ctx.lineWidth = 2 * s;
    ctx.setLineDash([4 * s, 4 * s]);
    ctx.beginPath(); ctx.moveTo(mx1, my1); ctx.lineTo(mx2, my2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // 5. Fighter label above head
  if (showLabel && vis(0)) {
    const [nx, ny] = px(0);
    ctx.font = `bold ${Math.round(11 * s)}px -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = palette.head;
    ctx.fillText(palette.label, nx, ny - 16 * s);
  }
}

export function drawSkeleton(
  canvas: HTMLCanvasElement,
  frame: PoseFrame,
  options?: {
    lineColor?: string;
    pointColor?: string;
    lineWidth?: number;
    pointRadius?: number;
    scale?: number;
  }
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const s = options?.scale ?? 1;
  const lineW = (options?.lineWidth ?? 3) * s;

  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const persons = frame.persons && frame.persons.length > 0
    ? frame.persons
    : [{ personId: 0, landmarks: frame.landmarks, worldLandmarks: frame.worldLandmarks }];

  const showLabels = persons.length > 1;

  for (const person of persons) {
    const palette = FIGHTER_PALETTES[person.personId % FIGHTER_PALETTES.length];
    drawPersonSkeleton(ctx, person.landmarks, w, h, palette, s, lineW, showLabels);
  }
}

export const LANDMARK_NAMES: Record<number, string> = {
  0: "nose",
  1: "left_eye_inner",
  2: "left_eye",
  3: "left_eye_outer",
  4: "right_eye_inner",
  5: "right_eye",
  6: "right_eye_outer",
  7: "left_ear",
  8: "right_ear",
  9: "mouth_left",
  10: "mouth_right",
  11: "left_shoulder",
  12: "right_shoulder",
  13: "left_elbow",
  14: "right_elbow",
  15: "left_wrist",
  16: "right_wrist",
  17: "left_pinky",
  18: "right_pinky",
  19: "left_index",
  20: "right_index",
  21: "left_thumb",
  22: "right_thumb",
  23: "left_hip",
  24: "right_hip",
  25: "left_knee",
  26: "right_knee",
  27: "left_ankle",
  28: "right_ankle",
  29: "left_heel",
  30: "right_heel",
  31: "left_foot_index",
  32: "right_foot_index",
};

export function exportFramesAsJSON(frames: PoseFrame[]): string {
  const roundLm = (l: NormalizedLandmark) => ({
    x: Math.round(l.x * 10000) / 10000,
    y: Math.round(l.y * 10000) / 10000,
    z: Math.round(l.z * 10000) / 10000,
    visibility: Math.round((l.visibility || 0) * 1000) / 1000,
  });

  return JSON.stringify(
    {
      version: "2.0",
      model: "mediapipe_pose_landmarker_full",
      numPoses: 2,
      landmarkNames: LANDMARK_NAMES,
      frameCount: frames.length,
      frames: frames.map((f) => ({
        timestamp: f.timestamp,
        persons: (f.persons || []).map((p) => ({
          personId: p.personId,
          landmarks: p.landmarks.map(roundLm),
          worldLandmarks: p.worldLandmarks.map(roundLm),
        })),
        landmarks: f.landmarks.map(roundLm),
        worldLandmarks: f.worldLandmarks.map(roundLm),
      })),
    },
    null,
    2
  );
}
