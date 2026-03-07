/* ================================================================
   Dress-Up Game — Main Engine
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
let currentCategory = 'hair';
let equipped = {}; // { hair: {itemId, colorIdx}, top: {...}, ... }
let challengeActive = false;
let challengeTimer = 0;
let challengeInterval = null;
let currentChallengeTheme = null;
let colorCycleCount = {}; // itemId -> count of color cycles

const CATEGORIES = ['hair','top','bottom','dress','shoes','accessory','background'];
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

/* ── Coins Economy ── */
let coins = 0; // loaded after loadJSON is defined
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

// Load coins & unlocked now that loadJSON is defined
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
  { id:'human_girl', name:'Girl',  emoji:'👧', skin:'#fce4d8', hair:'#6b3a2a', eyeColor:'#5ba3d9' },
  { id:'human_boy',  name:'Boy',   emoji:'👦', skin:'#f8d8c4', hair:'#2c1810', eyeColor:'#4db882' },
  { id:'wolf_furry', name:'Wolf',  emoji:'🐺', skin:'#a0b0c0', hair:'#4a4a4a', eyeColor:'#f0a030' },
  { id:'cat',        name:'Cat',   emoji:'🐱', skin:'#fde8d5', hair:'#e8a87c', eyeColor:'#50c878' },
  { id:'elf',        name:'Elf',   emoji:'🧝', skin:'#fde8e0', hair:'#f7dc6f', eyeColor:'#a06cc8' },
  { id:'fairy',      name:'Fairy', emoji:'🧚', skin:'#fce0e4', hair:'#f1948a', eyeColor:'#e86aa0' },
];

/* ── Shared chibi body metrics — every draw function uses this ── */
function M(x, y, w, h) {
  const cx = x + w / 2;
  const headR = w * 0.28;          // chibi head (proportionate)
  const headY = y + h * 0.23;
  const bodyTop = headY + headR + 1;
  const bodyBot = y + h * 0.55;
  const bodyW = w * 0.14;          // solid chibi torso
  const legBot = y + h * 0.72;
  const footY = y + h * 0.76;
  return { cx, headR, headY, bodyTop, bodyBot, bodyW, legBot, footY };
}

function drawCharacter(c, x, y, w, h, char) {
  const m = M(x, y, w, h);
  const { cx, headR, headY, bodyTop, bodyBot, bodyW, legBot, footY } = m;
  const sk = char.skin;
  const isWolf = char.id === 'wolf_furry';
  const isCat = char.id === 'cat';
  const isElf = char.id === 'elf';
  const isFairy = char.id === 'fairy';
  const isBoy = char.id === 'human_boy';
  const furColor = isWolf ? '#8e9eaf' : sk;

  // ── Tail (behind body) ──
  if (isWolf) {
    c.strokeStyle = '#7a8a9a'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + bodyW, bodyBot - 4);
    c.quadraticCurveTo(cx + bodyW + 25, bodyBot - 20, cx + bodyW + 18, bodyBot - 38);
    c.stroke();
  } else if (isCat) {
    c.strokeStyle = _darken(sk, 15); c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + bodyW, bodyBot - 3);
    c.bezierCurveTo(cx+bodyW+25, bodyBot-10, cx+bodyW+30, bodyBot-30, cx+bodyW+18, bodyBot-40);
    c.stroke();
  }

  // ── Wings (fairy) ──
  if (isFairy) {
    const now = Date.now() / 1200;
    const wf = Math.sin(now) * 2;
    c.save();
    c.globalAlpha = 0.2;
    c.fillStyle = '#e84393';
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath();
      c.moveTo(cx + s*(bodyW-1), bodyTop+8);
      c.quadraticCurveTo(cx+s*(bodyW+28+wf), bodyTop-12, cx+s*(bodyW+6), bodyTop+32);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx + s*(bodyW-1), bodyTop+16);
      c.quadraticCurveTo(cx+s*(bodyW+20+wf), bodyTop+38, cx+s*(bodyW+3), bodyTop+42);
      c.closePath(); c.fill();
    }
    c.restore();
  }

  // ── Body ──
  const torsoH = bodyBot - bodyTop;
  c.fillStyle = furColor;
  c.beginPath();
  c.ellipse(cx, bodyTop + torsoH/2, bodyW, torsoH/2, 0, 0, Math.PI*2);
  c.fill();
  if (isWolf) {
    c.fillStyle = '#b0bec5';
    c.beginPath(); c.ellipse(cx, bodyTop+torsoH/2+3, bodyW*0.5, torsoH/2*0.45, 0, 0, Math.PI*2); c.fill();
  }

  // ── Arms ──
  c.strokeStyle = furColor; c.lineWidth = w*0.05; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx-bodyW, bodyTop+10); c.lineTo(cx-bodyW-11, bodyBot-6); c.stroke();
  c.beginPath(); c.moveTo(cx+bodyW, bodyTop+10); c.lineTo(cx+bodyW+11, bodyBot-6); c.stroke();

  // Paw hands for wolf/cat
  if (isWolf || isCat) {
    c.fillStyle = isWolf ? '#7a8a9a' : '#e8c8a0';
    c.beginPath(); c.arc(cx-bodyW-11, bodyBot-5, 4.5, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx+bodyW+11, bodyBot-5, 4.5, 0, Math.PI*2); c.fill();
  }

  // ── Legs ──
  c.strokeStyle = furColor; c.lineWidth = w*0.055;
  c.beginPath(); c.moveTo(cx-7, bodyBot); c.lineTo(cx-9, legBot); c.stroke();
  c.beginPath(); c.moveTo(cx+7, bodyBot); c.lineTo(cx+9, legBot); c.stroke();

  // ── Feet ──
  const footColor = (isWolf || isCat) ? (isWolf ? '#7a8a9a' : '#e8c8a0') : sk;
  c.fillStyle = footColor;
  c.beginPath(); c.ellipse(cx-9, footY, 7, 3.5, 0, 0, Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(cx+9, footY, 7, 3.5, 0, 0, Math.PI*2); c.fill();

  // ── Head ──
  if (isWolf) {
    c.fillStyle = '#8e9eaf';
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
    // Snout
    c.fillStyle = '#a0b0c0';
    c.beginPath(); c.ellipse(cx, headY+headR*0.4, headR*0.35, headR*0.25, 0, 0, Math.PI*2); c.fill();
    // Nose
    c.fillStyle = '#3d4f5f';
    c.beginPath(); c.ellipse(cx, headY+headR*0.25, 3, 2, 0, 0, Math.PI*2); c.fill();
    // Ears
    c.fillStyle = '#8e9eaf';
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(cx+s*headR*0.55, headY-headR*0.55);
      c.lineTo(cx+s*headR*0.25, headY-headR*1.2); c.lineTo(cx-s*headR*0.05, headY-headR*0.5); c.fill();
    }
    c.fillStyle = '#e8c8b0';
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(cx+s*headR*0.42, headY-headR*0.57);
      c.lineTo(cx+s*headR*0.27, headY-headR*1.02); c.lineTo(cx-s*headR*0.0, headY-headR*0.53); c.fill();
    }
  } else if (isCat) {
    c.fillStyle = sk;
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
    // Ears
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = sk;
      c.beginPath(); c.moveTo(cx+s*headR*0.6, headY-headR*0.45);
      c.lineTo(cx+s*headR*0.3, headY-headR*1.15); c.lineTo(cx, headY-headR*0.4); c.fill();
      c.fillStyle = '#f8b4c8';
      c.beginPath(); c.moveTo(cx+s*headR*0.48, headY-headR*0.48);
      c.lineTo(cx+s*headR*0.32, headY-headR*0.98); c.lineTo(cx+s*headR*0.05, headY-headR*0.44); c.fill();
    }
    // Nose
    c.fillStyle = '#e8a87c';
    c.beginPath(); c.moveTo(cx, headY+headR*0.1); c.lineTo(cx-2.5, headY+headR*0.2); c.lineTo(cx+2.5, headY+headR*0.2); c.fill();
    // Whiskers
    c.strokeStyle = 'rgba(160,160,160,0.5)'; c.lineWidth = 0.6; c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(cx+s*5, headY+headR*0.16); c.lineTo(cx+s*20, headY+headR*0.1); c.stroke();
      c.beginPath(); c.moveTo(cx+s*5, headY+headR*0.22); c.lineTo(cx+s*20, headY+headR*0.22); c.stroke();
    }
  } else if (isElf) {
    c.fillStyle = sk;
    c.beginPath(); c.ellipse(cx, headY, headR*0.92, headR, 0, 0, Math.PI*2); c.fill();
    // Pointed ears
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = sk;
      c.beginPath(); c.moveTo(cx+s*headR*0.82, headY-2);
      c.lineTo(cx+s*headR*1.3, headY-headR*0.45); c.lineTo(cx+s*headR*0.82, headY+5); c.fill();
    }
  } else {
    c.fillStyle = sk;
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
  }

  // ── Eyes ──
  const eyeY = headY + headR * 0.05;
  const eyeSp = headR * 0.38;
  const eyeW = headR * 0.26;
  const eyeH = headR * 0.34;

  for (let s = -1; s <= 1; s += 2) {
    const ex = cx + s * eyeSp;
    // Sclera
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI*2); c.fill();
    // Iris
    const iR = eyeW * 0.7;
    c.fillStyle = char.eyeColor;
    if (isCat) {
      c.beginPath(); c.ellipse(ex, eyeY, iR*0.6, iR*1.1, 0, 0, Math.PI*2); c.fill();
      c.fillStyle = '#111';
      c.beginPath(); c.ellipse(ex, eyeY, iR*0.12, iR*0.9, 0, 0, Math.PI*2); c.fill();
    } else if (isWolf) {
      c.beginPath(); c.arc(ex, eyeY, iR, 0, Math.PI*2); c.fill();
      c.fillStyle = '#111';
      c.beginPath(); c.ellipse(ex, eyeY, iR*0.15, iR*0.7, 0, 0, Math.PI*2); c.fill();
    } else {
      c.beginPath(); c.arc(ex, eyeY, iR, 0, Math.PI*2); c.fill();
      c.fillStyle = '#111';
      c.beginPath(); c.arc(ex, eyeY, iR*0.45, 0, Math.PI*2); c.fill();
    }
    // One clean highlight
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(ex + eyeW*0.15, eyeY - eyeH*0.2, eyeW*0.22, 0, Math.PI*2); c.fill();
    // Upper lid line
    c.strokeStyle = 'rgba(30,30,50,0.6)'; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath(); c.ellipse(ex, eyeY, eyeW, eyeH, 0, Math.PI+0.2, -0.2); c.stroke();
  }

  // ── Eyebrows ──
  c.strokeStyle = isWolf ? '#5d6d7d' : _darken(char.hair, 10);
  c.lineWidth = 1.2; c.lineCap = 'round';
  c.globalAlpha = isWolf ? 0.6 : 0.3;
  for (let s = -1; s <= 1; s += 2) {
    c.beginPath();
    c.moveTo(cx + s*(eyeSp - eyeW*0.3), eyeY - eyeH - 3);
    c.quadraticCurveTo(cx + s*eyeSp, eyeY - eyeH - 6, cx + s*(eyeSp + eyeW*0.3), eyeY - eyeH - 2);
    c.stroke();
  }
  c.globalAlpha = 1;

  // ── Mouth ──
  if (!isWolf && !isCat) {
    const mY = headY + headR * 0.38;
    c.strokeStyle = '#c06058'; c.lineWidth = 0.9; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx - headR*0.06, mY);
    c.quadraticCurveTo(cx, mY + 2, cx + headR*0.06, mY);
    c.stroke();
  } else if (isCat) {
    const mY = headY + headR * 0.3;
    c.strokeStyle = '#c06058'; c.lineWidth = 0.9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx-4, mY); c.quadraticCurveTo(cx-2, mY+3, cx, mY+1); c.stroke();
    c.beginPath(); c.moveTo(cx+4, mY); c.quadraticCurveTo(cx+2, mY+3, cx, mY+1); c.stroke();
  }

  // ── Blush ──
  if (!isWolf) {
    c.save();
    c.globalAlpha = 0.12;
    c.fillStyle = '#ff7090';
    const blushY = eyeY + eyeH + 2;
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.ellipse(cx + s*(eyeSp + eyeW*0.2), blushY, headR*0.14, headR*0.07, 0, 0, Math.PI*2); c.fill();
    }
    c.restore();
  }

  // ── Fairy/Elf glow ──
  if (isFairy || isElf) {
    const glow = c.createRadialGradient(cx, headY, headR*0.5, cx, headY, headR*1.5);
    glow.addColorStop(0, isFairy ? 'rgba(255,180,220,0.08)' : 'rgba(200,230,255,0.07)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow;
    c.beginPath(); c.arc(cx, headY, headR*1.5, 0, Math.PI*2); c.fill();
  }

  // ── Fairy sparkles ──
  if (isFairy) {
    const now = Date.now() / 600;
    for (let i = 0; i < 6; i++) {
      const sx = cx + Math.sin(now + i*1.2) * (bodyW + 22 + i*3);
      const sy = headY - headR*0.3 + Math.cos(now + i*1.6) * (bodyBot-headY+headR)*0.6;
      const al = 0.25 + Math.sin(now + i*0.9) * 0.15;
      c.fillStyle = `rgba(255,200,240,${al})`;
      c.beginPath(); c.arc(sx, sy, 1.5, 0, Math.PI*2); c.fill();
    }
  }

  // ── Ground shadow ──
  c.save();
  const shadowGrad = c.createRadialGradient(cx, footY+4, 0, cx, footY+4, bodyW+12);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.1)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = shadowGrad;
  c.beginPath(); c.ellipse(cx, footY+4, bodyW+12, 3.5, 0, 0, Math.PI*2); c.fill();
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
  // Single clean anime shine band across the hair cap
  c.save();
  c.globalAlpha = 0.25;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(cx - headR*0.1, headY - headR*0.5, headR*0.5, headR*0.13, -0.3, 0, Math.PI*2);
  c.fill();
  c.restore();
}

