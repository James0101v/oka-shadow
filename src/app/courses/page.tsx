"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Clock,
  Filter,
  ChevronLeft,
  BookOpen,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api, CourseVideo } from "@/lib/api-client";
import { AppShell } from "@/components/layout/app-shell";
import { formatDuration } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "fundamentals", label: "Fundamentals" },
  { value: "offense", label: "Offense" },
  { value: "defense", label: "Defense" },
  { value: "footwork", label: "Footwork" },
  { value: "combinations", label: "Combos" },
  { value: "clinch", label: "Clinch" },
  { value: "conditioning", label: "Conditioning" },
  { value: "sparring", label: "Sparring" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-emerald-400 bg-emerald-500/10",
  intermediate: "text-amber-400 bg-amber-500/10",
  advanced: "text-red-400 bg-red-500/10",
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState<CourseVideo | null>(
    null
  );

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listCourses(true);
      setCourses(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load courses. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filtered =
    selectedCategory === "all"
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  const grouped = filtered.reduce(
    (acc, course) => {
      if (!acc[course.category]) acc[course.category] = [];
      acc[course.category].push(course);
      return acc;
    },
    {} as Record<string, CourseVideo[]>
  );

  if (selectedCourse) {
    return (
      <CoursePlayer
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
        allCourses={courses.filter(
          (c) =>
            c.category === selectedCourse.category &&
            c.id !== selectedCourse.id
        )}
        onSelectCourse={setSelectedCourse}
      />
    );
  }

  return (
    <AppShell>
      <div className="px-6 pt-14 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Learn
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Watch training videos to improve your technique
          </p>
        </motion.div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 -mx-6 px-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                selectedCategory === cat.value
                  ? "bg-white text-black"
                  : "bg-white/[0.04] text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={24} className="text-neutral-500 animate-spin" />
            <p className="text-xs text-neutral-600 mt-3">
              Loading courses...
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle size={24} className="text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-500 text-center">{error}</p>
            <button
              onClick={fetchCourses}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-white"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen size={24} className="text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-500">No courses available yet</p>
            <p className="text-xs text-neutral-600 mt-1">
              Check back soon for new training content
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          Object.entries(grouped).map(([category, items], gi) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.08 }}
              className="mb-8"
            >
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3 capitalize">
                {category}
              </h2>
              <div className="space-y-3">
                {items
                  .sort((a, b) => a.order - b.order)
                  .map((course, i) => (
                    <motion.button
                      key={course.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: gi * 0.08 + i * 0.04 }}
                      onClick={() => setSelectedCourse(course)}
                      className="w-full flex gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors text-left"
                    >
                      <div className="relative w-28 h-20 rounded-xl bg-neutral-900 overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={api.getCourseThumbnailUrl(course.id)}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Play
                              size={14}
                              className="text-white ml-0.5"
                              fill="currentColor"
                            />
                          </div>
                        </div>
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
                          {formatDuration(Math.round(course.duration_seconds))}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-sm font-medium text-white truncate">
                          {course.title}
                        </p>
                        {course.description && (
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                            {course.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md capitalize ${
                              DIFFICULTY_COLORS[course.difficulty] ||
                              "text-neutral-400 bg-white/5"
                            }`}
                          >
                            {course.difficulty}
                          </span>
                          {course.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-neutral-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  ))}
              </div>
            </motion.div>
          ))}
      </div>
    </AppShell>
  );
}

function CoursePlayer({
  course,
  onBack,
  allCourses,
  onSelectCourse,
}: {
  course: CourseVideo;
  onBack: () => void;
  allCourses: CourseVideo[];
  onSelectCourse: (c: CourseVideo) => void;
}) {
  const streamUrl = api.getCourseStreamUrl(course.id);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative w-full aspect-video bg-black flex-shrink-0">
        <video
          src={streamUrl}
          controls
          autoPlay
          playsInline
          className="w-full h-full object-contain"
          poster={api.getCourseThumbnailUrl(course.id)}
        />

        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="px-6 py-5">
          <h1 className="text-lg font-bold text-white tracking-tight">
            {course.title}
          </h1>

          <div className="flex items-center gap-3 mt-2">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md capitalize ${
                DIFFICULTY_COLORS[course.difficulty] ||
                "text-neutral-400 bg-white/5"
              }`}
            >
              {course.difficulty}
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider capitalize">
              {course.category}
            </span>
            <div className="flex items-center gap-1 text-neutral-500">
              <Clock size={10} />
              <span className="text-[10px]">
                {formatDuration(Math.round(course.duration_seconds))}
              </span>
            </div>
          </div>

          {course.description && (
            <p className="text-sm text-neutral-400 mt-4 leading-relaxed">
              {course.description}
            </p>
          )}

          {course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {course.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-neutral-500 bg-white/[0.04] px-2.5 py-1 rounded-lg"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {allCourses.length > 0 && (
          <div className="px-6 pb-8">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
              More in {course.category}
            </h2>
            <div className="space-y-2">
              {allCourses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCourse(c)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors text-left"
                >
                  <div className="w-16 h-10 rounded-lg bg-neutral-900 overflow-hidden flex-shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={api.getCourseThumbnailUrl(c.id)}
                      alt={c.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play
                        size={10}
                        className="text-white/70"
                        fill="currentColor"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {c.title}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {formatDuration(Math.round(c.duration_seconds))}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
