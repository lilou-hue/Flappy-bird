const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");

/* --- i18n setup --- */
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();

window.addEventListener('langchange', () => {
  I18N.applyDOM();
  draw();
});

const gameState = {
  gravity: 1800,
  lift: -520,
  speed: 190,
  gap: 150,
  pipeWidth: 62,
  pipeInterval: 1400,
  spawnTimer: 0,
  score: 0,
  best: 0,
  isRunning: false,
  isGameOver: false,
  lastTime: 0,
  shakeTimer: 0,
  shakeIntensity: 0,
  scorePop: 0,
  lastScore: 0,
};

/* --- Gun Game Mode --- */
let gameMode = 'classic'; // 'classic' or 'gunGame'
let modeSelected = false; // whether the player has chosen a mode

const gunState = {
  tier: 1,
  destroys: 0,
  cooldown: 0,
  projectiles: [],
  pipeFragments: [],
  invincibleTimer: 0,
  tierFlash: 0,
  tierFlashName: '',
  victoryTriggered: false,
  highestTier: 1,
  totalDestroyed: 0,
  screenFlash: 0,
  demotionMsg: '',
  demotionTimer: 0,
};

const weaponDefs = [
  { name: 'Seed Spit',      fireRate: 400,  speed: 350, damage: 1, radius: 3,  projectileCount: 1, spread: 0, piercing: false, explosive: false, explosionRadius: 0, arcGravity: 0, lifetime: 2 },
  { name: 'Egg Toss',       fireRate: 500,  speed: 300, damage: 1, radius: 5,  projectileCount: 1, spread: 0, piercing: false, explosive: false, explosionRadius: 0, arcGravity: 200, lifetime: 2.5 },
  { name: 'Feather Darts',  fireRate: 350,  speed: 400, damage: 1, radius: 3,  projectileCount: 3, spread: 0.25, piercing: false, explosive: false, explosionRadius: 0, arcGravity: 0, lifetime: 1.8 },
  { name: 'Acorn Cannon',   fireRate: 600,  speed: 280, damage: 2, radius: 6,  projectileCount: 1, spread: 0, piercing: false, explosive: true, explosionRadius: 40, arcGravity: 150, lifetime: 3 },
  { name: 'Wind Gust',      fireRate: 700,  speed: 500, damage: 1, radius: 12, projectileCount: 1, spread: 0, piercing: true, explosive: false, explosionRadius: 0, arcGravity: 0, lifetime: 1.2 },
  { name: 'Sonic Screech',  fireRate: 800,  speed: 900, damage: 2, radius: 8,  projectileCount: 1, spread: 0, piercing: true, explosive: true, explosionRadius: 50, arcGravity: 0, lifetime: 0.8 },
  { name: 'Lightning Bolt', fireRate: 500,  speed: 1200, damage: 3, radius: 4, projectileCount: 1, spread: 0, piercing: true, explosive: false, explosionRadius: 0, arcGravity: 0, lifetime: 0.5 },
  { name: 'Phoenix Fire',   fireRate: 900,  speed: 250, damage: 3, radius: 14, projectileCount: 1, spread: 0, piercing: true, explosive: true, explosionRadius: 60, arcGravity: 0, lifetime: 3 },
];

const bird = {
  x: 80,
  y: canvas.height / 2,
  radius: 14,
  velocity: 0,
  trail: [],
  wingAngle: 0,
};

let pipes = [];
let clouds = [];
let windParticles = [];
let leafParticles = [];
let featherParticles = [];
let hills = [];
let trees = [];
let grassBlades = [];
let feathersSpawned = false;
let flowers = [];
let butterflies = [];

/* --- Drip state for top-pipe water drops --- */
let dripState = {
  y: 0,
  alpha: 0.6,
  falling: false,
  timer: 0,
};

/* --- Generate rolling hills (distant silhouette) --- */
function initHills() {
  hills = [];
  const segments = 20;
  const segW = canvas.width / segments;
  for (let i = 0; i <= segments; i++) {
    hills.push({
      x: i * segW,
      y: canvas.height - 90 - 20 - Math.sin(i * 0.7) * 18 - Math.sin(i * 1.3) * 10,
    });
  }
}

/* --- Generate tree silhouettes along ground edge --- */
function initTrees() {
  trees = [];
  const count = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    trees.push({
      x: Math.random() * canvas.width,
      height: 14 + Math.random() * 20,
      width: 8 + Math.random() * 10,
    });
  }
}

/* --- Generate grass blade tufts along ground top edge --- */
function initGrass() {
  grassBlades = [];
  const groundTop = canvas.height - 90;
  for (let x = 0; x < canvas.width; x += 3 + Math.random() * 5) {
    grassBlades.push({
      x: x,
      height: 4 + Math.random() * 8,
      lean: (Math.random() - 0.5) * 3,
    });
  }
}

/* --- Init flowers/mushrooms on ground edge --- */
function initFlowers() {
  flowers = [];
  const groundTop = canvas.height - 90;
  const count = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    flowers.push({
      x: 20 + Math.random() * (canvas.width - 40),
      y: groundTop,
      type: Math.random() > 0.3 ? "flower" : "mushroom",
      size: 3 + Math.random() * 3,
      color: Math.random() > 0.5 ? "#ff6b8a" : "#ffcc4d",
      stemHeight: 6 + Math.random() * 8,
    });
  }
}

/* --- Init butterflies --- */
function initButterflies() {
  butterflies = [];
  for (let i = 0; i < 3; i++) {
    butterflies.push({
      x: 50 + Math.random() * (canvas.width - 100),
      y: 80 + Math.random() * (canvas.height * 0.35),
      phase: Math.random() * Math.PI * 2,
      wingPhase: Math.random() * Math.PI * 2,
      speedX: 8 + Math.random() * 15,
      speedY: 5 + Math.random() * 10,
      size: 2.5 + Math.random() * 1.5,
      color1: ["#ff6b8a", "#b388ff", "#64b5f6", "#ffcc4d"][Math.floor(Math.random() * 4)],
      color2: ["#ffa4b8", "#d1c4e9", "#90caf9", "#ffe082"][Math.floor(Math.random() * 4)],
    });
  }
}

/* --- Init leaf particles --- */
function initLeaves() {
  leafParticles = [];
  for (let i = 0; i < 4; i++) {
    leafParticles.push({
      x: Math.random() * canvas.width,
      y: 60 + Math.random() * (canvas.height - 160),
      size: 3 + Math.random() * 3,
      speedX: 10 + Math.random() * 20,
      speedY: 5 + Math.random() * 15,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: 1 + Math.random() * 2,
      alpha: 0.35 + Math.random() * 0.25,
    });
  }
}

/* --- Parallax clouds --- */
function initClouds() {
  clouds = [];
  for (let i = 0; i < 8; i += 1) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: 30 + Math.random() * (canvas.height * 0.5),
      width: 40 + Math.random() * 60,
      height: 16 + Math.random() * 20,
      speed: 0.15 + Math.random() * 0.35,
      alpha: 0.15 + Math.random() * 0.2,
    });
  }
}

const loadBestScore = () => {
  const storedBest = Number(window.localStorage.getItem("flappyBest"));
  if (!Number.isNaN(storedBest)) {
    gameState.best = storedBest;
    bestScoreLabel.textContent = gameState.best;
  }
};

const saveBestScore = () => {
  if (gameState.score > gameState.best) {
    gameState.best = gameState.score;
    bestScoreLabel.textContent = gameState.best;
    window.localStorage.setItem("flappyBest", String(gameState.best));
  }
};

const resetGame = () => {
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.trail = [];
  bird.wingAngle = 0;
  pipes = [];
  windParticles = [];
  featherParticles = [];
  feathersSpawned = false;
  dripState = { y: 0, alpha: 0.6, falling: false, timer: 0 };
  gameState.spawnTimer = 0;
  gameState.score = 0;
  gameState.isGameOver = false;
  gameState.isRunning = false;
  gameState.shakeTimer = 0;
  gameState.shakeIntensity = 0;
  gameState.scorePop = 0;
  gameState.lastScore = 0;
  scoreLabel.textContent = gameState.score;
  if (gameMode === 'gunGame') {
    // On demotion reset, tier is preserved externally before calling resetGame
    gunState.cooldown = 0;
    gunState.projectiles = [];
    gunState.pipeFragments = [];
    gunState.invincibleTimer = 0;
    gunState.tierFlash = 0;
    gunState.screenFlash = 0;
    gunState.victoryTriggered = false;
    gunState.demotionTimer = 0;
    applyGunDifficulty();
  }
  initClouds();
  initHills();
  initTrees();
  initGrass();
  initLeaves();
  initFlowers();
  initButterflies();
  Audio.stopDrone();
  draw();
};

