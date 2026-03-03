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

const CATEGORIES = ['hair','top','bottom','shoes','accessory','background'];
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
]);

const PREMIUM_COST = {
  hair:25, top:30, bottom:25, shoes:25, accessory:30, background:35
};

/* ── Coins Economy ── */
let coins = 0; // loaded after loadJSON is defined
let unlockedPremium = [];
let sessionUnlocks = new Set();

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
  return unlockedPremium.includes(itemId) || sessionUnlocks.has(itemId);
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
  const costEl = document.getElementById('premiumCost');
  const buyBtn = document.getElementById('premiumBuyBtn');
  const adBtn = document.getElementById('premiumAdBtn');

  titleEl.textContent = item.name;
  costEl.textContent = cost;
  buyBtn.disabled = coins < cost;
  buyBtn.textContent = coins < cost
    ? 'Not enough coins (' + cost + ')'
    : 'Unlock (' + cost + ' coins)';

  buyBtn.onclick = function () {
    if (coins >= cost) {
      addCoins(-cost);
      unlockItem(item.id);
      modal.classList.remove('visible');
      renderItemGrid();
      render();
    }
  };

  adBtn.onclick = function () {
    modal.classList.remove('visible');
    if (typeof SlayAds !== 'undefined' && SlayAds.showRewardedAd) {
      SlayAds.showRewardedAd(function () {
        sessionUnlocks.add(item.id);
        renderItemGrid();
        render();
      });
    }
  };

  modal.classList.add('visible');
}

/* ================================================================
   CHARACTERS
   ================================================================ */
const CHARACTERS = [
  { id:'human_girl', name:'Girl',  emoji:'👧', skin:'#f5cba7', hair:'#6b3a2a', eyeColor:'#3498db' },
  { id:'human_boy',  name:'Boy',   emoji:'👦', skin:'#f0b27a', hair:'#2c1810', eyeColor:'#27ae60' },
  { id:'wolf_furry', name:'Wolf',  emoji:'🐺', skin:'#8e9eaf', hair:'#4a4a4a', eyeColor:'#f39c12' },
  { id:'cat',        name:'Cat',   emoji:'🐱', skin:'#fce4c8', hair:'#e8a87c', eyeColor:'#2ecc71' },
  { id:'elf',        name:'Elf',   emoji:'🧝', skin:'#fde3d0', hair:'#f7dc6f', eyeColor:'#8e44ad' },
  { id:'fairy',      name:'Fairy', emoji:'🧚', skin:'#fadbd8', hair:'#f1948a', eyeColor:'#e84393' },
];

