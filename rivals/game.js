/* ═══════════════════════════════════════════════════════════════════
   RIVALS — 2D Side-View Tactical Shooter
   Round-based 1P vs Bot / 2P Local — Canvas 360×640
   ═══════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

/* ── Constants ─────────────────────────────────────────────────── */
var W = 360, H = 640;
var GRAVITY = 0.45, JUMP_VEL = -9, DOUBLE_JUMP_VEL = -7.5;
var MOVE_ACCEL = 0.8, MAX_SPEED = 3.5, FRICTION = 0.82;
var CROUCH_SPEED = 1.8, WALL_SLIDE_SPEED = 1.5;
var PLAYER_W = 18, PLAYER_H = 38, PLAYER_HEAD = 8;
var CROUCH_H = 24;
var ROUNDS_TO_WIN = 5;
var BUY_TIME = 10; // seconds
var MAX_CREDITS = 3000;
var START_CREDITS = 800;
var KILL_REWARD = 200, WIN_REWARD = 300, LOSS_REWARD = 150;
var HP_MAX = 100;

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
  pistol:    { cat: 'secondary', cost: 0,   dmg: 20, rate: 3,   ammo: Infinity, speed: 8, spread: 0.03, color: '#ffdd44', name: 'Pistol' },
  smg:       { cat: 'primary',   cost: 200, dmg: 15, rate: 8,   ammo: 30,  speed: 9,  spread: 0.08, color: '#44ddff', name: 'SMG' },
  shotgun:   { cat: 'primary',   cost: 300, dmg: 8,  rate: 1,   ammo: 8,   speed: 7,  spread: 0.15, color: '#ff8844', name: 'Shotgun', pellets: 6 },
  rifle:     { cat: 'primary',   cost: 400, dmg: 30, rate: 4,   ammo: 25,  speed: 10, spread: 0.02, color: '#88ff44', name: 'Rifle' },
  sniper:    { cat: 'primary',   cost: 500, dmg: 90, rate: 0.7, ammo: 5,   speed: 14, spread: 0.005,color: '#ff44ff', name: 'Sniper' },
  knife:     { cat: 'melee',     cost: 0,   dmg: 50, rate: 2,   ammo: Infinity, range: 30, color: '#cccccc', name: 'Knife' }
};
var UTILITY = {
  grenade:   { cost: 100, dmg: 60,  radius: 60, name: 'Grenade' },
  flashbang: { cost: 50,  dmg: 0,   radius: 80, name: 'Flashbang' },
  medkit:    { cost: 150, heal: 50, name: 'Medkit' }
};
var PRIMARY_LIST = ['smg', 'shotgun', 'rifle', 'sniper'];
var UTILITY_LIST = ['grenade', 'flashbang', 'medkit'];
var BUY_ITEMS = PRIMARY_LIST.concat(UTILITY_LIST);

/* ── Maps ──────────────────────────────────────────────────────── */
var MAPS = [
  { name: 'Warehouse', bg: '#0d1117', platforms: [
    { x: 0, y: 580, w: 360, h: 60 },     // ground
    { x: 40, y: 460, w: 80, h: 14 },
    { x: 240, y: 460, w: 80, h: 14 },
    { x: 130, y: 380, w: 100, h: 14 },
    { x: 20, y: 310, w: 70, h: 14 },
    { x: 270, y: 310, w: 70, h: 14 },
    { x: 140, y: 250, w: 80, h: 14 },
    // cover crates
    { x: 90, y: 556, w: 24, h: 24 },
    { x: 246, y: 556, w: 24, h: 24 }
  ]},
  { name: 'Rooftops', bg: '#0a0e1a', platforms: [
    { x: 0, y: 590, w: 120, h: 50 },
    { x: 240, y: 590, w: 120, h: 50 },
    { x: 130, y: 580, w: 100, h: 10 },    // thin bridge
    { x: 30, y: 480, w: 90, h: 14 },
    { x: 240, y: 480, w: 90, h: 14 },
    { x: 140, y: 430, w: 80, h: 14 },
    { x: 50, y: 350, w: 70, h: 14 },
    { x: 240, y: 350, w: 70, h: 14 },
    { x: 120, y: 280, w: 120, h: 14 },
    { x: 60, y: 200, w: 60, h: 14 },
    { x: 240, y: 200, w: 60, h: 14 }
  ]},
  { name: 'Bunker', bg: '#0e0c14', platforms: [
    { x: 0, y: 580, w: 360, h: 60 },     // ground
    { x: 0, y: 440, w: 100, h: 14 },
    { x: 260, y: 440, w: 100, h: 14 },
    { x: 100, y: 490, w: 160, h: 14 },
    { x: 60, y: 350, w: 100, h: 14 },
    { x: 200, y: 350, w: 100, h: 14 },
    { x: 130, y: 300, w: 100, h: 14 },
    { x: 0, y: 230, w: 80, h: 14 },
    { x: 280, y: 230, w: 80, h: 14 },
    { x: 140, y: 180, w: 80, h: 14 },
    // walls
    { x: 150, y: 440, w: 10, h: 50 },
    { x: 200, y: 440, w: 10, h: 50 }
  ]}
];