const spawnPipe = () => {
  const minHeight = 60;
  const maxHeight = canvas.height - gameState.gap - 160;
  const topHeight = Math.floor(
    Math.random() * (maxHeight - minHeight + 1) + minHeight
  );
  const pipeObj = {
    x: canvas.width + gameState.pipeWidth,
    top: topHeight,
    passed: false,
    /* Randomized vine/crack data per pipe */
    vines: [
      { xOff: 8 + Math.random() * 20, amp: 2 + Math.random() * 3, freq: 0.04 + Math.random() * 0.02 },
      { xOff: 30 + Math.random() * 15, amp: 1.5 + Math.random() * 2, freq: 0.05 + Math.random() * 0.03 },
    ],
    cracks: [
      { xOff: 10 + Math.random() * 30, yStart: Math.random() * 0.3, len: 15 + Math.random() * 25, angle: -0.3 + Math.random() * 0.6 },
      { xOff: 5 + Math.random() * 40, yStart: 0.4 + Math.random() * 0.3, len: 10 + Math.random() * 20, angle: -0.4 + Math.random() * 0.8 },
    ],
  };
  if (gameMode === 'gunGame') {
    const reinforceChance = gunState.tier >= 4 ? 0.3 + 0.2 * ((gunState.tier - 4) / 4) : 0;
    const isReinforced = Math.random() < reinforceChance;
    pipeObj.topHP = isReinforced ? 2 : 1;
    pipeObj.bottomHP = isReinforced ? 2 : 1;
    pipeObj.reinforced = isReinforced;
    pipeObj.topDestroyed = false;
    pipeObj.bottomDestroyed = false;
  }
  pipes.push(pipeObj);
};

/* --- Wind particles for speed feel --- */
const spawnWindParticle = () => {
  windParticles.push({
    x: canvas.width + 5,
    y: Math.random() * canvas.height,
    length: 8 + Math.random() * 18,
    speed: 280 + Math.random() * 180,
    alpha: 0.08 + Math.random() * 0.12,
  });
};

/* --- Spawn feather death particles --- */
const spawnFeatherParticles = () => {
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.5;
    featherParticles.push({
      x: bird.x,
      y: bird.y,
      vx: Math.cos(angle) * (40 + Math.random() * 60),
      vy: Math.sin(angle) * (30 + Math.random() * 50) - 30,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8,
      size: 3 + Math.random() * 4,
      alpha: 0.9,
      color: Math.random() > 0.5 ? "#ffcc4d" : "#f0a030",
      gravity: 120 + Math.random() * 80,
    });
  }
};

