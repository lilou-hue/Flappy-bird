/**
 * Tetris — full game logic, rendering, and input handling.
 * Canvas 2D, no dependencies except audio.js (Audio global).
 */
(function () {
  "use strict";

  /* ── i18n setup ── */
  I18N.createSelector(document.querySelector('.game__header'));
  I18N.applyDOM();
  window.addEventListener('langchange', () => { I18N.applyDOM(); });

  /* ── Achievements ────────────────────────────────────────── */
  const TETRIS_ACHIEVEMENTS = [
    { id: 'first_line',    icon: '\u2728', title: 'First Clear',      desc: 'Clear your first line',       check: s => s.totalLines >= 1 },
    { id: 'lines_50',      icon: '\uD83D\uDD25', title: 'Line Master',      desc: 'Clear 50 lines total',        check: s => s.totalLines >= 50 },
    { id: 'score_5k',      icon: '\uD83D\uDC8E', title: 'Score 5000',        desc: 'Score 5000 in one game',      check: s => s.bestScore >= 5000 },
    { id: 'score_10k',     icon: '\uD83D\uDC51', title: 'Score 10000',       desc: 'Score 10000 in one game',     check: s => s.bestScore >= 10000 },
    { id: 'level_10',      icon: '\uD83D\uDCC8', title: 'Level 10',          desc: 'Reach level 10',              check: s => s.bestLevel >= 10 },
    { id: 'games_10',      icon: '\uD83C\uDFAE', title: 'Dedicated',         desc: 'Play 10 games',               check: s => s.gamesPlayed >= 10 },
    { id: 'garbage_warrior', icon: '\uD83D\uDDD1\uFE0F', title: 'Garbage Warrior', desc: 'Clear 10 garbage rows in challenge mode', check: s => s.garbageRowsCleared >= 10 },
  ];

  let tetAchStats = { totalLines: 0, bestScore: 0, bestLevel: 0, gamesPlayed: 0, garbageRowsCleared: 0 };
  let tetUnlocked = new Set();
  let tetAchQueue = [];
  let tetAchTimer = 0;

  function loadTetAch() {
    try {
      const s = JSON.parse(localStorage.getItem('tetrisAch') || '{}');
      if (s.unlocked) tetUnlocked = new Set(s.unlocked);
      if (s.stats) Object.assign(tetAchStats, s.stats);
    } catch (_) {}
  }
  function saveTetAch() {
    localStorage.setItem('tetrisAch', JSON.stringify({ unlocked: [...tetUnlocked], stats: tetAchStats }));
  }
  function checkTetAch() {
    for (const a of TETRIS_ACHIEVEMENTS) {
      if (!tetUnlocked.has(a.id) && a.check(tetAchStats)) {
        tetUnlocked.add(a.id);
        tetAchQueue.push(a);
        saveTetAch();
      }
    }
  }
  function showTetAchPopup() {
    if (tetAchTimer > 0 || tetAchQueue.length === 0) return;
    const a = tetAchQueue.shift();
    const popup = document.getElementById('achievementPopup');
    document.getElementById('achievementPopupIcon').textContent = a.icon;
    document.getElementById('achievementPopupTitle').textContent = a.title;
    document.getElementById('achievementPopupDesc').textContent = a.desc;
    popup.classList.add('show');
    tetAchTimer = 3;
    setTimeout(() => { popup.classList.remove('show'); setTimeout(() => { tetAchTimer = 0; showTetAchPopup(); }, 500); }, 3000);
  }
  function renderTetAchList() {
    const list = document.getElementById('achievementsList');
    list.innerHTML = '';
    for (const a of TETRIS_ACHIEVEMENTS) {
      const el = document.createElement('div');
      el.className = 'achievement-item' + (tetUnlocked.has(a.id) ? ' unlocked' : '');
      el.innerHTML = '<span class="achievement-item__icon">' + a.icon + '</span><span>' + a.title + '</span>';
      list.appendChild(el);
    }
  }
  document.getElementById('achievementsToggle').addEventListener('click', () => {
    document.getElementById('achievementsList').classList.toggle('open');
    renderTetAchList();
  });
  loadTetAch();

  /* ── Themes ────────────────────────────────────────────────────────── */
  const TETRIS_THEMES = {
    classic: {
      name: () => I18N.t('tetThemeClassic'),
      bg: '#08091a', field: '#060816',
      gridColor: 'rgba(0,210,255,0.06)', borderColor: 'rgba(0,210,255,0.35)',
      textColor: '#c0d8ff', accentColor: '#00d4ff',
      colors: { I: '#00d4ff', O: '#ffdd00', T: '#b44dff', S: '#44ff44', Z: '#ff4444', J: '#4488ff', L: '#ff8833', G: '#666666' },
      glows:  { I: 'rgba(0,212,255,0.5)', O: 'rgba(255,221,0,0.5)', T: 'rgba(180,77,255,0.5)', S: 'rgba(68,255,68,0.5)', Z: 'rgba(255,68,68,0.5)', J: 'rgba(68,136,255,0.5)', L: 'rgba(255,136,51,0.5)', G: 'rgba(102,102,102,0.3)' },
    },
    neon: {
      name: () => I18N.t('tetThemeNeon'),
      bg: '#0a0014', field: '#08000f',
      gridColor: 'rgba(255,0,200,0.06)', borderColor: 'rgba(255,0,200,0.35)',
      textColor: '#ffc0e8', accentColor: '#ff00c8',
      colors: { I: '#00ffff', O: '#ffff00', T: '#ff00ff', S: '#00ff66', Z: '#ff0066', J: '#6666ff', L: '#ff8800', G: '#666666' },
      glows:  { I: 'rgba(0,255,255,0.5)', O: 'rgba(255,255,0,0.5)', T: 'rgba(255,0,255,0.5)', S: 'rgba(0,255,102,0.5)', Z: 'rgba(255,0,102,0.5)', J: 'rgba(102,102,255,0.5)', L: 'rgba(255,136,0,0.5)', G: 'rgba(102,102,102,0.3)' },
    },
    retro: {
      name: () => I18N.t('tetThemeRetro'),
      bg: '#1a1408', field: '#16120a',
      gridColor: 'rgba(200,160,80,0.06)', borderColor: 'rgba(200,160,80,0.3)',
      textColor: '#d4c8a0', accentColor: '#c8a050',
      colors: { I: '#6bb5c0', O: '#d4a840', T: '#a070a0', S: '#6aaa60', Z: '#c06050', J: '#5080a0', L: '#c08040', G: '#666666' },
      glows:  { I: 'rgba(107,181,192,0.4)', O: 'rgba(212,168,64,0.4)', T: 'rgba(160,112,160,0.4)', S: 'rgba(106,170,96,0.4)', Z: 'rgba(192,96,80,0.4)', J: 'rgba(80,128,160,0.4)', L: 'rgba(192,128,64,0.4)', G: 'rgba(102,102,102,0.3)' },
    },
    pastel: {
      name: () => I18N.t('tetThemePastel'),
      bg: '#f0f0f8', field: '#e8e8f0',
      gridColor: 'rgba(100,100,140,0.08)', borderColor: 'rgba(100,100,140,0.2)',
      textColor: '#505070', accentColor: '#8080c0',
      colors: { I: '#88ccdd', O: '#eedd88', T: '#cc99cc', S: '#88cc88', Z: '#dd8888', J: '#8899cc', L: '#ddaa77', G: '#666666' },
      glows:  { I: 'rgba(136,204,221,0.3)', O: 'rgba(238,221,136,0.3)', T: 'rgba(204,153,204,0.3)', S: 'rgba(136,204,136,0.3)', Z: 'rgba(221,136,136,0.3)', J: 'rgba(136,153,204,0.3)', L: 'rgba(221,170,119,0.3)', G: 'rgba(102,102,102,0.3)' },
    },
    midnight: {
      name: () => I18N.t('tetThemeMidnight'),
      bg: '#040408', field: '#030306',
      gridColor: 'rgba(60,60,100,0.08)', borderColor: 'rgba(60,60,100,0.25)',
      textColor: '#8080a0', accentColor: '#5050a0',
      colors: { I: '#3388aa', O: '#aa8833', T: '#7744aa', S: '#338844', Z: '#aa3344', J: '#3355aa', L: '#aa6633', G: '#666666' },
      glows:  { I: 'rgba(51,136,170,0.4)', O: 'rgba(170,136,51,0.4)', T: 'rgba(119,68,170,0.4)', S: 'rgba(51,136,68,0.4)', Z: 'rgba(170,51,68,0.4)', J: 'rgba(51,85,170,0.4)', L: 'rgba(170,102,51,0.4)', G: 'rgba(102,102,102,0.3)' },
    },
  };

  /* ── Block Skins ──────────────────────────────────────────────────── */
  function lightenColor(hex, amt) {
    let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    r = Math.min(255, r + amt); g = Math.min(255, g + amt); b = Math.min(255, b + amt);
    return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
  }
  function darkenColor(hex, amt) {
    let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    r = Math.max(0, r - amt); g = Math.max(0, g - amt); b = Math.max(0, b - amt);
    return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
  }

  const TETRIS_SKINS = {
    standard: {
      name: () => I18N.t('tetSkinStandard'),
      drawBlock(x, y, color, glow, dimmed, ctx) {
        const margin = 1, bx = x+margin, by = y+margin, bs = CELL-margin*2, r = 3;
        ctx.save();
        if (glow && !dimmed) { ctx.shadowBlur = 6; ctx.shadowColor = glow; }
        else if (glow && dimmed) { ctx.shadowBlur = 3; ctx.shadowColor = glow; }
        ctx.fillStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bs, bs, r); else ctx.rect(bx, by, bs, bs);
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(bx+1, by+1, bs-2, 2); ctx.fillRect(bx+1, by+1, 2, bs-2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(bx+1, by+bs-3, bs-2, 2); ctx.fillRect(bx+bs-3, by+1, 2, bs-2);
        ctx.restore();
      }
    },
    glossy: {
      name: () => I18N.t('tetSkinGlossy'),
      drawBlock(x, y, color, glow, dimmed, ctx) {
        const margin = 1, bx = x+margin, by = y+margin, bs = CELL-margin*2, r = 4;
        ctx.save();
        if (glow && !dimmed) { ctx.shadowBlur = 6; ctx.shadowColor = glow; }
        const grad = ctx.createLinearGradient(bx, by, bx, by+bs);
        grad.addColorStop(0, lightenColor(color, 60));
        grad.addColorStop(0.3, color);
        grad.addColorStop(1, darkenColor(color, 40));
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bs, bs, r); else ctx.rect(bx, by, bs, bs);
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(bx+3, by+2, bs-6, 4);
        ctx.restore();
      }
    },
    pixel: {
      name: () => I18N.t('tetSkinPixel'),
      drawBlock(x, y, color, glow, dimmed, ctx) {
        const margin = 1, bx = x+margin, by = y+margin, bs = CELL-margin*2;
        ctx.save();
        if (glow && !dimmed) { ctx.shadowBlur = 4; ctx.shadowColor = glow; }
        ctx.fillStyle = color;
        ctx.fillRect(bx, by, bs, bs);
        ctx.shadowBlur = 0;
        ctx.fillStyle = lightenColor(color, 50);
        ctx.fillRect(bx, by, bs, 3); ctx.fillRect(bx, by, 3, bs);
        ctx.fillStyle = darkenColor(color, 50);
        ctx.fillRect(bx, by+bs-3, bs, 3); ctx.fillRect(bx+bs-3, by, 3, bs);
        ctx.fillStyle = darkenColor(color, 20);
        ctx.fillRect(bx+3, by+3, bs-6, bs-6);
        ctx.restore();
      }
    },
    glow: {
      name: () => I18N.t('tetSkinGlow'),
      drawBlock(x, y, color, glow, dimmed, ctx) {
        const margin = 1, bx = x+margin, by = y+margin, bs = CELL-margin*2, r = 3;
        ctx.save();
        ctx.fillStyle = darkenColor(color, 80);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bs, bs, r); else ctx.rect(bx, by, bs, bs);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = dimmed ? 1 : 2;
        if (!dimmed) { ctx.shadowBlur = 10; ctx.shadowColor = glow || color; }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    },
    candy: {
      name: () => I18N.t('tetSkinCandy'),
      drawBlock(x, y, color, glow, dimmed, ctx) {
        const margin = 1, bx = x+margin, by = y+margin, bs = CELL-margin*2, r = 8;
        ctx.save();
        if (glow && !dimmed) { ctx.shadowBlur = 5; ctx.shadowColor = glow; }
        ctx.fillStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bs, bs, r); else ctx.rect(bx, by, bs, bs);
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx+3, by+2, bs-6, bs/2-2, [5,5,0,0]); else ctx.rect(bx+3, by+2, bs-6, bs/2-2);
        ctx.fill();
        ctx.restore();
      }
    },
  };

  let currentThemeName = localStorage.getItem('tetrisTheme') || 'classic';
  let currentSkinName = localStorage.getItem('tetrisSkin') || 'standard';
  let currentTheme = TETRIS_THEMES[currentThemeName] || TETRIS_THEMES.classic;
  let currentSkin = TETRIS_SKINS[currentSkinName] || TETRIS_SKINS.standard;

  // Populate dropdowns
  const themeSelect = document.getElementById('themeSelect');
  const skinSelect = document.getElementById('skinSelect');
  for (const key in TETRIS_THEMES) {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = TETRIS_THEMES[key].name();
    if (key === currentThemeName) opt.selected = true;
    themeSelect.appendChild(opt);
  }
  for (const key in TETRIS_SKINS) {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = TETRIS_SKINS[key].name();
    if (key === currentSkinName) opt.selected = true;
    skinSelect.appendChild(opt);
  }
  themeSelect.addEventListener('change', () => {
    currentThemeName = themeSelect.value;
    currentTheme = TETRIS_THEMES[currentThemeName] || TETRIS_THEMES.classic;
    localStorage.setItem('tetrisTheme', currentThemeName);
  });
  skinSelect.addEventListener('change', () => {
    currentSkinName = skinSelect.value;
    currentSkin = TETRIS_SKINS[currentSkinName] || TETRIS_SKINS.standard;
    localStorage.setItem('tetrisSkin', currentSkinName);
  });

  // Helper to get themed color for a piece type
  function themedColor(pieceType) { return currentTheme.colors[pieceType] || PIECES[pieceType].color; }
  function themedGlow(pieceType) { return currentTheme.glows[pieceType] || PIECES[pieceType].glow; }

  /* ================================================================== */
  /*  Constants                                                          */
  /* ================================================================== */
  const COLS = 10;
  const ROWS = 24; // rows 0-3 hidden
  const VISIBLE_ROWS = 20;
  const CELL = 28;

  // Canvas layout
  const CW = 480;
  const CH = 640;
  const FIELD_X = 100;
  const FIELD_Y = 20;
  const FIELD_W = COLS * CELL; // 280
  const FIELD_H = VISIBLE_ROWS * CELL; // 560

  /* ── Background Sparkles ─────────────────────────────────────────── */
  const bgSparkles = [];
  for (let i = 0; i < 20; i++) {
    bgSparkles.push({
      x: FIELD_X + Math.random() * FIELD_W,
      y: FIELD_Y + Math.random() * FIELD_H,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0.1 + Math.random() * 0.3,
      speed: 8 + Math.random() * 16,
    });
  }

  /* ================================================================== */
  /*  Piece definitions (SRS)                                            */
  /* ================================================================== */
  const PIECES = {
    I: {
      cells: [
        [[1,0],[1,1],[1,2],[1,3]],
        [[0,2],[1,2],[2,2],[3,2]],
        [[2,0],[2,1],[2,2],[2,3]],
        [[0,1],[1,1],[2,1],[3,1]],
      ],
      color: "#00d4ff",
      glow: "rgba(0,212,255,0.5)",
      size: 4,
    },
    O: {
      cells: [
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
      ],
      color: "#ffdd00",
      glow: "rgba(255,221,0,0.5)",
      size: 2,
    },
    T: {
      cells: [
        [[0,1],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[1,2],[2,1]],
        [[0,1],[1,0],[1,1],[2,1]],
      ],
      color: "#b44dff",
      glow: "rgba(180,77,255,0.5)",
      size: 3,
    },
    S: {
      cells: [
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,0],[1,0],[1,1],[2,1]],
        [[1,1],[1,2],[2,0],[2,1]],
        [[0,1],[1,1],[1,2],[2,2]],
      ],
      color: "#44ff44",
      glow: "rgba(68,255,68,0.5)",
      size: 3,
    },
    Z: {
      cells: [
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,2],[1,1],[1,2],[2,1]],
        [[1,0],[1,1],[2,1],[2,2]],
        [[0,1],[1,0],[1,1],[2,0]],
      ],
      color: "#ff4444",
      glow: "rgba(255,68,68,0.5)",
      size: 3,
    },
    J: {
      cells: [
        [[0,0],[1,0],[1,1],[1,2]],
        [[0,1],[0,2],[1,1],[2,1]],
        [[1,0],[1,1],[1,2],[2,2]],
        [[0,1],[1,1],[2,0],[2,1]],
      ],
      color: "#4488ff",
      glow: "rgba(68,136,255,0.5)",
      size: 3,
    },
    L: {
      cells: [
        [[0,2],[1,0],[1,1],[1,2]],
        [[0,1],[1,1],[2,1],[2,2]],
        [[1,0],[1,1],[1,2],[2,0]],
        [[0,0],[0,1],[1,1],[2,1]],
      ],
      color: "#ff8833",
      glow: "rgba(255,136,51,0.5)",
      size: 3,
    },
  };

  /* ================================================================== */
  /*  SRS Wall Kick data                                                 */
  /* ================================================================== */
  const KICKS = {
    "0>1": [[ 0, 0],[-1, 0],[-1, 1],[ 0,-2],[-1,-2]],
    "1>2": [[ 0, 0],[ 1, 0],[ 1,-1],[ 0, 2],[ 1, 2]],
    "2>3": [[ 0, 0],[ 1, 0],[ 1, 1],[ 0,-2],[ 1,-2]],
    "3>0": [[ 0, 0],[-1, 0],[-1,-1],[ 0, 2],[-1, 2]],
    "0>3": [[ 0, 0],[ 1, 0],[ 1, 1],[ 0,-2],[ 1,-2]],
    "3>2": [[ 0, 0],[-1, 0],[-1,-1],[ 0, 2],[-1, 2]],
    "2>1": [[ 0, 0],[-1, 0],[-1, 1],[ 0,-2],[-1,-2]],
    "1>0": [[ 0, 0],[ 1, 0],[ 1,-1],[ 0, 2],[ 1, 2]],
  };

  const I_KICKS = {
    "0>1": [[ 0, 0],[-2, 0],[ 1, 0],[-2,-1],[ 1, 2]],
    "1>2": [[ 0, 0],[ 2, 0],[-1, 0],[ 2, 1],[-1,-2]],
    "2>3": [[ 0, 0],[-1, 0],[ 2, 0],[-1, 2],[ 2,-1]],
    "3>0": [[ 0, 0],[ 1, 0],[-2, 0],[ 1,-2],[-2, 1]],
    "0>3": [[ 0, 0],[-1, 0],[ 2, 0],[-1, 2],[ 2,-1]],
    "3>2": [[ 0, 0],[-2, 0],[ 1, 0],[-2,-1],[ 1, 2]],
    "2>1": [[ 0, 0],[ 1, 0],[-2, 0],[ 1,-2],[-2, 1]],
    "1>0": [[ 0, 0],[ 2, 0],[-1, 0],[ 2, 1],[-1,-2]],
  };

  /* ================================================================== */
  /*  Game state                                                         */
  /* ================================================================== */
  const state = {
    phase: "idle",
    board: [],
    current: null,
    nextQueue: [],
    holdPiece: null,
    holdUsed: false,
    bag: [],
    lastTime: 0,
    dropAccumulator: 0,
    dropInterval: 1000,
    lockTimer: 0,
    lockResets: 0,
    isLanding: false,
    score: 0,
    displayScore: 0,
    best: 0,
    level: 1,
    lines: 0,
    combo: -1,
    backToBack: false,
    lineClearRows: [],
    lineClearTimer: 0,
    scorePop: 0,
    scorePopValue: "",
    scorePopX: 0,
    scorePopY: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    particles: [],
    lockFlash: 0,
    lockFlashCells: [],
    levelUpFlash: 0,
    gameOverAnim: 0,
    gameOverRow: 0,
    muted: false,
    challengeMode: false,
    garbageTimer: 0,
    garbageInterval: 8,
    garbageRowsCleared: 0,
    garbageWarning: 0,
  };

  // DAS state
  const das = {
    direction: 0,
    timer: 0,
    charged: false,
    repeatTimer: 0,
    delay: 167,
    rate: 33,
  };

  const keysHeld = new Set();

  /* ================================================================== */
  /*  DOM refs                                                           */
  /* ================================================================== */
  const canvas = document.getElementById("gameCanvas");
  const ctx2d = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("bestScore");
  const muteBtn = document.getElementById("muteButton");
  const restartBtn = document.getElementById("restartButton");

  /* ================================================================== */
  /*  Board helpers                                                      */
  /* ================================================================== */
  function createBoard() {
    const b = [];
    for (let r = 0; r < ROWS; r++) {
      b.push(new Array(COLS).fill(null));
    }
    return b;
  }

  function getCells(type, rotation, row, col) {
    return PIECES[type].cells[rotation].map(([dr, dc]) => [row + dr, col + dc]);
  }

  function isValid(type, rotation, row, col) {
    const cells = PIECES[type].cells[rotation];
    for (const [dr, dc] of cells) {
      const r = row + dr;
      const c = col + dc;
      if (c < 0 || c >= COLS || r >= ROWS) return false;
      if (r >= 0 && state.board[r][c] !== null) return false;
    }
    return true;
  }

  /* ================================================================== */
  /*  7-bag randomizer                                                   */
  /* ================================================================== */
  function fillBag() {
    const pieces = ["I", "O", "T", "S", "Z", "J", "L"];
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    state.bag = pieces;
  }

  function nextFromBag() {
    if (state.bag.length === 0) fillBag();
    return state.bag.pop();
  }

  /* ================================================================== */
  /*  Gravity speed                                                      */
  /* ================================================================== */
  function getDropInterval(level) {
    return Math.max(6, Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000);
  }

  /* ================================================================== */
  /*  Piece spawning                                                     */
  /* ================================================================== */
  function spawnPiece() {
    const type = state.nextQueue.shift();
    state.nextQueue.push(nextFromBag());
    const spawnCol = type === "O" ? 4 : type === "I" ? 3 : 3;
    const spawnRow = type === "I" ? 0 : 0;

    state.current = { type, rotation: 0, row: spawnRow, col: spawnCol };
    state.holdUsed = false;
    state.lockTimer = 0;
    state.lockResets = 0;
    state.isLanding = false;
    state.dropAccumulator = 0;

    // Top-out check
    if (!isValid(type, 0, spawnRow, spawnCol)) {
      triggerGameOver();
    }
  }

  /* ================================================================== */
  /*  Movement                                                           */
  /* ================================================================== */
  function moveHorizontal(dir) {
    if (!state.current || state.phase !== "playing") return false;
    const { type, rotation, row, col } = state.current;
    if (isValid(type, rotation, row, col + dir)) {
      state.current.col += dir;
      if (state.isLanding) resetLockDelay();
      Audio.move();
      return true;
    }
    return false;
  }

  function moveDown() {
    if (!state.current || state.phase !== "playing") return false;
    const { type, rotation, row, col } = state.current;
    if (isValid(type, rotation, row + 1, col)) {
      state.current.row += 1;
      state.isLanding = false;
      state.lockTimer = 0;
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (!state.current || state.phase !== "playing") return;
    let rows = 0;
    const { type, rotation, col } = state.current;
    let row = state.current.row;
    while (isValid(type, rotation, row + 1, col)) {
      row++;
      rows++;
    }
    state.current.row = row;
    state.score += rows * 2;
    Audio.hardDrop();
    state.shakeTimer = 8;
    state.shakeIntensity = 4;
    // Spawn particles at landing
    spawnHardDropParticles();
    lockPiece();
  }

  function tryRotate(direction) {
    if (!state.current || state.phase !== "playing") return false;
    const { type, rotation, row, col } = state.current;
    const newRot = (rotation + direction + 4) % 4;
    const kickKey = `${rotation}>${newRot}`;
    const kicks = type === "I" ? I_KICKS[kickKey] : KICKS[kickKey];
    if (!kicks) return false;

    for (const [dc, dr] of kicks) {
      if (isValid(type, newRot, row - dr, col + dc)) {
        state.current.rotation = newRot;
        state.current.row -= dr;
        state.current.col += dc;
        if (state.isLanding) resetLockDelay();
        Audio.rotate();
        return true;
      }
    }
    return false;
  }

  function resetLockDelay() {
    if (state.lockResets < 15) {
      state.lockTimer = 0;
      state.lockResets++;
    }
  }

  /* ================================================================== */
  /*  Ghost piece                                                        */
  /* ================================================================== */
  function getGhostRow() {
    if (!state.current) return 0;
    const { type, rotation, col } = state.current;
    let row = state.current.row;
    while (isValid(type, rotation, row + 1, col)) row++;
    return row;
  }

  /* ================================================================== */
  /*  Lock piece                                                         */
  /* ================================================================== */
  function lockPiece() {
    if (!state.current) return;
    const { type, rotation, row, col } = state.current;
    const cells = getCells(type, rotation, row, col);
    state.lockFlashCells = [];
    let anyAbove = false;
    for (const [r, c] of cells) {
      if (r < 0) continue;
      if (r < 4) anyAbove = true;
      state.board[r][c] = type;
      state.lockFlashCells.push([r, c]);
    }
    state.lockFlash = 0.3;
    // Piece lock sparks — emit small sparks at each locked cell
    for (const [r, c] of cells) {
      if (r >= 4) {
        const px = FIELD_X + c * CELL + CELL / 2;
        const py = FIELD_Y + (r - 4) * CELL + CELL / 2;
        for (let si = 0; si < 4; si++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 80 + Math.random() * 150;
          state.particles.push({
            x: px, y: py,
            vx: Math.cos(angle) * speed,
            vy: si < 2 ? Math.sin(angle) * speed : Math.abs(Math.sin(angle) * speed),
            life: 0.3 + Math.random() * 0.4,
            maxLife: 0.7,
            color: themedColor(type),
            size: 2 + Math.random() * 2,
          });
        }
      }
    }
    Audio.lock();

    if (anyAbove) {
      triggerGameOver();
      return;
    }

    // Check lines
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (state.board[r].every((cell) => cell !== null)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length > 0) {
      // Track garbage rows cleared in challenge mode
      if (state.challengeMode) {
        state.garbageRowsCleared += fullRows.length;
        tetAchStats.garbageRowsCleared += fullRows.length;
        checkTetAch(); showTetAchPopup(); saveTetAch();
      }

      state.lineClearRows = fullRows;
      state.lineClearTimer = 0.3;
      state.current = null;

      // Scoring
      const pts = [0, 100, 300, 500, 800];
      let base = pts[fullRows.length] * state.level;
      const isDifficult = fullRows.length === 4;
      if (isDifficult && state.backToBack) {
        base = Math.floor(base * 1.5);
      }
      state.backToBack = isDifficult;

      state.combo++;
      if (state.combo > 0) {
        base += 50 * state.combo * state.level;
        Audio.combo(state.combo);
      }
      state.score += base;
      Audio.lineClear(fullRows.length);

      // Score pop
      state.scorePop = 1.0;
      const labels = ["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS!"];
      state.scorePopValue = labels[fullRows.length] + " +" + base;
      state.scorePopX = FIELD_X + FIELD_W / 2;
      state.scorePopY = FIELD_Y + (fullRows[0] - 4) * CELL + CELL / 2;

      // Screen shake
      const shakes = [0, 2, 4, 6, 10];
      state.shakeTimer = 10;
      state.shakeIntensity = shakes[fullRows.length];

      // Particles
      for (const row of fullRows) {
        for (let c = 0; c < COLS; c++) {
          const pt = state.board[row][c];
          spawnLineClearParticles(
            FIELD_X + c * CELL + CELL / 2,
            FIELD_Y + (row - 4) * CELL + CELL / 2,
            pt ? themedColor(pt) : '#fff'
          );
        }
      }

      // Lines & level
      const prevLevel = state.level;
      state.lines += fullRows.length;
      tetAchStats.totalLines += fullRows.length;
      checkTetAch(); showTetAchPopup();
      state.level = Math.min(29, Math.floor(state.lines / 10) + 1);
      state.dropInterval = getDropInterval(state.level);
      if (state.level > prevLevel) {
        state.levelUpFlash = 0.4;
        Audio.levelUp();
      }
    } else {
      state.combo = -1;
      state.current = null;
      spawnPiece();
    }
  }

  /* ================================================================== */
  /*  Line clear resolution                                              */
  /* ================================================================== */
  function resolveLineClear() {
    // Remove full rows and add empty rows at top
    for (const row of state.lineClearRows.sort((a, b) => b - a)) {
      state.board.splice(row, 1);
      state.board.unshift(new Array(COLS).fill(null));
    }
    state.lineClearRows = [];
    spawnPiece();
  }

  /* ================================================================== */
  /*  Hold                                                               */
  /* ================================================================== */
  function holdPiece() {
    if (!state.current || state.holdUsed || state.phase !== "playing") return;
    Audio.hold();
    const type = state.current.type;
    if (state.holdPiece === null) {
      state.holdPiece = type;
      spawnPiece();
    } else {
      const swap = state.holdPiece;
      state.holdPiece = type;
      const spawnCol = swap === "O" ? 4 : 3;
      state.current = { type: swap, rotation: 0, row: 0, col: spawnCol };
      state.lockTimer = 0;
      state.lockResets = 0;
      state.isLanding = false;
      state.dropAccumulator = 0;
    }
    state.holdUsed = true;
  }

  /* ================================================================== */
  /*  Garbage rows (Challenge Mode)                                      */
  /* ================================================================== */
  function pushGarbageRow() {
    var garbageRow = new Array(COLS).fill('G');
    var gapCol = Math.floor(Math.random() * COLS);
    garbageRow[gapCol] = null;
    state.board.shift();
    state.board.push(garbageRow);
    // Check if top visible row (row 4) has any non-null cell after push
    for (var c = 0; c < COLS; c++) {
      if (state.board[4][c] !== null) {
        triggerGameOver();
        return;
      }
    }
    state.garbageInterval = Math.max(3, state.garbageInterval - 0.3);
    if (state.garbageInterval < 2) {
      state.garbageWarning = 1.0;
    }
  }

  /* ================================================================== */
  /*  Game over                                                          */
  /* ================================================================== */
  function triggerGameOver() {
    state.phase = "gameover";
    state.current = null;
    state.gameOverAnim = 0;
    state.gameOverRow = ROWS - 1;
    Audio.gameOver();
    Audio.stopDrone();
    state.shakeTimer = 15;
    state.shakeIntensity = 8;
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("tetrisBest", String(state.best));
    }
    if (typeof Leaderboard !== 'undefined' && state.score > 0) {
      Leaderboard.submitScore('tetris', state.score).then(() => Leaderboard.refresh('tetris'));
    }
    tetAchStats.gamesPlayed++;
    tetAchStats.bestScore = Math.max(tetAchStats.bestScore, state.score);
    tetAchStats.bestLevel = Math.max(tetAchStats.bestLevel, state.level || 0);
    checkTetAch(); showTetAchPopup(); saveTetAch();
  }

  /* ================================================================== */
  /*  Particles                                                          */
  /* ================================================================== */
  function spawnLineClearParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        color: color || "#fff",
        size: 2 + Math.random() * 2,
      });
    }
  }

  function spawnHardDropParticles() {
    if (!state.current) return;
    const { type, rotation, row, col } = state.current;
    const cells = getCells(type, rotation, row, col);
    for (const [r, c] of cells) {
      const px = FIELD_X + c * CELL + CELL / 2;
      const py = FIELD_Y + (r - 4) * CELL + CELL;
      for (let i = 0; i < 3; i++) {
        state.particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 80,
          vy: 20 + Math.random() * 60,
          life: 0.2 + Math.random() * 0.2,
          maxLife: 0.4,
          color: "#fff",
          size: 1 + Math.random() * 2,
        });
      }
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    if (state.particles.length > 300) {
      state.particles.splice(0, state.particles.length - 300);
    }
  }

  /* ================================================================== */
  /*  Init / Reset                                                       */
  /* ================================================================== */
  function resetGame() {
    state.board = createBoard();
    state.bag = [];
    fillBag();
    state.nextQueue = [];
    for (let i = 0; i < 5; i++) state.nextQueue.push(nextFromBag());
    state.current = null;
    state.holdPiece = null;
    state.holdUsed = false;
    state.score = 0;
    state.displayScore = 0;
    state.level = 1;
    state.lines = 0;
    state.combo = -1;
    state.backToBack = false;
    state.dropInterval = 1000;
    state.dropAccumulator = 0;
    state.lockTimer = 0;
    state.lockResets = 0;
    state.isLanding = false;
    state.lineClearRows = [];
    state.lineClearTimer = 0;
    state.scorePop = 0;
    state.shakeTimer = 0;
    state.shakeIntensity = 0;
    state.particles = [];
    state.lockFlash = 0;
    state.lockFlashCells = [];
    state.levelUpFlash = 0;
    state.gameOverAnim = 0;
    state.garbageTimer = 0;
    state.garbageInterval = 8;
    state.garbageRowsCleared = 0;
    state.garbageWarning = 0;
    state.phase = "idle";
    das.direction = 0;
    das.timer = 0;
    das.charged = false;
    das.repeatTimer = 0;
    keysHeld.clear();
  }

  function startPlaying() {
    if (state.phase !== "idle") return;
    state.phase = "playing";
    spawnPiece();
    Audio.init();
    Audio.resume();
    Audio.startDrone();
  }

  /* ================================================================== */
  /*  Input                                                              */
  /* ================================================================== */
  window.addEventListener("keydown", (e) => {
    if (e.repeat && (e.code === "Space" || e.code === "ShiftLeft" || e.code === "KeyC")) return;

    // Audio resume on any input
    Audio.init();
    Audio.resume();

    if (state.phase === "idle") {
      startPlaying();
      // If it's a directional key, also handle it
    }

    if (state.phase === "gameover") {
      if (e.code === "Space" || e.code === "Enter") {
        resetGame();
        return;
      }
    }

    if (e.code === "KeyF") { toggleFullscreen(); return; }

    if (state.phase !== "playing") return;

    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        e.preventDefault();
        if (!keysHeld.has("left")) {
          keysHeld.add("left");
          moveHorizontal(-1);
          das.direction = -1;
          das.timer = 0;
          das.charged = false;
          das.repeatTimer = 0;
        }
        break;
      case "ArrowRight":
      case "KeyD":
        e.preventDefault();
        if (!keysHeld.has("right")) {
          keysHeld.add("right");
          moveHorizontal(1);
          das.direction = 1;
          das.timer = 0;
          das.charged = false;
          das.repeatTimer = 0;
        }
        break;
      case "ArrowDown":
      case "KeyS":
        e.preventDefault();
        keysHeld.add("down");
        break;
      case "ArrowUp":
      case "KeyX":
        e.preventDefault();
        tryRotate(1);
        break;
      case "KeyZ":
      case "ControlLeft":
      case "ControlRight":
        e.preventDefault();
        tryRotate(-1);
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
      case "ShiftLeft":
      case "ShiftRight":
      case "KeyC":
        e.preventDefault();
        holdPiece();
        break;
      case "Escape":
      case "KeyP":
        e.preventDefault();
        if (state.phase === "playing") {
          state.phase = "paused";
          Audio.stopDrone();
        } else if (state.phase === "paused") {
          state.phase = "playing";
          Audio.startDrone();
        }
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        keysHeld.delete("left");
        if (das.direction === -1) {
          das.direction = 0;
          // Switch to right if still held
          if (keysHeld.has("right")) {
            das.direction = 1;
            das.timer = 0;
            das.charged = false;
            das.repeatTimer = 0;
          }
        }
        break;
      case "ArrowRight":
      case "KeyD":
        keysHeld.delete("right");
        if (das.direction === 1) {
          das.direction = 0;
          if (keysHeld.has("left")) {
            das.direction = -1;
            das.timer = 0;
            das.charged = false;
            das.repeatTimer = 0;
          }
        }
        break;
      case "ArrowDown":
      case "KeyS":
        keysHeld.delete("down");
        break;
    }
  });

  /* Touch controls */
  let touchStart = null;
  let touchMoved = false;

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    Audio.init();
    Audio.resume();
    touchStart = { x: e.clientX, y: e.clientY, time: Date.now() };
    touchMoved = false;

    if (state.phase === "idle") {
      startPlaying();
      return;
    }
    if (state.phase === "gameover") {
      resetGame();
      return;
    }
    if (state.phase === "paused") {
      state.phase = "playing";
      Audio.startDrone();
      return;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!touchStart || state.phase !== "playing") return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    const threshold = 25;

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
      moveHorizontal(dx > 0 ? 1 : -1);
      touchStart.x = e.clientX;
      touchStart.y = e.clientY;
      touchMoved = true;
    } else if (dy > threshold && Math.abs(dy) > Math.abs(dx)) {
      // Swipe down — soft drop rows
      if (moveDown()) {
        state.score += 1;
        Audio.softDrop();
      }
      touchStart.x = e.clientX;
      touchStart.y = e.clientY;
      touchMoved = true;
    } else if (dy < -threshold * 1.5 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      // Swipe up — hard drop
      hardDrop();
      touchStart = null;
      touchMoved = true;
    }
  });

  canvas.addEventListener("pointerup", (e) => {
    if (!touchStart || state.phase !== "playing") {
      touchStart = null;
      return;
    }
    const elapsed = Date.now() - touchStart.time;
    const dy = e.clientY - touchStart.y;
    const dx = e.clientX - touchStart.x;

    // Quick flick up = hard drop (even if pointermove didn't catch it)
    if (dy < -30 && Math.abs(dy) > Math.abs(dx) * 1.5 && elapsed < 300) {
      hardDrop();
      touchStart = null;
      return;
    }

    if (!touchMoved && elapsed < 300) {
      // Tap = rotate
      const rect = canvas.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      if (tapX < rect.width * 0.3) {
        holdPiece();
      } else {
        tryRotate(1);
      }
    }
    touchStart = null;
  });

  canvas.addEventListener("pointercancel", () => { touchStart = null; });

  /* On-screen touch buttons */
  const touchControlsEl = document.getElementById("touchControls");
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    touchControlsEl.classList.add("visible");
  }

  let softDropInterval = null;
  touchControlsEl.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    e.preventDefault();
    Audio.init();
    Audio.resume();
    if (state.phase === "idle") startPlaying();
    if (state.phase !== "playing") return;

    const action = btn.dataset.action;
    switch (action) {
      case "moveLeft":
        moveHorizontal(-1);
        break;
      case "moveRight":
        moveHorizontal(1);
        break;
      case "rotateCW":
        tryRotate(1);
        break;
      case "rotateCCW":
        tryRotate(-1);
        break;
      case "hardDrop":
        hardDrop();
        break;
      case "softDrop":
        // Start continuous soft drop while held
        keysHeld.add("down");
        softDropInterval = setInterval(() => {
          if (state.phase !== "playing") {
            clearInterval(softDropInterval);
            softDropInterval = null;
            keysHeld.delete("down");
          }
        }, 100);
        break;
      case "hold":
        holdPiece();
        break;
    }
  });

  touchControlsEl.addEventListener("pointerup", (e) => {
    const btn = e.target.closest("[data-action]");
    if (btn && btn.dataset.action === "softDrop") {
      keysHeld.delete("down");
      if (softDropInterval) {
        clearInterval(softDropInterval);
        softDropInterval = null;
      }
    }
  });

  touchControlsEl.addEventListener("pointerleave", () => {
    keysHeld.delete("down");
    if (softDropInterval) {
      clearInterval(softDropInterval);
      softDropInterval = null;
    }
  });

  touchControlsEl.addEventListener("pointercancel", () => {
    keysHeld.delete("down");
    if (softDropInterval) {
      clearInterval(softDropInterval);
      softDropInterval = null;
    }
  });

  /* Mute & restart buttons */
  muteBtn.addEventListener("click", () => {
    Audio.init();
    const m = Audio.toggle();
    muteBtn.textContent = m ? "\u{1F507}" : "\u{1F50A}";
    state.muted = m;
  });

  restartBtn.addEventListener("click", () => {
    Audio.init();
    Audio.resume();
    resetGame();
  });

  /* Challenge Mode toggle */
  const challengeModeBtn = document.getElementById("challengeModeButton");
  if (challengeModeBtn) {
    challengeModeBtn.addEventListener("click", () => {
      Audio.init();
      Audio.resume();
      state.challengeMode = !state.challengeMode;
      challengeModeBtn.style.background = state.challengeMode ? '#ff4444' : '';
      challengeModeBtn.style.color = state.challengeMode ? '#fff' : '';
      resetGame();
    });
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
  function updateCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    if (isFullscreen) {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight - 52;
      const aspect = CW / CH;
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

  /* ── Tab Visibility ────────────────────────────────────────── */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { Audio.stopDrone(); }
    else if (state.phase === "playing" && !state.muted) { Audio.startDrone(); }
  });

  /* ================================================================== */
  /*  Game loop                                                          */
  /* ================================================================== */
  function update(dt) {
    if (state.phase === "playing" && state.lineClearTimer > 0) {
      state.lineClearTimer -= dt;
      if (state.lineClearTimer <= 0) {
        state.lineClearTimer = 0;
        resolveLineClear();
      }
      return; // Freeze movement during line clear animation
    }

    if (state.phase !== "playing" || !state.current) return;

    // Garbage rows (Challenge Mode)
    if (state.challengeMode) {
      state.garbageTimer += dt;
      if (state.garbageTimer >= state.garbageInterval) {
        state.garbageTimer = 0;
        pushGarbageRow();
        if (state.phase !== "playing") return;
      }
      if (state.garbageWarning > 0) {
        state.garbageWarning -= dt;
        if (state.garbageWarning < 0) state.garbageWarning = 0;
      }
    }

    // DAS
    if (das.direction !== 0) {
      das.timer += dt * 1000;
      if (!das.charged && das.timer >= das.delay) {
        das.charged = true;
        das.repeatTimer = 0;
      }
      if (das.charged) {
        das.repeatTimer += dt * 1000;
        while (das.repeatTimer >= das.rate) {
          das.repeatTimer -= das.rate;
          moveHorizontal(das.direction);
        }
      }
    }

    // Soft drop
    const softDropping = keysHeld.has("down");
    const effectiveInterval = softDropping
      ? Math.max(state.dropInterval / 20, 5)
      : state.dropInterval;

    state.dropAccumulator += dt * 1000;
    while (state.dropAccumulator >= effectiveInterval) {
      state.dropAccumulator -= effectiveInterval;
      if (!moveDown()) {
        // Piece has landed
        state.isLanding = true;
      } else if (softDropping) {
        state.score += 1;
        Audio.softDrop();
      }
    }

    // Lock delay
    if (state.isLanding) {
      // Verify still landing
      const { type, rotation, row, col } = state.current;
      if (isValid(type, rotation, row + 1, col)) {
        state.isLanding = false;
        state.lockTimer = 0;
      } else {
        state.lockTimer += dt * 1000;
        if (state.lockTimer >= 500) {
          lockPiece();
        }
      }
    }
  }

  /* ================================================================== */
  /*  Rendering                                                          */
  /* ================================================================== */
  function drawBlock(x, y, color, glow, dimmed) {
    currentSkin.drawBlock(x, y, color, glow, dimmed, ctx2d);
  }

  function drawMiniBlock(x, y, size, color) {
    const margin = 1;
    ctx2d.fillStyle = color;
    ctx2d.beginPath();
    if (ctx2d.roundRect) {
      ctx2d.roundRect(x + margin, y + margin, size - margin * 2, size - margin * 2, 2);
    } else {
      ctx2d.rect(x + margin, y + margin, size - margin * 2, size - margin * 2);
    }
    ctx2d.fill();
  }

  function drawPieceMini(type, x, y, cellSize, alpha) {
    const piece = PIECES[type];
    const cells = piece.cells[0];
    // Center the piece in its bounding box
    const size = piece.size;
    const offsetX = x + (4 * cellSize - size * cellSize) / 2;
    const offsetY = y + (4 * cellSize - size * cellSize) / 2;

    ctx2d.save();
    ctx2d.globalAlpha = alpha !== undefined ? alpha : 1;
    for (const [dr, dc] of cells) {
      drawMiniBlock(offsetX + dc * cellSize, offsetY + dr * cellSize, cellSize, themedColor(type));
    }
    ctx2d.restore();
  }

  function render() {
    /* Clear at native resolution */
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    /* Scale from game coords to canvas pixels */
    const scaleX = canvas.width / CW;
    const scaleY = canvas.height / CH;
    ctx2d.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    ctx2d.save();

    // Screen shake
    if (state.shakeTimer > 0) {
      const sx = (Math.random() - 0.5) * state.shakeIntensity;
      const sy = (Math.random() - 0.5) * state.shakeIntensity;
      ctx2d.translate(sx, sy);
    }

    // Background
    ctx2d.fillStyle = currentTheme.bg;
    ctx2d.fillRect(0, 0, CW, CH);

    // Draw playfield background
    ctx2d.fillStyle = currentTheme.field;
    ctx2d.fillRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);

    // Scanline texture on playfield
    ctx2d.fillStyle = 'rgba(0,0,0,0.04)';
    for (let sy = 0; sy < FIELD_H; sy += 2) {
      ctx2d.fillRect(FIELD_X, FIELD_Y + sy, FIELD_W, 1);
    }

    // Animated background sparkles (clipped to playfield)
    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.rect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
    ctx2d.clip();
    const acHex = currentTheme.accentColor;
    const acR = parseInt(acHex.slice(1,3),16);
    const acG = parseInt(acHex.slice(3,5),16);
    const acB = parseInt(acHex.slice(5,7),16);
    for (const sp of bgSparkles) {
      ctx2d.globalAlpha = sp.alpha * 0.5;
      ctx2d.fillStyle = 'rgba(' + acR + ',' + acG + ',' + acB + ',' + sp.alpha + ')';
      ctx2d.beginPath();
      ctx2d.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.restore();

    // Grid lines with level-pulsing opacity
    const gridPulse = 0.7 + 0.3 * Math.sin(Date.now() / (1000 / Math.max(1, state.level)) * 0.5);
    ctx2d.save();
    ctx2d.globalAlpha = gridPulse;
    ctx2d.strokeStyle = currentTheme.gridColor;
    ctx2d.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      const x = FIELD_X + c * CELL;
      ctx2d.beginPath();
      ctx2d.moveTo(x, FIELD_Y);
      ctx2d.lineTo(x, FIELD_Y + FIELD_H);
      ctx2d.stroke();
    }
    for (let r = 0; r <= VISIBLE_ROWS; r++) {
      const y = FIELD_Y + r * CELL;
      ctx2d.beginPath();
      ctx2d.moveTo(FIELD_X, y);
      ctx2d.lineTo(FIELD_X + FIELD_W, y);
      ctx2d.stroke();
    }
    ctx2d.restore();

    // Playfield border
    if (state.garbageWarning > 0) {
      ctx2d.save();
      ctx2d.shadowBlur = 16;
      ctx2d.shadowColor = 'rgba(255,0,0,' + Math.min(state.garbageWarning, 1) + ')';
      ctx2d.strokeStyle = 'rgba(255,0,0,' + Math.min(state.garbageWarning, 1) + ')';
      ctx2d.lineWidth = 3;
      ctx2d.strokeRect(FIELD_X - 2, FIELD_Y - 2, FIELD_W + 4, FIELD_H + 4);
      ctx2d.restore();
    }
    ctx2d.strokeStyle = currentTheme.borderColor;
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect(FIELD_X - 1, FIELD_Y - 1, FIELD_W + 2, FIELD_H + 2);

    // Locked blocks
    if (state.phase !== "paused") {
      for (let r = 4; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const pieceType = state.board[r][c];
          if (pieceType) {
            const bx = FIELD_X + c * CELL;
            const by = FIELD_Y + (r - 4) * CELL;

            // Game over greying
            if (state.phase === "gameover" && r > state.gameOverRow) {
              drawBlock(bx, by, "#333340", null, true);
            } else {
              drawBlock(bx, by, themedColor(pieceType), themedGlow(pieceType), true);
              // Glow skin particle leaks — tiny edge particles on 'glow' skin blocks
              if (currentSkinName === 'glow' && Math.random() < 0.012) {
                const edgeSide = Math.floor(Math.random() * 4);
                let epx, epy;
                if (edgeSide === 0) { epx = bx + Math.random() * CELL; epy = by; }
                else if (edgeSide === 1) { epx = bx + CELL; epy = by + Math.random() * CELL; }
                else if (edgeSide === 2) { epx = bx + Math.random() * CELL; epy = by + CELL; }
                else { epx = bx; epy = by + Math.random() * CELL; }
                state.particles.push({
                  x: epx, y: epy,
                  vx: (Math.random() - 0.5) * 20,
                  vy: -10 - Math.random() * 20,
                  life: 0.2 + Math.random() * 0.3,
                  maxLife: 0.5,
                  color: themedColor(pieceType),
                  size: 0.5 + Math.random() * 1,
                });
              }
            }
          }
        }
      }
    }

    // Line clear flash
    if (state.lineClearTimer > 0 && state.lineClearRows.length > 0) {
      const progress = 1 - state.lineClearTimer / 0.3;
      for (const row of state.lineClearRows) {
        const y = FIELD_Y + (row - 4) * CELL;
        ctx2d.fillStyle = `rgba(255,255,255,${0.8 * (1 - progress)})`;
        ctx2d.fillRect(FIELD_X, y, FIELD_W, CELL);
      }
      // Horizontal beam effect per cleared row
      for (const row of state.lineClearRows) {
        const progress = 1 - state.lineClearTimer / 0.3;
        const y = FIELD_Y + (row - 4) * CELL;
        const beamAlpha = state.lineClearTimer / 0.3;
        ctx2d.save();
        ctx2d.globalAlpha = beamAlpha * 0.6;
        const beamGrad = ctx2d.createLinearGradient(FIELD_X - 20 * progress, y + CELL/2, FIELD_X + FIELD_W + 20 * progress, y + CELL/2);
        beamGrad.addColorStop(0, 'transparent');
        beamGrad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        beamGrad.addColorStop(0.5, '#ffffff');
        beamGrad.addColorStop(0.7, 'rgba(255,255,255,0.8)');
        beamGrad.addColorStop(1, 'transparent');
        ctx2d.fillStyle = beamGrad;
        ctx2d.fillRect(FIELD_X - 20 * progress, y + CELL/2 - 2, FIELD_W + 40 * progress, 4);
        ctx2d.restore();
      }
    }

    // Lock flash
    if (state.lockFlash > 0 && state.phase !== "paused") {
      ctx2d.fillStyle = `rgba(255,255,255,${state.lockFlash})`;
      for (const [r, c] of state.lockFlashCells) {
        if (r >= 4) {
          ctx2d.fillRect(FIELD_X + c * CELL, FIELD_Y + (r - 4) * CELL, CELL, CELL);
        }
      }
    }

    if (state.phase !== "paused") {
      // Ghost piece
      if (state.current) {
        const ghostRow = getGhostRow();
        if (ghostRow !== state.current.row) {
          const cells = getCells(state.current.type, state.current.rotation, ghostRow, state.current.col);
          ctx2d.save();
          ctx2d.strokeStyle = "rgba(255,255,255,0.2)";
          ctx2d.lineWidth = 1.5;
          ctx2d.setLineDash([3, 3]);
          for (const [r, c] of cells) {
            if (r >= 4) {
              const bx = FIELD_X + c * CELL + 2;
              const by = FIELD_Y + (r - 4) * CELL + 2;
              ctx2d.strokeRect(bx, by, CELL - 4, CELL - 4);
            }
          }
          ctx2d.setLineDash([]);
          ctx2d.restore();
        }
      }

      // Current piece
      if (state.current) {
        const cells = getCells(state.current.type, state.current.rotation, state.current.row, state.current.col);
        for (const [r, c] of cells) {
          if (r >= 4) {
            const bx = FIELD_X + c * CELL;
            const by = FIELD_Y + (r - 4) * CELL;
            drawBlock(bx, by, themedColor(state.current.type), themedGlow(state.current.type), false);
          }
        }
      }
    }

    // Field vignette depth — darken edges of the playfield slightly
    ctx2d.save();
    const fvCx = FIELD_X + FIELD_W / 2;
    const fvCy = FIELD_Y + FIELD_H / 2;
    const fvRadius = Math.max(FIELD_W, FIELD_H) * 0.75;
    const fieldVig = ctx2d.createRadialGradient(fvCx, fvCy, FIELD_W * 0.25, fvCx, fvCy, fvRadius);
    fieldVig.addColorStop(0, 'rgba(0,0,0,0)');
    fieldVig.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx2d.fillStyle = fieldVig;
    ctx2d.beginPath();
    ctx2d.rect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
    ctx2d.fill();
    ctx2d.restore();

    // Level up flash
    if (state.levelUpFlash > 0) {
      const ar = parseInt(currentTheme.accentColor.slice(1,3),16);
      const ag = parseInt(currentTheme.accentColor.slice(3,5),16);
      const ab = parseInt(currentTheme.accentColor.slice(5,7),16);
      ctx2d.fillStyle = `rgba(${ar},${ag},${ab},${state.levelUpFlash * 0.3})`;
      ctx2d.fillRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
    }

    // ---- Side panels ----

    // Hold box
    const accentAlpha08 = currentTheme.accentColor + '14';
    const accentAlpha20 = currentTheme.accentColor + '33';
    ctx2d.fillStyle = accentAlpha08;
    ctx2d.strokeStyle = accentAlpha20;
    ctx2d.lineWidth = 1;
    const holdBoxX = 8;
    const holdBoxY = FIELD_Y;
    const holdBoxW = 82;
    const holdBoxH = 80;
    ctx2d.fillRect(holdBoxX, holdBoxY, holdBoxW, holdBoxH);
    ctx2d.strokeRect(holdBoxX, holdBoxY, holdBoxW, holdBoxH);
    // Hold box glow border
    ctx2d.save();
    ctx2d.shadowBlur = 6;
    ctx2d.shadowColor = currentTheme.accentColor;
    ctx2d.strokeStyle = currentTheme.borderColor;
    ctx2d.lineWidth = 1;
    ctx2d.strokeRect(holdBoxX, holdBoxY, holdBoxW, holdBoxH);
    ctx2d.restore();
    ctx2d.fillStyle = currentTheme.textColor;
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.textAlign = "center";
    ctx2d.fillText("HOLD", holdBoxX + holdBoxW / 2, holdBoxY + 14);

    if (state.holdPiece) {
      drawPieceMini(
        state.holdPiece,
        holdBoxX + (holdBoxW - 56) / 2,
        holdBoxY + 20,
        14,
        state.holdUsed ? 0.35 : 1
      );
    }

    // Score, Level, Lines on left panel
    const dimText = currentTheme.textColor + '80';
    const infoY = holdBoxY + holdBoxH + 20;
    ctx2d.textAlign = "left";
    ctx2d.fillStyle = dimText;
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText("SCORE", holdBoxX + 4, infoY);
    ctx2d.fillStyle = currentTheme.textColor;
    ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText(Math.floor(state.displayScore).toLocaleString(), holdBoxX + 4, infoY + 18);

    ctx2d.fillStyle = dimText;
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText("LEVEL", holdBoxX + 4, infoY + 44);
    ctx2d.fillStyle = currentTheme.textColor;
    ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText(String(state.level), holdBoxX + 4, infoY + 62);

    ctx2d.fillStyle = dimText;
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText("LINES", holdBoxX + 4, infoY + 88);
    ctx2d.fillStyle = currentTheme.textColor;
    ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText(String(state.lines), holdBoxX + 4, infoY + 106);

    // Next queue
    const nextBoxX = FIELD_X + FIELD_W + 10;
    const nextBoxY = FIELD_Y;
    const nextBoxW = 82;
    const nextBoxH = 340;
    ctx2d.fillStyle = accentAlpha08;
    ctx2d.strokeStyle = accentAlpha20;
    ctx2d.lineWidth = 1;
    ctx2d.fillRect(nextBoxX, nextBoxY, nextBoxW, nextBoxH);
    ctx2d.strokeRect(nextBoxX, nextBoxY, nextBoxW, nextBoxH);
    // Next box glow border
    ctx2d.save();
    ctx2d.shadowBlur = 6;
    ctx2d.shadowColor = currentTheme.accentColor;
    ctx2d.strokeStyle = currentTheme.borderColor;
    ctx2d.lineWidth = 1;
    ctx2d.strokeRect(nextBoxX, nextBoxY, nextBoxW, nextBoxH);
    ctx2d.restore();
    ctx2d.fillStyle = currentTheme.textColor;
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.textAlign = "center";
    ctx2d.fillText("NEXT", nextBoxX + nextBoxW / 2, nextBoxY + 14);

    for (let i = 0; i < Math.min(5, state.nextQueue.length); i++) {
      drawPieceMini(
        state.nextQueue[i],
        nextBoxX + (nextBoxW - 56) / 2,
        nextBoxY + 20 + i * 64,
        14,
        i === 0 ? 1 : 0.6
      );
    }

    // Best score on right panel
    const bestY = nextBoxY + nextBoxH + 20;
    ctx2d.textAlign = "left";
    ctx2d.fillStyle = dimText;
    ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText("BEST", nextBoxX + 4, bestY);
    ctx2d.fillStyle = currentTheme.textColor;
    ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
    ctx2d.fillText(state.best.toLocaleString(), nextBoxX + 4, bestY + 18);

    // Combo indicator
    if (state.combo > 0 && state.phase === "playing") {
      ctx2d.save();
      ctx2d.shadowBlur = 8;
      ctx2d.shadowColor = currentTheme.accentColor;
      const comboScale = 1 + Math.sin(performance.now() / 200) * 0.05;
      ctx2d.translate(nextBoxX + 4, bestY + 44);
      ctx2d.scale(comboScale, comboScale);
      ctx2d.fillStyle = dimText;
      ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("COMBO x" + state.combo, 0, 0);
      ctx2d.restore();
    }

    // Garbage timer indicator (Challenge Mode)
    if (state.challengeMode && state.phase === "playing") {
      var garbageY = bestY + 60;
      ctx2d.fillStyle = dimText;
      ctx2d.font = '700 10px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("GARBAGE", nextBoxX + 4, garbageY);
      var barW = nextBoxW - 8;
      var barH = 6;
      var barX = nextBoxX + 4;
      var barY = garbageY + 6;
      var progress = Math.min(state.garbageTimer / state.garbageInterval, 1);
      ctx2d.fillStyle = 'rgba(255,255,255,0.1)';
      ctx2d.fillRect(barX, barY, barW, barH);
      ctx2d.fillStyle = progress > 0.75 ? '#ff4444' : '#ff8833';
      ctx2d.fillRect(barX, barY, barW * progress, barH);
      ctx2d.fillStyle = dimText;
      ctx2d.font = '700 9px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText(Math.max(0, state.garbageInterval - state.garbageTimer).toFixed(1) + "s", barX, barY + 18);
    }

    // Particles
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      const size = p.size * alpha;
      ctx2d.save();
      ctx2d.globalAlpha = alpha;
      ctx2d.shadowBlur = 4;
      ctx2d.shadowColor = p.color;
      ctx2d.fillStyle = p.color;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
    }

    // Score pop
    if (state.scorePop > 0) {
      ctx2d.save();
      ctx2d.textAlign = "center";
      ctx2d.font = '700 18px "Trebuchet MS", system-ui, sans-serif';
      const popAlpha = Math.min(state.scorePop, 1);
      ctx2d.fillStyle = `rgba(255,255,255,${popAlpha})`;
      ctx2d.shadowBlur = 8;
      ctx2d.shadowColor = themedGlow('I');
      const floatY = (1 - state.scorePop) * -30;
      ctx2d.fillText(
        state.scorePopValue,
        state.scorePopX,
        Math.max(FIELD_Y + 20, state.scorePopY + floatY)
      );
      ctx2d.restore();
    }

    // ---- Overlays ----

    if (state.phase === "idle") {
      // Vignette
      const vg = ctx2d.createRadialGradient(CW / 2, CH / 2, CH * 0.2, CW / 2, CH / 2, CH * 0.7);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx2d.fillStyle = vg;
      ctx2d.fillRect(0, 0, CW, CH);

      ctx2d.textAlign = "center";
      ctx2d.save();
      ctx2d.shadowBlur = 20;
      ctx2d.shadowColor = currentTheme.accentColor;
      ctx2d.fillStyle = "#fff";
      ctx2d.font = '700 36px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("TETRIS", CW / 2, CH / 2 - 20);
      ctx2d.restore();

      ctx2d.fillStyle = currentTheme.textColor + (Math.floor((0.5 + Math.sin(Date.now() / 500) * 0.3) * 255)).toString(16).padStart(2,'0');
      ctx2d.font = '400 14px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("Press any key to start", CW / 2, CH / 2 + 20);
    }

    if (state.phase === "paused") {
      ctx2d.fillStyle = "rgba(0,0,0,0.7)";
      ctx2d.fillRect(0, 0, CW, CH);
      ctx2d.textAlign = "center";
      ctx2d.fillStyle = "#fff";
      ctx2d.font = '700 32px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("PAUSED", CW / 2, CH / 2);
      ctx2d.fillStyle = currentTheme.textColor + '99';
      ctx2d.font = '400 14px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("Press Esc to resume", CW / 2, CH / 2 + 30);
    }

    if (state.phase === "gameover") {
      const vg = ctx2d.createRadialGradient(CW / 2, CH / 2, CH * 0.15, CW / 2, CH / 2, CH * 0.7);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx2d.fillStyle = vg;
      ctx2d.fillRect(0, 0, CW, CH);

      ctx2d.textAlign = "center";
      ctx2d.save();
      ctx2d.shadowBlur = 15;
      ctx2d.shadowColor = "rgba(255,68,68,0.5)";
      ctx2d.fillStyle = "#fff";
      ctx2d.font = '700 34px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("GAME OVER", CW / 2, CH / 2 - 40);
      ctx2d.restore();

      ctx2d.fillStyle = currentTheme.textColor + 'b3';
      ctx2d.font = '400 16px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("Score: " + state.score.toLocaleString(), CW / 2, CH / 2);
      ctx2d.fillText(
        "Level " + state.level + "  •  " + state.lines + " lines",
        CW / 2,
        CH / 2 + 24
      );

      if (state.score === state.best && state.score > 0) {
        ctx2d.fillStyle = "#ffd700";
        ctx2d.font = '700 16px "Trebuchet MS", system-ui, sans-serif';
        ctx2d.fillText("New Best!", CW / 2, CH / 2 + 52);
      }

      ctx2d.fillStyle = currentTheme.textColor + (Math.floor((0.4 + Math.sin(Date.now() / 500) * 0.3) * 255)).toString(16).padStart(2,'0');
      ctx2d.font = '400 13px "Trebuchet MS", system-ui, sans-serif';
      ctx2d.fillText("Press Space to restart", CW / 2, CH / 2 + 80);
    }

    ctx2d.restore();

    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ================================================================== */
  /*  Main loop                                                          */
  /* ================================================================== */
  function loop(timestamp) {
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
    state.lastTime = timestamp;

    update(dt);
    updateParticles(dt);

    // Update background sparkles (drift upward, wrap around)
    for (const sp of bgSparkles) {
      sp.y -= sp.speed * dt;
      if (sp.y < FIELD_Y) {
        sp.y = FIELD_Y + FIELD_H;
        sp.x = FIELD_X + Math.random() * FIELD_W;
      }
    }

    // Decay effects
    if (state.shakeTimer > 0) {
      state.shakeTimer--;
      state.shakeIntensity *= 0.85;
      if (state.shakeIntensity < 0.3) state.shakeIntensity = 0;
    }
    if (state.scorePop > 0) state.scorePop *= 0.9;
    if (state.scorePop < 0.02) state.scorePop = 0;
    if (state.lockFlash > 0) state.lockFlash *= 0.88;
    if (state.lockFlash < 0.01) state.lockFlash = 0;
    if (state.levelUpFlash > 0) state.levelUpFlash *= 0.92;
    if (state.levelUpFlash < 0.01) state.levelUpFlash = 0;

    // Smooth score display
    if (state.displayScore < state.score) {
      state.displayScore += Math.ceil((state.score - state.displayScore) * 0.15);
      if (state.displayScore > state.score) state.displayScore = state.score;
    }

    // Game over animation (grey-out rows from bottom)
    if (state.phase === "gameover" && state.gameOverRow >= 4) {
      state.gameOverAnim += dt * 60;
      if (state.gameOverAnim >= 1) {
        state.gameOverAnim = 0;
        // Spawn debris particles for occupied cells in the greyed-out row
        for (let c = 0; c < COLS; c++) {
          if (state.board[state.gameOverRow][c] !== null) {
            const px = FIELD_X + c * CELL + CELL / 2;
            const py = FIELD_Y + (state.gameOverRow - 4) * CELL + CELL / 2;
            for (let di = 0; di < 3; di++) {
              state.particles.push({
                x: px, y: py,
                vx: (Math.random() - 0.5) * 60,
                vy: 50 + Math.random() * 100,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1.0,
                color: themedColor(state.board[state.gameOverRow][c]),
                size: 1.5 + Math.random() * 2,
              });
            }
          }
        }
        state.gameOverRow--;
      }
    }

    // Update HUD
    scoreEl.textContent = Math.floor(state.displayScore).toLocaleString();
    bestEl.textContent = state.best.toLocaleString();

    render();
    requestAnimationFrame(loop);
  }

  /* ================================================================== */
  /*  Boot                                                               */
  /* ================================================================== */
  /* --- Prevent scrolling / pull-to-refresh on mobile --- */
  document.addEventListener("touchmove", (e) => { e.preventDefault(); }, { passive: false });
  document.addEventListener("touchstart", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

  /* --- Dynamic canvas sizing for mobile portrait --- */
  const _gameHeader = document.querySelector('.game__header');
  const _gameHud = document.querySelector('.game__hud');
  const _touchControls = document.getElementById('touchControls');

  function fitCanvasToScreen() {
    const isMobile = window.innerWidth <= 600;
    if (!isMobile) { canvas.style.width = ''; canvas.style.height = ''; return; }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const headerH = _gameHeader ? _gameHeader.offsetHeight : 0;
    const hudH = _gameHud ? _gameHud.offsetHeight : 0;
    const touchH = (_touchControls && getComputedStyle(_touchControls).display !== 'none') ? _touchControls.offsetHeight : 0;

    const chrome = headerH + hudH + touchH + 16 + 12 + 16 + 20;
    const availH = vh - chrome;
    const availW = vw - 12 - 16;

    const aspectRatio = 3 / 4;
    let canvasW, canvasH;

    canvasH = availH;
    canvasW = canvasH * aspectRatio;

    if (canvasW > availW) {
      canvasW = availW;
      canvasH = canvasW / aspectRatio;
    }

    canvasW = Math.max(canvasW, 180);
    canvasH = Math.max(canvasH, 240);

    canvas.style.width = Math.floor(canvasW) + 'px';
    canvas.style.height = Math.floor(canvasH) + 'px';
  }

  fitCanvasToScreen();
  updateCanvasSize();
  let _resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(_resizeTimer); _resizeTimer = setTimeout(() => updateCanvasSize(), 80); });
  window.addEventListener('orientationchange', () => { setTimeout(() => updateCanvasSize(), 200); });

  state.best = Number(localStorage.getItem("tetrisBest")) || 0;
  const savedMute = localStorage.getItem("tetrisMuted");
  if (savedMute === "true") {
    state.muted = true;
    muteBtn.textContent = "\u{1F507}";
  }
  resetGame();
  requestAnimationFrame(loop);

  if (typeof Leaderboard !== 'undefined') {
    const lbPanel = document.getElementById('leaderboardPanel');
    lbPanel.appendChild(Leaderboard.createPanel('tetris'));
    const lbToggleBtn = document.getElementById('leaderboardToggle');
    if (lbToggleBtn) {
      lbToggleBtn.addEventListener('click', () => { lbPanel.classList.toggle('lb-visible'); });
      lbPanel.addEventListener('click', (e) => { if (e.target === lbPanel) lbPanel.classList.remove('lb-visible'); });
    }
  }
})();
