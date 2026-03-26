/* ================================================================
   Leaderboard — shared Firebase-backed leaderboard for all games
   ================================================================

   Usage:
     1. Include Firebase compat SDKs (firebase-app-compat + firebase-database-compat)
     2. Include leaderboard.css
     3. Include this script
     4. Call:  Leaderboard.createPanel('game-id')  →  returns DOM element
     5. Call:  Leaderboard.submitScore('game-id', score)  on game over

   Firebase config — replace the placeholder below with your own:
   ================================================================ */

const Leaderboard = (() => {
  /* ── Firebase setup ────────────────────────────────────── */
  const firebaseConfig = {
    apiKey:            "AIzaSyAi0xSa5-xpJ3tpMAMxNIMAkJdg7QrVWRg",
    authDomain:        "slayplay-d931f.firebaseapp.com",
    databaseURL:       "https://slayplay-d931f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "slayplay-d931f",
    storageBucket:     "slayplay-d931f.firebasestorage.app",
    messagingSenderId: "322440730209",
    appId:             "1:322440730209:web:6effcaeef9f44b4ea7fc20"
  };

  let db = null;
  function initFirebase() {
    if (db) return;
    if (typeof firebase === 'undefined') {
      console.warn('[Leaderboard] Firebase SDK not loaded');
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
  }

  /* ── i18n helper ───────────────────────────────────────── */
  function t(key, fallback) {
    if (typeof I18N !== 'undefined' && I18N.t) return I18N.t(key) || fallback;
    return fallback;
  }

  /* ── Nickname ──────────────────────────────────────────── */
  const NICK_KEY = 'arcade_nickname';

  function getNickname() {
    return localStorage.getItem(NICK_KEY) || '';
  }

  function saveNickname(name) {
    localStorage.setItem(NICK_KEY, name);
  }

  function promptNickname() {
    return new Promise((resolve) => {
      const existing = getNickname();
      if (existing) { resolve(existing); return; }

      const overlay = document.createElement('div');
      overlay.className = 'lb-nickname-overlay';

      const modal = document.createElement('div');
      modal.className = 'lb-nickname-modal';

      const heading = document.createElement('h3');
      heading.textContent = t('enterNickname', 'Enter your nickname');

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 16;
      input.placeholder = t('lbPlayer', 'Player');
      input.autocomplete = 'off';

      const btn = document.createElement('button');
      btn.textContent = t('submitScore', 'Submit');
      btn.disabled = true;

      input.addEventListener('input', () => {
        btn.disabled = input.value.trim().length === 0;
      });

      function submit() {
        const name = input.value.trim().slice(0, 16);
        if (!name) return;
        saveNickname(name);
        overlay.remove();
        resolve(name);
      }

      btn.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });

      modal.append(heading, input, btn);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      requestAnimationFrame(() => input.focus());
    });
  }

  /* ── Score submission (max 2 entries per player per game) ── */
  const MAX_ENTRIES_PER_PLAYER = 2;

  async function submitScore(gameId, score) {
    if (!score || score <= 0) return;
    initFirebase();
    if (!db) return;

    const nickname = await promptNickname();
    if (!nickname) return;

    const ref = db.ref('leaderboards/' + gameId);

    // Find existing entries by this player
    const snap = await ref.orderByChild('nickname').equalTo(nickname).once('value');
    const existing = [];
    snap.forEach(child => { existing.push({ key: child.key, score: child.val().score }); });

    if (existing.length >= MAX_ENTRIES_PER_PLAYER) {
      // Find the lowest score among the player's entries
      existing.sort((a, b) => a.score - b.score);
      if (score <= existing[0].score) return; // new score isn't better, skip
      // Remove the lowest to make room
      await ref.child(existing[0].key).remove();
    }

    await ref.push({
      nickname: nickname,
      score: score,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }

  /* ── Fetch top scores ──────────────────────────────────── */
  function getTopScores(gameId) {
    initFirebase();
    if (!db) return Promise.resolve([]);
    return db.ref('leaderboards/' + gameId)
      .orderByChild('score')
      .limitToLast(10)
      .once('value')
      .then(snap => {
        const entries = [];
        snap.forEach(child => {
          entries.push(child.val());
        });
        entries.sort((a, b) => b.score - a.score);
        return entries;
      });
  }

  /* ── Render table ──────────────────────────────────────── */
  function renderLeaderboard(container, gameId, currentScore) {
    container.innerHTML = '<p class="lb-loading">' + t('loadingScores', 'Loading scores…') + '</p>';

    getTopScores(gameId).then(scores => {
      if (!scores.length) {
        container.innerHTML = '<p class="lb-empty">' + t('noScoresYet', 'No scores yet. Be the first!') + '</p>';
        return;
      }

      const nick = getNickname();
      /* Get equipped badge for current player to show next to their name */
      const equippedBadge = (typeof Arcade !== 'undefined' && Arcade.getEquippedBadge) ? Arcade.getEquippedBadge() : null;
      const badgeIcon = equippedBadge ? equippedBadge.icon + ' ' : '';

      let html = '<table class="lb-table"><thead><tr>'
        + '<th class="lb-rank">#</th>'
        + '<th>' + t('lbPlayer', 'Player') + '</th>'
        + '<th>' + t('score', 'Score') + '</th>'
        + '</tr></thead><tbody>';

      /* Find near-miss: where would currentScore rank? */
      let nearMissHtml = '';
      if (currentScore && currentScore > 0) {
        let wouldRank = scores.length + 1;
        for (let i = 0; i < scores.length; i++) {
          if (currentScore >= scores[i].score) { wouldRank = i + 1; break; }
        }
        if (wouldRank > 1 && wouldRank <= scores.length + 1) {
          const nextScore = scores[Math.max(0, wouldRank - 2)];
          if (nextScore) {
            const gap = nextScore.score - currentScore;
            if (gap > 0 && gap <= nextScore.score * 0.3) {
              nearMissHtml = '<div class="lb-nearmiss">Just ' + gap.toLocaleString() + ' points from #' + (wouldRank - 1) + '!</div>';
            }
          }
        }
      }

      scores.forEach((entry, i) => {
        const isMe = entry.nickname === nick;
        const rankLabel = i === 0 ? '👑' : (i + 1);
        const rarityClass = isMe && equippedBadge && equippedBadge.rarity ? ' lb-rarity-' + equippedBadge.rarity : '';
        html += '<tr class="' + (isMe ? 'lb-row-me' : '') + rarityClass + '">'
          + '<td class="lb-rank">' + rankLabel + '</td>'
          + '<td>' + (isMe ? badgeIcon : '') + escapeHtml(entry.nickname) + (isMe ? ' <span class="lb-you">(you)</span>' : '') + '</td>'
          + '<td>' + entry.score.toLocaleString() + '</td>'
          + '</tr>';
      });

      html += '</tbody></table>';
      container.innerHTML = nearMissHtml + html;
    }).catch(() => {
      container.innerHTML = '<p class="lb-empty">' + t('lbError', 'Could not load leaderboard.') + '</p>';
    });
  }

  /* ── Create panel widget ───────────────────────────────── */
  function createPanel(gameId) {
    const panel = document.createElement('div');
    panel.className = 'lb-panel';
    panel.id = 'lbPanel';

    const heading = document.createElement('h3');
    heading.textContent = t('leaderboard', 'Leaderboard');
    panel.appendChild(heading);

    const body = document.createElement('div');
    body.id = 'lbBody';
    panel.appendChild(body);

    renderLeaderboard(body, gameId);
    return panel;
  }

  /* ── Helpers ───────────────────────────────────────────── */
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ── Fetch ALL scores for a game (for ranking computation) ── */
  function getAllScores(gameId) {
    initFirebase();
    if (!db) return Promise.resolve([]);
    return db.ref('leaderboards/' + gameId)
      .orderByChild('score')
      .once('value')
      .then(snap => {
        const entries = [];
        snap.forEach(child => { entries.push(child.val()); });
        entries.sort((a, b) => b.score - a.score);
        return entries;
      });
  }

  /* ── Public API ────────────────────────────────────────── */
  return {
    submitScore,
    getTopScores,
    getAllScores,
    renderLeaderboard,
    createPanel,
    promptNickname,
    getNickname,
    refresh(gameId) {
      const body = document.getElementById('lbBody');
      if (body) renderLeaderboard(body, gameId);
    }
  };
})();