/* --- Helper: interpolate color --- */
function lerpColor(a, b, t) {
  const ah = parseInt(a.replace("#", ""), 16);
  const bh = parseInt(b.replace("#", ""), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr}, ${rg}, ${rb})`;
}

/* --- Gun Game: difficulty scaling --- */
function applyGunDifficulty() {
  if (gameMode !== 'gunGame') return;
  gameState.speed = 190 + (gunState.tier - 1) * 10;
  gameState.gap = 150 - (gunState.tier - 1) * 5;
  gameState.pipeInterval = 1400 - (gunState.tier - 1) * 50;
}

/* --- Gun Game: full reset (for victory replay or mode switch) --- */
function fullGunReset() {
  gunState.tier = 1;
  gunState.destroys = 0;
  gunState.cooldown = 0;
  gunState.projectiles = [];
  gunState.pipeFragments = [];
  gunState.invincibleTimer = 0;
  gunState.tierFlash = 0;
  gunState.tierFlashName = '';
  gunState.victoryTriggered = false;
  gunState.highestTier = 1;
  gunState.totalDestroyed = 0;
  gunState.screenFlash = 0;
  gunState.demotionMsg = '';
  gunState.demotionTimer = 0;
}

/* --- Gun Game: shoot --- */
function shoot() {
  if (gameMode !== 'gunGame') return;
  if (!gameState.isRunning || gameState.isGameOver || gunState.victoryTriggered) return;
  if (gunState.cooldown > 0) return;

  const wep = weaponDefs[gunState.tier - 1];
  gunState.cooldown = wep.fireRate / 1000;

  for (let i = 0; i < wep.projectileCount; i++) {
    const spreadAngle = wep.projectileCount > 1
      ? -wep.spread + (2 * wep.spread * i / (wep.projectileCount - 1))
      : 0;
    const vx = Math.cos(spreadAngle) * wep.speed;
    const vy = Math.sin(spreadAngle) * wep.speed;
    gunState.projectiles.push({
      x: bird.x + bird.radius,
      y: bird.y,
      vx: vx,
      vy: vy,
      damage: wep.damage,
      radius: wep.radius,
      lifetime: wep.lifetime,
      tier: gunState.tier,
      piercing: wep.piercing,
      explosive: wep.explosive,
      explosionRadius: wep.explosionRadius,
      arcGravity: wep.arcGravity,
      age: 0,
      trail: [],
    });
  }
  Audio.gunShoot(gunState.tier);
}

/* --- Gun Game: projectile-pipe collision --- */
function projectileHitsPipe(proj, pipe) {
  const pw = gameState.pipeWidth;
  const gap = gameState.gap;
  // Check top section
  if (!pipe.topDestroyed) {
    const topRect = { x: pipe.x, y: 0, w: pw, h: pipe.top };
    if (circleRectCollision(proj.x, proj.y, proj.radius, topRect)) {
      return 'top';
    }
  }
  // Check bottom section
  if (!pipe.bottomDestroyed) {
    const botY = pipe.top + gap;
    const botRect = { x: pipe.x, y: botY, w: pw, h: canvas.height - botY };
    if (circleRectCollision(proj.x, proj.y, proj.radius, botRect)) {
      return 'bottom';
    }
  }
  return null;
}

function circleRectCollision(cx, cy, cr, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (cr * cr);
}

/* --- Gun Game: damage and destroy pipes --- */
function damagePipe(pipe, section, damage, projX, projY) {
  const hpKey = section === 'top' ? 'topHP' : 'bottomHP';
  pipe[hpKey] -= damage;
  if (pipe[hpKey] <= 0) {
    destroyPipeSection(pipe, section, projX, projY);
  } else {
    Audio.gunPipeHit();
  }
}

function destroyPipeSection(pipe, section, projX, projY) {
  const destroyedKey = section === 'top' ? 'topDestroyed' : 'bottomDestroyed';
  pipe[destroyedKey] = true;

  // Spawn fragments
  const fragCount = 6 + Math.floor(Math.random() * 5);
  const pw = gameState.pipeWidth;
  const sectionY = section === 'top' ? pipe.top - 20 : pipe.top + gameState.gap + 20;
  for (let i = 0; i < fragCount; i++) {
    gunState.pipeFragments.push({
      x: pipe.x + Math.random() * pw,
      y: sectionY + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 200,
      vy: -100 - Math.random() * 150,
      w: 4 + Math.random() * 8,
      h: 3 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 10,
      alpha: 1,
      color: pipe.reinforced ? '#8a8a8a' : '#3da870',
    });
  }

  // Spawn impact particles
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    gunState.pipeFragments.push({
      x: projX || pipe.x + pw / 2,
      y: projY || sectionY,
      vx: Math.cos(angle) * (60 + Math.random() * 80),
      vy: Math.sin(angle) * (60 + Math.random() * 80),
      w: 2 + Math.random() * 3,
      h: 2 + Math.random() * 3,
      rot: 0,
      rotSpeed: 0,
      alpha: 0.8,
      color: '#c8b060',
    });
  }

  gunState.destroys++;
  gunState.totalDestroyed++;
  Audio.gunPipeDestroy();

  // Check tier advancement
  if (gunState.destroys >= 3) {
    advanceTier();
  }
}

/* --- Gun Game: explosive damage --- */
function explosiveDamage(proj) {
  const r = proj.explosionRadius;
  for (const pipe of pipes) {
    if (pipe.topHP === undefined) continue;
    const pw = gameState.pipeWidth;
    const pipeCenterX = pipe.x + pw / 2;
    // Check top section
    if (!pipe.topDestroyed) {
      const topCenterY = pipe.top / 2;
      const dx = proj.x - pipeCenterX;
      const dy = proj.y - topCenterY;
      if (Math.sqrt(dx * dx + dy * dy) < r + pw / 2) {
        damagePipe(pipe, 'top', proj.damage, proj.x, proj.y);
      }
    }
    // Check bottom section
    if (!pipe.bottomDestroyed) {
      const botY = pipe.top + gameState.gap;
      const botCenterY = (botY + canvas.height) / 2;
      const dx = proj.x - pipeCenterX;
      const dy = proj.y - botCenterY;
      if (Math.sqrt(dx * dx + dy * dy) < r + pw / 2) {
        damagePipe(pipe, 'bottom', proj.damage, proj.x, proj.y);
      }
    }
  }
  // Screen flash for explosive weapons
  gunState.screenFlash = 0.15;
  // Screen shake
  gameState.shakeTimer = 6;
  gameState.shakeIntensity = 4;
  // Expanding ring effect
  gunState.pipeFragments.push({
    x: proj.x, y: proj.y,
    vx: 0, vy: 0, w: 0, h: 0,
    rot: 0, rotSpeed: 0,
    alpha: 0.6, color: 'ring',
    ringRadius: 5, ringMaxRadius: proj.explosionRadius,
  });
}

/* --- Gun Game: tier advancement --- */
function advanceTier() {
  if (gunState.tier >= 8) {
    // Victory!
    triggerVictory();
    return;
  }
  gunState.tier++;
  gunState.destroys = 0;
  gunState.invincibleTimer = 0.5;
  gunState.tierFlash = 1.5;
  gunState.tierFlashName = weaponDefs[gunState.tier - 1].name;
  if (gunState.tier > gunState.highestTier) gunState.highestTier = gunState.tier;
  applyGunDifficulty();
  Audio.gunTierUp();
}

/* --- Gun Game: tier demotion on death --- */
function demoteTier() {
  const prevTier = gunState.tier;
  gunState.tier = Math.max(1, gunState.tier - 1);
  gunState.destroys = 0;
  gunState.demotionMsg = `Demoted to Tier ${gunState.tier}`;
  gunState.demotionTimer = 2;
  Audio.gunTierDown();
}

/* --- Gun Game: victory --- */
function triggerVictory() {
  gunState.victoryTriggered = true;
  // Explode all remaining pipes
  for (const pipe of pipes) {
    if (pipe.topHP !== undefined) {
      if (!pipe.topDestroyed) destroyPipeSection(pipe, 'top', pipe.x + gameState.pipeWidth / 2, pipe.top);
      if (!pipe.bottomDestroyed) destroyPipeSection(pipe, 'bottom', pipe.x + gameState.pipeWidth / 2, pipe.top + gameState.gap);
    }
  }
  // Save wins
  const wins = Number(localStorage.getItem('flappyGunGameWins') || 0) + 1;
  localStorage.setItem('flappyGunGameWins', String(wins));
  const bestTier = Math.max(Number(localStorage.getItem('flappyGunGameBestTier') || 0), 8);
  localStorage.setItem('flappyGunGameBestTier', String(bestTier));
  Audio.gunVictory();
}

/* --- Gun Game: update projectiles --- */
function updateProjectiles(dt) {
  for (const proj of gunState.projectiles) {
    proj.vx += 0; // no horizontal drag
    proj.vy += proj.arcGravity * dt;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.age += dt;
    proj.lifetime -= dt;

    // Trail for phoenix fire
    if (proj.tier === 8) {
      proj.trail.push({ x: proj.x, y: proj.y, alpha: 0.8 });
      if (proj.trail.length > 12) proj.trail.shift();
    }

    // Lightning: instant hit to nearest pipe
    if (proj.tier === 7 && proj.age < 0.05) {
      let nearestPipe = null;
      let nearestDist = Infinity;
      for (const pipe of pipes) {
        if (pipe.topHP === undefined) continue;
        const dx = pipe.x + gameState.pipeWidth / 2 - bird.x;
        if (dx > 0 && dx < nearestDist) {
          nearestDist = dx;
          nearestPipe = pipe;
        }
      }
      if (nearestPipe) {
        proj.targetPipe = nearestPipe;
        // Hit whichever section is closer to bird
        const topDist = Math.abs(bird.y - nearestPipe.top / 2);
        const botDist = Math.abs(bird.y - (nearestPipe.top + gameState.gap + (canvas.height - nearestPipe.top - gameState.gap) / 2));
        const section = (!nearestPipe.topDestroyed && topDist < botDist) ? 'top' : (!nearestPipe.bottomDestroyed ? 'bottom' : 'top');
        if ((section === 'top' && !nearestPipe.topDestroyed) || (section === 'bottom' && !nearestPipe.bottomDestroyed)) {
          damagePipe(nearestPipe, section, proj.damage, nearestPipe.x + gameState.pipeWidth / 2, bird.y);
        }
        proj.lifetime = 0.3; // Keep visible briefly
        proj.piercing = false; // Don't hit again
      }
    }

    // Check collision with pipes (non-lightning)
    if (proj.tier !== 7) {
      for (const pipe of pipes) {
        if (pipe.topHP === undefined) continue;
        const section = projectileHitsPipe(proj, pipe);
        if (section) {
          if (proj.explosive) {
            explosiveDamage(proj);
          } else {
            damagePipe(pipe, section, proj.damage, proj.x, proj.y);
          }
          if (!proj.piercing) {
            proj.lifetime = 0;
          }
          break;
        }
      }
    }
  }

  // Remove expired projectiles
  gunState.projectiles = gunState.projectiles.filter(p => p.lifetime > 0 && p.x < canvas.width + 20 && p.x > -20 && p.y > -20 && p.y < canvas.height + 20);
}

/* --- Gun Game: update fragments --- */
function updateFragments(dt) {
  for (const frag of gunState.pipeFragments) {
    if (frag.color === 'ring') {
      frag.ringRadius += (frag.ringMaxRadius || 60) * dt * 4;
      frag.alpha -= dt * 3;
    } else {
      frag.vy += 400 * dt; // gravity
      frag.x += frag.vx * dt;
      frag.y += frag.vy * dt;
      frag.rot += frag.rotSpeed * dt;
      frag.alpha -= dt * 0.8;
    }
  }
  gunState.pipeFragments = gunState.pipeFragments.filter(f => f.alpha > 0);
}

const drawBackground = () => {
  /* Sky color shifts with score: bright blue -> golden warm */
  const scoreProgress = Math.min(gameState.score / 30, 1); /* fully warm by score 30 */

  const skyTop = lerpColor("#5cb8ff", "#ff9944", scoreProgress);
  const skyMid = lerpColor("#a8e0ff", "#ffc577", scoreProgress);
  const skyLow = lerpColor("#d4f0d4", "#ffe0a0", scoreProgress);
  const skyBot = lerpColor("#7be495", "#7be495", scoreProgress * 0.3);

  /* Sky gradient */
  const skyGrad = context.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(0.55, skyMid);
  skyGrad.addColorStop(0.85, skyLow);
  skyGrad.addColorStop(1, skyBot);
  context.fillStyle = skyGrad;
  context.fillRect(0, 0, canvas.width, canvas.height);

  /* Sun glow in top-left */
  const sunX = 60;
  const sunY = 50;
  const haloGrad = context.createRadialGradient(sunX, sunY, 8, sunX, sunY, 70);
  const haloAlpha = 0.12 + scoreProgress * 0.1;
  haloGrad.addColorStop(0, `rgba(255, 240, 180, ${0.6 + scoreProgress * 0.3})`);
  haloGrad.addColorStop(0.3, `rgba(255, 220, 120, ${haloAlpha})`);
  haloGrad.addColorStop(1, "rgba(255, 220, 120, 0)");
  context.fillStyle = haloGrad;
  context.fillRect(0, 0, 160, 140);

  /* Sun circle */
  context.fillStyle = `rgba(255, 240, 200, ${0.7 + scoreProgress * 0.2})`;
  context.beginPath();
  context.arc(sunX, sunY, 16, 0, Math.PI * 2);
  context.fill();

  /* Parallax clouds */
  for (const cloud of clouds) {
    context.fillStyle = `rgba(255, 255, 255, ${cloud.alpha})`;
    context.beginPath();
    context.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(cloud.x - cloud.width * 0.25, cloud.y + 4, cloud.width * 0.35, cloud.height * 0.4, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(cloud.x + cloud.width * 0.25, cloud.y + 3, cloud.width * 0.3, cloud.height * 0.35, 0, 0, Math.PI * 2);
    context.fill();
  }

  /* Distant rolling hills layer */
  const groundTop = canvas.height - 90;
  if (hills.length > 1) {
    context.fillStyle = "rgba(80, 160, 100, 0.25)";
    context.beginPath();
    context.moveTo(0, groundTop);
    for (const h of hills) {
      context.lineTo(h.x, h.y);
    }
    context.lineTo(canvas.width, groundTop);
    context.closePath();
    context.fill();

    /* Second, slightly different hill layer for depth */
    context.fillStyle = "rgba(60, 140, 80, 0.15)";
    context.beginPath();
    context.moveTo(0, groundTop);
    for (let i = 0; i < hills.length; i++) {
      context.lineTo(hills[i].x, hills[i].y + 8 + Math.sin(i * 1.1) * 6);
    }
    context.lineTo(canvas.width, groundTop);
    context.closePath();
    context.fill();
  }

  /* Tree silhouettes along ground edge */
  for (const tree of trees) {
    context.fillStyle = "rgba(40, 100, 50, 0.3)";
    /* Trunk */
    context.fillRect(tree.x - 1.5, groundTop - tree.height * 0.4, 3, tree.height * 0.4);
    /* Canopy - triangle */
    context.beginPath();
    context.moveTo(tree.x, groundTop - tree.height);
    context.lineTo(tree.x - tree.width / 2, groundTop - tree.height * 0.3);
    context.lineTo(tree.x + tree.width / 2, groundTop - tree.height * 0.3);
    context.closePath();
    context.fill();
  }

  /* Floating leaf particles */
  for (const leaf of leafParticles) {
    context.save();
    context.translate(leaf.x, leaf.y);
    context.rotate(leaf.rot);
    context.globalAlpha = leaf.alpha;
    context.fillStyle = "#5eaa5e";
    context.beginPath();
    /* Simple leaf shape: two arcs */
    context.moveTo(0, -leaf.size);
    context.quadraticCurveTo(leaf.size, 0, 0, leaf.size);
    context.quadraticCurveTo(-leaf.size, 0, 0, -leaf.size);
    context.fill();
    context.globalAlpha = 1;
    context.restore();
  }

  /* Ground layers */
  context.fillStyle = "rgba(123, 228, 149, 0.5)";
  context.fillRect(0, groundTop, canvas.width, 90);

  const groundGrad = context.createLinearGradient(0, canvas.height - 35, 0, canvas.height);
  groundGrad.addColorStop(0, "#6cd47e");
  groundGrad.addColorStop(1, "#4fb866");
  context.fillStyle = groundGrad;
  context.fillRect(0, canvas.height - 35, canvas.width, 35);

  /* Grass blade tufts along ground top edge */
  context.strokeStyle = "#3aad55";
  context.lineWidth = 1.2;
  for (const g of grassBlades) {
    context.beginPath();
    context.moveTo(g.x, groundTop);
    context.lineTo(g.x + g.lean, groundTop - g.height);
    context.stroke();
  }
  /* Second layer of grass (slightly different color, offset) */
  context.strokeStyle = "#5cc86e";
  context.lineWidth = 1;
  for (let i = 0; i < grassBlades.length; i += 2) {
    const g = grassBlades[i];
    context.beginPath();
    context.moveTo(g.x + 1.5, groundTop);
    context.lineTo(g.x + g.lean + 2, groundTop - g.height * 0.7);
    context.stroke();
  }

  /* Flowers and mushrooms on ground */
  for (const fl of flowers) {
    if (fl.type === "flower") {
      /* Stem */
      context.strokeStyle = "#3aad55";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(fl.x, fl.y);
      context.lineTo(fl.x, fl.y - fl.stemHeight);
      context.stroke();
      /* Petals */
      context.fillStyle = fl.color;
      const petalR = fl.size * 0.6;
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        const px = fl.x + Math.cos(angle) * fl.size * 0.5;
        const py = (fl.y - fl.stemHeight) + Math.sin(angle) * fl.size * 0.5;
        context.beginPath();
        context.arc(px, py, petalR, 0, Math.PI * 2);
        context.fill();
      }
      /* Center */
      context.fillStyle = "#ffee88";
      context.beginPath();
      context.arc(fl.x, fl.y - fl.stemHeight, fl.size * 0.3, 0, Math.PI * 2);
      context.fill();
    } else {
      /* Mushroom stem */
      context.fillStyle = "#e8dcc8";
      context.fillRect(fl.x - 1.5, fl.y - fl.stemHeight * 0.5, 3, fl.stemHeight * 0.5);
      /* Mushroom cap */
      context.fillStyle = "#cc4444";
      context.beginPath();
      context.ellipse(fl.x, fl.y - fl.stemHeight * 0.5, fl.size * 1.2, fl.size * 0.8, 0, Math.PI, Math.PI * 2);
      context.fill();
      /* Dots on cap */
      context.fillStyle = "rgba(255,255,255,0.6)";
      context.beginPath();
      context.arc(fl.x - 1, fl.y - fl.stemHeight * 0.5 - fl.size * 0.3, 1, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(fl.x + 1.5, fl.y - fl.stemHeight * 0.5 - fl.size * 0.5, 0.8, 0, Math.PI * 2);
      context.fill();
    }
  }

  /* Butterflies */
  for (const bf of butterflies) {
    context.save();
    context.translate(bf.x, bf.y);
    const wingFlap = Math.sin(bf.wingPhase) * 0.6;
    /* Left wing */
    context.fillStyle = bf.color1;
    context.globalAlpha = 0.7;
    context.beginPath();
    context.ellipse(-bf.size * 0.6, 0, bf.size, bf.size * 0.6 * (0.4 + Math.abs(wingFlap)), 0.3 + wingFlap, 0, Math.PI * 2);
    context.fill();
    /* Right wing */
    context.fillStyle = bf.color2;
    context.beginPath();
    context.ellipse(bf.size * 0.6, 0, bf.size, bf.size * 0.6 * (0.4 + Math.abs(wingFlap)), -0.3 - wingFlap, 0, Math.PI * 2);
    context.fill();
    /* Body */
    context.globalAlpha = 0.8;
    context.fillStyle = "#333";
    context.beginPath();
    context.ellipse(0, 0, 1, bf.size * 0.5, 0, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.restore();
  }
};

/* --- Wind streaks for speed --- */
const drawWind = () => {
  for (const w of windParticles) {
    context.strokeStyle = `rgba(255, 255, 255, ${w.alpha})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(w.x, w.y);
    context.lineTo(w.x + w.length, w.y);
    context.stroke();
  }
};

