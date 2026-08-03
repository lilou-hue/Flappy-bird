/* ═══════════════════════════════════════════════════════════
   Gravity Garden – One-button physics sandbox
   ═══════════════════════════════════════════════════════════ */

// ── i18n ──
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();
window.addEventListener('langchange', () => {
  I18N.applyDOM();
  renderAchList();
  for (const opt of themeSelect.options) {
    const th = THEMES[opt.value];
    if (th) opt.textContent = th.name();
  }
});

// ── Constants ──
const CW = 480, CH = 640;
const G = 800;
const SOFTENING = 800;
const MAX_PLANETS = 12;
const TRAIL_LEN = 100;
const ESCAPE_MARGIN = 400;
const PLANET_HUES = [30, 60, 120, 180, 210, 270, 300, 0];

// ── Canvas ──
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// roundRect polyfill for older browsers
if (!ctx.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
  };
}

// ── Themes ──
const THEMES = {
  classic: { name: () => I18N.t('ggThemeClassic') || 'Classic', bg: '#060818', bg2: '#040610', starColor: 'rgba(150,180,255,0.4)', accent: '#6090ff' },
  nebula:  { name: () => I18N.t('ggThemeNebula')  || 'Nebula',  bg: '#100820', bg2: '#080410', starColor: 'rgba(200,120,255,0.4)', accent: '#c060ff' },
  ocean:   { name: () => I18N.t('ggThemeOcean')   || 'Deep Ocean', bg: '#040c1a', bg2: '#020810', starColor: 'rgba(80,180,255,0.4)', accent: '#40b0ff' },
};

let currentTheme = localStorage.getItem('gravityGardenTheme') || 'classic';

// Populate theme dropdown
const themeSelect = document.getElementById('themeSelect');
for (const [key, th] of Object.entries(THEMES)) {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = th.name();
  if (key === currentTheme) opt.selected = true;
  themeSelect.appendChild(opt);
}
themeSelect.addEventListener('change', () => {
  currentTheme = themeSelect.value;
  localStorage.setItem('gravityGardenTheme', currentTheme);
  document.body.className = currentTheme === 'classic' ? '' : `theme-${currentTheme}`;
});
if (currentTheme !== 'classic') document.body.className = `theme-${currentTheme}`;

// ── Audio ──
const Audio = (() => {
  let actx, master, muted = localStorage.getItem('gravityGardenMuted') === '1';
  let droneOsc, droneGain;

  function init() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(actx.destination);
  }
  function resume() { if (actx && actx.state === 'suspended') actx.resume(); }
  function toggle() {
    muted = !muted;
    localStorage.setItem('gravityGardenMuted', muted ? '1' : '0');
    if (master) master.gain.value = muted ? 0 : 0.5;
    if (droneGain) droneGain.gain.value = muted ? 0 : 0.03;
    return muted;
  }
  function isMuted() { return muted; }

  function playTone(freq, dur, type, vol) {
    if (!actx || muted) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.3, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + dur);
  }

  function playPlant() {
    if (!actx || muted) return;
    const notes = [523, 587, 659];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'sine', 0.25), i * 50);
    });
  }

  function playCollision() {
    if (!actx || muted) return;
    // Bass thud
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(80, actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(30, actx.currentTime + 0.4);
    g.gain.setValueAtTime(0.4, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.4);
    o.connect(g); g.connect(master);
    o.start(); o.stop(actx.currentTime + 0.4);
    // Noise burst
    const bufSize = actx.sampleRate * 0.15;
    const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const ng = actx.createGain();
    ng.gain.setValueAtTime(0.15, actx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
    src.connect(ng); ng.connect(master);
    src.start(); src.stop(actx.currentTime + 0.15);
  }

  function playMilestone() {
    if (!actx || muted) return;
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.18, 'triangle', 0.2), i * 80);
    });
  }

  function playGameOver() {
    if (!actx || muted) return;
    [330, 294, 262].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'sine', 0.25), i * 200);
    });
  }

  function startDrone() {
    if (!actx || droneOsc) return;
    droneOsc = actx.createOscillator();
    droneGain = actx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 55;
    droneGain.gain.value = muted ? 0 : 0.03;
    droneOsc.connect(droneGain);
    droneGain.connect(master);
    droneOsc.start();
  }

  function stopDrone() {
    if (droneOsc) {
      try { droneOsc.stop(); } catch(e) {}
      droneOsc = null;
      droneGain = null;
    }
  }

  return { init, resume, toggle, isMuted, playPlant, playCollision, playMilestone, playGameOver, startDrone, stopDrone };
})();

// ── Mute / Fullscreen ──
const muteBtn = document.getElementById('muteButton');
muteBtn.textContent = Audio.isMuted() ? '\u{1F507}' : '\u{1F50A}';
muteBtn.addEventListener('click', () => {
  Audio.init(); Audio.resume();
  const m = Audio.toggle();
  muteBtn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
});

let isFullscreen = false;
function updateCanvasSize() {
  if (isFullscreen) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - 52;
    const aspect = CW / CH;
    let w, h;
    if (screenW / screenH > aspect) { h = screenH; w = Math.floor(h * aspect); }
    else { w = screenW; h = Math.floor(w / aspect); }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  } else {
    canvas.style.width = '';
    canvas.style.height = '';
  }
}
document.getElementById('fullscreenButton').addEventListener('click', () => {
  const el = document.getElementById('gameContainer');
  if (!document.fullscreenElement) {
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (fn) fn.call(el);
  } else {
    const fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (fn) fn.call(document);
  }
});
document.addEventListener('fullscreenchange', () => { isFullscreen = !!document.fullscreenElement; requestAnimationFrame(updateCanvasSize); });
document.addEventListener('webkitfullscreenchange', () => { isFullscreen = !!document.webkitFullscreenElement; requestAnimationFrame(updateCanvasSize); });
window.addEventListener('resize', () => { if (isFullscreen) updateCanvasSize(); });

