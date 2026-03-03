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
  if (typeof I18N !== 'undefined' && I18N.t) return I18N.t(key) || fb;
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

/* ================================================================
   CHARACTERS
   ================================================================ */
const CHARACTERS = [
  { id:'human_girl', name:'Girl',  emoji:'👧', skin:'#f5cba7', hair:'#6b3a2a', eyeColor:'#3498db' },
  { id:'human_boy',  name:'Boy',   emoji:'👦', skin:'#f0b27a', hair:'#2c1810', eyeColor:'#27ae60' },
  { id:'wolf_furry', name:'Wolf',  emoji:'🐺', skin:'#7f8c8d', hair:'#4a4a4a', eyeColor:'#f39c12' },
  { id:'cat',        name:'Cat',   emoji:'🐱', skin:'#f5cba7', hair:'#e8a87c', eyeColor:'#2ecc71' },
  { id:'elf',        name:'Elf',   emoji:'🧝', skin:'#fde3d0', hair:'#f7dc6f', eyeColor:'#8e44ad' },
  { id:'fairy',      name:'Fairy', emoji:'🧚', skin:'#fadbd8', hair:'#f1948a', eyeColor:'#e84393' },
];

function drawCharacter(c, x, y, w, h, char) {
  const cx = x + w/2;
  const headR = w * 0.18;
  const headY = y + h * 0.15;
  const bodyTop = headY + headR + 4;
  const bodyBot = y + h * 0.72;
  const bodyW = w * 0.28;
  const sk = char.skin;
  const hc = char.hair;

  // Body
  c.fillStyle = sk;
  if (char.id === 'wolf_furry') {
    // Fur texture body
    c.fillStyle = '#7f8c8d';
    c.beginPath();
    c.ellipse(cx, (bodyTop+bodyBot)/2, bodyW, (bodyBot-bodyTop)/2, 0, 0, Math.PI*2);
    c.fill();
    // Lighter chest patch
    c.fillStyle = '#bdc3c7';
    c.beginPath();
    c.ellipse(cx, (bodyTop+bodyBot)/2+5, bodyW*0.5, (bodyBot-bodyTop)/2*0.6, 0, 0, Math.PI*2);
    c.fill();
  } else if (char.id === 'fairy') {
    // Petite body
    c.beginPath();
    c.ellipse(cx, (bodyTop+bodyBot)/2, bodyW*0.85, (bodyBot-bodyTop)/2*0.9, 0, 0, Math.PI*2);
    c.fill();
  } else if (char.id === 'elf') {
    // Slender body
    c.beginPath();
    c.ellipse(cx, (bodyTop+bodyBot)/2-3, bodyW*0.88, (bodyBot-bodyTop)/2+3, 0, 0, Math.PI*2);
    c.fill();
  } else if (char.id === 'human_boy') {
    // Broader shoulders
    c.beginPath();
    c.ellipse(cx, (bodyTop+bodyBot)/2, bodyW*1.08, (bodyBot-bodyTop)/2, 0, 0, Math.PI*2);
    c.fill();
  } else {
    c.beginPath();
    c.ellipse(cx, (bodyTop+bodyBot)/2, bodyW, (bodyBot-bodyTop)/2, 0, 0, Math.PI*2);
    c.fill();
  }

  // Arms
  c.strokeStyle = sk;
  if (char.id === 'wolf_furry') c.strokeStyle = '#7f8c8d';
  c.lineWidth = w * 0.06;
  c.lineCap = 'round';
  // Left arm
  c.beginPath();
  c.moveTo(cx - bodyW, bodyTop + 15);
  c.lineTo(cx - bodyW - 18, bodyBot - 10);
  c.stroke();
  // Right arm
  c.beginPath();
  c.moveTo(cx + bodyW, bodyTop + 15);
  c.lineTo(cx + bodyW + 18, bodyBot - 10);
  c.stroke();

  // Paw hands for wolf/cat
  if (char.id === 'wolf_furry' || char.id === 'cat') {
    c.fillStyle = char.id === 'wolf_furry' ? '#6d7b7d' : '#ddb892';
    c.beginPath(); c.arc(cx - bodyW - 18, bodyBot - 8, 6, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + bodyW + 18, bodyBot - 8, 6, 0, Math.PI*2); c.fill();
    // Paw pads
    c.fillStyle = char.id === 'wolf_furry' ? '#2c3e50' : '#c9956b';
    for (let s = -1; s <= 1; s += 2) {
      const px = s === -1 ? cx - bodyW - 18 : cx + bodyW + 18;
      c.beginPath(); c.arc(px, bodyBot - 10, 2.5, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(px - 3, bodyBot - 6, 1.8, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(px + 3, bodyBot - 6, 1.8, 0, Math.PI*2); c.fill();
    }
  }

  // Legs
  c.strokeStyle = sk;
  if (char.id === 'wolf_furry') c.strokeStyle = '#7f8c8d';
  c.lineWidth = w * 0.07;
  c.beginPath(); c.moveTo(cx - 14, bodyBot); c.lineTo(cx - 16, y + h * 0.88); c.stroke();
  c.beginPath(); c.moveTo(cx + 14, bodyBot); c.lineTo(cx + 16, y + h * 0.88); c.stroke();

  // Feet / paw feet
  if (char.id === 'wolf_furry' || char.id === 'cat') {
    c.fillStyle = char.id === 'wolf_furry' ? '#6d7b7d' : '#ddb892';
    c.beginPath(); c.ellipse(cx - 16, y + h*0.9, 10, 5, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cx + 16, y + h*0.9, 10, 5, 0, 0, Math.PI*2); c.fill();
  } else {
    c.fillStyle = sk;
    c.beginPath(); c.ellipse(cx - 16, y + h*0.9, 9, 4, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cx + 16, y + h*0.9, 9, 4, 0, 0, Math.PI*2); c.fill();
  }

  // Tail for wolf/cat/fairy
  if (char.id === 'wolf_furry') {
    c.strokeStyle = '#6d7b7d'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + bodyW - 2, bodyBot - 8);
    c.quadraticCurveTo(cx + bodyW + 35, bodyBot - 30, cx + bodyW + 25, bodyBot - 55);
    c.stroke();
    c.strokeStyle = '#bdc3c7'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx + bodyW + 27, bodyBot - 50);
    c.lineTo(cx + bodyW + 23, bodyBot - 58); c.stroke();
  } else if (char.id === 'cat') {
    c.strokeStyle = '#ddb892'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + bodyW - 2, bodyBot - 5);
    c.quadraticCurveTo(cx + bodyW + 40, bodyBot - 20, cx + bodyW + 30, bodyBot - 50);
    c.stroke();
  }

  // Wings for fairy
  if (char.id === 'fairy') {
    c.fillStyle = 'rgba(232,67,147,0.15)'; c.strokeStyle = 'rgba(232,67,147,0.4)'; c.lineWidth = 1.5;
    // Left wing
    c.beginPath();
    c.moveTo(cx - bodyW + 2, bodyTop + 15);
    c.quadraticCurveTo(cx - bodyW - 35, bodyTop - 15, cx - bodyW - 10, bodyTop + 40);
    c.closePath(); c.fill(); c.stroke();
    // Right wing
    c.beginPath();
    c.moveTo(cx + bodyW - 2, bodyTop + 15);
    c.quadraticCurveTo(cx + bodyW + 35, bodyTop - 15, cx + bodyW + 10, bodyTop + 40);
    c.closePath(); c.fill(); c.stroke();
  }

  // Head
  c.fillStyle = sk;
  if (char.id === 'wolf_furry') c.fillStyle = '#7f8c8d';
  if (char.id === 'wolf_furry') {
    // Snout head
    c.beginPath(); c.ellipse(cx, headY, headR, headR * 0.95, 0, 0, Math.PI*2); c.fill();
    // Snout
    c.fillStyle = '#95a5a6';
    c.beginPath(); c.ellipse(cx, headY + headR*0.5, headR*0.45, headR*0.35, 0, 0, Math.PI*2); c.fill();
    // Nose
    c.fillStyle = '#2c3e50';
    c.beginPath(); c.ellipse(cx, headY + headR*0.3, 4, 3, 0, 0, Math.PI*2); c.fill();
    // Pointed ears
    c.fillStyle = '#7f8c8d';
    c.beginPath(); c.moveTo(cx-headR*0.7, headY-headR*0.6);
    c.lineTo(cx-headR*0.3, headY-headR*1.3); c.lineTo(cx+headR*0.1, headY-headR*0.6); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.7, headY-headR*0.6);
    c.lineTo(cx+headR*0.3, headY-headR*1.3); c.lineTo(cx-headR*0.1, headY-headR*0.6); c.fill();
    // Inner ears
    c.fillStyle = '#ddb892';
    c.beginPath(); c.moveTo(cx-headR*0.55, headY-headR*0.65);
    c.lineTo(cx-headR*0.35, headY-headR*1.1); c.lineTo(cx-headR*0.05, headY-headR*0.65); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.55, headY-headR*0.65);
    c.lineTo(cx+headR*0.35, headY-headR*1.1); c.lineTo(cx+headR*0.05, headY-headR*0.65); c.fill();
  } else if (char.id === 'cat') {
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
    // Cat ears
    c.fillStyle = sk;
    c.beginPath(); c.moveTo(cx-headR*0.7, headY-headR*0.5);
    c.lineTo(cx-headR*0.4, headY-headR*1.25); c.lineTo(cx, headY-headR*0.5); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.7, headY-headR*0.5);
    c.lineTo(cx+headR*0.4, headY-headR*1.25); c.lineTo(cx, headY-headR*0.5); c.fill();
    // Inner ears
    c.fillStyle = '#f8b4c8';
    c.beginPath(); c.moveTo(cx-headR*0.55, headY-headR*0.55);
    c.lineTo(cx-headR*0.4, headY-headR*1.05); c.lineTo(cx-headR*0.1, headY-headR*0.55); c.fill();
    c.beginPath(); c.moveTo(cx+headR*0.55, headY-headR*0.55);
    c.lineTo(cx+headR*0.4, headY-headR*1.05); c.lineTo(cx+headR*0.1, headY-headR*0.55); c.fill();
    // Small nose
    c.fillStyle = '#e8a87c';
    c.beginPath();
    c.moveTo(cx, headY + 3); c.lineTo(cx - 4, headY + 7); c.lineTo(cx + 4, headY + 7); c.fill();
    // Whiskers
    c.strokeStyle = '#bbb'; c.lineWidth = 0.8;
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(cx + s*8, headY + 5); c.lineTo(cx + s*25, headY + 2); c.stroke();
      c.beginPath(); c.moveTo(cx + s*8, headY + 7); c.lineTo(cx + s*25, headY + 8); c.stroke();
    }
  } else if (char.id === 'elf') {
    // Angular face
    c.beginPath(); c.ellipse(cx, headY, headR * 0.9, headR * 1.05, 0, 0, Math.PI*2); c.fill();
    // Pointed ears
    c.fillStyle = sk;
    c.beginPath(); c.moveTo(cx - headR*0.85, headY - 2);
    c.lineTo(cx - headR*1.4, headY - headR*0.6); c.lineTo(cx - headR*0.85, headY + 6); c.fill();
    c.beginPath(); c.moveTo(cx + headR*0.85, headY - 2);
    c.lineTo(cx + headR*1.4, headY - headR*0.6); c.lineTo(cx + headR*0.85, headY + 6); c.fill();
  } else {
    // Round head (girl, boy, fairy)
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
    if (char.id === 'human_boy') {
      // Angular jaw overlay
      c.beginPath();
      c.moveTo(cx - headR*0.8, headY + headR*0.3);
      c.lineTo(cx, headY + headR*1.15);
      c.lineTo(cx + headR*0.8, headY + headR*0.3);
      c.fill();
    }
  }

  // Eyes
  if (char.id !== 'wolf_furry') {
    const eyeY = headY - headR * 0.1;
    const eyeSpacing = headR * 0.38;
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(cx - eyeSpacing, eyeY, 5, 5.5, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cx + eyeSpacing, eyeY, 5, 5.5, 0, 0, Math.PI*2); c.fill();
    c.fillStyle = char.eyeColor;
    if (char.id === 'cat') {
      // Slitted eyes
      c.beginPath(); c.ellipse(cx - eyeSpacing, eyeY, 2, 5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx + eyeSpacing, eyeY, 2, 5, 0, 0, Math.PI*2); c.fill();
    } else {
      c.beginPath(); c.arc(cx - eyeSpacing, eyeY, 3, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(cx + eyeSpacing, eyeY, 3, 0, Math.PI*2); c.fill();
    }
    // Highlight
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(cx - eyeSpacing + 1.5, eyeY - 1.5, 1.2, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + eyeSpacing + 1.5, eyeY - 1.5, 1.2, 0, Math.PI*2); c.fill();
  } else {
    // Wolf eyes
    const eyeY = headY - headR * 0.15;
    const eyeSpacing = headR * 0.35;
    c.fillStyle = char.eyeColor;
    c.beginPath(); c.ellipse(cx - eyeSpacing, eyeY, 4, 3.5, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cx + eyeSpacing, eyeY, 4, 3.5, 0, 0, Math.PI*2); c.fill();
    c.fillStyle = '#000';
    c.beginPath(); c.ellipse(cx - eyeSpacing, eyeY, 2, 3, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cx + eyeSpacing, eyeY, 2, 3, 0, 0, Math.PI*2); c.fill();
  }

  // Mouth
  if (char.id !== 'wolf_furry' && char.id !== 'cat') {
    c.strokeStyle = '#c0392b'; c.lineWidth = 1.2;
    c.beginPath();
    c.arc(cx, headY + headR*0.35, headR*0.2, 0.1, Math.PI - 0.1);
    c.stroke();
  }

  // Sparkle for fairy
  if (char.id === 'fairy') {
    const now = Date.now() / 500;
    for (let i = 0; i < 5; i++) {
      const sx = cx + Math.sin(now + i*1.3) * (bodyW + 25);
      const sy = bodyTop + Math.cos(now + i*1.7) * 40;
      const sr = 1.5 + Math.sin(now*2 + i) * 0.8;
      c.fillStyle = `rgba(232,67,147,${0.3 + Math.sin(now+i)*0.2})`;
      c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI*2); c.fill();
    }
  }
}