const drawBird = () => {
  context.save();
  context.translate(bird.x, bird.y);

  /* Tilt based on velocity: nose up when flapping, nose down when falling */
  const tilt = Math.max(-0.5, Math.min(0.65, bird.velocity * 0.0012));
  context.rotate(tilt);

  /* Speed trail behind the bird */
  for (let i = 0; i < bird.trail.length; i += 1) {
    const t = bird.trail[i];
    const age = 1 - i / bird.trail.length;
    const alpha = age * 0.2;
    const r = bird.radius * age * 0.7;
    context.fillStyle = `rgba(255, 210, 80, ${alpha})`;
    context.beginPath();
    context.arc(t.x - bird.x, t.y - bird.y, r, 0, Math.PI * 2);
    context.fill();
  }

  /* Body shadow */
  context.fillStyle = "rgba(200, 140, 0, 0.25)";
  context.beginPath();
  context.arc(1, 2, bird.radius + 1, 0, Math.PI * 2);
  context.fill();

  /* Body */
  const bodyGrad = context.createRadialGradient(-3, -3, 2, 0, 0, bird.radius);
  bodyGrad.addColorStop(0, "#ffe066");
  bodyGrad.addColorStop(0.7, "#ffcc4d");
  bodyGrad.addColorStop(1, "#f0a030");
  context.fillStyle = bodyGrad;
  context.beginPath();
  context.arc(0, 0, bird.radius, 0, Math.PI * 2);
  context.fill();

  /* Feather texture lines on body */
  context.strokeStyle = "rgba(210, 160, 40, 0.35)";
  context.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const yOff = -5 + i * 5;
    context.beginPath();
    context.arc(2, yOff, 8, -0.4, 0.8);
    context.stroke();
  }

  /* Tail feathers (2-3 lines at the back) */
  context.strokeStyle = "#d48a20";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-bird.radius + 2, -2);
  context.lineTo(-bird.radius - 7, -5);
  context.stroke();
  context.beginPath();
  context.moveTo(-bird.radius + 2, 0);
  context.lineTo(-bird.radius - 8, 0);
  context.stroke();
  context.beginPath();
  context.moveTo(-bird.radius + 2, 2);
  context.lineTo(-bird.radius - 7, 4);
  context.stroke();

  /* Multi-segment wing with 3 feather tips */
  bird.wingAngle += (bird.velocity < -100 ? 0.35 : -0.15);
  bird.wingAngle = Math.max(-0.4, Math.min(0.5, bird.wingAngle));
  const wingY = Math.sin(bird.wingAngle * 4) * 5;
  const fanSpread = bird.wingAngle * 0.4;

  /* Base wing shape */
  context.fillStyle = "#f0a030";
  context.beginPath();
  context.ellipse(-6, wingY + 2, 8, 4, -0.3 + bird.wingAngle * 0.5, 0, Math.PI * 2);
  context.fill();

  /* Three feather tips fanning during flap */
  context.strokeStyle = "#d48a20";
  context.lineWidth = 1.8;
  for (let f = -1; f <= 1; f++) {
    const tipAngle = (-0.3 + bird.wingAngle * 0.5) + f * fanSpread;
    const tipLen = 7 + Math.abs(bird.wingAngle) * 4;
    const baseX = -6 + Math.cos(-0.3 + bird.wingAngle * 0.5) * 5;
    const baseY = wingY + 2 + Math.sin(-0.3 + bird.wingAngle * 0.5) * 3;
    context.beginPath();
    context.moveTo(baseX, baseY);
    context.lineTo(
      baseX + Math.cos(tipAngle + Math.PI * 0.7) * tipLen,
      baseY + Math.sin(tipAngle + Math.PI * 0.7) * tipLen
    );
    context.stroke();
  }

  /* Cheek blush */
  context.fillStyle = "rgba(255, 140, 120, 0.35)";
  context.beginPath();
  context.arc(5, 2, 4, 0, Math.PI * 2);
  context.fill();

  /* Beak */
  context.fillStyle = "#ff7b54";
  context.beginPath();
  context.moveTo(bird.radius - 2, -3);
  context.lineTo(bird.radius + 8, 0);
  context.lineTo(bird.radius - 2, 3);
  context.closePath();
  context.fill();

  /* Eye */
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(-2, -5, 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1b2a36";
  context.beginPath();
  context.arc(-1, -5, 2.2, 0, Math.PI * 2);
  context.fill();

  /* Eye highlight */
  context.fillStyle = "rgba(255, 255, 255, 0.8)";
  context.beginPath();
  context.arc(-3, -6.5, 1.2, 0, Math.PI * 2);
  context.fill();

  /* Eyebrow that tilts with velocity */
  const browTilt = Math.max(-0.3, Math.min(0.4, bird.velocity * 0.0008));
  context.strokeStyle = "#5a3a10";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(-1, -9, 5, Math.PI + 0.4 + browTilt, Math.PI + 1.2 + browTilt);
  context.stroke();

  context.restore();
};

