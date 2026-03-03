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
  { id:'wolf_furry', name:'Wolf',  emoji:'🐺', skin:'#8e9eaf', hair:'#4a4a4a', eyeColor:'#f39c12' },
  { id:'cat',        name:'Cat',   emoji:'🐱', skin:'#fce4c8', hair:'#e8a87c', eyeColor:'#2ecc71' },
  { id:'elf',        name:'Elf',   emoji:'🧝', skin:'#fde3d0', hair:'#f7dc6f', eyeColor:'#8e44ad' },
  { id:'fairy',      name:'Fairy', emoji:'🧚', skin:'#fadbd8', hair:'#f1948a', eyeColor:'#e84393' },
];

/* ── Shared chibi body metrics — every draw function uses this ── */
function M(x, y, w, h) {
  const cx = x + w / 2;
  const headR = w * 0.26;
  const headY = y + h * 0.2;
  const bodyTop = headY + headR + 2;
  const bodyBot = y + h * 0.56;
  const bodyW = w * 0.15;
  const legBot = y + h * 0.76;
  const footY = y + h * 0.8;
  return { cx, headR, headY, bodyTop, bodyBot, bodyW, legBot, footY };
}

function drawCharacter(c, x, y, w, h, char) {
  const { cx, headR, headY, bodyTop, bodyBot, bodyW, legBot, footY } = M(x, y, w, h);
  const sk = char.skin;
  const headR_old_unused = headR; // chibi proportions via M()
  const headY = y + h * 0.15;
  const bodyTop = headY + headR + 4;
  const bodyBot = y + h * 0.72;
  const bodyW = w * 0.28;
  const sk = char.skin;
  const hc = char.hair;
  const legBot = y + h * 0.88;
  const footY = y + h * 0.9;

  // Ground shadow
  c.save();
  const gshG = c.createRadialGradient(cx, footY + 6, 0, cx, footY + 6, bodyW + 15);
  gshG.addColorStop(0, 'rgba(0,0,0,0.25)');
  gshG.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gshG;
  c.beginPath(); c.ellipse(cx, footY + 6, bodyW + 15, 7, 0, 0, Math.PI*2); c.fill();
  c.restore();

  // Body with gradient shading
  const bodyCx = cx;
  const bodyCy = (bodyTop + bodyBot) / 2;
  const bodyRx = bodyW;
  const bodyRy = (bodyBot - bodyTop) / 2;
  if (char.id === 'wolf_furry') {
    const bGrad = c.createRadialGradient(bodyCx - bodyRx*0.3, bodyCy - bodyRy*0.3, 0, bodyCx, bodyCy, bodyRx*1.2);
    bGrad.addColorStop(0, '#95a5a6');
    bGrad.addColorStop(1, '#6d7b7d');
    c.fillStyle = bGrad;
    c.beginPath(); c.ellipse(bodyCx, bodyCy, bodyRx, bodyRy, 0, 0, Math.PI*2); c.fill();
    // Lighter chest patch
    const cpGrad = c.createRadialGradient(bodyCx, bodyCy + 5, 0, bodyCx, bodyCy + 5, bodyRx*0.55);
    cpGrad.addColorStop(0, '#d5d8dc');
    cpGrad.addColorStop(1, '#bdc3c7');
    c.fillStyle = cpGrad;
    c.beginPath(); c.ellipse(bodyCx, bodyCy + 5, bodyRx*0.5, bodyRy*0.6, 0, 0, Math.PI*2); c.fill();
  } else if (char.id === 'fairy') {
    const bGrad = c.createRadialGradient(bodyCx - bodyRx*0.25, bodyCy - bodyRy*0.25, 0, bodyCx, bodyCy, bodyRx);
    bGrad.addColorStop(0, _lighten(sk, 20));
    bGrad.addColorStop(1, sk);
    c.fillStyle = bGrad;
    c.beginPath(); c.ellipse(bodyCx, bodyCy, bodyRx*0.85, bodyRy*0.9, 0, 0, Math.PI*2); c.fill();
  } else if (char.id === 'elf') {
    const bGrad = c.createRadialGradient(bodyCx - bodyRx*0.25, bodyCy - bodyRy*0.25, 0, bodyCx, bodyCy, bodyRx);
    bGrad.addColorStop(0, _lighten(sk, 15));
    bGrad.addColorStop(1, sk);
    c.fillStyle = bGrad;
    c.beginPath(); c.ellipse(bodyCx, bodyCy - 3, bodyRx*0.88, bodyRy + 3, 0, 0, Math.PI*2); c.fill();
  } else if (char.id === 'human_boy') {
    const bGrad = c.createLinearGradient(bodyCx - bodyRx, bodyCy - bodyRy, bodyCx + bodyRx, bodyCy + bodyRy);
    bGrad.addColorStop(0, _lighten(sk, 15));
    bGrad.addColorStop(1, _darken(sk, 10));
    c.fillStyle = bGrad;
    c.beginPath(); c.ellipse(bodyCx, bodyCy, bodyRx*1.08, bodyRy, 0, 0, Math.PI*2); c.fill();
  } else {
    const bGrad = c.createLinearGradient(bodyCx - bodyRx, bodyCy - bodyRy, bodyCx + bodyRx, bodyCy + bodyRy);
    bGrad.addColorStop(0, _lighten(sk, 15));
    bGrad.addColorStop(1, _darken(sk, 10));
    c.fillStyle = bGrad;
    c.beginPath(); c.ellipse(bodyCx, bodyCy, bodyRx, bodyRy, 0, 0, Math.PI*2); c.fill();
  }

  // Neck
  const neckTop = headY + headR - 2;
  const neckBot = bodyTop + 4;
  const neckW1 = headR * 0.35;
  const neckW2 = headR * 0.45;
  const neckCol = char.id === 'wolf_furry' ? '#7a8a8c' : _darken(sk, 8);
  c.fillStyle = neckCol;
  c.beginPath();
  c.moveTo(cx - neckW1, neckTop); c.lineTo(cx - neckW2, neckBot);
  c.lineTo(cx + neckW2, neckBot); c.lineTo(cx + neckW1, neckTop);
  c.closePath(); c.fill();

  // Arms — curved with hands
  const armColor = char.id === 'wolf_furry' ? '#7f8c8d' : sk;
  const armShadow = char.id === 'wolf_furry' ? '#6d7b7d' : _darken(sk, 12);
  c.lineWidth = w * 0.065;
  c.lineCap = 'round';
  for (let s = -1; s <= 1; s += 2) {
    const shoulderX = cx + s * bodyW;
    const shoulderY = bodyTop + 15;
    const elbowX = cx + s * (bodyW + 12);
    const elbowY = (bodyTop + bodyBot) / 2 + 5;
    const handX = cx + s * (bodyW + 18);
    const handY = bodyBot - 8;
    // Arm shadow
    c.strokeStyle = armShadow;
    c.lineWidth = w * 0.07;
    c.beginPath();
    c.moveTo(shoulderX, shoulderY);
    c.quadraticCurveTo(elbowX, elbowY, handX, handY);
    c.stroke();
    // Arm main
    c.strokeStyle = armColor;
    c.lineWidth = w * 0.06;
    c.beginPath();
    c.moveTo(shoulderX, shoulderY);
    c.quadraticCurveTo(elbowX, elbowY, handX, handY);
    c.stroke();
  }

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
  } else {
    // Round hand tips
    c.fillStyle = sk;
    c.beginPath(); c.arc(cx - bodyW - 18, bodyBot - 8, 4, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + bodyW + 18, bodyBot - 8, 4, 0, Math.PI*2); c.fill();
  }

  // Tapered legs
  const legColor = char.id === 'wolf_furry' ? '#7f8c8d' : sk;
  const legShadow = char.id === 'wolf_furry' ? '#6d7b7d' : _darken(sk, 10);
  for (let s = -1; s <= 1; s += 2) {
    const hipX = cx + s * 14;
    const ankleX = cx + s * 16;
    const hipW = w * 0.042;
    const ankleW = w * 0.03;
    c.fillStyle = legColor;
    c.beginPath();
    c.moveTo(hipX - hipW, bodyBot);
    c.lineTo(ankleX - ankleW, legBot);
    c.lineTo(ankleX + ankleW, legBot);
    c.lineTo(hipX + hipW, bodyBot);
    c.closePath(); c.fill();
    // Inner shadow
    c.fillStyle = legShadow;
    c.globalAlpha = 0.3;
    c.beginPath();
    c.moveTo(hipX + s * hipW * 0.2, bodyBot);
    c.lineTo(ankleX + s * ankleW * 0.2, legBot);
    c.lineTo(ankleX + s * ankleW, legBot);
    c.lineTo(hipX + s * hipW, bodyBot);
    c.closePath(); c.fill();
    c.globalAlpha = 1;
  }

  // Feet / paw feet
  if (char.id === 'wolf_furry' || char.id === 'cat') {
    const pawCol = char.id === 'wolf_furry' ? '#6d7b7d' : '#ddb892';
    const pawGrad = c.createRadialGradient(cx - 16, footY - 2, 0, cx - 16, footY, 10);
    pawGrad.addColorStop(0, _lighten(pawCol, 12));
    pawGrad.addColorStop(1, pawCol);
    c.fillStyle = pawGrad;
    c.beginPath(); c.ellipse(cx - 16, footY, 10, 5, 0, 0, Math.PI*2); c.fill();
    const pawGrad2 = c.createRadialGradient(cx + 16, footY - 2, 0, cx + 16, footY, 10);
    pawGrad2.addColorStop(0, _lighten(pawCol, 12));
    pawGrad2.addColorStop(1, pawCol);
    c.fillStyle = pawGrad2;
    c.beginPath(); c.ellipse(cx + 16, footY, 10, 5, 0, 0, Math.PI*2); c.fill();
  } else {
    c.fillStyle = sk;
    c.beginPath(); c.ellipse(cx - 16, footY, 9, 4, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(cx + 16, footY, 9, 4, 0, 0, Math.PI*2); c.fill();
  }

  // Tail for wolf/cat/fairy
  if (char.id === 'wolf_furry') {
    c.strokeStyle = '#6d7b7d'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + bodyW - 2, bodyBot - 8);
    c.quadraticCurveTo(cx + bodyW + 35, bodyBot - 30, cx + bodyW + 25, bodyBot - 55);
    c.stroke();
    c.strokeStyle = '#8a9a9c'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx + bodyW - 2, bodyBot - 8);
    c.quadraticCurveTo(cx + bodyW + 33, bodyBot - 28, cx + bodyW + 23, bodyBot - 53);
    c.stroke();
    c.strokeStyle = '#bdc3c7'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx + bodyW + 27, bodyBot - 50);
    c.lineTo(cx + bodyW + 23, bodyBot - 58); c.stroke();
  } else if (char.id === 'cat') {
    c.strokeStyle = '#c9956b'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx + bodyW - 2, bodyBot - 5);
    c.quadraticCurveTo(cx + bodyW + 40, bodyBot - 20, cx + bodyW + 30, bodyBot - 50);
    c.stroke();
    c.strokeStyle = '#ddb892'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx + bodyW - 2, bodyBot - 5);
    c.quadraticCurveTo(cx + bodyW + 38, bodyBot - 18, cx + bodyW + 28, bodyBot - 48);
    c.stroke();
  }

  // Wings for fairy — multi-layered with veins
  if (char.id === 'fairy') {
    const now = Date.now() / 1200;
    const wingFlutter = Math.sin(now) * 2;
    for (let layer = 0; layer < 2; layer++) {
      const alpha = layer === 0 ? 0.12 : 0.2;
      const shrink = layer === 0 ? 1.2 : 1;
      c.fillStyle = `rgba(232,67,147,${alpha})`;
      c.strokeStyle = `rgba(232,67,147,${alpha + 0.25})`;
      c.lineWidth = 1.2;
      for (let s = -1; s <= 1; s += 2) {
        // Upper wing
        c.beginPath();
        c.moveTo(cx + s * (bodyW - 2), bodyTop + 12);
        c.quadraticCurveTo(cx + s * (bodyW + 38 * shrink + wingFlutter), bodyTop - 20 * shrink, cx + s * (bodyW + 12), bodyTop + 42);
        c.closePath(); c.fill(); c.stroke();
        // Lower wing
        c.beginPath();
        c.moveTo(cx + s * (bodyW - 2), bodyTop + 25);
        c.quadraticCurveTo(cx + s * (bodyW + 28 * shrink + wingFlutter), bodyTop + 50 * shrink, cx + s * (bodyW + 5), bodyTop + 55);
        c.closePath(); c.fill(); c.stroke();
      }
    }
    // Wing vein lines
    c.strokeStyle = 'rgba(232,67,147,0.2)'; c.lineWidth = 0.7;
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(cx + s * (bodyW), bodyTop + 18);
      c.lineTo(cx + s * (bodyW + 25), bodyTop + 5); c.stroke();
      c.beginPath(); c.moveTo(cx + s * (bodyW), bodyTop + 22);
      c.lineTo(cx + s * (bodyW + 22), bodyTop + 30); c.stroke();
    }
  }

  // Wolf fur tufts
  if (char.id === 'wolf_furry') {
    c.strokeStyle = '#95a5a6'; c.lineWidth = 1.2; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const tx = cx - bodyW + i * 4 - 4;
      const ty = bodyTop + 10 + i * 8;
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx - 5, ty - 6); c.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const tx = cx + bodyW - i * 4 + 4;
      const ty = bodyTop + 10 + i * 8;
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + 5, ty - 6); c.stroke();
    }
  }

  // Head with gradient
  if (char.id === 'wolf_furry') {
    const hGrad = c.createRadialGradient(cx - headR*0.2, headY - headR*0.2, 0, cx, headY, headR*1.1);
    hGrad.addColorStop(0, '#95a5a6');
    hGrad.addColorStop(1, '#6d7b7d');
    c.fillStyle = hGrad;
    // Snout head
    c.beginPath(); c.ellipse(cx, headY, headR, headR * 0.95, 0, 0, Math.PI*2); c.fill();
    // Snout gradient
    const sGrad = c.createRadialGradient(cx, headY + headR*0.45, 0, cx, headY + headR*0.5, headR*0.45);
    sGrad.addColorStop(0, '#aeb6ba');
    sGrad.addColorStop(1, '#95a5a6');
    c.fillStyle = sGrad;
    c.beginPath(); c.ellipse(cx, headY + headR*0.5, headR*0.45, headR*0.35, 0, 0, Math.PI*2); c.fill();
    // Nose
    c.fillStyle = '#2c3e50';
    c.beginPath(); c.ellipse(cx, headY + headR*0.3, 4, 3, 0, 0, Math.PI*2); c.fill();
    // Nose shine
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.arc(cx - 1, headY + headR*0.27, 1.5, 0, Math.PI*2); c.fill();
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
    const hGrad = c.createRadialGradient(cx - headR*0.2, headY - headR*0.2, 0, cx, headY, headR);
    hGrad.addColorStop(0, _lighten(sk, 18));
    hGrad.addColorStop(1, sk);
    c.fillStyle = hGrad;
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
    // Longer curved whiskers
    c.strokeStyle = '#bbb'; c.lineWidth = 0.8; c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(cx + s*7, headY + 4);
      c.quadraticCurveTo(cx + s*20, headY - 2, cx + s*30, headY + 0); c.stroke();
      c.beginPath(); c.moveTo(cx + s*7, headY + 6);
      c.quadraticCurveTo(cx + s*22, headY + 6, cx + s*30, headY + 7); c.stroke();
      c.beginPath(); c.moveTo(cx + s*7, headY + 8);
      c.quadraticCurveTo(cx + s*20, headY + 12, cx + s*28, headY + 14); c.stroke();
    }
  } else if (char.id === 'elf') {
    const hGrad = c.createRadialGradient(cx - headR*0.2, headY - headR*0.25, 0, cx, headY, headR);
    hGrad.addColorStop(0, _lighten(sk, 18));
    hGrad.addColorStop(1, sk);
    c.fillStyle = hGrad;
    c.beginPath(); c.ellipse(cx, headY, headR * 0.9, headR * 1.05, 0, 0, Math.PI*2); c.fill();
    // Pointed ears
    c.fillStyle = sk;
    c.beginPath(); c.moveTo(cx - headR*0.85, headY - 2);
    c.lineTo(cx - headR*1.4, headY - headR*0.6); c.lineTo(cx - headR*0.85, headY + 6); c.fill();
    c.beginPath(); c.moveTo(cx + headR*0.85, headY - 2);
    c.lineTo(cx + headR*1.4, headY - headR*0.6); c.lineTo(cx + headR*0.85, headY + 6); c.fill();
    // Ear tip shimmer
    c.fillStyle = 'rgba(255,255,220,0.4)';
    c.beginPath(); c.arc(cx - headR*1.35, headY - headR*0.55, 3, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + headR*1.35, headY - headR*0.55, 3, 0, Math.PI*2); c.fill();
    c.fillStyle = 'rgba(255,255,220,0.2)';
    c.beginPath(); c.arc(cx - headR*1.35, headY - headR*0.55, 5, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + headR*1.35, headY - headR*0.55, 5, 0, Math.PI*2); c.fill();
  } else {
    const hGrad = c.createRadialGradient(cx - headR*0.2, headY - headR*0.25, 0, cx, headY, headR);
    hGrad.addColorStop(0, _lighten(sk, 18));
    hGrad.addColorStop(1, sk);
    c.fillStyle = hGrad;
    c.beginPath(); c.arc(cx, headY, headR, 0, Math.PI*2); c.fill();
    if (char.id === 'human_boy') {
      // Angular jaw overlay
      c.fillStyle = sk;
      c.beginPath();
      c.moveTo(cx - headR*0.8, headY + headR*0.3);
      c.lineTo(cx, headY + headR*1.15);
      c.lineTo(cx + headR*0.8, headY + headR*0.3);
      c.fill();
      // Subtle jaw shadow
      c.strokeStyle = _darken(sk, 15);
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(cx - headR*0.6, headY + headR*0.5);
      c.quadraticCurveTo(cx, headY + headR*1.1, cx + headR*0.6, headY + headR*0.5);
      c.stroke();
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
      c.beginPath(); c.ellipse(cx - eyeSpacing, eyeY, 2, 5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx + eyeSpacing, eyeY, 2, 5, 0, 0, Math.PI*2); c.fill();
    } else {
      c.beginPath(); c.arc(cx - eyeSpacing, eyeY, 3, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(cx + eyeSpacing, eyeY, 3, 0, Math.PI*2); c.fill();
    }
    // Bigger highlights
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(cx - eyeSpacing + 1.5, eyeY - 1.8, 1.8, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + eyeSpacing + 1.5, eyeY - 1.8, 1.8, 0, Math.PI*2); c.fill();
    // Secondary small highlight
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.arc(cx - eyeSpacing - 1, eyeY + 1.5, 0.8, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + eyeSpacing - 1, eyeY + 1.5, 0.8, 0, Math.PI*2); c.fill();

    // Eyebrows
    c.strokeStyle = _darken(char.hair || sk, 20); c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx - eyeSpacing - 4, eyeY - 8);
    c.quadraticCurveTo(cx - eyeSpacing, eyeY - 10, cx - eyeSpacing + 4, eyeY - 8);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + eyeSpacing - 4, eyeY - 8);
    c.quadraticCurveTo(cx + eyeSpacing, eyeY - 10, cx + eyeSpacing + 4, eyeY - 8);
    c.stroke();

    // Eyelashes for girl/fairy/elf/cat
    if (char.id === 'human_girl' || char.id === 'fairy' || char.id === 'elf' || char.id === 'cat') {
      c.strokeStyle = '#2c3e50'; c.lineWidth = 0.8;
      for (let s = -1; s <= 1; s += 2) {
        const ex = cx + s * eyeSpacing;
        c.beginPath(); c.moveTo(ex - 4, eyeY - 4); c.lineTo(ex - 6, eyeY - 7); c.stroke();
        c.beginPath(); c.moveTo(ex - 2, eyeY - 5); c.lineTo(ex - 3, eyeY - 8); c.stroke();
        c.beginPath(); c.moveTo(ex + 1, eyeY - 5); c.lineTo(ex + 1, eyeY - 8); c.stroke();
      }
    }
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
    // Wolf eye highlights
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(cx - eyeSpacing + 1, eyeY - 1, 1.2, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + eyeSpacing + 1, eyeY - 1, 1.2, 0, Math.PI*2); c.fill();
    // Brow ridges
    c.strokeStyle = '#5d6d6e'; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - eyeSpacing - 5, eyeY - 5); c.lineTo(cx - eyeSpacing + 3, eyeY - 6); c.stroke();
    c.beginPath(); c.moveTo(cx + eyeSpacing + 5, eyeY - 5); c.lineTo(cx + eyeSpacing - 3, eyeY - 6); c.stroke();
  }

  // Mouth — fuller smile
  if (char.id !== 'wolf_furry' && char.id !== 'cat') {
    const mouthY = headY + headR * 0.35;
    const mouthR = headR * 0.22;
    c.strokeStyle = '#c0392b'; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath();
    c.arc(cx, mouthY, mouthR, 0.15, Math.PI - 0.15);
    c.stroke();
    // Lip color fill
    c.fillStyle = 'rgba(192,57,43,0.12)';
    c.beginPath();
    c.arc(cx, mouthY, mouthR, 0.15, Math.PI - 0.15);
    c.closePath(); c.fill();
  }

  // Blush for girl/fairy/elf/cat
  if (char.id === 'human_girl' || char.id === 'fairy' || char.id === 'elf' || char.id === 'cat') {
    const blushY = headY + headR * 0.15;
    const eyeSpacing = headR * 0.38;
    c.fillStyle = 'rgba(255,150,150,0.18)';
    c.beginPath(); c.arc(cx - eyeSpacing - 5, blushY + 4, 5, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx + eyeSpacing + 5, blushY + 4, 5, 0, Math.PI*2); c.fill();
  }

  // Sparkles for fairy — more and better
  if (char.id === 'fairy') {
    const now = Date.now() / 500;
    for (let i = 0; i < 9; i++) {
      const sx = cx + Math.sin(now + i*1.3) * (bodyW + 30);
      const sy = headY + Math.cos(now + i*1.7) * (bodyBot - headY) * 0.8;
      const sr = 1.5 + Math.sin(now*2 + i) * 0.8;
      const alpha = 0.3 + Math.sin(now + i) * 0.2;
      c.fillStyle = `rgba(255,220,240,${alpha})`;
      c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI*2); c.fill();
      // Star sparkle shape
      if (i % 3 === 0) {
        c.strokeStyle = `rgba(232,67,147,${alpha})`;
        c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(sx - sr*2, sy); c.lineTo(sx + sr*2, sy); c.stroke();
        c.beginPath(); c.moveTo(sx, sy - sr*2); c.lineTo(sx, sy + sr*2); c.stroke();
      }
    }
  }
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
  const c = _hexToRgb(hex);
  return _rgbToHex(c.r + amt, c.g + amt, c.b + amt);
}
function _darken(hex, amt) {
  const c = _hexToRgb(hex);
  return _rgbToHex(c.r - amt, c.g - amt, c.b - amt);
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

  // Create gradient fill helper
  const topGrad = c.createLinearGradient(cx, bodyTop, cx, bodyBot);
  topGrad.addColorStop(0, _lighten(color, 18));
  topGrad.addColorStop(1, _darken(color, 15));
  c.fillStyle = topGrad;

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
      // Fold lines
      c.strokeStyle = 'rgba(0,0,0,0.07)'; c.lineWidth = 0.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - 8, bodyTop + 18);
      c.quadraticCurveTo(cx - 10, (bodyTop + bodyBot)/2, cx - 6, bodyBot - 12); c.stroke();
      c.beginPath(); c.moveTo(cx + 8, bodyTop + 18);
      c.quadraticCurveTo(cx + 6, (bodyTop + bodyBot)/2, cx + 9, bodyBot - 12); c.stroke();
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
      const hoodGrad = c.createLinearGradient(cx, bodyTop - 20, cx, bodyTop + 5);
      hoodGrad.addColorStop(0, _lighten(color, 12));
      hoodGrad.addColorStop(1, color);
      c.fillStyle = hoodGrad;
      c.beginPath(); c.arc(cx, bodyTop - 2, 18, Math.PI, 0); c.fill();
      // Pocket
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
      c.strokeRect(cx - 15, bodyBot - 25, 30, 15);
      // Drawstrings
      c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - 5, bodyTop + 4); c.lineTo(cx - 6, bodyTop + 20); c.stroke();
      c.beginPath(); c.moveTo(cx + 5, bodyTop + 4); c.lineTo(cx + 6, bodyTop + 20); c.stroke();
      // Drawstring tips
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.beginPath(); c.arc(cx - 6, bodyTop + 21, 1.5, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(cx + 6, bodyTop + 21, 1.5, 0, Math.PI*2); c.fill();
      // Fold lines
      c.strokeStyle = 'rgba(0,0,0,0.06)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - bodyW + 5, bodyTop + 20);
      c.quadraticCurveTo(cx - bodyW + 3, (bodyTop+bodyBot)/2, cx - bodyW + 6, bodyBot); c.stroke();
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
      c.strokeStyle = 'rgba(200,200,200,0.35)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx, bodyTop + 5); c.lineTo(cx, bodyBot); c.stroke();
      // Zipper teeth
      c.strokeStyle = 'rgba(200,200,200,0.2)'; c.lineWidth = 0.6;
      for (let zy = bodyTop + 8; zy < bodyBot - 2; zy += 4) {
        c.beginPath(); c.moveTo(cx - 2, zy); c.lineTo(cx + 2, zy); c.stroke();
      }
      // Collar flaps
      c.fillStyle = _darken(color, 20);
      c.beginPath(); c.moveTo(cx-2, bodyTop+3); c.lineTo(cx-14, bodyTop+18); c.lineTo(cx-2, bodyTop+14); c.fill();
      c.beginPath(); c.moveTo(cx+2, bodyTop+3); c.lineTo(cx+14, bodyTop+18); c.lineTo(cx+2, bodyTop+14); c.fill();
      // Shoulder seams
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - bodyW + 2, bodyTop + 5);
      c.lineTo(cx - bodyW - 8, bodyTop + 14); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 2, bodyTop + 5);
      c.lineTo(cx + bodyW + 8, bodyTop + 14); c.stroke();
      // Pocket flap strokes
      c.strokeStyle = 'rgba(0,0,0,0.1)'; c.lineWidth = 0.8;
      c.strokeRect(cx - bodyW + 3, bodyBot - 18, 14, 10);
      c.strokeRect(cx + bodyW - 17, bodyBot - 18, 14, 10);
      break;
    case 'armor': {
      // Metallic gradient
      const armorGrad = c.createLinearGradient(cx - bodyW, bodyTop, cx + bodyW, bodyBot);
      armorGrad.addColorStop(0, _lighten(color, 35));
      armorGrad.addColorStop(0.3, color);
      armorGrad.addColorStop(0.5, _lighten(color, 25));
      armorGrad.addColorStop(0.7, _darken(color, 15));
      armorGrad.addColorStop(1, _lighten(color, 10));
      c.fillStyle = armorGrad;
      c.beginPath();
      c.moveTo(cx - bodyW - 3, bodyTop + 5);
      c.lineTo(cx - bodyW - 10, bodyBot);
      c.lineTo(cx + bodyW + 10, bodyBot);
      c.lineTo(cx + bodyW + 3, bodyTop + 5);
      c.closePath(); c.fill();
      // Plates
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx - bodyW, (bodyTop+bodyBot)/2); c.lineTo(cx + bodyW, (bodyTop+bodyBot)/2); c.stroke();
      // Shoulder guards with metallic gradient
      const sgGrad = c.createLinearGradient(cx - bodyW - 19, bodyTop + 2, cx - bodyW + 9, bodyTop + 18);
      sgGrad.addColorStop(0, _lighten(color, 30));
      sgGrad.addColorStop(1, _darken(color, 10));
      c.fillStyle = sgGrad;
      c.beginPath(); c.ellipse(cx - bodyW - 5, bodyTop + 10, 14, 8, -0.3, 0, Math.PI*2); c.fill();
      c.fillStyle = sgGrad;
      c.beginPath(); c.ellipse(cx + bodyW + 5, bodyTop + 10, 14, 8, 0.3, 0, Math.PI*2); c.fill();
      // Rivet dots
      c.fillStyle = _darken(color, 25);
      const rivets = [
        [cx - bodyW - 3, bodyTop + 7], [cx - bodyW - 8, bodyTop + 13],
        [cx + bodyW + 3, bodyTop + 7], [cx + bodyW + 8, bodyTop + 13],
        [cx - bodyW + 2, bodyBot - 3], [cx + bodyW - 2, bodyBot - 3],
        [cx - bodyW + 2, bodyTop + 8], [cx + bodyW - 2, bodyTop + 8],
      ];
      rivets.forEach(([rx, ry]) => {
        c.beginPath(); c.arc(rx, ry, 1.5, 0, Math.PI*2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath(); c.arc(rx - 0.5, ry - 0.5, 0.7, 0, Math.PI*2); c.fill();
        c.fillStyle = _darken(color, 25);
      });
      break;
    }
    case 'wizard_robe':
      c.beginPath();
      c.moveTo(cx - bodyW - 10, bodyTop);
      c.lineTo(cx - bodyW - 25, y + h*0.85);
      c.lineTo(cx + bodyW + 25, y + h*0.85);
      c.lineTo(cx + bodyW + 10, bodyTop);
      c.closePath(); c.fill();
      // Drawn 4-point stars instead of text
      c.fillStyle = 'rgba(255,215,0,0.45)';
      [[cx - 10, bodyBot - 22], [cx + 10, (bodyTop+bodyBot)/2 + 2], [cx - 5, bodyBot + 7]].forEach(([sx, sy]) => {
        _draw4Star(c, sx, sy, 5);
      });
      // Extra smaller sparkle stars
      c.fillStyle = 'rgba(255,215,0,0.25)';
      [[cx + 18, bodyBot - 10], [cx - 15, bodyBot + 15], [cx + 5, bodyTop + 18]].forEach(([sx, sy]) => {
        _draw4Star(c, sx, sy, 3);
      });
      break;
    case 'kimono':
      c.beginPath();
      c.moveTo(cx - bodyW - 12, bodyTop);
      c.lineTo(cx - bodyW - 15, y + h*0.8);
      c.lineTo(cx + bodyW + 15, y + h*0.8);
      c.lineTo(cx + bodyW + 12, bodyTop);
      c.closePath(); c.fill();
      // Subtle floral dot pattern
      c.fillStyle = 'rgba(255,255,255,0.1)';
      for (let fx = cx - bodyW; fx < cx + bodyW; fx += 12) {
        for (let fy = bodyTop + 10; fy < y + h*0.78; fy += 14) {
          if (Math.sin(fx * 0.7 + fy * 0.5) > 0.3) {
            c.beginPath(); c.arc(fx, fy, 2, 0, Math.PI*2); c.fill();
            // Tiny petals
            for (let p = 0; p < 4; p++) {
              const pa = p * Math.PI / 2;
              c.beginPath(); c.arc(fx + Math.cos(pa)*3, fy + Math.sin(pa)*3, 1, 0, Math.PI*2); c.fill();
            }
          }
        }
      }
      // Obi belt gradient
      const obiGrad = c.createLinearGradient(cx - bodyW, (bodyTop+bodyBot)/2 - 5, cx - bodyW, (bodyTop+bodyBot)/2 + 9);
      obiGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
      obiGrad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
      obiGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
      c.fillStyle = obiGrad;
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
      // Knit texture fold lines
      c.strokeStyle = 'rgba(0,0,0,0.06)'; c.lineWidth = 0.8; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const ly = bodyTop + 10 + i*10;
        c.beginPath();
        c.moveTo(cx - bodyW + 5, ly);
        c.quadraticCurveTo(cx, ly + 2, cx + bodyW - 5, ly);
        c.stroke();
      }
      // Turtleneck gradient
      const tnGrad = c.createLinearGradient(cx, bodyTop - 2, cx, bodyTop + 6);
      tnGrad.addColorStop(0, _lighten(color, 10));
      tnGrad.addColorStop(1, color);
      c.fillStyle = tnGrad;
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