/* ================================================================
   ITEMS DEFINITION
   ================================================================ */
const ITEMS = [];

/* Helper to push items with color variants */
function defItem(id, name, category, tags, colors, drawFn) {
  ITEMS.push({ id, name, category, tags, colors, draw: drawFn });
}

/* ── Hair Styles ── */
const HAIR_COLORS = [
  ['#6b3a2a','#8b5e3c','#3d1f0a','#f7dc6f'],
  ['#2c1810','#5d3a1a','#1a0a00','#c0392b'],
  ['#d4a574','#f0c27a','#a0724a','#e74c3c'],
  ['#4a4a4a','#7f8c8d','#2c3e50','#9b59b6'],
];

function hairDraw(style, c, char, x, y, w, h, color) {
  const cx = x + w/2;
  const headY = y + h*0.15;
  const headR = w * 0.18;
  c.fillStyle = color;

  switch(style) {
    case 'ponytail':
      c.beginPath(); c.arc(cx, headY - headR*0.3, headR*1.1, Math.PI, 0); c.fill();
      c.fillRect(cx - headR*1.05, headY - headR*0.3, headR*2.1, headR*0.5);
      c.beginPath(); c.moveTo(cx + headR*0.4, headY);
      c.quadraticCurveTo(cx + headR*1.6, headY + headR, cx + headR*0.8, headY + headR*2.8);
      c.lineTo(cx + headR*0.3, headY + headR*2.4);
      c.quadraticCurveTo(cx + headR*1, headY + headR*0.5, cx + headR*0.4, headY); c.fill();
      break;
    case 'bob':
      c.beginPath(); c.arc(cx, headY - headR*0.2, headR*1.15, Math.PI, 0); c.fill();
      c.fillRect(cx - headR*1.15, headY - headR*0.2, headR*2.3, headR*0.9);
      c.beginPath(); c.ellipse(cx, headY + headR*0.5, headR*1.15, headR*0.3, 0, 0, Math.PI); c.fill();
      break;
    case 'spiky':
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.moveTo(cx + i*headR*0.3, headY - headR*0.3);
        c.lineTo(cx + i*headR*0.2 + (i>0?5:-5), headY - headR*1.5 - Math.abs(i)*3);
        c.lineTo(cx + i*headR*0.3 + headR*0.15, headY - headR*0.3);
        c.fill();
      }
      c.beginPath(); c.arc(cx, headY - headR*0.2, headR*1.05, Math.PI, 0); c.fill();
      break;
    case 'long_flowing':
      c.beginPath(); c.arc(cx, headY - headR*0.2, headR*1.15, Math.PI, 0); c.fill();
      c.fillRect(cx - headR*1.15, headY - headR*0.2, headR*2.3, headR*0.7);
      c.beginPath(); c.moveTo(cx - headR*1.15, headY + headR*0.3);
      c.quadraticCurveTo(cx - headR*1.4, headY + headR*3, cx - headR*0.5, headY + headR*3.5);
      c.lineTo(cx + headR*0.5, headY + headR*3.5);
      c.quadraticCurveTo(cx + headR*1.4, headY + headR*3, cx + headR*1.15, headY + headR*0.3);
      c.fill();
      break;
    case 'braids':
      c.beginPath(); c.arc(cx, headY - headR*0.2, headR*1.1, Math.PI, 0); c.fill();
      c.fillRect(cx - headR*1.1, headY - headR*0.2, headR*2.2, headR*0.6);
      for (let s = -1; s <= 1; s += 2) {
        const bx = cx + s*headR*0.7;
        for (let j = 0; j < 5; j++) {
          const by = headY + headR*0.5 + j*headR*0.5;
          c.beginPath(); c.ellipse(bx + s*3*((j%2)*2-1), by, 6, 8, 0, 0, Math.PI*2); c.fill();
        }
      }
      break;
    case 'mohawk':
      c.beginPath(); c.arc(cx, headY - headR*0.2, headR*1.05, Math.PI, 0); c.fill();
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i*headR*0.18 - 5, headY - headR*0.5);
        c.lineTo(cx + i*headR*0.15, headY - headR*1.8);
        c.lineTo(cx + i*headR*0.18 + 5, headY - headR*0.5);
        c.fill();
      }
      break;
    case 'curly':
      c.beginPath(); c.arc(cx, headY - headR*0.2, headR*1.15, Math.PI, 0); c.fill();
      for (let a = Math.PI; a >= 0; a -= 0.3) {
        const rx = cx + Math.cos(a)*headR*1.2;
        const ry = headY - headR*0.2 + Math.sin(a)*headR*0.4;
        c.beginPath(); c.arc(rx, ry, headR*0.35, 0, Math.PI*2); c.fill();
      }
      for (let s = -1; s <= 1; s += 2) {
        for (let j = 0; j < 3; j++) {
          c.beginPath();
          c.arc(cx + s*headR*(0.9+j*0.1), headY + headR*(0.3+j*0.45), headR*0.35, 0, Math.PI*2);
          c.fill();
        }
      }
      break;
    case 'bun':
      c.beginPath(); c.arc(cx, headY - headR*0.2, headR*1.08, Math.PI, 0); c.fill();
      c.fillRect(cx - headR*1.08, headY - headR*0.2, headR*2.16, headR*0.5);
      c.beginPath(); c.arc(cx, headY - headR*1.1, headR*0.55, 0, Math.PI*2); c.fill();
      break;
  }
}

