const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const GAME_W = 360;
const GAME_H = 640;
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

/* ── Achievements ────────────────────────────────────────── */
const GG_ACHIEVEMENTS = [
  { id: 'first_blood',     icon: '\uD83D\uDCA5', get title() { return I18N.t('ggAchFirstBlood'); },     get desc() { return I18N.t('ggAchFirstBloodDesc'); },     check: s => s.totalDestroyed >= 1 },
  { id: 'promotion',       icon: '\u2B50',       get title() { return I18N.t('ggAchPromotion'); },       get desc() { return I18N.t('ggAchPromotionDesc'); },       check: s => s.highestTier >= 2 },
  { id: 'max_firepower',   icon: '\uD83D\uDD25', get title() { return I18N.t('ggAchMaxFirepower'); },   get desc() { return I18N.t('ggAchMaxFirepowerDesc'); },   check: s => s.highestTier >= 8 },
  { id: 'victor',          icon: '\uD83C\uDFC6', get title() { return I18N.t('ggAchVictor'); },          get desc() { return I18N.t('ggAchVictorDesc'); },          check: s => s.wins >= 1 },
  { id: 'war_hero',        icon: '\uD83C\uDF96\uFE0F', get title() { return I18N.t('ggAchWarHero'); },  get desc() { return I18N.t('ggAchWarHeroDesc'); },          check: s => s.wins >= 5 },
  { id: 'demolition',      icon: '\uD83E\uDDE8', get title() { return I18N.t('ggAchDemolition'); },      get desc() { return I18N.t('ggAchDemolitionDesc'); },      check: s => s.totalDestroyed >= 50 },
  { id: 'sharpshooter',    icon: '\uD83C\uDFAF', get title() { return I18N.t('ggAchSharpShooter'); },    get desc() { return I18N.t('ggAchSharpShooterDesc'); },    check: s => s.bestScore >= 20 },
  { id: 'dedicated',       icon: '\uD83C\uDFAE', get title() { return I18N.t('ggAchDedicated'); },       get desc() { return I18N.t('ggAchDedicatedDesc'); },       check: s => s.gamesPlayed >= 10 },
  { id: 'ricochet_kill',   icon: '\uD83C\uDFD3', get title() { return I18N.t('ggRicochetKill'); }, get desc() { return I18N.t('ggRicochetKillDesc'); }, check: s => s.ricochetKills >= 1 },
];

let ggAchStats = { totalDestroyed: 0, highestTier: 1, wins: 0, bestScore: 0, gamesPlayed: 0, ricochetKills: 0 };
let ggUnlocked = new Set();
let ggAchQueue = [];
let ggAchTimer = 0;

function loadGGAch() {
  try {
    const s = JSON.parse(localStorage.getItem('gunGameAch') || '{}');
    if (s.unlocked) ggUnlocked = new Set(s.unlocked);
    if (s.stats) Object.assign(ggAchStats, s.stats);
  } catch (_) {}
}
function saveGGAch() {
  localStorage.setItem('gunGameAch', JSON.stringify({ unlocked: [...ggUnlocked], stats: ggAchStats }));
}
function checkGGAch() {
  for (const a of GG_ACHIEVEMENTS) {
    if (!ggUnlocked.has(a.id) && a.check(ggAchStats)) {
      ggUnlocked.add(a.id);
      ggAchQueue.push(a);
      saveGGAch();
    }
  }
}
function showGGAchPopup() {
  if (ggAchTimer > 0 || ggAchQueue.length === 0) return;
  const a = ggAchQueue.shift();
  const popup = document.getElementById('achievementPopup');
  document.getElementById('achievementPopupIcon').textContent = a.icon;
  document.getElementById('achievementPopupTitle').textContent = a.title;
  document.getElementById('achievementPopupDesc').textContent = a.desc;
  popup.classList.add('show');
  ggAchTimer = 3;
  setTimeout(() => { popup.classList.remove('show'); setTimeout(() => { ggAchTimer = 0; showGGAchPopup(); }, 500); }, 3000);
}
function renderGGAchList() {
  const list = document.getElementById('achievementsList');
  list.innerHTML = '';
  for (const a of GG_ACHIEVEMENTS) {
    const el = document.createElement('div');
    el.className = 'achievement-item' + (ggUnlocked.has(a.id) ? ' unlocked' : '');
    el.innerHTML = '<span class="achievement-item__icon">' + a.icon + '</span><span>' + a.title + '</span>';
    list.appendChild(el);
  }
}
document.getElementById('achievementsToggle').addEventListener('click', () => {
  document.getElementById('achievementsList').classList.toggle('open');
  renderGGAchList();
});
loadGGAch();

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

/* --- Gun Game State --- */
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
  pipesDestroyed: 0,
  boss: null,
  upgradeChoice: null,
  weaponUpgrades: [],
  ricochetKills: 0,
};

const weaponDefs = [
  { get name() { return I18N.t('ggWeaponSeedSpit'); },      fireRate: 400,  speed: 350, damage: 1, radius: 3,  projectileCount: 1, spread: 0, piercing: false, explosive: false, explosionRadius: 0, arcGravity: 0, lifetime: 2 },
  { get name() { return I18N.t('ggWeaponEggToss'); },       fireRate: 500,  speed: 300, damage: 1, radius: 5,  projectileCount: 1, spread: 0, piercing: false, explosive: false, explosionRadius: 0, arcGravity: 200, lifetime: 2.5 },
  { get name() { return I18N.t('ggWeaponFeatherDarts'); },  fireRate: 350,  speed: 400, damage: 1, radius: 3,  projectileCount: 3, spread: 0.25, piercing: false, explosive: false, explosionRadius: 0, arcGravity: 0, lifetime: 1.8 },
  { get name() { return I18N.t('ggWeaponAcornCannon'); },   fireRate: 600,  speed: 280, damage: 2, radius: 6,  projectileCount: 1, spread: 0, piercing: false, explosive: true, explosionRadius: 40, arcGravity: 150, lifetime: 3 },
  { get name() { return I18N.t('ggWeaponWindGust'); },      fireRate: 700,  speed: 500, damage: 1, radius: 12, projectileCount: 1, spread: 0, piercing: true, explosive: false, explosionRadius: 0, arcGravity: 0, lifetime: 1.2 },
  { get name() { return I18N.t('ggWeaponSonicScreech'); },  fireRate: 800,  speed: 900, damage: 2, radius: 8,  projectileCount: 1, spread: 0, piercing: true, explosive: true, explosionRadius: 50, arcGravity: 0, lifetime: 0.8 },
  { get name() { return I18N.t('ggWeaponLightningBolt'); }, fireRate: 500,  speed: 1200, damage: 3, radius: 4, projectileCount: 1, spread: 0, piercing: true, explosive: false, explosionRadius: 0, arcGravity: 0, lifetime: 0.5 },
  { get name() { return I18N.t('ggWeaponPhoenixFire'); },   fireRate: 900,  speed: 250, damage: 3, radius: 14, projectileCount: 1, spread: 0, piercing: true, explosive: true, explosionRadius: 60, arcGravity: 0, lifetime: 3 },
];

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
      color: Math.random() > 0.5 ? "#00e5ff" : "#ff00aa",
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
      color1: ["#00e5ff", "#ff00aa", "#7b2fff", "#00ffcc"][Math.floor(Math.random() * 4)],
      color2: ["#00b8cc", "#cc0088", "#5a1fcc", "#00ccaa"][Math.floor(Math.random() * 4)],
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
  const storedBest = Number(window.localStorage.getItem("gunGameBest"));
  if (!Number.isNaN(storedBest)) {
    gameState.best = storedBest;
    bestScoreLabel.textContent = gameState.best;
  }
};

const saveBestScore = () => {
  const totalScore = gameState.score + gunState.totalDestroyed * 2;
  if (totalScore > gameState.best) {
    gameState.best = totalScore;
    bestScoreLabel.textContent = gameState.best;
    window.localStorage.setItem("gunGameBest", String(gameState.best));
  }
};

/* --- Gun Game: difficulty scaling --- */
function applyGunDifficulty() {
  gameState.speed = 190 + (gunState.tier - 1) * 10;
  gameState.gap = 150 - (gunState.tier - 1) * 5;
  gameState.pipeInterval = 1400 - (gunState.tier - 1) * 50;
}

/* --- Gun Game: full reset (for victory replay) --- */
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
  gunState.pipesDestroyed = 0;
  gunState.boss = null;
  gunState.upgradeChoice = null;
  gunState.weaponUpgrades = [];
  gunState.ricochetKills = 0;
}

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
  scoreLabel.textContent = gameState.score;
  gunState.cooldown = 0;
  gunState.projectiles = [];
  gunState.pipeFragments = [];
  gunState.invincibleTimer = 0;
  gunState.tierFlash = 0;
  gunState.screenFlash = 0;
  gunState.victoryTriggered = false;
  gunState.demotionTimer = 0;
  gunState.pipesDestroyed = 0;
  gunState.boss = null;
  gunState.upgradeChoice = null;
  gunState.weaponUpgrades = [];
  gunState.ricochetKills = 0;
  applyGunDifficulty();
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
  const maxHeight = GAME_H - gameState.gap - 160;
  const topHeight = Math.floor(
    Math.random() * (maxHeight - minHeight + 1) + minHeight
  );
  const reinforceChance = gunState.tier >= 4 ? 0.3 + 0.2 * ((gunState.tier - 4) / 4) : 0;
  const isReinforced = Math.random() < reinforceChance;
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
    topHP: isReinforced ? 2 : 1,
    bottomHP: isReinforced ? 2 : 1,
    reinforced: isReinforced,
    topDestroyed: false,
    bottomDestroyed: false,
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
      color: Math.random() > 0.5 ? "#00e5ff" : "#ff00aa",
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

