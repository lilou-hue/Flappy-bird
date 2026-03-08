/* ================================================================
   Shared Shop Module — Premium Bundles + Redeem Codes
   Usage: Shop.init({ gameId, bundles, codes, onUnlock, buttonTarget })
   ================================================================ */
(function () {
'use strict';

var config = null;
var overlayEl = null;
var statusEl = null;
var inputEl = null;

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

  // Title
  var title = document.createElement('div');
  title.className = 'sp-shop-title';
  title.innerHTML = '&#x1F6CD; Shop &mdash; Premium Bundles';
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

    var link = document.createElement('a');
    link.className = 'sp-shop-bundle__link';
    link.href = b.kofiUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Buy on Ko-fi';
    card.appendChild(link);

    grid.appendChild(card);
  });

  modal.appendChild(grid);

  // Redeem row
  var redeemRow = document.createElement('div');
  redeemRow.className = 'sp-shop-redeem';

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'sp-shop-redeem__input';
  input.placeholder = 'Enter redeem code...';
  input.id = 'spShopCodeInput';
  redeemRow.appendChild(input);

  var redeemBtn = document.createElement('button');
  redeemBtn.className = 'sp-shop-redeem__btn';
  redeemBtn.textContent = 'Redeem';
  redeemBtn.type = 'button';
  redeemRow.appendChild(redeemBtn);

  modal.appendChild(redeemRow);

  // Status
  var status = document.createElement('div');
  status.className = 'sp-shop-status';
  status.id = 'spShopStatus';
  modal.appendChild(status);

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.className = 'sp-shop-close';
  closeBtn.textContent = 'Close';
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

  return { overlay: overlay, status: status, input: input };
}

/* ── Redeem code ── */
function redeem(code) {
  if (!config) return;
  var upper = code.trim().toUpperCase();
  if (!upper) return;

  var bundleId = config.codes[upper];
  if (!bundleId) {
    statusEl.textContent = 'Invalid code. Please check and try again.';
    statusEl.className = 'sp-shop-status error';
    return;
  }

  // Check already redeemed
  var redeemed = loadRedeemed(config.gameId);
  if (redeemed.indexOf(upper) !== -1) {
    statusEl.textContent = 'Code already redeemed!';
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
    statusEl.textContent = 'No items found for this code.';
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
    bundleName = 'All Bundles';
  } else {
    for (var j = 0; j < config.bundles.length; j++) {
      if (config.bundles[j].id === bundleId) { bundleName = config.bundles[j].name; break; }
    }
  }

  statusEl.textContent = bundleName + ' redeemed! ' + itemIds.length + ' item(s) unlocked.';
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
    overlayEl.classList.add('visible');
  },

  close: function () {
    if (!overlayEl) return;
    overlayEl.classList.remove('visible');
  }
};

window.Shop = Shop;
})();
