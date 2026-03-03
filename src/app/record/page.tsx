"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Video, Square, Download, Cpu, RefreshCw, AlertCircle, FlipHorizontal2, ZoomIn } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { createNewSession, simulateAnalysis } from "@/lib/mock-data";
import { formatDuration } from "@/lib/utils";
import {
  initPoseLandmarker,
  destroyPoseLandmarker,
  detectPose,
  drawSkeleton,
  exportFramesAsJSON,
  isMobileDevice,
  isLiDARAvailable,
  startLiDARSession,
  PoseFrame,
} from "@/lib/pose-detection";
import { apiV2, isAuthenticated, getToken } from "@/lib/api-v2";
import { storeFrames } from "@/lib/frame-store";
import { LiveSession, StrikeFeedback, ErrorFeedback } from "@/lib/ws-session";

type Phase = "setup" | "loading-model" | "countdown" | "recording";

const MAX_DURATION = 60;
const POSE_DETECT_INTERVAL_MS = 33;
const BODY_DETECT_THROTTLE_MS = 500;  // Only update bodyDetected state every 500ms
const FRAME_COUNT_THROTTLE = 15;      // Only update frameCount every N frames

export default function RecordPage() {
  const router = useRouter();
  const { addSession, setCurrentSessionId } = useAppStore();
  const [phase, setPhase] = useState<Phase>("setup");
  const [bodyDetected, setBodyDetected] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [cameraErrorMsg, setCameraErrorMsg] = useState("");
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [poseStatus, setPoseStatus] = useState<string>("Initializing camera...");
  const [frameCount, setFrameCount] = useState(0);
  const [roundFocus, setRoundFocus] = useState<string | null>(null);
  const [showStartAnyway, setShowStartAnyway] = useState(false);
  // Live WebSocket feedback
  const [liveFeedback, setLiveFeedback] = useState<string | null>(null);
  const [feedbackSeverity, setFeedbackSeverity] = useState<"good" | "minor" | "opening">("good");
  const liveFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wsSessionRef = useRef<LiveSession | null>(null);
  const [lidarActive, setLidarActive] = useState(false);
  const [lidarAvailable, setLidarAvailable] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    isMobileDevice() ? "environment" : "user"
  );
  // Available rear camera device IDs (wide / ultrawide / telephoto)
  const [rearDevices, setRearDevices] = useState<MediaDeviceInfo[]>([]);
  const [rearDeviceIdx, setRearDeviceIdx] = useState(0);
  const isSwitchingCameraRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const poseLoopRef = useRef<number | null>(null);
  const capturedFramesRef = useRef<PoseFrame[]>([]);
  const isRecordingRef = useRef(false);
  const isFinishingRef = useRef(false);  // Guard against double finishRound calls
  const lastDetectTimeRef = useRef(0);
  const lastBodyDetectUpdateRef = useRef(0);  // Throttle bodyDetected state updates
  // Function refs to avoid stale closure issues with useCallback([])
  const loadPoseModelRef = useRef<() => void>(() => {});
  const startPoseLoopRef = useRef<() => void>(() => {});
  const connectWsSessionRef = useRef<() => void>(() => {});
  const isRecordingWsRef = useRef(false);

  // Core camera starter — accepts explicit video constraints or falls back to facingMode
  const startCameraWithConstraints = useCallback(async (
    videoConstraints: MediaTrackConstraints | true,
    isSwitch = false,
  ) => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(true);
      setCameraErrorMsg("Camera API not available. Use Chrome or Firefox over HTTPS.");
      setPoseStatus("Camera unavailable.");
      if (!isSwitch) loadPoseModelRef.current();
      return;
    }

    // Stop existing stream tracks before opening a new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    let stream: MediaStream | null = null;
    let lastError: unknown = null;
    const attempts: (MediaTrackConstraints | true)[] = [
      videoConstraints,
      true, // bare minimum fallback
    ];

    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
        break;
      } catch (err) {
        lastError = err;
        console.warn("Camera attempt failed:", constraints, err);
      }
    }

    if (!stream) {
      const err = lastError as DOMException | null;
      let msg = "Camera unavailable.";
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        msg = "Camera permission denied — allow camera access in browser settings.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        msg = "No camera found on this device.";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        msg = "Camera is in use by another app — close other apps and try again.";
      } else if (err?.name === "OverconstrainedError") {
        msg = "Camera doesn't support the required settings.";
      } else if (err?.message) {
        msg = err.message;
      }
      if (!isSwitch) {
        setCameraError(true);
        setCameraErrorMsg(msg);
        setPoseStatus("Camera unavailable.");
        loadPoseModelRef.current();
      }
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try { await videoRef.current.play(); } catch {}
    }

    if (!isSwitch) {
      setPoseStatus("Camera ready. Loading pose model...");
      loadPoseModelRef.current();
      // Attempt LiDAR depth session (iPhone 12 Pro+ / iPad Pro only)
      if (isLiDARAvailable()) {
        setLidarAvailable(true);
        startLiDARSession().then((started) => {
          setLidarActive(started);
          if (started) console.log("[LiDAR] Depth sensing active — Z accuracy improved");
        });
      }
    }
  }, []);

  // Enumerate rear camera devices (wide / ultrawide / telephoto on iPhone)
  const enumerateRearDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      // On mobile, rear cameras typically have labels containing "back" or no "front"
      // We store all video devices and let the user cycle through them when on rear
      setRearDevices(videoDevices);
    } catch {}
  }, []);

  const startCamera = useCallback(async () => {
    setPoseStatus("Requesting camera access...");
    const mobile = isMobileDevice();
    const primary: MediaTrackConstraints = {
      facingMode: mobile ? "environment" : "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
    await startCameraWithConstraints(primary);
    // After permission granted, enumerate devices for lens switching
    enumerateRearDevices();
  }, [startCameraWithConstraints, enumerateRearDevices]);

  // Flip between front and rear camera
  const switchCamera = useCallback(async () => {
    if (isSwitchingCameraRef.current) return;
    isSwitchingCameraRef.current = true;
    const next: "user" | "environment" = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    setRearDeviceIdx(0); // reset lens index when flipping
    await startCameraWithConstraints(
      { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 } },
      true,
    );
    isSwitchingCameraRef.current = false;
  }, [facingMode, startCameraWithConstraints]);

  // Cycle through rear lenses (wide → ultrawide → telephoto → wide)
  const cycleLens = useCallback(async () => {
    if (isSwitchingCameraRef.current || rearDevices.length < 2) return;
    isSwitchingCameraRef.current = true;
    const nextIdx = (rearDeviceIdx + 1) % rearDevices.length;
    setRearDeviceIdx(nextIdx);
    const deviceId = rearDevices[nextIdx].deviceId;
    await startCameraWithConstraints(
      { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      true,
    );
    isSwitchingCameraRef.current = false;
  }, [rearDeviceIdx, rearDevices, startCameraWithConstraints]);

  const loadPoseModel = useCallback(async () => {
    setPhase("loading-model");
    setPoseStatus("Downloading pose model (~30MB, first time only)...");
    try {
      await initPoseLandmarker();
      setModelLoaded(true);
      setPhase("setup");
      setPoseStatus("Pose model loaded. Step into frame.");
      startPoseLoopRef.current();
    } catch (err) {
      console.error("Failed to load pose model:", err);
      setModelError(true);
      setPhase("setup");
      setPoseStatus("Pose model failed to load. Using fallback mode.");
      setTimeout(() => setBodyDetected(true), 1500);
    }
  }, []);
  loadPoseModelRef.current = loadPoseModel;

  const startPoseLoop = useCallback(() => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        poseLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      // Only resize when dimensions change — assigning canvas.width clears the context every frame
      const vw = video.videoWidth || video.clientWidth;
      const vh = video.videoHeight || video.clientHeight;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      const now = performance.now();
      if (now - lastDetectTimeRef.current >= POSE_DETECT_INTERVAL_MS) {
        lastDetectTimeRef.current = now;

        // Use video timestamp for MediaPipe VIDEO mode — must be monotonically increasing
        const videoTs = video.currentTime * 1000;
        const frame = detectPose(video, videoTs);
        if (frame) {
          // Throttle React state updates — don't re-render on every detected frame
          if (now - lastBodyDetectUpdateRef.current >= BODY_DETECT_THROTTLE_MS) {
            lastBodyDetectUpdateRef.current = now;
            setBodyDetected(true);
          }
          drawSkeleton(canvas, frame, {
            lineColor: isRecordingRef.current
              ? "rgba(239, 68, 68, 0.5)"
              : "rgba(52, 211, 153, 0.5)",
            pointColor: isRecordingRef.current
              ? "rgba(239, 68, 68, 0.8)"
              : "rgba(52, 211, 153, 0.8)",
            lineWidth: 2,
            pointRadius: 3,
          });

          if (isRecordingRef.current) {
            capturedFramesRef.current.push(frame);
            // Throttle frameCount updates — only every N frames
            if (capturedFramesRef.current.length % FRAME_COUNT_THROTTLE === 0) {
              setFrameCount(capturedFramesRef.current.length);
            }
            // Stream frame to WebSocket for real-time feedback
            if (isRecordingWsRef.current && wsSessionRef.current?.isConnected) {
              wsSessionRef.current.sendFrame(
                frame.landmarks as unknown as object[],
                frame.timestamp,
              );
            }
          }
        }
      }

      poseLoopRef.current = requestAnimationFrame(loop);
    };

    poseLoopRef.current = requestAnimationFrame(loop);
  }, []);
  startPoseLoopRef.current = startPoseLoop;

  const stopCamera = useCallback(() => {
    if (poseLoopRef.current) {
      cancelAnimationFrame(poseLoopRef.current);
      poseLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    try {
      const f = sessionStorage.getItem("round-focus");
      if (f && f !== "free") setRoundFocus(f);
    } catch {}
    startCamera();
    // Show 'Start anyway' bypass after 8s if pose detection hasn't fired
    const bypassTimer = setTimeout(() => setShowStartAnyway(true), 8000);
    return () => {
      clearTimeout(bypassTimer);
      stopCamera();
      destroyPoseLandmarker();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (phase === "countdown") {
      if (countdown <= 0) {
        setPhase("recording");
        isRecordingRef.current = true;
        capturedFramesRef.current = [];
        setFrameCount(0);
        connectWsSessionRef.current();
        return;
      }
      const timeout = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timeout);
    }
  }, [phase, countdown]);

  useEffect(() => {
    if (phase === "recording") {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_DURATION) {
            // Call outside setState to avoid stale closure issues
            setTimeout(() => finishRound(next), 0);
          }
          return next;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase]);

  const showLiveFeedback = useCallback((text: string, severity: "good" | "minor" | "opening") => {
    setLiveFeedback(text);
    setFeedbackSeverity(severity);
    if (liveFeedbackTimerRef.current) clearTimeout(liveFeedbackTimerRef.current);
    liveFeedbackTimerRef.current = setTimeout(() => setLiveFeedback(null), 1500);
  }, []);

  const startCountdown = () => {
    setPhase("countdown");
    setCountdown(3);
  };

  // Connect WebSocket for live feedback when recording starts
  const connectWsSession = useCallback(async () => {  // eslint-disable-line
    if (!isAuthenticated()) return;
    const token = getToken();
    if (!token) return;
    const session = new LiveSession({
      onStrike: (ev: StrikeFeedback) => {
        const labels: Record<string, string> = {
          jab: "Jab", cross: "Cross", hook: "Hook",
          uppercut: "Uppercut", "rear-roundhouse": "Kick",
        };
        showLiveFeedback(labels[ev.type] ?? ev.type, ev.severity);
      },
      onError: (ev: ErrorFeedback) => {
        showLiveFeedback(ev.message, "opening");
      },
      onConnectionError: (msg) => console.warn("[WS]", msg),
    });
    try {
      await session.connect(token);
      wsSessionRef.current = session;
      isRecordingWsRef.current = true;
    } catch {
      // WS failed — recording continues without live feedback
    }
  }, [showLiveFeedback]);
  connectWsSessionRef.current = connectWsSession;

  const finishRound = async (duration: number) => {
    if (isFinishingRef.current) return;  // Guard against double-calls from setInterval
    isFinishingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    isRecordingRef.current = false;
    isRecordingWsRef.current = false;
    if (wsSessionRef.current) {
      wsSessionRef.current.endSession(duration);
      wsSessionRef.current.disconnect();
      wsSessionRef.current = null;
    }

    const frames = [...capturedFramesRef.current];
    const poseDataJson = exportFramesAsJSON(frames);

    stopCamera();
    destroyPoseLandmarker();

    const session = createNewSession();
    session.durationSeconds = duration;
    const analyzed = simulateAnalysis(session);
    addSession(analyzed);
    setCurrentSessionId(analyzed.id);

    // Submit to v2 API if authenticated (RPG stats, XP, quests)
    if (isAuthenticated() && frames.length > 0) {
      try {
        const result = await apiV2.submitRound({
          frames: frames as unknown as unknown[],
          fps: 30,
          duration_seconds: duration,
        });
        // Store the v2 result keyed by LOCAL session ID so results page can find it
        try {
          sessionStorage.setItem(
            `v2-round-${analyzed.id}`,
            JSON.stringify(result)
          );
        } catch {}
      } catch (err) {
        console.warn("Failed to submit round to v2 API:", err);
      }
    }

    // Store frames in-memory (no size limit, survives client-side navigation)
    storeFrames(analyzed.id, frames);

    // Also attempt sessionStorage as a best-effort backup (may fail for large rounds)
    try {
      sessionStorage.setItem(`pose-data-${analyzed.id}`, poseDataJson);
    } catch {
      // Quota exceeded — in-memory store is the primary path
    }

    router.push(`/processing/${analyzed.id}`);
  };

  const handleStop = () => {
    finishRound(elapsed);
  };

  const handleBack = () => {
    isRecordingRef.current = false;
    stopCamera();
    destroyPoseLandmarker();
    router.back();
  };

  const handleExportData = () => {
    const json = exportFramesAsJSON(capturedFramesRef.current);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pose-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        {/* Video element always mounted so ref is valid — hidden when camera fails */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${cameraError ? "hidden" : ""}`}
        />

        {cameraError && (
          <div className="absolute inset-0 bg-neutral-950 flex items-center justify-center">
            <div className="text-center px-8 max-w-xs">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-red-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-2">Camera Error</p>
              <p className="text-xs text-neutral-400 leading-relaxed mb-5">
                {cameraErrorMsg || "Camera access unavailable."}
              </p>
              <button
                onClick={() => {
                  setCameraError(false);
                  setCameraErrorMsg("");
                  startCamera();
                }}
                className="flex items-center gap-2 mx-auto px-4 py-2.5 rounded-xl bg-white/[0.06] text-sm text-white hover:bg-white/[0.1] transition-colors"
              >
                <RefreshCw size={14} />
                Retry Camera
              </button>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>

          <div className="flex items-center gap-2">
            {phase === "recording" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono text-white tracking-wider">
                  {formatDuration(elapsed)} / {formatDuration(MAX_DURATION)}
                </span>
              </motion.div>
            )}

            {modelLoaded && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm">
                <Cpu size={12} className="text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">POSE</span>
              </div>
            )}

            {/* LiDAR badge */}
            {lidarActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] text-cyan-400 font-medium">LiDAR</span>
              </motion.div>
            )}

            {/* Lens cycle button — only when on rear camera with multiple lenses */}
            {facingMode === "environment" && rearDevices.length > 1 && (
              <button
                onClick={cycleLens}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-0.5"
                title={`Lens ${rearDeviceIdx + 1} of ${rearDevices.length}`}
              >
                <ZoomIn size={14} className="text-white" />
                <span className="text-[8px] text-white/60 font-mono leading-none">
                  {rearDeviceIdx + 1}/{rearDevices.length}
                </span>
              </button>
            )}

            {/* Flip camera button — always shown when not in error state */}
            {!cameraError && (
              <button
                onClick={switchCamera}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                title={facingMode === "user" ? "Switch to rear camera" : "Switch to front camera"}
              >
                <FlipHorizontal2 size={18} className="text-white" />
              </button>
            )}
          </div>
        </div>

        {phase === "recording" && frameCount > 0 && (
          <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
            <span className="text-[10px] text-neutral-400 font-mono">
              {frameCount} frames
            </span>
          </div>
        )}

        {/* Live WebSocket feedback overlay */}
        <AnimatePresence>
          {liveFeedback && (
            <motion.div
              key={liveFeedback + feedbackSeverity}
              initial={{ opacity: 0, y: -12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-20 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-2xl backdrop-blur-sm font-semibold text-base tracking-tight pointer-events-none ${
                feedbackSeverity === "good"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : feedbackSeverity === "minor"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              {liveFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Focus goal reminder during recording */}
        {phase === "recording" && roundFocus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm flex items-center gap-1.5"
          >
            <span className="text-[10px] text-white/60">Focus:</span>
            <span className="text-[10px] text-white font-medium capitalize">{roundFocus.replace(/-/g, " ")}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {phase === "loading-model" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20"
            >
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-sm text-white font-medium">Loading pose model</p>
              <p className="text-xs text-neutral-400 mt-1">First load ~30MB — cached after</p>
            </motion.div>
          )}

          {(phase === "setup") && !bodyDetected && (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <FramingGuide detected={bodyDetected} />
            </motion.div>
          )}

          {phase === "countdown" && countdown > 0 && (
            <motion.div
              key={`countdown-${countdown}`}
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-8xl font-bold text-white drop-shadow-2xl">
                {countdown}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 px-6 pb-12 pt-6">
        {(phase === "setup" || phase === "loading-model") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <p className="text-sm text-neutral-400">{poseStatus}</p>
              {modelError && (
                <p className="text-xs text-amber-500 mt-1">
                  Fallback mode: skeleton overlay unavailable
                </p>
              )}
            </div>
            <button
              onClick={startCountdown}
              disabled={!bodyDetected && !showStartAnyway}
              className={`w-full py-4 rounded-2xl font-semibold text-base tracking-tight transition-all ${
                bodyDetected || showStartAnyway
                  ? "bg-white text-black hover:bg-neutral-100"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              {bodyDetected ? "Start Round" : showStartAnyway ? "Start anyway" : "Waiting for pose detection..."}
            </button>
          </motion.div>
        )}

        {phase === "recording" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-6"
          >
            {frameCount > 0 && (
              <button
                onClick={handleExportData}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Export pose data"
              >
                <Download size={18} className="text-white" />
              </button>
            )}
            <button
              onClick={handleStop}
              className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center hover:bg-red-500/30 transition-colors"
            >
              <Square size={24} className="text-red-500" fill="currentColor" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FramingGuide({ detected }: { detected: boolean }) {
  return (
    <div className="relative w-48 h-80">
      <motion.div
        className={`absolute inset-0 rounded-3xl border-2 border-dashed transition-colors duration-700 ${
          detected ? "border-emerald-400/60" : "border-white/20"
        }`}
        animate={
          detected
            ? { borderColor: "rgba(52, 211, 153, 0.6)" }
            : { borderColor: "rgba(255, 255, 255, 0.2)" }
        }
      />

      <svg
        viewBox="0 0 100 180"
        className={`absolute inset-0 w-full h-full transition-colors duration-700 ${
          detected ? "text-emerald-400/40" : "text-white/10"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="50" cy="25" r="10" />
        <line x1="50" y1="35" x2="50" y2="90" />
        <line x1="50" y1="50" x2="25" y2="70" />
        <line x1="50" y1="50" x2="75" y2="70" />
        <line x1="50" y1="90" x2="30" y2="140" />
        <line x1="50" y1="90" x2="70" y2="140" />
      </svg>

      {detected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -bottom-8 left-0 right-0 text-center"
        >
          <span className="text-xs text-emerald-400 font-medium">
            Body detected
          </span>
        </motion.div>
      )}
    </div>
  );
}
