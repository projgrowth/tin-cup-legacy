/**
 * The only place a service worker is registered.
 *
 * Offline support is for the published app on event day. Dev, the Lovable
 * editor preview, and any iframe must never hold a worker, because a stale
 * cached shell there serves deleted chunks.
 */
const SW_URL = "/sw.js";

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => {
        const script =
          registration.active?.scriptURL ??
          registration.waiting?.scriptURL ??
          registration.installing?.scriptURL ??
          "";
        return script.endsWith(SW_URL);
      })
      .map((registration) => registration.unregister()),
  );
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname) ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (refused) {
    void unregisterAppWorkers();
    return;
  }

  // Reload once when a new worker takes control so the page is not left on
  // a previous bundle. Skip the first install (no existing controller).
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.location.reload();
      },
      { once: true },
    );
  }

  void navigator.serviceWorker
    .register(SW_URL, { updateViaCache: "none" })
    .then((registration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      void registration.update();
    })
    .catch(() => {
      /* offline support is an enhancement — never block the app */
    });
}

export type ServiceWorkerStatus = {
  supported: boolean;
  /** True only in production builds outside Lovable previews. */
  shouldRegister: boolean;
  registered: boolean;
  controlling: boolean;
  reason?: string;
};

/** Snapshot for the /ops readiness board. */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return {
      supported: false,
      shouldRegister: false,
      registered: false,
      controlling: false,
      reason: "unsupported",
    };
  }

  const shouldRegister =
    Boolean(import.meta.env.PROD) &&
    window.self === window.top &&
    !isPreviewHost(window.location.hostname) &&
    new URLSearchParams(window.location.search).get("sw") !== "off";

  if (!shouldRegister) {
    return {
      supported: true,
      shouldRegister: false,
      registered: false,
      controlling: false,
      reason: !import.meta.env.PROD
        ? "dev mode — SW disabled on purpose"
        : isPreviewHost(window.location.hostname)
          ? "preview host"
          : "registration refused",
    };
  }

  const regs = await navigator.serviceWorker.getRegistrations();
  const ours = regs.some((r) => {
    const script = r.active?.scriptURL ?? r.waiting?.scriptURL ?? r.installing?.scriptURL ?? "";
    return script.endsWith(SW_URL);
  });

  return {
    supported: true,
    shouldRegister: true,
    registered: ours,
    controlling: Boolean(navigator.serviceWorker.controller),
    reason: ours ? undefined : "not registered yet",
  };
}