function _animeHairShadow(c, cx, headY, headR, color) {
  // Subtle shadow on the lower-right of the hair cap
  c.save();
  c.globalAlpha = 0.12;
  c.fillStyle = _darken(color, 40);
  c.beginPath();
  c.arc(cx + headR*0.1, headY - headR*0.05, headR*0.95, -0.4, Math.PI*0.5);
  c.quadraticCurveTo(cx + headR*0.3, headY + headR*0.1, cx - headR*0.3, headY - headR*0.2);
  c.closePath();
  c.fill();
  c.restore();
}

function hairDraw(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY, bodyBot } = M(x, y, w, h);
  const R = headR; // shorthand
  // Anime hair gradient: bright highlight at top, rich color in middle, darker at tips
  const hairGrad = c.createLinearGradient(cx, headY - R*1.4, cx, headY + R*0.8);
  hairGrad.addColorStop(0, _lighten(color, 35));
  hairGrad.addColorStop(0.35, color);
  hairGrad.addColorStop(1, _darken(color, 25));
  c.fillStyle = hairGrad;

  switch(style) {
    case 'ponytail': {
      // Voluminous cap with anime fringe bangs
      c.beginPath();
      c.arc(cx, headY, R*1.08, Math.PI, 0);
      c.fill();
      // Anime fringe: 3 pointed bangs across forehead
      for (let i = -1; i <= 1; i++) {
        const bx = cx + i * R*0.28;
        c.beginPath();
        c.moveTo(bx - R*0.2, headY - R*0.7);
        c.quadraticCurveTo(bx - R*0.05, headY - R*0.3, bx, headY + R*0.05);
        c.quadraticCurveTo(bx + R*0.05, headY - R*0.3, bx + R*0.2, headY - R*0.7);
        c.fill();
      }
      // Flowing ponytail with tapered S-curve
      c.beginPath();
      c.moveTo(cx + R*0.2, headY - R*0.6);
      c.bezierCurveTo(cx + R*1.6, headY - R*0.3, cx + R*1.2, headY + R*1.5, cx + R*0.6, headY + R*2.4);
      c.quadraticCurveTo(cx + R*0.3, headY + R*2.6, cx + R*0.2, headY + R*2.2);
      c.bezierCurveTo(cx + R*0.5, headY + R*1.3, cx + R*1.0, headY, cx + R*0.2, headY - R*0.6);
      c.fill();
      // Hair tie ribbon
      c.fillStyle = '#e84393';
      c.beginPath();
      c.ellipse(cx + R*0.45, headY - R*0.25, 4, 3, 0.3, 0, Math.PI*2);
      c.fill();
      c.fillStyle = hairGrad;
      break;
    }
    case 'bob': {
      // Rounded bob with face-framing pieces
      c.beginPath();
      c.arc(cx, headY, R*1.08, Math.PI + 0.2, -0.2);
      c.fill();
      // Left face-framing strand
      c.beginPath();
      c.moveTo(cx - R*1.06, headY - R*0.15);
      c.bezierCurveTo(cx - R*1.2, headY + R*0.3, cx - R*1.15, headY + R*0.6, cx - R*0.75, headY + R*0.75);
      c.quadraticCurveTo(cx - R*0.5, headY + R*0.7, cx - R*0.55, headY + R*0.2);
      c.fill();
      // Right face-framing strand
      c.beginPath();
      c.moveTo(cx + R*1.06, headY - R*0.15);
      c.bezierCurveTo(cx + R*1.2, headY + R*0.3, cx + R*1.15, headY + R*0.6, cx + R*0.75, headY + R*0.75);
      c.quadraticCurveTo(cx + R*0.5, headY + R*0.7, cx + R*0.55, headY + R*0.2);
      c.fill();
      // Soft center bangs
      c.beginPath();
      c.moveTo(cx - R*0.4, headY - R*0.8);
      c.quadraticCurveTo(cx, headY - R*0.1, cx + R*0.4, headY - R*0.8);
      c.fill();
      break;
    }
    case 'spiky': {
      // Base volume
      c.beginPath(); c.arc(cx, headY, R*1.05, Math.PI, 0); c.fill();
      // Anime spikes radiating outward — each spike is a tapered blade
      const spikes = [
        { x: -0.5, angle: -2.4, len: 1.5 },
        { x: -0.25, angle: -1.8, len: 1.7 },
        { x: 0, angle: -1.57, len: 1.8 },
        { x: 0.25, angle: -1.3, len: 1.7 },
        { x: 0.5, angle: -0.7, len: 1.5 },
        { x: -0.7, angle: -2.7, len: 1.2 },
        { x: 0.7, angle: -0.4, len: 1.2 },
      ];
      for (const sp of spikes) {
        const baseX = cx + sp.x * R;
        const baseY = headY - R*0.5;
        const tipX = baseX + Math.cos(sp.angle) * R * sp.len;
        const tipY = baseY + Math.sin(sp.angle) * R * sp.len;
        c.beginPath();
        c.moveTo(baseX - 4, baseY);
        c.quadraticCurveTo((baseX + tipX)/2 - 2, (baseY + tipY)/2, tipX, tipY);
        c.quadraticCurveTo((baseX + tipX)/2 + 2, (baseY + tipY)/2, baseX + 4, baseY);
        c.fill();
      }
      break;
    }
    case 'long_flowing': {
      // Full cap
      c.beginPath(); c.arc(cx, headY, R*1.1, Math.PI + 0.15, -0.15); c.fill();
      // Long flowing side curtains with wavy ends
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s*R*1.08, headY - R*0.2);
        c.bezierCurveTo(
          cx + s*R*1.3, headY + R*0.8,
          cx + s*R*1.1, headY + R*1.8,
          cx + s*R*0.7, headY + R*2.8
        );
        // Wavy tip
        c.quadraticCurveTo(cx + s*R*0.5, headY + R*2.9, cx + s*R*0.4, headY + R*2.6);
        c.bezierCurveTo(
          cx + s*R*0.6, headY + R*1.6,
          cx + s*R*0.85, headY + R*0.6,
          cx + s*R*0.8, headY + R*0.1
        );
        c.fill();
      }
      // Center-part bangs
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx, headY - R*0.85);
        c.quadraticCurveTo(cx + s*R*0.15, headY - R*0.2, cx + s*R*0.35, headY + R*0.05);
        c.quadraticCurveTo(cx + s*R*0.25, headY - R*0.3, cx + s*R*0.5, headY - R*0.85);
        c.fill();
      }
      break;
    }
    case 'braids': {
      // Cap with side part
      c.beginPath(); c.arc(cx, headY, R*1.08, Math.PI + 0.15, -0.15); c.fill();
      // Two braids: interlocking segments with taper
      for (let s = -1; s <= 1; s += 2) {
        const bx = cx + s*R*0.7;
        const startY = headY + R*0.2;
        for (let j = 0; j < 6; j++) {
          const by = startY + j*R*0.35;
          const taper = 1 - j*0.08;
          const xOff = s * 2.5 * ((j%2)*2-1);
          c.beginPath();
          c.ellipse(bx + xOff, by, 5*taper, 7*taper, s*0.2, 0, Math.PI*2);
          c.fill();
        }
        // Ribbon tie
        c.fillStyle = '#e84393';
        const endY = startY + 6*R*0.35;
        c.beginPath();
        c.moveTo(bx, endY - 2);
        c.lineTo(bx - 4, endY + 5);
        c.lineTo(bx, endY + 3);
        c.lineTo(bx + 4, endY + 5);
        c.closePath();
        c.fill();
        c.fillStyle = hairGrad;
      }
      // Center bangs
      c.beginPath();
      c.moveTo(cx - R*0.3, headY - R*0.8);
      c.quadraticCurveTo(cx, headY - R*0.05, cx + R*0.3, headY - R*0.8);
      c.fill();
      break;
    }
    case 'mohawk': {
      // Shaved sides (thin coverage)
      c.beginPath(); c.arc(cx, headY, R*1.02, Math.PI + 0.7, -0.7); c.fill();
      // Tall dramatic center ridge with sharp blades
      const ridgeSpikes = [
        { x: -0.2, h: 1.5 }, { x: -0.08, h: 1.8 }, { x: 0.05, h: 1.9 },
        { x: 0.18, h: 1.7 }, { x: 0.3, h: 1.3 },
      ];
      for (const sp of ridgeSpikes) {
        const bx = cx + sp.x * R;
        c.beginPath();
        c.moveTo(bx - 4, headY - R*0.6);
        c.quadraticCurveTo(bx - 1, headY - R*sp.h + 3, bx, headY - R*sp.h);
        c.quadraticCurveTo(bx + 1, headY - R*sp.h + 3, bx + 4, headY - R*0.6);
        c.fill();
      }
      break;
    }
    case 'curly': {
      // Voluminous curly hair: overlapping rounded chunks
      const curls = [
        // Top ring
        { a: Math.PI, r: 1.15, s: 0.32 },
        { a: Math.PI*0.8, r: 1.18, s: 0.30 },
        { a: Math.PI*0.6, r: 1.2, s: 0.32 },
        { a: Math.PI*0.4, r: 1.18, s: 0.30 },
        { a: Math.PI*0.2, r: 1.15, s: 0.32 },
        { a: 0, r: 1.15, s: 0.30 },
        // Side curls hanging down
        { a: Math.PI*0.9, r: 1.1, s: 0.28, dy: 0.5 },
        { a: Math.PI*0.1, r: 1.1, s: 0.28, dy: 0.5 },
        { a: Math.PI*0.92, r: 1.0, s: 0.25, dy: 0.9 },
        { a: Math.PI*0.08, r: 1.0, s: 0.25, dy: 0.9 },
      ];
      for (const curl of curls) {
        const dy = curl.dy || 0;
        const rx = cx + Math.cos(curl.a) * R * curl.r;
        const ry = headY + Math.sin(curl.a) * R * 0.55 - R*0.15 + dy*R;
        c.beginPath(); c.arc(rx, ry, R*curl.s, 0, Math.PI*2); c.fill();
      }
      break;
    }
    case 'bun': {
      // Sleek cap
      c.beginPath(); c.arc(cx, headY, R*1.06, Math.PI + 0.25, -0.25); c.fill();
      // Elegant bun with donut shape
      c.beginPath(); c.arc(cx, headY - R*1.05, R*0.42, 0, Math.PI*2); c.fill();
      // Inner bun detail (spiral feel)
      c.save();
      c.globalAlpha = 0.15;
      c.fillStyle = _darken(color, 35);
      c.beginPath(); c.arc(cx + 2, headY - R*1.0, R*0.22, 0, Math.PI*2); c.fill();
      c.restore();
      c.fillStyle = hairGrad;
      // Decorative hair stick
      c.strokeStyle = '#f4d03f'; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx - R*0.45, headY - R*1.2);
      c.lineTo(cx + R*0.45, headY - R*0.9);
      c.stroke();
      // Tiny bead on stick
      c.fillStyle = '#e74c3c';
      c.beginPath(); c.arc(cx - R*0.45, headY - R*1.2, 2.5, 0, Math.PI*2); c.fill();
      c.fillStyle = hairGrad;
      // Side wisps
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s*R*0.85, headY - R*0.1);
        c.quadraticCurveTo(cx + s*R*0.95, headY + R*0.25, cx + s*R*0.7, headY + R*0.45);
        c.quadraticCurveTo(cx + s*R*0.6, headY + R*0.3, cx + s*R*0.7, headY - R*0.05);
        c.fill();
      }
      break;
    }
  }
  // Common anime finishing touches
  _animeHairShadow(c, cx, headY, R, color);
  _animeHairShine(c, cx, headY, R);
}

