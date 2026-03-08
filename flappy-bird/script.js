const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");

/* ── Virtual game dimensions (all game logic uses these) ── */
const GAME_W = 360;
const GAME_H = 640;

/* --- i18n setup --- */
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();

window.addEventListener('langchange', () => {
  I18N.applyDOM();
  draw();
});

/* ── Achievements ────────────────────────────────────────── */
const FB_ACHIEVEMENTS = [
  { id: 'first_flight',  icon: '\u2708\uFE0F', title: 'First Flight',   desc: 'Pass your first pipe',     check: s => s.bestScore >= 1 },
  { id: 'score_10',      icon: '\uD83D\uDD1F', title: 'Double Digits',  desc: 'Score 10 in one game',     check: s => s.bestScore >= 10 },
  { id: 'score_25',      icon: '\uD83D\uDE80', title: 'High Flyer',     desc: 'Score 25 in one game',     check: s => s.bestScore >= 25 },
  { id: 'score_50',      icon: '\uD83D\uDC51', title: 'Sky King',       desc: 'Score 50 in one game',     check: s => s.bestScore >= 50 },
  { id: 'flap_500',      icon: '\uD83D\uDCAA', title: 'Flap Master',    desc: 'Flap 500 times total',     check: s => s.totalFlaps >= 500 },
  { id: 'games_10',      icon: '\uD83C\uDFAE', title: 'Dedicated',      desc: 'Play 10 games',            check: s => s.gamesPlayed >= 10 },
  { id: 'night_owl',     icon: '\uD83E\uDD89', title: 'Night Owl',      desc: 'Reach score 40+',          check: s => s.bestScore >= 40 },
  { id: 'zen_master',    icon: '\uD83E\uDDD8', title: 'Zen Master',     desc: 'Survive 2 min in zen mode', check: s => s.zenMaster === true },
];

let fbAchStats = { bestScore: 0, totalFlaps: 0, gamesPlayed: 0, zenMaster: false };
let fbUnlocked = new Set();
let fbAchQueue = [];
let fbAchTimer = 0;

function loadFbAch() {
  try {
    const s = JSON.parse(localStorage.getItem('flappyAch') || '{}');
    if (s.unlocked) fbUnlocked = new Set(s.unlocked);
    if (s.stats) Object.assign(fbAchStats, s.stats);
  } catch (_) {}
}
function saveFbAch() {
  localStorage.setItem('flappyAch', JSON.stringify({ unlocked: [...fbUnlocked], stats: fbAchStats }));
}
function checkFbAch() {
  for (const a of FB_ACHIEVEMENTS) {
    if (!fbUnlocked.has(a.id) && a.check(fbAchStats)) {
      fbUnlocked.add(a.id);
      fbAchQueue.push(a);
      saveFbAch();
    }
  }
}
function showFbAchPopup() {
  if (fbAchTimer > 0 || fbAchQueue.length === 0) return;
  const a = fbAchQueue.shift();
  const popup = document.getElementById('achievementPopup');
  document.getElementById('achievementPopupIcon').textContent = a.icon;
  document.getElementById('achievementPopupTitle').textContent = a.title;
  document.getElementById('achievementPopupDesc').textContent = a.desc;
  popup.classList.add('show');
  fbAchTimer = 3;
  setTimeout(() => { popup.classList.remove('show'); setTimeout(() => { fbAchTimer = 0; showFbAchPopup(); }, 500); }, 3000);
}
function renderFbAchList() {
  const list = document.getElementById('achievementsList');
  list.innerHTML = '';
  for (const a of FB_ACHIEVEMENTS) {
    const el = document.createElement('div');
    el.className = 'achievement-item' + (fbUnlocked.has(a.id) ? ' unlocked' : '');
    el.innerHTML = '<span class="achievement-item__icon">' + a.icon + '</span><span>' + a.title + '</span>';
    list.appendChild(el);
  }
}
document.getElementById('achievementsToggle').addEventListener('click', () => {
  document.getElementById('achievementsList').classList.toggle('open');
  renderFbAchList();
});
loadFbAch();

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
  zenMode: false,
  zenModeStartTime: 0,
};

const bird = {
  x: 80,
  y: GAME_H / 2,
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
let stars = [];

/* --- Game over flash + expanding ring --- */
let gameOverFlash = 0;
let gameOverRingRadius = 0;
let gameOverRingAlpha = 0;
let gameOverBirdPos = null;

/* --- Ambient gameplay particles (fireflies/pollen) --- */
let ambientParticles = [];

/* --- Shooting stars for night phase --- */
let shootingStars = [];
let shootingStarTimer = 0;

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
  const segW = GAME_W / segments;
  for (let i = 0; i <= segments; i++) {
    hills.push({
      x: i * segW,
      y: GAME_H - 90 - 20 - Math.sin(i * 0.7) * 18 - Math.sin(i * 1.3) * 10,
    });
  }
}

/* --- Generate tree silhouettes along ground edge --- */
function initTrees() {
  trees = [];
  const count = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    trees.push({
      x: Math.random() * GAME_W,
      height: 14 + Math.random() * 20,
      width: 8 + Math.random() * 10,
    });
  }
}

