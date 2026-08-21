import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerServiceWorker } from "@/lib/register-sw";
import { installClientErrorReporting } from "@/lib/client-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { prefetchTournament } from "@/hooks/useTournament";
import { getEventPhase } from "@/lib/event-phase";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface fade-up w-full max-w-md px-6 py-10 text-center">
        <p className="t-eyebrow">404</p>
        <h1 className="t-display mt-2 text-foreground">Page not found</h1>
        <p className="t-body mt-2 text-muted-foreground">
          That link doesn&apos;t match anything in the weekend hub.
        </p>
        <div className="mt-6">
          <Link to="/" className="press btn-gold t-body inline-flex min-h-11 px-5">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface fade-up w-full max-w-md px-6 py-10 text-center">
        <h1 className="t-display text-foreground">This page didn&apos;t load</h1>
        <p className="t-body mt-2 text-muted-foreground">
          Something went wrong on our end. Try again or head back to Home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="press btn-gold t-body min-h-11 px-5"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <Link to="/" className="press btn-quiet t-body min-h-11 px-5">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const pre = getEventPhase() === "before";
    const title = pre
      ? "Tin Cup Invitational 2026 — August 28–30, Innisbrook"
      : "Tin Cup Invitational 2026 — Live Cup Standings";
    const description = pre
      ? "The 4th Annual Tin Cup Invitational at Innisbrook Golf Resort, August 28–30, 2026. Pairings, course plans, purse and the Snake Pit."
      : "The 4th Annual Tin Cup Invitational at Innisbrook Golf Resort, August 28–30, 2026. Live 26-point scoreboard, side cash, rosters and the Snake Pit guide.";
    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title },
      {
        name: "description",
        content: description,
      },
      { name: "theme-color", content: "#0c1412" },
      { property: "og:title", content: title },
      {
        property: "og:description",
        content: description,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      {
        name: "twitter:description",
        content: description,
      },
      {
        property: "og:image",
        content: "/tin-cup-logo.png",
      },
      {
        name: "twitter:image",
        content: "/tin-cup-logo.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/app-icon-512.png" },
    ],
    };
  },
  beforeLoad: ({ context }) => {
    void prefetchTournament(context.queryClient).catch(() => undefined);
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerServiceWorker();
    return installClientErrorReporting();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
