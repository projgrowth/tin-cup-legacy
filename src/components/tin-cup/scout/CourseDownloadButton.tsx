import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CourseId } from "@/lib/courses";
import {
  downloadOfflineCourse,
  getOfflineCourseState,
  removeOfflineCourse,
  type OfflineCourseState,
} from "@/lib/offline-course";

export function CourseDownloadButton({ courseId }: { courseId: CourseId }) {
  const [status, setStatus] = useState<OfflineCourseState>(() => getOfflineCourseState(courseId));
  useEffect(() => {
    setStatus(getOfflineCourseState(courseId));
    const update = () => setStatus(getOfflineCourseState(courseId));
    window.addEventListener("tin-cup-course-cache", update);
    return () => window.removeEventListener("tin-cup-course-cache", update);
  }, [courseId]);
  const ready = status === "ready";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={status === "downloading"}
        onClick={async () => {
          setStatus("downloading");
          const next = await downloadOfflineCourse(courseId);
          setStatus(next);
          next === "ready"
            ? toast.success("Course ready offline")
            : toast.error("Course download failed");
        }}
        className="press btn-quiet t-micro inline-flex min-h-11 flex-1 items-center justify-center gap-2"
      >
        {status === "downloading" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : ready ? (
          <CheckCircle2 className="size-4 text-[var(--status-live)]" />
        ) : status === "update-available" ? (
          <RefreshCw className="size-4" />
        ) : (
          <Download className="size-4" />
        )}
        {status === "downloading"
          ? "Downloading…"
          : ready
            ? "Ready offline"
            : status === "update-available"
              ? "Update offline course"
              : status === "failed"
                ? "Retry download"
                : "Download for offline"}
      </button>
      {ready && (
        <button
          type="button"
          aria-label="Remove offline course"
          onClick={async () => {
            await removeOfflineCourse(courseId);
            setStatus("not-downloaded");
            toast.message("Offline course removed");
          }}
          className="press btn-quiet flex size-11 items-center justify-center"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
