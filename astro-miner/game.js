/* ================================================================
   Astro Miner — Space Platformer Game
   ================================================================ */

/* ellipse polyfill for older browsers */
if (!CanvasRenderingContext2D.prototype.ellipse) {
  CanvasRenderingContext2D.prototype.ellipse = function (cx, cy, rx, ry, rot, start, end, ccw) {
    this.save();
    this.translate(cx, cy);
    this.rotate(rot);
    this.scale(rx, ry);
    this.arc(0, 0, 1, start, end, ccw);
    this.restore();
  };
}

const CONFIG = {
  width: 960,
  height: 540,
  gravity: 600,
  jumpForce: -320,
  jetpackForce: -450,
  fuelMax: 1.5,
  fuelBurnRate: 1.0,
  fuelRechargeRate: 0.6,
  coyoteTime: 0.1,
  jumpBuffer: 0.1,
  maxDt: 0.033,
  playerWidth: 24,
  playerHeight: 32,
  moveSpeed: 180,
  scrollSpeed: { start: 140, cap: 280, scaleScore: 80 },
  asteroidMinW: 80,
  asteroidMaxW: 180,
  asteroidMinH: 20,
  asteroidMaxH: 40,
  asteroidGap: { min: 100, max: 200 },
  crystalSize: 14,
  gravityTypes: { normal: 1.0, low: 0.5, high: 1.6 },
  gravityColors: { normal: '#888', low: '#4fc3f7', high: '#ef5350' },
  gravityGlow: { normal: 'rgba(200,200,200,0.1)', low: 'rgba(79,195,247,0.25)', high: 'rgba(239,83,80,0.25)' },
  debrisSize: 18,
  laserWarning: 0.5,
  laserOnTime: 1.0,
  laserOffTime: 1.5,
  blackHolePullRadius: 120,
  blackHoleKillRadius: 25,
  blackHolePullStrength: 150,
};

const STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', CRASHING: 'crashing', GAMEOVER: 'gameover' };

const ACHIEVEMENTS = [
  { id: 'first_crystal',    icon: '\uD83D\uDC8E', name: 'achFirstCrystal',    desc: 'achFirstCrystalDesc',    check: (s) => s.totalCrystals >= 1 },
  { id: 'crystal_hoarder',  icon: '\uD83D\uDCB0', name: 'achCrystalHoarder',  desc: 'achCrystalHoarderDesc',  check: (s) => s.totalCrystals >= 100 },
  { id: 'asteroid_hopper',  icon: '\uD83E\uDEA8', name: 'achAsteroidHopper',  desc: 'achAsteroidHopperDesc',  check: (s) => s.asteroidsThisRun >= 20 },
  { id: 'fuel_efficient',   icon: '\uD83D\uDE80', name: 'achFuelEfficient',   desc: 'achFuelEfficientDesc',   check: (s) => s.noJetpackScore >= 15 },
  { id: 'low_grav_master',  icon: '\uD83C\uDF00', name: 'achLowGravMaster',   desc: 'achLowGravMasterDesc',   check: (s) => s.lowGravLandsThisRun >= 10 },
  { id: 'gravity_surfer',   icon: '\u26A1',        name: 'achGravitySurfer',   desc: 'achGravitySurferDesc',   check: (s) => s.totalGravTransitions >= 50 },
  { id: 'black_hole_dodge', icon: '\uD83D\uDD73',  name: 'achBlackHoleDodge',  desc: 'achBlackHoleDodgeDesc',  check: (s) => s.blackHoleEscapes >= 5 },
  { id: 'marathon_miner',   icon: '\u23F1',        name: 'achMarathonMiner',   desc: 'achMarathonMinerDesc',   check: (s) => s.longestTime >= 120 },
  { id: 'score_50',         icon: '\u2B50',        name: 'achScore50',         desc: 'achScore50Desc',         check: (s) => s.bestScore >= 50 },
];

/* --- DOM --- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreNode = document.getElementById('score');
const bestNode = document.getElementById('best');
const fuelBar = document.getElementById('fuelBar');
const gravityNode = document.getElementById('gravity');
const crystalsNode = document.getElementById('crystals');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const achievementsToggle = document.getElementById('achievementsToggle');
const achievementsList = document.getElementById('achievementsList');
const achievementPopup = document.getElementById('achievementPopup');
const achievementPopupIcon = document.getElementById('achievementPopupIcon');
const achievementPopupTitle = document.getElementById('achievementPopupTitle');
const achievementPopupDesc = document.getElementById('achievementPopupDesc');

/* --- Game State --- */
let state = STATE.MENU;
let player = {};
let asteroids = [];
let crystals = [];
let hazards = [];
let stars = [];
let particles = [];
let score = 0;
let bestScore = 0;
let crystalCount = 0;
let scrollSpeed = CONFIG.scrollSpeed.start;
let runTime = 0;
let crashTimer = 0;
let lastTime = 0;
let animFrame = 0;

/* --- Nebula drift data (module-level) --- */
const nebulaPatches = [
  { cx: CONFIG.width * 0.2, cy: CONFIG.height * 0.3, r: 180, color: [100, 20, 140], vx: 8, vy: 3 },
  { cx: CONFIG.width * 0.7, cy: CONFIG.height * 0.6, r: 200, color: [20, 80, 100], vx: -6, vy: 5 },
  { cx: CONFIG.width * 0.5, cy: CONFIG.height * 0.15, r: 150, color: [120, 30, 80], vx: 10, vy: -4 },
];

/* --- Persistent Stats --- */
let stats = {
  totalCrystals: 0,
  totalGravTransitions: 0,
  bestScore: 0,
  blackHoleEscapes: 0,
  /* Per-run stats reset on game start */
  asteroidsThisRun: 0,
  lowGravLandsThisRun: 0,
  noJetpackScore: 0,
  longestTime: 0,
  usedJetpack: false,
};

let achUnlocked = [];

/* --- Input State --- */
const keys = {};
let jumpPressed = false;
let jumpBufferTimer = 0;
let touchActive = false;

/* --- Load persistent data --- */
function loadData() {
  bestScore = Number(localStorage.getItem('astroMinerBest')) || 0;
  bestNode.textContent = bestScore;
  try {
    const saved = JSON.parse(localStorage.getItem('astroMinerAch') || '{}');
    achUnlocked = Array.isArray(saved.unlocked) ? saved.unlocked : [];
    stats.totalCrystals = Number(saved.totalCrystals) || 0;
    stats.totalGravTransitions = Number(saved.totalGravTransitions) || 0;
    stats.blackHoleEscapes = Number(saved.blackHoleEscapes) || 0;
    stats.bestScore = bestScore;
  } catch (e) { achUnlocked = []; }
}

function saveData() {
  try {
    localStorage.setItem('astroMinerBest', String(bestScore));
    localStorage.setItem('astroMinerAch', JSON.stringify({
      unlocked: achUnlocked,
      totalCrystals: stats.totalCrystals,
      totalGravTransitions: stats.totalGravTransitions,
      blackHoleEscapes: stats.blackHoleEscapes,
    }));
  } catch (e) { /* storage full */ }
}

