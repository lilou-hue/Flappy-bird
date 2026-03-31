/* ═══════════════════════════════════════════════════════════════════
   RIVALS — 2D Side-View Tactical Shooter
   Round-based 1P vs Bot / 2P Local — Canvas 360×640
   ═══════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

/* ── i18n helper ── */
var _t = function(key) { return (typeof I18N !== 'undefined' && I18N.t) ? I18N.t(key) : key; };

/* ── Constants ─────────────────────────────────────────────────── */
var W = 360, H = 640;
var FIXED_DT = 1/60; // fixed physics timestep
var GRAVITY = 0.42, JUMP_VEL = -9.5, DOUBLE_JUMP_VEL = -8;
var MOVE_ACCEL = 1.1, MAX_SPEED = 4.8, FRICTION = 0.82;
var CROUCH_SPEED = 2.0, WALL_SLIDE_SPEED = 1.5;
var DASH_SPEED = 9, DASH_DURATION = 0.12, DASH_COOLDOWN = 0.8;
var PLAYER_W = 18, PLAYER_H = 38, PLAYER_HEAD = 8;
var CROUCH_H = 24;
var ROUNDS_TO_WIN = 5;
var BUY_TIME = 10;
var MAX_CREDITS = 3000;
var START_CREDITS = 800;
var KILL_REWARD = 200, WIN_REWARD = 300, LOSS_REWARD = 150;
var HP_MAX = 100;
var COUNTDOWN_TIME = 3; // seconds before round starts

/* ── Canvas & Context ──────────────────────────────────────────── */
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
var scoreEl = document.getElementById('score');
var bestEl = document.getElementById('bestScore');
var muteBtn = document.getElementById('muteBtn');
var restartBtn = document.getElementById('restartButton');
var fullscreenBtn = document.getElementById('fullscreenButton');

/* ── Weapons ───────────────────────────────────────────────────── */
var WEAPONS = {
  pistol:    { cat: 'secondary', cost: 0,   dmg: 22, rate: 2.2, ammo: Infinity, speed: 6.5,spread: 0.06, bloom: 0.03, color: '#ffdd44', get name() { return _t('rvPistol'); }, trailLen: 6, bulletDrop: 0.08 },
  smg:       { cat: 'primary',   cost: 200, dmg: 12, rate: 5.5, ammo: 30,  speed: 7,  spread: 0.12, bloom: 0.04, color: '#44ddff', get name() { return _t('rvSMG'); }, trailLen: 5, bulletDrop: 0.06 },
  shotgun:   { cat: 'primary',   cost: 300, dmg: 9,  rate: 0.9, ammo: 8,   speed: 6,  spread: 0.2,  bloom: 0,    color: '#ff8844', get name() { return _t('rvShotgun'); }, pellets: 6, trailLen: 3, bulletDrop: 0.12 },
  rifle:     { cat: 'primary',   cost: 400, dmg: 28, rate: 2.8, ammo: 25,  speed: 8,  spread: 0.04, bloom: 0.035,color: '#88ff44', get name() { return _t('rvRifle'); }, trailLen: 8, bulletDrop: 0.04 },
  sniper:    { cat: 'primary',   cost: 500, dmg: 60, rate: 0.5, ammo: 4,   speed: 14, spread: 0.02, bloom: 0.12, color: '#ff44ff', get name() { return _t('rvSniper'); }, trailLen: 18, bulletDrop: 0.01 },
  knife:     { cat: 'melee',     cost: 0,   dmg: 55, rate: 2,   ammo: Infinity, range: 35, color: '#cccccc', get name() { return _t('rvKnife'); } }
};
var UTILITY = {
  grenade:   { cost: 100, dmg: 60,  radius: 60, get name() { return _t('rvGrenade'); } },
  flashbang: { cost: 50,  dmg: 0,   radius: 80, get name() { return _t('rvFlashbang'); } },
  medkit:    { cost: 150, heal: 50, get name() { return _t('rvMedkit'); } }
};
var PRIMARY_LIST = ['smg', 'shotgun', 'rifle', 'sniper'];
var UTILITY_LIST = ['grenade', 'flashbang', 'medkit'];
var BUY_ITEMS = PRIMARY_LIST.concat(UTILITY_LIST);

/* ── Maps ──────────────────────────────────────────────────────── */
var MAPS = [
  { get name() { return _t('rvMapWarehouse'); }, bg: '#0d1117', platforms: [
    { x: 0, y: 580, w: 360, h: 60 },
    { x: 40, y: 460, w: 80, h: 14 },
    { x: 240, y: 460, w: 80, h: 14 },
    { x: 130, y: 380, w: 100, h: 14 },
    { x: 20, y: 310, w: 70, h: 14 },
    { x: 270, y: 310, w: 70, h: 14 },
    { x: 140, y: 250, w: 80, h: 14 },
    { x: 90, y: 556, w: 24, h: 24 },
    { x: 246, y: 556, w: 24, h: 24 }
  ]},
  { get name() { return _t('rvMapRooftops'); }, bg: '#0a0e1a', platforms: [
    { x: 0, y: 590, w: 120, h: 50 },
    { x: 240, y: 590, w: 120, h: 50 },
    { x: 130, y: 580, w: 100, h: 10 },
    { x: 30, y: 480, w: 90, h: 14 },
    { x: 240, y: 480, w: 90, h: 14 },
    { x: 140, y: 430, w: 80, h: 14 },
    { x: 50, y: 350, w: 70, h: 14 },
    { x: 240, y: 350, w: 70, h: 14 },
    { x: 120, y: 280, w: 120, h: 14 },
    { x: 60, y: 200, w: 60, h: 14 },
    { x: 240, y: 200, w: 60, h: 14 }
  ]},
  { get name() { return _t('rvMapBunker'); }, bg: '#0e0c14', platforms: [
    { x: 0, y: 580, w: 360, h: 60 },
    { x: 0, y: 440, w: 100, h: 14 },
    { x: 260, y: 440, w: 100, h: 14 },
    { x: 100, y: 490, w: 160, h: 14 },
    { x: 60, y: 350, w: 100, h: 14 },
    { x: 200, y: 350, w: 100, h: 14 },
    { x: 130, y: 300, w: 100, h: 14 },
    { x: 0, y: 230, w: 80, h: 14 },
    { x: 280, y: 230, w: 80, h: 14 },
    { x: 140, y: 180, w: 80, h: 14 },
    { x: 150, y: 440, w: 10, h: 50 },
    { x: 200, y: 440, w: 10, h: 50 }
  ]}
];

/* ── Game State ────────────────────────────────────────────────── */
var state = 'menu'; // menu, mode_select, buy_phase, countdown, playing, round_end, match_end
var numPlayers = 1;
var inputMode = 'keyboard';
var currentMap = null;
var roundNum = 0;
var p1Score = 0, p2Score = 0;
var roundWinner = 0;
var buyTimer = 0;
var countdownTimer = 0;
var roundEndTimer = 0;
var matchKills = 0;
var bestKills = parseInt(localStorage.getItem('rivalsBest')) || 0;
var totalWins = parseInt(localStorage.getItem('rivalsTotalWins')) || 0;
var particles = [];
var bullets = [];
var grenades = [];
var screenShake = 0;
var flashAlpha = 0;
var killFeed = [];     // { text, color, timer }
var dmgNumbers = [];   // { x, y, text, color, vy, timer }
var deadBodies = [];   // { x, y, w, h, color, vx, vy, rot, rotV, alpha }
var accumulator = 0;   // for fixed timestep

/* ── Cached background ─────────────────────────────────────────── */
var bgCanvas = null, bgCtx = null, bgMapName = '';
var bgStars = [];
for (var si = 0; si < 50; si++) {
  bgStars.push({ x: Math.random() * W, y: Math.random() * H * 0.7, s: 0.5 + Math.random() * 1.5, b: 0.3 + Math.random() * 0.7, phase: Math.random() * Math.PI * 2 });
}
var BG_BUILDINGS = [
  { x: 10, w: 30, h: 120 }, { x: 50, w: 25, h: 80 }, { x: 90, w: 40, h: 150 },
  { x: 140, w: 20, h: 100 }, { x: 175, w: 35, h: 130 }, { x: 220, w: 28, h: 90 },
  { x: 260, w: 45, h: 160 }, { x: 310, w: 30, h: 110 }
];

/* ── Players ───────────────────────────────────────────────────── */
function createPlayer(id, x, facingRight) {
  return {
    id: id,
    x: x, y: 400, vx: 0, vy: 0,
    w: PLAYER_W, h: PLAYER_H,
    hp: HP_MAX,
    alive: true,
    onGround: false,
    wasOnGround: false,
    jumps: 0,
    crouching: false,
    facingRight: facingRight,
    weapon: 'pistol',
    primary: null,
    ammo: {},
    fireTimer: 0,
    recoilTimer: 0,
    utility: [],
    credits: START_CREDITS,
    color: id === 1 ? '#4488ff' : '#ff4444',
    headColor: id === 1 ? '#6699ff' : '#ff6666',
    eyeColor: id === 1 ? '#ffffff' : '#ffffff',
    input: { left: false, right: false, up: false, down: false, shoot: false, switchWeapon: false, useUtility: false },
    walkFrame: 0,
    healTimer: 0,
    flashTimer: 0,
    _jumpHeld: false,
    _switchHeld: false,
    _utilHeld: false,
    _dashHeld: false,
    landSquash: 0,
    hitFlash: 0,
    dashTimer: 0,    // time left in active dash
    dashCooldown: 0, // cooldown before next dash
    dashDir: 0,      // -1 or 1
    bloomAccum: 0    // accuracy bloom from sustained fire
  };
}

var p1 = null, p2 = null;

/* ── Input Handling ────────────────────────────────────────────── */
var keys = {};
var touchState = { p1: { left: false, right: false, up: false, shoot: false, down: false }, p2: { left: false, right: false, up: false, shoot: false, down: false } };

document.addEventListener('keydown', function(e) {
  keys[e.key] = true;
  keys[e.code] = true;
  Audio.init(); Audio.resume();
  if (state === 'menu') handleMenuKey(e);
  else if (state === 'mode_select') handleModeKey(e);
  else if (state === 'buy_phase') handleBuyKey(e);
  else if (state === 'match_end') {
    if (e.code === 'Space' || e.code === 'Enter') startMenu();
  }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',' '].indexOf(e.key) !== -1) e.preventDefault();
});

document.addEventListener('keyup', function(e) {
  keys[e.key] = false;
  keys[e.code] = false;
});

/* ── Touch Controls ────────────────────────────────────────────── */
var touchButtons = [];

