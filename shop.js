/* ================================================================
   Shared Shop Module — Premium Bundles + Redeem Codes
   Supports Lemonsqueezy checkout overlay + manual code redemption
   Usage: Shop.init({ gameId, bundles, codes, onUnlock, buttonTarget })

   Bundle format:
     { id, name, desc, price, checkoutUrl, items: [...] }
     checkoutUrl = Lemonsqueezy product URL (opens overlay checkout)
   ================================================================ */
(function () {
'use strict';

var config = null;
var overlayEl = null;
var statusEl = null;
var inputEl = null;
var adminBtnEl = null;
var lemonReady = false;

function _t(key, fallback) {
  if (typeof I18N !== 'undefined' && I18N.t) {
    var v = I18N.t(key);
    if (v && v !== key) return v;
  }
  return fallback || key;
}

/* ── Lemonsqueezy SDK loader ── */
var lemonPendingCallbacks = [];
var lemonCheckInterval = null;

function ensureLemonSDK(cb) {
  /* SDK already loaded — fire immediately */
  if (lemonReady && window.LemonSqueezy) { cb(); return; }

  /* Queue this callback */
  lemonPendingCallbacks.push(cb);

  if (document.getElementById('lemonsqueezy-js')) {
    /* Script tag exists but SDK not ready yet — start ONE shared interval */
    if (!lemonCheckInterval) {
      lemonCheckInterval = setInterval(function () {
        if (window.LemonSqueezy) {
          lemonReady = true;
          clearInterval(lemonCheckInterval);
          lemonCheckInterval = null;
          var cbs = lemonPendingCallbacks.slice();
          lemonPendingCallbacks = [];
          cbs.forEach(function (fn) { fn(); });
        }
      }, 100);
    }
    return;
  }

  /* First call — create the script tag */
  var script = document.createElement('script');
  script.id = 'lemonsqueezy-js';
  script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
  script.defer = true;
  script.onload = function () {
    if (window.LemonSqueezy) {
      window.LemonSqueezy.Setup({ eventHandler: handleLemonEvent });
      lemonReady = true;
    }
    var cbs = lemonPendingCallbacks.slice();
    lemonPendingCallbacks = [];
    if (lemonCheckInterval) {
      clearInterval(lemonCheckInterval);
      lemonCheckInterval = null;
    }
    cbs.forEach(function (fn) { fn(); });
  };
  document.head.appendChild(script);
}

/* ── Lemonsqueezy event handler ── */
function handleLemonEvent(event) {
  if (event.event === 'Checkout.Success') {
    /* The order completed — show success message */
    if (statusEl) {
      statusEl.textContent = _t('shopPurchaseSuccess', 'Purchase complete! Enter your license key below to unlock your items.');
      statusEl.className = 'sp-shop-status success';
    }
  }
}

/* ── localStorage helpers ── */
function loadRedeemed(gameId) {
  try {
    return JSON.parse(localStorage.getItem('shop_redeemed_' + gameId)) || [];
  } catch (e) { return []; }
}

function saveRedeemed(gameId, codes) {
  localStorage.setItem('shop_redeemed_' + gameId, JSON.stringify(codes));
}

/* ── Build modal HTML ── */
function buildModal(cfg) {
  var overlay = document.createElement('div');
  overlay.className = 'sp-shop-overlay';
  overlay.id = 'spShopOverlay';

  var modal = document.createElement('div');
  modal.className = 'sp-shop-modal';

  // Title — triple-click activates admin mode
  var title = document.createElement('div');
  title.className = 'sp-shop-title';
  title.innerHTML = '&#x1F6CD; ' + _t('shopTitle', 'Shop') + ' &mdash; ' + _t('shopPremiumBundles', 'Premium Bundles');
  title.addEventListener('click', function (e) {
    if (e.detail === 3) {
      e.preventDefault();
      if (window.Arcade && Arcade.activateAdminMode) {
        Arcade.activateAdminMode();
      } else {
        try { localStorage.setItem('arc_admin', '1'); } catch(e2) {}
      }
      if (adminBtn) adminBtn.style.display = '';
      status.textContent = '🔑 Admin mode on — click Unlock All below.';
      status.className = 'sp-shop-status success';
    }
  });
  modal.appendChild(title);

  // Bundles grid
  var grid = document.createElement('div');
  grid.className = 'sp-shop-bundles';

  cfg.bundles.forEach(function (b) {
    var card = document.createElement('div');
    card.className = 'sp-shop-bundle';

    var name = document.createElement('div');
    name.className = 'sp-shop-bundle__name';
    name.textContent = b.name;
    card.appendChild(name);

    var desc = document.createElement('div');
    desc.className = 'sp-shop-bundle__desc';
    desc.textContent = b.desc;
    card.appendChild(desc);

    var price = document.createElement('div');
    price.className = 'sp-shop-bundle__price';
    price.textContent = b.price;
    card.appendChild(price);

    /* Buy button — Lemonsqueezy overlay checkout */
    var buyUrl = b.checkoutUrl || b.kofiUrl || '';
    var link = document.createElement('a');
    link.className = 'sp-shop-bundle__link';
    link.href = buyUrl;
    link.textContent = _t('shopBuy', 'Buy Now');

    if (buyUrl.indexOf('lemonsqueezy.com') !== -1) {
      /* Lemonsqueezy overlay checkout */
      link.className += ' lemonsqueezy-button';
      link.addEventListener('click', function (e) {
        e.preventDefault();
        ensureLemonSDK(function () {
          if (window.LemonSqueezy) {
            window.LemonSqueezy.Url.Open(buyUrl);
          } else {
            window.open(buyUrl, '_blank');
          }
        });
      });
    } else if (buyUrl) {
      link.target = '_blank';
      link.rel = 'noopener';
    }

    card.appendChild(link);
    grid.appendChild(card);
  });

  modal.appendChild(grid);

  // How it works hint
  var hint = document.createElement('div');
  hint.className = 'sp-shop-hint';
  hint.textContent = _t('shopHint', 'After buying, you\'ll receive a license key. Paste it below to unlock your items!');
  modal.appendChild(hint);

  // Redeem row
  var redeemRow = document.createElement('div');
  redeemRow.className = 'sp-shop-redeem';

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'sp-shop-redeem__input';
  input.placeholder = _t('shopEnterCode', 'Enter license key or redeem code...');
  input.id = 'spShopCodeInput';
  redeemRow.appendChild(input);

  var redeemBtn = document.createElement('button');
  redeemBtn.className = 'sp-shop-redeem__btn';
  redeemBtn.textContent = _t('shopRedeem', 'Redeem');
  redeemBtn.type = 'button';
  redeemRow.appendChild(redeemBtn);

  modal.appendChild(redeemRow);

  // Status
  var status = document.createElement('div');
  status.className = 'sp-shop-status';
  status.id = 'spShopStatus';
  modal.appendChild(status);

  // Admin unlock button — only shown when Arcade admin mode is active
  var adminBtn = document.createElement('button');
  adminBtn.className = 'sp-shop-admin-unlock';
  adminBtn.type = 'button';
  adminBtn.innerHTML = '🔑 Unlock All (Admin Testing)';
  adminBtn.style.display = 'none';
  modal.appendChild(adminBtn);

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.className = 'sp-shop-close';
  closeBtn.textContent = _t('shopClose', 'Close');
  closeBtn.type = 'button';
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Wire events
  closeBtn.onclick = function () { Shop.close(); };
  overlay.onclick = function (e) {
    if (e.target === overlay) Shop.close();
  };
  redeemBtn.onclick = function () { redeem(input.value); };
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') redeem(input.value);
  });

  adminBtn.onclick = function () {
    if (!config) return;
    var allItems = [];
    config.bundles.forEach(function (b) {
      b.items.forEach(function (id) {
        if (allItems.indexOf(id) === -1) allItems.push(id);
      });
    });
    if (config.onUnlock) config.onUnlock(allItems);
    status.textContent = '🔑 All items unlocked (admin mode)';
    status.className = 'sp-shop-status success';
  };

  return { overlay: overlay, status: status, input: input, adminBtn: adminBtn };
}