// ── Achievements ──
const ACH = [
  { id: 'ggFirstOrbit',     icon: '\u{1F30D}', title: () => I18N.t('achGgFirstOrbit')     || 'First Orbit',     desc: () => I18N.t('achGgFirstOrbitDesc')     || 'Plant your first planet',       check: s => s.totalPlanetsPlanted >= 1 },
  { id: 'ggSolarSystem',    icon: '\u{2600}',  title: () => I18N.t('achGgSolarSystem')    || 'Solar System',    desc: () => I18N.t('achGgSolarSystemDesc')    || 'Have 5 planets alive at once',   check: s => s.maxAlivePlanets >= 5 },
  { id: 'ggGravityMaster',  icon: '\u{1F320}', title: () => I18N.t('achGgGravityMaster')  || 'Gravity Master',  desc: () => I18N.t('achGgGravityMasterDesc')  || 'Score 200 points',               check: s => s.bestScore >= 200 },
  { id: 'ggCosmos',         icon: '\u{1F30C}', title: () => I18N.t('achGgCosmos')         || 'Cosmos',          desc: () => I18N.t('achGgCosmosDesc')         || 'Score 500 points',               check: s => s.bestScore >= 500 },
  { id: 'ggSurvivor',       icon: '\u{1F6E1}', title: () => I18N.t('achGgSurvivor')       || 'Survivor',        desc: () => I18N.t('achGgSurvivorDesc')       || 'Keep a planet alive for 60 seconds', check: s => s.longestPlanetLife >= 60 },
  { id: 'ggStargazer',      icon: '\u{1F52D}', title: () => I18N.t('achGgStargazer')      || 'Stargazer',       desc: () => I18N.t('achGgStargazerDesc')      || 'Play 20 games',                  check: s => s.gamesPlayed >= 20 },
];

let achData; try { achData = JSON.parse(localStorage.getItem('gravityGardenAch') || 'null'); } catch(e) {} achData = achData || {"unlocked":[],"stats":{"bestScore":0,"gamesPlayed":0,"totalPlanetsPlanted":0,"maxAlivePlanets":0,"longestPlanetLife":0}};
let achQueue = [];

function saveAch() { localStorage.setItem('gravityGardenAch', JSON.stringify(achData)); }
function checkAch() {
  for (const a of ACH) {
    if (!achData.unlocked.includes(a.id) && a.check(achData.stats)) {
      achData.unlocked.push(a.id);
      achQueue.push(a);
    }
  }
  saveAch();
  if (achQueue.length) showAchPopup();
}
function showAchPopup() {
  if (!achQueue.length) return;
  const a = achQueue.shift();
  const popup = document.getElementById('achievementPopup');
  document.getElementById('achievementPopupIcon').textContent = a.icon;
  document.getElementById('achievementPopupTitle').textContent = a.title();
  document.getElementById('achievementPopupDesc').textContent = a.desc();
  popup.classList.add('show');
  setTimeout(() => { popup.classList.remove('show'); setTimeout(showAchPopup, 300); }, 3000);
}
function renderAchList() {
  const list = document.getElementById('achievementsList');
  list.innerHTML = '';
  for (const a of ACH) {
    const el = document.createElement('div');
    el.className = 'achievement-item' + (achData.unlocked.includes(a.id) ? ' unlocked' : '');
    el.innerHTML = `<span class="achievement-item__icon">${a.icon}</span><span>${a.title()}</span>`;
    list.appendChild(el);
  }
}
renderAchList();

document.getElementById('achievementsToggle').addEventListener('click', () => {
  document.getElementById('achievementsList').classList.toggle('open');
});

// ── Leaderboard ──
let lbReady = false;
function initLB() {
  if (lbReady) return;
  try {
    const panel = Leaderboard.createPanel('gravity-garden');
    document.getElementById('leaderboardPanel').appendChild(panel);
    lbReady = true;
  } catch (e) {}
}
document.getElementById('leaderboardToggle').addEventListener('click', () => {
  initLB();
  const p = document.getElementById('leaderboardPanel');
  p.style.display = p.style.display === 'none' ? '' : 'none';
});

// ── Stars background ──
const bgStars = Array.from({ length: 80 }, () => ({
  x: Math.random() * CW,
  y: Math.random() * CH,
  s: 0.3 + Math.random() * 1.2,
  tw: Math.random() * Math.PI * 2,
}));

// ── Particles ──
let particles = [];
function spawnExplosion(x, y, hue1, hue2) {
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 120;
    const life = 0.8 + Math.random() * 0.6;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 1.5 + Math.random() * 3,
      hue: i < 20 ? hue1 + (Math.random() - 0.5) * 30 : hue2 + (Math.random() - 0.5) * 30,
    });
  }
}

