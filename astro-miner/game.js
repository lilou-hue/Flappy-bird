/* ================================================================
   Astro Miner — Space Platformer Game
   ================================================================ */

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

function endGame() {
  state = STATE.GAMEOVER;
  Audio.stopDrone();
  let isNewBest = false;
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
    Leaderboard.submitIfReady('astro-miner', score);
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
  player.currentGravity = 'normal';
  let prevGravity = player.currentGravity;

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

  /* --- Hazard spawning --- */
  if (score > 5 && Math.random() < diff.hazardRate) {
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

  /* Stars */
  for (const s of stars) {
    const alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
    ctx.fillStyle = s.layer === 0 ? `rgba(200,200,255,${alpha * 0.5})` :
                    s.layer === 1 ? `rgba(180,220,255,${alpha * 0.7})` :
                                    `rgba(255,255,255,${alpha})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
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

    ctx.restore();
  }

  /* Crystals */
  for (const c of crystals) {
    if (c.collected) continue;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);

    /* Diamond shape */
    ctx.beginPath();
    ctx.moveTo(0, -c.size);
    ctx.lineTo(c.size * 0.6, 0);
    ctx.lineTo(0, c.size);
    ctx.lineTo(-c.size * 0.6, 0);
    ctx.closePath();

    const cg = ctx.createLinearGradient(0, -c.size, 0, c.size);
    cg.addColorStop(0, '#00e5ff');
    cg.addColorStop(0.5, '#80f0ff');
    cg.addColorStop(1, '#00b8d4');
    ctx.fillStyle = cg;
    ctx.fill();

    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /* Hazards */
  for (const h of hazards) {
    if (h.type === 'debris') {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rotation);
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath();
      ctx.moveTo(-h.w / 2, -h.h / 3);
      ctx.lineTo(0, -h.h / 2);
      ctx.lineTo(h.w / 2, -h.h / 4);
      ctx.lineTo(h.w / 3, h.h / 2);
      ctx.lineTo(-h.w / 3, h.h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 1;
      ctx.stroke();
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
        /* Active laser beam */
        ctx.save();
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y1);
        ctx.lineTo(h.x, h.y2);
        ctx.stroke();
        /* Inner bright core */
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y1);
        ctx.lineTo(h.x, h.y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
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

      /* Pull radius indicator */
      const pullAlpha = 0.03 + Math.sin(runTime * 2) * 0.02;
      const pg = ctx.createRadialGradient(0, 0, h.radius, 0, 0, h.pullRadius);
      pg.addColorStop(0, `rgba(80,0,120,${pullAlpha * 3})`);
      pg.addColorStop(1, `rgba(40,0,60,0)`);
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(0, 0, h.pullRadius, 0, Math.PI * 2); ctx.fill();

      /* Accretion ring */
      ctx.rotate(h.rotation);
      ctx.strokeStyle = 'rgba(180,80,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, h.radius * 1.8, h.radius * 0.6, 0, 0, Math.PI * 2); ctx.stroke();

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
    ctx.translate(player.x, player.y);

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
    }

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

    /* Helmet visor */
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-8, -player.height / 2 + 4, 16, 12, 4);
    } else {
      ctx.rect(-8, -player.height / 2 + 4, 16, 12);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    /* Visor reflection */
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-6, -player.height / 2 + 5, 5, 4);

    /* Jetpack on back */
    ctx.fillStyle = '#555';
    ctx.fillRect(-player.width / 2 - 4, -4, 4, 16);
    ctx.fillRect(player.width / 2, -4, 4, 16);

    ctx.restore();
  }

  /* Particles */
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
    ctx.globalAlpha = alpha;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
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

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 48px "Space Grotesk", "Segoe UI", system-ui, sans-serif';
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

  ctx.textAlign = 'center';

  if (score >= bestScore && score > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(t('newRecord', 'NEW RECORD'), W / 2, H * 0.28);
  }

  ctx.fillStyle = '#ff6633';
  ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(t('gameOver', 'GAME OVER'), W / 2, H * 0.38);

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
function darkenColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

function lightenColor(hex, factor) {
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
  if (e.repeat) return;
  keys[e.key] = true;

  if (e.key === ' ' || e.key === 'Space') {
    e.preventDefault();
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
    canvas.requestFullscreen().catch(() => {});
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
    const toggle = document.getElementById('leaderboardToggle');
    Leaderboard.init('astro-miner', toggle, document.getElementById('leaderboardPanel'));
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