function setupTouchControls() {
  touchButtons = [];
  if (inputMode === 'keyboard') return;
  var btnH = 50, btnW = 55, margin = 6, bottomY = H - btnH - margin;
  if (inputMode === 'touch' || inputMode === 'mixed') {
    touchButtons.push({ id: 'p1', action: 'left',  x: margin, y: bottomY, w: btnW, h: btnH, label: '<' });
    touchButtons.push({ id: 'p1', action: 'right', x: margin + btnW + 4, y: bottomY, w: btnW, h: btnH, label: '>' });
    touchButtons.push({ id: 'p1', action: 'up',    x: margin + (btnW+4)/2, y: bottomY - btnH - 4, w: btnW, h: btnH, label: '^' });
    touchButtons.push({ id: 'p1', action: 'shoot', x: margin, y: bottomY - (btnH+4)*2, w: btnW*2+4, h: btnH, label: 'FIRE' });
    touchButtons.push({ id: 'p1', action: 'down',  x: margin + btnW*2 + 12, y: bottomY, w: btnW-10, h: btnH, label: 'v' });
  }
  if ((inputMode === 'touch' || inputMode === 'mixed') && numPlayers === 2) {
    var rx = W/2 + margin;
    touchButtons.push({ id: 'p2', action: 'left',  x: rx, y: bottomY, w: btnW, h: btnH, label: '<' });
    touchButtons.push({ id: 'p2', action: 'right', x: rx + btnW + 4, y: bottomY, w: btnW, h: btnH, label: '>' });
    touchButtons.push({ id: 'p2', action: 'up',    x: rx + (btnW+4)/2, y: bottomY - btnH - 4, w: btnW, h: btnH, label: '^' });
    touchButtons.push({ id: 'p2', action: 'shoot', x: rx, y: bottomY - (btnH+4)*2, w: btnW*2+4, h: btnH, label: 'FIRE' });
    touchButtons.push({ id: 'p2', action: 'down',  x: rx + btnW*2 + 12, y: bottomY, w: btnW-10, h: btnH, label: 'v' });
  }
}

function canvasTouchPos(touch) {
  var rect = canvas.getBoundingClientRect();
  return { x: (touch.clientX - rect.left) * (W / rect.width), y: (touch.clientY - rect.top) * (H / rect.height) };
}

function handleTouchStart(e) {
  e.preventDefault();
  Audio.init(); Audio.resume();
  for (var t = 0; t < e.changedTouches.length; t++) {
    var pos = canvasTouchPos(e.changedTouches[t]);
    if (state === 'menu') { handleMenuTouch(pos); continue; }
    if (state === 'mode_select') { handleModeTouch(pos); continue; }
    if (state === 'buy_phase') { handleBuyTouch(pos); continue; }
    if (state === 'match_end') { startMenu(); continue; }
    for (var b = 0; b < touchButtons.length; b++) {
      var btn = touchButtons[b];
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        touchState[btn.id][btn.action] = true;
      }
    }
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  var active = {};
  for (var t = 0; t < e.touches.length; t++) {
    var pos = canvasTouchPos(e.touches[t]);
    for (var b = 0; b < touchButtons.length; b++) {
      var btn = touchButtons[b];
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        active[btn.id + '_' + btn.action] = true;
      }
    }
  }
  for (var b2 = 0; b2 < touchButtons.length; b2++) {
    var btn2 = touchButtons[b2];
    if (!active[btn2.id + '_' + btn2.action]) {
      touchState[btn2.id][btn2.action] = false;
    }
  }
}

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', function(e) { e.preventDefault(); handleTouchEnd(e); }, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