const drawPipes = () => {
  pipes.forEach((pipe) => {
    /* Pipe cap dimensions */
    const capW = gameState.pipeWidth + 10;
    const capH = 18;
    const capX = pipe.x - 5;

    const isGunGame = gameMode === 'gunGame';
    const isReinforced = isGunGame && pipe.reinforced;

    /* Top pipe body */
    const topGrad = context.createLinearGradient(pipe.x, 0, pipe.x + gameState.pipeWidth, 0);
    if (isReinforced) {
      topGrad.addColorStop(0, "#6a6a6a");
      topGrad.addColorStop(0.3, "#8a8a8a");
      topGrad.addColorStop(0.7, "#7a7a7a");
      topGrad.addColorStop(1, "#5a5a5a");
    } else {
      topGrad.addColorStop(0, "#2d8a5e");
      topGrad.addColorStop(0.3, "#3da870");
      topGrad.addColorStop(0.7, "#35966a");
      topGrad.addColorStop(1, "#28774e");
    }
    /* Skip drawing destroyed top section */
    if (!(isGunGame && pipe.topDestroyed)) {
    context.fillStyle = topGrad;
    context.fillRect(pipe.x, 0, gameState.pipeWidth, pipe.top - capH);

    /* Top cap */
    const capGrad = context.createLinearGradient(capX, 0, capX + capW, 0);
    if (isReinforced) {
      capGrad.addColorStop(0, "#6a6a6a");
      capGrad.addColorStop(0.3, "#9a9a9a");
      capGrad.addColorStop(0.7, "#8a8a8a");
      capGrad.addColorStop(1, "#5a5a5a");
    } else {
      capGrad.addColorStop(0, "#2d8a5e");
      capGrad.addColorStop(0.3, "#45b87a");
      capGrad.addColorStop(0.7, "#3da870");
      capGrad.addColorStop(1, "#28774e");
    }
    context.fillStyle = capGrad;
    context.beginPath();
    context.roundRect(capX, pipe.top - capH, capW, capH, [4, 4, 0, 0]);
    context.fill();

    /* Highlight stripe on top pipe */
    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.fillRect(pipe.x + 8, 0, 6, pipe.top - capH);

    /* Crack/texture lines on top pipe surface */
    context.strokeStyle = "rgba(20, 60, 30, 0.15)";
    context.lineWidth = 0.8;
    for (const crack of pipe.cracks) {
      const crackY = crack.yStart * (pipe.top - capH);
      context.beginPath();
      context.moveTo(pipe.x + crack.xOff, crackY);
      context.lineTo(
        pipe.x + crack.xOff + Math.cos(crack.angle) * crack.len,
        crackY + Math.sin(crack.angle + 0.8) * crack.len
      );
      context.stroke();
    }

    /* Vine/moss lines climbing up top pipe */
    context.strokeStyle = "rgba(30, 120, 50, 0.25)";
    context.lineWidth = 1.2;
    for (const vine of pipe.vines) {
      context.beginPath();
      for (let vy = 0; vy < pipe.top - capH; vy += 4) {
        const vx = pipe.x + vine.xOff + Math.sin(vy * vine.freq) * vine.amp;
        if (vy === 0) context.moveTo(vx, vy);
        else context.lineTo(vx, vy);
      }
      context.stroke();
    }

    /* Water drip at bottom of top pipe cap */
    if (dripState.falling) {
      const dripX = pipe.x + gameState.pipeWidth * 0.4;
      const dripY = pipe.top + dripState.y;
      context.fillStyle = `rgba(150, 210, 255, ${dripState.alpha})`;
      context.beginPath();
      context.arc(dripX, dripY, 1.8, 0, Math.PI * 2);
      context.fill();
    }

    /* Crack overlay for reinforced pipes at 1 HP */
    if (isGunGame && pipe.reinforced && pipe.topHP === 1) {
      context.strokeStyle = 'rgba(200, 50, 50, 0.5)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(pipe.x + 10, pipe.top - 30);
      context.lineTo(pipe.x + 30, pipe.top - 10);
      context.lineTo(pipe.x + 20, pipe.top - 5);
      context.stroke();
    }
    } /* end top destroyed check */

    const bottomY = pipe.top + gameState.gap;

    /* Ambient shadow/glow at pipe gap openings */
    const gapShadowH = 14;
    /* Shadow at bottom of top pipe (inside gap) */
    const topGapShadow = context.createLinearGradient(0, pipe.top - 2, 0, pipe.top + gapShadowH);
    topGapShadow.addColorStop(0, "rgba(0, 0, 0, 0.18)");
    topGapShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = topGapShadow;
    context.fillRect(pipe.x - 5, pipe.top - 2, capW, gapShadowH);

    /* Shadow at top of bottom pipe (inside gap) */
    const botGapShadow = context.createLinearGradient(0, bottomY + 2, 0, bottomY - gapShadowH);
    botGapShadow.addColorStop(0, "rgba(0, 0, 0, 0.18)");
    botGapShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = botGapShadow;
    context.fillRect(pipe.x - 5, bottomY - gapShadowH + 2, capW, gapShadowH);

    /* Skip drawing destroyed bottom section */
    if (!(isGunGame && pipe.bottomDestroyed)) {
    /* Bottom pipe body */
    context.fillStyle = topGrad;
    context.fillRect(pipe.x, bottomY + capH, gameState.pipeWidth, canvas.height - bottomY - capH);

    /* Bottom cap */
    context.fillStyle = capGrad;
    context.beginPath();
    context.roundRect(capX, bottomY, capW, capH, [0, 0, 4, 4]);
    context.fill();

    /* Highlight stripe on bottom pipe */
    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.fillRect(pipe.x + 8, bottomY + capH, 6, canvas.height - bottomY - capH);

    /* Crack/texture lines on bottom pipe */
    context.strokeStyle = "rgba(20, 60, 30, 0.15)";
    context.lineWidth = 0.8;
    for (const crack of pipe.cracks) {
      const bpHeight = canvas.height - bottomY - capH;
      const crackY = bottomY + capH + crack.yStart * bpHeight;
      context.beginPath();
      context.moveTo(pipe.x + crack.xOff, crackY);
      context.lineTo(
        pipe.x + crack.xOff + Math.cos(crack.angle) * crack.len,
        crackY + Math.sin(crack.angle + 0.8) * crack.len
      );
      context.stroke();
    }

    /* Vine/moss lines climbing up bottom pipe */
    context.strokeStyle = "rgba(30, 120, 50, 0.25)";
    context.lineWidth = 1.2;
    for (const vine of pipe.vines) {
      context.beginPath();
      for (let vy = bottomY + capH; vy < canvas.height; vy += 4) {
        const vx = pipe.x + vine.xOff + Math.sin(vy * vine.freq) * vine.amp;
        if (vy === bottomY + capH) context.moveTo(vx, vy);
        else context.lineTo(vx, vy);
      }
      context.stroke();
    }

    /* Crack overlay for reinforced bottom pipe at 1 HP */
    if (isGunGame && pipe.reinforced && pipe.bottomHP === 1) {
      context.strokeStyle = 'rgba(200, 50, 50, 0.5)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(pipe.x + 10, bottomY + capH + 10);
      context.lineTo(pipe.x + 30, bottomY + capH + 30);
      context.lineTo(pipe.x + 20, bottomY + capH + 35);
      context.stroke();
    }
    } /* end bottom destroyed check */

    /* Pipe shadow (inner edge) */
    context.fillStyle = "rgba(0, 0, 0, 0.1)";
    if (!(isGunGame && pipe.topDestroyed))
      context.fillRect(pipe.x + gameState.pipeWidth - 8, 0, 8, pipe.top - capH);
    if (!(isGunGame && pipe.bottomDestroyed))
      context.fillRect(pipe.x + gameState.pipeWidth - 8, bottomY + capH, 8, canvas.height - bottomY - capH);
  });
};

/* --- Draw feather death particles --- */
const drawFeatherParticles = () => {
  for (const fp of featherParticles) {
    context.save();
    context.translate(fp.x, fp.y);
    context.rotate(fp.rot);
    context.globalAlpha = fp.alpha;
    context.fillStyle = fp.color;
    /* Feather shape: elongated ellipse */
    context.beginPath();
    context.ellipse(0, 0, fp.size * 0.4, fp.size, 0, 0, Math.PI * 2);
    context.fill();
    /* Feather center line */
    context.strokeStyle = "rgba(180, 120, 0, 0.4)";
    context.lineWidth = 0.5;
    context.beginPath();
    context.moveTo(0, -fp.size);
    context.lineTo(0, fp.size);
    context.stroke();
    context.globalAlpha = 1;
    context.restore();
  }
};