const HAIR_STYLES = ['ponytail','bob','spiky','long_flowing','braids','mohawk','curly','bun'];
const HAIR_NAMES = ['Ponytail','Bob','Spiky','Long Flowing','Braids','Mohawk','Curly','Bun'];
HAIR_STYLES.forEach((s, i) => {
  defItem('hair_'+s, HAIR_NAMES[i], 'hair',
    [s, 'hair', s==='mohawk'?'punk':s==='braids'?'elegant':'casual'],
    HAIR_COLORS,
    (c, char, x, y, w, h, colIdx) => {
      const col = HAIR_COLORS[colIdx % HAIR_COLORS.length][0];
      hairDraw(s, c, char, x, y, w, h, col);
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
  const cx = x + w/2;
  const headR = w * 0.18;
  const headY = y + h*0.15;
  const bodyTop = headY + headR + 4;
  const bodyBot = y + h*0.72;
  const bodyW = w * 0.28;
  c.fillStyle = color;

  switch(style) {
    case 'tshirt':
      c.beginPath();
      c.moveTo(cx - bodyW - 5, bodyTop + 5);
      c.lineTo(cx - bodyW - 20, bodyTop + 18);
      c.lineTo(cx - bodyW - 15, bodyTop + 30);
      c.lineTo(cx - bodyW, bodyTop + 22);
      c.lineTo(cx - bodyW, bodyBot - 10);
      c.lineTo(cx + bodyW, bodyBot - 10);
      c.lineTo(cx + bodyW, bodyTop + 22);
      c.lineTo(cx + bodyW + 15, bodyTop + 30);
      c.lineTo(cx + bodyW + 20, bodyTop + 18);
      c.lineTo(cx + bodyW + 5, bodyTop + 5);
      c.closePath(); c.fill();
      // Neckline
      c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1;
      c.beginPath(); c.arc(cx, bodyTop + 2, 10, 0.2, Math.PI - 0.2); c.stroke();
      break;
    case 'hoodie':
      c.beginPath();
      c.moveTo(cx - bodyW - 8, bodyTop + 2);
      c.lineTo(cx - bodyW - 22, bodyBot - 10);
      c.lineTo(cx - bodyW, bodyBot + 5);
      c.lineTo(cx + bodyW, bodyBot + 5);
      c.lineTo(cx + bodyW + 22, bodyBot - 10);
      c.lineTo(cx + bodyW + 8, bodyTop + 2);
      c.closePath(); c.fill();
      // Hood
      c.beginPath(); c.arc(cx, bodyTop - 2, 18, Math.PI, 0); c.fill();
      // Pocket
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
      c.strokeRect(cx - 15, bodyBot - 25, 30, 15);
      break;
    case 'tank_top':
      c.beginPath();
      c.moveTo(cx - bodyW + 5, bodyTop + 8);
      c.lineTo(cx - bodyW + 3, bodyBot - 10);
      c.lineTo(cx + bodyW - 3, bodyBot - 10);
      c.lineTo(cx + bodyW - 5, bodyTop + 8);
      c.closePath(); c.fill();
      break;
    case 'dress_shirt':
      c.beginPath();
      c.moveTo(cx - bodyW - 5, bodyTop + 5);
      c.lineTo(cx - bodyW - 22, bodyBot - 15);
      c.lineTo(cx - bodyW, bodyBot);
      c.lineTo(cx + bodyW, bodyBot);
      c.lineTo(cx + bodyW + 22, bodyBot - 15);
      c.lineTo(cx + bodyW + 5, bodyTop + 5);
      c.closePath(); c.fill();
      // Collar
      c.fillStyle = '#fff';
      c.beginPath(); c.moveTo(cx - 8, bodyTop + 2); c.lineTo(cx - 15, bodyTop + 16); c.lineTo(cx, bodyTop + 10); c.fill();
      c.beginPath(); c.moveTo(cx + 8, bodyTop + 2); c.lineTo(cx + 15, bodyTop + 16); c.lineTo(cx, bodyTop + 10); c.fill();
      // Buttons
      c.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 0; i < 4; i++) {
        c.beginPath(); c.arc(cx, bodyTop + 14 + i*14, 2, 0, Math.PI*2); c.fill();
      }
      break;
    case 'crop_top':
      c.beginPath();
      c.moveTo(cx - bodyW + 2, bodyTop + 8);
      c.lineTo(cx - bodyW, (bodyTop + bodyBot)/2 - 10);
      c.lineTo(cx + bodyW, (bodyTop + bodyBot)/2 - 10);
      c.lineTo(cx + bodyW - 2, bodyTop + 8);
      c.closePath(); c.fill();
      break;
    case 'jacket':
      c.beginPath();
      c.moveTo(cx - bodyW - 8, bodyTop + 3);
      c.lineTo(cx - bodyW - 22, bodyBot - 5);
      c.lineTo(cx - bodyW, bodyBot + 3);
      c.lineTo(cx + bodyW, bodyBot + 3);
      c.lineTo(cx + bodyW + 22, bodyBot - 5);
      c.lineTo(cx + bodyW + 8, bodyTop + 3);
      c.closePath(); c.fill();
      // Zipper
      c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx, bodyTop + 5); c.lineTo(cx, bodyBot); c.stroke();
      // Collar flaps
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.beginPath(); c.moveTo(cx-2, bodyTop+3); c.lineTo(cx-14, bodyTop+18); c.lineTo(cx-2, bodyTop+14); c.fill();
      c.beginPath(); c.moveTo(cx+2, bodyTop+3); c.lineTo(cx+14, bodyTop+18); c.lineTo(cx+2, bodyTop+14); c.fill();
      break;
    case 'armor':
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 5);
      c.lineTo(cx - bodyW - 10, bodyBot);
      c.lineTo(cx + bodyW + 10, bodyBot);
      c.lineTo(cx + bodyW + 3, bodyTop + 5);
      c.closePath(); c.fill();
      // Plates
      c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx - bodyW, (bodyTop+bodyBot)/2); c.lineTo(cx + bodyW, (bodyTop+bodyBot)/2); c.stroke();
      // Shoulder guards
      c.beginPath(); c.ellipse(cx - bodyW - 5, bodyTop + 10, 14, 8, -0.3, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx + bodyW + 5, bodyTop + 10, 14, 8, 0.3, 0, Math.PI*2); c.fill();
      break;
    case 'wizard_robe':
      c.beginPath();
      c.moveTo(cx - bodyW - 10, bodyTop);
      c.lineTo(cx - bodyW - 25, y + h*0.85);
      c.lineTo(cx + bodyW + 25, y + h*0.85);
      c.lineTo(cx + bodyW + 10, bodyTop);
      c.closePath(); c.fill();
      // Stars decoration
      c.fillStyle = 'rgba(255,215,0,0.4)';
      c.font = '10px sans-serif';
      c.fillText('★', cx - 10, bodyBot - 20);
      c.fillText('★', cx + 8, (bodyTop+bodyBot)/2);
      c.fillText('★', cx - 5, bodyBot + 5);
      break;
    case 'kimono':
      c.beginPath();
      c.moveTo(cx - bodyW - 12, bodyTop);
      c.lineTo(cx - bodyW - 15, y + h*0.8);
      c.lineTo(cx + bodyW + 15, y + h*0.8);
      c.lineTo(cx + bodyW + 12, bodyTop);
      c.closePath(); c.fill();
      // Obi belt
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(cx - bodyW - 5, (bodyTop+bodyBot)/2 - 5, bodyW*2+10, 14);
      // V neckline
      c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx - 10, bodyTop); c.lineTo(cx, bodyTop + 20); c.lineTo(cx + 10, bodyTop); c.stroke();
      break;
    case 'vest':
      c.beginPath();
      c.moveTo(cx - bodyW + 5, bodyTop + 5);
      c.lineTo(cx - bodyW + 3, bodyBot - 5);
      c.lineTo(cx + bodyW - 3, bodyBot - 5);
      c.lineTo(cx + bodyW - 5, bodyTop + 5);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx, bodyTop+5); c.lineTo(cx, bodyBot-5); c.stroke();
      break;
    case 'sweater':
      c.beginPath();
      c.moveTo(cx - bodyW - 6, bodyTop + 3);
      c.lineTo(cx - bodyW - 20, bodyBot - 5);
      c.lineTo(cx - bodyW, bodyBot + 3);
      c.lineTo(cx + bodyW, bodyBot + 3);
      c.lineTo(cx + bodyW + 20, bodyBot - 5);
      c.lineTo(cx + bodyW + 6, bodyTop + 3);
      c.closePath(); c.fill();
      // Ribbing lines
      c.strokeStyle = 'rgba(0,0,0,0.08)'; c.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        const ly = bodyTop + 10 + i*10;
        c.beginPath(); c.moveTo(cx - bodyW + 5, ly); c.lineTo(cx + bodyW - 5, ly); c.stroke();
      }
      // Turtleneck
      c.fillRect(cx - 10, bodyTop - 2, 20, 8);
      break;
    case 'corset':
      c.beginPath();
      c.moveTo(cx - bodyW + 2, bodyTop + 12);
      c.lineTo(cx - bodyW - 2, bodyBot - 8);
      c.lineTo(cx + bodyW + 2, bodyBot - 8);
      c.lineTo(cx + bodyW - 2, bodyTop + 12);
      c.closePath(); c.fill();
      // Lacing
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const ly = bodyTop + 16 + i*9;
        c.beginPath(); c.moveTo(cx-3, ly); c.lineTo(cx-10, ly+4); c.stroke();
        c.beginPath(); c.moveTo(cx+3, ly); c.lineTo(cx+10, ly+4); c.stroke();
      }
      break;
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
  { id:'flowing_skirt',name:'Flowing Skirt',  tags:['elegant','fancy'],      colors:[['#d4a5e5'],['#a5d4e5'],['#e5d4a5'],['#e5a5a5']] },
  { id:'armor_greaves',name:'Armor Greaves',  tags:['medieval','warrior'],   colors:[['#95a5a6'],['#f4d03f'],['#7f8c8d'],['#b87333']] },
  { id:'sweatpants',   name:'Sweatpants',    tags:['casual','cozy','warm'], colors:[['#7f8c8d'],['#2c3e50'],['#c0392b'],['#2e86c1']] },
  { id:'pleated_skirt',name:'Pleated Skirt',  tags:['formal','elegant'],     colors:[['#2c3e50'],['#922b21'],['#1e8449'],['#6c3483']] },
  { id:'bell_bottoms', name:'Bell-bottoms',   tags:['retro','cool'],         colors:[['#8e44ad'],['#e67e22'],['#27ae60'],['#2c3e50']] },
];