canvas.addEventListener('click', function(e) {
  Audio.init(); Audio.resume();
  var rect = canvas.getBoundingClientRect();
  var pos = { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  if (state === 'menu') handleMenuTouch(pos);
  else if (state === 'mode_select') handleModeTouch(pos);
  else if (state === 'buy_phase') handleBuyTouch(pos);
  else if (state === 'match_end') startMenu();
});

/* ── P1/P2 Input Mapping ──────────────────────────────────────── */
function updateInputs() {
  if (p1) {
    if (numPlayers === 2 && inputMode === 'keyboard') {
      p1.input.left = keys['a'] || keys['A'] || touchState.p1.left;
      p1.input.right = keys['d'] || keys['D'] || touchState.p1.right;
      p1.input.up = keys['w'] || keys['W'] || keys[' '] || touchState.p1.up;
      p1.input.down = keys['s'] || keys['S'] || touchState.p1.down;
      p1.input.shoot = keys['f'] || keys['F'] || keys['j'] || keys['J'] || touchState.p1.shoot;
      p1.input.switchWeapon = keys['r'] || keys['R'];
      p1.input.useUtility = keys['g'] || keys['G'];
      p1.input.dash = keys['e'] || keys['E'];
    } else {
      p1.input.left = keys['a'] || keys['A'] || keys['ArrowLeft'] || touchState.p1.left;
      p1.input.right = keys['d'] || keys['D'] || keys['ArrowRight'] || touchState.p1.right;
      p1.input.up = keys['w'] || keys['W'] || keys[' '] || keys['ArrowUp'] || touchState.p1.up;
      p1.input.down = keys['s'] || keys['S'] || keys['ArrowDown'] || touchState.p1.down;
      p1.input.shoot = keys['f'] || keys['F'] || keys['j'] || keys['J'] || touchState.p1.shoot;
      p1.input.switchWeapon = keys['r'] || keys['R'];
      p1.input.useUtility = keys['g'] || keys['G'];
      p1.input.dash = keys['Shift'] || keys['e'] || keys['E'];
    }
  }
  if (p2 && numPlayers === 2) {
    if (inputMode === 'keyboard') {
      p2.input.left = keys['ArrowLeft'];
      p2.input.right = keys['ArrowRight'];
      p2.input.up = keys['ArrowUp'];
      p2.input.down = keys['ArrowDown'];
      p2.input.shoot = keys['Enter'];
      p2.input.switchWeapon = keys['Backspace'];
      p2.input.useUtility = keys['/'];
      p2.input.dash = keys['Shift'];
    } else if (inputMode === 'touch' || inputMode === 'mixed') {
      p2.input.left = touchState.p2.left;
      p2.input.right = touchState.p2.right;
      p2.input.up = touchState.p2.up;
      p2.input.down = touchState.p2.down;
      p2.input.shoot = touchState.p2.shoot;
    }
  }
}

/* ── Menu State ────────────────────────────────────────────────── */
var menuSel = 0;
function handleMenuKey(e) {
  if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') menuSel = 0;
  if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') menuSel = 1;
  if (e.code === 'Space' || e.code === 'Enter' || e.key === 'f' || e.key === 'F') {
    numPlayers = menuSel === 0 ? 1 : 2;
    if (numPlayers === 1) { inputMode = 'keyboard'; startMatch(); }
    else { state = 'mode_select'; modeSel = 0; }
  }
}
function handleMenuTouch(pos) {
  if (pos.x > 80 && pos.x < 280 && pos.y > 340 && pos.y < 390) { numPlayers = 1; inputMode = 'keyboard'; startMatch(); }
  if (pos.x > 80 && pos.x < 280 && pos.y > 410 && pos.y < 460) { numPlayers = 2; state = 'mode_select'; modeSel = 0; }
}

/* ── Mode Select ───────────────────────────────────────────────── */
var modeSel = 0;
var MODE_OPTIONS = ['keyboard', 'touch', 'mixed'];
function handleModeKey(e) {
  if (e.code === 'ArrowUp' || e.key === 'w') modeSel = Math.max(0, modeSel - 1);
  if (e.code === 'ArrowDown' || e.key === 's') modeSel = Math.min(2, modeSel + 1);
  if (e.code === 'Space' || e.code === 'Enter' || e.key === 'f') {
    inputMode = MODE_OPTIONS[modeSel];
    startMatch();
  }
}
function handleModeTouch(pos) {
  for (var i = 0; i < 3; i++) {
    var by = 300 + i * 60;
    if (pos.x > 60 && pos.x < 300 && pos.y > by && pos.y < by + 45) {
      inputMode = MODE_OPTIONS[i];
      startMatch();
    }
  }
}

/* ── Match / Round Management ──────────────────────────────────── */
function startMatch() {
  currentMap = MAPS[Math.floor(Math.random() * MAPS.length)];
  bgMapName = ''; // force bg recache
  roundNum = 0; p1Score = 0; p2Score = 0; matchKills = 0; scoreEl.textContent = '0';
  p1 = createPlayer(1, 60, true);
  p2 = createPlayer(2, 280, false);
  setupTouchControls();
  startBuyPhase();
}

function startBuyPhase() {
  roundNum++;
  state = 'buy_phase';
  buyTimer = BUY_TIME;
  buyCursor = { p1: 0, p2: 0 };
  resetPlayersForRound();
  Audio.roundStart();
}

function resetPlayersForRound() {
  var spawns = getSpawns();
  [p1, p2].forEach(function(p, i) {
    p.x = spawns[i].x; p.y = spawns[i].y;
    p.vx = 0; p.vy = 0;
    p.hp = HP_MAX; p.alive = true;
    p.onGround = false; p.wasOnGround = false;
    p.jumps = 0; p.crouching = false;
    p.fireTimer = 0; p.recoilTimer = 0;
    p.healTimer = 0; p.flashTimer = 0;
    p.dashTimer = 0; p.dashCooldown = 0; p.bloomAccum = 0;
    p.facingRight = i === 0;
    p.landSquash = 0; p.hitFlash = 0;
    if (p.primary) p.ammo[p.primary] = WEAPONS[p.primary].ammo;
    p.weapon = p.primary || 'pistol';
  });
  bullets = []; grenades = []; particles = [];
  killFeed = []; dmgNumbers = []; deadBodies = [];
}

function getSpawns() {
  var ground = currentMap.platforms[0];
  return [
    { x: 40, y: ground.y - PLAYER_H },
    { x: W - 40 - PLAYER_W, y: ground.y - PLAYER_H }
  ];
}

function startCountdown() {
  state = 'countdown';
  countdownTimer = COUNTDOWN_TIME;
}

function startPlaying() {
  state = 'playing';
}

function endRound(winner) {
  state = 'round_end';
  roundEndTimer = 2;
  roundWinner = winner;
  if (winner === 1) {
    p1Score++;
    p1.credits += WIN_REWARD;
    p2.credits += LOSS_REWARD;
  } else {
    p2Score++;
    p2.credits += WIN_REWARD;
    p1.credits += LOSS_REWARD;
  }
  p1.credits = Math.min(p1.credits, MAX_CREDITS);
  p2.credits = Math.min(p2.credits, MAX_CREDITS);
  Audio.roundEnd();
  checkAch();
}

function endMatch() {
  state = 'match_end';
  var winner = p1Score >= ROUNDS_TO_WIN ? 1 : 2;
  if (winner === 1) {
    totalWins++;
    localStorage.setItem('rivalsTotalWins', totalWins);
  }
  achStats.matchesPlayed++;
  if (winner === 1) achStats.matchesWon++;
  const prevBest = bestKills;
  if (matchKills > bestKills) {
    bestKills = matchKills;
    localStorage.setItem('rivalsBest', bestKills);
  }
  bestEl.textContent = bestKills;
  scoreEl.textContent = matchKills;
  if (typeof Leaderboard !== 'undefined') Leaderboard.submitScore('rivals', matchKills);
  if (typeof Arcade !== 'undefined') {
    Arcade.onGameOver('rivals', matchKills);
    document.body.appendChild(Arcade.createScoreCard('rivals', matchKills, prevBest));
  }
  // Check comeback: p1 won match while p2 had 4 rounds
  if (p1Score >= ROUNDS_TO_WIN && p2Score === 4) achStats.comebacks++;
  Audio.gameOver();
  checkAch();
  saveAch();
}

function startMenu() {
  state = 'menu'; menuSel = 0;
  p1 = null; p2 = null;
  const oldCard = document.querySelector('.arc-scorecard');
  if (oldCard) oldCard.remove();
}

/* ── Kill Feed ─────────────────────────────────────────────────── */
function addKillFeed(text, color) {
  killFeed.unshift({ text: text, color: color, timer: 3 });
  if (killFeed.length > 4) killFeed.pop();
}

/* ── Damage Numbers ────────────────────────────────────────────── */
function addDmgNumber(x, y, dmg, isHeadshot) {
  dmgNumbers.push({
    x: x + (Math.random() - 0.5) * 10,
    y: y,
    text: (isHeadshot ? 'HS ' : '') + dmg,
    color: isHeadshot ? '#ff4444' : '#ffffff',
    vy: -2,
    timer: 1,
    size: isHeadshot ? 14 : 11
  });
}

/* ── Buy Phase ─────────────────────────────────────────────────── */
var buyCursor = { p1: 0, p2: 0 };

function handleBuyKey(e) {
  var cursor = 'p1';
  var p = p1;
  if (numPlayers === 2 && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter')) {
    cursor = 'p2'; p = p2;
  }
  if (e.key === 'w' || e.key === 'W' || (cursor === 'p2' && e.key === 'ArrowUp')) buyCursor[cursor] = Math.max(0, buyCursor[cursor] - 1);
  if (e.key === 's' || e.key === 'S' || (cursor === 'p2' && e.key === 'ArrowDown')) buyCursor[cursor] = Math.min(BUY_ITEMS.length - 1, buyCursor[cursor] + 1);
  if (e.key === 'f' || e.key === 'F' || (cursor === 'p2' && e.key === 'Enter') || e.code === 'Space') {
    buyItem(p, BUY_ITEMS[buyCursor[cursor]]);
  }
}

function handleBuyTouch(pos) {
  for (var i = 0; i < BUY_ITEMS.length; i++) {
    var iy = 160 + i * 48; // matches draw positions now
    if (pos.x > 30 && pos.x < 330 && pos.y > iy && pos.y < iy + 40) {
      buyItem(p1, BUY_ITEMS[i]);
    }
  }
}

function buyItem(p, itemId) {
  if (WEAPONS[itemId]) {
    var w = WEAPONS[itemId];
    if (w.cost > p.credits) return;
    if (w.cat === 'primary') {
      if (p.primary === itemId) return;
      p.primary = itemId;
      p.weapon = itemId;
      p.ammo[itemId] = w.ammo;
      p.credits -= w.cost;
      Audio.buy();
    }
  } else if (UTILITY[itemId]) {
    var u = UTILITY[itemId];
    if (u.cost > p.credits) return;
    if (p.utility.length >= 2) return;
    p.utility.push(itemId);
    p.credits -= u.cost;
    Audio.buy();
  }
  if (p === p1 && p.credits >= MAX_CREDITS) {
    achStats.maxCreditsReached = true;
    checkAch();
  }
}

/* ── Bot AI ────────────────────────────────────────────────────── */
var botState = 'patrol';
var botPatrolDir = 1;
var botThinkTimer = 0;
var botReactionTime = 0.5;
var botUtilTimer = 0;

function updateBot(dt) {
  if (numPlayers !== 1 || !p2 || !p2.alive || state !== 'playing') return;

  botThinkTimer -= dt;
  if (botThinkTimer > 0) return;
  botThinkTimer = botReactionTime;

  var bot = p2, target = p1;
  if (!target.alive) { bot.input = { left: false, right: false, up: false, down: false, shoot: false, switchWeapon: false, useUtility: false }; return; }

  var dx = target.x - bot.x;
  var dy = target.y - bot.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var canSee = hasLineOfSight(bot, target);

  if (bot.hp < 30 && dist < 150) botState = 'cover';
  else if (canSee && dist < getWeaponRange(bot.weapon)) botState = 'attack';
  else if (canSee) botState = 'chase';
  else botState = 'patrol';

  bot.input.left = false; bot.input.right = false;
  bot.input.up = false; bot.input.down = false;
  bot.input.shoot = false; bot.input.useUtility = false;
  bot.input.dash = false;

  switch (botState) {
    case 'patrol':
      if (botPatrolDir > 0) bot.input.right = true;
      else bot.input.left = true;
      if (bot.x < 30) botPatrolDir = 1;
      if (bot.x > W - 50) botPatrolDir = -1;
      if (Math.random() < 0.05) bot.input.up = true;
      break;

    case 'chase':
      if (dx > 20) bot.input.right = true;
      else if (dx < -20) bot.input.left = true;
      bot.facingRight = dx > 0;
      if (dy < -40 && bot.onGround) bot.input.up = true;
      if (!isPlatformBelow(bot.x + (bot.input.right ? 20 : -20), bot.y + bot.h + 5) && bot.onGround) bot.input.up = true;
      // Dash to close distance
      if (dist > 120 && Math.random() < 0.08 && bot.dashCooldown <= 0) bot.input.dash = true;
      break;

    case 'attack':
      bot.facingRight = dx > 0;
      bot.input.shoot = true;
      if (Math.random() < 0.3) {
        if (Math.random() < 0.5) bot.input.left = true;
        else bot.input.right = true;
      }
      if (Math.random() < 0.1) bot.input.down = true;
      // Bot uses utility items
      botUtilTimer -= dt;
      if (bot.utility.length > 0 && botUtilTimer <= 0 && dist < 150 && Math.random() < 0.15) {
        bot.input.useUtility = true;
        botUtilTimer = 3; // cooldown
      }
      break;

    case 'cover':
      if (dx > 0) bot.input.left = true;
      else bot.input.right = true;
      bot.input.down = true;
      if (canSee) bot.input.shoot = true;
      // Dash away when in danger
      if (dist < 80 && Math.random() < 0.12 && bot.dashCooldown <= 0) bot.input.dash = true;
      // Use medkit if available and low HP
      if (bot.hp < 40 && bot.utility.indexOf('medkit') !== -1) {
        bot.input.useUtility = true;
      }
      break;
  }

  botReactionTime = Math.max(0.1, 0.5 - roundNum * 0.05);
}

function botBuy() {
  if (numPlayers !== 1 || !p2) return;
  var bot = p2;
  var primaries = ['sniper', 'rifle', 'shotgun', 'smg'];
  for (var i = 0; i < primaries.length; i++) {
    if (bot.credits >= WEAPONS[primaries[i]].cost && bot.primary !== primaries[i]) {
      buyItem(bot, primaries[i]);
      break;
    }
  }
  if (bot.credits >= 100 && bot.utility.length < 2) buyItem(bot, 'grenade');
  if (bot.credits >= 150 && bot.utility.length < 2) buyItem(bot, 'medkit');
  if (bot.credits >= 50 && bot.utility.length < 2) buyItem(bot, 'flashbang');
}

function hasLineOfSight(a, b) {
  var ax = a.x + a.w / 2, ay = a.y + PLAYER_HEAD;
  var bx = b.x + b.w / 2, by = b.y + PLAYER_HEAD;
  var steps = 20;
  for (var i = 1; i < steps; i++) {
    var t = i / steps;
    var px = ax + (bx - ax) * t;
    var py = ay + (by - ay) * t;
    for (var j = 0; j < currentMap.platforms.length; j++) {
      var pl = currentMap.platforms[j];
      if (px > pl.x && px < pl.x + pl.w && py > pl.y && py < pl.y + pl.h) return false;
    }
  }
  return true;
}

function isPlatformBelow(x, y) {
  for (var i = 0; i < currentMap.platforms.length; i++) {
    var pl = currentMap.platforms[i];
    if (x > pl.x && x < pl.x + pl.w && y >= pl.y && y < pl.y + pl.h + 10) return true;
  }
  return false;
}

function getWeaponRange(weapon) {
  if (weapon === 'knife') return 35;
  if (weapon === 'shotgun') return 120;
  if (weapon === 'sniper') return 400;
  return 250;
}

/* ── Physics & Collision ───────────────────────────────────────── */
function updatePlayer(p, dt) {
  if (!p.alive) return;

  var ph = p.crouching ? CROUCH_H : PLAYER_H;
  var maxSpd = p.crouching ? CROUCH_SPEED : MAX_SPEED;

  // Dash
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.dashTimer > 0) {
    // Active dash — override movement
    p.vx = p.dashDir * DASH_SPEED;
    p.dashTimer -= dt;
    if (p.dashTimer <= 0) p.dashTimer = 0;
  } else {
    // Dash trigger
    if (p.input.dash && !p._dashHeld && p.dashCooldown <= 0) {
      var ddir = p.input.right ? 1 : (p.input.left ? -1 : (p.facingRight ? 1 : -1));
      p.dashDir = ddir;
      p.dashTimer = DASH_DURATION;
      p.dashCooldown = DASH_COOLDOWN;
      spawnParticles(p.x + p.w/2, p.y + ph/2, '#ffffff', 5, 3, 0);
      Audio.jump();
    }
    p._dashHeld = p.input.dash;

    // Normal horizontal movement
    var accel = MOVE_ACCEL * (dt / FIXED_DT);
    if (p.input.left) p.vx -= accel;
    if (p.input.right) p.vx += accel;
    if (!p.input.left && !p.input.right) {
      var fric = 1 - (1 - FRICTION) * (dt / FIXED_DT);
      p.vx *= Math.max(0, fric);
    }
    if (p.vx > maxSpd) p.vx = maxSpd;
    if (p.vx < -maxSpd) p.vx = -maxSpd;
    if (Math.abs(p.vx) < 0.08) p.vx = 0;
  }

  // Facing
  if (p.input.left) p.facingRight = false;
  if (p.input.right) p.facingRight = true;

  // Crouching
  p.crouching = p.input.down && p.onGround;

  // Gravity with dt scaling
  p.vy += GRAVITY * (dt / FIXED_DT);

  // Bloom decay (accuracy recovers when not shooting)
  if (p.fireTimer <= 0) {
    p.bloomAccum *= (1 - 3 * dt); // fast decay when not firing
  }
  if (p.bloomAccum < 0.001) p.bloomAccum = 0;

  // Wall slide
  if (!p.onGround && Math.abs(p.vx) > 0) {
    var touchingWall = false;
    for (var i = 0; i < currentMap.platforms.length; i++) {
      var pl = currentMap.platforms[i];
      if (p.y + ph > pl.y && p.y < pl.y + pl.h) {
        if ((p.vx > 0 && p.x + p.w >= pl.x && p.x + p.w <= pl.x + 4) ||
            (p.vx < 0 && p.x <= pl.x + pl.w && p.x >= pl.x + pl.w - 4)) {
          touchingWall = true;
        }
      }
    }
    if (touchingWall && p.vy > 0) {
      p.vy = Math.min(p.vy, WALL_SLIDE_SPEED);
      p.jumps = Math.min(p.jumps, 1);
    }
  }

  // Jump
  if (p.input.up && !p._jumpHeld) {
    if (p.onGround) {
      p.vy = JUMP_VEL;
      p.jumps = 1;
      p.onGround = false;
      Audio.jump();
    } else if (p.jumps < 2) {
      p.vy = DOUBLE_JUMP_VEL;
      p.jumps = 2;
      Audio.jump();
      // Double-jump dust puff
      spawnParticles(p.x + p.w/2, p.y + ph, '#aabbcc', 4, 3, -1);
    }
  }
  p._jumpHeld = p.input.up;

  // Remember ground state before collision
  p.wasOnGround = p.onGround;

  // Apply velocity
  p.x += p.vx * (dt / FIXED_DT);
  p.y += p.vy * (dt / FIXED_DT);

  // Platform collision
  p.onGround = false;
  for (var j = 0; j < currentMap.platforms.length; j++) {
    var plat = currentMap.platforms[j];
    resolveCollision(p, plat, ph);
  }

  // Landing detection — spawn dust + squash
  if (p.onGround && !p.wasOnGround && p.vy <= 0.5) {
    var landSpeed = Math.abs(p.vy);
    if (landSpeed > 2) {
      p.landSquash = Math.min(0.35, landSpeed * 0.03);
      spawnParticles(p.x + p.w/2, p.y + ph, '#8899aa', 3 + Math.floor(landSpeed), 4, 0.5);
    }
  }

  // Screen bounds
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (p.x + p.w > W) { p.x = W - p.w; p.vx = 0; }
  if (p.y + ph > H) { p.y = H - ph; p.vy = 0; p.onGround = true; p.jumps = 0; }

  // Walk animation
  if (Math.abs(p.vx) > 0.5 && p.onGround) p.walkFrame += 0.15 * (dt / FIXED_DT);

  // Timers
  if (p.fireTimer > 0) p.fireTimer -= dt;
  if (p.recoilTimer > 0) p.recoilTimer -= dt;
  if (p.landSquash > 0) p.landSquash *= 0.85;
  if (p.landSquash < 0.01) p.landSquash = 0;
  if (p.hitFlash > 0) p.hitFlash -= dt;

  // Heal timer
  if (p.healTimer > 0) {
    p.healTimer -= dt;
    if (p.healTimer <= 0) {
      p.hp = Math.min(HP_MAX, p.hp + 50);
      Audio.heal();
      addDmgNumber(p.x + p.w/2, p.y, 50, false);
    }
  }

  // Flash timer
  if (p.flashTimer > 0) p.flashTimer -= dt;

  // Weapon switching
  if (p.input.switchWeapon && !p._switchHeld) {
    var weapons = ['pistol', 'knife'];
    if (p.primary) weapons.unshift(p.primary);
    var idx = weapons.indexOf(p.weapon);
    p.weapon = weapons[(idx + 1) % weapons.length];
    Audio.reload();
  }
  p._switchHeld = p.input.switchWeapon;

  // Utility use
  if (p.input.useUtility && !p._utilHeld && p.utility.length > 0) {
    useUtility(p, p.utility.shift());
  }
  p._utilHeld = p.input.useUtility;

  // Shooting
  handleShooting(p, dt);
}

