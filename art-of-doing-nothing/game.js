/* ═══════════════════════════════════════════════════════════════
   game.js  –  Main game loop, canvas, orchestrator
   The Art of Doing Nothing
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── DOM refs ── */
  var canvas, ctx;
  var dialogueBox, speakerLabel, dialogueText, choiceContainer, clickPrompt;
  var muteBtn;

  /* ── roundRect polyfill ── */
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
      this.beginPath();
      this.moveTo(x + r.tl, y);
      this.lineTo(x + w - r.tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
      this.lineTo(x + w, y + h - r.br);
      this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
      this.lineTo(x + r.bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
      this.lineTo(x, y + r.tl);
      this.quadraticCurveTo(x, y, x + r.tl, y);
      this.closePath();
    };
  }

  /* ── State ── */
  var currentReveal = null;
  var executor = null;
  var gameStarted = false;
  var currentChapter = 1;
  var meterDisplay = 50;
  var canvasW, canvasH;
  var animTime = 0;
  var showingChapterSelect = false;
  var targetBgColor = '#2D1B4E';
  var bgColor = '#2D1B4E';
  var chapterPalette = {
    1: '#2D1B4E', 2: '#1B2D4E', 3: '#0A2A2A', 4: '#4E1B1B', 5: '#3A2D00'
  };
  var chapterAmbientFreq = {
    1: 110, 2: 130, 3: 90, 4: 75, 5: 150
  };

  var CHAPTER_SOURCES = [null, 'Chapter1', 'Chapter2', 'Chapter3', 'Chapter4', 'Chapter5'];
  var CHAPTER_NAME_KEYS = {
    1: 'aodnCh1Name',
    2: 'aodnCh2Name',
    3: 'aodnCh3Name',
    4: 'aodnCh4Name',
    5: 'aodnCh5Name'
  };
  function getChapterName(ch) {
    return I18N.t(CHAPTER_NAME_KEYS[ch]);
  }
  // Keep CHAPTER_NAMES as a getter-based object for backward compat
  var CHAPTER_NAMES = {};
  [1,2,3,4,5].forEach(function(ch) {
    Object.defineProperty(CHAPTER_NAMES, ch, { get: function() { return getChapterName(ch); }, enumerable: true });
  });

  /** Return translated chapter script if available, else English source */
  function getChapterScript(chapterNum) {
    if (typeof I18N !== 'undefined') {
      var key = 'aodnCh' + chapterNum + 'Script';
      var translated = I18N.t(key);
      if (translated !== key) return translated;
    }
    // Fall back to English scene file
    var srcName = CHAPTER_SOURCES[chapterNum];
    return (srcName && window[srcName]) ? window[srcName] : null;
  }

  /* ── Scene fade transition ── */
  var fadeAlpha = 0;       // 0 = no fade, 1 = fully black
  var fadeDirection = 0;   // 1 = fading out, -1 = fading in, 0 = idle
  var fadeCallback = null;
  var FADE_SPEED = 0.04;
  var slothClickCooldown = 0;

  function fadeOut(cb) {
    fadeDirection = 1;
    fadeCallback = cb;
  }

  function fadeIn() {
    fadeDirection = -1;
    fadeCallback = null;
  }

  function updateFade() {
    if (fadeDirection === 0) return;
    fadeAlpha += fadeDirection * FADE_SPEED;
    if (fadeAlpha >= 1 && fadeDirection === 1) {
      fadeAlpha = 1;
      fadeDirection = 0;
      if (fadeCallback) { fadeCallback(); fadeCallback = null; }
    }
    if (fadeAlpha <= 0 && fadeDirection === -1) {
      fadeAlpha = 0;
      fadeDirection = 0;
    }
  }

  /* ── Chapter title card ── */
  var titleCardAlpha = 0;
  var titleCardTimer = 0;
  var titleCardText = '';

  function showTitleCard(text) {
    titleCardText = text;
    titleCardAlpha = 1;
    titleCardTimer = 120; // ~2 seconds at 60fps
  }

  function updateTitleCard() {
    if (titleCardTimer > 0) {
      titleCardTimer--;
      if (titleCardTimer < 30) {
        titleCardAlpha = titleCardTimer / 30;
      }
    }
  }

  function drawTitleCard() {
    if (titleCardAlpha <= 0) return;
    ctx.globalAlpha = titleCardAlpha * 0.8;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.globalAlpha = titleCardAlpha;
    ctx.font = 'bold 18px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#C4A97D';
    ctx.fillText(titleCardText, canvasW / 2, canvasH / 2 - 10);
    ctx.font = '12px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(I18N.t('aodnChapter') + ' ' + currentChapter, canvasW / 2, canvasH / 2 + 15);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  /* ── Atmospheric particles (per chapter) ── */
  var atmoParticles = [];

  function spawnAtmoParticle() {
    var p;
    switch (currentChapter) {
      case 1: // Floating dust motes in bedroom
        p = { x: Math.random() * canvasW, y: Math.random() * canvasH * 0.7,
              vx: (Math.random() - 0.5) * 0.15, vy: -0.1 - Math.random() * 0.1,
              life: 1, size: 1 + Math.random() * 2, color: 'rgba(200,180,255,' };
        break;
      case 2: // Leaves drifting
        p = { x: canvasW + 5, y: Math.random() * canvasH * 0.5,
              vx: -0.5 - Math.random() * 0.5, vy: 0.3 + Math.random() * 0.2,
              life: 1, size: 3 + Math.random() * 3, color: 'rgba(120,180,80,' };
        break;
      case 3: // Screen glow particles (cyan)
        p = { x: canvasW * 0.68 + (Math.random() - 0.5) * 40, y: canvasH * 0.4 + Math.random() * 20,
              vx: (Math.random() - 0.5) * 0.3, vy: -0.3 - Math.random() * 0.2,
              life: 1, size: 1 + Math.random() * 2, color: 'rgba(100,220,255,' };
        break;
      case 4: // Red stress particles
        p = { x: Math.random() * canvasW, y: canvasH + 5,
              vx: (Math.random() - 0.5) * 0.4, vy: -0.4 - Math.random() * 0.3,
              life: 1, size: 1.5 + Math.random() * 2, color: 'rgba(255,100,80,' };
        break;
      case 5: // Golden motes (dawn)
        p = { x: Math.random() * canvasW, y: Math.random() * canvasH,
              vx: (Math.random() - 0.5) * 0.1, vy: -0.15 - Math.random() * 0.1,
              life: 1, size: 1.5 + Math.random() * 2.5, color: 'rgba(255,220,100,' };
        break;
      default: return;
    }
    atmoParticles.push(p);
  }

  function updateAndDrawAtmo() {
    // Spawn
    if (gameStarted && Math.random() < 0.06) spawnAtmoParticle();

    for (var i = atmoParticles.length - 1; i >= 0; i--) {
      var p = atmoParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.005;
      if (p.life <= 0 || p.x < -10 || p.x > canvasW + 10 || p.y < -10 || p.y > canvasH + 10) {
        atmoParticles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life * 0.4;
      ctx.fillStyle = p.color + (p.life * 0.5) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ── Z particles ── */
  var particles = [];

  function spawnZ() {
    particles.push({
      x: Characters.sloth.x + (Math.random() - 0.5) * 20,
      y: Characters.sloth.y - 50,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.5 - Math.random() * 0.5,
      life: 1,
      size: 10 + Math.random() * 8
    });
  }

  /* ── Background color lerp ── */
  function lerpColor(a, b, t) {
    var ah = parseInt(a.replace('#', ''), 16);
    var bh = parseInt(b.replace('#', ''), 16);
    var ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    var br = (bh >> 16) & 0xff, bg2 = (bh >> 8) & 0xff, bb = bh & 0xff;
    var rr = Math.round(ar + (br - ar) * t);
    var rg = Math.round(ag + (bg2 - ag) * t);
    var rb = Math.round(ab + (bb - ab) * t);
    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1);
  }

  /* ── Canvas rendering ── */
  function render() {
    animTime += 0.016;
    if (slothClickCooldown > 0) slothClickCooldown--;

    // Smooth palette transition
    bgColor = lerpColor(bgColor, targetBgColor, 0.03);

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Subtle gradient overlay
    var grad = ctx.createLinearGradient(0, 0, 0, canvasH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Stars (ambient)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (var i = 0; i < 20; i++) {
      var sx = (i * 97 + animTime * 2) % canvasW;
      var sy = (i * 53 + Math.sin(animTime + i) * 2) % (canvasH * 0.6);
      var sa = 0.2 + Math.sin(animTime * 2 + i) * 0.15;
      ctx.globalAlpha = sa;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // Background scene props
    drawSceneProps();

    // Sam (chapter-dependent)
    drawSamForChapter();

    // Sloth
    Characters.drawSloth(ctx, canvasW * 0.3, canvasH * 0.45, 1, animTime);

    // Z particles (only in sleepy chapters)
    if (Characters.sloth.expression.eyes === 'sleepy' && Math.random() < 0.02) spawnZ();
    ctx.fillStyle = '#C4A97D';
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= 0.008;
      if (pt.life <= 0) { particles.splice(p, 1); continue; }
      ctx.globalAlpha = pt.life * 0.6;
      ctx.font = 'bold ' + Math.round(pt.size) + 'px "Space Grotesk", sans-serif';
      ctx.fillText('z', pt.x, pt.y);
    }
    ctx.globalAlpha = 1;

    // Atmospheric particles
    updateAndDrawAtmo();

    // Procrastination meter
    drawMeter();

    // Chapter indicator
    ctx.font = '10px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(I18N.t('aodnChAbbr') + currentChapter, 8, 14);

    // Title card overlay
    updateTitleCard();
    drawTitleCard();

    // Scene fade overlay
    updateFade();
    if (fadeAlpha > 0) {
      ctx.globalAlpha = fadeAlpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(render);
  }

  function drawSamForChapter() {
    switch (currentChapter) {
      case 1:
        Characters.drawSamBed(ctx, canvasW * 0.65, canvasH * 0.6, animTime);
        break;
      case 2:
        Characters.drawSamStanding(ctx, canvasW * 0.7, canvasH * 0.35, 0.9, animTime);
        break;
      case 3:
      case 4:
        Characters.drawSamDesk(ctx, canvasW * 0.68, canvasH * 0.55, animTime);
        break;
      case 5:
        Characters.drawSamStanding(ctx, canvasW * 0.55, canvasH * 0.4, 0.7, animTime);
        break;
    }
  }

  /* ── Background scene props (chapter-specific environment) ── */
  function drawSceneProps() {
    switch (currentChapter) {
      case 1: drawBedroomBg(); break;
      case 2: drawCampusBg(); break;
      case 3: drawNightDeskBg(); break;
      case 4: drawPanicRoomBg(); break;
      case 5: drawMindscapeBg(); break;
    }
  }

  function drawBedroomBg() {
    var W = canvasW, H = canvasH, t = animTime;
    // Wall texture
    var wallGrad = ctx.createLinearGradient(0, 0, 0, H * 0.78);
    wallGrad.addColorStop(0, 'rgba(50,30,60,0.12)');
    wallGrad.addColorStop(1, 'rgba(35,20,45,0.18)');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H * 0.78);
    // Wallpaper pattern (subtle vertical stripes)
    ctx.strokeStyle = 'rgba(80,50,100,0.04)';
    ctx.lineWidth = 1;
    for (var ws = 0; ws < W; ws += 18) {
      ctx.beginPath(); ctx.moveTo(ws, 0); ctx.lineTo(ws, H * 0.78); ctx.stroke();
    }

    // Window with moonlit sky
    var wx = W * 0.75, wy = H * 0.04, ww = W * 0.21, wh = H * 0.32;
    // Sky gradient through window
    var skyGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    skyGrad.addColorStop(0, 'rgba(20,25,60,0.3)');
    skyGrad.addColorStop(0.6, 'rgba(40,45,90,0.2)');
    skyGrad.addColorStop(1, 'rgba(30,35,70,0.15)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(wx, wy, ww, wh);
    // Moon with glow halo
    var moonX = wx + ww * 0.65, moonY = wy + wh * 0.25;
    var moonGlow = ctx.createRadialGradient(moonX, moonY, 3, moonX, moonY, 30);
    moonGlow.addColorStop(0, 'rgba(255,245,220,0.3)');
    moonGlow.addColorStop(0.4, 'rgba(255,245,220,0.08)');
    moonGlow.addColorStop(1, 'rgba(255,245,220,0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath(); ctx.arc(moonX, moonY, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,220,0.5)';
    ctx.beginPath(); ctx.arc(moonX, moonY, 7, 0, Math.PI * 2); ctx.fill();
    // Crescent shadow
    ctx.fillStyle = 'rgba(20,25,60,0.4)';
    ctx.beginPath(); ctx.arc(moonX + 3, moonY - 1, 6, 0, Math.PI * 2); ctx.fill();
    // Stars in window
    for (var si = 0; si < 8; si++) {
      var starA = 0.15 + Math.sin(t * 3 + si * 2.3) * 0.1;
      ctx.fillStyle = 'rgba(255,255,255,' + starA + ')';
      ctx.fillRect(wx + 5 + (si * 17) % ww, wy + 3 + (si * 11) % (wh * 0.6), 1.5, 1.5);
    }
    // Window frame (wooden)
    ctx.strokeStyle = 'rgba(140,110,80,0.2)';
    ctx.lineWidth = 3;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    // Window sill
    ctx.fillStyle = 'rgba(140,110,80,0.15)';
    ctx.fillRect(wx - 3, wy + wh, ww + 6, 5);

    // Curtains (draped, with folds)
    ctx.fillStyle = 'rgba(80,50,110,0.2)';
    // Left curtain
    ctx.beginPath();
    ctx.moveTo(wx - 8, wy - 5);
    ctx.quadraticCurveTo(wx - 2, wy + wh * 0.3, wx - 6, wy + wh + 8);
    ctx.lineTo(wx - 14, wy + wh + 8);
    ctx.quadraticCurveTo(wx - 12, wy + wh * 0.5, wx - 14, wy - 5);
    ctx.fill();
    // Right curtain
    ctx.beginPath();
    ctx.moveTo(wx + ww + 8, wy - 5);
    ctx.quadraticCurveTo(wx + ww + 2, wy + wh * 0.3, wx + ww + 6, wy + wh + 8);
    ctx.lineTo(wx + ww + 14, wy + wh + 8);
    ctx.quadraticCurveTo(wx + ww + 12, wy + wh * 0.5, wx + ww + 14, wy - 5);
    ctx.fill();
    // Curtain rod
    ctx.strokeStyle = 'rgba(180,150,120,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wx - 18, wy - 6); ctx.lineTo(wx + ww + 18, wy - 6); ctx.stroke();

    // Moon light beam on floor
    ctx.save();
    ctx.globalAlpha = 0.04 + Math.sin(t * 0.5) * 0.01;
    ctx.fillStyle = '#C0D0FF';
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh);
    ctx.lineTo(wx - 40, H);
    ctx.lineTo(wx + ww + 40, H);
    ctx.lineTo(wx + ww, wy + wh);
    ctx.fill();
    ctx.restore();

    // Floor (wood planks)
    var floorY = H * 0.78;
    var floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
    floorGrad.addColorStop(0, 'rgba(80,60,45,0.2)');
    floorGrad.addColorStop(1, 'rgba(60,45,35,0.25)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, W, H - floorY);
    // Plank lines
    ctx.strokeStyle = 'rgba(40,30,20,0.06)';
    ctx.lineWidth = 1;
    for (var pl = 0; pl < W; pl += 30 + (pl % 3) * 10) {
      ctx.beginPath(); ctx.moveTo(pl, floorY); ctx.lineTo(pl, H); ctx.stroke();
    }
    // Baseboard
    ctx.fillStyle = 'rgba(100,80,60,0.1)';
    ctx.fillRect(0, floorY - 3, W, 6);

    // Poster on wall (small rectangle)
    ctx.fillStyle = 'rgba(80,100,120,0.08)';
    ctx.fillRect(W * 0.05, H * 0.12, 28, 36);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeRect(W * 0.05, H * 0.12, 28, 36);

    // Pile of clothes on floor
    ctx.fillStyle = 'rgba(90,70,110,0.1)';
    ctx.beginPath();
    ctx.ellipse(W * 0.15, H * 0.82, 18, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,80,60,0.08)';
    ctx.beginPath();
    ctx.ellipse(W * 0.18, H * 0.84, 12, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCampusBg() {
    var W = canvasW, H = canvasH, t = animTime;
    // Sky with clouds
    var skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    skyGrad.addColorStop(0, 'rgba(60,80,140,0.08)');
    skyGrad.addColorStop(1, 'rgba(80,100,160,0)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.5);

    // Clouds (slow moving)
    ctx.fillStyle = 'rgba(150,160,180,0.06)';
    for (var ci = 0; ci < 3; ci++) {
      var cx = ((ci * 180 + t * 4) % (W + 120)) - 60;
      var cy = H * 0.08 + ci * 20;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 40 + ci * 8, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 25, cy - 5, 25, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 20, cy + 3, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Distant buildings (skyline)
    ctx.fillStyle = 'rgba(25,35,55,0.1)';
    var buildings = [
      { x: 0.02, w: 0.06, h: 0.25 }, { x: 0.09, w: 0.04, h: 0.35 },
      { x: 0.14, w: 0.07, h: 0.2 }, { x: 0.22, w: 0.03, h: 0.4 }
    ];
    for (var bi = 0; bi < buildings.length; bi++) {
      var b = buildings[bi];
      ctx.fillRect(W * b.x, H * (0.7 - b.h), W * b.w, H * b.h);
      // Windows
      ctx.fillStyle = 'rgba(255,220,120,' + (0.06 + Math.sin(t + bi * 2) * 0.03) + ')';
      for (var bwy = 0; bwy < 4; bwy++) {
        for (var bwx = 0; bwx < 2; bwx++) {
          ctx.fillRect(W * b.x + 4 + bwx * (W * b.w * 0.4), H * (0.7 - b.h) + 8 + bwy * (H * b.h * 0.22), 4, 6);
        }
      }
      ctx.fillStyle = 'rgba(25,35,55,0.1)';
    }

    // Library building (main, detailed)
    var lx = W * 0.04, ly = H * 0.18, lw = W * 0.17, lh = H * 0.52;
    var libGrad = ctx.createLinearGradient(lx, ly, lx + lw, ly + lh);
    libGrad.addColorStop(0, 'rgba(40,50,75,0.2)');
    libGrad.addColorStop(1, 'rgba(30,40,60,0.25)');
    ctx.fillStyle = libGrad;
    ctx.fillRect(lx, ly, lw, lh);
    // Roof
    ctx.fillStyle = 'rgba(50,60,80,0.2)';
    ctx.beginPath();
    ctx.moveTo(lx - 5, ly); ctx.lineTo(lx + lw / 2, ly - 15); ctx.lineTo(lx + lw + 5, ly); ctx.fill();
    // Door
    ctx.fillStyle = 'rgba(100,80,60,0.15)';
    ctx.fillRect(lx + lw * 0.35, ly + lh * 0.6, lw * 0.3, lh * 0.4);
    // Warm windows (3 rows)
    for (var wy = 0; wy < 3; wy++) {
      for (var wx2 = 0; wx2 < 3; wx2++) {
        var winGlow = 0.08 + Math.sin(t * 1.5 + wy * 1.2 + wx2 * 0.8) * 0.04;
        ctx.fillStyle = 'rgba(255,220,120,' + winGlow + ')';
        ctx.fillRect(lx + 6 + wx2 * (lw * 0.3), ly + 10 + wy * (lh * 0.18), lw * 0.2, lh * 0.12);
      }
    }
    // "LIBRARY" text
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.font = '6px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(I18N.t('aodnLibrary'), lx + lw / 2, ly + lh * 0.58);
    ctx.textAlign = 'left';

    // Trees (multiple, with canopy detail)
    var trees = [{ x: 0.86, s: 1 }, { x: 0.92, s: 0.7 }, { x: 0.78, s: 0.5 }];
    for (var ti = 0; ti < trees.length; ti++) {
      var tr = trees[ti];
      // Trunk
      ctx.fillStyle = 'rgba(60,45,30,' + (0.15 * tr.s + 0.05) + ')';
      ctx.fillRect(W * tr.x - 2, H * 0.35, 5 * tr.s, H * 0.35 * tr.s);
      // Canopy layers
      var leafSway = Math.sin(t * 0.8 + ti) * 2 * tr.s;
      ctx.fillStyle = 'rgba(40,80,40,' + (0.12 * tr.s + 0.03) + ')';
      ctx.beginPath();
      ctx.arc(W * tr.x + leafSway, H * 0.32, 22 * tr.s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(60,100,50,' + (0.08 * tr.s + 0.02) + ')';
      ctx.beginPath();
      ctx.arc(W * tr.x + 8 * tr.s + leafSway, H * 0.28, 16 * tr.s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.arc(W * tr.x - 6 * tr.s + leafSway, H * 0.3, 14 * tr.s, 0, Math.PI * 2); ctx.fill();
    }

    // Ground (layered grass with path)
    var grassGrad = ctx.createLinearGradient(0, H * 0.68, 0, H);
    grassGrad.addColorStop(0, 'rgba(45,85,40,0.12)');
    grassGrad.addColorStop(0.3, 'rgba(55,95,45,0.15)');
    grassGrad.addColorStop(1, 'rgba(35,70,30,0.18)');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);
    // Winding path
    ctx.fillStyle = 'rgba(200,190,170,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.88);
    ctx.bezierCurveTo(W * 0.2, H * 0.8, W * 0.4, H * 0.82, W * 0.6, H * 0.78);
    ctx.bezierCurveTo(W * 0.8, H * 0.74, W * 0.9, H * 0.8, W, H * 0.82);
    ctx.lineTo(W, H * 0.88);
    ctx.bezierCurveTo(W * 0.9, H * 0.86, W * 0.8, H * 0.8, W * 0.6, H * 0.84);
    ctx.bezierCurveTo(W * 0.4, H * 0.88, W * 0.2, H * 0.86, 0, H * 0.94);
    ctx.fill();

    // Lamp post
    ctx.strokeStyle = 'rgba(80,80,80,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.35); ctx.lineTo(W * 0.5, H * 0.72); ctx.stroke();
    // Lamp glow
    var lampGlow = ctx.createRadialGradient(W * 0.5, H * 0.34, 2, W * 0.5, H * 0.34, 20);
    lampGlow.addColorStop(0, 'rgba(255,220,150,' + (0.12 + Math.sin(t) * 0.03) + ')');
    lampGlow.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.34, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.2)';
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.34, 4, 0, Math.PI * 2); ctx.fill();

    // Bench
    ctx.fillStyle = 'rgba(90,70,50,0.12)';
    ctx.fillRect(W * 0.42, H * 0.73, 24, 4);
    ctx.fillRect(W * 0.43, H * 0.68, 22, 5);
    ctx.fillRect(W * 0.44, H * 0.77, 2, 6);
    ctx.fillRect(W * 0.62, H * 0.77, 2, 6);
  }

  function drawNightDeskBg() {
    var W = canvasW, H = canvasH, t = animTime;
    // Very dark room overlay
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, W, H);

    // Screen cone of light (volumetric)
    ctx.save();
    var glow = ctx.createRadialGradient(W * 0.68, H * 0.35, 5, W * 0.68, H * 0.45, 150);
    glow.addColorStop(0, 'rgba(80,180,255,0.1)');
    glow.addColorStop(0.3, 'rgba(80,180,255,0.04)');
    glow.addColorStop(1, 'rgba(80,180,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Wall with shelf
    ctx.fillStyle = 'rgba(50,45,55,0.08)';
    ctx.fillRect(W * 0.02, H * 0.2, W * 0.2, 4);
    // Books on shelf
    var bookColors = ['rgba(180,60,60,0.1)', 'rgba(60,60,180,0.1)', 'rgba(60,140,60,0.08)', 'rgba(180,140,60,0.08)', 'rgba(120,60,140,0.1)'];
    for (var bk = 0; bk < 5; bk++) {
      ctx.fillStyle = bookColors[bk];
      var bkh = 12 + (bk * 3) % 8;
      ctx.fillRect(W * 0.03 + bk * 10, H * 0.2 - bkh, 7, bkh);
    }

    // Window (dark cityscape)
    var winX = W * 0.82, winY = H * 0.06, winW = W * 0.14, winH = H * 0.24;
    ctx.fillStyle = 'rgba(10,15,30,0.3)';
    ctx.fillRect(winX, winY, winW, winH);
    ctx.strokeStyle = 'rgba(80,70,60,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(winX, winY, winW, winH);
    ctx.beginPath(); ctx.moveTo(winX + winW / 2, winY); ctx.lineTo(winX + winW / 2, winY + winH); ctx.stroke();
    // City skyline
    ctx.fillStyle = 'rgba(20,25,40,0.3)';
    var skyline = [0.15, 0.25, 0.1, 0.3, 0.18, 0.22, 0.12];
    for (var sk = 0; sk < skyline.length; sk++) {
      ctx.fillRect(winX + 2 + sk * (winW / 7), winY + winH * (1 - skyline[sk]), winW / 8, winH * skyline[sk]);
    }
    // Tiny city lights (twinkling)
    for (var cl = 0; cl < 12; cl++) {
      var clA = 0.1 + Math.sin(t * 4 + cl * 3.7) * 0.08;
      ctx.fillStyle = 'rgba(255,200,100,' + clA + ')';
      ctx.fillRect(winX + 3 + (cl * 9) % winW, winY + winH * 0.5 + (cl * 7) % (winH * 0.4), 1.5, 1.5);
    }

    // Notification light on phone (red blink)
    if (Math.sin(t * 2) > 0.5) {
      ctx.fillStyle = 'rgba(255,60,60,0.3)';
      ctx.beginPath(); ctx.arc(W * 0.15, H * 0.65, 2, 0, Math.PI * 2); ctx.fill();
      var phonGlow = ctx.createRadialGradient(W * 0.15, H * 0.65, 1, W * 0.15, H * 0.65, 8);
      phonGlow.addColorStop(0, 'rgba(255,60,60,0.1)');
      phonGlow.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = phonGlow;
      ctx.beginPath(); ctx.arc(W * 0.15, H * 0.65, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Floor
    ctx.fillStyle = 'rgba(35,30,40,0.12)';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);

    // Crumpled paper near desk
    ctx.fillStyle = 'rgba(200,195,185,0.06)';
    ctx.beginPath(); ctx.arc(W * 0.45, H * 0.85, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.48, H * 0.87, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawPanicRoomBg() {
    var W = canvasW, H = canvasH, t = animTime;
    // Intense pulsing red vignette
    var pulse = Math.sin(t * 2);
    var vigIntensity = 0.04 + pulse * 0.03;
    var vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.15, W * 0.5, H * 0.5, H * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.6, 'rgba(100,15,15,' + vigIntensity * 0.5 + ')');
    vig.addColorStop(1, 'rgba(120,20,20,' + vigIntensity + ')');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Screen light (harsh, blue-white)
    var screenGlow = ctx.createRadialGradient(W * 0.68, H * 0.4, 5, W * 0.68, H * 0.4, 100);
    screenGlow.addColorStop(0, 'rgba(100,140,255,0.08)');
    screenGlow.addColorStop(1, 'rgba(100,140,255,0)');
    ctx.fillStyle = screenGlow;
    ctx.fillRect(0, 0, W, H);

    // Wall clock (large, prominent)
    var clkX = W * 0.12, clkY = H * 0.16, clkR = 22;
    // Clock face
    ctx.fillStyle = 'rgba(30,25,35,0.2)';
    ctx.beginPath(); ctx.arc(clkX, clkY, clkR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(clkX, clkY, clkR, 0, Math.PI * 2); ctx.stroke();
    // Hour markers
    for (var hm = 0; hm < 12; hm++) {
      var ha = (hm / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(clkX + Math.cos(ha) * (clkR - 5) - 1, clkY + Math.sin(ha) * (clkR - 5) - 1, 2, 2);
    }
    // Hands (pointing to ~2:00)
    var minAngle = t * 0.8;
    var hourAngle = -Math.PI / 3; // ~2 o'clock
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(clkX, clkY);
    ctx.lineTo(clkX + Math.cos(hourAngle) * (clkR * 0.5), clkY + Math.sin(hourAngle) * (clkR * 0.5));
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(clkX, clkY);
    ctx.lineTo(clkX + Math.cos(minAngle) * (clkR * 0.7), clkY + Math.sin(minAngle) * (clkR * 0.7));
    ctx.stroke();
    // Second hand (red, sweeping)
    ctx.strokeStyle = 'rgba(255,80,80,0.2)';
    ctx.lineWidth = 1;
    var secAngle = t * 6;
    ctx.beginPath();
    ctx.moveTo(clkX, clkY);
    ctx.lineTo(clkX + Math.cos(secAngle) * (clkR * 0.65), clkY + Math.sin(secAngle) * (clkR * 0.65));
    ctx.stroke();
    // Center dot
    ctx.fillStyle = 'rgba(255,80,80,0.3)';
    ctx.beginPath(); ctx.arc(clkX, clkY, 2, 0, Math.PI * 2); ctx.fill();

    // "2:00 AM" digital display
    ctx.fillStyle = 'rgba(255,60,60,' + (0.15 + pulse * 0.08) + ')';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(I18N.t('aodn2AM'), clkX, clkY + clkR + 14);
    ctx.textAlign = 'left';

    // Scattered papers / sticky notes
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#FFE066';
    ctx.save(); ctx.translate(W * 0.08, H * 0.5); ctx.rotate(-0.1);
    ctx.fillRect(0, 0, 16, 16); ctx.restore();
    ctx.fillStyle = '#FF9999';
    ctx.save(); ctx.translate(W * 0.13, H * 0.48); ctx.rotate(0.15);
    ctx.fillRect(0, 0, 14, 14); ctx.restore();
    ctx.fillStyle = '#99CCFF';
    ctx.save(); ctx.translate(W * 0.06, H * 0.55); ctx.rotate(-0.2);
    ctx.fillRect(0, 0, 15, 15); ctx.restore();
    ctx.restore();

    // Energy drink cans
    ctx.fillStyle = 'rgba(60,200,60,0.08)';
    ctx.fillRect(W * 0.2, H * 0.72, 6, 12);
    ctx.fillStyle = 'rgba(200,60,60,0.08)';
    ctx.fillRect(W * 0.23, H * 0.73, 6, 12);

    // Floor
    ctx.fillStyle = 'rgba(40,25,25,0.12)';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);

    // Stress lines radiating from center (subtle)
    ctx.save();
    ctx.globalAlpha = 0.02 + pulse * 0.015;
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 1;
    for (var sl = 0; sl < 12; sl++) {
      var sa = (sl / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + Math.cos(sa) * 60, H * 0.5 + Math.sin(sa) * 45);
      ctx.lineTo(W * 0.5 + Math.cos(sa) * 200, H * 0.5 + Math.sin(sa) * 150);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMindscapeBg() {
    var W = canvasW, H = canvasH, t = animTime;
    // Dawn horizon gradient (complex)
    var dawnGrad = ctx.createLinearGradient(0, 0, 0, H);
    dawnGrad.addColorStop(0, 'rgba(50,35,20,0.1)');
    dawnGrad.addColorStop(0.3, 'rgba(120,80,30,0.05)');
    dawnGrad.addColorStop(0.5, 'rgba(255,160,50,0.08)');
    dawnGrad.addColorStop(0.7, 'rgba(255,200,80,0.1)');
    dawnGrad.addColorStop(1, 'rgba(255,220,120,0.12)');
    ctx.fillStyle = dawnGrad;
    ctx.fillRect(0, 0, W, H);

    // Sun rising (bottom center)
    var sunY = H * 0.65 + Math.sin(t * 0.2) * 5;
    var sunGlow = ctx.createRadialGradient(W * 0.5, sunY, 5, W * 0.5, sunY, 120);
    sunGlow.addColorStop(0, 'rgba(255,220,100,0.15)');
    sunGlow.addColorStop(0.3, 'rgba(255,180,60,0.06)');
    sunGlow.addColorStop(1, 'rgba(255,150,30,0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath(); ctx.arc(W * 0.5, sunY, 120, 0, Math.PI * 2); ctx.fill();
    // Sun disc
    ctx.fillStyle = 'rgba(255,230,150,0.2)';
    ctx.beginPath(); ctx.arc(W * 0.5, sunY, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,200,0.25)';
    ctx.beginPath(); ctx.arc(W * 0.5, sunY, 10, 0, Math.PI * 2); ctx.fill();

    // Light rays (god rays, rotating slowly)
    ctx.save();
    ctx.globalAlpha = 0.025;
    for (var ri = 0; ri < 8; ri++) {
      var rayAngle = (ri / 8) * Math.PI * 2 + t * 0.05;
      ctx.fillStyle = ri % 2 === 0 ? '#FFD700' : '#FFA500';
      ctx.beginPath();
      ctx.moveTo(W * 0.5, sunY);
      ctx.lineTo(W * 0.5 + Math.cos(rayAngle - 0.04) * 300, sunY + Math.sin(rayAngle - 0.04) * 300);
      ctx.lineTo(W * 0.5 + Math.cos(rayAngle + 0.04) * 300, sunY + Math.sin(rayAngle + 0.04) * 300);
      ctx.fill();
    }
    ctx.restore();

    // Floating memory orbs (larger, with inner detail)
    for (var mi = 0; mi < 8; mi++) {
      var mx = (mi * 73 + t * 6) % (W + 80) - 40;
      var my = H * 0.15 + Math.sin(t * 0.4 + mi * 1.3) * 35;
      var ms = 8 + mi * 2.5;
      var ma = 0.03 + Math.sin(t * 0.6 + mi) * 0.015;
      // Outer glow
      var orbGlow = ctx.createRadialGradient(mx, my, ms * 0.3, mx, my, ms * 2);
      orbGlow.addColorStop(0, 'rgba(255,200,80,' + ma + ')');
      orbGlow.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = orbGlow;
      ctx.beginPath(); ctx.arc(mx, my, ms * 2, 0, Math.PI * 2); ctx.fill();
      // Core
      ctx.fillStyle = 'rgba(255,220,120,' + (ma * 2) + ')';
      ctx.beginPath(); ctx.arc(mx, my, ms, 0, Math.PI * 2); ctx.fill();
      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,' + (ma * 0.8) + ')';
      ctx.beginPath(); ctx.arc(mx - ms * 0.2, my - ms * 0.2, ms * 0.3, 0, Math.PI * 2); ctx.fill();
    }

    // Abstract ground (rolling hills)
    ctx.fillStyle = 'rgba(80,60,20,0.06)';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.75);
    for (var hx = 0; hx <= W; hx += 20) {
      ctx.lineTo(hx, H * 0.75 + Math.sin(hx * 0.015 + t * 0.3) * 8);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();

    // Second hill layer
    ctx.fillStyle = 'rgba(100,75,25,0.04)';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.82);
    for (var hx2 = 0; hx2 <= W; hx2 += 20) {
      ctx.lineTo(hx2, H * 0.82 + Math.sin(hx2 * 0.02 + 1 + t * 0.2) * 6);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();

    // Tiny flowers on ground
    ctx.globalAlpha = 0.06;
    var flowerColors = ['#FFD700', '#FF8C00', '#C4A97D', '#FFA07A'];
    for (var fi = 0; fi < 12; fi++) {
      ctx.fillStyle = flowerColors[fi % flowerColors.length];
      var fx = (fi * 47) % W;
      var fy = H * 0.78 + Math.sin(fx * 0.015 + t * 0.3) * 8 + (fi % 3) * 4;
      ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMeter() {
    meterDisplay += (window._.procrastination - meterDisplay) * 0.08;

    var mw = canvasW * 0.6;
    var mh = 12;
    var mx = (canvasW - mw) / 2;
    var my = canvasH - 28;
    var fillW = Math.max(0, (meterDisplay / 100) * mw);
    var t = animTime;

    // Meter shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.roundRect(mx + 1, my + 2, mw, mh, 6);
    ctx.fill();

    // Background track
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 6);
    ctx.fill();
    // Inner track texture
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.roundRect(mx + 1, my + 1, mw - 2, mh / 2, 4);
    ctx.fill();

    // Fill gradient (multi-stop)
    if (fillW > 2) {
      var mGrad = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      mGrad.addColorStop(0, '#22c55e');
      mGrad.addColorStop(0.3, '#84cc16');
      mGrad.addColorStop(0.5, '#eab308');
      mGrad.addColorStop(0.7, '#f97316');
      mGrad.addColorStop(1, '#ef4444');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.roundRect(mx, my, fillW, mh, 6);
      ctx.fill();

      // Glossy highlight on fill
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(mx + 1, my + 1, fillW - 2, mh * 0.4, 4);
      ctx.fill();

      // Animated shimmer on fill
      var shimmerX = mx + ((t * 60) % (mw + 40)) - 20;
      if (shimmerX < mx + fillW) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(mx, my, fillW, mh, 6);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.moveTo(shimmerX, my);
        ctx.lineTo(shimmerX + 15, my);
        ctx.lineTo(shimmerX + 8, my + mh);
        ctx.lineTo(shimmerX - 7, my + mh);
        ctx.fill();
        ctx.restore();
      }
    }

    // Extreme pulse (more dramatic)
    if (meterDisplay > 80 || meterDisplay < 20) {
      var pulse = Math.sin(t * 6) * 0.4 + 0.3;
      var pulseColor = meterDisplay > 80 ? 'rgba(239,68,68,' : 'rgba(74,222,128,';
      // Outer glow
      ctx.save();
      ctx.shadowColor = meterDisplay > 80 ? '#ef4444' : '#4ade80';
      ctx.shadowBlur = 8 + pulse * 6;
      ctx.fillStyle = pulseColor + (pulse * 0.5) + ')';
      ctx.beginPath();
      ctx.roundRect(mx, my, fillW, mh, 6);
      ctx.fill();
      ctx.restore();
    }

    // Notch marks
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (var ni = 1; ni < 4; ni++) {
      var nx = mx + (mw * ni / 4);
      ctx.beginPath(); ctx.moveTo(nx, my + 2); ctx.lineTo(nx, my + mh - 2); ctx.stroke();
    }

    // Sloth icon (left)
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🦥', mx - 4, my + mh - 1);

    // Clock icon (right)
    ctx.textAlign = 'left';
    ctx.fillText('⏰', mx + mw + 4, my + mh - 1);

    // Label
    ctx.font = '9px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(I18N.t('aodnProcrastination'), canvasW / 2, my - 5);
    // Percentage
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px "Space Grotesk", sans-serif';
    ctx.fillText(Math.round(meterDisplay) + '%', canvasW / 2, my + mh + 10);
    ctx.textAlign = 'left';
  }

  /* ── Dialogue UI ── */
  function showDialogue(speaker, text, speakerInfo) {
    dialogueBox.classList.add('active');
    choiceContainer.innerHTML = '';
    choiceContainer.classList.remove('active');
    clickPrompt.style.display = 'none';

    if (speakerInfo.name) {
      speakerLabel.textContent = speakerInfo.name;
      speakerLabel.style.color = speakerInfo.color;
      speakerLabel.style.display = 'block';
    } else {
      speakerLabel.style.display = 'none';
    }

    if (speaker === 's') {
      Characters.setExpression('sleepy', 'smile');
      Characters.setSpeaking(true);
      Characters.tiltHead(0);
      // React to text content
      if (text.indexOf('!') !== -1) Characters.setExpression('wide', 'open');
      if (text.indexOf('sorry') !== -1 || text.indexOf('Sorry') !== -1) Characters.setExpression('concerned', 'worried');
      if (text.indexOf('impressed') !== -1 || text.indexOf('not bad') !== -1) Characters.setExpression('happy', 'smile');
    } else if (speaker === 'm') {
      Characters.setExpression('concerned', 'neutral');
      Characters.tiltHead(-0.5); // tilt listening
      if (text.indexOf('!') !== -1) Characters.setExpression('wide', 'worried');
      if (text.indexOf('can\'t') !== -1 || text.indexOf('fail') !== -1) Characters.setExpression('concerned', 'worried');
    } else {
      // Narrator
      Characters.tiltHead(0);
      Characters.setExpression('sleepy', 'neutral');
    }

    var charDelay = 30;
    var charCount = 0;
    currentReveal = DialogueEngine.revealText(dialogueText, text, charDelay,
      function onChar() {
        charCount++;
        if (charCount % 2 === 0) window.GameAudio.blip(speakerInfo.blipPitch);
        if (charCount % 3 === 0) Characters.toggleMouth();
      },
      function onDone() {
        Characters.setSpeaking(false);
        Characters.sloth.mouthOpen = false;
        clickPrompt.style.display = 'block';
        currentReveal = null;
      }
    );
  }

  function showChoices(choices) {
    dialogueBox.classList.add('active');
    clickPrompt.style.display = 'none';
    choiceContainer.innerHTML = '';
    choiceContainer.classList.add('active');

    Characters.setExpression('wide', 'smile');
    Characters.react();

    choices.forEach(function (choice) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', function () {
        window.GameAudio.clickSfx();
        choiceContainer.classList.remove('active');
        executor.choose(choice.target);
      });
      choiceContainer.appendChild(btn);
    });
  }

  /* ── Click/tap to advance ── */
  function onAdvance(e) {
    if (e.target.closest('.choice-btn') || e.target.closest('.chapter-select-btn') ||
        e.target.closest('.chapter-nav-btn') || e.target.closest('.ch-select-close')) return;

    window.GameAudio.init();

    if (showingChapterSelect) return;
    if (fadeDirection !== 0) return;

    if (!gameStarted) {
      startChapter(currentChapter, true);
      return;
    }

    if (currentReveal && !currentReveal.done) {
      currentReveal.skip();
    } else if (executor) {
      clickPrompt.style.display = 'none';
      executor.advance();
    }
  }

  /* ── Chapter management ── */
  function startChapter(ch, skipFade) {
    if (!skipFade && gameStarted) {
      // Fade out, then load new chapter
      dialogueBox.classList.remove('active');
      choiceContainer.classList.remove('active');
      fadeOut(function () { loadChapter(ch); });
      return;
    }
    loadChapter(ch);
  }

  function loadChapter(ch) {
    currentChapter = ch;
    window._.CHAPTER = ch;
    gameStarted = true;
    showingChapterSelect = false;
    document.getElementById('startOverlay').style.display = 'none';
    hideChapterSelect();

    // Clear old atmospheric particles
    atmoParticles = [];
    particles = [];

    // Set palette
    targetBgColor = chapterPalette[ch] || '#2D1B4E';

    // Ambient
    window.GameAudio.startAmbient(chapterAmbientFreq[ch] || 110);
    window._.chapterStartTime = Date.now();

    // Update subtitle
    var subtitle = document.querySelector('.game__header p');
    if (subtitle) subtitle.textContent = I18N.t('aodnChapter') + ' ' + ch + ': ' + (CHAPTER_NAMES[ch] || '');

    // Show title card
    showTitleCard(CHAPTER_NAMES[ch] || '');

    // Fade in
    fadeIn();

    // Load chapter source — prefer translated script, fall back to English
    var chapterScript = getChapterScript(ch);
    if (!chapterScript) {
      console.error('Chapter ' + ch + ' not loaded');
      return;
    }

    var sections = DialogueEngine.parse(chapterScript);

    executor = new DialogueEngine.Executor(sections, {
      onDialogue: showDialogue,
      onChoices: showChoices,
      onWait: function () { dialogueBox.classList.remove('active'); },
      onExec: function (code) {
        if (code.indexOf('adjustMeter') !== -1 || code.indexOf('procrastination') !== -1) {
          window.GameAudio.meterTone(window._.procrastination > meterDisplay ? 1 : -1);
        }
      },
      onEnd: function () { onChapterEnd(ch); }
    });

    executor.goto('start');
    GameState.save();
  }

  /* ── Chapter end ── */
  function onChapterEnd(ch) {
    // Discover ending
    var endingKey = 'ch' + ch + '_ending';
    var ending = window._[endingKey] || 'default';
    GameState.discoverEnding('ch' + ch + '_' + ending);

    // Chapter-specific achievements
    checkChapterAchievements(ch);

    // Speed reader check (all chapters)
    var elapsed = (Date.now() - window._.chapterStartTime) / 1000;
    if (elapsed < 180) GameState.unlockAchievement('speed_reader');

    // All Ch1 endings
    var ch1Endings = window._.endingsDiscovered.filter(function (e) { return e.startsWith('ch1_'); });
    if (ch1Endings.length >= 3) GameState.unlockAchievement('all_endings_ch1');

    // Ch5 redemption
    if (ch === 5) GameState.unlockAchievement('redemption');

    // Fourth wall break
    if (window._.fourthWall) GameState.unlockAchievement('self_aware');

    // Completionist check (13 total endings: 3+4+5+4+3)
    if (window._.endingsDiscovered.length >= 13) GameState.unlockAchievement('completionist');

    var prevBest = GameState.getBest();
    var score = GameState.completeChapter(ch);
    updateScoreDisplay();

    // Show results with next chapter option
    dialogueBox.classList.add('active');
    speakerLabel.style.display = 'none';

    var endingName = getEndingName(ch, ending);
    var html = '<div class="ending-text">' + I18N.t('aodnChapter') + ' ' + ch + ' ' + I18N.t('aodnComplete') + '</div>' +
      '<div class="ending-subtitle">' + I18N.t('aodnEnding') + ': ' + endingName + '</div>';
    dialogueText.innerHTML = html;

    // Show next chapter / chapter select buttons
    choiceContainer.innerHTML = '';
    choiceContainer.classList.add('active');
    clickPrompt.style.display = 'none';

    if (ch < 5) {
      var nextBtn = document.createElement('button');
      nextBtn.className = 'choice-btn chapter-nav-btn';
      nextBtn.textContent = I18N.t('aodnNext') + ': ' + I18N.t('aodnChapter') + ' ' + (ch + 1) + ' — ' + CHAPTER_NAMES[ch + 1];
      nextBtn.addEventListener('click', function () {
        choiceContainer.classList.remove('active');
        startChapter(ch + 1);
      });
      choiceContainer.appendChild(nextBtn);
    } else {
      // Game complete
      showFinalScore(score);
    }

    var selectBtn = document.createElement('button');
    selectBtn.className = 'choice-btn chapter-nav-btn';
    selectBtn.textContent = I18N.t('aodnChapterSelect');
    selectBtn.addEventListener('click', function () {
      choiceContainer.classList.remove('active');
      dialogueBox.classList.remove('active');
      showChapterSelectMenu();
    });
    choiceContainer.appendChild(selectBtn);

    var replayBtn = document.createElement('button');
    replayBtn.className = 'choice-btn chapter-nav-btn';
    replayBtn.textContent = I18N.t('aodnReplayChapter') + ' ' + ch;
    replayBtn.addEventListener('click', function () {
      choiceContainer.classList.remove('active');
      startChapter(ch);
    });
    choiceContainer.appendChild(replayBtn);

    // SlayPlay integration — only report and show score card on final chapter
    if (ch === 5) {
      if (typeof Arcade !== 'undefined') {
        Arcade.onGameOver('art-of-doing-nothing', score);
        document.body.appendChild(Arcade.createScoreCard('art-of-doing-nothing', score, prevBest));
      }
      if (typeof Leaderboard !== 'undefined' && score > 0) {
        Leaderboard.submitScore('art-of-doing-nothing', score).then(function () {
          Leaderboard.refresh('art-of-doing-nothing');
        });
      }
    }
  }

  function checkChapterAchievements(ch) {
    if (ch === 1) {
      if (window._.snoozeCount >= 3) GameState.unlockAchievement('snooze_king');
      if (!window._.snoozed && !window._.checkedPhone) GameState.unlockAchievement('early_bird');
      if (window._.checkedPhone && window._.scrolledDeep) GameState.unlockAchievement('scroll_hole');
    }
    // More achievements triggered by state flags in chapters themselves
  }

  function showFinalScore(score) {
    // Calculate aggregate ending quality
    var endings = window._;
    var growth = 0;
    if (endings.ch1_ending === 'productive') growth++;
    if (endings.ch2_ending === 'connection' || endings.ch2_ending === 'effort') growth++;
    if (endings.ch3_ending === 'discipline') growth++;
    if (endings.ch4_ending === 'breakthrough' || endings.ch4_ending === 'supported') growth++;
    if (endings.ch5_ending === 'integration' || endings.ch5_ending === 'growth') growth++;

    var endText = '';
    if (growth >= 4) {
      endText = I18N.t('aodnFinalGood');
    } else if (growth >= 2) {
      endText = I18N.t('aodnFinalMid');
    } else {
      endText = I18N.t('aodnFinalLow');
    }

    dialogueText.innerHTML += '<div class="ending-subtitle" style="margin-top:12px">' + endText + '</div>' +
      '<div class="ending-subtitle">' + I18N.t('aodnFinalScore') + ': ' + score + '</div>';
  }

  function updateScoreDisplay() {
    var scoreEl = document.getElementById('score');
    var bestEl = document.getElementById('bestScore');
    if (scoreEl) scoreEl.textContent = GameState.calcScore();
    if (bestEl) bestEl.textContent = GameState.getBest();
  }

  var ENDING_KEYS = {
    comfort: 'aodnEndComfort',
    productive: 'aodnEndProductive',
    stress: 'aodnEndStress',
    connection: 'aodnEndConnection',
    effort: 'aodnEndEffort',
    avoidance: 'aodnEndAvoidance',
    isolation: 'aodnEndIsolation',
    discipline: 'aodnEndDiscipline',
    balance: 'aodnEndBalance',
    recovery: 'aodnEndRecovery',
    lost: 'aodnEndLost',
    breakthrough: 'aodnEndBreakthrough',
    grit: 'aodnEndGrit',
    supported: 'aodnEndSupported',
    surrender: 'aodnEndSurrender',
    integration: 'aodnEndIntegration',
    willpower: 'aodnEndWillpower',
    growth: 'aodnEndGrowth'
  };

  function getEndingName(ch, ending) {
    var key = ENDING_KEYS[ending];
    return key ? I18N.t(key) : ending;
  }

  /* ── Chapter Select ── */
  function showChapterSelectMenu() {
    showingChapterSelect = true;
    var overlay = document.getElementById('chapterSelectOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    var list = overlay.querySelector('.chapter-list');
    list.innerHTML = '';

    for (var i = 1; i <= 5; i++) {
      var completed = window._.chaptersCompleted.indexOf(i) !== -1;
      var unlocked = i === 1 || window._.chaptersCompleted.indexOf(i - 1) !== -1;
      var btn = document.createElement('button');
      btn.className = 'chapter-select-btn' + (completed ? ' completed' : '') + (unlocked ? '' : ' locked');
      btn.setAttribute('data-ch', i);

      var endings = window._.endingsDiscovered.filter(function (e) { return e.startsWith('ch' + i + '_'); });
      var maxEndings = [0, 3, 4, 5, 4, 3][i];

      btn.innerHTML = '<span class="ch-num">' + I18N.t('aodnChapter') + ' ' + i + '</span>' +
        '<span class="ch-title">' + CHAPTER_NAMES[i] + '</span>' +
        '<span class="ch-endings">' + endings.length + '/' + maxEndings + ' ' + I18N.t('aodnEndings') + '</span>' +
        (unlocked ? '' : '<span class="ch-lock">' + I18N.t('aodnLocked') + '</span>');

      if (unlocked) {
        (function (ch) {
          btn.addEventListener('click', function () {
            hideChapterSelect();
            startChapter(ch);
          });
        })(i);
      }

      list.appendChild(btn);
    }
  }

  function hideChapterSelect() {
    showingChapterSelect = false;
    var overlay = document.getElementById('chapterSelectOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  /* ── Resize ── */
  function resize() {
    var container = document.getElementById('canvasContainer');
    canvasW = Math.min(container.clientWidth, 540);
    canvasH = Math.round(canvasW * 0.75);
    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
  }

  /* ── Init ── */
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    dialogueBox = document.getElementById('dialogueBox');
    speakerLabel = document.getElementById('speakerLabel');
    dialogueText = document.getElementById('dialogueText');
    choiceContainer = document.getElementById('choiceContainer');
    clickPrompt = document.getElementById('clickPrompt');
    muteBtn = document.getElementById('muteButton');

    if (typeof I18N !== 'undefined') {
      I18N.createSelector(document.querySelector('.game__header'));
      I18N.applyDOM();
      window.addEventListener('langchange', function () { I18N.applyDOM(); });
    }

    GameState.load();
    currentChapter = window._.CHAPTER || 1;
    targetBgColor = chapterPalette[currentChapter] || '#2D1B4E';
    bgColor = targetBgColor;
    updateScoreDisplay();

    resize();
    window.addEventListener('resize', resize);

    // Canvas mouse tracking (sloth eyes follow cursor)
    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) / rect.width * canvasW;
      var my = (e.clientY - rect.top) / rect.height * canvasH;
      // Normalize to -1..1 relative to sloth position
      var sx = (mx - canvasW * 0.3) / (canvasW * 0.4);
      var sy = (my - canvasH * 0.45) / (canvasH * 0.4);
      Characters.lookAt(sx, sy);
      // Tilt head slightly toward mouse
      Characters.tiltHead(sx * 0.5);
    });

    canvas.addEventListener('mouseleave', function () {
      Characters.lookAt(0, 0);
      Characters.tiltHead(0);
    });

    // Click on sloth for reactions
    var slothClickEmotes = ['💤', '😴', '🦥', '☕', '💭', '😌', '🫠', '✨'];
    var slothClickIndex = 0;
    canvas.addEventListener('click', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) / rect.width * canvasW;
      var my = (e.clientY - rect.top) / rect.height * canvasH;
      if (Characters.hitTest(mx, my) && slothClickCooldown <= 0) {
        Characters.react();
        Characters.wave();
        Characters.emote(slothClickEmotes[slothClickIndex % slothClickEmotes.length]);
        slothClickIndex++;
        slothClickCooldown = 30;
        window.GameAudio.clickSfx();
      }
    });

    // Click to advance
    document.addEventListener('click', onAdvance);
    document.addEventListener('touchend', function (e) {
      if (e.target.closest('.choice-btn') || e.target.closest('#muteButton') ||
          e.target.closest('#restartButton') || e.target.closest('.back-link') ||
          e.target.closest('#leaderboardToggle') || e.target.closest('#chapterSelectBtn') ||
          e.target.closest('.chapter-select-btn') || e.target.closest('.ch-select-close')) return;
      e.preventDefault();
      onAdvance(e);
    });

    // Mute button
    if (muteBtn) {
      muteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var m = window.GameAudio.toggleMute();
        muteBtn.textContent = m ? '🔇' : '🔊';
      });
      muteBtn.textContent = window.GameAudio.isMuted() ? '🔇' : '🔊';
    }

    // Restart button
    var restartBtn = document.getElementById('restartButton');
    if (restartBtn) {
      restartBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        GameState.reset();
        gameStarted = false;
        currentChapter = 1;
        if (executor) executor.stop();
        executor = null;
        currentReveal = null;
        meterDisplay = 50;
        targetBgColor = chapterPalette[1];
        dialogueBox.classList.remove('active');
        choiceContainer.classList.remove('active');
        document.getElementById('startOverlay').style.display = 'flex';
        hideChapterSelect();
        Characters.setExpression('sleepy', 'smile');
        window.GameAudio.stopAmbient();
        updateScoreDisplay();
      });
    }
    document.addEventListener('arcade-restart', function() {
      GameState.reset(); gameStarted = false; currentChapter = 1;
      if (executor) executor.stop(); executor = null; currentReveal = null;
      meterDisplay = 50; targetBgColor = chapterPalette[1];
      dialogueBox.classList.remove('active'); choiceContainer.classList.remove('active');
      document.getElementById('startOverlay').style.display = 'flex';
      Characters.setExpression('sleepy', 'smile'); window.GameAudio.stopAmbient(); updateScoreDisplay();
    });

    // Chapter select button
    var chSelectBtn = document.getElementById('chapterSelectBtn');
    if (chSelectBtn) {
      chSelectBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (showingChapterSelect) {
          hideChapterSelect();
        } else {
          showChapterSelectMenu();
        }
      });
    }

    // Chapter select close
    var chSelectClose = document.querySelector('.ch-select-close');
    if (chSelectClose) {
      chSelectClose.addEventListener('click', function (e) {
        e.stopPropagation();
        hideChapterSelect();
      });
    }

    // Leaderboard
    if (typeof Leaderboard !== 'undefined') {
      var lbPanel = document.getElementById('leaderboardPanel');
      if (lbPanel) {
        lbPanel.appendChild(Leaderboard.createPanel('art-of-doing-nothing'));
        var lbToggle = document.getElementById('leaderboardToggle');
        if (lbToggle) {
          lbToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            lbPanel.classList.toggle('lb-visible');
          });
        }
      }
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