const HAIR_STYLES = ['ponytail','bob','spiky','long_flowing','braids','mohawk','curly','bun'];
const HAIR_NAMES = ['Ponytail','Bob','Spiky','Long Flowing','Braids','Mohawk','Curly','Bun'];
HAIR_STYLES.forEach((s, i) => {
  defItem('hair_'+s, HAIR_NAMES[i], 'hair',
    [s,'hair', s==='mohawk'?'punk':s==='braids'?'elegant':'casual'],
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
];

function drawTop(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY, bodyTop, bodyBot, bodyW } = M(x, y, w, h);
  const tG = c.createLinearGradient(cx - bodyW, bodyTop, cx + bodyW, bodyBot);
  tG.addColorStop(0, _lighten(color, 20));
  tG.addColorStop(1, _darken(color, 15));
  c.fillStyle = tG;
  const midY = (bodyTop + bodyBot) / 2;

  switch(style) {
    case 'tshirt': {
      // Body
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 6);
      c.quadraticCurveTo(cx - bodyW - 3, bodyBot, cx - bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 3, bodyBot, cx + bodyW + 2, bodyTop + 6);
      c.closePath();
      c.fill();
      // Sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 8), bodyTop + 14, 9, 7, s * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      // Collar
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.8;
      c.beginPath(); c.arc(cx, bodyTop + 2, 6, 0.3, Math.PI - 0.3); c.stroke();
      // Shadow under collar
      c.save(); c.globalAlpha = 0.1; c.fillStyle = _darken(color, 40);
      c.beginPath(); c.ellipse(cx, bodyTop + 12, bodyW * 0.7, 4, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'hoodie': {
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 6, bodyBot, cx - bodyW + 2, bodyBot + 2);
      c.quadraticCurveTo(cx, bodyBot + 4, cx + bodyW - 2, bodyBot + 2);
      c.quadraticCurveTo(cx + bodyW + 6, bodyBot, cx + bodyW + 4, bodyTop + 4);
      c.closePath();
      c.fill();
      // Sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 10), bodyTop + 16, 11, 8, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      // Hood collar
      c.beginPath(); c.arc(cx, bodyTop, 12, Math.PI, 0); c.fill();
      c.strokeStyle = _darken(color, 25); c.lineWidth = 0.8;
      c.beginPath(); c.arc(cx, bodyTop, 12, Math.PI, 0); c.stroke();
      // Kangaroo pocket
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.6;
      c.beginPath(); c.ellipse(cx, bodyBot - 8, 8, 4, 0, 0, Math.PI * 2); c.stroke();
      break;
    }
    case 'tank_top': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW, bodyBot, cx - bodyW + 3, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 2, cx + bodyW - 3, bodyBot);
      c.quadraticCurveTo(cx + bodyW, bodyBot, cx + bodyW - 1, bodyTop + 5);
      c.closePath();
      c.fill();
      // Thin straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.7;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.arc(cx + s * 3, bodyTop + 2, 4, 0.2 * s + Math.PI * 0.5, 0.2 * s + Math.PI * 1.5);
        c.stroke();
      }
      break;
    }
    case 'dress_shirt': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 3, bodyBot, cx - bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 3, bodyBot, cx + bodyW + 2, bodyTop + 4);
      c.closePath();
      c.fill();
      // Sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 10), bodyTop + 16, 10, 7, s * 0.2, 0, Math.PI * 2);
        c.fill();
      }
      // Collar flaps
      c.fillStyle = '#fff';
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * 2, bodyTop + 2);
        c.quadraticCurveTo(cx + s * 8, bodyTop + 4, cx + s * 7, bodyTop + 12);
        c.quadraticCurveTo(cx + s * 4, bodyTop + 10, cx + s * 2, bodyTop + 8);
        c.closePath();
        c.fill();
      }
      // Buttons
      c.fillStyle = _darken(color, 30);
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.arc(cx, bodyTop + 14 + i * 8, 1.2, 0, Math.PI * 2); c.fill();
      }
      break;
    }
    case 'crop_top': {
      const cropBot = midY - 4;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 2, cropBot, cx - bodyW + 3, cropBot + 2);
      c.quadraticCurveTo(cx, cropBot + 4, cx + bodyW - 3, cropBot + 2);
      c.quadraticCurveTo(cx + bodyW + 2, cropBot, cx + bodyW, bodyTop + 5);
      c.closePath();
      c.fill();
      // Neckline
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.7;
      c.beginPath(); c.arc(cx, bodyTop + 2, 5, 0.4, Math.PI - 0.4); c.stroke();
      break;
    }
    case 'jacket': {
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 3);
      c.quadraticCurveTo(cx - bodyW - 6, bodyBot, cx - bodyW + 2, bodyBot + 1);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot + 1);
      c.quadraticCurveTo(cx + bodyW + 6, bodyBot, cx + bodyW + 4, bodyTop + 3);
      c.closePath();
      c.fill();
      // Sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 10), bodyTop + 16, 12, 9, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      // Center zipper line
      c.strokeStyle = _darken(color, 20); c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(cx, bodyTop + 5);
      c.quadraticCurveTo(cx + 1, midY, cx, bodyBot);
      c.stroke();
      // Lapel shadow
      c.save(); c.globalAlpha = 0.08; c.fillStyle = _darken(color, 40);
      c.beginPath(); c.ellipse(cx, bodyTop + 10, bodyW * 0.6, 5, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      break;
    }
    case 'armor': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 5, midY, cx - bodyW - 3, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW + 3, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 5, midY, cx + bodyW + 2, bodyTop + 4);
      c.closePath();
      c.fill();
      // Pauldrons
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 5), bodyTop + 8, 9, 6, s * 0.3, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = _darken(color, 25); c.lineWidth = 0.8;
        c.beginPath(); c.ellipse(cx + s * (bodyW + 5), bodyTop + 8, 9, 6, s * 0.3, 0, Math.PI * 2); c.stroke();
      }
      // Belt line
      c.strokeStyle = _darken(color, 25); c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW, midY);
      c.quadraticCurveTo(cx, midY + 2, cx + bodyW, midY);
      c.stroke();
      break;
    }
    case 'wizard_robe': {
      const robeBot = y + h * 0.78;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 14, (bodyTop + robeBot) / 2, cx - bodyW - 8, robeBot);
      c.quadraticCurveTo(cx, robeBot + 4, cx + bodyW + 8, robeBot);
      c.quadraticCurveTo(cx + bodyW + 14, (bodyTop + robeBot) / 2, cx + bodyW + 4, bodyTop + 2);
      c.closePath();
      c.fill();
      // Wide sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 12), bodyTop + 18, 12, 8, s * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      // Stars decoration
      c.fillStyle = 'rgba(255,215,0,0.35)';
      c.font = '7px sans-serif';
      c.fillText('\u2605', cx - 5, bodyBot - 8);
      c.fillText('\u2605', cx + 4, midY + 2);
      break;
    }
    case 'kimono': {
      const kimBot = y + h * 0.72;
      c.beginPath();
      c.moveTo(cx - bodyW - 6, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 12, (bodyTop + kimBot) / 2, cx - bodyW - 4, kimBot);
      c.quadraticCurveTo(cx, kimBot + 3, cx + bodyW + 4, kimBot);
      c.quadraticCurveTo(cx + bodyW + 12, (bodyTop + kimBot) / 2, cx + bodyW + 6, bodyTop + 2);
      c.closePath();
      c.fill();
      // Obi sash
      c.fillStyle = _darken(color, 30);
      const obiY = midY - 2;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, obiY);
      c.quadraticCurveTo(cx, obiY + 3, cx + bodyW + 4, obiY);
      c.quadraticCurveTo(cx + bodyW + 4, obiY + 7, cx + bodyW + 3, obiY + 7);
      c.quadraticCurveTo(cx, obiY + 10, cx - bodyW - 3, obiY + 7);
      c.quadraticCurveTo(cx - bodyW - 4, obiY + 7, cx - bodyW - 4, obiY);
      c.closePath();
      c.fill();
      break;
    }
    case 'vest': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 1, bodyBot, cx - bodyW + 3, bodyBot - 1);
      c.quadraticCurveTo(cx, bodyBot + 2, cx + bodyW - 3, bodyBot - 1);
      c.quadraticCurveTo(cx + bodyW + 1, bodyBot, cx + bodyW - 1, bodyTop + 5);
      c.closePath();
      c.fill();
      // Center seam
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(cx, bodyTop + 6);
      c.quadraticCurveTo(cx + 0.5, midY, cx, bodyBot - 2);
      c.stroke();
      break;
    }
    case 'sweater': {
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 3);
      c.quadraticCurveTo(cx - bodyW - 4, bodyBot, cx - bodyW + 2, bodyBot + 1);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot + 1);
      c.quadraticCurveTo(cx + bodyW + 4, bodyBot, cx + bodyW + 3, bodyTop + 3);
      c.closePath();
      c.fill();
      // Sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 9), bodyTop + 15, 10, 8, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      // Turtleneck collar
      c.fillStyle = _darken(color, 12);
      c.beginPath(); c.ellipse(cx, bodyTop + 1, 7, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = tG;
      // Knit lines
      c.strokeStyle = _darken(color, 10); c.lineWidth = 0.4;
      for (let i = 0; i < 4; i++) {
        const ly = bodyTop + 8 + i * 7;
        c.beginPath();
        c.moveTo(cx - bodyW + 2, ly);
        c.quadraticCurveTo(cx, ly + 1.5, cx + bodyW - 2, ly);
        c.stroke();
      }
      break;
    }
    case 'corset': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 8);
      c.quadraticCurveTo(cx - bodyW - 2, midY, cx - bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx, bodyBot, cx + bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx + bodyW + 2, midY, cx + bodyW - 1, bodyTop + 8);
      c.closePath();
      c.fill();
      // Lacing
      c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.6;
      for (let i = 0; i < 4; i++) {
        const ly = bodyTop + 12 + i * 6;
        c.beginPath(); c.moveTo(cx - 2, ly); c.quadraticCurveTo(cx - 5, ly + 2, cx - 7, ly + 3); c.stroke();
        c.beginPath(); c.moveTo(cx + 2, ly); c.quadraticCurveTo(cx + 5, ly + 2, cx + 7, ly + 3); c.stroke();
      }
      break;
    }
  }
}