/* --- i18n helper --- */
function t(key, fallback) {
  if (typeof I18N !== 'undefined' && I18N.t) return I18N.t(key) || fallback;
  return fallback;
}

/* --- Star field --- */
function initStars() {
  stars = [];
  for (let layer = 0; layer < 3; layer++) {
    const count = 40 + layer * 30;
    const speed = 0.1 + layer * 0.15;
    const size = 0.5 + layer * 0.5;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * CONFIG.width,
        y: Math.random() * CONFIG.height,
        size: size + Math.random() * 0.5,
        speed: speed,
        layer: layer,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }
}

/* --- Player --- */
function resetPlayer() {
  player = {
    x: 200,
    y: CONFIG.height * 0.4,
    vy: 0,
    vx: 0,
    width: CONFIG.playerWidth,
    height: CONFIG.playerHeight,
    onGround: false,
    fuel: CONFIG.fuelMax,
    coyoteTimer: 0,
    currentGravity: 'normal',
    jetpackActive: false,
    flameTimer: 0,
    landedAsteroid: null,
    bobPhase: 0,
  };
}

/* --- Asteroid generation --- */
function randomGravityType() {
  const r = Math.random();
  if (r < 0.6) return 'normal';
  if (r < 0.8) return 'low';
  return 'high';
}

function generateAsteroidShape(w, h) {
  const points = [];
  const numPoints = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const rx = w / 2 * (0.7 + Math.random() * 0.3);
    const ry = h / 2 * (0.7 + Math.random() * 0.3);
    points.push({
      x: Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
    });
  }
  return points;
}

function spawnAsteroid(startX) {
  const w = CONFIG.asteroidMinW + Math.random() * (CONFIG.asteroidMaxW - CONFIG.asteroidMinW);
  const h = CONFIG.asteroidMinH + Math.random() * (CONFIG.asteroidMaxH - CONFIG.asteroidMinH);

  let y;
  if (asteroids.length === 0) {
    y = CONFIG.height * 0.6;
  } else {
    const prev = asteroids[asteroids.length - 1];
    /* Constrain Y so player can reach from previous asteroid via jump */
    const maxJumpHeight = (CONFIG.jumpForce * CONFIG.jumpForce) / (2 * CONFIG.gravity * 0.5);
    const minY = Math.max(80, prev.y - maxJumpHeight * 0.8);
    const maxY = Math.min(CONFIG.height - 80, prev.y + maxJumpHeight * 0.5);
    y = minY + Math.random() * (maxY - minY);
  }

  const gravType = randomGravityType();
  const shape = generateAsteroidShape(w, h);
  const x = startX || CONFIG.width + 50;

  asteroids.push({
    x, y, w, h, gravType, shape,
    scored: false,
  });

  /* Place crystal above asteroid */
  if (Math.random() < 0.6) {
    crystals.push({
      x: x + w * 0.3 + Math.random() * w * 0.4,
      y: y - h / 2 - 20 - Math.random() * 30,
      size: CONFIG.crystalSize,
      collected: false,
      rotation: Math.random() * Math.PI * 2,
    });
  }
}

function initAsteroids() {
  asteroids = [];
  crystals = [];
  /* Starting platform */
  asteroids.push({
    x: 100,
    y: CONFIG.height * 0.65,
    w: 160,
    h: 30,
    gravType: 'normal',
    shape: generateAsteroidShape(160, 30),
    scored: false,
  });
  /* Pre-generate some asteroids */
  for (let i = 0; i < 6; i++) {
    spawnAsteroid(300 + i * 150);
  }
}

/* --- Hazard generation --- */
function spawnDebris(x) {
  hazards.push({
    type: 'debris',
    x: x || CONFIG.width + 30,
    y: 80 + Math.random() * (CONFIG.height - 180),
    w: CONFIG.debrisSize,
    h: CONFIG.debrisSize,
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 0.4,
    rotation: Math.random() * Math.PI * 2,
  });
}

function spawnLaser(x) {
  const y1 = 50 + Math.random() * (CONFIG.height * 0.3);
  const y2 = y1 + 100 + Math.random() * 200;
  hazards.push({
    type: 'laser',
    x: x || CONFIG.width + 30,
    y1, y2,
    timer: 0,
    state: 'warning', /* warning -> on -> off -> warning ... */
    w: 6,
  });
}

function spawnBlackHole(x) {
  hazards.push({
    type: 'blackhole',
    x: x || CONFIG.width + 60,
    y: 100 + Math.random() * (CONFIG.height - 200),
    radius: CONFIG.blackHoleKillRadius,
    pullRadius: CONFIG.blackHolePullRadius,
    rotation: 0,
    playerInRange: false,
    escapeTracked: false,
  });
}

/* --- Particles --- */
function emitParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = (speed || 60) * (0.5 + Math.random());
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      size: 2 + Math.random() * 3,
      color: color,
    });
  }
}

/* --- Difficulty scaling --- */
function getDifficulty() {
  const prog = Math.min(1, score / CONFIG.scrollSpeed.scaleScore);
  return {
    scrollSpeed: CONFIG.scrollSpeed.start + (CONFIG.scrollSpeed.cap - CONFIG.scrollSpeed.start) * prog,
    hazardRate: 0.01 + prog * 0.025,
  };
}