// ── Object Types ──
const OBJ_TYPES = [
  { id: 'planet',   get name() { return I18N.t('gravTypePlanet'); },   icon: '\u{1F30D}', key: '1', get desc() { return I18N.t('gravTypePlanetDesc'); },       mass: [3, 5],  radius: [5, 6],  trailLen: TRAIL_LEN },
  { id: 'asteroid', get name() { return I18N.t('gravTypeAsteroid'); }, icon: '\u{1FA78}', key: '2', get desc() { return I18N.t('gravTypeAsteroidDesc'); },           mass: [0.8, 1.2], radius: [2.5, 3], trailLen: 40 },
  { id: 'giant',    get name() { return I18N.t('gravTypeGiant'); },icon: '\u{1FA90}', key: '3', get desc() { return I18N.t('gravTypeGiantDesc'); },   mass: [12, 18], radius: [10, 13], trailLen: 80 },
  { id: 'comet',    get name() { return I18N.t('gravTypeComet'); },    icon: '\u{2604}',  key: '4', get desc() { return I18N.t('gravTypeCometDesc'); }, mass: [1.5, 3], radius: [3, 5],  trailLen: 180 },
  { id: 'shield',   get name() { return I18N.t('gravTypeShield'); },   icon: '\u{1F6E1}', key: '5', get desc() { return I18N.t('gravTypeShieldDesc'); },   mass: [2, 3],  radius: [4, 5],  trailLen: 60 },
];
let selectedType = 0; // index into OBJ_TYPES

// ── Planet class ──
class Planet {
  constructor(x, y, mass, radius, hue, isStationary) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.mass = mass;
    this.radius = radius;
    this.hue = hue;
    this.trail = [];
    this.alive = true;
    this.isStationary = isStationary || false;
    this.birthTime = 0;
    this.type = 'planet'; // planet, asteroid, giant, comet, shield
    this.maxTrailLen = TRAIL_LEN;
    this.isShield = false;
    this.cometLife = 0; // seconds remaining for comets
  }
}

// ── Game State ──
let planets = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem('gravityGardenBest') || '0');
let gameOver = false;
let gameStarted = false;
let sunPlanted = false;
let time = 0;
let gameTime = 0;
let lastMilestone = 0;
let sessionMaxAlive = 0;
let sessionLongestLife = 0;
let scoreMultiplier = 1.0;
let multiplierTimer = 0;
let lastCollisionTime = -999;
let nearMissCombo = 0;
let nearMissTimer = 0;

// ── Drag-to-launch state ──
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };
let predictedPath = [];

document.getElementById('bestScore').textContent = bestScore;

function resetGame() {
  Audio.stopDrone();
  planets = [];
  particles = [];
  score = 0;
  gameOver = false;
  gameStarted = true;
  sunPlanted = false;
  gameTime = 0;
  lastMilestone = 0;
  sessionMaxAlive = 0;
  sessionLongestLife = 0;
  scoreMultiplier = 1.0;
  multiplierTimer = 0;
  lastCollisionTime = -999;
  nearMissCombo = 0;
  nearMissTimer = 0;
  isDragging = false;
  predictedPath = [];
  document.getElementById('score').textContent = '0';

  // Remove old score card if present
  const oldCard = document.querySelector('.arc-scorecard');
  if (oldCard) oldCard.remove();

  Audio.init();
  Audio.resume();
  Audio.startDrone();
}

function plantSun(x, y) {
  const sun = new Planet(x, y, 1000, 22, 45, true);
  sun.birthTime = gameTime;
  planets.push(sun);
  sunPlanted = true;
  Audio.playPlant();
}

function plantPlanet(x, y, vx, vy) {
  if (planets.length >= MAX_PLANETS) return;

  const sun = planets[0];
  if (!sun || !sun.alive) return;

  const dx = x - sun.x;
  const dy = y - sun.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < sun.radius + 10) return; // Too close to sun

  const typeDef = OBJ_TYPES[selectedType];
  const mass = typeDef.mass[0] + Math.random() * (typeDef.mass[1] - typeDef.mass[0]);
  const radius = typeDef.radius[0] + Math.random() * (typeDef.radius[1] - typeDef.radius[0]);

  // Type-specific hue
  let hue;
  if (typeDef.id === 'asteroid') hue = 30 + Math.random() * 20; // brown/orange
  else if (typeDef.id === 'giant') hue = 210 + Math.random() * 60; // blue-purple
  else if (typeDef.id === 'comet') hue = 170 + Math.random() * 30; // cyan
  else if (typeDef.id === 'shield') hue = 50; // gold
  else hue = PLANET_HUES[Math.floor(Math.random() * PLANET_HUES.length)];

  const planet = new Planet(x, y, mass, radius, hue, false);
  planet.vx = vx;
  planet.vy = vy;
  planet.birthTime = gameTime;
  planet.type = typeDef.id;
  planet.maxTrailLen = typeDef.trailLen;
  planet.isShield = typeDef.id === 'shield';
  if (typeDef.id === 'comet') planet.cometLife = 20 + Math.random() * 10; // 20-30s lifespan
  planets.push(planet);

  achData.stats.totalPlanetsPlanted++;
  Audio.playPlant();
}

