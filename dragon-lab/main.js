// ============================================================
// Dragon Engineering Lab — Main Application
// Init, event wiring, state management, debouncing,
// save/load, battle playback, and debug helpers.
// ============================================================

window.App = (function() {
  let currentDragon = null;
  let currentResults = null;
  let previousResults = null;
  let battleState = null;
  let battlePlaybackTimer = null;
  let battleTickIndex = 0;

  // Debounce timer for slider updates
  let updateTimer = null;
  const DEBOUNCE_MS = 50;
  const RECORD_KEY = 'dragonlab_record';

  // ── Colour themes ─────────────────────────────────────────
  const COLOR_THEMES = {
    forest:  { body: '#3a6e5a', wings: '#7a4a10', accent: '#1a2e1a', eye: '#44ff88' },
    inferno: { body: '#8a2010', wings: '#cc5500', accent: '#3a1005', eye: '#ffcc00' },
    frost:   { body: '#3a7aaa', wings: '#88ccee', accent: '#1a3a5a', eye: '#ddf8ff' },
    toxic:   { body: '#1a2a0a', wings: '#44cc00', accent: '#0a1a00', eye: '#88ff00' },
    royal:   { body: '#4a1a6a', wings: '#c8a020', accent: '#1a0830', eye: '#ffffff' },
  };

  // --------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------
  function init() {
    // Load saved dragon or create default
    const saved = window.Dragon.loadCurrent();
    currentDragon = saved || window.Dragon.create();

    // Init Three.js scene
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      window.Scene.init(canvasContainer);
      window.Scene.buildPlayerDragon(currentDragon.traits, getDragonColors());
    }

    // Init UI tabs
    window.UI.initTabs();

    // Restore saved mode before rendering sliders
    if (window.UI.loadSavedMode()) {
      window.UI.setAdvancedMode(true);
    }

    // Render sliders
    window.UI.renderSliders(
      currentDragon.traits,
      currentDragon.fireDesign,
      onTraitChange,
      onFireDesignChange
    );

    // Render presets
    window.UI.renderPresets(onPresetSelect);

    // Render habitat selector
    window.UI.renderHabitatSelector(onHabitatSelect);

    // Render battle setup
    window.UI.renderBattleSetup(onBattleStart);

    // Render science notes
    window.UI.renderScienceNotes();

    // Wire buttons
    wireButtons();

    // Wire dragon name input
    wireDragonName();

    // Wire colour UI (multi-zone pickers + theme buttons)
    wireColorUI();

    // Run initial simulation
    runSimulation();

    // Render initial challenges state
    window.UI.renderChallenges();

    // Show battle record
    window.UI.renderBattleRecord(loadRecord());

    // Init tutorial
    window.Tutorial.init();
  }

  // --------------------------------------------------------
  // COLOUR SYSTEM (multi-zone)
  // --------------------------------------------------------
  function getDragonColors() {
    if (currentDragon.dragonColors) return currentDragon.dragonColors;
    // Backward-compat: construct from legacy tintColor
    return { body: currentDragon.tintColor || '#3a6e5a', wings: null, accent: null, eye: null };
  }

  // Keep legacy getTintColor for anything that still needs it
  function getTintColor() {
    return getDragonColors().body;
  }

  function setDragonColors(colors) {
    currentDragon.dragonColors = colors;
    currentDragon.tintColor    = colors.body;  // keep in sync
    syncColorUI(colors);
    window.Scene.updateDragon(currentDragon.traits, colors);
    autoSave();
  }

  function setTintColor(hex) {
    setDragonColors({ ...getDragonColors(), body: hex });
  }

  // --------------------------------------------------------
  // TRAIT CHANGE HANDLER (debounced)
  // --------------------------------------------------------
  function onTraitChange(traitId, value) {
    currentDragon.traits[traitId] = value;

    // Immediate visual update (cheap)
    window.Scene.updateDragon(currentDragon.traits, getDragonColors());

    // Debounced simulation (expensive)
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      runSimulation();
      autoSave();
    }, DEBOUNCE_MS);
  }

  // --------------------------------------------------------
  // FIRE DESIGN CHANGE
  // --------------------------------------------------------
  function onFireDesignChange(type, id) {
    currentDragon.fireDesign[type] = id;
    window.UI.updateFireCompat(currentDragon.fireDesign);

    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      runSimulation();
      autoSave();
    }, DEBOUNCE_MS);
  }

  // --------------------------------------------------------
  // SIMULATION
  // --------------------------------------------------------
  function runSimulation() {
    previousResults = currentResults;
    currentResults = window.Simulation.evaluate(currentDragon);
    window.UI.renderResults(currentResults, previousResults);

    // Personal bests
    const newBests = window.UI.checkPersonalBests(currentResults);
    if (newBests.length > 0) {
      window.UI.showNotification('New personal best! ' + newBests.join(', '), 'success');
    }

    // Check challenges
    checkChallengesNow();
  }

  function checkChallengesNow() {
    const record = loadRecord();
    const { newlyUnlocked } = window.Challenges.evaluate(currentResults, record);
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(function(c) {
        window.UI.showNotification('Challenge unlocked: ' + c.icon + ' ' + c.title, 'success');
      });
    }
    window.UI.renderChallenges();
  }

  // --------------------------------------------------------
  // BATTLE RECORD
  // --------------------------------------------------------
  function loadRecord() {
    try { return JSON.parse(localStorage.getItem(RECORD_KEY) || '{"wins":0,"losses":0,"total":0,"arenaWins":{}}'); }
    catch(e) { return { wins: 0, losses: 0, total: 0, arenaWins: {} }; }
  }

  function saveRecord(rec) {
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(rec)); } catch(e) {}
  }

  function recordBattleResult(winner, arenaKey) {
    const rec = loadRecord();
    rec.total = (rec.total || 0) + 1;
    if (winner === 'player') {
      rec.wins = (rec.wins || 0) + 1;
      if (arenaKey) {
        rec.arenaWins = rec.arenaWins || {};
        rec.arenaWins[arenaKey] = true;
      }
    } else if (winner === 'enemy') {
      rec.losses = (rec.losses || 0) + 1;
    }
    saveRecord(rec);
    return rec;
  }

  // --------------------------------------------------------
  // PRESET SELECTION
  // --------------------------------------------------------
  function onPresetSelect(presetKey) {
    currentDragon = window.Dragon.fromPreset(presetKey);
    // Carry preset tint onto the dragon object so getTintColor picks it up
    const presetTint = window.DragonData.PRESETS[presetKey].tintColor;
    if (presetTint) {
      currentDragon.tintColor    = presetTint;
      currentDragon.dragonColors = { body: presetTint, wings: null, accent: null, eye: null };
    }

    const nameInput = document.getElementById('dragon-name-input');
    if (nameInput) nameInput.value = currentDragon.name || '';
    window.UI.updateSliders(currentDragon.traits);
    syncColorUI(getDragonColors());

    // Rebuild fire design panel by re-rendering sliders
    window.UI.renderSliders(
      currentDragon.traits,
      currentDragon.fireDesign,
      onTraitChange,
      onFireDesignChange
    );

    window.Scene.updateDragon(currentDragon.traits, getDragonColors());
    runSimulation();
    autoSave();
    window.UI.showNotification('Loaded preset: ' + window.DragonData.PRESETS[presetKey].label, 'info');
  }

  // --------------------------------------------------------
  // HABITAT
  // --------------------------------------------------------
  function onHabitatSelect(habitatKey) {
    const result = window.Simulation.evaluateHabitat(currentDragon.traits, currentDragon.fireDesign, habitatKey);
    window.UI.renderHabitatResults(result);
    window.Scene.setEnvironment(habitatKey);
  }

  // --------------------------------------------------------
  // BATTLE
  // --------------------------------------------------------
  function onBattleStart(enemyKey, arenaKey, speed) {
    const archetype = window.DragonData.ENEMY_ARCHETYPES[enemyKey];
    battleState = window.Battle.create(currentDragon, enemyKey, arenaKey);

    // Store arenaKey for skip access
    battleState._arenaKey = arenaKey;

    // Run full battle computation
    window.Battle.runFull(battleState);

    // Switch to battle view
    window.Scene.initBattleArena(
      arenaKey,
      currentDragon.traits, getDragonColors(),
      archetype.traits, archetype.tintColor
    );

    // Playback
    battleTickIndex = 0;
    const delay = window.DragonData.BATTLE_CONFIG.tickDelay[speed] || 800;

    // Hide setup, show display
    const setup = document.getElementById('battle-setup');
    const display = document.getElementById('battle-display');
    if (setup) setup.style.display = 'none';
    if (display) display.style.display = 'block';

    // Inject skip button
    window.UI.renderSkipButton(skipBattle);

    // Start tick-by-tick playback
    if (battlePlaybackTimer) clearInterval(battlePlaybackTimer);
    battlePlaybackTimer = setInterval(function() {
      if (battleTickIndex >= battleState.log.length) {
        clearInterval(battlePlaybackTimer);
        battlePlaybackTimer = null;
        finishBattle(arenaKey);
        return;
      }

      const tick = battleState.log[battleTickIndex];
      window.UI.renderBattleInProgress(battleState, battleTickIndex);
      window.Scene.animateBattleTick(tick);
      battleTickIndex++;
    }, delay);
  }

  function skipBattle() {
    if (battlePlaybackTimer) {
      clearInterval(battlePlaybackTimer);
      battlePlaybackTimer = null;
    }
    if (!battleState) return;
    battleTickIndex = battleState.log.length - 1;
    window.UI.renderBattleInProgress(battleState, battleTickIndex);
    finishBattle(battleState._arenaKey);
  }

  function finishBattle(arenaKey) {
    // Remove skip button
    const skipBtn = document.getElementById('btn-skip-battle');
    if (skipBtn) skipBtn.remove();

    // Record result
    const rec = recordBattleResult(battleState.winner, arenaKey);
    window.UI.renderBattleRecord(rec);

    // Render summary
    window.UI.renderBattleSummary(battleState);
    wireBattleSummaryButtons();

    // Check challenges
    const { newlyUnlocked } = window.Challenges.evaluate(currentResults, rec);
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(function(c) {
        window.UI.showNotification('Challenge unlocked: ' + c.icon + ' ' + c.title, 'success');
      });
      window.UI.renderChallenges();
    }
  }

  // --------------------------------------------------------
  // DRAGON NAMING
  // --------------------------------------------------------
  function wireDragonName() {
    const input = document.getElementById('dragon-name-input');
    if (!input) return;
    input.value = currentDragon.name || '';
    input.addEventListener('input', function() {
      currentDragon.name = input.value;
      autoSave();
    });
  }

  // Sync colour UI zone pickers to current color state
  function syncColorUI(colors) {
    const c = window.Scene ? window.Scene.normalizeColors(colors) : colors;
    const zones = ['body', 'wings', 'accent', 'eye'];
    zones.forEach(zone => {
      const val = c[zone];
      const picker  = document.getElementById('color-' + zone);
      const preview = document.getElementById('preview-' + zone);
      if (picker  && val) picker.value         = val;
      if (preview && val) preview.style.background = val;
    });
    // Highlight active theme button if matches
    document.querySelectorAll('.theme-btn').forEach(btn => {
      const theme = COLOR_THEMES[btn.dataset.theme];
      const match = theme && theme.body === c.body && theme.wings === c.wings;
      btn.classList.toggle('active', !!match);
    });
  }

  function wireColorUI() {
    // Zone colour pickers
    ['body', 'wings', 'accent', 'eye'].forEach(zone => {
      const picker = document.getElementById('color-' + zone);
      if (!picker) return;
      picker.addEventListener('input', () => {
        const preview = document.getElementById('preview-' + zone);
        if (preview) preview.style.background = picker.value;
        setDragonColors({ ...getDragonColors(), [zone]: picker.value });
      });
    });

    // Preset theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = COLOR_THEMES[btn.dataset.theme];
        if (!theme) return;
        setDragonColors({ ...theme });
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Initialise UI to current dragon colours
    syncColorUI(getDragonColors());
  }

  function wireBattleSummaryButtons() {
    const againBtn = document.getElementById('btn-battle-again');
    if (againBtn) {
      againBtn.addEventListener('click', function() {
        if (battlePlaybackTimer) { clearInterval(battlePlaybackTimer); battlePlaybackTimer = null; }
        window.Scene.returnToLab();
        const setup = document.getElementById('battle-setup');
        const display = document.getElementById('battle-display');
        if (setup) setup.style.display = 'block';
        if (display) display.style.display = 'none';
        window.UI.renderBattleSetup(onBattleStart);
        window.UI.renderBattleRecord(loadRecord());
      });
    }
    const returnBtn = document.getElementById('btn-return-lab');
    if (returnBtn) {
      returnBtn.addEventListener('click', function() {
        if (battlePlaybackTimer) { clearInterval(battlePlaybackTimer); battlePlaybackTimer = null; }
        window.Scene.returnToLab();
        window.Scene.updateDragon(currentDragon.traits, getDragonColors());
        window.UI.switchTab('build');
        const setup = document.getElementById('battle-setup');
        const display = document.getElementById('battle-display');
        if (setup) setup.style.display = 'block';
        if (display) display.style.display = 'none';
      });
    }
  }

  // --------------------------------------------------------
  // BUTTON WIRING
  // --------------------------------------------------------
  function wireButtons() {
    // Simulate button
    const simBtn = document.getElementById('btn-simulate');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        runSimulation();
        window.UI.switchTab('simulate');
        window.UI.showNotification('Simulation complete', 'info');
      });
    }

    // Randomize
    const randBtn = document.getElementById('btn-randomize');
    if (randBtn) {
      randBtn.addEventListener('click', function() {
        currentDragon = window.Dragon.createRandom();
        const nameInput = document.getElementById('dragon-name-input');
        if (nameInput) nameInput.value = currentDragon.name || '';
        window.UI.renderSliders(currentDragon.traits, currentDragon.fireDesign, onTraitChange, onFireDesignChange);
        window.Scene.updateDragon(currentDragon.traits, getDragonColors());
        runSimulation();
        autoSave();
        window.UI.showNotification('Random dragon generated', 'info');
      });
    }

    // Reset
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        currentDragon = window.Dragon.create();
        const nameInput = document.getElementById('dragon-name-input');
        if (nameInput) nameInput.value = '';
        window.UI.renderSliders(currentDragon.traits, currentDragon.fireDesign, onTraitChange, onFireDesignChange);
        window.Scene.updateDragon(currentDragon.traits, getDragonColors());
        runSimulation();
        autoSave();
        window.UI.showNotification('Reset to defaults', 'info');
      });
    }

    // Save
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        window.Dragon.saveToSlot(currentDragon);
        window.UI.showNotification('Dragon saved: ' + currentDragon.name, 'success');
      });
    }

    // Replay tutorial
    const tutBtn = document.getElementById('btn-tutorial');
    if (tutBtn) {
      tutBtn.addEventListener('click', () => {
        window.Tutorial.reset();
      });
    }

    // Mode toggle (Basic / Advanced)
    function switchMode(adv) {
      if (window.UI.isAdvancedMode() === adv) return;
      window.UI.setAdvancedMode(adv);
      window.UI.renderSliders(currentDragon.traits, currentDragon.fireDesign, onTraitChange, onFireDesignChange);
      window.UI.showNotification(adv ? 'Advanced mode — all controls visible' : 'Basic mode — simplified controls', 'info');
    }
    const basicBtn = document.getElementById('btn-mode-basic');
    const advBtn   = document.getElementById('btn-mode-advanced');
    if (basicBtn) basicBtn.addEventListener('click', () => switchMode(false));
    if (advBtn)   advBtn.addEventListener('click', () => switchMode(true));

    // Return to lab from habitat
    const habReturnBtn = document.getElementById('btn-hab-return');
    if (habReturnBtn) {
      habReturnBtn.addEventListener('click', () => {
        window.Scene.resetEnvironment();
      });
    }
  }

  // --------------------------------------------------------
  // AUTO-SAVE
  // --------------------------------------------------------
  function autoSave() {
    window.Dragon.saveCurrent(currentDragon);
  }

  // --------------------------------------------------------
  // DEBUG HELPERS
  // --------------------------------------------------------
  if (location.search.includes('debug')) {
    window.DEBUG = {
      sim: () => {
        console.table(window.Simulation.evaluate(currentDragon));
      },
      presets: () => {
        Object.keys(window.DragonData.PRESETS).forEach(k => {
          const d = window.Dragon.fromPreset(k);
          const r = window.Simulation.evaluate(d);
          console.log(k, '→', r.classification.name, '| Flight:', Math.round(r.flight.overall),
            '| Fire:', Math.round(r.fire.fireOutput), '| Energy:', Math.round(r.energy.sustainability),
            '| Durability:', Math.round(r.durability.total), '| Survival:', Math.round(r.survival.rating));
        });
      },
      battles: () => {
        const results = [];
        Object.keys(window.DragonData.ENEMY_ARCHETYPES).forEach(ek => {
          Object.keys(window.DragonData.BATTLE_CONFIG.arenas).forEach(ak => {
            const d = window.Dragon.createRandom();
            const state = window.Battle.create(d, ek, ak);
            window.Battle.runFull(state);
            results.push({ enemy: ek, arena: ak, winner: state.winner, ticks: state.log.length });
          });
        });
        console.table(results);
      },
      bounds: () => {
        let errors = 0;
        for (let i = 0; i < 100; i++) {
          const d = window.Dragon.createRandom();
          const r = window.Simulation.evaluate(d);
          const check = (obj, path) => {
            Object.entries(obj).forEach(([k, v]) => {
              if (typeof v === 'number' && (v < 0 || v > 100 || isNaN(v))) {
                console.error(`OUT OF BOUNDS: ${path}.${k} = ${v}`);
                errors++;
              } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                check(v, `${path}.${k}`);
              }
            });
          };
          check(r.flight, `d${i}.flight`);
          check(r.energy, `d${i}.energy`);
          check(r.durability, `d${i}.durability`);
          check(r.survival, `d${i}.survival`);
        }
        console.log(`Bounds check complete. ${errors} errors found.`);
      }
    };
  }

  // --------------------------------------------------------
  // START
  // --------------------------------------------------------
  document.addEventListener('DOMContentLoaded', init);

  return {
    get currentDragon() { return currentDragon; },
    get currentResults() { return currentResults; },
    get previousResults() { return previousResults; },
    runSimulation
  };
})();