TOP_DEFS.forEach(d => {
  defItem('top_'+d.id, d.name, 'top', d.tags, d.colors,
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
];

function drawBottom(style, c, char, x, y, w, h, color) {
  const { cx, bodyBot, bodyW, legBot } = M(x, y, w, h);
  const botGrad = c.createLinearGradient(cx, bodyBot, cx, legBot);
  botGrad.addColorStop(0, _lighten(color, 18));
  botGrad.addColorStop(1, _darken(color, 12));
  c.fillStyle = botGrad;

  switch(style) {
    case 'jeans': {
      // Left leg
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 3, (bodyBot + legBot) / 2, cx - 14, legBot);
      c.quadraticCurveTo(cx - 8, legBot + 2, cx - 3, legBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 8, cx, bodyBot + 6);
      c.closePath();
      c.fill();
      // Right leg
      c.beginPath();
      c.moveTo(cx, bodyBot + 6);
      c.quadraticCurveTo(cx + 1, bodyBot + 8, cx + 3, legBot);
      c.quadraticCurveTo(cx + 8, legBot + 2, cx + 14, legBot);
      c.quadraticCurveTo(cx + bodyW + 3, (bodyBot + legBot) / 2, cx + bodyW + 1, bodyBot - 3);
      c.closePath();
      c.fill();
      // Center seam
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 6); c.stroke();
      break;
    }
    case 'skirt': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 10, bodyBot + 18, cx - bodyW + 3, bodyBot + 24);
      c.quadraticCurveTo(cx, bodyBot + 26, cx + bodyW - 3, bodyBot + 24);
      c.quadraticCurveTo(cx + bodyW + 10, bodyBot + 18, cx + bodyW + 1, bodyBot - 3);
      c.closePath();
      c.fill();
      break;
    }
    case 'shorts': {
      // Left leg
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 2, bodyBot + 6, cx - bodyW, bodyBot + 10);
      c.quadraticCurveTo(cx - bodyW / 2, bodyBot + 12, cx - 2, bodyBot + 10);
      c.quadraticCurveTo(cx - 1, bodyBot + 6, cx, bodyBot + 4);
      c.closePath();
      c.fill();
      // Right leg
      c.beginPath();
      c.moveTo(cx, bodyBot + 4);
      c.quadraticCurveTo(cx + 1, bodyBot + 6, cx + 2, bodyBot + 10);
      c.quadraticCurveTo(cx + bodyW / 2, bodyBot + 12, cx + bodyW, bodyBot + 10);
      c.quadraticCurveTo(cx + bodyW + 2, bodyBot + 6, cx + bodyW + 1, bodyBot - 3);
      c.closePath();
      c.fill();
      break;
    }
    case 'leggings': {
      // Left leg
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 1, (bodyBot + legBot) / 2, cx - 12, legBot + 1);
      c.quadraticCurveTo(cx - 8, legBot + 2, cx - 5, legBot + 1);
      c.quadraticCurveTo(cx - 2, bodyBot + 8, cx, bodyBot + 6);
      c.closePath();
      c.fill();
      // Right leg
      c.beginPath();
      c.moveTo(cx, bodyBot + 6);
      c.quadraticCurveTo(cx + 2, bodyBot + 8, cx + 5, legBot + 1);
      c.quadraticCurveTo(cx + 8, legBot + 2, cx + 12, legBot + 1);
      c.quadraticCurveTo(cx + bodyW + 1, (bodyBot + legBot) / 2, cx + bodyW, bodyBot - 3);
      c.closePath();
      c.fill();
      break;
    }
    case 'cargo_pants': {
      // Left leg
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 4, (bodyBot + legBot) / 2, cx - 15, legBot);
      c.quadraticCurveTo(cx - 9, legBot + 2, cx - 3, legBot);
      c.quadraticCurveTo(cx - 1, bodyBot + 8, cx, bodyBot + 6);
      c.closePath();
      c.fill();
      // Right leg
      c.beginPath();
      c.moveTo(cx, bodyBot + 6);
      c.quadraticCurveTo(cx + 1, bodyBot + 8, cx + 3, legBot);
      c.quadraticCurveTo(cx + 9, legBot + 2, cx + 15, legBot);
      c.quadraticCurveTo(cx + bodyW + 4, (bodyBot + legBot) / 2, cx + bodyW + 2, bodyBot - 3);
      c.closePath();
      c.fill();
      // Cargo pockets
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.6;
      c.beginPath(); c.ellipse(cx - 10, bodyBot + 10, 5, 4, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(cx + 10, bodyBot + 10, 5, 4, 0, 0, Math.PI * 2); c.stroke();
      break;
    }
    case 'flowing_skirt': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 18, bodyBot + 28, cx - bodyW + 6, y + h * 0.78);
      c.quadraticCurveTo(cx, y + h * 0.80, cx + bodyW - 6, y + h * 0.78);
      c.quadraticCurveTo(cx + bodyW + 18, bodyBot + 28, cx + bodyW + 1, bodyBot - 3);
      c.closePath();
      c.fill();
      // Fold lines
      c.strokeStyle = _darken(color, 12); c.lineWidth = 0.4;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i * 6, bodyBot);
        c.quadraticCurveTo(cx + i * 7 + 2, bodyBot + 16, cx + i * 6.5, y + h * 0.77);
        c.stroke();
      }
      break;
    }
    case 'armor_greaves': {
      // Left leg
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 4, (bodyBot + legBot) / 2, cx - 15, legBot + 1);
      c.quadraticCurveTo(cx - 9, legBot + 3, cx - 4, legBot + 1);
      c.quadraticCurveTo(cx - 2, bodyBot + 8, cx, bodyBot + 6);
      c.closePath();
      c.fill();
      // Right leg
      c.beginPath();
      c.moveTo(cx, bodyBot + 6);
      c.quadraticCurveTo(cx + 2, bodyBot + 8, cx + 4, legBot + 1);
      c.quadraticCurveTo(cx + 9, legBot + 3, cx + 15, legBot + 1);
      c.quadraticCurveTo(cx + bodyW + 4, (bodyBot + legBot) / 2, cx + bodyW + 2, bodyBot - 3);
      c.closePath();
      c.fill();
      // Horizontal knee bands
      c.strokeStyle = _darken(color, 22); c.lineWidth = 0.8;
      const midLeg = (bodyBot + legBot) / 2;
      c.beginPath(); c.moveTo(cx - 14, midLeg); c.quadraticCurveTo(cx - 9, midLeg + 1, cx - 4, midLeg); c.stroke();
      c.beginPath(); c.moveTo(cx + 4, midLeg); c.quadraticCurveTo(cx + 9, midLeg + 1, cx + 14, midLeg); c.stroke();
      break;
    }
    case 'sweatpants': {
      // Left leg
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 2, (bodyBot + legBot) / 2, cx - 13, legBot);
      c.quadraticCurveTo(cx - 8, legBot + 2, cx - 4, legBot);
      c.quadraticCurveTo(cx - 2, bodyBot + 8, cx, bodyBot + 6);
      c.closePath();
      c.fill();
      // Right leg
      c.beginPath();
      c.moveTo(cx, bodyBot + 6);
      c.quadraticCurveTo(cx + 2, bodyBot + 8, cx + 4, legBot);
      c.quadraticCurveTo(cx + 8, legBot + 2, cx + 13, legBot);
      c.quadraticCurveTo(cx + bodyW + 2, (bodyBot + legBot) / 2, cx + bodyW, bodyBot - 3);
      c.closePath();
      c.fill();
      // Ankle cuffs
      c.strokeStyle = _darken(color, 18); c.lineWidth = 0.6;
      c.beginPath(); c.ellipse(cx - 8, legBot - 1, 5, 2, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(cx + 8, legBot - 1, 5, 2, 0, 0, Math.PI * 2); c.stroke();
      break;
    }
    case 'pleated_skirt': {
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 4, bodyBot + 10, cx - bodyW - 5, bodyBot + 22);
      c.quadraticCurveTo(cx, bodyBot + 24, cx + bodyW + 5, bodyBot + 22);
      c.quadraticCurveTo(cx + bodyW + 4, bodyBot + 10, cx + bodyW + 1, bodyBot - 3);
      c.closePath();
      c.fill();
      // Pleat lines
      c.strokeStyle = _darken(color, 15); c.lineWidth = 0.4;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i * 5, bodyBot);
        c.quadraticCurveTo(cx + i * 5.2, bodyBot + 10, cx + i * 5.5, bodyBot + 20);
        c.stroke();
      }
      break;
    }
    case 'bell_bottoms': {
      // Left leg with flare
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx - bodyW - 1, bodyBot + 10, cx - 10, bodyBot + 20);
      c.quadraticCurveTo(cx - 16, legBot, cx - 20, legBot + 2);
      c.quadraticCurveTo(cx - 10, legBot + 3, cx - 2, legBot + 2);
      c.quadraticCurveTo(cx - 1, bodyBot + 8, cx, bodyBot + 6);
      c.closePath();
      c.fill();
      // Right leg with flare
      c.beginPath();
      c.moveTo(cx, bodyBot + 6);
      c.quadraticCurveTo(cx + 1, bodyBot + 8, cx + 2, legBot + 2);
      c.quadraticCurveTo(cx + 10, legBot + 3, cx + 20, legBot + 2);
      c.quadraticCurveTo(cx + 16, legBot, cx + 10, bodyBot + 20);
      c.quadraticCurveTo(cx + bodyW + 1, bodyBot + 10, cx + bodyW, bodyBot - 3);
      c.closePath();
      c.fill();
      break;
    }
  }
}