/* ── Shared chibi body metrics — every draw function uses this ── */
function M(x, y, w, h) {
  const cx = x + w / 2;
  const headR = w * 0.30;          // bigger chibi head
  const headY = y + h * 0.22;
  const bodyTop = headY + headR + 1;
  const bodyBot = y + h * 0.54;
  const bodyW = w * 0.13;          // narrower chibi torso
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
    c.quadraticCurveTo(cx + bodyW + 28, bodyBot - 22, cx + bodyW + 20, bodyBot - 42);
    c.stroke();
    c.strokeStyle = '#bdc3c7'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx + bodyW + 21, bodyBot - 40);
    c.lineTo(cx + bodyW + 18, bodyBot - 47); c.stroke();
  } else if (isCat) {
    c.strokeStyle = '#ddb892'; c.lineWidth = 3.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + bodyW, bodyBot - 3);
    c.bezierCurveTo(cx+bodyW+30, bodyBot-10, cx+bodyW+35, bodyBot-35, cx+bodyW+20, bodyBot-45);
    c.stroke();
  }

  // ── Wings (fairy, behind body) ──
  if (isFairy) {
    const now = Date.now() / 1200;
    const wf = Math.sin(now) * 3;
    c.save();
    for (let layer = 0; layer < 2; layer++) {
      const al = layer === 0 ? 0.1 : 0.18;
      const sc = layer === 0 ? 1.15 : 1;
      c.fillStyle = `rgba(232,67,147,${al})`;
      c.strokeStyle = `rgba(232,67,147,${al+0.2})`;
      c.lineWidth = 1;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s*(bodyW-1), bodyTop+8);
        c.quadraticCurveTo(cx+s*(bodyW+30*sc+wf), bodyTop-15*sc, cx+s*(bodyW+8), bodyTop+35);
        c.closePath(); c.fill(); c.stroke();
        c.beginPath();
        c.moveTo(cx + s*(bodyW-1), bodyTop+18);
        c.quadraticCurveTo(cx+s*(bodyW+22*sc+wf), bodyTop+40*sc, cx+s*(bodyW+4), bodyTop+45);
        c.closePath(); c.fill(); c.stroke();
      }
    }
    c.restore();
  }

  // ── Body (small chibi torso with shading) ──
  const torsoH = bodyBot - bodyTop;
  const bodyGrad = c.createRadialGradient(cx - bodyW * 0.3, bodyTop + torsoH * 0.3, 0, cx, bodyTop + torsoH / 2, torsoH * 0.7);
  bodyGrad.addColorStop(0, _lighten(furColor, 20));
  bodyGrad.addColorStop(1, _darken(furColor, 15));
  c.fillStyle = bodyGrad;
  c.beginPath();
  c.ellipse(cx, bodyTop + torsoH/2, bodyW, torsoH/2, 0, 0, Math.PI*2);
  c.fill();
  if (isWolf) {
    c.fillStyle = '#b0bec5';
    c.beginPath(); c.ellipse(cx, bodyTop+torsoH/2+3, bodyW*0.5, torsoH/2*0.5, 0, 0, Math.PI*2); c.fill();
  }

  // ── Arms (short chibi stubs) ──
  c.strokeStyle = furColor; c.lineWidth = w*0.045; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx-bodyW, bodyTop+10); c.lineTo(cx-bodyW-12, bodyBot-6); c.stroke();
  c.beginPath(); c.moveTo(cx+bodyW, bodyTop+10); c.lineTo(cx+bodyW+12, bodyBot-6); c.stroke();

  // Paw hands for wolf/cat
  if (isWolf || isCat) {
    c.fillStyle = isWolf ? '#7a8a9a' : '#e8c8a0';
    c.beginPath(); c.arc(cx-bodyW-12, bodyBot-5, 5, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx+bodyW+12, bodyBot-5, 5, 0, Math.PI*2); c.fill();
    c.fillStyle = isWolf ? '#5d6d7d' : '#c9a06b';
    for (let s = -1; s <= 1; s += 2) {
      const px = s === -1 ? cx-bodyW-12 : cx+bodyW+12;
      c.beginPath(); c.arc(px, bodyBot-7, 1.8, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(px-2.5, bodyBot-4, 1.3, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(px+2.5, bodyBot-4, 1.3, 0, Math.PI*2); c.fill();
    }
  }

  // ── Legs (short chibi legs) ──
  c.strokeStyle = furColor; c.lineWidth = w*0.05;
  c.beginPath(); c.moveTo(cx-8, bodyBot); c.lineTo(cx-10, legBot); c.stroke();
  c.beginPath(); c.moveTo(cx+8, bodyBot); c.lineTo(cx+10, legBot); c.stroke();

  // ── Feet ──
  if (isWolf || isCat) {
    c.fillStyle = isWolf ? '#7a8a9a' : '#e8c8a0';
    c.beginPath(); c.ellipse(cx-10, footY, 8, 4, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cx+10, footY, 8, 4, 0, 0, Math.PI*2); c.fill();
  } else {
    c.fillStyle = sk;
    c.beginPath(); c.ellipse(cx-10, footY, 7, 3.5, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cx+10, footY, 7, 3.5, 0, 0, Math.PI*2); c.fill();
  }

  // ── Head (BIG chibi head) ──
  if (isWolf) {
    c.fillStyle = '#8e9eaf';
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
    // Snout
    c.fillStyle = '#a0b0c0';
    c.beginPath(); c.ellipse(cx, headY+headR*0.45, headR*0.38, headR*0.28, 0, 0, Math.PI*2); c.fill();
    // Nose
    c.fillStyle = '#3d4f5f';
    c.beginPath(); c.ellipse(cx, headY+headR*0.28, 3.5, 2.5, 0, 0, Math.PI*2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath(); c.arc(cx-1, headY+headR*0.26, 1.2, 0, Math.PI*2); c.fill();
    // Pointed ears
    c.fillStyle = '#8e9eaf';
    c.beginPath(); c.moveTo(cx-headR*0.6, headY-headR*0.6);
    c.lineTo(cx-headR*0.25, headY-headR*1.25); c.lineTo(cx+headR*0.05, headY-headR*0.55); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.6, headY-headR*0.6);
    c.lineTo(cx+headR*0.25, headY-headR*1.25); c.lineTo(cx-headR*0.05, headY-headR*0.55); c.fill();
    // Inner ears
    c.fillStyle = '#e8c8b0';
    c.beginPath(); c.moveTo(cx-headR*0.48, headY-headR*0.62);
    c.lineTo(cx-headR*0.28, headY-headR*1.08); c.lineTo(cx-headR*0.02, headY-headR*0.58); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.48, headY-headR*0.62);
    c.lineTo(cx+headR*0.28, headY-headR*1.08); c.lineTo(cx+headR*0.02, headY-headR*0.58); c.fill();
  } else if (isCat) {
    c.fillStyle = sk;
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
    // Cat ears
    c.fillStyle = sk;
    c.beginPath(); c.moveTo(cx-headR*0.65, headY-headR*0.5);
    c.lineTo(cx-headR*0.35, headY-headR*1.2); c.lineTo(cx-headR*0.0, headY-headR*0.45); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.65, headY-headR*0.5);
    c.lineTo(cx+headR*0.35, headY-headR*1.2); c.lineTo(cx+headR*0.0, headY-headR*0.45); c.fill();
    // Inner ears
    c.fillStyle = '#f8b4c8';
    c.beginPath(); c.moveTo(cx-headR*0.52, headY-headR*0.52);
    c.lineTo(cx-headR*0.35, headY-headR*1.02); c.lineTo(cx-headR*0.08, headY-headR*0.48); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.52, headY-headR*0.52);
    c.lineTo(cx+headR*0.35, headY-headR*1.02); c.lineTo(cx+headR*0.08, headY-headR*0.48); c.fill();
    // Nose
    c.fillStyle = '#e8a87c';
    c.beginPath(); c.moveTo(cx, headY+headR*0.12); c.lineTo(cx-3, headY+headR*0.22); c.lineTo(cx+3, headY+headR*0.22); c.fill();
    // Whiskers
    c.strokeStyle = 'rgba(180,180,180,0.6)'; c.lineWidth = 0.7; c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(cx+s*6, headY+headR*0.18); c.lineTo(cx+s*22, headY+headR*0.1); c.stroke();
      c.beginPath(); c.moveTo(cx+s*6, headY+headR*0.24); c.lineTo(cx+s*22, headY+headR*0.24); c.stroke();
    }
  } else if (isElf) {
    c.fillStyle = sk;
    c.beginPath(); c.ellipse(cx, headY, headR*0.92, headR, 0, 0, Math.PI*2); c.fill();
    // Pointed ears
    c.fillStyle = sk;
    c.beginPath(); c.moveTo(cx-headR*0.85, headY-2);
    c.lineTo(cx-headR*1.35, headY-headR*0.5); c.lineTo(cx-headR*0.85, headY+5); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.85, headY-2);
    c.lineTo(cx+headR*1.35, headY-headR*0.5); c.lineTo(cx+headR*0.85, headY+5); c.fill();
  } else {
    // Round head for girl, boy, fairy
    c.fillStyle = sk;
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
    if (isBoy) {
      c.beginPath();
      c.moveTo(cx-headR*0.7, headY+headR*0.4);
      c.lineTo(cx, headY+headR*1.05);
      c.lineTo(cx+headR*0.7, headY+headR*0.4);
      c.fill();
    }
  }

  // ── Head shine highlight ──
  const shineGrad = c.createRadialGradient(cx - headR*0.3, headY - headR*0.35, 0, cx, headY, headR);
  shineGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
  shineGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  shineGrad.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = shineGrad;
  c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();

  // ── BIG anime eyes ──
  const eyeY = headY + headR * 0.0;
  const eyeSp = headR * 0.34;
  const eyeW = headR * 0.32;
  const eyeH = headR * 0.40;

  if (isWolf) {
    // Stylized wolf anime eyes — larger and more expressive
    for (let s = -1; s <= 1; s += 2) {
      const ex = cx + s * eyeSp;
      // White
      c.fillStyle = '#fff';
      c.beginPath(); c.ellipse(ex, eyeY - 1, eyeW * 0.85, eyeH * 0.8, 0, 0, Math.PI * 2); c.fill();
      // Gradient iris
      const ig = c.createRadialGradient(ex, eyeY - 2, 0, ex, eyeY, eyeW * 0.6);
      ig.addColorStop(0, _lighten(char.eyeColor, 50));
      ig.addColorStop(0.6, char.eyeColor);
      ig.addColorStop(1, _darken(char.eyeColor, 40));
      c.fillStyle = ig;
      c.beginPath(); c.ellipse(ex, eyeY - 1, eyeW * 0.55, eyeH * 0.65, 0, 0, Math.PI * 2); c.fill();
      // Slit pupil
      c.fillStyle = '#0a0a1a';
      c.beginPath(); c.ellipse(ex, eyeY - 1, eyeW * 0.15, eyeH * 0.55, 0, 0, Math.PI * 2); c.fill();
      // Highlights
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(ex + eyeW * 0.2, eyeY - eyeH * 0.35, eyeW * 0.25, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.arc(ex - eyeW * 0.2, eyeY + eyeH * 0.15, eyeW * 0.12, 0, Math.PI * 2); c.fill();
      // Thick upper eyelid
      c.strokeStyle = 'rgba(30,30,50,0.7)'; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath(); c.ellipse(ex, eyeY - 1, eyeW * 0.85, eyeH * 0.8, 0, Math.PI + 0.3, -0.3); c.stroke();
    }
  } else {
    for (let s = -1; s <= 1; s += 2) {
      const ex = cx + s * eyeSp;
      // White
      c.fillStyle = '#fff';
      c.beginPath(); c.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); c.fill();
      // Gradient iris
      const irisR = eyeW * 0.78;
      const ig = c.createRadialGradient(ex, eyeY - 1, 0, ex, eyeY + 1, irisR);
      ig.addColorStop(0, _lighten(char.eyeColor, 60));
      ig.addColorStop(0.5, char.eyeColor);
      ig.addColorStop(1, _darken(char.eyeColor, 50));
      c.fillStyle = ig;
      if (isCat) {
        c.beginPath(); c.ellipse(ex, eyeY + 1, irisR * 0.5, irisR, 0, 0, Math.PI * 2); c.fill();
        // Cat slit pupil
        c.fillStyle = '#0a0a1a';
        c.beginPath(); c.ellipse(ex, eyeY + 1, irisR * 0.12, irisR * 0.85, 0, 0, Math.PI * 2); c.fill();
      } else {
        c.beginPath(); c.arc(ex, eyeY + 1, irisR, 0, Math.PI * 2); c.fill();
        // Pupil
        c.fillStyle = '#0a0a1a';
        c.beginPath(); c.arc(ex, eyeY + 1, irisR * 0.45, 0, Math.PI * 2); c.fill();
      }
      // Big primary highlight (top-right)
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(ex + eyeW * 0.22, eyeY - eyeH * 0.3, eyeW * 0.32, 0, Math.PI * 2); c.fill();
      // Secondary highlight (bottom-left)
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.beginPath(); c.arc(ex - eyeW * 0.2, eyeY + eyeH * 0.2, eyeW * 0.16, 0, Math.PI * 2); c.fill();
      // Third sparkle (tiny, top-left)
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.beginPath(); c.arc(ex - eyeW * 0.1, eyeY - eyeH * 0.35, eyeW * 0.09, 0, Math.PI * 2); c.fill();
      // Thick upper eyelid line
      c.strokeStyle = 'rgba(20,20,40,0.6)'; c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.ellipse(ex, eyeY, eyeW, eyeH, 0, Math.PI + 0.25, -0.25); c.stroke();
      // Eyelashes (girl/fairy/elf/cat)
      if (!isBoy) {
        c.strokeStyle = 'rgba(20,20,40,0.5)'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(ex - eyeW * 0.85, eyeY - eyeH * 0.3); c.lineTo(ex - eyeW * 1.05, eyeY - eyeH * 0.55); c.stroke();
        c.beginPath(); c.moveTo(ex - eyeW * 0.6, eyeY - eyeH * 0.65); c.lineTo(ex - eyeW * 0.7, eyeY - eyeH * 0.9); c.stroke();
        c.beginPath(); c.moveTo(ex + eyeW * 0.85, eyeY - eyeH * 0.3); c.lineTo(ex + eyeW * 1.05, eyeY - eyeH * 0.55); c.stroke();
      }
    }
  }

  // ── Eyebrows ──
  c.strokeStyle = isWolf ? '#5d6d7d' : 'rgba(60,40,30,0.35)';
  c.lineWidth = isWolf ? 1.8 : 1.5; c.lineCap = 'round';
  for (let s = -1; s <= 1; s += 2) {
    c.beginPath();
    c.moveTo(cx + s * (eyeSp - eyeW * 0.5), eyeY - eyeH - 3);
    c.quadraticCurveTo(cx + s * eyeSp, eyeY - eyeH - 6, cx + s * (eyeSp + eyeW * 0.5), eyeY - eyeH - 2);
    c.stroke();
  }

  // ── Mouth (anime ω / w mouth) ──
  if (!isWolf && !isCat) {
    const mY = headY + headR * 0.38;
    c.strokeStyle = '#d4726a'; c.lineWidth = 1.3; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx - headR * 0.1, mY);
    c.quadraticCurveTo(cx - headR * 0.05, mY + 3, cx, mY);
    c.quadraticCurveTo(cx + headR * 0.05, mY + 3, cx + headR * 0.1, mY);
    c.stroke();
  } else if (isCat) {
    // Cat :3 mouth
    const mY = headY + headR * 0.3;
    c.strokeStyle = '#d4726a'; c.lineWidth = 1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - 4, mY); c.quadraticCurveTo(cx - 2, mY + 3, cx, mY + 1); c.stroke();
    c.beginPath(); c.moveTo(cx + 4, mY); c.quadraticCurveTo(cx + 2, mY + 3, cx, mY + 1); c.stroke();
  }

  // ── Anime blush marks (horizontal lines) ──
  if (!isWolf) {
    const blushY = eyeY + eyeH + 3;
    c.strokeStyle = 'rgba(255,120,120,0.25)'; c.lineWidth = 1; c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      const bx = cx + s * (eyeSp + eyeW + 4);
      for (let j = 0; j < 3; j++) {
        c.beginPath();
        c.moveTo(bx - 4, blushY + j * 2.5);
        c.lineTo(bx + 4, blushY + j * 2.5);
        c.stroke();
      }
    }
  }

  // ── Soft head glow (fairy / elf) ──
  if (isFairy || isElf) {
    const glow = c.createRadialGradient(cx, headY, headR * 0.5, cx, headY, headR * 1.6);
    glow.addColorStop(0, isFairy ? 'rgba(255,180,220,0.12)' : 'rgba(200,230,255,0.10)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow;
    c.beginPath(); c.arc(cx, headY, headR * 1.6, 0, Math.PI * 2); c.fill();
  }

  // ── Fairy sparkles (more + 4-point stars) ──
  if (isFairy) {
    const now = Date.now() / 500;
    for (let i = 0; i < 14; i++) {
      const sx = cx + Math.sin(now + i * 1.1) * (bodyW + 30 + i * 2);
      const sy = headY - headR * 0.5 + Math.cos(now + i * 1.5) * (bodyBot - headY + headR) * 0.7;
      const sr = 1.5 + Math.sin(now * 2 + i) * 0.8;
      const al = 0.35 + Math.sin(now + i * 0.8) * 0.2;
      c.fillStyle = `rgba(255,200,240,${al})`;
      c.save(); c.translate(sx, sy); c.rotate(now * 0.5 + i);
      c.beginPath();
      for (let p = 0; p < 4; p++) {
        const a = p * Math.PI / 2;
        c.lineTo(Math.cos(a) * sr, Math.sin(a) * sr);
        c.lineTo(Math.cos(a + Math.PI / 4) * sr * 0.3, Math.sin(a + Math.PI / 4) * sr * 0.3);
      }
      c.closePath(); c.fill();
      c.restore();
    }
  }

  // ── Ground shadow ──
  c.fillStyle = 'rgba(0,0,0,0.08)';
  c.beginPath(); c.ellipse(cx, footY + 5, bodyW + 8, 3, 0, 0, Math.PI * 2); c.fill();
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

function _hairShine(c, cx, headY, headR) {
  c.save();
  c.globalAlpha = 0.15;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(cx - headR*0.15, headY - headR*0.55, headR*0.35, headR*0.15, -0.4, 0, Math.PI*2);
  c.fill();
  // Second smaller shine
  c.globalAlpha = 0.08;
  c.beginPath();
  c.ellipse(cx + headR*0.2, headY - headR*0.4, headR*0.2, headR*0.1, 0.3, 0, Math.PI*2);
  c.fill();
  c.restore();
}

function _hairStrands(c, cx, headY, headR, color) {
  c.save();
  c.strokeStyle = _darken(color, 30);
  c.lineWidth = 0.7;
  c.globalAlpha = 0.2;
  c.lineCap = 'round';
  // Gentle curved strands following the cap shape
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    c.arc(cx + i * headR*0.25, headY, headR*0.85, Math.PI + 0.6, -0.6);
    c.stroke();
  }
  c.restore();
}