/* --- Collision helpers --- */
function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function distSq(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

function playerOnAsteroid(p, a) {
  /* Check if player is standing on top of asteroid */
  const px = p.x - p.width / 2;
  const py = p.y - p.height / 2;
  const ax = a.x;
  const ay = a.y - a.h / 2;

  /* Horizontal overlap */
  if (px + p.width < ax || px > ax + a.w) return false;

  /* Player feet near asteroid top */
  const feetY = py + p.height;
  if (feetY >= ay - 8 && feetY <= ay + 12 && p.vy >= -20) return true;

  return false;
}

/* --- Game Reset --- */
function resetGame() {
  resetPlayer();
  initAsteroids();
  hazards = [];
  particles = [];
  score = 0;
  crystalCount = 0;
  scrollSpeed = CONFIG.scrollSpeed.start;
  runTime = 0;
  crashTimer = 0;
  stats.asteroidsThisRun = 0;
  stats.lowGravLandsThisRun = 0;
  stats.noJetpackScore = score;
  stats.usedJetpack = false;
  stats.longestTime = 0;
  scoreNode.textContent = '0';
  crystalsNode.textContent = '0';
  gravityNode.textContent = t('amGravNormal', 'Normal');
  fuelBar.style.width = '100%';
  restartBtn.hidden = true;
}

/* --- State transitions --- */
function startGame() {
  resetGame();
  state = STATE.PLAYING;
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  Audio.resume();
  Audio.startDrone();
}

function pauseGame() {
  if (state === STATE.PLAYING) state = STATE.PAUSED;
}

function resumeGame() {
  if (state === STATE.PAUSED) {
    state = STATE.PLAYING;
    lastTime = performance.now();
  }
}

function killPlayer() {
  if (state !== STATE.PLAYING) return;
  state = STATE.CRASHING;
  crashTimer = 1.2;
  Audio.crash();
  emitParticles(player.x, player.y, '#ff6633', 20, 100);
}

let isNewBest = false;

function endGame() {
  state = STATE.GAMEOVER;
  Audio.stopDrone();
  isNewBest = false;
  if (score > bestScore) {
    bestScore = score;
    bestNode.textContent = bestScore;
    isNewBest = true;
    Audio.newHighScore();
  }
  stats.bestScore = bestScore;
  stats.longestTime = Math.max(stats.longestTime, runTime);
  if (!stats.usedJetpack) stats.noJetpackScore = score;
  saveData();
  checkAchievements();
  restartBtn.hidden = false;

  /* Submit leaderboard score */
  if (typeof Leaderboard !== 'undefined') {
    Leaderboard.submitScore('astro-miner', score).then(() => Leaderboard.refresh('astro-miner'));
  }
}

/* --- Achievements --- */
function checkAchievements() {
  for (const ach of ACHIEVEMENTS) {
    if (achUnlocked.includes(ach.id)) continue;
    if (ach.check(stats)) {
      achUnlocked.push(ach.id);
      showAchievementPopup(ach);
    }
  }
  saveData();
  renderAchievementsList();
}

function showAchievementPopup(ach) {
  Audio.achievement();
  achievementPopupIcon.textContent = ach.icon;
  achievementPopupTitle.textContent = t(ach.name, ach.name);
  achievementPopupDesc.textContent = t(ach.desc, ach.desc);
  achievementPopup.classList.add('show');
  setTimeout(() => achievementPopup.classList.remove('show'), 3000);
}

function renderAchievementsList() {
  achievementsList.innerHTML = '';
  for (const ach of ACHIEVEMENTS) {
    const unlocked = achUnlocked.includes(ach.id);
    const el = document.createElement('div');
    el.className = 'achievement-item' + (unlocked ? ' unlocked' : '');
    el.innerHTML = '<span class="achievement-item__icon">' + ach.icon + '</span>' +
      '<span>' + t(ach.name, ach.name) + '</span>';
    achievementsList.appendChild(el);
  }
}

/* --- Physics Update --- */
function update(dt) {
  if (state === STATE.CRASHING) {
    crashTimer -= dt;
    if (crashTimer <= 0) endGame();
    /* Particles still update */
    updateParticles(dt);
    return;
  }
  if (state !== STATE.PLAYING) return;

  runTime += dt;
  const diff = getDifficulty();
  scrollSpeed = diff.scrollSpeed;

  /* --- Input processing --- */
  const wantJump = keys[' '] || keys['Space'] || touchActive;
  const moveLeft = keys['a'] || keys['A'] || keys['ArrowLeft'];
  const moveRight = keys['d'] || keys['D'] || keys['ArrowRight'];

  /* Jump buffer */
  if (jumpPressed) {
    jumpBufferTimer = CONFIG.jumpBuffer;
    jumpPressed = false;
  }
  if (jumpBufferTimer > 0) jumpBufferTimer -= dt;

  /* --- Player physics --- */
  const gravMult = CONFIG.gravityTypes[player.currentGravity] || 1.0;
  const effectiveGravity = CONFIG.gravity * gravMult;

  /* Coyote time */
  if (player.onGround) {
    player.coyoteTimer = CONFIG.coyoteTime;
  } else {
    player.coyoteTimer -= dt;
  }

  /* Jump */
  const canJump = player.coyoteTimer > 0;
  if (jumpBufferTimer > 0 && canJump) {
    player.vy = CONFIG.jumpForce * (gravMult < 1 ? 0.8 : gravMult > 1 ? 1.2 : 1.0);
    player.onGround = false;
    player.coyoteTimer = 0;
    jumpBufferTimer = 0;
    player.landedAsteroid = null;
    Audio.jump();
  }

  /* Jetpack */
  player.jetpackActive = false;
  if (wantJump && !player.onGround && player.fuel > 0) {
    player.vy += CONFIG.jetpackForce * dt;
    player.fuel -= CONFIG.fuelBurnRate * dt;
    if (player.fuel < 0) player.fuel = 0;
    player.jetpackActive = true;
    player.flameTimer += dt;
    stats.usedJetpack = true;
    if (Math.random() < 0.3) Audio.jetpack();
  } else {
    player.flameTimer = 0;
    /* Idle bobbing phase (accumulate when jetpack is off) */
    player.bobPhase += dt * 2.5;
  }

  /* Fuel recharge on ground */
  if (player.onGround) {
    player.fuel = Math.min(CONFIG.fuelMax, player.fuel + CONFIG.fuelRechargeRate * dt);
  }

  /* Gravity */
  if (!player.onGround) {
    player.vy += effectiveGravity * dt;
  }

  /* Horizontal movement */
  if (moveLeft) player.vx = -CONFIG.moveSpeed;
  else if (moveRight) player.vx = CONFIG.moveSpeed;
  else player.vx = 0;

  /* Apply velocities */
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  /* Keep player on screen horizontally */
  player.x = Math.max(player.width / 2, Math.min(CONFIG.width - player.width / 2, player.x));

  /* Death by falling off screen */
  if (player.y > CONFIG.height + 50) {
    killPlayer();
    return;
  }
  if (player.y < -50) {
    player.y = -50;
    player.vy = Math.max(0, player.vy);
  }

  /* --- Scroll world --- */
  const scrollDt = scrollSpeed * dt;

  /* Move asteroids */
  player.onGround = false;
  let prevGravity = player.currentGravity;
  player.currentGravity = 'normal';

  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    a.x -= scrollDt;

    /* Check if player is on this asteroid */
    if (playerOnAsteroid(player, a)) {
      player.onGround = true;
      player.y = a.y - a.h / 2 - player.height / 2;
      player.vy = 0;
      player.currentGravity = a.gravType;
      if (player.landedAsteroid !== a) {
        player.landedAsteroid = a;
        stats.asteroidsThisRun++;
        if (a.gravType === 'low') stats.lowGravLandsThisRun++;
        Audio.land();
      }
    }

    /* Score when asteroid passes player */
    if (!a.scored && a.x + a.w < player.x) {
      a.scored = true;
      score++;
      scoreNode.textContent = score;
    }

    /* Remove off-screen asteroids */
    if (a.x + a.w < -50) {
      asteroids.splice(i, 1);
    }
  }

  /* Track gravity transitions */
  if (player.currentGravity !== prevGravity && player.onGround) {
    stats.totalGravTransitions++;
    Audio.gravityShift();
  }

  /* Update HUD gravity display */
  const gravLabels = { normal: t('amGravNormal', 'Normal'), low: t('amGravLow', 'Low-G'), high: t('amGravHigh', 'High-G') };
  gravityNode.textContent = gravLabels[player.currentGravity] || 'Normal';

  /* Update fuel bar */
  fuelBar.style.width = (player.fuel / CONFIG.fuelMax * 100) + '%';

  /* --- Spawn new asteroids --- */
  const lastAsteroid = asteroids[asteroids.length - 1];
  if (!lastAsteroid || lastAsteroid.x + lastAsteroid.w < CONFIG.width + 50) {
    const gap = CONFIG.asteroidGap.min + Math.random() * (CONFIG.asteroidGap.max - CONFIG.asteroidGap.min);
    const spawnX = lastAsteroid ? lastAsteroid.x + lastAsteroid.w + gap : CONFIG.width + 50;
    spawnAsteroid(spawnX);
  }

  /* --- Move & check crystals --- */
  for (let i = crystals.length - 1; i >= 0; i--) {
    const c = crystals[i];
    c.x -= scrollDt;
    c.rotation += dt * 2;

    if (!c.collected) {
      const dx = player.x - c.x;
      const dy = player.y - c.y;
      if (dx * dx + dy * dy < (c.size + player.width / 2) * (c.size + player.width / 2)) {
        c.collected = true;
        crystalCount++;
        stats.totalCrystals++;
        crystalsNode.textContent = crystalCount;
        Audio.crystal();
        emitParticles(c.x, c.y, '#00e5ff', 8, 50);
      }
    }

    if (c.x < -30) crystals.splice(i, 1);
  }

  /* --- Hazard spawning (rate is per-second, convert via dt) --- */
  if (score > 5 && Math.random() < diff.hazardRate * dt * 60) {
    const r = Math.random();
    if (r < 0.5) spawnDebris();
    else if (r < 0.8) spawnLaser();
    else spawnBlackHole();
  }

  /* --- Update hazards --- */
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];

    if (h.type === 'debris') {
      h.x -= scrollDt * h.speed;
      h.y += Math.sin(h.phase + runTime * 2) * 40 * dt;
      h.rotation += dt * 1.5;
      /* Collision */
      if (rectOverlap(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height,
                       h.x - h.w / 2, h.y - h.h / 2, h.w, h.h)) {
        killPlayer();
        return;
      }
      if (h.x < -40) { hazards.splice(i, 1); continue; }
    }

    if (h.type === 'laser') {
      h.x -= scrollDt * 0.3;
      h.timer += dt;
      if (h.state === 'warning' && h.timer >= CONFIG.laserWarning) {
        h.state = 'on';
        h.timer = 0;
        Audio.laserBuzz();
      } else if (h.state === 'on' && h.timer >= CONFIG.laserOnTime) {
        h.state = 'off';
        h.timer = 0;
      } else if (h.state === 'off' && h.timer >= CONFIG.laserOffTime) {
        h.state = 'warning';
        h.timer = 0;
      }
      /* Collision when on */
      if (h.state === 'on') {
        if (player.x > h.x - h.w / 2 && player.x < h.x + h.w / 2 &&
            player.y > h.y1 && player.y < h.y2) {
          killPlayer();
          return;
        }
      }
      if (h.x < -20) { hazards.splice(i, 1); continue; }
    }

    if (h.type === 'blackhole') {
      h.x -= scrollDt * 0.2;
      h.rotation += dt * 1.5;
      const d = Math.sqrt(distSq(player.x, player.y, h.x, h.y));

      if (d < h.pullRadius) {
        /* Gravitational pull */
        if (!h.playerInRange) Audio.blackHoleRumble();
        const pullForce = CONFIG.blackHolePullStrength * (1 - d / h.pullRadius);
        const angle = Math.atan2(h.y - player.y, h.x - player.x);
        player.vx += Math.cos(angle) * pullForce * dt;
        player.vy += Math.sin(angle) * pullForce * dt;
        h.playerInRange = true;

        if (d < h.radius) {
          killPlayer();
          return;
        }
      } else {
        if (h.playerInRange && !h.escapeTracked) {
          stats.blackHoleEscapes++;
          h.escapeTracked = true;
        }
        h.playerInRange = false;
      }

      if (h.x < -60) { hazards.splice(i, 1); continue; }
    }
  }

  /* --- Update nebulae (drift + soft bounce) --- */
  for (const nb of nebulaPatches) {
    nb.cx += nb.vx * dt;
    nb.cy += nb.vy * dt;
    if (nb.cx - nb.r < 0 || nb.cx + nb.r > CONFIG.width) nb.vx = -nb.vx;
    if (nb.cy - nb.r < 0 || nb.cy + nb.r > CONFIG.height) nb.vy = -nb.vy;
  }

  /* --- Update stars --- */
  for (const s of stars) {
    s.x -= scrollDt * s.speed;
    if (s.x < -5) s.x = CONFIG.width + 5;
    s.twinkle += dt * (1 + s.layer);
  }

  /* --- Update particles --- */
  updateParticles(dt);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); }
  }
}