function resolveCollision(p, plat, ph) {
  var px = p.x, py = p.y, pw = p.w;
  if (px + pw <= plat.x || px >= plat.x + plat.w) return;
  if (py + ph <= plat.y || py >= plat.y + plat.h) return;

  var overlapLeft = (px + pw) - plat.x;
  var overlapRight = (plat.x + plat.w) - px;
  var overlapTop = (py + ph) - plat.y;
  var overlapBottom = (plat.y + plat.h) - py;

  var minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

  if (minOverlap === overlapTop && p.vy >= 0) {
    p.y = plat.y - ph;
    p.vy = 0;
    p.onGround = true;
    p.jumps = 0;
  } else if (minOverlap === overlapBottom && p.vy < 0) {
    p.y = plat.y + plat.h;
    p.vy = 0;
  } else if (minOverlap === overlapLeft) {
    p.x = plat.x - pw;
    p.vx = 0;
  } else if (minOverlap === overlapRight) {
    p.x = plat.x + plat.w;
    p.vx = 0;
  }
}

/* ── Shooting & Combat ─────────────────────────────────────────── */
function handleShooting(p, dt) {
  if (!p.input.shoot || p.fireTimer > 0 || p.healTimer > 0) return;

  var w = WEAPONS[p.weapon];
  if (!w) return;

  if (w.cat === 'melee') {
    var target = p === p1 ? p2 : p1;
    if (target && target.alive) {
      var dx = target.x + target.w/2 - (p.x + p.w/2);
      var dy = target.y + target.h/2 - (p.y + p.h/2);
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < w.range && ((p.facingRight && dx > 0) || (!p.facingRight && dx < 0))) {
        damagePlayer(target, w.dmg, p, false);
        Audio.shoot('knife');
        spawnParticles(target.x + target.w/2, target.y + target.h/2, '#cccccc', 5, 4, -1);
      }
    }
    p.fireTimer = 1 / w.rate;
    p.recoilTimer = 0.1;
    return;
  }

  // Check ammo
  if (w.ammo !== Infinity) {
    if (!p.ammo[p.weapon] || p.ammo[p.weapon] <= 0) {
      p.weapon = 'pistol';
      return;
    }
    p.ammo[p.weapon]--;
  }

  var bx = p.x + (p.facingRight ? p.w + 2 : -4);
  var by = p.y + PLAYER_HEAD + 4;
  var dir = p.facingRight ? 1 : -1;

  // Total spread = base spread + bloom + movement penalty
  var totalSpread = w.spread + p.bloomAccum;
  // Moving adds spread (except shotgun which doesn't care)
  if (Math.abs(p.vx) > 1 && p.weapon !== 'shotgun') totalSpread += 0.04;
  // Airborne adds more spread
  if (!p.onGround) totalSpread += 0.06;
  // Crouching reduces spread
  if (p.crouching) totalSpread *= 0.6;

  var drop = w.bulletDrop || 0;

  if (w.pellets) {
    for (var i = 0; i < w.pellets; i++) {
      var angle = (Math.random() - 0.5) * totalSpread * 2;
      bullets.push({ x: bx, y: by, vx: dir * w.speed * Math.cos(angle), vy: w.speed * Math.sin(angle) * (Math.random()-0.5), dmg: w.dmg, owner: p.id, color: w.color, life: 0.45, trail: w.trailLen || 3, prevX: bx, prevY: by, drop: drop });
    }
  } else {
    var angle2 = (Math.random() - 0.5) * totalSpread;
    bullets.push({ x: bx, y: by, vx: dir * w.speed, vy: w.speed * angle2, dmg: w.dmg, owner: p.id, color: w.color, life: 0.7, isSniper: p.weapon === 'sniper', trail: w.trailLen || 6, prevX: bx, prevY: by, drop: drop });
  }

  // Accumulate bloom
  p.bloomAccum += w.bloom || 0;
  if (p.bloomAccum > 0.3) p.bloomAccum = 0.3; // cap

  spawnParticles(bx, by, '#ffff44', 4, 3, -1);
  Audio.shoot(p.weapon);
  p.fireTimer = 1 / w.rate;
  p.recoilTimer = 0.12;

  if (p.weapon === 'sniper' || p.weapon === 'shotgun') screenShake = 4;
  else if (p.weapon === 'rifle') screenShake = 1.5;
  else screenShake = Math.max(screenShake, 0.8);
}