/* ── Game State ────────────────────────────────────────────────── */
var state = 'menu'; // menu, mode_select, buy_phase, playing, round_end, match_end
var numPlayers = 1;
var inputMode = 'keyboard'; // keyboard, touch, mixed
var currentMap = null;
var roundNum = 0;
var p1Score = 0, p2Score = 0;
var roundWinner = 0;
var buyTimer = 0;
var roundEndTimer = 0;
var matchKills = 0;
var bestKills = parseInt(localStorage.getItem('rivalsBest')) || 0;
var totalWins = parseInt(localStorage.getItem('rivalsTotalWins')) || 0;
var particles = [];
var bullets = [];
var grenades = [];
var screenShake = 0;
var flashAlpha = 0;

/* ── Players ───────────────────────────────────────────────────── */
function createPlayer(id, x, facingRight) {
  return {
    id: id,
    x: x, y: 400, vx: 0, vy: 0,
    w: PLAYER_W, h: PLAYER_H,
    hp: HP_MAX,
    alive: true,
    onGround: false,
    jumps: 0,
    crouching: false,
    facingRight: facingRight,
    weapon: 'pistol',
    primary: null,
    ammo: {},
    fireTimer: 0,
    utility: [],
    credits: START_CREDITS,
    color: id === 1 ? '#4488ff' : '#ff4444',
    headColor: id === 1 ? '#6699ff' : '#ff6666',
    // Input state
    input: { left: false, right: false, up: false, down: false, shoot: false, switchWeapon: false, useUtility: false },
    // animation
    walkFrame: 0,
    healTimer: 0,
    flashTimer: 0
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
  // P1 touch (left half)
  if (inputMode === 'touch' || inputMode === 'mixed_p1touch') {
    touchButtons.push({ id: 'p1', action: 'left',  x: margin, y: bottomY, w: btnW, h: btnH, label: '<' });
    touchButtons.push({ id: 'p1', action: 'right', x: margin + btnW + 4, y: bottomY, w: btnW, h: btnH, label: '>' });
    touchButtons.push({ id: 'p1', action: 'up',    x: margin + (btnW+4)/2, y: bottomY - btnH - 4, w: btnW, h: btnH, label: '^' });
    touchButtons.push({ id: 'p1', action: 'shoot', x: margin, y: bottomY - (btnH+4)*2, w: btnW*2+4, h: btnH, label: 'FIRE' });
    touchButtons.push({ id: 'p1', action: 'down',  x: margin + btnW*2 + 12, y: bottomY, w: btnW-10, h: btnH, label: 'v' });
  }
  // P2 touch (right half or full if 1P touch)
  if (inputMode === 'touch' && numPlayers === 2) {
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
  // Simple reset: check which buttons no longer have a touch
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
  // Reset all not active
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

/* Also handle mouse clicks on canvas for menu/buy */
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
    // Keyboard P1: WASD + F shoot + G utility + R switch
    p1.input.left = keys['a'] || keys['A'] || keys['ArrowLeft'] || touchState.p1.left;
    p1.input.right = keys['d'] || keys['D'] || keys['ArrowRight'] || touchState.p1.right;
    p1.input.up = keys['w'] || keys['W'] || keys[' '] || keys['ArrowUp'] || touchState.p1.up;
    p1.input.down = keys['s'] || keys['S'] || keys['ArrowDown'] || touchState.p1.down;
    p1.input.shoot = keys['f'] || keys['F'] || keys['j'] || keys['J'] || touchState.p1.shoot;
    p1.input.switchWeapon = keys['r'] || keys['R'];
    p1.input.useUtility = keys['g'] || keys['G'];
  }
  if (p2 && numPlayers === 2) {
    if (inputMode === 'keyboard') {
      p2.input.left = keys['ArrowLeft'];
      p2.input.right = keys['ArrowRight'];
      p2.input.up = keys['ArrowUp'];
      p2.input.down = keys['ArrowDown'];
      p2.input.shoot = keys['Enter'];
      p2.input.switchWeapon = keys['Shift'];
      p2.input.useUtility = keys['/'];
    } else if (inputMode === 'touch') {
      p2.input.left = touchState.p2.left;
      p2.input.right = touchState.p2.right;
      p2.input.up = touchState.p2.up;
      p2.input.down = touchState.p2.down;
      p2.input.shoot = touchState.p2.shoot;
    }
    // In 2P keyboard mode, P1 uses WASD+F, P2 uses arrows+Enter
    if (inputMode === 'keyboard' && numPlayers === 2) {
      // Override P1 to WASD only
      p1.input.left = keys['a'] || keys['A'] || touchState.p1.left;
      p1.input.right = keys['d'] || keys['D'] || touchState.p1.right;
      p1.input.up = keys['w'] || keys['W'] || keys[' '] || touchState.p1.up;
      p1.input.down = keys['s'] || keys['S'] || touchState.p1.down;
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
  // 1P button
  if (pos.x > 80 && pos.x < 280 && pos.y > 340 && pos.y < 390) { numPlayers = 1; inputMode = 'keyboard'; startMatch(); }
  // 2P button
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
  roundNum = 0; p1Score = 0; p2Score = 0; matchKills = 0;
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
    p.onGround = false; p.jumps = 0; p.crouching = false;
    p.fireTimer = 0; p.healTimer = 0; p.flashTimer = 0;
    p.facingRight = i === 0;
    // Reset ammo for current weapons
    if (p.primary) p.ammo[p.primary] = WEAPONS[p.primary].ammo;
    p.weapon = p.primary || 'pistol';
  });
  bullets = []; grenades = []; particles = [];
}

function getSpawns() {
  var ground = currentMap.platforms[0];
  return [
    { x: 40, y: ground.y - PLAYER_H },
    { x: W - 40 - PLAYER_W, y: ground.y - PLAYER_H }
  ];
}

function startPlaying() {
  state = 'playing';
  Audio.roundStart();
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
  // Update best
  if (matchKills > bestKills) {
    bestKills = matchKills;
    localStorage.setItem('rivalsBest', bestKills);
  }
  bestEl.textContent = bestKills;
  scoreEl.textContent = matchKills;

  // Leaderboard + Arcade integration
  if (typeof Leaderboard !== 'undefined') Leaderboard.submitScore('rivals', matchKills);
  if (typeof Arcade !== 'undefined') Arcade.onGameOver('rivals', matchKills);

  Audio.gameOver();
  checkAch();
  saveAch();
}

function startMenu() {
  state = 'menu'; menuSel = 0;
  p1 = null; p2 = null;
}

/* ── Buy Phase ─────────────────────────────────────────────────── */
var buyCursor = { p1: 0, p2: 0 };
var buyJustPressed = {};

function handleBuyKey(e) {
  var cursor = 'p1';
  var p = p1;
  // In 2P keyboard, arrows control P2 buy cursor
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
  // Buy items are drawn as a list; detect which was tapped
  for (var i = 0; i < BUY_ITEMS.length; i++) {
    var iy = 180 + i * 48;
    if (pos.x > 30 && pos.x < 330 && pos.y > iy && pos.y < iy + 40) {
      buyItem(p1, BUY_ITEMS[i]);
      Audio.buy();
    }
  }
}

function buyItem(p, itemId) {
  if (WEAPONS[itemId]) {
    var w = WEAPONS[itemId];
    if (w.cost > p.credits) return;
    if (w.cat === 'primary') {
      if (p.primary === itemId) return; // already owned
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
  // Check max credits achievement
  if (p === p1 && p.credits >= MAX_CREDITS) {
    achStats.maxCreditsReached = true;
    checkAch();
  }
}

/* ── Bot AI ────────────────────────────────────────────────────── */
var botState = 'patrol';
var botPatrolDir = 1;
var botThinkTimer = 0;
var botReactionTime = 0.5; // seconds, decreases with rounds

function updateBot(dt) {
  if (numPlayers !== 1 || !p2 || !p2.alive || state !== 'playing') return;

  botThinkTimer -= dt;
  if (botThinkTimer > 0) return;
  botThinkTimer = botReactionTime;

  var bot = p2, target = p1;
  if (!target.alive) { bot.input = { left: false, right: false, up: false, down: false, shoot: false }; return; }

  var dx = target.x - bot.x;
  var dy = target.y - bot.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var canSee = hasLineOfSight(bot, target);

  // Decide state
  if (bot.hp < 30 && dist < 150) botState = 'cover';
  else if (canSee && dist < getWeaponRange(bot.weapon)) botState = 'attack';
  else if (canSee) botState = 'chase';
  else botState = 'patrol';

  bot.input.left = false; bot.input.right = false;
  bot.input.up = false; bot.input.down = false;
  bot.input.shoot = false;

  switch (botState) {
    case 'patrol':
      if (botPatrolDir > 0) bot.input.right = true;
      else bot.input.left = true;
      if (bot.x < 30) botPatrolDir = 1;
      if (bot.x > W - 50) botPatrolDir = -1;
      // Random jump
      if (Math.random() < 0.05) bot.input.up = true;
      break;

    case 'chase':
      if (dx > 20) bot.input.right = true;
      else if (dx < -20) bot.input.left = true;
      bot.facingRight = dx > 0;
      // Jump to reach higher platforms
      if (dy < -40 && bot.onGround) bot.input.up = true;
      // Jump over gaps
      if (!isPlatformBelow(bot.x + (bot.input.right ? 20 : -20), bot.y + bot.h + 5) && bot.onGround) bot.input.up = true;
      break;

    case 'attack':
      bot.facingRight = dx > 0;
      bot.input.shoot = true;
      // Strafe slightly
      if (Math.random() < 0.3) {
        if (Math.random() < 0.5) bot.input.left = true;
        else bot.input.right = true;
      }
      // Crouch sometimes
      if (Math.random() < 0.1) bot.input.down = true;
      break;

    case 'cover':
      // Move away from target, crouch
      if (dx > 0) bot.input.left = true;
      else bot.input.right = true;
      bot.input.down = true;
      // Still shoot if facing
      if (canSee) bot.input.shoot = true;
      break;
  }

  // Difficulty scaling
  botReactionTime = Math.max(0.1, 0.5 - roundNum * 0.05);
}

function botBuy() {
  if (numPlayers !== 1 || !p2) return;
  var bot = p2;
  // Buy best affordable primary
  var primaries = ['sniper', 'rifle', 'shotgun', 'smg'];
  for (var i = 0; i < primaries.length; i++) {
    if (bot.credits >= WEAPONS[primaries[i]].cost && bot.primary !== primaries[i]) {
      buyItem(bot, primaries[i]);
      break;
    }
  }
  // Buy utility
  if (bot.credits >= 100 && bot.utility.length < 2) buyItem(bot, 'grenade');
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

  // Horizontal movement
  if (p.input.left) p.vx -= MOVE_ACCEL;
  if (p.input.right) p.vx += MOVE_ACCEL;
  if (!p.input.left && !p.input.right) p.vx *= FRICTION;
  if (p.vx > maxSpd) p.vx = maxSpd;
  if (p.vx < -maxSpd) p.vx = -maxSpd;
  if (Math.abs(p.vx) < 0.1) p.vx = 0;

  // Facing
  if (p.input.left) p.facingRight = false;
  if (p.input.right) p.facingRight = true;

  // Crouching
  p.crouching = p.input.down && p.onGround;

  // Gravity
  p.vy += GRAVITY;

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
      p.jumps = Math.min(p.jumps, 1); // Allow wall jump
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
    }
  }
  p._jumpHeld = p.input.up;

  // Apply velocity
  p.x += p.vx;
  p.y += p.vy;

  // Platform collision
  p.onGround = false;
  for (var j = 0; j < currentMap.platforms.length; j++) {
    var plat = currentMap.platforms[j];
    resolveCollision(p, plat, ph);
  }

  // Screen bounds
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (p.x + p.w > W) { p.x = W - p.w; p.vx = 0; }
  if (p.y + ph > H) { p.y = H - ph; p.vy = 0; p.onGround = true; p.jumps = 0; }

  // Walk animation
  if (Math.abs(p.vx) > 0.5 && p.onGround) p.walkFrame += 0.15;

  // Fire timer
  if (p.fireTimer > 0) p.fireTimer -= dt;

  // Heal timer
  if (p.healTimer > 0) {
    p.healTimer -= dt;
    if (p.healTimer <= 0) {
      p.hp = Math.min(HP_MAX, p.hp + 50);
      Audio.heal();
    }
  }

  // Flash timer
  if (p.flashTimer > 0) p.flashTimer -= dt;

  // Weapon switching (cycle: primary → pistol → knife)
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

  // Overlap amounts
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
    // Knife attack
    var target = p === p1 ? p2 : p1;
    if (target.alive) {
      var dx = target.x + target.w/2 - (p.x + p.w/2);
      var dy = target.y + target.h/2 - (p.y + p.h/2);
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < w.range && ((p.facingRight && dx > 0) || (!p.facingRight && dx < 0))) {
        damagePlayer(target, w.dmg, p, true);
        Audio.shoot('knife');
        // Knife particles
        spawnParticles(target.x + target.w/2, target.y + target.h/2, '#cccccc', 5);
      }
    }
    p.fireTimer = 1 / w.rate;
    return;
  }

  // Check ammo
  if (w.ammo !== Infinity) {
    if (!p.ammo[p.weapon] || p.ammo[p.weapon] <= 0) {
      p.weapon = 'pistol'; // Auto-switch to pistol
      return;
    }
    p.ammo[p.weapon]--;
  }

  var bx = p.x + (p.facingRight ? p.w + 2 : -4);
  var by = p.y + PLAYER_HEAD + 4;
  var dir = p.facingRight ? 1 : -1;

  if (w.pellets) {
    // Shotgun
    for (var i = 0; i < w.pellets; i++) {
      var angle = (Math.random() - 0.5) * w.spread * 2;
      bullets.push({ x: bx, y: by, vx: dir * w.speed * Math.cos(angle), vy: w.speed * Math.sin(angle) * (Math.random()-0.5), dmg: w.dmg, owner: p.id, color: w.color, life: 0.5 });
    }
  } else {
    var angle2 = (Math.random() - 0.5) * w.spread;
    bullets.push({ x: bx, y: by, vx: dir * w.speed, vy: w.speed * angle2, dmg: w.dmg, owner: p.id, color: w.color, life: 0.8, isSniper: p.weapon === 'sniper' });
  }

  // Muzzle flash
  spawnParticles(bx, by, '#ffff44', 3);
  Audio.shoot(p.weapon);
  p.fireTimer = 1 / w.rate;

  // Screen shake for heavy weapons
  if (p.weapon === 'sniper' || p.weapon === 'shotgun') screenShake = 4;
}