// ── Orbit prediction ──
function predictOrbit(x, y, vx, vy, steps) {
  const path = [];
  const sun = planets[0];
  if (!sun || !sun.alive) return path;
  let px = x, py = y, pvx = vx, pvy = vy;
  const dt = 0.016;
  for (let i = 0; i < steps; i++) {
    const dx = sun.x - px;
    const dy = sun.y - py;
    const distSq = dx * dx + dy * dy + SOFTENING;
    const dist = Math.sqrt(distSq);
    const force = G * sun.mass / distSq;
    pvx += force * dx / dist * dt;
    pvy += force * dy / dist * dt;
    // Also account for other planets' gravity
    for (let j = 1; j < planets.length; j++) {
      if (!planets[j].alive) continue;
      const dx2 = planets[j].x - px;
      const dy2 = planets[j].y - py;
      const dSq2 = dx2 * dx2 + dy2 * dy2 + SOFTENING;
      const d2 = Math.sqrt(dSq2);
      const f2 = G * planets[j].mass / dSq2;
      pvx += f2 * dx2 / d2 * dt;
      pvy += f2 * dy2 / d2 * dt;
    }
    px += pvx * dt;
    py += pvy * dt;
    // Check if it hits the sun
    const sd = Math.sqrt((px - sun.x) ** 2 + (py - sun.y) ** 2);
    if (sd < sun.radius + 5) break;
    // Check if it escapes
    if (px < -100 || px > CW + 100 || py < -100 || py > CH + 100) break;
    if (i % 2 === 0) path.push({ x: px, y: py });
  }
  return path;
}

function getDragVelocity() {
  const dx = dragStart.x - dragEnd.x;
  const dy = dragStart.y - dragEnd.y;
  const dragDist = Math.sqrt(dx * dx + dy * dy);

  // Scale: drag distance maps to velocity. Max drag ~200px = max speed
  const sun = planets[0];
  if (!sun) return { vx: 0, vy: 0 };
  const dsx = dragStart.x - sun.x;
  const dsy = dragStart.y - sun.y;
  const distToSun = Math.sqrt(dsx * dsx + dsy * dsy);
  const orbitalSpeed = Math.sqrt(G * sun.mass / Math.max(distToSun, 30));

  // Drag direction = launch direction, drag length scales speed (0.5x to 2x orbital)
  const speedScale = Math.min(dragDist / 100, 2.0);
  const speed = orbitalSpeed * Math.max(speedScale, 0.3);

  if (dragDist < 3) {
    // Tiny drag = auto-orbit (perpendicular to sun, like before)
    const nx = dsx / Math.max(distToSun, 1);
    const ny = dsy / Math.max(distToSun, 1);
    const dir = Math.random() < 0.5 ? 1 : -1;
    return { vx: -ny * orbitalSpeed * dir, vy: nx * orbitalSpeed * dir };
  }

  return { vx: dx / Math.max(dragDist, 1) * speed, vy: dy / Math.max(dragDist, 1) * speed };
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  Audio.stopDrone();
  Audio.playGameOver();

  const finalScore = Math.floor(score);

  // Update stats
  achData.stats.gamesPlayed++;
  if (finalScore > achData.stats.bestScore) achData.stats.bestScore = finalScore;
  if (sessionMaxAlive > achData.stats.maxAlivePlanets) achData.stats.maxAlivePlanets = sessionMaxAlive;
  if (sessionLongestLife > achData.stats.longestPlanetLife) achData.stats.longestPlanetLife = sessionLongestLife;
  checkAch();

  const prevBest = bestScore;
  if (finalScore > bestScore) {
    bestScore = finalScore;
    localStorage.setItem('gravityGardenBest', bestScore);
    document.getElementById('bestScore').textContent = bestScore;
  }

  // Submit to leaderboard
  try { initLB(); Leaderboard.submitScore('gravity-garden', finalScore); } catch (e) {}
  if (typeof Arcade !== 'undefined') {
    Arcade.onGameOver('gravity-garden', finalScore);
    document.body.appendChild(Arcade.createScoreCard('gravity-garden', finalScore, prevBest));
  }
}