function drawBottom(style, c, char, x, y, w, h, color) {
  const cx = x + w/2;
  const bodyBot = y + h*0.72;
  const legBot = y + h*0.88;
  const bodyW = w*0.28;
  c.fillStyle = color;

  switch(style) {
    case 'jeans':
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 5);
      c.lineTo(cx - 20, legBot);
      c.lineTo(cx - 4, legBot);
      c.lineTo(cx, bodyBot + 10);
      c.lineTo(cx + 4, legBot);
      c.lineTo(cx + 20, legBot);
      c.lineTo(cx + bodyW + 2, bodyBot - 5);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 10); c.stroke();
      break;
    case 'skirt':
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 5);
      c.quadraticCurveTo(cx - bodyW - 15, bodyBot + 25, cx - bodyW + 5, bodyBot + 35);
      c.lineTo(cx + bodyW - 5, bodyBot + 35);
      c.quadraticCurveTo(cx + bodyW + 15, bodyBot + 25, cx + bodyW + 2, bodyBot - 5);
      c.closePath(); c.fill();
      break;
    case 'shorts':
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 5);
      c.lineTo(cx - bodyW, bodyBot + 15);
      c.lineTo(cx - 3, bodyBot + 15);
      c.lineTo(cx, bodyBot + 5);
      c.lineTo(cx + 3, bodyBot + 15);
      c.lineTo(cx + bodyW, bodyBot + 15);
      c.lineTo(cx + bodyW + 2, bodyBot - 5);
      c.closePath(); c.fill();
      break;
    case 'leggings':
      c.beginPath();
      c.moveTo(cx - bodyW, bodyBot - 5);
      c.lineTo(cx - 16, legBot + 2);
      c.lineTo(cx - 8, legBot + 2);
      c.lineTo(cx, bodyBot + 10);
      c.lineTo(cx + 8, legBot + 2);
      c.lineTo(cx + 16, legBot + 2);
      c.lineTo(cx + bodyW, bodyBot - 5);
      c.closePath(); c.fill();
      break;
    case 'cargo_pants':
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyBot - 5);
      c.lineTo(cx - 22, legBot);
      c.lineTo(cx - 4, legBot);
      c.lineTo(cx, bodyBot + 10);
      c.lineTo(cx + 4, legBot);
      c.lineTo(cx + 22, legBot);
      c.lineTo(cx + bodyW + 3, bodyBot - 5);
      c.closePath(); c.fill();
      // Pockets
      c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1;
      c.strokeRect(cx - 22, bodyBot + 10, 14, 12);
      c.strokeRect(cx + 8, bodyBot + 10, 14, 12);
      break;
    case 'flowing_skirt':
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 5);
      c.quadraticCurveTo(cx - bodyW - 25, bodyBot + 40, cx - bodyW + 10, y + h*0.85);
      c.lineTo(cx + bodyW - 10, y + h*0.85);
      c.quadraticCurveTo(cx + bodyW + 25, bodyBot + 40, cx + bodyW + 2, bodyBot - 5);
      c.closePath(); c.fill();
      // Flow lines
      c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.8;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(cx + i*10, bodyBot);
        c.quadraticCurveTo(cx + i*12 + 3, bodyBot + 25, cx + i*11, y + h*0.84);
        c.stroke();
      }
      break;
    case 'armor_greaves':
      c.beginPath();
      c.moveTo(cx - bodyW - 4, bodyBot - 5);
      c.lineTo(cx - 22, legBot + 2);
      c.lineTo(cx - 6, legBot + 2);
      c.lineTo(cx, bodyBot + 10);
      c.lineTo(cx + 6, legBot + 2);
      c.lineTo(cx + 22, legBot + 2);
      c.lineTo(cx + bodyW + 4, bodyBot - 5);
      c.closePath(); c.fill();
      // Knee plates
      c.beginPath(); c.ellipse(cx - 14, bodyBot + 15, 8, 6, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx + 14, bodyBot + 15, 8, 6, 0, 0, Math.PI*2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(cx - 14, bodyBot + 15, 8, 6, 0, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.ellipse(cx + 14, bodyBot + 15, 8, 6, 0, 0, Math.PI*2); c.stroke();
      break;
    case 'sweatpants':
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 5);
      c.lineTo(cx - 19, legBot);
      c.lineTo(cx - 5, legBot);
      c.lineTo(cx, bodyBot + 10);
      c.lineTo(cx + 5, legBot);
      c.lineTo(cx + 19, legBot);
      c.lineTo(cx + bodyW + 1, bodyBot - 5);
      c.closePath(); c.fill();
      // Elastic cuffs
      c.fillStyle = 'rgba(0,0,0,0.1)';
      c.fillRect(cx - 19, legBot - 4, 14, 4);
      c.fillRect(cx + 5, legBot - 4, 14, 4);
      break;
    case 'pleated_skirt':
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 5);
      c.lineTo(cx - bodyW - 8, bodyBot + 30);
      c.lineTo(cx + bodyW + 8, bodyBot + 30);
      c.lineTo(cx + bodyW + 2, bodyBot - 5);
      c.closePath(); c.fill();
      // Pleats
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 0.8;
      for (let i = -3; i <= 3; i++) {
        c.beginPath(); c.moveTo(cx + i*8, bodyBot); c.lineTo(cx + i*9, bodyBot + 28); c.stroke();
      }
      break;
    case 'bell_bottoms':
      c.beginPath();
      c.moveTo(cx - bodyW - 1, bodyBot - 5);
      c.lineTo(cx - 14, bodyBot + 30);
      c.quadraticCurveTo(cx - 18, legBot + 5, cx - 28, legBot + 4);
      c.lineTo(cx - 3, legBot + 4);
      c.lineTo(cx, bodyBot + 10);
      c.lineTo(cx + 3, legBot + 4);
      c.lineTo(cx + 28, legBot + 4);
      c.quadraticCurveTo(cx + 18, legBot + 5, cx + 14, bodyBot + 30);
      c.lineTo(cx + bodyW + 1, bodyBot - 5);
      c.closePath(); c.fill();
      break;
  }
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
  { id:'armored_boots',name:'Armored Boots',   tags:['medieval','warrior'],  colors:[['#95a5a6'],['#f4d03f'],['#7f8c8d'],['#b87333']] },
  { id:'slippers',     name:'Slippers',       tags:['cozy','casual'],       colors:[['#dda0dd'],['#87ceeb'],['#f5cba7'],['#f8b4c8']] },
  { id:'platforms',    name:'Platform Shoes',  tags:['retro','cool','punk'], colors:[['#2c3e50'],['#e74c3c'],['#8e44ad'],['#fff']] },
  { id:'barefoot',     name:'Barefoot Wraps',  tags:['natural','simple'],    colors:[['#deb887'],['#fff'],['#c0392b'],['#27ae60']] },
];