/* --- Rendering --- */
function render() {
  const W = CONFIG.width;
  const H = CONFIG.height;

  /* Background */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0520');
  bg.addColorStop(0.5, '#0f0625');
  bg.addColorStop(1, '#1a0a3a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* Nebula patches (drifting) */
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const nb of nebulaPatches) {
    const ng = ctx.createRadialGradient(nb.cx, nb.cy, 0, nb.cx, nb.cy, nb.r);
    ng.addColorStop(0, `rgba(${nb.color[0]},${nb.color[1]},${nb.color[2]},0.06)`);
    ng.addColorStop(0.5, `rgba(${nb.color[0]},${nb.color[1]},${nb.color[2]},0.03)`);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(nb.cx - nb.r, nb.cy - nb.r, nb.r * 2, nb.r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  /* Distant planet */
  ctx.save();
  const planetX = W * 0.8;
  const planetY = H * 0.15;
  const planetR = 30;
  const planetGrad = ctx.createRadialGradient(planetX - 8, planetY - 8, 2, planetX, planetY, planetR);
  planetGrad.addColorStop(0, '#4a6fa5');
  planetGrad.addColorStop(0.6, '#1a3355');
  planetGrad.addColorStop(1, '#0a1525');
  ctx.fillStyle = planetGrad;
  ctx.beginPath();
  ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
  ctx.fill();
  /* Atmosphere ring */
  ctx.strokeStyle = 'rgba(100,160,220,0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(planetX, planetY, planetR + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(100,160,220,0.07)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(planetX, planetY, planetR + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  /* Stars (round) */
  for (const s of stars) {
    const alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
    ctx.fillStyle = s.layer === 0 ? `rgba(200,200,255,${alpha * 0.5})` :
                    s.layer === 1 ? `rgba(180,220,255,${alpha * 0.7})` :
                                    `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Asteroids */
  for (const a of asteroids) {
    ctx.save();
    ctx.translate(a.x + a.w / 2, a.y);

    /* Gravity glow */
    const glow = ctx.createRadialGradient(0, 0, a.w * 0.2, 0, 0, a.w * 0.7);
    glow.addColorStop(0, CONFIG.gravityGlow[a.gravType]);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(-a.w, -a.h * 2, a.w * 2, a.h * 4);

    /* Asteroid body */
    ctx.beginPath();
    for (let i = 0; i < a.shape.length; i++) {
      const p = a.shape[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();

    const bodyColor = CONFIG.gravityColors[a.gravType];
    const grad = ctx.createLinearGradient(-a.w / 2, -a.h / 2, a.w / 2, a.h / 2);
    grad.addColorStop(0, bodyColor);
    grad.addColorStop(1, darkenColor(bodyColor, 0.5));
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = lightenColor(bodyColor, 0.3);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* Craters — pseudo-random based on asteroid position */
    ctx.save();
    ctx.clip(); /* clip craters to asteroid shape */
    const craterSeed = Math.abs(Math.floor(a.w * 7 + a.h * 13));
    const craterColor = darkenColor(bodyColor, 0.3);
    const craterCount = 3 + (craterSeed % 3);
    for (let ci = 0; ci < craterCount; ci++) {
      const ca = (craterSeed * (ci + 1) * 31) % 1000 / 1000;
      const cb = (craterSeed * (ci + 1) * 47) % 1000 / 1000;
      const cx = (ca - 0.5) * a.w * 0.6;
      const cy = (cb - 0.5) * a.h * 0.6;
      const cr = 2 + (craterSeed * (ci + 1)) % 5;
      ctx.fillStyle = craterColor;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* Mineral vein lines */
    ctx.save();
    /* Re-clip to asteroid shape */
    ctx.beginPath();
    for (let i = 0; i < a.shape.length; i++) {
      const p = a.shape[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = lightenColor(bodyColor, 0.5);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    const veinSeed = craterSeed * 3;
    for (let vi = 0; vi < 2; vi++) {
      const vx1 = ((veinSeed * (vi + 1) * 23) % 1000 / 1000 - 0.5) * a.w * 0.7;
      const vy1 = ((veinSeed * (vi + 1) * 37) % 1000 / 1000 - 0.5) * a.h * 0.7;
      const vx2 = ((veinSeed * (vi + 1) * 59) % 1000 / 1000 - 0.5) * a.w * 0.7;
      const vy2 = ((veinSeed * (vi + 1) * 71) % 1000 / 1000 - 0.5) * a.h * 0.7;
      ctx.beginPath();
      ctx.moveTo(vx1, vy1);
      ctx.lineTo(vx2, vy2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    /* Specular highlight */
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < a.shape.length; i++) {
      const p = a.shape[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-a.w * 0.2, -a.h * 0.25, a.w * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.restore();
  }

  /* Crystals */
  for (const c of crystals) {
    if (c.collected) continue;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);

    /* Pulsing glow */
    const glowPulse = 12 + Math.sin(runTime * 4) * 6;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = glowPulse;

    /* Hexagonal diamond shape (6 points) */
    const s = c.size;
    ctx.beginPath();
    ctx.moveTo(0, -s);                /* top */
    ctx.lineTo(s * 0.55, -s * 0.35); /* upper right */
    ctx.lineTo(s * 0.55, s * 0.35);  /* lower right */
    ctx.lineTo(0, s);                 /* bottom */
    ctx.lineTo(-s * 0.55, s * 0.35); /* lower left */
    ctx.lineTo(-s * 0.55, -s * 0.35);/* upper left */
    ctx.closePath();

    const cg = ctx.createLinearGradient(0, -s, 0, s);
    cg.addColorStop(0, '#00e5ff');
    cg.addColorStop(0.3, '#80f0ff');
    cg.addColorStop(0.6, '#00e5ff');
    cg.addColorStop(1, '#00b8d4');
    ctx.fillStyle = cg;
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    /* Inner facet lines */
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(0, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.35);
    ctx.lineTo(s * 0.55, s * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 0.35);
    ctx.lineTo(-s * 0.55, s * 0.35);
    ctx.stroke();

    ctx.restore();

    /* Sparkle particles orbiting (drawn in world space) */
    ctx.save();
    for (let si = 0; si < 2; si++) {
      const orbitAngle = runTime * 3 + si * Math.PI;
      const orbitR = s * 1.2;
      const sx = c.x + Math.cos(orbitAngle) * orbitR;
      const sy = c.y + Math.sin(orbitAngle) * orbitR;
      const sparkAlpha = 0.5 + Math.sin(runTime * 6 + si) * 0.3;
      ctx.fillStyle = `rgba(200,245,255,${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* Hazards */
  for (const h of hazards) {
    if (h.type === 'debris') {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rotation);

      /* Gradient fill */
      const debrisGrad = ctx.createLinearGradient(-h.w / 2, -h.h / 2, h.w / 2, h.h / 2);
      debrisGrad.addColorStop(0, '#8d6e63');
      debrisGrad.addColorStop(1, '#4e342e');
      ctx.fillStyle = debrisGrad;
      ctx.beginPath();
      ctx.moveTo(-h.w / 2, -h.h / 3);
      ctx.lineTo(0, -h.h / 2);
      ctx.lineTo(h.w / 2, -h.h / 4);
      ctx.lineTo(h.w / 3, h.h / 2);
      ctx.lineTo(-h.w / 3, h.h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a1887f';
      ctx.lineWidth = 1;
      ctx.stroke();

      /* Crater dots on debris */
      ctx.fillStyle = 'rgba(40,20,10,0.5)';
      ctx.beginPath(); ctx.arc(-2, 1, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-1, -3, 1, 0, Math.PI * 2); ctx.fill();

      ctx.restore();

      /* Tumbling trail (in world space) */
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#6d4c41';
      for (let ti = 1; ti <= 3; ti++) {
        const trailAlpha = 0.15 - ti * 0.04;
        if (trailAlpha <= 0) break;
        ctx.globalAlpha = trailAlpha;
        ctx.beginPath();
        ctx.arc(h.x + ti * 6, h.y + Math.sin(h.phase + runTime * 2 - ti * 0.3) * 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (h.type === 'laser') {
      if (h.state === 'warning') {
        /* Blinking warning */
        const blink = Math.sin(runTime * 15) > 0;
        if (blink) {
          ctx.strokeStyle = 'rgba(255,60,60,0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(h.x, h.y1);
          ctx.lineTo(h.x, h.y2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (h.state === 'on') {
        /* Subtle red glow area around beam */
        ctx.save();
        ctx.globalAlpha = 0.08 + Math.sin(runTime * 12) * 0.04;
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(h.x - 15, h.y1, 30, h.y2 - h.y1);
        ctx.globalAlpha = 1;
        ctx.restore();

        /* Active laser beam with flickering intensity */
        ctx.save();
        const flicker = 0.7 + Math.sin(runTime * 25) * 0.15 + Math.sin(runTime * 37) * 0.15;
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 15 * flicker;
        ctx.strokeStyle = `rgba(255,23,68,${flicker})`;
        ctx.lineWidth = 3 + Math.sin(runTime * 20) * 1;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y1);
        ctx.lineTo(h.x, h.y2);
        ctx.stroke();
        /* Inner bright core */
        ctx.strokeStyle = `rgba(255,255,255,${flicker * 0.9})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y1);
        ctx.lineTo(h.x, h.y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

        /* Spark particles at emitters when on */
        ctx.save();
        for (let si = 0; si < 2; si++) {
          const ey = si === 0 ? h.y1 : h.y2;
          for (let sp = 0; sp < 3; sp++) {
            const sparkAngle = runTime * 10 + sp * 2.1 + si * 1.5;
            const sparkDist = 4 + Math.sin(sparkAngle * 1.7) * 3;
            const sx = h.x + Math.cos(sparkAngle) * sparkDist;
            const sy = ey + Math.sin(sparkAngle) * sparkDist;
            ctx.fillStyle = `rgba(255,200,100,${0.4 + Math.sin(sparkAngle) * 0.3})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
      /* Emitter dots */
      ctx.fillStyle = h.state === 'on' ? '#ff1744' : '#ff5252';
      ctx.beginPath(); ctx.arc(h.x, h.y1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x, h.y2, 4, 0, Math.PI * 2); ctx.fill();
    }

    if (h.type === 'blackhole') {
      ctx.save();
      ctx.translate(h.x, h.y);

      /* Pull radius indicator with concentric pulsing rings */
      const pullAlpha = 0.03 + Math.sin(runTime * 2) * 0.02;
      const pg = ctx.createRadialGradient(0, 0, h.radius, 0, 0, h.pullRadius);
      pg.addColorStop(0, `rgba(80,0,120,${pullAlpha * 3})`);
      pg.addColorStop(1, `rgba(40,0,60,0)`);
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(0, 0, h.pullRadius, 0, Math.PI * 2); ctx.fill();

      /* Concentric pulsing rings */
      for (let ri = 0; ri < 3; ri++) {
        const ringPhase = (runTime * 0.8 + ri * 0.33) % 1;
        const ringR = h.radius + ringPhase * (h.pullRadius - h.radius);
        const ringAlpha = 0.12 * (1 - ringPhase);
        ctx.strokeStyle = `rgba(150,60,220,${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      /* Spiral arms (smooth bezier, 4 segments per arm) */
      ctx.save();
      ctx.rotate(h.rotation);
      for (let arm = 0; arm < 3; arm++) {
        ctx.strokeStyle = `rgba(160,80,240,0.2)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const armOffset = arm * (Math.PI * 2 / 3);
        const segs = 4;
        const rStart = h.radius * 0.8;
        const rEnd = rStart + h.pullRadius * 0.6;
        const totalSweep = Math.PI * 2.5;
        for (let si = 0; si < segs; si++) {
          const f0 = si / segs;
          const f1 = (si + 0.33) / segs;
          const f2 = (si + 0.66) / segs;
          const f3 = (si + 1) / segs;
          const r0 = rStart + f0 * (rEnd - rStart);
          const r1 = rStart + f1 * (rEnd - rStart);
          const r2 = rStart + f2 * (rEnd - rStart);
          const r3 = rStart + f3 * (rEnd - rStart);
          const a0 = armOffset + f0 * totalSweep;
          const a1 = armOffset + f1 * totalSweep;
          const a2 = armOffset + f2 * totalSweep;
          const a3 = armOffset + f3 * totalSweep;
          const x0 = Math.cos(a0) * r0, y0 = Math.sin(a0) * r0;
          const x1 = Math.cos(a1) * r1, y1 = Math.sin(a1) * r1;
          const x2 = Math.cos(a2) * r2, y2 = Math.sin(a2) * r2;
          const x3 = Math.cos(a3) * r3, y3 = Math.sin(a3) * r3;
          if (si === 0) ctx.moveTo(x0, y0);
          ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
        ctx.stroke();
      }
      ctx.restore();

      /* Heat shimmer ring at event horizon */
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const shimmerAlpha = 0.12 + Math.sin(runTime * 5) * 0.06;
      const shimmerR = h.radius * 1.05 + Math.sin(runTime * 8) * 1.5;
      const shimmerGrad = ctx.createRadialGradient(0, 0, h.radius * 0.85, 0, 0, shimmerR);
      shimmerGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shimmerGrad.addColorStop(0.5, `rgba(200,120,255,${shimmerAlpha})`);
      shimmerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shimmerGrad;
      ctx.beginPath();
      ctx.arc(0, 0, shimmerR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      /* Captured particles in accretion disk */
      ctx.save();
      ctx.rotate(h.rotation * 0.7);
      for (let pi = 0; pi < 8; pi++) {
        const pAngle = pi * (Math.PI * 2 / 8) + runTime * 2;
        const pDist = h.radius * 1.4 + Math.sin(pi * 2.3) * h.radius * 0.3;
        const px = Math.cos(pAngle) * pDist;
        const py = Math.sin(pAngle) * pDist * 0.35;
        ctx.fillStyle = `rgba(200,130,255,${0.3 + Math.sin(runTime * 3 + pi) * 0.2})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      /* Accretion ring */
      ctx.save();
      ctx.rotate(h.rotation);
      ctx.strokeStyle = 'rgba(180,80,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, h.radius * 1.8, h.radius * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      /* Second inner accretion ring at different tilt */
      ctx.save();
      ctx.rotate(h.rotation + 1.2);
      ctx.strokeStyle = 'rgba(140,60,220,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, h.radius * 1.3, h.radius * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      /* Black hole core */
      const bhg = ctx.createRadialGradient(0, 0, 0, 0, 0, h.radius);
      bhg.addColorStop(0, '#000');
      bhg.addColorStop(0.7, '#1a0030');
      bhg.addColorStop(1, 'rgba(80,0,120,0.5)');
      ctx.fillStyle = bhg;
      ctx.beginPath(); ctx.arc(0, 0, h.radius, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }
  }

  /* Player (astronaut) */
  if (state !== STATE.GAMEOVER) {
    ctx.save();
    /* Idle bob offset when jetpack is off */
    const bobOffset = !player.jetpackActive ? Math.sin(player.bobPhase) * 1.8 : 0;
    ctx.translate(player.x, player.y + bobOffset);

    /* Jetpack flame */
    if (player.jetpackActive) {
      const flameLen = 12 + Math.sin(player.flameTimer * 20) * 6;
      const fg = ctx.createLinearGradient(0, player.height / 2, 0, player.height / 2 + flameLen);
      fg.addColorStop(0, '#ff6600');
      fg.addColorStop(0.5, '#ffcc00');
      fg.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-5, player.height / 2);
      ctx.lineTo(5, player.height / 2);
      ctx.lineTo(2 + Math.sin(player.flameTimer * 30) * 3, player.height / 2 + flameLen);
      ctx.lineTo(-2 + Math.sin(player.flameTimer * 25) * 3, player.height / 2 + flameLen);
      ctx.closePath();
      ctx.fill();

      /* Jetpack particle trail */
      for (let ji = 0; ji < 4; ji++) {
        const jDist = 4 + ji * 5;
        const jAlpha = 0.4 - ji * 0.1;
        if (jAlpha <= 0) break;
        const jx = (Math.sin(player.flameTimer * 15 + ji * 1.7)) * 4;
        ctx.fillStyle = `rgba(255,150,50,${jAlpha})`;
        ctx.beginPath();
        ctx.arc(jx, player.height / 2 + flameLen + jDist, 1.5 - ji * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* Legs */
    ctx.fillStyle = '#b0b0b0';
    ctx.save();
    ctx.translate(-4, player.height / 2 - 2);
    ctx.rotate(-0.1);
    ctx.fillRect(-2, 0, 4, 8);
    ctx.restore();
    ctx.save();
    ctx.translate(4, player.height / 2 - 2);
    ctx.rotate(0.1);
    ctx.fillRect(-2, 0, 4, 8);
    ctx.restore();

    /* Body */
    const bodyGrad = ctx.createLinearGradient(-player.width / 2, -player.height / 2, player.width / 2, player.height / 2);
    bodyGrad.addColorStop(0, '#e0e0e0');
    bodyGrad.addColorStop(1, '#909090');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-player.width / 2, -player.height / 2, player.width, player.height, 6);
    } else {
      ctx.rect(-player.width / 2, -player.height / 2, player.width, player.height);
    }
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();

    /* Suit detail lines: horizontal chest stripe */
    ctx.strokeStyle = 'rgba(60,120,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-player.width / 2 + 2, -2);
    ctx.lineTo(player.width / 2 - 2, -2);
    ctx.stroke();

    /* Suit detail lines: vertical center spine */
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2 + 14);
    ctx.lineTo(0, player.height / 2 - 4);
    ctx.stroke();

    /* Belt detail */
    ctx.fillStyle = 'rgba(80,80,80,0.6)';
    ctx.fillRect(-player.width / 2 + 1, 2, player.width - 2, 3);

    /* Arms (curved with rounded glove tips) */
    ctx.fillStyle = '#c0c0c0';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    /* Left arm */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-player.width / 2, -2);
    ctx.quadraticCurveTo(-player.width / 2 - 6, -6, -player.width / 2 - 9, -1);
    ctx.stroke();
    /* Left glove */
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.arc(-player.width / 2 - 9, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    /* Right arm */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(player.width / 2, -2);
    ctx.quadraticCurveTo(player.width / 2 + 6, -6, player.width / 2 + 9, -1);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    /* Right glove */
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.arc(player.width / 2 + 9, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* Domed circle helmet */
    const helmetCX = 0;
    const helmetCY = -player.height / 2 + 8;
    const helmetR = 10;
    /* 3D shading via radial gradient */
    const helmetGrad = ctx.createRadialGradient(helmetCX - 3, helmetCY - 3, 1, helmetCX, helmetCY, helmetR);
    helmetGrad.addColorStop(0, '#f0f0f0');
    helmetGrad.addColorStop(0.6, '#c8c8c8');
    helmetGrad.addColorStop(1, '#808080');
    ctx.fillStyle = helmetGrad;
    ctx.beginPath();
    ctx.arc(helmetCX, helmetCY, helmetR, 0, Math.PI * 2);
    ctx.fill();

    /* Helmet rim strip */
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(helmetCX, helmetCY, helmetR, 0, Math.PI * 2);
    ctx.stroke();

    /* Elliptical visor inside dome */
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    const visorGrad = ctx.createRadialGradient(helmetCX - 2, helmetCY - 1, 1, helmetCX, helmetCY, 7);
    visorGrad.addColorStop(0, '#40f8ff');
    visorGrad.addColorStop(0.7, '#00c8e0');
    visorGrad.addColorStop(1, '#006880');
    ctx.fillStyle = visorGrad;
    ctx.beginPath();
    ctx.ellipse(helmetCX, helmetCY, 7, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    /* Visor glare streak highlight */
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(helmetCX - 2, helmetCY - 2, 4, 2.2, -0.3, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    /* Antenna on helmet */
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, -player.height / 2);
    ctx.lineTo(4, -player.height / 2 - 8);
    ctx.stroke();
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(4, -player.height / 2 - 9, 2, 0, Math.PI * 2);
    ctx.fill();

    /* Oxygen tube (curved line from helmet to jetpack) */
    ctx.strokeStyle = 'rgba(180,180,180,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -player.height / 2 + 10);
    ctx.quadraticCurveTo(-player.width / 2 - 6, -player.height / 2 + 6, -player.width / 2 - 2, 0);
    ctx.stroke();

    /* Jetpack on back */
    ctx.fillStyle = '#555';
    ctx.fillRect(-player.width / 2 - 4, -4, 4, 16);
    ctx.fillRect(player.width / 2, -4, 4, 16);

    ctx.restore();
  }

  /* Particles (round) */
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    if (p.color.startsWith('#')) {
      const r = parseInt(p.color.slice(1, 3), 16);
      const g = parseInt(p.color.slice(3, 5), 16);
      const b = parseInt(p.color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    } else {
      ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
    /* Brighter center for larger particles */
    if (p.size > 3) {
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  /* --- HUD Overlay --- */
  if (state === STATE.MENU) renderMenu();
  if (state === STATE.PAUSED) renderPause();
  if (state === STATE.GAMEOVER || state === STATE.CRASHING) renderGameOver();
}

function renderMenu() {
  const W = CONFIG.width;
  const H = CONFIG.height;

  ctx.fillStyle = 'rgba(10,5,32,0.7)';
  ctx.fillRect(0, 0, W, H);

  /* Slow-rotating wireframe asteroid behind the title */
  ctx.save();
  ctx.translate(W / 2, H * 0.35 - 10);
  const menuRot = runTime * 0.3;
  ctx.rotate(menuRot);
  ctx.strokeStyle = 'rgba(0,229,255,0.12)';
  ctx.lineWidth = 1;
  const menuAstR = 70;
  const menuPts = 10;
  ctx.beginPath();
  for (let i = 0; i <= menuPts; i++) {
    const angle = (i / menuPts) * Math.PI * 2;
    const r = menuAstR * (0.8 + Math.sin(angle * 3 + 1) * 0.2);
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r * 0.5;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  /* Cross lines for wireframe feel */
  for (let i = 0; i < menuPts; i += 2) {
    const a1 = (i / menuPts) * Math.PI * 2;
    const a2 = ((i + menuPts / 2) % menuPts / menuPts) * Math.PI * 2;
    const r1 = menuAstR * (0.8 + Math.sin(a1 * 3 + 1) * 0.2);
    const r2 = menuAstR * (0.8 + Math.sin(a2 * 3 + 1) * 0.2);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1 * 0.5);
    ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2 * 0.5);
    ctx.stroke();
  }
  ctx.restore();

  /* Animated sparkles around the title */
  ctx.save();
  for (let si = 0; si < 8; si++) {
    const sparkAngle = runTime * 0.8 + si * Math.PI / 4;
    const sparkDist = 160 + Math.sin(runTime * 1.5 + si) * 20;
    const sx = W / 2 + Math.cos(sparkAngle) * sparkDist;
    const sy = H * 0.35 + Math.sin(sparkAngle) * 30;
    const sparkAlpha = 0.3 + Math.sin(runTime * 3 + si * 1.1) * 0.25;
    ctx.fillStyle = `rgba(200,240,255,${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.textAlign = 'center';

  /* Depth shadow behind title */
  ctx.fillStyle = 'rgba(0,40,60,0.5)';
  ctx.font = 'bold 48px "Space Grotesk", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('amTitle', 'ASTRO MINER'), W / 2 + 3, H * 0.35 + 3);

  /* Title text */
  ctx.fillStyle = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 20;
  ctx.fillText(t('amTitle', 'ASTRO MINER'), W / 2, H * 0.35);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#b8cceb';
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('amStartHint', 'Press Space or Tap to Start'), W / 2, H * 0.50);

  ctx.fillStyle = '#8ea4c8';
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('amControlsHint', 'Space/Tap = Jump (Hold = Jetpack) | A/D = Move | Esc = Pause'), W / 2, H * 0.60);
}

function renderPause() {
  const W = CONFIG.width;
  const H = CONFIG.height;

  ctx.fillStyle = 'rgba(10,5,32,0.75)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('paused', 'PAUSED'), W / 2, H * 0.4);

  ctx.fillStyle = '#b8cceb';
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('pressEscResume', 'Press Escape to resume'), W / 2, H * 0.52);
}

function renderGameOver() {
  const W = CONFIG.width;
  const H = CONFIG.height;

  ctx.fillStyle = 'rgba(10,5,32,0.8)';
  ctx.fillRect(0, 0, W, H);

  /* Red/orange vignette around edges */
  ctx.save();
  const vigSize = Math.max(W, H) * 0.7;
  const vig = ctx.createRadialGradient(W / 2, H / 2, vigSize * 0.4, W / 2, H / 2, vigSize);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.6, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(180,40,10,0.25)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.textAlign = 'center';

  if (isNewBest && score > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(t('newRecord', 'NEW RECORD'), W / 2, H * 0.28);
  }

  /* Game Over text with pulsing glow */
  ctx.save();
  const goGlow = 8 + Math.sin(runTime * 3) * 6;
  ctx.shadowColor = '#ff6633';
  ctx.shadowBlur = goGlow;
  ctx.fillStyle = '#ff6633';
  ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('gameOver', 'GAME OVER'), W / 2, H * 0.38);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.fillStyle = '#dce8f8';
  ctx.font = '22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('score', 'Score') + ': ' + score, W / 2, H * 0.50);

  ctx.fillStyle = '#8ea4c8';
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('amCrystals', 'Crystals') + ': ' + crystalCount + '  |  ' +
               t('amTime', 'Time') + ': ' + Math.floor(runTime) + 's', W / 2, H * 0.58);

  ctx.fillStyle = '#b8cceb';
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('tapOrSpaceTryAgain', 'Tap or press Space to try again'), W / 2, H * 0.68);
}

/* --- Color helpers --- */
function expandHex(hex) {
  if (hex.length === 4) return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  return hex;
}

function darkenColor(hex, factor) {
  hex = expandHex(hex);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

function lightenColor(hex, factor) {
  hex = expandHex(hex);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * factor))},${Math.min(255, Math.round(g + (255 - g) * factor))},${Math.min(255, Math.round(b + (255 - b) * factor))})`;
}

/* --- Game Loop --- */
function gameLoop(timestamp) {
  animFrame = requestAnimationFrame(gameLoop);
  if (!lastTime) { lastTime = timestamp; return; }
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (dt > CONFIG.maxDt) dt = CONFIG.maxDt;

  update(dt);
  render();
}

/* --- Input Handling --- */
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Space') e.preventDefault();
  if (e.repeat) return;
  keys[e.key] = true;

  if (e.key === ' ' || e.key === 'Space') {
    jumpPressed = true;

    if (state === STATE.MENU) startGame();
    else if (state === STATE.GAMEOVER) startGame();
  }

  if (e.key === 'Escape') {
    if (state === STATE.PLAYING) pauseGame();
    else if (state === STATE.PAUSED) resumeGame();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

/* Touch input */
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchActive = true;
  jumpPressed = true;
  Audio.resume();

  if (state === STATE.MENU) startGame();
  else if (state === STATE.GAMEOVER) startGame();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  touchActive = false;
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  jumpPressed = true;
  touchActive = true;
  Audio.resume();

  if (state === STATE.MENU) startGame();
  else if (state === STATE.GAMEOVER) startGame();
});

canvas.addEventListener('mouseup', () => {
  touchActive = false;
});

/* --- Prevent space/enter on focused buttons from interfering with gameplay --- */
[restartBtn, muteBtn, fullscreenBtn, achievementsToggle, document.getElementById('leaderboardToggle')].forEach(btn => {
  if (btn) btn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); btn.blur(); }
  });
});

/* --- Button handlers --- */
restartBtn.addEventListener('click', () => {
  Audio.resume();
  startGame();
});

muteBtn.addEventListener('click', () => {
  const muted = Audio.toggle();
  muteBtn.textContent = muted ? t('soundOff', 'Sound: OFF') : t('soundOn', 'Sound: ON');
});

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => {});
  } else {
    document.exitFullscreen();
  }
});

achievementsToggle.addEventListener('click', () => {
  achievementsList.classList.toggle('open');
});

/* --- i18n integration --- */
function applyI18n() {
  if (typeof I18N === 'undefined') return;
  I18N.applyDOM();
  muteBtn.textContent = Audio.isMuted() ? t('soundOff', 'Sound: OFF') : t('soundOn', 'Sound: ON');
  renderAchievementsList();
}

/* --- Leaderboard integration --- */
function initLeaderboard() {
  if (typeof Leaderboard !== 'undefined') {
    const lbPanel = document.getElementById('leaderboardPanel');
    if (lbPanel) lbPanel.appendChild(Leaderboard.createPanel('astro-miner'));
    const lbToggleBtn = document.getElementById('leaderboardToggle');
    if (lbToggleBtn && lbPanel) {
      lbToggleBtn.addEventListener('click', () => { lbPanel.classList.toggle('lb-visible'); });
      lbPanel.addEventListener('click', (e) => { if (e.target === lbPanel) lbPanel.classList.remove('lb-visible'); });
    }
  }
}

/* --- Init --- */
function init() {
  Audio.init();
  loadData();
  initStars();
  resetPlayer();
  initAsteroids();
  renderAchievementsList();
  applyI18n();
  initLeaderboard();

  if (typeof I18N !== 'undefined') {
    I18N.createSelector(document.querySelector('.hud-panel'));
    window.addEventListener('langchange', applyI18n);
  }

  lastTime = 0;
  animFrame = requestAnimationFrame(gameLoop);
}

init();
