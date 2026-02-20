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
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId:         "YOUR_PROJECT",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "000000000000",
    appId:             "YOUR_APP_ID"
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
      input.placeholder = 'Player';
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

  /* ── Score submission ──────────────────────────────────── */
  async function submitScore(gameId, score) {
    if (!score || score <= 0) return;
    initFirebase();
    if (!db) return;

    const nickname = await promptNickname();
    if (!nickname) return;

    const ref = db.ref('leaderboards/' + gameId);
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
      let html = '<table class="lb-table"><thead><tr>'
        + '<th class="lb-rank">#</th>'
        + '<th>' + t('lbPlayer', 'Player') + '</th>'
        + '<th>' + t('score', 'Score') + '</th>'
        + '</tr></thead><tbody>';

      scores.forEach((entry, i) => {
        const isMe = entry.nickname === nick;
        const rankClass = i === 0 ? ' lb-rank-1' : '';
        html += '<tr class="' + (isMe ? 'lb-row-me' : '') + '">'
          + '<td class="lb-rank' + rankClass + '">' + (i + 1) + '</td>'
          + '<td>' + escapeHtml(entry.nickname) + '</td>'
          + '<td>' + entry.score.toLocaleString() + '</td>'
          + '</tr>';
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    }).catch(() => {
      container.innerHTML = '<p class="lb-empty">Could not load leaderboard.</p>';
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

  /* ── Public API ────────────────────────────────────────── */
  return {
    submitScore,
    getTopScores,
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