function _hairOutline(c, cx, headY, headR, color) {
  c.save();
  c.strokeStyle = _darken(color, 40);
  c.lineWidth = 1;
  c.globalAlpha = 0.3;
  c.beginPath();
  c.arc(cx, headY, headR * 1.06, Math.PI, 0);
  c.stroke();
  c.restore();
}

function hairDraw(style, c, char, x, y, w, h, color) {
  const { cx, headR, headY } = M(x, y, w, h);
  const hairGrad = c.createLinearGradient(cx, headY - headR * 1.5, cx, headY + headR * 0.5);
  hairGrad.addColorStop(0, _lighten(color, 30));
  hairGrad.addColorStop(0.4, color);
  hairGrad.addColorStop(1, _darken(color, 20));
  c.fillStyle = hairGrad;
  // Hair sits on TOP of the head, never covering the face below the eye line
  const topY = headY - headR;

  switch(style) {
    case 'ponytail':
      // Cap on top
      c.beginPath(); c.arc(cx, headY, headR*1.05, Math.PI, 0); c.fill();
      c.fillRect(cx-headR*1.05, headY-headR*0.15, headR*2.1, headR*0.2);
      // Side fringe
      c.beginPath(); c.ellipse(cx-headR*0.6, headY-headR*0.1, headR*0.3, headR*0.5, -0.2, 0, Math.PI*2); c.fill();
      // Ponytail flowing back
      c.beginPath(); c.moveTo(cx+headR*0.3, topY+headR*0.5);
      c.quadraticCurveTo(cx+headR*1.5, headY, cx+headR*0.7, headY+headR*2.2);
      c.quadraticCurveTo(cx+headR*0.4, headY+headR*1.8, cx+headR*0.3, headY+headR*0.5);
      c.fill();
      // Ponytail outline
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.globalAlpha = 0.3;
      c.beginPath(); c.moveTo(cx+headR*0.3, topY+headR*0.5);
      c.quadraticCurveTo(cx+headR*1.5, headY, cx+headR*0.7, headY+headR*2.2);
      c.stroke();
      c.globalAlpha = 1;
      // Hair tie
      c.fillStyle = '#e84393';
      c.beginPath(); c.arc(cx+headR*0.5, headY-headR*0.1, 3, 0, Math.PI*2); c.fill();
      break;
    case 'bob':
      c.beginPath(); c.arc(cx, headY, headR*1.08, Math.PI+0.3, -0.3); c.fill();
      // Side panels
      c.beginPath();
      c.moveTo(cx-headR*1.05, headY-headR*0.1);
      c.quadraticCurveTo(cx-headR*1.15, headY+headR*0.5, cx-headR*0.8, headY+headR*0.7);
      c.lineTo(cx-headR*0.4, headY+headR*0.3);
      c.fill();
      c.beginPath();
      c.moveTo(cx+headR*1.05, headY-headR*0.1);
      c.quadraticCurveTo(cx+headR*1.15, headY+headR*0.5, cx+headR*0.8, headY+headR*0.7);
      c.lineTo(cx+headR*0.4, headY+headR*0.3);
      c.fill();
      // Bob side outlines
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.globalAlpha = 0.3;
      c.beginPath();
      c.moveTo(cx-headR*1.05, headY-headR*0.1);
      c.quadraticCurveTo(cx-headR*1.15, headY+headR*0.5, cx-headR*0.8, headY+headR*0.7);
      c.stroke();
      c.beginPath();
      c.moveTo(cx+headR*1.05, headY-headR*0.1);
      c.quadraticCurveTo(cx+headR*1.15, headY+headR*0.5, cx+headR*0.8, headY+headR*0.7);
      c.stroke();
      c.globalAlpha = 1;
      break;
    case 'spiky':
      c.beginPath(); c.arc(cx, headY, headR*1.02, Math.PI, 0); c.fill();
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        const sx = cx + i * headR * 0.22;
        const tipY = headY - headR * 1.4 - Math.abs(i) * 4;
        c.moveTo(sx - 5, headY - headR * 0.5);
        c.quadraticCurveTo(sx - 2, tipY + 4, sx, tipY);
        c.quadraticCurveTo(sx + 2, tipY + 4, sx + 5, headY - headR * 0.5);
        c.fill();
      }
      break;
    case 'long_flowing':
      // Top cap only
      c.beginPath(); c.arc(cx, headY, headR*1.08, Math.PI+0.2, -0.2); c.fill();
      // Side curtains that frame the face (NOT covering it)
      c.beginPath();
      c.moveTo(cx-headR*1.06, headY-headR*0.15);
      c.quadraticCurveTo(cx-headR*1.3, headY+headR*1.5, cx-headR*0.5, headY+headR*2.8);
      c.lineTo(cx-headR*0.3, headY+headR*2.5);
      c.quadraticCurveTo(cx-headR*0.8, headY+headR*1.2, cx-headR*0.75, headY+headR*0.2);
      c.fill();
      c.beginPath();
      c.moveTo(cx+headR*1.06, headY-headR*0.15);
      c.quadraticCurveTo(cx+headR*1.3, headY+headR*1.5, cx+headR*0.5, headY+headR*2.8);
      c.lineTo(cx+headR*0.3, headY+headR*2.5);
      c.quadraticCurveTo(cx+headR*0.8, headY+headR*1.2, cx+headR*0.75, headY+headR*0.2);
      c.fill();
      // Long flowing side outlines
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.globalAlpha = 0.3;
      c.beginPath();
      c.moveTo(cx-headR*1.06, headY-headR*0.15);
      c.quadraticCurveTo(cx-headR*1.3, headY+headR*1.5, cx-headR*0.5, headY+headR*2.8);
      c.stroke();
      c.beginPath();
      c.moveTo(cx+headR*1.06, headY-headR*0.15);
      c.quadraticCurveTo(cx+headR*1.3, headY+headR*1.5, cx+headR*0.5, headY+headR*2.8);
      c.stroke();
      c.globalAlpha = 1;
      break;
    case 'braids':
      c.beginPath(); c.arc(cx, headY, headR*1.06, Math.PI+0.2, -0.2); c.fill();
      // Two braids
      for (let s = -1; s <= 1; s += 2) {
        const bx = cx + s*headR*0.65;
        for (let j = 0; j < 5; j++) {
          const by = headY + headR*0.3 + j*headR*0.4;
          c.beginPath(); c.ellipse(bx+s*2*((j%2)*2-1), by, 5, 6, 0, 0, Math.PI*2); c.fill();
        }
        // Hair tie at end
        c.fillStyle = '#e84393';
        c.beginPath(); c.arc(bx, headY+headR*0.3+5*headR*0.4, 3, 0, Math.PI*2); c.fill();
        c.fillStyle = hairGrad;
        // Braid outline
        c.strokeStyle = _darken(color, 35);
        c.lineWidth = 1;
        c.globalAlpha = 0.3;
        c.beginPath();
        c.moveTo(bx, headY+headR*0.3);
        c.lineTo(bx, headY+headR*0.3+5*headR*0.4);
        c.stroke();
        c.globalAlpha = 1;
      }
      break;
    case 'mohawk':
      c.beginPath(); c.arc(cx, headY, headR*1.02, Math.PI+0.6, -0.6); c.fill();
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        const sx = cx + i * headR * 0.14;
        const tipY = headY - headR * 1.7;
        c.moveTo(sx - 5, headY - headR * 0.6);
        c.quadraticCurveTo(sx - 2, tipY + 5, sx, tipY);
        c.quadraticCurveTo(sx + 2, tipY + 5, sx + 5, headY - headR * 0.6);
        c.fill();
      }
      break;
    case 'curly':
      // Curly puffs around the top of the head
      for (let a = Math.PI+0.3; a >= -0.3; a -= 0.35) {
        const rx = cx + Math.cos(a)*headR*1.15;
        const ry = headY + Math.sin(a)*headR*0.6 - headR*0.2;
        c.beginPath(); c.arc(rx, ry, headR*0.28, 0, Math.PI*2); c.fill();
      }
      // Side curls
      for (let s = -1; s <= 1; s += 2) {
        for (let j = 0; j < 2; j++) {
          c.beginPath();
          c.arc(cx+s*headR*(0.9+j*0.08), headY+headR*(0.2+j*0.35), headR*0.25, 0, Math.PI*2);
          c.fill();
        }
      }
      break;
    case 'bun':
      c.beginPath(); c.arc(cx, headY, headR*1.05, Math.PI+0.3, -0.3); c.fill();
      // Bun on top
      c.beginPath(); c.arc(cx, headY-headR*1.0, headR*0.45, 0, Math.PI*2); c.fill();
      // Hair stick
      c.strokeStyle = '#f4d03f'; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx-headR*0.5, headY-headR*1.15);
      c.lineTo(cx+headR*0.5, headY-headR*0.85); c.stroke();
      break;
  }
  _hairShine(c, cx, headY, headR);
  _hairStrands(c, cx, headY, headR, color);
  _hairOutline(c, cx, headY, headR, color);
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
  const topGrad = c.createLinearGradient(cx, bodyTop, cx, bodyBot);
  topGrad.addColorStop(0, _lighten(color, 20));
  topGrad.addColorStop(1, _darken(color, 15));
  c.fillStyle = topGrad;

  switch(style) {
    case 'tshirt': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 6);
      c.quadraticCurveTo(cx - bodyW - 3, bodyBot, cx - bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 3, bodyBot, cx + bodyW + 2, bodyTop + 6);
      c.closePath();
      c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 8), bodyTop + 14, 9, 7, s * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 6);
      c.quadraticCurveTo(cx - bodyW - 3, bodyBot, cx - bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 3, bodyBot, cx + bodyW + 2, bodyTop + 6);
      c.stroke();
      c.strokeStyle = _darken(color, 20);
      c.lineWidth = 0.8;
      c.beginPath();
      c.arc(cx, bodyTop + 2, 6, 0.3, Math.PI - 0.3);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 3, bodyTop + 10, bodyW * 0.5, 4, -0.2, 0, Math.PI * 2);
      c.fill();
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
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 10), bodyTop + 16, 11, 8, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      c.beginPath();
      c.arc(cx, bodyTop, 12, Math.PI, 0);
      c.fill();
      c.strokeStyle = _darken(color, 30);
      c.lineWidth = 0.8;
      c.beginPath();
      c.arc(cx, bodyTop, 12, Math.PI, 0);
      c.stroke();
      c.strokeStyle = _darken(color, 20);
      c.lineWidth = 0.7;
      c.beginPath();
      c.ellipse(cx, bodyBot - 10, 8, 5, 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 6, bodyBot, cx - bodyW + 2, bodyBot + 2);
      c.quadraticCurveTo(cx, bodyBot + 4, cx + bodyW - 2, bodyBot + 2);
      c.quadraticCurveTo(cx + bodyW + 6, bodyBot, cx + bodyW + 4, bodyTop + 4);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 3, bodyTop + 10, bodyW * 0.5, 4, -0.2, 0, Math.PI * 2);
      c.fill();
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
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW, bodyBot, cx - bodyW + 3, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 2, cx + bodyW - 3, bodyBot);
      c.quadraticCurveTo(cx + bodyW, bodyBot, cx + bodyW - 1, bodyTop + 5);
      c.stroke();
      c.strokeStyle = _darken(color, 25);
      c.lineWidth = 0.7;
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.arc(cx + s * 3, bodyTop + 2, 4, 0.2 * s + Math.PI * 0.5, 0.2 * s + Math.PI * 1.5);
        c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 2, bodyTop + 10, bodyW * 0.4, 3, -0.2, 0, Math.PI * 2);
      c.fill();
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
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 10), bodyTop + 16, 10, 7, s * 0.2, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 3, bodyBot, cx - bodyW + 2, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 3, bodyBot, cx + bodyW + 2, bodyTop + 4);
      c.stroke();
      c.fillStyle = '#fff';
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(cx + s * 2, bodyTop + 2);
        c.quadraticCurveTo(cx + s * 8, bodyTop + 4, cx + s * 7, bodyTop + 12);
        c.quadraticCurveTo(cx + s * 4, bodyTop + 10, cx + s * 2, bodyTop + 8);
        c.closePath();
        c.fill();
      }
      c.fillStyle = _darken(color, 30);
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(cx, bodyTop + 14 + i * 8, 1.3, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 3, bodyTop + 10, bodyW * 0.5, 4, -0.2, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'crop_top': {
      const cropBot = (bodyTop + bodyBot) / 2 - 4;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 2, cropBot, cx - bodyW + 3, cropBot + 2);
      c.quadraticCurveTo(cx, cropBot + 4, cx + bodyW - 3, cropBot + 2);
      c.quadraticCurveTo(cx + bodyW + 2, cropBot, cx + bodyW, bodyTop + 5);
      c.closePath();
      c.fill();
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 2, cropBot, cx - bodyW + 3, cropBot + 2);
      c.quadraticCurveTo(cx, cropBot + 4, cx + bodyW - 3, cropBot + 2);
      c.quadraticCurveTo(cx + bodyW + 2, cropBot, cx + bodyW, bodyTop + 5);
      c.stroke();
      c.strokeStyle = _darken(color, 20);
      c.lineWidth = 0.7;
      c.beginPath();
      c.arc(cx, bodyTop + 2, 5, 0.4, Math.PI - 0.4);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 2, bodyTop + 10, bodyW * 0.4, 3, -0.2, 0, Math.PI * 2);
      c.fill();
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
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 10), bodyTop + 16, 12, 9, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 3);
      c.quadraticCurveTo(cx - bodyW - 6, bodyBot, cx - bodyW + 2, bodyBot + 1);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot + 1);
      c.quadraticCurveTo(cx + bodyW + 6, bodyBot, cx + bodyW + 4, bodyTop + 3);
      c.stroke();
      c.strokeStyle = _darken(color, 20);
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(cx, bodyTop + 5);
      c.quadraticCurveTo(cx + 1, (bodyTop + bodyBot) / 2, cx, bodyBot);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 4, bodyTop + 10, bodyW * 0.45, 4, -0.2, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'armor': {
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 5, (bodyTop + bodyBot) / 2, cx - bodyW - 3, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW + 3, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 5, (bodyTop + bodyBot) / 2, cx + bodyW + 2, bodyTop + 4);
      c.closePath();
      c.fill();
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 5), bodyTop + 8, 9, 6, s * 0.3, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = _darken(color, 30);
        c.lineWidth = 0.8;
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 5), bodyTop + 8, 9, 6, s * 0.3, 0, Math.PI * 2);
        c.stroke();
      }
      c.strokeStyle = _darken(color, 25);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW, (bodyTop + bodyBot) / 2);
      c.quadraticCurveTo(cx, (bodyTop + bodyBot) / 2 + 2, cx + bodyW, (bodyTop + bodyBot) / 2);
      c.stroke();
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyTop + 4);
      c.quadraticCurveTo(cx - bodyW - 5, (bodyTop + bodyBot) / 2, cx - bodyW - 3, bodyBot);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW + 3, bodyBot);
      c.quadraticCurveTo(cx + bodyW + 5, (bodyTop + bodyBot) / 2, cx + bodyW + 2, bodyTop + 4);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.beginPath();
      c.ellipse(cx - 3, bodyTop + 10, bodyW * 0.5, 4, -0.2, 0, Math.PI * 2);
      c.fill();
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
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 12), bodyTop + 18, 12, 8, s * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 14, (bodyTop + robeBot) / 2, cx - bodyW - 8, robeBot);
      c.quadraticCurveTo(cx, robeBot + 4, cx + bodyW + 8, robeBot);
      c.quadraticCurveTo(cx + bodyW + 14, (bodyTop + robeBot) / 2, cx + bodyW + 4, bodyTop + 2);
      c.stroke();
      c.fillStyle = 'rgba(255,215,0,0.35)';
      c.font = '7px sans-serif';
      c.fillText('\u2605', cx - 5, bodyBot - 8);
      c.fillText('\u2605', cx + 4, (bodyTop + bodyBot) / 2 + 2);
      c.fillStyle = 'rgba(255,255,255,0.10)';
      c.beginPath();
      c.ellipse(cx - 3, bodyTop + 12, bodyW * 0.5, 4, -0.2, 0, Math.PI * 2);
      c.fill();
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
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW - 6, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 12, (bodyTop + kimBot) / 2, cx - bodyW - 4, kimBot);
      c.quadraticCurveTo(cx, kimBot + 3, cx + bodyW + 4, kimBot);
      c.quadraticCurveTo(cx + bodyW + 12, (bodyTop + kimBot) / 2, cx + bodyW + 6, bodyTop + 2);
      c.stroke();
      c.fillStyle = _darken(color, 30);
      const obiY = (bodyTop + bodyBot) / 2 - 2;
      c.beginPath();
      c.moveTo(cx - bodyW - 4, obiY);
      c.quadraticCurveTo(cx, obiY + 3, cx + bodyW + 4, obiY);
      c.quadraticCurveTo(cx + bodyW + 4, obiY + 7, cx + bodyW + 3, obiY + 7);
      c.quadraticCurveTo(cx, obiY + 10, cx - bodyW - 3, obiY + 7);
      c.quadraticCurveTo(cx - bodyW - 4, obiY + 7, cx - bodyW - 4, obiY);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 3, bodyTop + 10, bodyW * 0.5, 4, -0.2, 0, Math.PI * 2);
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
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 1, bodyBot, cx - bodyW + 3, bodyBot - 1);
      c.quadraticCurveTo(cx, bodyBot + 2, cx + bodyW - 3, bodyBot - 1);
      c.quadraticCurveTo(cx + bodyW + 1, bodyBot, cx + bodyW - 1, bodyTop + 5);
      c.stroke();
      c.strokeStyle = _darken(color, 20);
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(cx, bodyTop + 6);
      c.quadraticCurveTo(cx + 0.5, (bodyTop + bodyBot) / 2, cx, bodyBot - 2);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 2, bodyTop + 10, bodyW * 0.4, 3, -0.2, 0, Math.PI * 2);
      c.fill();
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
      for (let s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(cx + s * (bodyW + 9), bodyTop + 15, 10, 8, s * 0.25, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = _darken(color, 15);
      c.beginPath();
      c.ellipse(cx, bodyTop + 1, 7, 3, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = topGrad;
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 3);
      c.quadraticCurveTo(cx - bodyW - 4, bodyBot, cx - bodyW + 2, bodyBot + 1);
      c.quadraticCurveTo(cx, bodyBot + 3, cx + bodyW - 2, bodyBot + 1);
      c.quadraticCurveTo(cx + bodyW + 4, bodyBot, cx + bodyW + 3, bodyTop + 3);
      c.stroke();
      c.strokeStyle = _darken(color, 12);
      c.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) {
        const ly = bodyTop + 8 + i * 7;
        c.beginPath();
        c.moveTo(cx - bodyW + 2, ly);
        c.quadraticCurveTo(cx, ly + 1.5, cx + bodyW - 2, ly);
        c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 3, bodyTop + 10, bodyW * 0.5, 4, -0.2, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'corset': {
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 8);
      c.quadraticCurveTo(cx - bodyW - 2, (bodyTop + bodyBot) / 2, cx - bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx, bodyBot, cx + bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx + bodyW + 2, (bodyTop + bodyBot) / 2, cx + bodyW - 1, bodyTop + 8);
      c.closePath();
      c.fill();
      c.strokeStyle = _darken(color, 35);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(cx - bodyW + 1, bodyTop + 8);
      c.quadraticCurveTo(cx - bodyW - 2, (bodyTop + bodyBot) / 2, cx - bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx, bodyBot, cx + bodyW, bodyBot - 3);
      c.quadraticCurveTo(cx + bodyW + 2, (bodyTop + bodyBot) / 2, cx + bodyW - 1, bodyTop + 8);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.lineWidth = 0.7;
      for (let i = 0; i < 4; i++) {
        const ly = bodyTop + 12 + i * 6;
        c.beginPath();
        c.moveTo(cx - 2, ly);
        c.quadraticCurveTo(cx - 5, ly + 2, cx - 7, ly + 3);
        c.stroke();
        c.beginPath();
        c.moveTo(cx + 2, ly);
        c.quadraticCurveTo(cx + 5, ly + 2, cx + 7, ly + 3);
        c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.ellipse(cx - 2, bodyTop + 14, bodyW * 0.35, 3, -0.2, 0, Math.PI * 2);
      c.fill();
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

function _bottomHighlight(c, cx, bodyBot, bodyW) {
  c.save();
  c.globalAlpha = 0.1;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(cx, bodyBot + 4, bodyW*0.7, 3, 0, 0, Math.PI*2);
  c.fill();
  c.restore();
}

function drawBottom(style, c, char, x, y, w, h, color) {
  const { cx, bodyBot, bodyW, legBot } = M(x, y, w, h);
  const botGrad = c.createLinearGradient(cx, bodyBot, cx, legBot);
  botGrad.addColorStop(0, _lighten(color, 20));
  botGrad.addColorStop(0.5, color);
  botGrad.addColorStop(1, _darken(color, 25));
  c.fillStyle = botGrad;

  switch(style) {
    case 'jeans':
      c.beginPath();
      c.moveTo(cx-bodyW-1,bodyBot-3); c.lineTo(cx-14,legBot);
      c.lineTo(cx-3,legBot); c.lineTo(cx,bodyBot+6);
      c.lineTo(cx+3,legBot); c.lineTo(cx+14,legBot);
      c.lineTo(cx+bodyW+1,bodyBot-3);
      c.closePath(); c.fill();
      c.strokeStyle='rgba(255,255,255,0.08)'; c.lineWidth=0.6;
      c.beginPath(); c.moveTo(cx,bodyBot); c.lineTo(cx,bodyBot+6); c.stroke();
      break;
    case 'skirt':
      c.beginPath();
      c.moveTo(cx-bodyW-1,bodyBot-3);
      c.quadraticCurveTo(cx-bodyW-10,bodyBot+18,cx-bodyW+3,bodyBot+24);
      c.lineTo(cx+bodyW-3,bodyBot+24);
      c.quadraticCurveTo(cx+bodyW+10,bodyBot+18,cx+bodyW+1,bodyBot-3);
      c.closePath(); c.fill();
      break;
    case 'shorts':
      c.beginPath();
      c.moveTo(cx-bodyW-1,bodyBot-3); c.lineTo(cx-bodyW,bodyBot+10);
      c.lineTo(cx-2,bodyBot+10); c.lineTo(cx,bodyBot+4);
      c.lineTo(cx+2,bodyBot+10); c.lineTo(cx+bodyW,bodyBot+10);
      c.lineTo(cx+bodyW+1,bodyBot-3);
      c.closePath(); c.fill();
      break;
    case 'leggings':
      c.beginPath();
      c.moveTo(cx-bodyW,bodyBot-3); c.lineTo(cx-12,legBot+1);
      c.lineTo(cx-5,legBot+1); c.lineTo(cx,bodyBot+6);
      c.lineTo(cx+5,legBot+1); c.lineTo(cx+12,legBot+1);
      c.lineTo(cx+bodyW,bodyBot-3);
      c.closePath(); c.fill();
      break;
    case 'cargo_pants':
      c.beginPath();
      c.moveTo(cx-bodyW-2,bodyBot-3); c.lineTo(cx-15,legBot);
      c.lineTo(cx-3,legBot); c.lineTo(cx,bodyBot+6);
      c.lineTo(cx+3,legBot); c.lineTo(cx+15,legBot);
      c.lineTo(cx+bodyW+2,bodyBot-3);
      c.closePath(); c.fill();
      c.strokeStyle='rgba(0,0,0,0.12)'; c.lineWidth=0.7;
      c.strokeRect(cx-15,bodyBot+6,9,8); c.strokeRect(cx+6,bodyBot+6,9,8);
      break;
    case 'flowing_skirt':
      c.beginPath();
      c.moveTo(cx-bodyW-1,bodyBot-3);
      c.quadraticCurveTo(cx-bodyW-18,bodyBot+28,cx-bodyW+6,y+h*0.78);
      c.lineTo(cx+bodyW-6,y+h*0.78);
      c.quadraticCurveTo(cx+bodyW+18,bodyBot+28,cx+bodyW+1,bodyBot-3);
      c.closePath(); c.fill();
      c.strokeStyle='rgba(255,255,255,0.08)'; c.lineWidth=0.6;
      for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(cx+i*6,bodyBot);c.quadraticCurveTo(cx+i*7+2,bodyBot+16,cx+i*6.5,y+h*0.77);c.stroke();}
      break;
    case 'armor_greaves':
      c.beginPath();
      c.moveTo(cx-bodyW-2,bodyBot-3); c.lineTo(cx-15,legBot+1);
      c.lineTo(cx-4,legBot+1); c.lineTo(cx,bodyBot+6);
      c.lineTo(cx+4,legBot+1); c.lineTo(cx+15,legBot+1);
      c.lineTo(cx+bodyW+2,bodyBot-3);
      c.closePath(); c.fill();
      c.strokeStyle='rgba(0,0,0,0.15)'; c.lineWidth=0.7;
      c.beginPath(); c.moveTo(cx-14,(bodyBot+legBot)/2); c.lineTo(cx-4,(bodyBot+legBot)/2); c.stroke();
      c.beginPath(); c.moveTo(cx+4,(bodyBot+legBot)/2); c.lineTo(cx+14,(bodyBot+legBot)/2); c.stroke();
      break;
    case 'sweatpants':
      c.beginPath();
      c.moveTo(cx-bodyW,bodyBot-3); c.lineTo(cx-13,legBot);
      c.lineTo(cx-4,legBot); c.lineTo(cx,bodyBot+6);
      c.lineTo(cx+4,legBot); c.lineTo(cx+13,legBot);
      c.lineTo(cx+bodyW,bodyBot-3);
      c.closePath(); c.fill();
      c.fillStyle='rgba(0,0,0,0.08)';
      c.fillRect(cx-13,legBot-3,9,3); c.fillRect(cx+4,legBot-3,9,3);
      break;
    case 'pleated_skirt':
      c.beginPath();
      c.moveTo(cx-bodyW-1,bodyBot-3); c.lineTo(cx-bodyW-5,bodyBot+22);
      c.lineTo(cx+bodyW+5,bodyBot+22); c.lineTo(cx+bodyW+1,bodyBot-3);
      c.closePath(); c.fill();
      c.strokeStyle='rgba(0,0,0,0.1)'; c.lineWidth=0.6;
      for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(cx+i*5,bodyBot);c.lineTo(cx+i*5.5,bodyBot+20);c.stroke();}
      break;
    case 'bell_bottoms':
      c.beginPath();
      c.moveTo(cx-bodyW,bodyBot-3); c.lineTo(cx-10,bodyBot+20);
      c.quadraticCurveTo(cx-12,legBot+2,cx-20,legBot+2);
      c.lineTo(cx-2,legBot+2); c.lineTo(cx,bodyBot+6);
      c.lineTo(cx+2,legBot+2); c.lineTo(cx+20,legBot+2);
      c.quadraticCurveTo(cx+12,legBot+2,cx+10,bodyBot+20);
      c.lineTo(cx+bodyW,bodyBot-3);
      c.closePath(); c.fill();
      break;
  }
  _bottomHighlight(c, cx, bodyBot, bodyW);
}

BOTTOM_DEFS.forEach(d => {
  defItem('bottom_'+d.id, d.name, 'bottom', d.tags, d.colors,
    (c, char, x, y, w, h, colIdx) => {
      drawBottom(d.id, c, char, x, y, w, h, d.colors[colIdx % d.colors.length][0]);
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
  const shoeGrad = c.createLinearGradient(cx, footY - 15, cx, footY + 8);
  shoeGrad.addColorStop(0, _lighten(color, 30));
  shoeGrad.addColorStop(0.5, color);
  shoeGrad.addColorStop(1, _darken(color, 25));
  c.fillStyle = shoeGrad;

  switch(style) {
    case 'sneakers':
      for(let s=-1;s<=1;s+=2){const fx=cx+s*10;
        c.beginPath();c.ellipse(fx,footY,10,5,0,0,Math.PI*2);c.fill();
        c.fillStyle='rgba(0,0,0,0.1)';c.beginPath();c.ellipse(fx,footY+2,10,2.5,0,0,Math.PI);c.fill();c.fillStyle=shoeGrad;}
      break;
    case 'boots':
      for(let s=-1;s<=1;s+=2){const fx=cx+s*10;
        c.fillRect(fx-8,footY-14,16,19);
        c.beginPath();c.ellipse(fx,footY+5,9,4,0,0,Math.PI*2);c.fill();
        c.strokeStyle='rgba(0,0,0,0.15)';c.lineWidth=0.6;
        c.beginPath();c.moveTo(fx-6,footY-8);c.lineTo(fx+6,footY-8);c.stroke();}
      break;
    case 'heels':
      for(let s=-1;s<=1;s+=2){const fx=cx+s*10;
        c.beginPath();c.ellipse(fx+s*2,footY,9,4,0,0,Math.PI*2);c.fill();
        c.fillRect(fx-s*4-1,footY,3,8);}
      break;
    case 'sandals':
      for(let s=-1;s<=1;s+=2){const fx=cx+s*10;
        c.beginPath();c.ellipse(fx,footY+1,9,3.5,0,0,Math.PI*2);c.fill();
        c.strokeStyle=color;c.lineWidth=1.5;
        c.beginPath();c.moveTo(fx-4,footY-2);c.lineTo(fx,footY-5);c.lineTo(fx+4,footY-2);c.stroke();}
      break;
    case 'armored_boots':
      for(let s=-1;s<=1;s+=2){const fx=cx+s*10;
        c.beginPath();c.moveTo(fx-9,footY-16);c.lineTo(fx-10,footY+4);c.lineTo(fx+10,footY+4);c.lineTo(fx+9,footY-16);c.closePath();c.fill();
        c.strokeStyle='rgba(0,0,0,0.18)';c.lineWidth=0.7;
        c.beginPath();c.moveTo(fx-9,footY-6);c.lineTo(fx+9,footY-6);c.stroke();}
      break;
    case 'slippers':
      for(let s=-1;s<=1;s+=2){const fx=cx+s*10;
        c.beginPath();c.ellipse(fx,footY,10,5.5,0,0,Math.PI*2);c.fill();
        c.fillStyle='rgba(255,255,255,0.25)';c.beginPath();c.ellipse(fx,footY-2,7,3,0,Math.PI,0);c.fill();c.fillStyle=color;}
      break;
    case 'platforms':
      for(let s=-1;s<=1;s+=2){const fx=cx+s*10;
        c.fillRect(fx-9,footY-1,18,10);
        c.beginPath();c.ellipse(fx,footY-1,9,4,0,0,Math.PI*2);c.fill();
        c.fillStyle='rgba(255,255,255,0.08)';c.fillRect(fx-9,footY+4,18,2);c.fillStyle=color;}
      break;
    case 'barefoot':
      for(let s=-1;s<=1;s+=2){const fx=cx+s*10;
        c.strokeStyle=color;c.lineWidth=1.5;
        c.beginPath();c.ellipse(fx,footY,8,4,0,0,Math.PI*2);c.stroke();
        c.beginPath();c.moveTo(fx,footY-4);c.lineTo(fx,footY-10);c.stroke();
        c.beginPath();c.moveTo(fx-4,footY-6);c.lineTo(fx+4,footY-6);c.stroke();}
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

  // Bottom (drawn before top so top overlaps waist)
  if (equipped.bottom) {
    const item = ITEMS.find(it => it.id === equipped.bottom.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.bottom.colorIdx);
  }

  // Shoes
  if (equipped.shoes) {
    const item = ITEMS.find(it => it.id === equipped.shoes.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.shoes.colorIdx);
  }

  // Top
  if (equipped.top) {
    const item = ITEMS.find(it => it.id === equipped.top.itemId);
    if (item) item.draw(ctx, char, charX, charY, charW, charH, equipped.top.colorIdx);
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
    bottom: t('duCatBottom','Bottom'), shoes: t('duCatShoes','Shoes'),
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
  const filled = CATEGORIES.filter(c => equipped[c]).length;
  if (filled >= 6) checkAchievement('full_outfit');
}

/* ================================================================
   ACTIONS — Randomize / Save / Load / Clear / Screenshot
   ================================================================ */
function randomizeOutfit() {
  Audio.init(); Audio.resume(); Audio.randomize();
  CATEGORIES.forEach(cat => {
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
  if (equipped.bottom) { const it = ITEMS.find(i2=>i2.id===equipped.bottom.itemId); if(it) it.draw(c,char,charX,charY,charW,charH,equipped.bottom.colorIdx); }
  if (equipped.shoes) { const it = ITEMS.find(i2=>i2.id===equipped.shoes.itemId); if(it) it.draw(c,char,charX,charY,charW,charH,equipped.shoes.colorIdx); }
  if (equipped.top) { const it = ITEMS.find(i2=>i2.id===equipped.top.itemId); if(it) it.draw(c,char,charX,charY,charW,charH,equipped.top.colorIdx); }
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

  // All slots bonus
  const filled = CATEGORIES.filter(c => equipped[c]).length;
  if (filled >= 6) score += 5;

  scoreDisplay.textContent = score;
  return score;
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

// Watch Ad button
const watchAdBtn = document.getElementById('watchAdBtn');
if (watchAdBtn) {
  watchAdBtn.onclick = function () {
    if (typeof SlayAds !== 'undefined' && SlayAds.showRewardedAd) {
      SlayAds.showRewardedAd(function () {
        addCoins(15);
      });
    }
  };
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

// Re-render on lang change
window.addEventListener('langchange', () => {
  buildCategoryTabs();
  renderItemGrid();
  renderAchievements();
  if (typeof I18N !== 'undefined') I18N.applyDOM();
});

})();