function updateBullets(dt) {
  for (var i = bullets.length - 1; i >= 0; i--) {
    var b = bullets[i];
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.vx * (dt / FIXED_DT);
    b.y += b.vy * (dt / FIXED_DT);
    // Bullet drop (gravity on bullets)
    if (b.drop) b.vy += b.drop * (dt / FIXED_DT);
    b.life -= dt;

    if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10 || b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    // Platform collision
    var hitPlatform = false;
    for (var j = 0; j < currentMap.platforms.length; j++) {
      var pl = currentMap.platforms[j];
      if (b.x > pl.x && b.x < pl.x + pl.w && b.y > pl.y && b.y < pl.y + pl.h) {
        spawnParticles(b.x, b.y, '#888888', 3, 3, -1);
        hitPlatform = true;
        break;
      }
    }
    if (hitPlatform) { bullets.splice(i, 1); continue; }

    // Player collision
    var targets = [p1, p2];
    for (var k = 0; k < targets.length; k++) {
      var t = targets[k];
      if (!t || !t.alive || t.id === b.owner) continue;
      var th = t.crouching ? CROUCH_H : PLAYER_H;
      if (b.x > t.x && b.x < t.x + t.w && b.y > t.y && b.y < t.y + th) {
        var isHeadshot = b.y < t.y + th * 0.25;
        var dmg = isHeadshot ? Math.round(b.dmg * 2) : b.dmg;
        addDmgNumber(b.x, b.y, dmg, isHeadshot);
        damagePlayer(t, dmg, getPlayerById(b.owner), isHeadshot && b.isSniper);
        spawnParticles(b.x, b.y, t.color, 6, 4, -2);
        Audio.hit();
        screenShake = isHeadshot ? 4 : 2;
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

function damagePlayer(target, dmg, attacker, isSniperHeadshot) {
  target.hp -= dmg;
  target.hitFlash = 0.12;

  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;

    // Create dead body ragdoll
    var ph = target.crouching ? CROUCH_H : PLAYER_H;
    deadBodies.push({
      x: target.x, y: target.y, w: target.w, h: ph,
      color: target.color, headColor: target.headColor,
      vx: (attacker && attacker.facingRight ? 2 : -2) + (Math.random() - 0.5),
      vy: -3 - Math.random() * 2,
      rot: 0, rotV: (Math.random() - 0.5) * 0.3,
      alpha: 1
    });

    if (attacker) {
      attacker.credits = Math.min(MAX_CREDITS, attacker.credits + KILL_REWARD);
      var weaponName = WEAPONS[attacker.weapon] ? WEAPONS[attacker.weapon].name : attacker.weapon;
      var killerName = attacker === p1 ? _t('rvP1') : (numPlayers === 1 ? _t('rvBot') : _t('rvP2'));
      var victimName = target === p1 ? _t('rvP1') : (numPlayers === 1 ? _t('rvBot') : _t('rvP2'));
      addKillFeed(killerName + ' [' + weaponName + '] ' + victimName, attacker.color);

      if (attacker === p1) {
        matchKills++;
        scoreEl.textContent = matchKills;
        achStats.totalKills++;
        if (attacker.weapon === 'knife') achStats.knifeKills++;
        if (isSniperHeadshot) achStats.sniperHeadshots++;
      }
    }
    Audio.kill();
    spawnParticles(target.x + target.w/2, target.y + ph/2, target.color, 18, 5, -3);
    screenShake = 6;

    var winner = target === p2 ? 1 : 2;
    if (winner === 1 && p1.hp === HP_MAX) achStats.flawlessRounds++;
    if (winner === 1 && p1.weapon === 'pistol' && !p1.primary) achStats.ecoRounds++;

    endRound(winner);
  }
}

function getPlayerById(id) {
  if (p1 && p1.id === id) return p1;
  if (p2 && p2.id === id) return p2;
  return null;
}

/* ── Grenades ──────────────────────────────────────────────────── */
function useUtility(p, item) {
  if (item === 'medkit') {
    p.healTimer = 2;
    Audio.heal();
    return;
  }
  var dir = p.facingRight ? 1 : -1;
  grenades.push({
    x: p.x + p.w/2, y: p.y,
    vx: dir * 5, vy: -6,
    type: item,
    timer: 1.5,
    owner: p.id
  });
  Audio.shoot('pistol');
}

function updateGrenades(dt) {
  for (var i = grenades.length - 1; i >= 0; i--) {
    var g = grenades[i];
    g.vy += GRAVITY * 0.5 * (dt / FIXED_DT);
    g.x += g.vx * (dt / FIXED_DT);
    g.y += g.vy * (dt / FIXED_DT);
    g.timer -= dt;

    // Bounce off platforms
    for (var j = 0; j < currentMap.platforms.length; j++) {
      var pl = currentMap.platforms[j];
      if (g.x > pl.x && g.x < pl.x + pl.w && g.y > pl.y && g.y < pl.y + pl.h) {
        g.vy = -Math.abs(g.vy) * 0.5;
        g.vx *= 0.7;
        g.y = pl.y;
      }
    }
    if (g.y > H - 60) { g.y = H - 60; g.vy = -Math.abs(g.vy) * 0.4; g.vx *= 0.7; }

    if (g.timer <= 0) {
      var util = UTILITY[g.type];
      if (g.type === 'grenade') {
        Audio.explode();
        spawnParticles(g.x, g.y, '#ff8800', 24, 6, -3);
        spawnParticles(g.x, g.y, '#ffcc00', 12, 4, -2);
        screenShake = 8;
        [p1, p2].forEach(function(p) {
          if (!p || !p.alive) return;
          var dx = p.x + p.w/2 - g.x;
          var dy = p.y + p.h/2 - g.y;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < util.radius) {
            var dmg = Math.round(util.dmg * (1 - dist / util.radius));
            addDmgNumber(p.x + p.w/2, p.y, dmg, false);
            var wasAlive = p.alive;
            damagePlayer(p, dmg, getPlayerById(g.owner), false);
            if (wasAlive && !p.alive && p.id !== g.owner) achStats.grenadeKills++;
          }
        });
      } else if (g.type === 'flashbang') {
        Audio.flashbang();
        spawnParticles(g.x, g.y, '#ffffff', 10, 3, -1);
        [p1, p2].forEach(function(p) {
          if (!p || !p.alive) return;
          var dx = p.x + p.w/2 - g.x;
          var dy = p.y + p.h/2 - g.y;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < util.radius && p.id !== g.owner) {
            p.flashTimer = 2;
          }
        });
        flashAlpha = 0.8;
      }
      grenades.splice(i, 1);
    }
  }
}

/* ── Particles ─────────────────────────────────────────────────── */
function spawnParticles(x, y, color, count, speed, baseVy) {
  speed = speed || 4;
  baseVy = baseVy || -1;
  for (var i = 0; i < count; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * speed,
      vy: baseVy + (Math.random() - 0.5) * speed * 0.8,
      life: 0.3 + Math.random() * 0.5,
      color: color,
      size: 1.5 + Math.random() * 2.5
    });
  }
}

function updateParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx * (dt / FIXED_DT);
    p.y += p.vy * (dt / FIXED_DT);
    p.vy += GRAVITY * 0.3 * (dt / FIXED_DT);
    p.life -= dt;
    p.size *= (1 - 0.03 * (dt / FIXED_DT));
    if (p.life <= 0 || p.size < 0.3) particles.splice(i, 1);
  }
}

/* ── Dead Bodies ───────────────────────────────────────────────── */
function updateDeadBodies(dt) {
  for (var i = deadBodies.length - 1; i >= 0; i--) {
    var b = deadBodies[i];
    b.vy += GRAVITY * 0.6 * (dt / FIXED_DT);
    b.x += b.vx * (dt / FIXED_DT);
    b.y += b.vy * (dt / FIXED_DT);
    b.rot += b.rotV * (dt / FIXED_DT);
    b.alpha -= dt * 0.4;
    // Stop at ground
    if (b.y + b.h > H - 60) {
      b.y = H - 60 - b.h;
      b.vy = 0; b.vx *= 0.5;
      b.rotV *= 0.5;
    }
    if (b.alpha <= 0) deadBodies.splice(i, 1);
  }
}

/* ── Damage Numbers & Kill Feed ────────────────────────────────── */
function updateDmgNumbers(dt) {
  for (var i = dmgNumbers.length - 1; i >= 0; i--) {
    var d = dmgNumbers[i];
    d.y += d.vy * (dt / FIXED_DT);
    d.vy -= 0.05 * (dt / FIXED_DT);
    d.timer -= dt;
    if (d.timer <= 0) dmgNumbers.splice(i, 1);
  }
}

function updateKillFeed(dt) {
  for (var i = killFeed.length - 1; i >= 0; i--) {
    killFeed[i].timer -= dt;
    if (killFeed[i].timer <= 0) killFeed.splice(i, 1);
  }
}

/* ── Rendering ─────────────────────────────────────────────────── */
function cacheBg() {
  if (bgCanvas && bgMapName === (currentMap ? currentMap.name : '')) return;
  bgMapName = currentMap ? currentMap.name : '';
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = W; bgCanvas.height = H;
  bgCtx = bgCanvas.getContext('2d');

  var grad = bgCtx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#080c18');
  grad.addColorStop(0.5, '#0d1520');
  grad.addColorStop(1, currentMap ? currentMap.bg : '#0d1117');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, W, H);

  // Buildings
  bgCtx.fillStyle = '#0a0e18';
  for (var i = 0; i < BG_BUILDINGS.length; i++) {
    var b = BG_BUILDINGS[i];
    bgCtx.fillRect(b.x, H - 60 - b.h, b.w, b.h);
  }
  bgCtx.fillStyle = '#0c1220';
  for (var j = 0; j < BG_BUILDINGS.length; j++) {
    var b2 = BG_BUILDINGS[j];
    bgCtx.fillRect(b2.x + 5, H - 60 - b2.h * 0.7, b2.w + 10, b2.h * 0.7);
  }

  // Building windows (subtle dots)
  bgCtx.fillStyle = '#1a2030';
  for (var k = 0; k < BG_BUILDINGS.length; k++) {
    var bk = BG_BUILDINGS[k];
    for (var wy = H - 60 - bk.h + 10; wy < H - 70; wy += 16) {
      for (var wx = bk.x + 4; wx < bk.x + bk.w - 4; wx += 8) {
        if (Math.random() > 0.4) {
          bgCtx.fillStyle = Math.random() > 0.7 ? '#2a3548' : '#151c28';
          bgCtx.fillRect(wx, wy, 3, 4);
        }
      }
    }
  }
}

function drawBackground(time) {
  cacheBg();
  ctx.drawImage(bgCanvas, 0, 0);

  // Twinkling stars (drawn live for animation)
  for (var i = 0; i < bgStars.length; i++) {
    var s = bgStars[i];
    var twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * 0.001 + s.phase));
    ctx.globalAlpha = s.b * twinkle;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

function drawPlatforms() {
  if (!currentMap) return;
  for (var i = 0; i < currentMap.platforms.length; i++) {
    var p = currentMap.platforms[i];
    // Platform body with slight gradient
    var pg = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    pg.addColorStop(0, '#222c3c');
    pg.addColorStop(1, '#161e2c');
    ctx.fillStyle = pg;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Top edge highlight
    ctx.fillStyle = '#3a4860';
    ctx.fillRect(p.x, p.y, p.w, 2);
    // Bottom shadow
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(p.x, p.y + p.h - 1, p.w, 1);
    // Side edges
    ctx.fillStyle = '#1a2230';
    ctx.fillRect(p.x, p.y + 2, 1, p.h - 3);
    ctx.fillRect(p.x + p.w - 1, p.y + 2, 1, p.h - 3);
  }
}

