const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface VideoMeta {
  video_id: string;
  filename: string;
  duration_seconds: number;
  frame_count: number;
  fps: number;
  width: number;
  height: number;
  upload_time: string;
  status: "pending" | "processing" | "completed" | "failed";
  pose_frames_count: number;
  labels_count: number;
}

export interface VideoLabel {
  id: string;
  video_id: string;
  start_frame: number;
  end_frame: number;
  strike_type: string;
  notes: string | null;
  created_at: string;
}

export interface TrainingStats {
  total_videos: number;
  total_pose_frames: number;
  total_labels: number;
  videos_completed: number;
  videos_processing: number;
  videos_pending: number;
  labels_by_type: Record<string, number>;
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  async uploadVideo(file: File): Promise<VideoMeta> {
    const form = new FormData();
    form.append("file", file);
    return request("/api/videos/upload", {
      method: "POST",
      body: form,
    });
  },

  async listVideos(): Promise<VideoMeta[]> {
    return request("/api/videos");
  },

  async getVideo(videoId: string): Promise<VideoMeta> {
    return request(`/api/videos/${videoId}`);
  },

  async deleteVideo(videoId: string): Promise<void> {
    await request(`/api/videos/${videoId}`, { method: "DELETE" });
  },

  async triggerExtraction(videoId: string): Promise<void> {
    await request(`/api/videos/${videoId}/extract`, { method: "POST" });
  },

  async getPoses(
    videoId: string,
    offset = 0,
    limit = 100
  ): Promise<{ total_frames: number; frames: unknown[] }> {
    return request(
      `/api/videos/${videoId}/poses?offset=${offset}&limit=${limit}`
    );
  },

  getFrameUrl(videoId: string, frameIndex: number, pose = true): string {
    return `${API_BASE}/api/videos/${videoId}/frame/${frameIndex}?pose=${pose}`;
  },

  async getLabels(videoId: string): Promise<VideoLabel[]> {
    return request(`/api/videos/${videoId}/labels`);
  },

  async createLabel(
    videoId: string,
    data: {
      start_frame: number;
      end_frame: number;
      strike_type: string;
      notes?: string;
    }
  ): Promise<VideoLabel> {
    return request(`/api/videos/${videoId}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async updateLabel(
    videoId: string,
    labelId: string,
    data: Partial<{
      start_frame: number;
      end_frame: number;
      strike_type: string;
      notes: string;
    }>
  ): Promise<VideoLabel> {
    return request(`/api/videos/${videoId}/labels/${labelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async deleteLabel(videoId: string, labelId: string): Promise<void> {
    await request(`/api/videos/${videoId}/labels/${labelId}`, {
      method: "DELETE",
    });
  },

  async getStats(): Promise<TrainingStats> {
    return request("/api/stats");
  },

  async getTrainingData(): Promise<{
    total_samples: number;
    samples: unknown[];
  }> {
    return request("/api/export/training-data");
  },

  // --- Course Videos ---

  async listCourses(publishedOnly = false): Promise<CourseVideo[]> {
    return request(`/api/courses?published_only=${publishedOnly}`);
  },

  async getCourse(courseId: string): Promise<CourseVideo> {
    return request(`/api/courses/${courseId}`);
  },

  getCourseStreamUrl(courseId: string): string {
    return `${API_BASE}/api/courses/${courseId}/stream`;
  },

  getCourseThumbnailUrl(courseId: string): string {
    return `${API_BASE}/api/courses/${courseId}/thumbnail`;
  },
};

export interface CourseVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  filename: string;
  duration_seconds: number;
  thumbnail_time: number;
  order: number;
  tags: string[];
  created_at: string;
  published: boolean;
}
