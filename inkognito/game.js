/* ============================================================
   INKOGNITO — AI Drawing Challenge
   Draw on canvas, AI guesses what you're drawing in real-time.
   ============================================================ */

(() => {
  "use strict";

  /* ── i18n ── */
  const _t = (key) => I18N.t(key);
  I18N.createSelector(document.querySelector('.game__header'));
  I18N.applyDOM();
  window.addEventListener('langchange', () => I18N.applyDOM());

  /* ── roundRect polyfill ── */
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === "number") r = [r, r, r, r];
      this.moveTo(x + r[0], y);
      this.arcTo(x + w, y, x + w, y + h, r[1]);
      this.arcTo(x + w, y + h, x, y + h, r[2]);
      this.arcTo(x, y + h, x, y, r[3]);
      this.arcTo(x, y, x + w, y, r[0]);
    };
  }

  /* ── Configuration ── */
  const CFG = {
    W: 480, H: 720,
    DRAW_SIZE: 400,
    ROUND_TIME: 20,
    TOTAL_ROUNDS: 10,
    CLASSIFY_INTERVAL: 300,
    GRID_SIZE: 28,
    CONFIDENCE_THRESHOLD: 0.40,
    STROKE_WIDTH: 4,
    COUNTDOWN_SECS: 3,
  };

  /* ── Color Palette ── */
  const PAL = {
    bg: '#0a0820',
    canvasBg: '#12103a',
    canvasBorder: '#2a2060',
    stroke: '#ffffff',
    accent: '#a855f7',
    accent2: '#00dca0',
    textPrimary: '#e8e0ff',
    textDim: 'rgba(200, 208, 247, 0.5)',
    correct: '#00dca0',
    wrong: '#ff5577',
    hudBg: 'rgba(10, 8, 32, 0.8)',
    barBg: 'rgba(255,255,255,0.08)',
    barFill: '#a855f7',
    barCorrect: '#00dca0',
  };

  /* ── Word Tiers ── */
  const TIERS = [
    // Tier 1 (rounds 1-3)
    ['circle', 'square', 'triangle', 'star', 'line', 'cross', 'heart', 'diamond'],
    // Tier 2 (rounds 4-6)
    ['sun', 'moon', 'house', 'tree', 'flower', 'car', 'boat', 'umbrella', 'cup', 'key'],
    // Tier 3 (rounds 7-8)
    ['cat', 'fish', 'bird', 'snake', 'butterfly', 'spider', 'rabbit'],
    // Tier 4 (rounds 9-10)
    ['lightning', 'spiral', 'mountain', 'cloud', 'eye', 'sword', 'skull', 'crown', 'rocket', 'music note'],
  ];

  function getTierForRound(round) {
    if (round <= 3) return 0;
    if (round <= 6) return 1;
    if (round <= 8) return 2;
    return 3;
  }

  /* ── Feature Templates ── */
  // Each template: [q1, q2, q3, q4, balH, balV, centerDens, edgeDens, fillRatio, aspectRatio, circularity, convexity, symH, symV, strokeCount, holeCount, endpointRatio, centroidX, centroidY]
  // 19 features per template
  const TEMPLATES = {
    // [q1, q2, q3, q4, balH, balV, centerDens, edgeDens, fillRatio, aspectRatio, circularity, convexity, symH, symV, strokeCount/5, holeCount/5, endpointRatio, centroidX, centroidY]
    'circle':      [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.15, 0.85, 0.28, 1.00, 1.00, 0.95, 0.95, 0.95, 0.20, 0.20, 0.00, 0.50, 0.50],
    'square':      [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.10, 0.90, 0.30, 1.00, 0.78, 1.00, 0.95, 0.95, 0.20, 0.20, 0.00, 0.50, 0.50],
    'triangle':    [0.35, 0.35, 0.15, 0.15, 0.50, 0.35, 0.20, 0.80, 0.20, 0.90, 0.60, 0.95, 0.85, 0.40, 0.20, 0.00, 0.05, 0.50, 0.40],
    'star':        [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.30, 0.70, 0.22, 1.00, 0.50, 0.60, 0.90, 0.90, 0.20, 0.00, 0.10, 0.50, 0.50],
    'line':        [0.30, 0.30, 0.20, 0.20, 0.50, 0.45, 0.40, 0.60, 0.05, 0.20, 0.00, 1.00, 0.40, 0.40, 0.20, 0.00, 1.00, 0.50, 0.45],
    'cross':       [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.50, 0.50, 0.15, 1.00, 0.30, 0.70, 0.95, 0.95, 0.40, 0.00, 0.80, 0.50, 0.50],
    'heart':       [0.30, 0.30, 0.20, 0.20, 0.50, 0.40, 0.25, 0.75, 0.25, 0.95, 0.65, 0.80, 0.90, 0.50, 0.20, 0.00, 0.05, 0.50, 0.45],
    'diamond':     [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.35, 0.65, 0.18, 0.80, 0.65, 0.90, 0.95, 0.95, 0.20, 0.00, 0.00, 0.50, 0.50],
    'sun':         [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.30, 0.70, 0.25, 1.00, 0.55, 0.60, 0.85, 0.85, 0.20, 0.20, 0.30, 0.50, 0.50],
    'moon':        [0.35, 0.15, 0.35, 0.15, 0.35, 0.50, 0.20, 0.80, 0.18, 0.85, 0.70, 0.85, 0.30, 0.85, 0.20, 0.00, 0.00, 0.40, 0.50],
    'house':       [0.30, 0.30, 0.20, 0.20, 0.50, 0.40, 0.20, 0.80, 0.22, 0.85, 0.35, 0.90, 0.85, 0.40, 0.40, 0.00, 0.10, 0.50, 0.45],
    'tree':        [0.25, 0.25, 0.25, 0.25, 0.50, 0.40, 0.30, 0.70, 0.20, 0.65, 0.40, 0.75, 0.80, 0.35, 0.40, 0.00, 0.05, 0.50, 0.42],
    'flower':      [0.25, 0.25, 0.25, 0.25, 0.50, 0.45, 0.30, 0.70, 0.22, 0.90, 0.55, 0.65, 0.85, 0.75, 0.40, 0.00, 0.10, 0.50, 0.48],
    'car':         [0.25, 0.25, 0.25, 0.25, 0.50, 0.55, 0.20, 0.80, 0.25, 1.50, 0.40, 0.85, 0.75, 0.60, 0.40, 0.40, 0.05, 0.50, 0.55],
    'boat':        [0.20, 0.20, 0.30, 0.30, 0.50, 0.60, 0.20, 0.80, 0.18, 1.40, 0.35, 0.85, 0.80, 0.50, 0.40, 0.00, 0.10, 0.50, 0.55],
    'umbrella':    [0.30, 0.30, 0.20, 0.20, 0.50, 0.40, 0.25, 0.75, 0.18, 0.80, 0.50, 0.80, 0.85, 0.40, 0.40, 0.00, 0.15, 0.50, 0.45],
    'cup':         [0.20, 0.20, 0.30, 0.30, 0.50, 0.55, 0.15, 0.85, 0.22, 0.80, 0.45, 0.90, 0.85, 0.50, 0.20, 0.00, 0.05, 0.50, 0.55],
    'key':         [0.30, 0.20, 0.30, 0.20, 0.45, 0.50, 0.25, 0.75, 0.12, 0.50, 0.30, 0.70, 0.60, 0.50, 0.20, 0.20, 0.20, 0.45, 0.50],
    'cat':         [0.28, 0.28, 0.22, 0.22, 0.50, 0.42, 0.25, 0.75, 0.22, 0.80, 0.50, 0.75, 0.80, 0.45, 0.40, 0.00, 0.15, 0.50, 0.45],
    'fish':        [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.25, 0.75, 0.25, 1.50, 0.55, 0.85, 0.70, 0.80, 0.20, 0.00, 0.10, 0.50, 0.50],
    'bird':        [0.30, 0.30, 0.20, 0.20, 0.50, 0.40, 0.20, 0.80, 0.15, 1.30, 0.40, 0.70, 0.70, 0.40, 0.40, 0.00, 0.20, 0.50, 0.42],
    'snake':       [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.35, 0.65, 0.10, 0.40, 0.15, 0.50, 0.40, 0.40, 0.20, 0.00, 0.50, 0.50, 0.50],
    'butterfly':   [0.25, 0.25, 0.25, 0.25, 0.50, 0.48, 0.25, 0.75, 0.22, 1.10, 0.50, 0.65, 0.90, 0.60, 0.40, 0.00, 0.10, 0.50, 0.48],
    'spider':      [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.35, 0.65, 0.18, 1.00, 0.35, 0.50, 0.85, 0.80, 0.60, 0.00, 0.60, 0.50, 0.50],
    'rabbit':      [0.28, 0.28, 0.22, 0.22, 0.50, 0.42, 0.25, 0.75, 0.20, 0.70, 0.45, 0.75, 0.80, 0.40, 0.40, 0.00, 0.15, 0.50, 0.42],
    'lightning':   [0.30, 0.20, 0.20, 0.30, 0.45, 0.50, 0.35, 0.65, 0.10, 0.50, 0.10, 0.80, 0.30, 0.40, 0.20, 0.00, 0.80, 0.48, 0.50],
    'spiral':      [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.40, 0.60, 0.15, 1.00, 0.80, 0.50, 0.70, 0.70, 0.20, 0.00, 0.30, 0.50, 0.50],
    'mountain':    [0.30, 0.30, 0.20, 0.20, 0.50, 0.35, 0.25, 0.75, 0.18, 1.30, 0.25, 0.90, 0.75, 0.30, 0.20, 0.00, 0.10, 0.50, 0.40],
    'cloud':       [0.25, 0.25, 0.25, 0.25, 0.50, 0.45, 0.20, 0.80, 0.25, 1.40, 0.70, 0.80, 0.80, 0.75, 0.20, 0.00, 0.00, 0.50, 0.47],
    'eye':         [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.35, 0.65, 0.20, 1.60, 0.60, 0.85, 0.85, 0.85, 0.40, 0.20, 0.00, 0.50, 0.50],
    'sword':       [0.25, 0.25, 0.25, 0.25, 0.50, 0.50, 0.30, 0.70, 0.10, 0.30, 0.10, 0.90, 0.80, 0.50, 0.40, 0.00, 0.30, 0.50, 0.50],
    'skull':       [0.28, 0.28, 0.22, 0.22, 0.50, 0.45, 0.25, 0.75, 0.25, 0.85, 0.70, 0.80, 0.90, 0.55, 0.40, 0.40, 0.05, 0.50, 0.47],
    'crown':       [0.30, 0.30, 0.20, 0.20, 0.50, 0.40, 0.22, 0.78, 0.20, 1.40, 0.35, 0.75, 0.85, 0.35, 0.20, 0.00, 0.15, 0.50, 0.42],
    'rocket':      [0.28, 0.28, 0.22, 0.22, 0.50, 0.42, 0.30, 0.70, 0.15, 0.50, 0.35, 0.85, 0.85, 0.40, 0.40, 0.00, 0.10, 0.50, 0.45],
    'music note':  [0.30, 0.20, 0.20, 0.30, 0.45, 0.48, 0.30, 0.70, 0.10, 0.60, 0.30, 0.70, 0.40, 0.40, 0.40, 0.20, 0.20, 0.47, 0.48],
  };

  /* Feature weights for weighted cosine similarity */
  const FEATURE_WEIGHTS = [
    1.5, 1.5, 1.5, 1.5,  // quadrant densities
    1.0, 1.0,              // balance H, V
    1.5, 1.5,              // center density, edge density
    3.0,                   // fill ratio
    2.5,                   // aspect ratio
    3.5,                   // circularity
    2.0,                   // convexity
    2.5, 2.5,              // symmetry H, V
    3.0,                   // stroke count (now normalized 0-1)
    3.0,                   // hole count (now normalized 0-1)
    2.0,                   // endpoint ratio
    0.5, 0.5,              // centroid X, Y
  ];

  /* ── Canvas & State ── */
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = CFG.W;
  canvas.height = CFG.H;

  // Offscreen drawing canvas
  const drawCanvas = document.createElement('canvas');
  drawCanvas.width = CFG.DRAW_SIZE;
  drawCanvas.height = CFG.DRAW_SIZE;
  const drawCtx = drawCanvas.getContext('2d');

  // Analysis canvas (28x28)
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = CFG.GRID_SIZE;
  gridCanvas.height = CFG.GRID_SIZE;
  const gridCtx = gridCanvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('bestScore');
  const muteBtn = document.getElementById('muteButton');
  const restartBtn = document.getElementById('restartButton');
  const lbToggle = document.getElementById('leaderboardToggle');
  const fsBtn = document.getElementById('fullscreenButton');
  const container = document.getElementById('gameContainer');
  const achToggle = document.getElementById('achievementsToggle');
  const achList = document.getElementById('achievementsList');
  const achPopup = document.getElementById('achievementPopup');
  const achPopupIcon = document.getElementById('achievementPopupIcon');
  const achPopupTitle = document.getElementById('achievementPopupTitle');
  const achPopupDesc = document.getElementById('achievementPopupDesc');

  /* ── Game State ── */
  const STATES = { MENU: 0, COUNTDOWN: 1, DRAWING: 2, ROUND_RESULT: 3, GAME_OVER: 4 };
  let state = STATES.MENU;
  let score = 0;
  let bestScore = Number(localStorage.getItem('inkognitoBest')) || 0;
  let round = 0;
  let targetWord = '';
  let timer = 0;
  let countdownTimer = 0;
  let lastClassifyTime = 0;
  let guesses = []; // [{word, confidence}]
  let roundCorrect = false;
  let roundScore = 0;
  let resultTimer = 0;
  let usedWords = [];
  let strokes = []; // Array of arrays of {x, y} points
  let currentStroke = null;
  let isDrawing = false;
  let animTime = 0;
  let lastTime = 0;
  let roundStats = { correctRounds: 0, totalTime: 0, fastestRound: Infinity, perfectGame: true };

  /* ── Drawing area position on game canvas ── */
  const DRAW_X = (CFG.W - CFG.DRAW_SIZE) / 2; // 40
  const DRAW_Y = 140;
  const TOOLS_Y = DRAW_Y - 36;
  const AI_Y = DRAW_Y + CFG.DRAW_SIZE + 12;

  /* ── HUD Element positions ── */
  const HUD_H = 55;

  bestEl.textContent = bestScore;

  /* ── Leaderboard ── */
  if (typeof Leaderboard !== 'undefined') {
    const lbPanel = Leaderboard.createPanel('inkognito');
    document.getElementById('leaderboardPanel').appendChild(lbPanel);
  }

  /* ── Achievements ── */
  const ACHIEVEMENTS = [
    { id: 'firstDraw',     icon: '\u270F\uFE0F',  title: _t('inkAchFirstDraw')      || 'First Stroke',      desc: _t('inkAchFirstDrawDesc')      || 'Complete your first round' },
    { id: 'sharpEye',      icon: '\uD83D\uDC41\uFE0F',  title: _t('inkAchSharpEye')       || 'Sharp Eye',         desc: _t('inkAchSharpEyeDesc')       || 'AI guesses correctly in under 5 seconds' },
    { id: 'perfectRound',  icon: '\u2B50',  title: _t('inkAchPerfectRound')   || 'Perfect Round',     desc: _t('inkAchPerfectRoundDesc')   || 'Get a perfect score on a round' },
    { id: 'artist',        icon: '\uD83C\uDFA8',  title: _t('inkAchArtist')         || 'Artist',            desc: _t('inkAchArtistDesc')         || 'Score 500 points' },
    { id: 'masterArtist',  icon: '\uD83C\uDFC6',  title: _t('inkAchMasterArtist')   || 'Master Artist',     desc: _t('inkAchMasterArtistDesc')   || 'Score 1000 points' },
    { id: 'speedDemon',    icon: '\u26A1',  title: _t('inkAchSpeedDemon')     || 'Speed Demon',       desc: _t('inkAchSpeedDemonDesc')     || 'Guess correct in under 3 seconds' },
    { id: 'perfectGame',   icon: '\uD83D\uDC8E',  title: _t('inkAchPerfectGame')    || 'Perfect Game',      desc: _t('inkAchPerfectGameDesc')    || 'Get all 10 rounds correct' },
    { id: 'dedicated',     icon: '\uD83D\uDD25',  title: _t('inkAchDedicated')      || 'Dedicated Player',  desc: _t('inkAchDedicatedDesc')      || 'Play 10 games' },
  ];

  let achData = { unlocked: [], stats: { gamesPlayed: 0 } };
  try {
    const saved = JSON.parse(localStorage.getItem('inkognitoAch') || '{}');
    if (saved.unlocked) achData = saved;
  } catch (e) {}

  function saveAch() {
    try { localStorage.setItem('inkognitoAch', JSON.stringify(achData)); } catch (e) {}
  }

  function unlockAchievement(id) {
    if (achData.unlocked.includes(id)) return;
    achData.unlocked.push(id);
    saveAch();
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;
    Audio.achievement();
    achPopupIcon.textContent = ach.icon;
    achPopupTitle.textContent = ach.title;
    achPopupDesc.textContent = ach.desc;
    achPopup.classList.add('show');
    setTimeout(() => achPopup.classList.remove('show'), 3000);
    renderAchievements();
  }

  function renderAchievements() {
    achList.innerHTML = '';
    for (const ach of ACHIEVEMENTS) {
      const el = document.createElement('div');
      el.className = 'achievement-item' + (achData.unlocked.includes(ach.id) ? ' unlocked' : '');
      el.innerHTML = `<span class="achievement-item__icon">${ach.icon}</span><span>${ach.title}</span>`;
      achList.appendChild(el);
    }
  }

  achToggle.addEventListener('click', () => achList.classList.toggle('open'));
  renderAchievements();

  /* ── Fullscreen ── */
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else {
      container.classList.toggle('pseudo-fullscreen');
    }
  });

  /* ── Mute ── */
  muteBtn.addEventListener('click', () => {
    Audio.init();
    Audio.resume();
    const m = Audio.toggle();
    muteBtn.textContent = m ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  });

  /* ── Restart ── */
  restartBtn.addEventListener('click', () => {
    if (state === STATES.DRAWING || state === STATES.COUNTDOWN) return;
    startGame();
  });

  /* ── Leaderboard toggle ── */
  if (lbToggle && typeof Leaderboard !== 'undefined') {
    lbToggle.addEventListener('click', () => Leaderboard.toggle());
  }

  /* ══════════════════════════════════════════════════════════
     AI CLASSIFIER
     ══════════════════════════════════════════════════════════ */

  function downsampleToGrid() {
    gridCtx.clearRect(0, 0, CFG.GRID_SIZE, CFG.GRID_SIZE);
    gridCtx.drawImage(drawCanvas, 0, 0, CFG.GRID_SIZE, CFG.GRID_SIZE);
    const imgData = gridCtx.getImageData(0, 0, CFG.GRID_SIZE, CFG.GRID_SIZE);
    const grid = [];
    for (let y = 0; y < CFG.GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < CFG.GRID_SIZE; x++) {
        const idx = (y * CFG.GRID_SIZE + x) * 4;
        // Any non-zero alpha or brightness means pixel is filled
        const brightness = (imgData.data[idx] + imgData.data[idx + 1] + imgData.data[idx + 2]) / 3;
        row.push(brightness > 30 ? 1 : 0);
      }
      grid.push(row);
    }
    return grid;
  }

  function extractFeatures(grid) {
    const S = CFG.GRID_SIZE;
    const half = S / 2;
    let total = 0, q1 = 0, q2 = 0, q3 = 0, q4 = 0;
    let sumX = 0, sumY = 0;
    let minX = S, maxX = 0, minY = S, maxY = 0;
    let centerCount = 0, edgeCount = 0;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (grid[y][x]) {
          total++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          if (y < half && x < half) q1++;
          else if (y < half && x >= half) q2++;
          else if (y >= half && x < half) q3++;
          else q4++;

          // Center vs edge (center = inner 50%)
          const cx = Math.abs(x - half) / half;
          const cy = Math.abs(y - half) / half;
          if (cx < 0.5 && cy < 0.5) centerCount++;
          else edgeCount++;
        }
      }
    }

    if (total === 0) return null;

    const fillRatio = total / (S * S);
    const centroidX = sumX / total / S;
    const centroidY = sumY / total / S;
    const balH = (q1 + q3) / total;
    const balV = (q1 + q2) / total;
    const centerDens = centerCount / total;
    const edgeDens = edgeCount / total;

    // Aspect ratio
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const aspectRatio = h > 0 ? w / h : 1;

    // Circularity: compare bounding box area usage
    const bbArea = w * h;
    const circularity = bbArea > 0 ? (total / bbArea) * (4 / Math.PI) : 0;

    // Convexity: ratio of filled pixels to convex hull area (approximate)
    const convexArea = w * h * 0.85; // rough approx
    const convexity = convexArea > 0 ? Math.min(1, total / convexArea) : 0;

    // Symmetry
    let symH = 0, symHTotal = 0;
    let symV = 0, symVTotal = 0;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < half; x++) {
        const mirrorX = S - 1 - x;
        symHTotal++;
        if (grid[y][x] === grid[y][mirrorX]) symH++;
      }
    }
    for (let y = 0; y < half; y++) {
      for (let x = 0; x < S; x++) {
        const mirrorY = S - 1 - y;
        symVTotal++;
        if (grid[y][x] === grid[mirrorY][x]) symV++;
      }
    }
    const symmetryH = symHTotal > 0 ? symH / symHTotal : 0;
    const symmetryV = symVTotal > 0 ? symV / symVTotal : 0;

    // Stroke count (connected components via flood fill)
    const visited = Array.from({ length: S }, () => new Uint8Array(S));
    let strokeCount = 0;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (grid[y][x] && !visited[y][x]) {
          strokeCount++;
          // BFS flood fill
          const queue = [[x, y]];
          visited[y][x] = 1;
          while (queue.length) {
            const [cx, cy] = queue.pop();
            for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && nx < S && ny >= 0 && ny < S && grid[ny][nx] && !visited[ny][nx]) {
                visited[ny][nx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }
      }
    }

    // Hole count (connected components of background inside bounding box)
    const bgVisited = Array.from({ length: S }, () => new Uint8Array(S));
    let holeCount = 0;
    // Mark border-connected background
    const borderQueue = [];
    for (let x = 0; x < S; x++) {
      if (!grid[0][x] && !bgVisited[0][x]) { bgVisited[0][x] = 1; borderQueue.push([x, 0]); }
      if (!grid[S-1][x] && !bgVisited[S-1][x]) { bgVisited[S-1][x] = 1; borderQueue.push([x, S-1]); }
    }
    for (let y = 0; y < S; y++) {
      if (!grid[y][0] && !bgVisited[y][0]) { bgVisited[y][0] = 1; borderQueue.push([0, y]); }
      if (!grid[y][S-1] && !bgVisited[y][S-1]) { bgVisited[y][S-1] = 1; borderQueue.push([S-1, y]); }
    }
    while (borderQueue.length) {
      const [cx, cy] = borderQueue.pop();
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < S && ny >= 0 && ny < S && !grid[ny][nx] && !bgVisited[ny][nx]) {
          bgVisited[ny][nx] = 1;
          borderQueue.push([nx, ny]);
        }
      }
    }
    // Count remaining unvisited background pixels as holes
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!grid[y][x] && !bgVisited[y][x]) {
          holeCount++;
          const holeQ = [[x, y]];
          bgVisited[y][x] = 1;
          while (holeQ.length) {
            const [cx, cy] = holeQ.pop();
            for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && nx < S && ny >= 0 && ny < S && !grid[ny][nx] && !bgVisited[ny][nx]) {
                bgVisited[ny][nx] = 1;
                holeQ.push([nx, ny]);
              }
            }
          }
        }
      }
    }

    // Endpoint ratio: count pixels with exactly 1 neighbor
    let endpoints = 0;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (grid[y][x]) {
          let neighbors = 0;
          for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < S && ny >= 0 && ny < S && grid[ny][nx]) neighbors++;
          }
          if (neighbors <= 1) endpoints++;
        }
      }
    }
    const endpointRatio = total > 0 ? endpoints / total : 0;

    // Normalize quadrant densities
    return [
      q1 / total, q2 / total, q3 / total, q4 / total,
      balH, balV,
      centerDens, edgeDens,
      fillRatio,
      Math.min(2, aspectRatio),
      Math.min(1, circularity),
      Math.min(1, convexity),
      symmetryH, symmetryV,
      Math.min(5, strokeCount) / 5,
      Math.min(5, holeCount) / 5,
      Math.min(1, endpointRatio),
      centroidX, centroidY,
    ];
  }

  function weightedCosineSimilarity(a, b) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      const w = FEATURE_WEIGHTS[i] || 1;
      dotProduct += a[i] * b[i] * w;
      normA += a[i] * a[i] * w;
      normB += b[i] * b[i] * w;
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  function classify() {
    const grid = downsampleToGrid();
    const features = extractFeatures(grid);
    if (!features) {
      guesses = [];
      return;
    }

    const scores = [];
    for (const [word, template] of Object.entries(TEMPLATES)) {
      const sim = weightedCosineSimilarity(features, template);
      scores.push({ word, confidence: sim });
    }

    scores.sort((a, b) => b.confidence - a.confidence);
    // Normalize top scores to create better spread
    const maxConf = scores[0].confidence;
    const minConf = scores[scores.length - 1].confidence;
    const range = maxConf - minConf;

    guesses = scores.slice(0, 3).map(s => ({
      word: s.word,
      confidence: range > 0 ? (s.confidence - minConf) / range : 0.5,
    }));

    // Check for correct guess
    if (!roundCorrect && guesses.length > 0 && guesses[0].word === targetWord && guesses[0].confidence >= CFG.CONFIDENCE_THRESHOLD) {
      roundCorrect = true;
      const timeLeft = timer;
      const tierMultiplier = getTierForRound(round) + 1;
      roundScore = Math.ceil(timeLeft * 10 * tierMultiplier);
      score += roundScore;
      Audio.correct();

      // Achievement checks
      unlockAchievement('firstDraw');
      if (CFG.ROUND_TIME - timeLeft < 5) unlockAchievement('sharpEye');
      if (CFG.ROUND_TIME - timeLeft < 3) unlockAchievement('speedDemon');
      if (timeLeft >= CFG.ROUND_TIME - 1) unlockAchievement('perfectRound');
      roundStats.totalTime += (CFG.ROUND_TIME - timeLeft);
      if (timeLeft < roundStats.fastestRound) roundStats.fastestRound = timeLeft;
      roundStats.correctRounds++;

      // Transition to result
      state = STATES.ROUND_RESULT;
      resultTimer = 2.0;
    }
  }

  /* ══════════════════════════════════════════════════════════
     DRAWING SYSTEM
     ══════════════════════════════════════════════════════════ */

  function clearDrawing() {
    drawCtx.clearRect(0, 0, CFG.DRAW_SIZE, CFG.DRAW_SIZE);
    strokes = [];
    currentStroke = null;
    guesses = [];
  }

  function redrawStrokes() {
    drawCtx.clearRect(0, 0, CFG.DRAW_SIZE, CFG.DRAW_SIZE);
    drawCtx.strokeStyle = PAL.stroke;
    drawCtx.lineWidth = CFG.STROKE_WIDTH;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      drawCtx.beginPath();
      drawCtx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        drawCtx.lineTo(stroke[i].x, stroke[i].y);
      }
      drawCtx.stroke();
    }
  }

  function undoStroke() {
    if (strokes.length === 0) return;
    strokes.pop();
    redrawStrokes();
    Audio.undo();
  }

  function getDrawPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CFG.W / rect.width;
    const scaleY = CFG.H / rect.height;
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    // Convert to draw canvas coords
    const drawX = canvasX - DRAW_X;
    const drawY = canvasY - DRAW_Y;
    return { x: drawX, y: drawY };
  }

  function isInDrawArea(pos) {
    return pos.x >= 0 && pos.x <= CFG.DRAW_SIZE && pos.y >= 0 && pos.y <= CFG.DRAW_SIZE;
  }

  function isInButton(canvasX, canvasY, bx, by, bw, bh) {
    return canvasX >= bx && canvasX <= bx + bw && canvasY >= by && canvasY <= by + bh;
  }

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CFG.W / rect.width;
    const scaleY = CFG.H / rect.height;
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  /* Pointer events */
  function onPointerDown(e) {
    e.preventDefault();
    Audio.init();
    Audio.resume();

    if (state === STATES.MENU) {
      startGame();
      return;
    }

    if (state === STATES.GAME_OVER) {
      startGame();
      return;
    }

    if (state !== STATES.DRAWING || roundCorrect) return;

    const canvasPos = getCanvasPos(e);

    // Check undo button
    if (isInButton(canvasPos.x, canvasPos.y, DRAW_X, TOOLS_Y, 80, 28)) {
      undoStroke();
      return;
    }
    // Check clear button
    if (isInButton(canvasPos.x, canvasPos.y, DRAW_X + 90, TOOLS_Y, 80, 28)) {
      clearDrawing();
      Audio.clear();
      return;
    }

    const pos = getDrawPos(e);
    if (!isInDrawArea(pos)) return;

    isDrawing = true;
    currentStroke = [{ x: pos.x, y: pos.y }];

    drawCtx.strokeStyle = PAL.stroke;
    drawCtx.lineWidth = CFG.STROKE_WIDTH;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawCtx.beginPath();
    drawCtx.moveTo(pos.x, pos.y);
    Audio.stroke();
  }

  function onPointerMove(e) {
    e.preventDefault();
    if (!isDrawing || state !== STATES.DRAWING || roundCorrect) return;

    const pos = getDrawPos(e);
    // Clamp to draw area
    pos.x = Math.max(0, Math.min(CFG.DRAW_SIZE, pos.x));
    pos.y = Math.max(0, Math.min(CFG.DRAW_SIZE, pos.y));

    currentStroke.push({ x: pos.x, y: pos.y });
    drawCtx.lineTo(pos.x, pos.y);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(pos.x, pos.y);
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke && currentStroke.length > 0) {
      strokes.push(currentStroke);
      currentStroke = null;
    }
  }

  // Unified pointer events
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // Prevent context menu
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  /* Keyboard shortcuts */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && state === STATES.DRAWING) {
      e.preventDefault();
      undoStroke();
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (state === STATES.MENU || state === STATES.GAME_OVER) {
        e.preventDefault();
        Audio.init();
        Audio.resume();
        startGame();
      }
    }
  });

  /* ══════════════════════════════════════════════════════════
     GAME LOGIC
     ══════════════════════════════════════════════════════════ */

  function pickWord() {
    const tier = getTierForRound(round);
    const pool = TIERS[tier].filter(w => !usedWords.includes(w));
    if (pool.length === 0) return TIERS[tier][Math.floor(Math.random() * TIERS[tier].length)];
    const word = pool[Math.floor(Math.random() * pool.length)];
    usedWords.push(word);
    return word;
  }

  function startGame() {
    score = 0;
    round = 0;
    usedWords = [];
    roundStats = { correctRounds: 0, totalTime: 0, fastestRound: Infinity, perfectGame: true };
    startRound();
  }

  function startRound() {
    round++;
    if (round > CFG.TOTAL_ROUNDS) {
      endGame();
      return;
    }
    targetWord = pickWord();
    timer = CFG.ROUND_TIME;
    countdownTimer = CFG.COUNTDOWN_SECS;
    roundCorrect = false;
    roundScore = 0;
    guesses = [];
    lastClassifyTime = 0;
    clearDrawing();
    state = STATES.COUNTDOWN;
    Audio.newRound();
  }

  function endGame() {
    state = STATES.GAME_OVER;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('inkognitoBest', bestScore);
      bestEl.textContent = bestScore;
    }
    scoreEl.textContent = score;

    // Submit to leaderboard
    if (typeof Leaderboard !== 'undefined' && score > 0) {
      Leaderboard.submitScore('inkognito', score);
    }

    // Achievement checks
    achData.stats.gamesPlayed = (achData.stats.gamesPlayed || 0) + 1;
    saveAch();
    if (score >= 500) unlockAchievement('artist');
    if (score >= 1000) unlockAchievement('masterArtist');
    if (roundStats.correctRounds === CFG.TOTAL_ROUNDS) unlockAchievement('perfectGame');
    if (achData.stats.gamesPlayed >= 10) unlockAchievement('dedicated');

    Audio.gameOver();
  }

  /* ══════════════════════════════════════════════════════════
     RENDERING
     ══════════════════════════════════════════════════════════ */

  function render(dt) {
    ctx.clearRect(0, 0, CFG.W, CFG.H);

    // Background
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(140, 60, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CFG.W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CFG.H); ctx.stroke();
    }
    for (let y = 0; y < CFG.H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CFG.W, y); ctx.stroke();
    }

    switch (state) {
      case STATES.MENU: renderMenu(dt); break;
      case STATES.COUNTDOWN: renderCountdown(dt); break;
      case STATES.DRAWING: renderDrawing(dt); break;
      case STATES.ROUND_RESULT: renderResult(dt); break;
      case STATES.GAME_OVER: renderGameOver(dt); break;
    }
  }

  function renderMenu(dt) {
    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px "Trebuchet MS", system-ui, sans-serif';
    const grad = ctx.createLinearGradient(CFG.W / 2 - 120, 200, CFG.W / 2 + 120, 200);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(0.5, '#00dca0');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.fillText('INKOGNITO', CFG.W / 2, 220);

    ctx.font = '18px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textDim;
    ctx.fillText('A I   D R A W I N G   C H A L L E N G E', CFG.W / 2, 260);

    // Animated pencil icon
    const pencilY = 340 + Math.sin(animTime * 2) * 8;
    ctx.font = '64px sans-serif';
    ctx.fillText('\u270F\uFE0F', CFG.W / 2, pencilY);

    // Instructions
    ctx.font = '16px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textPrimary;
    ctx.fillText('Draw what the AI asks you to draw', CFG.W / 2, 420);
    ctx.fillText('The AI will try to guess in real-time!', CFG.W / 2, 445);

    ctx.font = '15px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textDim;
    ctx.fillText('10 rounds \u2022 20 seconds each \u2022 Score = speed', CFG.W / 2, 485);

    // Start prompt
    const pulse = 0.5 + Math.sin(animTime * 3) * 0.3;
    ctx.font = 'bold 18px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = `rgba(168, 85, 247, ${pulse + 0.2})`;
    const isMobile = 'ontouchstart' in window;
    ctx.fillText(isMobile ? 'Tap to Start' : 'Click or Press Space to Start', CFG.W / 2, 560);

    ctx.restore();
  }

  function renderCountdown(dt) {
    // Draw the prompt header already
    renderHUD();
    renderPrompt();

    // Draw canvas area (dark)
    ctx.fillStyle = PAL.canvasBg;
    ctx.beginPath();
    ctx.roundRect(DRAW_X, DRAW_Y, CFG.DRAW_SIZE, CFG.DRAW_SIZE, 12);
    ctx.fill();
    ctx.strokeStyle = PAL.canvasBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(DRAW_X, DRAW_Y, CFG.DRAW_SIZE, CFG.DRAW_SIZE, 12);
    ctx.stroke();

    // Countdown number
    const num = Math.ceil(countdownTimer);
    const scale = 1 + (countdownTimer % 1) * 0.3;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(80 * scale)}px "Trebuchet MS", system-ui, sans-serif`;
    ctx.fillStyle = num === 0 ? PAL.accent2 : PAL.accent;
    ctx.globalAlpha = 0.3 + (countdownTimer % 1) * 0.7;
    ctx.fillText(num > 0 ? String(num) : 'GO!', CFG.W / 2, DRAW_Y + CFG.DRAW_SIZE / 2);
    ctx.restore();
  }

  function renderHUD() {
    // HUD bar
    ctx.fillStyle = PAL.hudBg;
    ctx.fillRect(0, 0, CFG.W, HUD_H);

    ctx.save();
    ctx.textBaseline = 'middle';

    // Round
    ctx.font = 'bold 14px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textDim;
    ctx.textAlign = 'left';
    ctx.fillText(`Round ${round}/${CFG.TOTAL_ROUNDS}`, 16, 20);

    // Score
    ctx.font = 'bold 22px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textPrimary;
    ctx.textAlign = 'left';
    ctx.fillText(String(score), 16, 42);

    // Timer arc
    if (state === STATES.DRAWING || state === STATES.ROUND_RESULT) {
      const timerX = CFG.W - 36;
      const timerY = HUD_H / 2;
      const timerR = 20;
      const pct = timer / CFG.ROUND_TIME;

      ctx.strokeStyle = PAL.barBg;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(timerX, timerY, timerR, 0, Math.PI * 2);
      ctx.stroke();

      const timerColor = pct > 0.3 ? PAL.accent2 : pct > 0.15 ? '#ffaa00' : PAL.wrong;
      ctx.strokeStyle = timerColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(timerX, timerY, timerR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.stroke();

      ctx.font = 'bold 14px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillStyle = timerColor;
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(timer) + 's', timerX, timerY + 1);
    }

    ctx.restore();
  }

  function renderPrompt() {
    ctx.save();
    ctx.textAlign = 'center';

    // "Draw a ___"
    ctx.font = '16px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textDim;
    ctx.fillText('Draw a', CFG.W / 2, HUD_H + 20);

    ctx.font = 'bold 28px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.accent;
    ctx.fillText(targetWord.toUpperCase(), CFG.W / 2, HUD_H + 50);

    ctx.restore();
  }

  function renderToolbar() {
    // Undo button
    ctx.save();
    ctx.fillStyle = strokes.length > 0 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(DRAW_X, TOOLS_Y, 80, 28, 6);
    ctx.fill();
    ctx.strokeStyle = strokes.length > 0 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(DRAW_X, TOOLS_Y, 80, 28, 6);
    ctx.stroke();
    ctx.font = '13px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = strokes.length > 0 ? PAL.textPrimary : PAL.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u21A9 Undo', DRAW_X + 40, TOOLS_Y + 14);

    // Clear button
    ctx.fillStyle = strokes.length > 0 ? 'rgba(255, 85, 119, 0.15)' : 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(DRAW_X + 90, TOOLS_Y, 80, 28, 6);
    ctx.fill();
    ctx.strokeStyle = strokes.length > 0 ? 'rgba(255, 85, 119, 0.3)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(DRAW_X + 90, TOOLS_Y, 80, 28, 6);
    ctx.stroke();
    ctx.fillStyle = strokes.length > 0 ? '#ff5577' : PAL.textDim;
    ctx.fillText('\u2716 Clear', DRAW_X + 130, TOOLS_Y + 14);

    ctx.restore();
  }

  function renderDrawCanvas() {
    // Draw area background
    ctx.fillStyle = PAL.canvasBg;
    ctx.beginPath();
    ctx.roundRect(DRAW_X, DRAW_Y, CFG.DRAW_SIZE, CFG.DRAW_SIZE, 12);
    ctx.fill();

    // Draw area border
    ctx.strokeStyle = roundCorrect ? PAL.correct : PAL.canvasBorder;
    ctx.lineWidth = roundCorrect ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(DRAW_X, DRAW_Y, CFG.DRAW_SIZE, CFG.DRAW_SIZE, 12);
    ctx.stroke();

    // Clip and draw the offscreen canvas
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(DRAW_X, DRAW_Y, CFG.DRAW_SIZE, CFG.DRAW_SIZE, 12);
    ctx.clip();
    ctx.drawImage(drawCanvas, DRAW_X, DRAW_Y);
    ctx.restore();
  }

  function renderAIGuesses() {
    const barW = CFG.DRAW_SIZE;
    const barH = 24;
    const gap = 8;
    let y = AI_Y;

    ctx.save();
    ctx.font = 'bold 12px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('AI Guesses:', DRAW_X, y);
    y += 16;

    for (let i = 0; i < 3; i++) {
      const guess = guesses[i];
      const word = guess ? guess.word : '---';
      const conf = guess ? guess.confidence : 0;
      const isCorrect = guess && guess.word === targetWord && conf >= CFG.CONFIDENCE_THRESHOLD;

      // Bar background
      ctx.fillStyle = PAL.barBg;
      ctx.beginPath();
      ctx.roundRect(DRAW_X, y, barW, barH, 4);
      ctx.fill();

      // Bar fill
      const fillW = barW * Math.min(1, conf);
      if (fillW > 0) {
        ctx.fillStyle = isCorrect ? PAL.barCorrect : (i === 0 ? PAL.barFill : 'rgba(168, 85, 247, 0.3)');
        ctx.beginPath();
        ctx.roundRect(DRAW_X, y, fillW, barH, 4);
        ctx.fill();
      }

      // Label
      ctx.font = 'bold 12px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillStyle = isCorrect ? '#ffffff' : PAL.textPrimary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(word, DRAW_X + 8, y + barH / 2);

      // Confidence percentage
      ctx.textAlign = 'right';
      ctx.fillStyle = PAL.textDim;
      ctx.fillText(Math.round(conf * 100) + '%', DRAW_X + barW - 8, y + barH / 2);

      y += barH + gap;
    }

    ctx.restore();
  }

  function renderDrawing(dt) {
    renderHUD();
    renderPrompt();
    renderToolbar();
    renderDrawCanvas();
    renderAIGuesses();
    scoreEl.textContent = score;
  }

  function renderResult(dt) {
    renderHUD();

    // Draw canvas with result
    renderDrawCanvas();

    // Result overlay
    ctx.save();
    ctx.textAlign = 'center';

    const centerY = DRAW_Y + CFG.DRAW_SIZE / 2;

    if (roundCorrect) {
      ctx.font = 'bold 36px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillStyle = PAL.correct;
      ctx.fillText('\u2714 CORRECT!', CFG.W / 2, centerY - 30);

      ctx.font = 'bold 24px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillStyle = PAL.textPrimary;
      ctx.fillText('+' + roundScore, CFG.W / 2, centerY + 15);
    } else {
      ctx.font = 'bold 36px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillStyle = PAL.wrong;
      ctx.fillText('\u2716 TIME\'S UP!', CFG.W / 2, centerY - 30);

      ctx.font = '18px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillStyle = PAL.textDim;
      ctx.fillText('The word was: ' + targetWord.toUpperCase(), CFG.W / 2, centerY + 15);

      roundStats.perfectGame = false;
    }

    ctx.restore();

    // Show AI guesses
    renderAIGuesses();
  }

  function renderGameOver(dt) {
    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'bold 42px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textPrimary;
    ctx.fillText('GAME OVER', CFG.W / 2, 160);

    // Score
    ctx.font = 'bold 64px "Trebuchet MS", system-ui, sans-serif';
    const scoreGrad = ctx.createLinearGradient(CFG.W / 2 - 80, 230, CFG.W / 2 + 80, 230);
    scoreGrad.addColorStop(0, '#a855f7');
    scoreGrad.addColorStop(1, '#00dca0');
    ctx.fillStyle = scoreGrad;
    ctx.fillText(String(score), CFG.W / 2, 240);

    // Best
    ctx.font = '18px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textDim;
    ctx.fillText('Best: ' + bestScore, CFG.W / 2, 280);

    if (score >= bestScore && score > 0) {
      ctx.font = 'bold 20px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('\u2B50 NEW BEST! \u2B50', CFG.W / 2, 310);
    }

    // Stats
    ctx.font = '15px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = PAL.textDim;
    const statsY = 360;
    ctx.fillText(`Correct: ${roundStats.correctRounds}/${CFG.TOTAL_ROUNDS}`, CFG.W / 2, statsY);
    if (roundStats.correctRounds > 0) {
      ctx.fillText(`Fastest: ${(CFG.ROUND_TIME - roundStats.fastestRound).toFixed(1)}s`, CFG.W / 2, statsY + 25);
    }

    // Play again
    const pulse = 0.5 + Math.sin(animTime * 3) * 0.3;
    ctx.font = 'bold 18px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillStyle = `rgba(168, 85, 247, ${pulse + 0.2})`;
    const isMobile = 'ontouchstart' in window;
    ctx.fillText(isMobile ? 'Tap to Play Again' : 'Click or Press Space to Play Again', CFG.W / 2, 500);

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     GAME LOOP
     ══════════════════════════════════════════════════════════ */

  function update(dt) {
    animTime += dt;

    switch (state) {
      case STATES.COUNTDOWN: {
        const prevSec = Math.ceil(countdownTimer);
        countdownTimer -= dt;
        const curSec = Math.ceil(countdownTimer);
        if (curSec !== prevSec && curSec > 0) Audio.tick();
        if (countdownTimer <= 0) {
          state = STATES.DRAWING;
          Audio.go();
        }
        break;
      }

      case STATES.DRAWING: {
        if (!roundCorrect) {
          timer -= dt;
          if (timer <= 0) {
            timer = 0;
            roundCorrect = false;
            roundStats.perfectGame = false;
            Audio.wrong();
            state = STATES.ROUND_RESULT;
            resultTimer = 2.5;
            // Run final classification
            classify();
          }

          // Periodic classification
          lastClassifyTime += dt * 1000;
          if (lastClassifyTime >= CFG.CLASSIFY_INTERVAL && strokes.length > 0) {
            lastClassifyTime = 0;
            classify();
          }
        }
        break;
      }

      case STATES.ROUND_RESULT: {
        resultTimer -= dt;
        if (resultTimer <= 0) {
          startRound();
        }
        break;
      }
    }
  }

  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(0.1, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    update(dt);
    render(dt);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

})();
