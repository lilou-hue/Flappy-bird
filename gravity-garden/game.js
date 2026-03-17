/* ═══════════════════════════════════════════════════════════
   Gravity Garden – One-button physics sandbox
   ═══════════════════════════════════════════════════════════ */

// ── i18n ──
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();
window.addEventListener('langchange', () => { I18N.applyDOM(); renderAchList(); });

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
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
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

let achData = JSON.parse(localStorage.getItem('gravityGardenAch') || '{"unlocked":[],"stats":{"bestScore":0,"gamesPlayed":0,"totalPlanetsPlanted":0,"maxAlivePlanets":0,"longestPlanetLife":0}}');
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
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.6,
      maxLife: 1.4,
      size: 1.5 + Math.random() * 3,
      hue: i < 20 ? hue1 + (Math.random() - 0.5) * 30 : hue2 + (Math.random() - 0.5) * 30,
    });
  }
}

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

document.getElementById('bestScore').textContent = bestScore;

function resetGame() {
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
  document.getElementById('score').textContent = '0';

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

function plantPlanet(x, y) {
  if (planets.length >= MAX_PLANETS) return;

  const sun = planets[0];
  if (!sun || !sun.alive) return;

  const dx = x - sun.x;
  const dy = y - sun.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < sun.radius + 10) return; // Too close to sun

  // Orbital velocity: v = sqrt(G*M/r), perpendicular to sun
  const orbitalSpeed = Math.sqrt(G * sun.mass / dist);
  const jitter = 0.85 + Math.random() * 0.3; // ±15% jitter
  const speed = orbitalSpeed * jitter;

  // Perpendicular direction (clockwise or counter-clockwise randomly)
  const nx = dx / dist;
  const ny = dy / dist;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const vx = -ny * speed * dir;
  const vy = nx * speed * dir;

  const hue = PLANET_HUES[Math.floor(Math.random() * PLANET_HUES.length)];
  const mass = 3 + Math.random() * 5;
  const radius = 5 + Math.random() * 6;

  const planet = new Planet(x, y, mass, radius, hue, false);
  planet.vx = vx;
  planet.vy = vy;
  planet.birthTime = gameTime;
  planets.push(planet);

  achData.stats.totalPlanetsPlanted++;
  Audio.playPlant();
}

function endGame() {
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

  if (finalScore > bestScore) {
    bestScore = finalScore;
    localStorage.setItem('gravityGardenBest', bestScore);
    document.getElementById('bestScore').textContent = bestScore;
  }

  // Submit to leaderboard
  try { initLB(); Leaderboard.submitScore('gravity-garden', finalScore); } catch (e) {}
  if (typeof Arcade !== 'undefined') {
    Arcade.onGameOver('gravity-garden', finalScore);
    document.body.appendChild(Arcade.createScoreCard('gravity-garden', finalScore, bestScore));
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
        a.alive = false;
        b.alive = false;

        // If sun destroyed, game over
        if (a.isStationary || b.isStationary) {
          // Remove dead planets
          planets = planets.filter(p => p.alive);
          endGame();
          return;
        }
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

    // Trail
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > TRAIL_LEN) p.trail.shift();

    // Escape check (non-sun only)
    if (!p.isStationary) {
      if (p.x < -ESCAPE_MARGIN || p.x > CW + ESCAPE_MARGIN ||
          p.y < -ESCAPE_MARGIN || p.y > CH + ESCAPE_MARGIN) {
        p.alive = false;
        planets.splice(i, 1);
      }
    }
  }

  // Score: alive non-sun planets * dt * 10
  const alivePlanets = planets.filter(p => p.alive && !p.isStationary).length;
  if (alivePlanets > 0) {
    score += alivePlanets * dt * 10;
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

// ── Controls ──
function handleInput(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CW / rect.width;
  const scaleY = CH / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;

  if (gameOver) { resetGame(); return; }
  if (!gameStarted) { resetGame(); return; }

  if (!sunPlanted) {
    plantSun(cx, cy);
  } else {
    plantPlanet(cx, cy);
  }
}

canvas.addEventListener('pointerdown', e => { e.preventDefault(); handleInput(e); });

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
  for (let i = 1; i < planet.trail.length; i++) {
    const alpha = (i / planet.trail.length) * 0.4;
    ctx.strokeStyle = `hsla(${planet.hue}, 70%, 60%, ${alpha})`;
    ctx.lineWidth = 1.5;
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
  ctx.shadowBlur = 12;
  ctx.shadowColor = `hsla(${planet.hue}, 70%, 50%, 0.5)`;

  const grad = ctx.createRadialGradient(
    planet.x - planet.radius * 0.3, planet.y - planet.radius * 0.3, planet.radius * 0.1,
    planet.x, planet.y, planet.radius
  );
  grad.addColorStop(0, `hsl(${planet.hue}, 65%, 75%)`);
  grad.addColorStop(0.6, `hsl(${planet.hue}, 60%, 55%)`);
  grad.addColorStop(1, `hsl(${planet.hue}, 55%, 30%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(planet.x - planet.radius * 0.25, planet.y - planet.radius * 0.25, planet.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

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

  // Planet count display
  if (gameStarted && sunPlanted && !gameOver) {
    const alive = planets.filter(p => p.alive && !p.isStationary).length;
    ctx.save();
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200,210,255,0.35)';
    ctx.fillText(`${alive}/${MAX_PLANETS - 1} planets`, CW - 12, 22);
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

  // Game over overlay
  if (gameOver) {
    ctx.fillStyle = 'rgba(4,6,14,0.75)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(I18N.t('gameOver') || 'Game Over', CW / 2, CH / 2 - 30);
    ctx.font = '24px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.fillText(`${I18N.t('score') || 'Score'}: ${Math.floor(score)}`, CW / 2, CH / 2 + 15);
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(I18N.t('tapToRestart') || 'Tap to restart', CW / 2, CH / 2 + 50);
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
let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
