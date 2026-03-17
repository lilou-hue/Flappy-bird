/* ═══════════════════════════════════════════════════════════════
   game.js  –  Main game loop, canvas, orchestrator
   The Art of Doing Nothing
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── DOM refs ── */
  var canvas, ctx;
  var dialogueBox, speakerLabel, dialogueText, choiceContainer, clickPrompt;
  var meterBar, meterFill, meterValue;
  var muteBtn;

  /* ── State ── */
  var currentReveal = null;
  var executor = null;
  var gameStarted = false;
  var meterDisplay = 50;
  var canvasW, canvasH;
  var animTime = 0;
  var mouthTimer = 0;
  var bgColor = '#2D1B4E';
  var chapterPalette = {
    1: '#2D1B4E', 2: '#1B2D4E', 3: '#0A2A2A', 4: '#4E1B1B', 5: '#3A2D00'
  };

  /* ── Z particles (sleep particles) ── */
  var particles = [];

  function spawnZ() {
    particles.push({
      x: Characters.sloth.x + (Math.random() - 0.5) * 20,
      y: Characters.sloth.y - 50,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.5 - Math.random() * 0.5,
      life: 1,
      size: 10 + Math.random() * 8,
      char: 'z'
    });
  }

  /* ── Canvas rendering ── */
  function render() {
    animTime += 0.016;

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

    // Sam in bed (Ch1)
    if (window._.CHAPTER === 1) {
      Characters.drawSamBed(ctx, canvasW * 0.65, canvasH * 0.6);
    }

    // Sloth
    Characters.drawSloth(ctx, canvasW * 0.3, canvasH * 0.45, 1, animTime);

    // Z particles
    if (Characters.sloth.expression.eyes === 'sleepy' && Math.random() < 0.02) spawnZ();
    ctx.font = 'bold 14px "Space Grotesk", sans-serif';
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

    // Procrastination meter (canvas)
    drawMeter();

    requestAnimationFrame(render);
  }

  function drawMeter() {
    // Smooth lerp toward actual value
    meterDisplay += (window._.procrastination - meterDisplay) * 0.08;

    var mw = canvasW * 0.6;
    var mh = 10;
    var mx = (canvasW - mw) / 2;
    var my = canvasH - 25;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 5);
    ctx.fill();

    // Fill gradient
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

    // Pulse at extremes
    if (meterDisplay > 80 || meterDisplay < 20) {
      var pulse = Math.sin(animTime * 6) * 0.3 + 0.3;
      ctx.fillStyle = meterDisplay > 80
        ? 'rgba(239,68,68,' + pulse + ')'
        : 'rgba(74,222,128,' + pulse + ')';
      ctx.beginPath();
      ctx.roundRect(mx, my, fillW, mh, 5);
      ctx.fill();
    }

    // Labels
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

    // Set expression based on speaker
    if (speaker === 's') {
      Characters.setExpression('sleepy', 'smile');
      Characters.setSpeaking(true);
    } else if (speaker === 'm') {
      Characters.setExpression('concerned', 'neutral');
    }

    // Text reveal
    var charDelay = 30;
    var charCount = 0;
    currentReveal = DialogueEngine.revealText(dialogueText, text, charDelay,
      function onChar() {
        charCount++;
        // Voice blip every 2 chars
        if (charCount % 2 === 0) {
          window.GameAudio.blip(speakerInfo.blipPitch);
        }
        // Mouth sync
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
    // Don't advance if clicking a choice button
    if (e.target.closest('.choice-btn')) return;

    window.GameAudio.init();

    if (!gameStarted) {
      startGame();
      return;
    }

    // Skip text reveal or advance dialogue
    if (currentReveal && !currentReveal.done) {
      currentReveal.skip();
    } else if (executor) {
      clickPrompt.style.display = 'none';
      executor.advance();
    }
  }

  /* ── Start game ── */
  function startGame() {
    gameStarted = true;
    document.getElementById('startOverlay').style.display = 'none';

    window.GameAudio.startAmbient(110);
    window._.chapterStartTime = Date.now();

    // Parse chapter 1
    if (!window.Chapter1) {
      console.error('Chapter 1 not loaded');
      return;
    }

    var sections = DialogueEngine.parse(window.Chapter1);

    executor = new DialogueEngine.Executor(sections, {
      onDialogue: showDialogue,
      onChoices: showChoices,
      onWait: function () {
        dialogueBox.classList.remove('active');
      },
      onExec: function (code) {
        // Check for meter changes
        if (code.indexOf('adjustMeter') !== -1 || code.indexOf('procrastination') !== -1) {
          window.GameAudio.meterTone(window._.procrastination > meterDisplay ? 1 : -1);
        }
      },
      onEnd: function () {
        onChapterEnd();
      }
    });

    executor.goto('start');
  }

  /* ── Chapter end ── */
  function onChapterEnd() {
    var ending = window._.ch1_ending || 'comfort';
    GameState.discoverEnding('ch1_' + ending);

    // Check achievements
    if (window._.snoozeCount >= 3) GameState.unlockAchievement('snooze_king');
    if (!window._.snoozed && !window._.checkedPhone) GameState.unlockAchievement('early_bird');
    if (window._.checkedPhone && window._.scrolledDeep) GameState.unlockAchievement('scroll_hole');

    var elapsed = (Date.now() - window._.chapterStartTime) / 1000;
    if (elapsed < 180) GameState.unlockAchievement('speed_reader');

    // Check all Ch1 endings
    var ch1Endings = window._.endingsDiscovered.filter(function (e) { return e.startsWith('ch1_'); });
    if (ch1Endings.length >= 3) GameState.unlockAchievement('all_endings_ch1');

    var score = GameState.completeChapter(1);
    updateScoreDisplay();

    // Show results
    dialogueBox.classList.add('active');
    speakerLabel.style.display = 'none';
    dialogueText.innerHTML = '<div class="ending-text">Chapter 1 Complete</div>' +
      '<div class="ending-subtitle">Ending: ' + getEndingName(ending) + '</div>';
    choiceContainer.innerHTML = '';
    choiceContainer.classList.remove('active');
    clickPrompt.style.display = 'none';

    // SlayPlay integration
    if (typeof Arcade !== 'undefined') {
      Arcade.onGameOver('art-of-doing-nothing', score);
      document.body.appendChild(Arcade.createScoreCard('art-of-doing-nothing', score, GameState.getBest()));
    }
    if (typeof Leaderboard !== 'undefined' && score > 0) {
      Leaderboard.submitScore('art-of-doing-nothing', score).then(function () {
        Leaderboard.refresh('art-of-doing-nothing');
      });
    }
  }

  function updateScoreDisplay() {
    var scoreEl = document.getElementById('score');
    var bestEl = document.getElementById('bestScore');
    if (scoreEl) scoreEl.textContent = GameState.calcScore();
    if (bestEl) bestEl.textContent = GameState.getBest();
  }

  function getEndingName(ending) {
    var names = {
      comfort: 'The Comfort of Later',
      productive: 'A Fresh Start',
      stress: 'The Panic Sets In'
    };
    return names[ending] || ending;
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

    // i18n
    if (typeof I18N !== 'undefined') {
      I18N.createSelector(document.querySelector('.game__header'));
      I18N.applyDOM();
    }

    // Load saved state
    GameState.load();

    // Set chapter palette
    bgColor = chapterPalette[window._.CHAPTER] || '#2D1B4E';

    // Update score display
    updateScoreDisplay();

    // Resize
    resize();
    window.addEventListener('resize', resize);

    // Click to advance
    document.addEventListener('click', onAdvance);
    document.addEventListener('touchend', function (e) {
      if (e.target.closest('.choice-btn') || e.target.closest('#muteButton') || e.target.closest('#restartButton') || e.target.closest('.back-link') || e.target.closest('#leaderboardToggle')) return;
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
        if (executor) executor.stop();
        executor = null;
        currentReveal = null;
        meterDisplay = 50;
        dialogueBox.classList.remove('active');
        choiceContainer.classList.remove('active');
        document.getElementById('startOverlay').style.display = 'flex';
        Characters.setExpression('sleepy', 'smile');
        window.GameAudio.stopAmbient();
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

    // Start render loop
    render();
  }

  // Init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