/* --- Gun Game: shoot --- */
function shoot() {
  if (!gameState.isRunning || gameState.isGameOver || gunState.victoryTriggered) return;
  if (gunState.upgradeChoice) return;
  if (gunState.cooldown > 0) return;

  const wep = weaponDefs[gunState.tier - 1];
  let fireRateMult = 1;
  let damageMult = 1;
  let projCountBonus = 0;
  let piercingUpgrade = false;
  for (const upg of gunState.weaponUpgrades) {
    if (upg === 'rapid_fire') fireRateMult *= 0.5;
    if (upg === 'heavy_shot') damageMult *= 2;
    if (upg === 'spread_shot') projCountBonus += 2;
    if (upg === 'piercing') piercingUpgrade = true;
  }
  gunState.cooldown = (wep.fireRate / 1000) * fireRateMult;

  const totalCount = wep.projectileCount + projCountBonus;
  const totalSpread = projCountBonus > 0 ? Math.max(wep.spread, 0.3) : wep.spread;
  for (let i = 0; i < totalCount; i++) {
    const spreadAngle = totalCount > 1
      ? -totalSpread + (2 * totalSpread * i / (totalCount - 1))
      : 0;
    const vx = Math.cos(spreadAngle) * wep.speed;
    const vy = Math.sin(spreadAngle) * wep.speed;
    gunState.projectiles.push({
      x: bird.x + bird.radius,
      y: bird.y,
      vx: vx,
      vy: vy,
      damage: Math.round(wep.damage * damageMult),
      radius: wep.radius,
      lifetime: wep.lifetime,
      tier: gunState.tier,
      piercing: wep.piercing || piercingUpgrade,
      explosive: wep.explosive,
      explosionRadius: wep.explosionRadius,
      arcGravity: wep.arcGravity,
      age: 0,
      trail: [],
      bounces: 0,
    });
  }
  Audio.gunShoot(gunState.tier);
}

/* --- Projectile-pipe collision --- */
function projectileHitsPipe(proj, pipe) {
  const pw = gameState.pipeWidth;
  const gap = gameState.gap;
  if (!pipe.topDestroyed) {
    const topRect = { x: pipe.x, y: 0, w: pw, h: pipe.top };
    if (circleRectCollision(proj.x, proj.y, proj.radius, topRect)) {
      return 'top';
    }
  }
  if (!pipe.bottomDestroyed) {
    const botY = pipe.top + gap;
    const botRect = { x: pipe.x, y: botY, w: pw, h: GAME_H - botY };
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

/* --- Damage and destroy pipes --- */
function damagePipe(pipe, section, damage, projX, projY, hasBounced) {
  const hpKey = section === 'top' ? 'topHP' : 'bottomHP';
  pipe[hpKey] -= damage;
  if (pipe[hpKey] <= 0) {
    destroyPipeSection(pipe, section, projX, projY, hasBounced);
  } else {
    Audio.gunPipeHit();
  }
}

function destroyPipeSection(pipe, section, projX, projY, hasBounced) {
  const destroyedKey = section === 'top' ? 'topDestroyed' : 'bottomDestroyed';
  pipe[destroyedKey] = true;

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
      color: pipe.reinforced ? '#3a3a48' : '#252535',
    });
  }

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
      color: '#00e5ff',
    });
  }

  gunState.totalDestroyed++;
  ggAchStats.totalDestroyed++;
  if (hasBounced) {
    gunState.ricochetKills++;
    ggAchStats.ricochetKills++;
  }
  saveGGAch();
  checkGGAch();
  Audio.gunPipeDestroy();

  gunState.pipesDestroyed++;

  if (!gunState.victoryTriggered) {
    gunState.destroys++;
    if (gunState.destroys >= 3) {
      advanceTier();
    }
  }

  /* Boss wave: every 8 pipe destructions */
  if (gunState.pipesDestroyed > 0 && gunState.pipesDestroyed % 8 === 0 && !gunState.boss) {
    spawnBoss();
  }
}

/* --- Explosive damage --- */
function explosiveDamage(proj) {
  const r = proj.explosionRadius;
  for (const pipe of pipes) {
    if (pipe.topHP === undefined) continue;
    const pw = gameState.pipeWidth;
    const pipeCenterX = pipe.x + pw / 2;
    if (!pipe.topDestroyed) {
      const topCenterY = pipe.top / 2;
      const dx = proj.x - pipeCenterX;
      const dy = proj.y - topCenterY;
      if (Math.sqrt(dx * dx + dy * dy) < r + pw / 2) {
        damagePipe(pipe, 'top', proj.damage, proj.x, proj.y);
      }
    }
    if (!pipe.bottomDestroyed) {
      const botY = pipe.top + gameState.gap;
      const botCenterY = (botY + GAME_H) / 2;
      const dx = proj.x - pipeCenterX;
      const dy = proj.y - botCenterY;
      if (Math.sqrt(dx * dx + dy * dy) < r + pw / 2) {
        damagePipe(pipe, 'bottom', proj.damage, proj.x, proj.y);
      }
    }
  }
  gunState.screenFlash = 0.15;
  gameState.shakeTimer = 6;
  gameState.shakeIntensity = 4;
  gunState.pipeFragments.push({
    x: proj.x, y: proj.y,
    vx: 0, vy: 0, w: 0, h: 0,
    rot: 0, rotSpeed: 0,
    alpha: 0.6, color: 'ring',
    ringRadius: 5, ringMaxRadius: proj.explosionRadius,
  });
}

/* --- Tier advancement --- */
function advanceTier() {
  if (gunState.tier >= 8) {
    triggerVictory();
    return;
  }
  gunState.tier++;
  gunState.destroys = 0;
  gunState.invincibleTimer = 0.5;
  gunState.tierFlash = 1.5;
  gunState.tierFlashName = weaponDefs[gunState.tier - 1].name;
  if (gunState.tier > gunState.highestTier) gunState.highestTier = gunState.tier;
  if (gunState.tier > ggAchStats.highestTier) ggAchStats.highestTier = gunState.tier;
  saveGGAch();
  checkGGAch();
  applyGunDifficulty();
  Audio.gunTierUp();

  /* Weapon upgrade choice at tiers 4 and 7 */
  if (gunState.tier === 4) {
    gunState.upgradeChoice = {
      left: { id: 'rapid_fire', get name() { return I18N.t('ggRapidFire'); }, get desc() { return I18N.t('ggRapidFireDesc'); } },
      right: { id: 'heavy_shot', get name() { return I18N.t('ggHeavyShot'); }, get desc() { return I18N.t('ggHeavyShotDesc'); } },
    };
  } else if (gunState.tier === 7) {
    gunState.upgradeChoice = {
      left: { id: 'spread_shot', get name() { return I18N.t('ggSpreadShot'); }, get desc() { return I18N.t('ggSpreadShotDesc'); } },
      right: { id: 'piercing', get name() { return I18N.t('ggPiercing'); }, get desc() { return I18N.t('ggPiercingDesc'); } },
    };
  }
}

/* --- Boss wave --- */
function spawnBoss() {
  gunState.boss = {
    x: GAME_W + 10,
    y: GAME_H / 2 - 40,
    width: 100,
    hp: 5,
    maxHp: 5,
    oscillatePhase: 0,
    oscillateSpeed: 2,
  };
}

function updateBoss(dt) {
  const boss = gunState.boss;
  if (!boss) return;
  boss.oscillatePhase += boss.oscillateSpeed * dt;
  boss.y = GAME_H / 2 - 40 + Math.sin(boss.oscillatePhase) * 120;
  /* Drift boss into screen, then hold position */
  if (boss.x > GAME_W - 140) {
    boss.x -= 80 * dt;
  }
}

