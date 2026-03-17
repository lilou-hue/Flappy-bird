/* ================================================================
   Star Fury — Vertical Space Shooter
   ================================================================ */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const GAME_W = 360;
const GAME_H = 640;
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("bestScore");
const waveDisplay = document.getElementById("waveDisplay");
const restartButton = document.getElementById("restartButton");

/* --- i18n setup --- */
I18N.createSelector(document.querySelector('.game__header'));
I18N.applyDOM();
window.addEventListener('langchange', () => { I18N.applyDOM(); draw(); });

/* ══════════════════════════════════════════════════════════════════
   ACHIEVEMENTS
   ══════════════════════════════════════════════════════════════════ */
const SF_ACHIEVEMENTS = [
  { id: 'first_blood',    icon: '\uD83D\uDCA5', get title(){ return I18N.t('sfAchFirstBlood'); },    get desc(){ return I18N.t('sfAchFirstBloodDesc'); },    check: s => s.totalKills >= 1 },
  { id: 'wave5',          icon: '\u2B50',       get title(){ return I18N.t('sfAchWave5'); },          get desc(){ return I18N.t('sfAchWave5Desc'); },          check: s => s.highestWave >= 5 },
  { id: 'wave10',         icon: '\uD83C\uDF1F', get title(){ return I18N.t('sfAchWave10'); },         get desc(){ return I18N.t('sfAchWave10Desc'); },         check: s => s.highestWave >= 10 },
  { id: 'sharpshooter',   icon: '\uD83C\uDFAF', get title(){ return I18N.t('sfAchSharpshooter'); },   get desc(){ return I18N.t('sfAchSharpshooterDesc'); },   check: s => s.totalKills >= 50 },
  { id: 'boss_slayer',    icon: '\uD83D\uDC80', get title(){ return I18N.t('sfAchBossSlayer'); },     get desc(){ return I18N.t('sfAchBossSlayerDesc'); },     check: s => s.bossesKilled >= 1 },
  { id: 'power_collector',icon: '\uD83D\uDCE6', get title(){ return I18N.t('sfAchPowerCollector'); }, get desc(){ return I18N.t('sfAchPowerCollectorDesc'); }, check: s => s.powerupsCollected >= 5 },
  { id: 'untouchable',    icon: '\uD83D\uDEE1\uFE0F', get title(){ return I18N.t('sfAchUntouchable'); },    get desc(){ return I18N.t('sfAchUntouchableDesc'); },    check: s => s.flawlessWaves >= 1 },
  { id: 'score1000',      icon: '\uD83C\uDFC6', get title(){ return I18N.t('sfAchScore1000'); },      get desc(){ return I18N.t('sfAchScore1000Desc'); },      check: s => s.bestScore >= 1000 },
  { id: 'combo_king',     icon: '\uD83D\uDD25', get title(){ return I18N.t('sfAchComboKing'); },      get desc(){ return I18N.t('sfAchComboKingDesc'); },      check: s => s.bestCombo >= 10 },
  { id: 'veteran',        icon: '\uD83C\uDFAE', get title(){ return I18N.t('sfAchVeteran'); },        get desc(){ return I18N.t('sfAchVeteranDesc'); },        check: s => s.gamesPlayed >= 10 },
];

let achStats = { totalKills: 0, highestWave: 1, bossesKilled: 0, powerupsCollected: 0, flawlessWaves: 0, bestScore: 0, bestCombo: 0, gamesPlayed: 0 };
let achUnlocked = new Set();
let achQueue = [];
let achTimer = 0;

function loadAch() {
  try {
    const s = JSON.parse(localStorage.getItem('starFuryAch') || '{}');
    if (s.unlocked) achUnlocked = new Set(s.unlocked);
    if (s.stats) Object.assign(achStats, s.stats);
  } catch (_) {}
}
function saveAch() {
  localStorage.setItem('starFuryAch', JSON.stringify({ unlocked: [...achUnlocked], stats: achStats }));
}
function checkAch() {
  for (const a of SF_ACHIEVEMENTS) {
    if (!achUnlocked.has(a.id) && a.check(achStats)) {
      achUnlocked.add(a.id);
      achQueue.push(a);
      Audio.achievement();
      saveAch();
    }
  }
}
function showAchPopup() {
  if (achTimer > 0 || achQueue.length === 0) return;
  const a = achQueue.shift();
  const popup = document.getElementById('achievementPopup');
  document.getElementById('achievementPopupIcon').textContent = a.icon;
  document.getElementById('achievementPopupTitle').textContent = a.title;
  document.getElementById('achievementPopupDesc').textContent = a.desc;
  popup.classList.add('show');
  achTimer = 3;
  setTimeout(() => { popup.classList.remove('show'); setTimeout(() => { achTimer = 0; showAchPopup(); }, 500); }, 3000);
}
function renderAchList() {
  const list = document.getElementById('achievementsList');
  list.innerHTML = '';
  for (const a of SF_ACHIEVEMENTS) {
    const el = document.createElement('div');
    el.className = 'achievement-item' + (achUnlocked.has(a.id) ? ' unlocked' : '');
    el.innerHTML = '<span class="achievement-item__icon">' + a.icon + '</span><span>' + a.title + '</span>';
    list.appendChild(el);
  }
}
document.getElementById('achievementsToggle').addEventListener('click', () => {
  document.getElementById('achievementsList').classList.toggle('open');
  renderAchList();
});
loadAch();

/* ══════════════════════════════════════════════════════════════════
   GAME STATE
   ══════════════════════════════════════════════════════════════════ */
const game = {
  state: 'title',  // title, playing, gameover
  score: 0,
  best: 0,
  wave: 1,
  lives: 3,
  bombs: 1,
  lastTime: 0,
  shakeTimer: 0,
  shakeIntensity: 0,
  flashTimer: 0,
  comboCount: 0,
  comboTimer: 0,
  comboMultiplier: 1,
  waveEnemiesTotal: 0,
  waveEnemiesSpawned: 0,
  waveEnemiesKilled: 0,
  waveSpawnTimer: 0,
  waveClearDelay: 0,
  waveHitsTaken: 0,
  bossActive: false,
  bossDefeated: false,
  titlePulse: 0,
  invincibleTimer: 0,
};

/* Player ship */
const player = {
  x: GAME_W / 2,
  y: GAME_H - 70,
  w: 28,
  h: 32,
  speed: 240,
  fireRate: 0.12,
  fireTimer: 0,
  spreadShot: false,
  rapidFire: false,
  shielded: false,
  powerTimer: 0,
  engineTrail: [],
};

/* Entity arrays (plain objects) */
let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let powerups = [];
let stars = [];  // parallax starfield
let nebulae = []; // background nebula patches
let titleDebris = []; // floating debris for title screen
let debrisBelt = []; // asteroid/debris belt between waves
let _frameTime = 0; // accumulated time for visual effects

/* Input state */
const keys = {};
let touchX = null;
let touchActive = false;

/* ══════════════════════════════════════════════════════════════════
   PARALLAX STARFIELD
   ══════════════════════════════════════════════════════════════════ */
function initStars() {
  stars = [];
  /* Color palettes for star variation */
  const starColors = [
    { r: 180, g: 220, b: 255 }, // cool blue-white
    { r: 200, g: 200, b: 255 }, // blue
    { r: 255, g: 240, b: 200 }, // warm yellow
    { r: 255, g: 220, b: 180 }, // warm orange
    { r: 255, g: 200, b: 220 }, // slight pink
    { r: 230, g: 230, b: 255 }, // pale blue
  ];
  for (let i = 0; i < 120; i++) {
    const col = starColors[Math.floor(Math.random() * starColors.length)];
    const layer = Math.floor(Math.random() * 3);
    stars.push({
      x: Math.random() * GAME_W,
      y: Math.random() * GAME_H,
      speed: 20 + Math.random() * 60,
      size: 0.5 + Math.random() * 1.5,
      layer: layer,
      alpha: 0.3 + Math.random() * 0.7,
      r: col.r, g: col.g, b: col.b,
      bright: layer === 2 && Math.random() < 0.12, // ~12% of near stars get diffraction cross
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 1.5 + Math.random() * 2.5,
    });
  }

  /* Nebula patches */
  nebulae = [];
  const nebulaColors = [
    { r: 40, g: 60, b: 140, a: 0.06 },
    { r: 120, g: 30, b: 80, a: 0.05 },
    { r: 20, g: 80, b: 100, a: 0.05 },
  ];
  for (let i = 0; i < 3; i++) {
    const nc = nebulaColors[i];
    nebulae.push({
      x: 40 + Math.random() * (GAME_W - 80),
      y: 60 + Math.random() * (GAME_H - 120),
      radius: 60 + Math.random() * 80,
      r: nc.r, g: nc.g, b: nc.b, a: nc.a,
    });
  }

  /* Title screen debris */
  titleDebris = [];
  for (let i = 0; i < 6; i++) {
    titleDebris.push({
      x: Math.random() * GAME_W,
      y: Math.random() * GAME_H,
      size: 3 + Math.random() * 6,
      speed: 8 + Math.random() * 20,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2,
      verts: 4 + Math.floor(Math.random() * 4),
    });
  }
}

function updateStars(dt) {
  for (const s of stars) {
    const layerSpeed = [0.3, 0.6, 1.0][s.layer];
    s.y += s.speed * layerSpeed * dt;
    if (s.y > GAME_H) {
      s.y = -2;
      s.x = Math.random() * GAME_W;
    }
    s.twinklePhase += s.twinkleSpeed * dt;
  }
}

