self.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || !["COURSE_CACHE_DOWNLOAD", "COURSE_CACHE_REMOVE"].includes(message.type)) return;
  event.waitUntil(
    (async () => {
      const cacheName = `tin-cup-course-${message.courseId}-${message.version}`;
      if (message.type === "COURSE_CACHE_REMOVE") {
        const names = await caches.keys();
        await Promise.all(
          names
            .filter((name) => name.startsWith(`tin-cup-course-${message.courseId}-`))
            .map((name) => caches.delete(name)),
        );
        event.source?.postMessage({
          type: "COURSE_CACHE_STATUS",
          courseId: message.courseId,
          status: "not-downloaded",
        });
        return;
      }
      try {
        const cache = await caches.open(cacheName);
        await cache.addAll(message.urls);
        const names = await caches.keys();
        await Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith(`tin-cup-course-${message.courseId}-`) && name !== cacheName,
            )
            .map((name) => caches.delete(name)),
        );
        event.source?.postMessage({
          type: "COURSE_CACHE_STATUS",
          courseId: message.courseId,
          status: "ready",
          version: message.version,
        });
      } catch (error) {
        event.source?.postMessage({
          type: "COURSE_CACHE_STATUS",
          courseId: message.courseId,
          status: "failed",
          error: String(error),
        });
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Tin Cup Invitational", body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Tin Cup Invitational", {
      body: payload.body || "The weekend just moved.",
      icon: "/app-icon-512.png",
      badge: "/favicon.png",
      data: { url: payload.url || "/", dedupeKey: payload.dedupeKey },
      tag: payload.dedupeKey || "tin-cup-update",
      renotify: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return clients.openWindow(url);
    }),
  );
});
