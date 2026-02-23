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

/* Input state */
const keys = {};
let touchX = null;
let touchActive = false;

/* ══════════════════════════════════════════════════════════════════
   PARALLAX STARFIELD
   ══════════════════════════════════════════════════════════════════ */
function initStars() {
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * GAME_W,
      y: Math.random() * GAME_H,
      speed: 20 + Math.random() * 60,
      size: 0.5 + Math.random() * 1.5,
      layer: Math.floor(Math.random() * 3),  // 0=far, 1=mid, 2=near
      alpha: 0.3 + Math.random() * 0.7,
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
  }
}

function drawStars() {
  for (const s of stars) {
    const brightness = [0.4, 0.6, 1.0][s.layer];
    ctx.fillStyle = `rgba(180, 220, 255, ${s.alpha * brightness})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
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
    ctx.fillStyle = `rgba(0, 180, 255, ${a * 0.6})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.size * a, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Shield glow */
  if (player.shielded) {
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 255, 200, 0.08)';
    ctx.fill();
  }

  /* Invincibility blink */
  if (game.invincibleTimer > 0 && Math.floor(game.invincibleTimer * 10) % 2 === 0) return;

  const px = player.x, py = player.y;

  /* Ship body — neon cyan triangle */
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#00ccff';

  /* Main hull */
  ctx.fillStyle = '#00ccff';
  ctx.beginPath();
  ctx.moveTo(px, py - 16);
  ctx.lineTo(px - 14, py + 14);
  ctx.lineTo(px - 4, py + 8);
  ctx.lineTo(px, py + 12);
  ctx.lineTo(px + 4, py + 8);
  ctx.lineTo(px + 14, py + 14);
  ctx.closePath();
  ctx.fill();

  /* Cockpit */
  ctx.fillStyle = '#66eeff';
  ctx.beginPath();
  ctx.moveTo(px, py - 10);
  ctx.lineTo(px - 5, py + 2);
  ctx.lineTo(px + 5, py + 2);
  ctx.closePath();
  ctx.fill();

  /* Wing accents */
  ctx.fillStyle = '#0088cc';
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

  /* Engine glow */
  const eg = ctx.createRadialGradient(px, py + 14, 1, px, py + 14, 8);
  eg.addColorStop(0, 'rgba(0, 200, 255, 0.8)');
  eg.addColorStop(1, 'rgba(0, 200, 255, 0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(px, py + 14, 8, 0, Math.PI * 2);
  ctx.fill();

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
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ffcc';
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    /* Glow trail */
    ctx.fillStyle = 'rgba(0, 255, 200, 0.3)';
    ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h * 0.6);
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
    speed: type === 'basic' ? 80 : type === 'zigzag' ? 70 : type === 'swooper' ? 60 : 30,
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
      /* Boss — large red ship */
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff3333';

      ctx.fillStyle = '#cc2222';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.h / 2);
      ctx.lineTo(e.x - e.w / 2, e.y - e.h / 2 + 10);
      ctx.lineTo(e.x - e.w / 3, e.y - e.h / 2);
      ctx.lineTo(e.x, e.y - e.h / 2 + 8);
      ctx.lineTo(e.x + e.w / 3, e.y - e.h / 2);
      ctx.lineTo(e.x + e.w / 2, e.y - e.h / 2 + 10);
      ctx.closePath();
      ctx.fill();

      /* Boss cockpit */
      ctx.fillStyle = '#ff6644';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
      ctx.fill();

      /* Health bar */
      const barW = 50;
      const barH = 5;
      const barX = e.x - barW / 2;
      const barY = e.y - e.h / 2 - 12;
      ctx.fillStyle = 'rgba(255,0,0,0.3)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
      ctx.strokeStyle = 'rgba(255,100,100,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

    } else if (e.type === 'zigzag') {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffaa00';
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 12);
      ctx.lineTo(e.x - 12, e.y + 8);
      ctx.lineTo(e.x, e.y + 4);
      ctx.lineTo(e.x + 12, e.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffcc44';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (e.type === 'swooper') {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#cc44ff';
      ctx.fillStyle = '#cc44ff';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 10);
      ctx.lineTo(e.x - 14, e.y + 10);
      ctx.lineTo(e.x, e.y + 5);
      ctx.lineTo(e.x + 14, e.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ee88ff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
      ctx.fill();

    } else {
      /* Basic enemy — green */
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#44ff44';
      ctx.fillStyle = '#44ff44';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 10);
      ctx.lineTo(e.x - 10, e.y + 10);
      ctx.lineTo(e.x + 10, e.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#88ff88';
      ctx.beginPath();
      ctx.arc(e.x, e.y + 2, 3, 0, Math.PI * 2);
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
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ff4444';
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
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

    /* Glow */
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
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    /* Icon */
    ctx.fillStyle = col;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icons = { shield: 'S', rapid: 'R', spread: 'W', bomb: 'B' };
    ctx.fillText(icons[p.type] || '?', 0, 0);

    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════
   BOMB
   ══════════════════════════════════════════════════════════════════ */
function useBomb() {
  if (game.bombs <= 0) return;
  game.bombs--;

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

        if (e.hp <= 0) {
          /* Enemy killed */
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
          spawnExplosion(b.x, b.y, '#00ffcc', 8);
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
          spawnExplosion(player.x, player.y, '#00ffcc', 10);
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
    game.waveEnemiesTotal = 1;
    game.waveEnemiesSpawned = 0;
    game.waveEnemiesKilled = 0;
    game.waveSpawnTimer = 1.0;
  } else {
    game.waveEnemiesTotal = 5 + game.wave * 2;
    game.waveEnemiesSpawned = 0;
    game.waveEnemiesKilled = 0;
    game.waveSpawnTimer = 0;
  }
  game.waveClearDelay = 0;
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
        if (game.wave >= 3 && roll < 0.3) type = 'zigzag';
        if (game.wave >= 5 && roll < 0.15) type = 'swooper';
        if (game.wave >= 7 && roll < 0.25) type = 'swooper';
        spawnEnemy(type);
      }
      game.waveEnemiesSpawned++;
      /* Spawn interval decreases with wave */
      game.waveSpawnTimer = Math.max(0.3, 1.2 - game.wave * 0.05);
    }
  }

  /* Check wave completion */
  const allSpawned = game.waveEnemiesSpawned >= game.waveEnemiesTotal;
  const allCleared = enemies.length === 0 && allSpawned;

  if (allCleared && game.waveEnemiesKilled > 0) {
    game.waveClearDelay += dt;
    if (game.waveClearDelay > 1.5) {
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
  saveBestScore();
  achStats.gamesPlayed++;
  if (game.score > achStats.bestScore) achStats.bestScore = game.score;
  if (game.wave > achStats.highestWave) achStats.highestWave = game.wave;
  saveAch();
  checkAch();
  showAchPopup();
  if (typeof Leaderboard !== 'undefined') Leaderboard.submitScore('star-fury', game.score);
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
  if (game.score > game.best) {
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
  /* Lives */
  ctx.fillStyle = '#00ccff';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let livesStr = '';
  for (let i = 0; i < game.lives; i++) livesStr += '\u2764 ';
  ctx.fillText(livesStr, 8, 8);

  /* Bombs */
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'right';
  let bombStr = '';
  for (let i = 0; i < game.bombs; i++) bombStr += '\uD83D\uDCA3 ';
  ctx.fillText(bombStr || '', GAME_W - 8, 8);

  /* Combo counter */
  if (game.comboCount > 1) {
    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffcc00';
    ctx.fillText(game.comboCount + 'x COMBO', GAME_W / 2, 28);
    ctx.restore();
  }

  /* Wave indicator */
  if (game.bossActive && !game.bossDefeated) {
    ctx.save();
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
    const label = player.shielded ? 'SHIELD' : player.rapidFire ? 'RAPID FIRE' : 'SPREAD';
    ctx.fillText(label + ' ' + Math.ceil(player.powerTimer) + 's', 8, 26);
  }
}

/* ══════════════════════════════════════════════════════════════════
   TITLE SCREEN
   ══════════════════════════════════════════════════════════════════ */
function drawTitleScreen() {
  game.titlePulse += 0.02;

  /* Background starfield already drawn */

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

  /* Decorative ship */
  const shipY = GAME_H * 0.52 + Math.sin(game.titlePulse * 2) * 8;
  ctx.save();
  ctx.translate(GAME_W / 2, shipY);
  ctx.scale(1.5, 1.5);
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00ccff';
  ctx.fillStyle = '#00ccff';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(-14, 14);
  ctx.lineTo(-4, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(4, 8);
  ctx.lineTo(14, 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#66eeff';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-5, 2);
  ctx.lineTo(5, 2);
  ctx.closePath();
  ctx.fill();
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

  if (game.score >= game.best && game.score > 0) {
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

  /* Background */
  const bg = ctx.createLinearGradient(0, 0, 0, GAME_H);
  bg.addColorStop(0, '#050510');
  bg.addColorStop(0.5, '#0a0a20');
  bg.addColorStop(1, '#080818');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  drawStars();

  if (game.state === 'title') {
    drawTitleScreen();
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