BOTTOM_DEFS.forEach(d => {
  defItem('bottom_'+d.id, d.name, 'bottom', d.tags, d.colors,
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
];

function drawDress(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY, bodyTop, bodyBot, bodyW, legBot, footY } = M(x, y, w, h);
  const dG = c.createLinearGradient(cx - bodyW, bodyTop, cx + bodyW, legBot);
  dG.addColorStop(0, _lighten(color, 20));
  dG.addColorStop(0.5, color);
  dG.addColorStop(1, _darken(color, 15));
  c.fillStyle = dG;
  const midY = (bodyTop + bodyBot) / 2;

  switch(style) {
    case 'sundress': {
      // Fitted bodice
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 1, bodyBot, cx - bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 2, cx + bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 1, bodyBot, cx + bodyW, bodyTop + 5);
      c.closePath(); c.fill();
      // A-line skirt
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 14, bodyBot + 22, cx - bodyW + 4, footY - 4);
      c.quadraticCurveTo(cx, footY - 2, cx + bodyW - 4, footY - 4);
      c.quadraticCurveTo(cx + bodyW + 14, bodyBot + 22, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Thin straps
      c.strokeStyle = _darken(color, 20); c.lineWidth = 1;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath(); c.moveTo(cx + s * 4, bodyTop + 5); c.lineTo(cx + s * 6, bodyTop - 4); c.stroke();
      }
      break;
    }
    case 'ball_gown': {
      // Fitted bodice with sweetheart neckline
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 6);
      c.quadraticCurveTo(cx - bodyW - 3, bodyBot, cx - bodyW + 1, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 2, cx + bodyW - 1, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 3, bodyBot, cx + bodyW + 2, bodyTop + 6);
      c.closePath(); c.fill();
      // Wide ball gown skirt
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 28, bodyBot + 30, cx - bodyW - 10, footY + 2);
      c.quadraticCurveTo(cx, footY + 6, cx + bodyW + 10, footY + 2);
      c.quadraticCurveTo(cx + bodyW + 28, bodyBot + 30, cx + bodyW + 1, bodyBot - 2);
      c.closePath(); c.fill();
      // Neckline curve
      c.strokeStyle = _darken(color, 22); c.lineWidth = 0.8;
      c.beginPath(); c.arc(cx, bodyTop + 4, 7, 0.3, Math.PI - 0.3); c.stroke();
      // Waist sash
      c.fillStyle = _darken(color, 30);
      c.fillRect(cx - bodyW - 1, bodyBot - 5, bodyW * 2 + 2, 4);
      break;
    }
    case 'cocktail_dress': {
      // Sleek fitted bodice
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 6);
      c.quadraticCurveTo(cx - bodyW - 1, bodyBot, cx - bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 2, cx + bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 1, bodyBot, cx + bodyW - 1, bodyTop + 6);
      c.closePath(); c.fill();
      // Knee-length pencil skirt
      const kneeY = bodyBot + (legBot - bodyBot) * 0.7;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 2);
      c.quadraticCurveTo(cx - bodyW - 4, (bodyBot + kneeY) / 2, cx - bodyW + 2, kneeY);
      c.quadraticCurveTo(cx, kneeY + 3, cx + bodyW - 2, kneeY);
      c.quadraticCurveTo(cx + bodyW + 4, (bodyBot + kneeY) / 2, cx + bodyW, bodyBot - 2);
      c.closePath(); c.fill();
      // Single strap
      c.strokeStyle = _darken(color, 20); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(cx - 3, bodyTop + 6); c.lineTo(cx - 5, bodyTop - 3); c.stroke();
      break;
    }
    case 'kimono_dress': {
      const kimBot = footY + 2;
      c.beginPath();
      c.moveTo(cx - bodyW - 6, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 12, (bodyTop + kimBot) / 2, cx - bodyW - 4, kimBot);
      c.quadraticCurveTo(cx, kimBot + 3, cx + bodyW + 4, kimBot);
      c.quadraticCurveTo(cx + bodyW + 12, (bodyTop + kimBot) / 2, cx + bodyW + 6, bodyTop + 2);
      c.closePath(); c.fill();
      // Wide sleeves
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 12), bodyTop + 18, 14, 10, s * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      // Obi sash
      c.fillStyle = _darken(color, 30);
      const obiY = midY - 2;
      c.beginPath();
      c.moveTo(cx - bodyW - 5, obiY);
      c.quadraticCurveTo(cx, obiY + 3, cx + bodyW + 5, obiY);
      c.quadraticCurveTo(cx + bodyW + 5, obiY + 8, cx + bodyW + 4, obiY + 8);
      c.quadraticCurveTo(cx, obiY + 11, cx - bodyW - 4, obiY + 8);
      c.quadraticCurveTo(cx - bodyW - 5, obiY + 8, cx - bodyW - 5, obiY);
      c.closePath(); c.fill();
      break;
    }
    case 'fairy_dress': {
      // Bodice
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 1, bodyBot, cx - bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 2, cx + bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 1, bodyBot, cx + bodyW, bodyTop + 5);
      c.closePath(); c.fill();
      // Layered petal skirt
      c.save(); c.globalAlpha = 0.7;
      for (let layer = 0; layer < 3; layer++) {
        const layerBot = bodyBot + (footY - bodyBot) * (0.6 + layer * 0.2);
        const spread = 8 + layer * 6;
        c.beginPath();
        c.moveTo(cx - bodyW - layer * 2, bodyBot - 2 + layer * 4);
        c.quadraticCurveTo(cx - bodyW - spread, (bodyBot + layerBot) / 2, cx - bodyW + 2 + layer, layerBot);
        c.quadraticCurveTo(cx, layerBot + 3, cx + bodyW - 2 - layer, layerBot);
        c.quadraticCurveTo(cx + bodyW + spread, (bodyBot + layerBot) / 2, cx + bodyW + layer * 2, bodyBot - 2 + layer * 4);
        c.closePath(); c.fill();
      }
      c.restore();
      // Sparkle details
      c.fillStyle = 'rgba(255,255,255,0.3)';
      const now = Date.now() / 800;
      for (let i = 0; i < 5; i++) {
        const sx = cx + Math.sin(now + i * 1.5) * (bodyW + 5);
        const sy = bodyBot + 5 + Math.cos(now + i * 2.1) * (footY - bodyBot - 10) * 0.5;
        c.beginPath(); c.arc(sx, sy, 1.2, 0, Math.PI * 2); c.fill();
      }
      break;
    }
  }
}

