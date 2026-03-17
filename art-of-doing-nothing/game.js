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
  var CHAPTER_NAMES = {
    1: 'Just Five More Minutes',
    2: 'The Comfort Zone',
    3: 'The Scroll Hole',
    4: 'The Wall',
    5: 'Tomorrow Starts Today'
  };

  /* ── Scene fade transition ── */
  var fadeAlpha = 0;       // 0 = no fade, 1 = fully black
  var fadeDirection = 0;   // 1 = fading out, -1 = fading in, 0 = idle
  var fadeCallback = null;
  var FADE_SPEED = 0.04;

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
    ctx.fillText('Chapter ' + currentChapter, canvasW / 2, canvasH / 2 + 15);
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
    ctx.fillText('Ch.' + currentChapter, 8, 14);

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
        Characters.drawSamBed(ctx, canvasW * 0.65, canvasH * 0.6);
        break;
      case 2:
        Characters.drawSamStanding(ctx, canvasW * 0.7, canvasH * 0.35, 0.9);
        break;
      case 3:
      case 4:
        Characters.drawSamDesk(ctx, canvasW * 0.68, canvasH * 0.55);
        break;
      case 5:
        // Ch5: just the sloth and Sam standing together, smaller
        Characters.drawSamStanding(ctx, canvasW * 0.55, canvasH * 0.4, 0.7);
        break;
    }
  }

  function drawMeter() {
    meterDisplay += (window._.procrastination - meterDisplay) * 0.08;

    var mw = canvasW * 0.6;
    var mh = 10;
    var mx = (canvasW - mw) / 2;
    var my = canvasH - 25;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 5);
    ctx.fill();

    var fillW = (meterDisplay / 100) * mw;
    if (fillW > 0) {
      var mGrad = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      mGrad.addColorStop(0, '#4ade80');
      mGrad.addColorStop(0.5, '#facc15');
      mGrad.addColorStop(1, '#ef4444');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.roundRect(mx, my, fillW, mh, 5);
      ctx.fill();
    }

    if (meterDisplay > 80 || meterDisplay < 20) {
      var pulse = Math.sin(animTime * 6) * 0.3 + 0.3;
      ctx.fillStyle = meterDisplay > 80
        ? 'rgba(239,68,68,' + pulse + ')'
        : 'rgba(74,222,128,' + pulse + ')';
      ctx.beginPath();
      ctx.roundRect(mx, my, fillW, mh, 5);
      ctx.fill();
    }

    ctx.font = '10px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Procrastination', canvasW / 2, my - 4);
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
    } else if (speaker === 'm') {
      Characters.setExpression('concerned', 'neutral');
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
    if (subtitle) subtitle.textContent = 'Chapter ' + ch + ': ' + (CHAPTER_NAMES[ch] || '');

    // Show title card
    showTitleCard(CHAPTER_NAMES[ch] || '');

    // Fade in
    fadeIn();

    // Load chapter source
    var srcName = CHAPTER_SOURCES[ch];
    if (!srcName || !window[srcName]) {
      console.error('Chapter ' + ch + ' not loaded');
      return;
    }

    var sections = DialogueEngine.parse(window[srcName]);

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

    var score = GameState.completeChapter(ch);
    updateScoreDisplay();

    // Show results with next chapter option
    dialogueBox.classList.add('active');
    speakerLabel.style.display = 'none';

    var endingName = getEndingName(ch, ending);
    var html = '<div class="ending-text">Chapter ' + ch + ' Complete</div>' +
      '<div class="ending-subtitle">Ending: ' + endingName + '</div>';
    dialogueText.innerHTML = html;

    // Show next chapter / chapter select buttons
    choiceContainer.innerHTML = '';
    choiceContainer.classList.add('active');
    clickPrompt.style.display = 'none';

    if (ch < 5) {
      var nextBtn = document.createElement('button');
      nextBtn.className = 'choice-btn chapter-nav-btn';
      nextBtn.textContent = 'Next: Chapter ' + (ch + 1) + ' — ' + CHAPTER_NAMES[ch + 1];
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
    selectBtn.textContent = 'Chapter Select';
    selectBtn.addEventListener('click', function () {
      choiceContainer.classList.remove('active');
      dialogueBox.classList.remove('active');
      showChapterSelectMenu();
    });
    choiceContainer.appendChild(selectBtn);

    var replayBtn = document.createElement('button');
    replayBtn.className = 'choice-btn chapter-nav-btn';
    replayBtn.textContent = 'Replay Chapter ' + ch;
    replayBtn.addEventListener('click', function () {
      choiceContainer.classList.remove('active');
      startChapter(ch);
    });
    choiceContainer.appendChild(replayBtn);

    // SlayPlay integration — only show score card overlay on final chapter
    // (intermediate chapters show our own next/select/replay buttons)
    if (typeof Arcade !== 'undefined') {
      Arcade.onGameOver('art-of-doing-nothing', score);
      if (ch === 5) {
        document.body.appendChild(Arcade.createScoreCard('art-of-doing-nothing', score, GameState.getBest()));
      }
    }
    if (typeof Leaderboard !== 'undefined' && score > 0) {
      Leaderboard.submitScore('art-of-doing-nothing', score).then(function () {
        Leaderboard.refresh('art-of-doing-nothing');
      });
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
      endText = 'Sam found a way forward. The sloth isn\'t gone — but it\'s honest now.';
    } else if (growth >= 2) {
      endText = 'Sam\'s journey was messy. But growth usually is.';
    } else {
      endText = 'The sloth\'s grip is strong. But awareness is the first step.';
    }

    dialogueText.innerHTML += '<div class="ending-subtitle" style="margin-top:12px">' + endText + '</div>' +
      '<div class="ending-subtitle">Final Score: ' + score + '</div>';
  }

  function updateScoreDisplay() {
    var scoreEl = document.getElementById('score');
    var bestEl = document.getElementById('bestScore');
    if (scoreEl) scoreEl.textContent = GameState.calcScore();
    if (bestEl) bestEl.textContent = GameState.getBest();
  }

  function getEndingName(ch, ending) {
    var names = {
      // Ch1
      comfort: 'The Comfort of Later',
      productive: 'A Fresh Start',
      stress: 'The Panic Sets In',
      // Ch2
      connection: 'Strength in Numbers',
      effort: 'Ugly but Real',
      avoidance: 'The Safe Route',
      isolation: 'Alone with Thoughts',
      // Ch3
      discipline: 'Master of Focus',
      balance: 'Bent, Not Broken',
      recovery: 'Climbing Out',
      lost: 'Swallowed Whole',
      // Ch4
      breakthrough: 'Seeing Through',
      grit: 'Brute Force',
      supported: 'A Friend at 2 AM',
      surrender: 'The White Flag',
      // Ch5
      integration: 'Together',
      willpower: 'The Iron Wall',
      growth: 'First Steps Forward'
    };
    return names[ending] || ending;
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

      btn.innerHTML = '<span class="ch-num">Chapter ' + i + '</span>' +
        '<span class="ch-title">' + CHAPTER_NAMES[i] + '</span>' +
        '<span class="ch-endings">' + endings.length + '/' + maxEndings + ' endings</span>' +
        (unlocked ? '' : '<span class="ch-lock">Locked</span>');

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
    }

    GameState.load();
    currentChapter = window._.CHAPTER || 1;
    targetBgColor = chapterPalette[currentChapter] || '#2D1B4E';
    bgColor = targetBgColor;
    updateScoreDisplay();

    resize();
    window.addEventListener('resize', resize);

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
