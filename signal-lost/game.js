/* Signal Lost — Main Game Logic */
var SignalLost = (function () {
  'use strict';

  /* ── Constants ── */
  var CANVAS_W = 480, CANVAS_H = 640;
  var FPS = 30;
  var NIGHT_DURATION = 360; // seconds to survive (6 min = "6 AM")
  var POWER_MAX = 100;
  var POWER_DRAIN_BASE = 0.04;   // per second
  var POWER_DRAIN_CAM = 0.02;    // extra per second while viewing
  var POWER_DRAIN_DOOR = 0.08;   // per door per second
  var ENTITY_MOVE_INTERVAL_BASE = 8; // seconds between moves at start
  var ENTITY_MOVE_INTERVAL_MIN = 2.5;
  var ENTITY_SPEED_RAMP = 0.015; // how much faster per second of game time

  /* ── Room Graph ── */
  var ROOMS = [
    { id: 0, name: 'Lab',         cam: 0, x: 0.15, y: 0.3 },
    { id: 1, name: 'Corridor',    cam: 1, x: 0.4,  y: 0.3 },
    { id: 2, name: 'Server Room', cam: 2, x: 0.7,  y: 0.15 },
    { id: 3, name: 'Stairwell',   cam: 3, x: 0.7,  y: 0.5 },
    { id: 4, name: 'Storage',     cam: 4, x: 0.9,  y: 0.7 }
  ];
  // Control room is the player's location (not a camera)
  var CONTROL_ROOM = { id: 5, name: 'Control Room', x: 0.4, y: 0.7 };

  // Adjacency: which rooms connect
  var ADJ = {
    0: [1],
    1: [0, 2, 3],
    2: [1],
    3: [1, 4, 5],  // 5 = control room
    4: [3],
    5: [3, 1]      // doors: left=room1(corridor), right=room3(stairwell)
  };

  // Door mapping: doorLeft blocks path between room 1 and control room (5)
  // doorRight blocks path between room 3 and control room (5)
  var DOOR_LEFT_BLOCKS = [1, 5];
  var DOOR_RIGHT_BLOCKS = [3, 5];

  /* ── Room Scene Generators ── */
  var ROOM_COLORS = [
    { bg: '#0d1f0d', accent: '#1e4a1e', detail: '#3a7a3a', wall: '#142e14', floor: '#0a150a' }, // Lab
    { bg: '#0d0d20', accent: '#1e1e50', detail: '#3a3a80', wall: '#14142e', floor: '#0a0a15' }, // Corridor
    { bg: '#200d0d', accent: '#501e1e', detail: '#803a3a', wall: '#2e1414', floor: '#150a0a' }, // Server Room
    { bg: '#111118', accent: '#28283e', detail: '#454570', wall: '#1a1a28', floor: '#0d0d12' }, // Stairwell
    { bg: '#0d1a0d', accent: '#1e3a1e', detail: '#3a6a3a', wall: '#142814', floor: '#0a140a' }  // Storage
  ];
  var noiseCanvas = null;

  /* ── State ── */
  var canvas, ctx2d;
  var running = false;
  var gameOver = false;
  var currentCam = 0;
  var power = POWER_MAX;
  var doorLeft = false, doorRight = false;
  var entityRoom = 0;          // entity starts in room 0
  var entityVisible = false;   // is entity on current camera
  var entityMoveTimer = 0;
  var entityMoveInterval = ENTITY_MOVE_INTERVAL_BASE;
  var entityAtDoor = -1;       // -1=not at door, 0=left door, 1=right door
  var survivalTime = 0;
  var bestTime = 0;
  var hour = 0;                // 0-5 representing 12AM-6AM
  var staticIntensity = 0;
  var noiseData = null;
  var anomalyTimer = 0;
  var anomalyActive = null;
  var frameCount = 0;
  var lastTime = 0;
  var camBtns, doorLeftBtn, doorRightBtn, powerFill, powerPct, scoreEl, bestEl, muteBtn;
  var tutorialEl, startBtn, restartBtn, fullscreenBtn, lbToggle;
  var gameTick = null;

  /* ── Init ── */
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx2d = canvas.getContext('2d');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    camBtns = document.querySelectorAll('.cam-btn');
    doorLeftBtn = document.getElementById('doorLeft');
    doorRightBtn = document.getElementById('doorRight');
    powerFill = document.getElementById('powerFill');
    powerPct = document.getElementById('powerPct');
    scoreEl = document.getElementById('score');
    bestEl = document.getElementById('bestScore');
    muteBtn = document.getElementById('muteButton');
    tutorialEl = document.getElementById('tutorialOverlay');
    startBtn = document.getElementById('startBtn');
    restartBtn = document.getElementById('restartButton');
    fullscreenBtn = document.getElementById('fullscreenButton');
    lbToggle = document.getElementById('leaderboardToggle');

    bestTime = parseInt(localStorage.getItem('signalLostBest') || '0', 10);
    bestEl.textContent = formatTime(bestTime);

    // Generate noise texture
    generateNoise();

    // Events
    camBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { switchCam(parseInt(btn.dataset.cam)); });
    });
    doorLeftBtn.addEventListener('click', function () { toggleDoor('left'); });
    doorRightBtn.addEventListener('click', function () { toggleDoor('right'); });
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    muteBtn.addEventListener('click', function () {
      var m = SLAudio.toggleMute();
      muteBtn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
    });
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', function () {
        var el = document.getElementById('gameContainer');
        if (!document.fullscreenElement) {
          (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
        } else {
          (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
        }
      });
    }
    if (lbToggle && typeof Leaderboard !== 'undefined') {
      lbToggle.addEventListener('click', function () { Leaderboard.toggle('signal-lost'); });
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('arcade-restart', restartGame);

    // Draw idle screen
    drawRoom(currentCam, 0);
  }

  function onKey(e) {
    if (!running || gameOver) return;
    var k = e.key;
    if (k >= '1' && k <= '5') { switchCam(parseInt(k) - 1); e.preventDefault(); }
    if (k === 'q' || k === 'Q') { toggleDoor('left'); e.preventDefault(); }
    if (k === 'e' || k === 'E') { toggleDoor('right'); e.preventDefault(); }
  }

  /* ── Game flow ── */
  function startGame() {
    tutorialEl.classList.add('hidden');
    SLAudio.init();
    resetState();
    running = true;
    gameOver = false;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function restartGame() {
    resetState();
    tutorialEl.classList.add('hidden');
    running = true;
    gameOver = false;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function resetState() {
    arcadeReported = false;
    if (_endGameTimer1) { clearTimeout(_endGameTimer1); _endGameTimer1 = null; }
    if (_endGameTimer2) { clearTimeout(_endGameTimer2); _endGameTimer2 = null; }
    power = POWER_MAX;
    currentCam = 0;
    doorLeft = false;
    doorRight = false;
    entityRoom = 0;
    entityVisible = false;
    entityMoveTimer = 0;
    entityMoveInterval = ENTITY_MOVE_INTERVAL_BASE;
    entityAtDoor = -1;
    survivalTime = 0;
    hour = 0;
    staticIntensity = 0;
    anomalyTimer = 5 + Math.random() * 10;
    anomalyActive = null;
    frameCount = 0;
    updateUI();
    camBtns.forEach(function (b, i) { b.classList.toggle('active', i === 0); b.classList.remove('has-entity'); });
    doorLeftBtn.classList.remove('locked');
    doorRightBtn.classList.remove('locked');
  }

  /* ── Main loop ── */
  function loop(ts) {
    if (!running) return;
    var dt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;

    update(dt);
    render();
    frameCount++;

    if (running && !gameOver) {
      requestAnimationFrame(loop);
    }
  }

  function update(dt) {
    if (gameOver) return;

    survivalTime += dt;
    hour = Math.min(5, Math.floor(survivalTime / (NIGHT_DURATION / 6)));

    // Power drain
    var drain = POWER_DRAIN_BASE + POWER_DRAIN_CAM;
    if (doorLeft) drain += POWER_DRAIN_DOOR;
    if (doorRight) drain += POWER_DRAIN_DOOR;
    power = Math.max(0, power - drain * dt);

    // Update power UI
    updatePowerUI();

    // Check win
    if (survivalTime >= NIGHT_DURATION) {
      win();
      return;
    }

    // Check power out
    if (power <= 0) {
      powerOut();
      return;
    }

    // Entity AI
    updateEntity(dt);

    // Anomaly events
    updateAnomalies(dt);

    // Audio
    var tension = Math.min(1, survivalTime / NIGHT_DURATION + (entityRoom >= 3 ? 0.3 : 0));
    SLAudio.setHeartbeat(tension);
    SLAudio.setDrone(tension * 0.7);

    // Score display
    scoreEl.textContent = formatTime(Math.floor(survivalTime));

    // Static intensity based on entity proximity
    var dist = getEntityDistToControl();
    staticIntensity = Math.max(0, 1 - dist * 0.3) * 0.5;
    if (entityRoom === currentCam) staticIntensity += 0.2;

    // Camera entity indicator
    camBtns.forEach(function (b, i) {
      b.classList.toggle('has-entity', i === entityRoom && i !== currentCam);
    });
  }

  /* ── Entity AI ── */
  function updateEntity(dt) {
    // Entity freezes when watched
    if (entityRoom === currentCam) {
      entityVisible = true;
      return;
    }
    entityVisible = false;

    entityMoveTimer += dt;
    // Speed increases over time
    entityMoveInterval = Math.max(
      ENTITY_MOVE_INTERVAL_MIN,
      ENTITY_MOVE_INTERVAL_BASE - survivalTime * ENTITY_SPEED_RAMP
    );

    if (entityMoveTimer >= entityMoveInterval) {
      entityMoveTimer = 0;
      moveEntity();
    }
  }

  function moveEntity() {
    var neighbors = ADJ[entityRoom];
    if (!neighbors || neighbors.length === 0) return;

    // Filter blocked paths
    var available = neighbors.filter(function (n) {
      // Check doors
      if (doorLeft && isBlocked(entityRoom, n, DOOR_LEFT_BLOCKS)) return false;
      if (doorRight && isBlocked(entityRoom, n, DOOR_RIGHT_BLOCKS)) return false;
      return true;
    });

    if (available.length === 0) {
      // Blocked — entity bangs on door
      if (neighbors.indexOf(5) >= 0) {
        SLAudio.footstep();
        // Check which door
        if (entityRoom === 1 && doorLeft) entityAtDoor = 0;
        if (entityRoom === 3 && doorRight) entityAtDoor = 1;
      }
      return;
    }

    entityAtDoor = -1;

    // Prefer moving toward control room (BFS shortest path)
    var best = available[0];
    var bestDist = 999;
    for (var i = 0; i < available.length; i++) {
      var d = bfsDistance(available[i], 5);
      if (d < bestDist) { bestDist = d; best = available[i]; }
    }

    // Random chance to not take optimal path (makes it less predictable)
    if (Math.random() < 0.3 && available.length > 1) {
      best = available[Math.floor(Math.random() * available.length)];
    }

    // Move
    if (best === 5) {
      // Reached control room — game over
      entityReached();
      return;
    }

    entityRoom = best;
    SLAudio.footstep();

    // Play whisper occasionally
    if (Math.random() < 0.2) {
      setTimeout(function () { SLAudio.whisper(); }, 300);
    }
  }

  function isBlocked(from, to, doorPair) {
    return (from === doorPair[0] && to === doorPair[1]) ||
           (from === doorPair[1] && to === doorPair[0]);
  }

  function bfsDistance(from, to) {
    if (from === to) return 0;
    var visited = {};
    var queue = [[from, 0]];
    visited[from] = true;
    while (queue.length > 0) {
      var curr = queue.shift();
      var node = curr[0], dist = curr[1];
      var neighbors = ADJ[node] || [];
      for (var i = 0; i < neighbors.length; i++) {
        var n = neighbors[i];
        if (n === to) return dist + 1;
        if (!visited[n]) {
          visited[n] = true;
          queue.push([n, dist + 1]);
        }
      }
    }
    return 999;
  }

  function getEntityDistToControl() {
    return bfsDistance(entityRoom, 5);
  }

  /* ── Anomalies ── */
  function updateAnomalies(dt) {
    if (anomalyActive) {
      anomalyActive.timer -= dt;
      if (anomalyActive.timer <= 0) anomalyActive = null;
      return;
    }
    anomalyTimer -= dt;
    if (anomalyTimer <= 0) {
      triggerAnomaly();
      anomalyTimer = 8 + Math.random() * 15;
    }
  }

  function triggerAnomaly() {
    var types = ['shadow', 'invert', 'text', 'glitch', 'flicker'];
    var type = types[Math.floor(Math.random() * types.length)];
    anomalyActive = { type: type, timer: 1.5 + Math.random() * 2 };
    SLAudio.anomaly();
  }

  /* ── Game end states ── */
  function entityReached() {
    running = false;
    gameOver = true;
    SLAudio.scare();
    // Flash red then show game over
    drawJumpscare();
    _endGameTimer1 = setTimeout(function () { _endGameTimer1 = null; endGame(); }, 2000);
  }

  function powerOut() {
    running = false;
    gameOver = true;
    // Darkness then entity gets you
    power = 0;
    updatePowerUI();
    SLAudio.setDrone(1);
    _endGameTimer2 = setTimeout(function () {
      _endGameTimer2 = null;
      SLAudio.scare();
      drawJumpscare();
      _endGameTimer1 = setTimeout(function () { _endGameTimer1 = null; endGame(); }, 2000);
    }, 2000);
  }

  var arcadeReported = false;
  var _endGameTimer1 = null;
  var _endGameTimer2 = null;

  function win() {
    running = false;
    gameOver = true;
    var score = Math.floor(survivalTime);
    var prevBest = bestTime;
    saveBest(score);
    // Draw 6 AM screen
    ctx2d.fillStyle = '#000';
    ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx2d.fillStyle = '#ffcc00';
    ctx2d.font = 'bold 64px Space Grotesk, monospace';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('6:00 AM', CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx2d.fillStyle = '#888';
    ctx2d.font = '20px Space Grotesk, monospace';
    ctx2d.fillText('You survived the night.', CANVAS_W / 2, CANVAS_H / 2 + 30);
    if (!arcadeReported && typeof Arcade !== 'undefined') {
      arcadeReported = true;
      Arcade.onGameOver('signal-lost', score);
      document.body.appendChild(Arcade.createScoreCard('signal-lost', score, prevBest));
    }
  }

  function endGame() {
    if (arcadeReported) return;
    var score = Math.floor(survivalTime);
    var prevBest = bestTime;
    saveBest(score);
    if (typeof Arcade !== 'undefined') {
      arcadeReported = true;
      Arcade.onGameOver('signal-lost', score);
      document.body.appendChild(Arcade.createScoreCard('signal-lost', score, prevBest));
    }
  }

  function saveBest(score) {
    if (score > bestTime) {
      bestTime = score;
      localStorage.setItem('signalLostBest', String(bestTime));
    }
    bestEl.textContent = formatTime(bestTime);
  }

  /* ── Camera / Door controls ── */
  function switchCam(idx) {
    if (idx < 0 || idx > 4 || idx === currentCam) return;
    currentCam = idx;
    camBtns.forEach(function (b, i) { b.classList.toggle('active', i === idx); });
    SLAudio.cameraSwitch();
    // Brief static burst on switch
    staticIntensity = 0.8;
    setTimeout(function () { staticIntensity = Math.max(0, staticIntensity - 0.5); }, 200);
  }

  function toggleDoor(side) {
    if (!running || gameOver) return;
    if (side === 'left') {
      doorLeft = !doorLeft;
      doorLeftBtn.classList.toggle('locked', doorLeft);
    } else {
      doorRight = !doorRight;
      doorRightBtn.classList.toggle('locked', doorRight);
    }
    SLAudio.doorLock();
  }

  /* ── Rendering ── */
  function render() {
    drawRoom(currentCam, survivalTime);
    drawEntity();
    drawAnomalyEffect();
    drawNoise();
    drawScanlines();
    drawVignette();
    drawHUD();
  }

  function drawRoom(camIdx, time) {
    var c = ROOM_COLORS[camIdx];
    // Background
    ctx2d.fillStyle = c.bg;
    ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Room-specific procedural scene
    switch (camIdx) {
      case 0: drawLabRoom(c, time); break;
      case 1: drawCorridorRoom(c, time); break;
      case 2: drawServerRoom(c, time); break;
      case 3: drawStairwellRoom(c, time); break;
      case 4: drawStorageRoom(c, time); break;
    }

    // Camera label
    ctx2d.fillStyle = 'rgba(51, 255, 51, 0.6)';
    ctx2d.font = '12px Space Grotesk, monospace';
    ctx2d.textAlign = 'left';
    ctx2d.fillText('CAM ' + (camIdx + 1) + ' — ' + ROOMS[camIdx].name, 12, 24);

    // Timestamp
    var h = 12 + hour;
    if (h > 12) h -= 12;
    var min = Math.floor((survivalTime % (NIGHT_DURATION / 6)) / (NIGHT_DURATION / 6) * 60);
    var ampm = hour < 6 ? 'AM' : 'AM';
    ctx2d.textAlign = 'right';
    ctx2d.fillText(h + ':' + (min < 10 ? '0' : '') + min + ' AM', CANVAS_W - 12, 24);
  }

  function drawLabRoom(c, t) {
    // Back wall
    ctx2d.fillStyle = c.wall;
    ctx2d.fillRect(0, 60, CANVAS_W, 440);
    // Wall panels
    ctx2d.strokeStyle = c.accent;
    ctx2d.lineWidth = 1;
    for (var p = 0; p < 5; p++) {
      ctx2d.strokeRect(10 + p * 95, 70, 85, 200);
    }
    // Ceiling
    ctx2d.fillStyle = '#1a1a1a';
    ctx2d.fillRect(0, 0, CANVAS_W, 60);
    // Ceiling pipe
    ctx2d.fillStyle = '#444';
    ctx2d.fillRect(0, 50, CANVAS_W, 6);
    ctx2d.fillRect(0, 56, CANVAS_W, 4);
    // Flickering ceiling light
    var lightOn = Math.sin(t * 3) > -0.3;
    if (lightOn) {
      ctx2d.fillStyle = 'rgba(100, 255, 100, 0.06)';
      ctx2d.fillRect(160, 60, 160, 440);
      ctx2d.fillStyle = '#556';
      ctx2d.fillRect(220, 56, 40, 6);
    }
    // Tables
    ctx2d.fillStyle = c.detail;
    ctx2d.fillRect(30, 360, 200, 14);
    ctx2d.fillRect(270, 330, 170, 14);
    // Table legs
    ctx2d.fillStyle = c.accent;
    ctx2d.fillRect(40, 374, 8, 50);
    ctx2d.fillRect(220, 374, 8, 50);
    ctx2d.fillRect(280, 344, 8, 50);
    ctx2d.fillRect(430, 344, 8, 50);
    // Beakers / lab equipment
    ctx2d.fillStyle = '#4a8a4a';
    for (var i = 0; i < 4; i++) {
      ctx2d.fillRect(50 + i * 40, 338, 14, 22);
      ctx2d.fillStyle = 'rgba(100, 255, 100, 0.3)';
      ctx2d.fillRect(52 + i * 40, 345, 10, 12);
      ctx2d.fillStyle = '#4a8a4a';
    }
    // Monitor on right table
    ctx2d.fillStyle = '#222';
    ctx2d.fillRect(320, 280, 60, 50);
    ctx2d.fillStyle = '#1a3a1a';
    ctx2d.fillRect(324, 284, 52, 42);
    // Floor
    ctx2d.fillStyle = c.floor;
    ctx2d.fillRect(0, 500, CANVAS_W, 140);
    // Floor tiles
    ctx2d.strokeStyle = '#1e2e1e';
    ctx2d.lineWidth = 1;
    for (var x = 0; x < CANVAS_W; x += 60) {
      ctx2d.beginPath(); ctx2d.moveTo(x, 500); ctx2d.lineTo(x, 640); ctx2d.stroke();
    }
    for (var fy = 500; fy < 640; fy += 60) {
      ctx2d.beginPath(); ctx2d.moveTo(0, fy); ctx2d.lineTo(CANVAS_W, fy); ctx2d.stroke();
    }
    // Side wall edges
    ctx2d.fillStyle = c.accent;
    ctx2d.fillRect(0, 60, 10, 440);
    ctx2d.fillRect(CANVAS_W - 10, 60, 10, 440);
  }

  function drawCorridorRoom(c, t) {
    // Ceiling
    ctx2d.fillStyle = '#151520';
    ctx2d.fillRect(0, 0, CANVAS_W, 100);
    // Floor
    ctx2d.fillStyle = c.floor;
    ctx2d.fillRect(0, 480, CANVAS_W, 160);
    // Back wall (end of corridor)
    ctx2d.fillStyle = c.wall;
    ctx2d.fillRect(180, 200, 120, 280);
    // Left wall (perspective)
    ctx2d.fillStyle = c.accent;
    ctx2d.beginPath();
    ctx2d.moveTo(0, 80); ctx2d.lineTo(180, 200); ctx2d.lineTo(180, 480); ctx2d.lineTo(0, 640);
    ctx2d.fill();
    // Right wall (perspective)
    ctx2d.beginPath();
    ctx2d.moveTo(CANVAS_W, 80); ctx2d.lineTo(300, 200); ctx2d.lineTo(300, 480); ctx2d.lineTo(CANVAS_W, 640);
    ctx2d.fill();
    // Wall trim lines
    ctx2d.strokeStyle = c.detail;
    ctx2d.lineWidth = 2;
    ctx2d.beginPath(); ctx2d.moveTo(0, 300); ctx2d.lineTo(180, 340); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.moveTo(CANVAS_W, 300); ctx2d.lineTo(300, 340); ctx2d.stroke();
    // Door frames on left wall
    ctx2d.fillStyle = c.detail;
    ctx2d.fillRect(60, 200, 50, 120);
    ctx2d.fillStyle = '#0a0a18';
    ctx2d.fillRect(65, 205, 40, 110);
    // Door frame on right wall
    ctx2d.fillStyle = c.detail;
    ctx2d.fillRect(370, 200, 50, 120);
    ctx2d.fillStyle = '#0a0a18';
    ctx2d.fillRect(375, 205, 40, 110);
    // End wall door
    ctx2d.fillStyle = c.detail;
    ctx2d.fillRect(210, 260, 60, 120);
    ctx2d.fillStyle = '#0a0a18';
    ctx2d.fillRect(215, 265, 50, 110);
    ctx2d.fillStyle = '#888';
    ctx2d.beginPath(); ctx2d.arc(258, 320, 3, 0, Math.PI * 2); ctx2d.fill();
    // Ceiling lights (flickering)
    for (var i = 0; i < 3; i++) {
      var lightFlicker = Math.sin(t * 4 + i * 2) > -0.5;
      ctx2d.fillStyle = '#444';
      ctx2d.fillRect(215, 195 + i * 5, 50, 4);
      if (lightFlicker) {
        ctx2d.fillStyle = 'rgba(140, 160, 255, 0.08)';
        ctx2d.fillRect(190, 200 + i * 85, 100, 85);
      }
    }
    // Floor perspective lines
    ctx2d.strokeStyle = '#1a1a2a';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath(); ctx2d.moveTo(240, 200); ctx2d.lineTo(240, 480); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.moveTo(0, 560); ctx2d.lineTo(CANVAS_W, 560); ctx2d.stroke();
  }

  function drawServerRoom(c, t) {
    // Back wall
    ctx2d.fillStyle = c.wall;
    ctx2d.fillRect(0, 60, CANVAS_W, 470);
    // Ceiling
    ctx2d.fillStyle = '#1a1010';
    ctx2d.fillRect(0, 0, CANVAS_W, 60);
    // Floor
    ctx2d.fillStyle = c.floor;
    ctx2d.fillRect(0, 530, CANVAS_W, 110);
    // Raised floor panels
    ctx2d.strokeStyle = '#251515';
    ctx2d.lineWidth = 1;
    for (var fx = 0; fx < CANVAS_W; fx += 80) {
      ctx2d.strokeRect(fx, 530, 80, 55);
    }
    // Server racks
    for (var i = 0; i < 5; i++) {
      var rx = 20 + i * 92;
      // Rack body
      ctx2d.fillStyle = '#1a1a1a';
      ctx2d.fillRect(rx, 120, 76, 410);
      // Rack front panel
      ctx2d.fillStyle = '#222';
      ctx2d.fillRect(rx + 4, 125, 68, 400);
      ctx2d.strokeStyle = c.accent;
      ctx2d.lineWidth = 1;
      ctx2d.strokeRect(rx, 120, 76, 410);
      // Drive bays / units
      for (var j = 0; j < 10; j++) {
        ctx2d.fillStyle = '#181818';
        ctx2d.fillRect(rx + 8, 135 + j * 38, 60, 32);
        ctx2d.strokeStyle = '#333';
        ctx2d.strokeRect(rx + 8, 135 + j * 38, 60, 32);
        // Blinking LEDs
        var on1 = Math.sin(t * 5 + i + j * 0.7) > 0;
        var on2 = Math.sin(t * 3 + i * 2 + j) > 0.2;
        ctx2d.fillStyle = on1 ? '#33ff33' : '#1a1a1a';
        ctx2d.fillRect(rx + 12, 140 + j * 38, 5, 5);
        ctx2d.fillStyle = on2 ? (Math.sin(t + j) > 0.8 ? '#ff4444' : '#33ff33') : '#1a1a1a';
        ctx2d.fillRect(rx + 20, 140 + j * 38, 5, 5);
        // Activity light (random flicker)
        if (Math.random() > 0.85) {
          ctx2d.fillStyle = '#ffaa00';
          ctx2d.fillRect(rx + 28, 140 + j * 38, 5, 5);
        }
      }
    }
    // Cable trays on ceiling
    ctx2d.fillStyle = '#333';
    ctx2d.fillRect(0, 55, CANVAS_W, 8);
    // Hanging cables
    ctx2d.strokeStyle = '#444';
    ctx2d.lineWidth = 2;
    for (var ci = 0; ci < 3; ci++) {
      ctx2d.beginPath();
      ctx2d.moveTo(100 + ci * 140, 63);
      ctx2d.quadraticCurveTo(100 + ci * 140 + 20, 90, 100 + ci * 140, 120);
      ctx2d.stroke();
    }
  }

  function drawStairwellRoom(c, t) {
    // Walls
    ctx2d.fillStyle = c.wall;
    ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Left wall
    ctx2d.fillStyle = c.accent;
    ctx2d.fillRect(0, 0, 70, CANVAS_H);
    // Right wall
    ctx2d.fillRect(CANVAS_W - 70, 0, 70, CANVAS_H);
    // Stairs going down
    for (var i = 0; i < 10; i++) {
      var sy = 180 + i * 42;
      var sw = 320 - i * 18;
      var sx = (CANVAS_W - sw) / 2;
      // Step top
      ctx2d.fillStyle = i % 2 === 0 ? '#222230' : '#1a1a28';
      ctx2d.fillRect(sx, sy, sw, 38);
      // Step edge highlight
      ctx2d.fillStyle = '#333345';
      ctx2d.fillRect(sx, sy, sw, 3);
      // Step shadow
      ctx2d.fillStyle = '#0a0a12';
      ctx2d.fillRect(sx, sy + 35, sw, 3);
      ctx2d.strokeStyle = '#2a2a40';
      ctx2d.lineWidth = 1;
      ctx2d.strokeRect(sx, sy, sw, 38);
    }
    // Railing - left
    ctx2d.strokeStyle = '#555570';
    ctx2d.lineWidth = 4;
    ctx2d.beginPath();
    ctx2d.moveTo(80, 170); ctx2d.lineTo(155, 610);
    ctx2d.stroke();
    // Railing - right
    ctx2d.beginPath();
    ctx2d.moveTo(400, 170); ctx2d.lineTo(325, 610);
    ctx2d.stroke();
    // Railing balusters
    ctx2d.strokeStyle = '#3a3a55';
    ctx2d.lineWidth = 2;
    for (var bi = 0; bi < 8; bi++) {
      var bpct = bi / 7;
      var blx = 80 + (155 - 80) * bpct;
      var bly = 170 + (610 - 170) * bpct;
      ctx2d.beginPath(); ctx2d.moveTo(blx, bly); ctx2d.lineTo(blx + 5, bly + 50); ctx2d.stroke();
      var brx = 400 + (325 - 400) * bpct;
      ctx2d.beginPath(); ctx2d.moveTo(brx, bly); ctx2d.lineTo(brx - 5, bly + 50); ctx2d.stroke();
    }
    // Overhead light swinging
    var swing = Math.sin(t * 1.5) * 25;
    var lightX = CANVAS_W / 2 + swing;
    // Light cone
    ctx2d.fillStyle = 'rgba(255, 220, 140, 0.06)';
    ctx2d.beginPath();
    ctx2d.moveTo(lightX - 5, 160);
    ctx2d.lineTo(lightX - 80, 500);
    ctx2d.lineTo(lightX + 80, 500);
    ctx2d.lineTo(lightX + 5, 160);
    ctx2d.fill();
    // Light bulb
    ctx2d.fillStyle = '#998855';
    ctx2d.fillRect(lightX - 3, 140, 6, 20);
    // Wire
    ctx2d.strokeStyle = '#555';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath(); ctx2d.moveTo(CANVAS_W / 2, 0); ctx2d.lineTo(lightX, 140); ctx2d.stroke();
  }

  function drawStorageRoom(c, t) {
    // Back wall
    ctx2d.fillStyle = c.wall;
    ctx2d.fillRect(0, 40, CANVAS_W, 500);
    // Ceiling
    ctx2d.fillStyle = '#141a14';
    ctx2d.fillRect(0, 0, CANVAS_W, 40);
    // Floor
    ctx2d.fillStyle = c.floor;
    ctx2d.fillRect(0, 540, CANVAS_W, 100);
    // Concrete floor texture
    ctx2d.strokeStyle = '#1a241a';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath(); ctx2d.moveTo(0, 570); ctx2d.lineTo(CANVAS_W, 570); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.moveTo(0, 600); ctx2d.lineTo(CANVAS_W, 600); ctx2d.stroke();
    // Metal shelving units (3 rows)
    for (var row = 0; row < 3; row++) {
      var sy = 140 + row * 130;
      // Shelf uprights
      ctx2d.fillStyle = '#3a4a3a';
      ctx2d.fillRect(20, sy - 50, 6, 140);
      ctx2d.fillRect(CANVAS_W - 26, sy - 50, 6, 140);
      ctx2d.fillRect(240, sy - 50, 6, 140);
      // Shelf surface
      ctx2d.fillStyle = '#2a3a2a';
      ctx2d.fillRect(20, sy, CANVAS_W - 40, 10);
      // Boxes and items on shelves
      var boxColors = ['#2a4a2a', '#3a5a3a', '#1e3e1e', '#2e4e2e', '#254525'];
      for (var b = 0; b < 6; b++) {
        var bx = 32 + b * 70 + Math.sin(b + row) * 8;
        var bw = 42 + Math.sin(b * 3) * 12;
        var bh = 40 + Math.cos(b * 2) * 15;
        ctx2d.fillStyle = boxColors[b % boxColors.length];
        ctx2d.fillRect(bx, sy - bh, bw, bh);
        ctx2d.strokeStyle = c.detail;
        ctx2d.lineWidth = 1;
        ctx2d.strokeRect(bx, sy - bh, bw, bh);
        // Label on some boxes
        if (b % 3 === 0) {
          ctx2d.fillStyle = '#4a6a4a';
          ctx2d.fillRect(bx + 5, sy - bh + 8, bw - 10, 8);
        }
      }
    }
    // Overturned chair
    ctx2d.fillStyle = '#2a3a2a';
    ctx2d.save();
    ctx2d.translate(360, 510);
    ctx2d.rotate(Math.PI * 0.35);
    ctx2d.fillRect(-18, -22, 36, 6);
    ctx2d.fillRect(-18, -22, 6, 45);
    ctx2d.fillRect(12, -22, 6, 45);
    ctx2d.fillRect(-18, 20, 6, 20);
    ctx2d.fillRect(12, 20, 6, 20);
    ctx2d.restore();
    // Light fixture
    ctx2d.fillStyle = '#444';
    ctx2d.fillRect(200, 36, 80, 8);
    var lightOn = Math.sin(t * 2) > -0.6;
    if (lightOn) {
      ctx2d.fillStyle = 'rgba(100, 255, 100, 0.04)';
      ctx2d.fillRect(180, 44, 120, 496);
    }
  }

  /* ── Entity rendering ── */
  function drawEntity() {
    if (entityRoom !== currentCam) return;
    // Dark figure
    var ex = 200 + Math.sin(frameCount * 0.02) * 5;
    var ey = 280;
    var flicker = Math.random() > 0.1; // occasionally flickers out

    if (!flicker) return;

    ctx2d.save();
    ctx2d.globalAlpha = 0.6 + Math.random() * 0.3;

    // Body — tall dark shape
    ctx2d.fillStyle = '#000';
    ctx2d.beginPath();
    ctx2d.ellipse(ex, ey + 80, 25, 90, 0, 0, Math.PI * 2);
    ctx2d.fill();

    // Head
    ctx2d.beginPath();
    ctx2d.arc(ex, ey - 20, 18, 0, Math.PI * 2);
    ctx2d.fill();

    // Eyes — two dim red dots
    ctx2d.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx2d.beginPath();
    ctx2d.arc(ex - 6, ey - 22, 3, 0, Math.PI * 2);
    ctx2d.arc(ex + 6, ey - 22, 3, 0, Math.PI * 2);
    ctx2d.fill();

    // Glitch effect on entity
    if (Math.random() > 0.7) {
      ctx2d.fillStyle = 'rgba(255, 0, 0, 0.15)';
      var sliceY = ey - 40 + Math.random() * 160;
      ctx2d.fillRect(ex - 30 + Math.random() * 10, sliceY, 60, 3);
    }

    ctx2d.restore();
  }

  /* ── Anomaly effects ── */
  function drawAnomalyEffect() {
    if (!anomalyActive) return;
    var a = anomalyActive;

    switch (a.type) {
      case 'shadow':
        // Shadow figure at edge of screen
        ctx2d.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx2d.beginPath();
        ctx2d.ellipse(Math.random() > 0.5 ? 30 : CANVAS_W - 30, 400, 20, 100, 0, 0, Math.PI * 2);
        ctx2d.fill();
        break;
      case 'invert':
        ctx2d.save();
        ctx2d.globalCompositeOperation = 'difference';
        ctx2d.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx2d.restore();
        break;
      case 'text':
        ctx2d.save();
        ctx2d.fillStyle = 'rgba(255, 0, 0, 0.25)';
        ctx2d.font = '28px Space Grotesk, monospace';
        ctx2d.textAlign = 'center';
        var texts = ['HELP', 'BEHIND YOU', 'DON\'T LOOK', 'IT SEES YOU', 'RUN', 'NO EXIT'];
        ctx2d.fillText(texts[Math.floor(frameCount / 10) % texts.length], CANVAS_W / 2, 400 + Math.sin(frameCount * 0.1) * 20);
        ctx2d.restore();
        break;
      case 'glitch':
        // Horizontal displacement glitch
        for (var i = 0; i < 5; i++) {
          var sy = Math.floor(Math.random() * CANVAS_H);
          var sh = 2 + Math.floor(Math.random() * 8);
          var dx = Math.floor(Math.random() * 30 - 15);
          try {
            var imgData = ctx2d.getImageData(0, sy, CANVAS_W, sh);
            ctx2d.putImageData(imgData, dx, sy);
          } catch(e) {}
        }
        break;
      case 'flicker':
        if (Math.random() > 0.5) {
          ctx2d.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }
        break;
    }
  }

  /* ── Post-processing ── */
  function generateNoise() {
    // Use offscreen canvas so we can draw with globalAlpha
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = CANVAS_W;
    noiseCanvas.height = CANVAS_H;
    var nctx = noiseCanvas.getContext('2d');
    noiseData = nctx.createImageData(CANVAS_W, CANVAS_H);
  }

  function drawNoise() {
    if (!noiseCanvas || !noiseData) return;
    var intensity = 0.15 + staticIntensity * 0.4;
    // Regenerate noise pattern occasionally
    if (frameCount % 3 === 0) {
      var d = noiseData.data;
      for (var i = 0; i < d.length; i += 16) {
        var v = Math.random() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 40;
      }
      noiseCanvas.getContext('2d').putImageData(noiseData, 0, 0);
    }
    ctx2d.save();
    ctx2d.globalAlpha = intensity;
    ctx2d.drawImage(noiseCanvas, 0, 0);
    ctx2d.restore();
  }

  function drawScanlines() {
    ctx2d.save();
    ctx2d.globalAlpha = 0.06;
    ctx2d.fillStyle = '#000';
    for (var y = 0; y < CANVAS_H; y += 4) {
      ctx2d.fillRect(0, y, CANVAS_W, 2);
    }
    ctx2d.restore();
  }

  function drawVignette() {
    var gradient = ctx2d.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx2d.fillStyle = gradient;
    ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawHUD() {
    // Hour display top-center
    ctx2d.fillStyle = 'rgba(51, 255, 51, 0.5)';
    ctx2d.font = '11px Space Grotesk, monospace';
    ctx2d.textAlign = 'center';
    var hourLabel = (12 + hour) > 12 ? (hour) + ' AM' : '12 AM';
    if (hour === 0) hourLabel = '12 AM';
    else hourLabel = hour + ' AM';
    ctx2d.fillText(hourLabel, CANVAS_W / 2, 16);

    // Entity at door warning
    if (entityAtDoor >= 0) {
      ctx2d.fillStyle = 'rgba(255, 50, 50, ' + (0.5 + Math.sin(frameCount * 0.3) * 0.3) + ')';
      ctx2d.font = 'bold 14px Space Grotesk, monospace';
      ctx2d.textAlign = 'center';
      var doorName = entityAtDoor === 0 ? 'LEFT DOOR' : 'RIGHT DOOR';
      ctx2d.fillText('⚠ SOMETHING AT ' + doorName, CANVAS_W / 2, CANVAS_H - 20);
    }

    // "REC" indicator
    ctx2d.fillStyle = frameCount % 40 < 20 ? '#ff0000' : 'transparent';
    ctx2d.beginPath();
    ctx2d.arc(CANVAS_W - 30, 16, 4, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx2d.font = '10px Space Grotesk, monospace';
    ctx2d.textAlign = 'right';
    ctx2d.fillText('REC', CANVAS_W - 40, 20);
  }

  function drawJumpscare() {
    ctx2d.fillStyle = '#000';
    ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Giant face
    ctx2d.save();
    ctx2d.globalAlpha = 0.9;
    ctx2d.fillStyle = '#0a0a0a';
    ctx2d.beginPath();
    ctx2d.ellipse(CANVAS_W / 2, CANVAS_H / 2, 150, 200, 0, 0, Math.PI * 2);
    ctx2d.fill();

    // Eyes
    ctx2d.fillStyle = '#ff0000';
    ctx2d.beginPath();
    ctx2d.arc(CANVAS_W / 2 - 45, CANVAS_H / 2 - 40, 20, 0, Math.PI * 2);
    ctx2d.arc(CANVAS_W / 2 + 45, CANVAS_H / 2 - 40, 20, 0, Math.PI * 2);
    ctx2d.fill();

    // Mouth
    ctx2d.strokeStyle = '#ff0000';
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();
    ctx2d.arc(CANVAS_W / 2, CANVAS_H / 2 + 50, 50, 0, Math.PI);
    ctx2d.stroke();

    ctx2d.restore();

    // Heavy static
    drawNoise();
    drawNoise();
    drawScanlines();
  }

  /* ── UI updates ── */
  function updatePowerUI() {
    var pct = Math.max(0, Math.round(power));
    powerFill.style.width = pct + '%';
    powerPct.textContent = pct + '%';
    powerFill.classList.toggle('low', pct <= 40 && pct > 15);
    powerFill.classList.toggle('critical', pct <= 15);
  }

  function updateUI() {
    updatePowerUI();
    scoreEl.textContent = formatTime(Math.floor(survivalTime));
    bestEl.textContent = formatTime(bestTime);
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ── Bootstrap ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { restart: restartGame };
})();