DRESS_DEFS.forEach(d => {
  defItem('dress_'+d.id, d.name, 'dress', d.tags, d.colors,
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
];

function drawShoes(style, c, char, x, y, w, h, color) {
  const { cx, footY } = M(x, y, w, h);
  const sG = c.createLinearGradient(cx, footY - 8, cx, footY + 5);
  sG.addColorStop(0, _lighten(color, 20));
  sG.addColorStop(1, _darken(color, 15));
  c.fillStyle = sG;

  switch(style) {
    case 'sneakers':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 10;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY, 10, 5, 0, 0, Math.PI * 2); c.fill();
        // Sole line
        c.fillStyle = 'rgba(0,0,0,0.06)';
        c.beginPath(); c.ellipse(fx, footY + 2, 10, 2.5, 0, 0, Math.PI); c.fill();
      }
      break;
    case 'boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 10;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY - 6, 9, 12, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(fx, footY + 5, 9, 4, 0, 0, Math.PI * 2); c.fill();
        // Strap
        c.strokeStyle = _darken(color, 18); c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(fx - 8, footY - 8); c.quadraticCurveTo(fx, footY - 7, fx + 8, footY - 8); c.stroke();
      }
      break;
    case 'heels':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 10;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx + s * 2, footY, 9, 4, 0, 0, Math.PI * 2); c.fill();
        // Heel
        c.beginPath(); c.ellipse(fx - s * 4, footY + 5, 2, 4, 0, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'sandals':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 10;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY + 1, 9, 3.5, 0, 0, Math.PI * 2); c.fill();
        // Strap
        c.strokeStyle = _darken(color, 15); c.lineWidth = 1;
        c.beginPath(); c.moveTo(fx - 4, footY - 2); c.quadraticCurveTo(fx, footY - 6, fx + 4, footY - 2); c.stroke();
      }
      break;
    case 'armored_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 10;
        c.fillStyle = sG;
        c.beginPath();
        c.moveTo(fx - 9, footY - 16);
        c.quadraticCurveTo(fx - 10, footY, fx - 10, footY + 4);
        c.quadraticCurveTo(fx, footY + 6, fx + 10, footY + 4);
        c.quadraticCurveTo(fx + 10, footY, fx + 9, footY - 16);
        c.closePath();
        c.fill();
        // Band
        c.strokeStyle = _darken(color, 20); c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(fx - 9, footY - 6); c.quadraticCurveTo(fx, footY - 5, fx + 9, footY - 6); c.stroke();
      }
      break;
    case 'slippers':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 10;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY, 10, 5.5, 0, 0, Math.PI * 2); c.fill();
        // Fluffy rim
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.beginPath(); c.ellipse(fx, footY - 2, 7, 3, 0, Math.PI, 0); c.fill();
      }
      break;
    case 'platforms':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 10;
        c.fillStyle = sG;
        c.beginPath(); c.ellipse(fx, footY + 4, 10, 5, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(fx, footY - 1, 9, 4, 0, 0, Math.PI * 2); c.fill();
        // Platform stripe
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.beginPath(); c.ellipse(fx, footY + 4, 9, 1.5, 0, 0, Math.PI * 2); c.fill();
      }
      break;
    case 'barefoot':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s * 10;
        c.strokeStyle = sG; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(fx, footY, 8, 4, 0, 0, Math.PI * 2); c.stroke();
        // Wrap straps
        c.beginPath(); c.moveTo(fx, footY - 4); c.quadraticCurveTo(fx + 1, footY - 7, fx, footY - 10); c.stroke();
        c.beginPath(); c.moveTo(fx - 4, footY - 6); c.quadraticCurveTo(fx, footY - 7, fx + 4, footY - 6); c.stroke();
      }
      break;
  }
}

