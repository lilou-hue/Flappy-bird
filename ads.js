/* ================================================================
   SlayPlay Ads — Shared Ad Module
   Placeholder banners + simulated rewarded video ads
   ================================================================ */
(function () {
  'use strict';

  /* ── Config: flip when AdSense is approved ── */
  const ADSENSE_ENABLED = false;
  const PUBLISHER_ID = 'ca-pub-XXXXXXXXXX';

  const SlayAds = {};

  /**
   * Hub banner — 728×90 leaderboard above game grid
   */
  SlayAds.injectHubBanner = function () {
    if (ADSENSE_ENABLED) {
      // TODO: replace with real AdSense unit
      return;
    }
    const grid = document.querySelector('.games-grid');
    if (!grid) return;
    const banner = document.createElement('div');
    banner.className = 'slay-ad-banner--hub';
    banner.textContent = 'Ad • SlayPlay';
    grid.parentNode.insertBefore(banner, grid);
  };

  /**
   * Game banner — 320×50 after game footer
   */
  SlayAds.injectGameBanner = function () {
    if (ADSENSE_ENABLED) {
      // TODO: replace with real AdSense unit
      return;
    }
    const footer = document.querySelector('.game__footer');
    if (!footer) return;
    const banner = document.createElement('div');
    banner.className = 'slay-ad-banner--game';
    banner.textContent = 'Ad • SlayPlay';
    footer.parentNode.insertBefore(banner, footer.nextSibling);
  };

  /**
   * Rewarded video ad — 5-second countdown overlay
   * @param {Function} onComplete — called when ad finishes
   */
  SlayAds.showRewardedAd = function (onComplete) {
    if (ADSENSE_ENABLED) {
      // TODO: integrate real ad SDK (e.g. AdMob rewarded)
      // For now, fall through to simulated version
    }

    const overlay = document.createElement('div');
    overlay.className = 'slay-rewarded-overlay';

    const label = document.createElement('div');
    label.className = 'slay-rewarded-overlay__label';
    label.textContent = 'Rewarded Ad';
    overlay.appendChild(label);

    const countdown = document.createElement('div');
    countdown.className = 'slay-rewarded-overlay__countdown';
    countdown.textContent = '5';
    overlay.appendChild(countdown);

    const bar = document.createElement('div');
    bar.className = 'slay-rewarded-overlay__bar';
    const fill = document.createElement('div');
    fill.className = 'slay-rewarded-overlay__bar-fill';
    fill.style.width = '0%';
    bar.appendChild(fill);
    overlay.appendChild(bar);

    document.body.appendChild(overlay);

    let remaining = 5;

    // Start progress
    requestAnimationFrame(function () {
      fill.style.width = '20%';
    });

    const timer = setInterval(function () {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(function () {
          overlay.remove();
          if (typeof onComplete === 'function') onComplete();
        }, 300);
      } else {
        countdown.textContent = String(remaining);
        fill.style.width = ((5 - remaining) / 5 * 100) + '%';
      }
    }, 1000);
  };

  window.SlayAds = SlayAds;
})();
