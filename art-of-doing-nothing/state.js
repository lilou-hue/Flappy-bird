/* ═══════════════════════════════════════════════════════════════
   state.js  –  Global state, save/load, scoring
   The Art of Doing Nothing
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SAVE_KEY = 'artOfDoingNothingSave';
  const CHAPTER_KEY = 'artOfDoingNothingChapter';
  const BEST_KEY = 'artOfDoingNothingBest';

  /* ── Default state ── */
  function defaults() {
    return {
      CHAPTER: 1,
      procrastination: 50,

      // Ch1 flags
      snoozed: false,
      snoozeCount: 0,
      checkedPhone: false,
      scrolledDeep: false,
      gotUpFirst: false,
      ch1_ending: null,

      // Ch2 flags
      wentToGroup: false,
      madeExcuse: false,
      ignoredAlex: false,
      joinedGroup: false,
      satAlone: false,
      ch2_ending: null,

      // Ch3 flags
      wroteGarbage: false,
      deepScrolled: false,
      hidPhone: false,
      ch3_ending: null,

      // Ch4 flags
      calledForHelp: false,
      ch4_ending: null,

      // Ch5 flags
      fourthWall: false,
      ch5_ending: null,
      ch5_complete: false,

      // Cross-chapter
      choicesMade: 0,
      endingsDiscovered: [],
      chaptersCompleted: [],
      achievementsUnlocked: [],
      totalScore: 0,

      // Timing
      chapterStartTime: 0
    };
  }

  /* ── Global state object (ncase convention) ── */
  window._ = defaults();

  /* ── Save / Load ── */
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(window._));
      localStorage.setItem(CHAPTER_KEY, String(window._.CHAPTER));
    } catch (e) { /* storage full or unavailable */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const def = defaults();
        // Merge saved over defaults (handles new keys in updates)
        for (const k of Object.keys(def)) {
          if (saved[k] !== undefined) def[k] = saved[k];
        }
        window._ = def;
        return true;
      }
    } catch (e) { /* corrupt save */ }
    return false;
  }

  function reset() {
    window._ = defaults();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  /* ── Scoring ── */
  function calcScore() {
    let score = 0;
    // Chapter completion: 100 pts each
    score += window._.chaptersCompleted.length * 100;
    // Endings discovered: 25 pts each
    score += window._.endingsDiscovered.length * 25;
    // Unique choices: 5 pts each
    score += window._.choicesMade * 5;
    // Achievements: 50 pts each
    score += window._.achievementsUnlocked.length * 50;
    return score;
  }

  function saveBest(score) {
    try {
      const prev = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
      if (score > prev) {
        localStorage.setItem(BEST_KEY, String(score));
        return true;
      }
    } catch (e) {}
    return false;
  }

  function getBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10); } catch (e) { return 0; }
  }

  /* ── Achievements ── */
  const ACHIEVEMENTS = {
    snooze_king:     { name: 'Snooze King',          desc: 'Hit snooze 3+ times' },
    early_bird:      { name: 'Early Bird',           desc: 'Get up on first alarm' },
    scroll_hole:     { name: 'Down the Rabbit Hole', desc: 'Deepest phone scroll path' },
    speed_reader:    { name: 'Speed Reader',         desc: 'Complete a chapter in < 3 min' },
    all_endings_ch1: { name: 'Every Morning',        desc: 'All 3 Ch1 endings discovered' },
    redemption:      { name: 'Tomorrow Starts Today', desc: 'Complete Chapter 5' },
    completionist:   { name: 'The Whole Story',      desc: 'All endings discovered' },
    self_aware:      { name: 'Self Aware',           desc: 'Find the fourth-wall-break' }
  };

  function unlockAchievement(id) {
    if (!ACHIEVEMENTS[id]) return false;
    if (window._.achievementsUnlocked.indexOf(id) !== -1) return false;
    window._.achievementsUnlocked.push(id);
    save();
    return true;
  }

  function discoverEnding(endingId) {
    if (window._.endingsDiscovered.indexOf(endingId) === -1) {
      window._.endingsDiscovered.push(endingId);
      save();
      return true;
    }
    return false;
  }

  function completeChapter(ch) {
    if (window._.chaptersCompleted.indexOf(ch) === -1) {
      window._.chaptersCompleted.push(ch);
    }
    window._.totalScore = calcScore();
    saveBest(window._.totalScore);
    save();
    return window._.totalScore;
  }

  /* ── Procrastination meter ── */
  function adjustMeter(delta) {
    window._.procrastination = Math.max(0, Math.min(100, window._.procrastination + delta));
    save();
    return window._.procrastination;
  }

  /* ── Public API ── */
  window.GameState = {
    save: save,
    load: load,
    reset: reset,
    calcScore: calcScore,
    saveBest: saveBest,
    getBest: getBest,
    ACHIEVEMENTS: ACHIEVEMENTS,
    unlockAchievement: unlockAchievement,
    discoverEnding: discoverEnding,
    completeChapter: completeChapter,
    adjustMeter: adjustMeter,
    SAVE_KEY: SAVE_KEY,
    BEST_KEY: BEST_KEY
  };
})();
