// ============================================================
// Dragon Engineering Lab — Challenges System
// 12 progressive goals in 4 tiers. Saved to localStorage.
// ============================================================

window.Challenges = (function() {
  const KEY = 'dragonlab_challenges';

  // --------------------------------------------------------
  // CHALLENGE DEFINITIONS
  // --------------------------------------------------------
  const DEFINITIONS = [
    // ── Tier 1: Discovery ──────────────────────────────────
    {
      id: 'first_flight', tier: 1, icon: '🦅',
      title: 'First Flight',
      desc: 'Achieve Takeoff above 60',
      check: function(r) { return r && r.flight && r.flight.takeoff > 60; }
    },
    {
      id: 'born_of_fire', tier: 1, icon: '🔥',
      title: 'Born of Fire',
      desc: 'Achieve Fire Output above 40',
      check: function(r) { return r && r.fire && r.fire.fireOutput > 40; }
    },
    {
      id: 'iron_hide', tier: 1, icon: '🛡️',
      title: 'Iron Hide',
      desc: 'Achieve Durability above 60',
      check: function(r) { return r && r.durability && r.durability.total > 60; }
    },

    // ── Tier 2: Mastery ─────────────────────────────────────
    {
      id: 'sky_master', tier: 2, icon: '☁️',
      title: 'Sky Master',
      desc: 'All four flight scores above 65',
      check: function(r) {
        return r && r.flight &&
          r.flight.takeoff > 65 && r.flight.sustained > 65 &&
          r.flight.glide > 65 && r.flight.maneuverability > 65;
      }
    },
    {
      id: 'flawless_fire', tier: 2, icon: '✨',
      title: 'Flawless Fire',
      desc: 'Fire Output above 70 with no failure modes',
      check: function(r) {
        return r && r.fire && r.fire.fireOutput > 70 &&
          (!r.fire.failureModes || r.fire.failureModes.length === 0);
      }
    },
    {
      id: 'efficient_machine', tier: 2, icon: '⚡',
      title: 'Efficient Machine',
      desc: 'Energy Sustainability above 75',
      check: function(r) { return r && r.energy && r.energy.sustainability > 75; }
    },
    {
      id: 'well_rounded', tier: 2, icon: '⚖️',
      title: 'Well-Rounded',
      desc: 'All five systems above 55 simultaneously',
      check: function(r) {
        return r && r.flight && r.fire && r.energy && r.durability && r.survival &&
          r.flight.overall > 55 && r.fire.fireOutput > 55 &&
          r.energy.sustainability > 55 && r.durability.total > 55 &&
          r.survival.rating > 55;
      }
    },

    // ── Tier 3: Combat ──────────────────────────────────────
    {
      id: 'first_kill', tier: 3, icon: '⚔️',
      title: 'First Blood',
      desc: 'Win your first battle',
      check: function(r, rec) { return rec && rec.wins >= 1; }
    },
    {
      id: 'warlord', tier: 3, icon: '🏆',
      title: 'Warlord',
      desc: 'Win 5 battles',
      check: function(r, rec) { return rec && rec.wins >= 5; }
    },
    {
      id: 'habitat_master', tier: 3, icon: '🌍',
      title: 'Habitat Master',
      desc: 'Win battles in 3 different arenas',
      check: function(r, rec) { return rec && Object.keys(rec.arenaWins || {}).length >= 3; }
    },

    // ── Tier 4: Legend ──────────────────────────────────────
    {
      id: 'apex_dragon', tier: 4, icon: '🐉',
      title: 'Apex Dragon',
      desc: 'Achieve the "Apex Dragon" classification',
      check: function(r) { return r && r.classification && r.classification.name === 'Apex Dragon'; }
    },
    {
      id: 'immortal', tier: 4, icon: '♾️',
      title: 'Immortal',
      desc: 'Survival Rating above 90',
      check: function(r) { return r && r.survival && r.survival.rating > 90; }
    }
  ];

  // --------------------------------------------------------
  // STORAGE
  // --------------------------------------------------------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) { return {}; }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
  }

  // --------------------------------------------------------
  // EVALUATE — returns newly unlocked challenges
  // --------------------------------------------------------
  function evaluate(results, battleRecord) {
    const progress = load();
    const newlyUnlocked = [];

    DEFINITIONS.forEach(function(def) {
      if (!progress[def.id] && def.check(results, battleRecord)) {
        progress[def.id] = Date.now();
        newlyUnlocked.push(def);
      }
    });

    if (newlyUnlocked.length > 0) save(progress);
    return { progress: progress, newlyUnlocked: newlyUnlocked };
  }

  // --------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------
  function getAll() { return DEFINITIONS; }
  function getProgress() { return load(); }

  function getTierLabel(tier) {
    const keys = { 1: 'dlTierDiscovery', 2: 'dlTierMastery', 3: 'dlTierCombat', 4: 'dlTierLegend' };
    const key = keys[tier];
    if (key && typeof I18N !== 'undefined') return I18N.t(key);
    const fallback = { 1: 'Discovery', 2: 'Mastery', 3: 'Combat', 4: 'Legend' };
    return fallback[tier] || '';
  }

  return { evaluate: evaluate, getAll: getAll, getProgress: getProgress, getTierLabel: getTierLabel };
})();
