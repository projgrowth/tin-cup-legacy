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
          globPatterns: ["**/*.{js,css,woff2,png,jpg,jpeg,svg,ico}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/_serverFn\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "tin-cup-html", networkTimeoutSeconds: 4 },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: {
                cacheName: "tin-cup-assets",
                expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