SHOE_DEFS.forEach(d => {
  defItem('shoes_'+d.id, d.name, 'shoes', d.tags, d.colors,
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
];

function drawAccessory(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY, bodyTop, bodyBot, bodyW } = M(x, y, w, h);
  c.fillStyle = color;

  switch(style) {
    case 'glasses':
      c.strokeStyle=color; c.lineWidth=1.5;
      const eyeY=headY-headR*0.05; const sp=headR*0.35;
      c.beginPath();c.ellipse(cx-sp,eyeY,headR*0.22,headR*0.2,0,0,Math.PI*2);c.stroke();
      c.beginPath();c.ellipse(cx+sp,eyeY,headR*0.22,headR*0.2,0,0,Math.PI*2);c.stroke();
      c.beginPath();c.moveTo(cx-sp+headR*0.22,eyeY);c.lineTo(cx+sp-headR*0.22,eyeY);c.stroke();
      c.beginPath();c.moveTo(cx-sp-headR*0.22,eyeY);c.lineTo(cx-headR-2,eyeY-2);c.stroke();
      c.beginPath();c.moveTo(cx+sp+headR*0.22,eyeY);c.lineTo(cx+headR+2,eyeY-2);c.stroke();
      break;
    case 'crown':
      c.beginPath();
      c.moveTo(cx-headR*0.55,headY-headR*0.7);
      c.lineTo(cx-headR*0.55,headY-headR*1.1);
      c.lineTo(cx-headR*0.28,headY-headR*0.85);
      c.lineTo(cx,headY-headR*1.2);
      c.lineTo(cx+headR*0.28,headY-headR*0.85);
      c.lineTo(cx+headR*0.55,headY-headR*1.1);
      c.lineTo(cx+headR*0.55,headY-headR*0.7);
      c.closePath(); c.fill();
      c.fillStyle='#e74c3c';c.beginPath();c.arc(cx,headY-headR*1.05,2,0,Math.PI*2);c.fill();
      break;
    case 'necklace':
      c.strokeStyle=color; c.lineWidth=1.5;
      c.beginPath();c.arc(cx,bodyTop+3,10,0.3,Math.PI-0.3);c.stroke();
      c.fillStyle=color;c.beginPath();c.arc(cx,bodyTop+12,3,0,Math.PI*2);c.fill();
      break;
    case 'scarf':
      c.beginPath();
      c.moveTo(cx-headR*0.7,headY+headR-1);
      c.quadraticCurveTo(cx,headY+headR+5,cx+headR*0.7,headY+headR-1);
      c.lineTo(cx+headR*0.75,headY+headR+4);
      c.quadraticCurveTo(cx,headY+headR+10,cx-headR*0.75,headY+headR+4);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx+headR*0.6,headY+headR);
      c.quadraticCurveTo(cx+headR*0.8,bodyTop+18,cx+headR*0.65,bodyTop+28);
      c.lineTo(cx+headR*0.5,bodyTop+26);
      c.quadraticCurveTo(cx+headR*0.65,bodyTop+14,cx+headR*0.45,headY+headR+3);
      c.fill();
      break;
    case 'extra_wings':
      c.globalAlpha=0.45;
      for(let s=-1;s<=1;s+=2){
        c.beginPath();c.moveTo(cx+s*bodyW,bodyTop+8);
        c.quadraticCurveTo(cx+s*(bodyW+40),bodyTop-20,cx+s*(bodyW+12),bodyTop+38);c.closePath();c.fill();
        c.beginPath();c.moveTo(cx+s*bodyW,bodyTop+14);
        c.quadraticCurveTo(cx+s*(bodyW+32),bodyTop+40,cx+s*(bodyW+8),bodyTop+48);c.closePath();c.fill();}
      c.globalAlpha=1;
      break;
    case 'cape':
      c.globalAlpha=0.6;
      c.beginPath();
      c.moveTo(cx-bodyW+3,bodyTop+1);
      c.quadraticCurveTo(cx-bodyW-15,bodyBot,cx-bodyW-8,y+h*0.78);
      c.lineTo(cx+bodyW+8,y+h*0.78);
      c.quadraticCurveTo(cx+bodyW+15,bodyBot,cx+bodyW-3,bodyTop+1);
      c.closePath(); c.fill();
      c.globalAlpha=1;
      c.fillStyle='#f4d03f';c.beginPath();c.arc(cx,bodyTop+3,3,0,Math.PI*2);c.fill();
      break;
    case 'hat':
      c.beginPath();c.ellipse(cx,headY-headR*0.55,headR*1.1,headR*0.15,0,0,Math.PI*2);c.fill();
      c.beginPath();
      c.moveTo(cx-headR*0.65,headY-headR*0.55);
      c.quadraticCurveTo(cx,headY-headR*1.6,cx+headR*0.65,headY-headR*0.55);
      c.fill();
      c.fillStyle='rgba(0,0,0,0.15)';c.fillRect(cx-headR*0.65,headY-headR*0.65,headR*1.3,3);
      break;
    case 'flower_crown':
      const crY=headY-headR*0.8;
      for(let i=-3;i<=3;i++){
        const fx=cx+i*headR*0.26; const fy=crY+Math.abs(i)*1.5;
        c.fillStyle=i%2===0?color:'#fff';c.beginPath();c.arc(fx,fy,4,0,Math.PI*2);c.fill();
        c.fillStyle='#f1c40f';c.beginPath();c.arc(fx,fy,1.5,0,Math.PI*2);c.fill();}
      c.strokeStyle='#27ae60';c.lineWidth=1.2;
      c.beginPath();c.moveTo(cx-headR*0.8,crY+2);c.quadraticCurveTo(cx,crY-2,cx+headR*0.8,crY+2);c.stroke();
      break;
    case 'belt':
      c.fillRect(cx-bodyW-2,bodyBot-5,bodyW*2+4,4);
      c.strokeStyle='#f4d03f';c.lineWidth=1.2;c.strokeRect(cx-3.5,bodyBot-6,7,5.5);
      break;
    case 'wristbands':
      for(let s=-1;s<=1;s+=2){
        const wx=s===-1?cx-bodyW-11:cx+bodyW+11;
        c.fillRect(wx-4,bodyBot-10,8,5);}
      break;
  }
}

