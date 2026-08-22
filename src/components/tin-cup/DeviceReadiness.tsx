import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { getOfflineCourseState } from "@/lib/offline-course";
import { getPushEligibility } from "@/lib/push-notifications";
import { getServiceWorkerStatus } from "@/lib/register-sw";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function DeviceReadiness({ embedded = false }: { embedded?: boolean }) {
  const [checks, setChecks] = useState({
    worker: false,
    storage: false,
    courses: 0,
    alerts: false,
  });
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const installed =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  useEffect(() => {
    const refresh = async () => {
      const worker = await getServiceWorkerStatus();
      let storage = false;
      try {
        const estimate = await navigator.storage?.estimate();
        storage = Boolean(estimate && typeof estimate.quota === "number" && estimate.quota > 0);
      } catch {
        storage = "localStorage" in window;
      }
      const courses = (["south", "copperhead", "island"] as const).filter(
        (course) => getOfflineCourseState(course) === "ready",
      ).length;
      const push = getPushEligibility();
      setChecks({
        worker: Boolean(worker.registered || !worker.shouldRegister),
        storage,
        courses,
        alerts:
          push.supported && push.secure && (!/iPhone|iPad/i.test(navigator.userAgent) || installed),
      });
    };
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    void refresh();
    window.addEventListener("tin-cup-course-cache", refresh);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    return () => {
      window.removeEventListener("tin-cup-course-cache", refresh);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
    };
  }, [installed]);

  const rows = [
    {
      label: "App shell",
      detail: checks.worker ? "Ready offline" : "Reload once to finish setup",
      done: checks.worker,
    },
    {
      label: "Device storage",
      detail: checks.storage ? "Available" : "Storage access unavailable",
      done: checks.storage,
    },
    {
      label: "Course bundles",
      detail: `${checks.courses}/3 downloaded`,
      done: checks.courses === 3,
    },
    {
      label: "Alert eligibility",
      detail: checks.alerts ? "Supported on this device" : "Install or use a supported browser",
      done: checks.alerts,
    },
  ];
  const body = (
    <>
      <ul className={embedded ? "space-y-2.5" : "divide-y divide-border px-4"}>
        {rows.map((row) => (
          <li key={row.label} className={`flex items-start gap-3 ${embedded ? "" : "py-3"}`}>
            {row.done ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--status-live)]" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-copper" />
            )}
            <span>
              <span className="t-body block font-medium text-foreground">{row.label}</span>
              <span className="t-micro block">{row.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <div
        className={
          embedded
            ? "mt-3 flex flex-wrap gap-x-4"
            : "grid gap-2 border-t border-border p-4 sm:grid-cols-2"
        }
      >
        {!installed && installPrompt ? (
          <button
            type="button"
            onClick={async () => {
              await installPrompt.prompt();
              await installPrompt.userChoice;
              setInstallPrompt(null);
            }}
            className="press t-micro min-h-11 px-1 font-semibold text-hunter"
          >
            Install app
          </button>
        ) : (
          <p className="t-micro flex min-h-11 items-center">
            {installed ? "Installed on this device" : "iPhone: Share → Add to Home Screen"}
          </p>
        )}
        <Link
          to="/scout"
          className="press t-micro flex min-h-11 items-center px-1 font-semibold text-foreground"
        >
          Prepare courses
        </Link>
      </div>
    </>
  );

  if (embedded) return <div className="space-y-1">{body}</div>;

  return (
    <section className="surface overflow-hidden" aria-labelledby="device-readiness-title">
      <div className="border-b border-border p-4">
        <h2 id="device-readiness-title" className="t-eyebrow">
          This phone
        </h2>
        <p className="t-micro mt-1">Prepare this phone before first tee.</p>
      </div>
      {body}
    </section>
  );
}