// ── Physics ──
function updatePhysics(dt) {
  // Gravity: O(n^2) pair forces
  for (let i = 0; i < planets.length; i++) {
    if (!planets[i].alive) continue;
    for (let j = i + 1; j < planets.length; j++) {
      if (!planets[j].alive) continue;

      const a = planets[i];
      const b = planets[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy + SOFTENING;
      const dist = Math.sqrt(distSq);
      const force = G * a.mass * b.mass / distSq;
      const fx = force * dx / dist;
      const fy = force * dy / dist;

      if (!a.isStationary) {
        a.vx += fx / a.mass * dt;
        a.vy += fy / a.mass * dt;
      }
      if (!b.isStationary) {
        b.vx -= fx / b.mass * dt;
        b.vy -= fy / b.mass * dt;
      }

      // Collision detection
      const realDist = Math.sqrt(dx * dx + dy * dy);
      if (realDist < a.radius + b.radius) {
        spawnExplosion((a.x + b.x) / 2, (a.y + b.y) / 2, a.hue, b.hue);
        Audio.playCollision();
        nearMissCombo = 0;
        lastCollisionTime = gameTime;

        // Sun collision
        if (a.isStationary || b.isStationary) {
          const other = a.isStationary ? b : a;
          // Shield satellites sacrifice themselves to save the sun
          if (other.isShield) {
            other.alive = false;
            score += 25 * scoreMultiplier;
            // Big sparkle effect for shield save
            for (let k = 0; k < 20; k++) {
              const angle = Math.random() * Math.PI * 2;
              particles.push({
                x: other.x, y: other.y,
                vx: Math.cos(angle) * 80, vy: Math.sin(angle) * 80,
                life: 0.8, maxLife: 0.8, size: 2 + Math.random() * 3, hue: 50,
              });
            }
          } else {
            // Check if any shield satellite is nearby to intercept
            let shieldSaved = false;
            for (const sp of planets) {
              if (!sp.alive || !sp.isShield || sp === other) continue;
              const sdx = sp.x - other.x;
              const sdy = sp.y - other.y;
              const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
              if (sDist < 80) {
                sp.alive = false;
                shieldSaved = true;
                other.alive = false;
                score += 25 * scoreMultiplier;
                spawnExplosion(sp.x, sp.y, 50, other.hue);
                break;
              }
            }
            if (!shieldSaved) {
              a.alive = false;
              b.alive = false;
              planets = planets.filter(p => p.alive);
              endGame();
              return;
            }
          }
          continue;
        }

        // Planet-planet collision = merge! Bigger absorbs smaller
        const bigger = a.mass >= b.mass ? a : b;
        const smaller = a.mass >= b.mass ? b : a;
        // Conserve momentum
        bigger.vx = (bigger.vx * bigger.mass + smaller.vx * smaller.mass) / (bigger.mass + smaller.mass);
        bigger.vy = (bigger.vy * bigger.mass + smaller.vy * smaller.mass) / (bigger.mass + smaller.mass);
        bigger.mass += smaller.mass * 0.7;
        bigger.radius = Math.min(bigger.radius + smaller.radius * 0.4, 18);
        // Blend hues
        bigger.hue = (bigger.hue + smaller.hue) / 2;
        smaller.alive = false;

        // Score bonus for merge
        score += 15 * scoreMultiplier;
      }
    }
  }

  // Integration + trail + escape pruning
  for (let i = planets.length - 1; i >= 0; i--) {
    const p = planets[i];
    if (!p.alive) { planets.splice(i, 1); continue; }

    if (!p.isStationary) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Trail (skip for stationary objects like the sun)
    if (!p.isStationary) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > p.maxTrailLen) p.trail.shift();
    }

    // Comet decay: loses mass and radius over time, dies when spent
    if (p.type === 'comet' && !p.isStationary) {
      p.cometLife -= dt;
      if (p.cometLife <= 0) {
        // Comet burns out — sparkle farewell
        for (let k = 0; k < 15; k++) {
          const angle = Math.random() * Math.PI * 2;
          particles.push({
            x: p.x, y: p.y,
            vx: Math.cos(angle) * 50, vy: Math.sin(angle) * 50,
            life: 0.6, maxLife: 0.6, size: 1.5 + Math.random() * 2, hue: 180,
          });
        }
        score += 5 * scoreMultiplier;
        p.alive = false;
        planets.splice(i, 1);
        continue;
      }
      // Slowly shrink
      p.radius = Math.max(1.5, p.radius - dt * 0.08);
      p.mass = Math.max(0.3, p.mass - dt * 0.05);
      // Shed particles along trail
      if (Math.random() < 0.3) {
        particles.push({
          x: p.x + (Math.random() - 0.5) * 6,
          y: p.y + (Math.random() - 0.5) * 6,
          vx: -p.vx * 0.1 + (Math.random() - 0.5) * 15,
          vy: -p.vy * 0.1 + (Math.random() - 0.5) * 15,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.7,
          size: 1 + Math.random() * 1.5,
          hue: 170 + Math.random() * 30,
        });
      }
    }

    // Escape check (non-sun only)
    if (!p.isStationary) {
      if (p.x < -ESCAPE_MARGIN || p.x > CW + ESCAPE_MARGIN ||
          p.y < -ESCAPE_MARGIN || p.y > CH + ESCAPE_MARGIN) {
        p.alive = false;
        planets.splice(i, 1);
      }
    }
  }

  // ── Score multiplier: grows while no collisions, resets on sun hit ──
  const timeSinceCollision = gameTime - lastCollisionTime;
  if (timeSinceCollision > 5) {
    multiplierTimer += dt;
    if (multiplierTimer > 3) {
      scoreMultiplier = Math.min(scoreMultiplier + dt * 0.15, 5.0);
    }
  } else {
    multiplierTimer = 0;
    scoreMultiplier = Math.max(1.0, scoreMultiplier - dt * 0.5);
  }

  // ── Near-miss detection: planets passing close earn bonus ──
  nearMissTimer -= dt;
  for (let i = 1; i < planets.length; i++) {
    if (!planets[i].alive || planets[i].isStationary) continue;
    for (let j = i + 1; j < planets.length; j++) {
      if (!planets[j].alive || planets[j].isStationary) continue;
      const nmDx = planets[i].x - planets[j].x;
      const nmDy = planets[i].y - planets[j].y;
      const nmDist = Math.sqrt(nmDx * nmDx + nmDy * nmDy);
      const threshold = planets[i].radius + planets[j].radius + 25;
      if (nmDist < threshold && nmDist > planets[i].radius + planets[j].radius) {
        if (nearMissTimer <= 0) {
          nearMissCombo++;
          const bonus = 10 * nearMissCombo * scoreMultiplier;
          score += bonus;
          nearMissTimer = 1.5; // cooldown
          // Visual feedback: spawn small sparkle particles
          for (let k = 0; k < 8; k++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push({
              x: (planets[i].x + planets[j].x) / 2,
              y: (planets[i].y + planets[j].y) / 2,
              vx: Math.cos(angle) * 40,
              vy: Math.sin(angle) * 40,
              life: 0.5,
              maxLife: 0.5,
              size: 1 + Math.random() * 2,
              hue: 50,
            });
          }
          Audio.playMilestone();
        }
      }
    }
  }
  if (nearMissTimer <= -3) nearMissCombo = 0; // reset combo after inactivity

  // Score: alive non-sun planets * dt * 10 * multiplier
  const alivePlanets = planets.filter(p => p.alive && !p.isStationary).length;
  if (alivePlanets > 0) {
    score += alivePlanets * dt * 10 * scoreMultiplier;
    document.getElementById('score').textContent = Math.floor(score);

    // Milestone sound every 50 pts
    const milestone = Math.floor(score / 50);
    if (milestone > lastMilestone) {
      lastMilestone = milestone;
      Audio.playMilestone();
    }
  }

  // Track max alive
  const totalAlive = planets.filter(p => p.alive && !p.isStationary).length;
  if (totalAlive > sessionMaxAlive) sessionMaxAlive = totalAlive;

  // Track longest planet life
  for (const p of planets) {
    if (p.alive && !p.isStationary) {
      const life = gameTime - p.birthTime;
      if (life > sessionLongestLife) sessionLongestLife = life;
    }
  }
}

