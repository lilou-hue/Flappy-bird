// ============================================================
// Dragon Engineering Lab — Progression System
// XP, level, and evolution stage tracking.
// Awards XP for: simulating, randomizing, battling,
// completing challenges, and naming your dragon.
// ============================================================

window.Progress = (function() {
  'use strict';

  const STORAGE_KEY = 'dragonlab_prog_v2';

  // ---- Evolution stages ----
  const STAGES = [
    { minLevel: 1,  name: 'Egg',          icon: '🥚', color: '#64748b' },
    { minLevel: 3,  name: 'Hatchling',    icon: '🐣', color: '#86efac' },
    { minLevel: 6,  name: 'Whelp',        icon: '🐲', color: '#4af0c0' },
    { minLevel: 10, name: 'Drake',        icon: '🐉', color: '#a855f7' },
    { minLevel: 15, name: 'Dragon',       icon: '💠', color: '#f59e0b' },
    { minLevel: 20, name: 'Elder Dragon', icon: '👑', color: '#f87171' }
  ];

  // XP required to advance from this level to the next
  function xpNeeded(level) {
    return Math.floor(60 + level * 30);
  }

  // ---- Storage ----
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : makeDefault();
    } catch(e) { return makeDefault(); }
  }

  function makeDefault() {
    return { xp: 0, level: 1, totalXP: 0, namedOnce: false };
  }

  function save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  // ---- Stage lookup ----
  function getStage(level) {
    for (var i = STAGES.length - 1; i >= 0; i--) {
      if (level >= STAGES[i].minLevel) return STAGES[i];
    }
    return STAGES[0];
  }

  // ---- State ----
  var _state = null;

  // ---- Init ----
  function init() {
    _state = load();
    render();

    // Award XP for simulate button
    var simBtn = document.getElementById('btn-simulate');
    if (simBtn) {
      simBtn.addEventListener('click', function() {
        award(20);
      });
    }

    // Award XP for randomize
    var randBtn = document.getElementById('btn-randomize');
    if (randBtn) {
      randBtn.addEventListener('click', function() {
        award(5);
      });
    }

    // One-time XP for naming dragon
    var nameInput = document.getElementById('dragon-name-input');
    if (nameInput) {
      nameInput.addEventListener('blur', function() {
        if (!_state.namedOnce && nameInput.value.trim().length > 0) {
          _state.namedOnce = true;
          save(_state);
          award(25);
        }
      });
    }
  }

  // ---- Award XP ----
  function award(amount) {
    if (!_state || amount <= 0) return;
    _state.xp += amount;
    _state.totalXP = (_state.totalXP || 0) + amount;

    var leveled = false;
    while (_state.xp >= xpNeeded(_state.level)) {
      _state.xp -= xpNeeded(_state.level);
      _state.level++;
      leveled = true;
    }

    save(_state);
    render();

    if (leveled) {
      flashLevelUp(_state.level);
      if (window.UI && window.UI.showNotification) {
        var stage = getStage(_state.level);
        window.UI.showNotification(
          stage.icon + ' Level ' + _state.level + '! ' + stage.name + ' unlocked!',
          'success'
        );
      }
    }
  }

  // ---- Render XP UI ----
  function render() {
    if (!_state) return;
    var stage = getStage(_state.level);
    var needed = xpNeeded(_state.level);
    var pct = Math.min(100, (_state.xp / needed) * 100);

    var stageEl = document.getElementById('prog-stage-name');
    if (stageEl) {
      stageEl.textContent = stage.icon + ' ' + stage.name;
      stageEl.style.color = stage.color;
    }

    var lvlEl = document.getElementById('prog-level-badge');
    if (lvlEl) lvlEl.textContent = 'LVL ' + _state.level;

    var fillEl = document.getElementById('prog-xp-fill');
    if (fillEl) fillEl.style.width = pct + '%';

    var textEl = document.getElementById('prog-xp-text');
    if (textEl) textEl.textContent = _state.xp + ' / ' + needed + ' XP';
  }

  // ---- Level-up overlay ----
  function flashLevelUp(level) {
    var el = document.getElementById('prog-levelup-flash');
    if (!el) return;
    var stage = getStage(level);
    el.innerHTML =
      '<div style="font-size:32px;margin-bottom:8px">' + stage.icon + '</div>' +
      'Level ' + level +
      '<div style="font-size:13px;margin-top:8px;font-weight:600;color:rgba(255,255,255,0.65);letter-spacing:1px">' +
        stage.name.toUpperCase() + ' UNLOCKED' +
      '</div>';
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 3000);
  }

  // ---- Update pod status strip ----
  // Called from main.js after each simulation.
  function updatePodStatus(results) {
    if (!results) return;

    var stats = [
      { id: 'flight',     val: Math.round(results.flight ? (results.flight.overall || 0) : 0) },
      { id: 'fire',       val: Math.round(results.fire ? (results.fire.fireOutput || 0) : 0) },
      { id: 'durability', val: Math.round(results.durability ? (results.durability.total || 0) : 0) },
      { id: 'energy',     val: Math.round(results.energy ? (results.energy.sustainability || 0) : 0) },
      { id: 'survival',   val: Math.round(results.survival ? (results.survival.rating || 0) : 0) }
    ];

    stats.forEach(function(s) {
      var valEl = document.getElementById('pod-stat-' + s.id);
      var barEl = document.getElementById('pod-bar-' + s.id);
      if (valEl) animateNumber(valEl, parseInt(valEl.textContent) || 0, s.val, 500);
      if (barEl) barEl.style.width = s.val + '%';
    });
  }

  // Smooth number count-up animation
  function animateNumber(el, from, to, durationMs) {
    if (from === to) { el.textContent = to; return; }
    var start = performance.now();
    function tick(now) {
      var t = Math.min((now - start) / durationMs, 1);
      // Cubic ease-out
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- Auto-init after DOM ready ----
  document.addEventListener('DOMContentLoaded', function() {
    init();
  });

  return {
    award: award,
    updatePodStatus: updatePodStatus,
    getState: function() { return _state; }
  };
})();