ACC_DEFS.forEach(d => {
  defItem('acc_'+d.id, d.name, 'accessory', d.tags, d.colors,
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
  }
}

BG_DEFS.forEach(d => {
  defItem('bg_'+d.id, d.name, 'background', d.tags, d.colors,
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
  achievementPopupTitle.textContent = t('duAch_'+id, def.title);
  achievementPopupDesc.textContent = t('duAchD_'+id, def.desc);
  achievementPopup.classList.add('show');
  setTimeout(() => achievementPopup.classList.remove('show'), 3000);
}

function renderAchievements() {
  achievementsList.innerHTML = '';
  ACHIEVE_DEFS.forEach(a => {
    const el = document.createElement('div');
    el.className = 'achievement-item' + (achievements[a.id] ? ' unlocked' : '');
    el.innerHTML = `<span class="ach-icon">${a.icon}</span><span>${t('duAch_'+a.id, a.title)}</span>`;
    achievementsList.appendChild(el);
  });
}

/* ================================================================
   RENDERING
   ================================================================ */
function render() {
  const W = canvas.width, H = canvas.height;
  const char = CHARACTERS[currentCharIdx];
  const margin = 50;
  const charX = margin, charY = 30;
  const charW = W - margin*2, charH = H - 60;

  // Background
  if (equipped.background) {
    const bgItem = ITEMS.find(it => it.id === equipped.background.itemId);
    if (bgItem) bgItem.draw(ctx, char, charX, charY, charW, charH, equipped.background.colorIdx);
  } else {
    // Default subtle gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2c2c3e'); g.addColorStop(1, '#1e1e30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Floor plane — darker gradient strip at bottom for grounding
    const floorGrad = ctx.createLinearGradient(0, H*0.82, 0, H);
    floorGrad.addColorStop(0, 'rgba(0,0,0,0)');
    floorGrad.addColorStop(0.3, 'rgba(0,0,0,0.08)');
    floorGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H*0.82, W, H*0.18);
    // Faint decorative sparkle dots
    const now = Date.now() / 2000;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 12; i++) {
      const sx = (Math.sin(now + i*2.1) * 0.4 + 0.5) * W;
      const sy = (Math.cos(now*0.7 + i*1.8) * 0.4 + 0.5) * H;
      const sr = 1 + Math.sin(now*1.5 + i) * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    }
  }

  // Draw cape/wings behind character
  if (equipped.accessory) {
    const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
    if (accItem && (accItem.id === 'acc_cape' || accItem.id === 'acc_extra_wings')) {
      accItem.draw(ctx, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
    }
  }

  // Character base
  drawCharacter(ctx, charX, charY, charW, charH, char);

  // Hair (behind head items drawn separately — for now draw on top)
  if (equipped.hair) {
    const item = ITEMS.find(it => it.id === equipped.hair.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.hair.colorIdx);
  }

  // Dress OR top+bottom
  if (equipped.dress) {
    const item = ITEMS.find(it => it.id === equipped.dress.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.dress.colorIdx);
  } else {
    // Bottom (drawn before top so top overlaps waist)
    if (equipped.bottom) {
      const item = ITEMS.find(it => it.id === equipped.bottom.itemId);
      if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.bottom.colorIdx);
    }

    // Top
    if (equipped.top) {
      const item = ITEMS.find(it => it.id === equipped.top.itemId);
      if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.top.colorIdx);
    }
  }

  // Shoes
  if (equipped.shoes) {
    const item = ITEMS.find(it => it.id === equipped.shoes.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.shoes.colorIdx);
  }

  // Accessory (non-cape/wings)
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
    // Draw proper mini character (scaled drawCharacter)
    mc.save();
    mc.scale(48/150, 48/230);
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
    hair: t('duCatHair','Hair'), top: t('duCatTop','Top'),
    bottom: t('duCatBottom','Bottom'), dress: t('duCatDress','Dress'),
    shoes: t('duCatShoes','Shoes'),
    accessory: t('duCatAccessory','Accessory'), background: t('duCatBG','Background'),
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

    // Mini preview
    const mini = document.createElement('canvas');
    mini.width = 56; mini.height = 56;
    const mc = mini.getContext('2d');
    const colorIdx = isEquipped ? equipped[item.category].colorIdx : 0;
    drawItemPreview(mc, item, colorIdx);
    card.appendChild(mini);

    // Premium badge
    if (item.premium) {
      const badge = document.createElement('div');
      badge.className = 'premium-badge';
      badge.textContent = locked ? '\uD83D\uDD12' : '\u2B50';
      card.appendChild(badge);
    }

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'item-name';
    nameEl.textContent = t('duItem_'+item.id, item.name);
    card.appendChild(nameEl);

    // Color swatches if equipped
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
          // Track color cycling
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
        // Mutual exclusion: dress <-> top/bottom
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
    mc.scale(56/400, 56/600);
    item.draw(mc, CHARACTERS[currentCharIdx], 0, 0, 400, 600, colorIdx);
  } else {
    mc.scale(56/200, 56/300);
    const char = CHARACTERS[currentCharIdx];
    // Draw a mini silhouette
    mc.fillStyle = 'rgba(255,255,255,0.05)';
    mc.beginPath(); mc.ellipse(100, 140, 35, 70, 0, 0, Math.PI*2); mc.fill();
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
  // With dress category, a "full outfit" means all non-exclusive slots are filled
  // Either: hair+dress+shoes+acc+bg (5) or hair+top+bottom+shoes+acc+bg (6)
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
  // 40% chance to use a dress instead of top+bottom
  const useDress = Math.random() < 0.4;
  CATEGORIES.forEach(cat => {
    // Skip dress when using top+bottom, skip top/bottom when using dress
    if (useDress && (cat === 'top' || cat === 'bottom')) { delete equipped[cat]; return; }
    if (!useDress && cat === 'dress') { delete equipped[cat]; return; }
    const catItems = ITEMS.filter(it => it.category === cat);
    const item = catItems[Math.floor(Math.random()*catItems.length)];
    const ci = Math.floor(Math.random()*item.colors.length);
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
  if (saved.length >= 10) saved.shift(); // Keep max 10
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
      // Render preview
      const mc = mini.getContext('2d');
      mc.scale(80/400, 120/600);
      const oldEquipped = equipped;
      equipped = outfit.equipped;
      mc.fillStyle = '#1e1e30'; mc.fillRect(0,0,400,600);
      renderToCtx(mc);
      equipped = oldEquipped;
      mc.setTransform(1,0,0,1,0,0);

      slot.appendChild(mini);
      const label = document.createElement('div');
      label.className = 'outfit-label';
      label.textContent = '#' + (i+1);
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
  const charW = W - margin*2, charH = H - 60;

  if (equipped.background) {
    const bgItem = ITEMS.find(it => it.id === equipped.background.itemId);
    if (bgItem) bgItem.draw(c, char, charX, charY, charW, charH, equipped.background.colorIdx);
  }
  if (equipped.accessory) {
    const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
    if (accItem && (accItem.id === 'acc_cape' || accItem.id === 'acc_extra_wings'))
      accItem.draw(c, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
  }
  drawCharacter(c, charX, charY, charW, charH, char);
  if (equipped.hair) { const it = ITEMS.find(i2=>i2.id===equipped.hair.itemId); if(it) it.draw(c,char,charX,charY,charW,charH,equipped.hair.colorIdx); }
  if (equipped.dress) {
    const it = ITEMS.find(i2=>i2.id===equipped.dress.itemId); if(it) it.draw(c,char,charX,charY,charW,charH,equipped.dress.colorIdx);
  } else {
    if (equipped.bottom) { const it = ITEMS.find(i2=>i2.id===equipped.bottom.itemId); if(it) it.draw(c,char,charX,charY,charW,charH,equipped.bottom.colorIdx); }
    if (equipped.top) { const it = ITEMS.find(i2=>i2.id===equipped.top.itemId); if(it) it.draw(c,char,charX,charY,charW,charH,equipped.top.colorIdx); }
  }
  if (equipped.shoes) { const it = ITEMS.find(i2=>i2.id===equipped.shoes.itemId); if(it) it.draw(c,char,charX,charY,charW,charH,equipped.shoes.colorIdx); }
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
  currentChallengeTheme = CHALLENGE_THEMES[Math.floor(Math.random()*CHALLENGE_THEMES.length)];
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

  // Show theme as overlay briefly
  challengeTheme.textContent = t('duTheme_'+currentChallengeTheme.id, currentChallengeTheme.name);
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

  // Calculate score
  const score = calculateScore();
  const stars = score > 25 ? 3 : score > 15 ? 2 : score > 5 ? 1 : 0;

  // Update stats
  stats.challengesCompleted = (stats.challengesCompleted || 0) + 1;
  saveJSON(STATS_KEY, stats);

  // Show results
  challengeTheme.textContent = t('duTheme_'+currentChallengeTheme.id, currentChallengeTheme.name);
  challengeScoreDisplay.textContent = t('score','Score') + ': ' + score;
  challengeScoreDisplay.style.display = 'block';
  challengeStars.style.display = 'flex';
  challengeCloseBtn.style.display = 'block';

  // Animate stars
  ['star1','star2','star3'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('earned');
    if (i < stars) {
      setTimeout(() => {
        el.classList.add('earned');
        Audio.starEarn();
      }, 500 + i*400);
    }
  });

  challengeOverlay.classList.add('visible');
  hudTimer.style.display = 'none';

  // Award coins for challenge
  let coinReward = 10;
  if (stars >= 3) coinReward += 5;
  addCoins(coinReward);

  // Achievements
  checkAchievement('challenge_1');
  if (stars >= 3) checkAchievement('three_stars');
  if (stats.challengesCompleted >= 10) checkAchievement('challenge_10');
  if (score >= 28) checkAchievement('high_scorer');

  // Submit to leaderboard
  if (typeof Leaderboard !== 'undefined') {
    Leaderboard.submitScore('dress-up', score);
  }
}

function calculateScore() {
  if (!currentChallengeTheme) return 0;
  const targetTags = currentChallengeTheme.tags;
  let score = 0;

  CATEGORIES.forEach(cat => {
    if (!equipped[cat]) return;
    const item = ITEMS.find(it => it.id === equipped[cat].itemId);
    if (!item) return;
    item.tags.forEach(tag => {
      if (targetTags.includes(tag)) score += 3;
      else {
        // Check partial matches (related tags)
        const related = {
          casual:['simple','sporty'], elegant:['formal','fancy'], cool:['punk','retro'],
          natural:['cute'], magic:['fantasy','magical'], summer:['casual','beach'],
          warm:['cozy','winter'], medieval:['warrior'], royal:['elegant','fancy'],
          fancy:['elegant'], punk:['cool','retro'], hero:['warrior','cool'],
          warrior:['medieval','hero'], fantasy:['magic','magical'], scifi:['space','cool'],
        };
        if (related[tag] && related[tag].some(r => targetTags.includes(r))) score += 1;
      }
    });
  });

  // All slots bonus (dress replaces top+bottom, so 5 or 6 slots filled counts)
  const hasDress = !!equipped.dress;
  const hasTopBot = !!equipped.top && !!equipped.bottom;
  const coreSlots = ['hair','shoes','accessory','background'].filter(c => equipped[c]).length;
  if (coreSlots >= 4 && (hasDress || hasTopBot)) score += 5;

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
  runwayOffset = -450; // start off-screen left
  canvas.parentElement.classList.add('runway-active');

  function animateRunway() {
    runwayOffset += 4; // speed
    if (runwayOffset > 500) {
      // Animation complete
      runwayActive = false;
      runwayOffset = 0;
      canvas.parentElement.classList.remove('runway-active');
      render();
      return;
    }

    // Render with offset
    const W = canvas.width, H = canvas.height;
    const char = CHARACTERS[currentCharIdx];
    const margin = 50;
    const charW = W - margin * 2, charH = H - 60;
    // Map offset: -450 -> far left, 0 -> center, 500 -> far right
    const charX = margin + runwayOffset;
    const charY = 30;

    // Clear and draw background
    if (equipped.background) {
      const bgItem = ITEMS.find(it => it.id === equipped.background.itemId);
      if (bgItem) bgItem.draw(ctx, char, margin, charY, charW, charH, equipped.background.colorIdx);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2c2c3e'); g.addColorStop(1, '#1e1e30');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // Spotlight effect
    ctx.save();
    const spotX = charX + charW / 2;
    const spot = ctx.createRadialGradient(spotX, H * 0.4, 20, spotX, H * 0.4, 200);
    spot.addColorStop(0, 'rgba(255,255,255,0.06)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Draw cape/wings behind
    if (equipped.accessory) {
      const accItem = ITEMS.find(it => it.id === equipped.accessory.itemId);
      if (accItem && (accItem.id === 'acc_cape' || accItem.id === 'acc_extra_wings'))
        accItem.draw(ctx, char, charX, charY, charW, charH, equipped.accessory.colorIdx);
    }
    drawCharacter(ctx, charX, charY, charW, charH, char);
    if (equipped.hair) { const it = ITEMS.find(i2=>i2.id===equipped.hair.itemId); if(it) it.draw(ctx,char,charX,charY,charW,charH,equipped.hair.colorIdx); }
    if (equipped.dress) {
      const it = ITEMS.find(i2=>i2.id===equipped.dress.itemId); if(it) it.draw(ctx,char,charX,charY,charW,charH,equipped.dress.colorIdx);
    } else {
      if (equipped.bottom) { const it = ITEMS.find(i2=>i2.id===equipped.bottom.itemId); if(it) it.draw(ctx,char,charX,charY,charW,charH,equipped.bottom.colorIdx); }
      if (equipped.top) { const it = ITEMS.find(i2=>i2.id===equipped.top.itemId); if(it) it.draw(ctx,char,charX,charY,charW,charH,equipped.top.colorIdx); }
    }
    if (equipped.shoes) { const it = ITEMS.find(i2=>i2.id===equipped.shoes.itemId); if(it) it.draw(ctx,char,charX,charY,charW,charH,equipped.shoes.colorIdx); }
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
  // Auto-play saved music on first interaction
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
  document.getElementById('muteButton').textContent = m ? t('unmute','Unmute') : t('duMute','Mute');
  // Stop/resume background music
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
  if (!document.fullscreenElement) gc.requestFullscreen().catch(()=>{});
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
  document.getElementById('muteButton').textContent = t('unmute','Unmute');
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