function updateBullets(dt) {
  for (var i = bullets.length - 1; i >= 0; i--) {
    var b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life -= dt;

    // Out of bounds or expired
    if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    // Platform collision
    var hitPlatform = false;
    for (var j = 0; j < currentMap.platforms.length; j++) {
      var pl = currentMap.platforms[j];
      if (b.x > pl.x && b.x < pl.x + pl.w && b.y > pl.y && b.y < pl.y + pl.h) {
        spawnParticles(b.x, b.y, '#888888', 3);
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
        // Headshot check (top 25% of body)
        var isHeadshot = b.y < t.y + th * 0.25;
        var dmg = isHeadshot ? b.dmg * 2 : b.dmg;
        damagePlayer(t, dmg, getPlayerById(b.owner), isHeadshot && b.isSniper);
        spawnParticles(b.x, b.y, t.color, 6);
        Audio.hit();
        screenShake = 2;
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

function damagePlayer(target, dmg, attacker, isSniperHeadshot) {
  if (target.flashTimer > 0) return; // Invulnerable during flash stun? No, just blinded
  target.hp -= dmg;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    // Kill reward
    if (attacker) {
      attacker.credits = Math.min(MAX_CREDITS, attacker.credits + KILL_REWARD);
      if (attacker === p1) {
        matchKills++;
        scoreEl.textContent = matchKills;
        achStats.totalKills++;
        // Check specific kill achievements
        if (attacker.weapon === 'knife') achStats.knifeKills++;
        if (isSniperHeadshot) achStats.sniperHeadshots++;
      }
    }
    Audio.kill();
    spawnParticles(target.x + target.w/2, target.y + target.h/2, target.color, 15);
    screenShake = 6;

    // Round over
    var winner = target === p2 ? 1 : 2;
    // Check flawless
    if (winner === 1 && p1.hp === HP_MAX) achStats.flawlessRounds++;
    // Check eco ace
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
  // Throw grenade/flashbang
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
    g.vy += GRAVITY * 0.5;
    g.x += g.vx;
    g.y += g.vy;
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

    // Floor bounce
    if (g.y > H - 60) { g.y = H - 60; g.vy = -Math.abs(g.vy) * 0.4; g.vx *= 0.7; }

    if (g.timer <= 0) {
      // Explode
      var util = UTILITY[g.type];
      if (g.type === 'grenade') {
        Audio.explode();
        spawnParticles(g.x, g.y, '#ff8800', 20);
        screenShake = 8;
        // Damage players in radius
        [p1, p2].forEach(function(p) {
          if (!p || !p.alive) return;
          var dx = p.x + p.w/2 - g.x;
          var dy = p.y + p.h/2 - g.y;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < util.radius) {
            var dmg = util.dmg * (1 - dist / util.radius);
            damagePlayer(p, Math.round(dmg), getPlayerById(g.owner), false);
            // Grenade kill tracking
            if (p !== getPlayerById(g.owner) && p.hp <= 0) achStats.grenadeKills++;
          }
        });
      } else if (g.type === 'flashbang') {
        Audio.flashbang();
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
function spawnParticles(x, y, color, count) {
  for (var i = 0; i < count; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      life: 0.3 + Math.random() * 0.5,
      color: color,
      size: 1.5 + Math.random() * 2.5
    });
  }
}

function updateParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += GRAVITY * 0.3;
    p.life -= dt;
    p.size *= 0.97;
    if (p.life <= 0 || p.size < 0.3) particles.splice(i, 1);
  }
}

/* ── Rendering ─────────────────────────────────────────────────── */
var bgStars = [];
for (var si = 0; si < 40; si++) {
  bgStars.push({ x: Math.random() * W, y: Math.random() * H * 0.6, s: 0.5 + Math.random() * 1.5, b: 0.3 + Math.random() * 0.7 });
}

function drawBackground() {
  // Gradient sky
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#080c18');
  grad.addColorStop(0.5, '#0d1520');
  grad.addColorStop(1, currentMap ? currentMap.bg : '#0d1117');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Parallax city silhouette
  ctx.fillStyle = '#0a0e18';
  // Buildings
  var buildings = [
    { x: 10, w: 30, h: 120 }, { x: 50, w: 25, h: 80 }, { x: 90, w: 40, h: 150 },
    { x: 140, w: 20, h: 100 }, { x: 175, w: 35, h: 130 }, { x: 220, w: 28, h: 90 },
    { x: 260, w: 45, h: 160 }, { x: 310, w: 30, h: 110 }
  ];
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i];
    ctx.fillRect(b.x, H - 60 - b.h, b.w, b.h);
  }
  ctx.fillStyle = '#0c1220';
  for (var j = 0; j < buildings.length; j++) {
    var b2 = buildings[j];
    ctx.fillRect(b2.x + 5, H - 60 - b2.h * 0.7, b2.w + 10, b2.h * 0.7);
  }
}