function drawBoss() {
  const boss = gunState.boss;
  if (!boss) return;
  const bh = boss.width * 0.8;
  const bx = boss.x, by = boss.y, bw = boss.width;
  const now = performance.now() / 1000;
  context.save();

  /* --- Armor-plated body with 3D bevel --- */
  context.shadowColor = '#ff4444';
  context.shadowBlur = 18;
  const bodyGrad = context.createLinearGradient(bx, by, bx + bw, by + bh);
  bodyGrad.addColorStop(0, '#5a1515');
  bodyGrad.addColorStop(0.15, '#aa2828');
  bodyGrad.addColorStop(0.5, '#cc3333');
  bodyGrad.addColorStop(0.85, '#aa2828');
  bodyGrad.addColorStop(1, '#5a1515');
  context.fillStyle = bodyGrad;
  context.beginPath();
  context.roundRect(bx, by, bw, bh, 4);
  context.fill();
  context.shadowBlur = 0;

  /* Highlight edge (top & left) */
  context.strokeStyle = 'rgba(255,180,180,0.45)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(bx + bw - 2, by + 2);
  context.lineTo(bx + 2, by + 2);
  context.lineTo(bx + 2, by + bh - 2);
  context.stroke();
  /* Shadow edge (bottom & right) */
  context.strokeStyle = 'rgba(0,0,0,0.5)';
  context.beginPath();
  context.moveTo(bx + 2, by + bh - 2);
  context.lineTo(bx + bw - 2, by + bh - 2);
  context.lineTo(bx + bw - 2, by + 2);
  context.stroke();

  /* --- Panel dividers --- */
  context.strokeStyle = 'rgba(0,0,0,0.3)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(bx + bw * 0.33, by + 4);
  context.lineTo(bx + bw * 0.33, by + bh - 4);
  context.moveTo(bx + bw * 0.66, by + 4);
  context.lineTo(bx + bw * 0.66, by + bh - 4);
  context.moveTo(bx + 4, by + bh * 0.5);
  context.lineTo(bx + bw - 4, by + bh * 0.5);
  context.stroke();

  /* --- Rivet rows at corners --- */
  context.fillStyle = '#888';
  const rivetR = 2;
  const rivetInset = 7;
  const rivetPositions = [
    [bx + rivetInset, by + rivetInset],
    [bx + bw - rivetInset, by + rivetInset],
    [bx + rivetInset, by + bh - rivetInset],
    [bx + bw - rivetInset, by + bh - rivetInset],
    [bx + bw / 2, by + rivetInset],
    [bx + bw / 2, by + bh - rivetInset],
  ];
  for (const [rx, ry] of rivetPositions) {
    context.beginPath();
    context.arc(rx, ry, rivetR, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.3)';
    context.lineWidth = 0.5;
    context.stroke();
  }

  /* --- Danger stripes (clipped to body) --- */
  context.save();
  context.beginPath();
  context.roundRect(bx, by, bw, bh, 4);
  context.clip();
  context.globalAlpha = 0.18;
  const stripeW = 8;
  context.fillStyle = '#FFD700';
  for (let sx = -bh; sx < bw + bh; sx += stripeW * 2) {
    context.beginPath();
    context.moveTo(bx + sx, by + bh);
    context.lineTo(bx + sx + stripeW, by + bh);
    context.lineTo(bx + sx + stripeW + bh, by);
    context.lineTo(bx + sx + bh, by);
    context.closePath();
    context.fill();
  }
  context.globalAlpha = 1.0;
  context.restore();

  /* --- Cap top --- */
  context.fillStyle = '#dd4444';
  context.beginPath();
  context.roundRect(bx - 5, by - 8, bw + 10, 12, [4, 4, 0, 0]);
  context.fill();
  /* --- Cap bottom --- */
  context.beginPath();
  context.roundRect(bx - 5, by + bh - 4, bw + 10, 12, [0, 0, 4, 4]);
  context.fill();

  /* --- Glowing eyes --- */
  const eyeY = by + bh * 0.28;
  const eyeSpacing = bw * 0.22;
  const eyeCX1 = bx + bw / 2 - eyeSpacing;
  const eyeCX2 = bx + bw / 2 + eyeSpacing;
  const eyeR = 7;
  const eyePulse = 0.8 + 0.2 * Math.sin(now * 5);
  for (const ex of [eyeCX1, eyeCX2]) {
    /* Dark socket */
    context.fillStyle = '#1a0505';
    context.beginPath();
    context.arc(ex, eyeY, eyeR + 2, 0, Math.PI * 2);
    context.fill();
    /* Pulsing iris */
    const irisGrad = context.createRadialGradient(ex, eyeY, 0, ex, eyeY, eyeR);
    irisGrad.addColorStop(0, `rgba(255,200,50,${eyePulse})`);
    irisGrad.addColorStop(0.5, `rgba(255,100,20,${eyePulse * 0.9})`);
    irisGrad.addColorStop(1, `rgba(180,30,10,${eyePulse * 0.5})`);
    context.fillStyle = irisGrad;
    context.beginPath();
    context.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    context.fill();
    /* Bright pupil dot */
    context.fillStyle = `rgba(255,255,200,${eyePulse * 0.8})`;
    context.beginPath();
    context.arc(ex - 1.5, eyeY - 1.5, 2, 0, Math.PI * 2);
    context.fill();
  }

  /* --- Cannon ports (3 at bottom) --- */
  const cannonY = by + bh - 10;
  const cannonSpacing = bw / 4;
  for (let ci = 1; ci <= 3; ci++) {
    const cx = bx + cannonSpacing * ci;
    /* Dark port opening */
    context.fillStyle = '#0a0a0a';
    context.beginPath();
    context.ellipse(cx, cannonY, 6, 4, 0, 0, Math.PI * 2);
    context.fill();
    /* Muzzle glow */
    const mGrad = context.createRadialGradient(cx, cannonY, 0, cx, cannonY, 8);
    mGrad.addColorStop(0, 'rgba(255,140,40,0.5)');
    mGrad.addColorStop(1, 'rgba(255,60,20,0)');
    context.fillStyle = mGrad;
    context.beginPath();
    context.arc(cx, cannonY, 8, 0, Math.PI * 2);
    context.fill();
  }

  /* --- Rotating reactor core (centre) --- */
  const coreX = bx + bw / 2;
  const coreY = by + bh * 0.55;
  const coreRingR = 12;
  const coreAngle = now * 2.5;
  /* 6-dot spinning ring */
  for (let di = 0; di < 6; di++) {
    const a = coreAngle + (Math.PI * 2 * di) / 6;
    const dx = coreX + Math.cos(a) * coreRingR;
    const dy = coreY + Math.sin(a) * coreRingR;
    context.fillStyle = `rgba(255,200,80,${0.6 + 0.3 * Math.sin(now * 4 + di)})`;
    context.beginPath();
    context.arc(dx, dy, 2.2, 0, Math.PI * 2);
    context.fill();
  }
  /* Pulsing radial core */
  const corePulse = 0.7 + 0.3 * Math.sin(now * 6);
  const coreGrad = context.createRadialGradient(coreX, coreY, 0, coreX, coreY, 9);
  coreGrad.addColorStop(0, `rgba(255,230,140,${corePulse})`);
  coreGrad.addColorStop(0.5, `rgba(255,120,30,${corePulse * 0.6})`);
  coreGrad.addColorStop(1, 'rgba(180,40,10,0)');
  context.fillStyle = coreGrad;
  context.beginPath();
  context.arc(coreX, coreY, 9, 0, Math.PI * 2);
  context.fill();

  /* --- Improved HP bar above boss --- */
  const barW = bw + 10;
  const barH = 8;
  const barX = bx - 5;
  const barY = by - 22;
  const barR = 4;
  /* Background */
  context.fillStyle = 'rgba(0, 0, 0, 0.6)';
  context.beginPath();
  context.roundRect(barX, barY, barW, barH, barR);
  context.fill();
  /* HP fill */
  const hpPct = boss.hp / boss.maxHp;
  const hpFillW = Math.max(0, barW * hpPct);
  if (hpFillW > 0) {
    const hpGrad = context.createLinearGradient(barX, barY, barX, barY + barH);
    if (hpPct > 0.5) {
      hpGrad.addColorStop(0, '#66ff66');
      hpGrad.addColorStop(1, '#22aa22');
    } else if (hpPct > 0.25) {
      hpGrad.addColorStop(0, '#ffdd44');
      hpGrad.addColorStop(1, '#cc9900');
    } else {
      hpGrad.addColorStop(0, '#ff6644');
      hpGrad.addColorStop(1, '#cc2200');
    }
    context.fillStyle = hpGrad;
    context.beginPath();
    context.roundRect(barX, barY, hpFillW, barH, barR);
    context.fill();
  }
  /* Thin border */
  context.strokeStyle = 'rgba(255,255,255,0.4)';
  context.lineWidth = 0.8;
  context.beginPath();
  context.roundRect(barX, barY, barW, barH, barR);
  context.stroke();

  /* BOSS label */
  context.fillStyle = '#FFD700';
  context.font = "bold 10px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText(I18N.t('ggBoss'), bx + bw / 2, barY - 4);

  context.restore();
}

function defeatBoss() {
  const boss = gunState.boss;
  /* Celebration particles */
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    gunState.pipeFragments.push({
      x: boss.x + boss.width / 2,
      y: boss.y + boss.width * 0.4,
      vx: Math.cos(angle) * (80 + Math.random() * 120),
      vy: Math.sin(angle) * (80 + Math.random() * 120),
      w: 3 + Math.random() * 5,
      h: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 10,
      alpha: 1,
      color: ['#FFD700', '#FF6600', '#FF4444', '#FFFF44'][Math.floor(Math.random() * 4)],
    });
  }
  gunState.boss = null;
  gameState.score += 500;
  scoreLabel.textContent = gameState.score;
  gunState.screenFlash = 0.3;
  gameState.shakeTimer = 10;
  gameState.shakeIntensity = 5;
  /* Tier upgrade as bonus */
  if (gunState.tier < 8) {
    advanceTier();
  }
  Audio.gunPipeDestroy();
}

/* --- Tier demotion on death --- */
function demoteTier() {
  gunState.tier = Math.max(1, gunState.tier - 1);
  gunState.destroys = 0;
  gunState.demotionMsg = I18N.t('ggDemotedTo') + ' ' + gunState.tier;
  gunState.demotionTimer = 2;
  Audio.gunTierDown();
}

/* --- Victory --- */
function triggerVictory() {
  gunState.victoryTriggered = true;
  for (const pipe of pipes) {
    if (pipe.topHP !== undefined) {
      if (!pipe.topDestroyed) destroyPipeSection(pipe, 'top', pipe.x + gameState.pipeWidth / 2, pipe.top);
      if (!pipe.bottomDestroyed) destroyPipeSection(pipe, 'bottom', pipe.x + gameState.pipeWidth / 2, pipe.top + gameState.gap);
    }
  }
  const wins = Number(localStorage.getItem('gunGameWins') || 0) + 1;
  localStorage.setItem('gunGameWins', String(wins));
  const bestTier = Math.max(Number(localStorage.getItem('gunGameBestTier') || 0), 8);
  localStorage.setItem('gunGameBestTier', String(bestTier));
  ggAchStats.wins++;
  ggAchStats.highestTier = 8;
  saveGGAch();
  checkGGAch();
  Audio.gunVictory();
  saveBestScore();
  const totalScore = gameState.score + gunState.totalDestroyed * 2;
  if (typeof Leaderboard !== 'undefined') Leaderboard.submitScore('gun-game', totalScore);
  if (typeof Arcade !== 'undefined') {
    Arcade.onGameOver('gun-game', totalScore);
    document.body.appendChild(Arcade.createScoreCard('gun-game', totalScore, Number(localStorage.getItem('gunGameBest'))||0));
  }
}

/* --- Update projectiles --- */
function updateProjectiles(dt) {
  for (const proj of gunState.projectiles) {
    proj.vy += proj.arcGravity * dt;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.age += dt;
    proj.lifetime -= dt;

    /* Ricochet bounce off top/bottom edges at tier 4+ */
    if (gunState.tier >= 4 && (proj.bounces || 0) < 1) {
      if (proj.y - proj.radius <= 0) {
        proj.y = proj.radius;
        proj.vy *= -1;
        proj.bounces = (proj.bounces || 0) + 1;
      } else if (proj.y + proj.radius >= GAME_H - 90) {
        proj.y = GAME_H - 90 - proj.radius;
        proj.vy *= -1;
        proj.bounces = (proj.bounces || 0) + 1;
      }
    }

    if (proj.tier === 8) {
      proj.trail.push({ x: proj.x, y: proj.y, alpha: 0.8 });
      if (proj.trail.length > 12) proj.trail.shift();
    }

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
        const topDist = Math.abs(bird.y - nearestPipe.top / 2);
        const botDist = Math.abs(bird.y - (nearestPipe.top + gameState.gap + (GAME_H - nearestPipe.top - gameState.gap) / 2));
        const section = (!nearestPipe.topDestroyed && topDist < botDist) ? 'top' : (!nearestPipe.bottomDestroyed ? 'bottom' : 'top');
        if ((section === 'top' && !nearestPipe.topDestroyed) || (section === 'bottom' && !nearestPipe.bottomDestroyed)) {
          damagePipe(nearestPipe, section, proj.damage, nearestPipe.x + gameState.pipeWidth / 2, bird.y, (proj.bounces || 0) > 0);
        }
        proj.lifetime = 0.3;
        proj.piercing = false;
      }
    }

    if (proj.tier !== 7) {
      /* Check boss collision */
      if (gunState.boss) {
        const boss = gunState.boss;
        if (circleRectCollision(proj.x, proj.y, proj.radius, { x: boss.x, y: boss.y, w: boss.width, h: boss.width * 0.8 })) {
          boss.hp -= proj.damage;
          if (boss.hp <= 0) {
            defeatBoss();
          } else {
            Audio.gunPipeHit();
          }
          if (!proj.piercing) {
            proj.lifetime = 0;
            continue;
          }
        }
      }

      for (const pipe of pipes) {
        if (pipe.topHP === undefined) continue;
        const section = projectileHitsPipe(proj, pipe);
        if (section) {
          if (proj.explosive) {
            explosiveDamage(proj);
          } else {
            damagePipe(pipe, section, proj.damage, proj.x, proj.y, (proj.bounces || 0) > 0);
          }
          if (!proj.piercing) {
            proj.lifetime = 0;
            break;
          }
        }
      }
    }
  }

  gunState.projectiles = gunState.projectiles.filter(p => p.lifetime > 0 && p.x < GAME_W + 20 && p.x > -20 && p.y > -20 && p.y < GAME_H + 20);
}