/* ── Redeem code ── */
function redeem(code) {
  if (!config) return;
  var upper = code.trim().toUpperCase();
  if (!upper) return;

  /* Secret admin activation code — works from any game page */
  if (upper === 'SLAY2024ADMIN') {
    if (window.Arcade && Arcade.activateAdminMode) {
      Arcade.activateAdminMode();
    } else {
      /* Fallback: set localStorage directly if Arcade not loaded */
      try { localStorage.setItem('arc_admin', '1'); } catch(e) {}
    }
    if (adminBtnEl) adminBtnEl.style.display = '';
    if (inputEl) inputEl.value = '';
    statusEl.textContent = '🔑 Admin mode on — click Unlock All to unlock items.';
    statusEl.className = 'sp-shop-status success';
    return;
  }

  var bundleId = config.codes[upper];
  if (!bundleId) {
    /* Also try the raw input (Lemonsqueezy license keys are mixed-case UUIDs) */
    var raw = code.trim();
    bundleId = config.codes[raw];
  }
  if (!bundleId) {
    statusEl.textContent = _t('shopInvalidCode', 'Invalid code. Please check and try again.');
    statusEl.className = 'sp-shop-status error';
    return;
  }

  // Check already redeemed
  var redeemed = loadRedeemed(config.gameId);
  if (redeemed.indexOf(upper) !== -1) {
    statusEl.textContent = _t('shopAlreadyRedeemed', 'Code already redeemed!');
    statusEl.className = 'sp-shop-status success';
    return;
  }

  // Collect items to unlock
  var itemIds = [];
  if (bundleId === '__all__') {
    config.bundles.forEach(function (b) {
      b.items.forEach(function (id) {
        if (itemIds.indexOf(id) === -1) itemIds.push(id);
      });
    });
  } else {
    var bundle = null;
    for (var i = 0; i < config.bundles.length; i++) {
      if (config.bundles[i].id === bundleId) { bundle = config.bundles[i]; break; }
    }
    if (bundle) {
      bundle.items.forEach(function (id) {
        if (itemIds.indexOf(id) === -1) itemIds.push(id);
      });
    }
  }

  if (itemIds.length === 0) {
    statusEl.textContent = _t('shopNoItems', 'No items found for this code.');
    statusEl.className = 'sp-shop-status error';
    return;
  }

  // Mark redeemed
  redeemed.push(upper);
  saveRedeemed(config.gameId, redeemed);

  // Callback to game
  if (config.onUnlock) config.onUnlock(itemIds);

  // Find bundle name for display
  var bundleName = 'Bundle';
  if (bundleId === '__all__') {
    bundleName = _t('shopAllBundles', 'All Bundles');
  } else {
    for (var j = 0; j < config.bundles.length; j++) {
      if (config.bundles[j].id === bundleId) { bundleName = config.bundles[j].name; break; }
    }
  }

  statusEl.textContent = bundleName + ' ' + _t('shopRedeemed', 'redeemed!') + ' ' + itemIds.length + ' ' + _t('shopItemsUnlocked', 'item(s) unlocked.');
  statusEl.className = 'sp-shop-status success';
}