/* --- Score pop animation --- */
const drawScorePop = () => {
  if (gameState.scorePop > 0) {
    const scale = 1 + gameState.scorePop * 0.6;
    const alpha = gameState.scorePop;
    context.save();
    context.translate(canvas.width / 2, canvas.height * 0.15);
    context.scale(scale, scale);
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.font = "bold 28px 'Trebuchet MS'";
    context.textAlign = "center";
    context.fillText(`+1`, 0, 0);
    context.restore();
    gameState.scorePop *= 0.88;
    if (gameState.scorePop < 0.02) gameState.scorePop = 0;
  }
};

const drawOverlay = (title, subtitle) => {
  /* Soft vignette instead of flat overlay */
  const vg = context.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.1,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.7
  );
  vg.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  context.fillStyle = vg;
  context.fillRect(0, 0, canvas.width, canvas.height);

  /* Title with subtle shadow */
  context.fillStyle = "rgba(0, 0, 0, 0.3)";
  context.font = "bold 34px 'Trebuchet MS'";
  context.textAlign = "center";
  context.fillText(title, canvas.width / 2 + 1, canvas.height / 2 - 15);

  context.fillStyle = "#ffffff";
  context.fillText(title, canvas.width / 2, canvas.height / 2 - 16);

  context.fillStyle = "rgba(255, 255, 255, 0.7)";
  context.font = "16px 'Trebuchet MS'";
  context.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 18);
};

const detectCollision = (pipe) => {
  const withinPipeX =
    bird.x + bird.radius > pipe.x &&
    bird.x - bird.radius < pipe.x + gameState.pipeWidth;
  if (!withinPipeX) {
    return false;
  }

  const hitTop = bird.y - bird.radius < pipe.top;
  const hitBottom = bird.y + bird.radius > pipe.top + gameState.gap;

  if (gameMode === 'gunGame') {
    const topHit = hitTop && !pipe.topDestroyed;
    const botHit = hitBottom && !pipe.bottomDestroyed;
    return topHit || botHit;
  }
  return hitTop || hitBottom;
};

const updateScore = () => {
  pipes.forEach((pipe) => {
    if (!pipe.passed && pipe.x + gameState.pipeWidth < bird.x) {
      pipe.passed = true;
      gameState.score += 1;
      scoreLabel.textContent = gameState.score;
      gameState.scorePop = 1;
      Audio.score();
    }
  });
};

const update = (deltaSeconds) => {
  if (!gameState.isRunning || gameState.isGameOver) {
    /* Still update feather particles even when game over so they animate */
    if (gameState.isGameOver) {
      for (const fp of featherParticles) {
        fp.x += fp.vx * deltaSeconds;
        fp.vy += fp.gravity * deltaSeconds;
        fp.y += fp.vy * deltaSeconds;
        fp.rot += fp.rotSpeed * deltaSeconds;
        fp.alpha *= 0.985;
        if (fp.alpha < 0.01) fp.alpha = 0;
      }
      featherParticles = featherParticles.filter((fp) => fp.alpha > 0);
    }
    return;
  }

  gameState.spawnTimer += deltaSeconds * 1000;
  if (gameState.spawnTimer >= gameState.pipeInterval) {
    gameState.spawnTimer = 0;
    spawnPipe();
  }

  /* Spawn wind particles periodically */
  if (Math.random() < 0.3) {
    spawnWindParticle();
  }

  bird.velocity += gameState.gravity * deltaSeconds;
  bird.y += bird.velocity * deltaSeconds;

  /* Record trail positions */
  bird.trail.push({ x: bird.x, y: bird.y });
  if (bird.trail.length > 8) bird.trail.shift();

  if (bird.y + bird.radius >= canvas.height - 90 || bird.y - bird.radius <= 0) {
    gameState.isGameOver = true;
    gameState.shakeTimer = 12;
    gameState.shakeIntensity = 6;
  }

  pipes.forEach((pipe) => {
    pipe.x -= gameState.speed * deltaSeconds;
  });

  pipes = pipes.filter((pipe) => pipe.x + gameState.pipeWidth > -10);

  if (pipes.some(detectCollision)) {
    gameState.isGameOver = true;
    gameState.shakeTimer = 12;
    gameState.shakeIntensity = 6;
  }

  if (gameState.isGameOver) {
    if (gameMode === 'gunGame') {
      // Gun game: demote tier, don't end permanently
      if (!feathersSpawned) {
        spawnFeatherParticles();
        feathersSpawned = true;
        demoteTier();
        Audio.crash();
        Audio.stopDrone();
      }
    } else {
      const wasNewBest = gameState.score > gameState.best;
      saveBestScore();
      if (!feathersSpawned) {
        spawnFeatherParticles();
        feathersSpawned = true;
      }
      Audio.crash();
      Audio.stopDrone();
      if (wasNewBest && gameState.score > 0) {
        Audio.newHighScore();
      }
    }
  }

  updateScore();

  /* Gun Game updates */
  if (gameMode === 'gunGame' && !gameState.isGameOver) {
    gunState.cooldown = Math.max(0, gunState.cooldown - deltaSeconds);
    gunState.invincibleTimer = Math.max(0, gunState.invincibleTimer - deltaSeconds);
    gunState.tierFlash = Math.max(0, gunState.tierFlash - deltaSeconds);
    gunState.screenFlash = Math.max(0, gunState.screenFlash - deltaSeconds);
    gunState.demotionTimer = Math.max(0, gunState.demotionTimer - deltaSeconds);
    updateProjectiles(deltaSeconds);
    updateFragments(deltaSeconds);

    // Invincibility: ignore collisions
    if (gunState.invincibleTimer > 0) {
      gameState.isGameOver = false;
    }
  }
  if (gameMode === 'gunGame' && gameState.isGameOver) {
    updateFragments(deltaSeconds);
    // Update projectiles even when dead so they finish animating
    for (const proj of gunState.projectiles) {
      proj.lifetime -= deltaSeconds;
    }
    gunState.projectiles = gunState.projectiles.filter(p => p.lifetime > 0);
  }

  /* Update clouds */
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * deltaSeconds * 60;
    if (cloud.x < -cloud.width) {
      cloud.x = canvas.width + cloud.width;
      cloud.y = 30 + Math.random() * (canvas.height * 0.5);
    }
  }

  /* Update wind particles */
  windParticles.forEach((w) => {
    w.x -= w.speed * deltaSeconds;
  });
  windParticles = windParticles.filter((w) => w.x + w.length > 0);

  /* Update leaf particles */
  for (const leaf of leafParticles) {
    leaf.x -= leaf.speedX * deltaSeconds;
    leaf.y += Math.sin(leaf.phase) * leaf.speedY * deltaSeconds;
    leaf.phase += deltaSeconds * 2;
    leaf.rot += leaf.rotSpeed * deltaSeconds;
    if (leaf.x < -10) {
      leaf.x = canvas.width + 10;
      leaf.y = 60 + Math.random() * (canvas.height - 160);
    }
  }

  /* Update butterflies */
  for (const bf of butterflies) {
    bf.phase += deltaSeconds * 1.5;
    bf.wingPhase += deltaSeconds * 12;
    bf.x += Math.sin(bf.phase) * bf.speedX * deltaSeconds;
    bf.y += Math.cos(bf.phase * 0.7) * bf.speedY * deltaSeconds;
    /* Wrap around */
    if (bf.x < -20) bf.x = canvas.width + 20;
    if (bf.x > canvas.width + 20) bf.x = -20;
    if (bf.y < 40) bf.y = 40;
    if (bf.y > canvas.height * 0.45) bf.y = canvas.height * 0.45;
  }

  /* Update drip animation */
  dripState.timer += deltaSeconds;
  if (dripState.timer > 2.5) {
    dripState.falling = true;
    dripState.y += 60 * deltaSeconds;
    dripState.alpha -= 0.4 * deltaSeconds;
    if (dripState.alpha <= 0 || dripState.y > 30) {
      dripState = { y: 0, alpha: 0.6, falling: false, timer: 0 };
    }
  } else {
    dripState.falling = false;
  }

  /* Decay screen shake */
  if (gameState.shakeTimer > 0) {
    gameState.shakeTimer -= 1;
    gameState.shakeIntensity *= 0.82;
  }
};

