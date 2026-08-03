/*
 * Root service-worker kill switch.
 *
 * The arcade used to live at "/" and registered a service worker with root
 * scope that cached "/" itself. Anyone who visited before the move still has
 * that worker installed, and it would keep serving the OLD cached homepage
 * from their device no matter what is deployed here.
 *
 * A worker can only be retired by another worker at the same scope, so this
 * file has to exist and has to stay. It deletes the old caches, unregisters
 * itself, and reloads any open tab so it picks up the live root page.
 *
 * It deliberately deletes only the old "slayplay-v*" caches, so the arcade's
 * new worker at /arcade/ keeps its own cache.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => /^slayplay-v/.test(k)).map((k) => caches.delete(k))
    );
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach((c) => c.navigate(c.url));
  })());
});

// Never intercept anything while we wait to be retired.
self.addEventListener('fetch', () => {});