function drawPlatforms() {
  if (!currentMap) return;
  for (var i = 0; i < currentMap.platforms.length; i++) {
    var p = currentMap.platforms[i];
    // Main platform body
    ctx.fillStyle = '#1a2030';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Top edge highlight
    ctx.fillStyle = '#2a3548';
    ctx.fillRect(p.x, p.y, p.w, 2);
    // Side edges
    ctx.fillStyle = '#151c28';
    ctx.fillRect(p.x, p.y, 1, p.h);
    ctx.fillRect(p.x + p.w - 1, p.y, 1, p.h);
  }
}

function drawPlayer(p) {
  if (!p || !p.alive) return;
  var ph = p.crouching ? CROUCH_H : PLAYER_H;
  var cx = p.x + p.w / 2;
  var px = p.x, py = p.y;

  // Flash effect (white out when flashbanged)
  if (p.flashTimer > 0) {
    ctx.globalAlpha = 0.5;
  }

  // Body
  ctx.fillStyle = p.color;
  ctx.fillRect(px + 2, py + PLAYER_HEAD * 2, p.w - 4, ph - PLAYER_HEAD * 2);

  // Head
  ctx.fillStyle = p.headColor;
  ctx.beginPath();
  ctx.arc(cx, py + PLAYER_HEAD, PLAYER_HEAD, 0, Math.PI * 2);
  ctx.fill();

  // Weapon
  var wx = p.facingRight ? px + p.w : px;
  var wy = py + PLAYER_HEAD + 6;
  var wLen = p.weapon === 'knife' ? 10 : (p.weapon === 'sniper' ? 20 : 14);
  var wDir = p.facingRight ? 1 : -1;
  ctx.strokeStyle = WEAPONS[p.weapon] ? WEAPONS[p.weapon].color : '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wx, wy);
  ctx.lineTo(wx + wDir * wLen, wy);
  ctx.stroke();

  // Legs (walking animation)
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 2;
  var legY = py + ph;
  var legOff = Math.sin(p.walkFrame) * 3;
  if (!p.onGround || Math.abs(p.vx) < 0.5) legOff = 0;
  ctx.beginPath();
  ctx.moveTo(cx - 3, legY - 4);
  ctx.lineTo(cx - 5, legY + legOff);
  ctx.moveTo(cx + 3, legY - 4);
  ctx.lineTo(cx + 5, legY - legOff);
  ctx.stroke();

  ctx.globalAlpha = 1;

  // HP bar above head
  var barW = 24, barH = 3;
  var barX = cx - barW / 2, barY = py - 8;
  ctx.fillStyle = '#331111';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = p.hp > 60 ? '#44cc44' : (p.hp > 30 ? '#cccc44' : '#cc4444');
  ctx.fillRect(barX, barY, barW * (p.hp / HP_MAX), barH);

  // Heal indicator
  if (p.healTimer > 0) {
    ctx.fillStyle = '#44ff88';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+', cx, py - 14);
  }
}