/* --- Update fragments --- */
function updateFragments(dt) {
  for (const frag of gunState.pipeFragments) {
    if (frag.color === 'ring') {
      frag.ringRadius += (frag.ringMaxRadius || 60) * dt * 4;
      frag.alpha -= dt * 3;
    } else {
      frag.vy += 400 * dt;
      frag.x += frag.vx * dt;
      frag.y += frag.vy * dt;
      frag.rot += frag.rotSpeed * dt;
      frag.alpha -= dt * 0.8;
    }
  }
  gunState.pipeFragments = gunState.pipeFragments.filter(f => f.alpha > 0);
}

const drawBackground = () => {
  const scoreProgress = Math.min(gameState.score / 30, 1);

  /* ── Dark cyberpunk sky gradient ── */
  const skyGrad = context.createLinearGradient(0, 0, 0, GAME_H);
  skyGrad.addColorStop(0, "#0a0a1a");
  skyGrad.addColorStop(0.4, "#1a1035");
  skyGrad.addColorStop(0.75, "#120c28");
  skyGrad.addColorStop(1, "#0d0d1a");
  context.fillStyle = skyGrad;
  context.fillRect(0, 0, GAME_W, GAME_H);

  /* ── Glowing moon ── */
  const moonX = 60;
  const moonY = 50;
  const moonGlow = context.createRadialGradient(moonX, moonY, 6, moonX, moonY, 80);
  moonGlow.addColorStop(0, "rgba(180, 200, 255, 0.8)");
  moonGlow.addColorStop(0.2, "rgba(140, 160, 220, 0.3)");
  moonGlow.addColorStop(0.5, "rgba(100, 80, 180, 0.08)");
  moonGlow.addColorStop(1, "rgba(100, 80, 180, 0)");
  context.fillStyle = moonGlow;
  context.fillRect(0, 0, 180, 160);

  context.fillStyle = "rgba(180, 200, 255, 0.85)";
  context.beginPath();
  context.arc(moonX, moonY, 14, 0, Math.PI * 2);
  context.fill();
  /* Moon crater hints */
  context.fillStyle = "rgba(140, 160, 220, 0.3)";
  context.beginPath();
  context.arc(moonX - 4, moonY - 3, 3, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(moonX + 5, moonY + 4, 2, 0, Math.PI * 2);
  context.fill();

  /* ── Slow-drifting smoke / haze (replaces clouds) ── */
  for (const cloud of clouds) {
    const smokeAlpha = cloud.alpha * 0.35;
    context.fillStyle = `rgba(60, 40, 80, ${smokeAlpha})`;
    context.beginPath();
    context.ellipse(cloud.x, cloud.y, cloud.width * 0.7, cloud.height * 0.5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `rgba(80, 50, 100, ${smokeAlpha * 0.6})`;
    context.beginPath();
    context.ellipse(cloud.x - cloud.width * 0.2, cloud.y + 3, cloud.width * 0.4, cloud.height * 0.35, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `rgba(50, 30, 70, ${smokeAlpha * 0.4})`;
    context.beginPath();
    context.ellipse(cloud.x + cloud.width * 0.25, cloud.y + 2, cloud.width * 0.35, cloud.height * 0.3, 0, 0, Math.PI * 2);
    context.fill();
  }

  /* ── Distant neon city skyline (replaces hills) ── */
  const groundTop = GAME_H - 90;
  if (hills.length > 1) {
    /* Dark building silhouettes */
    context.fillStyle = "#0f0f2a";
    context.beginPath();
    context.moveTo(0, groundTop);
    for (const h of hills) {
      /* Convert smooth hill curves into blocky building tops */
      const buildingTop = h.y - 10;
      context.lineTo(h.x - 4, groundTop);
      context.lineTo(h.x - 4, buildingTop);
      context.lineTo(h.x + 4, buildingTop);
      context.lineTo(h.x + 4, groundTop);
    }
    context.lineTo(GAME_W, groundTop);
    context.closePath();
    context.fill();

    /* Neon glow on building tops */
    for (let i = 0; i < hills.length; i++) {
      const h = hills[i];
      const buildingTop = h.y - 10;
      const neonColor = i % 3 === 0 ? "rgba(0, 255, 204, 0.15)"
                       : i % 3 === 1 ? "rgba(255, 0, 170, 0.12)"
                       : "rgba(100, 80, 255, 0.1)";
      const glowGrad = context.createRadialGradient(h.x, buildingTop, 1, h.x, buildingTop, 12);
      glowGrad.addColorStop(0, neonColor);
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glowGrad;
      context.fillRect(h.x - 12, buildingTop - 12, 24, 24);
    }

    /* Tiny lit windows on buildings */
    for (let i = 0; i < hills.length; i += 2) {
      const h = hills[i];
      const buildingTop = h.y - 10;
      const bH = groundTop - buildingTop;
      for (let wy = buildingTop + 4; wy < groundTop - 4; wy += 6) {
        for (let wx = -2; wx <= 2; wx += 4) {
          if (Math.sin(h.x * 13 + wy * 7 + wx) > 0.1) {
            const winColor = Math.sin(h.x + wy) > 0 ? "rgba(0, 255, 204, 0.4)" : "rgba(255, 200, 60, 0.35)";
            context.fillStyle = winColor;
            context.fillRect(h.x + wx - 0.8, wy, 1.6, 2);
          }
        }
      }
    }
  }

  /* ── Tall building silhouettes (replaces trees) ── */
  for (const tree of trees) {
    const bw = tree.width * 0.35;
    const bh = tree.height * 0.8;
    const bx = tree.x - bw / 2;
    const by = groundTop - bh;
    /* Building body */
    context.fillStyle = "#0a0a20";
    context.fillRect(bx, by, bw, bh);
    /* Neon edge line */
    context.strokeStyle = "rgba(0, 255, 204, 0.2)";
    context.lineWidth = 0.5;
    context.strokeRect(bx, by, bw, bh);
    /* Antenna / spire */
    context.strokeStyle = "rgba(255, 0, 170, 0.4)";
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(tree.x, by);
    context.lineTo(tree.x, by - tree.height * 0.15);
    context.stroke();
    /* Blinking light on top */
    const blinkPhase = Math.sin(Date.now() * 0.003 + tree.x) * 0.5 + 0.5;
    context.fillStyle = `rgba(255, 0, 100, ${0.4 + blinkPhase * 0.5})`;
    context.beginPath();
    context.arc(tree.x, by - tree.height * 0.15, 1.2, 0, Math.PI * 2);
    context.fill();
    /* Small windows */
    for (let wy = by + 3; wy < groundTop - 3; wy += 5) {
      const litChance = Math.sin(tree.x * 7 + wy * 3);
      if (litChance > -0.3) {
        const wc = litChance > 0.5 ? "rgba(0, 255, 204, 0.3)" : "rgba(255, 200, 60, 0.25)";
        context.fillStyle = wc;
        context.fillRect(bx + 2, wy, bw - 4, 1.5);
      }
    }
  }

  /* ── Falling digital particles (replaces leaves) ── */
  for (const leaf of leafParticles) {
    context.save();
    context.translate(leaf.x, leaf.y);
    context.rotate(leaf.rot);
    context.globalAlpha = leaf.alpha * 0.7;
    const isSquare = Math.sin(leaf.x * 3 + leaf.y) > 0;
    context.fillStyle = isSquare ? "#00ffcc" : "#ff00aa";
    if (isSquare) {
      context.fillRect(-leaf.size * 0.4, -leaf.size * 0.4, leaf.size * 0.8, leaf.size * 0.8);
    } else {
      context.fillRect(-leaf.size * 0.1, -leaf.size, leaf.size * 0.2, leaf.size * 2);
    }
    context.globalAlpha = 1;
    context.restore();
  }

  /* ── Dark concrete ground with neon edge stripe ── */
  context.fillStyle = "#0a0a12";
  context.fillRect(0, groundTop, GAME_W, 90);

  const groundGrad = context.createLinearGradient(0, GAME_H - 35, 0, GAME_H);
  groundGrad.addColorStop(0, "#08080f");
  groundGrad.addColorStop(1, "#050509");
  context.fillStyle = groundGrad;
  context.fillRect(0, GAME_H - 35, GAME_W, 35);

  /* Neon edge stripe at ground top */
  context.strokeStyle = "#00ffcc";
  context.lineWidth = 1.5;
  context.shadowColor = "#00ffcc";
  context.shadowBlur = 6;
  context.beginPath();
  context.moveTo(0, groundTop);
  context.lineTo(GAME_W, groundTop);
  context.stroke();
  context.shadowBlur = 0;

  /* Secondary magenta stripe */
  context.strokeStyle = "rgba(255, 0, 170, 0.4)";
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(0, groundTop + 3);
  context.lineTo(GAME_W, groundTop + 3);
  context.stroke();

  /* ── Ground texture lines (replaces grass blades) ── */
  context.strokeStyle = "rgba(0, 255, 204, 0.06)";
  context.lineWidth = 0.5;
  for (const g of grassBlades) {
    context.beginPath();
    context.moveTo(g.x, groundTop + 4);
    context.lineTo(g.x + g.lean * 0.3, groundTop + 4 + g.height * 0.2);
    context.stroke();
  }

  /* ── Neon signs / ground lights (replaces flowers/mushrooms) ── */
  for (const fl of flowers) {
    if (fl.type === "flower") {
      /* Small neon sign */
      const signW = fl.size * 2.5;
      const signH = fl.size * 1.5;
      const sx = fl.x - signW / 2;
      const sy = fl.y - fl.stemHeight - signH;
      /* Sign post */
      context.strokeStyle = "rgba(100, 100, 120, 0.4)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(fl.x, fl.y);
      context.lineTo(fl.x, sy + signH);
      context.stroke();
      /* Sign body glow */
      const signColor = fl.color;
      context.fillStyle = "rgba(10, 10, 20, 0.6)";
      context.fillRect(sx, sy, signW, signH);
      context.strokeStyle = signColor;
      context.lineWidth = 0.8;
      context.shadowColor = signColor;
      context.shadowBlur = 4;
      context.strokeRect(sx, sy, signW, signH);
      context.shadowBlur = 0;
      /* Inner neon text placeholder (horizontal lines) */
      context.strokeStyle = signColor;
      context.lineWidth = 0.5;
      context.globalAlpha = 0.6;
      context.beginPath();
      context.moveTo(sx + 2, sy + signH * 0.4);
      context.lineTo(sx + signW - 2, sy + signH * 0.4);
      context.stroke();
      context.beginPath();
      context.moveTo(sx + 2, sy + signH * 0.7);
      context.lineTo(sx + signW * 0.6, sy + signH * 0.7);
      context.stroke();
      context.globalAlpha = 1;
    } else {
      /* Ground neon light / puddle reflection */
      const glowR = fl.size * 2;
      const puddleGrad = context.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, glowR);
      const puddleColor = Math.sin(fl.x) > 0 ? "0, 255, 204" : "255, 0, 170";
      puddleGrad.addColorStop(0, `rgba(${puddleColor}, 0.25)`);
      puddleGrad.addColorStop(0.5, `rgba(${puddleColor}, 0.08)`);
      puddleGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = puddleGrad;
      context.beginPath();
      context.ellipse(fl.x, fl.y, glowR, glowR * 0.4, 0, 0, Math.PI * 2);
      context.fill();
      /* Central light dot */
      context.fillStyle = `rgba(${puddleColor}, 0.6)`;
      context.beginPath();
      context.arc(fl.x, fl.y - 1, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  /* ── Floating holographic data fragments (replaces butterflies) ── */
  for (const bf of butterflies) {
    context.save();
    context.translate(bf.x, bf.y);
    const pulse = Math.sin(bf.wingPhase) * 0.5 + 0.5;
    context.globalAlpha = 0.4 + pulse * 0.3;

    /* Main data fragment (rotating rectangle) */
    context.rotate(bf.wingPhase * 0.3);
    const fragColor = Math.sin(bf.x + bf.y) > 0 ? "#00ffcc" : "#ff00aa";
    context.fillStyle = fragColor;
    context.fillRect(-bf.size * 0.8, -bf.size * 0.15, bf.size * 1.6, bf.size * 0.3);

    /* Horizontal scan line */
    context.fillStyle = "rgba(255, 255, 255, 0.3)";
    context.fillRect(-bf.size * 0.6, -bf.size * 0.02, bf.size * 1.2, bf.size * 0.04);

    /* Surrounding glow */
    const fragGlow = context.createRadialGradient(0, 0, 0, 0, 0, bf.size * 2);
    fragGlow.addColorStop(0, fragColor.replace(")", ", 0.15)").replace("rgb", "rgba").replace("#00ffcc", "rgba(0,255,204,0.15)").replace("#ff00aa", "rgba(255,0,170,0.15)"));
    fragGlow.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = Math.sin(bf.x + bf.y) > 0 ? "rgba(0,255,204,0.08)" : "rgba(255,0,170,0.08)";
    context.beginPath();
    context.arc(0, 0, bf.size * 2, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 1;
    context.restore();
  }
};
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

  const tilt = Math.max(-0.5, Math.min(0.65, bird.velocity * 0.0012));
  context.rotate(tilt);

  /* Cyan exhaust trail */
  for (let i = 0; i < bird.trail.length; i += 1) {
    const t = bird.trail[i];
    const age = 1 - i / bird.trail.length;
    const alpha = age * 0.25;
    const r = bird.radius * age * 0.6;
    context.fillStyle = `rgba(0, 229, 255, ${alpha})`;
    context.beginPath();
    context.arc(t.x - bird.x, t.y - bird.y, r, 0, Math.PI * 2);
    context.fill();
  }

  /* Engine glow (magenta) behind the drone */
  context.save();
  context.shadowColor = "#ff00aa";
  context.shadowBlur = 12;
  context.fillStyle = "rgba(255, 0, 170, 0.25)";
  context.beginPath();
  context.arc(-bird.radius + 2, 0, bird.radius * 0.45, 0, Math.PI * 2);
  context.fill();
  context.restore();

  /* Exhaust trail lines (2-3 cyan/magenta lines behind) */
  const exhaustColors = ["rgba(0, 229, 255, 0.5)", "rgba(255, 0, 170, 0.35)", "rgba(0, 229, 255, 0.3)"];
  const exhaustOffsets = [-3, 0, 3];
  for (let i = 0; i < 3; i++) {
    const flicker = Math.sin(Date.now() * 0.01 + i * 2) * 2;
    context.strokeStyle = exhaustColors[i];
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(-bird.radius + 2, exhaustOffsets[i]);
    context.lineTo(-bird.radius - 8 - flicker, exhaustOffsets[i] + flicker * 0.5);
    context.stroke();
  }

  /* Dark metallic body — angular hexagonal shape */
  const bodyGrad = context.createLinearGradient(-bird.radius, -bird.radius, bird.radius, bird.radius);
  bodyGrad.addColorStop(0, "#2a2a3a");
  bodyGrad.addColorStop(0.5, "#1a1a2a");
  bodyGrad.addColorStop(1, "#2a2a3a");
  context.fillStyle = bodyGrad;
  context.beginPath();
  /* Hexagonal / angular body */
  const r = bird.radius;
  context.moveTo(r * 0.9, 0);         /* nose (right) */
  context.lineTo(r * 0.4, -r * 0.85); /* top-right */
  context.lineTo(-r * 0.5, -r * 0.7); /* top-left (flat top) */
  context.lineTo(-r * 0.9, 0);        /* tail (left) */
  context.lineTo(-r * 0.5, r * 0.7);  /* bottom-left */
  context.lineTo(r * 0.4, r * 0.85);  /* bottom-right */
  context.closePath();
  context.fill();

  /* Metallic highlight stripe */
  context.strokeStyle = "rgba(100, 120, 150, 0.3)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-r * 0.4, 0);
  context.lineTo(r * 0.6, 0);
  context.stroke();

  /* Hull stripe detail (replaces cheek blush) */
  context.strokeStyle = "#00e5ff";
  context.lineWidth = 0.8;
  context.globalAlpha = 0.6;
  context.beginPath();
  context.moveTo(-r * 0.3, r * 0.3);
  context.lineTo(r * 0.5, r * 0.3);
  context.stroke();
  context.beginPath();
  context.moveTo(-r * 0.2, -r * 0.3);
  context.lineTo(r * 0.5, -r * 0.3);
  context.stroke();
  context.globalAlpha = 1.0;

  /* Cyan neon edge outline */
  context.save();
  context.shadowColor = "#00e5ff";
  context.shadowBlur = 6;
  context.strokeStyle = "rgba(0, 229, 255, 0.35)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(r * 0.9, 0);
  context.lineTo(r * 0.4, -r * 0.85);
  context.lineTo(-r * 0.5, -r * 0.7);
  context.lineTo(-r * 0.9, 0);
  context.lineTo(-r * 0.5, r * 0.7);
  context.lineTo(r * 0.4, r * 0.85);
  context.closePath();
  context.stroke();
  context.restore();

  /* Angular blade-like wing fins with neon pulse */
  bird.wingAngle += (bird.velocity < -100 ? 0.35 : -0.15);
  bird.wingAngle = Math.max(-0.4, Math.min(0.5, bird.wingAngle));
  const wingY = Math.sin(bird.wingAngle * 4) * 5;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);

  context.save();
  context.shadowColor = "#00e5ff";
  context.shadowBlur = 4 + pulse * 4;

  /* Upper blade fin */
  context.fillStyle = `rgba(0, 229, 255, ${0.3 + pulse * 0.3})`;
  context.beginPath();
  context.moveTo(-2, -r * 0.5 + wingY);
  context.lineTo(-10, -r * 1.3 + wingY);
  context.lineTo(-6, -r * 0.5 + wingY);
  context.closePath();
  context.fill();

  /* Lower blade fin */
  context.beginPath();
  context.moveTo(-2, r * 0.5 + wingY);
  context.lineTo(-10, r * 1.3 + wingY);
  context.lineTo(-6, r * 0.5 + wingY);
  context.closePath();
  context.fill();

  /* Fin edge strokes */
  context.strokeStyle = "#00e5ff";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-2, -r * 0.5 + wingY);
  context.lineTo(-10, -r * 1.3 + wingY);
  context.stroke();
  context.beginPath();
  context.moveTo(-2, r * 0.5 + wingY);
  context.lineTo(-10, r * 1.3 + wingY);
  context.stroke();

  context.restore();

  /* Glowing cyan eye/sensor */
  context.save();
  context.shadowColor = "#00e5ff";
  context.shadowBlur = 10;
  context.fillStyle = "#00e5ff";
  context.beginPath();
  context.arc(r * 0.25, -r * 0.25, 2.5, 0, Math.PI * 2);
  context.fill();
  /* Inner bright core */
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(r * 0.25, -r * 0.25, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();

  /* Angular visor/sensor in front (replaces beak) */
  context.save();
  context.shadowColor = "#00e5ff";
  context.shadowBlur = 6;
  context.fillStyle = "rgba(0, 229, 255, 0.5)";
  context.beginPath();
  context.moveTo(r * 0.9, 0);
  context.lineTo(r * 1.2, -2);
  context.lineTo(r * 1.2, 2);
  context.closePath();
  context.fill();
  context.restore();

  context.restore();
};

const drawPipes = () => {
  pipes.forEach((pipe, pipeIdx) => {
    const capW = gameState.pipeWidth + 10;
    const capH = 18;
    const capX = pipe.x - 5;

    const isReinforced = pipe.reinforced;

    const topGrad = context.createLinearGradient(pipe.x, 0, pipe.x + gameState.pipeWidth, 0);
    if (isReinforced) {
      topGrad.addColorStop(0, "#2a2a38");
      topGrad.addColorStop(0.3, "#3a3a48");
      topGrad.addColorStop(0.7, "#303040");
      topGrad.addColorStop(1, "#222230");
    } else {
      topGrad.addColorStop(0, "#1a1a28");
      topGrad.addColorStop(0.3, "#252535");
      topGrad.addColorStop(0.7, "#1e1e2e");
      topGrad.addColorStop(1, "#141420");
    }

    if (!pipe.topDestroyed) {
      context.fillStyle = topGrad;
      context.fillRect(pipe.x, 0, gameState.pipeWidth, pipe.top - capH);

      const capGrad = context.createLinearGradient(capX, 0, capX + capW, 0);
      if (isReinforced) {
        capGrad.addColorStop(0, "#2a2a38");
        capGrad.addColorStop(0.5, "#3a3a48");
        capGrad.addColorStop(1, "#222230");
      } else {
        capGrad.addColorStop(0, "#252535");
        capGrad.addColorStop(0.5, "#2e2e3e");
        capGrad.addColorStop(1, "#1a1a28");
      }
      context.fillStyle = capGrad;
      context.beginPath();
      context.roundRect(capX, pipe.top - capH, capW, capH, [1, 1, 0, 0]);
      context.fill();

      context.strokeStyle = "rgba(0, 229, 255, 0.6)";
      context.lineWidth = 1;
      context.strokeRect(capX, pipe.top - capH, capW, capH);

      context.strokeStyle = "rgba(0, 229, 255, 0.5)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(pipe.x, 0);
      context.lineTo(pipe.x, pipe.top - capH);
      context.stroke();
      context.beginPath();
      context.moveTo(pipe.x + gameState.pipeWidth, 0);
      context.lineTo(pipe.x + gameState.pipeWidth, pipe.top - capH);
      context.stroke();

      const scannerY = ((Date.now() * 0.03) % (pipe.top - capH));
      context.strokeStyle = "rgba(0, 229, 255, 0.35)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(pipe.x + 2, scannerY);
      context.lineTo(pipe.x + gameState.pipeWidth - 2, scannerY);
      context.stroke();

      context.strokeStyle = "rgba(0, 229, 255, 0.15)";
      context.lineWidth = 0.8;
      for (const crack of pipe.cracks) {
        const crackY = crack.yStart * (pipe.top - capH);
        const lineLen = Math.min(crack.len, 15);
        context.beginPath();
        context.moveTo(pipe.x + crack.xOff, crackY);
        context.lineTo(pipe.x + crack.xOff + lineLen, crackY);
        context.stroke();
        if (lineLen > 8) {
          context.beginPath();
          context.moveTo(pipe.x + crack.xOff + lineLen * 0.6, crackY);
          context.lineTo(pipe.x + crack.xOff + lineLen * 0.6, crackY + 5);
          context.stroke();
        }
      }

      if (dripState.falling && pipeIdx === 0) {
        const sparkCount = 3;
        for (let s = 0; s < sparkCount; s++) {
          const sparkX = pipe.x + gameState.pipeWidth * 0.3 + Math.sin(Date.now() * 0.01 + s * 2) * 10;
          const sparkY = pipe.top + dripState.y + s * 4;
          context.fillStyle = `rgba(0, 229, 255, ${dripState.alpha * (1 - s * 0.25)})`;
          context.beginPath();
          context.arc(sparkX, sparkY, 1.2, 0, Math.PI * 2);
          context.fill();
        }
      }

      if (pipe.reinforced && pipe.topHP === 1) {
        context.strokeStyle = 'rgba(255, 102, 0, 0.7)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(pipe.x + 10, pipe.top - 30);
        context.lineTo(pipe.x + 18, pipe.top - 18);
        context.lineTo(pipe.x + 12, pipe.top - 15);
        context.lineTo(pipe.x + 25, pipe.top - 5);
        context.stroke();
        context.fillStyle = 'rgba(255, 102, 0, 0.4)';
        context.beginPath();
        context.arc(pipe.x + 18, pipe.top - 18, 2, 0, Math.PI * 2);
        context.fill();
      }
    }

    const bottomY = pipe.top + gameState.gap;

    const gapShadowH = 14;
    const topGapGlow = context.createLinearGradient(0, pipe.top - 2, 0, pipe.top + gapShadowH);
    topGapGlow.addColorStop(0, "rgba(0, 229, 255, 0.12)");
    topGapGlow.addColorStop(0.4, "rgba(120, 0, 255, 0.06)");
    topGapGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = topGapGlow;
    context.fillRect(pipe.x - 5, pipe.top - 2, capW, gapShadowH);

    const botGapGlow = context.createLinearGradient(0, bottomY + 2, 0, bottomY - gapShadowH);
    botGapGlow.addColorStop(0, "rgba(0, 229, 255, 0.12)");
    botGapGlow.addColorStop(0.4, "rgba(120, 0, 255, 0.06)");
    botGapGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = botGapGlow;
    context.fillRect(pipe.x - 5, bottomY - gapShadowH + 2, capW, gapShadowH);

    if (!pipe.bottomDestroyed) {
      context.fillStyle = topGrad;
      context.fillRect(pipe.x, bottomY + capH, gameState.pipeWidth, GAME_H - bottomY - capH);

      const capGrad2 = context.createLinearGradient(capX, 0, capX + capW, 0);
      if (isReinforced) {
        capGrad2.addColorStop(0, "#2a2a38");
        capGrad2.addColorStop(0.5, "#3a3a48");
        capGrad2.addColorStop(1, "#222230");
      } else {
        capGrad2.addColorStop(0, "#252535");
        capGrad2.addColorStop(0.5, "#2e2e3e");
        capGrad2.addColorStop(1, "#1a1a28");
      }
      context.fillStyle = capGrad2;
      context.beginPath();
      context.roundRect(capX, bottomY, capW, capH, [0, 0, 1, 1]);
      context.fill();

      context.strokeStyle = "rgba(0, 229, 255, 0.6)";
      context.lineWidth = 1;
      context.strokeRect(capX, bottomY, capW, capH);

      context.strokeStyle = "rgba(0, 229, 255, 0.5)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(pipe.x, bottomY + capH);
      context.lineTo(pipe.x, GAME_H);
      context.stroke();
      context.beginPath();
      context.moveTo(pipe.x + gameState.pipeWidth, bottomY + capH);
      context.lineTo(pipe.x + gameState.pipeWidth, GAME_H);
      context.stroke();

      const botPipeH = GAME_H - bottomY - capH;
      const scannerY2 = ((Date.now() * 0.025 + 100) % botPipeH);
      context.strokeStyle = "rgba(0, 229, 255, 0.35)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(pipe.x + 2, bottomY + capH + scannerY2);
      context.lineTo(pipe.x + gameState.pipeWidth - 2, bottomY + capH + scannerY2);
      context.stroke();

      context.strokeStyle = "rgba(0, 229, 255, 0.15)";
      context.lineWidth = 0.8;
      for (const crack of pipe.cracks) {
        const bpHeight = GAME_H - bottomY - capH;
        const crackY = bottomY + capH + crack.yStart * bpHeight;
        const lineLen = Math.min(crack.len, 15);
        context.beginPath();
        context.moveTo(pipe.x + crack.xOff, crackY);
        context.lineTo(pipe.x + crack.xOff + lineLen, crackY);
        context.stroke();
        if (lineLen > 8) {
          context.beginPath();
          context.moveTo(pipe.x + crack.xOff + lineLen * 0.6, crackY);
          context.lineTo(pipe.x + crack.xOff + lineLen * 0.6, crackY + 5);
          context.stroke();
        }
      }

      if (pipe.reinforced && pipe.bottomHP === 1) {
        context.strokeStyle = 'rgba(255, 102, 0, 0.7)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(pipe.x + 10, bottomY + capH + 10);
        context.lineTo(pipe.x + 18, bottomY + capH + 22);
        context.lineTo(pipe.x + 12, bottomY + capH + 25);
        context.lineTo(pipe.x + 25, bottomY + capH + 35);
        context.stroke();
        context.fillStyle = 'rgba(255, 102, 0, 0.4)';
        context.beginPath();
        context.arc(pipe.x + 18, bottomY + capH + 22, 2, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.fillStyle = "rgba(0, 0, 0, 0.15)";
    if (!pipe.topDestroyed)
      context.fillRect(pipe.x + gameState.pipeWidth - 8, 0, 8, pipe.top - capH);
    if (!pipe.bottomDestroyed)
      context.fillRect(pipe.x + gameState.pipeWidth - 8, bottomY + capH, 8, GAME_H - bottomY - capH);
  });
};

const drawFeatherParticles = () => {
  for (const fp of featherParticles) {
    context.save();
    context.translate(fp.x, fp.y);
    context.rotate(fp.rot);
    context.globalAlpha = fp.alpha;
    context.fillStyle = fp.color;
    context.beginPath();
    context.ellipse(0, 0, fp.size * 0.4, fp.size, 0, 0, Math.PI * 2);
    context.fill();
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

const drawScorePop = () => {
  if (gameState.scorePop > 0) {
    const scale = 1 + gameState.scorePop * 0.6;
    const alpha = gameState.scorePop;
    context.save();
    context.translate(GAME_W / 2, GAME_H * 0.15);
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
  const vg = context.createRadialGradient(
    GAME_W / 2, GAME_H / 2, GAME_H * 0.1,
    GAME_W / 2, GAME_H / 2, GAME_H * 0.7
  );
  vg.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  context.fillStyle = vg;
  context.fillRect(0, 0, GAME_W, GAME_H);

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

  const topHit = hitTop && !pipe.topDestroyed;
  const botHit = hitBottom && !pipe.bottomDestroyed;
  return topHit || botHit;
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
  /* Pause update logic when upgrade choice is shown */
  if (gunState.upgradeChoice) return;

  if (!gameState.isRunning || gameState.isGameOver) {
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

  if (Math.random() < 0.3) {
    spawnWindParticle();
  }

  bird.velocity += gameState.gravity * deltaSeconds;
  bird.y += bird.velocity * deltaSeconds;

  bird.trail.push({ x: bird.x, y: bird.y });
  if (bird.trail.length > 8) bird.trail.shift();

  const isInvincible = gunState.invincibleTimer > 0;

  if (bird.y + bird.radius >= GAME_H - 90 || bird.y - bird.radius <= 0) {
    if (!isInvincible) {
      gameState.isGameOver = true;
      gameState.shakeTimer = 12;
      gameState.shakeIntensity = 6;
    }
  }

  pipes.forEach((pipe) => {
    pipe.x -= gameState.speed * deltaSeconds;
  });

  pipes = pipes.filter((pipe) => pipe.x + gameState.pipeWidth > -10);

  if (!isInvincible && pipes.some(detectCollision)) {
    gameState.isGameOver = true;
    gameState.shakeTimer = 12;
    gameState.shakeIntensity = 6;
  }

  /* Boss collision with bird */
  if (!isInvincible && gunState.boss) {
    const boss = gunState.boss;
    const bh = boss.width * 0.8;
    if (circleRectCollision(bird.x, bird.y, bird.radius, { x: boss.x, y: boss.y, w: boss.width, h: bh })) {
      gameState.isGameOver = true;
      gameState.shakeTimer = 12;
      gameState.shakeIntensity = 6;
    }
  }

  if (gameState.isGameOver) {
    saveBestScore();
    if (!feathersSpawned && !gunState.victoryTriggered) {
      spawnFeatherParticles();
      feathersSpawned = true;
      demoteTier();
      Audio.crash();
      Audio.stopDrone();
      const totalScore = gameState.score + gunState.totalDestroyed * 2;
      if (typeof Leaderboard !== 'undefined') Leaderboard.submitScore('gun-game', totalScore);
      if (typeof Arcade !== 'undefined') {
        Arcade.onGameOver('gun-game', totalScore);
        document.body.appendChild(Arcade.createScoreCard('gun-game', totalScore, Number(localStorage.getItem('gunGameBest'))||0));
      }
      ggAchStats.gamesPlayed++;
      if (totalScore > ggAchStats.bestScore) ggAchStats.bestScore = totalScore;
      saveGGAch();
      checkGGAch();
    }
  }

  updateScore();

  if (!gameState.isGameOver) {
    gunState.cooldown = Math.max(0, gunState.cooldown - deltaSeconds);
    gunState.invincibleTimer = Math.max(0, gunState.invincibleTimer - deltaSeconds);
    gunState.tierFlash = Math.max(0, gunState.tierFlash - deltaSeconds);
    gunState.screenFlash = Math.max(0, gunState.screenFlash - deltaSeconds);
    gunState.demotionTimer = Math.max(0, gunState.demotionTimer - deltaSeconds);
    updateProjectiles(deltaSeconds);
    updateFragments(deltaSeconds);
    updateBoss(deltaSeconds);
  }
  if (gameState.isGameOver) {
    updateFragments(deltaSeconds);
    for (const proj of gunState.projectiles) {
      proj.lifetime -= deltaSeconds;
    }
    gunState.projectiles = gunState.projectiles.filter(p => p.lifetime > 0);
  }

  for (const cloud of clouds) {
    cloud.x -= cloud.speed * deltaSeconds * 60;
    if (cloud.x < -cloud.width) {
      cloud.x = GAME_W + cloud.width;
      cloud.y = 30 + Math.random() * (GAME_H * 0.5);
    }
  }

  windParticles.forEach((w) => {
    w.x -= w.speed * deltaSeconds;
  });
  windParticles = windParticles.filter((w) => w.x + w.length > 0);

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

  for (const bf of butterflies) {
    bf.phase += deltaSeconds * 1.5;
    bf.wingPhase += deltaSeconds * 12;
    bf.x += Math.sin(bf.phase) * bf.speedX * deltaSeconds;
    bf.y += Math.cos(bf.phase * 0.7) * bf.speedY * deltaSeconds;
    if (bf.x < -20) bf.x = GAME_W + 20;
    if (bf.x > GAME_W + 20) bf.x = -20;
    if (bf.y < 40) bf.y = 40;
    if (bf.y > GAME_H * 0.45) bf.y = GAME_H * 0.45;
  }

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

  if (gameState.shakeTimer > 0) {
    gameState.shakeTimer -= deltaSeconds;
    gameState.shakeIntensity *= Math.pow(0.82, deltaSeconds * 60);
  }
};

/* --- Draw projectiles --- */
function drawProjectiles() {
  for (const proj of gunState.projectiles) {
    context.save();
    switch (proj.tier) {
      case 1:
        context.fillStyle = '#8B6914';
        context.beginPath();
        context.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
        context.fill();
        break;
      case 2:
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
      case 3:
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
      case 4:
        context.fillStyle = '#8B5E3C';
        context.beginPath();
        context.arc(proj.x, proj.y + 1, 5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#6B4226';
        context.beginPath();
        context.ellipse(proj.x, proj.y - 3, 6, 3, 0, Math.PI, Math.PI * 2);
        context.fill();
        break;
      case 5:
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
      case 6: {
        const grad6 = context.createLinearGradient(proj.x, proj.y - 6, proj.x, proj.y + 6);
        grad6.addColorStop(0, 'rgba(255, 200, 0, 0)');
        grad6.addColorStop(0.3, 'rgba(255, 200, 0, 0.5)');
        grad6.addColorStop(0.5, 'rgba(255, 255, 100, 0.8)');
        grad6.addColorStop(0.7, 'rgba(255, 200, 0, 0.5)');
        grad6.addColorStop(1, 'rgba(255, 200, 0, 0)');
        context.fillStyle = grad6;
        context.fillRect(proj.x, proj.y - 6, GAME_W - proj.x, 12);
        break;
      }
      case 7: {
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
      case 8:
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

/* --- Draw pipe fragments --- */
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

/* --- Draw Gun HUD --- */
function drawGunHUD() {
  context.fillStyle = 'rgba(0, 0, 0, 0.4)';
  context.fillRect(5, 5, 140, 38);
  context.fillStyle = '#FFFFFF';
  context.font = "bold 14px 'Trebuchet MS'";
  context.textAlign = 'left';
  context.fillText(`${I18N.t('ggTierLabel')} ${gunState.tier}/8`, 12, 20);
  context.font = "11px 'Trebuchet MS'";
  context.fillStyle = '#FFD700';
  context.fillText(weaponDefs[gunState.tier - 1].name, 12, 36);

  const circleStartX = GAME_W - 55;
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

  const wep = weaponDefs[gunState.tier - 1];
  const cooldownPct = gunState.cooldown / (wep.fireRate / 1000);
  context.fillStyle = 'rgba(0, 0, 0, 0.3)';
  context.fillRect(12, 42, 80, 4);
  context.fillStyle = cooldownPct > 0 ? '#FF6644' : '#44FF66';
  context.fillRect(12, 42, 80 * (1 - cooldownPct), 4);

  if (gunState.tierFlash > 0) {
    const alpha = Math.min(1, gunState.tierFlash);
    const scale = 1 + (1.5 - gunState.tierFlash) * 0.3;
    context.save();
    context.globalAlpha = alpha;
    context.translate(GAME_W / 2, GAME_H * 0.3);
    context.scale(scale, scale);
    context.fillStyle = '#FFD700';
    context.font = "bold 22px 'Trebuchet MS'";
    context.textAlign = 'center';
    context.fillText(`${I18N.t('ggTierLabel')} ${gunState.tier}`, 0, 0);
    context.font = "16px 'Trebuchet MS'";
    context.fillStyle = '#FFFFFF';
    context.fillText(gunState.tierFlashName, 0, 24);
    context.restore();
  }

  if (gunState.demotionTimer > 0) {
    context.globalAlpha = Math.min(1, gunState.demotionTimer);
    context.fillStyle = '#FF4444';
    context.font = "bold 16px 'Trebuchet MS'";
    context.textAlign = 'center';
    context.fillText(gunState.demotionMsg, GAME_W / 2, GAME_H * 0.4);
    context.globalAlpha = 1;
  }
}

/* --- Weapon upgrade choice overlay --- */
function selectUpgrade(side) {
  if (!gunState.upgradeChoice) return;
  const chosen = side === 'left' ? gunState.upgradeChoice.left : gunState.upgradeChoice.right;
  gunState.weaponUpgrades.push(chosen.id);
  gunState.upgradeChoice = null;
}

function drawUpgradeChoice() {
  if (!gunState.upgradeChoice) return;
  const choice = gunState.upgradeChoice;

  /* Dim overlay */
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(0, 0, GAME_W, GAME_H);

  /* Title */
  context.fillStyle = '#FFD700';
  context.font = "bold 22px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText(I18N.t('ggChooseUpgrade'), GAME_W / 2, GAME_H * 0.25);

  /* Left option */
  const boxW = GAME_W * 0.4;
  const boxH = 120;
  const leftX = GAME_W * 0.05;
  const rightX = GAME_W * 0.55;
  const boxY = GAME_H * 0.35;

  /* Left box */
  context.fillStyle = 'rgba(50, 120, 200, 0.6)';
  context.beginPath();
  context.roundRect(leftX, boxY, boxW, boxH, 8);
  context.fill();
  context.strokeStyle = '#6699FF';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#FFFFFF';
  context.font = "bold 16px 'Trebuchet MS'";
  context.fillText(choice.left.name, leftX + boxW / 2, boxY + 35);
  context.font = "13px 'Trebuchet MS'";
  context.fillStyle = '#AACCFF';
  context.fillText(choice.left.desc, leftX + boxW / 2, boxY + 60);
  context.fillStyle = 'rgba(255,255,255,0.5)';
  context.font = "12px 'Trebuchet MS'";
  context.fillText(I18N.t('ggPress1TapLeft'), leftX + boxW / 2, boxY + boxH - 15);

  /* Right box */
  context.fillStyle = 'rgba(200, 80, 50, 0.6)';
  context.beginPath();
  context.roundRect(rightX, boxY, boxW, boxH, 8);
  context.fill();
  context.strokeStyle = '#FF6644';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#FFFFFF';
  context.font = "bold 16px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText(choice.right.name, rightX + boxW / 2, boxY + 35);
  context.font = "13px 'Trebuchet MS'";
  context.fillStyle = '#FFCCAA';
  context.fillText(choice.right.desc, rightX + boxW / 2, boxY + 60);
  context.fillStyle = 'rgba(255,255,255,0.5)';
  context.font = "12px 'Trebuchet MS'";
  context.fillText(I18N.t('ggPress2TapRight'), rightX + boxW / 2, boxY + boxH - 15);
}

/* --- Weapon indicator on bird --- */
function drawBirdWeapon() {
  if (!gameState.isRunning) return;
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

/* --- Victory screen --- */
function drawVictory() {
  const vg = context.createRadialGradient(
    GAME_W / 2, GAME_H / 2, 20,
    GAME_W / 2, GAME_H / 2, GAME_H * 0.6
  );
  vg.addColorStop(0, "rgba(255, 200, 0, 0.3)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.6)");
  context.fillStyle = vg;
  context.fillRect(0, 0, GAME_W, GAME_H);

  context.save();
  context.shadowColor = '#FFD700';
  context.shadowBlur = 30;
  context.fillStyle = '#FFD700';
  context.font = "bold 42px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText(I18N.t('ggVictory'), GAME_W / 2, GAME_H / 2 - 40);
  context.restore();

  const totalScore = gameState.score + gunState.totalDestroyed * 2;
  context.fillStyle = '#FFFFFF';
  context.font = "18px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText(`${I18N.t('score')}: ${totalScore}`, GAME_W / 2, GAME_H / 2 + 10);
  context.fillText(`${I18N.t('ggPipesDestroyed')}: ${gunState.totalDestroyed}`, GAME_W / 2, GAME_H / 2 + 35);
  context.fillText(`${I18N.t('ggPipesPassed')}: ${gameState.score}`, GAME_W / 2, GAME_H / 2 + 60);

  context.fillStyle = 'rgba(255, 255, 255, 0.6)';
  context.font = "14px 'Trebuchet MS'";
  context.fillText(I18N.t('ggTapReplay'), GAME_W / 2, GAME_H / 2 + 100);
}

/* --- Game over overlay --- */
function drawGameOver() {
  const vg = context.createRadialGradient(
    GAME_W / 2, GAME_H / 2, GAME_H * 0.1,
    GAME_W / 2, GAME_H / 2, GAME_H * 0.7
  );
  vg.addColorStop(0, "rgba(0, 0, 0, 0.25)");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  context.fillStyle = vg;
  context.fillRect(0, 0, GAME_W, GAME_H);

  context.fillStyle = '#FF6644';
  context.font = "bold 28px 'Trebuchet MS'";
  context.textAlign = 'center';
  context.fillText(I18N.t('gameOver'), GAME_W / 2, GAME_H / 2 - 30);

  context.fillStyle = '#FFFFFF';
  context.font = "16px 'Trebuchet MS'";
  context.fillText(`${I18N.t('ggDemotedTo')} ${gunState.tier}`, GAME_W / 2, GAME_H / 2 + 5);
  context.fillText(`${I18N.t('ggHighestTier')}: ${gunState.highestTier}`, GAME_W / 2, GAME_H / 2 + 30);
  context.fillText(`${I18N.t('ggPipesDestroyed')}: ${gunState.totalDestroyed}`, GAME_W / 2, GAME_H / 2 + 55);

  context.fillStyle = 'rgba(255, 255, 255, 0.6)';
  context.font = "14px 'Trebuchet MS'";
  context.fillText(I18N.t('ggTapRetry'), GAME_W / 2, GAME_H / 2 + 90);
}

const draw = () => {
  /* Clear at native resolution */
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  /* Scale from game coords to canvas pixels */
  const scaleX = canvas.width / GAME_W;
  const scaleY = canvas.height / GAME_H;
  context.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  context.save();

  if (gameState.shakeTimer > 0) {
    const sx = (Math.random() - 0.5) * gameState.shakeIntensity;
    const sy = (Math.random() - 0.5) * gameState.shakeIntensity;
    context.translate(sx, sy);
  }

  drawBackground();
  drawWind();
  drawPipes();
  drawBoss();
  drawPipeFragments();
  drawProjectiles();
  drawBird();
  drawBirdWeapon();
  drawFeatherParticles();
  drawScorePop();

  if (gunState.invincibleTimer > 0) {
    if (Math.floor(gunState.invincibleTimer * 10) % 2 === 0) {
      context.fillStyle = 'rgba(255, 255, 255, 0.15)';
      context.beginPath();
      context.arc(bird.x, bird.y, bird.radius + 6, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (gunState.screenFlash > 0) {
    context.fillStyle = `rgba(255, 255, 200, ${gunState.screenFlash * 2})`;
    context.fillRect(0, 0, GAME_W, GAME_H);
  }

  if (gameState.isRunning) drawGunHUD();

  if (!gameState.isRunning && !gameState.isGameOver) {
    drawOverlay(I18N.t("tapToStart"), I18N.t('ggControlsHint'));
  }

  if (gameState.isGameOver) {
    drawGameOver();
  }

  if (gunState.victoryTriggered) {
    drawVictory();
  }

  if (gunState.upgradeChoice) {
    drawUpgradeChoice();
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
  showGGAchPopup();
  requestAnimationFrame(loop);
};

const startGame = () => {
  if (!gameState.isRunning) {
    gameState.isRunning = true;
    Audio.startDrone();
  }
};

let lastFlapTime = 0;
const FLAP_COOLDOWN = 100;

const flap = () => {
  if (gunState.upgradeChoice) return;
  const now = performance.now();
  if (now - lastFlapTime < FLAP_COOLDOWN) return;
  lastFlapTime = now;

  Audio.init();
  Audio.resume();

  if (gameState.isGameOver) {
    fullGunReset();
    resetGame();
    startGame();
  } else if (!gameState.isRunning) {
    startGame();
  }

  if (gameState.isRunning) {
    bird.velocity = gameState.lift;
    Audio.flap();
  }
};

window.addEventListener("keydown", (event) => {
  const tag = (document.activeElement || {}).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  }
  if (event.code === "Enter") {
    event.preventDefault();
    shoot();
  }
  if (gunState.upgradeChoice && (event.code === "Digit1" || event.code === "Digit2")) {
    event.preventDefault();
    selectUpgrade(event.code === "Digit1" ? 'left' : 'right');
    return;
  }
  if (event.code === "KeyF") {
    if (!event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      if (event.shiftKey) {
        toggleFullscreen();
      } else {
        shoot();
      }
    }
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  /* Handle upgrade choice tap */
  if (gunState.upgradeChoice) {
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) * (GAME_W / rect.width);
    selectUpgrade(clickX < GAME_W / 2 ? 'left' : 'right');
    return;
  }

  if (gameState.isRunning && !gameState.isGameOver) {
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) * (GAME_W / rect.width);
    if (clickX > GAME_W / 2) {
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
  fullGunReset();
  resetGame();
});
document.addEventListener('arcade-restart', () => { fullGunReset(); resetGame(); });

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

/* ── Canvas sizing ───────────────────────────────────────── */
function updateCanvasSize() {
  const dpr = window.devicePixelRatio || 1;
  if (isFullscreen) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - 52;
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
    if (typeof fitCanvasToScreen === 'function') fitCanvasToScreen();
    else { canvas.style.width = ''; canvas.style.height = ''; }
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
  }
  draw();
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
document.addEventListener("fullscreenchange", () => { isFullscreen = !!document.fullscreenElement; updateFsButton(); requestAnimationFrame(() => updateCanvasSize()); });
document.addEventListener("webkitfullscreenchange", () => { isFullscreen = !!document.webkitFullscreenElement; updateFsButton(); requestAnimationFrame(() => updateCanvasSize()); });
if (fullscreenButton) fullscreenButton.addEventListener("click", toggleFullscreen);

/* ── Tab Visibility ───────────────────────────────────────── */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { Audio.stopDrone(); }
  else if (gameState.isRunning && !Audio.isMuted()) { Audio.startDrone(); }
});

/* --- Prevent scrolling / pull-to-refresh on mobile --- */
document.addEventListener("touchmove", (e) => { e.preventDefault(); }, { passive: false });
document.addEventListener("touchstart", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

/* --- Dynamic canvas sizing for mobile portrait --- */
const _gameHeader = document.querySelector('.game__header');
const _gameHud = document.querySelector('.game__hud');

function fitCanvasToScreen() {
  const isMobile = window.innerWidth <= 600;
  if (!isMobile) { canvas.style.width = ''; canvas.style.height = ''; return; }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const headerH = _gameHeader ? _gameHeader.offsetHeight : 0;
  const hudH = _gameHud ? _gameHud.offsetHeight : 0;

  const chrome = headerH + hudH + 16 + 12 + 16 + 8;
  const availH = vh - chrome;
  const availW = vw - 12 - 16;

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

updateCanvasSize();
let _resizeTimer;
window.addEventListener('resize', () => { clearTimeout(_resizeTimer); _resizeTimer = setTimeout(updateCanvasSize, 80); });
window.addEventListener('orientationchange', () => { setTimeout(updateCanvasSize, 200); });

loadBestScore();
resetGame();
if (typeof Leaderboard !== 'undefined') {
  const lbPanel = document.getElementById('leaderboardPanel');
  lbPanel.appendChild(Leaderboard.createPanel('gun-game'));
  const lbToggleBtn = document.getElementById('leaderboardToggle');
  if (lbToggleBtn) {
    lbToggleBtn.addEventListener('click', () => { lbPanel.classList.toggle('lb-visible'); });
    lbPanel.addEventListener('click', (e) => { if (e.target === lbPanel) lbPanel.classList.remove('lb-visible'); });
  }
}
requestAnimationFrame(loop);

// ── Ko-fi Shop ──
if (typeof Shop !== 'undefined') {
  Shop.init({
    gameId: 'gun-game',
    buttonTarget: '#shopBtn',
    bundles: [
      { id: 'gunpremium', name: 'Gun Premium', desc: 'Crimson & Arctic visual themes', price: '~$1',
        checkoutUrl: 'https://YOUR_STORE.lemonsqueezy.com/buy/GUN_PRODUCT_ID', items: ['gg_crimson', 'gg_arctic'] },
    ],
    codes: { 'GUNPRO2026': 'gunpremium' },
    onUnlock: function (itemIds) {
      var arr; try { arr = JSON.parse(localStorage.getItem('ggShopUnlocked')) || []; } catch(e) { arr = []; }
      itemIds.forEach(function (id) { if (arr.indexOf(id) === -1) arr.push(id); });
      localStorage.setItem('ggShopUnlocked', JSON.stringify(arr));
    }
  });
}