function drawShoes(style, c, char, x, y, w, h, color) {
  const cx = x + w/2;
  const footY = y + h*0.9;
  c.fillStyle = color;

  switch(style) {
    case 'sneakers':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.beginPath(); c.ellipse(fx, footY, 13, 6, 0, 0, Math.PI*2); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.15)';
        c.beginPath(); c.ellipse(fx, footY + 2, 13, 3, 0, 0, Math.PI); c.fill();
        c.fillStyle = color;
      }
      break;
    case 'boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.fillRect(fx - 10, footY - 18, 20, 24);
        c.beginPath(); c.ellipse(fx, footY + 6, 12, 5, 0, 0, Math.PI*2); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(fx - 8, footY - 12); c.lineTo(fx + 8, footY - 12); c.stroke();
        c.beginPath(); c.moveTo(fx - 8, footY - 6); c.lineTo(fx + 8, footY - 6); c.stroke();
      }
      break;
    case 'heels':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.beginPath(); c.ellipse(fx + s*3, footY, 11, 5, 0, 0, Math.PI*2); c.fill();
        // Heel
        c.fillRect(fx - s*5 - 2, footY - 2, 4, 10);
      }
      break;
    case 'sandals':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.beginPath(); c.ellipse(fx, footY + 2, 12, 4, 0, 0, Math.PI*2); c.fill();
        c.strokeStyle = color; c.lineWidth = 2;
        c.beginPath(); c.moveTo(fx - 5, footY - 3); c.lineTo(fx, footY - 6); c.lineTo(fx + 5, footY - 3); c.stroke();
      }
      break;
    case 'armored_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.beginPath();
        c.moveTo(fx - 12, footY - 20);
        c.lineTo(fx - 14, footY + 5);
        c.lineTo(fx + 14, footY + 5);
        c.lineTo(fx + 12, footY - 20);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(fx - 12, footY - 10); c.lineTo(fx + 12, footY - 10); c.stroke();
        c.beginPath(); c.moveTo(fx - 12, footY); c.lineTo(fx + 12, footY); c.stroke();
      }
      break;
    case 'slippers':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.beginPath(); c.ellipse(fx, footY + 1, 13, 7, 0, 0, Math.PI*2); c.fill();
        // Fluffy top
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath(); c.ellipse(fx, footY - 3, 10, 4, 0, Math.PI, 0); c.fill();
        c.fillStyle = color;
      }
      break;
    case 'platforms':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.fillRect(fx - 12, footY - 2, 24, 12);
        c.beginPath(); c.ellipse(fx, footY - 2, 12, 5, 0, 0, Math.PI*2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.fillRect(fx - 12, footY + 4, 24, 3);
        c.fillStyle = color;
      }
      break;
    case 'barefoot':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.strokeStyle = color; c.lineWidth = 2;
        c.beginPath(); c.ellipse(fx, footY, 10, 5, 0, 0, Math.PI*2); c.stroke();
        c.beginPath(); c.moveTo(fx, footY - 5); c.lineTo(fx, footY - 12); c.stroke();
        c.beginPath(); c.moveTo(fx - 5, footY - 8); c.lineTo(fx + 5, footY - 8); c.stroke();
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
  const cx = x + w/2;
  const headY = y + h*0.15;
  const headR = w * 0.18;
  const bodyTop = headY + headR + 4;
  const bodyBot = y + h*0.72;
  const bodyW = w * 0.28;
  c.fillStyle = color;

  switch(style) {
    case 'glasses':
      c.strokeStyle = color; c.lineWidth = 1.8;
      const eyeY = headY - headR*0.1;
      const sp = headR*0.38;
      c.beginPath(); c.ellipse(cx-sp, eyeY, 7, 6.5, 0, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.ellipse(cx+sp, eyeY, 7, 6.5, 0, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.moveTo(cx-sp+7, eyeY); c.lineTo(cx+sp-7, eyeY); c.stroke();
      c.beginPath(); c.moveTo(cx-sp-7, eyeY); c.lineTo(cx-headR-3, eyeY-3); c.stroke();
      c.beginPath(); c.moveTo(cx+sp+7, eyeY); c.lineTo(cx+headR+3, eyeY-3); c.stroke();
      break;
    case 'crown':
      c.beginPath();
      c.moveTo(cx - headR*0.7, headY - headR*0.7);
      c.lineTo(cx - headR*0.7, headY - headR*1.2);
      c.lineTo(cx - headR*0.35, headY - headR*0.9);
      c.lineTo(cx, headY - headR*1.3);
      c.lineTo(cx + headR*0.35, headY - headR*0.9);
      c.lineTo(cx + headR*0.7, headY - headR*1.2);
      c.lineTo(cx + headR*0.7, headY - headR*0.7);
      c.closePath(); c.fill();
      // Jewels
      c.fillStyle = '#e74c3c';
      c.beginPath(); c.arc(cx, headY - headR*1.15, 2.5, 0, Math.PI*2); c.fill();
      c.fillStyle = '#3498db';
      c.beginPath(); c.arc(cx - headR*0.38, headY - headR*0.85, 2, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(cx + headR*0.38, headY - headR*0.85, 2, 0, Math.PI*2); c.fill();
      break;
    case 'necklace':
      c.strokeStyle = color; c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, bodyTop + 5, 14, 0.3, Math.PI - 0.3);
      c.stroke();
      // Pendant
      c.fillStyle = color;
      c.beginPath(); c.arc(cx, bodyTop + 18, 4, 0, Math.PI*2); c.fill();
      break;
    case 'scarf':
      c.beginPath();
      c.moveTo(cx - headR, headY + headR - 2);
      c.quadraticCurveTo(cx, headY + headR + 8, cx + headR, headY + headR - 2);
      c.lineTo(cx + headR + 5, headY + headR + 5);
      c.quadraticCurveTo(cx, headY + headR + 15, cx - headR - 5, headY + headR + 5);
      c.closePath(); c.fill();
      // Trailing end
      c.beginPath();
      c.moveTo(cx + headR, headY + headR);
      c.quadraticCurveTo(cx + headR + 10, bodyTop + 25, cx + headR + 5, bodyTop + 40);
      c.lineTo(cx + headR - 3, bodyTop + 38);
      c.quadraticCurveTo(cx + headR + 5, bodyTop + 20, cx + headR - 5, headY + headR + 5);
      c.fill();
      break;
    case 'extra_wings':
      c.globalAlpha = 0.5;
      // Left wing
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 10);
      c.quadraticCurveTo(cx - bodyW - 50, bodyTop - 30, cx - bodyW - 15, bodyTop + 50);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx - bodyW, bodyTop + 15);
      c.quadraticCurveTo(cx - bodyW - 40, bodyTop + 50, cx - bodyW - 10, bodyTop + 60);
      c.closePath(); c.fill();
      // Right wing
      c.beginPath();
      c.moveTo(cx + bodyW, bodyTop + 10);
      c.quadraticCurveTo(cx + bodyW + 50, bodyTop - 30, cx + bodyW + 15, bodyTop + 50);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(cx + bodyW, bodyTop + 15);
      c.quadraticCurveTo(cx + bodyW + 40, bodyTop + 50, cx + bodyW + 10, bodyTop + 60);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      break;
    case 'cape':
      c.globalAlpha = 0.7;
      c.beginPath();
      c.moveTo(cx - bodyW + 5, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 20, bodyBot, cx - bodyW - 10, y + h*0.88);
      c.lineTo(cx + bodyW + 10, y + h*0.88);
      c.quadraticCurveTo(cx + bodyW + 20, bodyBot, cx + bodyW - 5, bodyTop + 2);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      // Clasp
      c.fillStyle = '#f4d03f';
      c.beginPath(); c.arc(cx, bodyTop + 4, 4, 0, Math.PI*2); c.fill();
      break;
    case 'hat':
      c.beginPath(); c.ellipse(cx, headY - headR*0.6, headR*1.3, headR*0.2, 0, 0, Math.PI*2); c.fill();
      c.beginPath();
      c.moveTo(cx - headR*0.8, headY - headR*0.6);
      c.quadraticCurveTo(cx, headY - headR*1.8, cx + headR*0.8, headY - headR*0.6);
      c.fill();
      // Band
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(cx - headR*0.8, headY - headR*0.75, headR*1.6, 4);
      break;
    case 'flower_crown':
      const crownY = headY - headR*0.85;
      for (let i = -3; i <= 3; i++) {
        const fx = cx + i*headR*0.32;
        const fy = crownY + Math.abs(i)*2;
        c.fillStyle = i % 2 === 0 ? color : '#fff';
        c.beginPath(); c.arc(fx, fy, 5, 0, Math.PI*2); c.fill();
        c.fillStyle = '#f1c40f';
        c.beginPath(); c.arc(fx, fy, 2, 0, Math.PI*2); c.fill();
      }
      // Vine
      c.strokeStyle = '#27ae60'; c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(cx - headR*0.95, crownY + 3);
      c.quadraticCurveTo(cx, crownY - 3, cx + headR*0.95, crownY + 3);
      c.stroke();
      break;
    case 'belt':
      c.fillRect(cx - bodyW - 3, (bodyBot - 8), bodyW*2 + 6, 6);
      // Buckle
      c.strokeStyle = '#f4d03f'; c.lineWidth = 1.5;
      c.strokeRect(cx - 5, bodyBot - 10, 10, 8);
      break;
    case 'wristbands':
      for (let s = -1; s <= 1; s += 2) {
        const wx = s === -1 ? cx - bodyW - 16 : cx + bodyW + 16;
        const wy = bodyBot - 14;
        c.fillRect(wx - 6, wy, 12, 7);
      }
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
      c.fillStyle = '#87ceeb';
      c.fillRect(0, 0, w, h*0.6);
      c.fillStyle = color;
      c.fillRect(0, h*0.6, w, h*0.4);
      // Trees
      c.fillStyle = '#5d4037';
      c.fillRect(60, h*0.35, 12, h*0.25);
      c.fillRect(300, h*0.3, 12, h*0.3);
      c.fillStyle = '#27ae60';
      c.beginPath(); c.arc(66, h*0.35, 30, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(306, h*0.3, 35, 0, Math.PI*2); c.fill();
      // Sun
      c.fillStyle = '#f1c40f';
      c.beginPath(); c.arc(350, 50, 25, 0, Math.PI*2); c.fill();
      break;
    case 'castle':
      c.fillStyle = '#5b6a7a';
      c.fillRect(0, 0, w, h);
      // Castle wall
      c.fillStyle = color;
      c.fillRect(50, h*0.3, w-100, h*0.7);
      // Towers
      c.fillRect(30, h*0.15, 50, h*0.85);
      c.fillRect(w-80, h*0.15, 50, h*0.85);
      // Battlements
      for (let i = 0; i < 5; i++) {
        c.fillRect(30 + i*12, h*0.12, 8, 12);
        c.fillRect(w-80 + i*12, h*0.12, 8, 12);
      }
      // Gate
      c.fillStyle = '#4a3728';
      c.beginPath(); c.arc(w/2, h*0.7, 30, Math.PI, 0); c.fill();
      c.fillRect(w/2-30, h*0.7, 60, h*0.3);
      break;
    case 'beach':
      c.fillStyle = '#87ceeb';
      c.fillRect(0, 0, w, h*0.45);
      c.fillStyle = '#2e86c1';
      c.fillRect(0, h*0.45, w, h*0.15);
      c.fillStyle = color;
      c.fillRect(0, h*0.6, w, h*0.4);
      // Waves
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(0, h*0.48 + i*8);
        for (let x = 0; x < w; x += 40) {
          c.quadraticCurveTo(x+10, h*0.45+i*8, x+20, h*0.48+i*8);
          c.quadraticCurveTo(x+30, h*0.51+i*8, x+40, h*0.48+i*8);
        }
        c.stroke();
      }
      // Sun
      c.fillStyle = '#f1c40f';
      c.beginPath(); c.arc(80, 60, 30, 0, Math.PI*2); c.fill();
      break;
    case 'space':
      c.fillStyle = color;
      c.fillRect(0, 0, w, h);
      // Stars
      for (let i = 0; i < 60; i++) {
        const sx = Math.sin(i*127.1)*0.5*w + w/2;
        const sy = Math.cos(i*311.7)*0.5*h + h/2;
        const sr = 0.5 + (i%3)*0.5;
        c.fillStyle = `rgba(255,255,255,${0.4+Math.sin(i)*0.3})`;
        c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI*2); c.fill();
      }
      // Planet
      c.fillStyle = '#e74c3c';
      c.beginPath(); c.arc(320, 120, 35, 0, Math.PI*2); c.fill();
      c.strokeStyle = 'rgba(255,200,100,0.3)'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(320, 120, 55, 12, -0.3, 0, Math.PI*2); c.stroke();
      break;
    case 'forest':
      c.fillStyle = color;
      c.fillRect(0, 0, w, h);
      // Trees
      for (let i = 0; i < 8; i++) {
        const tx = i*55 + 20;
        const th = 120 + (i%3)*40;
        c.fillStyle = '#3e2723';
        c.fillRect(tx, h - th, 10, th);
        c.fillStyle = `rgba(30,${100+i*15},50,0.8)`;
        c.beginPath(); c.arc(tx+5, h-th, 30+i*3, 0, Math.PI*2); c.fill();
      }
      // Ground
      c.fillStyle = '#1a4d2e';
      c.fillRect(0, h*0.85, w, h*0.15);
      break;
    case 'city':
      c.fillStyle = '#1a252f';
      c.fillRect(0, 0, w, h);
      // Buildings
      const buildings = [[30,0.4,50],[90,0.55,40],[140,0.35,45],[200,0.6,55],[260,0.45,40],[310,0.5,50],[360,0.38,35]];
      buildings.forEach(([bx, bh, bw]) => {
        c.fillStyle = color;
        c.fillRect(bx, h*(1-bh), bw, h*bh);
        // Windows
        c.fillStyle = 'rgba(255,223,100,0.5)';
        for (let wy = h*(1-bh)+10; wy < h-15; wy += 18) {
          for (let wx = bx+5; wx < bx+bw-8; wx += 12) {
            if (Math.sin(wx*wy)>-0.3) c.fillRect(wx, wy, 6, 8);
          }
        }
      });
      // Ground
      c.fillStyle = '#2c3e50';
      c.fillRect(0, h*0.92, w, h*0.08);
      break;
    case 'clouds':
      const grad = c.createLinearGradient(0,0,0,h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#fff');
      c.fillStyle = grad;
      c.fillRect(0, 0, w, h);
      // Clouds
      c.fillStyle = 'rgba(255,255,255,0.6)';
      [[80,100],[200,200],[320,150],[50,350],[280,400],[160,480]].forEach(([cx2,cy]) => {
        c.beginPath(); c.arc(cx2, cy, 40, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx2+30, cy+5, 30, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx2-25, cy+8, 28, 0, Math.PI*2); c.fill();
      });
      break;
    case 'rainbow':
      c.fillStyle = '#87ceeb';
      c.fillRect(0, 0, w, h);
      const colors = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#8e44ad'];
      colors.forEach((rc, i) => {
        c.strokeStyle = rc; c.lineWidth = 10;
        c.beginPath(); c.arc(w/2, h*0.8, 200 - i*12, Math.PI, 0); c.stroke();
      });
      // Ground
      c.fillStyle = '#27ae60';
      c.fillRect(0, h*0.75, w, h*0.25);
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
    ctx.fillStyle = '#1e1e30';
    ctx.fillRect(0, 0, W, H);
    // Default subtle gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2c2c3e'); g.addColorStop(1, '#1e1e30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
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
    // Draw mini portrait
    mc.fillStyle = char.skin;
    if (char.id === 'wolf_furry') mc.fillStyle = '#7f8c8d';
    mc.beginPath(); mc.arc(24, 22, 14, 0, Math.PI*2); mc.fill();
    // Eyes
    mc.fillStyle = char.eyeColor;
    mc.beginPath(); mc.arc(19, 20, 2, 0, Math.PI*2); mc.fill();
    mc.beginPath(); mc.arc(29, 20, 2, 0, Math.PI*2); mc.fill();
    // Identifier
    mc.fillStyle = 'rgba(255,255,255,0.7)';
    mc.font = '16px sans-serif';
    mc.textAlign = 'center';
    mc.fillText(char.emoji, 24, 46);

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
    const card = document.createElement('div');
    card.className = 'item-card' + (isEquipped ? ' equipped' : '');

    // Mini preview
    const mini = document.createElement('canvas');
    mini.width = 56; mini.height = 56;
    const mc = mini.getContext('2d');
    const colorIdx = isEquipped ? equipped[item.category].colorIdx : 0;
    drawItemPreview(mc, item, colorIdx);
    card.appendChild(mini);

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'item-name';
    nameEl.textContent = t('duItem_'+item.id, item.name);
    card.appendChild(nameEl);

    // Color swatches if equipped
    if (isEquipped && item.colors.length > 1) {
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

// Re-render on lang change
window.addEventListener('langchange', () => {
  buildCategoryTabs();
  renderItemGrid();
  renderAchievements();
  if (typeof I18N !== 'undefined') I18N.applyDOM();
});

})();