function drawBullets() {
  for (var i = 0; i < bullets.length; i++) {
    var b = bullets[i];
    ctx.fillStyle = b.color;
    if (b.isSniper) {
      ctx.fillRect(b.x - 4, b.y - 1, 8, 2);
    } else {
      ctx.fillRect(b.x - 2, b.y - 1, 4, 2);
    }
  }
}

function drawGrenades() {
  for (var i = 0; i < grenades.length; i++) {
    var g = grenades[i];
    ctx.fillStyle = g.type === 'grenade' ? '#ff6600' : '#ffffff';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
    ctx.fill();
    // Trail
    ctx.fillStyle = g.type === 'grenade' ? '#ff880044' : '#ffffff44';
    ctx.beginPath();
    ctx.arc(g.x - g.vx, g.y - g.vy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  // Top bar
  ctx.fillStyle = '#0a0e18cc';
  ctx.fillRect(0, 0, W, 32);

  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';

  // Round info
  ctx.fillStyle = '#8899aa';
  ctx.fillText('Round ' + roundNum + '/' + ROUNDS_TO_WIN, 8, 14);

  // Scores
  ctx.fillStyle = '#4488ff';
  ctx.fillText('P1: ' + p1Score, 130, 14);
  ctx.fillStyle = '#ff4444';
  ctx.fillText((numPlayers === 1 ? 'Bot' : 'P2') + ': ' + p2Score, 210, 14);

  // Credits
  ctx.fillStyle = '#ffcc00';
  ctx.font = '10px monospace';
  ctx.fillText('$' + (p1 ? p1.credits : 0), 130, 27);
  ctx.fillStyle = '#ffaa00';
  ctx.fillText('$' + (p2 ? p2.credits : 0), 210, 27);

  // Kills
  ctx.fillStyle = '#aabbcc';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('Kills: ' + matchKills, W - 8, 14);

  // Bottom bar
  if (p1 && state === 'playing') {
    ctx.fillStyle = '#0a0e18cc';
    ctx.fillRect(0, H - 28, W, 28);

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    // Weapon name
    var wName = WEAPONS[p1.weapon] ? WEAPONS[p1.weapon].name : p1.weapon;
    ctx.fillStyle = WEAPONS[p1.weapon] ? WEAPONS[p1.weapon].color : '#888';
    ctx.fillText(wName, 8, H - 10);

    // Ammo
    if (p1.weapon !== 'knife') {
      var ammoText = WEAPONS[p1.weapon].ammo === Infinity ? 'INF' : (p1.ammo[p1.weapon] || 0) + '';
      ctx.fillStyle = '#aabbcc';
      ctx.fillText('Ammo: ' + ammoText, 80, H - 10);
    }

    // HP
    ctx.fillStyle = p1.hp > 60 ? '#44cc44' : (p1.hp > 30 ? '#cccc44' : '#cc4444');
    ctx.fillText('HP: ' + p1.hp, 170, H - 10);

    // Utility count
    ctx.fillStyle = '#888';
    ctx.fillText('Util: ' + (p1.utility.length), 240, H - 10);

    // Weapon switch hint
    ctx.fillStyle = '#556677';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[R]switch [G]utility', W - 5, H - 10);
  }
}

/* ── Buy Phase Rendering ───────────────────────────────────────── */
function drawBuyPhase() {
  // Dark overlay
  ctx.fillStyle = '#000000cc';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('BUY PHASE', W/2, 50);

  ctx.fillStyle = '#ffcc00';
  ctx.font = '14px monospace';
  ctx.fillText('Round ' + roundNum + ' — ' + Math.ceil(buyTimer) + 's', W/2, 75);

  // P1 credits
  ctx.fillStyle = '#88ccff';
  ctx.font = '12px monospace';
  ctx.fillText('Credits: $' + (p1 ? p1.credits : 0), W/2, 100);

  // Draw current loadout
  if (p1) {
    ctx.fillStyle = '#667788';
    ctx.font = '10px monospace';
    var loadout = 'Loadout: ' + (p1.primary ? WEAPONS[p1.primary].name : 'None') + ' + Pistol + Knife';
    ctx.fillText(loadout, W/2, 120);
    if (p1.utility.length > 0) {
      ctx.fillText('Utility: ' + p1.utility.map(function(u) { return UTILITY[u].name; }).join(', '), W/2, 135);
    }
  }

  // Item list
  ctx.textAlign = 'left';
  for (var i = 0; i < BUY_ITEMS.length; i++) {
    var itemId = BUY_ITEMS[i];
    var isWeapon = !!WEAPONS[itemId];
    var item = isWeapon ? WEAPONS[itemId] : UTILITY[itemId];
    var iy = 160 + i * 48;
    var selected = buyCursor.p1 === i;

    // Background
    ctx.fillStyle = selected ? '#1a2538' : '#0d1320';
    ctx.fillRect(30, iy, 300, 40);
    if (selected) {
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, iy, 300, 40);
    }

    // Item info
    var affordable = p1 && item.cost <= p1.credits;
    var owned = isWeapon && p1 && p1.primary === itemId;

    ctx.fillStyle = owned ? '#44cc44' : (affordable ? '#ddeeff' : '#445566');
    ctx.font = 'bold 12px monospace';
    ctx.fillText(item.name, 40, iy + 16);

    ctx.fillStyle = affordable ? '#ffcc00' : '#664400';
    ctx.font = '10px monospace';
    ctx.fillText('$' + item.cost, 40, iy + 32);

    if (isWeapon) {
      ctx.fillStyle = '#667788';
      ctx.fillText('DMG:' + item.dmg + ' RPM:' + item.rate, 120, iy + 32);
    } else {
      ctx.fillStyle = '#667788';
      if (item.heal) ctx.fillText('Heals ' + item.heal + ' HP', 120, iy + 32);
      else if (item.dmg) ctx.fillText('DMG:' + item.dmg + ' R:' + item.radius, 120, iy + 32);
      else ctx.fillText('Blinds enemies', 120, iy + 32);
    }

    if (owned) {
      ctx.fillStyle = '#44cc44';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('OWNED', 320, iy + 20);
      ctx.textAlign = 'left';
    }
  }

  // Instructions
  ctx.textAlign = 'center';
  ctx.fillStyle = '#556677';
  ctx.font = '10px monospace';
  ctx.fillText('W/S to browse, F to buy — auto-starts in ' + Math.ceil(buyTimer) + 's', W/2, H - 20);
}

/* ── Screen States ─────────────────────────────────────────────── */
function drawMenu() {
  drawBackground();

  ctx.textAlign = 'center';

  // Title
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('RIVALS', W/2, 180);

  ctx.fillStyle = '#8899aa';
  ctx.font = '12px monospace';
  ctx.fillText('Tactical Shooter', W/2, 210);

  ctx.font = '10px monospace';
  ctx.fillText('Round-based combat with economy', W/2, 235);

  // Animated character silhouettes
  var t = Date.now() / 1000;
  ctx.fillStyle = '#4488ff44';
  ctx.fillRect(100 + Math.sin(t) * 10, 270, PLAYER_W, PLAYER_H);
  ctx.fillStyle = '#ff444444';
  ctx.fillRect(230 + Math.sin(t + 1) * 10, 270, PLAYER_W, PLAYER_H);

  // Buttons
  var btns = ['1 PLAYER', '2 PLAYERS'];
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

  // Controls hint
  ctx.fillStyle = '#445566';
  ctx.font = '10px monospace';
  ctx.fillText('W/S to select, F or Space to start', W/2, 520);
  ctx.fillText('Best Kills: ' + bestKills, W/2, 545);
}

function drawModeSelect() {
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('INPUT MODE', W/2, 100);

  ctx.fillStyle = '#8899aa';
  ctx.font = '11px monospace';
  ctx.fillText('Choose controls for 2 players', W/2, 130);

  var modes = [
    { name: 'KEYBOARD', desc: 'P1: WASD+F  P2: Arrows+Enter' },
    { name: 'TOUCH', desc: 'Split-screen touch controls' },
    { name: 'MIXED', desc: 'P1: Keyboard  P2: Touch' }
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
  ctx.fillText('W/S select, F confirm', W/2, 530);
}

function drawRoundEnd() {
  ctx.fillStyle = '#000000aa';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  var winColor = roundWinner === 1 ? '#4488ff' : '#ff4444';
  var winText = roundWinner === 1 ? (numPlayers === 1 ? 'YOU WIN' : 'P1 WINS') : (numPlayers === 1 ? 'BOT WINS' : 'P2 WINS');

  ctx.fillStyle = winColor;
  ctx.font = 'bold 28px monospace';
  ctx.fillText('ROUND ' + (roundNum), W/2, 260);
  ctx.font = 'bold 22px monospace';
  ctx.fillText(winText, W/2, 300);

  ctx.fillStyle = '#aabbcc';
  ctx.font = '14px monospace';
  ctx.fillText('P1: ' + p1Score + '  —  ' + (numPlayers === 1 ? 'Bot' : 'P2') + ': ' + p2Score, W/2, 340);
}

function drawMatchEnd() {
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  var winner = p1Score >= ROUNDS_TO_WIN ? 1 : 2;
  var winColor = winner === 1 ? '#4488ff' : '#ff4444';
  var winText = winner === 1 ? (numPlayers === 1 ? 'VICTORY!' : 'P1 WINS!') : (numPlayers === 1 ? 'DEFEAT' : 'P2 WINS!');

  ctx.fillStyle = winColor;
  ctx.font = 'bold 32px monospace';
  ctx.fillText(winText, W/2, 200);

  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('MATCH OVER', W/2, 250);

  ctx.fillStyle = '#aabbcc';
  ctx.font = '14px monospace';
  ctx.fillText('Final Score: ' + p1Score + ' - ' + p2Score, W/2, 300);
  ctx.fillText('Total Kills: ' + matchKills, W/2, 330);

  if (matchKills >= bestKills) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('NEW BEST!', W/2, 360);
  }

  ctx.fillStyle = '#556677';
  ctx.font = '12px monospace';
  ctx.fillText('Press Space or tap to continue', W/2, 450);
}

/* ── Touch Control Overlay ─────────────────────────────────────── */
function drawTouchControls() {
  if (inputMode === 'keyboard' || state !== 'playing') return;
  ctx.globalAlpha = 0.3;
  for (var i = 0; i < touchButtons.length; i++) {
    var btn = touchButtons[i];
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/2 + 5);
  }
  ctx.globalAlpha = 1;
}

