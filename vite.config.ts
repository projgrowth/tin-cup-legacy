// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Preserve TanStack Start SSR and server functions when self-deploying to Vercel.
  // Lovable builds still force their own Cloudflare target internally.
  nitro: { preset: "vercel" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        // The app shell is cached so the board opens in Innisbrook dead spots.
        registerType: "autoUpdate",
        // Registration happens only in src/lib/register-sw.ts, never injected here.
        injectRegister: null,
        // Nitro's Vercel static output; generating elsewhere omits the service worker
        // from the deployed artifact and breaks event-day offline support.
        outDir: ".vercel/output/static",
        filename: "sw.js",
        // public/manifest.webmanifest is hand-maintained.
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          // No HTML — Nitro/Vercel SSR has no static index.html. Precaching or
          // navigateFallback: "/" calls createHandlerBoundToURL("/") on a missing
          // entry, the new worker fails to install, and guests keep the old Home.
          globPatterns: ["**/*.{js,css,json,woff2,png,jpg,jpeg,svg,ico,webmanifest}"],
          globIgnores: ["**/tin-cup-intro.mp4", "**/tin-cup-intro-720*", "**/*.html"],
          navigateFallback: "",
          cleanupOutdatedCaches: true,
          importScripts: ["/course-cache-worker.js"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "tin-cup-nav-v4", networkTimeoutSeconds: 4 },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin &&
                (url.pathname.startsWith("/assets/") ||
                  url.pathname.endsWith(".json") ||
                  url.pathname === "/tin-cup-logo.png" ||
                  url.pathname === "/tin-cup-medal.png" ||
                  url.pathname === "/app-icon-512.png" ||
                  url.pathname === "/favicon.png"),
              handler: "CacheFirst",
              options: {
                cacheName: "tin-cup-assets-v4",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Supabase GraphQL — prefer network, fall back to last good board/notes.
              urlPattern: ({ url }) =>
                url.hostname.includes("supabase") &&
                (url.pathname.includes("/graphql") || url.pathname.includes("/rest/")),
              handler: "NetworkFirst",
              options: {
                cacheName: "tin-cup-api",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 6 },
              },
            },
          ],
        },
      }),
    ],
  },
});