// ── Controls (drag-to-launch) ──
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (CW / rect.width),
    y: (e.clientY - rect.top) * (CH / rect.height),
  };
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const pos = getCanvasCoords(e);

  if (gameOver) { resetGame(); return; }
  if (!gameStarted) { resetGame(); return; }

  if (!sunPlanted) {
    plantSun(pos.x, pos.y);
    return;
  }

  // Check if clicking on toolbar
  if (sunPlanted) {
    const toolbarW = OBJ_TYPES.length * 50;
    const toolbarX = (CW - toolbarW) / 2;
    const toolbarY = CH - 52;
    if (pos.y >= toolbarY - 4 && pos.y <= toolbarY + 44) {
      const idx = Math.floor((pos.x - toolbarX) / 50);
      if (idx >= 0 && idx < OBJ_TYPES.length) {
        selectedType = idx;
        return; // don't start dragging
      }
    }
  }

  // Start drag for planet launch
  if (planets.length < MAX_PLANETS && planets[0] && planets[0].alive) {
    isDragging = true;
    dragStart = { x: pos.x, y: pos.y };
    dragEnd = { x: pos.x, y: pos.y };
    predictedPath = [];
  }
});

canvas.addEventListener('pointermove', e => {
  if (!isDragging) return;
  e.preventDefault();
  dragEnd = getCanvasCoords(e);

  // Update prediction
  const vel = getDragVelocity();
  predictedPath = predictOrbit(dragStart.x, dragStart.y, vel.vx, vel.vy, 300);
});

canvas.addEventListener('pointerup', e => {
  if (!isDragging) return;
  e.preventDefault();
  isDragging = false;
  dragEnd = getCanvasCoords(e);

  const vel = getDragVelocity();
  plantPlanet(dragStart.x, dragStart.y, vel.vx, vel.vy);
  predictedPath = [];
});

canvas.addEventListener('lostpointercapture', () => {
  if (isDragging) {
    isDragging = false;
    predictedPath = [];
  }
});

// ── Type selection via keyboard ──
document.addEventListener('keydown', e => {
  const idx = parseInt(e.key) - 1;
  if (idx >= 0 && idx < OBJ_TYPES.length) {
    selectedType = idx;
  }
});

document.getElementById('restartButton').addEventListener('click', resetGame);

// Listen for arcade restart
document.addEventListener('arcade-restart', resetGame);