/* ── Main Game Loop ────────────────────────────────────────────── */
var lastTime = 0;
var dt = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // Screen shake offset
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
      drawMenu();
      break;

    case 'mode_select':
      drawModeSelect();
      break;

    case 'buy_phase':
      drawBackground();
      drawPlatforms();
      drawPlayer(p1);
      drawPlayer(p2);
      drawBuyPhase();

      buyTimer -= dt;
      if (buyTimer <= 0) {
        if (numPlayers === 1) botBuy();
        startPlaying();
      }
      break;

    case 'playing':
      updateInputs();
      updatePlayer(p1, dt);
      if (numPlayers === 2) updatePlayer(p2, dt);
      else updateBot(dt);
      if (numPlayers === 1 && p2 && p2.alive) {
        // Apply bot inputs
        updatePlayer(p2, dt);
      }
      updateBullets(dt);
      updateGrenades(dt);
      updateParticles(dt);

      drawBackground();
      drawPlatforms();
      drawBullets();
      drawPlayer(p1);
      drawPlayer(p2);
      drawGrenades();
      drawParticles();
      drawHUD();
      drawTouchControls();

      // Flash overlay
      if (flashAlpha > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha + ')';
        ctx.fillRect(0, 0, W, H);
        flashAlpha -= dt * 2;
      }
      break;

    case 'round_end':
      drawBackground();
      drawPlatforms();
      drawParticles();
      updateParticles(dt);
      drawRoundEnd();

      roundEndTimer -= dt;
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
  // Comeback check
  if (state === 'round_end' || state === 'match_end') {
    if (p1Score >= ROUNDS_TO_WIN && p2Score === 4 && p1Score - p2Score === 1) {
      // Actually need to check if p1 was ever down 1-4
    }
  }
  // Check comeback: if p1 wins match and was down 1-4 at some point
  if (state === 'match_end' && p1Score >= ROUNDS_TO_WIN) {
    // We track this in endRound — if p2Score was 4 and p1Score < p2Score at some point
    if (p2Score === 4) achStats.comebacks++;
  }

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

