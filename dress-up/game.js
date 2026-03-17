/* ================================================================
   Dress-Up Game — Main Engine  (Fashion-Slim Proportions)
   ================================================================ */
(function () {
'use strict';

/* ── DOM refs ── */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const charSelectEl = document.getElementById('charSelect');
const categoryTabsEl = document.getElementById('categoryTabs');
const itemGridEl = document.getElementById('itemGrid');
const hudScore = document.getElementById('hudScore');
const hudTimer = document.getElementById('hudTimer');
const scoreDisplay = document.getElementById('scoreDisplay');
const challengeOverlay = document.getElementById('challengeOverlay');
const challengeTheme = document.getElementById('challengeTheme');
const challengeStars = document.getElementById('challengeStars');
const challengeScoreDisplay = document.getElementById('challengeScoreDisplay');
const challengeCloseBtn = document.getElementById('challengeCloseBtn');
const loadModal = document.getElementById('loadModal');
const savedOutfitsEl = document.getElementById('savedOutfits');
const loadModalClose = document.getElementById('loadModalClose');
const achievementsList = document.getElementById('achievementsList');
const achievementsToggle = document.getElementById('achievementsToggle');
const achievementPopup = document.getElementById('achievementPopup');
const achievementPopupIcon = document.getElementById('achievementPopupIcon');
const achievementPopupTitle = document.getElementById('achievementPopupTitle');
const achievementPopupDesc = document.getElementById('achievementPopupDesc');

/* ── i18n helper ── */
function t(key, fb) {
  if (typeof I18N !== 'undefined' && I18N.t) {
    const val = I18N.t(key);
    return (val && val !== key) ? val : fb;
  }
  return fb;
}

/* ── State ── */
let currentCharIdx = 0;
let currentCategory = 'top';
let equipped = {};
let challengeActive = false;
let challengeTimer = 0;
let challengeInterval = null;
let currentChallengeTheme = null;
let colorCycleCount = {};

const CATEGORIES = ['top','bottom','dress','shoes','accessory','background'];
const SAVE_KEY = 'dressUpOutfits';
const ACHIEVE_KEY = 'dressUpAchievements';
const STATS_KEY = 'dressUpStats';
const COINS_KEY = 'dressUpCoins';
const UNLOCKED_KEY = 'dressUpUnlocked';

/* ── Premium Items (~30% per category) ── */
const PREMIUM_IDS = new Set([
  'hair_long_flowing','hair_braids','hair_curly',
  'top_armor','top_wizard_robe','top_kimono','top_corset',
  'bottom_flowing_skirt','bottom_armor_greaves','bottom_bell_bottoms',
  'shoes_armored_boots','shoes_platforms','shoes_heels',
  'acc_crown','acc_extra_wings','acc_cape',
  'bg_space','bg_castle','bg_rainbow',
  'dress_ball_gown','dress_fairy_dress',
]);

const PREMIUM_COST = {
  hair:25, top:30, bottom:25, dress:30, shoes:25, accessory:30, background:35
};

/* ── Ko-fi Shop (shared module) ── */
// Shop.init() called at bottom of file after render functions are defined

/* ── Coins Economy ── */
let coins = 0;
let unlockedPremium = [];

let stats = loadJSON(STATS_KEY, {
  charsDressed: [],
  challengesCompleted: 0,
  outfitsSaved: 0,
  categoriesUsed: [],
});
let achievements = loadJSON(ACHIEVE_KEY, {});

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

coins = loadJSON(COINS_KEY, 0);
unlockedPremium = loadJSON(UNLOCKED_KEY, []);

function saveCoins() { saveJSON(COINS_KEY, coins); }
function saveUnlocked() { saveJSON(UNLOCKED_KEY, unlockedPremium); }

function addCoins(amount) {
  coins += amount;
  saveCoins();
  updateCoinsHUD();
}

function updateCoinsHUD() {
  const el = document.getElementById('hudCoins');
  if (el) el.textContent = coins;
}

function isItemUnlocked(itemId) {
  if (!PREMIUM_IDS.has(itemId)) return true;
  return unlockedPremium.includes(itemId);
}

function unlockItem(itemId) {
  if (!unlockedPremium.includes(itemId)) {
    unlockedPremium.push(itemId);
    saveUnlocked();
  }
}

function showPremiumModal(item) {
  const cost = PREMIUM_COST[item.category] || 30;
  const modal = document.getElementById('premiumModal');
  const titleEl = document.getElementById('premiumItemName');
  const buyBtn = document.getElementById('premiumBuyBtn');
  if (!titleEl || !buyBtn) return;
  titleEl.textContent = item.name;
  buyBtn.disabled = coins < cost;
  buyBtn.innerHTML = coins < cost
    ? 'Not enough coins (' + cost + ')'
    : 'Unlock (<span id="premiumCost">' + cost + '</span> coins)';
  buyBtn.onclick = function () {
    if (coins >= cost) {
      addCoins(-cost);
      unlockItem(item.id);
      modal.classList.remove('visible');
      renderItemGrid();
      render();
    }
  };
  modal.classList.add('visible');
}

/* ================================================================
   CHARACTERS
   ================================================================ */
const CHARACTERS = [
  { id:'human_girl', name:'Lumi',  emoji:'👧', skin:'#fce4d8', hair:'#6b3a2a', eyeColor:'#5ba3d9', accent:'#f8a4c0', blush:'#ff7090', lash:'#2a1a10' },
  { id:'human_boy',  name:'Fenn',  emoji:'👦', skin:'#f8d8c4', hair:'#2c1810', eyeColor:'#4db882', accent:'#d4a040', blush:'#e8a080', lash:'#1a1008' },
  { id:'wolf_furry', name:'Howl',  emoji:'🐺', skin:'#a0b0c0', hair:'#4a4a4a', eyeColor:'#f0a030', accent:'#d0c0b0', blush:'#c0a090', lash:'#3a3a3a' },
  { id:'cat',        name:'Mika',  emoji:'🐱', skin:'#fde8d5', hair:'#e8a87c', eyeColor:'#50c878', accent:'#f8b4c8', blush:'#f0a0a0', lash:'#6a4030' },
  { id:'elf',        name:'Sylvie',emoji:'🧝', skin:'#fde8e0', hair:'#f7dc6f', eyeColor:'#a06cc8', accent:'#7ec88a', blush:'#e8a0c0', lash:'#8a7040' },
  { id:'fairy',      name:'Petal', emoji:'🧚', skin:'#fce0e4', hair:'#f1948a', eyeColor:'#e86aa0', accent:'#ffd700', blush:'#ff90b0', lash:'#8a4050' },
];

/* ── Fashion-slim body metrics ── */
function M(x, y, w, h) {
  const cx = x + w / 2;
  const headR = h * 0.052;
  const headY = y + h * 0.082;
  const bodyTop = headY + headR + h * 0.022;
  const shoulderW = w * 0.125;
  const waistY = y + h * 0.31;
  const waistW = w * 0.072;
  const bodyBot = y + h * 0.39;
  const hipW = w * 0.11;
  const bodyW = shoulderW;
  const kneeY = y + h * 0.60;
  const legBot = y + h * 0.83;
  const footY = y + h * 0.86;
  const armX = shoulderW + 10;
  return { cx, headR, headY, bodyTop, shoulderW, waistY, waistW, bodyBot, hipW, bodyW, kneeY, legBot, footY, armX };
}

/* ── Alignment Guide System ── */
const ALIGNMENT_GUIDES = {
  HEAD_LINE: (y, h) => y + h * 0.03,
  SHOULDER_LINE: (y, h) => y + h * 0.082 + h * 0.052 + h * 0.022,
  WAIST_LINE: (y, h) => y + h * 0.31,
  HIP_LINE: (y, h) => y + h * 0.39,
  KNEE_LINE: (y, h) => y + h * 0.60,
  FOOT_LINE: (y, h) => y + h * 0.86,
};
const ASSET_CANVAS = { width: 512, height: 1024 };

/* ── Garment rendering helpers ── */
function _bodyShadow(c, cx, top, bot, w, side) {
  c.save(); c.globalAlpha = 0.08;
  c.fillStyle = '#000';
  const sx = side === 'left' ? cx - w : cx + w * 0.3;
  const sw = w * 0.7;
  c.beginPath();
  c.ellipse(sx + sw / 2, (top + bot) / 2, sw / 2, (bot - top) / 2, 0, 0, Math.PI * 2);
  c.fill(); c.restore();
}

function _garmentShade(c, cx, top, bot, leftW, rightW) {
  c.save(); c.globalAlpha = 0.06;
  c.fillStyle = '#000';
  c.beginPath();
  c.moveTo(cx - leftW, top);
  c.quadraticCurveTo(cx - leftW - 2, (top + bot) / 2, cx - leftW, bot);
  c.lineTo(cx - leftW * 0.5, bot);
  c.quadraticCurveTo(cx - leftW * 0.6, (top + bot) / 2, cx - leftW * 0.5, top);
  c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(cx + rightW, top);
  c.quadraticCurveTo(cx + rightW + 2, (top + bot) / 2, cx + rightW, bot);
  c.lineTo(cx + rightW * 0.5, bot);
  c.quadraticCurveTo(cx + rightW * 0.6, (top + bot) / 2, cx + rightW * 0.5, top);
  c.closePath(); c.fill();
  c.restore();
}

function _garmentHighlight(c, cx, top, w, h) {
  c.save(); c.globalAlpha = 0.08;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(cx - w * 0.15, top + h * 0.2, w * 0.3, h * 0.18, -0.2, 0, Math.PI * 2);
  c.fill(); c.restore();
}

function _garmentOutline(c, path, color) {
  c.save(); c.strokeStyle = _darken(color, 30); c.lineWidth = 0.6;
  c.globalAlpha = 0.3; c.lineCap = 'round'; c.lineJoin = 'round';
  c.stroke(); c.restore();
}

function _drawSeam(c, x1, y1, x2, y2, color) {
  c.save(); c.strokeStyle = _darken(color, 18); c.lineWidth = 0.3;
  c.globalAlpha = 0.25; c.setLineDash([2, 2]); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.setLineDash([]); c.restore();
}

function _drawFold(c, cx, y, w, color) {
  c.save(); c.globalAlpha = 0.06; c.fillStyle = _darken(color, 30);
  c.beginPath();
  c.moveTo(cx - w, y);
  c.quadraticCurveTo(cx, y + 2.5, cx + w, y);
  c.quadraticCurveTo(cx, y - 1.5, cx - w, y);
  c.fill(); c.restore();
}

function _drawButton(c, x, y, r, color) {
  c.save();
  c.fillStyle = _darken(color, 25); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = _lighten(color, 15); c.beginPath(); c.arc(x, y, r * 0.6, 0, Math.PI * 2); c.fill();
  c.strokeStyle = _darken(color, 35); c.lineWidth = 0.3;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  c.restore();
}

function _drawStitch(c, x1, y1, x2, y2, color) {
  c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.3;
  c.globalAlpha = 0.35; c.setLineDash([1.5, 1.5]); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.setLineDash([]); c.restore();
}

function _fabricFolds(c, x1, y1, x2, y2, count, color) {
  c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.35;
  c.globalAlpha = 0.12; c.lineCap = 'round';
  const dx = (x2 - x1) / (count + 1), dy = (y2 - y1) / (count + 1);
  for (let i = 1; i <= count; i++) {
    const fx = x1 + dx * i, fy = y1 + dy * i;
    c.beginPath(); c.moveTo(fx - 3, fy);
    c.quadraticCurveTo(fx, fy + 2, fx + 3, fy); c.stroke();
  }
  c.restore();
}

function _stitchLine(c, x1, y1, x2, y2, color) {
  c.save(); c.strokeStyle = _darken(color, 18); c.lineWidth = 0.25;
  c.globalAlpha = 0.3; c.setLineDash([1, 1.5]); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.setLineDash([]); c.restore();
}

function _buttonRow(c, cx, startY, endY, count, color) {
  const step = (endY - startY) / (count - 1 || 1);
  for (let i = 0; i < count; i++) _drawButton(c, cx, startY + i * step, 0.9, color);
}

function _pocketDetail(c, x, y, w, h, color) {
  c.save(); c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
  c.globalAlpha = 0.5; c.beginPath();
  c.moveTo(x, y); c.lineTo(x, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w, y);
  c.stroke();
  c.strokeStyle = _darken(color, 12); c.lineWidth = 0.3;
  c.beginPath(); c.moveTo(x + 1, y + 1);
  c.quadraticCurveTo(x + w / 2, y + 2, x + w - 1, y + 1); c.stroke();
  c.restore();
}

function _collarDetail(c, cx, topY, width, color, type) {
  c.save();
  if (type === 'pointed') {
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = _lighten(color, 12);
      c.beginPath(); c.moveTo(cx + s * 1, topY + 1);
      c.lineTo(cx + s * (width * 0.5), topY - 1);
      c.lineTo(cx + s * (width * 0.45), topY + 7);
      c.lineTo(cx + s * 2, topY + 5); c.closePath(); c.fill();
    }
  } else if (type === 'round') {
    c.fillStyle = _lighten(color, 12);
    c.beginPath(); c.arc(cx, topY + 2, width * 0.3, 0.2, Math.PI - 0.2); c.fill();
  } else if (type === 'stand') {
    c.fillStyle = _darken(color, 8);
    c.beginPath(); c.moveTo(cx - width * 0.35, topY);
    c.lineTo(cx - width * 0.38, topY - 5);
    c.quadraticCurveTo(cx, topY - 7, cx + width * 0.38, topY - 5);
    c.lineTo(cx + width * 0.35, topY); c.closePath(); c.fill();
  }
  c.restore();
}

function _beltLine(c, cx, y, width, color, buckle) {
  c.save(); c.fillStyle = _darken(color, 25);
  c.fillRect(cx - width, y, width * 2, 2.5);
  if (buckle) {
    c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.6;
    c.strokeRect(cx - 2, y - 0.5, 4, 3.5);
    c.fillStyle = '#c0c0c0'; c.fillRect(cx + 0.5, y + 0.2, 1, 2);
  }
  c.restore();
}

function _fabricTexture(c, x, y, w, h, type, color) {
  c.save(); c.globalAlpha = 0.1; c.lineCap = 'round';
  if (type === 'knit') {
    c.strokeStyle = _darken(color, 12); c.lineWidth = 0.25;
    for (let ry = y; ry < y + h; ry += 3) {
      c.beginPath(); c.moveTo(x, ry);
      c.quadraticCurveTo(x + w * 0.5, ry + 1, x + w, ry); c.stroke();
    }
  } else if (type === 'denim') {
    c.strokeStyle = _lighten(color, 15); c.lineWidth = 0.2;
    for (let ry = y; ry < y + h; ry += 2) {
      for (let rx = x; rx < x + w; rx += 2) {
        c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + 1, ry + 1); c.stroke();
      }
    }
  } else if (type === 'plaid') {
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 0.4;
    for (let py = y; py < y + h; py += 5) {
      c.beginPath(); c.moveTo(x, py); c.lineTo(x + w, py); c.stroke();
    }
    for (let px = x; px < x + w; px += 5) {
      c.beginPath(); c.moveTo(px, y); c.lineTo(px, y + h); c.stroke();
    }
  } else if (type === 'lace') {
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 0.25;
    for (let ly = y; ly < y + h; ly += 4) {
      for (let lx = x; lx < x + w; lx += 4) {
        c.beginPath(); c.arc(lx, ly, 1.2, 0, Math.PI * 2); c.stroke();
      }
    }
  }
  c.restore();
}

/* ── Draw fashion-slim character ── */
function drawCharacter(c, x, y, w, h, char) {
  const m = M(x, y, w, h);
  const { cx, headR, headY, bodyTop, shoulderW, waistY, waistW, bodyBot, hipW, bodyW, kneeY, legBot, footY, armX } = m;
  const sk = char.skin;
  const isWolf = char.id === 'wolf_furry';
  const isCat = char.id === 'cat';
  const isElf = char.id === 'elf';
  const isFairy = char.id === 'fairy';
  const isBoy = char.id === 'human_boy';
  const furColor = isWolf ? '#8e9eaf' : sk;
  const lashColor = char.lash || '#2a1a10';
  const blushColor = char.blush || '#ff7090';
  const accentColor = char.accent || '#f0a0c0';

  // ── Back hair (behind body) ── (hidden when a hair item is equipped)
  if (!isWolf && !isCat && !equipped.hair) {
    c.save();
    const hc = char.hair;
    if (char.id === 'human_girl') {
      // Lumi: wavy hair falling to mid-back, honey-highlighted ends
      const backHairGrad = c.createLinearGradient(cx, headY, cx, bodyBot - 10);
      backHairGrad.addColorStop(0, hc);
      backHairGrad.addColorStop(0.7, hc);
      backHairGrad.addColorStop(1, _lighten(hc, 25));
      c.fillStyle = backHairGrad;
      c.beginPath();
      c.moveTo(cx - headR * 0.75, headY - headR * 0.1);
      c.quadraticCurveTo(cx - headR * 0.9, headY + headR * 1.5, cx - headR * 0.5, bodyTop + (waistY - bodyTop) * 0.7);
      c.quadraticCurveTo(cx - headR * 0.3, bodyTop + (waistY - bodyTop) * 0.9, cx - headR * 0.1, bodyTop + (waistY - bodyTop) * 0.85);
      c.lineTo(cx + headR * 0.1, bodyTop + (waistY - bodyTop) * 0.85);
      c.quadraticCurveTo(cx + headR * 0.3, bodyTop + (waistY - bodyTop) * 0.9, cx + headR * 0.5, bodyTop + (waistY - bodyTop) * 0.7);
      c.quadraticCurveTo(cx + headR * 0.9, headY + headR * 1.5, cx + headR * 0.75, headY - headR * 0.1);
      c.closePath(); c.fill();
      // Hair strand texture
      c.save(); c.strokeStyle = _darken(hc, 12); c.lineWidth = 0.4; c.globalAlpha = 0.15;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i * headR * 0.2, headY + headR * 0.5);
        c.quadraticCurveTo(cx + i * headR * 0.22 + (i > 0 ? 2 : -2), bodyTop, cx + i * headR * 0.18, bodyTop + (waistY - bodyTop) * 0.5);
        c.stroke();
      }
      c.restore();
    } else if (char.id === 'human_boy') {
      // Fenn: short, no back-hair needed
    } else if (isElf) {
      // Sylvie: very long golden hair in side braid, past waist
      const braidGrad = c.createLinearGradient(cx, headY, cx + headR, bodyBot + 10);
      braidGrad.addColorStop(0, hc);
      braidGrad.addColorStop(0.5, hc);
      braidGrad.addColorStop(1, _lighten(hc, 15));
      c.fillStyle = braidGrad;
      // Main back hair mass
      c.beginPath();
      c.moveTo(cx - headR * 0.8, headY - headR * 0.15);
      c.quadraticCurveTo(cx - headR * 1.0, headY + headR * 1.8, cx - headR * 0.4, bodyBot + 5);
      c.lineTo(cx + headR * 0.2, bodyBot + 5);
      c.quadraticCurveTo(cx + headR * 0.85, headY + headR * 1.5, cx + headR * 0.8, headY - headR * 0.15);
      c.closePath(); c.fill();
      // Side braid (right side, drapes over shoulder area)
      c.fillStyle = hc;
      const braidX = cx + headR * 0.6;
      c.beginPath();
      c.moveTo(braidX, headY + headR * 0.4);
      c.quadraticCurveTo(braidX + 4, bodyTop + 5, braidX + 2, waistY + 5);
      c.quadraticCurveTo(braidX + 3, bodyBot, braidX + 1, bodyBot + 12);
      c.lineTo(braidX - 3, bodyBot + 12);
      c.quadraticCurveTo(braidX - 1, bodyBot, braidX - 2, waistY + 5);
      c.quadraticCurveTo(braidX - 3, bodyTop + 5, braidX - 4, headY + headR * 0.4);
      c.closePath(); c.fill();
      // Braid cross-hatching
      c.save(); c.strokeStyle = _darken(hc, 15); c.lineWidth = 0.4; c.globalAlpha = 0.2;
      for (let i = 0; i < 8; i++) {
        const by = headY + headR * 0.8 + i * ((bodyBot + 10 - headY - headR * 0.8) / 8);
        c.beginPath();
        c.moveTo(braidX - 3, by);
        c.lineTo(braidX + 3, by + 4);
        c.stroke();
        c.beginPath();
        c.moveTo(braidX + 3, by);
        c.lineTo(braidX - 3, by + 4);
        c.stroke();
      }
      c.restore();
      // Living vine woven through braid
      c.save(); c.strokeStyle = '#6ab878'; c.lineWidth = 0.5; c.globalAlpha = 0.5; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(braidX, headY + headR * 0.5);
      for (let i = 0; i < 6; i++) {
        const vy = headY + headR * 0.5 + i * ((bodyBot + 8 - headY - headR * 0.5) / 6);
        c.quadraticCurveTo(braidX + (i % 2 === 0 ? 4 : -4), vy + 6, braidX, vy + 12);
      }
      c.stroke();
      // Tiny leaves on vine
      c.fillStyle = '#7ec88a'; c.globalAlpha = 0.45;
      for (let i = 0; i < 4; i++) {
        const ly = headY + headR + i * ((bodyBot - headY - headR) / 4) + 8;
        const lx = braidX + (i % 2 === 0 ? 3 : -3);
        c.beginPath();
        c.ellipse(lx, ly, 2, 1, i % 2 === 0 ? 0.4 : -0.4, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    } else if (isFairy) {
      // Petal: coral-pink voluminous hair to shoulders
      const backHairGrad = c.createLinearGradient(cx, headY - headR, cx, bodyTop + 15);
      backHairGrad.addColorStop(0, hc);
      backHairGrad.addColorStop(1, _lighten(hc, 10));
      c.fillStyle = backHairGrad;
      c.beginPath();
      c.moveTo(cx - headR * 0.85, headY);
      c.quadraticCurveTo(cx - headR * 1.0, headY + headR * 1.2, cx - headR * 0.6, bodyTop + 12);
      c.quadraticCurveTo(cx - headR * 0.3, bodyTop + 18, cx, bodyTop + 15);
      c.quadraticCurveTo(cx + headR * 0.3, bodyTop + 18, cx + headR * 0.6, bodyTop + 12);
      c.quadraticCurveTo(cx + headR * 1.0, headY + headR * 1.2, cx + headR * 0.85, headY);
      c.closePath(); c.fill();
      // Rose-gold shimmer streaks
      c.save(); c.strokeStyle = '#f4c8a0'; c.lineWidth = 0.5; c.globalAlpha = 0.12;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i * headR * 0.25, headY + headR * 0.3);
        c.quadraticCurveTo(cx + i * headR * 0.28, bodyTop, cx + i * headR * 0.22, bodyTop + 10);
        c.stroke();
      }
      c.restore();
    }
    c.restore();
  }

  // ── Tail (behind body) ──
  if (isWolf) {
    c.save(); c.lineCap = 'round';
    // Fluffy multi-layer tail
    c.strokeStyle = '#6a7a8a'; c.lineWidth = 5; c.globalAlpha = 0.3;
    c.beginPath(); c.moveTo(cx + hipW, bodyBot - 4);
    c.bezierCurveTo(cx + hipW + 17, bodyBot - 9, cx + hipW + 26, bodyBot - 24, cx + hipW + 15, bodyBot - 36);
    c.stroke();
    c.globalAlpha = 1;
    c.strokeStyle = '#7a8a9a'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx + hipW, bodyBot - 4);
    c.bezierCurveTo(cx + hipW + 16, bodyBot - 8, cx + hipW + 24, bodyBot - 22, cx + hipW + 14, bodyBot - 34);
    c.stroke();
    // Lighter fur overlay
    c.strokeStyle = '#95a5b5'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(cx + hipW + 2, bodyBot - 6);
    c.bezierCurveTo(cx + hipW + 14, bodyBot - 10, cx + hipW + 22, bodyBot - 22, cx + hipW + 13, bodyBot - 32);
    c.stroke();
    // Gradient tip
    c.lineWidth = 2.5; c.strokeStyle = '#c0cad5';
    c.beginPath(); c.moveTo(cx + hipW + 14, bodyBot - 34);
    c.quadraticCurveTo(cx + hipW + 16, bodyBot - 40, cx + hipW + 10, bodyBot - 42);
    c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = '#d8e0e8';
    c.beginPath(); c.moveTo(cx + hipW + 11, bodyBot - 40);
    c.quadraticCurveTo(cx + hipW + 12, bodyBot - 43, cx + hipW + 9, bodyBot - 44);
    c.stroke();
    c.restore();
  } else if (isCat) {
    c.save(); c.lineCap = 'round';
    // Elegant S-curve tail
    c.strokeStyle = _darken(sk, 15); c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx + hipW, bodyBot - 3);
    c.bezierCurveTo(cx + hipW + 20, bodyBot - 4, cx + hipW + 28, bodyBot - 18, cx + hipW + 18, bodyBot - 30);
    c.bezierCurveTo(cx + hipW + 12, bodyBot - 38, cx + hipW + 20, bodyBot - 44, cx + hipW + 14, bodyBot - 48);
    c.stroke();
    // Lighter inner stroke
    c.strokeStyle = _darken(sk, 5); c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(cx + hipW + 1, bodyBot - 4);
    c.bezierCurveTo(cx + hipW + 18, bodyBot - 5, cx + hipW + 26, bodyBot - 18, cx + hipW + 17, bodyBot - 29);
    c.bezierCurveTo(cx + hipW + 12, bodyBot - 36, cx + hipW + 18, bodyBot - 42, cx + hipW + 13, bodyBot - 46);
    c.stroke();
    // Subtle tabby rings on tail
    c.strokeStyle = _darken(sk, 22); c.lineWidth = 0.5; c.globalAlpha = 0.2;
    for (let i = 0; i < 3; i++) {
      const ty = bodyBot - 12 - i * 10;
      c.beginPath(); c.arc(cx + hipW + 20 - i * 2, ty, 2.5, 0, Math.PI); c.stroke();
    }
    c.globalAlpha = 1;
    c.restore();
  }

  // ── Wings (fairy — larger with vein detail and shimmer) ──
  if (isFairy) {
    const now = Date.now() / 1200;
    const wf = Math.sin(now) * 3;
    c.save();
    for (let s = -1; s <= 1; s += 2) {
      // Upper wing — larger and more translucent
      const wGrad = c.createRadialGradient(cx + s * (shoulderW + 12), bodyTop - 4, 2, cx + s * (shoulderW + 12), bodyTop, 34 + wf);
      wGrad.addColorStop(0, 'rgba(255,120,200,0.28)');
      wGrad.addColorStop(0.4, 'rgba(232,67,147,0.18)');
      wGrad.addColorStop(0.7, 'rgba(180,100,220,0.10)');
      wGrad.addColorStop(1, 'rgba(232,67,147,0)');
      c.fillStyle = wGrad;
      c.beginPath();
      c.moveTo(cx + s * (shoulderW - 1), bodyTop + 4);
      c.quadraticCurveTo(cx + s * (shoulderW + 30 + wf), bodyTop - 20, cx + s * (shoulderW + 8), bodyTop + 30);
      c.closePath(); c.fill();

      // Wing vein detail
      c.save(); c.strokeStyle = 'rgba(232,100,180,0.15)'; c.lineWidth = 0.4;
      c.beginPath();
      c.moveTo(cx + s * (shoulderW), bodyTop + 8);
      c.quadraticCurveTo(cx + s * (shoulderW + 18 + wf * 0.5), bodyTop - 6, cx + s * (shoulderW + 22 + wf * 0.7), bodyTop - 8);
      c.stroke();
      c.beginPath();
      c.moveTo(cx + s * (shoulderW), bodyTop + 12);
      c.quadraticCurveTo(cx + s * (shoulderW + 16 + wf * 0.5), bodyTop + 4, cx + s * (shoulderW + 24 + wf * 0.6), bodyTop + 2);
      c.stroke();
      c.restore();

      // Iridescent edge shimmer
      c.save();
      const edgeGrad = c.createLinearGradient(
        cx + s * shoulderW, bodyTop - 10,
        cx + s * (shoulderW + 30 + wf), bodyTop + 20
      );
      edgeGrad.addColorStop(0, 'rgba(255,200,100,0.08)');
      edgeGrad.addColorStop(0.5, 'rgba(100,200,255,0.06)');
      edgeGrad.addColorStop(1, 'rgba(200,100,255,0.04)');
      c.strokeStyle = edgeGrad; c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx + s * (shoulderW - 1), bodyTop + 4);
      c.quadraticCurveTo(cx + s * (shoulderW + 30 + wf), bodyTop - 20, cx + s * (shoulderW + 8), bodyTop + 30);
      c.stroke();
      c.restore();

      // Lower wing
      c.globalAlpha = 0.7;
      const lGrad = c.createRadialGradient(cx + s * (shoulderW + 8), bodyTop + 28, 2, cx + s * (shoulderW + 8), bodyTop + 28, 22 + wf);
      lGrad.addColorStop(0, 'rgba(255,140,210,0.22)');
      lGrad.addColorStop(0.6, 'rgba(232,67,147,0.10)');
      lGrad.addColorStop(1, 'rgba(232,67,147,0)');
      c.fillStyle = lGrad;
      c.beginPath();
      c.moveTo(cx + s * (shoulderW - 1), bodyTop + 12);
      c.quadraticCurveTo(cx + s * (shoulderW + 22 + wf), bodyTop + 34, cx + s * (shoulderW + 5), bodyTop + 42);
      c.closePath(); c.fill();
      c.globalAlpha = 1;

      // Lower wing veins
      c.save(); c.strokeStyle = 'rgba(232,100,180,0.1)'; c.lineWidth = 0.3;
      c.beginPath();
      c.moveTo(cx + s * (shoulderW), bodyTop + 16);
      c.quadraticCurveTo(cx + s * (shoulderW + 12 + wf * 0.4), bodyTop + 28, cx + s * (shoulderW + 14 + wf * 0.5), bodyTop + 32);
      c.stroke(); c.restore();
    }
    c.restore();
  }

  // ── Torso (smooth hourglass with shading) ──
  const torsoGrad = c.createLinearGradient(cx - shoulderW, bodyTop, cx + shoulderW * 0.3, bodyBot);
  torsoGrad.addColorStop(0, _lighten(furColor, 8));
  torsoGrad.addColorStop(0.5, furColor);
  torsoGrad.addColorStop(1, _darken(furColor, 6));
  c.fillStyle = torsoGrad;
  c.beginPath();
  c.moveTo(cx - shoulderW, bodyTop);
  c.bezierCurveTo(cx - shoulderW - 1, bodyTop + (waistY - bodyTop) * 0.4,
                  cx - waistW - 2, waistY - 6,
                  cx - waistW, waistY);
  c.bezierCurveTo(cx - waistW - 1, waistY + 6,
                  cx - hipW - 2, bodyBot - (bodyBot - waistY) * 0.3,
                  cx - hipW, bodyBot);
  c.lineTo(cx + hipW, bodyBot);
  c.bezierCurveTo(cx + hipW + 2, bodyBot - (bodyBot - waistY) * 0.3,
                  cx + waistW + 1, waistY + 6,
                  cx + waistW, waistY);
  c.bezierCurveTo(cx + waistW + 2, waistY - 6,
                  cx + shoulderW + 1, bodyTop + (waistY - bodyTop) * 0.4,
                  cx + shoulderW, bodyTop);
  c.closePath();
  c.fill();

  // Torso side shading
  _bodyShadow(c, cx, bodyTop, bodyBot, shoulderW, 'left');
  _bodyShadow(c, cx, bodyTop, bodyBot, shoulderW, 'right');

  // Subtle collarbone
  if (!isWolf) {
    c.save(); c.strokeStyle = _darken(furColor, 12); c.lineWidth = 0.4; c.globalAlpha = 0.15;
    c.beginPath();
    c.moveTo(cx - shoulderW * 0.6, bodyTop + 4);
    c.quadraticCurveTo(cx, bodyTop + 7, cx + shoulderW * 0.6, bodyTop + 4);
    c.stroke(); c.restore();
  }

  // Wolf chest ruff
  if (isWolf) {
    // Larger, fluffier chest ruff
    c.save();
    const ruffGrad = c.createRadialGradient(cx, (bodyTop + waistY) / 2 - 4, waistW * 0.2, cx, (bodyTop + waistY) / 2, waistW * 1.2);
    ruffGrad.addColorStop(0, '#d0c8c0');
    ruffGrad.addColorStop(0.6, '#c0b8b0');
    ruffGrad.addColorStop(1, '#b0bec5');
    c.fillStyle = ruffGrad;
    c.beginPath();
    c.ellipse(cx, (bodyTop + waistY) / 2 - 2, waistW * 0.9, (waistY - bodyTop) * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    // Fur texture strokes on ruff
    c.strokeStyle = '#c8c0b8'; c.lineWidth = 0.4; c.globalAlpha = 0.3;
    const ruffCy = (bodyTop + waistY) / 2 - 2;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(cx + i * 3, ruffCy - 4);
      c.lineTo(cx + i * 3 + (i > 0 ? 1 : -1), ruffCy + 5);
      c.stroke();
    }
    c.restore();
  }

  // Wolf fur texture on limbs
  if (isWolf) {
    c.save(); c.strokeStyle = '#8090a0'; c.lineWidth = 0.3; c.globalAlpha = 0.15; c.lineCap = 'round';
    // Torso fur strokes
    for (let i = 0; i < 6; i++) {
      const fy = bodyTop + (bodyBot - bodyTop) * (0.15 + i * 0.13);
      const fx = cx + (i % 2 === 0 ? -1 : 1) * (shoulderW * 0.4 + i * 1.2);
      c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + (i % 2 === 0 ? -2 : 2), fy + 3); c.stroke();
    }
    c.restore();
  }

  // Cat subtle tabby markings on body
  if (isCat) {
    c.save(); c.strokeStyle = _darken(sk, 18); c.lineWidth = 0.4; c.globalAlpha = 0.1; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ty = bodyTop + (bodyBot - bodyTop) * (0.2 + i * 0.2);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * waistW * 0.3, ty);
        c.quadraticCurveTo(cx + s * waistW * 0.8, ty + 2, cx + s * shoulderW * 0.7, ty - 1);
        c.stroke();
      }
    }
    c.restore();
  }

  // ── Neck (tapered) ──
  const neckW = headR * 0.42;
  const neckTop = headY + headR * 0.92;
  const neckGrad = c.createLinearGradient(cx - neckW, neckTop, cx + neckW, bodyTop);
  neckGrad.addColorStop(0, _lighten(furColor, 5));
  neckGrad.addColorStop(1, furColor);
  c.fillStyle = neckGrad;
  c.beginPath();
  c.moveTo(cx - neckW, neckTop);
  c.bezierCurveTo(cx - neckW - 1, (neckTop + bodyTop) / 2, cx - neckW * 1.3, bodyTop + 2, cx - shoulderW * 0.3, bodyTop);
  c.lineTo(cx + shoulderW * 0.3, bodyTop);
  c.bezierCurveTo(cx + neckW * 1.3, bodyTop + 2, cx + neckW + 1, (neckTop + bodyTop) / 2, cx + neckW, neckTop);
  c.closePath(); c.fill();

  // ── Arms (with elbow bend, positioned away from body) ──
  const armLW = w * 0.026;
  const elbowY = bodyTop + (bodyBot - bodyTop) * 0.55;
  const handY = bodyBot + (kneeY - bodyBot) * 0.15;
  for (let s = -1; s <= 1; s += 2) {
    const shoulderX = cx + s * shoulderW;
    const elbowX = cx + s * (shoulderW + 10);
    const handX = cx + s * (shoulderW + 8);

    // Arm gradient
    c.strokeStyle = furColor; c.lineWidth = armLW; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(shoulderX, bodyTop + 4);
    c.quadraticCurveTo(elbowX + s * 2, elbowY, handX, handY);
    c.stroke();

    // Arm highlight (top edge)
    c.save(); c.strokeStyle = _lighten(furColor, 15); c.lineWidth = armLW * 0.3;
    c.globalAlpha = 0.15; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(shoulderX - s * 1, bodyTop + 3);
    c.quadraticCurveTo(elbowX, elbowY - 2, handX - s * 1, handY - 1);
    c.stroke(); c.restore();

    // Arm shading (bottom edge)
    c.save(); c.strokeStyle = _darken(furColor, 12); c.lineWidth = armLW * 0.5;
    c.globalAlpha = 0.1; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(shoulderX + s * 1, bodyTop + 6);
    c.quadraticCurveTo(elbowX + s * 3, elbowY, handX + s * 1, handY);
    c.stroke(); c.restore();

    // Wolf fur texture on arms
    if (isWolf) {
      c.save(); c.strokeStyle = '#8090a0'; c.lineWidth = 0.3; c.globalAlpha = 0.12; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const t = 0.2 + i * 0.3;
        const ax = shoulderX + (elbowX + s * 2 - shoulderX) * t * t + (handX - elbowX - s * 2) * t * (1 - t) * 2;
        const ay = (bodyTop + 4) + (elbowY - bodyTop - 4) * t * t + (handY - elbowY) * t * (1 - t) * 2;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + s * 1.5, ay + 2); c.stroke();
      }
      c.restore();
    }

    // Hand (more delicate)
    const hColor = (isWolf || isCat) ? (isWolf ? '#7a8a9a' : '#e8c8a0') : furColor;
    c.fillStyle = hColor;
    c.beginPath(); c.ellipse(handX, handY, 2.8, 2.2, s * 0.25, 0, Math.PI * 2); c.fill();
    // Finger details (3 fingers)
    c.save(); c.strokeStyle = _darken(hColor, 10); c.lineWidth = 0.3; c.globalAlpha = 0.25; c.lineCap = 'round';
    c.beginPath(); c.moveTo(handX + s * 1.2, handY + 1.5); c.lineTo(handX + s * 2, handY + 3.5); c.stroke();
    c.beginPath(); c.moveTo(handX + s * 0.2, handY + 2); c.lineTo(handX + s * 0.2, handY + 4); c.stroke();
    c.beginPath(); c.moveTo(handX - s * 0.8, handY + 1.5); c.lineTo(handX - s * 1.2, handY + 3.2); c.stroke();
    c.restore();
  }

  // ── Legs (smooth with calf definition) ──
  const legGap = 5;
  const legW = w * 0.028;
  for (let s = -1; s <= 1; s += 2) {
    const hipX = cx + s * legGap;
    const kneeX = cx + s * (legGap + 0.5);
    const ankleX = cx + s * legGap;
    const calfX = cx + s * (legGap + 1.5);

    // Main leg
    c.strokeStyle = furColor; c.lineWidth = legW; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(hipX, bodyBot);
    c.quadraticCurveTo(kneeX + s * 0.5, kneeY - 5, kneeX, kneeY);
    c.bezierCurveTo(calfX, kneeY + (legBot - kneeY) * 0.3, calfX, kneeY + (legBot - kneeY) * 0.6, ankleX, legBot);
    c.stroke();

    // Leg highlight (outer edge)
    c.save(); c.strokeStyle = _lighten(furColor, 12); c.lineWidth = legW * 0.3;
    c.globalAlpha = 0.12; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(hipX + s * 1, bodyBot);
    c.quadraticCurveTo(kneeX + s * 1.5, kneeY - 3, ankleX + s * 1, legBot);
    c.stroke(); c.restore();

    // Leg shading (inner side)
    c.save(); c.strokeStyle = _darken(furColor, 12); c.lineWidth = legW * 0.4;
    c.globalAlpha = 0.12; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(hipX - s * 1, bodyBot + 2);
    c.quadraticCurveTo(kneeX - s * 1, kneeY, ankleX - s * 1, legBot);
    c.stroke(); c.restore();

    // Elegant ankle taper
    c.save(); c.strokeStyle = _lighten(furColor, 8); c.lineWidth = legW * 0.6;
    c.globalAlpha = 0.15; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(ankleX, legBot - 6);
    c.lineTo(ankleX, legBot);
    c.stroke(); c.restore();
  }

  // ── Feet (daintier, more elegant) ──
  const footColor = (isWolf || isCat) ? (isWolf ? '#7a8a9a' : '#e8c8a0') : sk;
  for (let s = -1; s <= 1; s += 2) {
    const fx = cx + s * legGap;
    c.fillStyle = footColor;
    c.beginPath();
    c.ellipse(fx + s * 1, footY, 5.5, 2.5, s * 0.12, 0, Math.PI * 2);
    c.fill();
    // Foot highlight
    c.save(); c.fillStyle = _lighten(footColor, 18); c.globalAlpha = 0.18;
    c.beginPath(); c.ellipse(fx + s * 0.5, footY - 1, 3.5, 1.3, 0, Math.PI, 0); c.fill();
    c.restore();
    // Subtle arch line
    c.save(); c.strokeStyle = _darken(footColor, 15); c.lineWidth = 0.3; c.globalAlpha = 0.12;
    c.beginPath(); c.arc(fx + s * 1, footY + 0.5, 4, 0, Math.PI * 0.6); c.stroke();
    c.restore();
  }

  // ── Head ──
  if (isWolf) {
    // Wolf head with fur texture
    const wolfGrad = c.createRadialGradient(cx - headR * 0.2, headY - headR * 0.3, headR * 0.2, cx, headY, headR);
    wolfGrad.addColorStop(0, '#a8b8c8');
    wolfGrad.addColorStop(0.6, '#a0b0bf');
    wolfGrad.addColorStop(1, '#8e9eaf');
    c.fillStyle = wolfGrad;
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI * 2); c.fill();
    // Softer muzzle with gradient
    const muzzleGrad = c.createRadialGradient(cx, headY + headR * 0.32, headR * 0.05, cx, headY + headR * 0.35, headR * 0.32);
    muzzleGrad.addColorStop(0, '#d0d8e0');
    muzzleGrad.addColorStop(1, '#b8c8d5');
    c.fillStyle = muzzleGrad;
    c.beginPath(); c.ellipse(cx, headY + headR * 0.35, headR * 0.4, headR * 0.3, 0, 0, Math.PI * 2); c.fill();
    // Nose
    c.fillStyle = '#3d4f5f';
    c.beginPath(); c.ellipse(cx, headY + headR * 0.2, 2.2, 1.4, 0, 0, Math.PI * 2); c.fill();
    // Nose highlight
    c.save(); c.fillStyle = '#5a6a7a'; c.globalAlpha = 0.4;
    c.beginPath(); c.ellipse(cx - 0.5, headY + headR * 0.18, 0.8, 0.5, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // Fluffier multi-layered ears with fur tufts
    for (let s = -1; s <= 1; s += 2) {
      // Outer ear (slightly larger)
      c.fillStyle = '#8e9eaf';
      c.beginPath(); c.moveTo(cx + s * headR * 0.58, headY - headR * 0.55);
      c.lineTo(cx + s * headR * 0.28, headY - headR * 1.3);
      c.lineTo(cx - s * headR * 0.08, headY - headR * 0.5); c.fill();
      // Inner ear with gradient
      const earGrad = c.createLinearGradient(cx + s * headR * 0.35, headY - headR * 1.1, cx + s * headR * 0.35, headY - headR * 0.55);
      earGrad.addColorStop(0, '#f0d8c8');
      earGrad.addColorStop(1, '#e8c8b0');
      c.fillStyle = earGrad;
      c.beginPath(); c.moveTo(cx + s * headR * 0.45, headY - headR * 0.58);
      c.lineTo(cx + s * headR * 0.3, headY - headR * 1.1);
      c.lineTo(cx - s * headR * 0.01, headY - headR * 0.54); c.fill();
      // Fur tufts at ear tips
      c.save(); c.strokeStyle = '#b0bec5'; c.lineWidth = 0.6; c.lineCap = 'round'; c.globalAlpha = 0.5;
      c.beginPath(); c.moveTo(cx + s * headR * 0.28, headY - headR * 1.3);
      c.lineTo(cx + s * headR * 0.22, headY - headR * 1.4); c.stroke();
      c.beginPath(); c.moveTo(cx + s * headR * 0.28, headY - headR * 1.3);
      c.lineTo(cx + s * headR * 0.34, headY - headR * 1.38); c.stroke();
      c.restore();
    }
    // Subtle cheek fur
    c.save(); c.strokeStyle = '#b0bec5'; c.lineWidth = 0.4; c.globalAlpha = 0.2; c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(cx + s * (headR * 0.6 + i * 1.5), headY + headR * (0.1 + i * 0.08));
        c.lineTo(cx + s * (headR * 0.7 + i * 1.8), headY + headR * (0.15 + i * 0.1));
        c.stroke();
      }
    }
    c.restore();
  } else if (isCat) {
    // Cat head
    const catGrad = c.createRadialGradient(cx - headR * 0.2, headY - headR * 0.2, headR * 0.15, cx, headY, headR);
    catGrad.addColorStop(0, _lighten(sk, 14));
    catGrad.addColorStop(0.7, _lighten(sk, 4));
    catGrad.addColorStop(1, sk);
    c.fillStyle = catGrad;
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI * 2); c.fill();
    // More expressive ears with inner color gradient
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = sk;
      c.beginPath(); c.moveTo(cx + s * headR * 0.62, headY - headR * 0.45);
      c.lineTo(cx + s * headR * 0.32, headY - headR * 1.22);
      c.lineTo(cx, headY - headR * 0.4); c.fill();
      // Inner ear gradient
      const innerEarGrad = c.createLinearGradient(cx + s * headR * 0.4, headY - headR * 1.05, cx + s * headR * 0.2, headY - headR * 0.48);
      innerEarGrad.addColorStop(0, '#f8c0d8');
      innerEarGrad.addColorStop(1, '#f8b4c8');
      c.fillStyle = innerEarGrad;
      c.beginPath(); c.moveTo(cx + s * headR * 0.5, headY - headR * 0.48);
      c.lineTo(cx + s * headR * 0.34, headY - headR * 1.04);
      c.lineTo(cx + s * headR * 0.06, headY - headR * 0.45); c.fill();
    }
    // Nose (triangle, more defined)
    const noseGrad = c.createRadialGradient(cx, headY + headR * 0.12, 0.5, cx, headY + headR * 0.14, 3);
    noseGrad.addColorStop(0, '#f0a090');
    noseGrad.addColorStop(1, '#e8a87c');
    c.fillStyle = noseGrad;
    c.beginPath(); c.moveTo(cx, headY + headR * 0.06);
    c.lineTo(cx - 2.2, headY + headR * 0.18); c.lineTo(cx + 2.2, headY + headR * 0.18);
    c.closePath(); c.fill();
    // Sleeker whiskers
    c.save(); c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      // Thicker base, thinner tips
      c.strokeStyle = 'rgba(140,130,120,0.35)'; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx + s * 4, headY + headR * 0.14);
      c.quadraticCurveTo(cx + s * 10, headY + headR * 0.06, cx + s * 16, headY + headR * 0.06);
      c.stroke();
      c.strokeStyle = 'rgba(140,130,120,0.3)'; c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx + s * 4, headY + headR * 0.2);
      c.quadraticCurveTo(cx + s * 10, headY + headR * 0.19, cx + s * 15, headY + headR * 0.18);
      c.stroke();
      c.strokeStyle = 'rgba(140,130,120,0.25)'; c.lineWidth = 0.35;
      c.beginPath(); c.moveTo(cx + s * 3.5, headY + headR * 0.26);
      c.quadraticCurveTo(cx + s * 9, headY + headR * 0.3, cx + s * 14, headY + headR * 0.3);
      c.stroke();
    }
    c.restore();
  } else if (isElf) {
    const elfGrad = c.createRadialGradient(cx - headR * 0.15, headY - headR * 0.2, headR * 0.2, cx, headY, headR);
    elfGrad.addColorStop(0, _lighten(sk, 12));
    elfGrad.addColorStop(0.6, _lighten(sk, 4));
    elfGrad.addColorStop(1, sk);
    c.fillStyle = elfGrad;
    c.beginPath(); c.ellipse(cx, headY, headR * 0.92, headR, 0, 0, Math.PI * 2); c.fill();
    // More elegant elongated ears with jewel-like inner glow
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = sk;
      c.beginPath(); c.moveTo(cx + s * headR * 0.82, headY - 1);
      c.quadraticCurveTo(cx + s * headR * 1.18, headY - headR * 0.38, cx + s * headR * 1.42, headY - headR * 0.55);
      c.quadraticCurveTo(cx + s * headR * 1.12, headY - headR * 0.1, cx + s * headR * 0.82, headY + 3);
      c.fill();
      // Jewel-like inner glow
      const earGlowGrad = c.createRadialGradient(
        cx + s * headR * 1.0, headY - headR * 0.2, 1,
        cx + s * headR * 1.0, headY - headR * 0.2, headR * 0.35
      );
      earGlowGrad.addColorStop(0, 'rgba(160,230,180,0.35)');
      earGlowGrad.addColorStop(0.5, 'rgba(126,200,138,0.2)');
      earGlowGrad.addColorStop(1, 'rgba(126,200,138,0)');
      c.save(); c.fillStyle = earGlowGrad;
      c.beginPath(); c.moveTo(cx + s * headR * 0.86, headY);
      c.quadraticCurveTo(cx + s * headR * 1.12, headY - headR * 0.28, cx + s * headR * 1.25, headY - headR * 0.4);
      c.quadraticCurveTo(cx + s * headR * 1.02, headY - headR * 0.05, cx + s * headR * 0.86, headY + 2);
      c.fill(); c.restore();
      // Inner ear shimmer
      c.save(); c.fillStyle = _lighten(sk, 22); c.globalAlpha = 0.3;
      c.beginPath(); c.moveTo(cx + s * headR * 0.85, headY);
      c.quadraticCurveTo(cx + s * headR * 1.1, headY - headR * 0.25, cx + s * headR * 1.22, headY - headR * 0.38);
      c.quadraticCurveTo(cx + s * headR * 1.0, headY - headR * 0.05, cx + s * headR * 0.85, headY + 2);
      c.fill(); c.restore();
    }
  } else {
    // Human head
    const headGrad = c.createRadialGradient(cx - headR * 0.2, headY - headR * 0.25, headR * 0.15, cx, headY, headR);
    headGrad.addColorStop(0, _lighten(sk, 10));
    headGrad.addColorStop(0.6, _lighten(sk, 3));
    headGrad.addColorStop(1, sk);
    c.fillStyle = headGrad;
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI * 2); c.fill();
  }

  // ── Nose bridge highlight (all non-wolf) ──
  if (!isWolf) {
    c.save(); c.fillStyle = '#fff'; c.globalAlpha = 0.06;
    c.beginPath();
    c.ellipse(cx, headY + headR * 0.05, headR * 0.06, headR * 0.18, 0, 0, Math.PI * 2);
    c.fill(); c.restore();
  }

  // ── Eyes (larger, multi-layer iris, enhanced highlights) ──
  const eyeY = headY + headR * 0.02;
  const eyeSp = headR * 0.38;
  const eyeW = headR * 0.28;
  const eyeH = headR * 0.36;

  for (let s = -1; s <= 1; s += 2) {
    const ex = cx + s * eyeSp;

    // Subtle colored eye shadow
    c.save(); c.globalAlpha = 0.06;
    c.fillStyle = char.eyeColor;
    c.beginPath(); c.ellipse(ex, eyeY - eyeH * 0.3, eyeW * 1.3, eyeH * 0.6, 0, Math.PI, 0); c.fill();
    c.restore();

    // Eye white with subtle blue tint
    const whiteGrad = c.createRadialGradient(ex, eyeY, eyeW * 0.2, ex, eyeY, eyeW);
    whiteGrad.addColorStop(0, '#ffffff');
    whiteGrad.addColorStop(1, '#f0f2f8');
    c.fillStyle = whiteGrad;
    c.beginPath(); c.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); c.fill();

    const iR = eyeW * 0.75;
    // Iris — multi-layer
    if (isCat) {
      // Outer ring
      c.fillStyle = _darken(char.eyeColor, 15);
      c.beginPath(); c.ellipse(ex, eyeY, iR * 0.65, iR * 1.2, 0, 0, Math.PI * 2); c.fill();
      // Mid color
      c.fillStyle = char.eyeColor;
      c.beginPath(); c.ellipse(ex, eyeY, iR * 0.5, iR * 1.0, 0, 0, Math.PI * 2); c.fill();
      // Inner light
      c.save(); c.fillStyle = _lighten(char.eyeColor, 30); c.globalAlpha = 0.4;
      c.beginPath(); c.ellipse(ex, eyeY - iR * 0.15, iR * 0.3, iR * 0.5, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      // Slit pupil
      c.fillStyle = '#111';
      c.beginPath(); c.ellipse(ex, eyeY, iR * 0.1, iR * 0.9, 0, 0, Math.PI * 2); c.fill();
    } else if (isWolf) {
      // Outer dark ring
      c.fillStyle = _darken(char.eyeColor, 20);
      c.beginPath(); c.arc(ex, eyeY, iR, 0, Math.PI * 2); c.fill();
      // Mid gradient
      const wolfIrisGrad = c.createRadialGradient(ex, eyeY - iR * 0.15, iR * 0.1, ex, eyeY, iR * 0.85);
      wolfIrisGrad.addColorStop(0, _lighten(char.eyeColor, 35));
      wolfIrisGrad.addColorStop(0.5, char.eyeColor);
      wolfIrisGrad.addColorStop(1, _darken(char.eyeColor, 15));
      c.fillStyle = wolfIrisGrad;
      c.beginPath(); c.arc(ex, eyeY, iR * 0.85, 0, Math.PI * 2); c.fill();
      // Pupil
      c.fillStyle = '#111';
      c.beginPath(); c.ellipse(ex, eyeY, iR * 0.15, iR * 0.65, 0, 0, Math.PI * 2); c.fill();
    } else {
      // Outer ring
      c.fillStyle = _darken(char.eyeColor, 22);
      c.beginPath(); c.arc(ex, eyeY, iR, 0, Math.PI * 2); c.fill();
      // Mid gradient iris
      const irisGrad = c.createRadialGradient(ex, eyeY - iR * 0.2, iR * 0.08, ex, eyeY, iR * 0.88);
      irisGrad.addColorStop(0, _lighten(char.eyeColor, 40));
      irisGrad.addColorStop(0.35, _lighten(char.eyeColor, 15));
      irisGrad.addColorStop(0.7, char.eyeColor);
      irisGrad.addColorStop(1, _darken(char.eyeColor, 18));
      c.fillStyle = irisGrad;
      c.beginPath(); c.arc(ex, eyeY, iR * 0.88, 0, Math.PI * 2); c.fill();
      // Inner light ring
      c.save(); c.strokeStyle = _lighten(char.eyeColor, 25); c.lineWidth = 0.3; c.globalAlpha = 0.3;
      c.beginPath(); c.arc(ex, eyeY, iR * 0.5, 0, Math.PI * 2); c.stroke();
      c.restore();
      // Pupil
      c.fillStyle = '#111';
      c.beginPath(); c.arc(ex, eyeY, iR * 0.38, 0, Math.PI * 2); c.fill();
    }

    // Highlight system (star-shaped for Petal, 3-point for others)
    c.fillStyle = '#fff';
    if (isFairy) {
      // Star-shaped main highlight
      const shx = ex + eyeW * 0.18, shy = eyeY - eyeH * 0.22, shr = eyeW * 0.22;
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 4 + i * Math.PI / 2;
        c.moveTo(shx, shy);
        c.lineTo(shx + Math.cos(a) * shr * 1.6, shy + Math.sin(a) * shr * 1.6);
      }
      c.lineWidth = eyeW * 0.1; c.lineCap = 'round'; c.strokeStyle = '#fff'; c.stroke();
      c.beginPath(); c.arc(shx, shy, shr * 0.7, 0, Math.PI * 2); c.fill();
      // Secondary circular highlight
      c.beginPath(); c.arc(ex - eyeW * 0.12, eyeY + eyeH * 0.14, eyeW * 0.12, 0, Math.PI * 2); c.fill();
    } else {
      // Main highlight (large, upper-right)
      c.beginPath(); c.arc(ex + eyeW * 0.2, eyeY - eyeH * 0.24, eyeW * 0.26, 0, Math.PI * 2); c.fill();
      // Secondary highlight (medium, lower-left)
      c.beginPath(); c.arc(ex - eyeW * 0.12, eyeY + eyeH * 0.14, eyeW * 0.14, 0, Math.PI * 2); c.fill();
      // Tiny sparkle highlight
      c.save(); c.globalAlpha = 0.6;
      c.beginPath(); c.arc(ex + eyeW * 0.05, eyeY - eyeH * 0.08, eyeW * 0.06, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    // Thicker upper eyelid line
    c.strokeStyle = lashColor; c.lineWidth = 1.1; c.lineCap = 'round'; c.globalAlpha = 0.55;
    c.beginPath(); c.ellipse(ex, eyeY, eyeW, eyeH, 0, Math.PI + 0.12, -0.12); c.stroke();
    c.globalAlpha = 1;

    // Individual upper lash strokes
    c.save(); c.strokeStyle = lashColor; c.lineCap = 'round';
    if (!isWolf) {
      // Outer corner lash (longest)
      c.lineWidth = 0.6; c.globalAlpha = 0.5;
      c.beginPath(); c.moveTo(ex + s * eyeW * 0.9, eyeY - eyeH * 0.55);
      c.lineTo(ex + s * eyeW * 1.2, eyeY - eyeH * 0.9); c.stroke();
      // Mid lash
      c.lineWidth = 0.5; c.globalAlpha = 0.45;
      c.beginPath(); c.moveTo(ex + s * eyeW * 0.55, eyeY - eyeH * 0.82);
      c.lineTo(ex + s * eyeW * 0.65, eyeY - eyeH * 1.2); c.stroke();
      // Inner lash
      c.lineWidth = 0.4; c.globalAlpha = 0.35;
      c.beginPath(); c.moveTo(ex + s * eyeW * 0.15, eyeY - eyeH * 0.92);
      c.lineTo(ex + s * eyeW * 0.15, eyeY - eyeH * 1.2); c.stroke();
      // Girl/Fairy get extra lashes
      if (!isBoy) {
        c.lineWidth = 0.45; c.globalAlpha = 0.4;
        c.beginPath(); c.moveTo(ex + s * eyeW * 0.75, eyeY - eyeH * 0.7);
        c.lineTo(ex + s * eyeW * 0.95, eyeY - eyeH * 1.05); c.stroke();
      }
    } else {
      // Wolf: subtle lash hints
      c.lineWidth = 0.4; c.globalAlpha = 0.25;
      c.beginPath(); c.moveTo(ex + s * eyeW * 0.8, eyeY - eyeH * 0.5);
      c.lineTo(ex + s * eyeW * 1.0, eyeY - eyeH * 0.7); c.stroke();
    }
    c.restore();

    // Lower lash hints (non-wolf, non-boy)
    if (!isWolf && !isBoy) {
      c.save(); c.strokeStyle = lashColor; c.lineWidth = 0.25; c.globalAlpha = 0.15; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex + s * eyeW * 0.6, eyeY + eyeH * 0.7);
      c.lineTo(ex + s * eyeW * 0.7, eyeY + eyeH * 0.85); c.stroke();
      c.beginPath(); c.moveTo(ex + s * eyeW * 0.2, eyeY + eyeH * 0.85);
      c.lineTo(ex + s * eyeW * 0.2, eyeY + eyeH * 1.0); c.stroke();
      c.restore();
    }
  }

  // ── Eyebrows (softer, thinner, more curved) ──
  c.strokeStyle = isWolf ? '#5d6d7d' : _darken(char.hair, 10);
  c.lineWidth = isBoy ? 0.9 : 0.7; c.lineCap = 'round';
  c.globalAlpha = isWolf ? 0.45 : (isBoy ? 0.35 : 0.22);
  for (let s = -1; s <= 1; s += 2) {
    c.beginPath();
    c.moveTo(cx + s * (eyeSp - eyeW * 0.5), eyeY - eyeH - 2);
    c.quadraticCurveTo(cx + s * eyeSp, eyeY - eyeH - (isBoy ? 5.5 : 4.5), cx + s * (eyeSp + eyeW * 0.4), eyeY - eyeH - 1);
    c.stroke();
  }
  c.globalAlpha = 1;

  // ── Mouth ──
  if (!isWolf && !isCat) {
    const mY = headY + headR * 0.4;
    // Cupid's bow upper lip
    c.strokeStyle = isBoy ? '#b06058' : '#c06060'; c.lineWidth = 0.6; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx - headR * 0.09, mY + 0.5);
    c.quadraticCurveTo(cx - headR * 0.04, mY - 1.2, cx - headR * 0.005, mY - 0.3);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + headR * 0.005, mY - 0.3);
    c.quadraticCurveTo(cx + headR * 0.04, mY - 1.2, cx + headR * 0.09, mY + 0.5);
    c.stroke();
    // Lower lip fill (fuller for girl/fairy)
    c.save();
    c.globalAlpha = isBoy ? 0.1 : 0.18;
    c.fillStyle = isBoy ? '#c07060' : '#d07070';
    c.beginPath();
    c.moveTo(cx - headR * 0.07, mY + 0.8);
    c.quadraticCurveTo(cx, mY + 3, cx + headR * 0.07, mY + 0.8);
    c.fill(); c.restore();
    // Lip highlight
    c.save(); c.fillStyle = '#fff'; c.globalAlpha = 0.08;
    c.beginPath();
    c.ellipse(cx, mY + 1.5, headR * 0.03, 0.6, 0, 0, Math.PI * 2);
    c.fill(); c.restore();
  } else if (isCat) {
    const mY = headY + headR * 0.3;
    c.strokeStyle = '#c06060'; c.lineWidth = 0.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - 2.8, mY); c.quadraticCurveTo(cx - 1, mY + 2.8, cx, mY + 0.5); c.stroke();
    c.beginPath(); c.moveTo(cx + 2.8, mY); c.quadraticCurveTo(cx + 1, mY + 2.8, cx, mY + 0.5); c.stroke();
    // Cute :3 lip highlight
    c.save(); c.fillStyle = '#e89898'; c.globalAlpha = 0.12;
    c.beginPath(); c.ellipse(cx, mY + 1.2, 1.5, 0.8, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // ── Blush (softer, wider spread) ──
  {
    c.save();
    const blushY = eyeY + eyeH + 2;
    const blushAlpha = isWolf ? 0.06 : 0.13;
    c.globalAlpha = blushAlpha;
    for (let s = -1; s <= 1; s += 2) {
      const bx = cx + s * (eyeSp + eyeW * 0.1);
      // Soft radial blush using hex color with alpha
      const bRgb = _hexToRgb(blushColor);
      const blushGrad = c.createRadialGradient(bx, blushY, 0, bx, blushY, headR * 0.22);
      blushGrad.addColorStop(0, `rgba(${bRgb.r},${bRgb.g},${bRgb.b},1)`);
      blushGrad.addColorStop(1, `rgba(${bRgb.r},${bRgb.g},${bRgb.b},0)`);
      c.fillStyle = blushGrad;
      c.beginPath(); c.ellipse(bx, blushY, headR * 0.2, headR * 0.1, 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  // ── Fenn freckles ──
  if (isBoy) {
    c.save(); c.fillStyle = '#c8a080'; c.globalAlpha = 0.25;
    const frecklePositions = [
      [-0.25, 0.18], [-0.15, 0.22], [-0.32, 0.25], [-0.08, 0.26],
      [0.25, 0.18], [0.15, 0.22], [0.32, 0.25], [0.08, 0.26],
      [-0.2, 0.3], [0.2, 0.3]
    ];
    for (const [fx, fy] of frecklePositions) {
      c.beginPath();
      c.arc(cx + headR * fx, headY + headR * fy, 0.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // ── Petal beauty mark ──
  if (isFairy) {
    c.save(); c.fillStyle = '#8a5060'; c.globalAlpha = 0.35;
    c.beginPath();
    c.arc(cx - eyeSp + eyeW * 0.3, eyeY + eyeH + 3.5, 0.6, 0, Math.PI * 2);
    c.fill(); c.restore();
  }

  // ── Front hair (over face) ── (hidden when a hair item is equipped)
  if (!isWolf && !isCat && !equipped.hair) {
    c.save();
    const hc = char.hair;
    if (char.id === 'human_girl') {
      // Lumi: side-parted bangs + face-framing curls + twisted loop bun
      // Bangs — soft, swept to the side
      c.fillStyle = hc;
      c.beginPath();
      c.moveTo(cx - headR * 0.75, headY - headR * 0.6);
      c.quadraticCurveTo(cx - headR * 0.5, headY - headR * 1.05, cx - headR * 0.1, headY - headR * 0.95);
      c.quadraticCurveTo(cx + headR * 0.2, headY - headR * 0.9, cx + headR * 0.55, headY - headR * 0.85);
      c.quadraticCurveTo(cx + headR * 0.8, headY - headR * 0.75, cx + headR * 0.82, headY - headR * 0.35);
      // Connect along forehead curve
      c.quadraticCurveTo(cx + headR * 0.6, headY - headR * 0.55, cx + headR * 0.3, headY - headR * 0.5);
      c.quadraticCurveTo(cx, headY - headR * 0.55, cx - headR * 0.4, headY - headR * 0.45);
      c.quadraticCurveTo(cx - headR * 0.65, headY - headR * 0.4, cx - headR * 0.75, headY - headR * 0.3);
      c.closePath(); c.fill();
      // Side hair panels (covering temples)
      c.fillStyle = hc;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * headR * 0.78, headY - headR * 0.4);
        c.quadraticCurveTo(cx + s * headR * 0.95, headY + headR * 0.2, cx + s * headR * 0.85, headY + headR * 0.7);
        c.quadraticCurveTo(cx + s * headR * 0.7, headY + headR * 0.9, cx + s * headR * 0.55, headY + headR * 0.85);
        c.quadraticCurveTo(cx + s * headR * 0.7, headY + headR * 0.3, cx + s * headR * 0.65, headY - headR * 0.3);
        c.closePath(); c.fill();
      }
      // Face-framing curls (two thin pieces that curl inward at jaw)
      c.save(); c.strokeStyle = hc; c.lineWidth = 2; c.lineCap = 'round';
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * headR * 0.72, headY + headR * 0.1);
        c.quadraticCurveTo(cx + s * headR * 0.78, headY + headR * 0.6, cx + s * headR * 0.5, headY + headR * 1.05);
        c.stroke();
      }
      c.restore();
      // Twisted loop bun at nape
      const bunY = headY - headR * 0.65;
      c.fillStyle = _darken(hc, 8);
      c.beginPath(); c.ellipse(cx + headR * 0.05, bunY, headR * 0.3, headR * 0.25, 0.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = hc;
      c.beginPath(); c.ellipse(cx - headR * 0.05, bunY - headR * 0.08, headR * 0.22, headR * 0.2, -0.15, 0, Math.PI * 2); c.fill();
      // Tiny braid woven into bun
      c.save(); c.strokeStyle = _lighten(hc, 15); c.lineWidth = 0.6; c.globalAlpha = 0.3;
      c.beginPath();
      c.moveTo(cx - headR * 0.15, bunY + headR * 0.15);
      c.quadraticCurveTo(cx + headR * 0.1, bunY - headR * 0.1, cx + headR * 0.2, bunY + headR * 0.1);
      c.stroke(); c.restore();
      // Gold star clip
      const starX = cx + headR * 0.25, starY = bunY - headR * 0.05;
      c.save(); c.fillStyle = '#d4a030'; c.globalAlpha = 0.85;
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        const ra = -Math.PI / 2 + (i + 0.5) * Math.PI * 2 / 5;
        if (i === 0) c.moveTo(starX + Math.cos(a) * 2.2, starY + Math.sin(a) * 2.2);
        else c.lineTo(starX + Math.cos(a) * 2.2, starY + Math.sin(a) * 2.2);
        c.lineTo(starX + Math.cos(ra) * 1.0, starY + Math.sin(ra) * 1.0);
      }
      c.closePath(); c.fill();
      // Star highlight
      c.fillStyle = '#f0d060'; c.globalAlpha = 0.4;
      c.beginPath(); c.arc(starX - 0.3, starY - 0.3, 0.8, 0, Math.PI * 2); c.fill();
      c.restore();
      // Hair strand highlights
      c.save(); c.strokeStyle = _lighten(hc, 20); c.lineWidth = 0.4; c.globalAlpha = 0.12;
      c.beginPath(); c.moveTo(cx - headR * 0.3, headY - headR * 0.8);
      c.quadraticCurveTo(cx - headR * 0.1, headY - headR * 0.6, cx, headY - headR * 0.5);
      c.stroke(); c.restore();
    } else if (char.id === 'human_boy') {
      // Fenn: tousled medium bangs, cowlick tuft, natural layers
      c.fillStyle = hc;
      // Main hair mass on top
      c.beginPath();
      c.moveTo(cx - headR * 0.8, headY - headR * 0.35);
      c.quadraticCurveTo(cx - headR * 0.7, headY - headR * 1.0, cx - headR * 0.2, headY - headR * 0.95);
      c.quadraticCurveTo(cx, headY - headR * 1.05, cx + headR * 0.15, headY - headR * 1.0);
      c.quadraticCurveTo(cx + headR * 0.5, headY - headR * 0.95, cx + headR * 0.75, headY - headR * 0.85);
      c.quadraticCurveTo(cx + headR * 0.9, headY - headR * 0.7, cx + headR * 0.85, headY - headR * 0.3);
      // Forehead line with uneven bangs
      c.quadraticCurveTo(cx + headR * 0.6, headY - headR * 0.5, cx + headR * 0.3, headY - headR * 0.42);
      c.quadraticCurveTo(cx + headR * 0.1, headY - headR * 0.55, cx - headR * 0.1, headY - headR * 0.48);
      c.quadraticCurveTo(cx - headR * 0.4, headY - headR * 0.4, cx - headR * 0.65, headY - headR * 0.35);
      c.closePath(); c.fill();
      // Side pieces covering temples
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * headR * 0.8, headY - headR * 0.4);
        c.quadraticCurveTo(cx + s * headR * 0.9, headY, cx + s * headR * 0.82, headY + headR * 0.3);
        c.quadraticCurveTo(cx + s * headR * 0.7, headY + headR * 0.1, cx + s * headR * 0.65, headY - headR * 0.25);
        c.closePath(); c.fill();
      }
      // Cowlick tuft at crown
      c.save(); c.fillStyle = hc;
      c.beginPath();
      c.moveTo(cx + headR * 0.05, headY - headR * 1.0);
      c.quadraticCurveTo(cx + headR * 0.15, headY - headR * 1.25, cx + headR * 0.08, headY - headR * 1.3);
      c.quadraticCurveTo(cx - headR * 0.05, headY - headR * 1.2, cx - headR * 0.05, headY - headR * 1.0);
      c.closePath(); c.fill();
      c.restore();
      // Hair texture/strand lines
      c.save(); c.strokeStyle = _darken(hc, 12); c.lineWidth = 0.4; c.globalAlpha = 0.15;
      c.beginPath(); c.moveTo(cx - headR * 0.4, headY - headR * 0.9);
      c.quadraticCurveTo(cx - headR * 0.2, headY - headR * 0.7, cx - headR * 0.3, headY - headR * 0.45);
      c.stroke();
      c.beginPath(); c.moveTo(cx + headR * 0.2, headY - headR * 0.95);
      c.quadraticCurveTo(cx + headR * 0.35, headY - headR * 0.7, cx + headR * 0.25, headY - headR * 0.5);
      c.stroke();
      c.restore();
    } else if (isElf) {
      // Sylvie: wispy bangs, platinum-streaked, floating wisps
      c.fillStyle = hc;
      // Hair top/bangs — soft, parted, wispy
      c.beginPath();
      c.moveTo(cx - headR * 0.8, headY - headR * 0.3);
      c.quadraticCurveTo(cx - headR * 0.75, headY - headR * 0.95, cx - headR * 0.3, headY - headR * 0.98);
      c.quadraticCurveTo(cx, headY - headR * 1.02, cx + headR * 0.3, headY - headR * 0.98);
      c.quadraticCurveTo(cx + headR * 0.75, headY - headR * 0.95, cx + headR * 0.8, headY - headR * 0.3);
      // Forehead with wispy gaps
      c.quadraticCurveTo(cx + headR * 0.5, headY - headR * 0.55, cx + headR * 0.2, headY - headR * 0.45);
      c.quadraticCurveTo(cx, headY - headR * 0.52, cx - headR * 0.15, headY - headR * 0.48);
      c.quadraticCurveTo(cx - headR * 0.5, headY - headR * 0.4, cx - headR * 0.7, headY - headR * 0.32);
      c.closePath(); c.fill();
      // Side panels
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * headR * 0.82, headY - headR * 0.3);
        c.quadraticCurveTo(cx + s * headR * 0.9, headY + headR * 0.3, cx + s * headR * 0.75, headY + headR * 0.7);
        c.quadraticCurveTo(cx + s * headR * 0.6, headY + headR * 0.4, cx + s * headR * 0.6, headY - headR * 0.15);
        c.closePath(); c.fill();
      }
      // Platinum highlight streaks near face
      c.save(); c.strokeStyle = _lighten(hc, 35); c.lineWidth = 0.6; c.globalAlpha = 0.3; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx - headR * 0.4, headY - headR * 0.85);
      c.quadraticCurveTo(cx - headR * 0.45, headY - headR * 0.4, cx - headR * 0.5, headY + headR * 0.2);
      c.stroke();
      c.beginPath();
      c.moveTo(cx + headR * 0.3, headY - headR * 0.88);
      c.quadraticCurveTo(cx + headR * 0.35, headY - headR * 0.5, cx + headR * 0.38, headY - headR * 0.1);
      c.stroke();
      c.restore();
      // Floating hair wisps (gentle breeze effect)
      c.save(); c.strokeStyle = hc; c.lineWidth = 0.5; c.globalAlpha = 0.2; c.lineCap = 'round';
      const now = Date.now() / 2000;
      for (let i = 0; i < 3; i++) {
        const wx = cx + (i - 1) * headR * 0.4 + Math.sin(now + i) * 2;
        const wy = headY - headR * 0.7 - i * 2;
        c.beginPath();
        c.moveTo(wx, wy);
        c.quadraticCurveTo(wx + Math.sin(now + i * 1.3) * 4, wy - 5, wx + Math.sin(now + i * 0.7) * 3, wy - 9);
        c.stroke();
      }
      c.restore();
    } else if (isFairy) {
      // Petal: messy space buns + layered wavy bangs
      c.fillStyle = hc;
      // Main hair top + bangs (tousled, slightly asymmetric)
      c.beginPath();
      c.moveTo(cx - headR * 0.82, headY - headR * 0.3);
      c.quadraticCurveTo(cx - headR * 0.8, headY - headR * 0.95, cx - headR * 0.3, headY - headR * 0.92);
      c.quadraticCurveTo(cx, headY - headR * 1.0, cx + headR * 0.25, headY - headR * 0.95);
      c.quadraticCurveTo(cx + headR * 0.75, headY - headR * 0.9, cx + headR * 0.85, headY - headR * 0.3);
      // Bangs — messy, pieces going different directions
      c.quadraticCurveTo(cx + headR * 0.55, headY - headR * 0.5, cx + headR * 0.35, headY - headR * 0.38);
      c.quadraticCurveTo(cx + headR * 0.15, headY - headR * 0.5, cx - headR * 0.05, headY - headR * 0.42);
      c.quadraticCurveTo(cx - headR * 0.25, headY - headR * 0.38, cx - headR * 0.45, headY - headR * 0.45);
      c.quadraticCurveTo(cx - headR * 0.7, headY - headR * 0.38, cx - headR * 0.82, headY - headR * 0.3);
      c.closePath(); c.fill();
      // Side hair panels
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * headR * 0.85, headY - headR * 0.3);
        c.quadraticCurveTo(cx + s * headR * 0.95, headY + headR * 0.3, cx + s * headR * 0.8, headY + headR * 0.8);
        c.quadraticCurveTo(cx + s * headR * 0.65, headY + headR * 0.5, cx + s * headR * 0.65, headY - headR * 0.15);
        c.closePath(); c.fill();
      }
      // Space buns (two messy buns on top)
      for (let s = -1; s <= 1; s += 2) {
        const bx = cx + s * headR * 0.42;
        const by = headY - headR * 0.95;
        // Bun base
        c.fillStyle = _darken(hc, 5);
        c.beginPath(); c.arc(bx, by, headR * 0.22, 0, Math.PI * 2); c.fill();
        // Bun highlight
        c.fillStyle = _lighten(hc, 12);
        c.beginPath(); c.arc(bx - 1, by - 1, headR * 0.12, 0, Math.PI * 2); c.fill();
        // Golden flower pin
        c.save(); c.fillStyle = '#d4a030'; c.globalAlpha = 0.75;
        const pinX = bx + s * headR * 0.12;
        const pinY = by - headR * 0.08;
        for (let p = 0; p < 5; p++) {
          const pa = p * Math.PI * 2 / 5;
          c.beginPath();
          c.ellipse(pinX + Math.cos(pa) * 1.2, pinY + Math.sin(pa) * 1.2, 0.8, 0.4, pa, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#f0d060'; c.beginPath(); c.arc(pinX, pinY, 0.6, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      // Golden sparkle particles clinging to hair
      c.save(); c.fillStyle = '#ffd700'; c.globalAlpha = 0.3;
      const sparklePos = [[-0.3, -0.8], [0.4, -0.7], [-0.5, -0.5], [0.6, -0.3], [-0.15, -0.9], [0.2, -0.85]];
      for (const [spx, spy] of sparklePos) {
        c.beginPath(); c.arc(cx + headR * spx, headY + headR * spy, 0.5, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // Rose-gold shimmer streaks
      c.save(); c.strokeStyle = '#f4c0a0'; c.lineWidth = 0.4; c.globalAlpha = 0.15;
      c.beginPath();
      c.moveTo(cx - headR * 0.3, headY - headR * 0.85);
      c.quadraticCurveTo(cx - headR * 0.35, headY - headR * 0.5, cx - headR * 0.4, headY + headR * 0.3);
      c.stroke(); c.restore();
    }
    c.restore();
  }

  // ── Character accessories (always visible, even with equipped hair) ──
  if (char.id === 'human_boy') {
    // Fenn: Brass goggles pushed up on forehead
    c.save();
    const gogY = headY - headR * 0.55;
    c.strokeStyle = '#8b6914'; c.lineWidth = 1.2; c.globalAlpha = 0.7;
    c.beginPath();
    c.moveTo(cx - headR * 0.55, gogY + 2);
    c.quadraticCurveTo(cx, gogY - 1, cx + headR * 0.55, gogY + 2);
    c.stroke();
    for (let s = -1; s <= 1; s += 2) {
      const lx = cx + s * headR * 0.22;
      c.strokeStyle = '#b8860b'; c.lineWidth = 1.0; c.globalAlpha = 0.75;
      c.beginPath(); c.arc(lx, gogY, headR * 0.15, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(77,184,130,0.12)'; c.globalAlpha = 0.6;
      c.beginPath(); c.arc(lx, gogY, headR * 0.13, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.globalAlpha = 0.25;
      c.beginPath(); c.arc(lx - headR * 0.04, gogY - headR * 0.04, headR * 0.04, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = '#b8860b'; c.lineWidth = 0.8; c.globalAlpha = 0.7;
    c.beginPath();
    c.moveTo(cx - headR * 0.08, gogY);
    c.quadraticCurveTo(cx, gogY - 1, cx + headR * 0.08, gogY);
    c.stroke();
    c.restore();
  }
  if (isElf) {
    // Sylvie: Dewdrop pendant
    c.save();
    const pdX2 = cx, pdY2 = neckTop - 1;
    c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.3; c.globalAlpha = 0.3;
    c.beginPath(); c.moveTo(cx - headR * 0.2, headY + headR * 0.9);
    c.quadraticCurveTo(cx, headY + headR * 1.05, cx + headR * 0.2, headY + headR * 0.9);
    c.stroke();
    c.globalAlpha = 0.5;
    const dewGrad2 = c.createRadialGradient(pdX2 - 0.5, pdY2 - 1, 0.3, pdX2, pdY2, 2);
    dewGrad2.addColorStop(0, 'rgba(255,255,255,0.8)');
    dewGrad2.addColorStop(0.5, 'rgba(200,230,255,0.4)');
    dewGrad2.addColorStop(1, 'rgba(180,210,240,0.2)');
    c.fillStyle = dewGrad2;
    c.beginPath(); c.arc(pdX2, pdY2, 1.8, 0, Math.PI * 2); c.fill();
    const now2 = Date.now() / 2000;
    c.globalAlpha = 0.15;
    const rainbowColors2 = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#9b59b6'];
    for (let i = 0; i < 5; i++) {
      c.fillStyle = rainbowColors2[i];
      c.beginPath(); c.arc(pdX2 + Math.cos(now2 * 2 + i * 1.2) * 3, pdY2 + Math.sin(now2 * 2 + i * 1.2) * 3, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // Gold ear wrap with leaf charm
    c.save();
    const earWrapX2 = cx - headR * 0.88;
    const earWrapY2 = headY - headR * 0.05;
    c.strokeStyle = '#d4a030'; c.lineWidth = 0.8; c.globalAlpha = 0.6; c.lineCap = 'round';
    c.beginPath(); c.arc(earWrapX2, earWrapY2, 2, -0.5, Math.PI * 0.8); c.stroke();
    c.fillStyle = '#7ec88a'; c.globalAlpha = 0.5;
    c.beginPath();
    c.ellipse(earWrapX2 - 1, earWrapY2 + 3.5, 1.2, 2, -0.2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // ── Mika gold circlet ──
  if (isCat) {
    c.save();
    // Thin gold band behind ears
    c.strokeStyle = '#d4a030'; c.lineWidth = 0.8; c.globalAlpha = 0.6; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx - headR * 0.55, headY - headR * 0.4);
    c.quadraticCurveTo(cx, headY - headR * 0.65, cx + headR * 0.55, headY - headR * 0.4);
    c.stroke();
    // Amethyst drop on forehead
    c.fillStyle = '#9b59b6'; c.globalAlpha = 0.55;
    c.beginPath();
    c.moveTo(cx, headY - headR * 0.62);
    c.lineTo(cx - 1.2, headY - headR * 0.52);
    c.lineTo(cx, headY - headR * 0.42);
    c.lineTo(cx + 1.2, headY - headR * 0.52);
    c.closePath(); c.fill();
    // Gem highlight
    c.fillStyle = '#d8b0e8'; c.globalAlpha = 0.3;
    c.beginPath(); c.arc(cx - 0.3, headY - headR * 0.55, 0.5, 0, Math.PI * 2); c.fill();
    // Gold ear cuff (left ear)
    c.strokeStyle = '#d4a030'; c.lineWidth = 0.7; c.globalAlpha = 0.5;
    c.beginPath(); c.arc(cx - headR * 0.5, headY - headR * 0.65, 1.5, 0, Math.PI * 1.2); c.stroke();
    c.restore();
  }

  // ── Fairy/Elf glow ──
  if (isFairy || isElf) {
    const glow = c.createRadialGradient(cx, headY, headR * 0.3, cx, headY, headR * 1.8);
    if (isFairy) {
      glow.addColorStop(0, 'rgba(255,180,220,0.12)');
      glow.addColorStop(0.5, 'rgba(255,160,230,0.05)');
    } else {
      glow.addColorStop(0, 'rgba(180,230,200,0.1)');
      glow.addColorStop(0.5, 'rgba(160,220,180,0.04)');
    }
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow;
    c.beginPath(); c.arc(cx, headY, headR * 1.8, 0, Math.PI * 2); c.fill();
  }

  // ── Elf floating leaf particles ──
  if (isElf) {
    const now = Date.now() / 800;
    c.save();
    for (let i = 0; i < 5; i++) {
      const lx = cx + Math.sin(now * 0.7 + i * 1.4) * (shoulderW + 16 + i * 3);
      const ly = headY - headR + Math.cos(now * 0.5 + i * 1.8) * (bodyBot - headY + headR) * 0.5;
      const la = 0.15 + Math.sin(now + i * 1.2) * 0.08;
      const lr = 0.6 + Math.sin(now * 1.2 + i) * 0.3;
      const rot = now * 0.5 + i;
      c.save();
      c.translate(lx, ly);
      c.rotate(rot);
      c.globalAlpha = la;
      c.fillStyle = '#7ec88a';
      c.beginPath();
      c.ellipse(0, 0, lr * 1.5, lr * 0.6, 0, 0, Math.PI * 2);
      c.fill();
      // Leaf vein
      c.strokeStyle = '#5ea86a'; c.lineWidth = 0.2; c.globalAlpha = la * 0.5;
      c.beginPath(); c.moveTo(-lr, 0); c.lineTo(lr, 0); c.stroke();
      c.restore();
    }
    c.restore();
  }

  // ── Fairy sparkles (12 particles with color variation) ──
  if (isFairy) {
    const now = Date.now() / 600;
    const sparkleColors = [
      [255,200,240], [255,220,180], [220,200,255], [255,240,200],
      [255,180,220], [240,220,255], [255,210,190], [220,240,255],
      [255,200,200], [255,230,210], [230,200,255], [255,220,220]
    ];
    for (let i = 0; i < 12; i++) {
      const sx = cx + Math.sin(now + i * 0.85) * (shoulderW + 22 + i * 1.8);
      const sy = headY - headR * 0.5 + Math.cos(now + i * 1.3) * (bodyBot - headY + headR) * 0.65;
      const al = 0.18 + Math.sin(now + i * 0.7) * 0.14;
      const sr = 0.7 + Math.sin(now * 1.5 + i) * 0.4;
      const sc = sparkleColors[i];
      c.fillStyle = `rgba(${sc[0]},${sc[1]},${sc[2]},${al})`;
      c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
      // Cross sparkle shape for some
      if (i % 3 === 0) {
        c.save(); c.strokeStyle = `rgba(${sc[0]},${sc[1]},${sc[2]},${al * 0.6})`; c.lineWidth = 0.3;
        c.beginPath(); c.moveTo(sx - sr * 1.5, sy); c.lineTo(sx + sr * 1.5, sy); c.stroke();
        c.beginPath(); c.moveTo(sx, sy - sr * 1.5); c.lineTo(sx, sy + sr * 1.5); c.stroke();
        c.restore();
      }
    }
  }

  // ── Lumi's floating starlight motes ──
  if (char.id === 'human_girl') {
    const now = Date.now() / 900;
    c.save();
    for (let i = 0; i < 3; i++) {
      const mx = cx + Math.sin(now * 0.6 + i * 2.2) * (headR * 1.2 + i * 5);
      const my = headY - headR * 0.5 + Math.cos(now * 0.4 + i * 1.8) * (headR * 1.5);
      const ma = 0.15 + Math.sin(now * 0.8 + i * 1.5) * 0.1;
      const mr = 1.0 + Math.sin(now + i * 0.9) * 0.3;
      // Warm glow halo
      const moteGlow = c.createRadialGradient(mx, my, 0, mx, my, mr * 3);
      moteGlow.addColorStop(0, `rgba(255,220,160,${ma * 0.5})`);
      moteGlow.addColorStop(1, 'rgba(255,220,160,0)');
      c.fillStyle = moteGlow;
      c.beginPath(); c.arc(mx, my, mr * 3, 0, Math.PI * 2); c.fill();
      // Bright core
      c.fillStyle = `rgba(255,240,200,${ma})`;
      c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
      // White center
      c.fillStyle = `rgba(255,255,255,${ma * 0.8})`;
      c.beginPath(); c.arc(mx, my, mr * 0.4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  // ── Petal's orbiting sparkle ──
  if (isFairy) {
    const now = Date.now() / 1500;
    const orbitR = headR * 1.6;
    const ox = cx + Math.cos(now) * orbitR;
    const oy = headY - headR * 0.3 + Math.sin(now) * orbitR * 0.4;
    c.save();
    // Sparkle trail
    for (let t = 0; t < 5; t++) {
      const trailAngle = now - t * 0.15;
      const tx = cx + Math.cos(trailAngle) * orbitR;
      const ty = headY - headR * 0.3 + Math.sin(trailAngle) * orbitR * 0.4;
      const ta = 0.08 - t * 0.015;
      c.fillStyle = `rgba(255,215,0,${ta})`;
      c.beginPath(); c.arc(tx, ty, 0.5 - t * 0.05, 0, Math.PI * 2); c.fill();
    }
    // Main orbiting mote
    const sparkGlow = c.createRadialGradient(ox, oy, 0, ox, oy, 3);
    sparkGlow.addColorStop(0, 'rgba(255,215,0,0.4)');
    sparkGlow.addColorStop(0.5, 'rgba(255,215,0,0.1)');
    sparkGlow.addColorStop(1, 'rgba(255,215,0,0)');
    c.fillStyle = sparkGlow;
    c.beginPath(); c.arc(ox, oy, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,240,180,0.6)';
    c.beginPath(); c.arc(ox, oy, 0.8, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath(); c.arc(ox, oy, 0.3, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // ── Ground shadow (enhanced) ──
  c.save();
  const shadowGrad = c.createRadialGradient(cx, footY + 4, 0, cx, footY + 4, shoulderW + 14);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.12)');
  shadowGrad.addColorStop(0.4, 'rgba(0,0,0,0.06)');
  shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.02)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = shadowGrad;
  c.beginPath(); c.ellipse(cx, footY + 4, shoulderW + 14, 4, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

/* Color utility helpers */
function _hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return { r: parseInt(hex.substring(0,2),16), g: parseInt(hex.substring(2,4),16), b: parseInt(hex.substring(4,6),16) };
}
function _rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function _lighten(hex, amt) {
  const c2 = _hexToRgb(hex); return _rgbToHex(c2.r+amt, c2.g+amt, c2.b+amt);
}
function _darken(hex, amt) {
  const c2 = _hexToRgb(hex); return _rgbToHex(c2.r-amt, c2.g-amt, c2.b-amt);
}

/* ================================================================
   ITEMS DEFINITION
   ================================================================ */
const ITEMS = [];

function defItem(id, name, category, tags, colors, drawFn) {
  ITEMS.push({ id, name, category, tags, colors, draw: drawFn, premium: PREMIUM_IDS.has(id) });
}

/* ── Hair Styles ── */
const HAIR_COLORS = [
  ['#6b3a2a','#8b5e3c','#3d1f0a','#f7dc6f'],
  ['#2c1810','#5d3a1a','#1a0a00','#c0392b'],
  ['#d4a574','#f0c27a','#a0724a','#e74c3c'],
  ['#4a4a4a','#7f8c8d','#2c3e50','#9b59b6'],
];

/* ── Anime hair helpers ── */
function _animeHairShine(c, cx, headY, headR) {
  c.save();
  // Primary shine band
  c.globalAlpha = 0.25;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(cx - headR * 0.12, headY - headR * 0.52, headR * 0.48, headR * 0.1, -0.25, 0, Math.PI * 2);
  c.fill();
  // Secondary shine
  c.globalAlpha = 0.14;
  c.beginPath();
  c.ellipse(cx + headR * 0.25, headY - headR * 0.38, headR * 0.22, headR * 0.06, 0.3, 0, Math.PI * 2);
  c.fill();
  // Fine rim highlight along top
  c.globalAlpha = 0.1;
  c.strokeStyle = '#fff'; c.lineWidth = 0.6;
  c.beginPath();
  c.arc(cx, headY, headR * 1.04, Math.PI + 0.5, -0.5);
  c.stroke();
  c.restore();
}

function _animeHairShadow(c, cx, headY, headR, color) {
  c.save();
  // Under-hair shadow at forehead
  c.globalAlpha = 0.12;
  c.fillStyle = _darken(color, 40);
  c.beginPath();
  c.arc(cx + headR * 0.08, headY - headR * 0.05, headR * 0.95, -0.4, Math.PI * 0.5);
  c.quadraticCurveTo(cx + headR * 0.3, headY + headR * 0.1, cx - headR * 0.3, headY - headR * 0.2);
  c.closePath(); c.fill();
  // Temple shadows
  c.globalAlpha = 0.06;
  for (let s = -1; s <= 1; s += 2) {
    c.beginPath();
    c.ellipse(cx + s * headR * 0.75, headY + headR * 0.1, headR * 0.18, headR * 0.4, s * 0.2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function _hairOutline(c, color) {
  c.save(); c.strokeStyle = _darken(color, 25); c.lineWidth = 0.5;
  c.globalAlpha = 0.18; c.stroke(); c.restore();
}

// Strand detail lines for depth — call after main hair fill
function _hairStrands(c, cx, headY, R, color, strands) {
  c.save(); c.lineCap = 'round';
  for (const s of strands) {
    c.strokeStyle = s.light ? _lighten(color, s.light) : _darken(color, s.dark || 12);
    c.lineWidth = s.w || 0.5;
    c.globalAlpha = s.a || 0.15;
    c.beginPath();
    c.moveTo(cx + s.x1 * R, headY + s.y1 * R);
    if (s.cx2 !== undefined) {
      c.bezierCurveTo(cx + s.cx1 * R, headY + s.cy1 * R, cx + s.cx2 * R, headY + s.cy2 * R, cx + s.x2 * R, headY + s.y2 * R);
    } else if (s.cx1 !== undefined) {
      c.quadraticCurveTo(cx + s.cx1 * R, headY + s.cy1 * R, cx + s.x2 * R, headY + s.y2 * R);
    } else {
      c.lineTo(cx + s.x2 * R, headY + s.y2 * R);
    }
    c.stroke();
  }
  c.restore();
}

// Inner highlight glow for premium hair feel
function _hairInnerGlow(c, cx, headY, R, color) {
  c.save();
  const g = c.createRadialGradient(cx - R * 0.1, headY - R * 0.5, R * 0.1, cx, headY - R * 0.2, R * 0.8);
  g.addColorStop(0, `rgba(255,255,255,0.12)`);
  g.addColorStop(1, `rgba(255,255,255,0)`);
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, headY - R * 0.2, R * 0.8, 0, Math.PI * 2); c.fill();
  c.restore();
}

function hairDraw(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY, bodyTop, bodyBot, neckTop, waistY } = M(x, y, w, h);
  const R = headR;
  const dk = _darken(color, 18);
  const dk2 = _darken(color, 30);
  const lt = _lighten(color, 20);
  const lt2 = _lighten(color, 35);

  // Rich multi-stop gradient
  const hairGrad = c.createLinearGradient(cx, headY - R * 1.4, cx, headY + R * 0.8);
  hairGrad.addColorStop(0, lt2);
  hairGrad.addColorStop(0.2, lt);
  hairGrad.addColorStop(0.45, color);
  hairGrad.addColorStop(0.75, dk);
  hairGrad.addColorStop(1, dk2);
  c.fillStyle = hairGrad;

  // Side gradient for depth on left/right panels
  const sideGradL = c.createLinearGradient(cx - R * 1.2, headY, cx - R * 0.3, headY);
  sideGradL.addColorStop(0, dk); sideGradL.addColorStop(0.5, color); sideGradL.addColorStop(1, lt);
  const sideGradR = c.createLinearGradient(cx + R * 0.3, headY, cx + R * 1.2, headY);
  sideGradR.addColorStop(0, lt); sideGradR.addColorStop(0.5, color); sideGradR.addColorStop(1, dk);

  switch(style) {
    case 'ponytail': {
      // Hair cap
      c.beginPath(); c.arc(cx, headY, R * 1.08, Math.PI, 0); c.fill();
      // Soft bangs with individual strand separations
      for (let i = -2; i <= 2; i++) {
        const bx = cx + i * R * 0.22;
        c.fillStyle = i <= 0 ? hairGrad : dk;
        c.beginPath();
        c.moveTo(bx - R * 0.14, headY - R * 0.75);
        c.quadraticCurveTo(bx - R * 0.08, headY - R * 0.3, bx, headY + R * 0.05);
        c.quadraticCurveTo(bx + R * 0.08, headY - R * 0.3, bx + R * 0.14, headY - R * 0.75);
        c.fill();
      }
      c.fillStyle = hairGrad;
      // Flowing ponytail with volume
      c.beginPath();
      c.moveTo(cx + R * 0.15, headY - R * 0.55);
      c.bezierCurveTo(cx + R * 1.5, headY - R * 0.4, cx + R * 1.3, headY + R * 1.2, cx + R * 0.8, headY + R * 2.2);
      c.quadraticCurveTo(cx + R * 0.6, headY + R * 2.5, cx + R * 0.45, headY + R * 2.4);
      c.bezierCurveTo(cx + R * 0.55, headY + R * 1.5, cx + R * 0.9, headY + R * 0.2, cx + R * 0.15, headY - R * 0.55);
      c.fill();
      // Inner ponytail highlight
      c.save(); c.globalAlpha = 0.12; c.fillStyle = lt2;
      c.beginPath();
      c.moveTo(cx + R * 0.3, headY - R * 0.3);
      c.bezierCurveTo(cx + R * 1.1, headY - R * 0.1, cx + R * 0.9, headY + R * 0.8, cx + R * 0.6, headY + R * 1.6);
      c.quadraticCurveTo(cx + R * 0.5, headY + R * 1.0, cx + R * 0.3, headY - R * 0.3);
      c.fill(); c.restore();
      // Strand lines through ponytail
      _hairStrands(c, cx, headY, R, color, [
        { x1: 0.4, y1: -0.2, cx1: 1.0, cy1: 0.3, x2: 0.7, y2: 1.8, dark: 15, a: 0.12, w: 0.5 },
        { x1: 0.3, y1: -0.3, cx1: 0.9, cy1: 0.5, x2: 0.55, y2: 2.0, light: 15, a: 0.1, w: 0.4 },
        { x1: 0.5, y1: -0.1, cx1: 1.1, cy1: 0.6, x2: 0.65, y2: 1.5, dark: 20, a: 0.08, w: 0.3 },
      ]);
      // Elastic/scrunchie
      c.save(); c.fillStyle = '#e84393';
      c.beginPath(); c.ellipse(cx + R * 0.35, headY - R * 0.3, 3.5, 2.5, 0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = _lighten('#e84393', 20); c.globalAlpha = 0.4;
      c.beginPath(); c.ellipse(cx + R * 0.33, headY - R * 0.33, 1.5, 1.0, 0.3, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = hairGrad;
      break;
    }
    case 'bob': {
      // Hair cap
      c.beginPath(); c.arc(cx, headY, R * 1.08, Math.PI + 0.2, -0.2); c.fill();
      // Left side panel with depth gradient
      c.fillStyle = sideGradL;
      c.beginPath();
      c.moveTo(cx - R * 1.06, headY - R * 0.15);
      c.bezierCurveTo(cx - R * 1.22, headY + R * 0.25, cx - R * 1.18, headY + R * 0.55, cx - R * 0.8, headY + R * 0.72);
      c.quadraticCurveTo(cx - R * 0.6, headY + R * 0.78, cx - R * 0.5, headY + R * 0.65);
      c.quadraticCurveTo(cx - R * 0.55, headY + R * 0.3, cx - R * 0.6, headY + R * 0.1);
      c.fill();
      // Right side panel
      c.fillStyle = sideGradR;
      c.beginPath();
      c.moveTo(cx + R * 1.06, headY - R * 0.15);
      c.bezierCurveTo(cx + R * 1.22, headY + R * 0.25, cx + R * 1.18, headY + R * 0.55, cx + R * 0.8, headY + R * 0.72);
      c.quadraticCurveTo(cx + R * 0.6, headY + R * 0.78, cx + R * 0.5, headY + R * 0.65);
      c.quadraticCurveTo(cx + R * 0.55, headY + R * 0.3, cx + R * 0.6, headY + R * 0.1);
      c.fill();
      c.fillStyle = hairGrad;
      // Soft bangs
      c.beginPath();
      c.moveTo(cx - R * 0.5, headY - R * 0.82);
      c.quadraticCurveTo(cx - R * 0.2, headY - R * 0.15, cx, headY - R * 0.2);
      c.quadraticCurveTo(cx + R * 0.2, headY - R * 0.15, cx + R * 0.5, headY - R * 0.82);
      c.fill();
      // Strand detail
      _hairStrands(c, cx, headY, R, color, [
        { x1: -0.7, y1: -0.1, cx1: -0.8, cy1: 0.3, x2: -0.65, y2: 0.6, dark: 12, a: 0.12 },
        { x1: -0.85, y1: 0.0, cx1: -0.9, cy1: 0.35, x2: -0.72, y2: 0.55, light: 15, a: 0.1 },
        { x1: 0.7, y1: -0.1, cx1: 0.8, cy1: 0.3, x2: 0.65, y2: 0.6, dark: 12, a: 0.12 },
        { x1: 0.85, y1: 0.0, cx1: 0.9, cy1: 0.35, x2: 0.72, y2: 0.55, light: 15, a: 0.1 },
      ]);
      // Inward curl tips
      c.save(); c.strokeStyle = dk; c.lineWidth = 0.6; c.globalAlpha = 0.15; c.lineCap = 'round';
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * R * 0.6, headY + R * 0.6);
        c.quadraticCurveTo(cx + s * R * 0.45, headY + R * 0.72, cx + s * R * 0.5, headY + R * 0.68);
        c.stroke();
      }
      c.restore();
      break;
    }
    case 'spiky': {
      // Base cap
      c.beginPath(); c.arc(cx, headY, R * 1.05, Math.PI, 0); c.fill();
      // Multi-layered spikes with gradient tips
      const spikes = [
        { x: -0.6, a: -2.5, len: 1.3 }, { x: -0.4, a: -2.2, len: 1.6 },
        { x: -0.15, a: -1.85, len: 1.8 }, { x: 0.05, a: -1.57, len: 1.9 },
        { x: 0.25, a: -1.3, len: 1.75 }, { x: 0.45, a: -0.95, len: 1.55 },
        { x: 0.65, a: -0.55, len: 1.25 }, { x: -0.75, a: -2.7, len: 1.0 },
      ];
      for (let layer = 0; layer < 2; layer++) {
        for (const sp of spikes) {
          const baseX = cx + sp.x * R + layer * 1;
          const baseY = headY - R * 0.5;
          const l = sp.len * (layer === 0 ? 0.85 : 1.0);
          const tipX = baseX + Math.cos(sp.a) * R * l;
          const tipY = baseY + Math.sin(sp.a) * R * l;
          c.fillStyle = layer === 0 ? dk : hairGrad;
          c.beginPath();
          c.moveTo(baseX - 3, baseY);
          c.quadraticCurveTo((baseX + tipX) / 2 - 1.5, (baseY + tipY) / 2, tipX, tipY);
          c.quadraticCurveTo((baseX + tipX) / 2 + 1.5, (baseY + tipY) / 2, baseX + 3, baseY);
          c.fill();
        }
      }
      // Highlight streaks on tips
      c.save(); c.strokeStyle = lt2; c.lineWidth = 0.5; c.globalAlpha = 0.18; c.lineCap = 'round';
      for (const sp of spikes.slice(1, 5)) {
        const baseX = cx + sp.x * R;
        const baseY2 = headY - R * 0.5;
        const tipX = baseX + Math.cos(sp.a) * R * sp.len;
        const tipY = baseY2 + Math.sin(sp.a) * R * sp.len;
        c.beginPath();
        c.moveTo((baseX + tipX) / 2, (baseY2 + tipY) / 2);
        c.lineTo(tipX, tipY);
        c.stroke();
      }
      c.restore();
      c.fillStyle = hairGrad;
      break;
    }
    case 'long_flowing': {
      // Hair cap
      c.beginPath(); c.arc(cx, headY, R * 1.1, Math.PI + 0.15, -0.15); c.fill();
      // Flowing side panels with layered depth
      for (let s = -1; s <= 1; s += 2) {
        // Back layer (darker, wider)
        c.fillStyle = dk;
        c.beginPath();
        c.moveTo(cx + s * R * 1.1, headY - R * 0.15);
        c.bezierCurveTo(cx + s * R * 1.35, headY + R * 0.8, cx + s * R * 1.15, headY + R * 1.9, cx + s * R * 0.75, headY + R * 2.9);
        c.quadraticCurveTo(cx + s * R * 0.55, headY + R * 3.0, cx + s * R * 0.45, headY + R * 2.7);
        c.bezierCurveTo(cx + s * R * 0.65, headY + R * 1.7, cx + s * R * 0.9, headY + R * 0.6, cx + s * R * 0.85, headY + R * 0.05);
        c.fill();
        // Front layer (main color)
        c.fillStyle = s === -1 ? sideGradL : sideGradR;
        c.beginPath();
        c.moveTo(cx + s * R * 1.08, headY - R * 0.2);
        c.bezierCurveTo(cx + s * R * 1.28, headY + R * 0.7, cx + s * R * 1.08, headY + R * 1.7, cx + s * R * 0.68, headY + R * 2.7);
        c.quadraticCurveTo(cx + s * R * 0.5, headY + R * 2.8, cx + s * R * 0.42, headY + R * 2.5);
        c.bezierCurveTo(cx + s * R * 0.58, headY + R * 1.5, cx + s * R * 0.82, headY + R * 0.5, cx + s * R * 0.78, headY + R * 0.05);
        c.fill();
      }
      c.fillStyle = hairGrad;
      // Bangs with strand separation
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * R * 0.05, headY - R * 0.88);
        c.quadraticCurveTo(cx + s * R * 0.15, headY - R * 0.25, cx + s * R * 0.38, headY + R * 0.02);
        c.quadraticCurveTo(cx + s * R * 0.28, headY - R * 0.3, cx + s * R * 0.52, headY - R * 0.88);
        c.fill();
      }
      // Flowing strand lines
      _hairStrands(c, cx, headY, R, color, [
        { x1: -0.9, y1: 0.0, cx1: -1.0, cy1: 0.8, cx2: -0.85, cy2: 1.6, x2: -0.6, y2: 2.4, light: 18, a: 0.1, w: 0.5 },
        { x1: -0.8, y1: -0.1, cx1: -0.95, cy1: 1.0, cx2: -0.75, cy2: 1.8, x2: -0.5, y2: 2.5, dark: 15, a: 0.08 },
        { x1: 0.9, y1: 0.0, cx1: 1.0, cy1: 0.8, cx2: 0.85, cy2: 1.6, x2: 0.6, y2: 2.4, light: 18, a: 0.1, w: 0.5 },
        { x1: 0.8, y1: -0.1, cx1: 0.95, cy1: 1.0, cx2: 0.75, cy2: 1.8, x2: 0.5, y2: 2.5, dark: 15, a: 0.08 },
      ]);
      break;
    }
    case 'braids': {
      c.beginPath(); c.arc(cx, headY, R * 1.08, Math.PI + 0.15, -0.15); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        const bx = cx + s * R * 0.7;
        const startY = headY + R * 0.15;
        // Braid outer shadow
        c.save(); c.fillStyle = dk2; c.globalAlpha = 0.12;
        for (let j = 0; j < 7; j++) {
          const by = startY + j * R * 0.33;
          const taper = 1 - j * 0.07;
          c.beginPath(); c.ellipse(bx + 1, by + 1, 4 * taper, 5.5 * taper, s * 0.2, 0, Math.PI * 2); c.fill();
        }
        c.restore();
        // Braid segments — alternating left/right weave
        for (let j = 0; j < 7; j++) {
          const by = startY + j * R * 0.33;
          const taper = 1 - j * 0.07;
          const xOff = s * 1.8 * ((j % 2) * 2 - 1);
          c.fillStyle = j % 2 === 0 ? hairGrad : dk;
          c.beginPath();
          c.ellipse(bx + xOff, by, 3.5 * taper, 5 * taper, s * 0.2, 0, Math.PI * 2);
          c.fill();
          // Highlight on each segment
          c.save(); c.fillStyle = lt; c.globalAlpha = 0.1;
          c.beginPath(); c.ellipse(bx + xOff - 0.5, by - 1, 1.5 * taper, 2 * taper, s * 0.2, 0, Math.PI * 2); c.fill();
          c.restore();
        }
        // Ribbon bow at end
        const endY = startY + 7 * R * 0.33;
        c.save(); c.fillStyle = '#e84393';
        c.beginPath();
        c.moveTo(bx, endY - 2);
        c.quadraticCurveTo(bx - 4, endY, bx - 3, endY + 4);
        c.quadraticCurveTo(bx, endY + 2, bx + 3, endY + 4);
        c.quadraticCurveTo(bx + 4, endY, bx, endY - 2);
        c.fill();
        c.fillStyle = _lighten('#e84393', 25); c.globalAlpha = 0.35;
        c.beginPath(); c.arc(bx - 1.5, endY + 0.5, 1.2, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      c.fillStyle = hairGrad;
      // Bangs
      c.beginPath();
      c.moveTo(cx - R * 0.35, headY - R * 0.82);
      c.quadraticCurveTo(cx - R * 0.1, headY - R * 0.1, cx, headY - R * 0.15);
      c.quadraticCurveTo(cx + R * 0.1, headY - R * 0.1, cx + R * 0.35, headY - R * 0.82);
      c.fill();
      break;
    }
    case 'mohawk': {
      // Shaved sides
      c.beginPath(); c.arc(cx, headY, R * 1.02, Math.PI + 0.7, -0.7); c.fill();
      // Buzz texture on sides
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.08;
      for (let i = 0; i < 20; i++) {
        const a = Math.PI + 0.7 + (i / 19) * (Math.PI - 1.4);
        const sr = R * 0.92;
        c.beginPath(); c.arc(cx + Math.cos(a) * sr, headY + Math.sin(a) * sr * 0.6 - R * 0.1, 0.6, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // Ridge spikes — two layers for depth
      const ridgeSpikes = [
        { x: -0.22, h: 1.5 }, { x: -0.1, h: 1.8 }, { x: 0.02, h: 1.95 },
        { x: 0.14, h: 1.85 }, { x: 0.26, h: 1.6 }, { x: 0.38, h: 1.2 },
      ];
      // Shadow layer
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.15;
      for (const sp of ridgeSpikes) {
        const bx = cx + sp.x * R + 1;
        c.beginPath();
        c.moveTo(bx - 3, headY - R * 0.55);
        c.quadraticCurveTo(bx, headY - R * sp.h + 3, bx + 0.5, headY - R * sp.h + 1);
        c.quadraticCurveTo(bx + 1, headY - R * sp.h + 3, bx + 3, headY - R * 0.55);
        c.fill();
      }
      c.restore();
      // Main spikes
      c.fillStyle = hairGrad;
      for (const sp of ridgeSpikes) {
        const bx = cx + sp.x * R;
        c.beginPath();
        c.moveTo(bx - 2.5, headY - R * 0.6);
        c.quadraticCurveTo(bx - 0.5, headY - R * sp.h + 2, bx, headY - R * sp.h);
        c.quadraticCurveTo(bx + 0.5, headY - R * sp.h + 2, bx + 2.5, headY - R * 0.6);
        c.fill();
      }
      // Highlight streaks on spike tips
      c.save(); c.strokeStyle = lt2; c.lineWidth = 0.5; c.globalAlpha = 0.2; c.lineCap = 'round';
      for (const sp of ridgeSpikes.slice(1, 4)) {
        const bx = cx + sp.x * R;
        c.beginPath();
        c.moveTo(bx, headY - R * sp.h);
        c.lineTo(bx, headY - R * (sp.h - 0.35));
        c.stroke();
      }
      c.restore();
      break;
    }
    case 'curly': {
      // Two-layer curls for depth
      const curls = [
        { a: Math.PI, r: 1.18, s: 0.34 }, { a: Math.PI * 0.8, r: 1.2, s: 0.32 },
        { a: Math.PI * 0.6, r: 1.22, s: 0.34 }, { a: Math.PI * 0.4, r: 1.2, s: 0.32 },
        { a: Math.PI * 0.2, r: 1.18, s: 0.34 }, { a: 0, r: 1.18, s: 0.32 },
        { a: Math.PI * 0.9, r: 1.12, s: 0.3, dy: 0.5 },
        { a: Math.PI * 0.1, r: 1.12, s: 0.3, dy: 0.5 },
        { a: Math.PI * 0.95, r: 1.02, s: 0.27, dy: 0.9 },
        { a: Math.PI * 0.05, r: 1.02, s: 0.27, dy: 0.9 },
        { a: Math.PI * 0.85, r: 1.0, s: 0.24, dy: 1.2 },
        { a: Math.PI * 0.15, r: 1.0, s: 0.24, dy: 1.2 },
      ];
      // Shadow layer
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.1;
      for (const curl of curls) {
        const dy = curl.dy || 0;
        const rx = cx + Math.cos(curl.a) * R * curl.r;
        const ry = headY + Math.sin(curl.a) * R * 0.55 - R * 0.15 + dy * R;
        c.beginPath(); c.arc(rx + 1, ry + 1, R * curl.s + 1, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // Main curls
      for (const curl of curls) {
        const dy = curl.dy || 0;
        const rx = cx + Math.cos(curl.a) * R * curl.r;
        const ry = headY + Math.sin(curl.a) * R * 0.55 - R * 0.15 + dy * R;
        c.fillStyle = hairGrad;
        c.beginPath(); c.arc(rx, ry, R * curl.s, 0, Math.PI * 2); c.fill();
        // Inner curl highlight
        c.save(); c.fillStyle = lt; c.globalAlpha = 0.12;
        c.beginPath(); c.arc(rx - R * 0.05, ry - R * 0.06, R * curl.s * 0.45, 0, Math.PI * 2); c.fill();
        c.restore();
        // Spiral line inside curl
        c.save(); c.strokeStyle = dk; c.lineWidth = 0.3; c.globalAlpha = 0.1;
        c.beginPath(); c.arc(rx, ry, R * curl.s * 0.6, 0.5, Math.PI * 1.5); c.stroke();
        c.restore();
      }
      break;
    }
    case 'bun': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.25, -0.25); c.fill();
      // Bun with multi-layer depth
      const bunY = headY - R * 1.05;
      // Shadow
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.12;
      c.beginPath(); c.arc(cx + 1.5, bunY + 2, R * 0.44, 0, Math.PI * 2); c.fill(); c.restore();
      // Main bun
      c.fillStyle = hairGrad;
      c.beginPath(); c.arc(cx, bunY, R * 0.44, 0, Math.PI * 2); c.fill();
      // Wrapped strand texture on bun
      c.save(); c.strokeStyle = dk; c.lineWidth = 0.5; c.globalAlpha = 0.12;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI * 0.5 + 0.3;
        c.beginPath();
        c.arc(cx, bunY, R * (0.25 + i * 0.05), a, a + Math.PI * 0.8);
        c.stroke();
      }
      c.restore();
      // Bun highlight
      c.save(); c.fillStyle = lt2; c.globalAlpha = 0.15;
      c.beginPath(); c.ellipse(cx - R * 0.08, bunY - R * 0.12, R * 0.18, R * 0.12, -0.3, 0, Math.PI * 2); c.fill();
      c.restore();
      // Chopstick / hair pin
      c.save();
      c.strokeStyle = '#f4d03f'; c.lineWidth = 1.2; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx - R * 0.45, bunY - R * 0.2);
      c.lineTo(cx + R * 0.45, bunY + R * 0.1);
      c.stroke();
      // Pin end ornament
      c.fillStyle = '#e74c3c';
      c.beginPath(); c.arc(cx - R * 0.45, bunY - R * 0.2, 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = _lighten('#e74c3c', 30); c.globalAlpha = 0.4;
      c.beginPath(); c.arc(cx - R * 0.46, bunY - R * 0.22, 0.8, 0, Math.PI * 2); c.fill();
      c.restore();
      // Side wisps
      c.fillStyle = hairGrad;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * R * 0.85, headY - R * 0.1);
        c.quadraticCurveTo(cx + s * R * 0.95, headY + R * 0.25, cx + s * R * 0.72, headY + R * 0.48);
        c.quadraticCurveTo(cx + s * R * 0.6, headY + R * 0.32, cx + s * R * 0.68, headY - R * 0.05);
        c.fill();
      }
      break;
    }
    case 'long_waves': {
      c.beginPath(); c.arc(cx, headY, R * 1.1, Math.PI + 0.12, -0.12); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        // Back wave layer (darker)
        c.fillStyle = dk;
        c.beginPath();
        c.moveTo(cx + s * R * 1.1, headY - R * 0.1);
        c.bezierCurveTo(cx + s * R * 1.3, headY + R * 0.55, cx + s * R * 1.0, headY + R * 1.25, cx + s * R * 1.2, headY + R * 1.85);
        c.bezierCurveTo(cx + s * R * 0.9, headY + R * 2.35, cx + s * R * 1.1, headY + R * 2.85, cx + s * R * 0.75, headY + R * 3.1);
        c.quadraticCurveTo(cx + s * R * 0.45, headY + R * 3.15, cx + s * R * 0.4, headY + R * 2.9);
        c.bezierCurveTo(cx + s * R * 0.6, headY + R * 2.25, cx + s * R * 0.75, headY + R * 1.55, cx + s * R * 0.85, headY + R * 0.15);
        c.fill();
        // Front wave layer
        c.fillStyle = s === -1 ? sideGradL : sideGradR;
        c.beginPath();
        c.moveTo(cx + s * R * 1.08, headY - R * 0.15);
        c.bezierCurveTo(cx + s * R * 1.25, headY + R * 0.5, cx + s * R * 0.95, headY + R * 1.2, cx + s * R * 1.15, headY + R * 1.8);
        c.bezierCurveTo(cx + s * R * 0.85, headY + R * 2.3, cx + s * R * 1.05, headY + R * 2.8, cx + s * R * 0.7, headY + R * 3.0);
        c.quadraticCurveTo(cx + s * R * 0.42, headY + R * 3.08, cx + s * R * 0.38, headY + R * 2.8);
        c.bezierCurveTo(cx + s * R * 0.55, headY + R * 2.2, cx + s * R * 0.7, headY + R * 1.5, cx + s * R * 0.8, headY + R * 0.1);
        c.fill();
      }
      c.fillStyle = hairGrad;
      c.beginPath(); c.moveTo(cx - R * 0.3, headY - R * 0.85);
      c.quadraticCurveTo(cx, headY - R * 0.15, cx + R * 0.3, headY - R * 0.85); c.fill();
      // Wave highlight lines
      _hairStrands(c, cx, headY, R, color, [
        { x1: -0.95, y1: 0.2, cx1: -0.8, cy1: 0.8, cx2: -1.0, cy2: 1.5, x2: -0.8, y2: 2.0, light: 22, a: 0.1, w: 0.5 },
        { x1: 0.95, y1: 0.2, cx1: 0.8, cy1: 0.8, cx2: 1.0, cy2: 1.5, x2: 0.8, y2: 2.0, light: 22, a: 0.1, w: 0.5 },
        { x1: -1.05, y1: 0.5, cx1: -0.85, cy1: 1.1, cx2: -1.05, cy2: 1.8, x2: -0.7, y2: 2.5, dark: 18, a: 0.08 },
        { x1: 1.05, y1: 0.5, cx1: 0.85, cy1: 1.1, cx2: 1.05, cy2: 1.8, x2: 0.7, y2: 2.5, dark: 18, a: 0.08 },
      ]);
      break;
    }
    case 'messy_bun': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.3, -0.3); c.fill();
      const mbY = headY - R * 1.1;
      // Shadow beneath bun
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.1;
      c.beginPath(); c.arc(cx + 2, mbY + 3, R * 0.5, 0, Math.PI * 2); c.fill(); c.restore();
      // Messy bun — overlapping lumps
      c.fillStyle = hairGrad;
      c.beginPath(); c.arc(cx + 1, mbY, R * 0.48, 0, Math.PI * 2); c.fill();
      c.fillStyle = dk;
      c.beginPath(); c.arc(cx - 3, mbY + 2, R * 0.32, 0, Math.PI * 2); c.fill();
      c.fillStyle = color;
      c.beginPath(); c.arc(cx + 4, mbY - 1, R * 0.28, 0, Math.PI * 2); c.fill();
      // Highlight on top lump
      c.save(); c.fillStyle = lt2; c.globalAlpha = 0.15;
      c.beginPath(); c.ellipse(cx, mbY - R * 0.12, R * 0.15, R * 0.1, -0.3, 0, Math.PI * 2); c.fill();
      c.restore();
      // Escaped strands (wispy)
      c.save(); c.strokeStyle = color; c.lineWidth = 0.6; c.globalAlpha = 0.25; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - R * 0.3, mbY + R * 0.3);
      c.quadraticCurveTo(cx - R * 0.5, mbY + R * 0.8, cx - R * 0.35, mbY + R * 1.0); c.stroke();
      c.beginPath(); c.moveTo(cx + R * 0.35, mbY + R * 0.25);
      c.quadraticCurveTo(cx + R * 0.55, mbY + R * 0.7, cx + R * 0.4, mbY + R * 0.95); c.stroke();
      c.restore();
      // Side wisps
      c.fillStyle = hairGrad;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * R * 0.8, headY - R * 0.15);
        c.quadraticCurveTo(cx + s * R * 0.95, headY + R * 0.3, cx + s * R * 0.7, headY + R * 0.55);
        c.quadraticCurveTo(cx + s * R * 0.6, headY + R * 0.35, cx + s * R * 0.65, headY - R * 0.05);
        c.fill();
      }
      break;
    }
    case 'space_buns': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.2, -0.2); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        const bunX = cx + s * R * 0.7;
        const bunY2 = headY - R * 0.88;
        // Bun shadow
        c.save(); c.fillStyle = dk2; c.globalAlpha = 0.1;
        c.beginPath(); c.arc(bunX + 1.5, bunY2 + 2, R * 0.4, 0, Math.PI * 2); c.fill(); c.restore();
        // Main bun
        c.fillStyle = hairGrad;
        c.beginPath(); c.arc(bunX, bunY2, R * 0.4, 0, Math.PI * 2); c.fill();
        // Wrap texture
        c.save(); c.strokeStyle = dk; c.lineWidth = 0.4; c.globalAlpha = 0.1;
        for (let i = 0; i < 3; i++) {
          c.beginPath(); c.arc(bunX, bunY2, R * (0.2 + i * 0.06), 0.5 + i * 0.4, 0.5 + i * 0.4 + Math.PI); c.stroke();
        }
        c.restore();
        // Highlight
        c.save(); c.fillStyle = lt2; c.globalAlpha = 0.15;
        c.beginPath(); c.ellipse(bunX - R * 0.06, bunY2 - R * 0.1, R * 0.12, R * 0.08, -0.3, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      c.fillStyle = hairGrad;
      // Center part bangs
      c.beginPath(); c.moveTo(cx - R * 0.38, headY - R * 0.84);
      c.quadraticCurveTo(cx - R * 0.15, headY - R * 0.15, cx, headY - R * 0.18);
      c.quadraticCurveTo(cx + R * 0.15, headY - R * 0.15, cx + R * 0.38, headY - R * 0.84);
      c.fill();
      break;
    }
    case 'pixie': {
      c.beginPath(); c.arc(cx, headY, R * 1.04, Math.PI + 0.5, -0.3); c.fill();
      // Dramatic side-swept piece
      c.fillStyle = hairGrad;
      c.beginPath();
      c.moveTo(cx + R * 0.2, headY - R * 0.92);
      c.bezierCurveTo(cx + R * 0.85, headY - R * 1.0, cx + R * 1.05, headY - R * 0.35, cx + R * 0.78, headY + R * 0.18);
      c.quadraticCurveTo(cx + R * 0.62, headY + R * 0.12, cx + R * 0.55, headY - R * 0.08);
      c.fill();
      // Left tuck
      c.fillStyle = dk;
      c.beginPath();
      c.moveTo(cx - R * 0.6, headY - R * 0.55);
      c.quadraticCurveTo(cx - R * 0.88, headY + R * 0.08, cx - R * 0.62, headY + R * 0.28);
      c.quadraticCurveTo(cx - R * 0.52, headY + R * 0.18, cx - R * 0.52, headY - R * 0.18);
      c.fill();
      // Strand detail on swept piece
      _hairStrands(c, cx, headY, R, color, [
        { x1: 0.35, y1: -0.85, cx1: 0.7, cy1: -0.6, x2: 0.65, y2: 0.0, light: 20, a: 0.12, w: 0.5 },
        { x1: 0.45, y1: -0.8, cx1: 0.8, cy1: -0.5, x2: 0.7, y2: -0.05, dark: 15, a: 0.1 },
      ]);
      break;
    }
    case 'side_braid': {
      c.beginPath(); c.arc(cx, headY, R * 1.08, Math.PI + 0.15, -0.15); c.fill();
      const sbx = cx + R * 0.85;
      const sbStartY = headY + R * 0.05;
      // Braid shadow
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.1;
      for (let j = 0; j < 9; j++) {
        const by = sbStartY + j * R * 0.3;
        const taper = 1 - j * 0.05;
        c.beginPath(); c.ellipse(sbx + 1.5, by + 1, 4.5 * taper, 5.5 * taper, 0.2, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // Braid segments
      for (let j = 0; j < 9; j++) {
        const by = sbStartY + j * R * 0.3;
        const taper = 1 - j * 0.05;
        const xOff = 2.0 * ((j % 2) * 2 - 1);
        c.fillStyle = j % 2 === 0 ? hairGrad : dk;
        c.beginPath(); c.ellipse(sbx + xOff, by, 4 * taper, 5.5 * taper, 0.2, 0, Math.PI * 2); c.fill();
        c.save(); c.fillStyle = lt; c.globalAlpha = 0.08;
        c.beginPath(); c.ellipse(sbx + xOff - 0.5, by - 1, 1.5 * taper, 2 * taper, 0.2, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      // End ribbon
      const sbEndY = sbStartY + 9 * R * 0.3;
      c.save(); c.fillStyle = '#e84393';
      c.beginPath(); c.arc(sbx, sbEndY, 2.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = _lighten('#e84393', 25); c.globalAlpha = 0.3;
      c.beginPath(); c.arc(sbx - 0.5, sbEndY - 0.5, 1, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = hairGrad;
      // Swept bangs
      c.beginPath();
      c.moveTo(cx - R * 0.35, headY - R * 0.84);
      c.quadraticCurveTo(cx + R * 0.1, headY - R * 0.15, cx + R * 0.55, headY - R * 0.35);
      c.quadraticCurveTo(cx + R * 0.3, headY - R * 0.5, cx - R * 0.1, headY - R * 0.78);
      c.fill();
      break;
    }
    case 'layered_bob': {
      c.beginPath(); c.arc(cx, headY, R * 1.08, Math.PI + 0.15, -0.15); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        // Layer 1 back (darker, longer)
        c.fillStyle = dk;
        c.beginPath();
        c.moveTo(cx + s * R * 1.08, headY - R * 0.08);
        c.bezierCurveTo(cx + s * R * 1.22, headY + R * 0.28, cx + s * R * 1.18, headY + R * 0.58, cx + s * R * 0.88, headY + R * 0.75);
        c.quadraticCurveTo(cx + s * R * 0.62, headY + R * 0.7, cx + s * R * 0.62, headY + R * 0.25);
        c.fill();
        // Layer 2 front (main color, shorter)
        c.fillStyle = s === -1 ? sideGradL : sideGradR;
        c.beginPath();
        c.moveTo(cx + s * R * 0.98, headY - R * 0.18);
        c.bezierCurveTo(cx + s * R * 1.08, headY + R * 0.12, cx + s * R * 1.02, headY + R * 0.38, cx + s * R * 0.72, headY + R * 0.5);
        c.quadraticCurveTo(cx + s * R * 0.56, headY + R * 0.45, cx + s * R * 0.58, headY + R * 0.08);
        c.fill();
      }
      c.fillStyle = hairGrad;
      c.beginPath(); c.moveTo(cx - R * 0.38, headY - R * 0.82);
      c.quadraticCurveTo(cx, headY - R * 0.12, cx + R * 0.38, headY - R * 0.82); c.fill();
      // Layer-tip strand lines
      _hairStrands(c, cx, headY, R, color, [
        { x1: -0.75, y1: 0.4, cx1: -0.7, cy1: 0.55, x2: -0.6, y2: 0.65, light: 15, a: 0.12 },
        { x1: 0.75, y1: 0.4, cx1: 0.7, cy1: 0.55, x2: 0.6, y2: 0.65, light: 15, a: 0.12 },
      ]);
      break;
    }
    case 'sleek_ponytail': {
      c.beginPath(); c.arc(cx, headY, R * 1.05, Math.PI + 0.1, -0.1); c.fill();
      // Smooth pulled-back surface
      c.beginPath();
      c.moveTo(cx - R * 0.42, headY - R * 0.92);
      c.quadraticCurveTo(cx, headY - R * 0.42, cx + R * 0.42, headY - R * 0.92);
      c.fill();
      // Sleek ponytail body (two layers)
      c.fillStyle = dk;
      c.beginPath();
      c.moveTo(cx + R * 0.02, headY - R * 0.82);
      c.bezierCurveTo(cx + R * 0.85, headY - R * 0.92, cx + R * 1.55, headY - R * 0.15, cx + R * 0.95, headY + R * 1.55);
      c.bezierCurveTo(cx + R * 0.75, headY + R * 2.25, cx + R * 0.45, headY + R * 2.55, cx + R * 0.35, headY + R * 2.35);
      c.bezierCurveTo(cx + R * 0.55, headY + R * 1.85, cx + R * 0.65, headY + R * 0.85, cx + R * 0.22, headY - R * 0.48);
      c.fill();
      c.fillStyle = hairGrad;
      c.beginPath();
      c.moveTo(cx, headY - R * 0.85);
      c.bezierCurveTo(cx + R * 0.8, headY - R * 0.9, cx + R * 1.5, headY - R * 0.2, cx + R * 0.9, headY + R * 1.5);
      c.bezierCurveTo(cx + R * 0.7, headY + R * 2.2, cx + R * 0.4, headY + R * 2.5, cx + R * 0.3, headY + R * 2.3);
      c.bezierCurveTo(cx + R * 0.5, headY + R * 1.8, cx + R * 0.6, headY + R * 0.8, cx + R * 0.2, headY - R * 0.5);
      c.fill();
      // Strand lines along ponytail
      _hairStrands(c, cx, headY, R, color, [
        { x1: 0.35, y1: -0.6, cx1: 0.9, cy1: 0.2, cx2: 0.7, cy2: 1.2, x2: 0.5, y2: 2.0, light: 18, a: 0.1, w: 0.5 },
        { x1: 0.25, y1: -0.7, cx1: 0.7, cy1: 0.0, cx2: 0.6, cy2: 1.0, x2: 0.4, y2: 1.8, dark: 15, a: 0.08 },
      ]);
      // Hair tie
      c.save(); c.fillStyle = '#e84393';
      c.beginPath(); c.ellipse(cx + R * 0.15, headY - R * 0.76, 3.5, 2.5, 0.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = _lighten('#e84393', 20); c.globalAlpha = 0.35;
      c.beginPath(); c.ellipse(cx + R * 0.13, headY - R * 0.78, 1.5, 1, 0.5, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = hairGrad;
      break;
    }
    case 'curly_afro': {
      const afroR = R * 1.5;
      // Shadow layer
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.08;
      c.beginPath(); c.arc(cx + 2, headY - R * 0.15, afroR * 0.72, 0, Math.PI * 2); c.fill();
      c.restore();
      // Outer curl ring
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const ccx2 = cx + Math.cos(a) * afroR * 0.62;
        const ccy = headY - R * 0.2 + Math.sin(a) * afroR * 0.56;
        c.fillStyle = i % 3 === 0 ? dk : hairGrad;
        c.beginPath(); c.arc(ccx2, ccy, R * 0.4, 0, Math.PI * 2); c.fill();
        // Curl highlight
        c.save(); c.fillStyle = lt; c.globalAlpha = 0.1;
        c.beginPath(); c.arc(ccx2 - R * 0.06, ccy - R * 0.08, R * 0.15, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      // Inner fill
      c.fillStyle = hairGrad;
      c.beginPath(); c.arc(cx, headY - R * 0.2, afroR * 0.68, 0, Math.PI * 2); c.fill();
      // Pick highlight
      c.save(); c.fillStyle = lt2; c.globalAlpha = 0.1;
      c.beginPath(); c.ellipse(cx - R * 0.3, headY - R * 0.6, R * 0.35, R * 0.15, -0.3, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'twin_tails': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.2, -0.2); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        const tx = cx + s * R * 0.65;
        // Tail shadow
        c.save(); c.fillStyle = dk2; c.globalAlpha = 0.08;
        c.beginPath();
        c.moveTo(tx + 1.5, headY - R * 0.25);
        c.bezierCurveTo(tx + s * R * 0.52, headY + R * 0.35, tx + s * R * 0.32, headY + R * 1.25, tx + s * R * 0.52, headY + R * 2.25);
        c.lineTo(tx + s * R * 0.18, headY + R * 2.15);
        c.bezierCurveTo(tx + s * R * 0.18, headY + R * 1.05, tx + s * R * 0.32, headY + R * 0.25, tx + 1.5, headY - R * 0.25);
        c.fill(); c.restore();
        // Flowing tail (two-tone)
        c.fillStyle = dk;
        c.beginPath();
        c.moveTo(tx, headY - R * 0.28);
        c.bezierCurveTo(tx + s * R * 0.52, headY + R * 0.32, tx + s * R * 0.32, headY + R * 1.22, tx + s * R * 0.52, headY + R * 2.22);
        c.quadraticCurveTo(tx + s * R * 0.32, headY + R * 2.42, tx + s * R * 0.17, headY + R * 2.12);
        c.bezierCurveTo(tx + s * R * 0.17, headY + R * 1.02, tx + s * R * 0.32, headY + R * 0.22, tx, headY - R * 0.28);
        c.fill();
        c.fillStyle = hairGrad;
        c.beginPath();
        c.moveTo(tx, headY - R * 0.3);
        c.bezierCurveTo(tx + s * R * 0.5, headY + R * 0.3, tx + s * R * 0.3, headY + R * 1.2, tx + s * R * 0.5, headY + R * 2.2);
        c.quadraticCurveTo(tx + s * R * 0.3, headY + R * 2.4, tx + s * R * 0.15, headY + R * 2.1);
        c.bezierCurveTo(tx + s * R * 0.15, headY + R * 1.0, tx + s * R * 0.3, headY + R * 0.2, tx, headY - R * 0.3);
        c.fill();
        // Hair tie
        c.save(); c.fillStyle = '#e84393';
        c.beginPath(); c.ellipse(tx, headY - R * 0.3, 3.5, 2.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = _lighten('#e84393', 20); c.globalAlpha = 0.35;
        c.beginPath(); c.ellipse(tx - 0.5, headY - R * 0.32, 1.5, 1.0, 0, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      c.fillStyle = hairGrad;
      c.beginPath(); c.moveTo(cx - R * 0.3, headY - R * 0.82);
      c.quadraticCurveTo(cx, headY - R * 0.1, cx + R * 0.3, headY - R * 0.82); c.fill();
      break;
    }
    case 'short_wavy': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.25, -0.25); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        const waves = [0.0, 0.18, 0.36];
        for (let wi = 0; wi < waves.length; wi++) {
          const wy = waves[wi];
          c.fillStyle = wi === 1 ? dk : hairGrad;
          c.beginPath();
          c.moveTo(cx + s * R * 0.92, headY - R * 0.18 + wy * R);
          c.quadraticCurveTo(cx + s * R * 1.12, headY + R * (wy + 0.08), cx + s * R * 0.88, headY + R * (wy + 0.24));
          c.quadraticCurveTo(cx + s * R * 0.72, headY + R * (wy + 0.14), cx + s * R * 0.76, headY - R * 0.08 + wy * R);
          c.fill();
        }
      }
      c.fillStyle = hairGrad;
      // Wavy strand highlights
      _hairStrands(c, cx, headY, R, color, [
        { x1: -0.85, y1: -0.1, cx1: -0.95, cy1: 0.1, x2: -0.82, y2: 0.3, light: 20, a: 0.12, w: 0.5 },
        { x1: 0.85, y1: -0.1, cx1: 0.95, cy1: 0.1, x2: 0.82, y2: 0.3, light: 20, a: 0.12, w: 0.5 },
      ]);
      break;
    }
    case 'hime_cut': {
      c.beginPath(); c.arc(cx, headY, R * 1.08, Math.PI + 0.1, -0.1); c.fill();
      // Blunt straight bangs with strand separations
      c.beginPath();
      c.moveTo(cx - R * 0.85, headY - R * 0.38);
      c.lineTo(cx - R * 0.85, headY + R * 0.12);
      c.quadraticCurveTo(cx, headY + R * 0.16, cx + R * 0.85, headY + R * 0.12);
      c.lineTo(cx + R * 0.85, headY - R * 0.38);
      c.fill();
      // Bang strand lines
      c.save(); c.strokeStyle = dk; c.lineWidth = 0.3; c.globalAlpha = 0.1;
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.moveTo(cx + i * R * 0.2, headY - R * 0.35);
        c.lineTo(cx + i * R * 0.2, headY + R * 0.1);
        c.stroke();
      }
      c.restore();
      // Long side panels (two-tone)
      for (let s = -1; s <= 1; s += 2) {
        c.fillStyle = dk;
        c.beginPath();
        c.moveTo(cx + s * R * 1.08, headY - R * 0.08);
        c.bezierCurveTo(cx + s * R * 1.18, headY + R * 1.0, cx + s * R * 1.12, headY + R * 2.0, cx + s * R * 0.78, headY + R * 2.85);
        c.quadraticCurveTo(cx + s * R * 0.58, headY + R * 2.95, cx + s * R * 0.52, headY + R * 2.55);
        c.bezierCurveTo(cx + s * R * 0.68, headY + R * 1.85, cx + s * R * 0.82, headY + R * 0.85, cx + s * R * 0.88, headY + R * 0.08);
        c.fill();
        c.fillStyle = s === -1 ? sideGradL : sideGradR;
        c.beginPath();
        c.moveTo(cx + s * R * 1.06, headY - R * 0.1);
        c.bezierCurveTo(cx + s * R * 1.15, headY + R * 1.0, cx + s * R * 1.1, headY + R * 2.0, cx + s * R * 0.75, headY + R * 2.8);
        c.quadraticCurveTo(cx + s * R * 0.55, headY + R * 2.9, cx + s * R * 0.5, headY + R * 2.5);
        c.bezierCurveTo(cx + s * R * 0.65, headY + R * 1.8, cx + s * R * 0.8, headY + R * 0.8, cx + s * R * 0.85, headY + R * 0.05);
        c.fill();
      }
      c.fillStyle = hairGrad;
      // Strand detail on long panels
      _hairStrands(c, cx, headY, R, color, [
        { x1: -0.95, y1: 0.3, cx1: -0.9, cy1: 1.2, x2: -0.7, y2: 2.2, light: 18, a: 0.1, w: 0.5 },
        { x1: 0.95, y1: 0.3, cx1: 0.9, cy1: 1.2, x2: 0.7, y2: 2.2, light: 18, a: 0.1, w: 0.5 },
      ]);
      break;
    }
    case 'shag': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.3, -0.3); c.fill();
      // Layered shaggy pieces — two layers
      for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < 14; i++) {
          const a = Math.PI + 0.3 + (i / 13) * (Math.PI - 0.6);
          const sx = cx + Math.cos(a) * R * (1.05 - layer * 0.05);
          const sy = headY + Math.sin(a) * R * (0.6 - layer * 0.1);
          const len = R * (0.35 + Math.sin(i * 2.3) * 0.15 + layer * 0.15);
          c.fillStyle = layer === 0 ? dk : hairGrad;
          c.beginPath();
          c.moveTo(sx, sy);
          c.quadraticCurveTo(sx + Math.cos(a + 0.3) * len * 0.6, sy + len * 0.7, sx + Math.cos(a + 0.5) * 2.5, sy + len);
          c.quadraticCurveTo(sx + Math.cos(a - 0.3) * len * 0.4, sy + len * 0.5, sx, sy);
          c.fill();
        }
      }
      // Tip highlights
      c.save(); c.fillStyle = lt; c.globalAlpha = 0.08;
      for (let i = 2; i < 12; i += 3) {
        const a = Math.PI + 0.3 + (i / 13) * (Math.PI - 0.6);
        const sx = cx + Math.cos(a) * R * 1.0;
        const sy = headY + Math.sin(a) * R * 0.5;
        const len = R * (0.45 + Math.sin(i * 2.3) * 0.15);
        c.beginPath(); c.arc(sx + Math.cos(a + 0.5) * 2, sy + len, 1.5, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      c.fillStyle = hairGrad;
      break;
    }
    case 'french_twist': {
      c.beginPath(); c.arc(cx, headY, R * 1.04, Math.PI + 0.2, -0.2); c.fill();
      // Elegant twist at back with volume
      c.fillStyle = dk;
      c.beginPath();
      c.moveTo(cx + R * 0.02, headY - R * 0.88);
      c.quadraticCurveTo(cx + R * 0.35, headY - R * 0.58, cx + R * 0.2, headY - R * 0.18);
      c.quadraticCurveTo(cx + R * 0.3, headY + R * 0.12, cx + R * 0.15, headY + R * 0.35);
      c.quadraticCurveTo(cx - R * 0.12, headY + R * 0.12, cx - R * 0.07, headY - R * 0.48);
      c.fill();
      c.fillStyle = hairGrad;
      c.beginPath();
      c.moveTo(cx, headY - R * 0.9);
      c.quadraticCurveTo(cx + R * 0.3, headY - R * 0.6, cx + R * 0.15, headY - R * 0.2);
      c.quadraticCurveTo(cx + R * 0.25, headY + R * 0.1, cx + R * 0.1, headY + R * 0.3);
      c.quadraticCurveTo(cx - R * 0.1, headY + R * 0.1, cx - R * 0.05, headY - R * 0.5);
      c.fill();
      // Twist spiral lines
      c.save(); c.strokeStyle = dk; c.lineWidth = 0.4; c.globalAlpha = 0.12;
      for (let i = 0; i < 3; i++) {
        const ty = headY - R * 0.6 + i * R * 0.3;
        c.beginPath();
        c.moveTo(cx - R * 0.05, ty);
        c.quadraticCurveTo(cx + R * 0.2, ty + R * 0.05, cx + R * 0.1, ty + R * 0.15);
        c.stroke();
      }
      c.restore();
      // Decorative pin
      c.save(); c.fillStyle = '#c0c0c0';
      c.beginPath(); c.arc(cx + R * 0.08, headY - R * 0.3, 1.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.globalAlpha = 0.4;
      c.beginPath(); c.arc(cx + R * 0.06, headY - R * 0.32, 0.6, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'low_bun': {
      c.beginPath(); c.arc(cx, headY, R * 1.05, Math.PI + 0.2, -0.2); c.fill();
      // Low bun shadow
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.1;
      c.beginPath(); c.arc(cx + 1.5, headY + R * 0.65, R * 0.38, 0, Math.PI * 2); c.fill(); c.restore();
      // Low bun at nape
      c.fillStyle = hairGrad;
      c.beginPath(); c.arc(cx, headY + R * 0.6, R * 0.37, 0, Math.PI * 2); c.fill();
      // Bun wrap texture
      c.save(); c.strokeStyle = dk; c.lineWidth = 0.4; c.globalAlpha = 0.1;
      c.beginPath(); c.arc(cx, headY + R * 0.6, R * 0.2, 0.3, Math.PI + 0.3); c.stroke();
      c.beginPath(); c.arc(cx, headY + R * 0.6, R * 0.28, 0.8, Math.PI + 0.8); c.stroke();
      c.restore();
      // Bun highlight
      c.save(); c.fillStyle = lt2; c.globalAlpha = 0.12;
      c.beginPath(); c.ellipse(cx - R * 0.05, headY + R * 0.54, R * 0.12, R * 0.08, -0.3, 0, Math.PI * 2); c.fill();
      c.restore();
      // Side wisps
      c.fillStyle = hairGrad;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * R * 0.9, headY - R * 0.15);
        c.quadraticCurveTo(cx + s * R * 0.88, headY + R * 0.28, cx + s * R * 0.52, headY + R * 0.52);
        c.quadraticCurveTo(cx + s * R * 0.62, headY + R * 0.18, cx + s * R * 0.76, headY - R * 0.08);
        c.fill();
      }
      break;
    }
    case 'bangs_straight': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.15, -0.15); c.fill();
      // Shoulder-length side panels (two-tone)
      for (let s = -1; s <= 1; s += 2) {
        c.fillStyle = dk;
        c.beginPath();
        c.moveTo(cx + s * R * 1.06, headY - R * 0.08);
        c.quadraticCurveTo(cx + s * R * 1.12, headY + R * 0.52, cx + s * R * 0.88, headY + R * 1.25);
        c.quadraticCurveTo(cx + s * R * 0.58, headY + R * 1.15, cx + s * R * 0.68, headY + R * 0.25);
        c.fill();
        c.fillStyle = s === -1 ? sideGradL : sideGradR;
        c.beginPath();
        c.moveTo(cx + s * R * 1.04, headY - R * 0.1);
        c.quadraticCurveTo(cx + s * R * 1.1, headY + R * 0.5, cx + s * R * 0.85, headY + R * 1.2);
        c.quadraticCurveTo(cx + s * R * 0.55, headY + R * 1.1, cx + s * R * 0.65, headY + R * 0.2);
        c.fill();
      }
      c.fillStyle = hairGrad;
      // Straight bangs with strand gaps
      c.beginPath();
      c.moveTo(cx - R * 0.82, headY - R * 0.95);
      c.lineTo(cx - R * 0.82, headY - R * 0.55);
      c.quadraticCurveTo(cx, headY - R * 0.5, cx + R * 0.82, headY - R * 0.55);
      c.lineTo(cx + R * 0.82, headY - R * 0.95);
      c.fill();
      // Strand separations
      c.save(); c.strokeStyle = dk; c.lineWidth = 0.3; c.globalAlpha = 0.12;
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.moveTo(cx + i * R * 0.2, headY - R * 0.92);
        c.lineTo(cx + i * R * 0.2 + 0.3, headY - R * 0.55);
        c.stroke();
      }
      c.restore();
      break;
    }
    case 'wolf_cut': {
      c.beginPath(); c.arc(cx, headY, R * 1.08, Math.PI + 0.15, -0.15); c.fill();
      // Two-layer choppy pieces
      for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < 18; i++) {
          const a = Math.PI + 0.15 + (i / 17) * (Math.PI - 0.3);
          const sx = cx + Math.cos(a) * R * (1.06 - layer * 0.04);
          const sy = headY + Math.sin(a) * R * (0.5 - layer * 0.08);
          const len = R * (0.45 + (i > 4 && i < 14 ? 0.55 : 0.25) + Math.sin(i * 1.7) * 0.12 + layer * 0.1);
          c.fillStyle = layer === 0 ? dk : hairGrad;
          c.beginPath();
          c.moveTo(sx, sy);
          c.quadraticCurveTo(sx + Math.cos(a) * len * 0.4, sy + len * 0.6, sx + Math.cos(a + 0.2) * 3.5, sy + len);
          c.quadraticCurveTo(sx - Math.cos(a) * len * 0.2, sy + len * 0.4, sx, sy);
          c.fill();
        }
      }
      // Wispy bangs
      c.fillStyle = hairGrad;
      c.save(); c.strokeStyle = lt; c.lineWidth = 0.4; c.globalAlpha = 0.1; c.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const bx = cx + (i - 2) * R * 0.25;
        c.beginPath();
        c.moveTo(bx, headY - R * 0.9);
        c.quadraticCurveTo(bx + 1, headY - R * 0.6, bx + 0.5, headY - R * 0.45);
        c.stroke();
      }
      c.restore();
      break;
    }
    case 'curtain_bangs': {
      c.beginPath(); c.arc(cx, headY, R * 1.05, Math.PI + 0.15, -0.15); c.fill();
      // Shoulder-length panels (two-tone)
      for (let s = -1; s <= 1; s += 2) {
        c.fillStyle = dk;
        c.beginPath();
        c.moveTo(cx + s * R * 1.05, headY - R * 0.08);
        c.quadraticCurveTo(cx + s * R * 1.1, headY + R * 0.62, cx + s * R * 0.82, headY + R * 1.45);
        c.quadraticCurveTo(cx + s * R * 0.52, headY + R * 1.35, cx + s * R * 0.62, headY + R * 0.25);
        c.fill();
        c.fillStyle = s === -1 ? sideGradL : sideGradR;
        c.beginPath();
        c.moveTo(cx + s * R * 1.03, headY - R * 0.1);
        c.quadraticCurveTo(cx + s * R * 1.08, headY + R * 0.6, cx + s * R * 0.8, headY + R * 1.4);
        c.quadraticCurveTo(cx + s * R * 0.5, headY + R * 1.3, cx + s * R * 0.6, headY + R * 0.2);
        c.fill();
      }
      c.fillStyle = hairGrad;
      // Curtain bangs with strand separation
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx, headY - R * 0.95);
        c.quadraticCurveTo(cx + s * R * 0.3, headY - R * 0.68, cx + s * R * 0.68, headY - R * 0.48);
        c.quadraticCurveTo(cx + s * R * 0.52, headY - R * 0.62, cx, headY - R * 0.85);
        c.fill();
        // Inner wispy strand
        c.save(); c.fillStyle = dk; c.globalAlpha = 0.15;
        c.beginPath();
        c.moveTo(cx + s * R * 0.05, headY - R * 0.9);
        c.quadraticCurveTo(cx + s * R * 0.2, headY - R * 0.65, cx + s * R * 0.45, headY - R * 0.55);
        c.quadraticCurveTo(cx + s * R * 0.3, headY - R * 0.7, cx + s * R * 0.05, headY - R * 0.85);
        c.fill(); c.restore();
      }
      break;
    }
    case 'buzz_cut': {
      c.beginPath(); c.arc(cx, headY, R * 1.02, Math.PI + 0.3, -0.3); c.fill();
      // Gradient fade effect
      c.save();
      const buzzGrad = c.createRadialGradient(cx, headY - R * 0.3, R * 0.2, cx, headY - R * 0.1, R * 1.0);
      buzzGrad.addColorStop(0, color);
      buzzGrad.addColorStop(0.6, dk);
      buzzGrad.addColorStop(1, dk2);
      c.fillStyle = buzzGrad;
      c.beginPath(); c.arc(cx, headY, R * 1.01, Math.PI + 0.35, -0.35); c.fill();
      c.restore();
      // Dense stipple texture
      for (let layer = 0; layer < 2; layer++) {
        c.fillStyle = layer === 0 ? dk2 : lt;
        c.globalAlpha = layer === 0 ? 0.08 : 0.04;
        for (let i = 0; i < 50; i++) {
          const a = Math.PI + 0.3 + (i / 49) * (Math.PI - 0.6);
          const r2 = R * (0.75 + Math.sin(i * 3.7 + layer * 1.5) * 0.15);
          c.beginPath(); c.arc(cx + Math.cos(a) * r2, headY + Math.sin(a) * r2 * 0.65 - R * 0.15, 0.5 + layer * 0.2, 0, Math.PI * 2); c.fill();
        }
      }
      c.globalAlpha = 1;
      c.fillStyle = hairGrad;
      break;
    }
    case 'fishtail': {
      c.beginPath(); c.arc(cx, headY, R * 1.05, Math.PI + 0.2, -0.2); c.fill();
      // Side fishtail braid — shadow
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.08;
      c.beginPath();
      c.moveTo(cx + R * 0.72, headY + R * 0.12);
      for (let seg = 0; seg < 9; seg++) {
        const by = headY + R * 0.22 + seg * R * 0.33;
        const bx2 = cx + R * 0.62 + Math.sin(seg * 0.8) * 3.5;
        c.quadraticCurveTo(bx2 + 4, by, bx2 + 1, by + R * 0.15);
      }
      c.quadraticCurveTo(cx + R * 0.57, headY + R * 3.25, cx + R * 0.52, headY + R * 3.35);
      c.quadraticCurveTo(cx + R * 0.42, headY + R * 3.15, cx + R * 0.47, headY + R * 0.35);
      c.fill(); c.restore();
      // Main fishtail
      c.fillStyle = hairGrad;
      c.beginPath();
      c.moveTo(cx + R * 0.7, headY + R * 0.1);
      for (let seg = 0; seg < 9; seg++) {
        const by = headY + R * 0.2 + seg * R * 0.33;
        const bx2 = cx + R * 0.6 + Math.sin(seg * 0.8) * 3;
        c.quadraticCurveTo(bx2 + 3, by, bx2, by + R * 0.15);
      }
      c.quadraticCurveTo(cx + R * 0.55, headY + R * 3.2, cx + R * 0.5, headY + R * 3.3);
      c.quadraticCurveTo(cx + R * 0.4, headY + R * 3.1, cx + R * 0.45, headY + R * 0.3);
      c.fill();
      // Cross-weave lines (alternating light/dark)
      c.save(); c.lineWidth = 0.4; c.lineCap = 'round';
      for (let seg = 0; seg < 8; seg++) {
        const by = headY + R * 0.38 + seg * R * 0.33;
        c.strokeStyle = seg % 2 === 0 ? dk : lt;
        c.globalAlpha = 0.15;
        c.beginPath(); c.moveTo(cx + R * 0.45, by); c.lineTo(cx + R * 0.67, by + R * 0.14); c.stroke();
      }
      c.restore();
      break;
    }
    case 'crown_braid': {
      c.beginPath(); c.arc(cx, headY, R * 1.04, Math.PI + 0.2, -0.2); c.fill();
      // Braid crown — shadow
      c.save(); c.strokeStyle = dk2; c.lineWidth = R * 0.24; c.globalAlpha = 0.1;
      c.beginPath(); c.arc(cx + 1, headY - R * 0.08, R * 0.86, Math.PI + 0.5, -0.5); c.stroke();
      c.restore();
      // Braid crown
      c.strokeStyle = color; c.lineWidth = R * 0.2;
      c.beginPath(); c.arc(cx, headY - R * 0.1, R * 0.85, Math.PI + 0.5, -0.5); c.stroke();
      // Highlight on crown
      c.save(); c.strokeStyle = lt; c.lineWidth = R * 0.06; c.globalAlpha = 0.15;
      c.beginPath(); c.arc(cx, headY - R * 0.1, R * 0.85, Math.PI + 0.8, -0.2); c.stroke();
      c.restore();
      // Cross-hatch braid texture
      c.save(); c.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const a = Math.PI + 0.5 + (i / 15) * (Math.PI - 1);
        const rx = cx + Math.cos(a) * R * 0.85;
        const ry = headY - R * 0.1 + Math.sin(a) * R * 0.85;
        c.strokeStyle = i % 2 === 0 ? dk : lt;
        c.lineWidth = 0.4;
        c.globalAlpha = 0.15;
        c.beginPath(); c.moveTo(rx, ry - 2.5); c.lineTo(rx + 2.5, ry + 2.5); c.stroke();
      }
      c.restore();
      break;
    }
    case 'high_pony': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.2, -0.2); c.fill();
      // High ponytail — shadow
      c.save(); c.fillStyle = dk2; c.globalAlpha = 0.1;
      c.beginPath();
      c.moveTo(cx - R * 0.18, headY - R * 0.92);
      c.quadraticCurveTo(cx + R * 0.32, headY - R * 1.28, cx + R * 0.52, headY - R * 0.78);
      c.bezierCurveTo(cx + R * 0.72, headY - R * 0.28, cx + R * 0.52, headY + R * 0.52, cx + R * 0.37, headY + R * 1.52);
      c.quadraticCurveTo(cx + R * 0.22, headY + R * 1.42, cx + R * 0.27, headY + R * 0.32);
      c.bezierCurveTo(cx + R * 0.37, headY - R * 0.18, cx + R * 0.32, headY - R * 0.68, cx + R * 0.22, headY - R * 0.83);
      c.fill(); c.restore();
      // Main ponytail
      c.fillStyle = hairGrad;
      c.beginPath();
      c.moveTo(cx - R * 0.2, headY - R * 0.95);
      c.quadraticCurveTo(cx + R * 0.3, headY - R * 1.3, cx + R * 0.5, headY - R * 0.8);
      c.bezierCurveTo(cx + R * 0.7, headY - R * 0.3, cx + R * 0.5, headY + R * 0.5, cx + R * 0.35, headY + R * 1.5);
      c.quadraticCurveTo(cx + R * 0.2, headY + R * 1.4, cx + R * 0.25, headY + R * 0.3);
      c.bezierCurveTo(cx + R * 0.35, headY - R * 0.2, cx + R * 0.3, headY - R * 0.7, cx + R * 0.2, headY - R * 0.85);
      c.fill();
      // Strand lines
      _hairStrands(c, cx, headY, R, color, [
        { x1: 0.25, y1: -0.8, cx1: 0.45, cy1: -0.2, cx2: 0.4, cy2: 0.5, x2: 0.3, y2: 1.2, light: 18, a: 0.1, w: 0.5 },
        { x1: 0.15, y1: -0.85, cx1: 0.35, cy1: -0.1, cx2: 0.35, cy2: 0.6, x2: 0.28, y2: 1.0, dark: 15, a: 0.08 },
      ]);
      // Hair tie
      c.save(); c.fillStyle = dk2;
      c.beginPath(); c.ellipse(cx + R * 0.15, headY - R * 0.95, R * 0.14, R * 0.09, 0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = dk; c.globalAlpha = 0.5;
      c.beginPath(); c.ellipse(cx + R * 0.13, headY - R * 0.97, R * 0.06, R * 0.04, 0.3, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = hairGrad;
      break;
    }
    case 'locs': {
      c.beginPath(); c.arc(cx, headY, R * 1.06, Math.PI + 0.2, -0.2); c.fill();
      // Individual locs — with shadow and texture
      for (let i = 0; i < 16; i++) {
        const a = Math.PI + 0.22 + (i / 15) * (Math.PI - 0.44);
        const sx = cx + Math.cos(a) * R * 1.04;
        const sy = headY + Math.sin(a) * R * 0.48;
        const len = R * (0.95 + Math.sin(i * 2.1) * 0.25);
        const sway = Math.sin(i * 1.3) * 2;
        // Shadow
        c.save(); c.fillStyle = dk2; c.globalAlpha = 0.06;
        c.beginPath();
        c.moveTo(sx - 1.3, sy + 1);
        c.quadraticCurveTo(sx - 1.5 + sway, sy + len * 0.5 + 1, sx - 0.8 + sway, sy + len + 1);
        c.lineTo(sx + 1.8 + sway, sy + len + 1);
        c.quadraticCurveTo(sx + 2.5 + sway, sy + len * 0.5 + 1, sx + 2, sy + 1);
        c.fill(); c.restore();
        // Main loc
        c.fillStyle = i % 3 === 0 ? dk : hairGrad;
        c.beginPath();
        c.moveTo(sx - 1.5, sy);
        c.quadraticCurveTo(sx - 2 + sway, sy + len * 0.5, sx - 1 + sway, sy + len);
        c.lineTo(sx + 1 + sway, sy + len);
        c.quadraticCurveTo(sx + 2 + sway, sy + len * 0.5, sx + 1.5, sy);
        c.fill();
        // Texture bands
        c.save(); c.strokeStyle = dk; c.lineWidth = 0.3; c.globalAlpha = 0.1;
        for (let b = 0; b < 3; b++) {
          const by = sy + len * (0.25 + b * 0.25);
          const bsway = sway * (0.25 + b * 0.25);
          c.beginPath(); c.moveTo(sx - 1.2 + bsway, by); c.lineTo(sx + 1.2 + bsway, by); c.stroke();
        }
        c.restore();
      }
      c.fillStyle = hairGrad;
      break;
    }
  }
  _animeHairShadow(c, cx, headY, R, color);
  _hairInnerGlow(c, cx, headY, R, color);
  _animeHairShine(c, cx, headY, R);
}

const HAIR_STYLES = ['ponytail','bob','spiky','long_flowing','braids','mohawk','curly','bun',
  'long_waves','messy_bun','space_buns','pixie','side_braid','layered_bob','sleek_ponytail','curly_afro',
  'twin_tails','short_wavy','hime_cut','shag',
  'french_twist','low_bun','bangs_straight','wolf_cut','curtain_bangs',
  'buzz_cut','fishtail','crown_braid','high_pony','locs'];
const HAIR_NAMES = ['Ponytail','Bob','Spiky','Long Flowing','Braids','Mohawk','Curly','Bun',
  'Long Waves','Messy Bun','Space Buns','Pixie Cut','Side Braid','Layered Bob','Sleek Ponytail','Curly Afro',
  'Twin Tails','Short Wavy','Hime Cut','Shag',
  'French Twist','Low Bun','Straight Bangs','Wolf Cut','Curtain Bangs',
  'Buzz Cut','Fishtail Braid','Crown Braid','High Ponytail','Locs'];
HAIR_STYLES.forEach((s, i) => {
  defItem('hair_' + s, HAIR_NAMES[i], 'hair',
    [s, 'hair', s === 'mohawk' ? 'punk' : s === 'braids' ? 'elegant' : 'casual'],
    HAIR_COLORS,
    (c, char, x, y, w, h, colIdx) => {
      hairDraw(s, c, char, x, y, w, h, HAIR_COLORS[colIdx % HAIR_COLORS.length][0]);
    });
});

/* ── Tops ── */
const TOP_DEFS = [
  { id:'tshirt',     name:'T-Shirt',      tags:['casual','simple'],     colors:[['#e74c3c'],['#3498db'],['#2ecc71'],['#f39c12']] },
  { id:'hoodie',     name:'Hoodie',       tags:['casual','cozy','warm'],colors:[['#7f8c8d'],['#2c3e50'],['#8e44ad'],['#e74c3c']] },
  { id:'tank_top',   name:'Tank Top',     tags:['casual','summer'],     colors:[['#fff'],['#f1c40f'],['#e84393'],['#1abc9c']] },
  { id:'dress_shirt',name:'Dress Shirt',  tags:['formal','elegant'],    colors:[['#fff'],['#d5e8f0'],['#f5e6cc'],['#2c3e50']] },
  { id:'crop_top',   name:'Crop Top',     tags:['casual','summer'],     colors:[['#e84393'],['#fff'],['#f39c12'],['#9b59b6']] },
  { id:'jacket',     name:'Jacket',       tags:['casual','cool'],       colors:[['#2c3e50'],['#8b4513'],['#c0392b'],['#1a5276']] },
  { id:'armor',      name:'Armor Plate',  tags:['medieval','warrior'],  colors:[['#95a5a6'],['#f4d03f'],['#7f8c8d'],['#d4a017']] },
  { id:'wizard_robe',name:'Wizard Robe',  tags:['magic','fantasy'],     colors:[['#6c3483'],['#1a5276'],['#7d3c98'],['#145a32']] },
  { id:'kimono',     name:'Kimono',       tags:['elegant','formal'],    colors:[['#e74c3c'],['#2e86c1'],['#f8c471'],['#27ae60']] },
  { id:'vest',       name:'Vest',         tags:['formal','casual'],     colors:[['#5d6d7e'],['#7b241c'],['#1e8449'],['#6c3483']] },
  { id:'sweater',    name:'Sweater',      tags:['cozy','warm','winter'],colors:[['#e8daef'],['#f5b7b1'],['#a9cce3'],['#abebc6']] },
  { id:'corset',     name:'Corset',       tags:['elegant','fancy'],     colors:[['#2c3e50'],['#922b21'],['#7d3c98'],['#b7950b']] },
  { id:'cardigan',   name:'Cardigan',     tags:['cozy','casual','warm'],colors:[['#c9a96e'],['#e8d5b7'],['#8fbc8f'],['#c9b1d8']] },
  { id:'blazer',     name:'Blazer',       tags:['formal','elegant'],    colors:[['#1a1a2e'],['#2c3e50'],['#5d3a1a'],['#7b241c']] },
  { id:'leather_jacket', name:'Leather Jacket', tags:['cool','punk'],   colors:[['#1a1a1a'],['#3d1f0a'],['#8b0000'],['#2c3e50']] },
  { id:'graphic_tee',name:'Graphic Tee',  tags:['casual','cool'],       colors:[['#2c3e50'],['#e74c3c'],['#8e44ad'],['#f39c12']] },
  { id:'off_shoulder',name:'Off-Shoulder', tags:['elegant','summer'],    colors:[['#fff'],['#f8b4c8'],['#a8d8ea'],['#f5cba7']] },
  { id:'turtleneck', name:'Turtleneck',   tags:['cozy','winter','warm'],colors:[['#2c3e50'],['#c0392b'],['#f5e6cc'],['#1e8449']] },
  { id:'puffer_vest',name:'Puffer Vest',  tags:['casual','winter'],     colors:[['#2c3e50'],['#c0392b'],['#f4d03f'],['#27ae60']] },
  { id:'tube_top',   name:'Tube Top',     tags:['summer','casual'],     colors:[['#e84393'],['#fff'],['#f1c40f'],['#1abc9c']] },
  { id:'peasant_blouse', name:'Peasant Blouse', tags:['casual','natural'], colors:[['#fff'],['#f5e6cc'],['#a8d8ea'],['#f8b4c8']] },
  { id:'halter_top', name:'Halter Top',   tags:['summer','elegant'],    colors:[['#e74c3c'],['#2c3e50'],['#e84393'],['#1abc9c']] },
  { id:'varsity',    name:'Varsity Jacket', tags:['sporty','casual'],   colors:[['#c0392b'],['#2e86c1'],['#27ae60'],['#f39c12']] },
  { id:'wrap_top',   name:'Wrap Top',     tags:['elegant','casual'],    colors:[['#c9a0dc'],['#a8d8ea'],['#f8b4c8'],['#c8e6c9']] },
  { id:'denim_jacket', name:'Denim Jacket', tags:['casual','cool'],     colors:[['#4a6a8a'],['#2e4057'],['#87ceeb'],['#2c2c2c']] },
  { id:'polo',         name:'Polo Shirt',   tags:['casual','smart'],      colors:[['#1e8449'],['#2e86c1'],['#fff'],['#c0392b']] },
  { id:'bodysuit',     name:'Bodysuit',     tags:['elegant','cool'],      colors:[['#2c3e50'],['#e84393'],['#1abc9c'],['#c0392b']] },
  { id:'flannel',      name:'Flannel Shirt',tags:['casual','cozy'],       colors:[['#c0392b'],['#2e86c1'],['#27ae60'],['#f39c12']] },
  { id:'sports_bra',   name:'Sports Bra',   tags:['sporty','summer'],     colors:[['#2c3e50'],['#e84393'],['#1abc9c'],['#c0392b']] },
  { id:'cape_top',     name:'Cape Top',     tags:['elegant','cool'],      colors:[['#8e44ad'],['#c0392b'],['#2c3e50'],['#1abc9c']] },
  { id:'lace_top',     name:'Lace Top',     tags:['elegant','fancy'],     colors:[['#fff'],['#f8b4c8'],['#2c3e50'],['#d4a5e5']] },
  { id:'military',     name:'Military Jacket',tags:['cool','formal'],     colors:[['#556b2f'],['#2c3e50'],['#8b7355'],['#4a4a4a']] },
  { id:'henley',       name:'Henley',       tags:['casual','simple'],     colors:[['#7f8c8d'],['#c0392b'],['#2c3e50'],['#f5e6cc']] },
  { id:'ruffle_blouse',name:'Ruffle Blouse',tags:['elegant','cute'],      colors:[['#fff'],['#f8b4c8'],['#a8d8ea'],['#f5cba7']] },
  { id:'bomber',       name:'Bomber Jacket',tags:['cool','casual'],       colors:[['#556b2f'],['#2c3e50'],['#8b0000'],['#f39c12']] },
  { id:'poncho',       name:'Poncho',       tags:['casual','cozy'],       colors:[['#e67e22'],['#c0392b'],['#27ae60'],['#8e44ad']] },
  { id:'corset_top',   name:'Corset Top',   tags:['elegant','fancy'],     colors:[['#2c3e50'],['#c0392b'],['#8e44ad'],['#f4d03f']] },
  { id:'mesh_top',     name:'Mesh Top',     tags:['cool','punk','edgy'],  colors:[['#2c3e50'],['#e84393'],['#1abc9c'],['#8e44ad']] },
  { id:'sailor_top',   name:'Sailor Top',   tags:['casual','cute'],       colors:[['#fff'],['#2e86c1'],['#c0392b'],['#2c3e50']] },
];

function drawTop(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY, bodyTop, waistY, bodyBot, bodyW } = M(x, y, w, h);
  const tG = c.createLinearGradient(cx - bodyW, bodyTop, cx + bodyW, bodyBot);
  tG.addColorStop(0, _lighten(color, 20));
  tG.addColorStop(1, _darken(color, 15));
  c.fillStyle = tG;
  const midY = (bodyTop + bodyBot) / 2;

  switch(style) {
    case 'tshirt': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 3, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.7, waistY - 2, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY + 2,
                      cx - bodyW - 2, waistY + (bodyBot - waistY) * 0.5, cx - bodyW - 1, bodyBot);
      c.lineTo(cx + bodyW + 1, bodyBot);
      c.bezierCurveTo(cx + bodyW + 2, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.7, waistY + 2, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY - 2,
                      cx + bodyW + 3, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW + 2, bodyTop + 4);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 6), bodyTop + 10, 6, 5, s * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.6;
      c.beginPath(); c.arc(cx, bodyTop + 2, 4, 0.3, Math.PI - 0.3); c.stroke();
      c.save(); c.globalAlpha = 0.1; c.fillStyle = _darken(color, 40);
      c.beginPath(); c.ellipse(cx, bodyTop + 8, bodyW * 0.6, 3, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      // Side seams
      _stitchLine(c, cx - bodyW, bodyTop + 8, cx - bodyW * 0.6, bodyBot, color);
      _stitchLine(c, cx + bodyW, bodyTop + 8, cx + bodyW * 0.6, bodyBot, color);
      // Waist wrinkle
      _fabricFolds(c, cx - bodyW * 0.5, bodyBot - 6, cx + bodyW * 0.5, bodyBot - 6, 2, color);
      // Hem stitch
      _stitchLine(c, cx - bodyW, bodyBot - 1, cx + bodyW, bodyBot - 1, color);
      break;
    }
    case 'hoodie': {
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 3);
      c.bezierCurveTo(cx - bodyW - 5, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.8, waistY, cx - bodyW * 0.7, waistY);
      c.bezierCurveTo(cx - bodyW * 0.8, waistY,
                      cx - bodyW - 4, waistY + (bodyBot - waistY) * 0.5, cx - bodyW - 3, bodyBot + 2);
      c.lineTo(cx + bodyW + 3, bodyBot + 2);
      c.bezierCurveTo(cx + bodyW + 4, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.8, waistY, cx + bodyW * 0.7, waistY);
      c.bezierCurveTo(cx + bodyW * 0.8, waistY,
                      cx + bodyW + 5, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW + 4, bodyTop + 3);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 8), bodyTop + 12, 8, 6, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      c.beginPath(); c.arc(cx, bodyTop, 8, Math.PI, 0); c.fill();
      c.strokeStyle = _darken(color, 25); c.lineWidth = 0.6;
      c.beginPath(); c.arc(cx, bodyTop, 8, Math.PI, 0); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      // Drawstrings
      c.save(); c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5; c.globalAlpha = 0.5;
      c.beginPath(); c.moveTo(cx - 2, bodyTop + 2); c.quadraticCurveTo(cx - 3, bodyTop + 10, cx - 2, bodyTop + 14); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, bodyTop + 2); c.quadraticCurveTo(cx + 3, bodyTop + 10, cx + 2, bodyTop + 14); c.stroke();
      c.restore();
      // Kangaroo pocket
      _pocketDetail(c, cx - 5, bodyBot - 14, 10, 7, color);
      // Ribbed cuffs at hem
      _stitchLine(c, cx - bodyW - 1, bodyBot, cx + bodyW + 1, bodyBot, color);
      _stitchLine(c, cx - bodyW - 1, bodyBot - 2, cx + bodyW + 1, bodyBot - 2, color);
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.ellipse(cx, bodyBot - 10, 6, 3, 0, 0, Math.PI * 2); c.stroke();
      break;
    }
    case 'tank_top': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY,
                      cx - bodyW, waistY + (bodyBot - waistY) * 0.5, cx - bodyW + 1, bodyBot);
      c.lineTo(cx + bodyW - 1, bodyBot);
      c.bezierCurveTo(cx + bodyW, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.65, waistY, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY,
                      cx + bodyW, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW - 1, bodyTop + 4);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.arc(cx + s * 2, bodyTop + 1, 3, 0.2 * s + Math.PI * 0.5, 0.2 * s + Math.PI * 1.5);
        c.stroke();
      }
      _stitchLine(c, cx - bodyW + 1, bodyBot - 1, cx + bodyW - 1, bodyBot - 1, color);
      break;
    }
    case 'dress_shirt': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 3);
      c.bezierCurveTo(cx - bodyW - 3, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.7, waistY - 2, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY + 2,
                      cx - bodyW - 2, waistY + (bodyBot - waistY) * 0.5, cx - bodyW - 1, bodyBot);
      c.lineTo(cx + bodyW + 1, bodyBot);
      c.bezierCurveTo(cx + bodyW + 2, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.7, waistY + 2, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY - 2,
                      cx + bodyW + 3, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW + 2, bodyTop + 3);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 7), bodyTop + 12, 7, 5, s * 0.2, 0, Math.PI * 2);
        c.fill();
      }
      // Pointed collar
      _collarDetail(c, cx, bodyTop, bodyW, color, 'pointed');
      // Button row
      _buttonRow(c, cx, bodyTop + 12, bodyBot - 4, 5, color);
      // Placket line
      _stitchLine(c, cx - 2, bodyTop + 8, cx - 2, bodyBot - 2, color);
      _stitchLine(c, cx + 2, bodyTop + 8, cx + 2, bodyBot - 2, color);
      // Breast pocket
      _pocketDetail(c, cx - bodyW * 0.55, bodyTop + 12, 5, 4, color);
      // Cuff detail
      for (let s = -1; s <= 1; s += 2) {
        _stitchLine(c, cx + s * (bodyW + 3), bodyTop + 15, cx + s * (bodyW + 9), bodyTop + 15, color);
      }
      break;
    }
    case 'crop_top': {
      const cropBot = waistY - 4;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 2, (bodyTop + cropBot) / 2, cx - bodyW + 2, cropBot + 2);
      c.quadraticCurveTo(cx, cropBot + 4, cx + bodyW - 2, cropBot + 2);
      c.quadraticCurveTo(cx + bodyW + 2, (bodyTop + cropBot) / 2, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, cropBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, cropBot - bodyTop);
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5;
      c.beginPath(); c.arc(cx, bodyTop + 2, 4, 0.4, Math.PI - 0.4); c.stroke();
      _stitchLine(c, cx - bodyW + 2, cropBot + 1, cx + bodyW - 2, cropBot + 1, color);
      break;
    }
    case 'jacket': {
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 5, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.8, waistY, cx - bodyW * 0.7, waistY);
      c.bezierCurveTo(cx - bodyW * 0.8, waistY,
                      cx - bodyW - 4, waistY + (bodyBot - waistY) * 0.5, cx - bodyW - 3, bodyBot + 1);
      c.lineTo(cx + bodyW + 3, bodyBot + 1);
      c.bezierCurveTo(cx + bodyW + 4, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.8, waistY, cx + bodyW * 0.7, waistY);
      c.bezierCurveTo(cx + bodyW * 0.8, waistY,
                      cx + bodyW + 5, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW + 4, bodyTop + 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 8), bodyTop + 12, 8, 6, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      // Zipper line
      c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx, bodyTop + 4);
      c.quadraticCurveTo(cx + 0.5, midY, cx, bodyBot);
      c.stroke();
      // Zipper teeth
      c.save(); c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.25; c.globalAlpha = 0.4;
      for (let zy = bodyTop + 6; zy < bodyBot - 2; zy += 2) {
        c.beginPath(); c.moveTo(cx - 1, zy); c.lineTo(cx + 1, zy); c.stroke();
      }
      c.restore();
      // Collar
      _collarDetail(c, cx, bodyTop, bodyW, color, 'stand');
      // Pocket flaps
      for (let s = -1; s <= 1; s += 2) {
        _pocketDetail(c, cx + s * bodyW * 0.3 - 3, bodyBot - 14, 6, 5, color);
      }
      // Shoulder seams
      _stitchLine(c, cx - bodyW, bodyTop + 4, cx - bodyW - 6, bodyTop + 10, color);
      _stitchLine(c, cx + bodyW, bodyTop + 4, cx + bodyW + 6, bodyTop + 10, color);
      c.save(); c.globalAlpha = 0.08; c.fillStyle = _darken(color, 40);
      c.beginPath(); c.ellipse(cx, bodyTop + 8, bodyW * 0.5, 4, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'armor': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 3);
      c.quadraticCurveTo(cx - bodyW - 4, midY, cx - bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 4, midY, cx + bodyW + 2, bodyTop + 3);
      c.closePath(); c.fill();
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 4), bodyTop + 6, 7, 5, s * 0.3, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = _darken(color, 25); c.lineWidth = 0.6;
        c.beginPath(); c.ellipse(cx + s * (bodyW + 4), bodyTop + 6, 7, 5, s * 0.3, 0, Math.PI * 2); c.stroke();
      }
      // Plate segments
      c.strokeStyle = _darken(color, 25); c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - bodyW, waistY);
      c.quadraticCurveTo(cx, waistY + 2, cx + bodyW, waistY); c.stroke();
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx - bodyW + 1, bodyTop + 12);
      c.quadraticCurveTo(cx, bodyTop + 14, cx + bodyW - 1, bodyTop + 12); c.stroke();
      // Center chest plate line
      c.beginPath(); c.moveTo(cx, bodyTop + 5); c.lineTo(cx, waistY - 2); c.stroke();
      // Rivets
      c.save(); c.fillStyle = _darken(color, 35);
      const rivetPos = [[cx - bodyW + 2, bodyTop + 6], [cx + bodyW - 2, bodyTop + 6],
                        [cx - bodyW + 2, waistY + 2], [cx + bodyW - 2, waistY + 2],
                        [cx - bodyW + 2, bodyBot - 4], [cx + bodyW - 2, bodyBot - 4]];
      rivetPos.forEach(([rx, ry]) => { c.beginPath(); c.arc(rx, ry, 0.8, 0, Math.PI * 2); c.fill(); });
      c.restore();
      // Edge highlight
      c.save(); c.strokeStyle = _lighten(color, 25); c.lineWidth = 0.4; c.globalAlpha = 0.2;
      c.beginPath(); c.moveTo(cx - bodyW - 1, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 3, midY, cx - bodyW - 1, bodyBot - 2); c.stroke();
      c.restore();
      break;
    }
    case 'wizard_robe': {
      const robeBot = y + h * 0.82;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 12, (bodyTop + robeBot) / 2, cx - bodyW - 6, robeBot);
      c.quadraticCurveTo(cx, robeBot + 4, cx + bodyW + 6, robeBot);
      c.quadraticCurveTo(cx + bodyW + 12, (bodyTop + robeBot) / 2, cx + bodyW + 4, bodyTop + 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW + 4, robeBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW + 4, robeBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 10), bodyTop + 14, 9, 6, s * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      // Stars and embroidery
      c.fillStyle = 'rgba(255,215,0,0.35)'; c.font = '5px sans-serif';
      c.fillText('\u2605', cx - 4, bodyBot - 6);
      c.fillText('\u2605', cx + 3, midY + 2);
      c.fillText('\u2605', cx - 6, midY + 12);
      // Trim along hem
      c.save(); c.strokeStyle = 'rgba(255,215,0,0.25)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx - bodyW - 4, robeBot - 2);
      c.quadraticCurveTo(cx, robeBot + 2, cx + bodyW + 4, robeBot - 2); c.stroke();
      c.restore();
      // Hood drape fold lines
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.15;
      c.beginPath(); c.moveTo(cx - 3, bodyTop + 1);
      c.quadraticCurveTo(cx - 4, bodyTop + 8, cx - 2, bodyTop + 14); c.stroke();
      c.beginPath(); c.moveTo(cx + 3, bodyTop + 1);
      c.quadraticCurveTo(cx + 4, bodyTop + 8, cx + 2, bodyTop + 14); c.stroke();
      c.restore();
      // Robe drape folds
      _fabricFolds(c, cx - bodyW * 0.3, waistY, cx - bodyW * 0.3, robeBot - 4, 3, color);
      _fabricFolds(c, cx + bodyW * 0.3, waistY, cx + bodyW * 0.3, robeBot - 4, 3, color);
      break;
    }
    case 'kimono': {
      const kimBot = y + h * 0.76;
      c.beginPath();
      c.moveTo(cx - bodyW - 5, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 10, (bodyTop + kimBot) / 2, cx - bodyW - 3, kimBot);
      c.quadraticCurveTo(cx, kimBot + 3, cx + bodyW + 3, kimBot);
      c.quadraticCurveTo(cx + bodyW + 10, (bodyTop + kimBot) / 2, cx + bodyW + 5, bodyTop + 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW + 5, kimBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW + 5, kimBot - bodyTop);
      // Pattern details - subtle waves
      c.save(); c.strokeStyle = _lighten(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.12;
      for (let py = bodyTop + 8; py < kimBot - 6; py += 8) {
        c.beginPath(); c.moveTo(cx - bodyW - 2, py);
        c.quadraticCurveTo(cx, py + 3, cx + bodyW + 2, py); c.stroke();
      }
      c.restore();
      // Obi with bow detail
      c.fillStyle = _darken(color, 30);
      const obiY = waistY - 2;
      c.beginPath();
      c.moveTo(cx - bodyW - 3, obiY);
      c.quadraticCurveTo(cx, obiY + 3, cx + bodyW + 3, obiY);
      c.quadraticCurveTo(cx + bodyW + 3, obiY + 6, cx + bodyW + 2, obiY + 6);
      c.quadraticCurveTo(cx, obiY + 9, cx - bodyW - 2, obiY + 6);
      c.quadraticCurveTo(cx - bodyW - 3, obiY + 6, cx - bodyW - 3, obiY);
      c.closePath(); c.fill();
      // Obi bow at back
      c.save(); c.fillStyle = _darken(color, 25); c.globalAlpha = 0.6;
      c.beginPath(); c.ellipse(cx, obiY + 3, 4, 2.5, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      // V-neckline crossover
      c.save(); c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5; c.globalAlpha = 0.4;
      c.beginPath(); c.moveTo(cx - 4, bodyTop + 3);
      c.lineTo(cx + 2, obiY - 1); c.stroke();
      c.beginPath(); c.moveTo(cx + 4, bodyTop + 3);
      c.lineTo(cx - 2, obiY - 1); c.stroke();
      c.restore();
      break;
    }
    case 'vest': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY,
                      cx - bodyW, waistY + (bodyBot - waistY) * 0.5, cx - bodyW + 1, bodyBot - 1);
      c.lineTo(cx + bodyW - 1, bodyBot - 1);
      c.bezierCurveTo(cx + bodyW, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY,
                      cx + bodyW, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW - 1, bodyTop + 4);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      // Front opening
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyTop + 5);
      c.quadraticCurveTo(cx + 0.3, midY, cx, bodyBot - 3); c.stroke();
      // Lapel detail
      for (let s = -1; s <= 1; s += 2) {
        c.save(); c.fillStyle = _darken(color, 10); c.globalAlpha = 0.3;
        c.beginPath(); c.moveTo(cx + s * 1, bodyTop + 5);
        c.lineTo(cx + s * 5, bodyTop + 6); c.lineTo(cx + s * 4, bodyTop + 12);
        c.lineTo(cx + s * 1, bodyTop + 9); c.closePath(); c.fill(); c.restore();
      }
      // Breast pocket
      _pocketDetail(c, cx - bodyW * 0.45, bodyTop + 12, 4, 3.5, color);
      // Button
      _drawButton(c, cx, midY, 1, color);
      break;
    }
    case 'sweater': {
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 4, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.75, waistY, cx - bodyW * 0.65, waistY);
      c.bezierCurveTo(cx - bodyW * 0.75, waistY,
                      cx - bodyW - 3, waistY + (bodyBot - waistY) * 0.5, cx - bodyW - 2, bodyBot + 1);
      c.lineTo(cx + bodyW + 2, bodyBot + 1);
      c.bezierCurveTo(cx + bodyW + 3, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.75, waistY, cx + bodyW * 0.65, waistY);
      c.bezierCurveTo(cx + bodyW * 0.75, waistY,
                      cx + bodyW + 4, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW + 3, bodyTop + 2);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 7), bodyTop + 12, 7, 6, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = _darken(color, 12);
      c.beginPath(); c.ellipse(cx, bodyTop + 1, 5, 2.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = tG;
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      // Knit texture
      _fabricTexture(c, cx - bodyW + 2, bodyTop + 4, bodyW * 2 - 4, bodyBot - bodyTop - 6, 'knit', color);
      // Ribbed edges at cuffs and hem
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let i = 0; i < 3; i++) {
        const hy = bodyBot - 1 - i * 1.5;
        c.beginPath(); c.moveTo(cx - bodyW + 1, hy);
        c.quadraticCurveTo(cx, hy + 0.5, cx + bodyW - 1, hy); c.stroke();
      }
      c.restore();
      break;
    }
    case 'corset': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 6);
      c.bezierCurveTo(cx - bodyW, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.6, waistY, cx - bodyW * 0.5, waistY);
      c.bezierCurveTo(cx - bodyW * 0.6, waistY,
                      cx - bodyW, waistY + (bodyBot - waistY) * 0.5, cx - bodyW, bodyBot - 3);
      c.lineTo(cx + bodyW, bodyBot - 3);
      c.bezierCurveTo(cx + bodyW, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.6, waistY, cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.6, waistY,
                      cx + bodyW, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW - 1, bodyTop + 6);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.4;
      const laceSpacing = (bodyBot - bodyTop - 12) / 5;
      for (let i = 0; i < 5; i++) {
        const ly = bodyTop + 10 + i * laceSpacing;
        c.beginPath(); c.moveTo(cx - 1.5, ly); c.quadraticCurveTo(cx - 4, ly + 1.5, cx - 6, ly + 2); c.stroke();
        c.beginPath(); c.moveTo(cx + 1.5, ly); c.quadraticCurveTo(cx + 4, ly + 1.5, cx + 6, ly + 2); c.stroke();
      }
      break;
    }
    case 'cardigan': {
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 4, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.65, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 3, midY + (bodyBot - midY) * 0.6, cx - bodyW - 2, bodyBot + 3);
      c.lineTo(cx + bodyW + 2, bodyBot + 3);
      c.bezierCurveTo(cx + bodyW + 3, midY + (bodyBot - midY) * 0.6, cx + bodyW * 0.7, waistY, cx + bodyW * 0.65, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 4, midY, cx + bodyW + 3, bodyTop + 2);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 7), bodyTop + 12, 7, 5.5, s * 0.2, 0, Math.PI * 2); c.fill();
      }
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx, bodyTop + 5); c.quadraticCurveTo(cx + 0.5, midY, cx, bodyBot + 2); c.stroke();
      _drawButton(c, cx, bodyTop + 14, 1.2, color);
      _drawButton(c, cx, midY, 1.2, color);
      _drawButton(c, cx, bodyBot - 5, 1.2, color);
      break;
    }
    case 'blazer': {
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 5, midY, cx - bodyW * 0.75, waistY, cx - bodyW * 0.65, waistY);
      c.bezierCurveTo(cx - bodyW * 0.75, waistY, cx - bodyW - 4, midY + (bodyBot - midY) * 0.5, cx - bodyW - 3, bodyBot + 1);
      c.lineTo(cx + bodyW + 3, bodyBot + 1);
      c.bezierCurveTo(cx + bodyW + 4, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.75, waistY, cx + bodyW * 0.65, waistY);
      c.bezierCurveTo(cx + bodyW * 0.75, waistY, cx + bodyW + 5, midY, cx + bodyW + 4, bodyTop + 2);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 8), bodyTop + 12, 8, 6, s * 0.25, 0, Math.PI * 2); c.fill();
      }
      // Lapels
      for (let s = -1; s <= 1; s += 2) {
        c.fillStyle = _darken(color, 12);
        c.beginPath();
        c.moveTo(cx + s * 1, bodyTop + 3);
        c.quadraticCurveTo(cx + s * 7, bodyTop + 4, cx + s * 6, bodyTop + 14);
        c.quadraticCurveTo(cx + s * 4, bodyTop + 12, cx + s * 1, bodyTop + 8);
        c.closePath(); c.fill();
      }
      c.fillStyle = tG;
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _drawButton(c, cx, midY + 2, 1.3, color);
      _drawSeam(c, cx - bodyW, bodyTop + 8, cx - bodyW, bodyBot, color);
      _drawSeam(c, cx + bodyW, bodyTop + 8, cx + bodyW, bodyBot, color);
      break;
    }
    case 'leather_jacket': {
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 5, midY, cx - bodyW * 0.8, waistY, cx - bodyW * 0.7, waistY);
      c.bezierCurveTo(cx - bodyW * 0.8, waistY, cx - bodyW - 4, midY + (bodyBot - midY) * 0.5, cx - bodyW - 3, bodyBot);
      c.lineTo(cx + bodyW + 3, bodyBot);
      c.bezierCurveTo(cx + bodyW + 4, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.8, waistY, cx + bodyW * 0.7, waistY);
      c.bezierCurveTo(cx + bodyW * 0.8, waistY, cx + bodyW + 5, midY, cx + bodyW + 4, bodyTop + 2);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 8), bodyTop + 12, 8, 6, s * 0.25, 0, Math.PI * 2); c.fill();
      }
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      // Diagonal zipper with teeth
      c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(cx + 2, bodyTop + 5); c.lineTo(cx - 3, bodyBot - 2); c.stroke();
      c.save(); c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.2; c.globalAlpha = 0.35;
      for (let zi = 0; zi < 8; zi++) {
        const zt = zi / 8;
        const zx = cx + 2 - 5 * zt, zy = bodyTop + 5 + (bodyBot - bodyTop - 7) * zt;
        c.beginPath(); c.moveTo(zx - 1, zy); c.lineTo(zx + 1, zy); c.stroke();
      }
      c.restore();
      // Collar
      for (let s = -1; s <= 1; s += 2) {
        c.fillStyle = _darken(color, 8);
        c.beginPath();
        c.moveTo(cx + s * 2, bodyTop + 2);
        c.lineTo(cx + s * 8, bodyTop + 1);
        c.lineTo(cx + s * 7, bodyTop + 8);
        c.lineTo(cx + s * 2, bodyTop + 6);
        c.closePath(); c.fill();
      }
      c.fillStyle = tG;
      // Pocket flaps
      for (let s = -1; s <= 1; s += 2) {
        _pocketDetail(c, cx + s * bodyW * 0.25 - 3, bodyBot - 12, 6, 4, color);
      }
      // Shoulder seams
      _stitchLine(c, cx - bodyW, bodyTop + 4, cx - bodyW - 6, bodyTop + 10, color);
      _stitchLine(c, cx + bodyW, bodyTop + 4, cx + bodyW + 6, bodyTop + 10, color);
      break;
    }
    case 'graphic_tee': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 3, midY, cx - bodyW * 0.7, waistY - 2, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY + 2, cx - bodyW - 2, midY + (bodyBot - midY) * 0.5, cx - bodyW - 1, bodyBot);
      c.lineTo(cx + bodyW + 1, bodyBot);
      c.bezierCurveTo(cx + bodyW + 2, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY + 2, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY - 2, cx + bodyW + 3, midY, cx + bodyW + 2, bodyTop + 4);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 6), bodyTop + 10, 6, 5, s * 0.3, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.6;
      c.beginPath(); c.arc(cx, bodyTop + 2, 4, 0.3, Math.PI - 0.3); c.stroke();
      // Enhanced graphic print - geometric design
      c.save(); c.globalAlpha = 0.15; c.fillStyle = '#fff';
      c.beginPath();
      c.moveTo(cx - 5, bodyTop + 14); c.lineTo(cx, bodyTop + 10); c.lineTo(cx + 5, bodyTop + 14);
      c.lineTo(cx + 3, bodyBot - 10); c.lineTo(cx - 3, bodyBot - 10);
      c.closePath(); c.fill();
      // Inner triangle
      c.globalAlpha = 0.1;
      c.beginPath();
      c.moveTo(cx - 3, bodyTop + 16); c.lineTo(cx, bodyTop + 13); c.lineTo(cx + 3, bodyTop + 16);
      c.closePath(); c.fill();
      c.restore();
      // Side seams and hem stitch
      _stitchLine(c, cx - bodyW, bodyTop + 8, cx - bodyW * 0.6, bodyBot, color);
      _stitchLine(c, cx + bodyW, bodyTop + 8, cx + bodyW * 0.6, bodyBot, color);
      _stitchLine(c, cx - bodyW, bodyBot - 1, cx + bodyW, bodyBot - 1, color);
      break;
    }
    case 'off_shoulder': {
      c.beginPath();
      c.moveTo(cx - bodyW + 3, bodyTop + 8);
      c.bezierCurveTo(cx - bodyW + 2, midY, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY, cx - bodyW + 2, midY + (bodyBot - midY) * 0.5, cx - bodyW + 3, bodyBot);
      c.lineTo(cx + bodyW - 3, bodyBot);
      c.bezierCurveTo(cx + bodyW - 2, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.65, waistY, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW - 2, midY, cx + bodyW - 3, bodyTop + 8);
      c.closePath(); c.fill();
      _garmentHighlight(c, cx, bodyTop + 8, bodyW * 0.7, bodyBot - bodyTop - 8);
      // Ruffle edge at top
      c.strokeStyle = _darken(color, 10); c.lineWidth = 0.4;
      for (let i = 0; i < 8; i++) {
        const rx = cx - bodyW + 6 + i * (bodyW * 2 - 12) / 7;
        c.beginPath(); c.arc(rx, bodyTop + 8, 2, 0, Math.PI); c.stroke();
      }
      break;
    }
    case 'turtleneck': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 3, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.65, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 2, midY + (bodyBot - midY) * 0.5, cx - bodyW - 1, bodyBot);
      c.lineTo(cx + bodyW + 1, bodyBot);
      c.bezierCurveTo(cx + bodyW + 2, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY, cx + bodyW * 0.65, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 3, midY, cx + bodyW + 2, bodyTop + 2);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 7), bodyTop + 12, 7, 5.5, s * 0.2, 0, Math.PI * 2); c.fill();
      }
      // Turtleneck collar
      c.fillStyle = _darken(color, 8);
      c.beginPath();
      c.moveTo(cx - 5, bodyTop);
      c.lineTo(cx - 5.5, bodyTop - 6);
      c.quadraticCurveTo(cx, bodyTop - 8, cx + 5.5, bodyTop - 6);
      c.lineTo(cx + 5, bodyTop);
      c.closePath(); c.fill();
      c.fillStyle = tG;
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      // Knit texture
      _fabricTexture(c, cx - bodyW + 2, bodyTop + 2, bodyW * 2 - 4, bodyBot - bodyTop - 4, 'knit', color);
      _drawFold(c, cx, bodyTop + (bodyBot - bodyTop) * 0.3, bodyW * 0.6, color);
      _drawFold(c, cx, bodyTop + (bodyBot - bodyTop) * 0.6, bodyW * 0.5, color);
      // Ribbed hem and cuffs
      _stitchLine(c, cx - bodyW, bodyBot, cx + bodyW, bodyBot, color);
      break;
    }
    case 'puffer_vest': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW, midY, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY, cx - bodyW, midY + (bodyBot - midY) * 0.5, cx - bodyW + 1, bodyBot);
      c.lineTo(cx + bodyW - 1, bodyBot);
      c.bezierCurveTo(cx + bodyW, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.65, waistY, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW, midY, cx + bodyW - 1, bodyTop + 4);
      c.closePath(); c.fill();
      // Puffy segments
      const puffCount = 4;
      const segH = (bodyBot - bodyTop - 6) / puffCount;
      for (let i = 0; i < puffCount; i++) {
        const py = bodyTop + 6 + i * segH;
        c.save(); c.globalAlpha = 0.06; c.fillStyle = '#fff';
        c.beginPath(); c.ellipse(cx, py + segH * 0.5, bodyW * 0.7, segH * 0.35, 0, 0, Math.PI * 2); c.fill();
        c.restore();
        _drawStitch(c, cx - bodyW + 2, py + segH, cx + bodyW - 2, py + segH, color);
      }
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx, bodyTop + 5); c.lineTo(cx, bodyBot - 2); c.stroke();
      break;
    }
    case 'tube_top': {
      const tubeBot = waistY + 2;
      c.beginPath();
      c.moveTo(cx - bodyW + 2, bodyTop + 6);
      c.quadraticCurveTo(cx - bodyW + 1, (bodyTop + tubeBot) / 2, cx - bodyW + 3, tubeBot);
      c.quadraticCurveTo(cx, tubeBot + 2, cx + bodyW - 3, tubeBot);
      c.quadraticCurveTo(cx + bodyW - 1, (bodyTop + tubeBot) / 2, cx + bodyW - 2, bodyTop + 6);
      c.closePath(); c.fill();
      _garmentHighlight(c, cx, bodyTop + 6, bodyW * 0.6, tubeBot - bodyTop - 6);
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx - bodyW + 3, bodyTop + 7); c.quadraticCurveTo(cx, bodyTop + 9, cx + bodyW - 3, bodyTop + 7); c.stroke();
      break;
    }
    case 'peasant_blouse': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 5);
      c.bezierCurveTo(cx - bodyW - 3, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY + 2, cx - bodyW - 2, midY + (bodyBot - midY) * 0.5, cx - bodyW - 1, bodyBot + 2);
      c.lineTo(cx + bodyW + 1, bodyBot + 2);
      c.bezierCurveTo(cx + bodyW + 2, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY + 2, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 3, midY, cx + bodyW + 2, bodyTop + 5);
      c.closePath(); c.fill();
      // Puffy sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 8), bodyTop + 12, 9, 7, s * 0.2, 0, Math.PI * 2); c.fill();
      }
      // Ruffle neckline
      c.strokeStyle = _darken(color, 12); c.lineWidth = 0.4;
      for (let i = 0; i < 6; i++) {
        const rx = cx - 6 + i * 2.4;
        c.beginPath(); c.arc(rx, bodyTop + 5, 1.5, 0, Math.PI); c.stroke();
      }
      // Embroidery detail
      c.save(); c.globalAlpha = 0.12; c.strokeStyle = _darken(color, 30); c.lineWidth = 0.3;
      c.beginPath(); c.arc(cx, bodyTop + 16, 4, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(cx, bodyTop + 16, 2, 0, Math.PI * 2); c.stroke();
      c.restore();
      break;
    }
    case 'halter_top': {
      const halterBot = waistY + 4;
      c.beginPath();
      c.moveTo(cx - bodyW + 3, bodyTop + 8);
      c.bezierCurveTo(cx - bodyW + 2, (bodyTop + halterBot) / 2, cx - bodyW * 0.6, halterBot - 2, cx - bodyW * 0.5, halterBot);
      c.quadraticCurveTo(cx, halterBot + 2, cx + bodyW * 0.5, halterBot);
      c.bezierCurveTo(cx + bodyW * 0.6, halterBot - 2, cx + bodyW - 2, (bodyTop + halterBot) / 2, cx + bodyW - 3, bodyTop + 8);
      c.closePath(); c.fill();
      // Halter straps
      c.strokeStyle = color; c.lineWidth = 1.5;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.moveTo(cx + s * 4, bodyTop + 8); c.lineTo(cx + s * 2, bodyTop - 5); c.stroke();
      }
      _garmentHighlight(c, cx, bodyTop + 8, bodyW * 0.5, halterBot - bodyTop - 8);
      break;
    }
    case 'varsity': {
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 5, midY, cx - bodyW * 0.8, waistY, cx - bodyW * 0.7, waistY);
      c.bezierCurveTo(cx - bodyW * 0.8, waistY, cx - bodyW - 4, midY + (bodyBot - midY) * 0.5, cx - bodyW - 3, bodyBot + 1);
      c.lineTo(cx + bodyW + 3, bodyBot + 1);
      c.bezierCurveTo(cx + bodyW + 4, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.8, waistY, cx + bodyW * 0.7, waistY);
      c.bezierCurveTo(cx + bodyW * 0.8, waistY, cx + bodyW + 5, midY, cx + bodyW + 4, bodyTop + 2);
      c.closePath(); c.fill();
      // White sleeves
      c.fillStyle = '#fff';
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 8), bodyTop + 12, 8, 6, s * 0.25, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = tG;
      // Stripe detail
      c.fillStyle = '#fff'; c.globalAlpha = 0.3;
      c.fillRect(cx - bodyW + 2, bodyBot - 4, bodyW * 2 - 4, 2);
      c.globalAlpha = 1; c.fillStyle = tG;
      // Letter
      c.save(); c.globalAlpha = 0.2; c.fillStyle = '#fff';
      c.font = 'bold ' + (bodyW * 0.5) + 'px sans-serif'; c.textAlign = 'center';
      c.fillText('S', cx, midY + 4); c.restore();
      break;
    }
    case 'wrap_top': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 1, midY, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY + 2, cx - bodyW, midY + (bodyBot - midY) * 0.5, cx - bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.65, waistY + 2, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW + 1, midY, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Wrap crossover line
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(cx - bodyW * 0.5, bodyTop + 5);
      c.bezierCurveTo(cx - 2, bodyTop + 8, cx + 2, waistY - 5, cx + bodyW * 0.3, waistY);
      c.stroke();
      // Tie at waist
      c.fillStyle = _darken(color, 10);
      c.beginPath();
      c.moveTo(cx + bodyW * 0.3, waistY);
      c.quadraticCurveTo(cx + bodyW * 0.5, waistY + 4, cx + bodyW * 0.3, waistY + 8);
      c.quadraticCurveTo(cx + bodyW * 0.2, waistY + 5, cx + bodyW * 0.3, waistY);
      c.fill(); c.fillStyle = tG;
      break;
    }
    case 'denim_jacket': {
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 4, midY, cx - bodyW * 0.75, waistY, cx - bodyW * 0.65, waistY);
      c.bezierCurveTo(cx - bodyW * 0.75, waistY, cx - bodyW - 3, midY + (bodyBot - midY) * 0.5, cx - bodyW - 2, bodyBot);
      c.lineTo(cx + bodyW + 2, bodyBot);
      c.bezierCurveTo(cx + bodyW + 3, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.75, waistY, cx + bodyW * 0.65, waistY);
      c.bezierCurveTo(cx + bodyW * 0.75, waistY, cx + bodyW + 4, midY, cx + bodyW + 3, bodyTop + 2);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 7), bodyTop + 12, 7, 5.5, s * 0.2, 0, Math.PI * 2); c.fill();
      }
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      // Collar
      for (let s = -1; s <= 1; s += 2) {
        c.fillStyle = _lighten(color, 8);
        c.beginPath();
        c.moveTo(cx + s * 1, bodyTop + 2);
        c.lineTo(cx + s * 7, bodyTop + 1);
        c.lineTo(cx + s * 6, bodyTop + 8);
        c.lineTo(cx + s * 1, bodyTop + 6);
        c.closePath(); c.fill();
      }
      c.fillStyle = tG;
      // Breast pockets
      for (let s = -1; s <= 1; s += 2) {
        c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
        const px = cx + s * bodyW * 0.35;
        c.strokeRect(px - 3, bodyTop + 12, 6, 5);
      }
      _drawStitch(c, cx - bodyW, bodyTop + 8, cx - bodyW, bodyBot, color);
      _drawStitch(c, cx + bodyW, bodyTop + 8, cx + bodyW, bodyBot, color);
      break;
    }
    case 'polo': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 3, midY, cx - bodyW * 0.75, waistY, cx - bodyW * 0.65, waistY);
      c.bezierCurveTo(cx - bodyW * 0.75, waistY, cx - bodyW - 2, midY + (bodyBot - midY) * 0.5, cx - bodyW - 1, bodyBot);
      c.lineTo(cx + bodyW + 1, bodyBot);
      c.bezierCurveTo(cx + bodyW + 2, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.75, waistY, cx + bodyW * 0.65, waistY);
      c.bezierCurveTo(cx + bodyW * 0.75, waistY, cx + bodyW + 3, midY, cx + bodyW + 2, bodyTop + 4);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 5), bodyTop + 11, 6, 5, s * 0.15, 0, Math.PI * 2); c.fill();
      }
      // Polo collar
      c.fillStyle = _lighten(color, 15);
      c.beginPath();
      c.moveTo(cx - 5, bodyTop + 2); c.quadraticCurveTo(cx - 6, bodyTop - 2, cx - 4, bodyTop - 3);
      c.lineTo(cx + 4, bodyTop - 3); c.quadraticCurveTo(cx + 6, bodyTop - 2, cx + 5, bodyTop + 2);
      c.closePath(); c.fill();
      c.fillStyle = tG;
      // Buttons
      _drawButton(c, cx, bodyTop + 6, 0.7, _darken(color, 15));
      _drawButton(c, cx, bodyTop + 10, 0.7, _darken(color, 15));
      break;
    }
    case 'bodysuit': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 5);
      c.bezierCurveTo(cx - bodyW - 1, midY, cx - bodyW * 0.6, waistY, cx - bodyW * 0.5, waistY);
      c.bezierCurveTo(cx - bodyW * 0.6, waistY, cx - bodyW, bodyBot, cx - bodyW, bodyBot + 4);
      c.lineTo(cx + bodyW, bodyBot + 4);
      c.bezierCurveTo(cx + bodyW, bodyBot, cx + bodyW * 0.6, waistY, cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.6, waistY, cx + bodyW + 1, midY, cx + bodyW, bodyTop + 5);
      c.closePath(); c.fill();
      _garmentHighlight(c, cx, bodyTop + 6, bodyW * 0.5, bodyBot - bodyTop - 8);
      // Round neck
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.5;
      c.beginPath(); c.arc(cx, bodyTop + 4, 4, 0.2, Math.PI - 0.2); c.stroke();
      break;
    }
    case 'flannel': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 3);
      c.bezierCurveTo(cx - bodyW - 3, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 2, midY + (bodyBot - midY) * 0.5, cx - bodyW - 1, bodyBot);
      c.lineTo(cx + bodyW + 1, bodyBot);
      c.bezierCurveTo(cx + bodyW + 2, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 3, midY, cx + bodyW + 2, bodyTop + 3);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 6), bodyTop + 12, 6.5, 5, s * 0.15, 0, Math.PI * 2); c.fill();
      }
      // Plaid pattern
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 0.5;
      for (let py = bodyTop + 6; py < bodyBot; py += 5) {
        c.beginPath(); c.moveTo(cx - bodyW, py); c.lineTo(cx + bodyW, py); c.stroke();
      }
      for (let px = cx - bodyW; px < cx + bodyW; px += 5) {
        c.beginPath(); c.moveTo(px, bodyTop + 4); c.lineTo(px, bodyBot); c.stroke();
      }
      // Buttons
      for (let b = bodyTop + 8; b < bodyBot - 3; b += 7) { _drawButton(c, cx, b, 0.7, _darken(color, 15)); }
      break;
    }
    case 'sports_bra': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 5);
      c.lineTo(cx - bodyW + 1, bodyTop + 18);
      c.quadraticCurveTo(cx, bodyTop + 20, cx + bodyW - 1, bodyTop + 18);
      c.lineTo(cx + bodyW - 1, bodyTop + 5);
      c.closePath(); c.fill();
      // Racerback straps
      c.strokeStyle = color; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(cx - bodyW + 3, bodyTop + 5); c.lineTo(cx - 2, bodyTop - 3); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 3, bodyTop + 5); c.lineTo(cx + 2, bodyTop - 3); c.stroke();
      // Band
      c.fillStyle = _darken(color, 15);
      c.fillRect(cx - bodyW + 1, bodyTop + 16, bodyW * 2 - 2, 2.5);
      break;
    }
    case 'cape_top': {
      // Fitted top
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.lineTo(cx - bodyW, bodyBot); c.lineTo(cx + bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Cape overlay
      c.save(); c.globalAlpha = 0.5;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * 2, bodyTop + 2);
        c.quadraticCurveTo(cx + s * (bodyW + 16), bodyTop + 14, cx + s * (bodyW + 12), bodyBot + 5);
        c.lineTo(cx + s * bodyW, bodyBot);
        c.lineTo(cx + s * bodyW, bodyTop + 4);
        c.closePath(); c.fill();
      }
      c.restore();
      break;
    }
    case 'lace_top': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 1, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 1, midY + (bodyBot - midY) * 0.5, cx - bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 1, midY, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Lace pattern overlay
      c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.3;
      for (let ly = bodyTop + 6; ly < bodyBot; ly += 4) {
        for (let lx = cx - bodyW + 2; lx < cx + bodyW - 2; lx += 4) {
          c.beginPath(); c.arc(lx, ly, 1.5, 0, Math.PI * 2); c.stroke();
        }
      }
      // Scallop hem
      for (let hx = cx - bodyW; hx < cx + bodyW; hx += 4) {
        c.beginPath(); c.arc(hx + 2, bodyBot, 2, Math.PI, 0); c.stroke();
      }
      break;
    }
    case 'military': {
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 4, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 3, midY + (bodyBot - midY) * 0.5, cx - bodyW - 2, bodyBot);
      c.lineTo(cx + bodyW + 2, bodyBot);
      c.bezierCurveTo(cx + bodyW + 3, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 4, midY, cx + bodyW + 3, bodyTop + 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 7), bodyTop + 12, 7, 5.5, s * 0.2, 0, Math.PI * 2); c.fill();
      }
      // Epaulettes with fringe detail
      c.fillStyle = _darken(color, 20);
      for (let s = -1; s <= 1; s += 2) {
        c.fillRect(cx + s * bodyW - 2, bodyTop + 3, 5, 2.5);
        c.save(); c.strokeStyle = '#f4d03f'; c.lineWidth = 0.3; c.globalAlpha = 0.4;
        for (let fi = 0; fi < 3; fi++) {
          c.beginPath(); c.moveTo(cx + s * bodyW - 1 + fi * 1.5, bodyTop + 5.5);
          c.lineTo(cx + s * bodyW - 1 + fi * 1.5, bodyTop + 7); c.stroke();
        }
        c.restore();
      }
      c.fillStyle = tG;
      // Chest pockets
      for (let s = -1; s <= 1; s += 2) {
        _pocketDetail(c, cx + s * bodyW * 0.35 - 3, bodyTop + 12, 6, 5, color);
      }
      // Double button rows
      for (let b = bodyTop + 8; b < bodyBot - 3; b += 6) {
        _drawButton(c, cx - 3, b, 0.6, '#f4d03f');
        _drawButton(c, cx + 3, b, 0.6, '#f4d03f');
      }
      // Collar
      c.fillStyle = _darken(color, 10);
      c.beginPath(); c.moveTo(cx - 5, bodyTop + 2); c.lineTo(cx, bodyTop + 7); c.lineTo(cx + 5, bodyTop + 2); c.closePath(); c.fill();
      break;
    }
    case 'henley': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 2, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 1, midY + (bodyBot - midY) * 0.5, cx - bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 2, midY, cx + bodyW + 1, bodyTop + 4);
      c.closePath(); c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 5), bodyTop + 11, 6, 5, s * 0.15, 0, Math.PI * 2); c.fill();
      }
      // Henley placket
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyTop + 4); c.lineTo(cx, bodyTop + 14); c.stroke();
      _drawButton(c, cx, bodyTop + 6, 0.6, _darken(color, 15));
      _drawButton(c, cx, bodyTop + 10, 0.6, _darken(color, 15));
      break;
    }
    case 'ruffle_blouse': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 2, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 1, midY + (bodyBot - midY) * 0.5, cx - bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 2, midY, cx + bodyW + 1, bodyTop + 4);
      c.closePath(); c.fill();
      // Ruffle detail along center
      c.strokeStyle = _darken(color, 10); c.lineWidth = 0.3;
      for (let ry = bodyTop + 5; ry < bodyBot - 2; ry += 3) {
        c.beginPath();
        c.moveTo(cx - 3, ry);
        c.quadraticCurveTo(cx, ry + 1.5, cx + 3, ry);
        c.stroke();
      }
      // Puffed sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 4), bodyTop + 10, 7, 6, s * 0.2, 0, Math.PI * 2); c.fill();
      }
      break;
    }
    case 'bomber': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 3);
      c.bezierCurveTo(cx - bodyW - 3, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 2, midY + (bodyBot - midY) * 0.5, cx - bodyW - 1, bodyBot);
      c.lineTo(cx + bodyW + 1, bodyBot);
      c.bezierCurveTo(cx + bodyW + 2, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 3, midY, cx + bodyW + 2, bodyTop + 3);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, bodyBot - bodyTop);
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.ellipse(cx + s * (bodyW + 6), bodyTop + 12, 7, 5.5, s * 0.2, 0, Math.PI * 2); c.fill();
      }
      // Ribbed collar, cuffs, hem
      c.fillStyle = _darken(color, 25);
      c.fillRect(cx - bodyW - 2, bodyBot - 3, bodyW * 2 + 4, 3);
      c.fillRect(cx - 5, bodyTop + 1, 10, 3);
      c.fillStyle = tG;
      // Center zipper with teeth
      c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx, bodyTop + 4); c.lineTo(cx, bodyBot - 3); c.stroke();
      c.save(); c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.2; c.globalAlpha = 0.3;
      for (let zy = bodyTop + 6; zy < bodyBot - 4; zy += 2) {
        c.beginPath(); c.moveTo(cx - 1, zy); c.lineTo(cx + 1, zy); c.stroke();
      }
      c.restore();
      // Pocket flaps
      for (let s = -1; s <= 1; s += 2) {
        _pocketDetail(c, cx + s * bodyW * 0.35 - 3, waistY + 2, 6, 4, color);
      }
      // Shoulder seams
      _stitchLine(c, cx - bodyW, bodyTop + 5, cx - bodyW - 5, bodyTop + 10, color);
      _stitchLine(c, cx + bodyW, bodyTop + 5, cx + bodyW + 5, bodyTop + 10, color);
      break;
    }
    case 'poncho': {
      // Triangular poncho shape
      c.beginPath();
      c.moveTo(cx, bodyTop);
      c.quadraticCurveTo(cx - bodyW - 18, bodyTop + 14, cx - bodyW - 12, bodyBot + 5);
      c.quadraticCurveTo(cx, bodyBot + 8, cx + bodyW + 12, bodyBot + 5);
      c.quadraticCurveTo(cx + bodyW + 18, bodyTop + 14, cx, bodyTop);
      c.closePath(); c.fill();
      // Neckline
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.6;
      c.beginPath(); c.arc(cx, bodyTop, 4, 0.2, Math.PI - 0.2); c.stroke();
      // Pattern stripes
      c.strokeStyle = _darken(color, 12); c.lineWidth = 0.4;
      for (let py = bodyTop + 8; py < bodyBot; py += 5) {
        c.beginPath(); c.moveTo(cx - bodyW - 8 + (py - bodyTop) * 0.2, py); c.lineTo(cx + bodyW + 8 - (py - bodyTop) * 0.2, py); c.stroke();
      }
      break;
    }
    case 'corset_top': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 5);
      c.bezierCurveTo(cx - bodyW - 1, midY, cx - bodyW * 0.55, waistY, cx - bodyW * 0.45, waistY);
      c.bezierCurveTo(cx - bodyW * 0.55, waistY, cx - bodyW, bodyBot * 0.95 + waistY * 0.05, cx - bodyW, bodyBot - 2);
      c.lineTo(cx + bodyW, bodyBot - 2);
      c.bezierCurveTo(cx + bodyW, bodyBot * 0.95 + waistY * 0.05, cx + bodyW * 0.55, waistY, cx + bodyW * 0.45, waistY);
      c.bezierCurveTo(cx + bodyW * 0.55, waistY, cx + bodyW + 1, midY, cx + bodyW, bodyTop + 5);
      c.closePath(); c.fill();
      // Lacing
      c.strokeStyle = _lighten(color, 30); c.lineWidth = 0.4;
      for (let ly = bodyTop + 8; ly < bodyBot - 4; ly += 4) {
        c.beginPath(); c.moveTo(cx - 2, ly); c.lineTo(cx + 2, ly + 2); c.stroke();
        c.beginPath(); c.moveTo(cx + 2, ly); c.lineTo(cx - 2, ly + 2); c.stroke();
      }
      // Boning lines
      _drawSeam(c, cx - bodyW * 0.5, bodyTop + 6, cx - bodyW * 0.5, bodyBot - 3, _darken(color, 12));
      _drawSeam(c, cx + bodyW * 0.5, bodyTop + 6, cx + bodyW * 0.5, bodyBot - 3, _darken(color, 12));
      break;
    }
    case 'mesh_top': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.lineTo(cx - bodyW, bodyBot); c.lineTo(cx + bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Mesh pattern
      c.save(); c.globalAlpha = 0.15;
      c.strokeStyle = '#fff'; c.lineWidth = 0.3;
      for (let my = bodyTop + 5; my < bodyBot; my += 3) {
        for (let mx = cx - bodyW + 1; mx < cx + bodyW; mx += 3) {
          c.strokeRect(mx, my, 2.5, 2.5);
        }
      }
      c.restore();
      break;
    }
    case 'sailor_top': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 2, midY, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 1, midY + (bodyBot - midY) * 0.5, cx - bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, midY + (bodyBot - midY) * 0.5, cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 2, midY, cx + bodyW + 1, bodyTop + 4);
      c.closePath(); c.fill();
      // Sailor collar
      c.fillStyle = '#2e86c1';
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 4);
      c.lineTo(cx - bodyW - 4, bodyTop + 16);
      c.lineTo(cx, bodyTop + 12);
      c.lineTo(cx + bodyW + 4, bodyTop + 16);
      c.lineTo(cx + bodyW + 1, bodyTop + 4);
      c.closePath(); c.fill();
      c.fillStyle = tG;
      // Stripes at bottom
      c.strokeStyle = '#2e86c1'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - bodyW, bodyBot - 4); c.lineTo(cx + bodyW, bodyBot - 4); c.stroke();
      c.beginPath(); c.moveTo(cx - bodyW, bodyBot - 2); c.lineTo(cx + bodyW, bodyBot - 2); c.stroke();
      break;
    }
  }
}

TOP_DEFS.forEach(d => {
  defItem('top_' + d.id, d.name, 'top', d.tags, d.colors,
    (c, char, x, y, w, h, colIdx) => {
      drawTop(d.id, c, char, x, y, w, h, d.colors[colIdx % d.colors.length][0]);
    });
});

/* ── Bottoms ── */
const BOTTOM_DEFS = [
  { id:'jeans',        name:'Jeans',         tags:['casual','simple'],      colors:[['#2e4057'],['#1a3040'],['#4a6a8a'],['#2c2c2c']] },
  { id:'skirt',        name:'Skirt',         tags:['casual','cute'],        colors:[['#e84393'],['#3498db'],['#f39c12'],['#2ecc71']] },
  { id:'shorts',       name:'Shorts',        tags:['casual','summer'],      colors:[['#f0e68c'],['#87ceeb'],['#dda0dd'],['#2e4057']] },
  { id:'leggings',     name:'Leggings',      tags:['casual','sporty'],      colors:[['#2c3e50'],['#e84393'],['#1abc9c'],['#8e44ad']] },
  { id:'cargo_pants',  name:'Cargo Pants',   tags:['casual','cool'],        colors:[['#6b6b3a'],['#8b7355'],['#556b2f'],['#696969']] },
  { id:'flowing_skirt',name:'Flowing Skirt', tags:['elegant','fancy'],      colors:[['#d4a5e5'],['#a5d4e5'],['#e5d4a5'],['#e5a5a5']] },
  { id:'armor_greaves',name:'Armor Greaves', tags:['medieval','warrior'],   colors:[['#95a5a6'],['#f4d03f'],['#7f8c8d'],['#b87333']] },
  { id:'sweatpants',   name:'Sweatpants',    tags:['casual','cozy','warm'], colors:[['#7f8c8d'],['#2c3e50'],['#c0392b'],['#2e86c1']] },
  { id:'pleated_skirt',name:'Pleated Skirt', tags:['formal','elegant'],     colors:[['#2c3e50'],['#922b21'],['#1e8449'],['#6c3483']] },
  { id:'bell_bottoms', name:'Bell-bottoms',  tags:['retro','cool'],         colors:[['#8e44ad'],['#e67e22'],['#27ae60'],['#2c3e50']] },
  { id:'ripped_jeans', name:'Ripped Jeans',  tags:['casual','cool','punk'], colors:[['#3a5a7a'],['#2c3e50'],['#1a3040'],['#4a4a4a']] },
  { id:'high_waist_shorts',name:'High-Waist Shorts',tags:['casual','summer','cute'],colors:[['#2e4057'],['#e84393'],['#f39c12'],['#fff']] },
  { id:'wide_leg',     name:'Wide-Leg Trousers',tags:['elegant','formal'],   colors:[['#2c3e50'],['#8e44ad'],['#c0392b'],['#1abc9c']] },
  { id:'mini_skirt',   name:'Mini Skirt',    tags:['casual','cute','cool'], colors:[['#e84393'],['#c0392b'],['#2c3e50'],['#f39c12']] },
  { id:'joggers',      name:'Joggers',       tags:['casual','sporty'],      colors:[['#34495e'],['#2c3e50'],['#7f8c8d'],['#c0392b']] },
  { id:'pencil_skirt', name:'Pencil Skirt',  tags:['formal','elegant'],     colors:[['#2c3e50'],['#922b21'],['#1e8449'],['#6c3483']] },
  { id:'culottes',     name:'Culottes',       tags:['casual','elegant'],     colors:[['#d4a5e5'],['#f5cba7'],['#87ceeb'],['#2c3e50']] },
  { id:'leather_pants',name:'Leather Pants', tags:['cool','punk','edgy'],   colors:[['#1a1a1a'],['#3d0c02'],['#2c2c2c'],['#4a0e0e']] },
  { id:'overalls',     name:'Overalls',      tags:['casual','cute'],        colors:[['#2e4057'],['#8b4513'],['#556b2f'],['#c0392b']] },
  { id:'wrap_skirt',   name:'Wrap Skirt',    tags:['elegant','casual'],     colors:[['#e67e22'],['#2ecc71'],['#e84393'],['#3498db']] },
  { id:'palazzo',      name:'Palazzo Pants', tags:['elegant','formal'],     colors:[['#1abc9c'],['#8e44ad'],['#e74c3c'],['#2c3e50']] },
  { id:'bike_shorts',  name:'Bike Shorts',   tags:['sporty','casual'],      colors:[['#2c3e50'],['#e84393'],['#1abc9c'],['#c0392b']] },
  { id:'tutu',         name:'Tutu',          tags:['cute','fantasy','fancy'],colors:[['#f8b4c8'],['#d4a5e5'],['#a5d4e5'],['#fff']] },
  { id:'harem_pants',  name:'Harem Pants',   tags:['casual','cool'],        colors:[['#8e44ad'],['#e67e22'],['#2ecc71'],['#c0392b']] },
  { id:'paperbag',     name:'Paperbag Waist',tags:['elegant','cute'],      colors:[['#f5cba7'],['#87ceeb'],['#e84393'],['#2c3e50']] },
  { id:'flared_skirt', name:'Flared Skirt',  tags:['casual','cute'],       colors:[['#e84393'],['#3498db'],['#f39c12'],['#2ecc71']] },
  { id:'track_pants',  name:'Track Pants',   tags:['sporty','casual'],     colors:[['#2c3e50'],['#c0392b'],['#1e8449'],['#2e86c1']] },
  { id:'layered_skirt',name:'Layered Skirt', tags:['elegant','cute'],      colors:[['#d4a5e5'],['#f8b4c8'],['#a5d4e5'],['#f5cba7']] },
  { id:'cargo_shorts', name:'Cargo Shorts',  tags:['casual','summer'],     colors:[['#6b6b3a'],['#8b7355'],['#556b2f'],['#2c3e50']] },
  { id:'maxi_skirt',   name:'Maxi Skirt',    tags:['elegant','casual'],    colors:[['#8e44ad'],['#e67e22'],['#1abc9c'],['#c0392b']] },
];

function drawBottom(style, c, char, x, y, w, h, color) {
  const { cx, bodyBot, bodyW, kneeY, legBot } = M(x, y, w, h);
  const botGrad = c.createLinearGradient(cx, bodyBot, cx, legBot);
  botGrad.addColorStop(0, _lighten(color, 18));
  botGrad.addColorStop(1, _darken(color, 12));
  c.fillStyle = botGrad;
  const midLeg = (bodyBot + legBot) / 2;

  switch(style) {
    case 'jeans': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, midLeg, cx - 8, legBot);
      c.lineTo(cx - 2, legBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 8, legBot);
      c.quadraticCurveTo(cx + bodyW + 2, midLeg, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Denim texture
      _fabricTexture(c, cx - bodyW, bodyBot, bodyW * 2, legBot - bodyBot, 'denim', color);
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 4); c.stroke();
      // Stitch lines along legs
      _stitchLine(c, cx - 5, bodyBot + 6, cx - 5, legBot - 1, color);
      _stitchLine(c, cx + 5, bodyBot + 6, cx + 5, legBot - 1, color);
      // Belt loops
      c.save(); c.strokeStyle = _darken(color, 20); c.lineWidth = 0.4; c.globalAlpha = 0.4;
      for (let bl = -2; bl <= 2; bl++) {
        if (bl === 0) continue;
        const bx = cx + bl * bodyW * 0.35;
        c.beginPath(); c.moveTo(bx, bodyBot - 3); c.lineTo(bx, bodyBot); c.stroke();
      }
      c.restore();
      // Rivets at pockets
      c.save(); c.fillStyle = '#c0a050'; c.globalAlpha = 0.5;
      c.beginPath(); c.arc(cx - bodyW + 3, bodyBot + 2, 0.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + bodyW - 3, bodyBot + 2, 0.5, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'skirt': {
      const skirtBot = bodyBot + (kneeY - bodyBot) * 0.55;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 8, (bodyBot + skirtBot) / 2, cx - bodyW + 2, skirtBot);
      c.quadraticCurveTo(cx, skirtBot + 3, cx + bodyW - 2, skirtBot);
      c.quadraticCurveTo(cx + bodyW + 8, (bodyBot + skirtBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, skirtBot - bodyBot);
      // Deeper fold lines with shadow
      c.save(); c.strokeStyle = _darken(color, 20); c.lineWidth = 0.4; c.globalAlpha = 0.25;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i * 3.5, bodyBot);
        c.quadraticCurveTo(cx + i * 4, (bodyBot + skirtBot) / 2, cx + i * 3.8, skirtBot - 2);
        c.stroke();
      }
      c.restore();
      // Hem stitch
      _stitchLine(c, cx - bodyW + 2, skirtBot - 1, cx + bodyW - 2, skirtBot - 1, color);
      break;
    }
    case 'shorts': {
      const shortBot = bodyBot + (kneeY - bodyBot) * 0.3;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, bodyBot + 4, cx - bodyW, shortBot);
      c.quadraticCurveTo(cx - bodyW / 2, shortBot + 2, cx - 2, shortBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 4, cx, bodyBot + 3);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 3);
      c.quadraticCurveTo(cx + 1, bodyBot + 4, cx + 2, shortBot);
      c.quadraticCurveTo(cx + bodyW / 2, shortBot + 2, cx + bodyW, shortBot);
      c.quadraticCurveTo(cx + bodyW + 2, bodyBot + 4, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, shortBot - bodyBot);
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 3); c.stroke();
      // Hem cuffs
      _stitchLine(c, cx - bodyW, shortBot - 1, cx - 2, shortBot - 1, color);
      _stitchLine(c, cx + 2, shortBot - 1, cx + bodyW, shortBot - 1, color);
      break;
    }
    case 'leggings': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 1, midLeg, cx - 7, legBot + 1);
      c.lineTo(cx - 3, legBot + 1);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 3, legBot + 1);
      c.lineTo(cx + 7, legBot + 1);
      c.quadraticCurveTo(cx + bodyW + 1, midLeg, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      // Shine highlight
      _garmentHighlight(c, cx - 4, bodyBot + 4, 2, midLeg - bodyBot - 6);
      _garmentHighlight(c, cx + 4, bodyBot + 4, 2, midLeg - bodyBot - 6);
      // Side seam
      _stitchLine(c, cx - bodyW, bodyBot, cx - 7, legBot, color);
      _stitchLine(c, cx + bodyW, bodyBot, cx + 7, legBot, color);
      break;
    }
    case 'cargo_pants': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 3, midLeg, cx - 9, legBot);
      c.lineTo(cx - 2, legBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 9, legBot);
      c.quadraticCurveTo(cx + bodyW + 3, midLeg, cx + bodyW + 2, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Cargo pocket flaps with buttons
      for (let s = -1; s <= 1; s += 2) {
        _pocketDetail(c, cx + s * 5 - 3, kneeY - 12, 5, 4, color);
        _drawButton(c, cx + s * 5 - 0.5, kneeY - 11, 0.5, _darken(color, 25));
      }
      // Knee seams
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx - 8, kneeY); c.quadraticCurveTo(cx - 5, kneeY + 1, cx - 2, kneeY); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, kneeY); c.quadraticCurveTo(cx + 5, kneeY + 1, cx + 8, kneeY); c.stroke();
      // Side seams
      _stitchLine(c, cx - bodyW - 1, bodyBot, cx - 8, legBot, color);
      _stitchLine(c, cx + bodyW + 1, bodyBot, cx + 8, legBot, color);
      // Belt loops
      _beltLine(c, cx, bodyBot - 2, bodyW, color, true);
      break;
    }
    case 'flowing_skirt': {
      const flowBot = legBot - 10;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 14, (bodyBot + flowBot) / 2, cx - bodyW + 4, flowBot);
      c.quadraticCurveTo(cx, flowBot + 3, cx + bodyW - 4, flowBot);
      c.quadraticCurveTo(cx + bodyW + 14, (bodyBot + flowBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, flowBot - bodyBot);
      // Deeper fold lines with shadow
      c.save(); c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4; c.globalAlpha = 0.3;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i * 4, bodyBot);
        c.quadraticCurveTo(cx + i * 5 + 1, (bodyBot + flowBot) / 2, cx + i * 4.5, flowBot - 3);
        c.stroke();
      }
      c.restore();
      // Hem detail
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let hx = cx - bodyW + 4; hx < cx + bodyW - 2; hx += 3) {
        c.beginPath(); c.arc(hx, flowBot - 1, 1.5, Math.PI, 0); c.stroke();
      }
      c.restore();
      break;
    }
    case 'armor_greaves': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 3, midLeg, cx - 9, legBot + 1);
      c.lineTo(cx - 2, legBot + 1);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot + 1);
      c.lineTo(cx + 9, legBot + 1);
      c.quadraticCurveTo(cx + bodyW + 3, midLeg, cx + bodyW + 2, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentHighlight(c, cx - 4, bodyBot + 4, 2, midLeg - bodyBot - 6);
      _garmentHighlight(c, cx + 4, bodyBot + 4, 2, midLeg - bodyBot - 6);
      // Plate segments
      c.strokeStyle = _darken(color, 22); c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(cx - 8, kneeY); c.quadraticCurveTo(cx - 5, kneeY + 1, cx - 2, kneeY); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, kneeY); c.quadraticCurveTo(cx + 5, kneeY + 1, cx + 8, kneeY); c.stroke();
      // Knee caps
      c.save(); c.fillStyle = _lighten(color, 15); c.globalAlpha = 0.3;
      c.beginPath(); c.ellipse(cx - 5, kneeY - 3, 3, 4, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(cx + 5, kneeY - 3, 3, 4, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      // Rivets
      c.save(); c.fillStyle = _darken(color, 30); c.globalAlpha = 0.5;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.arc(cx + s * 7, kneeY - 1, 0.6, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(cx + s * 7, kneeY + 3, 0.6, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      break;
    }
    case 'sweatpants': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, midLeg, cx - 8, legBot);
      c.lineTo(cx - 2, legBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 8, legBot);
      c.quadraticCurveTo(cx + bodyW + 2, midLeg, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Elastic cuffs
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
      c.beginPath(); c.ellipse(cx - 5, legBot - 1, 4, 1.5, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(cx + 5, legBot - 1, 4, 1.5, 0, 0, Math.PI * 2); c.stroke();
      // Drawstring
      c.save(); c.strokeStyle = _darken(color, 22); c.lineWidth = 0.4; c.globalAlpha = 0.5;
      c.beginPath(); c.moveTo(cx - 2, bodyBot - 1);
      c.quadraticCurveTo(cx - 3, bodyBot + 3, cx - 2, bodyBot + 6); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, bodyBot - 1);
      c.quadraticCurveTo(cx + 3, bodyBot + 3, cx + 2, bodyBot + 6); c.stroke();
      c.restore();
      // Side stripe
      c.save(); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - bodyW, bodyBot); c.lineTo(cx - 7, legBot - 1); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW, bodyBot); c.lineTo(cx + 7, legBot - 1); c.stroke();
      c.restore();
      break;
    }
    case 'pleated_skirt': {
      const pleatBot = bodyBot + (kneeY - bodyBot) * 0.6;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 4, (bodyBot + pleatBot) / 2, cx - bodyW - 3, pleatBot);
      c.quadraticCurveTo(cx, pleatBot + 3, cx + bodyW + 3, pleatBot);
      c.quadraticCurveTo(cx + bodyW + 4, (bodyBot + pleatBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, pleatBot - bodyBot);
      // Deeper pleat lines with shadow
      c.save(); c.strokeStyle = _darken(color, 22); c.lineWidth = 0.4; c.globalAlpha = 0.3;
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.moveTo(cx + i * 3.5, bodyBot);
        c.quadraticCurveTo(cx + i * 3.7, (bodyBot + pleatBot) / 2, cx + i * 3.8, pleatBot - 2);
        c.stroke();
      }
      c.restore();
      // Waistband
      c.fillStyle = _darken(color, 18);
      c.fillRect(cx - bodyW - 1, bodyBot - 4, bodyW * 2 + 2, 3);
      c.fillStyle = botGrad;
      // Hem stitch
      _stitchLine(c, cx - bodyW - 3, pleatBot - 1, cx + bodyW + 3, pleatBot - 1, color);
      break;
    }
    case 'bell_bottoms': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 1, kneeY, cx - 6, kneeY + 10);
      c.quadraticCurveTo(cx - 10, legBot, cx - 14, legBot + 2);
      c.lineTo(cx - 2, legBot + 2);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot + 2);
      c.lineTo(cx + 14, legBot + 2);
      c.quadraticCurveTo(cx + 10, legBot, cx + 6, kneeY + 10);
      c.quadraticCurveTo(cx + bodyW + 1, kneeY, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Side seams
      _stitchLine(c, cx - bodyW, bodyBot, cx - 14, legBot + 1, color);
      _stitchLine(c, cx + bodyW, bodyBot, cx + 14, legBot + 1, color);
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 4); c.stroke();
      break;
    }
    case 'ripped_jeans': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, midLeg, cx - 8, legBot);
      c.lineTo(cx - 2, legBot); c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 8, legBot); c.quadraticCurveTo(cx + bodyW + 2, midLeg, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      _fabricTexture(c, cx - bodyW, bodyBot, bodyW * 2, legBot - bodyBot, 'denim', color);
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 4); c.stroke();
      // Stitch lines
      _stitchLine(c, cx - 5, bodyBot + 6, cx - 5, legBot - 1, color);
      _stitchLine(c, cx + 5, bodyBot + 6, cx + 5, legBot - 1, color);
      // Rips with skin showing through
      c.fillStyle = 'rgba(255,220,185,0.35)';
      c.fillRect(cx - 7, kneeY - 4, 4, 6);
      c.fillRect(cx + 4, kneeY + 2, 3, 5);
      // Frayed threads on rips
      c.strokeStyle = _lighten(color, 15); c.lineWidth = 0.3;
      for (let r = 0; r < 4; r++) { c.beginPath(); c.moveTo(cx - 7, kneeY - 4 + r * 1.5); c.lineTo(cx - 3, kneeY - 4 + r * 1.5); c.stroke(); }
      for (let r = 0; r < 4; r++) { c.beginPath(); c.moveTo(cx + 4, kneeY + 2 + r * 1.5); c.lineTo(cx + 7, kneeY + 2 + r * 1.5); c.stroke(); }
      // Rip edge darkening
      c.save(); c.strokeStyle = _darken(color, 20); c.lineWidth = 0.4; c.globalAlpha = 0.4;
      c.strokeRect(cx - 7, kneeY - 4, 4, 6);
      c.strokeRect(cx + 4, kneeY + 2, 3, 5);
      c.restore();
      // Rivets
      c.save(); c.fillStyle = '#c0a050'; c.globalAlpha = 0.5;
      c.beginPath(); c.arc(cx - bodyW + 3, bodyBot + 2, 0.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + bodyW - 3, bodyBot + 2, 0.5, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'high_waist_shorts': {
      const hwBot = bodyBot + (kneeY - bodyBot) * 0.25;
      // High waistband
      c.fillStyle = _darken(color, 15);
      c.fillRect(cx - bodyW - 1, bodyBot - 6, bodyW * 2 + 2, 5);
      c.fillStyle = botGrad;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, bodyBot + 4, cx - bodyW, hwBot);
      c.quadraticCurveTo(cx - bodyW / 2, hwBot + 2, cx - 2, hwBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 3, cx, bodyBot + 3);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 3);
      c.quadraticCurveTo(cx + 1, bodyBot + 3, cx + 2, hwBot);
      c.quadraticCurveTo(cx + bodyW / 2, hwBot + 2, cx + bodyW, hwBot);
      c.quadraticCurveTo(cx + bodyW + 2, bodyBot + 4, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Cuffs
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx - bodyW, hwBot - 1); c.lineTo(cx - 2, hwBot - 1); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, hwBot - 1); c.lineTo(cx + bodyW, hwBot - 1); c.stroke();
      _garmentShade(c, cx, bodyBot, bodyW, hwBot - bodyBot);
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 3); c.stroke();
      break;
    }
    case 'wide_leg': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 4, midLeg, cx - 12, legBot);
      c.lineTo(cx - 2, legBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 12, legBot);
      c.quadraticCurveTo(cx + bodyW + 4, midLeg, cx + bodyW + 2, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Crease lines
      c.strokeStyle = _darken(color, 12); c.lineWidth = 0.3;
      c.beginPath(); c.moveTo(cx - 6, bodyBot + 4); c.lineTo(cx - 7, legBot - 2); c.stroke();
      c.beginPath(); c.moveTo(cx + 6, bodyBot + 4); c.lineTo(cx + 7, legBot - 2); c.stroke();
      // Side seams
      _stitchLine(c, cx - bodyW - 2, bodyBot, cx - 12, legBot, color);
      _stitchLine(c, cx + bodyW + 2, bodyBot, cx + 12, legBot, color);
      break;
    }
    case 'mini_skirt': {
      const miniBot = bodyBot + (kneeY - bodyBot) * 0.3;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 5, (bodyBot + miniBot) / 2, cx - bodyW + 1, miniBot);
      c.quadraticCurveTo(cx, miniBot + 2, cx + bodyW - 1, miniBot);
      c.quadraticCurveTo(cx + bodyW + 5, (bodyBot + miniBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, miniBot - bodyBot);
      // Hem line
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx - bodyW + 1, miniBot); c.quadraticCurveTo(cx, miniBot + 2, cx + bodyW - 1, miniBot); c.stroke();
      // Subtle fold
      c.save(); c.strokeStyle = _darken(color, 18); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      c.beginPath(); c.moveTo(cx, bodyBot); c.quadraticCurveTo(cx + 1, (bodyBot + miniBot) / 2, cx, miniBot - 2); c.stroke();
      c.restore();
      break;
    }
    case 'joggers': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, midLeg, cx - 8, legBot - 2);
      c.quadraticCurveTo(cx - 6, legBot, cx - 4, legBot - 2);
      c.lineTo(cx - 2, legBot - 2);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot - 2);
      c.lineTo(cx + 4, legBot - 2);
      c.quadraticCurveTo(cx + 6, legBot, cx + 8, legBot - 2);
      c.quadraticCurveTo(cx + bodyW + 2, midLeg, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      // Ankle cuffs
      c.fillStyle = _darken(color, 18);
      c.fillRect(cx - 8, legBot - 4, 6, 3);
      c.fillRect(cx + 2, legBot - 4, 6, 3);
      // Side stripe
      c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(cx - bodyW, bodyBot); c.lineTo(cx - 8, legBot - 3); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW, bodyBot); c.lineTo(cx + 8, legBot - 3); c.stroke();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Drawstring
      c.save(); c.strokeStyle = _darken(color, 22); c.lineWidth = 0.4; c.globalAlpha = 0.5;
      c.beginPath(); c.moveTo(cx - 2, bodyBot - 1);
      c.quadraticCurveTo(cx - 3, bodyBot + 3, cx - 2, bodyBot + 6); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, bodyBot - 1);
      c.quadraticCurveTo(cx + 3, bodyBot + 3, cx + 2, bodyBot + 6); c.stroke();
      c.restore();
      break;
    }
    case 'pencil_skirt': {
      const penBot = bodyBot + (kneeY - bodyBot) * 0.8;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, (bodyBot + penBot) / 2, cx - bodyW + 2, penBot);
      c.quadraticCurveTo(cx, penBot + 2, cx + bodyW - 2, penBot);
      c.quadraticCurveTo(cx + bodyW + 2, (bodyBot + penBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, penBot - bodyBot);
      // Back slit
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, penBot); c.lineTo(cx, penBot - 6); c.stroke();
      // Side seam detail
      _stitchLine(c, cx - bodyW + 2, bodyBot, cx - bodyW + 2, penBot - 1, color);
      _stitchLine(c, cx + bodyW - 2, bodyBot, cx + bodyW - 2, penBot - 1, color);
      // Waistband
      c.fillStyle = _darken(color, 15);
      c.fillRect(cx - bodyW - 1, bodyBot - 4, bodyW * 2 + 2, 3);
      c.fillStyle = botGrad;
      break;
    }
    case 'culottes': {
      const culBot = bodyBot + (kneeY - bodyBot) * 0.55;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 6, (bodyBot + culBot) / 2, cx - bodyW - 2, culBot);
      c.lineTo(cx - 2, culBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 4, cx, bodyBot + 3);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 3);
      c.quadraticCurveTo(cx + 1, bodyBot + 4, cx + 2, culBot);
      c.lineTo(cx + bodyW + 2, culBot);
      c.quadraticCurveTo(cx + bodyW + 6, (bodyBot + culBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Fold lines
      _garmentShade(c, cx, bodyBot, bodyW, culBot - bodyBot);
      _drawFold(c, cx - 5, (bodyBot + culBot) / 2, 4, _darken(color, 12));
      _drawFold(c, cx + 5, (bodyBot + culBot) / 2, 4, _darken(color, 12));
      // Hem stitch
      _stitchLine(c, cx - bodyW - 2, culBot - 1, cx - 2, culBot - 1, color);
      _stitchLine(c, cx + 2, culBot - 1, cx + bodyW + 2, culBot - 1, color);
      break;
    }
    case 'leather_pants': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 1, midLeg, cx - 7, legBot);
      c.lineTo(cx - 2, legBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 7, legBot);
      c.quadraticCurveTo(cx + bodyW + 1, midLeg, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Shine highlight
      _garmentHighlight(c, cx - 4, bodyBot + 6, 2, midLeg - bodyBot - 10);
      _garmentHighlight(c, cx + 4, bodyBot + 6, 2, midLeg - bodyBot - 10);
      // Seam
      _drawSeam(c, cx, bodyBot, cx, bodyBot + 4, _darken(color, 15));
      // Side seam stitching
      _stitchLine(c, cx - bodyW, bodyBot, cx - 7, legBot, color);
      _stitchLine(c, cx + bodyW, bodyBot, cx + 7, legBot, color);
      break;
    }
    case 'overalls': {
      // Pant legs
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, midLeg, cx - 8, legBot);
      c.lineTo(cx - 2, legBot); c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 8, legBot); c.quadraticCurveTo(cx + bodyW + 2, midLeg, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Bib
      const { bodyTop } = M(x, y, w, h);
      c.fillStyle = botGrad;
      c.fillRect(cx - bodyW + 2, bodyTop + 6, bodyW * 2 - 4, bodyBot - bodyTop - 4);
      // Straps
      c.strokeStyle = color; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx - bodyW + 3, bodyTop + 6); c.lineTo(cx - 3, bodyTop - 2); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 3, bodyTop + 6); c.lineTo(cx + 3, bodyTop - 2); c.stroke();
      // Pocket
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.strokeRect(cx - 3, bodyBot - 14, 6, 5);
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Stitch lines on legs
      _stitchLine(c, cx - 5, bodyBot + 6, cx - 5, legBot - 1, color);
      _stitchLine(c, cx + 5, bodyBot + 6, cx + 5, legBot - 1, color);
      // Strap buttons
      c.save(); c.fillStyle = _darken(color, 25); c.globalAlpha = 0.6;
      c.beginPath(); c.arc(cx - 3, bodyTop, 1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + 3, bodyTop, 1, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'wrap_skirt': {
      const wrapBot = bodyBot + (kneeY - bodyBot) * 0.65;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 8, (bodyBot + wrapBot) / 2, cx - bodyW + 2, wrapBot);
      c.quadraticCurveTo(cx, wrapBot + 3, cx + bodyW - 2, wrapBot);
      c.quadraticCurveTo(cx + bodyW + 8, (bodyBot + wrapBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, wrapBot - bodyBot);
      // Wrap overlap line
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx + 2, bodyBot); c.quadraticCurveTo(cx - 3, (bodyBot + wrapBot) / 2, cx + 1, wrapBot - 2); c.stroke();
      // Fold detail at overlap
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.25;
      c.beginPath(); c.moveTo(cx - 3, bodyBot + 4); c.quadraticCurveTo(cx - 5, (bodyBot + wrapBot) / 2, cx - 2, wrapBot - 3); c.stroke();
      c.restore();
      // Hem stitch
      _stitchLine(c, cx - bodyW + 2, wrapBot - 1, cx + bodyW - 2, wrapBot - 1, color);
      break;
    }
    case 'palazzo': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 6, midLeg, cx - 14, legBot);
      c.lineTo(cx - 2, legBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 14, legBot);
      c.quadraticCurveTo(cx + bodyW + 6, midLeg, cx + bodyW + 2, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Soft fold lines
      c.save(); c.strokeStyle = _darken(color, 14); c.lineWidth = 0.3; c.globalAlpha = 0.25;
      for (let f = -2; f <= 2; f++) {
        c.beginPath(); c.moveTo(cx + f * 3, bodyBot + 4); c.quadraticCurveTo(cx + f * 3.5, midLeg, cx + f * 4, legBot - 3); c.stroke();
      }
      c.restore();
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 4); c.stroke();
      break;
    }
    case 'bike_shorts': {
      const bsBot = bodyBot + (kneeY - bodyBot) * 0.35;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 1, bodyBot + 4, cx - bodyW + 1, bsBot);
      c.quadraticCurveTo(cx - bodyW / 2, bsBot + 1, cx - 2, bsBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 4, cx, bodyBot + 3);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 3);
      c.quadraticCurveTo(cx + 1, bodyBot + 4, cx + 2, bsBot);
      c.quadraticCurveTo(cx + bodyW / 2, bsBot + 1, cx + bodyW - 1, bsBot);
      c.quadraticCurveTo(cx + bodyW + 1, bodyBot + 4, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, bsBot - bodyBot);
      // Side seams
      _stitchLine(c, cx - bodyW, bodyBot, cx - bodyW + 1, bsBot - 1, color);
      _stitchLine(c, cx + bodyW, bodyBot, cx + bodyW - 1, bsBot - 1, color);
      // Highlight
      _garmentHighlight(c, cx - 3, bodyBot + 2, 2, bsBot - bodyBot - 4);
      _garmentHighlight(c, cx + 3, bodyBot + 2, 2, bsBot - bodyBot - 4);
      break;
    }
    case 'tutu': {
      const tutuBot = bodyBot + (kneeY - bodyBot) * 0.45;
      c.save(); c.globalAlpha = 0.6;
      for (let layer = 0; layer < 4; layer++) {
        const lBot = tutuBot - layer * 2;
        const spread = 4 + layer * 3;
        c.beginPath();
        c.moveTo(cx - bodyW - layer, bodyBot - 2 + layer * 2);
        c.quadraticCurveTo(cx - bodyW - spread, (bodyBot + lBot) / 2, cx - bodyW + 2, lBot);
        c.quadraticCurveTo(cx, lBot + 2, cx + bodyW - 2, lBot);
        c.quadraticCurveTo(cx + bodyW + spread, (bodyBot + lBot) / 2, cx + bodyW + layer, bodyBot - 2 + layer * 2);
        c.closePath(); c.fill();
      }
      c.restore();
      // Waistband
      c.fillStyle = _darken(color, 20);
      c.fillRect(cx - bodyW, bodyBot - 4, bodyW * 2, 3);
      // Sparkle dots on tulle
      c.save(); c.fillStyle = '#fff'; c.globalAlpha = 0.15;
      for (let i = 0; i < 8; i++) {
        const sx = cx + (Math.sin(i * 2.3) * bodyW * 0.8);
        const sy = bodyBot + 2 + (i * (tutuBot - bodyBot - 4) / 8);
        c.beginPath(); c.arc(sx, sy, 0.4, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      break;
    }
    case 'harem_pants': {
      const haremDrop = (bodyBot + legBot) / 2 + 5;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 4, haremDrop, cx - 6, legBot - 2);
      c.quadraticCurveTo(cx - 4, legBot, cx - 2, legBot - 2);
      c.quadraticCurveTo(cx, haremDrop + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx, haremDrop + 6, cx + 2, legBot - 2);
      c.quadraticCurveTo(cx + 4, legBot, cx + 6, legBot - 2);
      c.quadraticCurveTo(cx + bodyW + 4, haremDrop, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Ankle cuffs
      c.fillStyle = _darken(color, 15);
      c.fillRect(cx - 7, legBot - 4, 5, 3);
      c.fillRect(cx + 2, legBot - 4, 5, 3);
      // Fabric folds on droopy fabric
      _fabricFolds(c, cx - 4, bodyBot + 6, cx - 4, legBot - 6, 3, color);
      _fabricFolds(c, cx + 4, bodyBot + 6, cx + 4, legBot - 6, 3, color);
      break;
    }
    case 'paperbag': {
      // Paperbag waist pants — gathered waist, tapered legs
      c.fillStyle = _darken(color, 15);
      // Gathered waistband
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 6);
      for (let g = 0; g < 6; g++) {
        const gx = cx - bodyW - 2 + g * ((bodyW * 2 + 4) / 6);
        c.quadraticCurveTo(gx + 3, bodyBot - 9, gx + ((bodyW * 2 + 4) / 6), bodyBot - 6);
      }
      c.lineTo(cx + bodyW + 2, bodyBot - 3);
      c.lineTo(cx - bodyW - 2, bodyBot - 3);
      c.closePath(); c.fill();
      c.fillStyle = botGrad;
      // Tapered legs
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 2, midLeg, cx - 7, legBot);
      c.lineTo(cx - 2, legBot); c.quadraticCurveTo(cx - 1, bodyBot + 4, cx, bodyBot + 3);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 3);
      c.quadraticCurveTo(cx + 1, bodyBot + 4, cx + 2, legBot);
      c.lineTo(cx + 7, legBot); c.quadraticCurveTo(cx + bodyW + 2, midLeg, cx + bodyW + 1, bodyBot - 3);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Belt/tie
      _beltLine(c, cx, bodyBot - 4, bodyW, color, false);
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 3); c.stroke();
      break;
    }
    case 'flared_skirt': {
      const flBot = bodyBot + (kneeY - bodyBot) * 0.7;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 12, (bodyBot + flBot) / 2, cx - bodyW + 4, flBot);
      c.quadraticCurveTo(cx, flBot + 4, cx + bodyW - 4, flBot);
      c.quadraticCurveTo(cx + bodyW + 12, (bodyBot + flBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, flBot - bodyBot);
      // Fold lines with shadow
      c.save(); c.strokeStyle = _darken(color, 18); c.lineWidth = 0.35; c.globalAlpha = 0.25;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i * 3.5, bodyBot);
        c.quadraticCurveTo(cx + i * 4.5, (bodyBot + flBot) / 2, cx + i * 4, flBot - 2);
        c.stroke();
      }
      c.restore();
      // Hem stitch
      _stitchLine(c, cx - bodyW + 4, flBot - 1, cx + bodyW - 4, flBot - 1, color);
      break;
    }
    case 'track_pants': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, midLeg, cx - 8, legBot);
      c.lineTo(cx - 2, legBot); c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, legBot);
      c.lineTo(cx + 8, legBot); c.quadraticCurveTo(cx + bodyW + 2, midLeg, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Side stripes
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx - bodyW - 1, bodyBot); c.lineTo(cx - 8, legBot); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW + 1, bodyBot); c.lineTo(cx + 8, legBot); c.stroke();
      _garmentShade(c, cx, bodyBot, bodyW, legBot - bodyBot);
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 4); c.stroke();
      // Elastic cuffs
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
      c.beginPath(); c.ellipse(cx - 5, legBot - 1, 4, 1.5, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(cx + 5, legBot - 1, 4, 1.5, 0, 0, Math.PI * 2); c.stroke();
      break;
    }
    case 'layered_skirt': {
      const lsBot = bodyBot + (kneeY - bodyBot) * 0.65;
      for (let layer = 0; layer < 3; layer++) {
        const lTop = bodyBot - 2 + layer * ((lsBot - bodyBot + 2) / 3);
        const lBot = bodyBot - 2 + (layer + 1) * ((lsBot - bodyBot + 2) / 3);
        const spread = 3 + layer * 3;
        c.beginPath();
        c.moveTo(cx - bodyW - layer * 2, lTop);
        c.quadraticCurveTo(cx - bodyW - spread, (lTop + lBot) / 2, cx - bodyW - layer * 2 + 2, lBot);
        c.quadraticCurveTo(cx, lBot + 2, cx + bodyW + layer * 2 - 2, lBot);
        c.quadraticCurveTo(cx + bodyW + spread, (lTop + lBot) / 2, cx + bodyW + layer * 2, lTop);
        c.closePath(); c.fill();
      }
      // Layer edge highlights
      c.save(); c.strokeStyle = _lighten(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let layer = 0; layer < 3; layer++) {
        const lBot = bodyBot - 2 + (layer + 1) * ((lsBot - bodyBot + 2) / 3);
        c.beginPath();
        c.moveTo(cx - bodyW - layer * 2 + 2, lBot);
        c.quadraticCurveTo(cx, lBot + 2, cx + bodyW + layer * 2 - 2, lBot);
        c.stroke();
      }
      c.restore();
      break;
    }
    case 'cargo_shorts': {
      const csBot = bodyBot + (kneeY - bodyBot) * 0.35;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 2, bodyBot + 4, cx - bodyW - 1, csBot);
      c.quadraticCurveTo(cx - bodyW / 2, csBot + 2, cx - 2, csBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 4, cx, bodyBot + 3);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx, bodyBot + 3);
      c.quadraticCurveTo(cx + 1, bodyBot + 4, cx + 2, csBot);
      c.quadraticCurveTo(cx + bodyW / 2, csBot + 2, cx + bodyW + 1, csBot);
      c.quadraticCurveTo(cx + bodyW + 2, bodyBot + 4, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Cargo pockets
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
      c.strokeRect(cx - bodyW + 1, bodyBot + 2, 4, 4);
      c.strokeRect(cx + bodyW - 5, bodyBot + 2, 4, 4);
      _garmentShade(c, cx, bodyBot, bodyW, csBot - bodyBot);
      // Pocket flap buttons
      _drawButton(c, cx - bodyW + 3, bodyBot + 3, 0.4, _darken(color, 25));
      _drawButton(c, cx + bodyW - 3, bodyBot + 3, 0.4, _darken(color, 25));
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 3); c.stroke();
      break;
    }
    case 'maxi_skirt': {
      const mxBot = legBot + 5;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 14, (bodyBot + mxBot) / 2, cx - bodyW + 4, mxBot);
      c.quadraticCurveTo(cx, mxBot + 3, cx + bodyW - 4, mxBot);
      c.quadraticCurveTo(cx + bodyW + 14, (bodyBot + mxBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyBot, bodyW, mxBot - bodyBot);
      // Fold lines with shadow
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.25;
      for (let f = -2; f <= 2; f++) {
        c.beginPath(); c.moveTo(cx + f * 4, bodyBot); c.quadraticCurveTo(cx + f * 5, (bodyBot + mxBot) / 2, cx + f * 4.5, mxBot - 3); c.stroke();
      }
      c.restore();
      // Hem detail scallops
      c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let hx = cx - bodyW + 4; hx < cx + bodyW - 2; hx += 3) {
        c.beginPath(); c.arc(hx, mxBot - 1, 1.5, Math.PI, 0); c.stroke();
      }
      c.restore();
      break;
    }
  }
}

BOTTOM_DEFS.forEach(d => {
  defItem('bottom_' + d.id, d.name, 'bottom', d.tags, d.colors,
    (c, char, x, y, w, h, colIdx) => {
      drawBottom(d.id, c, char, x, y, w, h, d.colors[colIdx % d.colors.length][0]);
    });
});

/* ── Dresses ── */
const DRESS_DEFS = [
  { id:'sundress',       name:'Sundress',       tags:['casual','summer','cute'],       colors:[['#f39c12'],['#e84393'],['#87ceeb'],['#2ecc71']] },
  { id:'ball_gown',      name:'Ball Gown',      tags:['elegant','formal','fancy','royal'], colors:[['#6c3483'],['#c0392b'],['#1a5276'],['#f4d03f']] },
  { id:'cocktail_dress', name:'Cocktail Dress', tags:['elegant','fancy','cool'],       colors:[['#2c3e50'],['#c0392b'],['#e84393'],['#1abc9c']] },
  { id:'kimono_dress',   name:'Kimono Dress',   tags:['elegant','formal'],             colors:[['#e74c3c'],['#2e86c1'],['#f8c471'],['#27ae60']] },
  { id:'fairy_dress',    name:'Fairy Dress',    tags:['magic','fantasy','cute'],        colors:[['#d4a5e5'],['#a5d4e5'],['#f8b4c8'],['#c8e6c9']] },
  { id:'wrap_dress',     name:'Wrap Dress',     tags:['casual','elegant'],              colors:[['#2ecc71'],['#e84393'],['#3498db'],['#f39c12']] },
  { id:'maxi_dress',     name:'Maxi Dress',     tags:['casual','summer','elegant'],     colors:[['#e67e22'],['#2ecc71'],['#e84393'],['#87ceeb']] },
  { id:'shirt_dress',    name:'Shirt Dress',    tags:['casual','smart'],                colors:[['#3498db'],['#fff'],['#2c3e50'],['#f5cba7']] },
  { id:'bodycon',        name:'Bodycon Dress',  tags:['elegant','fancy','cool'],        colors:[['#c0392b'],['#2c3e50'],['#8e44ad'],['#e84393']] },
  { id:'pinafore',       name:'Pinafore Dress', tags:['casual','cute'],                 colors:[['#2e4057'],['#922b21'],['#1e8449'],['#f39c12']] },
  { id:'slip_dress',     name:'Slip Dress',     tags:['elegant','cool'],                colors:[['#c0392b'],['#2c3e50'],['#d4a5e5'],['#f8b4c8']] },
  { id:'a_line',         name:'A-Line Dress',   tags:['casual','elegant'],              colors:[['#e74c3c'],['#3498db'],['#27ae60'],['#f39c12']] },
  { id:'mermaid_gown',   name:'Mermaid Gown',   tags:['elegant','formal','fancy'],      colors:[['#1abc9c'],['#6c3483'],['#c0392b'],['#f4d03f']] },
  { id:'babydoll',       name:'Babydoll Dress', tags:['cute','casual'],                 colors:[['#f8b4c8'],['#a5d4e5'],['#f5cba7'],['#c8e6c9']] },
  { id:'warrior_tunic',  name:'Warrior Tunic',  tags:['medieval','warrior','cool'],     colors:[['#5d4037'],['#8b0000'],['#2c3e50'],['#6b6b3a']] },
  { id:'qipao',          name:'Qipao',          tags:['elegant','formal'],              colors:[['#e74c3c'],['#f4d03f'],['#1abc9c'],['#2c3e50']] },
  { id:'tiered_dress',   name:'Tiered Dress',   tags:['casual','cute','summer'],        colors:[['#f39c12'],['#e84393'],['#87ceeb'],['#2ecc71']] },
  { id:'off_shoulder_dress',name:'Off-Shoulder Dress',tags:['elegant','fancy'],         colors:[['#8e44ad'],['#c0392b'],['#2c3e50'],['#1abc9c']] },
  { id:'witchy_gown',    name:'Witchy Gown',    tags:['magic','cool','fantasy'],        colors:[['#2c3e50'],['#6c3483'],['#1a1a2e'],['#4a0e4a']] },
  { id:'tunic_dress',    name:'Tunic Dress',    tags:['casual','simple'],               colors:[['#f5cba7'],['#d4a5e5'],['#87ceeb'],['#c8e6c9']] },
  { id:'sweater_dress', name:'Sweater Dress',  tags:['cozy','winter','casual'],        colors:[['#c0392b'],['#2c3e50'],['#f5e6cc'],['#8e44ad']] },
  { id:'skater_dress',  name:'Skater Dress',   tags:['casual','cute'],                 colors:[['#e84393'],['#3498db'],['#f39c12'],['#2ecc71']] },
  { id:'prom_dress',    name:'Prom Dress',     tags:['formal','fancy','elegant'],      colors:[['#e84393'],['#6c3483'],['#1abc9c'],['#f4d03f']] },
  { id:'cheongsam',     name:'Cheongsam',      tags:['elegant','formal'],              colors:[['#c0392b'],['#2c3e50'],['#f4d03f'],['#1abc9c']] },
  { id:'toga',          name:'Toga Dress',      tags:['elegant','fantasy'],             colors:[['#fff'],['#f5e6cc'],['#d4a5e5'],['#a8d8ea']] },
  { id:'dungaree_dress',name:'Dungaree Dress', tags:['casual','cute'],                 colors:[['#2e4057'],['#8b4513'],['#c0392b'],['#556b2f']] },
  { id:'empire_dress',  name:'Empire Dress',   tags:['elegant','formal'],              colors:[['#6c3483'],['#1abc9c'],['#c0392b'],['#f4d03f']] },
  { id:'shirt_mini',    name:'Shirt Mini',     tags:['casual','cool'],                 colors:[['#3498db'],['#fff'],['#2c3e50'],['#f5cba7']] },
  { id:'halter_dress',  name:'Halter Dress',   tags:['elegant','summer'],              colors:[['#e74c3c'],['#1abc9c'],['#8e44ad'],['#f39c12']] },
];

function drawDress(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY, bodyTop, waistY, bodyBot, bodyW, kneeY, legBot, footY } = M(x, y, w, h);
  const dG = c.createLinearGradient(cx - bodyW, bodyTop, cx + bodyW, kneeY);
  dG.addColorStop(0, _lighten(color, 20));
  dG.addColorStop(0.5, color);
  dG.addColorStop(1, _darken(color, 15));
  c.fillStyle = dG;
  const midY = (bodyTop + bodyBot) / 2;

  switch(style) {
    case 'sundress': {
      // Fitted bodice
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 1, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY,
                      cx - bodyW - 1, waistY + (bodyBot - waistY) * 0.5, cx - bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY,
                      cx + bodyW + 1, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // A-line skirt
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 10, (bodyBot + kneeY) / 2, cx - bodyW + 3, kneeY);
      c.quadraticCurveTo(cx, kneeY + 3, cx + bodyW - 3, kneeY);
      c.quadraticCurveTo(cx + bodyW + 10, (bodyBot + kneeY) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, kneeY - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, kneeY - bodyTop);
      // Straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.8;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.moveTo(cx + s * 3, bodyTop + 4); c.lineTo(cx + s * 4, bodyTop - 3); c.stroke();
      }
      // Dot/flower pattern on skirt
      c.save(); c.fillStyle = 'rgba(255,255,255,0.12)';
      for (let py = bodyBot + 4; py < kneeY - 2; py += 5) {
        for (let px = cx - bodyW + 3; px < cx + bodyW - 2; px += 6) {
          c.beginPath(); c.arc(px + (py % 10 === 0 ? 3 : 0), py, 1, 0, Math.PI * 2); c.fill();
        }
      }
      c.restore();
      // Ruffle hem
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.3;
      for (let hx = cx - bodyW + 3; hx < cx + bodyW - 2; hx += 3) {
        c.beginPath(); c.arc(hx, kneeY - 1, 1.5, Math.PI, 0); c.stroke();
      }
      c.restore();
      break;
    }
    case 'ball_gown': {
      // Fitted bodice
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 5);
      c.bezierCurveTo(cx - bodyW - 3, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.65, waistY, cx - bodyW * 0.5, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY,
                      cx - bodyW - 2, waistY + (bodyBot - waistY) * 0.5, cx - bodyW - 1, bodyBot);
      c.lineTo(cx + bodyW + 1, bodyBot);
      c.bezierCurveTo(cx + bodyW + 2, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.65, waistY, cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY,
                      cx + bodyW + 3, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW + 2, bodyTop + 5);
      c.closePath(); c.fill();
      // Wide ball gown skirt
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 24, (bodyBot + footY) / 2, cx - bodyW - 8, footY + 2);
      c.quadraticCurveTo(cx, footY + 5, cx + bodyW + 8, footY + 2);
      c.quadraticCurveTo(cx + bodyW + 24, (bodyBot + footY) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Neckline
      c.strokeStyle = _darken(color, 22); c.lineWidth = 0.6;
      c.beginPath(); c.arc(cx, bodyTop + 3, 5, 0.3, Math.PI - 0.3); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, footY - bodyTop);
      // Waist sash
      c.fillStyle = _darken(color, 30);
      c.fillRect(cx - bodyW - 1, bodyBot - 4, bodyW * 2 + 2, 3);
      // Waist bow
      c.save(); c.fillStyle = _darken(color, 25);
      c.beginPath(); c.ellipse(cx - 4, bodyBot - 2, 3, 2, -0.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(cx + 4, bodyBot - 2, 3, 2, 0.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx, bodyBot - 2, 1.5, 0, Math.PI * 2); c.fill();
      c.restore();
      // Bodice boning lines
      c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.25; c.globalAlpha = 0.2;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.moveTo(cx + s * bodyW * 0.4, bodyTop + 6); c.lineTo(cx + s * bodyW * 0.4, bodyBot - 5); c.stroke();
      }
      c.restore();
      // Tulle layer hints on skirt
      c.save(); c.strokeStyle = _lighten(color, 12); c.lineWidth = 0.3; c.globalAlpha = 0.15;
      for (let f = -3; f <= 3; f++) {
        c.beginPath(); c.moveTo(cx + f * 5, bodyBot + 2); c.quadraticCurveTo(cx + f * 7, (bodyBot + footY) / 2, cx + f * 6, footY - 2); c.stroke();
      }
      c.restore();
      c.fillStyle = dG;
      break;
    }
    case 'cocktail_dress': {
      // Sleek fitted bodice
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 5);
      c.bezierCurveTo(cx - bodyW, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY,
                      cx - bodyW, waistY + (bodyBot - waistY) * 0.5, cx - bodyW + 1, bodyBot);
      c.lineTo(cx + bodyW - 1, bodyBot);
      c.bezierCurveTo(cx + bodyW, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.65, waistY, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY,
                      cx + bodyW, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW - 1, bodyTop + 5);
      c.closePath(); c.fill();
      // Knee-length pencil skirt
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 3, (bodyBot + kneeY) / 2, cx - bodyW + 1, kneeY);
      c.quadraticCurveTo(cx, kneeY + 3, cx + bodyW - 1, kneeY);
      c.quadraticCurveTo(cx + bodyW + 3, (bodyBot + kneeY) / 2, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, kneeY - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, kneeY - bodyTop);
      // Single strap
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - 2, bodyTop + 5); c.lineTo(cx - 4, bodyTop - 2); c.stroke();
      // Fabric sheen
      c.save(); c.fillStyle = 'rgba(255,255,255,0.06)';
      c.beginPath();
      c.moveTo(cx - 2, bodyTop + 8);
      c.quadraticCurveTo(cx + 1, waistY, cx - 1, kneeY - 3);
      c.quadraticCurveTo(cx + 3, waistY, cx + 1, bodyTop + 8);
      c.closePath(); c.fill();
      c.restore();
      break;
    }
    case 'kimono_dress': {
      const kimBot = footY + 2;
      c.beginPath();
      c.moveTo(cx - bodyW - 5, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 10, (bodyTop + kimBot) / 2, cx - bodyW - 3, kimBot);
      c.quadraticCurveTo(cx, kimBot + 3, cx + bodyW + 3, kimBot);
      c.quadraticCurveTo(cx + bodyW + 10, (bodyTop + kimBot) / 2, cx + bodyW + 5, bodyTop + 2);
      c.closePath(); c.fill();
      // Wide sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 10), bodyTop + 14, 10, 7, s * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      // Obi sash
      c.fillStyle = _darken(color, 30);
      const obiY = waistY - 2;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, obiY);
      c.quadraticCurveTo(cx, obiY + 3, cx + bodyW + 4, obiY);
      c.quadraticCurveTo(cx + bodyW + 4, obiY + 7, cx + bodyW + 3, obiY + 7);
      c.quadraticCurveTo(cx, obiY + 10, cx - bodyW - 3, obiY + 7);
      c.quadraticCurveTo(cx - bodyW - 4, obiY + 7, cx - bodyW - 4, obiY);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, kimBot - bodyTop);
      // Cherry blossom pattern
      c.save(); c.fillStyle = 'rgba(255,200,220,0.2)';
      for (let i = 0; i < 6; i++) {
        const bx = cx + Math.sin(i * 1.8) * bodyW * 0.6;
        const by = bodyBot + 5 + i * ((kimBot - bodyBot - 10) / 6);
        for (let p = 0; p < 5; p++) {
          const a = p * Math.PI * 2 / 5;
          c.beginPath(); c.ellipse(bx + Math.cos(a) * 2, by + Math.sin(a) * 2, 1.2, 0.7, a, 0, Math.PI * 2); c.fill();
        }
      }
      c.restore();
      // Obi bow detail on back
      c.save(); c.fillStyle = _darken(color, 25);
      c.beginPath(); c.ellipse(cx, obiY + 9, 3, 2, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      // V-neckline crossover
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx - 4, bodyTop + 3); c.lineTo(cx, bodyTop + 10); c.lineTo(cx + 4, bodyTop + 3); c.stroke();
      break;
    }
    case 'fairy_dress': {
      // Bodice
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 1, bodyTop + (waistY - bodyTop) * 0.5,
                      cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY,
                      cx - bodyW - 1, waistY + (bodyBot - waistY) * 0.5, cx - bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, waistY + (bodyBot - waistY) * 0.5,
                      cx + bodyW * 0.7, waistY, cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY,
                      cx + bodyW + 1, bodyTop + (waistY - bodyTop) * 0.5, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Layered petal skirt
      c.save(); c.globalAlpha = 0.7;
      for (let layer = 0; layer < 3; layer++) {
        const layerBot = bodyBot + (footY - bodyBot) * (0.5 + layer * 0.2);
        const spread = 6 + layer * 5;
        c.beginPath();
        c.moveTo(cx - bodyW - layer * 2, bodyBot - 2 + layer * 4);
        c.quadraticCurveTo(cx - bodyW - spread, (bodyBot + layerBot) / 2, cx - bodyW + 2 + layer, layerBot);
        c.quadraticCurveTo(cx, layerBot + 3, cx + bodyW - 2 - layer, layerBot);
        c.quadraticCurveTo(cx + bodyW + spread, (bodyBot + layerBot) / 2, cx + bodyW + layer * 2, bodyBot - 2 + layer * 4);
        c.closePath(); c.fill();
      }
      c.restore();
      _garmentShade(c, cx, bodyTop, bodyW, footY - bodyTop);
      // More sparkles
      c.fillStyle = 'rgba(255,255,255,0.3)';
      const now = Date.now() / 800;
      for (let i = 0; i < 8; i++) {
        const sx = cx + Math.sin(now + i * 1.5) * (bodyW + 4);
        const sy = bodyBot + 5 + Math.cos(now + i * 2.1) * (footY - bodyBot - 10) * 0.5;
        c.beginPath(); c.arc(sx, sy, 0.8 + (i % 3) * 0.3, 0, Math.PI * 2); c.fill();
      }
      // Petal scalloping on each layer edge
      c.save(); c.strokeStyle = _lighten(color, 20); c.lineWidth = 0.3; c.globalAlpha = 0.25;
      for (let layer = 0; layer < 3; layer++) {
        const layerBot = bodyBot + (footY - bodyBot) * (0.5 + layer * 0.2);
        for (let hx = cx - bodyW + 2; hx < cx + bodyW - 2; hx += 4) {
          c.beginPath(); c.arc(hx + 2, layerBot - 1, 2, Math.PI, 0); c.stroke();
        }
      }
      c.restore();
      break;
    }
    case 'wrap_dress': {
      // Fitted bodice with V-neckline
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 1, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.lineTo(cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW + 1, waistY * 0.5 + bodyTop * 0.5, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // A-line skirt
      const wdBot = kneeY + (footY - kneeY) * 0.3;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, waistY);
      c.quadraticCurveTo(cx - bodyW - 12, (waistY + wdBot) / 2, cx - bodyW + 2, wdBot);
      c.quadraticCurveTo(cx, wdBot + 3, cx + bodyW - 2, wdBot);
      c.quadraticCurveTo(cx + bodyW + 12, (waistY + wdBot) / 2, cx + bodyW + 1, waistY);
      c.closePath(); c.fill();
      // V-neckline
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(cx - 3, bodyTop + 4); c.lineTo(cx, bodyTop + 10); c.lineTo(cx + 3, bodyTop + 4); c.stroke();
      // Wrap line
      c.beginPath(); c.moveTo(cx, bodyTop + 10); c.quadraticCurveTo(cx - 4, waistY, cx + 2, wdBot - 4); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, wdBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, wdBot - bodyTop);
      break;
    }
    case 'maxi_dress': {
      // Bodice
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 1, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.7, waistY, cx - bodyW * 0.6, waistY);
      c.lineTo(cx + bodyW * 0.6, waistY);
      c.bezierCurveTo(cx + bodyW * 0.7, waistY, cx + bodyW + 1, waistY * 0.5 + bodyTop * 0.5, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Floor-length skirt
      c.beginPath();
      c.moveTo(cx - bodyW - 1, waistY);
      c.quadraticCurveTo(cx - bodyW - 14, (waistY + footY) / 2, cx - bodyW + 4, footY + 2);
      c.quadraticCurveTo(cx, footY + 4, cx + bodyW - 4, footY + 2);
      c.quadraticCurveTo(cx + bodyW + 14, (waistY + footY) / 2, cx + bodyW + 1, waistY);
      c.closePath(); c.fill();
      // Straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.8;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.moveTo(cx + s * 3, bodyTop + 4); c.lineTo(cx + s * 4, bodyTop - 3); c.stroke();
      }
      _garmentShade(c, cx, bodyTop, bodyW, footY - bodyTop);
      // Fold lines with shadow
      c.save(); c.strokeStyle = _darken(color, 14); c.lineWidth = 0.3; c.globalAlpha = 0.25;
      for (let f = -2; f <= 2; f++) {
        c.beginPath(); c.moveTo(cx + f * 4, waistY + 3); c.quadraticCurveTo(cx + f * 5, (waistY + footY) / 2, cx + f * 4.5, footY - 4); c.stroke();
      }
      c.restore();
      break;
    }
    case 'shirt_dress': {
      // Full body shirt dress to knee
      const sdBot = kneeY + 5;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 2, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY, cx - bodyW - 4, (waistY + sdBot) / 2, cx - bodyW, sdBot);
      c.quadraticCurveTo(cx, sdBot + 3, cx + bodyW, sdBot);
      c.bezierCurveTo(cx + bodyW + 4, (waistY + sdBot) / 2, cx + bodyW * 0.65, waistY, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW + 2, waistY * 0.5 + bodyTop * 0.5, cx + bodyW + 1, bodyTop + 2);
      c.closePath(); c.fill();
      // Collar
      c.fillStyle = _lighten(color, 25);
      c.beginPath(); c.moveTo(cx - 4, bodyTop + 2); c.lineTo(cx - 6, bodyTop + 6); c.lineTo(cx, bodyTop + 4);
      c.lineTo(cx + 6, bodyTop + 6); c.lineTo(cx + 4, bodyTop + 2); c.closePath(); c.fill();
      // Buttons
      for (let b = bodyTop + 10; b < sdBot - 5; b += 8) { _drawButton(c, cx, b, 0.8, _darken(color, 15)); }
      // Belt
      c.fillStyle = _darken(color, 25); c.fillRect(cx - bodyW, waistY - 1, bodyW * 2, 2.5);
      _garmentShade(c, cx, bodyTop, bodyW, sdBot - bodyTop);
      // Placket stitch lines
      _stitchLine(c, cx - 1, bodyTop + 10, cx - 1, sdBot - 5, color);
      _stitchLine(c, cx + 1, bodyTop + 10, cx + 1, sdBot - 5, color);
      c.fillStyle = dG;
      break;
    }
    case 'bodycon': {
      // Tight-fitting from bodice to knee
      const bcBot = kneeY + 3;
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 5);
      c.bezierCurveTo(cx - bodyW, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.6, waistY, cx - bodyW * 0.5, waistY);
      c.bezierCurveTo(cx - bodyW * 0.6, waistY, cx - bodyW, bodyBot, cx - bodyW + 1, bodyBot);
      c.quadraticCurveTo(cx - bodyW, (bodyBot + bcBot) / 2, cx - bodyW + 3, bcBot);
      c.quadraticCurveTo(cx, bcBot + 2, cx + bodyW - 3, bcBot);
      c.quadraticCurveTo(cx + bodyW, (bodyBot + bcBot) / 2, cx + bodyW - 1, bodyBot);
      c.bezierCurveTo(cx + bodyW, bodyBot, cx + bodyW * 0.6, waistY, cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.6, waistY, cx + bodyW, waistY * 0.5 + bodyTop * 0.5, cx + bodyW - 1, bodyTop + 5);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, bcBot - bodyTop);
      // Shine
      _garmentHighlight(c, cx - 2, bodyTop + 8, 3, bodyBot - bodyTop - 12);
      // Side seams
      _stitchLine(c, cx - bodyW + 1, bodyTop + 8, cx - bodyW + 3, bcBot - 2, color);
      _stitchLine(c, cx + bodyW - 1, bodyTop + 8, cx + bodyW - 3, bcBot - 2, color);
      break;
    }
    case 'pinafore': {
      // Bib + A-line skirt over an implied blouse
      const pfBot = kneeY;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 6);
      c.lineTo(cx - bodyW - 6, (bodyTop + pfBot) / 2);
      c.quadraticCurveTo(cx - bodyW - 8, pfBot, cx - bodyW + 2, pfBot);
      c.quadraticCurveTo(cx, pfBot + 3, cx + bodyW - 2, pfBot);
      c.quadraticCurveTo(cx + bodyW + 8, pfBot, cx + bodyW + 6, (bodyTop + pfBot) / 2);
      c.lineTo(cx + bodyW + 1, bodyTop + 6);
      c.closePath(); c.fill();
      // Straps
      c.strokeStyle = color; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(cx - bodyW + 3, bodyTop + 6); c.lineTo(cx - 3, bodyTop - 2); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 3, bodyTop + 6); c.lineTo(cx + 3, bodyTop - 2); c.stroke();
      // Front pocket
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.strokeRect(cx - 4, waistY + 2, 8, 6);
      _garmentShade(c, cx, bodyTop, bodyW, pfBot - bodyTop);
      // Strap buttons
      c.save(); c.fillStyle = _darken(color, 25); c.globalAlpha = 0.6;
      c.beginPath(); c.arc(cx - 3, bodyTop, 1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + 3, bodyTop, 1, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'slip_dress': {
      // Simple fitted to mid-calf
      const slBot = kneeY + (footY - kneeY) * 0.5;
      c.beginPath();
      c.moveTo(cx - bodyW + 2, bodyTop + 5);
      c.bezierCurveTo(cx - bodyW + 1, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY, cx - bodyW, bodyBot, cx - bodyW, bodyBot);
      c.quadraticCurveTo(cx - bodyW - 4, (bodyBot + slBot) / 2, cx - bodyW + 3, slBot);
      c.quadraticCurveTo(cx, slBot + 3, cx + bodyW - 3, slBot);
      c.quadraticCurveTo(cx + bodyW + 4, (bodyBot + slBot) / 2, cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW, bodyBot, cx + bodyW * 0.65, waistY, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW - 1, waistY * 0.5 + bodyTop * 0.5, cx + bodyW - 2, bodyTop + 5);
      c.closePath(); c.fill();
      // Thin straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(cx - 3, bodyTop + 5); c.lineTo(cx - 4, bodyTop - 3); c.stroke();
      c.beginPath(); c.moveTo(cx + 3, bodyTop + 5); c.lineTo(cx + 4, bodyTop - 3); c.stroke();
      // Lace hem
      c.strokeStyle = _lighten(color, 15); c.lineWidth = 0.3;
      for (let lx = cx - bodyW + 3; lx < cx + bodyW - 3; lx += 3) {
        c.beginPath(); c.arc(lx, slBot, 1.5, 0, Math.PI); c.stroke();
      }
      break;
    }
    case 'a_line': {
      // Fitted bodice, flared skirt
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.bezierCurveTo(cx - bodyW - 1, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.lineTo(cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW + 1, waistY * 0.5 + bodyTop * 0.5, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx - bodyW - 1, waistY);
      c.quadraticCurveTo(cx - bodyW - 10, (waistY + kneeY) / 2, cx - bodyW + 3, kneeY + 5);
      c.quadraticCurveTo(cx, kneeY + 8, cx + bodyW - 3, kneeY + 5);
      c.quadraticCurveTo(cx + bodyW + 10, (waistY + kneeY) / 2, cx + bodyW + 1, waistY);
      c.closePath(); c.fill();
      // Waistline seam
      _drawSeam(c, cx - bodyW, waistY, cx + bodyW, waistY, _darken(color, 15));
      _garmentShade(c, cx, bodyTop, bodyW, kneeY - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, kneeY - bodyTop);
      break;
    }
    case 'mermaid_gown': {
      // Fitted from bodice to knee, then flare
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 5);
      c.bezierCurveTo(cx - bodyW, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.6, waistY, cx - bodyW * 0.5, waistY);
      c.bezierCurveTo(cx - bodyW * 0.6, waistY, cx - bodyW, bodyBot, cx - bodyW, bodyBot);
      c.quadraticCurveTo(cx - bodyW - 1, kneeY, cx - bodyW + 2, kneeY);
      // Flare out from knee
      c.quadraticCurveTo(cx - bodyW - 10, (kneeY + footY) / 2, cx - bodyW - 4, footY + 2);
      c.quadraticCurveTo(cx, footY + 5, cx + bodyW + 4, footY + 2);
      c.quadraticCurveTo(cx + bodyW + 10, (kneeY + footY) / 2, cx + bodyW - 2, kneeY);
      c.quadraticCurveTo(cx + bodyW + 1, kneeY, cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW, bodyBot, cx + bodyW * 0.6, waistY, cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.6, waistY, cx + bodyW, waistY * 0.5 + bodyTop * 0.5, cx + bodyW, bodyTop + 5);
      c.closePath(); c.fill();
      // Neckline
      c.strokeStyle = _darken(color, 22); c.lineWidth = 0.6;
      c.beginPath(); c.arc(cx, bodyTop + 4, 5, 0.3, Math.PI - 0.3); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, footY - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, kneeY - bodyTop);
      // Fabric sheen on fitted section
      c.save(); c.fillStyle = 'rgba(255,255,255,0.05)';
      c.beginPath();
      c.moveTo(cx - 1, bodyTop + 8);
      c.quadraticCurveTo(cx + 2, waistY, cx, kneeY - 3);
      c.quadraticCurveTo(cx + 4, waistY, cx + 2, bodyTop + 8);
      c.closePath(); c.fill();
      c.restore();
      break;
    }
    case 'babydoll': {
      // Empire waist with floaty skirt
      const bbTop = bodyTop + (waistY - bodyTop) * 0.35;
      const bbBot = kneeY - 5;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.lineTo(cx - bodyW - 1, bbTop);
      c.lineTo(cx + bodyW + 1, bbTop);
      c.lineTo(cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Floaty skirt
      c.save(); c.globalAlpha = 0.85;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bbTop);
      c.quadraticCurveTo(cx - bodyW - 10, (bbTop + bbBot) / 2, cx - bodyW + 2, bbBot);
      c.quadraticCurveTo(cx, bbBot + 3, cx + bodyW - 2, bbBot);
      c.quadraticCurveTo(cx + bodyW + 10, (bbTop + bbBot) / 2, cx + bodyW + 1, bbTop);
      c.closePath(); c.fill();
      c.restore();
      // Empire seam
      c.fillStyle = _darken(color, 20); c.fillRect(cx - bodyW - 1, bbTop - 1, bodyW * 2 + 2, 2);
      // Straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(cx - 3, bodyTop + 4); c.lineTo(cx - 4, bodyTop - 3); c.stroke();
      c.beginPath(); c.moveTo(cx + 3, bodyTop + 4); c.lineTo(cx + 4, bodyTop - 3); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, bbBot - bodyTop);
      // Fold lines in floaty skirt
      c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.25; c.globalAlpha = 0.2;
      for (let f = -2; f <= 2; f++) {
        c.beginPath(); c.moveTo(cx + f * 3.5, bbTop + 2); c.quadraticCurveTo(cx + f * 4.5, (bbTop + bbBot) / 2, cx + f * 4, bbBot - 2); c.stroke();
      }
      c.restore();
      break;
    }
    case 'warrior_tunic': {
      const wtBot = kneeY + 5;
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 5, (bodyTop + wtBot) / 2, cx - bodyW, wtBot);
      c.quadraticCurveTo(cx, wtBot + 3, cx + bodyW, wtBot);
      c.quadraticCurveTo(cx + bodyW + 5, (bodyTop + wtBot) / 2, cx + bodyW + 2, bodyTop + 2);
      c.closePath(); c.fill();
      // Belt
      c.fillStyle = _darken(color, 30);
      c.fillRect(cx - bodyW - 1, waistY - 1, bodyW * 2 + 2, 3);
      // Belt buckle
      c.strokeStyle = '#f4d03f'; c.lineWidth = 0.8; c.strokeRect(cx - 2, waistY - 1.5, 4, 4);
      _garmentShade(c, cx, bodyTop, bodyW, wtBot - bodyTop);
      // Leather texture
      _fabricTexture(c, cx - bodyW, bodyTop, bodyW * 2, wtBot - bodyTop, 'denim', color);
      // Belt pouches
      for (let s = -1; s <= 1; s += 2) {
        c.save(); c.fillStyle = _darken(color, 20);
        c.fillRect(cx + s * bodyW * 0.5 - 2, waistY + 2, 4, 5);
        c.strokeStyle = _darken(color, 30); c.lineWidth = 0.3;
        c.strokeRect(cx + s * bodyW * 0.5 - 2, waistY + 2, 4, 5);
        c.restore();
      }
      // Hem detail - jagged
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
      for (let hx = cx - bodyW; hx < cx + bodyW; hx += 5) {
        c.beginPath(); c.moveTo(hx, wtBot); c.lineTo(hx + 2.5, wtBot + 3); c.lineTo(hx + 5, wtBot); c.stroke();
      }
      break;
    }
    case 'qipao': {
      const qBot = kneeY + 8;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 1, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.6, waistY, cx - bodyW * 0.5, waistY);
      c.bezierCurveTo(cx - bodyW * 0.6, waistY, cx - bodyW - 1, bodyBot, cx - bodyW, bodyBot);
      c.quadraticCurveTo(cx - bodyW - 2, (bodyBot + qBot) / 2, cx - bodyW + 2, qBot);
      c.quadraticCurveTo(cx, qBot + 2, cx + bodyW - 2, qBot);
      c.quadraticCurveTo(cx + bodyW + 2, (bodyBot + qBot) / 2, cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, bodyBot, cx + bodyW * 0.6, waistY, cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.6, waistY, cx + bodyW + 1, waistY * 0.5 + bodyTop * 0.5, cx + bodyW, bodyTop + 2);
      c.closePath(); c.fill();
      // Mandarin collar
      c.fillStyle = _darken(color, 15);
      c.beginPath();
      c.moveTo(cx - 4, bodyTop + 1); c.quadraticCurveTo(cx - 5, bodyTop - 2, cx - 3, bodyTop - 3);
      c.lineTo(cx + 3, bodyTop - 3); c.quadraticCurveTo(cx + 5, bodyTop - 2, cx + 4, bodyTop + 1);
      c.closePath(); c.fill();
      // Side slit
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx + bodyW - 2, qBot); c.lineTo(cx + bodyW - 1, qBot - 12); c.stroke();
      // Frog buttons
      c.strokeStyle = _darken(color, 25); c.lineWidth = 0.5;
      c.beginPath(); c.arc(cx + 2, bodyTop + 6, 2, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(cx + 2, bodyTop + 12, 2, 0, Math.PI * 2); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, qBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, qBot - bodyTop);
      // Embroidery detail
      c.save(); c.strokeStyle = _lighten(color, 25); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let ey = bodyBot + 3; ey < qBot - 4; ey += 6) {
        c.beginPath(); c.moveTo(cx - 3, ey); c.quadraticCurveTo(cx, ey - 2, cx + 3, ey); c.stroke();
      }
      c.restore();
      c.fillStyle = dG;
      break;
    }
    case 'tiered_dress': {
      // Bodice
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.lineTo(cx - bodyW, bodyBot); c.lineTo(cx + bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyTop + 4); c.closePath(); c.fill();
      // 3 tiers
      const tiers = 3;
      for (let t = 0; t < tiers; t++) {
        const tTop = bodyBot + t * ((kneeY + 5 - bodyBot) / tiers);
        const tBot = bodyBot + (t + 1) * ((kneeY + 5 - bodyBot) / tiers);
        const spread = 4 + t * 4;
        c.fillStyle = t % 2 === 0 ? dG : _lighten(color, 10);
        c.beginPath();
        c.moveTo(cx - bodyW - t * 2, tTop);
        c.quadraticCurveTo(cx - bodyW - spread, (tTop + tBot) / 2, cx - bodyW - t * 2 + 2, tBot);
        c.quadraticCurveTo(cx, tBot + 2, cx + bodyW + t * 2 - 2, tBot);
        c.quadraticCurveTo(cx + bodyW + spread, (tTop + tBot) / 2, cx + bodyW + t * 2, tTop);
        c.closePath(); c.fill();
      }
      // Straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(cx - 3, bodyTop + 4); c.lineTo(cx - 4, bodyTop - 3); c.stroke();
      c.beginPath(); c.moveTo(cx + 3, bodyTop + 4); c.lineTo(cx + 4, bodyTop - 3); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, kneeY - bodyTop);
      // Tier edge stitches
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let t = 0; t < tiers; t++) {
        const tBotE = bodyBot + (t + 1) * ((kneeY + 5 - bodyBot) / tiers);
        for (let hx = cx - bodyW - t * 2 + 2; hx < cx + bodyW + t * 2 - 2; hx += 3) {
          c.beginPath(); c.arc(hx, tBotE - 1, 1.5, Math.PI, 0); c.stroke();
        }
      }
      c.restore();
      break;
    }
    case 'off_shoulder_dress': {
      // Wide neckline bodice
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 8);
      c.bezierCurveTo(cx - bodyW - 4, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.lineTo(cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW + 4, waistY * 0.5 + bodyTop * 0.5, cx + bodyW + 3, bodyTop + 8);
      c.quadraticCurveTo(cx, bodyTop + 5, cx - bodyW - 3, bodyTop + 8);
      c.closePath(); c.fill();
      // Flowing skirt
      const osdBot = footY;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, waistY);
      c.quadraticCurveTo(cx - bodyW - 14, (waistY + osdBot) / 2, cx - bodyW + 4, osdBot);
      c.quadraticCurveTo(cx, osdBot + 3, cx + bodyW - 4, osdBot);
      c.quadraticCurveTo(cx + bodyW + 14, (waistY + osdBot) / 2, cx + bodyW + 1, waistY);
      c.closePath(); c.fill();
      _garmentShade(c, cx, bodyTop, bodyW, osdBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, osdBot - bodyTop);
      // Fold lines
      c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.25; c.globalAlpha = 0.2;
      for (let f = -2; f <= 2; f++) {
        c.beginPath(); c.moveTo(cx + f * 4, waistY + 3); c.quadraticCurveTo(cx + f * 5, (waistY + osdBot) / 2, cx + f * 4.5, osdBot - 4); c.stroke();
      }
      c.restore();
      break;
    }
    case 'witchy_gown': {
      // Floor-length dramatic gown
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 3, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.6, waistY, cx - bodyW * 0.5, waistY);
      c.bezierCurveTo(cx - bodyW * 0.7, waistY, cx - bodyW - 3, bodyBot, cx - bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx - bodyW - 18, (bodyBot + footY) / 2, cx - bodyW - 6, footY + 3);
      c.quadraticCurveTo(cx, footY + 6, cx + bodyW + 6, footY + 3);
      c.quadraticCurveTo(cx + bodyW + 18, (bodyBot + footY) / 2, cx + bodyW + 2, bodyBot);
      c.bezierCurveTo(cx + bodyW + 3, bodyBot, cx + bodyW * 0.7, waistY, cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.6, waistY, cx + bodyW + 3, waistY * 0.5 + bodyTop * 0.5, cx + bodyW + 2, bodyTop + 2);
      c.closePath(); c.fill();
      // Bell sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * (bodyW + 2), bodyTop + 6);
        c.quadraticCurveTo(cx + s * (bodyW + 14), bodyTop + 20, cx + s * (bodyW + 18), waistY + 5);
        c.quadraticCurveTo(cx + s * (bodyW + 12), waistY + 3, cx + s * (bodyW + 6), bodyTop + 18);
        c.closePath(); c.fill();
      }
      // Sparkle details
      c.fillStyle = 'rgba(180,160,255,0.25)';
      for (let i = 0; i < 6; i++) {
        const sx = cx + Math.sin(i * 2.3) * (bodyW + 6);
        const sy = bodyBot + Math.cos(i * 1.7) * (footY - bodyBot) * 0.4;
        c.beginPath(); c.arc(sx, sy, 1, 0, Math.PI * 2); c.fill();
      }
      break;
    }
    case 'tunic_dress': {
      const tdBot = kneeY - 3;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 4, (bodyTop + tdBot) / 2, cx - bodyW + 1, tdBot);
      c.quadraticCurveTo(cx, tdBot + 3, cx + bodyW - 1, tdBot);
      c.quadraticCurveTo(cx + bodyW + 4, (bodyTop + tdBot) / 2, cx + bodyW + 1, bodyTop + 2);
      c.closePath(); c.fill();
      // Round neckline
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.5;
      c.beginPath(); c.arc(cx, bodyTop + 2, 4, 0.2, Math.PI - 0.2); c.stroke();
      // Side seams
      _drawSeam(c, cx - bodyW, bodyTop + 8, cx - bodyW + 1, tdBot - 3, _darken(color, 12));
      _drawSeam(c, cx + bodyW, bodyTop + 8, cx + bodyW - 1, tdBot - 3, _darken(color, 12));
      break;
    }
    case 'sweater_dress': {
      const swBot = kneeY + 5;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 2, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY, cx - bodyW - 3, (waistY + swBot) / 2, cx - bodyW, swBot);
      c.quadraticCurveTo(cx, swBot + 3, cx + bodyW, swBot);
      c.bezierCurveTo(cx + bodyW + 3, (waistY + swBot) / 2, cx + bodyW * 0.65, waistY, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW + 2, waistY * 0.5 + bodyTop * 0.5, cx + bodyW + 1, bodyTop + 2);
      c.closePath(); c.fill();
      // Turtleneck
      c.fillStyle = _darken(color, 10);
      c.fillRect(cx - 5, bodyTop, 10, 5);
      c.fillStyle = dG;
      // Ribbed texture
      c.strokeStyle = _darken(color, 8); c.lineWidth = 0.2;
      for (let ry = bodyTop + 6; ry < swBot; ry += 3) {
        c.beginPath(); c.moveTo(cx - bodyW, ry); c.lineTo(cx + bodyW, ry); c.stroke();
      }
      _garmentShade(c, cx, bodyTop, bodyW, swBot - bodyTop);
      // Knit texture
      _fabricTexture(c, cx - bodyW, bodyTop, bodyW * 2, swBot - bodyTop, 'knit', color);
      // Ribbed hem
      c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.3;
      for (let hx = cx - bodyW; hx < cx + bodyW; hx += 2) {
        c.beginPath(); c.moveTo(hx, swBot - 3); c.lineTo(hx, swBot); c.stroke();
      }
      c.restore();
      break;
    }
    case 'skater_dress': {
      // Fitted bodice
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.lineTo(cx - bodyW, bodyBot); c.lineTo(cx + bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Flared circle skirt
      const skBot = kneeY + 3;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 12, (bodyBot + skBot) / 2, cx - bodyW + 3, skBot);
      c.quadraticCurveTo(cx, skBot + 4, cx + bodyW - 3, skBot);
      c.quadraticCurveTo(cx + bodyW + 12, (bodyBot + skBot) / 2, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Waist seam
      c.fillStyle = _darken(color, 18); c.fillRect(cx - bodyW, bodyBot - 3, bodyW * 2, 2);
      // Straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - 3, bodyTop + 4); c.lineTo(cx - 4, bodyTop - 3); c.stroke();
      c.beginPath(); c.moveTo(cx + 3, bodyTop + 4); c.lineTo(cx + 4, bodyTop - 3); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, skBot - bodyTop);
      // Fold lines in circle skirt
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let f = -2; f <= 2; f++) {
        c.beginPath(); c.moveTo(cx + f * 3.5, bodyBot); c.quadraticCurveTo(cx + f * 4.5, (bodyBot + skBot) / 2, cx + f * 4, skBot - 2); c.stroke();
      }
      c.restore();
      break;
    }
    case 'prom_dress': {
      // Sweetheart bodice
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 6);
      c.bezierCurveTo(cx - bodyW - 2, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.6, waistY, cx - bodyW * 0.5, waistY);
      c.lineTo(cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.6, waistY, cx + bodyW + 2, waistY * 0.5 + bodyTop * 0.5, cx + bodyW + 1, bodyTop + 6);
      // Sweetheart neckline
      c.quadraticCurveTo(cx + bodyW * 0.3, bodyTop + 4, cx, bodyTop + 7);
      c.quadraticCurveTo(cx - bodyW * 0.3, bodyTop + 4, cx - bodyW - 1, bodyTop + 6);
      c.closePath(); c.fill();
      // Full ball skirt
      c.beginPath();
      c.moveTo(cx - bodyW - 1, waistY);
      c.quadraticCurveTo(cx - bodyW - 22, (waistY + footY) / 2, cx - bodyW - 6, footY + 3);
      c.quadraticCurveTo(cx, footY + 6, cx + bodyW + 6, footY + 3);
      c.quadraticCurveTo(cx + bodyW + 22, (waistY + footY) / 2, cx + bodyW + 1, waistY);
      c.closePath(); c.fill();
      // Sparkle details
      c.fillStyle = 'rgba(255,255,255,0.2)';
      for (let i = 0; i < 8; i++) {
        const sx = cx + Math.sin(i * 2.5) * (bodyW + 8);
        const sy = waistY + 10 + Math.cos(i * 1.8) * (footY - waistY - 15) * 0.5;
        c.beginPath(); c.arc(sx, sy, 0.8, 0, Math.PI * 2); c.fill();
      }
      _garmentShade(c, cx, bodyTop, bodyW, footY - bodyTop);
      // Bodice boning hints
      c.save(); c.strokeStyle = _darken(color, 10); c.lineWidth = 0.25; c.globalAlpha = 0.15;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.moveTo(cx + s * bodyW * 0.4, bodyTop + 8); c.lineTo(cx + s * bodyW * 0.4, waistY - 2); c.stroke();
      }
      c.restore();
      // Tulle fold lines on skirt
      c.save(); c.strokeStyle = _lighten(color, 10); c.lineWidth = 0.3; c.globalAlpha = 0.12;
      for (let f = -3; f <= 3; f++) {
        c.beginPath(); c.moveTo(cx + f * 5, waistY + 3); c.quadraticCurveTo(cx + f * 7, (waistY + footY) / 2, cx + f * 6, footY - 3); c.stroke();
      }
      c.restore();
      break;
    }
    case 'cheongsam': {
      const csBot = kneeY + 8;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 1, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.6, waistY, cx - bodyW * 0.5, waistY);
      c.bezierCurveTo(cx - bodyW * 0.6, waistY, cx - bodyW - 1, bodyBot, cx - bodyW, bodyBot);
      c.quadraticCurveTo(cx - bodyW - 2, (bodyBot + csBot) / 2, cx - bodyW + 2, csBot);
      c.quadraticCurveTo(cx, csBot + 2, cx + bodyW - 2, csBot);
      c.quadraticCurveTo(cx + bodyW + 2, (bodyBot + csBot) / 2, cx + bodyW, bodyBot);
      c.bezierCurveTo(cx + bodyW + 1, bodyBot, cx + bodyW * 0.6, waistY, cx + bodyW * 0.5, waistY);
      c.bezierCurveTo(cx + bodyW * 0.6, waistY, cx + bodyW + 1, waistY * 0.5 + bodyTop * 0.5, cx + bodyW, bodyTop + 2);
      c.closePath(); c.fill();
      // Mandarin collar
      c.fillStyle = _darken(color, 15);
      c.beginPath();
      c.moveTo(cx - 4, bodyTop + 1); c.quadraticCurveTo(cx - 5, bodyTop - 2, cx - 3, bodyTop - 3);
      c.lineTo(cx + 3, bodyTop - 3); c.quadraticCurveTo(cx + 5, bodyTop - 2, cx + 4, bodyTop + 1);
      c.closePath(); c.fill();
      c.fillStyle = dG;
      // Side slits
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx - bodyW + 2, csBot); c.lineTo(cx - bodyW + 1, csBot - 10); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 2, csBot); c.lineTo(cx + bodyW - 1, csBot - 10); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, csBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, csBot - bodyTop);
      // Frog button closures
      c.save(); c.strokeStyle = _darken(color, 25); c.lineWidth = 0.5;
      for (let fb = 0; fb < 3; fb++) {
        const fby = bodyTop + 6 + fb * 6;
        c.beginPath(); c.arc(cx + 2, fby, 2, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(cx + 4, fby); c.lineTo(cx + 7, fby); c.stroke();
      }
      c.restore();
      // Embroidery
      c.save(); c.strokeStyle = _lighten(color, 25); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let ey = bodyBot + 3; ey < csBot - 4; ey += 6) {
        c.beginPath(); c.moveTo(cx - 3, ey); c.quadraticCurveTo(cx, ey - 2, cx + 3, ey); c.stroke();
      }
      c.restore();
      c.fillStyle = dG;
      break;
    }
    case 'toga': {
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 10, (bodyTop + footY) / 2, cx - bodyW + 3, footY + 2);
      c.quadraticCurveTo(cx, footY + 4, cx + bodyW - 3, footY + 2);
      c.quadraticCurveTo(cx + bodyW + 10, (bodyTop + footY) / 2, cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // One-shoulder strap
      c.strokeStyle = color; c.lineWidth = 2;
      c.beginPath(); c.moveTo(cx - bodyW, bodyTop + 4); c.lineTo(cx - 3, bodyTop - 3); c.stroke();
      // Drape folds
      c.strokeStyle = _darken(color, 8); c.lineWidth = 0.3;
      c.beginPath(); c.moveTo(cx + 3, bodyTop + 4);
      c.quadraticCurveTo(cx - 3, waistY, cx + 5, bodyBot + 5); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 2, bodyTop + 8);
      c.quadraticCurveTo(cx + 2, waistY + 5, cx + bodyW - 4, footY - 5); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, footY - bodyTop);
      break;
    }
    case 'dungaree_dress': {
      // A-line skirt portion
      const ddBot = kneeY + 3;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 6);
      c.quadraticCurveTo(cx - bodyW - 8, (bodyTop + ddBot) / 2, cx - bodyW + 2, ddBot);
      c.quadraticCurveTo(cx, ddBot + 3, cx + bodyW - 2, ddBot);
      c.quadraticCurveTo(cx + bodyW + 8, (bodyTop + ddBot) / 2, cx + bodyW + 1, bodyTop + 6);
      c.closePath(); c.fill();
      // Straps with buckles
      c.strokeStyle = color; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx - bodyW + 3, bodyTop + 6); c.lineTo(cx - 3, bodyTop - 2); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 3, bodyTop + 6); c.lineTo(cx + 3, bodyTop - 2); c.stroke();
      // Buckle detail
      c.strokeStyle = '#c0c0c0'; c.lineWidth = 0.5;
      c.strokeRect(cx - 4, bodyTop - 3, 2, 2);
      c.strokeRect(cx + 2, bodyTop - 3, 2, 2);
      // Pocket
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      c.strokeRect(cx - 4, waistY + 2, 8, 6);
      _garmentShade(c, cx, bodyTop, bodyW, ddBot - bodyTop);
      break;
    }
    case 'empire_dress': {
      // Empire waist - seam just under bust
      const ewTop = bodyTop + (waistY - bodyTop) * 0.35;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 4);
      c.lineTo(cx - bodyW, ewTop);
      c.lineTo(cx + bodyW, ewTop);
      c.lineTo(cx + bodyW, bodyTop + 4);
      c.closePath(); c.fill();
      // Flowing skirt from empire waist
      c.beginPath();
      c.moveTo(cx - bodyW - 1, ewTop);
      c.quadraticCurveTo(cx - bodyW - 14, (ewTop + footY) / 2, cx - bodyW + 4, footY + 2);
      c.quadraticCurveTo(cx, footY + 4, cx + bodyW - 4, footY + 2);
      c.quadraticCurveTo(cx + bodyW + 14, (ewTop + footY) / 2, cx + bodyW + 1, ewTop);
      c.closePath(); c.fill();
      // Empire seam
      c.fillStyle = _darken(color, 22); c.fillRect(cx - bodyW - 1, ewTop - 1, bodyW * 2 + 2, 2.5);
      _garmentShade(c, cx, bodyTop, bodyW, footY - bodyTop);
      // Fold lines
      c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.25; c.globalAlpha = 0.2;
      for (let f = -2; f <= 2; f++) {
        c.beginPath(); c.moveTo(cx + f * 4, ewTop + 3); c.quadraticCurveTo(cx + f * 5, (ewTop + footY) / 2, cx + f * 4.5, footY - 4); c.stroke();
      }
      c.restore();
      c.fillStyle = dG;
      break;
    }
    case 'shirt_mini': {
      const smBot = kneeY - 5;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyTop + 2);
      c.bezierCurveTo(cx - bodyW - 2, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.bezierCurveTo(cx - bodyW * 0.65, waistY, cx - bodyW - 3, (waistY + smBot) / 2, cx - bodyW, smBot);
      c.quadraticCurveTo(cx, smBot + 3, cx + bodyW, smBot);
      c.bezierCurveTo(cx + bodyW + 3, (waistY + smBot) / 2, cx + bodyW * 0.65, waistY, cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW + 2, waistY * 0.5 + bodyTop * 0.5, cx + bodyW + 1, bodyTop + 2);
      c.closePath(); c.fill();
      // Collar
      c.fillStyle = _lighten(color, 20);
      c.beginPath(); c.moveTo(cx - 4, bodyTop + 2); c.lineTo(cx - 6, bodyTop + 6); c.lineTo(cx, bodyTop + 4);
      c.lineTo(cx + 6, bodyTop + 6); c.lineTo(cx + 4, bodyTop + 2); c.closePath(); c.fill();
      c.fillStyle = dG;
      // Buttons
      for (let b = bodyTop + 8; b < smBot - 4; b += 6) { _drawButton(c, cx, b, 0.7, _darken(color, 15)); }
      _garmentShade(c, cx, bodyTop, bodyW, smBot - bodyTop);
      break;
    }
    case 'halter_dress': {
      // Halter neckline bodice
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 6);
      c.bezierCurveTo(cx - bodyW - 1, waistY * 0.5 + bodyTop * 0.5, cx - bodyW * 0.65, waistY, cx - bodyW * 0.55, waistY);
      c.lineTo(cx + bodyW * 0.55, waistY);
      c.bezierCurveTo(cx + bodyW * 0.65, waistY, cx + bodyW + 1, waistY * 0.5 + bodyTop * 0.5, cx + bodyW, bodyTop + 6);
      c.closePath(); c.fill();
      // Flowing skirt
      const hdBot = kneeY + (footY - kneeY) * 0.4;
      c.beginPath();
      c.moveTo(cx - bodyW - 1, waistY);
      c.quadraticCurveTo(cx - bodyW - 12, (waistY + hdBot) / 2, cx - bodyW + 3, hdBot);
      c.quadraticCurveTo(cx, hdBot + 3, cx + bodyW - 3, hdBot);
      c.quadraticCurveTo(cx + bodyW + 12, (waistY + hdBot) / 2, cx + bodyW + 1, waistY);
      c.closePath(); c.fill();
      // Halter straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx - bodyW + 2, bodyTop + 6); c.lineTo(cx, bodyTop - 4); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 2, bodyTop + 6); c.lineTo(cx, bodyTop - 4); c.stroke();
      _garmentShade(c, cx, bodyTop, bodyW, hdBot - bodyTop);
      _garmentHighlight(c, cx, bodyTop, bodyW, hdBot - bodyTop);
      // Fold lines
      c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.25; c.globalAlpha = 0.2;
      for (let f = -2; f <= 2; f++) {
        c.beginPath(); c.moveTo(cx + f * 4, waistY + 3); c.quadraticCurveTo(cx + f * 5, (waistY + hdBot) / 2, cx + f * 4.5, hdBot - 4); c.stroke();
      }
      c.restore();
      break;
    }
  }
}

DRESS_DEFS.forEach(d => {
  defItem('dress_' + d.id, d.name, 'dress', d.tags, d.colors,
    (c, char, x, y, w, h, colIdx) => {
      drawDress(d.id, c, char, x, y, w, h, d.colors[colIdx % d.colors.length][0]);
    });
});

/* ── Shoes ── */
const SHOE_DEFS = [
  { id:'sneakers',     name:'Sneakers',       tags:['casual','sporty'],     colors:[['#fff'],['#e74c3c'],['#3498db'],['#2c3e50']] },
  { id:'boots',        name:'Boots',          tags:['casual','cool'],       colors:[['#5d4037'],['#2c3e50'],['#8b0000'],['#4a4a4a']] },
  { id:'heels',        name:'Heels',          tags:['elegant','fancy'],     colors:[['#e74c3c'],['#2c3e50'],['#e84393'],['#f4d03f']] },
  { id:'sandals',      name:'Sandals',        tags:['casual','summer'],     colors:[['#deb887'],['#8b4513'],['#cd853f'],['#fff']] },
  { id:'armored_boots',name:'Armored Boots',  tags:['medieval','warrior'],  colors:[['#95a5a6'],['#f4d03f'],['#7f8c8d'],['#b87333']] },
  { id:'slippers',     name:'Slippers',       tags:['cozy','casual'],       colors:[['#dda0dd'],['#87ceeb'],['#f5cba7'],['#f8b4c8']] },
  { id:'platforms',    name:'Platform Shoes',  tags:['retro','cool','punk'], colors:[['#2c3e50'],['#e74c3c'],['#8e44ad'],['#fff']] },
  { id:'barefoot',     name:'Barefoot Wraps',  tags:['natural','simple'],    colors:[['#deb887'],['#fff'],['#c0392b'],['#27ae60']] },
  { id:'combat_boots', name:'Combat Boots',    tags:['cool','punk','edgy'],  colors:[['#1a1a1a'],['#3d0c02'],['#2c3e50'],['#556b2f']] },
  { id:'ballet_flats', name:'Ballet Flats',    tags:['elegant','casual'],    colors:[['#e84393'],['#2c3e50'],['#f8b4c8'],['#c0392b']] },
  { id:'wedges',       name:'Wedges',          tags:['elegant','summer'],    colors:[['#deb887'],['#e74c3c'],['#2c3e50'],['#f39c12']] },
  { id:'cowboy_boots', name:'Cowboy Boots',     tags:['cool','casual'],       colors:[['#8b4513'],['#5d4037'],['#deb887'],['#2c3e50']] },
  { id:'loafers',      name:'Loafers',         tags:['smart','casual'],      colors:[['#5d4037'],['#2c3e50'],['#8b0000'],['#1a3040']] },
  { id:'rain_boots',   name:'Rain Boots',      tags:['casual','cute'],       colors:[['#f1c40f'],['#e74c3c'],['#2ecc71'],['#3498db']] },
  { id:'stilettos',    name:'Stilettos',       tags:['elegant','fancy'],     colors:[['#c0392b'],['#2c3e50'],['#f4d03f'],['#e84393']] },
  { id:'high_tops',    name:'High-Tops',       tags:['sporty','cool'],       colors:[['#e74c3c'],['#3498db'],['#2c3e50'],['#fff']] },
  { id:'flip_flops',   name:'Flip-Flops',      tags:['casual','summer'],     colors:[['#3498db'],['#e84393'],['#f39c12'],['#2ecc71']] },
  { id:'ankle_boots',  name:'Ankle Boots',     tags:['casual','cool'],       colors:[['#5d4037'],['#2c3e50'],['#8e44ad'],['#c0392b']] },
  { id:'gladiator',    name:'Gladiator Sandals',tags:['cool','summer'],      colors:[['#cd853f'],['#8b4513'],['#f4d03f'],['#2c3e50']] },
  { id:'mary_janes',  name:'Mary Janes',     tags:['cute','elegant'],      colors:[['#2c3e50'],['#c0392b'],['#e84393'],['#fff']] },
  { id:'moon_boots',  name:'Moon Boots',     tags:['cool','winter'],       colors:[['#c0c0c0'],['#fff'],['#e84393'],['#2c3e50']] },
  { id:'clogs',       name:'Clogs',          tags:['casual','natural'],    colors:[['#8b4513'],['#deb887'],['#c0392b'],['#2ecc71']] },
  { id:'thigh_boots', name:'Thigh-High Boots',tags:['cool','elegant'],     colors:[['#2c3e50'],['#c0392b'],['#8e44ad'],['#1a1a1a']] },
  { id:'espadrilles', name:'Espadrilles',    tags:['casual','summer'],     colors:[['#c0392b'],['#2e86c1'],['#f39c12'],['#2ecc71']] },
  { id:'oxford',      name:'Oxford Shoes',   tags:['formal','smart'],      colors:[['#5d4037'],['#2c3e50'],['#8b0000'],['#c0c0c0']] },
];

function drawShoes(style, c, char, x, y, w, h, color) {
  const { cx, footY, legBot } = M(x, y, w, h);
  const sG = c.createLinearGradient(cx, footY - 6, cx, footY + 4);
  sG.addColorStop(0, _lighten(color, 20));
  sG.addColorStop(1, _darken(color, 15));
  c.fillStyle = sG;

  switch(style) {
    case 'sneakers':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY, 7, 3.5, 0, 0, Math.PI * 2); c.fill();
        // Sole detail
        c.fillStyle = 'rgba(0,0,0,0.06)';
        c.beginPath(); c.ellipse(fx, footY + 1.5, 7, 1.8, 0, 0, Math.PI); c.fill();
        // Sole edge highlight
        c.save(); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.4;
        c.beginPath(); c.ellipse(fx, footY + 1, 6.5, 1.5, 0, Math.PI, 0); c.stroke();
        c.restore();
        // Toe cap
        c.save(); c.strokeStyle = _darken(color, 12); c.lineWidth = 0.3;
        c.beginPath(); c.arc(fx + s * 3, footY - 0.5, 3, Math.PI * 0.3, Math.PI * 0.7); c.stroke();
        c.restore();
        // Lace lines
        c.save(); c.strokeStyle = '#fff'; c.lineWidth = 0.3; c.globalAlpha = 0.4;
        c.beginPath(); c.moveTo(fx - 1, footY - 2); c.lineTo(fx + 1, footY - 1); c.stroke();
        c.beginPath(); c.moveTo(fx - 1, footY - 1); c.lineTo(fx + 1, footY); c.stroke();
        c.restore();
      }
      break;
    case 'boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY - 4, 6, 8, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(fx, footY + 3, 6, 3, 0, 0, Math.PI * 2); c.fill();
        // Shaft stitching
        c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
        c.beginPath(); c.moveTo(fx - 5, footY - 5); c.quadraticCurveTo(fx, footY - 4, fx + 5, footY - 5); c.stroke();
        // Buckle/strap
        c.save(); c.strokeStyle = _darken(color, 25); c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(fx - 5, footY - 8); c.lineTo(fx + 5, footY - 8); c.stroke();
        c.strokeStyle = '#c0a050'; c.lineWidth = 0.4;
        c.strokeRect(fx - 1.5, footY - 9, 3, 2);
        c.restore();
        // Sole edge
        c.save(); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 0.3;
        c.beginPath(); c.ellipse(fx, footY + 2.5, 5.5, 1.2, 0, Math.PI, 0); c.stroke();
        c.restore();
      }
      break;
    case 'heels':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx + s * 1.5, footY, 6, 3, 0, 0, Math.PI * 2); c.fill();
        // Heel shape
        c.beginPath(); c.ellipse(fx - s * 2.5, footY + 3, 1.5, 3, 0, 0, Math.PI * 2); c.fill();
        // Strap
        c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(fx - 2, footY - 2); c.quadraticCurveTo(fx, footY - 4, fx + 2, footY - 2); c.stroke();
        c.restore();
        // Sole edge highlight
        c.save(); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 0.3;
        c.beginPath(); c.ellipse(fx + s * 1.5, footY + 1, 5.5, 1.2, 0, Math.PI, 0); c.stroke();
        c.restore();
      }
      break;
    case 'sandals':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY + 1, 6, 2.5, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = _darken(color, 15); c.lineWidth = 0.7;
        c.beginPath(); c.moveTo(fx - 3, footY - 1); c.quadraticCurveTo(fx, footY - 4, fx + 3, footY - 1); c.stroke();
      }
      break;
    case 'armored_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath();
        c.moveTo(fx - 6, footY - 12);
        c.quadraticCurveTo(fx - 7, footY, fx - 7, footY + 3);
        c.quadraticCurveTo(fx, footY + 5, fx + 7, footY + 3);
        c.quadraticCurveTo(fx + 7, footY, fx + 6, footY - 12);
        c.closePath(); c.fill();
        c.strokeStyle = _darken(color, 20); c.lineWidth = 0.4;
        c.beginPath(); c.moveTo(fx - 6, footY - 4); c.quadraticCurveTo(fx, footY - 3, fx + 6, footY - 4); c.stroke();
      }
      break;
    case 'slippers':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY, 7, 4, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.beginPath(); c.ellipse(fx, footY - 1.5, 5, 2, 0, Math.PI, 0); c.fill();
      }
      break;
    case 'platforms':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY + 3, 7, 3.5, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(fx, footY - 1, 6, 3, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.beginPath(); c.ellipse(fx, footY + 3, 6, 1.2, 0, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'barefoot':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.strokeStyle = sG; c.lineWidth = 0.8;
        c.beginPath(); c.ellipse(fx, footY, 5.5, 3, 0, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(fx, footY - 3); c.quadraticCurveTo(fx + 0.5, footY - 5, fx, footY - 7); c.stroke();
        c.beginPath(); c.moveTo(fx - 3, footY - 4); c.quadraticCurveTo(fx, footY - 5, fx + 3, footY - 4); c.stroke();
      }
      break;
    case 'combat_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath();
        c.moveTo(fx - 6, footY - 14);
        c.quadraticCurveTo(fx - 7, footY, fx - 7, footY + 3);
        c.quadraticCurveTo(fx, footY + 5, fx + 7, footY + 3);
        c.quadraticCurveTo(fx + 7, footY, fx + 6, footY - 14);
        c.closePath(); c.fill();
        // Lace details
        c.strokeStyle = _darken(color, 25); c.lineWidth = 0.3;
        for (let ly = footY - 12; ly < footY - 2; ly += 3) {
          c.beginPath(); c.moveTo(fx - 2, ly); c.lineTo(fx + 2, ly); c.stroke();
        }
        // Thick sole
        c.fillStyle = _darken(color, 30);
        c.fillRect(fx - 7, footY + 2, 14, 2);
      }
      break;
    case 'ballet_flats':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx + s * 1, footY + 1, 7, 3, 0, 0, Math.PI * 2); c.fill();
        // Bow
        c.fillStyle = _darken(color, 15);
        c.beginPath(); c.ellipse(fx, footY - 1, 2, 1, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(fx, footY - 1, 0.5, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'wedges':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx + s * 1.5, footY - 1, 6, 3, 0, 0, Math.PI * 2); c.fill();
        // Wedge heel
        c.fillStyle = _darken(color, 20);
        c.beginPath();
        c.moveTo(fx - 5, footY + 1); c.lineTo(fx - 3, footY + 6);
        c.lineTo(fx + 5, footY + 6); c.lineTo(fx + 5, footY + 1);
        c.closePath(); c.fill();
        // Strap
        c.strokeStyle = color; c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(fx - 3, footY - 2); c.quadraticCurveTo(fx, footY - 5, fx + 3, footY - 2); c.stroke();
      }
      break;
    case 'cowboy_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath();
        c.moveTo(fx - 5, footY - 12);
        c.quadraticCurveTo(fx - 6, footY - 6, fx - 6, footY + 2);
        c.lineTo(fx + s * 2 - 6, footY + 4);
        c.quadraticCurveTo(fx, footY + 5, fx - s * 2 + 6, footY + 4);
        c.lineTo(fx + 6, footY + 2);
        c.quadraticCurveTo(fx + 6, footY - 6, fx + 5, footY - 12);
        c.closePath(); c.fill();
        // Boot detail
        c.strokeStyle = _darken(color, 18); c.lineWidth = 0.4;
        c.beginPath(); c.moveTo(fx - 4, footY - 6); c.quadraticCurveTo(fx, footY - 5, fx + 4, footY - 6); c.stroke();
        // Pointed toe
        c.fillStyle = _darken(color, 10);
        c.beginPath(); c.ellipse(fx + s * 2, footY + 3, 7, 2.5, s * 0.15, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'loafers':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY, 7, 3.5, 0, 0, Math.PI * 2); c.fill();
        // Penny slot
        c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(fx - 2, footY - 1); c.lineTo(fx + 2, footY - 1); c.stroke();
        // Sole line
        c.fillStyle = 'rgba(0,0,0,0.08)';
        c.beginPath(); c.ellipse(fx, footY + 1.5, 7, 1.5, 0, 0, Math.PI); c.fill();
      }
      break;
    case 'rain_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath();
        c.moveTo(fx - 6, footY - 10);
        c.quadraticCurveTo(fx - 7, footY, fx - 7, footY + 3);
        c.quadraticCurveTo(fx, footY + 5, fx + 7, footY + 3);
        c.quadraticCurveTo(fx + 7, footY, fx + 6, footY - 10);
        c.closePath(); c.fill();
        // Top rim
        c.fillStyle = _lighten(color, 15);
        c.fillRect(fx - 6, footY - 10, 12, 2);
        // Sheen
        c.fillStyle = 'rgba(255,255,255,0.15)';
        c.beginPath(); c.ellipse(fx - 2, footY - 4, 2, 6, 0, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'stilettos':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx + s * 2, footY - 1, 5, 3, 0, 0, Math.PI * 2); c.fill();
        // Thin heel
        c.fillStyle = _darken(color, 15);
        c.beginPath();
        c.moveTo(fx - s * 3, footY + 1); c.lineTo(fx - s * 3.5, footY + 7);
        c.lineTo(fx - s * 2.5, footY + 7); c.lineTo(fx - s * 2, footY + 1);
        c.closePath(); c.fill();
        // Strap
        c.strokeStyle = color; c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(fx - 2, footY - 3); c.quadraticCurveTo(fx, footY - 6, fx + 2, footY - 3); c.stroke();
      }
      break;
    case 'high_tops':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY, 7, 3.5, 0, 0, Math.PI * 2); c.fill();
        // High top part
        c.beginPath();
        c.moveTo(fx - 6, footY - 2); c.lineTo(fx - 5, footY - 8);
        c.lineTo(fx + 5, footY - 8); c.lineTo(fx + 6, footY - 2);
        c.closePath(); c.fill();
        // Sole
        c.fillStyle = '#fff';
        c.beginPath(); c.ellipse(fx, footY + 1.5, 7, 1.5, 0, 0, Math.PI); c.fill();
        // Laces
        c.strokeStyle = '#fff'; c.lineWidth = 0.3;
        c.beginPath(); c.moveTo(fx - 1, footY - 7); c.lineTo(fx + 1, footY - 5); c.stroke();
        c.beginPath(); c.moveTo(fx - 1, footY - 5); c.lineTo(fx + 1, footY - 3); c.stroke();
      }
      break;
    case 'flip_flops':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY + 1, 6, 2.5, 0, 0, Math.PI * 2); c.fill();
        // Thong straps
        c.strokeStyle = _darken(color, 20); c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(fx, footY - 1); c.lineTo(fx - 3, footY + 1); c.stroke();
        c.beginPath(); c.moveTo(fx, footY - 1); c.lineTo(fx + 3, footY + 1); c.stroke();
      }
      break;
    case 'ankle_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath();
        c.moveTo(fx - 5, footY - 6);
        c.quadraticCurveTo(fx - 6, footY, fx - 6, footY + 3);
        c.quadraticCurveTo(fx, footY + 5, fx + 6, footY + 3);
        c.quadraticCurveTo(fx + 6, footY, fx + 5, footY - 6);
        c.closePath(); c.fill();
        // Buckle
        c.strokeStyle = _darken(color, 25); c.lineWidth = 0.5;
        c.strokeRect(fx - 2, footY - 4, 4, 2.5);
        // Heel
        c.fillStyle = _darken(color, 18);
        c.fillRect(fx - 5, footY + 2, 3, 3);
      }
      break;
    case 'gladiator':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY + 1, 6, 2.5, 0, 0, Math.PI * 2); c.fill();
        // Wrap-around straps
        c.strokeStyle = color; c.lineWidth = 0.7;
        for (let ly = footY - 8; ly < footY; ly += 3) {
          c.beginPath(); c.moveTo(fx - 4, ly); c.quadraticCurveTo(fx, ly - 1, fx + 4, ly); c.stroke();
        }
        // Cross straps
        c.beginPath(); c.moveTo(fx - 3, footY - 8); c.lineTo(fx + 3, footY - 2); c.stroke();
        c.beginPath(); c.moveTo(fx + 3, footY - 8); c.lineTo(fx - 3, footY - 2); c.stroke();
      }
      break;
    case 'mary_janes':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY, 7, 3.5, 0, 0, Math.PI * 2); c.fill();
        // Strap across
        c.strokeStyle = color; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(fx - 4, footY - 1); c.quadraticCurveTo(fx, footY - 3, fx + 4, footY - 1); c.stroke();
        // Button
        c.fillStyle = _darken(color, 20);
        c.beginPath(); c.arc(fx + 3, footY - 1.5, 0.8, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'moon_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath();
        c.moveTo(fx - 7, footY - 10);
        c.quadraticCurveTo(fx - 8, footY, fx - 8, footY + 4);
        c.quadraticCurveTo(fx, footY + 6, fx + 8, footY + 4);
        c.quadraticCurveTo(fx + 8, footY, fx + 7, footY - 10);
        c.closePath(); c.fill();
        // Puffy sections
        c.strokeStyle = _darken(color, 12); c.lineWidth = 0.4;
        c.beginPath(); c.moveTo(fx - 7, footY - 4); c.quadraticCurveTo(fx, footY - 3, fx + 7, footY - 4); c.stroke();
        c.beginPath(); c.moveTo(fx - 7, footY + 1); c.quadraticCurveTo(fx, footY + 2, fx + 7, footY + 1); c.stroke();
      }
      break;
    case 'clogs':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        // Wooden sole
        c.fillStyle = '#deb887';
        c.beginPath(); c.ellipse(fx, footY + 3, 7, 3, 0, 0, Math.PI * 2); c.fill();
        // Leather upper
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx + s * 1, footY - 1, 6, 4, 0, Math.PI, 0); c.fill();
      }
      break;
    case 'thigh_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath();
        c.moveTo(fx - 5, footY - 22);
        c.quadraticCurveTo(fx - 6, footY, fx - 6, footY + 3);
        c.quadraticCurveTo(fx, footY + 5, fx + 6, footY + 3);
        c.quadraticCurveTo(fx + 6, footY, fx + 5, footY - 22);
        c.closePath(); c.fill();
        // Top edge
        c.strokeStyle = _darken(color, 15); c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(fx - 5, footY - 22); c.quadraticCurveTo(fx, footY - 21, fx + 5, footY - 22); c.stroke();
        // Shine
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.beginPath(); c.ellipse(fx - 2, footY - 10, 1.5, 8, 0, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'espadrilles':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        // Rope sole
        c.fillStyle = '#deb887';
        c.beginPath(); c.ellipse(fx, footY + 2, 7, 3, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#c9a96e'; c.lineWidth = 0.3;
        for (let ry = footY + 0.5; ry < footY + 4; ry += 1.2) {
          c.beginPath(); c.moveTo(fx - 6, ry); c.lineTo(fx + 6, ry); c.stroke();
        }
        // Canvas upper
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx + s * 1, footY - 1, 6, 3.5, 0, Math.PI, 0); c.fill();
      }
      break;
    case 'oxford':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 5;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY, 7, 3.5, 0, 0, Math.PI * 2); c.fill();
        // Cap toe
        c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
        c.beginPath(); c.arc(fx + s * 3, footY, 3, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
        // Lacing
        c.beginPath(); c.moveTo(fx - 1, footY - 2); c.lineTo(fx + 1, footY - 1); c.stroke();
        c.beginPath(); c.moveTo(fx - 1, footY); c.lineTo(fx + 1, footY + 1); c.stroke();
        // Sole
        c.fillStyle = 'rgba(0,0,0,0.08)';
        c.beginPath(); c.ellipse(fx, footY + 1.5, 7, 1.5, 0, 0, Math.PI); c.fill();
      }
      break;
  }
}

SHOE_DEFS.forEach(d => {
  defItem('shoes_' + d.id, d.name, 'shoes', d.tags, d.colors,
    (c, char, x, y, w, h, colIdx) => {
      drawShoes(d.id, c, char, x, y, w, h, d.colors[colIdx % d.colors.length][0]);
    });
});

/* ── Accessories ── */
const ACC_DEFS = [
  { id:'glasses',      name:'Glasses',       tags:['casual','smart'],      colors:[['#2c3e50'],['#e74c3c'],['#f39c12'],['#8e44ad']] },
  { id:'crown',        name:'Crown',         tags:['royal','fancy'],       colors:[['#f4d03f'],['#c0c0c0'],['#cd7f32'],['#e5e4e2']] },
  { id:'necklace',     name:'Necklace',      tags:['elegant','fancy'],     colors:[['#f4d03f'],['#c0c0c0'],['#e84393'],['#1abc9c']] },
  { id:'scarf',        name:'Scarf',         tags:['warm','cozy','winter'],colors:[['#e74c3c'],['#3498db'],['#f1c40f'],['#2ecc71']] },
  { id:'extra_wings',  name:'Wings',         tags:['magic','fantasy'],     colors:[['#e84393'],['#3498db'],['#f39c12'],['#2ecc71']] },
  { id:'cape',         name:'Cape',          tags:['hero','cool'],         colors:[['#c0392b'],['#2c3e50'],['#8e44ad'],['#f4d03f']] },
  { id:'hat',          name:'Hat',           tags:['casual','cool'],       colors:[['#2c3e50'],['#e74c3c'],['#f39c12'],['#1abc9c']] },
  { id:'flower_crown', name:'Flower Crown',  tags:['natural','cute'],      colors:[['#e84393'],['#f39c12'],['#fff'],['#e74c3c']] },
  { id:'belt',         name:'Belt',          tags:['casual','simple'],     colors:[['#5d4037'],['#2c3e50'],['#c0392b'],['#f4d03f']] },
  { id:'wristbands',   name:'Wristbands',    tags:['casual','sporty','punk'],colors:[['#2c3e50'],['#e74c3c'],['#f39c12'],['#e84393']] },
  { id:'tiara',        name:'Tiara',         tags:['royal','fancy','elegant'],colors:[['#c0c0c0'],['#f4d03f'],['#e5e4e2'],['#cd7f32']] },
  { id:'earrings',     name:'Earrings',      tags:['elegant','fancy'],     colors:[['#f4d03f'],['#c0c0c0'],['#e84393'],['#1abc9c']] },
  { id:'bow_tie',      name:'Bow Tie',       tags:['formal','cute'],       colors:[['#c0392b'],['#2c3e50'],['#e84393'],['#f39c12']] },
  { id:'choker',       name:'Choker',        tags:['cool','punk','edgy'],  colors:[['#2c3e50'],['#c0392b'],['#8e44ad'],['#f4d03f']] },
  { id:'backpack',     name:'Backpack',      tags:['casual','cool'],       colors:[['#e74c3c'],['#3498db'],['#2ecc71'],['#f39c12']] },
  { id:'headband',     name:'Headband',      tags:['casual','cute'],       colors:[['#e84393'],['#3498db'],['#f39c12'],['#2ecc71']] },
  { id:'watch',        name:'Watch',         tags:['smart','casual'],      colors:[['#2c3e50'],['#f4d03f'],['#c0c0c0'],['#e74c3c']] },
  { id:'sunglasses',   name:'Sunglasses',    tags:['cool','summer'],       colors:[['#2c3e50'],['#e74c3c'],['#f39c12'],['#e84393']] },
  { id:'pearl_necklace',name:'Pearl Necklace',tags:['elegant','royal'],    colors:[['#fff'],['#f8b4c8'],['#fffdd0'],['#c0c0c0']] },
  { id:'beret',        name:'Beret',         tags:['casual','cool','smart'],colors:[['#c0392b'],['#2c3e50'],['#e84393'],['#1e8449']] },
  { id:'pendant',      name:'Pendant',       tags:['elegant','casual'],    colors:[['#f4d03f'],['#c0c0c0'],['#1abc9c'],['#e84393']] },
  { id:'hair_clips',   name:'Hair Clips',    tags:['cute','casual'],       colors:[['#e84393'],['#3498db'],['#f4d03f'],['#2ecc71']] },
  { id:'arm_bands',    name:'Arm Bands',     tags:['sporty','warrior'],    colors:[['#f4d03f'],['#c0c0c0'],['#c0392b'],['#2c3e50']] },
  { id:'feather_boa',  name:'Feather Boa',   tags:['fancy','cool'],        colors:[['#e84393'],['#fff'],['#8e44ad'],['#c0392b']] },
  { id:'chain_necklace',name:'Chain Necklace',tags:['cool','casual'],       colors:[['#f4d03f'],['#c0c0c0'],['#cd7f32'],['#2c3e50']] },
  { id:'ribbon',       name:'Hair Ribbon',   tags:['cute','casual'],       colors:[['#e84393'],['#3498db'],['#c0392b'],['#fff']] },
  { id:'monocle',      name:'Monocle',       tags:['smart','fancy'],       colors:[['#f4d03f'],['#c0c0c0'],['#cd7f32'],['#2c3e50']] },
  { id:'suspenders',   name:'Suspenders',    tags:['formal','cool'],       colors:[['#2c3e50'],['#c0392b'],['#f4d03f'],['#8e44ad']] },
  { id:'lei',          name:'Flower Lei',    tags:['summer','cute'],       colors:[['#f39c12'],['#e84393'],['#fff'],['#e74c3c']] },
  { id:'mask',         name:'Masquerade Mask',tags:['fancy','cool'],       colors:[['#f4d03f'],['#2c3e50'],['#8e44ad'],['#c0392b']] },
];

function drawAccessory(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY, bodyTop, waistY, bodyBot, bodyW } = M(x, y, w, h);
  c.fillStyle = color;

  switch(style) {
    case 'glasses':
      c.strokeStyle = color; c.lineWidth = 0.8;
      const eyeY2 = headY - headR * 0.05; const sp = headR * 0.35;
      c.beginPath(); c.ellipse(cx - sp, eyeY2, headR * 0.22, headR * 0.2, 0, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.ellipse(cx + sp, eyeY2, headR * 0.22, headR * 0.2, 0, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.moveTo(cx - sp + headR * 0.22, eyeY2); c.lineTo(cx + sp - headR * 0.22, eyeY2); c.stroke();
      c.beginPath(); c.moveTo(cx - sp - headR * 0.22, eyeY2); c.lineTo(cx - headR - 1, eyeY2 - 1); c.stroke();
      c.beginPath(); c.moveTo(cx + sp + headR * 0.22, eyeY2); c.lineTo(cx + headR + 1, eyeY2 - 1); c.stroke();
      // Lens reflection
      c.save(); c.fillStyle = 'rgba(255,255,255,0.15)';
      c.beginPath(); c.ellipse(cx - sp - headR * 0.08, eyeY2 - headR * 0.06, headR * 0.06, headR * 0.1, -0.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(cx + sp - headR * 0.08, eyeY2 - headR * 0.06, headR * 0.06, headR * 0.1, -0.3, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    case 'crown':
      c.beginPath();
      c.moveTo(cx - headR * 0.55, headY - headR * 0.7);
      c.lineTo(cx - headR * 0.55, headY - headR * 1.1);
      c.lineTo(cx - headR * 0.28, headY - headR * 0.85);
      c.lineTo(cx, headY - headR * 1.2);
      c.lineTo(cx + headR * 0.28, headY - headR * 0.85);
      c.lineTo(cx + headR * 0.55, headY - headR * 1.1);
      c.lineTo(cx + headR * 0.55, headY - headR * 0.7);
      c.closePath(); c.fill();
      // Metallic gradient overlay
      c.save(); c.fillStyle = 'rgba(255,255,255,0.15)';
      c.beginPath();
      c.moveTo(cx - headR * 0.5, headY - headR * 0.72);
      c.lineTo(cx - headR * 0.45, headY - headR * 0.9);
      c.lineTo(cx + headR * 0.45, headY - headR * 0.9);
      c.lineTo(cx + headR * 0.5, headY - headR * 0.72);
      c.closePath(); c.fill();
      c.restore();
      // Central jewel
      c.fillStyle = '#e74c3c'; c.beginPath(); c.arc(cx, headY - headR * 1.05, 1.2, 0, Math.PI*2); c.fill();
      // Side jewel dots
      c.fillStyle = '#3498db'; c.beginPath(); c.arc(cx - headR * 0.28, headY - headR * 0.85, 0.8, 0, Math.PI*2); c.fill();
      c.fillStyle = '#2ecc71'; c.beginPath(); c.arc(cx + headR * 0.28, headY - headR * 0.85, 0.8, 0, Math.PI*2); c.fill();
      // Crown edge highlight
      c.save(); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.3;
      c.beginPath(); c.moveTo(cx - headR * 0.55, headY - headR * 0.7); c.lineTo(cx + headR * 0.55, headY - headR * 0.7); c.stroke();
      c.restore();
      break;
    case 'necklace':
      c.strokeStyle = color; c.lineWidth = 1;
      c.beginPath(); c.arc(cx, bodyTop + 2, 7, 0.3, Math.PI - 0.3); c.stroke();
      c.fillStyle = color; c.beginPath(); c.arc(cx, bodyTop + 8, 2, 0, Math.PI*2); c.fill();
      break;
    case 'scarf':
      c.beginPath();
      c.moveTo(cx - headR * 0.7, headY + headR - 1);
      c.quadraticCurveTo(cx, headY + headR + 3, cx + headR * 0.7, headY + headR - 1);
      c.lineTo(cx + headR * 0.75, headY + headR + 3);
      c.quadraticCurveTo(cx, headY + headR + 7, cx - headR * 0.75, headY + headR + 3);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx + headR * 0.6, headY + headR);
      c.quadraticCurveTo(cx + headR * 0.8, bodyTop + 12, cx + headR * 0.65, bodyTop + 20);
      c.lineTo(cx + headR * 0.5, bodyTop + 18);
      c.quadraticCurveTo(cx + headR * 0.65, bodyTop + 10, cx + headR * 0.45, headY + headR + 2);
      c.fill();
      // Fringe at scarf end
      c.save(); c.strokeStyle = _darken(color, 10); c.lineWidth = 0.3; c.globalAlpha = 0.4;
      for (let fi = 0; fi < 4; fi++) {
        c.beginPath();
        c.moveTo(cx + headR * 0.5 + fi * 1.5, bodyTop + 18);
        c.lineTo(cx + headR * 0.5 + fi * 1.5, bodyTop + 21);
        c.stroke();
      }
      c.restore();
      // Pattern stripes
      c.save(); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 0.4;
      c.beginPath(); c.moveTo(cx - headR * 0.6, headY + headR + 1); c.quadraticCurveTo(cx, headY + headR + 4, cx + headR * 0.6, headY + headR + 1); c.stroke();
      c.restore();
      break;
    case 'extra_wings':
      c.globalAlpha = 0.45;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.moveTo(cx + s * bodyW, bodyTop + 6);
        c.quadraticCurveTo(cx + s * (bodyW + 32), bodyTop - 16, cx + s * (bodyW + 10), bodyTop + 30);
        c.closePath(); c.fill();
        c.beginPath(); c.moveTo(cx + s * bodyW, bodyTop + 12);
        c.quadraticCurveTo(cx + s * (bodyW + 26), bodyTop + 32, cx + s * (bodyW + 6), bodyTop + 40);
        c.closePath(); c.fill();
        // Feather detail lines
        c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.3;
        for (let fi = 0; fi < 4; fi++) {
          const fy = bodyTop + 8 + fi * 6;
          c.beginPath(); c.moveTo(cx + s * bodyW, fy);
          c.quadraticCurveTo(cx + s * (bodyW + 16 - fi * 2), fy + 3, cx + s * (bodyW + 8), fy + 8);
          c.stroke();
        }
        c.restore();
      }
      c.globalAlpha = 1;
      break;
    case 'cape':
      c.globalAlpha = 0.6;
      c.beginPath();
      c.moveTo(cx - bodyW + 2, bodyTop + 1);
      c.quadraticCurveTo(cx - bodyW - 12, bodyBot, cx - bodyW - 6, y + h * 0.82);
      c.lineTo(cx + bodyW + 6, y + h * 0.82);
      c.quadraticCurveTo(cx + bodyW + 12, bodyBot, cx + bodyW - 2, bodyTop + 1);
      c.closePath(); c.fill();
      // Fold lines
      c.save(); c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3; c.globalAlpha = 0.2;
      for (let f = -2; f <= 2; f++) {
        c.beginPath();
        c.moveTo(cx + f * 4, bodyTop + 4);
        c.quadraticCurveTo(cx + f * 5, bodyBot, cx + f * 4.5, y + h * 0.8);
        c.stroke();
      }
      c.restore();
      c.globalAlpha = 1;
      c.fillStyle = '#f4d03f'; c.beginPath(); c.arc(cx, bodyTop + 2, 2, 0, Math.PI*2); c.fill();
      break;
    case 'hat':
      c.beginPath(); c.ellipse(cx, headY - headR * 0.55, headR * 1.1, headR * 0.15, 0, 0, Math.PI*2); c.fill();
      c.beginPath();
      c.moveTo(cx - headR * 0.65, headY - headR * 0.55);
      c.quadraticCurveTo(cx, headY - headR * 1.6, cx + headR * 0.65, headY - headR * 0.55);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(cx - headR * 0.65, headY - headR * 0.65, headR * 1.3, 2);
      break;
    case 'flower_crown':
      const crY = headY - headR * 0.8;
      for (let i = -3; i <= 3; i++) {
        const fx = cx + i * headR * 0.26; const fy = crY + Math.abs(i) * 0.8;
        c.fillStyle = i % 2 === 0 ? color : '#fff'; c.beginPath(); c.arc(fx, fy, 2.5, 0, Math.PI*2); c.fill();
        c.fillStyle = '#f1c40f'; c.beginPath(); c.arc(fx, fy, 1, 0, Math.PI*2); c.fill();
      }
      c.strokeStyle = '#27ae60'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - headR * 0.8, crY + 1); c.quadraticCurveTo(cx, crY - 1, cx + headR * 0.8, crY + 1); c.stroke();
      break;
    case 'belt':
      c.fillRect(cx - bodyW - 1, waistY - 2, bodyW * 2 + 2, 3);
      c.strokeStyle = '#f4d03f'; c.lineWidth = 0.8; c.strokeRect(cx - 2.5, waistY - 2.5, 5, 4);
      break;
    case 'wristbands':
      for (let s = -1; s <= 1; s += 2) {
        const wx = s === -1 ? cx - bodyW - 8 : cx + bodyW + 8;
        c.fillRect(wx - 3, bodyBot - 8, 6, 4);
      }
      break;
    case 'tiara': {
      const tY = headY - headR * 0.75;
      c.beginPath();
      c.moveTo(cx - headR * 0.5, tY + 2);
      c.lineTo(cx - headR * 0.35, tY - 3);
      c.lineTo(cx - headR * 0.15, tY);
      c.lineTo(cx, tY - 5);
      c.lineTo(cx + headR * 0.15, tY);
      c.lineTo(cx + headR * 0.35, tY - 3);
      c.lineTo(cx + headR * 0.5, tY + 2);
      c.closePath(); c.fill();
      // Gems
      c.fillStyle = '#e84393'; c.beginPath(); c.arc(cx, tY - 3.5, 1, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3498db'; c.beginPath(); c.arc(cx - headR * 0.28, tY - 1, 0.8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3498db'; c.beginPath(); c.arc(cx + headR * 0.28, tY - 1, 0.8, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'earrings':
      for (let s = -1; s <= 1; s += 2) {
        const ex = cx + s * (headR + 1);
        const ey = headY + 1;
        c.beginPath(); c.arc(ex, ey + 3, 2, 0, Math.PI * 2); c.fill();
        c.strokeStyle = color; c.lineWidth = 0.4;
        c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex, ey + 1.5); c.stroke();
      }
      break;
    case 'bow_tie': {
      const btY = bodyTop + 2;
      c.beginPath();
      c.moveTo(cx, btY); c.quadraticCurveTo(cx - 6, btY - 3, cx - 7, btY);
      c.quadraticCurveTo(cx - 6, btY + 3, cx, btY); c.fill();
      c.beginPath();
      c.moveTo(cx, btY); c.quadraticCurveTo(cx + 6, btY - 3, cx + 7, btY);
      c.quadraticCurveTo(cx + 6, btY + 3, cx, btY); c.fill();
      c.fillStyle = _darken(color, 20);
      c.beginPath(); c.arc(cx, btY, 1.2, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'choker': {
      const ckY = headY + headR;
      c.strokeStyle = color; c.lineWidth = 1.5;
      c.beginPath(); c.arc(cx, ckY, headR * 0.55, 0.15, Math.PI - 0.15); c.stroke();
      // Center charm
      c.fillStyle = color;
      c.beginPath(); c.arc(cx, ckY + headR * 0.45, 1.5, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'backpack': {
      // Behind character
      c.globalAlpha = 0.5;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 10, bodyTop + 8, cx - bodyW - 10, waistY);
      c.quadraticCurveTo(cx - bodyW - 10, waistY + 6, cx - bodyW - 4, waistY + 6);
      c.lineTo(cx - bodyW - 4, bodyTop + 4);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      // Straps
      c.strokeStyle = _darken(color, 15); c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx - 3, bodyTop); c.lineTo(cx - 4, bodyTop + 12); c.stroke();
      c.beginPath(); c.moveTo(cx + 3, bodyTop); c.lineTo(cx + 4, bodyTop + 12); c.stroke();
      break;
    }
    case 'headband': {
      const hbY = headY - headR * 0.6;
      c.strokeStyle = color; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, headY, headR * 0.85, Math.PI + 0.4, -0.4); c.stroke();
      break;
    }
    case 'watch':
      c.fillRect(cx + bodyW + 6, bodyBot - 10, 5, 6);
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.5;
      c.strokeRect(cx + bodyW + 6, bodyBot - 10, 5, 6);
      // Watch face
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(cx + bodyW + 8.5, bodyBot - 7, 2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2c3e50'; c.lineWidth = 0.3;
      c.beginPath(); c.moveTo(cx + bodyW + 8.5, bodyBot - 7); c.lineTo(cx + bodyW + 8.5, bodyBot - 9); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW + 8.5, bodyBot - 7); c.lineTo(cx + bodyW + 10, bodyBot - 7); c.stroke();
      break;
    case 'sunglasses': {
      const sgY = headY - headR * 0.05;
      const sp2 = headR * 0.35;
      c.fillStyle = color;
      c.beginPath(); c.ellipse(cx - sp2, sgY, headR * 0.25, headR * 0.22, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(cx + sp2, sgY, headR * 0.25, headR * 0.22, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = color; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - sp2 + headR * 0.25, sgY); c.lineTo(cx + sp2 - headR * 0.25, sgY); c.stroke();
      c.beginPath(); c.moveTo(cx - sp2 - headR * 0.25, sgY); c.lineTo(cx - headR - 1, sgY - 1); c.stroke();
      c.beginPath(); c.moveTo(cx + sp2 + headR * 0.25, sgY); c.lineTo(cx + headR + 1, sgY - 1); c.stroke();
      // Reflection
      c.fillStyle = 'rgba(255,255,255,0.2)';
      c.beginPath(); c.ellipse(cx - sp2 - 1, sgY - 1, 2, 1.5, -0.3, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'pearl_necklace': {
      const pnR = 7;
      c.strokeStyle = 'rgba(0,0,0,0.05)'; c.lineWidth = 0.3;
      for (let i = -4; i <= 4; i++) {
        const angle = 0.3 + (i + 4) * (Math.PI - 0.6) / 8;
        const px = cx + Math.cos(angle) * pnR * -1;
        const py = bodyTop + 2 + Math.sin(angle) * pnR;
        c.fillStyle = color;
        c.beginPath(); c.arc(px, py, 1.5, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(px, py, 1.5, 0, Math.PI * 2); c.stroke();
      }
      break;
    }
    case 'beret': {
      c.beginPath();
      c.moveTo(cx - headR * 0.75, headY - headR * 0.55);
      c.quadraticCurveTo(cx - headR * 0.2, headY - headR * 1.3, cx + headR * 0.6, headY - headR * 0.7);
      c.quadraticCurveTo(cx + headR * 0.75, headY - headR * 0.55, cx + headR * 0.6, headY - headR * 0.5);
      c.lineTo(cx - headR * 0.75, headY - headR * 0.55);
      c.closePath(); c.fill();
      // Nub on top
      c.fillStyle = _darken(color, 10);
      c.beginPath(); c.arc(cx, headY - headR * 1.05, 1.5, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'pendant': {
      c.strokeStyle = _darken(color, 10); c.lineWidth = 0.5;
      c.beginPath(); c.arc(cx, bodyTop + 2, 6, 0.4, Math.PI - 0.4); c.stroke();
      // Pendant gem
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(cx, bodyTop + 6); c.lineTo(cx - 2.5, bodyTop + 9);
      c.lineTo(cx, bodyTop + 12); c.lineTo(cx + 2.5, bodyTop + 9);
      c.closePath(); c.fill();
      // Facet
      c.strokeStyle = _lighten(color, 25); c.lineWidth = 0.3;
      c.beginPath(); c.moveTo(cx, bodyTop + 7); c.lineTo(cx, bodyTop + 11); c.stroke();
      break;
    }
    case 'hair_clips':
      for (let s = -1; s <= 1; s += 2) {
        const hcX = cx + s * headR * 0.6;
        const hcY = headY - headR * 0.4;
        c.fillStyle = color;
        c.beginPath(); c.ellipse(hcX, hcY, 3, 1.5, s * 0.4, 0, Math.PI * 2); c.fill();
        // Star detail
        c.fillStyle = _lighten(color, 30);
        c.beginPath(); c.arc(hcX, hcY, 0.8, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'arm_bands':
      for (let s = -1; s <= 1; s += 2) {
        const abX = s === -1 ? cx - bodyW - 6 : cx + bodyW + 6;
        const abY = bodyTop + 12;
        c.fillRect(abX - 3, abY, 6, 3);
        c.strokeStyle = _darken(color, 15); c.lineWidth = 0.3;
        c.strokeRect(abX - 3, abY, 6, 3);
      }
      break;
    case 'feather_boa': {
      c.save(); c.globalAlpha = 0.5;
      const boaY = bodyTop + 4;
      for (let i = -5; i <= 5; i++) {
        const bx = cx + i * 5;
        const by = boaY + Math.sin(i * 0.8) * 2;
        c.beginPath(); c.ellipse(bx, by, 4, 2.5, i * 0.1, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      break;
    }
    case 'chain_necklace': {
      c.strokeStyle = color; c.lineWidth = 0.8;
      c.beginPath(); c.arc(cx, bodyTop + 2, 8, 0.25, Math.PI - 0.25); c.stroke();
      // Chain links
      for (let i = 0; i < 6; i++) {
        const a = 0.35 + i * (Math.PI - 0.7) / 5;
        const lx = cx + Math.cos(a) * -8;
        const ly = bodyTop + 2 + Math.sin(a) * 8;
        c.strokeStyle = color; c.lineWidth = 0.4;
        c.beginPath(); c.ellipse(lx, ly, 1.5, 1, a, 0, Math.PI * 2); c.stroke();
      }
      break;
    }
    case 'ribbon': {
      // Ribbon in hair
      const rbX = cx + headR * 0.5;
      const rbY = headY - headR * 0.6;
      c.fillStyle = color;
      // Bow loops
      c.beginPath(); c.ellipse(rbX - 3, rbY, 4, 2, -0.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(rbX + 3, rbY, 4, 2, 0.3, 0, Math.PI * 2); c.fill();
      // Center knot
      c.fillStyle = _darken(color, 15);
      c.beginPath(); c.arc(rbX, rbY, 1.2, 0, Math.PI * 2); c.fill();
      // Trailing ribbon
      c.fillStyle = color;
      c.beginPath(); c.moveTo(rbX, rbY + 1);
      c.quadraticCurveTo(rbX + 2, rbY + 8, rbX - 1, rbY + 12);
      c.lineTo(rbX + 1, rbY + 11);
      c.quadraticCurveTo(rbX + 3, rbY + 6, rbX + 1, rbY + 1);
      c.fill();
      break;
    }
    case 'monocle': {
      const mY = headY - headR * 0.05;
      const mSp = headR * 0.35;
      c.strokeStyle = color; c.lineWidth = 1;
      c.beginPath(); c.arc(cx + mSp, mY, headR * 0.23, 0, Math.PI * 2); c.stroke();
      // Chain
      c.strokeStyle = color; c.lineWidth = 0.3;
      c.beginPath(); c.moveTo(cx + mSp + headR * 0.23, mY);
      c.quadraticCurveTo(cx + headR + 3, mY + 5, cx + headR, headY + headR); c.stroke();
      break;
    }
    case 'suspenders':
      c.strokeStyle = color; c.lineWidth = 1.5;
      // Left suspender
      c.beginPath(); c.moveTo(cx - bodyW + 3, bodyBot); c.lineTo(cx - 3, bodyTop - 2); c.stroke();
      // Right suspender
      c.beginPath(); c.moveTo(cx + bodyW - 3, bodyBot); c.lineTo(cx + 3, bodyTop - 2); c.stroke();
      // Clips
      c.fillStyle = '#c0c0c0';
      c.fillRect(cx - bodyW + 1, bodyBot - 2, 4, 3);
      c.fillRect(cx + bodyW - 5, bodyBot - 2, 4, 3);
      break;
    case 'lei': {
      c.strokeStyle = 'rgba(0,0,0,0)';
      const leiR = 8;
      const leiColors = [color, _lighten(color, 20), '#fff', _darken(color, 10)];
      for (let i = 0; i < 10; i++) {
        const a = 0.2 + i * (Math.PI - 0.4) / 9;
        const lx = cx + Math.cos(a) * -leiR;
        const ly = bodyTop + 3 + Math.sin(a) * leiR;
        c.fillStyle = leiColors[i % 4];
        c.beginPath(); c.arc(lx, ly, 2.5, 0, Math.PI * 2); c.fill();
      }
      break;
    }
    case 'mask': {
      const mkY = headY - headR * 0.05;
      // Mask shape — draw left and right halves around eye openings
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx, mkY - headR * 0.35);
        c.quadraticCurveTo(cx + s * headR * 0.15, mkY - headR * 0.3, cx + s * headR * 0.15, mkY - headR * 0.17);
        c.ellipse(cx + s * headR * 0.3, mkY - headR * 0.05, headR * 0.15, headR * 0.12, 0, s === -1 ? 0 : Math.PI, s === -1 ? Math.PI : 0);
        c.quadraticCurveTo(cx + s * headR * 0.55, mkY + headR * 0.15, cx + s * headR * 0.7, mkY);
        c.quadraticCurveTo(cx + s * headR * 0.8, mkY - headR * 0.3, cx + s * headR * 0.4, mkY - headR * 0.25);
        c.quadraticCurveTo(cx + s * headR * 0.1, mkY - headR * 0.35, cx, mkY - headR * 0.35);
        c.closePath(); c.fill();
      }
      // Decorative edge
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.4;
      c.beginPath();
      c.moveTo(cx - headR * 0.7, mkY);
      c.quadraticCurveTo(cx - headR * 0.8, mkY - headR * 0.3, cx - headR * 0.4, mkY - headR * 0.25);
      c.quadraticCurveTo(cx, mkY - headR * 0.35, cx + headR * 0.4, mkY - headR * 0.25);
      c.quadraticCurveTo(cx + headR * 0.8, mkY - headR * 0.3, cx + headR * 0.7, mkY);
      c.stroke();
      break;
    }
  }
}

ACC_DEFS.forEach(d => {
  defItem('acc_' + d.id, d.name, 'accessory', d.tags, d.colors,
    (c, char, x, y, w, h, colIdx) => {
      drawAccessory(d.id, c, char, x, y, w, h, d.colors[colIdx % d.colors.length][0]);
    });
});

/* ── Backgrounds ── */
const BG_DEFS = [
  { id:'park',    name:'Park',    tags:['natural','casual'],     colors:[['#27ae60'],['#2ecc71'],['#1abc9c'],['#16a085']] },
  { id:'castle',  name:'Castle',  tags:['medieval','royal'],     colors:[['#7f8c8d'],['#95a5a6'],['#bdc3c7'],['#5d6d7e']] },
  { id:'beach',   name:'Beach',   tags:['summer','casual'],      colors:[['#f39c12'],['#e67e22'],['#f1c40f'],['#d4a017']] },
  { id:'space',   name:'Space',   tags:['scifi','cool'],         colors:[['#2c3e50'],['#1a1a2e'],['#0a0a1a'],['#1b2838']] },
  { id:'forest',  name:'Forest',  tags:['natural','magic'],      colors:[['#145a32'],['#0e4526'],['#1a7840'],['#0b3d1a']] },
  { id:'city',    name:'City',    tags:['urban','cool'],         colors:[['#2c3e50'],['#34495e'],['#5d6d7e'],['#1a252f']] },
  { id:'clouds',  name:'Clouds',  tags:['magical','fantasy'],    colors:[['#a8d8ea'],['#f8c8dc'],['#c8e6c9'],['#fff9c4']] },
  { id:'rainbow', name:'Rainbow', tags:['magical','colorful'],   colors:[['#e74c3c'],['#e84393'],['#9b59b6'],['#3498db']] },
  { id:'sunset',  name:'Sunset',  tags:['natural','warm'],       colors:[['#e67e22'],['#e74c3c'],['#f39c12'],['#c0392b']] },
  { id:'snow',    name:'Snow',    tags:['winter','cozy'],        colors:[['#d5e8f0'],['#b0c4de'],['#e8eef2'],['#a8c8dc']] },
  { id:'garden',  name:'Garden',  tags:['natural','cute'],       colors:[['#27ae60'],['#2ecc71'],['#1abc9c'],['#16a085']] },
  { id:'stage',   name:'Stage',   tags:['fancy','cool'],         colors:[['#8e44ad'],['#c0392b'],['#2c3e50'],['#1a5276']] },
];

function drawBG(style, c, w, h, color) {
  switch(style) {
    case 'park':
      c.fillStyle='#87ceeb';c.fillRect(0,0,w,h*0.6);
      c.fillStyle=color;c.fillRect(0,h*0.6,w,h*0.4);
      c.fillStyle='#5d4037';c.fillRect(60,h*0.35,12,h*0.25);c.fillRect(300,h*0.3,12,h*0.3);
      c.fillStyle='#27ae60';c.beginPath();c.arc(66,h*0.35,30,0,Math.PI*2);c.fill();c.beginPath();c.arc(306,h*0.3,35,0,Math.PI*2);c.fill();
      c.fillStyle='#f1c40f';c.beginPath();c.arc(350,50,25,0,Math.PI*2);c.fill();
      break;
    case 'castle':
      c.fillStyle='#5b6a7a';c.fillRect(0,0,w,h);
      c.fillStyle=color;c.fillRect(50,h*0.3,w-100,h*0.7);
      c.fillRect(30,h*0.15,50,h*0.85);c.fillRect(w-80,h*0.15,50,h*0.85);
      for(let i=0;i<5;i++){c.fillRect(30+i*12,h*0.12,8,12);c.fillRect(w-80+i*12,h*0.12,8,12);}
      c.fillStyle='#4a3728';c.beginPath();c.arc(w/2,h*0.7,30,Math.PI,0);c.fill();c.fillRect(w/2-30,h*0.7,60,h*0.3);
      break;
    case 'beach':
      c.fillStyle='#87ceeb';c.fillRect(0,0,w,h*0.45);
      c.fillStyle='#2e86c1';c.fillRect(0,h*0.45,w,h*0.15);
      c.fillStyle=color;c.fillRect(0,h*0.6,w,h*0.4);
      c.strokeStyle='rgba(255,255,255,0.3)';c.lineWidth=2;
      for(let i=0;i<3;i++){c.beginPath();c.moveTo(0,h*0.48+i*8);for(let xx=0;xx<w;xx+=40){c.quadraticCurveTo(xx+10,h*0.45+i*8,xx+20,h*0.48+i*8);c.quadraticCurveTo(xx+30,h*0.51+i*8,xx+40,h*0.48+i*8);}c.stroke();}
      c.fillStyle='#f1c40f';c.beginPath();c.arc(80,60,30,0,Math.PI*2);c.fill();
      break;
    case 'space':
      c.fillStyle=color;c.fillRect(0,0,w,h);
      for(let i=0;i<60;i++){const sx=Math.sin(i*127.1)*0.5*w+w/2;const sy=Math.cos(i*311.7)*0.5*h+h/2;const sr=0.5+(i%3)*0.5;c.fillStyle=`rgba(255,255,255,${0.4+Math.sin(i)*0.3})`;c.beginPath();c.arc(sx,sy,sr,0,Math.PI*2);c.fill();}
      c.fillStyle='#e74c3c';c.beginPath();c.arc(320,120,35,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(255,200,100,0.3)';c.lineWidth=3;c.beginPath();c.ellipse(320,120,55,12,-0.3,0,Math.PI*2);c.stroke();
      break;
    case 'forest':
      c.fillStyle=color;c.fillRect(0,0,w,h);
      for(let i=0;i<8;i++){const tx=i*55+20;const th=120+(i%3)*40;c.fillStyle='#3e2723';c.fillRect(tx,h-th,10,th);c.fillStyle=`rgba(30,${100+i*15},50,0.8)`;c.beginPath();c.arc(tx+5,h-th,30+i*3,0,Math.PI*2);c.fill();}
      c.fillStyle='#1a4d2e';c.fillRect(0,h*0.85,w,h*0.15);
      break;
    case 'city':
      c.fillStyle='#1a252f';c.fillRect(0,0,w,h);
      const buildings=[[30,0.4,50],[90,0.55,40],[140,0.35,45],[200,0.6,55],[260,0.45,40],[310,0.5,50],[360,0.38,35]];
      buildings.forEach(([bx,bh,bw])=>{c.fillStyle=color;c.fillRect(bx,h*(1-bh),bw,h*bh);c.fillStyle='rgba(255,223,100,0.5)';for(let wy=h*(1-bh)+10;wy<h-15;wy+=18){for(let wx=bx+5;wx<bx+bw-8;wx+=12){if(Math.sin(wx*wy)>-0.3)c.fillRect(wx,wy,6,8);}}});
      c.fillStyle='#2c3e50';c.fillRect(0,h*0.92,w,h*0.08);
      break;
    case 'clouds': {
      const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,color);grad.addColorStop(1,'#fff');c.fillStyle=grad;c.fillRect(0,0,w,h);
      c.fillStyle='rgba(255,255,255,0.6)';
      [[80,100],[200,200],[320,150],[50,350],[280,400],[160,480]].forEach(([cx2,cy])=>{c.beginPath();c.arc(cx2,cy,40,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx2+30,cy+5,30,0,Math.PI*2);c.fill();c.beginPath();c.arc(cx2-25,cy+8,28,0,Math.PI*2);c.fill();});
      break; }
    case 'rainbow':
      c.fillStyle='#87ceeb';c.fillRect(0,0,w,h);
      ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#8e44ad'].forEach((rc,i)=>{c.strokeStyle=rc;c.lineWidth=10;c.beginPath();c.arc(w/2,h*0.8,200-i*12,Math.PI,0);c.stroke();});
      c.fillStyle='#27ae60';c.fillRect(0,h*0.75,w,h*0.25);
      break;
    case 'sunset': {
      const sg=c.createLinearGradient(0,0,0,h);sg.addColorStop(0,'#1a1a2e');sg.addColorStop(0.3,'#e74c3c');sg.addColorStop(0.5,color);sg.addColorStop(0.7,'#f1c40f');sg.addColorStop(1,'#2c3e50');c.fillStyle=sg;c.fillRect(0,0,w,h);
      c.fillStyle='#f1c40f';c.beginPath();c.arc(w/2,h*0.45,50,0,Math.PI*2);c.fill();
      c.fillStyle='rgba(241,196,15,0.2)';c.beginPath();c.arc(w/2,h*0.45,70,0,Math.PI*2);c.fill();
      c.fillStyle='#1a1a2e';c.fillRect(0,h*0.85,w,h*0.15);
      break; }
    case 'snow': {
      const sng=c.createLinearGradient(0,0,0,h);sng.addColorStop(0,color);sng.addColorStop(1,'#fff');c.fillStyle=sng;c.fillRect(0,0,w,h);
      c.fillStyle='#fff';c.fillRect(0,h*0.7,w,h*0.3);
      // Snowflakes
      c.fillStyle='rgba(255,255,255,0.6)';
      for(let i=0;i<30;i++){const sx=Math.sin(i*97.3)*w*0.5+w/2;const sy=Math.cos(i*173.7)*h*0.5+h*0.35;c.beginPath();c.arc(sx,sy,1+i%2,0,Math.PI*2);c.fill();}
      // Trees
      for(let t=0;t<3;t++){const tx=80+t*140;c.fillStyle='#5d4037';c.fillRect(tx,h*0.5,8,h*0.2);c.fillStyle='#1e8449';for(let l=0;l<3;l++){c.beginPath();c.moveTo(tx+4,h*0.38+l*12);c.lineTo(tx-15+l*3,h*0.52+l*12);c.lineTo(tx+23-l*3,h*0.52+l*12);c.closePath();c.fill();}}
      break; }
    case 'garden': {
      c.fillStyle='#87ceeb';c.fillRect(0,0,w,h*0.5);
      c.fillStyle=color;c.fillRect(0,h*0.5,w,h*0.5);
      // Flowers
      const flowerColors=['#e84393','#f1c40f','#e74c3c','#9b59b6','#fff'];
      for(let i=0;i<12;i++){const fx=30+i*35;const fy=h*0.55+Math.sin(i*2)*15;
      c.fillStyle='#27ae60';c.fillRect(fx,fy,2,h-fy);
      c.fillStyle=flowerColors[i%5];for(let p=0;p<5;p++){const a=p*Math.PI*2/5;c.beginPath();c.arc(fx+1+Math.cos(a)*4,fy+Math.sin(a)*4,3,0,Math.PI*2);c.fill();}
      c.fillStyle='#f1c40f';c.beginPath();c.arc(fx+1,fy,2,0,Math.PI*2);c.fill();}
      break; }
    case 'stage': {
      c.fillStyle='#1a1a1a';c.fillRect(0,0,w,h);
      // Curtains
      c.fillStyle=color;
      c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(40,h*0.3,20,h);c.lineTo(0,h);c.closePath();c.fill();
      c.beginPath();c.moveTo(w,0);c.quadraticCurveTo(w-40,h*0.3,w-20,h);c.lineTo(w,h);c.closePath();c.fill();
      // Top valance
      c.beginPath();c.moveTo(0,0);c.lineTo(w,0);c.lineTo(w,40);c.quadraticCurveTo(w*0.75,55,w/2,40);c.quadraticCurveTo(w*0.25,25,0,40);c.closePath();c.fill();
      // Stage floor
      c.fillStyle='#3e2723';c.fillRect(0,h*0.85,w,h*0.15);
      // Spotlights
      c.fillStyle='rgba(255,255,200,0.08)';
      c.beginPath();c.moveTo(w*0.3,0);c.lineTo(w*0.15,h);c.lineTo(w*0.45,h);c.closePath();c.fill();
      c.beginPath();c.moveTo(w*0.7,0);c.lineTo(w*0.55,h);c.lineTo(w*0.85,h);c.closePath();c.fill();
      break; }
  }
}

BG_DEFS.forEach(d => {
  defItem('bg_' + d.id, d.name, 'background', d.tags, d.colors,
    (c2, char, x, y, w, h, colIdx) => {
      drawBG(d.id, c2, 400, 600, d.colors[colIdx % d.colors.length][0]);
    });
});


/* ================================================================
   CHALLENGE THEMES
   ================================================================ */
const CHALLENGE_THEMES = [
  { id:'beach_party',      name:'Beach Party',       tags:['summer','casual','sandals','beach'] },
  { id:'medieval_knight',  name:'Medieval Knight',   tags:['medieval','warrior','armor'] },
  { id:'space_explorer',   name:'Space Explorer',    tags:['scifi','cool','space'] },
  { id:'punk_rock',        name:'Punk Rock',         tags:['punk','cool','retro'] },
  { id:'royal_ball',       name:'Royal Ball',        tags:['royal','elegant','fancy'] },
  { id:'forest_fairy',     name:'Forest Fairy',      tags:['natural','magic','fantasy'] },
  { id:'cozy_winter',      name:'Cozy Winter',       tags:['cozy','warm','winter'] },
  { id:'night_out',        name:'Night Out',         tags:['elegant','cool','fancy'] },
  { id:'sporty_casual',    name:'Sporty Casual',     tags:['sporty','casual','simple'] },
  { id:'wizard_academy',   name:'Wizard Academy',    tags:['magic','fantasy','smart'] },
  { id:'urban_street',     name:'Urban Street',      tags:['urban','cool','casual'] },
  { id:'garden_party',     name:'Garden Party',      tags:['natural','elegant','cute'] },
  { id:'hero_costume',     name:'Hero Costume',      tags:['hero','cool','warrior'] },
  { id:'retro_disco',      name:'Retro Disco',       tags:['retro','colorful','cool'] },
  { id:'formal_gala',      name:'Formal Gala',       tags:['formal','elegant','fancy'] },
  { id:'summer_festival',  name:'Summer Festival',   tags:['summer','casual','colorful'] },
  { id:'enchanted_forest', name:'Enchanted Forest',  tags:['magic','natural','fantasy'] },
  { id:'pirate_adventure', name:'Pirate Adventure',  tags:['cool','warrior','casual'] },
  { id:'starlight_dream',  name:'Starlight Dream',   tags:['magical','fantasy','scifi'] },
  { id:'spring_bloom',     name:'Spring Bloom',      tags:['natural','cute','colorful'] },
];

/* ================================================================
   ACHIEVEMENTS
   ================================================================ */
const ACHIEVE_DEFS = [
  { id:'first_outfit',  icon:'👗', title:'First Look',         desc:'Save your first outfit' },
  { id:'fashionista',   icon:'💃', title:'Fashionista',        desc:'Save 10 outfits' },
  { id:'all_chars',     icon:'👥', title:'Character Collector', desc:'Dress up all 6 characters' },
  { id:'full_outfit',   icon:'✨', title:'Fully Dressed',      desc:'Equip all 6 slots at once' },
  { id:'challenge_1',   icon:'🏆', title:'Challenge Accepted', desc:'Complete your first challenge' },
  { id:'three_stars',   icon:'⭐', title:'Perfect Style',      desc:'Get 3 stars on a challenge' },
  { id:'challenge_10',  icon:'👑', title:'Style Master',       desc:'Complete 10 challenges' },
  { id:'all_categories',icon:'📦', title:'Category Explorer',  desc:'Use one item from every category' },
  { id:'color_lover',   icon:'🎨', title:'Color Lover',        desc:'Cycle through all color variants' },
  { id:'high_scorer',   icon:'💎', title:'Top Model',          desc:'Score 28+ on a single challenge' },
];

function checkAchievement(id) {
  if (achievements[id]) return;
  achievements[id] = true;
  saveJSON(ACHIEVE_KEY, achievements);
  showAchievementPopup(id);
  renderAchievements();
  Audio.achievement();
}

function showAchievementPopup(id) {
  const def = ACHIEVE_DEFS.find(a => a.id === id);
  if (!def) return;
  achievementPopupIcon.textContent = def.icon;
  achievementPopupTitle.textContent = t('duAch_' + id, def.title);
  achievementPopupDesc.textContent = t('duAchD_' + id, def.desc);
  achievementPopup.classList.add('show');
  setTimeout(() => achievementPopup.classList.remove('show'), 3000);
}

function renderAchievements() {
  achievementsList.innerHTML = '';
  ACHIEVE_DEFS.forEach(a => {
    const el = document.createElement('div');
    el.className = 'achievement-item' + (achievements[a.id] ? ' unlocked' : '');
    el.innerHTML = `<span class="ach-icon">${a.icon}</span><span>${t('duAch_' + a.id, a.title)}</span>`;
    achievementsList.appendChild(el);
  });
}

/* ================================================================
   STYLE THEMES (Theme Generator)
   ================================================================ */
const STYLE_THEMES = [
  'Y2K', 'Dark Academia', 'Space Queen', 'Futuristic Explorer',
  'Streetwear', 'Cottagecore', 'Cyberpunk', 'Fairy Tale',
  'Goth Glam', 'Preppy', 'Boho Chic', 'Retro Disco',
  'Pastel Dream', 'Punk Rock', 'Royal Elegance'
];

function suggestTheme() {
  const theme = STYLE_THEMES[Math.floor(Math.random() * STYLE_THEMES.length)];
  const overlay = document.getElementById('themeOverlay');
  const nameEl = document.getElementById('themeOverlayName');
  if (overlay && nameEl) {
    nameEl.textContent = theme;
    overlay.classList.add('visible');
    setTimeout(() => overlay.classList.remove('visible'), 4000);
  }
}

/* ================================================================
   RENDERING
   ================================================================ */
function render() {
  const W = canvas.width, H = canvas.height;
  const char = CHARACTERS[currentCharIdx];
  const margin = 50;
  const charX = margin, charY = 30;
  const charW = W - margin * 2, charH = H - 60;

  // Background
  if (equipped.background) {
    const bgItem = ITEMS.find(it => it.id === equipped.background.itemId);
    if (bgItem) bgItem.draw(ctx, char, charX, charY, charW, charH, equipped.background.colorIdx);
  } else {
    // Default gradient for light theme
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f8f4fa');
    g.addColorStop(1, '#efe6f2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Floor plane
    const floorGrad = ctx.createLinearGradient(0, H * 0.82, 0, H);
    floorGrad.addColorStop(0, 'rgba(0,0,0,0)');
    floorGrad.addColorStop(0.3, 'rgba(0,0,0,0.04)');
    floorGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    // Faint sparkle dots
    const now = Date.now() / 2000;
    ctx.fillStyle = 'rgba(200,180,220,0.06)';
    for (let i = 0; i < 12; i++) {
      const sx = (Math.sin(now + i * 2.1) * 0.4 + 0.5) * W;
      const sy = (Math.cos(now * 0.7 + i * 1.8) * 0.4 + 0.5) * H;
      const sr = 1 + Math.sin(now * 1.5 + i) * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 1. Cape/wings behind character
  if (equipped.accessory) {
    const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
    if (accItem && (accItem.id === 'acc_cape' || accItem.id === 'acc_extra_wings')) {
      accItem.draw(ctx, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
    }
  }

  // 2. Character base
  drawCharacter(ctx, charX, charY, charW, charH, char);

  // 3. Bottom OR Dress
  if (equipped.dress) {
    const item = ITEMS.find(it => it.id === equipped.dress.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.dress.colorIdx);
  } else {
    if (equipped.bottom) {
      const item = ITEMS.find(it => it.id === equipped.bottom.itemId);
      if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.bottom.colorIdx);
    }
    // 4. Top (if not using dress)
    if (equipped.top) {
      const item = ITEMS.find(it => it.id === equipped.top.itemId);
      if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.top.colorIdx);
    }
  }

  // 5. Shoes
  if (equipped.shoes) {
    const item = ITEMS.find(it => it.id === equipped.shoes.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.shoes.colorIdx);
  }

  // 6. Hair (AFTER clothing so it falls over tops/dresses)
  if (equipped.hair) {
    const item = ITEMS.find(it => it.id === equipped.hair.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.hair.colorIdx);
  }

  // 7. Accessories (non-cape/wings)
  if (equipped.accessory) {
    const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
    if (accItem && accItem.id !== 'acc_cape' && accItem.id !== 'acc_extra_wings') {
      accItem.draw(ctx, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
    }
  }
}

/* ================================================================
   UI — Character Select
   ================================================================ */
function buildCharSelect() {
  charSelectEl.innerHTML = '';
  CHARACTERS.forEach((char, i) => {
    const btn = document.createElement('button');
    btn.className = 'char-btn' + (i === currentCharIdx ? ' active' : '');
    btn.title = char.name;

    const mini = document.createElement('canvas');
    mini.width = 48; mini.height = 48;
    const mc = mini.getContext('2d');
    mc.clearRect(0, 0, 48, 48);
    mc.save();
    mc.scale(48 / 150, 48 / 230);
    drawCharacter(mc, 0, 5, 150, 220, char);
    mc.restore();

    btn.appendChild(mini);
    btn.onclick = () => {
      currentCharIdx = i;
      Audio.init(); Audio.resume(); Audio.characterSwitch();
      buildCharSelect();
      renderItemGrid();
      render();
      trackCharDressed();
    };
    charSelectEl.appendChild(btn);
  });
}

function trackCharDressed() {
  const cid = CHARACTERS[currentCharIdx].id;
  if (!stats.charsDressed.includes(cid)) {
    stats.charsDressed.push(cid);
    saveJSON(STATS_KEY, stats);
  }
  if (stats.charsDressed.length >= 6) checkAchievement('all_chars');
}

/* ================================================================
   UI — Category Tabs
   ================================================================ */
function buildCategoryTabs() {
  categoryTabsEl.innerHTML = '';
  const labels = {
    hair: t('duCatHair', 'Hair'), top: t('duCatTop', 'Top'),
    bottom: t('duCatBottom', 'Bottom'), dress: t('duCatDress', 'Dress'),
    shoes: t('duCatShoes', 'Shoes'),
    accessory: t('duCatAccessory', 'Accessory'), background: t('duCatBG', 'Background'),
  };
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-tab' + (cat === currentCategory ? ' active' : '');
    btn.textContent = labels[cat];
    btn.onclick = () => {
      currentCategory = cat;
      buildCategoryTabs();
      renderItemGrid();
    };
    categoryTabsEl.appendChild(btn);
  });
}

/* ================================================================
   UI — Item Grid
   ================================================================ */
function renderItemGrid() {
  itemGridEl.innerHTML = '';
  const catItems = ITEMS.filter(it => it.category === currentCategory);
  catItems.forEach(item => {
    const isEquipped = equipped[item.category] && equipped[item.category].itemId === item.id;
    const locked = item.premium && !isItemUnlocked(item.id);
    const card = document.createElement('div');
    card.className = 'item-card' + (isEquipped ? ' equipped' : '') + (locked ? ' locked' : '');

    const mini = document.createElement('canvas');
    mini.width = 56; mini.height = 56;
    const mc = mini.getContext('2d');
    const colorIdx = isEquipped ? equipped[item.category].colorIdx : 0;
    drawItemPreview(mc, item, colorIdx);
    card.appendChild(mini);

    if (item.premium) {
      const badge = document.createElement('div');
      badge.className = 'premium-badge';
      badge.textContent = locked ? '\uD83D\uDD12' : '\u2B50';
      card.appendChild(badge);
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'item-name';
    nameEl.textContent = t('duItem_' + item.id, item.name);
    card.appendChild(nameEl);

    if (isEquipped && !locked && item.colors.length > 1) {
      const swatches = document.createElement('div');
      swatches.className = 'color-swatches';
      item.colors.forEach((cols, ci) => {
        const dot = document.createElement('div');
        dot.className = 'color-dot' + (ci === colorIdx ? ' active' : '');
        dot.style.background = cols[0];
        dot.onclick = (e) => {
          e.stopPropagation();
          Audio.init(); Audio.resume(); Audio.colorChange();
          equipped[item.category].colorIdx = ci;
          if (!colorCycleCount[item.id]) colorCycleCount[item.id] = 0;
          colorCycleCount[item.id]++;
          if (colorCycleCount[item.id] >= item.colors.length) checkAchievement('color_lover');
          renderItemGrid();
          render();
        };
        swatches.appendChild(dot);
      });
      card.appendChild(swatches);
    }

    card.onclick = () => {
      Audio.init(); Audio.resume();
      if (locked) {
        showPremiumModal(item);
        return;
      }
      if (isEquipped) {
        delete equipped[item.category];
        Audio.unequip();
      } else {
        equipped[item.category] = { itemId: item.id, colorIdx: 0 };
        Audio.equip();
        trackCategoryUsed(item.category);
        if (item.category === 'dress') {
          delete equipped.top;
          delete equipped.bottom;
        } else if (item.category === 'top' || item.category === 'bottom') {
          delete equipped.dress;
        }
      }
      renderItemGrid();
      render();
      checkFullOutfit();
    };

    itemGridEl.appendChild(card);
  });
}

function drawItemPreview(mc, item, colorIdx) {
  mc.clearRect(0, 0, 56, 56);
  mc.save();
  if (item.category === 'background') {
    mc.scale(56 / 400, 56 / 600);
    item.draw(mc, CHARACTERS[currentCharIdx], 0, 0, 400, 600, colorIdx);
  } else {
    mc.scale(56 / 200, 56 / 300);
    const char = CHARACTERS[currentCharIdx];
    mc.fillStyle = 'rgba(255,255,255,0.05)';
    mc.beginPath(); mc.ellipse(100, 140, 35, 70, 0, 0, Math.PI * 2); mc.fill();
    item.draw(mc, char, 25, 15, 150, 240, colorIdx);
  }
  mc.restore();
}

function trackCategoryUsed(cat) {
  if (!stats.categoriesUsed.includes(cat)) {
    stats.categoriesUsed.push(cat);
    saveJSON(STATS_KEY, stats);
  }
  if (stats.categoriesUsed.length >= 6) checkAchievement('all_categories');
}

function checkFullOutfit() {
  const hasDress = !!equipped.dress;
  const hasTopBot = !!equipped.top && !!equipped.bottom;
  const hasCore = !!equipped.hair && !!equipped.shoes && !!equipped.accessory && !!equipped.background;
  if (hasCore && (hasDress || hasTopBot)) checkAchievement('full_outfit');
}

/* ================================================================
   ACTIONS — Randomize / Save / Load / Clear / Screenshot
   ================================================================ */
function randomizeOutfit() {
  Audio.init(); Audio.resume(); Audio.randomize();
  const useDress = Math.random() < 0.4;
  CATEGORIES.forEach(cat => {
    if (useDress && (cat === 'top' || cat === 'bottom')) { delete equipped[cat]; return; }
    if (!useDress && cat === 'dress') { delete equipped[cat]; return; }
    const catItems = ITEMS.filter(it => it.category === cat);
    const item = catItems[Math.floor(Math.random() * catItems.length)];
    const ci = Math.floor(Math.random() * item.colors.length);
    equipped[cat] = { itemId: item.id, colorIdx: ci };
    trackCategoryUsed(cat);
  });
  renderItemGrid();
  render();
  checkFullOutfit();
}

function saveOutfit() {
  Audio.init(); Audio.resume(); Audio.save();
  const charId = CHARACTERS[currentCharIdx].id;
  const key = SAVE_KEY + '_' + charId;
  const saved = loadJSON(key, []);
  if (saved.length >= 10) saved.shift();
  saved.push({ equipped: JSON.parse(JSON.stringify(equipped)), ts: Date.now() });
  saveJSON(key, saved);
  stats.outfitsSaved = (stats.outfitsSaved || 0) + 1;
  saveJSON(STATS_KEY, stats);
  if (stats.outfitsSaved >= 1) checkAchievement('first_outfit');
  if (stats.outfitsSaved >= 10) checkAchievement('fashionista');
}

function showLoadModal() {
  const charId = CHARACTERS[currentCharIdx].id;
  const key = SAVE_KEY + '_' + charId;
  const saved = loadJSON(key, []);
  savedOutfitsEl.innerHTML = '';

  if (saved.length === 0) {
    savedOutfitsEl.innerHTML = '<p style="color:var(--du-muted);font-size:0.8rem;grid-column:1/-1;">No saved outfits yet.</p>';
  } else {
    saved.forEach((outfit, i) => {
      const slot = document.createElement('div');
      slot.className = 'saved-outfit';

      const mini = document.createElement('canvas');
      mini.width = 80; mini.height = 120;
      const mc = mini.getContext('2d');
      mc.scale(80 / 400, 120 / 600);
      const oldEquipped = equipped;
      equipped = outfit.equipped;
      mc.fillStyle = '#f8f4fa'; mc.fillRect(0, 0, 400, 600);
      renderToCtx(mc);
      equipped = oldEquipped;
      mc.setTransform(1, 0, 0, 1, 0, 0);

      slot.appendChild(mini);
      const label = document.createElement('div');
      label.className = 'outfit-label';
      label.textContent = '#' + (i + 1);
      slot.appendChild(label);

      slot.onclick = () => {
        equipped = JSON.parse(JSON.stringify(outfit.equipped));
        renderItemGrid();
        render();
        loadModal.classList.remove('visible');
      };
      savedOutfitsEl.appendChild(slot);
    });
  }

  loadModal.classList.add('visible');
}

function renderToCtx(c) {
  const W = 400, H = 600;
  const char = CHARACTERS[currentCharIdx];
  const margin = 50, charX = margin, charY = 30;
  const charW = W - margin * 2, charH = H - 60;

  if (equipped.background) {
    const bgItem = ITEMS.find(it => it.id === equipped.background.itemId);
    if (bgItem) bgItem.draw(c, char, charX, charY, charW, charH, equipped.background.colorIdx);
  }
  // Cape/wings behind
  if (equipped.accessory) {
    const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
    if (accItem && (accItem.id === 'acc_cape' || accItem.id === 'acc_extra_wings'))
      accItem.draw(c, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
  }
  // Base character
  drawCharacter(c, charX, charY, charW, charH, char);
  // Bottom/Dress
  if (equipped.dress) {
    const it = ITEMS.find(i2 => i2.id === equipped.dress.itemId);
    if (it) it.draw(c, char, charX, charY, charW, charH, equipped.dress.colorIdx);
  } else {
    if (equipped.bottom) { const it = ITEMS.find(i2 => i2.id === equipped.bottom.itemId); if (it) it.draw(c, char, charX, charY, charW, charH, equipped.bottom.colorIdx); }
    if (equipped.top) { const it = ITEMS.find(i2 => i2.id === equipped.top.itemId); if (it) it.draw(c, char, charX, charY, charW, charH, equipped.top.colorIdx); }
  }
  // Shoes
  if (equipped.shoes) { const it = ITEMS.find(i2 => i2.id === equipped.shoes.itemId); if (it) it.draw(c, char, charX, charY, charW, charH, equipped.shoes.colorIdx); }
  // Hair (after clothing)
  if (equipped.hair) { const it = ITEMS.find(i2 => i2.id === equipped.hair.itemId); if (it) it.draw(c, char, charX, charY, charW, charH, equipped.hair.colorIdx); }
  // Accessories (non-cape/wings)
  if (equipped.accessory) {
    const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
    if (accItem && accItem.id !== 'acc_cape' && accItem.id !== 'acc_extra_wings')
      accItem.draw(c, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
  }
}

function clearOutfit() {
  equipped = {};
  Audio.init(); Audio.resume(); Audio.unequip();
  renderItemGrid();
  render();
}

function takeScreenshot() {
  render();
  const link = document.createElement('a');
  link.download = 'dress-up-' + CHARACTERS[currentCharIdx].id + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ================================================================
   CHALLENGE MODE
   ================================================================ */
function startChallenge() {
  Audio.init(); Audio.resume(); Audio.challengeStart();
  challengeActive = true;
  equipped = {};
  currentChallengeTheme = CHALLENGE_THEMES[Math.floor(Math.random() * CHALLENGE_THEMES.length)];
  challengeTimer = 60;

  hudScore.style.display = 'flex';
  hudTimer.style.display = 'block';
  scoreDisplay.textContent = '0';
  hudTimer.textContent = '60';
  hudTimer.classList.remove('warning');

  renderItemGrid();
  render();

  challengeInterval = setInterval(() => {
    challengeTimer--;
    hudTimer.textContent = challengeTimer;
    if (challengeTimer <= 10) hudTimer.classList.add('warning');
    if (challengeTimer <= 0) {
      endChallenge();
    }
  }, 1000);

  challengeTheme.textContent = t('duTheme_' + currentChallengeTheme.id, currentChallengeTheme.name);
  challengeOverlay.classList.add('visible');
  challengeStars.style.display = 'none';
  challengeScoreDisplay.style.display = 'none';
  challengeCloseBtn.style.display = 'none';
  setTimeout(() => {
    challengeOverlay.classList.remove('visible');
  }, 2000);
}

function endChallenge() {
  clearInterval(challengeInterval);
  challengeActive = false;
  Audio.challengeEnd();

  const score = calculateScore();
  const stars = score >= 30 ? 3 : score >= 18 ? 2 : score >= 8 ? 1 : 0;

  stats.challengesCompleted = (stats.challengesCompleted || 0) + 1;
  saveJSON(STATS_KEY, stats);

  challengeTheme.textContent = t('duTheme_' + currentChallengeTheme.id, currentChallengeTheme.name);
  challengeScoreDisplay.textContent = t('score', 'Score') + ': ' + score;
  challengeScoreDisplay.style.display = 'block';
  challengeStars.style.display = 'flex';
  challengeCloseBtn.style.display = 'block';

  ['star1', 'star2', 'star3'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('earned');
    if (i < stars) {
      setTimeout(() => {
        el.classList.add('earned');
        Audio.starEarn();
      }, 500 + i * 400);
    }
  });

  challengeOverlay.classList.add('visible');
  hudTimer.style.display = 'none';

  let coinReward = 5 + stars * 5;
  addCoins(coinReward);

  checkAchievement('challenge_1');
  if (stars >= 3) checkAchievement('three_stars');
  if (stats.challengesCompleted >= 10) checkAchievement('challenge_10');
  if (score >= 35) checkAchievement('high_scorer');

  if (typeof Leaderboard !== 'undefined') {
    Leaderboard.submitScore('dress-up', score);
  }
  if (typeof Arcade !== 'undefined') {
    Arcade.onGameOver('dress-up', score);
  }
}

function calculateScore() {
  if (!currentChallengeTheme) return 0;
  const targetTags = currentChallengeTheme.tags;
  let score = 0;

  // --- Related & distant tag maps ---
  const related = {
    casual: ['simple', 'sporty', 'beach'], elegant: ['formal', 'fancy', 'royal'],
    cool: ['punk', 'retro', 'edgy', 'urban'], natural: ['cute', 'colorful'],
    magic: ['fantasy', 'magical'], summer: ['casual', 'beach', 'colorful'],
    warm: ['cozy', 'winter'], medieval: ['warrior', 'armor', 'fantasy'],
    royal: ['elegant', 'fancy', 'formal'], fancy: ['elegant', 'royal'],
    punk: ['cool', 'retro', 'edgy', 'urban'], hero: ['warrior', 'cool', 'armor'],
    warrior: ['medieval', 'hero', 'armor'], fantasy: ['magic', 'magical', 'natural'],
    scifi: ['space', 'cool', 'urban'], edgy: ['punk', 'cool', 'urban'],
    urban: ['cool', 'casual', 'edgy'], colorful: ['cute', 'natural', 'summer'],
    cute: ['natural', 'colorful'], formal: ['elegant', 'fancy', 'royal'],
    sporty: ['casual', 'simple'], cozy: ['warm', 'winter', 'casual'],
    beach: ['summer', 'casual', 'sandals'], space: ['scifi', 'cool'],
    armor: ['warrior', 'medieval', 'hero'], smart: ['formal', 'elegant'],
    magical: ['magic', 'fantasy'], simple: ['casual', 'sporty'],
    winter: ['warm', 'cozy'], retro: ['punk', 'cool', 'colorful'],
  };

  // Collect all equipped items for cohesion scoring
  const equippedItems = [];

  // --- Per-item theme matching ---
  CATEGORIES.forEach(cat => {
    if (!equipped[cat]) return;
    const item = ITEMS.find(it => it.id === equipped[cat].itemId);
    if (!item) return;
    equippedItems.push(item);

    item.tags.forEach(tag => {
      if (targetTags.includes(tag)) {
        score += 3; // exact match
      } else if (related[tag] && related[tag].some(r => targetTags.includes(r))) {
        score += 1; // related match
      }
    });

    // Premium item bonus: +1 per premium piece that has at least one theme match
    if (item.premium && item.tags.some(tag => targetTags.includes(tag))) {
      score += 1;
    }
  });

  // --- Outfit cohesion bonus ---
  // Reward items that share tags with each other (not just the theme)
  if (equippedItems.length >= 3) {
    const tagCounts = {};
    equippedItems.forEach(item => {
      const seen = new Set();
      item.tags.forEach(tag => {
        if (!seen.has(tag)) { tagCounts[tag] = (tagCounts[tag] || 0) + 1; seen.add(tag); }
      });
    });
    // Each tag shared by 3+ items adds a cohesion point (max 4)
    let cohesion = 0;
    for (const tag in tagCounts) {
      if (tagCounts[tag] >= 3) cohesion++;
    }
    score += Math.min(cohesion, 4);
  }

  // --- Slot coverage bonus (progressive) ---
  const filledSlots = CATEGORIES.filter(c => equipped[c]).length;
  const hasDress = !!equipped.dress;
  const hasTopBot = !!equipped.top && !!equipped.bottom;
  const hasOutfit = hasDress || hasTopBot;

  if (filledSlots >= 3) score += 1;
  if (filledSlots >= 4) score += 1;
  if (filledSlots >= 5 && hasOutfit) score += 2;
  if (filledSlots >= 6 && hasOutfit) score += 3; // full outfit bonus

  scoreDisplay.textContent = score;
  return score;
}

/* ================================================================
   RUNWAY MODE
   ================================================================ */
let runwayActive = false;
let runwayOffset = 0;
let runwayAnimId = null;

function startRunway() {
  if (runwayActive || challengeActive) return;
  Audio.init(); Audio.resume();
  runwayActive = true;
  runwayOffset = -450;
  canvas.parentElement.classList.add('runway-active');

  function animateRunway() {
    runwayOffset += 4;
    if (runwayOffset > 500) {
      runwayActive = false;
      runwayOffset = 0;
      canvas.parentElement.classList.remove('runway-active');
      render();
      return;
    }

    const W = canvas.width, H = canvas.height;
    const char = CHARACTERS[currentCharIdx];
    const margin = 50;
    const charW = W - margin * 2, charH = H - 60;
    const charX = margin + runwayOffset;
    const charY = 30;

    if (equipped.background) {
      const bgItem = ITEMS.find(it => it.id === equipped.background.itemId);
      if (bgItem) bgItem.draw(ctx, char, margin, charY, charW, charH, equipped.background.colorIdx);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#f8f4fa'); g.addColorStop(1, '#efe6f2');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // Spotlight
    ctx.save();
    const spotX = charX + charW / 2;
    const spot = ctx.createRadialGradient(spotX, H * 0.4, 20, spotX, H * 0.4, 200);
    spot.addColorStop(0, 'rgba(255,255,255,0.06)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Cape/wings
    if (equipped.accessory) {
      const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
      if (accItem && (accItem.id === 'acc_cape' || accItem.id === 'acc_extra_wings'))
        accItem.draw(ctx, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
    }
    drawCharacter(ctx, charX, charY, charW, charH, char);
    // Bottom/Dress
    if (equipped.dress) {
      const it = ITEMS.find(i2 => i2.id === equipped.dress.itemId); if (it) it.draw(ctx, char, charX, charY, charW, charH, equipped.dress.colorIdx);
    } else {
      if (equipped.bottom) { const it = ITEMS.find(i2 => i2.id === equipped.bottom.itemId); if (it) it.draw(ctx, char, charX, charY, charW, charH, equipped.bottom.colorIdx); }
      if (equipped.top) { const it = ITEMS.find(i2 => i2.id === equipped.top.itemId); if (it) it.draw(ctx, char, charX, charY, charW, charH, equipped.top.colorIdx); }
    }
    if (equipped.shoes) { const it = ITEMS.find(i2 => i2.id === equipped.shoes.itemId); if (it) it.draw(ctx, char, charX, charY, charW, charH, equipped.shoes.colorIdx); }
    // Hair after clothing
    if (equipped.hair) { const it = ITEMS.find(i2 => i2.id === equipped.hair.itemId); if (it) it.draw(ctx, char, charX, charY, charW, charH, equipped.hair.colorIdx); }
    if (equipped.accessory) {
      const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
      if (accItem && accItem.id !== 'acc_cape' && accItem.id !== 'acc_extra_wings')
        accItem.draw(ctx, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
    }

    runwayAnimId = requestAnimationFrame(animateRunway);
  }

  runwayAnimId = requestAnimationFrame(animateRunway);
}

/* ================================================================
   BACKGROUND MUSIC INTEGRATION
   ================================================================ */
function initMusicSelector() {
  const sel = document.getElementById('musicSelect');
  if (!sel) return;
  const saved = localStorage.getItem('dressUpMusic') || 'none';
  sel.value = saved;
  sel.onchange = () => {
    Audio.init(); Audio.resume();
    const songId = sel.value;
    localStorage.setItem('dressUpMusic', songId);
    if (songId === 'none') BGMusic.stop();
    else BGMusic.play(songId);
  };
  if (saved !== 'none') {
    const startMusic = () => {
      Audio.init(); Audio.resume();
      if (!Audio.isMuted()) BGMusic.play(saved);
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
    };
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('keydown', startMusic, { once: true });
  }
}

/* ================================================================
   EVENTS & INIT
   ================================================================ */
// Action buttons
document.getElementById('randomizeBtn').onclick = randomizeOutfit;
document.getElementById('saveBtn').onclick = saveOutfit;
document.getElementById('loadBtn').onclick = showLoadModal;
document.getElementById('clearBtn').onclick = clearOutfit;
document.getElementById('challengeBtn').onclick = startChallenge;
document.getElementById('screenshotBtn').onclick = takeScreenshot;
document.getElementById('runwayBtn').onclick = startRunway;

// Theme button
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) themeBtn.onclick = suggestTheme;

// Modal close
loadModalClose.onclick = () => loadModal.classList.remove('visible');
loadModal.onclick = (e) => { if (e.target === loadModal) loadModal.classList.remove('visible'); };

// Challenge close
challengeCloseBtn.onclick = () => {
  challengeOverlay.classList.remove('visible');
  hudScore.style.display = 'none';
};

// Mute
document.getElementById('muteButton').onclick = () => {
  Audio.init();
  const m = Audio.toggle();
  document.getElementById('muteButton').textContent = m ? t('unmute', 'Unmute') : t('duMute', 'Mute');
  if (m) {
    BGMusic.stop();
  } else {
    const sel = document.getElementById('musicSelect');
    const songId = sel ? sel.value : localStorage.getItem('dressUpMusic');
    if (songId && songId !== 'none') BGMusic.play(songId);
  }
};

// Fullscreen
document.getElementById('fullscreenButton').onclick = () => {
  const gc = document.getElementById('gameContainer');
  if (!document.fullscreenElement) gc.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
};

// Achievements toggle
achievementsToggle.onclick = () => {
  achievementsList.classList.toggle('open');
};

// Init leaderboard
if (typeof Leaderboard !== 'undefined') {
  const lbPanel = document.getElementById('leaderboardPanel');
  lbPanel.appendChild(Leaderboard.createPanel('dress-up'));
}

// Init i18n
if (typeof I18N !== 'undefined') {
  I18N.applyDOM();
  if (typeof I18N.createSelector === 'function') {
    I18N.createSelector(document.querySelector('.game__header'));
  }
}

// Shop (shared module)
Shop.init({
  gameId: 'dress-up',
  buttonTarget: '#shopBtn',
  bundles: [
    { id: 'fantasy', name: 'Fantasy Bundle', desc: 'Armor, Wizard Robe, Armor Greaves, Armored Boots, Crown, Castle BG', price: '~$2',
      kofiUrl: 'https://ko-fi.com/s/FANTASY_PRODUCT_ID', items: ['top_armor','top_wizard_robe','bottom_armor_greaves','shoes_armored_boots','acc_crown','bg_castle'] },
    { id: 'glam', name: 'Glam Bundle', desc: 'Corset, Kimono, Flowing Skirt, Heels, Long Flowing Hair, Rainbow BG, Ball Gown', price: '~$2',
      kofiUrl: 'https://ko-fi.com/s/GLAM_PRODUCT_ID', items: ['top_corset','top_kimono','bottom_flowing_skirt','shoes_heels','hair_long_flowing','bg_rainbow','dress_ball_gown'] },
    { id: 'adventure', name: 'Adventure Bundle', desc: 'Cape, Extra Wings, Braids, Curly Hair, Platforms, Space BG, Fairy Dress', price: '~$2',
      kofiUrl: 'https://ko-fi.com/s/ADVENTURE_PRODUCT_ID', items: ['acc_cape','acc_extra_wings','hair_braids','hair_curly','shoes_platforms','bg_space','dress_fairy_dress'] },
    { id: 'premiumpass', name: 'Premium Pass', desc: 'ALL premium items unlocked!', price: '~$4',
      kofiUrl: 'https://ko-fi.com/s/PREMIUMPASS_PRODUCT_ID', items: Array.from(PREMIUM_IDS) },
  ],
  codes: {
    'FANTASY2026': 'fantasy',
    'GLAM2026': 'glam',
    'ADVENTURE2026': 'adventure',
    'SLAYPASS2026': '__all__'
  },
  onUnlock: function (itemIds) {
    itemIds.forEach(function (id) {
      if (!unlockedPremium.includes(id)) unlockedPremium.push(id);
    });
    saveUnlocked();
    renderItemGrid();
    render();
  }
});

// Premium modal close
const premiumModal = document.getElementById('premiumModal');
const premiumClose = document.getElementById('premiumModalClose');
if (premiumClose) {
  premiumClose.onclick = function () { premiumModal.classList.remove('visible'); };
}
if (premiumModal) {
  premiumModal.onclick = function (e) {
    if (e.target === premiumModal) premiumModal.classList.remove('visible');
  };
}

// First init
Audio.init();
if (Audio.isMuted()) {
  document.getElementById('muteButton').textContent = t('unmute', 'Unmute');
}

buildCharSelect();
buildCategoryTabs();
renderItemGrid();
renderAchievements();
render();
updateCoinsHUD();
initMusicSelector();

// Re-render on lang change
window.addEventListener('langchange', () => {
  buildCategoryTabs();
  renderItemGrid();
  renderAchievements();
  if (typeof I18N !== 'undefined') I18N.applyDOM();
});

})();
