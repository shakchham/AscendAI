self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("ascend-ai-v1").then((cache) => {
      return cache.addAll(["/", "/index.html", "/manifest.webmanifest"]);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open("ascend-ai-v1").then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match("/index.html"));
    }),
  );
});