/* Draw a 4-point star shape */
function _draw4Star(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.lineTo(x + r*0.3, y - r*0.3);
  c.lineTo(x + r, y);
  c.lineTo(x + r*0.3, y + r*0.3);
  c.lineTo(x, y + r);
  c.lineTo(x - r*0.3, y + r*0.3);
  c.lineTo(x - r, y);
  c.lineTo(x - r*0.3, y - r*0.3);
  c.closePath(); c.fill();
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

  const btmGrad = c.createLinearGradient(cx, bodyBot, cx, legBot);
  btmGrad.addColorStop(0, _lighten(color, 10));
  btmGrad.addColorStop(1, _darken(color, 10));
  c.fillStyle = btmGrad;

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
      // Center seam
      c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx, bodyBot); c.lineTo(cx, bodyBot + 10); c.stroke();
      // Stitching details — dashed seams
      c.strokeStyle = 'rgba(200,180,100,0.25)'; c.lineWidth = 0.7;
      c.setLineDash([2, 3]);
      // Left leg seam
      c.beginPath(); c.moveTo(cx - bodyW + 2, bodyBot - 2);
      c.lineTo(cx - 18, legBot - 2); c.stroke();
      // Right leg seam
      c.beginPath(); c.moveTo(cx + bodyW - 2, bodyBot - 2);
      c.lineTo(cx + 18, legBot - 2); c.stroke();
      // Waistband seam
      c.beginPath(); c.moveTo(cx - bodyW - 1, bodyBot - 3);
      c.lineTo(cx + bodyW + 1, bodyBot - 3); c.stroke();
      c.setLineDash([]);
      // Pocket hint
      c.strokeStyle = 'rgba(200,180,100,0.15)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(cx - bodyW + 3, bodyBot); c.quadraticCurveTo(cx - bodyW + 10, bodyBot + 8, cx - bodyW + 3, bodyBot + 12); c.stroke();
      c.beginPath(); c.moveTo(cx + bodyW - 3, bodyBot); c.quadraticCurveTo(cx + bodyW - 10, bodyBot + 8, cx + bodyW - 3, bodyBot + 12); c.stroke();
      break;
    case 'skirt':
      c.beginPath();
      c.moveTo(cx - bodyW - 2, bodyBot - 5);
      c.quadraticCurveTo(cx - bodyW - 15, bodyBot + 25, cx - bodyW + 5, bodyBot + 35);
      c.lineTo(cx + bodyW - 5, bodyBot + 35);
      c.quadraticCurveTo(cx + bodyW + 15, bodyBot + 25, cx + bodyW + 2, bodyBot - 5);
      c.closePath(); c.fill();
      // Pleat shadow gradient at hem
      c.fillStyle = 'rgba(0,0,0,0.08)';
      c.beginPath();
      c.moveTo(cx - bodyW + 5, bodyBot + 30);
      c.lineTo(cx + bodyW - 5, bodyBot + 30);
      c.lineTo(cx + bodyW - 5, bodyBot + 35);
      c.lineTo(cx - bodyW + 5, bodyBot + 35);
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
      // Better pocket flaps with button dots
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
      c.strokeRect(cx - 22, bodyBot + 10, 14, 12);
      c.strokeRect(cx + 8, bodyBot + 10, 14, 12);
      // Pocket flap top lines
      c.fillStyle = _darken(color, 12);
      c.fillRect(cx - 22, bodyBot + 8, 14, 3);
      c.fillRect(cx + 8, bodyBot + 8, 14, 3);
      // Button dots
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.beginPath(); c.arc(cx - 15, bodyBot + 10, 1.5, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(cx + 15, bodyBot + 10, 1.5, 0, Math.PI*2); c.fill();
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
    case 'armor_greaves': {
      // Metallic gradient for armor
      const agGrad = c.createLinearGradient(cx - bodyW, bodyBot, cx + bodyW, legBot);
      agGrad.addColorStop(0, _lighten(color, 30));
      agGrad.addColorStop(0.4, color);
      agGrad.addColorStop(0.6, _lighten(color, 20));
      agGrad.addColorStop(1, _darken(color, 10));
      c.fillStyle = agGrad;
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
      const kpGrad = c.createRadialGradient(cx - 14, bodyBot + 13, 0, cx - 14, bodyBot + 15, 8);
      kpGrad.addColorStop(0, _lighten(color, 25));
      kpGrad.addColorStop(1, color);
      c.fillStyle = kpGrad;
      c.beginPath(); c.ellipse(cx - 14, bodyBot + 15, 8, 6, 0, 0, Math.PI*2); c.fill();
      c.fillStyle = kpGrad;
      c.beginPath(); c.ellipse(cx + 14, bodyBot + 15, 8, 6, 0, 0, Math.PI*2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(cx - 14, bodyBot + 15, 8, 6, 0, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.ellipse(cx + 14, bodyBot + 15, 8, 6, 0, 0, Math.PI*2); c.stroke();
      break;
    }
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
      // Pleat shadow gradients
      for (let i = -3; i <= 3; i++) {
        const px = cx + i * 8;
        c.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
        c.beginPath();
        c.moveTo(px, bodyBot);
        c.lineTo(px + 4, bodyBot + 28);
        c.lineTo(px + 8, bodyBot + 28);
        c.lineTo(px + 8, bodyBot);
        c.closePath(); c.fill();
      }
      // Pleat lines
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
        // Main shoe body
        c.fillStyle = color;
        c.beginPath(); c.ellipse(fx, footY, 13, 6, 0, 0, Math.PI*2); c.fill();
        // Sole line
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.beginPath(); c.ellipse(fx, footY + 2, 13, 3, 0, 0, Math.PI); c.fill();
        // Toe cap highlight
        c.fillStyle = 'rgba(255,255,255,0.2)';
        c.beginPath(); c.ellipse(fx + s*6, footY - 1, 5, 3.5, 0, Math.PI, 0); c.fill();
        // Lace cross pattern
        c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 0.7;
        c.beginPath(); c.moveTo(fx - 3, footY - 3); c.lineTo(fx + 1, footY - 5); c.stroke();
        c.beginPath(); c.moveTo(fx + 1, footY - 3); c.lineTo(fx - 3, footY - 5); c.stroke();
        c.fillStyle = color;
      }
      break;
    case 'boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        // Boot shaft gradient
        const bootGrad = c.createLinearGradient(fx - 10, footY - 18, fx + 10, footY + 6);
        bootGrad.addColorStop(0, _lighten(color, 12));
        bootGrad.addColorStop(1, _darken(color, 8));
        c.fillStyle = bootGrad;
        c.fillRect(fx - 10, footY - 18, 20, 24);
        c.beginPath(); c.ellipse(fx, footY + 6, 12, 5, 0, 0, Math.PI*2); c.fill();
        // Stitching lines
        c.setLineDash([2, 2]);
        c.strokeStyle = 'rgba(200,180,100,0.2)'; c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(fx - 8, footY - 16); c.lineTo(fx - 8, footY + 3); c.stroke();
        c.beginPath(); c.moveTo(fx + 8, footY - 16); c.lineTo(fx + 8, footY + 3); c.stroke();
        c.setLineDash([]);
        // Buckle detail
        c.strokeStyle = 'rgba(200,200,200,0.35)'; c.lineWidth = 1.2;
        c.strokeRect(fx - 4, footY - 10, 8, 5);
        c.beginPath(); c.moveTo(fx, footY - 10); c.lineTo(fx, footY - 5); c.stroke();
        c.fillStyle = color;
      }
      break;
    case 'heels':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.fillStyle = color;
        c.beginPath(); c.ellipse(fx + s*3, footY, 11, 5, 0, 0, Math.PI*2); c.fill();
        // Heel
        c.fillRect(fx - s*5 - 2, footY - 2, 4, 10);
        // Shine highlight streak
        c.fillStyle = 'rgba(255,255,255,0.25)';
        c.beginPath();
        c.moveTo(fx + s*6, footY - 3);
        c.lineTo(fx + s*8, footY - 1);
        c.lineTo(fx + s*3, footY + 1);
        c.closePath(); c.fill();
        c.fillStyle = color;
      }
      break;
    case 'sandals':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.fillStyle = color;
        c.beginPath(); c.ellipse(fx, footY + 2, 12, 4, 0, 0, Math.PI*2); c.fill();
        c.strokeStyle = color; c.lineWidth = 2;
        c.beginPath(); c.moveTo(fx - 5, footY - 3); c.lineTo(fx, footY - 6); c.lineTo(fx + 5, footY - 3); c.stroke();
      }
      break;
    case 'armored_boots':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        // Metallic gradient
        const abGrad = c.createLinearGradient(fx - 14, footY - 20, fx + 14, footY + 5);
        abGrad.addColorStop(0, _lighten(color, 30));
        abGrad.addColorStop(0.4, color);
        abGrad.addColorStop(0.6, _lighten(color, 20));
        abGrad.addColorStop(1, _darken(color, 10));
        c.fillStyle = abGrad;
        c.beginPath();
        c.moveTo(fx - 12, footY - 20);
        c.lineTo(fx - 14, footY + 5);
        c.lineTo(fx + 14, footY + 5);
        c.lineTo(fx + 12, footY - 20);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(fx - 12, footY - 10); c.lineTo(fx + 12, footY - 10); c.stroke();
        c.beginPath(); c.moveTo(fx - 13, footY); c.lineTo(fx + 13, footY); c.stroke();
        // Rivets
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath(); c.arc(fx - 8, footY - 10, 1.2, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(fx + 8, footY - 10, 1.2, 0, Math.PI*2); c.fill();
        c.fillStyle = color;
      }
      break;
    case 'slippers':
      for (let s = -1; s <= 1; s += 2) {
        const fx = cx + s*16;
        c.fillStyle = color;
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
        c.fillStyle = color;
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
    case 'glasses': {
      c.strokeStyle = color; c.lineWidth = 1.8;
      const eyeY = headY - headR*0.1;
      const sp = headR*0.38;
      c.beginPath(); c.ellipse(cx-sp, eyeY, 7, 6.5, 0, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.ellipse(cx+sp, eyeY, 7, 6.5, 0, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.moveTo(cx-sp+7, eyeY); c.lineTo(cx+sp-7, eyeY); c.stroke();
      c.beginPath(); c.moveTo(cx-sp-7, eyeY); c.lineTo(cx-headR-3, eyeY-3); c.stroke();
      c.beginPath(); c.moveTo(cx+sp+7, eyeY); c.lineTo(cx+headR+3, eyeY-3); c.stroke();
      // Faint lens tint
      c.fillStyle = 'rgba(135,206,235,0.08)';
      c.beginPath(); c.ellipse(cx-sp, eyeY, 6, 5.5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx+sp, eyeY, 6, 5.5, 0, 0, Math.PI*2); c.fill();
      // Lens reflection
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath(); c.ellipse(cx-sp-2, eyeY-2, 3, 2, -0.3, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx+sp-2, eyeY-2, 3, 2, -0.3, 0, Math.PI*2); c.fill();
      break;
    }
    case 'crown': {
      // Crown with gradient
      const crGrad = c.createLinearGradient(cx, headY - headR*1.3, cx, headY - headR*0.7);
      crGrad.addColorStop(0, _lighten(color, 25));
      crGrad.addColorStop(1, _darken(color, 10));
      c.fillStyle = crGrad;
      c.beginPath();
      c.moveTo(cx - headR*0.7, headY - headR*0.7);
      c.lineTo(cx - headR*0.7, headY - headR*1.2);
      c.lineTo(cx - headR*0.35, headY - headR*0.9);
      c.lineTo(cx, headY - headR*1.3);
      c.lineTo(cx + headR*0.35, headY - headR*0.9);
      c.lineTo(cx + headR*0.7, headY - headR*1.2);
      c.lineTo(cx + headR*0.7, headY - headR*0.7);
      c.closePath(); c.fill();
      // Jewels with facet highlights
      c.fillStyle = '#e74c3c';
      c.beginPath(); c.arc(cx, headY - headR*1.15, 2.5, 0, Math.PI*2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.arc(cx - 0.5, headY - headR*1.17, 1, 0, Math.PI*2); c.fill();
      c.fillStyle = '#3498db';
      c.beginPath(); c.arc(cx - headR*0.38, headY - headR*0.85, 2, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(cx + headR*0.38, headY - headR*0.85, 2, 0, Math.PI*2); c.fill();
      // Gem highlights
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.beginPath(); c.arc(cx - headR*0.4, headY - headR*0.87, 0.8, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(cx + headR*0.36, headY - headR*0.87, 0.8, 0, Math.PI*2); c.fill();
      break;
    }
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
      // Cell/vein pattern wings
      for (let s = -1; s <= 1; s += 2) {
        // Upper wing
        c.fillStyle = color; c.globalAlpha = 0.45;
        c.beginPath();
        c.moveTo(cx + s*bodyW, bodyTop + 10);
        c.quadraticCurveTo(cx + s*(bodyW + 50), bodyTop - 30, cx + s*(bodyW + 15), bodyTop + 50);
        c.closePath(); c.fill();
        // Lower wing
        c.globalAlpha = 0.35;
        c.beginPath();
        c.moveTo(cx + s*bodyW, bodyTop + 15);
        c.quadraticCurveTo(cx + s*(bodyW + 40), bodyTop + 50, cx + s*(bodyW + 10), bodyTop + 60);
        c.closePath(); c.fill();
        c.globalAlpha = 1;
        // Vein lines
        c.strokeStyle = color; c.globalAlpha = 0.3; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(cx + s*bodyW, bodyTop + 15);
        c.lineTo(cx + s*(bodyW + 35), bodyTop); c.stroke();
        c.beginPath(); c.moveTo(cx + s*bodyW, bodyTop + 18);
        c.lineTo(cx + s*(bodyW + 30), bodyTop + 25); c.stroke();
        c.beginPath(); c.moveTo(cx + s*bodyW, bodyTop + 22);
        c.lineTo(cx + s*(bodyW + 20), bodyTop + 45); c.stroke();
        c.globalAlpha = 1;
      }
      break;
    case 'cape': {
      // Outer cape
      c.globalAlpha = 0.7;
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(cx - bodyW + 5, bodyTop + 2);
      c.quadraticCurveTo(cx - bodyW - 20, bodyBot, cx - bodyW - 10, y + h*0.88);
      c.lineTo(cx + bodyW + 10, y + h*0.88);
      c.quadraticCurveTo(cx + bodyW + 20, bodyBot, cx + bodyW - 5, bodyTop + 2);
      c.closePath(); c.fill();
      // Inner lining contrast visible at edges
      const liningColor = _lighten(color, 40);
      c.fillStyle = liningColor;
      c.globalAlpha = 0.3;
      // Left edge lining
      c.beginPath();
      c.moveTo(cx - bodyW + 5, bodyTop + 5);
      c.quadraticCurveTo(cx - bodyW - 16, bodyBot, cx - bodyW - 8, y + h*0.87);
      c.lineTo(cx - bodyW - 4, y + h*0.86);
      c.quadraticCurveTo(cx - bodyW - 12, bodyBot - 5, cx - bodyW + 8, bodyTop + 8);
      c.closePath(); c.fill();
      // Right edge lining
      c.beginPath();
      c.moveTo(cx + bodyW - 5, bodyTop + 5);
      c.quadraticCurveTo(cx + bodyW + 16, bodyBot, cx + bodyW + 8, y + h*0.87);
      c.lineTo(cx + bodyW + 4, y + h*0.86);
      c.quadraticCurveTo(cx + bodyW + 12, bodyBot - 5, cx + bodyW - 8, bodyTop + 8);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      // Clasp
      c.fillStyle = '#f4d03f';
      c.beginPath(); c.arc(cx, bodyTop + 4, 4, 0, Math.PI*2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath(); c.arc(cx - 1, bodyTop + 3, 1.5, 0, Math.PI*2); c.fill();
      break;
    }
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
    case 'flower_crown': {
      const crownY = headY - headR*0.85;
      // Vine
      c.strokeStyle = '#27ae60'; c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(cx - headR*0.95, crownY + 3);
      c.quadraticCurveTo(cx, crownY - 3, cx + headR*0.95, crownY + 3);
      c.stroke();
      // Small leaf shapes between flowers
      c.fillStyle = '#27ae60';
      for (let i = -2; i <= 2; i++) {
        const lx = cx + i*headR*0.32 + headR*0.16;
        const ly = crownY + Math.abs(i)*1.5 + 1;
        c.beginPath();
        c.ellipse(lx, ly, 3, 1.5, i*0.3, 0, Math.PI*2);
        c.fill();
      }
      // Flowers
      for (let i = -3; i <= 3; i++) {
        const fx = cx + i*headR*0.32;
        const fy = crownY + Math.abs(i)*2;
        // Petals
        c.fillStyle = i % 2 === 0 ? color : '#fff';
        for (let p = 0; p < 5; p++) {
          const pa = p * Math.PI * 2 / 5;
          c.beginPath(); c.arc(fx + Math.cos(pa)*3, fy + Math.sin(pa)*3, 2.5, 0, Math.PI*2); c.fill();
        }
        // Center
        c.fillStyle = '#f1c40f';
        c.beginPath(); c.arc(fx, fy, 2, 0, Math.PI*2); c.fill();
      }
      break;
    }
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
    case 'park': {
      // Gradient sky
      const skyGrad = c.createLinearGradient(0, 0, 0, h*0.6);
      skyGrad.addColorStop(0, '#5dade2');
      skyGrad.addColorStop(1, '#aed6f1');
      c.fillStyle = skyGrad;
      c.fillRect(0, 0, w, h*0.6);
      // Fluffy cloud clusters
      c.fillStyle = 'rgba(255,255,255,0.7)';
      [[100, 60], [280, 90], [50, 130]].forEach(([cx2, cy]) => {
        c.beginPath(); c.arc(cx2, cy, 22, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx2 + 20, cy + 3, 16, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx2 - 15, cy + 5, 14, 0, Math.PI*2); c.fill();
      });
      // Grass gradient
      const grassGrad = c.createLinearGradient(0, h*0.6, 0, h);
      grassGrad.addColorStop(0, _lighten(color, 15));
      grassGrad.addColorStop(1, _darken(color, 15));
      c.fillStyle = grassGrad;
      c.fillRect(0, h*0.6, w, h*0.4);
      // Dirt path
      c.fillStyle = '#c4a265';
      c.beginPath();
      c.moveTo(w*0.35, h); c.quadraticCurveTo(w*0.4, h*0.75, w*0.5, h*0.62);
      c.quadraticCurveTo(w*0.55, h*0.62, w*0.55, h*0.62);
      c.quadraticCurveTo(w*0.5, h*0.78, w*0.55, h);
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(180,150,90,0.3)';
      c.beginPath();
      c.moveTo(w*0.37, h); c.quadraticCurveTo(w*0.42, h*0.77, w*0.505, h*0.63);
      c.lineTo(w*0.51, h*0.63);
      c.quadraticCurveTo(w*0.43, h*0.78, w*0.4, h);
      c.closePath(); c.fill();
      // Trees
      c.fillStyle = '#5d4037';
      c.fillRect(60, h*0.35, 12, h*0.25);
      c.fillRect(300, h*0.3, 12, h*0.3);
      // Tree canopy with gradient
      const tc1 = c.createRadialGradient(66, h*0.32, 0, 66, h*0.35, 32);
      tc1.addColorStop(0, '#2ecc71'); tc1.addColorStop(1, '#1e8449');
      c.fillStyle = tc1;
      c.beginPath(); c.arc(66, h*0.35, 30, 0, Math.PI*2); c.fill();
      const tc2 = c.createRadialGradient(306, h*0.27, 0, 306, h*0.3, 37);
      tc2.addColorStop(0, '#2ecc71'); tc2.addColorStop(1, '#1e8449');
      c.fillStyle = tc2;
      c.beginPath(); c.arc(306, h*0.3, 35, 0, Math.PI*2); c.fill();
      // Flowers on grass
      [[80, h*0.68], [150, h*0.72], [250, h*0.66], [340, h*0.74], [120, h*0.78], [320, h*0.82]].forEach(([fx, fy]) => {
        c.fillStyle = ['#e74c3c','#f39c12','#e84393','#fff'][Math.floor(fx*fy) % 4];
        c.beginPath(); c.arc(fx, fy, 3, 0, Math.PI*2); c.fill();
        c.fillStyle = '#27ae60';
        c.beginPath(); c.moveTo(fx, fy + 2); c.lineTo(fx, fy + 7); c.lineWidth = 1; c.strokeStyle = '#27ae60'; c.stroke();
      });
      // Sun with glow
      c.fillStyle = 'rgba(241,196,15,0.15)';
      c.beginPath(); c.arc(350, 50, 40, 0, Math.PI*2); c.fill();
      c.fillStyle = '#f1c40f';
      c.beginPath(); c.arc(350, 50, 25, 0, Math.PI*2); c.fill();
      break;
    }
    case 'castle': {
      // Gradient sky backdrop
      const castleSkyGrad = c.createLinearGradient(0, 0, 0, h*0.35);
      castleSkyGrad.addColorStop(0, '#3d5a80');
      castleSkyGrad.addColorStop(1, '#7a8fa6');
      c.fillStyle = castleSkyGrad;
      c.fillRect(0, 0, w, h);
      // Castle wall
      c.fillStyle = color;
      c.fillRect(50, h*0.3, w-100, h*0.7);
      // Stone brick lines
      c.strokeStyle = 'rgba(0,0,0,0.1)'; c.lineWidth = 0.6;
      for (let by = h*0.3; by < h; by += 15) {
        c.beginPath(); c.moveTo(50, by); c.lineTo(w-50, by); c.stroke();
        const offset = (Math.floor(by/15) % 2) * 20;
        for (let bx = 50 + offset; bx < w - 50; bx += 40) {
          c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by + 15); c.stroke();
        }
      }
      // Towers
      c.fillStyle = color;
      c.fillRect(30, h*0.15, 50, h*0.85);
      c.fillRect(w-80, h*0.15, 50, h*0.85);
      // Battlements
      for (let i = 0; i < 5; i++) {
        c.fillRect(30 + i*12, h*0.12, 8, 12);
        c.fillRect(w-80 + i*12, h*0.12, 8, 12);
      }
      // Flag banners on towers
      c.fillStyle = '#c0392b';
      c.beginPath(); c.moveTo(55, h*0.08); c.lineTo(55, h*0.12);
      c.lineTo(75, h*0.1); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(w-55, h*0.08); c.lineTo(w-55, h*0.12);
      c.lineTo(w-35, h*0.1); c.closePath(); c.fill();
      // Flag poles
      c.strokeStyle = '#5d4037'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(55, h*0.05); c.lineTo(55, h*0.12); c.stroke();
      c.beginPath(); c.moveTo(w-55, h*0.05); c.lineTo(w-55, h*0.12); c.stroke();
      // Gate
      c.fillStyle = '#4a3728';
      c.beginPath(); c.arc(w/2, h*0.7, 30, Math.PI, 0); c.fill();
      c.fillRect(w/2-30, h*0.7, 60, h*0.3);
      // Torch glow
      for (const tx of [w/2 - 40, w/2 + 40]) {
        const tGlow = c.createRadialGradient(tx, h*0.6, 0, tx, h*0.6, 20);
        tGlow.addColorStop(0, 'rgba(255,180,50,0.3)');
        tGlow.addColorStop(1, 'rgba(255,180,50,0)');
        c.fillStyle = tGlow;
        c.beginPath(); c.arc(tx, h*0.6, 20, 0, Math.PI*2); c.fill();
        c.fillStyle = '#f39c12';
        c.beginPath(); c.arc(tx, h*0.58, 3, 0, Math.PI*2); c.fill();
        c.fillStyle = '#5d4037';
        c.fillRect(tx - 1.5, h*0.59, 3, 12);
      }
      break;
    }
    case 'beach': {
      // Gradient sky
      const beachSkyGrad = c.createLinearGradient(0, 0, 0, h*0.45);
      beachSkyGrad.addColorStop(0, '#5dade2');
      beachSkyGrad.addColorStop(1, '#aed6f1');
      c.fillStyle = beachSkyGrad;
      c.fillRect(0, 0, w, h*0.45);
      // Ocean gradient
      const oceanGrad = c.createLinearGradient(0, h*0.45, 0, h*0.6);
      oceanGrad.addColorStop(0, '#2471a3');
      oceanGrad.addColorStop(1, '#3498db');
      c.fillStyle = oceanGrad;
      c.fillRect(0, h*0.45, w, h*0.15);
      // Sand gradient
      const sandGrad = c.createLinearGradient(0, h*0.6, 0, h);
      sandGrad.addColorStop(0, _lighten(color, 15));
      sandGrad.addColorStop(1, _darken(color, 10));
      c.fillStyle = sandGrad;
      c.fillRect(0, h*0.6, w, h*0.4);
      // Improved waves
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = `rgba(255,255,255,${0.35 - i*0.07})`; c.lineWidth = 2.5 - i*0.4;
        c.beginPath();
        c.moveTo(0, h*0.47 + i*7);
        for (let bx = 0; bx < w; bx += 35) {
          c.quadraticCurveTo(bx+8, h*0.44+i*7, bx+17, h*0.47+i*7);
          c.quadraticCurveTo(bx+26, h*0.50+i*7, bx+35, h*0.47+i*7);
        }
        c.stroke();
      }
      // Palm tree
      c.fillStyle = '#795548'; c.strokeStyle = '#5d4037'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(350, h*0.6);
      c.quadraticCurveTo(345, h*0.4, 355, h*0.25); c.stroke();
      // Fronds
      c.strokeStyle = '#27ae60'; c.lineWidth = 2.5; c.lineCap = 'round';
      [[-40, 15, -0.5], [35, 10, 0.4], [-25, -10, -0.3], [30, -15, 0.3], [-10, 20, -0.1]].forEach(([dx, dy, curve]) => {
        c.beginPath(); c.moveTo(355, h*0.25);
        c.quadraticCurveTo(355 + dx*0.5, h*0.25 + dy*0.5 - 10, 355 + dx, h*0.25 + dy + 15);
        c.stroke();
      });
      // Seashells
      c.fillStyle = 'rgba(255,220,200,0.5)';
      [[100, h*0.7], [250, h*0.75], [180, h*0.82]].forEach(([sx, sy]) => {
        c.beginPath(); c.arc(sx, sy, 3, 0, Math.PI); c.fill();
        c.strokeStyle = 'rgba(200,150,120,0.4)'; c.lineWidth = 0.5;
        c.beginPath(); c.arc(sx, sy, 3, 0, Math.PI); c.stroke();
      });
      // Sun with glow
      c.fillStyle = 'rgba(241,196,15,0.15)';
      c.beginPath(); c.arc(80, 60, 45, 0, Math.PI*2); c.fill();
      c.fillStyle = '#f1c40f';
      c.beginPath(); c.arc(80, 60, 30, 0, Math.PI*2); c.fill();
      break;
    }
    case 'space': {
      c.fillStyle = color;
      c.fillRect(0, 0, w, h);
      // Nebula color patches
      const nebulae = [
        [80, 150, 70, 'rgba(100,50,150,0.08)'],
        [300, 400, 90, 'rgba(50,100,150,0.06)'],
        [200, 80, 60, 'rgba(150,50,80,0.07)'],
      ];
      nebulae.forEach(([nx, ny, nr, nc]) => {
        const nebGrad = c.createRadialGradient(nx, ny, 0, nx, ny, nr);
        nebGrad.addColorStop(0, nc);
        nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = nebGrad;
        c.beginPath(); c.arc(nx, ny, nr, 0, Math.PI*2); c.fill();
      });
      // Stars
      for (let i = 0; i < 80; i++) {
        const sx = Math.sin(i*127.1)*0.5*w + w/2;
        const sy = Math.cos(i*311.7)*0.5*h + h/2;
        const sr = 0.5 + (i%3)*0.5;
        c.fillStyle = `rgba(255,255,255,${0.4+Math.sin(i)*0.3})`;
        c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI*2); c.fill();
      }
      // Planet with crater dots + atmosphere rim glow
      const pGrad = c.createRadialGradient(315, 115, 5, 320, 120, 35);
      pGrad.addColorStop(0, '#f1948a');
      pGrad.addColorStop(1, '#c0392b');
      c.fillStyle = pGrad;
      c.beginPath(); c.arc(320, 120, 35, 0, Math.PI*2); c.fill();
      // Crater dots
      c.fillStyle = 'rgba(0,0,0,0.15)';
      [[310, 110, 4], [330, 125, 3], [315, 135, 2.5], [325, 108, 2]].forEach(([cx2,cy,cr]) => {
        c.beginPath(); c.arc(cx2, cy, cr, 0, Math.PI*2); c.fill();
      });
      // Atmosphere rim glow
      c.strokeStyle = 'rgba(255,150,100,0.2)'; c.lineWidth = 4;
      c.beginPath(); c.arc(320, 120, 37, 0, Math.PI*2); c.stroke();
      // Ring
      c.strokeStyle = 'rgba(255,200,100,0.3)'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(320, 120, 55, 12, -0.3, 0, Math.PI*2); c.stroke();
      break;
    }
    case 'forest': {
      // Sky peek through canopy
      const fSkyGrad = c.createLinearGradient(0, 0, 0, h*0.3);
      fSkyGrad.addColorStop(0, '#1a4d2e');
      fSkyGrad.addColorStop(1, color);
      c.fillStyle = fSkyGrad;
      c.fillRect(0, 0, w, h);
      // Back layer trees (darker, behind)
      for (let i = 0; i < 10; i++) {
        const tx = i*45 + 10;
        const th = 140 + (i%4)*30;
        c.fillStyle = 'rgba(15,50,25,0.7)';
        c.fillRect(tx + 2, h - th, 8, th);
        c.fillStyle = `rgba(15,${60+i*8},30,0.6)`;
        c.beginPath(); c.arc(tx+6, h-th, 28+i*2, 0, Math.PI*2); c.fill();
      }
      // Front layer trees (lighter)
      for (let i = 0; i < 6; i++) {
        const tx = i*70 + 30;
        const th = 100 + (i%3)*45;
        c.fillStyle = '#3e2723';
        c.fillRect(tx, h - th, 11, th);
        const treeGrad = c.createRadialGradient(tx+5, h-th-5, 0, tx+5, h-th, 35+i*3);
        treeGrad.addColorStop(0, `rgb(40,${120+i*15},60)`);
        treeGrad.addColorStop(1, `rgb(25,${85+i*10},40)`);
        c.fillStyle = treeGrad;
        c.beginPath(); c.arc(tx+5, h-th, 33+i*3, 0, Math.PI*2); c.fill();
      }
      // Ground
      const fGroundGrad = c.createLinearGradient(0, h*0.85, 0, h);
      fGroundGrad.addColorStop(0, '#1a4d2e');
      fGroundGrad.addColorStop(1, '#0e3520');
      c.fillStyle = fGroundGrad;
      c.fillRect(0, h*0.85, w, h*0.15);
      // Mushrooms on ground
      [[60, h*0.88], [180, h*0.9], [320, h*0.87]].forEach(([mx, my]) => {
        c.fillStyle = '#deb887';
        c.fillRect(mx - 1.5, my, 3, 6);
        c.fillStyle = '#e74c3c';
        c.beginPath(); c.arc(mx, my, 5, Math.PI, 0); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(mx - 2, my - 2, 1, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(mx + 2, my - 1, 0.8, 0, Math.PI*2); c.fill();
      });
      // Light rays from top
      c.globalAlpha = 0.06;
      c.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        const rx = 80 + i * 130;
        c.beginPath();
        c.moveTo(rx - 5, 0); c.lineTo(rx + 15, 0);
        c.lineTo(rx + 40, h*0.7); c.lineTo(rx - 10, h*0.7);
        c.closePath(); c.fill();
      }
      c.globalAlpha = 1;
      break;
    }
    case 'city': {
      // Night sky gradient + stars + moon
      const nightGrad = c.createLinearGradient(0, 0, 0, h*0.5);
      nightGrad.addColorStop(0, '#0a0a2e');
      nightGrad.addColorStop(1, '#1a252f');
      c.fillStyle = nightGrad;
      c.fillRect(0, 0, w, h);
      // Stars in sky
      for (let i = 0; i < 30; i++) {
        const sx = Math.sin(i*97.3)*0.5*w + w/2;
        const sy = Math.cos(i*213.7)*0.2*h + h*0.1;
        c.fillStyle = `rgba(255,255,255,${0.3+Math.sin(i*1.7)*0.2})`;
        c.beginPath(); c.arc(sx, sy, 0.5 + (i%2)*0.5, 0, Math.PI*2); c.fill();
      }
      // Moon
      c.fillStyle = 'rgba(255,255,230,0.12)';
      c.beginPath(); c.arc(350, 50, 30, 0, Math.PI*2); c.fill();
      c.fillStyle = '#fffde6';
      c.beginPath(); c.arc(350, 50, 18, 0, Math.PI*2); c.fill();
      c.fillStyle = 'rgba(220,220,200,0.3)';
      c.beginPath(); c.arc(345, 46, 4, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(355, 53, 3, 0, Math.PI*2); c.fill();
      // Buildings
      const buildings = [[30,0.4,50],[90,0.55,40],[140,0.35,45],[200,0.6,55],[260,0.45,40],[310,0.5,50],[360,0.38,35]];
      buildings.forEach(([bx, bh, bw]) => {
        const bGrad = c.createLinearGradient(bx, h*(1-bh), bx + bw, h);
        bGrad.addColorStop(0, _lighten(color, 8));
        bGrad.addColorStop(1, _darken(color, 8));
        c.fillStyle = bGrad;
        c.fillRect(bx, h*(1-bh), bw, h*bh);
        // Varied window lighting
        for (let wy = h*(1-bh)+10; wy < h-15; wy += 18) {
          for (let wx = bx+5; wx < bx+bw-8; wx += 12) {
            const lit = Math.sin(wx*wy) > -0.3;
            if (lit) {
              const warmth = Math.sin(wx + wy) * 0.5 + 0.5;
              const r = 255;
              const g = Math.floor(180 + warmth * 50);
              const b = Math.floor(50 + warmth * 100);
              c.fillStyle = `rgba(${r},${g},${b},${0.4 + warmth*0.2})`;
              c.fillRect(wx, wy, 6, 8);
            }
          }
        }
      });
      // Ground
      c.fillStyle = '#2c3e50';
      c.fillRect(0, h*0.92, w, h*0.08);
      break;
    }
    case 'clouds': {
      const grad = c.createLinearGradient(0,0,0,h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#fff');
      c.fillStyle = grad;
      c.fillRect(0, 0, w, h);
      // Rainbow streak accents
      const rainbowColors = ['rgba(231,76,60,0.08)','rgba(241,196,15,0.08)','rgba(46,204,113,0.08)','rgba(52,152,219,0.08)'];
      rainbowColors.forEach((rc, i) => {
        c.strokeStyle = rc; c.lineWidth = 8;
        c.beginPath(); c.arc(w/2, h*0.3, 120 + i*12, Math.PI*0.8, Math.PI*0.2, true); c.stroke();
      });
      // Varied cloud sizes
      c.fillStyle = 'rgba(255,255,255,0.6)';
      [[80,100,40],[200,200,50],[320,150,35],[50,350,30],[280,400,45],[160,480,38],[370,250,25],[130,300,32]].forEach(([cx2,cy,sz]) => {
        c.beginPath(); c.arc(cx2, cy, sz, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx2+sz*0.7, cy+sz*0.12, sz*0.7, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(cx2-sz*0.6, cy+sz*0.18, sz*0.65, 0, Math.PI*2); c.fill();
        // Cloud highlight
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath(); c.arc(cx2 - sz*0.2, cy - sz*0.3, sz*0.4, 0, Math.PI*2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)';
      });
      break;
    }
    case 'rainbow': {
      // Sky gradient
      const rbSkyGrad = c.createLinearGradient(0, 0, 0, h*0.75);
      rbSkyGrad.addColorStop(0, '#5dade2');
      rbSkyGrad.addColorStop(1, '#aed6f1');
      c.fillStyle = rbSkyGrad;
      c.fillRect(0, 0, w, h);
      // Ground with grass blade texture
      const rbGrassGrad = c.createLinearGradient(0, h*0.75, 0, h);
      rbGrassGrad.addColorStop(0, '#2ecc71');
      rbGrassGrad.addColorStop(1, '#1e8449');
      c.fillStyle = rbGrassGrad;
      c.fillRect(0, h*0.75, w, h*0.25);
      // Grass blade texture
      c.strokeStyle = 'rgba(30,120,50,0.3)'; c.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 8) {
        const gh = 5 + Math.sin(gx * 0.7) * 3;
        c.beginPath(); c.moveTo(gx, h*0.75);
        c.lineTo(gx + 2, h*0.75 - gh); c.stroke();
      }
      // Rainbow
      const rbColors = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#8e44ad'];
      rbColors.forEach((rc, i) => {
        c.strokeStyle = rc; c.lineWidth = 12;
        c.beginPath(); c.arc(w/2, h*0.8, 200 - i*14, Math.PI, 0); c.stroke();
      });
      // Small butterfly shapes
      c.fillStyle = 'rgba(232,67,147,0.4)';
      [[100, h*0.5], [300, h*0.4], [180, h*0.6]].forEach(([bx, by]) => {
        for (let s = -1; s <= 1; s += 2) {
          c.beginPath();
          c.ellipse(bx + s*4, by - 2, 4, 3, s*0.3, 0, Math.PI*2);
          c.fill();
          c.beginPath();
          c.ellipse(bx + s*3, by + 2, 3, 2, s*0.2, 0, Math.PI*2);
          c.fill();
        }
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.beginPath(); c.ellipse(bx, by, 1, 3, 0, 0, Math.PI*2); c.fill();
        c.fillStyle = 'rgba(232,67,147,0.4)';
      });
      break;
    }
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
