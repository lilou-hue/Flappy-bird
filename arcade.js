/* ═══════════════════════════════════════════════════════════════
   arcade.js  –  SlayPlay Arcade Platform Module
   IIFE exposing global `Arcade` object (same pattern as leaderboard.js)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Game registry ── */
  const GAMES = {
    'flappy-bird':    { name: 'Flappy Bird',        bestKey: 'flappyBest',       thresholds: [10, 30, 80] },
    'snake':          { name: 'Snake',               bestKey: 'snakeBest',        thresholds: [20, 60, 150] },
    'tetris':         { name: 'Tetris',              bestKey: 'tetrisBest',       thresholds: [500, 2000, 5000] },
    'lumina':         { name: 'Lumina',              bestKey: 'luminaBest',       thresholds: [5, 15, 40] },
    'phantom-road':   { name: 'Phantom Road',        bestKey: 'phantomRoadBest',  thresholds: [500, 2000, 5000] },
    'methane-drift':  { name: 'Methane Drift',       bestKey: 'methaneDriftBest', thresholds: [1000, 5000, 15000] },
    'gun-game':       { name: 'Gun Game',            bestKey: 'gunGameBest',      thresholds: [3, 5, 8] },
    'unicorn-clicker':{ name: 'Unicorn Fart Clicker',bestKey: null,               thresholds: [100, 1000, 10000] },
    'astro-miner':    { name: 'Astro Miner',         bestKey: 'astroMinerBest',   thresholds: [500, 2000, 8000] },
    'star-fury':      { name: 'Star Fury',           bestKey: 'starFuryBest',     thresholds: [500, 2000, 8000] },
    'inkognito':      { name: 'Inkognito',           bestKey: 'inkognitoBest',    thresholds: [5, 15, 40] },
    'dress-up':       { name: 'Dress-Up',            bestKey: 'dressUpBest',      thresholds: [50, 150, 400] },
    'stack-tower':    { name: 'Stack Tower',         bestKey: 'stackTowerBest',   thresholds: [10, 25, 50] },
    'neon-pong':      { name: 'Neon Pong',           bestKey: 'neonPongBest',     thresholds: [3, 7, 15] },
    'beat-drop':      { name: 'Beat Drop',           bestKey: 'beatDropBest',     thresholds: [500, 2000, 5000] },
    'rivals':         { name: 'Rivals',              bestKey: 'rivalsBest',       thresholds: [5, 15, 30] },
    'gravity-garden': { name: 'Gravity Garden',      bestKey: 'gravityGardenBest',thresholds: [50, 200, 500] },
    'last-seen-online': { name: 'Last Seen Online',  bestKey: 'lastSeenOnlineBest', thresholds: [30, 60, 90] },
    'art-of-doing-nothing': { name: 'The Art of Doing Nothing', bestKey: 'artOfDoingNothingBest', thresholds: [100, 300, 500] },
    'heart-serve':          { name: 'HeartServe',              bestKey: 'heartServeBest',         thresholds: [25, 50, 75] },
    'signal-lost':          { name: 'Signal Lost',             bestKey: 'signalLostBest',         thresholds: [120, 300, 600] },
  };

  const GAME_IDS = Object.keys(GAMES);

  /* ── Site-wide achievements ── */
  const ACHIEVEMENTS = [
    { id: 'first_steps',       nameKey: 'arcAchFirstSteps',      descKey: 'arcAchFirstStepsDesc',      icon: '👶', reward: 10 },
    { id: 'getting_hooked',    nameKey: 'arcAchGettingHooked',   descKey: 'arcAchGettingHookedDesc',   icon: '🎣', reward: 25 },
    { id: 'arcade_rat',        nameKey: 'arcAchArcadeRat',       descKey: 'arcAchArcadeRatDesc',       icon: '🐀', reward: 100 },
    { id: 'explorer',          nameKey: 'arcAchExplorer',        descKey: 'arcAchExplorerDesc',        icon: '🧭', reward: 75 },
    { id: 'coin_collector',    nameKey: 'arcAchCoinCollector',   descKey: 'arcAchCoinCollectorDesc',   icon: '🪙', reward: 50 },
    { id: 'big_spender',       nameKey: 'arcAchBigSpender',      descKey: 'arcAchBigSpenderDesc',      icon: '💰', reward: 100 },
    { id: 'hat_trick',         nameKey: 'arcAchHatTrick',        descKey: 'arcAchHatTrickDesc',        icon: '🎩', reward: 30 },
    { id: 'weekly_warrior',    nameKey: 'arcAchWeeklyWarrior',   descKey: 'arcAchWeeklyWarriorDesc',   icon: '⚔️', reward: 75 },
    { id: 'monthly_master',    nameKey: 'arcAchMonthlyMaster',   descKey: 'arcAchMonthlyMasterDesc',   icon: '👑', reward: 200 },
    { id: 'high_roller',       nameKey: 'arcAchHighRoller',      descKey: 'arcAchHighRollerDesc',      icon: '🎰', reward: 50 },
    { id: 'challenge_accepted',nameKey: 'arcAchChallengeAccepted',descKey: 'arcAchChallengeAcceptedDesc',icon: '✅', reward: 15 },
    { id: 'challenge_streak',  nameKey: 'arcAchChallengeStreak', descKey: 'arcAchChallengeStreakDesc', icon: '🔥', reward: 100 },
  ];
  ACHIEVEMENTS.forEach(function(a) {
    Object.defineProperty(a, 'name', { get: function() { return t(a.nameKey, a.nameKey); }, enumerable: true });
    Object.defineProperty(a, 'desc', { get: function() { return t(a.descKey, a.descKey); }, enumerable: true });
  });

  /* ── Shop items ── */
  const SHOP_ITEMS = [
    { id: 'badge_fire',    cat: 'badge', nameKey: 'arcShopFireBadge',    icon: '🔥', cost: 100 },
    { id: 'badge_star',    cat: 'badge', nameKey: 'arcShopStarBadge',    icon: '⭐', cost: 200 },
    { id: 'badge_skull',   cat: 'badge', nameKey: 'arcShopSkullBadge',   icon: '💀', cost: 300 },
    { id: 'badge_crown',   cat: 'badge', nameKey: 'arcShopCrownBadge',   icon: '👑', cost: 500 },
    { id: 'theme_ocean',   cat: 'theme', nameKey: 'arcShopOceanTheme',   icon: '🌊', cost: 300, vars: { '--accent': '#38bdf8', '--accent2': '#06b6d4', '--accent3': '#0ea5e9' } },
    { id: 'theme_flame',   cat: 'theme', nameKey: 'arcShopFlameTheme',   icon: '🔥', cost: 300, vars: { '--accent': '#f97316', '--accent2': '#ef4444', '--accent3': '#eab308' } },
    { id: 'theme_forest',  cat: 'theme', nameKey: 'arcShopForestTheme',  icon: '🌲', cost: 300, vars: { '--accent': '#22c55e', '--accent2': '#10b981', '--accent3': '#84cc16' } },
    { id: 'frame_gold',    cat: 'frame', nameKey: 'arcShopGoldFrame',    icon: '🥇', cost: 250 },
    { id: 'frame_rainbow', cat: 'frame', nameKey: 'arcShopRainbowFrame', icon: '🌈', cost: 350 },
    { id: 'frame_neon',    cat: 'frame', nameKey: 'arcShopNeonFrame',    icon: '💜', cost: 400 },
  ];
  SHOP_ITEMS.forEach(function(item) {
    Object.defineProperty(item, 'name', { get: function() { return t(item.nameKey, item.nameKey); }, enumerable: true });
  });

  /* ── Challenge templates ── */
  const CHALLENGE_TEMPLATES = [
    { type: 'score',     tplKey: 'arcChallScore',    targets: [5, 10, 20, 30, 50] },
    { type: 'play',      tplKey: 'arcChallPlay',     targets: [2, 3, 5] },
    { type: 'beat_best', tplKey: 'arcChallBeatBest', targets: [1] },
  ];
  function getChallTpl(tplKey) {
    return t(tplKey, tplKey);
  }

  /* ── i18n helper ── */
  function t(key, fallback) {
    if (typeof I18N !== 'undefined' && I18N.t) {
      var v = I18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  /* ── Analytics helper ── */
  function track(event, params) {
    if (typeof gtag === 'function') gtag('event', event, params || {});
  }

  /* ── Helpers ── */
  function today() { return new Date().toISOString().slice(0, 10); }

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  }

  function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  /* mulberry32 seeded PRNG */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function dateSeed(dateStr) {
    var h = 0;
    for (var i = 0; i < dateStr.length; i++) {
      h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
    }
    return h;
  }

  /* ── State loaders ── */
  function getState() {
    return loadJSON('arcade_state', {
      coins: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      gamesPlayed: {},
      totalGamesPlayed: 0,
      uniqueGamesPlayed: [],
      lastPlayedDate: null,
      todayGamesPlayed: [],
      todayDate: null,
      challengesCompleted: 0,
    });
  }
  function setState(s) { saveJSON('arcade_state', s); }

  function getStreak() {
    return loadJSON('arcade_playStreak', { lastDate: null, streak: 0, longestStreak: 0, coinsClaimedToday: false });
  }
  function setStreak(s) { saveJSON('arcade_playStreak', s); }

  function getAch() {
    return loadJSON('arcade_achievements', { unlocked: [], unlockedAt: {} });
  }
  function setAch(a) { saveJSON('arcade_achievements', a); }

  function getChallenges() {
    return loadJSON('arcade_challenges', { date: null, challenges: [] });
  }
  function setChallenges(c) { saveJSON('arcade_challenges', c); }

  function getShop() {
    return loadJSON('arcade_shop', { purchased: [], equipped: { badge: null, theme: null, frame: null } });
  }
  function setShop(s) { saveJSON('arcade_shop', s); }

  /* ── Coin management ── */
  function addCoins(amount) {
    var s = getState();
    s.coins += amount;
    s.totalCoinsEarned += amount;
    setState(s);
    updateCoinDisplays();
    return s.coins;
  }

  function updateCoinDisplays() {
    document.querySelectorAll('.arc-coin-value').forEach(function (el) {
      el.textContent = getState().coins;
    });
  }

  /* ── Achievement checking ── */
  function checkAchievements(context) {
    var s = getState();
    var streak = getStreak();
    var shop = getShop();
    var ach = getAch();
    var newlyUnlocked = [];

    var checks = {
      first_steps:        s.totalGamesPlayed >= 1,
      getting_hooked:     s.totalGamesPlayed >= 5,
      arcade_rat:         s.totalGamesPlayed >= 50,
      explorer:           s.uniqueGamesPlayed.length >= GAME_IDS.length,
      coin_collector:     s.totalCoinsEarned >= 500,
      big_spender:        s.totalCoinsEarned >= 2000,
      hat_trick:          streak.streak >= 3,
      weekly_warrior:     streak.streak >= 7,
      monthly_master:     streak.streak >= 30,
      high_roller:        (s.totalCoinsSpent || 0) >= 500,
      challenge_accepted: s.challengesCompleted >= 1,
      challenge_streak:   s.challengesCompleted >= 7,
    };

    ACHIEVEMENTS.forEach(function (a) {
      if (ach.unlocked.indexOf(a.id) === -1 && checks[a.id]) {
        ach.unlocked.push(a.id);
        ach.unlockedAt[a.id] = Date.now();
        newlyUnlocked.push(a);
        addCoins(a.reward);
        track('achievement_unlock', { achievement_id: a.id, achievement_name: a.name });
      }
    });

    if (newlyUnlocked.length) setAch(ach);
    return newlyUnlocked;
  }

  /* ── Daily challenges ── */
  function generateDailyChallenges() {
    var d = today();
    var stored = getChallenges();
    if (stored.date === d) return stored.challenges;

    var rng = mulberry32(dateSeed(d));
    var challenges = [];

    /* Challenge 1: Score X+ in a specific game */
    var scoreGames = GAME_IDS.filter(function (id) { return id !== 'unicorn-clicker' && id !== 'inkognito'; });
    var g1 = scoreGames[Math.floor(rng() * scoreGames.length)];
    var tpl1 = CHALLENGE_TEMPLATES[0];
    var target1 = tpl1.targets[Math.floor(rng() * tpl1.targets.length)];
    challenges.push({
      id: 'c1_' + d, type: 'score', gameId: g1, target: target1, reward: 20,
      completed: false, desc: getChallTpl(tpl1.tplKey).replace('{target}', target1).replace('{game}', GAMES[g1].name),
    });

    /* Challenge 2: Play N different games */
    var tpl2 = CHALLENGE_TEMPLATES[1];
    var target2 = tpl2.targets[Math.floor(rng() * tpl2.targets.length)];
    challenges.push({
      id: 'c2_' + d, type: 'play', gameId: null, target: target2, reward: 15,
      completed: false, desc: getChallTpl(tpl2.tplKey).replace('{target}', target2),
    });

    /* Challenge 3: Beat your best in a specific game */
    var g3 = scoreGames[Math.floor(rng() * scoreGames.length)];
    challenges.push({
      id: 'c3_' + d, type: 'beat_best', gameId: g3, target: 1, reward: 25,
      completed: false, desc: getChallTpl(CHALLENGE_TEMPLATES[2].tplKey).replace('{game}', GAMES[g3].name),
    });

    setChallenges({ date: d, challenges: challenges });
    return challenges;
  }

  function checkChallenges(gameId, score, isNewBest) {
    var ch = getChallenges();
    if (ch.date !== today()) { ch = { date: today(), challenges: generateDailyChallenges() }; }
    var completed = [];
    var s = getState();

    ch.challenges.forEach(function (c) {
      if (c.completed) return;
      if (c.type === 'score' && c.gameId === gameId && score >= c.target) {
        c.completed = true; completed.push(c);
      } else if (c.type === 'play' && (s.todayGamesPlayed || []).length >= c.target) {
        c.completed = true; completed.push(c);
      } else if (c.type === 'beat_best' && c.gameId === gameId && isNewBest) {
        c.completed = true; completed.push(c);
      }
    });

    if (completed.length) {
      setChallenges(ch);
      var state = getState();
      completed.forEach(function (c) {
        addCoins(c.reward);
        state = getState();
        state.challengesCompleted = (state.challengesCompleted || 0) + 1;
        setState(state);
        track('challenge_complete', { challenge_type: c.type, challenge_desc: c.desc, reward: c.reward });
      });
    }
    return completed;
  }

  /* ── Score thresholds ── */
  function getThresholdBonus(gameId, score) {
    var g = GAMES[gameId];
    if (!g || !g.thresholds) return 0;
    var bonus = 0;
    if (score >= g.thresholds[0]) bonus = 5;
    if (score >= g.thresholds[1]) bonus = 10;
    if (score >= g.thresholds[2]) bonus = 20;
    return bonus;
  }

  /* ── Public API ── */

  function onGameStart(gameId) {
    /* Track session start — currently a no-op placeholder */
  }

  function onGameOver(gameId, score) {
    var s = getState();
    var d = today();

    /* Reset daily tracking if new day */
    if (s.todayDate !== d) {
      s.todayDate = d;
      s.todayGamesPlayed = [];
    }

    /* Track plays */
    s.totalGamesPlayed++;
    s.gamesPlayed[gameId] = (s.gamesPlayed[gameId] || 0) + 1;
    if (s.uniqueGamesPlayed.indexOf(gameId) === -1) s.uniqueGamesPlayed.push(gameId);
    if (s.todayGamesPlayed.indexOf(gameId) === -1) s.todayGamesPlayed.push(gameId);
    s.lastPlayedDate = d;

    /* Check for new best */
    var game = GAMES[gameId];
    var bestKey = game ? game.bestKey : null;
    var currentBest = 0;
    if (gameId === 'unicorn-clicker') {
      var ucSave = loadJSON('unicornClickerSave', {});
      currentBest = ucSave.lifetimeSP || 0;
    } else if (bestKey) {
      currentBest = Number(localStorage.getItem(bestKey)) || 0;
    }
    var isNewBest = score > currentBest;

    /* Calculate coins */
    var coinsEarned = 5; /* base completion */
    if (isNewBest && score > 0) coinsEarned += 10;
    coinsEarned += getThresholdBonus(gameId, score);

    setState(s);
    addCoins(coinsEarned);

    /* Check challenges */
    var challengesCompleted = checkChallenges(gameId, score, isNewBest);

    /* Check achievements */
    var newAchievements = checkAchievements();

    /* Analytics */
    track('game_over', { game_id: gameId, score: score, is_new_best: isNewBest, coins_earned: coinsEarned });

    /* Show achievement popups */
    newAchievements.forEach(function (a, i) {
      setTimeout(function () { showAchievementPopup(a); }, 300 * (i + 1));
    });

    return {
      coinsEarned: coinsEarned,
      isNewBest: isNewBest,
      newAchievements: newAchievements,
      challengesCompleted: challengesCompleted,
    };
  }

  function getCoins() { return getState().coins; }

  function spendCoins(amount) {
    var s = getState();
    if (s.coins < amount) return false;
    s.coins -= amount;
    s.totalCoinsSpent = (s.totalCoinsSpent || 0) + amount;
    setState(s);
    updateCoinDisplays();
    checkAchievements();
    return true;
  }

  function checkStreak() {
    var streak = getStreak();
    var d = today();
    var result = { streak: streak.streak, coinsAwarded: 0, isNewDay: false };

    if (streak.lastDate === d) {
      result.streak = streak.streak;
      return result;
    }

    result.isNewDay = true;

    /* Check if yesterday */
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yStr = yesterday.toISOString().slice(0, 10);

    if (streak.lastDate === yStr) {
      streak.streak++;
    } else if (streak.lastDate) {
      streak.streak = 1;
    } else {
      streak.streak = 1;
    }

    if (streak.streak > streak.longestStreak) streak.longestStreak = streak.streak;

    /* Award daily streak coins */
    var award = Math.min(streak.streak * 10, 50);
    streak.lastDate = d;
    streak.coinsClaimedToday = true;
    setStreak(streak);
    addCoins(award);

    result.streak = streak.streak;
    result.coinsAwarded = award;
    return result;
  }

  function getDailyChallenges() {
    return generateDailyChallenges().map(function (c) {
      return { id: c.id, desc: c.desc, reward: c.reward, completed: c.completed, type: c.type, gameId: c.gameId, target: c.target };
    });
  }

  function getShopItems() {
    var shop = getShop();
    return SHOP_ITEMS.map(function (item) {
      return Object.assign({}, item, {
        purchased: shop.purchased.indexOf(item.id) !== -1,
        equipped: shop.equipped[item.cat] === item.id,
      });
    });
  }

  function purchaseItem(id) {
    var item = SHOP_ITEMS.find(function (i) { return i.id === id; });
    if (!item) return { success: false, reason: t('arcItemNotFound', 'Item not found') };
    var shop = getShop();
    if (shop.purchased.indexOf(id) !== -1) return { success: false, reason: t('arcAlreadyOwned', 'Already owned') };
    if (!spendCoins(item.cost)) return { success: false, reason: t('arcNotEnoughCoins', 'Not enough coins') };
    shop = getShop();
    shop.purchased.push(id);
    setShop(shop);
    track('shop_purchase', { item_id: id, item_name: item.name, item_cost: item.cost });
    return { success: true };
  }

  function equipItem(id) {
    var item = SHOP_ITEMS.find(function (i) { return i.id === id; });
    if (!item) return false;
    var shop = getShop();
    if (shop.purchased.indexOf(id) === -1) return false;
    if (shop.equipped[item.cat] === id) {
      shop.equipped[item.cat] = null;
    } else {
      shop.equipped[item.cat] = id;
    }
    setShop(shop);
    applyTheme();
    return true;
  }

  function applyTheme() {
    var shop = getShop();
    var themeId = shop.equipped.theme;
    if (!themeId) {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent2');
      document.documentElement.style.removeProperty('--accent3');
      return;
    }
    var item = SHOP_ITEMS.find(function (i) { return i.id === themeId; });
    if (item && item.vars) {
      Object.keys(item.vars).forEach(function (k) {
        document.documentElement.style.setProperty(k, item.vars[k]);
      });
    }
  }

  function getArcadeAchievements() {
    var ach = getAch();
    return ACHIEVEMENTS.map(function (a) {
      return Object.assign({}, a, {
        unlocked: ach.unlocked.indexOf(a.id) !== -1,
        unlockedAt: ach.unlockedAt[a.id] || null,
      });
    });
  }

  function getRandomGame() {
    var id = GAME_IDS[Math.floor(Math.random() * GAME_IDS.length)];
    return '/' + id + '/';
  }

  function getProfileData() {
    var s = getState();
    var streak = getStreak();
    var shop = getShop();
    var ach = getAch();
    var fav = null;
    var maxPlays = 0;
    Object.keys(s.gamesPlayed).forEach(function (gid) {
      if (s.gamesPlayed[gid] > maxPlays) { maxPlays = s.gamesPlayed[gid]; fav = gid; }
    });
    return {
      coins: s.coins,
      totalCoinsEarned: s.totalCoinsEarned,
      totalCoinsSpent: s.totalCoinsSpent || 0,
      totalGamesPlayed: s.totalGamesPlayed,
      uniqueGamesPlayed: s.uniqueGamesPlayed.length,
      favoriteGame: fav ? GAMES[fav].name : t('arcNoneYet', 'None yet'),
      streak: streak.streak,
      longestStreak: streak.longestStreak,
      achievementsUnlocked: ach.unlocked.length,
      achievementsTotal: ACHIEVEMENTS.length,
      equippedBadge: shop.equipped.badge,
      equippedFrame: shop.equipped.frame,
      equippedTheme: shop.equipped.theme,
      purchased: shop.purchased,
    };
  }

  /* ── Achievement popup toast ── */
  function showAchievementPopup(ach) {
    var toast = document.createElement('div');
    toast.className = 'arc-ach-toast';
    toast.innerHTML =
      '<div class="arc-ach-toast__icon">' + ach.icon + '</div>' +
      '<div class="arc-ach-toast__body">' +
        '<div class="arc-ach-toast__title">' + t('arcAchUnlocked', 'Achievement Unlocked!') + '</div>' +
        '<div class="arc-ach-toast__name">' + ach.name + '</div>' +
        '<div class="arc-ach-toast__reward">+' + ach.reward + ' ' + t('arcCoins', 'coins') + '</div>' +
      '</div>';
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('arc-ach-toast--show'); });
    setTimeout(function () {
      toast.classList.remove('arc-ach-toast--show');
      setTimeout(function () { toast.remove(); }, 400);
    }, 3500);
  }

  /* ── Viral share hooks — provocative challenge texts ── */
  var SHARE_HOOKS = [
    'Only 2% of players beat {score} on {game}. Think you can?',
    'I just destroyed {game} with {score} points. You won\'t even come close.',
    'This game is IMPOSSIBLE. I got {score} on {game}. Bet you can\'t beat it.',
    '{score} on {game}. Don\'t play this unless you want to get addicted.',
    'I scored {score} on {game} and I can\'t stop playing. You\'ve been warned.',
  ];

  function getShareHook(score, gameName) {
    var idx = Math.floor(Math.random() * SHARE_HOOKS.length);
    return SHARE_HOOKS[idx].replace('{score}', score).replace('{game}', gameName);
  }

  /* ── Challenge link encoding/decoding ── */
  function encodeChallengeLink(gameId, score) {
    var nickname = (typeof Leaderboard !== 'undefined' && Leaderboard.getNickname) ? Leaderboard.getNickname() : '';
    var params = new URLSearchParams({ g: gameId, s: score });
    if (nickname) params.set('n', nickname);
    return 'https://slayplay.io/' + gameId + '/?challenge=' + btoa(params.toString());
  }

  function decodeChallengeLink() {
    var params = new URLSearchParams(window.location.search);
    var encoded = params.get('challenge');
    if (!encoded) return null;
    try {
      var decoded = new URLSearchParams(atob(encoded));
      return {
        gameId: decoded.get('g'),
        score: Number(decoded.get('s')) || 0,
        nickname: decoded.get('n') || 'Someone',
      };
    } catch (e) { return null; }
  }

  /* ── Competition framing — percentile calculation ── */
  function getPercentileText(gameId, score) {
    var game = GAMES[gameId];
    if (!game || !game.thresholds) return '';
    var t3 = game.thresholds;
    if (score >= t3[2]) return 'Top 3%';
    if (score >= t3[1]) return 'Top 15%';
    if (score >= t3[0]) return 'Top 40%';
    return '';
  }

  /* ── OG Badge system ── */
  function getOGBadge() {
    return loadJSON('arcade_og_badge', null);
  }

  function checkOGBadge() {
    if (getOGBadge()) return; /* Already claimed */
    /* Award OG badge to anyone playing before a threshold date or within first 1000 plays */
    var s = getState();
    if (s.totalGamesPlayed >= 1) {
      saveJSON('arcade_og_badge', {
        title: 'OG Slayer',
        icon: '\u2694\uFE0F',
        claimedAt: Date.now(),
        tier: s.totalGamesPlayed <= 10 ? 'founding' : 'early',
      });
    }
  }

  /* ── Score card overlay ── */
  function createScoreCard(gameId, score, best) {
    var game = GAMES[gameId] || { name: gameId };
    var result = null;

    /* Find existing score card from the same session */
    var existing = document.querySelector('.arc-scorecard');
    if (existing) existing.remove();

    /* Check & award OG badge */
    checkOGBadge();

    var overlay = document.createElement('div');
    overlay.className = 'arc-scorecard';

    var isNewBest = score > (best || 0) && score > 0;
    var thresholdBonus = getThresholdBonus(gameId, score);
    var coinsBase = 5;
    var coinsNewBest = isNewBest ? 10 : 0;
    var percentile = getPercentileText(gameId, score);
    var challengeLink = encodeChallengeLink(gameId, score);

    var html =
      '<div class="arc-scorecard__card">' +
        '<h2 class="arc-scorecard__title">' + game.name + '</h2>' +
        (isNewBest ? '<div class="arc-scorecard__newbest">' + t('arcNewBest', 'New Best!') + '</div>' : '') +
        (percentile ? '<div class="arc-scorecard__percentile">' + percentile + '</div>' : '') +
        '<div class="arc-scorecard__scores">' +
          '<div class="arc-scorecard__score">' +
            '<div class="arc-scorecard__score-label">' + t('score', 'Score') + '</div>' +
            '<div class="arc-scorecard__score-value">' + score + '</div>' +
          '</div>' +
          '<div class="arc-scorecard__score">' +
            '<div class="arc-scorecard__score-label">' + t('best', 'Best') + '</div>' +
            '<div class="arc-scorecard__score-value">' + Math.max(score, best || 0) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="arc-scorecard__coins">' +
          '<div class="arc-scorecard__coins-row"><span>' + t('arcCompletion', 'Completion') + '</span><span>+' + coinsBase + '</span></div>' +
          (coinsNewBest ? '<div class="arc-scorecard__coins-row arc-scorecard__coins-row--bonus"><span>' + t('arcNewBest', 'New Best!') + '</span><span>+' + coinsNewBest + '</span></div>' : '') +
          (thresholdBonus ? '<div class="arc-scorecard__coins-row arc-scorecard__coins-row--bonus"><span>' + t('arcScoreBonus', 'Score Bonus') + '</span><span>+' + thresholdBonus + '</span></div>' : '') +
          '<div class="arc-scorecard__coins-total"><span>' + t('arcTotal', 'Total') + '</span><span>+' + (coinsBase + coinsNewBest + thresholdBonus) + ' ' + t('arcCoins', 'coins') + '</span></div>' +
        '</div>' +
        '<div class="arc-scorecard__actions">' +
          '<button class="arc-scorecard__btn arc-scorecard__btn--challenge" title="Challenge a friend">\u2694\uFE0F ' + t('arcChallenge', 'Challenge Friend') + '</button>' +
          '<button class="arc-scorecard__btn arc-scorecard__btn--share" title="Copy viral share">' + t('arcShare', 'Share') + '</button>' +
          '<button class="arc-scorecard__btn arc-scorecard__btn--again">' + t('arcPlayAgain', 'Play Again') + '</button>' +
          '<a href="/" class="arc-scorecard__btn arc-scorecard__btn--home">' + t('arcHome', 'Home') + '</a>' +
        '</div>' +
      '</div>';

    overlay.innerHTML = html;

    /* Challenge friend button — copies deep link */
    overlay.querySelector('.arc-scorecard__btn--challenge').addEventListener('click', function () {
      var nickname = (typeof Leaderboard !== 'undefined' && Leaderboard.getNickname) ? Leaderboard.getNickname() : 'Someone';
      var text = nickname + ' scored ' + score + ' on ' + game.name + '. Beat them! ' + challengeLink;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          this.textContent = '\u2705 ' + t('arcCopied', 'Copied!');
          setTimeout(function () { this.textContent = '\u2694\uFE0F ' + t('arcChallenge', 'Challenge Friend'); }.bind(this), 2000);
        }.bind(this));
      }
    });

    /* Share button — viral hook text */
    overlay.querySelector('.arc-scorecard__btn--share').addEventListener('click', function () {
      var text = getShareHook(score, game.name) + '\nhttps://slayplay.io/' + gameId + '/';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          this.textContent = t('arcCopied', 'Copied!');
          setTimeout(function () { this.textContent = t('arcShare', 'Share'); }.bind(this), 2000);
        }.bind(this));
      }
    });

    /* Play again button */
    overlay.querySelector('.arc-scorecard__btn--again').addEventListener('click', function () {
      overlay.remove();
      /* Trigger restart — dispatch custom event games can listen for */
      document.dispatchEvent(new CustomEvent('arcade-restart'));
    });

    requestAnimationFrame(function () { overlay.classList.add('arc-scorecard--show'); });

    return overlay;
  }

  /* ── Challenge banner (shown when opening a challenge link) ── */
  function showChallengeBanner() {
    var challenge = decodeChallengeLink();
    if (!challenge) return;
    var game = GAMES[challenge.gameId];
    if (!game) return;

    var banner = document.createElement('div');
    banner.className = 'arc-challenge-banner';
    banner.innerHTML =
      '<div class="arc-challenge-banner__inner">' +
        '<span class="arc-challenge-banner__icon">\u2694\uFE0F</span>' +
        '<div class="arc-challenge-banner__text">' +
          '<strong>' + challenge.nickname + '</strong> scored <strong>' + challenge.score + '</strong> on ' + game.name + '.' +
          '<br>Think you can beat them?' +
        '</div>' +
        '<button class="arc-challenge-banner__close">\u2715</button>' +
      '</div>';

    banner.querySelector('.arc-challenge-banner__close').addEventListener('click', function () {
      banner.remove();
    });

    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add('arc-challenge-banner--show'); });
  }

  /* ── Nav HUD ── */
  function injectNavHUD() {
    /* Don't inject twice */
    if (document.querySelector('.arc-nav')) return;

    var isGamePage = window.location.pathname.split('/').filter(Boolean).length >= 1
      && window.location.pathname !== '/'
      && !['profile', 'shop', 'achievements', 'leaderboard-page'].some(function (p) {
        return window.location.pathname.indexOf('/' + p) === 0;
      });

    var isHubPage = !isGamePage;
    var coins = getState().coins;
    var streak = getStreak();

    var nav = document.createElement('nav');
    nav.className = 'arc-nav' + (isGamePage ? ' arc-nav--compact' : '');

    if (isGamePage) {
      nav.innerHTML =
        '<a href="/" class="arc-nav__link arc-nav__link--home" title="Home">&#x1F3E0;</a>' +
        '<div class="arc-nav__coins"><span class="arc-coin-icon">&#x1FA99;</span> <span class="arc-coin-value">' + coins + '</span></div>';
    } else {
      nav.innerHTML =
        '<div class="arc-nav__left">' +
          '<a href="/" class="arc-nav__link' + (window.location.pathname === '/' ? ' arc-nav__link--active' : '') + '">' + t('arcNavGames', 'Games') + '</a>' +
          '<a href="/achievements/" class="arc-nav__link' + (window.location.pathname.indexOf('/achievements') === 0 ? ' arc-nav__link--active' : '') + '">' + t('achievements', 'Achievements') + '</a>' +
          '<a href="/shop/" class="arc-nav__link' + (window.location.pathname.indexOf('/shop') === 0 ? ' arc-nav__link--active' : '') + '">' + t('arcNavShop', 'Shop') + '</a>' +
          '<a href="/leaderboard-page/" class="arc-nav__link' + (window.location.pathname.indexOf('/leaderboard-page') === 0 ? ' arc-nav__link--active' : '') + '">' + t('leaderboard', 'Leaderboard') + '</a>' +
          '<a href="/profile/" class="arc-nav__link' + (window.location.pathname.indexOf('/profile') === 0 ? ' arc-nav__link--active' : '') + '">' + t('arcNavProfile', 'Profile') + '</a>' +
        '</div>' +
        '<div class="arc-nav__right">' +
          (streak.streak > 0 ? '<div class="arc-nav__streak" title="' + streak.streak + '-day streak">&#x1F525; ' + streak.streak + '</div>' : '') +
          '<div class="arc-nav__coins"><span class="arc-coin-icon">&#x1FA99;</span> <span class="arc-coin-value">' + coins + '</span></div>' +
        '</div>';
    }

    document.body.prepend(nav);
    applyTheme();
  }

  /* ── Auto-init ── */
  function autoInit() {
    applyTheme();
    showChallengeBanner();
    checkOGBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  /* ── Expose global ── */
  window.Arcade = {
    onGameStart: onGameStart,
    onGameOver: onGameOver,
    getCoins: getCoins,
    spendCoins: spendCoins,
    checkStreak: checkStreak,
    getDailyChallenges: getDailyChallenges,
    getShopItems: getShopItems,
    purchaseItem: purchaseItem,
    equipItem: equipItem,
    getArcadeAchievements: getArcadeAchievements,
    createScoreCard: createScoreCard,
    getRandomGame: getRandomGame,
    injectNavHUD: injectNavHUD,
    getProfileData: getProfileData,
    getOGBadge: getOGBadge,
    decodeChallengeLink: decodeChallengeLink,
    showChallengeBanner: showChallengeBanner,
    getPercentileText: getPercentileText,
    GAMES: GAMES,
    GAME_IDS: GAME_IDS,
    applyTheme: applyTheme,
  };

})();