function drawPlayer(p) {
  if (!p || !p.alive) return;
  var ph = p.crouching ? CROUCH_H : PLAYER_H;
  var cx = p.x + p.w / 2;
  var px = p.x, py = p.y;

  ctx.save();

  // Hit flash (white overlay)
  if (p.hitFlash > 0) {
    ctx.globalAlpha = 0.4 + p.hitFlash * 4;
  }

  // Flash effect (blinded)
  if (p.flashTimer > 0) {
    ctx.globalAlpha = Math.max(0.3, 1 - p.flashTimer * 0.3);
  }

  // Dash afterimage
  if (p.dashTimer > 0) {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = p.color;
    ctx.fillRect(px + 2 - p.dashDir * 8, py + PLAYER_HEAD * 2, p.w - 4, ph - PLAYER_HEAD * 2);
    ctx.fillRect(px + 2 - p.dashDir * 16, py + PLAYER_HEAD * 2, p.w - 4, ph - PLAYER_HEAD * 2);
    ctx.globalAlpha = 1;
  }

  // Landing squash-stretch
  var scaleX = 1, scaleY = 1;
  if (p.landSquash > 0) {
    scaleX = 1 + p.landSquash * 0.8;
    scaleY = 1 - p.landSquash;
  }

  ctx.translate(cx, py + ph);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-cx, -(py + ph));

  // Body
  ctx.fillStyle = p.hitFlash > 0 ? '#ffffff' : p.color;
  ctx.fillRect(px + 2, py + PLAYER_HEAD * 2, p.w - 4, ph - PLAYER_HEAD * 2);

  // Head
  ctx.fillStyle = p.hitFlash > 0 ? '#ffffff' : p.headColor;
  ctx.beginPath();
  ctx.arc(cx, py + PLAYER_HEAD, PLAYER_HEAD, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  var eyeDir = p.facingRight ? 1 : -1;
  ctx.fillStyle = p.eyeColor;
  ctx.fillRect(cx + eyeDir * 2, py + PLAYER_HEAD - 2, 2, 2);
  if (!p.crouching) {
    // Pupil
    ctx.fillStyle = '#111111';
    ctx.fillRect(cx + eyeDir * 2.5 + eyeDir * 0.5, py + PLAYER_HEAD - 1.5, 1, 1);
  }

  // Weapon with recoil
  var recoilOff = p.recoilTimer > 0 ? (p.facingRight ? -3 : 3) * (p.recoilTimer / 0.12) : 0;
  var wx = p.facingRight ? px + p.w : px;
  var wy = py + PLAYER_HEAD + 6;
  var wLen = p.weapon === 'knife' ? 10 : (p.weapon === 'sniper' ? 20 : 14);
  var wDir = p.facingRight ? 1 : -1;
  ctx.strokeStyle = WEAPONS[p.weapon] ? WEAPONS[p.weapon].color : '#888';
  ctx.lineWidth = p.weapon === 'sniper' ? 2.5 : 2;
  ctx.beginPath();
  ctx.moveTo(wx + recoilOff, wy);
  ctx.lineTo(wx + wDir * wLen + recoilOff, wy);
  ctx.stroke();

  // Legs
  ctx.strokeStyle = p.hitFlash > 0 ? '#ffffff' : p.color;
  ctx.lineWidth = 2;
  var legY = py + ph;
  var legOff = Math.sin(p.walkFrame) * 3;
  if (!p.onGround) legOff = 2; // legs slightly apart when airborne
  else if (Math.abs(p.vx) < 0.5) legOff = 0;
  ctx.beginPath();
  ctx.moveTo(cx - 3, legY - 4);
  ctx.lineTo(cx - 5, legY + legOff);
  ctx.moveTo(cx + 3, legY - 4);
  ctx.lineTo(cx + 5, legY - legOff);
  ctx.stroke();

  ctx.restore();

  // HP bar above head
  var barW = 24, barH = 3;
  var barX = cx - barW / 2, barY = py - 8;
  ctx.fillStyle = '#331111';
  ctx.fillRect(barX, barY, barW, barH);
  var hpFrac = p.hp / HP_MAX;
  ctx.fillStyle = hpFrac > 0.6 ? '#44cc44' : (hpFrac > 0.3 ? '#cccc44' : '#cc4444');
  ctx.fillRect(barX, barY, barW * hpFrac, barH);
  // HP bar border
  ctx.strokeStyle = '#22334488';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(barX, barY, barW, barH);

  // Heal indicator
  if (p.healTimer > 0) {
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+', cx, py - 14);
    // Heal particles
    if (Math.random() < 0.15) {
      spawnParticles(cx, py + ph/2, '#44ff88', 1, 2, -1.5);
    }
  }
}