/* --- Generate grass blade tufts along ground top edge --- */
function initGrass() {
  grassBlades = [];
  const groundTop = GAME_H - 90;
  for (let x = 0; x < GAME_W; x += 3 + Math.random() * 5) {
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
  const groundTop = GAME_H - 90;
  const count = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    flowers.push({
      x: 20 + Math.random() * (GAME_W - 40),
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
      x: 50 + Math.random() * (GAME_W - 100),
      y: 80 + Math.random() * (GAME_H * 0.35),
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

/* --- Init stars for night sky --- */
function initStars() {
  stars = [];
  const count = 30 + Math.floor(Math.random() * 21);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * GAME_W,
      y: Math.random() * (GAME_H * 0.6),
      brightness: 0.4 + Math.random() * 0.6,
      twinklePhase: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * 1.5,
    });
  }
}

/* --- Init leaf particles --- */
function initLeaves() {
  leafParticles = [];
  for (let i = 0; i < 4; i++) {
    leafParticles.push({
      x: Math.random() * GAME_W,
      y: 60 + Math.random() * (GAME_H - 160),
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
      x: Math.random() * GAME_W,
      y: 30 + Math.random() * (GAME_H * 0.5),
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
  bird.y = GAME_H / 2;
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
  gameState._lbSubmitted = false;
  gameState._achCounted = false;
  gameState.zenModeStartTime = 0;
  /* Apply zen mode settings */
  if (gameState.zenMode) {
    gameState.speed = 120;
    gameState.gap = 220;
  } else {
    gameState.speed = 190;
    gameState.gap = 150;
  }
  scoreLabel.textContent = gameState.score;
  if (gameState.zenMode) {
    scoreLabel.parentElement.style.visibility = "hidden";
  } else {
    scoreLabel.parentElement.style.visibility = "visible";
  }
  initClouds();
  initHills();
  initTrees();
  initGrass();
  initLeaves();
  initFlowers();
  initButterflies();
  initStars();
  /* Init ambient particles */
  ambientParticles = [];
  for (let i = 0; i < 10; i++) {
    ambientParticles.push({
      x: Math.random() * GAME_W,
      y: 40 + Math.random() * (GAME_H - 160),
      speedX: 3 + Math.random() * 6,
      speedY: 2 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * 1.5,
      alpha: 0.2 + Math.random() * 0.4,
    });
  }
  /* Reset shooting stars */
  shootingStars = [];
  shootingStarTimer = 0;
  /* Reset game over flash */
  gameOverFlash = 0;
  gameOverRingRadius = 0;
  gameOverRingAlpha = 0;
  gameOverBirdPos = null;
  Audio.stopDrone();
  draw();
};

const spawnPipe = () => {
  const minHeight = 60;
  const maxHeight = GAME_H - gameState.gap - 160;
  const topHeight = Math.floor(
    Math.random() * (maxHeight - minHeight + 1) + minHeight
  );
  pipes.push({
    x: GAME_W + gameState.pipeWidth,
    top: topHeight,
    passed: false,
    vines: [
      { xOff: 8 + Math.random() * 20, amp: 2 + Math.random() * 3, freq: 0.04 + Math.random() * 0.02 },
      { xOff: 30 + Math.random() * 15, amp: 1.5 + Math.random() * 2, freq: 0.05 + Math.random() * 0.03 },
    ],
    cracks: [
      { xOff: 10 + Math.random() * 30, yStart: Math.random() * 0.3, len: 15 + Math.random() * 25, angle: -0.3 + Math.random() * 0.6 },
      { xOff: 5 + Math.random() * 40, yStart: 0.4 + Math.random() * 0.3, len: 10 + Math.random() * 20, angle: -0.4 + Math.random() * 0.8 },
    ],
  });
};

/* --- Wind particles for speed feel --- */
const spawnWindParticle = () => {
  windParticles.push({
    x: GAME_W + 5,
    y: Math.random() * GAME_H,
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

/* --- Determine sky phase from score --- */
function getSkyPhase(score) {
  if (score < 10) {
    return { phase: "dawn", t: score / 10 };
  } else if (score < 25) {
    return { phase: "day", t: (score - 10) / 15 };
  } else if (score < 40) {
    return { phase: "sunset", t: (score - 25) / 15 };
  } else {
    return { phase: "night", t: Math.min((score - 40) / 10, 1) };
  }
}

const drawBackground = () => {
  const { phase, t } = getSkyPhase(gameState.score);
  const isNight = phase === "night";

  let skyTop, skyMid, skyLow, skyBot;

  if (phase === "dawn") {
    /* Dawn (score 0-10): blue sky -> warm orange sunrise */
    skyTop = lerpColor("#5cb8ff", "#ff8844", t);
    skyMid = lerpColor("#a8e0ff", "#ffaa66", t);
    skyLow = lerpColor("#d4f0d4", "#ffcc88", t);
    skyBot = lerpColor("#7be495", "#7be495", t * 0.3);
  } else if (phase === "day") {
    /* Day (score 10-25): warm orange -> bright blue */
    skyTop = lerpColor("#ff8844", "#4ab0ff", t);
    skyMid = lerpColor("#ffaa66", "#8dd4ff", t);
    skyLow = lerpColor("#ffcc88", "#c4edcc", t);
    skyBot = lerpColor("#7be495", "#7be495", 0);
  } else if (phase === "sunset") {
    /* Sunset (score 25-40): bright blue -> golden/orange */
    skyTop = lerpColor("#4ab0ff", "#cc5522", t);
    skyMid = lerpColor("#8dd4ff", "#ee8833", t);
    skyLow = lerpColor("#c4edcc", "#ffbb66", t);
    skyBot = lerpColor("#7be495", "#5a9e60", t);
  } else {
    /* Night (score 40+): golden/orange -> dark blue/purple */
    skyTop = lerpColor("#cc5522", "#0a0e2a", t);
    skyMid = lerpColor("#ee8833", "#1a1a4a", t);
    skyLow = lerpColor("#ffbb66", "#1a1a3a", t);
    skyBot = lerpColor("#5a9e60", "#0d2818", t);
  }

  /* Sky gradient */
  const skyGrad = context.createLinearGradient(0, 0, 0, GAME_H);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(0.55, skyMid);
  skyGrad.addColorStop(0.85, skyLow);
  skyGrad.addColorStop(1, skyBot);
  context.fillStyle = skyGrad;
  context.fillRect(0, 0, GAME_W, GAME_H);

  /* Stars during night phase */
  if (isNight && stars.length > 0) {
    const now = performance.now() / 1000;
    for (const star of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(now * 2.5 + star.twinklePhase);
      const alpha = star.brightness * twinkle * t;
      context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      context.beginPath();
      context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      context.fill();
    }

    /* Shooting stars (night only) */
    for (const ss of shootingStars) {
      const trailLen = 25;
      const grad = context.createLinearGradient(
        ss.x, ss.y,
        ss.x - (ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * trailLen,
        ss.y - (ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * trailLen
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${ss.alpha})`);
      grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
      context.strokeStyle = grad;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(ss.x, ss.y);
      const mag = Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy);
      context.lineTo(
        ss.x - (ss.vx / mag) * trailLen,
        ss.y - (ss.vy / mag) * trailLen
      );
      context.stroke();
    }
  }

  const sunX = 60;
  const sunY = 50;

  if (isNight) {
    /* Moon (crescent) replaces sun during night */
    const moonAlpha = 0.5 + t * 0.5;
    /* Moon glow */
    const moonGlow = context.createRadialGradient(sunX, sunY, 6, sunX, sunY, 50);
    moonGlow.addColorStop(0, `rgba(200, 210, 255, ${0.3 * moonAlpha})`);
    moonGlow.addColorStop(1, "rgba(200, 210, 255, 0)");
    context.fillStyle = moonGlow;
    context.fillRect(0, 0, 140, 120);

    /* Full moon circle */
    context.fillStyle = `rgba(230, 235, 255, ${moonAlpha})`;
    context.beginPath();
    context.arc(sunX, sunY, 16, 0, Math.PI * 2);
    context.fill();

    /* Dark circle to create crescent effect */
    context.fillStyle = skyTop;
    context.beginPath();
    context.arc(sunX + 7, sunY - 3, 13, 0, Math.PI * 2);
    context.fill();
  } else {
    /* Sun glow in top-left */
    const sunAlpha = phase === "night" ? 0 : 1;
    const haloGrad = context.createRadialGradient(sunX, sunY, 8, sunX, sunY, 70);
    const scoreProgress = phase === "dawn" ? t : (phase === "sunset" ? t : 0);
    const haloAlpha = 0.12 + scoreProgress * 0.1;
    haloGrad.addColorStop(0, `rgba(255, 240, 180, ${(0.6 + scoreProgress * 0.3) * sunAlpha})`);
    haloGrad.addColorStop(0.3, `rgba(255, 220, 120, ${haloAlpha * sunAlpha})`);
    haloGrad.addColorStop(1, "rgba(255, 220, 120, 0)");
    context.fillStyle = haloGrad;
    context.fillRect(0, 0, 160, 140);

    /* Sun circle */
    context.fillStyle = `rgba(255, 240, 200, ${(0.7 + scoreProgress * 0.2) * sunAlpha})`;
    context.beginPath();
    context.arc(sunX, sunY, 16, 0, Math.PI * 2);
    context.fill();
  }

  /* Parallax clouds — darken during night */
  for (const cloud of clouds) {
    const cloudR = isNight ? Math.round(100 + 155 * (1 - t)) : 255;
    const cloudG = isNight ? Math.round(100 + 155 * (1 - t)) : 255;
    const cloudB = isNight ? Math.round(120 + 135 * (1 - t)) : 255;
    const cloudA = isNight ? cloud.alpha * 0.5 : cloud.alpha;
    context.fillStyle = `rgba(${cloudR}, ${cloudG}, ${cloudB}, ${cloudA})`;
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

  /* Distant rolling hills layer — darken during night */
  const groundTop = GAME_H - 90;
  const nightDim = isNight ? (1 - t * 0.7) : 1;
  if (hills.length > 1) {
    const hillR = Math.round(80 * nightDim);
    const hillG = Math.round(160 * nightDim);
    const hillB = Math.round(100 * nightDim);
    context.fillStyle = `rgba(${hillR}, ${hillG}, ${hillB}, 0.25)`;
    context.beginPath();
    context.moveTo(0, groundTop);
    for (const h of hills) {
      context.lineTo(h.x, h.y);
    }
    context.lineTo(GAME_W, groundTop);
    context.closePath();
    context.fill();

    /* Second, slightly different hill layer for depth */
    const hill2R = Math.round(60 * nightDim);
    const hill2G = Math.round(140 * nightDim);
    const hill2B = Math.round(80 * nightDim);
    context.fillStyle = `rgba(${hill2R}, ${hill2G}, ${hill2B}, 0.15)`;
    context.beginPath();
    context.moveTo(0, groundTop);
    for (let i = 0; i < hills.length; i++) {
      context.lineTo(hills[i].x, hills[i].y + 8 + Math.sin(i * 1.1) * 6);
    }
    context.lineTo(GAME_W, groundTop);
    context.closePath();
    context.fill();
  }

  /* Tree silhouettes along ground edge */
  for (const tree of trees) {
    const treeAlpha = isNight ? 0.5 : 0.3;
    context.fillStyle = `rgba(${Math.round(40 * nightDim)}, ${Math.round(100 * nightDim)}, ${Math.round(50 * nightDim)}, ${treeAlpha})`;
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
    context.globalAlpha = leaf.alpha * nightDim;
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

  /* Ground layers — darken during night */
  const groundR1 = Math.round(123 * nightDim);
  const groundG1 = Math.round(228 * nightDim);
  const groundB1 = Math.round(149 * nightDim);
  context.fillStyle = `rgba(${groundR1}, ${groundG1}, ${groundB1}, 0.5)`;
  context.fillRect(0, groundTop, GAME_W, 90);

  const gTopColor = lerpColor("#6cd47e", "#1a3a22", isNight ? t : 0);
  const gBotColor = lerpColor("#4fb866", "#0f2a18", isNight ? t : 0);
  const groundGrad = context.createLinearGradient(0, GAME_H - 35, 0, GAME_H);
  groundGrad.addColorStop(0, gTopColor);
  groundGrad.addColorStop(1, gBotColor);
  context.fillStyle = groundGrad;
  context.fillRect(0, GAME_H - 35, GAME_W, 35);

  /* Ground depth texture: horizontal stripe lines */
  context.strokeStyle = `rgba(0, 0, 0, 0.06)`;
  context.lineWidth = 1;
  for (let sy = groundTop + 15; sy < GAME_H - 40; sy += 18) {
    context.beginPath();
    context.moveTo(0, sy);
    context.lineTo(GAME_W, sy);
    context.stroke();
  }
  /* Bright top-edge highlight line */
  context.strokeStyle = `rgba(255, 255, 255, 0.15)`;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, groundTop);
  context.lineTo(GAME_W, groundTop);
  context.stroke();

  /* Grass blade tufts along ground top edge — darken during night */
  const grassColor1 = lerpColor("#3aad55", "#1a4a28", isNight ? t : 0);
  const grassColor2 = lerpColor("#5cc86e", "#2a5a35", isNight ? t : 0);
  context.strokeStyle = grassColor1;
  context.lineWidth = 1.2;
  for (const g of grassBlades) {
    context.beginPath();
    context.moveTo(g.x, groundTop);
    context.lineTo(g.x + g.lean, groundTop - g.height);
    context.stroke();
  }
  /* Second layer of grass (slightly different color, offset) */
  context.strokeStyle = grassColor2;
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
      context.strokeStyle = grassColor1;
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
    context.globalAlpha = 0.7 * nightDim;
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

  /* Ambient gameplay particles (fireflies/pollen) */
  const now = performance.now() / 1000;
  for (const ap of ambientParticles) {
    const pulsingAlpha = ap.alpha * (0.5 + 0.5 * Math.sin(now * 2 + ap.phase));
    if (isNight) {
      /* Night: firefly glow (green/gold) */
      context.save();
      context.shadowBlur = 6;
      context.shadowColor = Math.random() > 0.5 ? "rgba(100,255,100,0.8)" : "rgba(255,220,80,0.8)";
      context.fillStyle = `rgba(180, 255, 120, ${pulsingAlpha})`;
      context.beginPath();
      context.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      /* Day: tiny white/yellow dots */
      const r = Math.random() > 0.5 ? 255 : 255;
      const g = Math.random() > 0.5 ? 255 : 240;
      const b = Math.random() > 0.5 ? 255 : 180;
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulsingAlpha * 0.5})`;
      context.beginPath();
      context.arc(ap.x, ap.y, ap.size * 0.7, 0, Math.PI * 2);
      context.fill();
    }
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

  /* Squash/stretch scaling on flap */
  const flapStretch = bird.velocity < -200 ? 1 + Math.min(0.15, Math.abs(bird.velocity) * 0.0003) : 1;
  context.scale(flapStretch, 2 - flapStretch);

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

/* --- Pipe skin based on score --- */
function getPipeSkin(score) {
  if (score < 15) {
    /* Wooden: brown/tan colors */
    return {
      type: "wooden",
      bodyLeft: "#8B6914",
      bodyMidL: "#A07828",
      bodyMidR: "#967020",
      bodyRight: "#7A5A10",
      capLeft: "#8B6914",
      capMidL: "#B08830",
      capMidR: "#A07828",
      capRight: "#7A5A10",
      highlight: "rgba(255, 230, 180, 0.15)",
      crackColor: "rgba(60, 35, 5, 0.2)",
      vineColor: "rgba(80, 60, 20, 0.2)",
      shadowColor: "rgba(50, 30, 5, 0.12)",
    };
  } else if (score < 30) {
    /* Metal: silver/gray metallic */
    return {
      type: "metal",
      bodyLeft: "#808890",
      bodyMidL: "#a0a8b0",
      bodyMidR: "#909aa4",
      bodyRight: "#707880",
      capLeft: "#808890",
      capMidL: "#b0b8c0",
      capMidR: "#a0a8b0",
      capRight: "#707880",
      highlight: "rgba(255, 255, 255, 0.2)",
      crackColor: "rgba(40, 40, 50, 0.15)",
      vineColor: "rgba(60, 60, 70, 0.15)",
      shadowColor: "rgba(0, 0, 0, 0.12)",
    };
  } else {
    /* Neon: bright magenta/cyan with glow */
    return {
      type: "neon",
      bodyLeft: "#aa1188",
      bodyMidL: "#dd22aa",
      bodyMidR: "#cc1199",
      bodyRight: "#880066",
      capLeft: "#00bbcc",
      capMidL: "#00eeff",
      capMidR: "#00ddee",
      capRight: "#009aaa",
      highlight: "rgba(255, 100, 255, 0.25)",
      crackColor: "rgba(0, 255, 255, 0.2)",
      vineColor: "rgba(255, 0, 255, 0.2)",
      shadowColor: "rgba(0, 0, 0, 0.15)",
    };
  }
}

const drawPipes = () => {
  const skin = getPipeSkin(gameState.score);

  pipes.forEach((pipe, pipeIdx) => {
    /* Pipe cap dimensions */
    const capW = gameState.pipeWidth + 10;
    const capH = 18;
    const capX = pipe.x - 5;

    /* Neon glow aura (before pipe body so it appears behind) */
    if (skin.type === "neon") {
      context.save();
      context.shadowColor = "#ff00ff";
      context.shadowBlur = 18;
      context.fillStyle = "rgba(255, 0, 255, 0.08)";
      context.fillRect(pipe.x - 4, 0, gameState.pipeWidth + 8, pipe.top - capH);
      context.restore();
    }

    /* Top pipe body */
    const topGrad = context.createLinearGradient(pipe.x, 0, pipe.x + gameState.pipeWidth, 0);
    topGrad.addColorStop(0, skin.bodyLeft);
    topGrad.addColorStop(0.3, skin.bodyMidL);
    topGrad.addColorStop(0.7, skin.bodyMidR);
    topGrad.addColorStop(1, skin.bodyRight);
    context.fillStyle = topGrad;
    context.fillRect(pipe.x, 0, gameState.pipeWidth, pipe.top - capH);

    /* Wood grain texture for wooden pipes */
    if (skin.type === "wooden") {
      context.strokeStyle = "rgba(100, 60, 10, 0.12)";
      context.lineWidth = 0.8;
      for (let gy = 8; gy < pipe.top - capH; gy += 12) {
        context.beginPath();
        context.moveTo(pipe.x, gy);
        context.bezierCurveTo(
          pipe.x + gameState.pipeWidth * 0.3, gy + 2,
          pipe.x + gameState.pipeWidth * 0.7, gy - 2,
          pipe.x + gameState.pipeWidth, gy
        );
        context.stroke();
      }
    }

    /* Top cap */
    const capGrad = context.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, skin.capLeft);
    capGrad.addColorStop(0.3, skin.capMidL);
    capGrad.addColorStop(0.7, skin.capMidR);
    capGrad.addColorStop(1, skin.capRight);

    if (skin.type === "neon") {
      context.save();
      context.shadowColor = "#00ffff";
      context.shadowBlur = 14;
    }
    context.fillStyle = capGrad;
    context.beginPath();
    context.roundRect(capX, pipe.top - capH, capW, capH, [4, 4, 0, 0]);
    context.fill();
    if (skin.type === "neon") {
      context.restore();
    }

    /* Metal rivets on cap */
    if (skin.type === "metal") {
      context.fillStyle = "rgba(200, 210, 220, 0.6)";
      context.strokeStyle = "rgba(50, 55, 60, 0.4)";
      context.lineWidth = 0.5;
      const rivetY = pipe.top - capH / 2;
      for (let rx = capX + 8; rx < capX + capW - 4; rx += 14) {
        context.beginPath();
        context.arc(rx, rivetY, 2.5, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    }

    /* Highlight stripe on top pipe */
    context.fillStyle = skin.highlight;
    context.fillRect(pipe.x + 8, 0, 6, pipe.top - capH);

    /* Crack/texture lines on top pipe surface */
    context.strokeStyle = skin.crackColor;
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
    context.strokeStyle = skin.vineColor;
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

    /* Water drip at bottom of top pipe cap (only on first pipe) */
    if (dripState.falling && pipeIdx === 0) {
      const dripX = pipe.x + gameState.pipeWidth * 0.4;
      const dripY = pipe.top + dripState.y;
      context.fillStyle = `rgba(150, 210, 255, ${dripState.alpha})`;
      context.beginPath();
      context.arc(dripX, dripY, 1.8, 0, Math.PI * 2);
      context.fill();
    }

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

    /* Neon glow aura for bottom pipe */
    if (skin.type === "neon") {
      context.save();
      context.shadowColor = "#ff00ff";
      context.shadowBlur = 18;
      context.fillStyle = "rgba(255, 0, 255, 0.08)";
      context.fillRect(pipe.x - 4, bottomY + capH, gameState.pipeWidth + 8, GAME_H - bottomY - capH);
      context.restore();
    }

    /* Bottom pipe body */
    context.fillStyle = topGrad;
    context.fillRect(pipe.x, bottomY + capH, gameState.pipeWidth, GAME_H - bottomY - capH);

    /* Wood grain texture for wooden bottom pipe */
    if (skin.type === "wooden") {
      context.strokeStyle = "rgba(100, 60, 10, 0.12)";
      context.lineWidth = 0.8;
      for (let gy = bottomY + capH + 8; gy < GAME_H; gy += 12) {
        context.beginPath();
        context.moveTo(pipe.x, gy);
        context.bezierCurveTo(
          pipe.x + gameState.pipeWidth * 0.3, gy + 2,
          pipe.x + gameState.pipeWidth * 0.7, gy - 2,
          pipe.x + gameState.pipeWidth, gy
        );
        context.stroke();
      }
    }

    /* Bottom cap */
    if (skin.type === "neon") {
      context.save();
      context.shadowColor = "#00ffff";
      context.shadowBlur = 14;
    }
    context.fillStyle = capGrad;
    context.beginPath();
    context.roundRect(capX, bottomY, capW, capH, [0, 0, 4, 4]);
    context.fill();
    if (skin.type === "neon") {
      context.restore();
    }

    /* Metal rivets on bottom cap */
    if (skin.type === "metal") {
      context.fillStyle = "rgba(200, 210, 220, 0.6)";
      context.strokeStyle = "rgba(50, 55, 60, 0.4)";
      context.lineWidth = 0.5;
      const rivetY = bottomY + capH / 2;
      for (let rx = capX + 8; rx < capX + capW - 4; rx += 14) {
        context.beginPath();
        context.arc(rx, rivetY, 2.5, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    }

    /* Highlight stripe on bottom pipe */
    context.fillStyle = skin.highlight;
    context.fillRect(pipe.x + 8, bottomY + capH, 6, GAME_H - bottomY - capH);

    /* Crack/texture lines on bottom pipe */
    context.strokeStyle = skin.crackColor;
    context.lineWidth = 0.8;
    for (const crack of pipe.cracks) {
      const bpHeight = GAME_H - bottomY - capH;
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
    context.strokeStyle = skin.vineColor;
    context.lineWidth = 1.2;
    for (const vine of pipe.vines) {
      context.beginPath();
      for (let vy = bottomY + capH; vy < GAME_H; vy += 4) {
        const vx = pipe.x + vine.xOff + Math.sin(vy * vine.freq) * vine.amp;
        if (vy === bottomY + capH) context.moveTo(vx, vy);
        else context.lineTo(vx, vy);
      }
      context.stroke();
    }

    /* Pipe shadow (inner edge) */
    context.fillStyle = skin.shadowColor;
    context.fillRect(pipe.x + gameState.pipeWidth - 8, 0, 8, pipe.top - capH);
    context.fillRect(pipe.x + gameState.pipeWidth - 8, bottomY + capH, 8, GAME_H - bottomY - capH);

    /* Pipe gap light rays (default/wooden skin only) */
    if (skin.type === "wooden") {
      context.save();
      context.globalAlpha = 0.08;
      context.strokeStyle = "rgba(255, 255, 200, 1)";
      context.lineWidth = 1;
      for (let r = 0; r < 4; r++) {
        const rx = pipe.x + 8 + r * (gameState.pipeWidth / 5);
        const skew = (r - 1.5) * 2;
        context.beginPath();
        context.moveTo(rx, pipe.top + 2);
        context.lineTo(rx + skew, bottomY - 2);
        context.stroke();
      }
      context.restore();
    }
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
    context.translate(GAME_W / 2, GAME_H * 0.15);
    context.scale(scale, scale);
    context.shadowBlur = 12;
    context.shadowColor = "rgba(255,220,80,0.8)";
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.font = "bold 28px 'Trebuchet MS'";
    context.textAlign = "center";
    context.fillText(`+1`, 0, 0);
    context.shadowBlur = 0;
    context.restore();
    gameState.scorePop *= 0.88;
    if (gameState.scorePop < 0.02) gameState.scorePop = 0;
  }
};

const drawOverlay = (title, subtitle) => {
  /* Soft vignette instead of flat overlay */
  const vg = context.createRadialGradient(
    GAME_W / 2, GAME_H / 2, GAME_H * 0.1,
    GAME_W / 2, GAME_H / 2, GAME_H * 0.7
  );
  vg.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  context.fillStyle = vg;
  context.fillRect(0, 0, GAME_W, GAME_H);

  /* Title with subtle shadow */
  context.fillStyle = "rgba(0, 0, 0, 0.3)";
  context.font = "bold 34px 'Trebuchet MS'";
  context.textAlign = "center";
  context.fillText(title, GAME_W / 2 + 1, GAME_H / 2 - 15);

  context.fillStyle = "#ffffff";
  context.fillText(title, GAME_W / 2, GAME_H / 2 - 16);

  context.fillStyle = "rgba(255, 255, 255, 0.7)";
  context.font = "16px 'Trebuchet MS'";
  context.fillText(subtitle, GAME_W / 2, GAME_H / 2 + 18);
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

  return hitTop || hitBottom;
};

const updateScore = () => {
  pipes.forEach((pipe) => {
    if (!pipe.passed && pipe.x + gameState.pipeWidth < bird.x) {
      pipe.passed = true;
      gameState.score += 1;
      if (!gameState.zenMode) {
        scoreLabel.textContent = gameState.score;
      }
      gameState.scorePop = 1;
      Audio.score();
      fbAchStats.bestScore = Math.max(fbAchStats.bestScore, gameState.score);
      checkFbAch(); showFbAchPopup();
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

  if (bird.y + bird.radius >= GAME_H - 90 || bird.y - bird.radius <= 0) {
    gameState.isGameOver = true;
    gameState.shakeTimer = 12;
    gameState.shakeIntensity = 6;
  }

  pipes.forEach((pipe) => {
    pipe.x -= gameState.speed * deltaSeconds;
  });

  pipes = pipes.filter((pipe) => pipe.x + gameState.pipeWidth > -10);

  if (pipes.some(detectCollision) && !gameState.zenMode) {
    gameState.isGameOver = true;
    gameState.shakeTimer = 12;
    gameState.shakeIntensity = 6;
  }

  if (gameState.isGameOver) {
    const wasNewBest = gameState.score > gameState.best;
    saveBestScore();
    if (!gameState._achCounted) {
      gameState._achCounted = true;
      fbAchStats.gamesPlayed++;
      checkFbAch(); showFbAchPopup(); saveFbAch();
    }
    if (!gameState._lbSubmitted && gameState.score > 0) {
      gameState._lbSubmitted = true;
      if (typeof Leaderboard !== 'undefined') {
        Leaderboard.submitScore('flappy-bird', gameState.score).then(() => Leaderboard.refresh('flappy-bird'));
      }
      if (typeof Arcade !== 'undefined') {
        const arcResult = Arcade.onGameOver('flappy-bird', gameState.score);
        document.body.appendChild(Arcade.createScoreCard('flappy-bird', gameState.score, gameState.best));
      }
    }
    if (!feathersSpawned) {
      spawnFeatherParticles();
      feathersSpawned = true;
      gameOverFlash = 1.0;
      gameOverRingRadius = 0;
      gameOverRingAlpha = 0.8;
      gameOverBirdPos = { x: bird.x, y: bird.y };
      Audio.crash();
      Audio.stopDrone();
      if (wasNewBest && gameState.score > 0) {
        Audio.newHighScore();
      }
    }
  }

  updateScore();

  /* Zen mode timer tracking */
  if (gameState.zenMode && gameState.isRunning && !gameState.isGameOver) {
    if (gameState.zenModeStartTime === 0) {
      gameState.zenModeStartTime = performance.now();
    }
    const elapsed = (performance.now() - gameState.zenModeStartTime) / 1000;
    if (elapsed >= 120 && !fbAchStats.zenMaster) {
      fbAchStats.zenMaster = true;
      checkFbAch(); showFbAchPopup(); saveFbAch();
    }
  }

  /* Update clouds */
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * deltaSeconds * 60;
    if (cloud.x < -cloud.width) {
      cloud.x = GAME_W + cloud.width;
      cloud.y = 30 + Math.random() * (GAME_H * 0.5);
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
      leaf.x = GAME_W + 10;
      leaf.y = 60 + Math.random() * (GAME_H - 160);
    }
  }

  /* Update ambient particles */
  for (const ap of ambientParticles) {
    ap.phase += deltaSeconds * 1.5;
    ap.x += Math.sin(ap.phase) * ap.speedX * deltaSeconds;
    ap.y += Math.cos(ap.phase * 0.7) * ap.speedY * deltaSeconds;
    /* Wrap around edges */
    if (ap.x < -5) ap.x = GAME_W + 5;
    if (ap.x > GAME_W + 5) ap.x = -5;
    if (ap.y < 20) ap.y = GAME_H - 120;
    if (ap.y > GAME_H - 100) ap.y = 20;
  }

  /* Update shooting stars */
  const { phase: skyPhase } = getSkyPhase(gameState.score);
  if (skyPhase === "night") {
    shootingStarTimer += deltaSeconds;
    if (shootingStarTimer >= 4 && shootingStars.length < 2) {
      shootingStarTimer = 0;
      shootingStars.push({
        x: Math.random() * GAME_W * 0.6,
        y: Math.random() * GAME_H * 0.3,
        vx: 200 + Math.random() * 150,
        vy: 80 + Math.random() * 60,
        alpha: 0.9,
      });
    }
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const ss = shootingStars[i];
    ss.x += ss.vx * deltaSeconds;
    ss.y += ss.vy * deltaSeconds;
    ss.alpha -= 0.4 * deltaSeconds;
    if (ss.alpha <= 0 || ss.x > GAME_W + 20 || ss.y > GAME_H) {
      shootingStars.splice(i, 1);
    }
  }

  /* Update star twinkle phases */
  for (const star of stars) {
    star.twinklePhase += deltaSeconds * (1.5 + star.brightness);
  }

  /* Update butterflies */
  for (const bf of butterflies) {
    bf.phase += deltaSeconds * 1.5;
    bf.wingPhase += deltaSeconds * 12;
    bf.x += Math.sin(bf.phase) * bf.speedX * deltaSeconds;
    bf.y += Math.cos(bf.phase * 0.7) * bf.speedY * deltaSeconds;
    /* Wrap around */
    if (bf.x < -20) bf.x = GAME_W + 20;
    if (bf.x > GAME_W + 20) bf.x = -20;
    if (bf.y < 40) bf.y = 40;
    if (bf.y > GAME_H * 0.45) bf.y = GAME_H * 0.45;
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

const draw = () => {
  /* Clear full canvas at native resolution */
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);

  /* Scale from game coordinates (360×640) to canvas pixels */
  const scaleX = canvas.width / GAME_W;
  const scaleY = canvas.height / GAME_H;
  context.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  context.save();

  /* Apply screen shake */
  if (gameState.shakeTimer > 0) {
    const sx = (Math.random() - 0.5) * gameState.shakeIntensity;
    const sy = (Math.random() - 0.5) * gameState.shakeIntensity;
    context.translate(sx, sy);
  }

  drawBackground();
  drawWind();
  drawPipes();
  drawBird();
  drawFeatherParticles();
  drawScorePop();

  if (!gameState.isRunning && !gameState.isGameOver) {
    drawOverlay(I18N.t("tapToStart"), I18N.t("keepBirdInGaps"));
  }

  /* Game over flash + expanding ring */
  if (gameOverFlash > 0 && gameOverBirdPos) {
    context.fillStyle = 'rgba(255,255,255,' + gameOverFlash * 0.4 + ')';
    context.fillRect(0, 0, GAME_W, GAME_H);
    gameOverFlash *= 0.92;
    if (gameOverFlash < 0.01) gameOverFlash = 0;

    context.strokeStyle = 'rgba(255,255,255,' + gameOverRingAlpha + ')';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(gameOverBirdPos.x, gameOverBirdPos.y, gameOverRingRadius, 0, Math.PI * 2);
    context.stroke();
    gameOverRingRadius += 3;
    gameOverRingAlpha *= 0.95;
  }

  if (gameState.isGameOver) {
    drawOverlay(I18N.t("gameOver"), I18N.t("tapOrSpaceTryAgain"));
  }

  context.restore();
  context.setTransform(1, 0, 0, 1, 0, 0);
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
    resetGame();
    startGame();
  } else if (!gameState.isRunning) {
    startGame();
  }

  if (gameState.isRunning) {
    bird.velocity = gameState.lift;
    Audio.flap();
    fbAchStats.totalFlaps++;
  }
};

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  }
  if (event.code === "KeyF" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const tag = document.activeElement?.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
      event.preventDefault();
      toggleFullscreen();
    }
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  flap();
});

canvas.addEventListener("dblclick", (event) => {
  event.preventDefault();
});

/* --- Prevent scrolling / pull-to-refresh on mobile --- */
document.addEventListener("touchmove", (event) => {
  event.preventDefault();
}, { passive: false });

document.addEventListener("touchstart", (event) => {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
}, { passive: false });

restartButton.addEventListener("click", () => {
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

/* --- Zen mode toggle --- */
const zenModeButton = document.getElementById("zenModeButton");
if (zenModeButton) {
  const updateZenLabel = () => {
    zenModeButton.textContent = gameState.zenMode ? "Zen: ON" : "Zen";
  };
  zenModeButton.addEventListener("click", () => {
    gameState.zenMode = !gameState.zenMode;
    updateZenLabel();
    resetGame();
  });
  updateZenLabel();
}

/* ── Fullscreen ──────────────────────────────────────────── */
const fullscreenButton = document.getElementById("fullscreenButton");
let isFullscreen = false;
let pseudoFullscreen = false;

function toggleFullscreen() {
  if (isFullscreen) exitFs(); else enterFs();
}
function enterFs() {
  const el = document.getElementById("gameContainer") || document.documentElement;
  const p = el.requestFullscreen ? el.requestFullscreen()
    : el.webkitRequestFullscreen ? el.webkitRequestFullscreen()
    : null;
  if (!p) enablePseudoFs();
}
function exitFs() {
  if (pseudoFullscreen) { disablePseudoFs(); return; }
  if (document.exitFullscreen) document.exitFullscreen();
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
}
function enablePseudoFs() {
  pseudoFullscreen = true; isFullscreen = true;
  document.getElementById("gameContainer").classList.add("pseudo-fullscreen");
  document.body.style.overflow = "hidden";
  updateFsButton();
  /* Delay to let CSS layout settle before measuring */
  requestAnimationFrame(() => updateCanvasSize());
}
function disablePseudoFs() {
  pseudoFullscreen = false; isFullscreen = false;
  document.getElementById("gameContainer").classList.remove("pseudo-fullscreen");
  document.body.style.overflow = "";
  updateFsButton();
  updateCanvasSize();
}
function updateFsButton() {
  if (fullscreenButton) fullscreenButton.textContent = isFullscreen ? "\u2715" : "\u26F6";
}
document.addEventListener("fullscreenchange", () => {
  isFullscreen = !!document.fullscreenElement;
  updateFsButton();
  /* Delay to let fullscreen layout settle */
  requestAnimationFrame(() => updateCanvasSize());
});
document.addEventListener("webkitfullscreenchange", () => {
  isFullscreen = !!document.webkitFullscreenElement;
  updateFsButton();
  requestAnimationFrame(() => updateCanvasSize());
});
if (fullscreenButton) fullscreenButton.addEventListener("click", toggleFullscreen);

/* ── Tab Visibility ───────────────────────────────────────── */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { Audio.stopDrone(); }
  else if (gameState.isRunning && !Audio.isMuted()) { Audio.startDrone(); }
});

/* ── Canvas sizing (DPI-aware) ──────────────────────────── */
const gameHeader = document.querySelector('.game__header');
const gamePanel = document.querySelector('.game__panel');
const gameHud = document.querySelector('.game__hud');

function updateCanvasSize() {
  const dpr = window.devicePixelRatio || 1;

  if (isFullscreen) {
    /* In fullscreen: compute exact size maintaining 9:16 aspect ratio */
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - 52; /* reserve space for HUD */
    const aspect = GAME_W / GAME_H;
    let cssW, cssH;
    if (screenW / screenH > aspect) {
      cssH = screenH;
      cssW = Math.floor(cssH * aspect);
    } else {
      cssW = screenW;
      cssH = Math.floor(cssW / aspect);
    }
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  } else {
    /* Normal mode: CSS handles layout, sync resolution to display */
    fitCanvasToScreen();
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
  }
  draw();
}

function fitCanvasToScreen() {
  const isMobile = window.innerWidth <= 600;

  if (!isMobile) {
    canvas.style.width = '';
    canvas.style.height = '';
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const headerH = gameHeader ? gameHeader.offsetHeight : 0;
  const hudH = gameHud ? gameHud.offsetHeight : 0;

  const bodyPad = 16;
  const gameGap = 12;
  const panelPad = 16;
  const panelGap = 8;

  const chrome = headerH + hudH + bodyPad + gameGap + panelPad + panelGap;
  const availH = vh - chrome;
  const availW = vw - 12 - panelPad;

  const aspectRatio = 9 / 16;
  let canvasW, canvasH;

  canvasH = availH;
  canvasW = canvasH * aspectRatio;

  if (canvasW > availW) {
    canvasW = availW;
    canvasH = canvasW / aspectRatio;
  }

  canvasW = Math.max(canvasW, 200);
  canvasH = Math.max(canvasH, 356);

  canvas.style.width = Math.floor(canvasW) + 'px';
  canvas.style.height = Math.floor(canvasH) + 'px';
}

/* Debounced resize handler */
let resizeTimer;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateCanvasSize, 80);
}

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => {
  setTimeout(updateCanvasSize, 200);
});

loadBestScore();
updateCanvasSize();
resetGame();
requestAnimationFrame(loop);

if (typeof Leaderboard !== 'undefined') {
  const lbPanel = document.getElementById('leaderboardPanel');
  lbPanel.appendChild(Leaderboard.createPanel('flappy-bird'));
  const lbToggleBtn = document.getElementById('leaderboardToggle');
  if (lbToggleBtn) {
    lbToggleBtn.addEventListener('click', () => { lbPanel.classList.toggle('lb-visible'); });
    lbPanel.addEventListener('click', (e) => { if (e.target === lbPanel) lbPanel.classList.remove('lb-visible'); });
  }
}

// ── Ko-fi Shop ──
if (typeof Shop !== 'undefined') {
  Shop.init({
    gameId: 'flappy-bird',
    buttonTarget: '#shopBtn',
    bundles: [
      { id: 'flappypremium', name: 'Flappy Premium', desc: 'Sunset & Night visual themes', price: '~$1',
        kofiUrl: 'https://ko-fi.com/s/FLAPPY_PREMIUM_ID', items: ['fb_sunset', 'fb_night'] },
    ],
    codes: { 'FLAPPYPRO2026': 'flappypremium' },
    onUnlock: function (itemIds) {
      var arr; try { arr = JSON.parse(localStorage.getItem('fbShopUnlocked')) || []; } catch(e) { arr = []; }
      itemIds.forEach(function (id) { if (arr.indexOf(id) === -1) arr.push(id); });
      localStorage.setItem('fbShopUnlocked', JSON.stringify(arr));
    }
  });
}
