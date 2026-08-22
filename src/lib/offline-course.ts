import type { CourseId } from "@/lib/courses";

export type OfflineCourseState =
  "not-downloaded" | "downloading" | "ready" | "update-available" | "failed";
export const COURSE_CACHE_VERSION = "2026.08.18.1";
const KEY = "tin-cup-offline-courses-v1";
type Stored = Record<string, { status: OfflineCourseState; version: string; updatedAt: number }>;
function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
function write(value: Stored) {
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("tin-cup-course-cache"));
}
export function getOfflineCourseState(courseId: CourseId): OfflineCourseState {
  if (typeof window === "undefined") return "not-downloaded";
  const saved = read()[courseId];
  if (!saved) return "not-downloaded";
  if (saved.status === "ready" && saved.version !== COURSE_CACHE_VERSION) return "update-available";
  return saved.status;
}
function urlsFor(courseId: CourseId): string[] {
  const origin = window.location.origin;
  const resources = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => url.startsWith(origin));
  return [
    ...new Set([
      `${origin}/scout?course=${courseId}`,
      `${origin}/scout?course=${courseId}&card=true`,
      `${origin}/manifest.webmanifest`,
      `${origin}/tin-cup-logo.png`,
      `${origin}/tin-cup-medal.png`,
      ...resources,
    ]),
  ];
}
export async function downloadOfflineCourse(courseId: CourseId): Promise<OfflineCourseState> {
  const state = read();
  state[courseId] = { status: "downloading", version: COURSE_CACHE_VERSION, updatedAt: Date.now() };
  write(state);
  try {
    const urls = urlsFor(courseId);
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.active) {
      const completed = new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          navigator.serviceWorker.removeEventListener("message", onMessage);
          reject(new Error("Course download timed out"));
        }, 30_000);
        function onMessage(event: MessageEvent) {
          if (event.data?.type !== "COURSE_CACHE_STATUS" || event.data.courseId !== courseId)
            return;
          window.clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener("message", onMessage);
          if (event.data.status === "ready") resolve();
          else reject(new Error("Course download failed"));
        }
        navigator.serviceWorker.addEventListener("message", onMessage);
      });
      registration.active.postMessage({
        type: "COURSE_CACHE_DOWNLOAD",
        courseId,
        version: COURSE_CACHE_VERSION,
        urls,
      });
      await completed;
    } else if ("caches" in window) {
      const cache = await caches.open(`tin-cup-course-${courseId}-${COURSE_CACHE_VERSION}`);
      await cache.addAll(urls);
    } else throw new Error("Offline storage unavailable");
    state[courseId] = { status: "ready", version: COURSE_CACHE_VERSION, updatedAt: Date.now() };
    write(state);
    return "ready";
  } catch {
    state[courseId] = { status: "failed", version: COURSE_CACHE_VERSION, updatedAt: Date.now() };
    write(state);
    return "failed";
  }
}
export async function removeOfflineCourse(courseId: CourseId) {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(`tin-cup-course-${courseId}-`))
      .map((name) => caches.delete(name)),
  );
  const state = read();
  delete state[courseId];
  write(state);
}