// ── Render ──
function drawStarfield(t) {
  const theme = THEMES[currentTheme];
  for (const s of bgStars) {
    const alpha = 0.12 + Math.sin(t * 1.5 + s.tw) * 0.12;
    ctx.fillStyle = theme.starColor.replace(/[\d.]+\)$/, alpha.toFixed(2) + ')');
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrail(planet) {
  if (planet.trail.length < 2) return;
  const isComet = planet.type === 'comet';
  const isShield = planet.isShield;
  for (let i = 1; i < planet.trail.length; i++) {
    const t = i / planet.trail.length;
    let alpha, lw, sat, light;
    if (isComet) {
      // Bright, wide, glowing comet tail
      alpha = t * 0.6;
      lw = 1 + t * 3;
      sat = 50;
      light = 75;
    } else if (isShield) {
      // Dashed golden trail
      alpha = t * 0.3;
      lw = 1;
      sat = 80;
      light = 65;
    } else {
      alpha = t * 0.4;
      lw = planet.type === 'giant' ? 2 : 1.5;
      sat = 70;
      light = 60;
    }
    ctx.strokeStyle = `hsla(${planet.hue}, ${sat}%, ${light}%, ${alpha})`;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(planet.trail[i - 1].x, planet.trail[i - 1].y);
    ctx.lineTo(planet.trail[i].x, planet.trail[i].y);
    ctx.stroke();
  }
}

function drawSun(sun, t) {
  const pulse = 22 + Math.sin(t * 3) * 8;
  ctx.save();
  ctx.shadowBlur = pulse;
  ctx.shadowColor = 'rgba(255,200,50,0.6)';

  // Outer glow
  const glow = ctx.createRadialGradient(sun.x, sun.y, sun.radius * 0.3, sun.x, sun.y, sun.radius * 2.5);
  glow.addColorStop(0, 'rgba(255,220,80,0.3)');
  glow.addColorStop(0.5, 'rgba(255,180,40,0.1)');
  glow.addColorStop(1, 'rgba(255,150,20,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Sun body
  const grad = ctx.createRadialGradient(sun.x - 4, sun.y - 4, 2, sun.x, sun.y, sun.radius);
  grad.addColorStop(0, '#fffbe0');
  grad.addColorStop(0.4, '#ffd700');
  grad.addColorStop(0.8, '#ff8c00');
  grad.addColorStop(1, '#cc6600');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPlanet(planet) {
  ctx.save();

  // Gas giant: draw gravity well ring
  if (planet.type === 'giant') {
    ctx.strokeStyle = `hsla(${planet.hue}, 50%, 60%, 0.12)`;
    ctx.lineWidth = 1;
    for (let r = planet.radius + 8; r < planet.radius + 35; r += 8) {
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Shield: draw protective ring
  if (planet.isShield) {
    ctx.strokeStyle = `hsla(50, 90%, 70%, ${0.3 + Math.sin(time * 4) * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.shadowBlur = planet.type === 'comet' ? 18 : 12;
  ctx.shadowColor = `hsla(${planet.hue}, 70%, 50%, ${planet.type === 'comet' ? 0.8 : 0.5})`;

  const grad = ctx.createRadialGradient(
    planet.x - planet.radius * 0.3, planet.y - planet.radius * 0.3, planet.radius * 0.1,
    planet.x, planet.y, planet.radius
  );

  if (planet.type === 'asteroid') {
    // Rocky, rough-looking
    grad.addColorStop(0, `hsl(${planet.hue}, 30%, 65%)`);
    grad.addColorStop(0.6, `hsl(${planet.hue}, 25%, 45%)`);
    grad.addColorStop(1, `hsl(${planet.hue}, 20%, 25%)`);
  } else if (planet.type === 'giant') {
    // Banded gas giant
    grad.addColorStop(0, `hsl(${planet.hue}, 55%, 80%)`);
    grad.addColorStop(0.3, `hsl(${planet.hue + 15}, 50%, 65%)`);
    grad.addColorStop(0.6, `hsl(${planet.hue - 10}, 55%, 50%)`);
    grad.addColorStop(1, `hsl(${planet.hue}, 45%, 30%)`);
  } else if (planet.type === 'comet') {
    // Bright icy core
    grad.addColorStop(0, `hsl(${planet.hue}, 40%, 95%)`);
    grad.addColorStop(0.4, `hsl(${planet.hue}, 60%, 75%)`);
    grad.addColorStop(1, `hsl(${planet.hue}, 70%, 45%)`);
  } else if (planet.isShield) {
    // Golden metallic
    grad.addColorStop(0, '#fff8e0');
    grad.addColorStop(0.5, '#ffd700');
    grad.addColorStop(1, '#b8860b');
  } else {
    grad.addColorStop(0, `hsl(${planet.hue}, 65%, 75%)`);
    grad.addColorStop(0.6, `hsl(${planet.hue}, 60%, 55%)`);
    grad.addColorStop(1, `hsl(${planet.hue}, 55%, 30%)`);
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.fill();

  // Gas giant bands
  if (planet.type === 'giant') {
    ctx.globalAlpha = 0.15;
    for (let b = -planet.radius * 0.6; b < planet.radius * 0.6; b += planet.radius * 0.3) {
      ctx.fillStyle = b > 0 ? `hsl(${planet.hue + 20}, 40%, 80%)` : `hsl(${planet.hue - 10}, 40%, 40%)`;
      ctx.beginPath();
      const bandW = Math.sqrt(planet.radius * planet.radius - b * b);
      ctx.ellipse(planet.x, planet.y + b, bandW, planet.radius * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Highlight (skip for asteroid — they're rougher)
  if (planet.type !== 'asteroid') {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(planet.x - planet.radius * 0.25, planet.y - planet.radius * 0.25, planet.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Asteroid: small random surface dots for texture
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    const seed = Math.floor(planet.hue * 10);
    for (let d = 0; d < 3; d++) {
      const ax = planet.x + Math.cos(seed + d * 2.1) * planet.radius * 0.4;
      const ay = planet.y + Math.sin(seed + d * 2.1) * planet.radius * 0.4;
      ctx.beginPath();
      ctx.arc(ax, ay, planet.radius * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function render() {
  const theme = THEMES[currentTheme];
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
  bgGrad.addColorStop(0, theme.bg);
  bgGrad.addColorStop(1, theme.bg2);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CW, CH);

  drawStarfield(time);

  // Draw trails
  for (const p of planets) {
    if (p.alive && !p.isStationary) drawTrail(p);
  }

  // Draw planets
  for (const p of planets) {
    if (!p.alive) continue;
    if (p.isStationary) {
      drawSun(p, time);
    } else {
      drawPlanet(p);
    }
  }

  drawParticles();

  // ── Drag-to-launch visuals ──
  if (isDragging && sunPlanted && !gameOver) {
    ctx.save();
    // Draw predicted orbit path
    if (predictedPath.length > 1) {
      for (let i = 1; i < predictedPath.length; i++) {
        const alpha = (1 - i / predictedPath.length) * 0.5;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(predictedPath[i - 1].x, predictedPath[i - 1].y);
        ctx.lineTo(predictedPath[i].x, predictedPath[i].y);
        ctx.stroke();
        // Dots every 10 steps
        if (i % 10 === 0) {
          ctx.fillStyle = `rgba(255,255,255,${alpha * 1.5})`;
          ctx.beginPath();
          ctx.arc(predictedPath[i].x, predictedPath[i].y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Draw launch arrow
    const arrowDx = dragStart.x - dragEnd.x;
    const arrowDy = dragStart.y - dragEnd.y;
    const arrowLen = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
    if (arrowLen > 5) {
      ctx.strokeStyle = 'rgba(255,215,0,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(dragStart.x + arrowDx * 0.5, dragStart.y + arrowDy * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Ghost planet at launch point
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(dragStart.x, dragStart.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Planet count + multiplier display
  if (gameStarted && sunPlanted && !gameOver) {
    const alive = planets.filter(p => p.alive && !p.isStationary).length;
    ctx.save();
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200,210,255,0.35)';
    ctx.fillText(`${alive}/${MAX_PLANETS - 1} ${I18N.t('gravPlanets')}`, CW - 12, 22);

    // Score multiplier
    if (scoreMultiplier > 1.05) {
      const mAlpha = Math.min((scoreMultiplier - 1) / 2, 1);
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = `rgba(255,215,0,${0.4 + mAlpha * 0.5})`;
      ctx.fillText(`x${scoreMultiplier.toFixed(1)}`, CW - 12, 40);
    }

    // Near-miss combo
    if (nearMissCombo > 0 && nearMissTimer > -2) {
      ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,230,100,${Math.max(0, 0.6 + nearMissTimer * 0.2)})`;
      ctx.fillText(`${I18N.t('gravNearMiss')} x${nearMissCombo}!`, CW / 2, CH - 20);
    }
    ctx.restore();
  }

  // Title screen overlay
  if (!gameStarted) {
    ctx.fillStyle = 'rgba(4,6,14,0.7)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(I18N.t('gravityGardenTitle') || 'Gravity Garden', CW / 2, CH / 2 - 20);
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(I18N.t('ggClickToPlant') || 'Click to plant your first star', CW / 2, CH / 2 + 20);
  }

  // "Click to plant first star" hint after game started but before sun
  if (gameStarted && !sunPlanted && !gameOver) {
    ctx.save();
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,215,0,${0.5 + Math.sin(time * 3) * 0.3})`;
    ctx.fillText(I18N.t('ggClickToPlant') || 'Click to plant your first star', CW / 2, CH / 2);
    ctx.restore();
  }

  // ── Object type toolbar ──
  if (gameStarted && sunPlanted && !gameOver) {
    ctx.save();
    const toolbarW = OBJ_TYPES.length * 50;
    const toolbarX = (CW - toolbarW) / 2;
    const toolbarY = CH - 52;

    // Background bar
    ctx.fillStyle = 'rgba(10,12,30,0.6)';
    ctx.beginPath();
    ctx.roundRect(toolbarX - 6, toolbarY - 4, toolbarW + 12, 44, 8);
    ctx.fill();

    for (let i = 0; i < OBJ_TYPES.length; i++) {
      const tx = toolbarX + i * 50 + 25;
      const ty = toolbarY + 18;
      const isSelected = i === selectedType;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.beginPath();
        ctx.roundRect(toolbarX + i * 50 + 2, toolbarY - 1, 46, 38, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Icon
      ctx.font = '20px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)';
      ctx.fillText(OBJ_TYPES[i].icon, tx, ty + 6);

      // Key number
      ctx.font = '9px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = isSelected ? 'rgba(255,215,0,0.8)' : 'rgba(200,210,255,0.3)';
      ctx.fillText(OBJ_TYPES[i].key, tx, toolbarY + 38);
    }

    // Selected type name
    ctx.font = '11px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,215,0,0.5)';
    ctx.fillText(OBJ_TYPES[selectedType].name + ' — ' + OBJ_TYPES[selectedType].desc, CW / 2, toolbarY - 10);

    ctx.restore();
  }

  // Drag hint after sun is planted and no planets yet
  if (gameStarted && sunPlanted && !gameOver && planets.filter(p => !p.isStationary).length === 0 && !isDragging) {
    ctx.save();
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(200,210,255,${0.3 + Math.sin(time * 2) * 0.2})`;
    ctx.fillText(I18N.t('gravDragHint'), CW / 2, CH - 70);
    ctx.restore();
  }

  // Game over overlay
  if (gameOver) {
    ctx.fillStyle = 'rgba(4,6,14,0.75)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(I18N.t('gameOver') || 'Game Over', CW / 2, CH / 2 - 50);
    ctx.font = '24px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.fillText(`${I18N.t('score') || 'Score'}: ${Math.floor(score)}`, CW / 2, CH / 2 - 5);
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(200,210,255,0.45)';
    ctx.fillText(`${I18N.t('gravPeakMultiplier')}: x${scoreMultiplier.toFixed(1)}  |  ${I18N.t('gravPlanetsPlanted')}: ${achData.stats.totalPlanetsPlanted}`, CW / 2, CH / 2 + 25);
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(I18N.t('tapToRestart') || 'Tap to restart', CW / 2, CH / 2 + 55);
  }
}

// ── Update ──
function update(dt) {
  time += dt;

  if (gameStarted && !gameOver && sunPlanted) {
    gameTime += dt;
    updatePhysics(dt);
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98; // drag
    p.vy *= 0.98;
    p.vy += 20 * dt; // slight gravity
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Check if all non-sun planets gone and sun alive — still playing, just no score ticking
  // Check if sun is gone — game over (handled in physics)
}

// ── Game loop ──
let lastTime = null;
function loop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