// Achievements panel toggle
var achToggle = document.getElementById('achievementsToggle');
if (achToggle) {
  achToggle.addEventListener('click', function() {
    var list = document.getElementById('achievementsList');
    if (list) { list.classList.toggle('open'); renderAchList(); }
  });
}

// Mute button
if (muteBtn) {
  muteBtn.addEventListener('click', function() {
    Audio.init(); Audio.resume();
    muteBtn.textContent = Audio.toggle() ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  });
}

// Restart button
if (restartBtn) {
  restartBtn.addEventListener('click', function() {
    Audio.init(); Audio.resume();
    startMenu();
  });
}

// Fullscreen
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

// Leaderboard panel
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

// Arcade restart event
document.addEventListener('arcade-restart', function() { startMenu(); });

// i18n
if (typeof I18N !== 'undefined') {
  var header = document.querySelector('.game__header');
  if (header) I18N.createSelector(header);
  I18N.applyDOM();
}

// Shop
if (typeof Shop !== 'undefined') {
  Shop.init({
    gameId: 'rivals',
    buttonTarget: '#shopBtn',
    bundles: [{
      id: 'rivalspremium',
      name: 'Rivals Premium',
      desc: 'Gold & Neon weapon skins + Tactical player skin',
      price: '~$2',
      kofiUrl: 'https://ko-fi.com/s/RIVALS_PREMIUM_ID',
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

// Start game loop
requestAnimationFrame(gameLoop);

})();
