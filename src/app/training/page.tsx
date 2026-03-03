"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Film,
  Tag,
  Trash2,
  RefreshCw,
  ChevronRight,
  Database,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
} from "lucide-react";
import { api, VideoMeta, TrainingStats } from "@/lib/api-client";
import { AppShell } from "@/components/layout/app-shell";

type Tab = "upload" | "videos" | "stats";

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");

  return (
    <AppShell>
      <div className="px-6 pt-14 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Training Data
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Upload videos and label techniques for model training
          </p>
        </motion.div>

        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.04] mb-6">
          {(["upload", "videos", "stats"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? "bg-white/[0.08] text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <UploadPanel />
            </motion.div>
          )}
          {activeTab === "videos" && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <VideosPanel />
            </motion.div>
          )}
          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <StatsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

function UploadPanel() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<VideoMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await api.uploadVideo(file);
      setUploadResult(result as unknown as VideoMeta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
          isDragOver
            ? "border-white/30 bg-white/[0.04]"
            : "border-white/[0.08] bg-white/[0.02]"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-neutral-400 animate-spin" />
            <p className="text-sm text-neutral-400">
              Uploading and queuing extraction...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload
              size={32}
              className={isDragOver ? "text-white" : "text-neutral-500"}
            />
            <div>
              <p className="text-sm text-neutral-300">
                Drop a video file here or click to browse
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                MP4, MOV, AVI, MKV, WebM supported
              </p>
            </div>
            <label className="mt-2 px-4 py-2 rounded-xl bg-white/[0.06] text-xs font-medium text-white hover:bg-white/[0.1] transition-colors cursor-pointer">
              Select File
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </motion.div>
      )}

      {uploadResult && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <p className="text-sm text-emerald-300 font-medium">
              Video uploaded successfully
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-neutral-500">ID: </span>
              <span className="text-neutral-300 font-mono">
                {uploadResult.video_id}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">File: </span>
              <span className="text-neutral-300">{uploadResult.filename}</span>
            </div>
            <div>
              <span className="text-neutral-500">Duration: </span>
              <span className="text-neutral-300">
                {uploadResult.duration_seconds.toFixed(1)}s
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Frames: </span>
              <span className="text-neutral-300">
                {uploadResult.frame_count}
              </span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Pose extraction queued. Check the Videos tab for progress.
          </p>
        </motion.div>
      )}

      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
          Upload Tips
        </h3>
        <ul className="space-y-2">
          {[
            "Film full body — head to feet visible throughout",
            "Use a stable camera position (tripod recommended)",
            "Good lighting with minimal shadows on the body",
            "One person per video for clean extraction",
            "30-60 second clips work best for labeling",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-neutral-600 mt-1.5 flex-shrink-0" />
              <span className="text-xs text-neutral-500">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VideosPanel() {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listVideos();
      setVideos(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to backend. Is the server running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleDelete = async (videoId: string) => {
    try {
      await api.deleteVideo(videoId);
      setVideos((prev) => prev.filter((v) => v.video_id !== videoId));
      if (selectedVideo === videoId) setSelectedVideo(null);
    } catch {
      // Silently handle
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="text-neutral-500 animate-spin" />
        <p className="text-xs text-neutral-600 mt-3">Loading videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle size={24} className="text-neutral-600 mb-3" />
        <p className="text-sm text-neutral-500 text-center">{error}</p>
        <button
          onClick={fetchVideos}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white hover:bg-white/[0.1] transition-colors"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Film size={24} className="text-neutral-600 mb-3" />
        <p className="text-sm text-neutral-500">No videos uploaded yet</p>
        <p className="text-xs text-neutral-600 mt-1">
          Upload a video in the Upload tab to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral-500">
          {videos.length} video{videos.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={fetchVideos}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <RefreshCw size={10} />
          Refresh
        </button>
      </div>

      {videos.map((video, i) => (
        <motion.div
          key={video.video_id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <VideoCard
            video={video}
            isSelected={selectedVideo === video.video_id}
            onSelect={() =>
              setSelectedVideo(
                selectedVideo === video.video_id ? null : video.video_id
              )
            }
            onDelete={() => handleDelete(video.video_id)}
          />

          <AnimatePresence>
            {selectedVideo === video.video_id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <LabelingPanel video={video} onRefresh={fetchVideos} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

function VideoCard({
  video,
  isSelected,
  onSelect,
  onDelete,
}: {
  video: VideoMeta;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const statusConfig = {
    pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    processing: {
      icon: Loader2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    completed: {
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    failed: {
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
  };

  const cfg = statusConfig[video.status];
  const StatusIcon = cfg.icon;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${
        isSelected
          ? "bg-white/[0.06] border-white/[0.08]"
          : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}
      >
        <StatusIcon
          size={16}
          className={`${cfg.color} ${
            video.status === "processing" ? "animate-spin" : ""
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">
          {video.filename}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {video.duration_seconds.toFixed(1)}s &middot; {video.frame_count}{" "}
          frames &middot; {video.pose_frames_count} poses &middot;{" "}
          {video.labels_count} labels
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={14} className="text-neutral-600 hover:text-red-400" />
        </button>
        <ChevronRight
          size={14}
          className={`text-neutral-600 transition-transform ${
            isSelected ? "rotate-90" : ""
          }`}
        />
      </div>
    </button>
  );
}

const STRIKE_TYPES = [
  { value: "jab", label: "Jab" },
  { value: "cross", label: "Cross" },
  { value: "hook", label: "Hook" },
  { value: "rear-roundhouse", label: "Rear Roundhouse" },
  { value: "unknown", label: "Unknown" },
];

function LabelingPanel({
  video,
  onRefresh,
}: {
  video: VideoMeta;
  onRefresh: () => void;
}) {
  const [labels, setLabels] = useState<
    { id: string; start_frame: number; end_frame: number; strike_type: string; notes: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [startFrame, setStartFrame] = useState(0);
  const [endFrame, setEndFrame] = useState(30);
  const [strikeType, setStrikeType] = useState("jab");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    loadLabels();
  }, [video.video_id]);

  const loadLabels = async () => {
    setLoading(true);
    try {
      const data = await api.getLabels(video.video_id);
      setLabels(data);
    } catch {
      // Backend may not be running
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    setSaving(true);
    try {
      await api.createLabel(video.video_id, {
        start_frame: startFrame,
        end_frame: endFrame,
        strike_type: strikeType,
        notes: notes || undefined,
      });
      await loadLabels();
      onRefresh();
      setNotes("");
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    try {
      await api.deleteLabel(video.video_id, labelId);
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      onRefresh();
    } catch {
      // Handle error
    }
  };

  const frameUrl = api.getFrameUrl(video.video_id, currentFrame, true);

  return (
    <div className="mt-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4">
      {video.status === "completed" && (
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest mb-2">
            Frame Preview
          </p>
          <div className="relative aspect-video rounded-xl bg-black overflow-hidden mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frameUrl}
              alt={`Frame ${currentFrame}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-[10px] text-white font-mono">
              Frame {currentFrame} / {video.frame_count}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={video.frame_count - 1}
            value={currentFrame}
            onChange={(e) => setCurrentFrame(Number(e.target.value))}
            className="w-full h-1 rounded-full bg-white/10 accent-white"
          />
        </div>
      )}

      <div>
        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-2">
          Add Label
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-neutral-600 block mb-1">
              Start Frame
            </label>
            <input
              type="number"
              min={0}
              max={video.frame_count - 1}
              value={startFrame}
              onChange={(e) => setStartFrame(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-600 block mb-1">
              End Frame
            </label>
            <input
              type="number"
              min={0}
              max={video.frame_count - 1}
              value={endFrame}
              onChange={(e) => setEndFrame(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white"
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="text-[10px] text-neutral-600 block mb-1">
            Strike Type
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STRIKE_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() => setStrikeType(st.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  strikeType === st.value
                    ? "bg-white/[0.12] text-white"
                    : "bg-white/[0.04] text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <label className="text-[10px] text-neutral-600 block mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., clean technique, slight guard drop"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-neutral-700"
          />
        </div>
        <button
          onClick={handleCreateLabel}
          disabled={saving || startFrame >= endFrame}
          className="mt-3 w-full py-2.5 rounded-xl bg-white/[0.08] text-xs font-medium text-white hover:bg-white/[0.12] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Tag size={12} />
          )}
          {saving ? "Saving..." : "Add Label"}
        </button>
      </div>

      <div>
        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-2">
          Labels ({labels.length})
        </p>
        {loading ? (
          <p className="text-xs text-neutral-600">Loading labels...</p>
        ) : labels.length === 0 ? (
          <p className="text-xs text-neutral-600">
            No labels yet. Use the frame scrubber above to find techniques and
            label them.
          </p>
        ) : (
          <div className="space-y-1.5">
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">
                    {STRIKE_TYPES.find((s) => s.value === label.strike_type)
                      ?.label || label.strike_type}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Frames {label.start_frame}-{label.end_frame}
                    {label.notes && ` | ${label.notes}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCurrentFrame(label.start_frame);
                    setStartFrame(label.start_frame);
                    setEndFrame(label.end_frame);
                  }}
                  className="text-[10px] text-neutral-500 hover:text-white transition-colors"
                >
                  Go to
                </button>
                <button
                  onClick={() => handleDeleteLabel(label.id)}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10"
                >
                  <Trash2 size={10} className="text-neutral-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsPanel() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect. Is the backend running?"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.getTrainingData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `training-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Handle error
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Database size={24} className="text-neutral-600 mb-3" />
        <p className="text-sm text-neutral-500 text-center">
          {error || "No stats available"}
        </p>
        <button
          onClick={loadStats}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Videos" value={stats.total_videos} />
        <StatCard label="Pose Frames" value={stats.total_pose_frames} />
        <StatCard label="Total Labels" value={stats.total_labels} />
        <StatCard label="Completed" value={stats.videos_completed} />
      </div>

      {stats.total_labels > 0 && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
            Labels by Type
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.labels_by_type).map(([type, count]) => {
              const maxCount = Math.max(
                ...Object.values(stats.labels_by_type)
              );
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400 w-28 capitalize">
                    {type.replace("-", " ")}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-white/30"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-neutral-500 font-mono w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.total_labels > 0 && (
        <button
          onClick={handleExport}
          className="w-full py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white font-medium text-sm hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-2"
        >
          <Download size={16} />
          Export Training Data (JSON)
        </button>
      )}

      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-2">
          Pipeline Status
        </h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Processing</span>
            <span className="text-blue-400">{stats.videos_processing}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Pending</span>
            <span className="text-amber-400">{stats.videos_pending}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Completed</span>
            <span className="text-emerald-400">{stats.videos_completed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}
