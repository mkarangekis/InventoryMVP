// Pourdex Service Worker — offline inventory count support
const CACHE = "pourdex-v1";
const OFFLINE_ROUTES = ["/count", "/dashboard", "/inventory"];
const STATIC_ASSETS = ["/_next/static/", "/favicon.svg", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/count", "/manifest.json", "/favicon.svg"]).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Cache-first for static assets
  if (STATIC_ASSETS.some((p) => url.pathname.startsWith(p))) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached ?? fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Network-first for API calls — queue writes offline
  if (url.pathname.startsWith("/api/inventory/snapshot")) {
    e.respondWith(
      fetch(e.request.clone()).catch(() => {
        // Store failed snapshot POSTs in IndexedDB via background sync
        if (e.request.method === "POST") {
          return e.request.clone().json().then((body) => {
            queueOfflineSnapshot(body);
            return new Response(
              JSON.stringify({ ok: true, queued: true }),
              { status: 202, headers: { "Content-Type": "application/json" } }
            );
          });
        }
        return caches.match(e.request) ?? new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // Network-first with offline fallback for pages
  if (OFFLINE_ROUTES.some((r) => url.pathname.startsWith(r))) {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then(
          (cached) => cached ?? new Response("<h1>Offline</h1><p>Connect to sync your counts.</p>", { headers: { "Content-Type": "text/html" } })
        )
      )
    );
    return;
  }
});

// Background sync for offline inventory counts
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-inventory-counts") {
    e.waitUntil(syncOfflineCounts());
  }
});

async function queueOfflineSnapshot(body) {
  const db = await openDB();
  const tx = db.transaction("offline_counts", "readwrite");
  tx.objectStore("offline_counts").add({ body, ts: Date.now(), synced: false });
  await tx.done;
  self.registration.sync?.register("sync-inventory-counts").catch(() => {});
}

async function syncOfflineCounts() {
  const db = await openDB();
  const tx = db.transaction("offline_counts", "readwrite");
  const store = tx.objectStore("offline_counts");
  const all = await store.getAll();
  for (const record of all) {
    if (record.synced) continue;
    try {
      const res = await fetch("/api/inventory/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record.body),
      });
      if (res.ok) {
        store.delete(record.id);
      }
    } catch { /* will retry on next sync */ }
  }
  await tx.done;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("pourdex-offline", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("offline_counts")) {
        db.createObjectStore("offline_counts", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}