/* --- Gun Game: draw projectiles --- */
function drawProjectiles() {
  for (const proj of gunState.projectiles) {
    context.save();
    switch (proj.tier) {
      case 1: // Seed: small brown circle
        context.fillStyle = '#8B6914';
        context.beginPath();
        context.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
        context.fill();
        break;
      case 2: // Egg: white oval with speckles
        context.fillStyle = '#FFFFF0';
        context.beginPath();
        context.ellipse(proj.x, proj.y, 4, 6, Math.atan2(proj.vy, proj.vx), 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#D4C5A0';
        for (let s = 0; s < 3; s++) {
          context.beginPath();
          context.arc(proj.x + (Math.random() - 0.5) * 4, proj.y + (Math.random() - 0.5) * 4, 0.8, 0, Math.PI * 2);
          context.fill();
        }
        break;
      case 3: // Feather Darts: elongated triangles
        context.translate(proj.x, proj.y);
        context.rotate(Math.atan2(proj.vy, proj.vx));
        context.fillStyle = '#E8D080';
        context.beginPath();
        context.moveTo(8, 0);
        context.lineTo(-4, -2.5);
        context.lineTo(-4, 2.5);
        context.closePath();
        context.fill();
        break;
      case 4: // Acorn: rounded body + cap
        context.fillStyle = '#8B5E3C';
        context.beginPath();
        context.arc(proj.x, proj.y + 1, 5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#6B4226';
        context.beginPath();
        context.ellipse(proj.x, proj.y - 3, 6, 3, 0, Math.PI, Math.PI * 2);
        context.fill();
        break;
      case 5: // Wind Gust: translucent arc
        context.globalAlpha = 0.4;
        context.strokeStyle = '#A0D8FF';
        context.lineWidth = 3;
        context.beginPath();
        for (let i = 0; i < 20; i++) {
          const px = proj.x + i * 2;
          const py = proj.y + Math.sin(i * 0.5 + proj.age * 10) * 6;
          if (i === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.stroke();
        context.globalAlpha = 1;
        break;
      case 6: { // Sonic Screech: horizontal gradient band
        const grad6 = context.createLinearGradient(proj.x, proj.y - 6, proj.x, proj.y + 6);
        grad6.addColorStop(0, 'rgba(255, 200, 0, 0)');
        grad6.addColorStop(0.3, 'rgba(255, 200, 0, 0.5)');
        grad6.addColorStop(0.5, 'rgba(255, 255, 100, 0.8)');
        grad6.addColorStop(0.7, 'rgba(255, 200, 0, 0.5)');
        grad6.addColorStop(1, 'rgba(255, 200, 0, 0)');
        context.fillStyle = grad6;
        context.fillRect(proj.x, proj.y - 6, canvas.width - proj.x, 12);
        break;
      }
      case 7: { // Lightning: jagged line to target
        context.strokeStyle = '#FFFF44';
        context.lineWidth = 2;
        context.shadowColor = '#FFFF00';
        context.shadowBlur = 8;
        context.beginPath();
        context.moveTo(bird.x + bird.radius, bird.y);
        const targetX = proj.targetPipe ? proj.targetPipe.x + gameState.pipeWidth / 2 : proj.x;
        const targetY = proj.targetPipe ? bird.y : proj.y;
        const segments = 8;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const lx = bird.x + bird.radius + (targetX - bird.x - bird.radius) * t + (Math.random() - 0.5) * 15;
          const ly = bird.y + (targetY - bird.y) * t + (Math.random() - 0.5) * 10;
          context.lineTo(lx, ly);
        }
        context.stroke();
        context.shadowBlur = 0;
        break;
      }
      case 8: // Phoenix Fire: fireball with ember trail
        // Trail
        for (let i = 0; i < proj.trail.length; i++) {
          const t = proj.trail[i];
          const age = i / proj.trail.length;
          context.globalAlpha = t.alpha * age * 0.5;
          context.fillStyle = `hsl(${20 + age * 30}, 100%, ${50 + age * 20}%)`;
          context.beginPath();
          context.arc(t.x, t.y, proj.radius * age * 0.6, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
        // Fireball
        {
          const fireGrad = context.createRadialGradient(proj.x, proj.y, 2, proj.x, proj.y, proj.radius);
          fireGrad.addColorStop(0, '#FFFFFF');
          fireGrad.addColorStop(0.3, '#FFCC00');
          fireGrad.addColorStop(0.7, '#FF6600');
          fireGrad.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
          context.fillStyle = fireGrad;
          context.beginPath();
          context.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
          context.fill();
        }
        break;
    }
    context.restore();
  }
}

/* --- Gun Game: draw pipe fragments --- */
function drawPipeFragments() {
  for (const frag of gunState.pipeFragments) {
    if (frag.color === 'ring') {
      context.strokeStyle = `rgba(255, 200, 50, ${frag.alpha})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(frag.x, frag.y, frag.ringRadius, 0, Math.PI * 2);
      context.stroke();
      continue;
    }
    context.save();
    context.translate(frag.x, frag.y);
    context.rotate(frag.rot);
    context.globalAlpha = frag.alpha;
    context.fillStyle = frag.color;
    context.fillRect(-frag.w / 2, -frag.h / 2, frag.w, frag.h);
    context.restore();
  }
}

/* --- Gun Game: draw HUD --- */
function drawGunHUD() {
  context.fillStyle = 'rgba(0, 0, 0, 0.4)';
  context.fillRect(5, 5, 140, 38);
  context.fillStyle = '#FFFFFF';
  context.font = "bold 14px 'Trebuchet MS'";
  context.textAlign = 'left';
  context.fillText(`TIER ${gunState.tier}/8`, 12, 20);
  context.font = "11px 'Trebuchet MS'";
  context.fillStyle = '#FFD700';
  context.fillText(weaponDefs[gunState.tier - 1].name, 12, 36);

  // Destroy progress circles
  const circleStartX = canvas.width - 55;
  for (let i = 0; i < 3; i++) {
    const cx = circleStartX + i * 16;
    const cy = 18;
    context.beginPath();
    context.arc(cx, cy, 6, 0, Math.PI * 2);
    if (i < gunState.destroys) {
      context.fillStyle = '#FFD700';
      context.fill();
    } else {
      context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  // Cooldown bar
  const wep = weaponDefs[gunState.tier - 1];
  const cooldownPct = gunState.cooldown / (wep.fireRate / 1000);
  context.fillStyle = 'rgba(0, 0, 0, 0.3)';
  context.fillRect(12, 42, 80, 4);
  context.fillStyle = cooldownPct > 0 ? '#FF6644' : '#44FF66';
  context.fillRect(12, 42, 80 * (1 - cooldownPct), 4);

  // Tier flash
  if (gunState.tierFlash > 0) {
    const alpha = Math.min(1, gunState.tierFlash);
    const scale = 1 + (1.5 - gunState.tierFlash) * 0.3;
    context.save();
    context.globalAlpha = alpha;
    context.translate(canvas.width / 2, canvas.height * 0.3);
    context.scale(scale, scale);
    context.fillStyle = '#FFD700';
    context.font = "bold 22px 'Trebuchet MS'";
    context.textAlign = 'center';
    context.fillText(`TIER ${gunState.tier}`, 0, 0);
    context.font = "16px 'Trebuchet MS'";
    context.fillStyle = '#FFFFFF';
    context.fillText(gunState.tierFlashName, 0, 24);
    context.restore();
  }

  // Demotion message
  if (gunState.demotionTimer > 0) {
    context.globalAlpha = Math.min(1, gunState.demotionTimer);
    context.fillStyle = '#FF4444';
    context.font = "bold 16px 'Trebuchet MS'";
    context.textAlign = 'center';
    context.fillText(gunState.demotionMsg, canvas.width / 2, canvas.height * 0.4);
    context.globalAlpha = 1;
  }
}

/* --- Gun Game: mode selection screen --- */
function drawModeSelect() {
  const vg = context.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.1,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.7
  );
  vg.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  context.fillStyle = vg;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#FFFFFF';
  context.font = "bold 30px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText('Flappy Bird', canvas.width / 2, canvas.height / 2 - 80);

  context.font = "16px 'Trebuchet MS'";
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.fillText('Choose a mode:', canvas.width / 2, canvas.height / 2 - 45);

  const btnW = 160, btnH = 44;
  const btnX = canvas.width / 2 - btnW / 2;
  const classicY = canvas.height / 2 - 20;
  context.fillStyle = '#3da870';
  context.beginPath();
  context.roundRect(btnX, classicY, btnW, btnH, 8);
  context.fill();
  context.fillStyle = '#FFFFFF';
  context.font = "bold 18px 'Trebuchet MS'";
  context.fillText('Classic', canvas.width / 2, classicY + 28);

  const gunY = canvas.height / 2 + 40;
  context.fillStyle = '#cc4444';
  context.beginPath();
  context.roundRect(btnX, gunY, btnW, btnH, 8);
  context.fill();
  context.fillStyle = '#FFFFFF';
  context.fillText('Gun Game', canvas.width / 2, gunY + 28);

  drawModeSelect._classicRect = { x: btnX, y: classicY, w: btnW, h: btnH };
  drawModeSelect._gunRect = { x: btnX, y: gunY, w: btnW, h: btnH };
}

/* --- Gun Game: weapon indicator on bird --- */
function drawBirdWeapon() {
  if (gameMode !== 'gunGame' || !gameState.isRunning) return;
  context.save();
  context.translate(bird.x, bird.y);
  const tilt = Math.max(-0.5, Math.min(0.65, bird.velocity * 0.0012));
  context.rotate(tilt);
  const tier = gunState.tier;
  if (tier <= 2) {
    context.fillStyle = tier === 1 ? '#8B6914' : '#FFFFF0';
    context.beginPath();
    context.moveTo(bird.radius + 2, -4);
    context.lineTo(bird.radius + 14, 0);
    context.lineTo(bird.radius + 2, 4);
    context.closePath();
    context.fill();
  } else if (tier <= 4) {
    context.fillStyle = '#555555';
    context.fillRect(-2, -bird.radius - 4, 10, 4);
    context.fillStyle = '#888888';
    context.beginPath();
    context.arc(8, -bird.radius - 2, 3, 0, Math.PI * 2);
    context.fill();
  } else if (tier <= 6) {
    const auraColor = tier === 5 ? 'rgba(160, 216, 255, 0.3)' : 'rgba(255, 200, 0, 0.3)';
    const auraGrad = context.createRadialGradient(0, 0, bird.radius, 0, 0, bird.radius + 10);
    auraGrad.addColorStop(0, auraColor);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = auraGrad;
    context.beginPath();
    context.arc(0, 0, bird.radius + 10, 0, Math.PI * 2);
    context.fill();
  } else {
    const coronaColor = tier === 7 ? '#FFFF44' : '#FF6600';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + performance.now() * 0.005;
      const len = bird.radius + 6 + Math.sin(performance.now() * 0.01 + i) * 4;
      context.strokeStyle = coronaColor;
      context.lineWidth = 1.5;
      context.globalAlpha = 0.6;
      context.beginPath();
      context.moveTo(Math.cos(angle) * bird.radius, Math.sin(angle) * bird.radius);
      context.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
      context.stroke();
    }
    context.globalAlpha = 1;
  }
  context.restore();
}

/* --- Gun Game: victory screen --- */
function drawVictory() {
  const vg = context.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 20,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.6
  );
  vg.addColorStop(0, "rgba(255, 200, 0, 0.3)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.6)");
  context.fillStyle = vg;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.shadowColor = '#FFD700';
  context.shadowBlur = 30;
  context.fillStyle = '#FFD700';
  context.font = "bold 42px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText('VICTORY!', canvas.width / 2, canvas.height / 2 - 40);
  context.restore();

  const totalScore = gameState.score + gunState.totalDestroyed * 2;
  context.fillStyle = '#FFFFFF';
  context.font = "18px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText(`Score: ${totalScore}`, canvas.width / 2, canvas.height / 2 + 10);
  context.fillText(`Pipes Destroyed: ${gunState.totalDestroyed}`, canvas.width / 2, canvas.height / 2 + 35);
  context.fillText(`Pipes Passed: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 60);

  context.fillStyle = 'rgba(255, 255, 255, 0.6)';
  context.font = "14px 'Trebuchet MS'";
  context.fillText('Tap or press Space to play again', canvas.width / 2, canvas.height / 2 + 100);
}

/* --- Gun Game: game over overlay --- */
function drawGunGameOver() {
  const vg = context.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.1,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.7
  );
  vg.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  context.fillStyle = vg;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#FF6644';
  context.font = "bold 28px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 30);

  context.fillStyle = '#FFFFFF';
  context.font = "16px 'Trebuchet MS'";
  context.fillText(`Demoted to Tier ${gunState.tier}`, canvas.width / 2, canvas.height / 2 + 5);
  context.fillText(`Highest Tier: ${gunState.highestTier}`, canvas.width / 2, canvas.height / 2 + 30);
  context.fillText(`Pipes Destroyed: ${gunState.totalDestroyed}`, canvas.width / 2, canvas.height / 2 + 55);

  context.fillStyle = 'rgba(255, 255, 255, 0.6)';
  context.font = "14px 'Trebuchet MS'";
  context.fillText('Tap or press Space to retry', canvas.width / 2, canvas.height / 2 + 90);
}

const draw = () => {
  context.save();

  /* Apply screen shake */
  if (gameState.shakeTimer > 0) {
    const sx = (Math.random() - 0.5) * gameState.shakeIntensity;
    const sy = (Math.random() - 0.5) * gameState.shakeIntensity;
    context.translate(sx, sy);
  }

  context.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);
  drawBackground();
  drawWind();
  drawPipes();
  if (gameMode === 'gunGame') {
    drawPipeFragments();
    drawProjectiles();
  }
  drawBird();
  if (gameMode === 'gunGame') drawBirdWeapon();
  drawFeatherParticles();
  drawScorePop();

  /* Gun game invincibility blink */
  if (gameMode === 'gunGame' && gunState.invincibleTimer > 0) {
    if (Math.floor(gunState.invincibleTimer * 10) % 2 === 0) {
      context.fillStyle = 'rgba(255, 255, 255, 0.15)';
      context.beginPath();
      context.arc(bird.x, bird.y, bird.radius + 6, 0, Math.PI * 2);
      context.fill();
    }
  }

  /* Gun game screen flash */
  if (gameMode === 'gunGame' && gunState.screenFlash > 0) {
    context.fillStyle = `rgba(255, 255, 200, ${gunState.screenFlash * 2})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (gameMode === 'gunGame' && gameState.isRunning) drawGunHUD();

  if (!gameState.isRunning && !gameState.isGameOver) {
    if (!modeSelected) {
      drawModeSelect();
    } else {
      drawOverlay(I18N.t("tapToStart"), gameMode === 'gunGame' ? 'F/Right-tap to shoot, Space/Left-tap to flap' : I18N.t("keepBirdInGaps"));
    }
  }

  if (gameState.isGameOver) {
    if (gameMode === 'gunGame') {
      drawGunGameOver();
    } else {
      drawOverlay(I18N.t("gameOver"), I18N.t("tapOrSpaceTryAgain"));
    }
  }

  if (gameMode === 'gunGame' && gunState.victoryTriggered) {
    drawVictory();
  }

  context.restore();
};

const loop = (timestamp) => {
  if (!gameState.lastTime) {
    gameState.lastTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - gameState.lastTime) / 1000, 0.033);
  gameState.lastTime = timestamp;

  update(deltaSeconds);
  draw();
  requestAnimationFrame(loop);
};

const startGame = () => {
  if (!gameState.isRunning) {
    gameState.isRunning = true;
    Audio.startDrone();
  }
};

let lastFlapTime = 0;
const FLAP_COOLDOWN = 100; // ms — prevents double-tap from firing two flaps

const flap = () => {
  const now = performance.now();
  if (now - lastFlapTime < FLAP_COOLDOWN) return;
  lastFlapTime = now;

  Audio.init();
  Audio.resume();

  if (gameState.isGameOver) {
    if (gameMode === 'gunGame' && gunState.victoryTriggered) {
      fullGunReset();
    }
    resetGame();
    if (modeSelected) startGame();
  } else if (!gameState.isRunning) {
    if (modeSelected) startGame();
  }

  if (gameState.isRunning) {
    bird.velocity = gameState.lift;
    Audio.flap();
  }
};

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  }
  if ((event.code === "KeyF" || event.code === "Enter") && gameMode === 'gunGame') {
    event.preventDefault();
    shoot();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  // Mode selection screen: check button clicks
  if (!modeSelected && !gameState.isRunning && !gameState.isGameOver) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    const classicRect = drawModeSelect._classicRect;
    const gunRect = drawModeSelect._gunRect;

    if (classicRect && clickX >= classicRect.x && clickX <= classicRect.x + classicRect.w &&
        clickY >= classicRect.y && clickY <= classicRect.y + classicRect.h) {
      Audio.init();
      Audio.resume();
      gameMode = 'classic';
      modeSelected = true;
      resetGame();
      draw();
      return;
    }
    if (gunRect && clickX >= gunRect.x && clickX <= gunRect.x + gunRect.w &&
        clickY >= gunRect.y && clickY <= gunRect.y + gunRect.h) {
      Audio.init();
      Audio.resume();
      gameMode = 'gunGame';
      modeSelected = true;
      fullGunReset();
      resetGame();
      draw();
      return;
    }
    return; // Don't flap if clicking outside buttons
  }

  // Gun game: split touch zones
  if (gameMode === 'gunGame' && gameState.isRunning && !gameState.isGameOver) {
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) * (canvas.width / rect.width);
    if (clickX > canvas.width / 2) {
      shoot();
      return;
    }
  }

  flap();
});

canvas.addEventListener("dblclick", (event) => {
  event.preventDefault();
});

restartButton.addEventListener("click", () => {
  modeSelected = false;
  gameMode = 'classic';
  fullGunReset();
  resetGame();
});

/* --- Mute toggle --- */
const muteButton = document.getElementById("muteButton");
if (muteButton) {
  const updateMuteLabel = () => {
    muteButton.textContent = Audio.isMuted() ? I18N.t("fbUnmute") : I18N.t("fbMute");
  };
  muteButton.addEventListener("click", () => {
    Audio.init();
    Audio.toggle();
    updateMuteLabel();
  });
  updateMuteLabel();
}

loadBestScore();
resetGame();
requestAnimationFrame(loop);
