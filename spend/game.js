(function () {
  "use strict";

  var STARTING_AMOUNT = 1000000000;
  var remaining = STARTING_AMOUNT;
  var multiplier = 1;

  var items = [
    { name: "Big Mac", emoji: "\uD83C\uDF54", price: 5, qty: 0 },
    { name: "Movie Ticket", emoji: "\uD83C\uDFAC", price: 15, qty: 0 },
    { name: "Book", emoji: "\uD83D\uDCDA", price: 12, qty: 0 },
    { name: "Pair of Jeans", emoji: "\uD83D\uDC56", price: 40, qty: 0 },
    { name: "Video Game", emoji: "\uD83C\uDFAE", price: 70, qty: 0 },
    { name: "Nice Dinner", emoji: "\uD83C\uDF7D\uFE0F", price: 150, qty: 0 },
    { name: "Smartphone", emoji: "\uD83D\uDCF1", price: 1000, qty: 0 },
    { name: "Gaming PC", emoji: "\uD83D\uDDA5\uFE0F", price: 2500, qty: 0 },
    { name: "Hot Tub", emoji: "\uD83D\uDEC1", price: 8000, qty: 0 },
    { name: "Rolex Watch", emoji: "\u231A", price: 15000, qty: 0 },
    { name: "Tesla Model 3", emoji: "\uD83D\uDE97", price: 40000, qty: 0 },
    { name: "College Tuition (1 yr)", emoji: "\uD83C\uDF93", price: 50000, qty: 0 },
    { name: "Lamborghini", emoji: "\uD83C\uDFCE\uFE0F", price: 300000, qty: 0 },
    { name: "House", emoji: "\uD83C\uDFE0", price: 400000, qty: 0 },
    { name: "Yacht", emoji: "\uD83D\uDEA2", price: 7500000, qty: 0 },
    { name: "Private Jet", emoji: "\u2708\uFE0F", price: 70000000, qty: 0 },
    { name: "Skyscraper", emoji: "\uD83C\uDFD9\uFE0F", price: 850000000, qty: 0 },
    { name: "Sports Team", emoji: "\uD83C\uDFC6", price: 4000000000, qty: 0, alwaysUnaffordable: true }
  ];

  // DOM refs
  var remainingEl = document.getElementById("remaining");
  var gridEl = document.getElementById("items-grid");
  var receiptListEl = document.getElementById("receipt-list");
  var receiptEmptyEl = document.getElementById("receipt-empty");
  var spentDisplayEl = document.getElementById("spent-display");
  var congratsEl = document.getElementById("congrats");

  // Format number with commas
  function fmt(n) {
    return n.toLocaleString("en-US");
  }

  // Animate the money display
  var pulseTimer = null;
  function pulseMoney(type) {
    var cls = type === "buy" ? "pulse-green" : "pulse-red";
    remainingEl.classList.remove("pulse-green", "pulse-red");
    // Force reflow
    void remainingEl.offsetWidth;
    remainingEl.classList.add(cls);
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(function () {
      remainingEl.classList.remove(cls);
    }, 300);
  }

  function updateMoneyDisplay() {
    remainingEl.textContent = "$" + fmt(remaining);
  }

  function getSpent() {
    return STARTING_AMOUNT - remaining;
  }

  // Build item cards
  function buildGrid() {
    gridEl.innerHTML = "";
    items.forEach(function (item, i) {
      var card = document.createElement("div");
      card.className = "item-card";
      card.setAttribute("data-index", i);

      var emojiDiv = document.createElement("div");
      emojiDiv.className = "item-emoji";
      emojiDiv.textContent = item.emoji;

      var nameDiv = document.createElement("div");
      nameDiv.className = "item-name";
      nameDiv.textContent = item.name;

      var priceDiv = document.createElement("div");
      priceDiv.className = "item-price";
      priceDiv.textContent = "$" + fmt(item.price);

      var noteDiv = document.createElement("div");
      noteDiv.className = "item-note";
      if (item.alwaysUnaffordable) {
        noteDiv.textContent = "Can't afford this with just a billion...";
      }

      var qtyDiv = document.createElement("div");
      qtyDiv.className = "item-quantity";
      qtyDiv.setAttribute("data-qty", i);

      var btnsDiv = document.createElement("div");
      btnsDiv.className = "item-buttons";

      var buyBtn = document.createElement("button");
      buyBtn.className = "btn-buy";
      buyBtn.textContent = "Buy";
      buyBtn.setAttribute("data-buy", i);
      buyBtn.addEventListener("click", function () {
        buyItem(i);
      });

      var sellBtn = document.createElement("button");
      sellBtn.className = "btn-sell";
      sellBtn.textContent = "Sell";
      sellBtn.setAttribute("data-sell", i);
      sellBtn.addEventListener("click", function () {
        sellItem(i);
      });

      btnsDiv.appendChild(buyBtn);
      btnsDiv.appendChild(sellBtn);

      card.appendChild(emojiDiv);
      card.appendChild(nameDiv);
      card.appendChild(priceDiv);
      card.appendChild(noteDiv);
      card.appendChild(qtyDiv);
      card.appendChild(btnsDiv);

      gridEl.appendChild(card);
    });
  }

  function buyItem(index) {
    var item = items[index];
    var cost = item.price * multiplier;
    var canBuy = Math.min(multiplier, Math.floor(remaining / item.price));
    if (canBuy <= 0 || item.alwaysUnaffordable) return;
    item.qty += canBuy;
    remaining -= item.price * canBuy;
    pulseMoney("buy");
    updateAll();
  }

  function sellItem(index) {
    var item = items[index];
    var canSell = Math.min(multiplier, item.qty);
    if (canSell <= 0) return;
    item.qty -= canSell;
    remaining += item.price * canSell;
    pulseMoney("sell");
    updateAll();
  }

  function updateAll() {
    updateMoneyDisplay();
    updateCards();
    updateReceipt();
    checkWin();
  }

  function updateCards() {
    items.forEach(function (item, i) {
      var card = gridEl.querySelector('[data-index="' + i + '"]');
      var qtyEl = card.querySelector('[data-qty="' + i + '"]');
      var buyBtn = card.querySelector('[data-buy="' + i + '"]');
      var sellBtn = card.querySelector('[data-sell="' + i + '"]');

      // Quantity display
      if (item.qty > 0) {
        qtyEl.textContent = "Owned: " + fmt(item.qty);
      } else {
        qtyEl.textContent = "";
      }

      // Unaffordable state
      if (item.alwaysUnaffordable || item.price > remaining) {
        card.classList.add("unaffordable");
        buyBtn.disabled = true;
        // Re-enable pointer events for sell if owns some
        if (item.qty > 0 && !item.alwaysUnaffordable) {
          card.classList.remove("unaffordable");
          buyBtn.disabled = true;
        }
      } else {
        card.classList.remove("unaffordable");
        buyBtn.disabled = false;
      }

      // Sell button visibility
      if (item.qty > 0) {
        sellBtn.style.display = "inline-block";
      } else {
        sellBtn.style.display = "none";
      }
    });
  }

  function updateReceipt() {
    receiptListEl.innerHTML = "";
    var spent = getSpent();
    var hasPurchases = false;

    items.forEach(function (item) {
      if (item.qty > 0) {
        hasPurchases = true;
        var row = document.createElement("div");
        row.className = "receipt-row";

        var left = document.createElement("span");
        left.textContent = item.emoji + " " + item.name + " x" + fmt(item.qty);

        var right = document.createElement("span");
        right.textContent = "$" + fmt(item.price * item.qty);

        row.appendChild(left);
        row.appendChild(right);
        receiptListEl.appendChild(row);
      }
    });

    spentDisplayEl.textContent = "Spent: $" + fmt(spent) + "  |  Remaining: $" + fmt(remaining);

    if (hasPurchases) {
      receiptEmptyEl.style.display = "none";
    } else {
      receiptEmptyEl.style.display = "block";
    }
  }

  function checkWin() {
    if (remaining <= 0) {
      remaining = 0;
      updateMoneyDisplay();
      congratsEl.classList.remove("hidden");
    }
  }

  // Multiplier buttons
  var multBtns = document.querySelectorAll(".multiplier-btn");
  multBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      multBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      multiplier = parseInt(btn.getAttribute("data-mult"), 10);
    });
  });

  // Init
  buildGrid();
  updateAll();
})();
