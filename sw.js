const CACHE_NAME = 'slayplay-v23';

const PRECACHE_URLS = [
  '/',
  '/i18n.js',
  '/leaderboard.js',
  '/leaderboard.css',
  '/arcade.js',
  '/arcade.css',
  '/shop.js',
  '/shop.css',
  '/shop/',
  '/achievements/',
  '/leaderboard-page/',
  '/icon.svg',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/profile/',
  '/flappy-bird/',
  '/flappy-bird/script.js',
  '/flappy-bird/audio.js',
  '/flappy-bird/style.css',
  '/snake/',
  '/snake/game.js',
  '/snake/styles.css',
  '/tetris/',
  '/tetris/game.js',
  '/tetris/audio.js',
  '/tetris/styles.css',
  '/lumina/',
  '/lumina/game.js',
  '/lumina/styles.css',
  '/phantom-road/',
  '/phantom-road/game.js',
  '/phantom-road/styles.css',
  '/methane-drift/',
  '/methane-drift/game.js',
  '/methane-drift/audio.js',
  '/methane-drift/styles.css',
  '/gun-game/',
  '/gun-game/game.js',
  '/gun-game/audio.js',
  '/gun-game/styles.css',
  '/unicorn-clicker/',
  '/unicorn-clicker/game.js',
  '/unicorn-clicker/audio.js',
  '/unicorn-clicker/styles.css',
  '/astro-miner/',
  '/astro-miner/game.js',
  '/astro-miner/audio.js',
  '/astro-miner/styles.css',
  '/beat-drop/',
  '/beat-drop/game.js',
  '/beat-drop/styles.css',
  '/dress-up/',
  '/dress-up/game.js',
  '/dress-up/audio.js',
  '/dress-up/styles.css',
  '/inkognito/',
  '/inkognito/game.js',
  '/inkognito/audio.js',
  '/inkognito/styles.css',
  '/neon-pong/',
  '/neon-pong/game.js',
  '/neon-pong/styles.css',
  '/stack-tower/',
  '/stack-tower/game.js',
  '/stack-tower/styles.css',
  '/star-fury/',
  '/star-fury/game.js',
  '/star-fury/audio.js',
  '/star-fury/styles.css',
  '/rivals/',
  '/rivals/game.js',
  '/rivals/audio.js',
  '/rivals/styles.css',
  '/gravity-garden/',
  '/gravity-garden/game.js',
  '/gravity-garden/styles.css',
  '/the-deep/',
  '/the-deep/game.js',
  '/the-deep/styles.css',
  '/spend/',
  '/spend/game.js',
  '/spend/styles.css',
  '/life-in-weeks/',
  '/life-in-weeks/game.js',
  '/life-in-weeks/styles.css',
  '/last-seen-online/',
  '/last-seen-online/game.js',
  '/last-seen-online/styles.css',
  '/art-of-doing-nothing/',
  '/art-of-doing-nothing/state.js',
  '/art-of-doing-nothing/dialogue-engine.js',
  '/art-of-doing-nothing/characters.js',
  '/art-of-doing-nothing/audio.js',
  '/art-of-doing-nothing/game.js',
  '/art-of-doing-nothing/styles.css',
  '/art-of-doing-nothing/scenes/chapter1.js',
  '/art-of-doing-nothing/scenes/chapter2.js',
  '/art-of-doing-nothing/scenes/chapter3.js',
  '/art-of-doing-nothing/scenes/chapter4.js',
  '/art-of-doing-nothing/scenes/chapter5.js',
  '/heart-serve/',
  '/heart-serve/game.js',
  '/heart-serve/audio.js',
  '/heart-serve/boys.js',
  '/heart-serve/styles.css',
  '/signal-lost/',
  '/signal-lost/game.js',
  '/signal-lost/audio.js',
  '/signal-lost/styles.css',
];

const NETWORK_FIRST_HOSTS = [
  'firebasedatabase.app',
  'googleapis.com',
  'gstatic.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for Firebase / external APIs
  if (NETWORK_FIRST_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for game assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