/* ── Public API ── */
var Shop = {
  init: function (cfg) {
    config = cfg;
    var els = buildModal(cfg);
    overlayEl = els.overlay;
    statusEl = els.status;
    inputEl = els.input;
    adminBtnEl = els.adminBtn;

    // Preload Lemonsqueezy SDK if any bundle uses it
    var hasLemon = cfg.bundles.some(function (b) {
      return (b.checkoutUrl || '').indexOf('lemonsqueezy.com') !== -1;
    });
    if (hasLemon) ensureLemonSDK(function () {});

    // Wire button target if provided
    if (cfg.buttonTarget) {
      var btn = document.querySelector(cfg.buttonTarget);
      if (btn) {
        btn.addEventListener('click', function () { Shop.open(); });
      }
    }
  },

  open: function () {
    if (!overlayEl) return;
    statusEl.textContent = '';
    statusEl.className = 'sp-shop-status';
    inputEl.value = '';
    /* Show admin unlock button only when Arcade admin mode is active */
    if (adminBtnEl) {
      adminBtnEl.style.display = (window.Arcade && Arcade.isAdminMode()) ? '' : 'none';
    }
    overlayEl.classList.add('visible');
  },

  close: function () {
    if (!overlayEl) return;
    overlayEl.classList.remove('visible');
  }
};

window.Shop = Shop;
})();
