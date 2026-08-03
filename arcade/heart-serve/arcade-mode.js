/* ═══════════════════════════════════════════════════════════════
   HeartServe — Arcade Mode (arcade-mode.js)
   Addictive infinite pong loop with adaptive AI, chaos events,
   combo system, and progression
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── Constants ── */
  var PW = 580, PH = 380;
  var PADDLE_W = 12, PADDLE_H = 72, BALL_R = 8;
  var STORAGE_KEY = 'heartServeArcade';
  var TOP10_KEY = 'heartServeArcadeTop10';

  /* ── Helpers ── */
  function $(id) { return document.getElementById(id); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return [r, g, b];
  }
  function rgbStr(r, g, b) { return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')'; }

  /* ── Draw heart utility ── */
  function drawHeart(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.15);
    ctx.bezierCurveTo(x - size * 0.5, y + size * 0.45, x, y + size * 0.6, x, y + size * 0.75);
    ctx.bezierCurveTo(x, y + size * 0.6, x + size * 0.5, y + size * 0.45, x + size * 0.5, y + size * 0.15);
    ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  /* ════════════════════════════════════════════════════════════
     PERSISTENCE
     ════════════════════════════════════════════════════════════ */
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { energy: 0, best: 0, unlocked: [], equipped: {} }; }
    catch(e) { return { energy: 0, best: 0, unlocked: [], equipped: {} }; }
  }
  function saveProgress(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
  function loadTop10() {
    try { return JSON.parse(localStorage.getItem(TOP10_KEY)) || []; }
    catch(e) { return []; }
  }
  function saveTop10(arr) { localStorage.setItem(TOP10_KEY, JSON.stringify(arr)); }

  /* ════════════════════════════════════════════════════════════
     UNLOCK TIERS
     ════════════════════════════════════════════════════════════ */
  var UNLOCKS = [
    { energy: 50,   id: 'trail_pink',    label: 'Pink Trail',    slot: 'trail' },
    { energy: 150,  id: 'paddle_neon',   label: 'Neon Paddle',   slot: 'paddle' },
    { energy: 300,  id: 'ball_heart',    label: 'Heart Ball',    slot: 'ball' },
    { energy: 500,  id: 'trail_rainbow', label: 'Rainbow Trail', slot: 'trail' },
    { energy: 800,  id: 'paddle_fire',   label: 'Fire Paddle',   slot: 'paddle' },
    { energy: 1200, id: 'ball_star',     label: 'Star Ball',     slot: 'ball' }
  ];

  /* ── Equipped cosmetics helper ── */
  function getEquipped() {
    var p = loadProgress();
    return p.equipped || {};
  }
  function equipItem(id) {
    var p = loadProgress();
    for (var i = 0; i < UNLOCKS.length; i++) {
      if (UNLOCKS[i].id === id) { p.equipped[UNLOCKS[i].slot] = id; break; }
    }
    saveProgress(p);
  }
  function unequipSlot(slot) {
    var p = loadProgress();
    delete p.equipped[slot];
    saveProgress(p);
  }

  /* ── Draw star utility ── */
  function drawStar(ctx, cx, cy, outerR, innerR, points) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? outerR : innerR;
      var a = (i * Math.PI / points) - Math.PI / 2;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  /* ════════════════════════════════════════════════════════════
     PERSONALITY MESSAGES
     ════════════════════════════════════════════════════════════ */
  var DEATH_MSGS = {
    low:  ["You fumbled.", "That was tragic.", "Did you even try?", "Yikes.", "Embarrassing."],
    mid:  ["Not bad... not great.", "Getting warmer.", "Almost something.", "You tried."],
    high: ["OKAY SLAY??", "You're cooking.", "That was kinda fire.", "Respect."],
    god:  ["LEGENDARY.", "They'll write songs about this.", "You're HIM.", "Absolutely unhinged."]
  };
  var BEST_MSGS = ["NEW RECORD LET'S GO", "You ate that up.", "PERSONAL BEST."];

  function getDeathMsg(combo, isNewBest) {
    if (isNewBest) return pick(BEST_MSGS);
    if (combo <= 3) return pick(DEATH_MSGS.low);
    if (combo <= 10) return pick(DEATH_MSGS.mid);
    if (combo <= 20) return pick(DEATH_MSGS.high);
    return pick(DEATH_MSGS.god);
  }

  /* ════════════════════════════════════════════════════════════
     CHAOS EVENTS
     ════════════════════════════════════════════════════════════ */
  var CHAOS_TYPES = [
    { id: 'double_ball',    label: 'DOUBLE BALL',    duration: 0 },
    { id: 'speed_burst',    label: 'SPEED BURST',    duration: 120 },
    { id: 'gravity_flip',   label: 'GRAVITY FLIP',   duration: 180 },
    { id: 'shrink_paddle',  label: 'SHRINK PADDLE',  duration: 180 },
    { id: 'slow_motion',    label: 'SLOW MOTION',    duration: 120 },
    { id: 'weird_angle',    label: 'WEIRD ANGLE',    duration: 1 },
    { id: 'multi_ball',     label: 'MULTI BALL',     duration: 0 }
  ];

  /* ════════════════════════════════════════════════════════════
     ADAPTIVE AI
     ════════════════════════════════════════════════════════════ */
  function getAIDifficulty(combo) {
    var d;
    if (combo <= 5)       d = { speed: 0.15, react: 0.15, mistake: 0.12 };
    else if (combo <= 10) d = { speed: 0.28, react: 0.08, mistake: 0.06 };
    else if (combo <= 20) d = { speed: 0.38, react: 0.05, mistake: 0.03 };
    else                  d = { speed: 0.42, react: 0.04, mistake: 0.02 };

    // AI Clutch: combo 15+ scales speed up
    if (combo > 15) {
      var clutch = Math.min((combo - 15) * 0.02, 0.4);
      d.speed *= (1 + clutch);
      d.mistake *= Math.max(0.3, 1 - clutch);
    }
    return d;
  }

  /* ════════════════════════════════════════════════════════════
     GAME STATE
     ════════════════════════════════════════════════════════════ */
  var canvas, ctx;
  var raf = null;
  var mouseY = PH / 2;
  var keysDown = {};
  var active = false;

  // Micro-choice modifier for current run
  var runModifier = null; // 'risky' | 'safe' | 'chaos' | null

  var g = null; // game state object

  function createBall(x, y, dir) {
    var angle = (Math.random() - 0.5) * 0.8;
    var speed = 4.5;
    if (runModifier === 'risky') speed = 5.8;
    if (runModifier === 'safe') speed = 3.6;
    return {
      x: x || PW / 2, y: y || PH / 2,
      vx: Math.cos(angle) * speed * (dir || 1),
      vy: Math.sin(angle) * speed,
      speed: speed,
      gravity: 0,
      trail: []
    };
  }

  function resetGame() {
    var aiDiff = getAIDifficulty(0);
    if (runModifier === 'safe') { aiDiff.speed *= 0.7; aiDiff.mistake *= 1.5; }
    g = {
      balls: [createBall(PW / 2, PH / 2, 1)],
      player: { x: 20, y: PH / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H, baseH: PADDLE_H },
      ai: { x: PW - 20 - PADDLE_W, y: PH / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H, baseH: PADDLE_H },
      aiSpeed: aiDiff.speed,
      aiReact: aiDiff.react,
      aiMistake: aiDiff.mistake,
      aiTarget: PH / 2,
      aiMistakeTimer: 0,
      aiMistakeOffset: 0,
      combo: 0,
      maxCombo: 0,
      dead: false,
      deathTimer: 0,
      hookTextAlpha: 1.5, // fades over ~90 frames
      particles: [],
      shakeTimer: 0,
      // Chaos
      chaosTimer: 600 + Math.floor(Math.random() * 300), // 10-15s
      chaosFlash: null,
      chaosFlashTimer: 0,
      activeChaos: [],
      // Intensity
      intensity: 0,
      // Glow pulse on hit
      glowPulse: 0,
      // Time
      frameCount: 0,
      // Micro-choice
      showingChoice: false,
      choiceTimer: 0,
      // Death screen
      showingDeath: false,
      deathScreenTimer: 0,
      deathMsg: '',
      newBest: false,
      nearMiss: false,
      nearMissText: '',
      percentileText: '',
      energyGained: 0,
      shareBtnRect: null
    };

    // If chaos micro-choice, trigger a random chaos immediately
    if (runModifier === 'chaos') {
      triggerChaos();
    }
  }

  /* ════════════════════════════════════════════════════════════
     CHAOS SYSTEM
     ════════════════════════════════════════════════════════════ */
  function triggerChaos() {
    var type = pick(CHAOS_TYPES);
    g.chaosFlash = 'HEART SURGE';
    g.chaosFlashTimer = 60;
    if (typeof HSAudio !== 'undefined') HSAudio.chaosEvent();

    if (type.id === 'double_ball' || type.id === 'multi_ball') {
      var count = type.id === 'multi_ball' ? 2 : 1;
      for (var i = 0; i < count; i++) {
        var srcBall = g.balls[0];
        g.balls.push(createBall(srcBall.x, srcBall.y, srcBall.vx > 0 ? 1 : -1));
      }
    } else if (type.id === 'speed_burst') {
      g.activeChaos.push({ id: type.id, timer: type.duration });
      for (var j = 0; j < g.balls.length; j++) {
        g.balls[j].speed *= 1.8;
        g.balls[j].vx *= 1.8;
        g.balls[j].vy *= 1.8;
      }
    } else if (type.id === 'gravity_flip') {
      g.activeChaos.push({ id: type.id, timer: type.duration });
      var grav = Math.random() < 0.5 ? 0.06 : -0.06;
      for (var k = 0; k < g.balls.length; k++) g.balls[k].gravity = grav;
    } else if (type.id === 'shrink_paddle') {
      g.activeChaos.push({ id: type.id, timer: type.duration });
      g.player.h = g.player.baseH * 0.5;
    } else if (type.id === 'slow_motion') {
      g.activeChaos.push({ id: type.id, timer: type.duration });
    } else if (type.id === 'weird_angle') {
      g.activeChaos.push({ id: type.id, timer: 1 });
    }
  }

  function updateChaos() {
    for (var i = g.activeChaos.length - 1; i >= 0; i--) {
      g.activeChaos[i].timer--;
      if (g.activeChaos[i].timer <= 0) {
        var c = g.activeChaos[i];
        // Cleanup
        if (c.id === 'speed_burst') {
          for (var j = 0; j < g.balls.length; j++) {
            g.balls[j].speed /= 1.8;
            g.balls[j].vx /= 1.8;
            g.balls[j].vy /= 1.8;
          }
        } else if (c.id === 'gravity_flip') {
          for (var k = 0; k < g.balls.length; k++) g.balls[k].gravity = 0;
        } else if (c.id === 'shrink_paddle') {
          g.player.h = g.player.baseH;
        }
        g.activeChaos.splice(i, 1);
      }
    }
  }

  function isSlowMo() {
    for (var i = 0; i < g.activeChaos.length; i++) {
      if (g.activeChaos[i].id === 'slow_motion') return true;
    }
    return false;
  }

  function isWeirdAngle() {
    for (var i = 0; i < g.activeChaos.length; i++) {
      if (g.activeChaos[i].id === 'weird_angle') return true;
    }
    return false;
  }

  /* ════════════════════════════════════════════════════════════
     UPDATE
     ════════════════════════════════════════════════════════════ */
  function update() {
    if (!g || g.dead || g.showingChoice) return;
    g.frameCount++;

    var slowFactor = isSlowMo() ? 0.3 : 1;

    // Hook text fade
    if (g.hookTextAlpha > 0) g.hookTextAlpha -= 0.017; // ~90 frames to fade

    // Chaos timer
    g.chaosTimer--;
    if (g.chaosTimer <= 0) {
      triggerChaos();
      g.chaosTimer = 600 + Math.floor(Math.random() * 300);
    }

    // Chaos flash
    if (g.chaosFlashTimer > 0) g.chaosFlashTimer--;
    else g.chaosFlash = null;

    // Update chaos effects
    updateChaos();

    // Update intensity
    g.intensity = Math.min(g.combo / 25, 1.0);

    // Glow pulse decay
    if (g.glowPulse > 0) g.glowPulse -= 0.05;

    // Shake decay
    if (g.shakeTimer > 0) g.shakeTimer--;

    // ── Player movement ──
    if (keysDown['ArrowUp'] || keysDown['w']) mouseY = g.player.y + g.player.h / 2 - 6;
    if (keysDown['ArrowDown'] || keysDown['s']) mouseY = g.player.y + g.player.h / 2 + 6;
    var targetY = mouseY - g.player.h / 2;
    g.player.y += (targetY - g.player.y) * 0.3;
    g.player.y = clamp(g.player.y, 0, PH - g.player.h);

    // ── AI movement ──
    var aiDiff = getAIDifficulty(g.combo);
    g.aiSpeed = aiDiff.speed;
    g.aiReact = aiDiff.react;
    g.aiMistake = aiDiff.mistake;
    if (runModifier === 'safe') { g.aiSpeed *= 0.7; g.aiMistake = Math.min(g.aiMistake * 1.5, 0.2); }

    // Find closest ball heading toward AI
    var trackBall = null;
    var closestX = -Infinity;
    for (var bi = 0; bi < g.balls.length; bi++) {
      if (g.balls[bi].vx > 0 && g.balls[bi].x > closestX) {
        closestX = g.balls[bi].x;
        trackBall = g.balls[bi];
      }
    }
    if (!trackBall) trackBall = g.balls[0];

    // AI mistake system
    if (g.aiMistakeTimer > 0) {
      g.aiMistakeTimer--;
    } else if (Math.random() < g.aiMistake) {
      g.aiMistakeOffset = (Math.random() - 0.5) * PH * 0.5;
      g.aiMistakeTimer = 20 + Math.floor(Math.random() * 30);
    } else {
      g.aiMistakeOffset *= 0.9;
    }

    var aiTargetY = trackBall.y - g.ai.h / 2 + g.aiMistakeOffset + (Math.random() - 0.5) * 15;
    var aiSpeedNow = g.aiSpeed * 3.5 * slowFactor;
    var deadZone = g.aiReact * PH;
    var aiDiffY = aiTargetY - g.ai.y;
    if (Math.abs(aiDiffY) > deadZone) {
      g.ai.y += Math.sign(aiDiffY) * Math.min(Math.abs(aiDiffY) * 0.08, aiSpeedNow);
    }
    g.ai.y = clamp(g.ai.y, 0, PH - g.ai.h);

    // ── Ball movement ──
    for (var i = g.balls.length - 1; i >= 0; i--) {
      var b = g.balls[i];

      // Apply gravity
      if (b.gravity) b.vy += b.gravity * slowFactor;

      // Move
      b.x += b.vx * slowFactor;
      b.y += b.vy * slowFactor;

      // Trail
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 10) b.trail.shift();

      // Wall bounce
      if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
      if (b.y + BALL_R >= PH) { b.y = PH - BALL_R; b.vy = -Math.abs(b.vy); }

      // ── Player paddle collision ──
      var p = g.player;
      if (b.vx < 0 && b.x - BALL_R <= p.x + p.w && b.x + BALL_R >= p.x &&
          b.y >= p.y && b.y <= p.y + p.h) {
        b.x = p.x + p.w + BALL_R;
        var hitPos = (b.y - p.y) / p.h - 0.5;

        // Weird angle chaos
        if (isWeirdAngle()) hitPos += (Math.random() - 0.5) * 1.0;

        b.speed = Math.min(b.speed + 0.12, 8);
        b.vx = Math.cos(hitPos * 1.2) * b.speed;
        b.vy = Math.sin(hitPos * 1.2) * b.speed;
        if (b.vx < 1.5) b.vx = 1.5;

        // Smash: edge hit + high speed
        if (b.speed > 6 && Math.abs(hitPos) > 0.35) {
          b.speed = Math.min(b.speed * 1.3, 10);
          b.vx = Math.cos(hitPos * 1.2) * b.speed;
          b.vy = Math.sin(hitPos * 1.2) * b.speed;
          g.shakeTimer = 12;
        }

        // Combo increment
        g.combo++;
        if (g.combo > g.maxCombo) g.maxCombo = g.combo;

        // Glow pulse
        g.glowPulse = 1;

        // Particles
        spawnHitParticles(p.x + p.w, b.y, true);
        if (typeof HSAudio !== 'undefined') {
          HSAudio.comboHit(g.combo);
        }

        // Remove weird_angle chaos after one use
        for (var wi = g.activeChaos.length - 1; wi >= 0; wi--) {
          if (g.activeChaos[wi].id === 'weird_angle') g.activeChaos.splice(wi, 1);
        }
      }

      // ── AI paddle collision ──
      var ai = g.ai;
      if (b.vx > 0 && b.x + BALL_R >= ai.x && b.x - BALL_R <= ai.x + ai.w &&
          b.y >= ai.y && b.y <= ai.y + ai.h) {
        b.x = ai.x - BALL_R;
        var hitPos2 = (b.y - ai.y) / ai.h - 0.5;
        b.speed = Math.min(b.speed + 0.08, 8);
        b.vx = -Math.cos(hitPos2 * 1.2) * b.speed;
        b.vy = Math.sin(hitPos2 * 1.2) * b.speed;
        if (b.vx > -1.5) b.vx = -1.5;
        spawnHitParticles(ai.x, b.y, false);
        if (typeof HSAudio !== 'undefined') HSAudio.hit();
      }

      // ── Ball out left = DEATH ──
      if (b.x < -BALL_R * 2) {
        if (g.balls.length > 1) {
          // Multi-ball: just remove this ball
          g.balls.splice(i, 1);
          continue;
        }
        // Single ball left = game over
        die();
        return;
      }

      // ── Ball out right = AI missed, bonus ──
      if (b.x > PW + BALL_R * 2) {
        if (g.balls.length > 1) {
          g.balls.splice(i, 1);
          continue;
        }
        // Reset ball from center, keep combo going
        g.balls[0] = createBall(PW / 2, PH / 2, 1);
        // Small combo bonus for scoring
        g.combo += 2;
        if (g.combo > g.maxCombo) g.maxCombo = g.combo;
        g.glowPulse = 1;
        spawnScoreParticles();
        if (typeof HSAudio !== 'undefined') HSAudio.score();
      }
    }

    // ── Update particles ──
    for (var pi = g.particles.length - 1; pi >= 0; pi--) {
      var pp = g.particles[pi];
      pp.x += pp.vx; pp.y += pp.vy;
      pp.alpha -= 0.035;
      if (pp.alpha <= 0) g.particles.splice(pi, 1);
    }
    // Cap particles
    if (g.particles.length > 200) g.particles.splice(0, g.particles.length - 200);

    // ── Intensity particles ──
    if (g.intensity > 0.3 && Math.random() < g.intensity * 0.3) {
      g.particles.push({
        x: Math.random() * PW, y: PH + 5,
        vx: (Math.random() - 0.5) * 1,
        vy: -1 - Math.random() * 2 * g.intensity,
        alpha: 0.5, size: 2 + Math.random() * 3,
        color: pick(['#ff6b9d', '#b388ff', '#ffeb3b', '#ff8a65']),
        isHeart: Math.random() < 0.3
      });
    }
  }

  /* ── Death ── */
  function die() {
    g.dead = true;
    g.deathTimer = 6; // brief red flash frames
    g.showingDeath = true;

    // Calculate results
    var progress = loadProgress();
    var combo = g.maxCombo;
    g.newBest = combo > progress.best;
    if (g.newBest) progress.best = combo;

    // Heart energy
    var energyMult = (runModifier === 'risky') ? 2 : 1;
    g.energyGained = (combo * 2 + 5) * energyMult;
    progress.energy += g.energyGained;

    // Check unlocks
    var newUnlock = null;
    for (var i = 0; i < UNLOCKS.length; i++) {
      if (progress.energy >= UNLOCKS[i].energy && progress.unlocked.indexOf(UNLOCKS[i].id) === -1) {
        progress.unlocked.push(UNLOCKS[i].id);
        // Auto-equip newly unlocked item
        if (!progress.equipped) progress.equipped = {};
        progress.equipped[UNLOCKS[i].slot] = UNLOCKS[i].id;
        newUnlock = UNLOCKS[i];
      }
    }
    saveProgress(progress);

    // Top 10
    var top10 = loadTop10();
    top10.push(combo);
    top10.sort(function(a, b) { return b - a; });
    top10 = top10.slice(0, 10);
    saveTop10(top10);

    // Near-miss
    var threshold = top10.length >= 10 ? top10[9] : (top10.length > 0 ? top10[0] + 2 : 5);
    if (combo < threshold && threshold - combo <= 3) {
      g.nearMiss = true;
      g.nearMissText = 'SO CLOSE! Top 10 = x' + threshold;
    } else if (top10.indexOf(combo) !== -1 && combo > 0) {
      g.nearMissText = 'TOP 10!';
    }

    // Percentile (simulated)
    var simMax = Math.max(30, progress.best);
    var pct = Math.min(99, Math.floor((combo / simMax) * 100));
    g.percentileText = 'You beat ' + pct + '% of players';

    // Death message
    g.deathMsg = getDeathMsg(combo, g.newBest);

    // Unlock toast
    g.unlockToast = newUnlock ? 'UNLOCKED: ' + newUnlock.label : null;

    if (typeof HSAudio !== 'undefined') {
      HSAudio.death();
      if (g.newBest) HSAudio.newRecord();
    }

    // Report to arcade platform
    if (typeof Arcade !== 'undefined') {
      Arcade.onGameOver('heart-serve', combo);
    }
  }

  /* ── Particles ── */
  function spawnHitParticles(x, y, isPlayer) {
    var count = 6 + Math.floor(g.intensity * 8);
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 3;
      g.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed * (isPlayer ? 1 : -1),
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 2 + Math.random() * 4,
        color: pick(['#ff6b9d', '#b388ff', '#ffeb3b', '#82b1ff', '#ff8a65']),
        isHeart: i < 2
      });
    }
  }

  function spawnScoreParticles() {
    for (var i = 0; i < 12; i++) {
      g.particles.push({
        x: PW * 0.7 + (Math.random() - 0.5) * 60,
        y: PH / 2 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 4,
        vy: -1 - Math.random() * 3,
        alpha: 1, size: 3 + Math.random() * 5,
        color: pick(['#ff6b9d', '#ffeb3b', '#b388ff']),
        isHeart: true
      });
    }
  }

  /* ════════════════════════════════════════════════════════════
     DRAW
     ════════════════════════════════════════════════════════════ */
  function draw() {
    if (!ctx || !g) return;

    // Screen shake
    var shakeX = 0, shakeY = 0;
    if (g.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 6;
      shakeY = (Math.random() - 0.5) * 6;
    }
    // Micro-shake at high intensity
    if (g.intensity > 0.7) {
      shakeX += (Math.random() - 0.5) * 2;
      shakeY += (Math.random() - 0.5) * 2;
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // ── Background (intensity-driven) ──
    var calmBg = [254, 248, 255]; // #fef8ff
    var intenseBg = [26, 10, 46]; // #1a0a2e
    var bgR = lerp(calmBg[0], intenseBg[0], g.intensity);
    var bgG = lerp(calmBg[1], intenseBg[1], g.intensity);
    var bgB = lerp(calmBg[2], intenseBg[2], g.intensity);
    ctx.fillStyle = rgbStr(bgR, bgG, bgB);
    ctx.fillRect(0, 0, PW, PH);

    // Intensity pulse (radial glow)
    if (g.intensity > 0.5) {
      var pulseAlpha = (g.intensity - 0.5) * 0.15 * (0.8 + 0.2 * Math.sin(g.frameCount * 0.05));
      var radGrad = ctx.createRadialGradient(PW / 2, PH / 2, 0, PW / 2, PH / 2, PW * 0.6);
      radGrad.addColorStop(0, 'rgba(179,136,255,' + pulseAlpha + ')');
      radGrad.addColorStop(1, 'rgba(179,136,255,0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, PW, PH);
    }

    // Grid
    var gridAlpha = lerp(0.06, 0.02, g.intensity);
    ctx.strokeStyle = 'rgba(200,180,220,' + gridAlpha + ')';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < PW; gx += 30) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, PH); ctx.stroke();
    }
    for (var gy = 0; gy < PH; gy += 30) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(PW, gy); ctx.stroke();
    }

    // Center line
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(180,160,220,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PW / 2, 0); ctx.lineTo(PW / 2, PH); ctx.stroke();
    ctx.setLineDash([]);

    // ── Particles ──
    for (var pi = 0; pi < g.particles.length; pi++) {
      var pp = g.particles[pi];
      ctx.globalAlpha = pp.alpha;
      if (pp.isHeart) {
        ctx.fillStyle = pp.color;
        drawHeart(ctx, pp.x, pp.y - pp.size * 0.5, pp.size * 2);
      } else {
        ctx.fillStyle = pp.color;
        ctx.fillRect(pp.x - pp.size / 2, pp.y - pp.size / 2, pp.size, pp.size);
      }
    }
    ctx.globalAlpha = 1;

    // ── Ball trail (cosmetic-aware) ──
    var eq = getEquipped();
    var hasTrail = eq.trail || (g.intensity > 0.2);
    if (hasTrail) {
      var rainbowColors = ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#2979ff', '#d500f9'];
      for (var bi = 0; bi < g.balls.length; bi++) {
        var ball = g.balls[bi];
        for (var ti = 0; ti < ball.trail.length; ti++) {
          var tPct = ti / ball.trail.length;
          var ta = tPct * 0.6;
          // Increase trail alpha if cosmetic trail equipped
          if (eq.trail) ta = tPct * 0.8;
          ctx.globalAlpha = ta;

          if (eq.trail === 'trail_rainbow') {
            ctx.fillStyle = rainbowColors[ti % rainbowColors.length];
          } else if (eq.trail === 'trail_pink') {
            ctx.fillStyle = '#ff6b9d';
          } else {
            ctx.fillStyle = '#ff6b9d';
          }

          var trailR = BALL_R * (0.4 + tPct * 0.5);
          ctx.beginPath();
          ctx.arc(ball.trail[ti].x, ball.trail[ti].y, trailR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Paddles (cosmetic-aware) ──
    var glowBlur = g.intensity * 20;

    // Player paddle
    ctx.save();
    if (eq.paddle === 'paddle_fire') {
      // Fire paddle: animated orange-red gradient + ember particles
      ctx.shadowColor = '#ff6b00';
      ctx.shadowBlur = 18 + Math.sin(g.frameCount * 0.15) * 8 + g.glowPulse * 15;
      var fireGrad = ctx.createLinearGradient(g.player.x, g.player.y, g.player.x, g.player.y + g.player.h);
      var shift = Math.sin(g.frameCount * 0.1) * 0.15 + 0.5;
      fireGrad.addColorStop(0, '#ffeb3b');
      fireGrad.addColorStop(shift, '#ff6d00');
      fireGrad.addColorStop(1, '#d50000');
      ctx.fillStyle = fireGrad;
      // Spawn ember particles
      if (g.frameCount % 3 === 0) {
        g.particles.push({
          x: g.player.x + g.player.w / 2 + (Math.random() - 0.5) * 6,
          y: g.player.y + Math.random() * g.player.h,
          vx: 0.5 + Math.random(), vy: (Math.random() - 0.5) * 1.5,
          alpha: 0.8, size: 1 + Math.random() * 2.5,
          color: pick(['#ffeb3b', '#ff6d00', '#ff1744']), isHeart: false
        });
      }
    } else if (eq.paddle === 'paddle_neon') {
      // Neon paddle: cycling rainbow gradient + bright glow
      ctx.shadowColor = 'hsl(' + (g.frameCount * 3 % 360) + ',100%,60%)';
      ctx.shadowBlur = 14 + g.glowPulse * 18;
      var neonGrad = ctx.createLinearGradient(g.player.x, g.player.y, g.player.x, g.player.y + g.player.h);
      var hue1 = g.frameCount * 3 % 360;
      var hue2 = (hue1 + 60) % 360;
      var hue3 = (hue1 + 120) % 360;
      neonGrad.addColorStop(0, 'hsl(' + hue1 + ',100%,65%)');
      neonGrad.addColorStop(0.5, 'hsl(' + hue2 + ',100%,65%)');
      neonGrad.addColorStop(1, 'hsl(' + hue3 + ',100%,65%)');
      ctx.fillStyle = neonGrad;
    } else {
      // Default paddle
      if (g.glowPulse > 0 || glowBlur > 0) {
        ctx.shadowColor = '#82b1ff';
        ctx.shadowBlur = glowBlur + g.glowPulse * 20;
      }
      var paddleGrad = ctx.createLinearGradient(g.player.x, g.player.y, g.player.x, g.player.y + g.player.h);
      paddleGrad.addColorStop(0, '#82b1ff');
      paddleGrad.addColorStop(1, '#5c8ee6');
      ctx.fillStyle = paddleGrad;
    }
    ctx.beginPath();
    ctx.roundRect(g.player.x, g.player.y, g.player.w, g.player.h, 6);
    ctx.fill();
    ctx.restore();

    // AI paddle (always default style)
    ctx.save();
    if (glowBlur > 0) {
      ctx.shadowColor = '#ff6b9d';
      ctx.shadowBlur = glowBlur;
    }
    var aiGrad = ctx.createLinearGradient(g.ai.x, g.ai.y, g.ai.x, g.ai.y + g.ai.h);
    aiGrad.addColorStop(0, '#ff6b9d');
    aiGrad.addColorStop(1, '#e8457a');
    ctx.fillStyle = aiGrad;
    ctx.beginPath();
    ctx.roundRect(g.ai.x, g.ai.y, g.ai.w, g.ai.h, 6);
    ctx.fill();
    ctx.restore();

    // ── Balls (cosmetic-aware) ──
    for (var bdi = 0; bdi < g.balls.length; bdi++) {
      var bd = g.balls[bdi];
      ctx.save();

      if (eq.ball === 'ball_heart') {
        // Heart Ball: renders as a heart shape
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 12 + glowBlur;
        ctx.fillStyle = '#ff1744';
        var heartSize = BALL_R * 2.8;
        drawHeart(ctx, bd.x, bd.y - heartSize * 0.35, heartSize);
      } else if (eq.ball === 'ball_star') {
        // Star Ball: rotating star with golden glow
        ctx.shadowColor = '#ffd600';
        ctx.shadowBlur = 14 + glowBlur;
        ctx.translate(bd.x, bd.y);
        ctx.rotate(g.frameCount * 0.06);
        ctx.fillStyle = '#ffd600';
        drawStar(ctx, 0, 0, BALL_R * 1.4, BALL_R * 0.55, 5);
        // Inner bright core
        ctx.fillStyle = '#fff8e1';
        drawStar(ctx, 0, 0, BALL_R * 0.6, BALL_R * 0.25, 5);
      } else {
        // Default ball
        if (glowBlur > 0) {
          ctx.shadowColor = '#ffeb3b';
          ctx.shadowBlur = glowBlur + 5;
        }
        var ballGrad = ctx.createRadialGradient(bd.x - 2, bd.y - 2, 1, bd.x, bd.y, BALL_R);
        ballGrad.addColorStop(0, '#fff');
        ballGrad.addColorStop(0.6, '#ff6b9d');
        ballGrad.addColorStop(1, '#e8457a');
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(bd.x, bd.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── HUD: Combo counter ──
    if (g.combo > 0) {
      var comboScale = 1 + g.glowPulse * 0.3;
      ctx.save();
      ctx.translate(PW / 2, 32);
      ctx.scale(comboScale, comboScale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 28px Nunito, sans-serif';
      ctx.fillStyle = g.intensity > 0.5 ? '#ffeb3b' : '#ff6b9d';
      ctx.shadowColor = g.intensity > 0.5 ? 'rgba(255,235,59,0.5)' : 'rgba(255,107,157,0.3)';
      ctx.shadowBlur = 10;
      ctx.fillText('x' + g.combo, 0, 0);
      ctx.restore();
    }

    // ── HUD: Best ──
    var progress = loadProgress();
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '600 13px Nunito, sans-serif';
    ctx.fillStyle = g.intensity > 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(55,71,79,0.4)';
    ctx.fillText('BEST: x' + progress.best, PW - 12, 20);
    ctx.restore();

    // ── HUD: Heart Energy bar ──
    var barW = 80, barH = 6;
    var barX = 12, barY = 12;
    var nextUnlock = null;
    for (var ui = 0; ui < UNLOCKS.length; ui++) {
      if (progress.unlocked.indexOf(UNLOCKS[ui].id) === -1) { nextUnlock = UNLOCKS[ui]; break; }
    }
    if (nextUnlock) {
      var fillPct = Math.min(progress.energy / nextUnlock.energy, 1);
      ctx.fillStyle = g.intensity > 0.5 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(barX, barY, barW, barH);
      var barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      barGrad.addColorStop(0, '#ff6b9d');
      barGrad.addColorStop(1, '#b388ff');
      ctx.fillStyle = barGrad;
      ctx.fillRect(barX, barY, barW * fillPct, barH);
    }

    // ── Hook text: "Don't miss." ──
    if (g.hookTextAlpha > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 24px Nunito, sans-serif';
      ctx.globalAlpha = Math.min(g.hookTextAlpha, 1);
      ctx.fillStyle = '#ff6b9d';
      ctx.shadowColor = 'rgba(255,107,157,0.4)';
      ctx.shadowBlur = 15;
      ctx.fillText("Don't miss.", PW / 2, PH / 2);
      ctx.restore();
    }

    // ── Chaos flash: "HEART SURGE" ──
    if (g.chaosFlash && g.chaosFlashTimer > 0) {
      var flashAlpha = g.chaosFlashTimer / 60;
      var flashScale = 1 + (1 - flashAlpha) * 0.3;
      ctx.save();
      ctx.translate(PW / 2, PH / 2);
      ctx.scale(flashScale, flashScale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 32px Nunito, sans-serif';
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#ffeb3b';
      ctx.shadowColor = 'rgba(255,235,59,0.6)';
      ctx.shadowBlur = 20;
      ctx.fillText(g.chaosFlash, 0, 0);
      ctx.restore();
    }

    // ── Death flash ──
    if (g.dead && g.deathTimer > 0) {
      ctx.fillStyle = 'rgba(255,0,0,' + (g.deathTimer / 12) + ')';
      ctx.fillRect(0, 0, PW, PH);
      g.deathTimer--;
    }

    ctx.restore(); // undo shake

    // ── Death screen overlay (drawn without shake) ──
    if (g.showingDeath && g.deathTimer <= 0) {
      drawDeathScreen();
    }
  }

  /* ── Death Screen ── */
  function drawDeathScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(10,5,20,0.75)';
    ctx.fillRect(0, 0, PW, PH);

    ctx.textAlign = 'center';

    // Combo achieved
    ctx.font = '800 48px Nunito, sans-serif';
    ctx.fillStyle = '#ff6b9d';
    ctx.shadowColor = 'rgba(255,107,157,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('x' + g.maxCombo, PW / 2, PH * 0.28);
    ctx.shadowBlur = 0;

    // Death message
    ctx.font = '700 18px Nunito, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(g.deathMsg, PW / 2, PH * 0.42);

    // Near miss / Top 10
    if (g.nearMissText) {
      ctx.font = '600 14px Nunito, sans-serif';
      ctx.fillStyle = g.nearMiss ? '#00e676' : '#ffeb3b';
      ctx.fillText(g.nearMissText, PW / 2, PH * 0.52);
    }

    // Percentile
    ctx.font = '600 13px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(g.percentileText, PW / 2, PH * 0.60);

    // Energy gained
    ctx.font = '600 14px Nunito, sans-serif';
    ctx.fillStyle = '#b388ff';
    ctx.fillText('+' + g.energyGained + ' Heart Energy', PW / 2, PH * 0.70);

    // Unlock toast
    if (g.unlockToast) {
      ctx.font = '700 16px Nunito, sans-serif';
      ctx.fillStyle = '#ffeb3b';
      ctx.shadowColor = 'rgba(255,235,59,0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(g.unlockToast, PW / 2, PH * 0.78);
      ctx.shadowBlur = 0;
    }

    // Share button
    var btnW = 148, btnH = 30;
    var btnX = PW / 2 - btnW / 2;
    var btnY = PH * 0.84;
    g.shareBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 15);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,107,157,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 15);
    ctx.stroke();
    ctx.font = '600 13px Nunito, sans-serif';
    ctx.fillStyle = '#ffb3d0';
    ctx.fillText('\uD83D\uDCE4 Share Score', PW / 2, btnY + 20);
    ctx.restore();

    // Tap to retry
    var blink = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.font = '600 15px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,' + blink + ')';
    ctx.fillText('Tap to play again', PW / 2, PH * 0.95);
  }

  /* ── Micro-choice screen ── */
  function drawMicroChoice() {
    ctx.fillStyle = 'rgba(10,5,20,0.8)';
    ctx.fillRect(0, 0, PW, PH);

    ctx.textAlign = 'center';
    ctx.font = '700 20px Nunito, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Choose your style', PW / 2, PH * 0.22);

    var btnW = 130, btnH = 70, gap = 20;
    var totalW = btnW * 3 + gap * 2;
    var startX = (PW - totalW) / 2;
    var btnY = PH * 0.38;

    var choices = [
      { id: 'risky', emoji: '\uD83D\uDCA8', label: 'RISKY', sub: 'Faster, 2x energy', color: '#ff6b35' },
      { id: 'safe',  emoji: '\uD83D\uDEE1\uFE0F', label: 'SAFE',  sub: 'Slower, easier',   color: '#82b1ff' },
      { id: 'chaos', emoji: '\uD83C\uDFB2', label: 'CHAOS', sub: 'Random event',    color: '#b388ff' }
    ];

    // Store button rects for click detection
    g.choiceBtns = [];

    for (var i = 0; i < 3; i++) {
      var bx = startX + i * (btnW + gap);
      g.choiceBtns.push({ x: bx, y: btnY, w: btnW, h: btnH, id: choices[i].id });

      // Button bg
      ctx.fillStyle = choices[i].color;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.roundRect(bx, btnY, btnW, btnH, 12);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Border
      ctx.strokeStyle = choices[i].color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, btnY, btnW, btnH, 12);
      ctx.stroke();

      // Emoji
      ctx.font = '28px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(choices[i].emoji, bx + btnW / 2, btnY + 28);

      // Label
      ctx.font = '700 14px Nunito, sans-serif';
      ctx.fillStyle = choices[i].color;
      ctx.fillText(choices[i].label, bx + btnW / 2, btnY + 48);

      // Sub
      ctx.font = '500 10px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(choices[i].sub, bx + btnW / 2, btnY + 62);
    }

    // Timer bar
    var timerPct = g.choiceTimer / 90; // 1.5 seconds at 60fps
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(PW * 0.2, PH * 0.82, PW * 0.6, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(PW * 0.2, PH * 0.82, PW * 0.6 * timerPct, 4);
  }

  /* ════════════════════════════════════════════════════════════
     GAME LOOP
     ════════════════════════════════════════════════════════════ */
  function loop() {
    if (!active) return;

    if (g.showingChoice) {
      g.choiceTimer--;
      if (g.choiceTimer <= 0) {
        // Auto-select chaos
        selectChoice('chaos');
      }
      drawMicroChoice();
    } else {
      update();
      draw();
    }

    raf = requestAnimationFrame(loop);
  }

  function selectChoice(id) {
    runModifier = id;
    g.showingChoice = false;
    resetGame();
    // Ball is already moving — instant play
  }

  /* ════════════════════════════════════════════════════════════
     INPUT
     ════════════════════════════════════════════════════════════ */
  function handleInput(e) {
    if (!active || !g) return;

    if (g.showingChoice) {
      // Check if clicking a choice button
      var rect = canvas.getBoundingClientRect();
      var scaleX = PW / rect.width;
      var scaleY = PH / rect.height;
      var cx, cy;
      if (e.touches) {
        cx = (e.touches[0].clientX - rect.left) * scaleX;
        cy = (e.touches[0].clientY - rect.top) * scaleY;
      } else {
        cx = (e.clientX - rect.left) * scaleX;
        cy = (e.clientY - rect.top) * scaleY;
      }
      if (g.choiceBtns) {
        for (var i = 0; i < g.choiceBtns.length; i++) {
          var btn = g.choiceBtns[i];
          if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
            selectChoice(btn.id);
            return;
          }
        }
      }
      return;
    }

    if (g.showingDeath && g.deathTimer <= 0) {
      // Check share button first
      if (g.shareBtnRect) {
        var rect2 = canvas.getBoundingClientRect();
        var scaleX2 = PW / rect2.width, scaleY2 = PH / rect2.height;
        var clickX, clickY;
        if (e.touches) {
          clickX = (e.touches[0].clientX - rect2.left) * scaleX2;
          clickY = (e.touches[0].clientY - rect2.top) * scaleY2;
        } else if (e.clientX !== undefined) {
          clickX = (e.clientX - rect2.left) * scaleX2;
          clickY = (e.clientY - rect2.top) * scaleY2;
        }
        var sb = g.shareBtnRect;
        if (clickX !== undefined && clickX >= sb.x && clickX <= sb.x + sb.w &&
            clickY >= sb.y && clickY <= sb.y + sb.h) {
          shareScore();
          return;
        }
      }
      // Show micro-choice
      g.showingDeath = false;
      g.dead = false;
      g.showingChoice = true;
      g.choiceTimer = 90; // 1.5s
      return;
    }
  }

  function handleMouseMove(e) {
    if (!canvas || !active || !g) return;
    var rect = canvas.getBoundingClientRect();
    var scaleY = PH / rect.height;
    if (e.touches) {
      e.preventDefault();
      mouseY = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      mouseY = (e.clientY - rect.top) * scaleY;
    }
  }

  /* ════════════════════════════════════════════════════════════
     SHARE CARD
     ════════════════════════════════════════════════════════════ */
  function generateShareCard() {
    var W = 600, H = 340;
    var sc = document.createElement('canvas');
    sc.width = W; sc.height = H;
    var c = sc.getContext('2d');

    // Background gradient
    var bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0d0515');
    bg.addColorStop(0.6, '#1a0730');
    bg.addColorStop(1, '#2a0d1a');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    // Subtle grid lines
    c.strokeStyle = 'rgba(179,136,255,0.07)';
    c.lineWidth = 1;
    for (var xi = 0; xi < W; xi += 40) {
      c.beginPath(); c.moveTo(xi, 0); c.lineTo(xi, H); c.stroke();
    }
    for (var yi = 0; yi < H; yi += 40) {
      c.beginPath(); c.moveTo(0, yi); c.lineTo(W, yi); c.stroke();
    }

    // Pink top accent bar
    var accentGrad = c.createLinearGradient(0, 0, W, 0);
    accentGrad.addColorStop(0, 'rgba(255,107,157,0)');
    accentGrad.addColorStop(0.3, 'rgba(255,107,157,0.9)');
    accentGrad.addColorStop(0.7, 'rgba(179,136,255,0.9)');
    accentGrad.addColorStop(1, 'rgba(179,136,255,0)');
    c.fillStyle = accentGrad;
    c.fillRect(0, 0, W, 3);

    // Decorative hearts (background)
    c.fillStyle = 'rgba(255,107,157,0.06)';
    var heartPositions = [[60,60,40],[W-70,50,30],[W-50,H-60,35],[80,H-50,25],[W/2+150,H/2,20]];
    heartPositions.forEach(function(hp) {
      drawHeart(c, hp[0], hp[1] - hp[2]*0.4, hp[2]);
    });

    // LEFT: Combo block
    var combo = g.maxCombo;
    var comboLabel = combo === 1 ? 'combo' : 'combos';
    c.textAlign = 'center';
    c.font = '800 96px Nunito, sans-serif';
    c.fillStyle = '#ff6b9d';
    c.shadowColor = 'rgba(255,107,157,0.6)';
    c.shadowBlur = 30;
    c.fillText('x' + combo, W * 0.28, H * 0.52);
    c.shadowBlur = 0;

    c.font = '600 16px Nunito, sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillText(comboLabel + ' survived', W * 0.28, H * 0.63);

    // Divider line
    c.strokeStyle = 'rgba(255,107,157,0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(W * 0.5, H * 0.18);
    c.lineTo(W * 0.5, H * 0.82);
    c.stroke();

    // RIGHT: Message + branding
    c.textAlign = 'left';
    var rx = W * 0.55;

    // Game name
    c.font = '800 13px Nunito, sans-serif';
    c.fillStyle = '#b388ff';
    c.fillText('HEARTSERVE ARCADE', rx, H * 0.28);

    // Death message (personality)
    var msg = g.deathMsg || 'Can you beat it?';
    // Wrap long messages
    c.font = '700 22px Nunito, sans-serif';
    c.fillStyle = '#ffffff';
    var maxW = W * 0.42;
    var words = msg.split(' ');
    var line = '';
    var lineY = H * 0.42;
    words.forEach(function(word) {
      var test = line ? line + ' ' + word : word;
      if (c.measureText(test).width > maxW && line) {
        c.fillText(line, rx, lineY);
        line = word;
        lineY += 28;
      } else { line = test; }
    });
    if (line) c.fillText(line, rx, lineY);

    // Near miss / top 10 badge
    if (g.nearMissText) {
      c.font = '600 13px Nunito, sans-serif';
      c.fillStyle = g.nearMiss ? '#00e676' : '#ffeb3b';
      c.fillText(g.nearMissText, rx, H * 0.64);
    }

    // Energy
    c.font = '600 13px Nunito, sans-serif';
    c.fillStyle = '#b388ff';
    c.fillText('+' + g.energyGained + ' \u2665 Energy', rx, H * 0.73);

    // CTA bottom
    c.textAlign = 'center';
    c.font = '700 15px Nunito, sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillText('Can you beat it?', W * 0.73, H * 0.87);

    // URL
    c.font = '600 13px Nunito, sans-serif';
    c.fillStyle = 'rgba(255,107,157,0.8)';
    c.fillText('slayplay.com/heart-serve', W * 0.73, H * 0.94);

    // SlayPlay logo mark (top-right)
    c.textAlign = 'right';
    c.font = '700 12px Nunito, sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.fillText('SlayPlay', W - 18, 22);

    return sc;
  }

  function shareScore() {
    var sc = generateShareCard();
    var combo = g.maxCombo;
    var shareText = 'I survived x' + combo + ' combos in HeartServe Arcade Mode \uD83D\uDC94 can you beat it?';
    var shareUrl = 'https://slayplay.com/heart-serve/';

    sc.toBlob(function(blob) {
      if (!blob) { fallbackDownload(sc, shareText, shareUrl); return; }
      var file = new File([blob], 'heartserve-x' + combo + '.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: 'HeartServe Arcade — x' + combo,
          text: shareText,
          url: shareUrl,
          files: [file]
        }).catch(function() {
          // User cancelled or error — try URL-only share
          if (navigator.share) {
            navigator.share({ title: 'HeartServe Arcade', text: shareText, url: shareUrl }).catch(function() {});
          }
        });
      } else if (navigator.share) {
        navigator.share({ title: 'HeartServe Arcade', text: shareText, url: shareUrl }).catch(function() {});
      } else {
        fallbackDownload(sc, shareText, shareUrl);
      }
    }, 'image/png');
  }

  function fallbackDownload(sc, shareText, shareUrl) {
    // Copy text to clipboard and download image
    var dataUrl = sc.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'heartserve-score.png';
    a.click();
    // Also try clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText + ' ' + shareUrl).catch(function() {});
    }
  }

  /* ════════════════════════════════════════════════════════════
     START / STOP
     ════════════════════════════════════════════════════════════ */
  function startArcadeMode() {
    canvas = $('arcadePongCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = PW;
    canvas.height = PH;

    active = true;
    runModifier = null;
    mouseY = PH / 2;
    resetGame();

    // Input listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleMouseMove, { passive: false });
    canvas.addEventListener('click', handleInput);
    canvas.addEventListener('touchstart', function(e) {
      handleMouseMove(e);
      handleInput(e);
    }, { passive: false });
    document.addEventListener('keydown', function(e) {
      keysDown[e.key] = true;
      // Any key restarts from death
      if (g && g.showingDeath && g.deathTimer <= 0) {
        handleInput(e);
      }
    });
    document.addEventListener('keyup', function(e) { keysDown[e.key] = false; });

    loop();
  }

  function stopArcadeMode() {
    active = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ════════════════════════════════════════════════════════════
     ADMIN PANEL
     ════════════════════════════════════════════════════════════ */
  function createAdminPanel() {
    // Remove existing panel if any
    var existing = document.getElementById('hsArcadeAdmin');
    if (existing) { existing.remove(); return; }

    var panel = document.createElement('div');
    panel.id = 'hsArcadeAdmin';
    panel.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;background:rgba(15,5,30,0.95);' +
      'border:1px solid rgba(179,136,255,0.4);border-radius:12px;padding:16px;font-family:Nunito,sans-serif;' +
      'color:#fff;font-size:13px;max-width:320px;max-height:90vh;overflow-y:auto;backdrop-filter:blur(10px);' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.5);';

    function refresh() {
      var p = loadProgress();
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<span style="font-weight:800;font-size:16px;color:#b388ff;">ADMIN PANEL</span>' +
        '<button onclick="document.getElementById(\'hsArcadeAdmin\').remove()" ' +
        'style="background:none;border:none;color:#888;font-size:18px;cursor:pointer;">x</button></div>';

      // Stats
      html += '<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:10px;margin-bottom:10px;">';
      html += '<div style="color:#ff6b9d;font-weight:700;margin-bottom:6px;">STATS</div>';
      html += '<div>Heart Energy: <b style="color:#b388ff;">' + p.energy + '</b></div>';
      html += '<div>Best Combo: <b style="color:#ffeb3b;">x' + p.best + '</b></div>';
      html += '<div>Unlocked: <b>' + p.unlocked.length + '/' + UNLOCKS.length + '</b></div>';
      html += '</div>';

      // Set energy
      html += '<div style="margin-bottom:10px;">';
      html += '<label style="color:#aaa;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Set Energy</label>';
      html += '<div style="display:flex;gap:6px;margin-top:4px;">';
      [0, 50, 150, 300, 500, 800, 1200, 5000].forEach(function(val) {
        var isCurrent = p.energy === val;
        html += '<button data-action="setEnergy" data-val="' + val + '" style="padding:4px 8px;border-radius:6px;' +
          'border:1px solid ' + (isCurrent ? '#b388ff' : 'rgba(255,255,255,0.15)') + ';' +
          'background:' + (isCurrent ? 'rgba(179,136,255,0.3)' : 'rgba(255,255,255,0.05)') + ';' +
          'color:#fff;font-size:11px;cursor:pointer;font-weight:600;">' + val + '</button>';
      });
      html += '</div></div>';

      // Cosmetics
      html += '<div style="color:#ff6b9d;font-weight:700;margin-bottom:8px;">COSMETICS</div>';

      var slots = { trail: 'Trail', paddle: 'Paddle', ball: 'Ball' };
      Object.keys(slots).forEach(function(slot) {
        html += '<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;margin-bottom:8px;">';
        html += '<div style="color:#aaa;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">' + slots[slot] + '</div>';

        // Default option
        var isDefault = !p.equipped || !p.equipped[slot];
        html += '<button data-action="unequip" data-slot="' + slot + '" style="display:inline-block;padding:4px 10px;' +
          'border-radius:6px;margin:2px;border:1px solid ' + (isDefault ? '#82b1ff' : 'rgba(255,255,255,0.15)') + ';' +
          'background:' + (isDefault ? 'rgba(130,177,255,0.2)' : 'rgba(255,255,255,0.05)') + ';' +
          'color:#fff;font-size:11px;cursor:pointer;font-weight:600;">Default</button>';

        UNLOCKS.forEach(function(u) {
          if (u.slot !== slot) return;
          var isUnlocked = p.unlocked.indexOf(u.id) !== -1;
          var isEquipped = p.equipped && p.equipped[slot] === u.id;
          var borderColor = isEquipped ? '#ffeb3b' : (isUnlocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)');
          var bgColor = isEquipped ? 'rgba(255,235,59,0.2)' : (isUnlocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)');
          var textColor = isUnlocked ? '#fff' : '#555';

          html += '<button data-action="equip" data-id="' + u.id + '" data-slot="' + slot + '" ' +
            'style="display:inline-block;padding:4px 10px;border-radius:6px;margin:2px;' +
            'border:1px solid ' + borderColor + ';background:' + bgColor + ';' +
            'color:' + textColor + ';font-size:11px;cursor:pointer;font-weight:600;">' +
            u.label + (isUnlocked ? '' : ' [' + u.energy + ']') +
            (isEquipped ? ' *' : '') + '</button>';
        });

        html += '</div>';
      });

      // Actions
      html += '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">';
      html += '<button data-action="unlockAll" style="padding:6px 12px;border-radius:8px;border:1px solid #00e676;' +
        'background:rgba(0,230,118,0.15);color:#00e676;font-size:12px;cursor:pointer;font-weight:700;">Unlock All</button>';
      html += '<button data-action="lockAll" style="padding:6px 12px;border-radius:8px;border:1px solid #ff5252;' +
        'background:rgba(255,82,82,0.15);color:#ff5252;font-size:12px;cursor:pointer;font-weight:700;">Lock All</button>';
      html += '<button data-action="reset" style="padding:6px 12px;border-radius:8px;border:1px solid #ff9100;' +
        'background:rgba(255,145,0,0.15);color:#ff9100;font-size:12px;cursor:pointer;font-weight:700;">Full Reset</button>';
      html += '</div>';

      panel.innerHTML = html;
    }

    panel.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var p = loadProgress();

      if (action === 'setEnergy') {
        p.energy = parseInt(btn.getAttribute('data-val'));
        // Re-check unlocks based on new energy
        for (var i = 0; i < UNLOCKS.length; i++) {
          if (p.energy >= UNLOCKS[i].energy && p.unlocked.indexOf(UNLOCKS[i].id) === -1) {
            p.unlocked.push(UNLOCKS[i].id);
          }
        }
        saveProgress(p);
      } else if (action === 'equip') {
        var id = btn.getAttribute('data-id');
        var slot = btn.getAttribute('data-slot');
        // Force unlock if not yet unlocked (admin override)
        if (p.unlocked.indexOf(id) === -1) p.unlocked.push(id);
        if (!p.equipped) p.equipped = {};
        p.equipped[slot] = id;
        saveProgress(p);
      } else if (action === 'unequip') {
        var uSlot = btn.getAttribute('data-slot');
        if (p.equipped) delete p.equipped[uSlot];
        saveProgress(p);
      } else if (action === 'unlockAll') {
        UNLOCKS.forEach(function(u) {
          if (p.unlocked.indexOf(u.id) === -1) p.unlocked.push(u.id);
        });
        p.energy = Math.max(p.energy, 1200);
        saveProgress(p);
      } else if (action === 'lockAll') {
        p.unlocked = [];
        p.equipped = {};
        saveProgress(p);
      } else if (action === 'reset') {
        p = { energy: 0, best: 0, unlocked: [], equipped: {} };
        saveProgress(p);
        saveTop10([]);
      }

      refresh();
    });

    document.body.appendChild(panel);
    refresh();
  }

  /* ════════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════════ */
  window._HSArcade = {
    start: startArcadeMode,
    stop: stopArcadeMode,
    admin: createAdminPanel,
    // Direct access for console testing
    equip: equipItem,
    unequip: unequipSlot,
    getProgress: loadProgress,
    setProgress: saveProgress
  };

})();
