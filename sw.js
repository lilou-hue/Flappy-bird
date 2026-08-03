/*
 * Root service-worker cleanup.
 *
 * The arcade used to live at "/" and registered a service worker with root
 * scope. After the move to /arcade/ that registration is orphaned: nothing
 * re-registers it, but it stays installed on the device of everyone who
 * visited before, along with its cache of game assets. A worker can only be
 * retired by another worker at the same scope, so this file has to exist.
 *
 * It deletes the old caches, unregisters itself, and reloads any open tab.
 *
 * It deliberately deletes only the old "slayplay-v*" caches, so the arcade's
 * own worker at /arcade/ keeps its cache.
 *
 * WHAT THIS IS NOT. An earlier version of this comment claimed the old worker
 * would otherwise keep serving the stale homepage forever. That was wrong, and
 * worth recording so nobody re-derives the wrong mental model: the old worker
 * is NETWORK-FIRST for navigations (5 s timeout, cache only as fallback), so a
 * returning visitor gets whatever is actually deployed. Measured on a browser
 * with the old worker installed, against the real before/after builds:
 *
 *     old site installed : SlayPlay | 20+ Free Arcade Gam  {workers:1, caches:['slayplay-v25']}
 *     FIRST load, new    : Seran - a physically derived archipelago
 *     SECOND load        : Seran - a physically derived archipelago  {workers:0, caches:[]}
 *
 * Zero stale views. So this file is housekeeping - it reclaims disk on users'
 * devices and removes a registration that would otherwise linger indefinitely -
 * not a rescue. Still keep it: an orphaned worker with a stale fetch handler is
 * a liability, and it costs nothing.
 *
 * (A stale page after a deploy is almost always the ordinary HTTP cache
 * instead. GitHub Pages sends cache-control: max-age=600, so up to ten
 * minutes; a hard reload bypasses it.)
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
