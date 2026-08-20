import { supabase } from "@/integrations/supabase/client";
import { getRuntimeMode, socialFeatureEnabled } from "@/lib/runtime-mode";

function browserCategory() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return "ios-safari";
  if (/Android/i.test(ua)) return "android";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "safari";
  return "chromium";
}

export function installClientErrorReporting() {
  if (getRuntimeMode() !== "production" || !socialFeatureEnabled("analytics"))
    return () => undefined;
  const send = (error: unknown) => {
    const value = error instanceof Error ? error : new Error(String(error));
    void supabase.functions.invoke("ingest-client-error", {
      body: {
        route: window.location.pathname,
        release: String(import.meta.env.VITE_APP_VERSION ?? "unknown"),
        browserCategory: browserCategory(),
        message: value.message,
        stack: value.stack,
      },
    });
  };
  const onError = (event: ErrorEvent) => send(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => send(event.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