function drawDeadBodies() {
  for (var i = 0; i < deadBodies.length; i++) {
    var b = deadBodies[i];
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.translate(b.x + b.w/2, b.y + b.h/2);
    ctx.rotate(b.rot);
    // Body
    ctx.fillStyle = b.color;
    ctx.fillRect(-b.w/2 + 2, -b.h/2 + PLAYER_HEAD, b.w - 4, b.h - PLAYER_HEAD);
    // Head
    ctx.fillStyle = b.headColor;
    ctx.beginPath();
    ctx.arc(0, -b.h/2 + PLAYER_HEAD, PLAYER_HEAD, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBullets() {
  for (var i = 0; i < bullets.length; i++) {
    var b = bullets[i];
    // Bullet trail
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = b.isSniper ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(b.prevX, b.prevY);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Bullet head
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.color;
    if (b.isSniper) {
      ctx.fillRect(b.x - 5, b.y - 1, 10, 2);
    } else {
      ctx.fillRect(b.x - 2, b.y - 1, 4, 2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawGrenades() {
  for (var i = 0; i < grenades.length; i++) {
    var g = grenades[i];
    // Trail
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = g.type === 'grenade' ? '#ff8800' : '#ffffff';
    ctx.beginPath();
    ctx.arc(g.x - g.vx * 0.5, g.y - g.vy * 0.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(g.x - g.vx, g.y - g.vy, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.globalAlpha = 1;
    ctx.fillStyle = g.type === 'grenade' ? '#ff6600' : '#ffffff';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
    ctx.fill();
    // Fuse indicator (blinks faster as timer decreases)
    if (g.timer < 0.5 && Math.sin(g.timer * 30) > 0) {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles() {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.globalAlpha = Math.min(1, p.life * 2.5);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawDmgNumbers() {
  for (var i = 0; i < dmgNumbers.length; i++) {
    var d = dmgNumbers[i];
    ctx.globalAlpha = Math.min(1, d.timer * 2);
    ctx.fillStyle = d.color;
    ctx.font = 'bold ' + d.size + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(d.text, d.x, d.y);
  }
  ctx.globalAlpha = 1;
}

function drawKillFeed() {
  ctx.textAlign = 'right';
  ctx.font = '9px monospace';
  for (var i = 0; i < killFeed.length; i++) {
    var k = killFeed[i];
    ctx.globalAlpha = Math.min(1, k.timer);
    ctx.fillStyle = '#0a0e18cc';
    var tw = ctx.measureText(k.text).width + 8;
    ctx.fillRect(W - tw - 6, 38 + i * 16, tw + 4, 14);
    ctx.fillStyle = k.color;
    ctx.fillText(k.text, W - 8, 48 + i * 16);
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  // Top bar
  ctx.fillStyle = '#0a0e18cc';
  ctx.fillRect(0, 0, W, 32);

  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';

  ctx.fillStyle = '#8899aa';
  ctx.fillText(_t('rvRound') + ' ' + roundNum + '/' + ROUNDS_TO_WIN, 8, 14);

  ctx.fillStyle = '#4488ff';
  ctx.fillText(_t('rvP1') + ': ' + p1Score, 130, 14);
  ctx.fillStyle = '#ff4444';
  ctx.fillText((numPlayers === 1 ? _t('rvBot') : _t('rvP2')) + ': ' + p2Score, 210, 14);

  ctx.fillStyle = '#ffcc00';
  ctx.font = '10px monospace';
  ctx.fillText('$' + (p1 ? p1.credits : 0), 130, 27);
  ctx.fillStyle = '#ffaa00';
  ctx.fillText('$' + (p2 ? p2.credits : 0), 210, 27);

  ctx.fillStyle = '#aabbcc';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(_t('rvKills') + ': ' + matchKills, W - 8, 14);

  // Bottom bar
  if (p1 && state === 'playing') {
    ctx.fillStyle = '#0a0e18cc';
    ctx.fillRect(0, H - 28, W, 28);

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    var wName = WEAPONS[p1.weapon] ? WEAPONS[p1.weapon].name : p1.weapon;
    ctx.fillStyle = WEAPONS[p1.weapon] ? WEAPONS[p1.weapon].color : '#888';
    ctx.fillText(wName, 8, H - 10);

    if (p1.weapon !== 'knife') {
      var ammoCount = WEAPONS[p1.weapon].ammo === Infinity ? _t('rvINF') : (p1.ammo[p1.weapon] || 0) + '';
      ctx.fillStyle = (p1.ammo[p1.weapon] && p1.ammo[p1.weapon] <= 5) ? '#ff4444' : '#aabbcc';
      ctx.fillText(_t('rvAmmo') + ': ' + ammoCount, 80, H - 10);
    }

    ctx.fillStyle = p1.hp > 60 ? '#44cc44' : (p1.hp > 30 ? '#cccc44' : '#cc4444');
    ctx.fillText(_t('rvHP') + ': ' + p1.hp, 170, H - 10);

    if (p1.utility.length > 0) {
      ctx.fillStyle = '#88aacc';
      ctx.fillText(p1.utility.map(function(u) { return UTILITY[u].name.charAt(0); }).join(''), 240, H - 10);
    }

    // Dash indicator
    var dashReady = p1.dashCooldown <= 0 && p1.dashTimer <= 0;
    ctx.fillStyle = dashReady ? '#44ccff' : '#334455';
    ctx.fillText(_t('rvDash'), 300, H - 10);

    ctx.fillStyle = '#556677';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(_t('rvControlsHint'), W - 5, H - 10);
  }
}

/* ── Buy Phase Rendering ───────────────────────────────────────── */
function drawBuyPanel(player, cursorIdx, ox, pw, label, accentColor, ctrlHint) {
  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 12px monospace';
  ctx.fillText(label, ox + pw/2, 90);

  ctx.fillStyle = '#ffcc00';
  ctx.font = '11px monospace';
  ctx.fillText('$' + (player ? player.credits : 0), ox + pw/2, 106);

  // Loadout
  if (player) {
    ctx.fillStyle = '#667788';
    ctx.font = '9px monospace';
    var primary = player.primary ? WEAPONS[player.primary].name : _t('rvNone');
    ctx.fillText(primary + ' + ' + _t('rvPistol'), ox + pw/2, 120);
    if (player.utility.length > 0) {
      ctx.fillText(player.utility.map(function(u) { return UTILITY[u].name; }).join(', '), ox + pw/2, 132);
    }
  }

  // Item list
  ctx.textAlign = 'left';
  var itemH = numPlayers === 2 ? 40 : 48;
  var startY = numPlayers === 2 ? 142 : 160;
  var itemW = pw - 10;

  for (var i = 0; i < BUY_ITEMS.length; i++) {
    var itemId = BUY_ITEMS[i];
    var isWeapon = !!WEAPONS[itemId];
    var item = isWeapon ? WEAPONS[itemId] : UTILITY[itemId];
    var iy = startY + i * itemH;
    var selected = cursorIdx === i;

    // Background
    ctx.fillStyle = selected ? '#1a2538' : '#0d1320';
    ctx.fillRect(ox + 5, iy, itemW, itemH - 4);
    if (selected) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + 5, iy, itemW, itemH - 4);
    }

    var affordable = player && item.cost <= player.credits;
    var owned = isWeapon && player && player.primary === itemId;

    // Name
    ctx.fillStyle = owned ? '#44cc44' : (affordable ? '#ddeeff' : '#445566');
    ctx.font = 'bold ' + (numPlayers === 2 ? '10' : '12') + 'px monospace';
    ctx.fillText(item.name, ox + 10, iy + (numPlayers === 2 ? 14 : 16));

    // Cost + stats
    ctx.fillStyle = affordable ? '#ffcc00' : '#664400';
    ctx.font = (numPlayers === 2 ? '8' : '10') + 'px monospace';
    ctx.fillText('$' + item.cost, ox + 10, iy + (numPlayers === 2 ? 28 : 32));

    if (numPlayers === 1) {
      if (isWeapon) {
        ctx.fillStyle = '#667788';
        ctx.fillText('DMG:' + item.dmg + ' RPM:' + item.rate, ox + 90, iy + 32);
      } else {
        ctx.fillStyle = '#667788';
        if (item.heal) ctx.fillText(_t('rvHeals') + ' ' + item.heal + ' ' + _t('rvHP'), ox + 90, iy + 32);
        else if (item.dmg) ctx.fillText('DMG:' + item.dmg + ' R:' + item.radius, ox + 90, iy + 32);
        else ctx.fillText(_t('rvBlindsEnemies'), ox + 90, iy + 32);
      }
    }

    if (owned) {
      ctx.fillStyle = '#44cc44';
      ctx.font = (numPlayers === 2 ? '8' : '10') + 'px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(_t('rvOwn'), ox + 5 + itemW - 4, iy + (numPlayers === 2 ? 14 : 20));
      ctx.textAlign = 'left';
    }
  }

  // Controls hint
  ctx.textAlign = 'center';
  ctx.fillStyle = '#445566';
  ctx.font = '8px monospace';
  ctx.fillText(ctrlHint, ox + pw/2, H - 10);
}

function drawBuyPhase() {
  ctx.fillStyle = '#000000cc';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(_t('rvBuyPhase'), W/2, 40);

  ctx.fillStyle = '#ffcc00';
  ctx.font = '12px monospace';
  ctx.fillText(_t('rvRound') + ' ' + roundNum + ' \u2014 ' + Math.ceil(buyTimer) + 's', W/2, 60);

  if (numPlayers === 2) {
    // Split screen: P1 left half, P2 right half
    var halfW = W / 2;
    // Divider line
    ctx.strokeStyle = '#2a3040';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfW, 70);
    ctx.lineTo(halfW, H - 20);
    ctx.stroke();

    drawBuyPanel(p1, buyCursor.p1, 0, halfW, _t('rvP1'), '#4488ff', _t('rvCtrlP1Buy'));
    drawBuyPanel(p2, buyCursor.p2, halfW, halfW, _t('rvP2'), '#ff4444', _t('rvCtrlP2Buy'));
  } else {
    drawBuyPanel(p1, buyCursor.p1, 0, W, _t('rvYourLoadout'), '#88ccff', _t('rvCtrlBrowse'));
  }
}

/* ── Countdown Rendering ──────────────────────────────────────── */
function drawCountdown() {
  var num = Math.ceil(countdownTimer);
  if (num <= 0) num = _t('rvGo');

  ctx.textAlign = 'center';
  ctx.fillStyle = num === _t('rvGo') ? '#44ff44' : '#ff6b35';
  ctx.font = 'bold ' + (num === _t('rvGo') ? 48 : 64) + 'px monospace';

  // Pulsing scale effect
  var pulse = 1 + (countdownTimer % 1) * 0.15;
  ctx.save();
  ctx.translate(W/2, H/2 - 40);
  ctx.scale(pulse, pulse);
  ctx.fillText('' + num, 0, 0);
  ctx.restore();

  ctx.fillStyle = '#8899aa';
  ctx.font = '12px monospace';
  ctx.fillText(_t('rvGetReady'), W/2, H/2 + 20);
}

/* ── Screen States ─────────────────────────────────────────────── */
function drawMenu(time) {
  drawBackground(time);

  ctx.textAlign = 'center';

  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 36px monospace';
  ctx.fillText(_t('rvTitle'), W/2, 180);

  ctx.fillStyle = '#8899aa';
  ctx.font = '12px monospace';
  ctx.fillText(_t('rvSubtitle'), W/2, 210);

  ctx.font = '10px monospace';
  ctx.fillText(_t('rvTagline'), W/2, 235);

  // Animated characters
  var t = time / 1000;
  // P1 idle bob
  var p1y = 270 + Math.sin(t * 2) * 3;
  ctx.fillStyle = '#4488ff';
  ctx.fillRect(103, p1y + 16, 14, 22);
  ctx.beginPath(); ctx.arc(110, p1y + 8, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(112, p1y + 6, 2, 2); // eye
  // weapon
  ctx.strokeStyle = '#ffdd44';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(117, p1y + 14); ctx.lineTo(131, p1y + 14); ctx.stroke();

  // P2 idle bob
  var p2y = 270 + Math.sin(t * 2 + 1) * 3;
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(237, p2y + 16, 14, 22);
  ctx.beginPath(); ctx.arc(244, p2y + 8, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(240, p2y + 6, 2, 2); // eye
  ctx.strokeStyle = '#44ddff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(237, p2y + 14); ctx.lineTo(223, p2y + 14); ctx.stroke();

  // Buttons
  var btns = [_t('rv1Player'), _t('rv2Players')];
  for (var i = 0; i < 2; i++) {
    var by = 340 + i * 70;
    ctx.fillStyle = menuSel === i ? '#1a2538' : '#0d1320';
    ctx.fillRect(80, by, 200, 50);
    ctx.strokeStyle = menuSel === i ? '#ff6b35' : '#1a2538';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, by, 200, 50);
    ctx.fillStyle = menuSel === i ? '#ff6b35' : '#8899aa';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(btns[i], W/2, by + 30);
  }

  ctx.fillStyle = '#445566';
  ctx.font = '10px monospace';
  ctx.fillText(_t('rvCtrlMenuSelect'), W/2, 520);
  ctx.fillText(_t('rvBestKills') + ': ' + bestKills, W/2, 545);
}

function drawModeSelect() {
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(_t('rvInputMode'), W/2, 100);

  ctx.fillStyle = '#8899aa';
  ctx.font = '11px monospace';
  ctx.fillText(_t('rvChooseControls'), W/2, 130);

  var modes = [
    { name: _t('rvKeyboard'), desc: _t('rvKeyboardDesc') },
    { name: _t('rvTouch'), desc: _t('rvTouchDesc') },
    { name: _t('rvMixed'), desc: _t('rvMixedDesc') }
  ];

  for (var i = 0; i < modes.length; i++) {
    var by = 300 + i * 60;
    ctx.fillStyle = modeSel === i ? '#1a2538' : '#0d1320';
    ctx.fillRect(60, by, 240, 45);
    ctx.strokeStyle = modeSel === i ? '#ff6b35' : '#1a2538';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, by, 240, 45);

    ctx.fillStyle = modeSel === i ? '#ff6b35' : '#8899aa';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(modes[i].name, W/2, by + 18);
    ctx.fillStyle = '#556677';
    ctx.font = '9px monospace';
    ctx.fillText(modes[i].desc, W/2, by + 35);
  }

  ctx.fillStyle = '#445566';
  ctx.font = '10px monospace';
  ctx.fillText(_t('rvCtrlConfirm'), W/2, 530);
}

function drawRoundEnd() {
  ctx.fillStyle = '#000000aa';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  var winColor = roundWinner === 1 ? '#4488ff' : '#ff4444';
  var winText = roundWinner === 1 ? (numPlayers === 1 ? _t('rvYouWin') : _t('rvP1Wins')) : (numPlayers === 1 ? _t('rvBotWins') : _t('rvP2Wins'));

  ctx.fillStyle = winColor;
  ctx.font = 'bold 28px monospace';
  ctx.fillText(_t('rvRound') + ' ' + (roundNum), W/2, 260);
  ctx.font = 'bold 22px monospace';
  ctx.fillText(winText, W/2, 300);

  // Score pips
  ctx.fillStyle = '#aabbcc';
  ctx.font = '14px monospace';
  ctx.fillText(_t('rvP1') + ': ' + p1Score + '  \u2014  ' + (numPlayers === 1 ? _t('rvBot') : _t('rvP2')) + ': ' + p2Score, W/2, 340);

  // Round score pips (visual dots)
  for (var i = 0; i < ROUNDS_TO_WIN; i++) {
    ctx.fillStyle = i < p1Score ? '#4488ff' : '#1a2030';
    ctx.beginPath();
    ctx.arc(W/2 - 50 + i * 12, 365, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (var j = 0; j < ROUNDS_TO_WIN; j++) {
    ctx.fillStyle = j < p2Score ? '#ff4444' : '#1a2030';
    ctx.beginPath();
    ctx.arc(W/2 + 50 - j * 12, 365, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMatchEnd() {
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  var winner = p1Score >= ROUNDS_TO_WIN ? 1 : 2;
  var winColor = winner === 1 ? '#4488ff' : '#ff4444';
  var winText = winner === 1 ? (numPlayers === 1 ? _t('rvVictory') : _t('rvP1Wins') + '!') : (numPlayers === 1 ? _t('rvDefeat') : _t('rvP2Wins') + '!');

  ctx.fillStyle = winColor;
  ctx.font = 'bold 32px monospace';
  ctx.fillText(winText, W/2, 200);

  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(_t('rvMatchOver'), W/2, 250);

  ctx.fillStyle = '#aabbcc';
  ctx.font = '14px monospace';
  ctx.fillText(_t('rvFinalScore') + ': ' + p1Score + ' - ' + p2Score, W/2, 300);
  ctx.fillText(_t('rvTotalKills') + ': ' + matchKills, W/2, 330);

  if (matchKills >= bestKills && matchKills > 0) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(_t('rvNewBest'), W/2, 360);
  }

  ctx.fillStyle = '#556677';
  ctx.font = '12px monospace';
  ctx.fillText(_t('rvContinue'), W/2, 450);
}

/* ── Touch Control Overlay ─────────────────────────────────────── */
function drawTouchControls() {
  if (inputMode === 'keyboard' || state !== 'playing') return;
  ctx.globalAlpha = 0.25;
  for (var i = 0; i < touchButtons.length; i++) {
    var btn = touchButtons[i];
    var pressed = touchState[btn.id] && touchState[btn.id][btn.action];
    ctx.fillStyle = pressed ? '#ffffff44' : '#ffffff11';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/2 + 5);
  }
  ctx.globalAlpha = 1;
}

/* ── Main Game Loop ────────────────────────────────────────────── */
var lastTime = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  var frameDt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Screen shake
  var shakeX = 0, shakeY = 0;
  if (screenShake > 0) {
    shakeX = (Math.random() - 0.5) * screenShake;
    shakeY = (Math.random() - 0.5) * screenShake;
    screenShake *= 0.85;
    if (screenShake < 0.3) screenShake = 0;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  switch (state) {
    case 'menu':
      drawMenu(timestamp);
      break;

    case 'mode_select':
      drawModeSelect();
      break;

    case 'buy_phase':
      drawBackground(timestamp);
      drawPlatforms();
      drawPlayer(p1);
      drawPlayer(p2);
      drawBuyPhase();

      buyTimer -= frameDt;
      if (buyTimer <= 0) {
        if (numPlayers === 1) botBuy();
        startCountdown();
      }
      break;

    case 'countdown':
      drawBackground(timestamp);
      drawPlatforms();
      drawPlayer(p1);
      drawPlayer(p2);
      drawHUD();
      drawCountdown();

      countdownTimer -= frameDt;
      if (countdownTimer <= 0) {
        startPlaying();
      }
      break;

    case 'playing':
      // Fixed timestep physics
      accumulator += frameDt;
      while (accumulator >= FIXED_DT) {
        updateInputs();
        updatePlayer(p1, FIXED_DT);
        if (numPlayers === 2) {
          updatePlayer(p2, FIXED_DT);
        } else {
          updateBot(FIXED_DT);
          if (p2 && p2.alive) updatePlayer(p2, FIXED_DT);
        }
        updateBullets(FIXED_DT);
        updateGrenades(FIXED_DT);
        accumulator -= FIXED_DT;
        // Break out if state changed (round ended)
        if (state !== 'playing') break;
      }

      updateParticles(frameDt);
      updateDeadBodies(frameDt);
      updateDmgNumbers(frameDt);
      updateKillFeed(frameDt);

      drawBackground(timestamp);
      drawPlatforms();
      drawDeadBodies();
      drawBullets();
      drawPlayer(p1);
      drawPlayer(p2);
      drawGrenades();
      drawParticles();
      drawDmgNumbers();
      drawHUD();
      drawKillFeed();
      drawTouchControls();

      // Flash overlay
      if (flashAlpha > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha + ')';
        ctx.fillRect(0, 0, W, H);
        flashAlpha -= frameDt * 2;
        if (flashAlpha < 0) flashAlpha = 0;
      }
      break;

    case 'round_end':
      drawBackground(timestamp);
      drawPlatforms();
      drawDeadBodies();
      updateDeadBodies(frameDt);
      drawParticles();
      updateParticles(frameDt);
      drawRoundEnd();

      roundEndTimer -= frameDt;
      if (roundEndTimer <= 0) {
        if (p1Score >= ROUNDS_TO_WIN || p2Score >= ROUNDS_TO_WIN) {
          endMatch();
        } else {
          startBuyPhase();
        }
      }
      break;

    case 'match_end':
      drawMatchEnd();
      break;
  }

  ctx.restore();
}

/* ── Achievements ──────────────────────────────────────────────── */
var RIVALS_ACHIEVEMENTS = [
  { id: 'first_elim', icon: '\uD83D\uDCA5',
    get title() { return I18N ? I18N.t('rvAchFirstElim') : 'First Blood'; },
    get desc()  { return I18N ? I18N.t('rvAchFirstElimDesc') : 'Get your first kill'; },
    check: function(s) { return s.totalKills >= 1; } },
  { id: 'flawless', icon: '\uD83D\uDEE1\uFE0F',
    get title() { return I18N ? I18N.t('rvAchFlawless') : 'Flawless'; },
    get desc()  { return I18N ? I18N.t('rvAchFlawlessDesc') : 'Win a round without taking damage'; },
    check: function(s) { return s.flawlessRounds >= 1; } },
  { id: 'knife_kill', icon: '\uD83D\uDD2A',
    get title() { return I18N ? I18N.t('rvAchKnifeKill') : 'Up Close'; },
    get desc()  { return I18N ? I18N.t('rvAchKnifeKillDesc') : 'Get a kill with the knife'; },
    check: function(s) { return s.knifeKills >= 1; } },
  { id: 'sniper_kill', icon: '\uD83C\uDFAF',
    get title() { return I18N ? I18N.t('rvAchSniperKill') : 'Sharpshooter'; },
    get desc()  { return I18N ? I18N.t('rvAchSniperKillDesc') : 'Get a headshot with the sniper'; },
    check: function(s) { return s.sniperHeadshots >= 1; } },
  { id: 'eco_ace', icon: '\uD83D\uDCB0',
    get title() { return I18N ? I18N.t('rvAchEcoAce') : 'Economist'; },
    get desc()  { return I18N ? I18N.t('rvAchEcoAceDesc') : 'Win a round with only the pistol'; },
    check: function(s) { return s.ecoRounds >= 1; } },
  { id: 'five_wins', icon: '\uD83C\uDFC6',
    get title() { return I18N ? I18N.t('rvAchFiveWins') : 'Champion'; },
    get desc()  { return I18N ? I18N.t('rvAchFiveWinsDesc') : 'Win a full match'; },
    check: function(s) { return s.matchesWon >= 1; } },
  { id: 'ten_wins', icon: '\u2B50',
    get title() { return I18N ? I18N.t('rvAchTenWins') : 'Veteran'; },
    get desc()  { return I18N ? I18N.t('rvAchTenWinsDesc') : 'Win 10 matches'; },
    check: function(s) { return s.matchesWon >= 10; } },
  { id: 'grenade_kill', icon: '\uD83D\uDCA3',
    get title() { return I18N ? I18N.t('rvAchGrenadeKill') : 'Boom'; },
    get desc()  { return I18N ? I18N.t('rvAchGrenadeKillDesc') : 'Get a kill with a grenade'; },
    check: function(s) { return s.grenadeKills >= 1; } },
  { id: 'comeback', icon: '\uD83D\uDD25',
    get title() { return I18N ? I18N.t('rvAchComeback') : 'Comeback King'; },
    get desc()  { return I18N ? I18N.t('rvAchComebackDesc') : 'Win after being down 1-4'; },
    check: function(s) { return s.comebacks >= 1; } },
  { id: 'max_credits', icon: '\uD83E\uDD11',
    get title() { return I18N ? I18N.t('rvAchMaxCredits') : 'Stacked'; },
    get desc()  { return I18N ? I18N.t('rvAchMaxCreditsDesc') : 'Reach max credits (3000)'; },
    check: function(s) { return s.maxCreditsReached; } }
];

var achStats = {
  totalKills: 0, knifeKills: 0, sniperHeadshots: 0, grenadeKills: 0,
  flawlessRounds: 0, ecoRounds: 0, matchesWon: 0, matchesPlayed: 0,
  comebacks: 0, maxCreditsReached: false
};
var achUnlocked = new Set();
var achQueue = [];
var achTimer = 0;

function loadAch() {
  try {
    var s = JSON.parse(localStorage.getItem('rivalsAch') || '{}');
    if (s.unlocked) achUnlocked = new Set(s.unlocked);
    if (s.stats) {
      for (var k in s.stats) { if (s.stats.hasOwnProperty(k)) achStats[k] = s.stats[k]; }
    }
  } catch (_) {}
}

function saveAch() {
  localStorage.setItem('rivalsAch', JSON.stringify({ unlocked: Array.from(achUnlocked), stats: achStats }));
}

function checkAch() {
  for (var i = 0; i < RIVALS_ACHIEVEMENTS.length; i++) {
    var a = RIVALS_ACHIEVEMENTS[i];
    if (!achUnlocked.has(a.id) && a.check(achStats)) {
      achUnlocked.add(a.id);
      achQueue.push(a);
      Audio.achievement();
      saveAch();
    }
  }
  showAchPopup();
}

function showAchPopup() {
  if (achTimer > 0 || achQueue.length === 0) return;
  var a = achQueue.shift();
  var popup = document.getElementById('achievementPopup');
  if (!popup) return;
  document.getElementById('achievementPopupIcon').textContent = a.icon;
  document.getElementById('achievementPopupTitle').textContent = a.title;
  document.getElementById('achievementPopupDesc').textContent = a.desc;
  popup.classList.add('show');
  achTimer = 3;
  setTimeout(function() {
    popup.classList.remove('show');
    setTimeout(function() { achTimer = 0; showAchPopup(); }, 500);
  }, 3000);
}

function renderAchList() {
  var list = document.getElementById('achievementsList');
  if (!list) return;
  list.innerHTML = '';
  for (var i = 0; i < RIVALS_ACHIEVEMENTS.length; i++) {
    var a = RIVALS_ACHIEVEMENTS[i];
    var el = document.createElement('div');
    el.className = 'achievement-item' + (achUnlocked.has(a.id) ? ' unlocked' : '');
    el.innerHTML = '<span class="achievement-item__icon">' + a.icon + '</span><span>' + a.title + '</span>';
    list.appendChild(el);
  }
}

/* ── Init ──────────────────────────────────────────────────────── */
loadAch();
bestEl.textContent = bestKills;

var achToggle = document.getElementById('achievementsToggle');
if (achToggle) {
  achToggle.addEventListener('click', function() {
    var list = document.getElementById('achievementsList');
    if (list) { list.classList.toggle('open'); renderAchList(); }
  });
}

if (muteBtn) {
  muteBtn.addEventListener('click', function() {
    Audio.init(); Audio.resume();
    muteBtn.textContent = Audio.toggle() ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  });
}

if (restartBtn) {
  restartBtn.addEventListener('click', function() {
    Audio.init(); Audio.resume();
    startMenu();
  });
}

if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', function() {
    var el = document.getElementById('gameContainer') || document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
    }
  });
}

var lbPanel = document.getElementById('leaderboardPanel');
if (lbPanel && typeof Leaderboard !== 'undefined') {
  lbPanel.appendChild(Leaderboard.createPanel('rivals'));
}
var lbToggle = document.getElementById('leaderboardToggle');
if (lbToggle && lbPanel) {
  lbToggle.addEventListener('click', function() {
    lbPanel.classList.toggle('lb-visible');
  });
}

document.addEventListener('arcade-restart', function() { startMenu(); });

if (typeof I18N !== 'undefined') {
  var header = document.querySelector('.game__header');
  if (header) I18N.createSelector(header);
  I18N.applyDOM();
  window.addEventListener('langchange', function () { I18N.applyDOM(); });
}

if (typeof Shop !== 'undefined') {
  Shop.init({
    gameId: 'rivals',
    buttonTarget: '#shopBtn',
    bundles: [{
      id: 'rivalspremium',
      name: 'Rivals Premium',
      desc: 'Gold & Neon weapon skins + Tactical player skin',
      price: '~$2',
      checkoutUrl: 'https://YOUR_STORE.lemonsqueezy.com/buy/RIVALS_PRODUCT_ID',
      items: ['rv_gold_weapons', 'rv_neon_weapons', 'rv_tactical_skin']
    }],
    codes: { 'RIVALSPRO2026': 'rivalspremium' },
    onUnlock: function(itemIds) {
      var arr; try { arr = JSON.parse(localStorage.getItem('rvShopUnlocked')) || []; } catch(e) { arr = []; }
      itemIds.forEach(function(id) { if (arr.indexOf(id) === -1) arr.push(id); });
      localStorage.setItem('rvShopUnlocked', JSON.stringify(arr));
    }
  });
}

requestAnimationFrame(gameLoop);

})();