function drawStars() {
  /* Draw nebulae first (behind stars) */
  for (const n of nebulae) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
    ng.addColorStop(0, `rgba(${n.r}, ${n.g}, ${n.b}, ${n.a})`);
    ng.addColorStop(1, `rgba(${n.r}, ${n.g}, ${n.b}, 0)`);
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Draw stars */
  for (const s of stars) {
    const brightness = [0.4, 0.6, 1.0][s.layer];
    const twinkle = 0.6 + Math.sin(s.twinklePhase) * 0.4;
    const a = s.alpha * brightness * twinkle;
    ctx.fillStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${a})`;
    ctx.fillRect(s.x - s.size * 0.5, s.y - s.size * 0.5, s.size, s.size);

    /* Diffraction cross for bright stars */
    if (s.bright) {
      const crossLen = s.size * 3 * twinkle;
      const ca = a * 0.5;
      ctx.strokeStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${ca})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(s.x - crossLen, s.y);
      ctx.lineTo(s.x + crossLen, s.y);
      ctx.moveTo(s.x, s.y - crossLen);
      ctx.lineTo(s.x, s.y + crossLen);
      ctx.stroke();
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   ASTEROID / DEBRIS BELT (between waves)
   ══════════════════════════════════════════════════════════════════ */
function spawnDebrisBelt() {
  debrisBelt = [];
  const count = 8 + Math.floor(Math.random() * 5); // 8-12 rocks
  const greyBrown = [
    '#5a5a5a', '#6b6b6b', '#7a6a55', '#8a7a60', '#6e6e6e',
    '#7c6c50', '#555555', '#8a8070',
  ];
  for (let i = 0; i < count; i++) {
    const numVerts = 5 + Math.floor(Math.random() * 4); // 5-8 points
    const verts = [];
    for (let v = 0; v < numVerts; v++) {
      const angle = (v / numVerts) * Math.PI * 2;
      const r = 0.6 + Math.random() * 0.4;
      verts.push({ angle: angle, r: r });
    }
    debrisBelt.push({
      x: GAME_W + 20 + Math.random() * GAME_W,
      y: 60 + Math.random() * (GAME_H - 120),
      size: 5 + Math.random() * 12,
      speed: 30 + Math.random() * 50,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.5,
      color: greyBrown[Math.floor(Math.random() * greyBrown.length)],
      verts: verts,
    });
  }
}

function updateDebrisBelt(dt) {
  for (let i = debrisBelt.length - 1; i >= 0; i--) {
    const d = debrisBelt[i];
    d.x -= d.speed * dt;
    d.rot += d.rotSpeed * dt;
    if (d.x < -30) debrisBelt.splice(i, 1);
  }
}

function drawDebrisBelt() {
  for (const d of debrisBelt) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    for (let vi = 0; vi < d.verts.length; vi++) {
      const v = d.verts[vi];
      const vx = Math.cos(v.angle) * d.size * v.r;
      const vy = Math.sin(v.angle) * d.size * v.r;
      if (vi === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    /* Highlight edge */
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.25)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════
   PLAYER
   ══════════════════════════════════════════════════════════════════ */
function updatePlayer(dt) {
  let dx = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
  if (keys['ArrowRight'] || keys['KeyD']) dx = 1;

  if (touchActive && touchX !== null) {
    const diff = touchX - player.x;
    if (Math.abs(diff) > 4) dx = diff > 0 ? 1 : -1;
  }

  player.x += dx * player.speed * dt;
  player.x = Math.max(player.w / 2, Math.min(GAME_W - player.w / 2, player.x));

  /* Auto-fire */
  player.fireTimer -= dt;
  if (player.fireTimer <= 0) {
    const rate = player.rapidFire ? player.fireRate * 0.5 : player.fireRate;
    player.fireTimer = rate;
    fireBullet();
  }

  /* Power-up timer */
  if (player.powerTimer > 0) {
    player.powerTimer -= dt;
    if (player.powerTimer <= 0) {
      player.spreadShot = false;
      player.rapidFire = false;
      player.shielded = false;
    }
  }

  /* Invincibility */
  if (game.invincibleTimer > 0) game.invincibleTimer -= dt;

  /* Engine trail */
  if (Math.random() < 0.7) {
    player.engineTrail.push({
      x: player.x + (Math.random() - 0.5) * 8,
      y: player.y + player.h / 2,
      life: 0.3,
      maxLife: 0.3,
      size: 2 + Math.random() * 3,
    });
  }
  for (let i = player.engineTrail.length - 1; i >= 0; i--) {
    player.engineTrail[i].life -= dt;
    player.engineTrail[i].y += 40 * dt;
    if (player.engineTrail[i].life <= 0) player.engineTrail.splice(i, 1);
  }
}

function fireBullet() {
  Audio.shoot();
  if (player.spreadShot) {
    for (let angle = -0.2; angle <= 0.2; angle += 0.2) {
      bullets.push({
        x: player.x + Math.sin(angle) * 8,
        y: player.y - player.h / 2,
        vx: Math.sin(angle) * 200,
        vy: -500,
        w: 3, h: 10,
      });
    }
  } else {
    bullets.push({
      x: player.x,
      y: player.y - player.h / 2,
      vx: 0, vy: -500,
      w: 3, h: 10,
    });
  }
}

function drawPlayer() {
  /* Engine trail */
  for (const t of player.engineTrail) {
    const a = t.life / t.maxLife;
    const tg = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.size * a);
    tg.addColorStop(0, `rgba(150, 220, 255, ${a * 0.7})`);
    tg.addColorStop(0.5, `rgba(0, 180, 255, ${a * 0.4})`);
    tg.addColorStop(1, `rgba(0, 100, 255, 0)`);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.size * a, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Shield effect — animated rotating ring with tick marks */
  if (player.shielded) {
    ctx.save();
    const shieldAngle = _frameTime * 1.5;
    const sr = 23;
    ctx.translate(player.x, player.y);
    ctx.rotate(shieldAngle);

    /* Outer ring */
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, sr, 0, Math.PI * 2);
    ctx.stroke();

    /* Tick marks */
    const ticks = 12;
    for (let i = 0; i < ticks; i++) {
      const ta = (i / ticks) * Math.PI * 2;
      const inner = sr - 3;
      const outer = sr + 2;
      ctx.strokeStyle = `rgba(0, 255, 200, ${0.3 + 0.3 * Math.sin(_frameTime * 4 + i)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ta) * inner, Math.sin(ta) * inner);
      ctx.lineTo(Math.cos(ta) * outer, Math.sin(ta) * outer);
      ctx.stroke();
    }

    /* Inner fill */
    ctx.fillStyle = 'rgba(0, 255, 200, 0.05)';
    ctx.beginPath();
    ctx.arc(0, 0, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Invincibility blink */
  if (game.invincibleTimer > 0 && Math.floor(game.invincibleTimer * 10) % 2 === 0) return;

  const px = player.x, py = player.y;

  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#00ccff';

  /* Main hull with gradient */
  const hullGrad = ctx.createLinearGradient(px - 14, py, px + 14, py);
  hullGrad.addColorStop(0, '#004466');
  hullGrad.addColorStop(0.3, '#0099dd');
  hullGrad.addColorStop(0.5, '#00ccff');
  hullGrad.addColorStop(0.7, '#0099dd');
  hullGrad.addColorStop(1, '#004466');
  ctx.fillStyle = hullGrad;
  ctx.beginPath();
  ctx.moveTo(px, py - 16);
  ctx.lineTo(px - 14, py + 14);
  ctx.lineTo(px - 4, py + 8);
  ctx.lineTo(px, py + 12);
  ctx.lineTo(px + 4, py + 8);
  ctx.lineTo(px + 14, py + 14);
  ctx.closePath();
  ctx.fill();

  /* Panel line details */
  ctx.strokeStyle = 'rgba(0, 60, 100, 0.6)';
  ctx.lineWidth = 0.5;
  /* Center spine */
  ctx.beginPath();
  ctx.moveTo(px, py - 14);
  ctx.lineTo(px, py + 10);
  ctx.stroke();
  /* Left panel line */
  ctx.beginPath();
  ctx.moveTo(px - 3, py - 8);
  ctx.lineTo(px - 10, py + 10);
  ctx.stroke();
  /* Right panel line */
  ctx.beginPath();
  ctx.moveTo(px + 3, py - 8);
  ctx.lineTo(px + 10, py + 10);
  ctx.stroke();

  /* Wing accents */
  ctx.fillStyle = '#005577';
  ctx.beginPath();
  ctx.moveTo(px - 14, py + 14);
  ctx.lineTo(px - 8, py + 4);
  ctx.lineTo(px - 4, py + 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px + 14, py + 14);
  ctx.lineTo(px + 8, py + 4);
  ctx.lineTo(px + 4, py + 8);
  ctx.closePath();
  ctx.fill();

  /* Cockpit — gradient from white center to cyan */
  const cockpitGrad = ctx.createLinearGradient(px, py - 10, px, py + 2);
  cockpitGrad.addColorStop(0, '#ffffff');
  cockpitGrad.addColorStop(0.4, '#aaeeff');
  cockpitGrad.addColorStop(1, '#00ccff');
  ctx.fillStyle = cockpitGrad;
  ctx.beginPath();
  ctx.moveTo(px, py - 10);
  ctx.lineTo(px - 5, py + 2);
  ctx.lineTo(px + 5, py + 2);
  ctx.closePath();
  ctx.fill();

  /* Two engine nacelles with individual flames */
  const flicker1 = 4 + Math.random() * 4;
  const flicker2 = 4 + Math.random() * 4;

  /* Left nacelle */
  const lnx = px - 9, lny = py + 12;
  ctx.fillStyle = '#006688';
  ctx.fillRect(lnx - 2.5, lny - 3, 5, 6);
  const lgf = ctx.createRadialGradient(lnx, lny + 3, 0, lnx, lny + 3, flicker1);
  lgf.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
  lgf.addColorStop(0.3, 'rgba(0, 180, 255, 0.7)');
  lgf.addColorStop(1, 'rgba(0, 100, 255, 0)');
  ctx.fillStyle = lgf;
  ctx.beginPath();
  ctx.arc(lnx, lny + 3, flicker1, 0, Math.PI * 2);
  ctx.fill();

  /* Right nacelle */
  const rnx = px + 9, rny = py + 12;
  ctx.fillStyle = '#006688';
  ctx.fillRect(rnx - 2.5, rny - 3, 5, 6);
  const rgf = ctx.createRadialGradient(rnx, rny + 3, 0, rnx, rny + 3, flicker2);
  rgf.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
  rgf.addColorStop(0.3, 'rgba(0, 180, 255, 0.7)');
  rgf.addColorStop(1, 'rgba(0, 100, 255, 0)');
  ctx.fillStyle = rgf;
  ctx.beginPath();
  ctx.arc(rnx, rny + 3, flicker2, 0, Math.PI * 2);
  ctx.fill();

  /* Wing-tip strobe lights */
  const strobeOn = Math.sin(_frameTime * 8) > 0.3;
  if (strobeOn) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(px - 13, py + 12, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 13, py + 12, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  /* === Weapon upgrade visuals === */

  /* spreadShot: Glowing wing-tip gun barrels (cyan dots at wing tips) */
  if (player.spreadShot) {
    const gwAlpha = 0.6 + Math.sin(_frameTime * 6) * 0.3;
    ctx.fillStyle = `rgba(0, 255, 255, ${gwAlpha})`;
    ctx.beginPath();
    ctx.arc(px - 14, py + 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 14, py + 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    /* Glow halos */
    const gwg1 = ctx.createRadialGradient(px - 14, py + 14, 0, px - 14, py + 14, 6);
    gwg1.addColorStop(0, `rgba(0, 255, 255, ${gwAlpha * 0.4})`);
    gwg1.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = gwg1;
    ctx.beginPath();
    ctx.arc(px - 14, py + 14, 6, 0, Math.PI * 2);
    ctx.fill();
    const gwg2 = ctx.createRadialGradient(px + 14, py + 14, 0, px + 14, py + 14, 6);
    gwg2.addColorStop(0, `rgba(0, 255, 255, ${gwAlpha * 0.4})`);
    gwg2.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = gwg2;
    ctx.beginPath();
    ctx.arc(px + 14, py + 14, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* rapidFire: Pulsing center barrel glow + double barrel lines */
  if (player.rapidFire) {
    const rfAlpha = 0.5 + Math.sin(_frameTime * 10) * 0.4;
    /* Double barrel lines */
    ctx.strokeStyle = `rgba(255, 200, 0, ${rfAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - 2, py - 16);
    ctx.lineTo(px - 2, py - 22);
    ctx.moveTo(px + 2, py - 16);
    ctx.lineTo(px + 2, py - 22);
    ctx.stroke();
    /* Pulsing center barrel glow */
    const rfg = ctx.createRadialGradient(px, py - 18, 0, px, py - 18, 5);
    rfg.addColorStop(0, `rgba(255, 220, 100, ${rfAlpha * 0.7})`);
    rfg.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = rfg;
    ctx.beginPath();
    ctx.arc(px, py - 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  /* bomb: Small red warning triangle on hull */
  if (game.bombs > 0) {
    const bwAlpha = 0.6 + Math.sin(_frameTime * 5) * 0.3;
    ctx.fillStyle = `rgba(255, 50, 50, ${bwAlpha})`;
    ctx.beginPath();
    ctx.moveTo(px, py + 2);
    ctx.lineTo(px - 3, py + 7);
    ctx.lineTo(px + 3, py + 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 100, 100, ${bwAlpha})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════════
   BULLETS
   ══════════════════════════════════════════════════════════════════ */
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -20 || b.y > GAME_H + 20 || b.x < -20 || b.x > GAME_W + 20) {
      bullets.splice(i, 1);
    }
  }
}

function drawBullets() {
  for (const b of bullets) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffcc';

    /* Trailing sparks (2-3 small dots fading behind) */
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    const dirX = speed > 0 ? b.vx / speed : 0;
    const dirY = speed > 0 ? b.vy / speed : 1;
    for (let si = 1; si <= 3; si++) {
      const sa = 0.3 - si * 0.08;
      const sx = b.x - dirX * si * 5 + (Math.random() - 0.5) * 1.5;
      const sy = b.y - dirY * si * 5 + (Math.random() - 0.5) * 1.5;
      ctx.fillStyle = `rgba(0, 255, 200, ${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Elongated diamond/lozenge shape */
    const hw = b.w * 0.7;
    const hh = b.h * 0.6;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - hh);       // top point
    ctx.lineTo(b.x + hw, b.y);       // right
    ctx.lineTo(b.x, b.y + hh);       // bottom
    ctx.lineTo(b.x - hw, b.y);       // left
    ctx.closePath();

    /* Bright white core fading to cyan outer */
    const bg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, hh);
    bg.addColorStop(0, 'rgba(255, 255, 255, 1)');
    bg.addColorStop(0.4, 'rgba(150, 255, 230, 0.9)');
    bg.addColorStop(1, 'rgba(0, 255, 200, 0.6)');
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════
   ENEMIES
   ══════════════════════════════════════════════════════════════════ */
function spawnEnemy(type, x) {
  const e = {
    type: type,  // 'basic', 'zigzag', 'swooper', 'boss'
    x: x || 20 + Math.random() * (GAME_W - 40),
    y: -30,
    w: type === 'boss' ? 60 : 24,
    h: type === 'boss' ? 50 : 24,
    hp: type === 'basic' ? 1 : type === 'zigzag' ? 2 : type === 'swooper' ? 2 : 30 + game.wave * 5,
    maxHp: 0,
    speed: type === 'basic' ? 100 : type === 'zigzag' ? 85 : type === 'swooper' ? 70 : 35,
    points: type === 'basic' ? 10 : type === 'zigzag' ? 20 : type === 'swooper' ? 30 : 200,
    phase: Math.random() * Math.PI * 2,
    swoopState: 'glide',  // for swooper: glide -> dive
    swoopTimer: 1.5 + Math.random(),
    fireTimer: type === 'boss' ? 0.5 : 99,
    startX: x || 0,
  };
  e.maxHp = e.hp;
  e.startX = e.x;
  enemies.push(e);
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.phase += dt * 3;

    if (e.type === 'basic') {
      e.y += e.speed * dt;
    } else if (e.type === 'zigzag') {
      e.y += e.speed * dt;
      e.x = e.startX + Math.sin(e.phase) * 40;
    } else if (e.type === 'swooper') {
      if (e.swoopState === 'glide') {
        e.y += e.speed * 0.6 * dt;
        e.x += Math.sin(e.phase * 0.5) * 30 * dt;
        e.swoopTimer -= dt;
        if (e.swoopTimer <= 0) {
          e.swoopState = 'dive';
          /* Aim at player */
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          e.diveVx = (dx / dist) * 200;
          e.diveVy = (dy / dist) * 200;
        }
      } else {
        e.x += (e.diveVx || 0) * dt;
        e.y += (e.diveVy || 100) * dt;
      }
    } else if (e.type === 'boss') {
      /* Boss moves side to side at top */
      if (e.y < 60) {
        e.y += 40 * dt;
      } else {
        e.x = GAME_W / 2 + Math.sin(e.phase * 0.5) * (GAME_W / 2 - 50);
      }
      /* Boss fires */
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = Math.max(0.3, 1.0 - game.wave * 0.03);
        /* Fire 3 bullets in spread */
        for (let a = -0.3; a <= 0.3; a += 0.3) {
          enemyBullets.push({
            x: e.x,
            y: e.y + e.h / 2,
            vx: Math.sin(a) * 100,
            vy: 180,
            size: 5,
          });
        }
      }
    }

    /* Remove if off-screen */
    if (e.y > GAME_H + 50 || e.x < -60 || e.x > GAME_W + 60) {
      enemies.splice(i, 1);
    }
  }
}

function drawEnemies() {
  for (const e of enemies) {
    ctx.save();

    if (e.type === 'boss') {
      /* ---- BOSS: detailed capital ship ---- */
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff3333';

      const bx = e.x, by = e.y;
      const hw = e.w / 2, hh = e.h / 2;

      /* Dark red base hull */
      const baseGrad = ctx.createLinearGradient(bx - hw, by, bx + hw, by);
      baseGrad.addColorStop(0, '#661111');
      baseGrad.addColorStop(0.5, '#aa2222');
      baseGrad.addColorStop(1, '#661111');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.moveTo(bx - hw, by + hh * 0.3);
      ctx.lineTo(bx - hw + 5, by - hh + 10);
      ctx.lineTo(bx + hw - 5, by - hh + 10);
      ctx.lineTo(bx + hw, by + hh * 0.3);
      ctx.lineTo(bx + hw - 8, by + hh);
      ctx.lineTo(bx - hw + 8, by + hh);
      ctx.closePath();
      ctx.fill();

      /* Lighter red upper deck */
      const upperGrad = ctx.createLinearGradient(bx, by - hh + 10, bx, by);
      upperGrad.addColorStop(0, '#cc3333');
      upperGrad.addColorStop(1, '#992222');
      ctx.fillStyle = upperGrad;
      ctx.beginPath();
      ctx.moveTo(bx - hw * 0.6, by - hh + 12);
      ctx.lineTo(bx + hw * 0.6, by - hh + 12);
      ctx.lineTo(bx + hw * 0.7, by - 2);
      ctx.lineTo(bx - hw * 0.7, by - 2);
      ctx.closePath();
      ctx.fill();

      /* Cockpit strip */
      const cockpitGrad = ctx.createLinearGradient(bx - 10, by - hh + 14, bx + 10, by - hh + 14);
      cockpitGrad.addColorStop(0, '#ff6644');
      cockpitGrad.addColorStop(0.5, '#ffaa66');
      cockpitGrad.addColorStop(1, '#ff6644');
      ctx.fillStyle = cockpitGrad;
      ctx.fillRect(bx - 10, by - hh + 14, 20, 5);

      /* Side turret protrusions */
      ctx.fillStyle = '#882222';
      ctx.fillRect(bx - hw - 4, by - 4, 8, 8);
      ctx.fillRect(bx + hw - 4, by - 4, 8, 8);
      ctx.fillStyle = '#cc4444';
      ctx.fillRect(bx - hw - 2, by - 2, 4, 4);
      ctx.fillRect(bx + hw, by - 2, 4, 4);

      /* Armor panel lines */
      ctx.strokeStyle = 'rgba(50, 10, 10, 0.5)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(bx, by - hh + 12);
      ctx.lineTo(bx, by + hh);
      ctx.moveTo(bx - hw * 0.3, by - hh + 15);
      ctx.lineTo(bx - hw * 0.4, by + hh - 5);
      ctx.moveTo(bx + hw * 0.3, by - hh + 15);
      ctx.lineTo(bx + hw * 0.4, by + hh - 5);
      ctx.moveTo(bx - hw + 10, by);
      ctx.lineTo(bx + hw - 10, by);
      ctx.stroke();

      /* Animated pulsing core/reactor glow */
      const coreSize = 6 + Math.sin(_frameTime * 5) * 2;
      const coreGrad = ctx.createRadialGradient(bx, by + 4, 0, bx, by + 4, coreSize);
      coreGrad.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
      coreGrad.addColorStop(0.5, 'rgba(255, 100, 30, 0.5)');
      coreGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(bx, by + 4, coreSize, 0, Math.PI * 2);
      ctx.fill();

      /* Multiple engine vents along bottom edge */
      const ventCount = 5;
      const ventSpacing = (hw * 2 - 20) / (ventCount - 1);
      for (let vi = 0; vi < ventCount; vi++) {
        const vx = bx - hw + 10 + vi * ventSpacing;
        const vy = by + hh;
        const vFlicker = 3 + Math.random() * 3;
        const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy + vFlicker, vFlicker);
        vg.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
        vg.addColorStop(0.5, 'rgba(255, 120, 30, 0.4)');
        vg.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = vg;
        ctx.beginPath();
        ctx.arc(vx, vy + vFlicker * 0.5, vFlicker, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Health bar with gradient fill and rounded ends */
      const barW = 54;
      const barH = 6;
      const barX = bx - barW / 2;
      const barY = by - hh - 14;
      const hpPct = e.hp / e.maxHp;
      const barR = barH / 2;

      /* Background */
      ctx.fillStyle = 'rgba(40, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.moveTo(barX + barR, barY);
      ctx.lineTo(barX + barW - barR, barY);
      ctx.arc(barX + barW - barR, barY + barR, barR, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(barX + barR, barY + barH);
      ctx.arc(barX + barR, barY + barR, barR, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();

      /* Fill with green->yellow->red gradient based on HP */
      if (hpPct > 0) {
        const fillW = barW * hpPct;
        const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        hpGrad.addColorStop(0, '#44ff44');
        hpGrad.addColorStop(0.5, '#ffcc00');
        hpGrad.addColorStop(1, '#ff3333');
        ctx.fillStyle = hpGrad;
        ctx.beginPath();
        ctx.moveTo(barX + barR, barY);
        ctx.lineTo(barX + Math.min(fillW, barW - barR), barY);
        if (fillW >= barW - barR) {
          ctx.arc(barX + barW - barR, barY + barR, barR, -Math.PI / 2, Math.PI / 2);
        } else {
          ctx.lineTo(barX + fillW, barY + barH);
        }
        ctx.lineTo(barX + barR, barY + barH);
        ctx.arc(barX + barR, barY + barR, barR, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.fill();
      }

      /* Bar border */
      ctx.strokeStyle = 'rgba(255, 120, 120, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(barX + barR, barY);
      ctx.lineTo(barX + barW - barR, barY);
      ctx.arc(barX + barW - barR, barY + barR, barR, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(barX + barR, barY + barH);
      ctx.arc(barX + barR, barY + barR, barR, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.stroke();

    } else if (e.type === 'zigzag') {
      /* ---- ZIGZAG: angular diamond/kite with swept wings ---- */
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffaa00';

      /* Main kite body with gradient */
      const zzGrad = ctx.createLinearGradient(e.x - 12, e.y, e.x + 12, e.y);
      zzGrad.addColorStop(0, '#cc7700');
      zzGrad.addColorStop(0.35, '#ffaa00');
      zzGrad.addColorStop(0.5, '#553300'); // dark center stripe
      zzGrad.addColorStop(0.65, '#ffaa00');
      zzGrad.addColorStop(1, '#cc7700');
      ctx.fillStyle = zzGrad;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 12);        // top
      ctx.lineTo(e.x - 14, e.y + 4);    // left wing
      ctx.lineTo(e.x - 8, e.y + 10);    // left swept
      ctx.lineTo(e.x, e.y + 6);         // bottom center
      ctx.lineTo(e.x + 8, e.y + 10);    // right swept
      ctx.lineTo(e.x + 14, e.y + 4);    // right wing
      ctx.closePath();
      ctx.fill();

      /* Yellow highlight top */
      const zzTop = ctx.createLinearGradient(e.x, e.y - 12, e.x, e.y);
      zzTop.addColorStop(0, 'rgba(255, 230, 100, 0.7)');
      zzTop.addColorStop(1, 'rgba(255, 200, 50, 0)');
      ctx.fillStyle = zzTop;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 12);
      ctx.lineTo(e.x - 6, e.y);
      ctx.lineTo(e.x + 6, e.y);
      ctx.closePath();
      ctx.fill();

      /* Rotating antenna on top */
      const antAngle = _frameTime * 6;
      const antLen = 4;
      ctx.strokeStyle = '#ffcc44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(antAngle) * antLen, e.y - 12 + Math.sin(antAngle) * antLen);
      ctx.lineTo(e.x - Math.cos(antAngle) * antLen, e.y - 12 - Math.sin(antAngle) * antLen);
      ctx.stroke();
      ctx.fillStyle = '#ffee88';
      ctx.beginPath();
      ctx.arc(e.x, e.y - 12, 1.5, 0, Math.PI * 2);
      ctx.fill();

      /* Engine exhaust glow (orange for zigzag) */
      const zzExR = 8 + Math.random() * 3;
      const zzExGlow = ctx.createRadialGradient(e.x, e.y + 12, 0, e.x, e.y + 12, zzExR);
      zzExGlow.addColorStop(0, 'rgba(255, 180, 50, 0.5)');
      zzExGlow.addColorStop(0.5, 'rgba(255, 120, 20, 0.25)');
      zzExGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = zzExGlow;
      ctx.beginPath();
      ctx.arc(e.x, e.y + 12, zzExR, 0, Math.PI * 2);
      ctx.fill();

    } else if (e.type === 'swooper') {
      /* ---- SWOOPER: sleek arrowhead/dart with curved wings ---- */
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#cc44ff';

      /* Purple energy wake when diving */
      if (e.swoopState === 'dive') {
        for (let wi = 1; wi <= 4; wi++) {
          const wa = 0.15 - wi * 0.03;
          ctx.fillStyle = `rgba(180, 60, 255, ${wa})`;
          ctx.beginPath();
          ctx.arc(
            e.x - (e.diveVx || 0) * wi * 0.012,
            e.y - (e.diveVy || 0) * wi * 0.012,
            4 + wi * 2, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }

      /* Main dart body with gradient */
      const swGrad = ctx.createLinearGradient(e.x - 14, e.y, e.x + 14, e.y);
      swGrad.addColorStop(0, '#7722aa');
      swGrad.addColorStop(0.3, '#cc44ff');
      swGrad.addColorStop(0.5, '#dd66ff'); // magenta highlight center
      swGrad.addColorStop(0.7, '#cc44ff');
      swGrad.addColorStop(1, '#7722aa');
      ctx.fillStyle = swGrad;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 12);
      /* Curved left wing */
      ctx.quadraticCurveTo(e.x - 8, e.y - 2, e.x - 15, e.y + 8);
      ctx.lineTo(e.x - 6, e.y + 5);
      ctx.lineTo(e.x, e.y + 8);
      ctx.lineTo(e.x + 6, e.y + 5);
      ctx.lineTo(e.x + 15, e.y + 8);
      /* Curved right wing */
      ctx.quadraticCurveTo(e.x + 8, e.y - 2, e.x, e.y - 12);
      ctx.closePath();
      ctx.fill();

      /* Magenta cockpit highlight */
      const swCockpit = ctx.createRadialGradient(e.x, e.y - 2, 0, e.x, e.y - 2, 5);
      swCockpit.addColorStop(0, 'rgba(255, 150, 255, 0.9)');
      swCockpit.addColorStop(1, 'rgba(200, 60, 255, 0)');
      ctx.fillStyle = swCockpit;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();

      /* Engine exhaust glow (purple for swooper) */
      if (e.swoopState === 'dive') {
        /* Longer directional trail when diving */
        const dvx = e.diveVx || 0;
        const dvy = e.diveVy || 100;
        const dspd = Math.sqrt(dvx * dvx + dvy * dvy) || 1;
        const ndx = -dvx / dspd;
        const ndy = -dvy / dspd;
        for (let ti = 1; ti <= 5; ti++) {
          const ta = 0.25 - ti * 0.04;
          const tr = 4 + ti * 1.5;
          ctx.fillStyle = `rgba(180, 60, 255, ${ta})`;
          ctx.beginPath();
          ctx.arc(e.x + ndx * ti * 6, e.y + ndy * ti * 6, tr, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const swExR = 7 + Math.random() * 3;
        const swExGlow = ctx.createRadialGradient(e.x, e.y + 10, 0, e.x, e.y + 10, swExR);
        swExGlow.addColorStop(0, 'rgba(180, 60, 255, 0.45)');
        swExGlow.addColorStop(0.5, 'rgba(140, 40, 200, 0.2)');
        swExGlow.addColorStop(1, 'rgba(100, 20, 180, 0)');
        ctx.fillStyle = swExGlow;
        ctx.beginPath();
        ctx.arc(e.x, e.y + 10, swExR, 0, Math.PI * 2);
        ctx.fill();
      }

    } else {
      /* ---- BASIC: saucer/disc with dome ---- */
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#44ff44';

      /* Saucer disc body with green gradient */
      const bsGrad = ctx.createRadialGradient(e.x, e.y + 2, 2, e.x, e.y + 2, 12);
      bsGrad.addColorStop(0, '#66dd44');
      bsGrad.addColorStop(0.6, '#33aa22');
      bsGrad.addColorStop(1, '#226611');
      ctx.fillStyle = bsGrad;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 3, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      /* Dome on top (lighter green) */
      const domeGrad = ctx.createRadialGradient(e.x - 1, e.y - 4, 0, e.x, e.y - 2, 7);
      domeGrad.addColorStop(0, '#bbffaa');
      domeGrad.addColorStop(0.6, '#88dd66');
      domeGrad.addColorStop(1, '#44aa22');
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 2, 6, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      /* Tiny red "eye" dot */
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.arc(e.x, e.y - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      /* Faint green engine glow beneath */
      const engGlow = ctx.createRadialGradient(e.x, e.y + 8, 0, e.x, e.y + 8, 6);
      engGlow.addColorStop(0, 'rgba(100, 255, 80, 0.4)');
      engGlow.addColorStop(1, 'rgba(50, 200, 40, 0)');
      ctx.fillStyle = engGlow;
      ctx.beginPath();
      ctx.arc(e.x, e.y + 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════
   ENEMY BULLETS
   ══════════════════════════════════════════════════════════════════ */
function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y > GAME_H + 20 || b.y < -20 || b.x < -20 || b.x > GAME_W + 20) {
      enemyBullets.splice(i, 1);
    }
  }
}

function drawEnemyBullets() {
  for (const b of enemyBullets) {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff4444';

    /* Radial gradient: white hot center to red outer */
    const ebg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size);
    ebg.addColorStop(0, 'rgba(255, 255, 240, 1)');
    ebg.addColorStop(0.3, 'rgba(255, 180, 80, 0.9)');
    ebg.addColorStop(0.7, 'rgba(255, 60, 30, 0.7)');
    ebg.addColorStop(1, 'rgba(200, 20, 20, 0.3)');
    ctx.fillStyle = ebg;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();

    /* Outer halo ring */
    ctx.strokeStyle = 'rgba(255, 80, 40, 0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════
   PARTICLES
   ══════════════════════════════════════════════════════════════════ */
function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 160;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.5,
      size: 1.5 + Math.random() * 3,
      color: color,
    });
  }
  /* Streak particles — elongated velocity-direction lines */
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 200;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2 + Math.random() * 0.35,
      maxLife: 0.4,
      size: 2 + Math.random() * 2,
      color: color,
      type: 'streak',
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    const sz = p.size * a;
    ctx.globalAlpha = a;

    /* Streak particles — elongated lines in velocity direction */
    if (p.type === 'streak') {
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
      const dirX = p.vx / spd;
      const dirY = p.vy / spd;
      const streakLen = sz * 4;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.5, sz * 0.4);
      ctx.beginPath();
      ctx.moveTo(p.x - dirX * streakLen * 0.5, p.y - dirY * streakLen * 0.5);
      ctx.lineTo(p.x + dirX * streakLen * 0.5, p.y + dirY * streakLen * 0.5);
      ctx.stroke();
      continue;
    }

    /* Alternate between circles and small rotated squares for variety */
    const useSquare = ((p.x * 7 + p.y * 13) | 0) % 3 === 0; // deterministic per-particle

    if (useSquare && sz > 1) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 5); // spin as it fades
      /* Brighter center */
      ctx.fillStyle = sz > 2 ? '#ffffff' : p.color;
      ctx.fillRect(-sz * 0.3, -sz * 0.3, sz * 0.6, sz * 0.6);
      ctx.fillStyle = p.color;
      ctx.fillRect(-sz * 0.5, -sz * 0.5, sz, sz);
      ctx.restore();
    } else {
      /* Circle with brighter center at larger sizes */
      if (sz > 2) {
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz);
        pg.addColorStop(0, '#ffffff');
        pg.addColorStop(0.4, p.color);
        pg.addColorStop(1, p.color);
        ctx.fillStyle = pg;
      } else {
        ctx.fillStyle = p.color;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/* ══════════════════════════════════════════════════════════════════
   POWER-UPS
   ══════════════════════════════════════════════════════════════════ */
function spawnPowerup(x, y) {
  if (Math.random() > 0.15) return;
  const types = ['shield', 'rapid', 'spread', 'bomb'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push({
    x: x,
    y: y,
    type: type,
    size: 10,
    speed: 50,
    pulse: 0,
  });
}

function updatePowerups(dt) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += p.speed * dt;
    p.pulse += dt * 4;
    if (p.y > GAME_H + 20) {
      powerups.splice(i, 1);
      continue;
    }

    /* Collision with player */
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      applyPowerup(p.type);
      Audio.powerup();
      spawnExplosion(p.x, p.y, '#ffffff', 8);
      achStats.powerupsCollected++;
      powerups.splice(i, 1);
    }
  }
}

function applyPowerup(type) {
  if (type === 'shield') {
    player.shielded = true;
    player.powerTimer = 8;
  } else if (type === 'rapid') {
    player.rapidFire = true;
    player.powerTimer = 6;
  } else if (type === 'spread') {
    player.spreadShot = true;
    player.powerTimer = 6;
  } else if (type === 'bomb') {
    game.bombs = Math.min(game.bombs + 1, 5);
  }
}

function drawPowerups() {
  for (const p of powerups) {
    const pulse = 1 + Math.sin(p.pulse) * 0.15;
    const r = p.size * pulse;

    ctx.save();
    ctx.translate(p.x, p.y);

    const colors = {
      shield: '#00ffcc',
      rapid: '#ffcc00',
      spread: '#ff44ff',
      bomb: '#ff4444',
    };
    const col = colors[p.type] || '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = col;

    /* Outer ring */
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.stroke();

    /* Rotating sparkle particles (2-3 tiny dots orbiting) */
    for (let si = 0; si < 3; si++) {
      const sparkAngle = p.pulse * 2 + si * (Math.PI * 2 / 3);
      const sparkR = r + 4;
      const sx = Math.cos(sparkAngle) * sparkR;
      const sy = Math.sin(sparkAngle) * sparkR;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Graphical icon shapes with gradient fill */
    if (p.type === 'shield') {
      /* Shield shape: flat top, pointed bottom */
      const sg = ctx.createLinearGradient(0, -6, 0, 7);
      sg.addColorStop(0, '#88ffee');
      sg.addColorStop(1, '#00aa88');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-6, -5);
      ctx.lineTo(6, -5);
      ctx.lineTo(6, 1);
      ctx.lineTo(0, 7);
      ctx.lineTo(-6, 1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else if (p.type === 'rapid') {
      /* Lightning bolt shape */
      const lg = ctx.createLinearGradient(-3, -7, 3, 7);
      lg.addColorStop(0, '#ffee66');
      lg.addColorStop(1, '#cc9900');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(1, -7);
      ctx.lineTo(-2, -1);
      ctx.lineTo(2, -1);
      ctx.lineTo(-1, 7);
      ctx.lineTo(3, 0);
      ctx.lineTo(-1, 0);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'spread') {
      /* Three-arrow fan shape */
      const fg = ctx.createLinearGradient(0, -6, 0, 4);
      fg.addColorStop(0, '#ff88ff');
      fg.addColorStop(1, '#aa22aa');
      ctx.fillStyle = fg;
      /* Center arrow */
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(-2, -2); ctx.lineTo(2, -2); ctx.closePath();
      ctx.fill();
      /* Left arrow */
      ctx.beginPath();
      ctx.moveTo(-5, -4); ctx.lineTo(-5, 1); ctx.lineTo(-2, -1); ctx.closePath();
      ctx.fill();
      /* Right arrow */
      ctx.beginPath();
      ctx.moveTo(5, -4); ctx.lineTo(5, 1); ctx.lineTo(2, -1); ctx.closePath();
      ctx.fill();
      /* Stems */
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -2); ctx.lineTo(0, 5);
      ctx.moveTo(-5, 1); ctx.lineTo(-3, 5);
      ctx.moveTo(5, 1); ctx.lineTo(3, 5);
      ctx.stroke();
    } else if (p.type === 'bomb') {
      /* Circle with small fuse on top */
      const bg = ctx.createRadialGradient(0, 1, 0, 0, 1, 5);
      bg.addColorStop(0, '#ff8866');
      bg.addColorStop(1, '#aa2222');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(0, 1, 5, 0, Math.PI * 2);
      ctx.fill();
      /* Fuse */
      ctx.strokeStyle = '#cc8844';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(3, -7, 2, -9);
      ctx.stroke();
      /* Fuse spark */
      const sparkA = 0.5 + Math.sin(p.pulse * 3) * 0.5;
      ctx.fillStyle = `rgba(255, 255, 100, ${sparkA})`;
      ctx.beginPath();
      ctx.arc(2, -9, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════
   BOMB
   ══════════════════════════════════════════════════════════════════ */
function useBomb() {
  if (game.bombs <= 0) return;
  game.bombs--;
  Audio.bomb();

  /* Kill all enemies on screen */
  for (const e of enemies) {
    addScore(e.points);
    spawnExplosion(e.x, e.y, '#ffffff', 12);
    spawnPowerup(e.x, e.y);
    achStats.totalKills++;
    game.waveEnemiesKilled++;
  }
  enemies.length = 0;
  enemyBullets.length = 0;

  /* Screen flash */
  game.flashTimer = 0.3;
  game.shakeTimer = 0.3;
  game.shakeIntensity = 8;
}

/* ══════════════════════════════════════════════════════════════════
   COLLISION DETECTION (AABB)
   ══════════════════════════════════════════════════════════════════ */
function checkCollisions() {
  /* Bullets vs Enemies */
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (aabb(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h,
               e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
        bullets.splice(bi, 1);
        e.hp--;

        /* Hit particles */
        spawnExplosion(b.x, b.y, '#00ffcc', 3);

        if (e.hp > 0) Audio.enemyHit();
        if (e.hp <= 0) {
          /* Enemy killed */
          if (e.type === 'boss') Audio.bossExplode(); else Audio.enemyExplode();
          addScore(e.points);
          updateCombo();
          spawnExplosion(e.x, e.y, e.type === 'boss' ? '#ff4444' : '#ffaa00', e.type === 'boss' ? 30 : 12);
          spawnPowerup(e.x, e.y);

          achStats.totalKills++;
          game.waveEnemiesKilled++;

          if (e.type === 'boss') {
            achStats.bossesKilled++;
            game.bossDefeated = true;
            game.shakeTimer = 0.5;
            game.shakeIntensity = 12;
            game.flashTimer = 0.2;
          }

          enemies.splice(ei, 1);
        }
        break;
      }
    }
  }

  /* Enemy bullets vs Player */
  if (game.invincibleTimer <= 0) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      if (Math.abs(dx) < player.w / 2 + b.size && Math.abs(dy) < player.h / 2 + b.size) {
        if (player.shielded) {
          player.shielded = false;
          player.powerTimer = 0;
          Audio.shieldBreak();
          spawnExplosion(b.x, b.y, '#00ffcc', 8);
          /* Shield impact sparks — 15 cyan sparks bursting from impact direction */
          const impDx = b.x - player.x;
          const impDy = b.y - player.y;
          const impAngle = Math.atan2(impDy, impDx);
          for (let si = 0; si < 15; si++) {
            const sa = impAngle + (Math.random() - 0.5) * 1.2;
            const ss = 80 + Math.random() * 180;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss,
              life: 0.2 + Math.random() * 0.3, maxLife: 0.4, size: 1 + Math.random() * 1.5, color: '#00ffff' });
          }
          enemyBullets.splice(i, 1);
        } else {
          hitPlayer();
          enemyBullets.splice(i, 1);
        }
      }
    }
  }

  /* Enemies vs Player (body collision) */
  if (game.invincibleTimer <= 0) {
    for (const e of enemies) {
      if (aabb(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h,
               e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
        if (player.shielded) {
          player.shielded = false;
          player.powerTimer = 0;
          Audio.shieldBreak();
          spawnExplosion(player.x, player.y, '#00ffcc', 10);
          /* Shield impact sparks — 15 cyan sparks for body collision */
          const impAngle2 = Math.atan2(e.y - player.y, e.x - player.x);
          for (let si = 0; si < 15; si++) {
            const sa = impAngle2 + (Math.random() - 0.5) * 1.2;
            const ss = 80 + Math.random() * 180;
            particles.push({ x: player.x, y: player.y, vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss,
              life: 0.2 + Math.random() * 0.3, maxLife: 0.4, size: 1 + Math.random() * 1.5, color: '#00ffff' });
          }
        } else {
          hitPlayer();
        }
        break;
      }
    }
  }

  /* Powerups collision handled in updatePowerups */
}

function aabb(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function hitPlayer() {
  Audio.playerHit();
  game.lives--;
  game.waveHitsTaken++;
  game.shakeTimer = 0.4;
  game.shakeIntensity = 10;
  game.flashTimer = 0.15;
  game.invincibleTimer = 2.0;
  game.comboCount = 0;
  game.comboMultiplier = 1;
  spawnExplosion(player.x, player.y, '#ff4444', 15);

  if (game.lives <= 0) {
    gameOver();
  }
}

/* ══════════════════════════════════════════════════════════════════
   SCORE & COMBO
   ══════════════════════════════════════════════════════════════════ */
function addScore(pts) {
  game.score += pts * game.comboMultiplier;
  scoreLabel.textContent = game.score;
}

function updateCombo() {
  game.comboCount++;
  game.comboTimer = 2.0;  // 2 second decay
  game.comboMultiplier = Math.min(10, 1 + Math.floor(game.comboCount / 2));
  if (game.comboCount > achStats.bestCombo) achStats.bestCombo = game.comboCount;
  Audio.comboUp(game.comboCount);
}

function updateComboTimer(dt) {
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) {
      game.comboCount = 0;
      game.comboMultiplier = 1;
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   WAVE SYSTEM
   ══════════════════════════════════════════════════════════════════ */
function startWave() {
  const isBossWave = game.wave % 5 === 0;
  game.bossActive = isBossWave;
  game.bossDefeated = false;
  game.waveHitsTaken = 0;

  if (isBossWave) {
    Audio.bossWarn();
    game.waveEnemiesTotal = 1;
    game.waveEnemiesSpawned = 0;
    game.waveEnemiesKilled = 0;
    game.waveSpawnTimer = 1.0;
  } else {
    game.waveEnemiesTotal = 8 + game.wave * 3;
    game.waveEnemiesSpawned = 0;
    game.waveEnemiesKilled = 0;
    game.waveSpawnTimer = 0;
  }
  game.waveClearDelay = 0;
  debrisBelt = [];
  waveDisplay.textContent = game.wave;
}

function updateWaveSystem(dt) {
  const isBossWave = game.wave % 5 === 0;

  /* Spawn enemies */
  if (game.waveEnemiesSpawned < game.waveEnemiesTotal) {
    game.waveSpawnTimer -= dt;
    if (game.waveSpawnTimer <= 0) {
      if (isBossWave) {
        spawnEnemy('boss', GAME_W / 2);
      } else {
        /* Pick enemy type based on wave */
        const roll = Math.random();
        let type = 'basic';
        if (game.wave >= 2 && roll < 0.3) type = 'zigzag';
        if (game.wave >= 3 && roll < 0.15) type = 'swooper';
        if (game.wave >= 5 && roll < 0.25) type = 'swooper';
        spawnEnemy(type);
      }
      game.waveEnemiesSpawned++;
      /* Spawn interval decreases with wave */
      game.waveSpawnTimer = Math.max(0.25, 0.85 - game.wave * 0.04);
    }
  }

  /* Check wave completion */
  const allSpawned = game.waveEnemiesSpawned >= game.waveEnemiesTotal;
  const allCleared = enemies.length === 0 && allSpawned;

  if (allCleared && game.waveEnemiesKilled > 0) {
    if (game.waveClearDelay === 0 && debrisBelt.length === 0) spawnDebrisBelt();
    game.waveClearDelay += dt;
    updateDebrisBelt(dt);
    if (game.waveClearDelay > 1.5) {
      Audio.waveClear();
      /* Check flawless */
      if (game.waveHitsTaken === 0) {
        achStats.flawlessWaves++;
      }

      if (game.wave > achStats.highestWave) achStats.highestWave = game.wave;
      game.wave++;
      startWave();
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   GAME OVER
   ══════════════════════════════════════════════════════════════════ */
function gameOver() {
  game.state = 'gameover';
  const isNewBest = game.score > game.best;
  saveBestScore();
  achStats.gamesPlayed++;
  if (game.score > achStats.bestScore) achStats.bestScore = game.score;
  if (game.wave > achStats.highestWave) achStats.highestWave = game.wave;
  saveAch();
  checkAch();
  showAchPopup();
  Audio.gameOver();
  Audio.stopDrone();
  if (isNewBest && game.score > 0) setTimeout(() => Audio.newHighScore(), 1200);
  if (typeof Leaderboard !== 'undefined') Leaderboard.submitScore('star-fury', game.score);
  if (typeof Arcade !== 'undefined') {
    Arcade.onGameOver('star-fury', game.score);
    document.body.appendChild(Arcade.createScoreCard('star-fury', game.score, achStats.bestScore||0));
  }
}

/* ══════════════════════════════════════════════════════════════════
   RESET / START
   ══════════════════════════════════════════════════════════════════ */
function resetGame() {
  game.score = 0;
  game.wave = 1;
  game.lives = 3;
  game.bombs = 1;
  game.comboCount = 0;
  game.comboTimer = 0;
  game.comboMultiplier = 1;
  game.shakeTimer = 0;
  game.flashTimer = 0;
  game.invincibleTimer = 0;
  game.bossActive = false;
  game.bossDefeated = false;

  player.x = GAME_W / 2;
  player.y = GAME_H - 70;
  player.fireTimer = 0;
  player.spreadShot = false;
  player.rapidFire = false;
  player.shielded = false;
  player.powerTimer = 0;
  player.engineTrail = [];

  bullets = [];
  enemies = [];
  enemyBullets = [];
  particles = [];
  powerups = [];

  scoreLabel.textContent = '0';
  waveDisplay.textContent = '1';
}

function startGame() {
  resetGame();
  game.state = 'playing';
  Audio.resume();
  Audio.startDrone();
  startWave();
}

/* ══════════════════════════════════════════════════════════════════
   BEST SCORE
   ══════════════════════════════════════════════════════════════════ */
function loadBestScore() {
  const stored = Number(localStorage.getItem('starFuryBest'));
  if (!Number.isNaN(stored)) {
    game.best = stored;
    bestScoreLabel.textContent = game.best;
  }
}
function saveBestScore() {
  game.wasNewBest = false;
  if (game.score > game.best) {
    game.wasNewBest = true;
    game.best = game.score;
    bestScoreLabel.textContent = game.best;
    localStorage.setItem('starFuryBest', String(game.best));
  }
}

/* ══════════════════════════════════════════════════════════════════
   SCREEN SHAKE & EFFECTS
   ══════════════════════════════════════════════════════════════════ */
function updateEffects(dt) {
  if (game.shakeTimer > 0) game.shakeTimer -= dt;
  if (game.flashTimer > 0) game.flashTimer -= dt;
}

/* ══════════════════════════════════════════════════════════════════
   DRAW HUD (on canvas)
   ══════════════════════════════════════════════════════════════════ */
function drawHUD() {
  /* Lives — draw small heart shapes */
  for (let i = 0; i < game.lives; i++) {
    const hx = 14 + i * 16;
    const hy = 12;
    ctx.save();
    ctx.fillStyle = '#ff3355';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ff3355';
    ctx.beginPath();
    ctx.moveTo(hx, hy + 3);
    ctx.bezierCurveTo(hx, hy, hx - 5, hy - 2, hx - 5, hy + 1);
    ctx.bezierCurveTo(hx - 5, hy + 4, hx, hy + 7, hx, hy + 8);
    ctx.bezierCurveTo(hx, hy + 7, hx + 5, hy + 4, hx + 5, hy + 1);
    ctx.bezierCurveTo(hx + 5, hy - 2, hx, hy, hx, hy + 3);
    ctx.fill();
    ctx.restore();
  }

  /* Bombs — draw small bomb icon shapes */
  for (let i = 0; i < game.bombs; i++) {
    const bx = GAME_W - 14 - i * 16;
    const by = 14;
    ctx.save();
    ctx.fillStyle = '#ff5544';
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#ff4444';
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
    /* Fuse */
    ctx.strokeStyle = '#cc8844';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 1, by - 4.5);
    ctx.quadraticCurveTo(bx + 4, by - 7, bx + 3, by - 9);
    ctx.stroke();
    /* Spark */
    ctx.fillStyle = '#ffee66';
    ctx.beginPath();
    ctx.arc(bx + 3, by - 9, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Combo counter with background pill */
  if (game.comboCount > 1) {
    ctx.save();
    const comboText = game.comboCount + 'x COMBO';
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(comboText).width;
    const pillW = tw + 16;
    const pillH = 20;
    const pillX = GAME_W / 2 - pillW / 2;
    const pillY = 20;
    const pillR = pillH / 2;

    /* Background pill */
    ctx.fillStyle = 'rgba(80, 60, 0, 0.4)';
    ctx.beginPath();
    ctx.moveTo(pillX + pillR, pillY);
    ctx.lineTo(pillX + pillW - pillR, pillY);
    ctx.arc(pillX + pillW - pillR, pillY + pillR, pillR, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(pillX + pillR, pillY + pillH);
    ctx.arc(pillX + pillR, pillY + pillR, pillR, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffcc00';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffcc00';
    ctx.fillText(comboText, GAME_W / 2, pillY + pillR);
    ctx.restore();
  }

  /* Boss warning: pulsing red vignette at screen edges */
  if (game.bossActive && !game.bossDefeated) {
    ctx.save();
    const vigAlpha = 0.08 + Math.sin(_frameTime * 4) * 0.06;

    /* Top edge */
    const vigTop = ctx.createLinearGradient(0, 0, 0, 60);
    vigTop.addColorStop(0, `rgba(255, 0, 0, ${vigAlpha})`);
    vigTop.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = vigTop;
    ctx.fillRect(0, 0, GAME_W, 60);

    /* Bottom edge */
    const vigBot = ctx.createLinearGradient(0, GAME_H - 60, 0, GAME_H);
    vigBot.addColorStop(0, 'rgba(255, 0, 0, 0)');
    vigBot.addColorStop(1, `rgba(255, 0, 0, ${vigAlpha})`);
    ctx.fillStyle = vigBot;
    ctx.fillRect(0, GAME_H - 60, GAME_W, 60);

    /* Left edge */
    const vigLeft = ctx.createLinearGradient(0, 0, 40, 0);
    vigLeft.addColorStop(0, `rgba(255, 0, 0, ${vigAlpha})`);
    vigLeft.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = vigLeft;
    ctx.fillRect(0, 0, 40, GAME_H);

    /* Right edge */
    const vigRight = ctx.createLinearGradient(GAME_W - 40, 0, GAME_W, 0);
    vigRight.addColorStop(0, 'rgba(255, 0, 0, 0)');
    vigRight.addColorStop(1, `rgba(255, 0, 0, ${vigAlpha})`);
    ctx.fillStyle = vigRight;
    ctx.fillRect(GAME_W - 40, 0, 40, GAME_H);

    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff3333';
    ctx.fillText('!! BOSS !!', GAME_W / 2, 48);
    ctx.restore();
  }

  /* Power-up active indicator */
  if (player.powerTimer > 0) {
    ctx.fillStyle = player.shielded ? '#00ffcc' : player.rapidFire ? '#ffcc00' : '#ff44ff';
    ctx.font = '11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const label = player.shielded ? 'SHIELD' : player.rapidFire ? 'RAPID FIRE' : 'SPREAD';
    ctx.fillText(label + ' ' + Math.ceil(player.powerTimer) + 's', 8, 26);
  }
}

/* ══════════════════════════════════════════════════════════════════
   TITLE SCREEN
   ══════════════════════════════════════════════════════════════════ */
function drawTitleScreen(titleDt) {
  game.titlePulse += 0.02;

  /* Background starfield already drawn */

  /* Animated floating debris/asteroid silhouettes */
  ctx.save();
  for (const d of titleDebris) {
    d.y += d.speed * titleDt;
    d.rot += d.rotSpeed * titleDt;
    if (d.y > GAME_H + 20) { d.y = -20; d.x = Math.random() * GAME_W; }
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = 'rgba(30, 30, 50, 0.6)';
    ctx.beginPath();
    for (let vi = 0; vi < d.verts; vi++) {
      const angle = (vi / d.verts) * Math.PI * 2;
      const vr = d.size * (0.7 + 0.3 * Math.sin(vi * 2.5));
      if (vi === 0) ctx.moveTo(Math.cos(angle) * vr, Math.sin(angle) * vr);
      else ctx.lineTo(Math.cos(angle) * vr, Math.sin(angle) * vr);
    }
    ctx.closePath();
    ctx.fill();
    /* Slight highlight edge */
    ctx.strokeStyle = 'rgba(60, 60, 90, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  /* Title */
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#00ccff';
  ctx.fillStyle = '#00ccff';
  ctx.font = 'bold 36px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(I18N.t('sfTitle'), GAME_W / 2, GAME_H * 0.3);
  ctx.restore();

  /* Subtitle */
  ctx.fillStyle = '#6688aa';
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(I18N.t('sfSubtitle'), GAME_W / 2, GAME_H * 0.3 + 35);

  /* Decorative ship with engine flame animation */
  const shipY = GAME_H * 0.52 + Math.sin(game.titlePulse * 2) * 8;
  ctx.save();
  ctx.translate(GAME_W / 2, shipY);
  ctx.scale(1.5, 1.5);
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00ccff';

  /* Hull gradient */
  const tsHull = ctx.createLinearGradient(-14, 0, 14, 0);
  tsHull.addColorStop(0, '#004466');
  tsHull.addColorStop(0.5, '#00ccff');
  tsHull.addColorStop(1, '#004466');
  ctx.fillStyle = tsHull;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(-14, 14);
  ctx.lineTo(-4, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(4, 8);
  ctx.lineTo(14, 14);
  ctx.closePath();
  ctx.fill();

  /* Cockpit gradient */
  const tsCockpit = ctx.createLinearGradient(0, -10, 0, 2);
  tsCockpit.addColorStop(0, '#ffffff');
  tsCockpit.addColorStop(1, '#00ccff');
  ctx.fillStyle = tsCockpit;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-5, 2);
  ctx.lineTo(5, 2);
  ctx.closePath();
  ctx.fill();

  /* Animated engine flames */
  const tsFlicker = 5 + Math.sin(game.titlePulse * 15) * 3 + Math.random() * 2;
  const tsFlame = ctx.createRadialGradient(0, 16, 0, 0, 16, tsFlicker);
  tsFlame.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
  tsFlame.addColorStop(0.3, 'rgba(0, 180, 255, 0.6)');
  tsFlame.addColorStop(1, 'rgba(0, 100, 255, 0)');
  ctx.fillStyle = tsFlame;
  ctx.beginPath();
  ctx.arc(0, 16, tsFlicker, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  /* Subtle scan-line overlay effect */
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let sy = 0; sy < GAME_H; sy += 3) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, sy, GAME_W, 1);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  /* Start prompt */
  const alpha = 0.5 + Math.sin(game.titlePulse * 3) * 0.3;
  ctx.fillStyle = `rgba(180, 220, 255, ${alpha})`;
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(I18N.t('sfTapToStart'), GAME_W / 2, GAME_H * 0.75);

  /* Controls hint */
  ctx.fillStyle = 'rgba(120, 150, 180, 0.6)';
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillText(I18N.t('sfControlsHint'), GAME_W / 2, GAME_H * 0.82);
}

/* ══════════════════════════════════════════════════════════════════
   GAME OVER SCREEN
   ══════════════════════════════════════════════════════════════════ */
function drawGameOverScreen() {
  /* Dim overlay */
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ff4444';
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 32px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(I18N.t('gameOver'), GAME_W / 2, GAME_H * 0.3);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(I18N.t('score') + ': ' + game.score, GAME_W / 2, GAME_H * 0.4);

  ctx.fillStyle = '#ffcc00';
  ctx.fillText(I18N.t('best') + ': ' + game.best, GAME_W / 2, GAME_H * 0.46);

  ctx.fillStyle = '#aabbcc';
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText(I18N.t('sfWave') + ': ' + game.wave, GAME_W / 2, GAME_H * 0.52);

  if (game.wasNewBest && game.score > 0) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffcc00';
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillText(I18N.t('newBest'), GAME_W / 2, GAME_H * 0.58);
    ctx.restore();
  }

  const alpha = 0.5 + Math.sin(Date.now() / 300) * 0.3;
  ctx.fillStyle = `rgba(180, 220, 255, ${alpha})`;
  ctx.font = '12px "Trebuchet MS", sans-serif';
  ctx.fillText(I18N.t('sfTapRestart'), GAME_W / 2, GAME_H * 0.7);
}

/* ══════════════════════════════════════════════════════════════════
   MAIN DRAW
   ══════════════════════════════════════════════════════════════════ */
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scaleX = canvas.width / GAME_W;
  const scaleY = canvas.height / GAME_H;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  ctx.save();

  /* Screen shake */
  if (game.shakeTimer > 0) {
    const intensity = game.shakeIntensity * (game.shakeTimer / 0.5);
    ctx.translate(
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity
    );
  }

  /* Background with blue-purple variation */
  const bg = ctx.createLinearGradient(0, 0, 0, GAME_H);
  bg.addColorStop(0, '#050512');
  bg.addColorStop(0.3, '#080820');
  bg.addColorStop(0.6, '#0a0a28');
  bg.addColorStop(1, '#06061a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  drawStars();

  /* Draw debris belt between waves */
  if (debrisBelt.length > 0) drawDebrisBelt();

  if (game.state === 'title') {
    drawTitleScreen(dt);
  } else if (game.state === 'playing') {
    drawPowerups();
    drawEnemyBullets();
    drawBullets();
    drawEnemies();
    drawPlayer();
    drawParticles();
    drawHUD();

    /* Wave clear text */
    if (game.waveClearDelay > 0 && game.waveClearDelay < 1.5) {
      ctx.save();
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ccff';
      ctx.fillText(I18N.t('sfWaveClear') + '!', GAME_W / 2, GAME_H * 0.4);
      ctx.restore();
    }
  } else if (game.state === 'gameover') {
    drawPowerups();
    drawBullets();
    drawEnemies();
    drawParticles();
    drawGameOverScreen();
  }

  /* Damage flash */
  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 50, 50, ${game.flashTimer * 1.5})`;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }

  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* ══════════════════════════════════════════════════════════════════
   GAME LOOP
   ══════════════════════════════════════════════════════════════════ */
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (!game.lastTime) { game.lastTime = timestamp; return; }
  const dt = Math.min((timestamp - game.lastTime) / 1000, 0.05);
  game.lastTime = timestamp;
  _frameTime += dt;

  if (game.state === 'title') {
    game.titlePulse += dt;
    updateStars(dt);
  } else if (game.state === 'playing') {
    updateStars(dt);
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateEnemyBullets(dt);
    updateParticles(dt);
    updatePowerups(dt);
    updateComboTimer(dt);
    updateWaveSystem(dt);
    updateEffects(dt);
    checkCollisions();
    checkAch();
    showAchPopup();
  } else if (game.state === 'gameover') {
    updateStars(dt);
    updateParticles(dt);
  }

  draw();
}

/* ══════════════════════════════════════════════════════════════════
   INPUT HANDLING
   ══════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if (e.code === 'KeyF') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }

  if (game.state === 'title') {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      startGame();
    }
  } else if (game.state === 'playing') {
    if (e.code === 'Space') {
      e.preventDefault();
      useBomb();
    }
  } else if (game.state === 'gameover') {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      startGame();
    }
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

/* Touch controls */
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const sx = (touch.clientX - rect.left) / rect.width * GAME_W;
  const sy = (touch.clientY - rect.top) / rect.height * GAME_H;

  if (game.state === 'title') {
    startGame();
    return;
  }
  if (game.state === 'gameover') {
    startGame();
    return;
  }

  touchActive = true;
  touchX = sx;

  /* Tap top area for bomb */
  if (sy < GAME_H * 0.15) {
    useBomb();
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (game.state !== 'playing') return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  touchX = (touch.clientX - rect.left) / rect.width * GAME_W;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  touchActive = false;
  touchX = null;
}, { passive: false });

/* Mouse click for start/restart */
canvas.addEventListener('click', (e) => {
  if (game.state === 'title') startGame();
  else if (game.state === 'gameover') startGame();
});

/* Restart button */
restartButton.addEventListener('click', () => {
  startGame();
});
document.addEventListener('arcade-restart', () => { startGame(); });

/* ══════════════════════════════════════════════════════════════════
   CANVAS SIZING (DPI-aware)
   ══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   FULLSCREEN
   ══════════════════════════════════════════════════════════════════ */
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

  canvas.style.width = Math.floor(canvasW) + 'px';
  canvas.style.height = Math.floor(canvasH) + 'px';
}

window.addEventListener('resize', () => { requestAnimationFrame(() => updateCanvasSize()); });
window.addEventListener('orientationchange', () => { setTimeout(() => updateCanvasSize(), 200); });

/* ══════════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════════ */
Audio.init();
const muteBtn = document.getElementById('muteBtn');
if (muteBtn) {
  muteBtn.textContent = Audio.isMuted() ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  muteBtn.addEventListener('click', () => {
    const m = Audio.toggle();
    muteBtn.textContent = m ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  });
}

initStars();
loadBestScore();
updateCanvasSize();

/* Leaderboard integration */
if (typeof Leaderboard !== 'undefined') {
  const lbPanel = document.getElementById('leaderboardPanel');
  lbPanel.appendChild(Leaderboard.createPanel('star-fury'));
  const lbToggleBtn = document.getElementById('leaderboardToggle');
  if (lbToggleBtn) {
    lbToggleBtn.addEventListener('click', () => { lbPanel.classList.toggle('lb-visible'); });
  }
}

requestAnimationFrame(gameLoop);

// ── Ko-fi Shop ──
if (typeof Shop !== 'undefined') {
  Shop.init({
    gameId: 'star-fury',
    buttonTarget: '#shopBtn',
    bundles: [
      { id: 'furypremium', name: 'Fury Premium', desc: 'Inferno & Void visual themes', price: '~$1',
        kofiUrl: 'https://ko-fi.com/s/FURY_PREMIUM_ID', items: ['sf_inferno', 'sf_void'] },
    ],
    codes: { 'FURYPRO2026': 'furypremium' },
    onUnlock: function (itemIds) {
      var arr; try { arr = JSON.parse(localStorage.getItem('sfShopUnlocked')) || []; } catch(e) { arr = []; }
      itemIds.forEach(function (id) { if (arr.indexOf(id) === -1) arr.push(id); });
      localStorage.setItem('sfShopUnlocked', JSON.stringify(arr));
    }
  });
}
