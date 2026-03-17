(function () {
  "use strict";

  var STARTING_AMOUNT = 1000000000;
  var remaining = STARTING_AMOUNT;
  var multiplier = 1;

  var items = [
    // --- Street-level ($500 – $15k) ---
    { name: "Park Bench", emoji: "🪑", price: 500, qty: 0, i18nKey: "bcParkBench" },
    { name: "Trash Can", emoji: "🗑️", price: 800, qty: 0, i18nKey: "bcTrashCan" },
    { name: "Water Fountain", emoji: "⛲", price: 1000, qty: 0, i18nKey: "bcWaterFountain" },
    { name: "Bike Rack", emoji: "🚲", price: 1200, qty: 0, i18nKey: "bcBikeRack" },
    { name: "Flower Bed", emoji: "🌷", price: 1500, qty: 0, i18nKey: "bcFlowerBed" },
    { name: "Street Light", emoji: "🔦", price: 2000, qty: 0, i18nKey: "bcStreetLight" },
    { name: "EV Charger", emoji: "🔌", price: 2500, qty: 0, i18nKey: "bcEvCharger" },
    { name: "Crosswalk", emoji: "🚶", price: 3500, qty: 0, i18nKey: "bcCrosswalk" },
    { name: "Traffic Light", emoji: "🚦", price: 5000, qty: 0, i18nKey: "bcTrafficLight" },
    { name: "CCTV Camera", emoji: "📷", price: 6000, qty: 0, i18nKey: "bcCctv" },
    { name: "Public Toilet", emoji: "🚻", price: 8000, qty: 0, i18nKey: "bcPublicToilet" },
    { name: "Public Wi-Fi Hub", emoji: "📶", price: 10000, qty: 0, i18nKey: "bcWifiHub" },
    { name: "Bus Stop", emoji: "🚏", price: 15000, qty: 0, i18nKey: "bcBusStop" },

    // --- Parks & Recreation ($20k – $120k) ---
    { name: "Dog Park", emoji: "🐕", price: 25000, qty: 0, i18nKey: "bcDogPark" },
    { name: "Tennis Court", emoji: "🎾", price: 35000, qty: 0, i18nKey: "bcTennisCourt" },
    { name: "Basketball Court", emoji: "🏀", price: 45000, qty: 0, i18nKey: "bcBasketballCourt" },
    { name: "Playground", emoji: "🛝", price: 50000, qty: 0, i18nKey: "bcPlayground" },
    { name: "Outdoor Gym", emoji: "💪", price: 65000, qty: 0, i18nKey: "bcOutdoorGym" },
    { name: "Skate Park", emoji: "🛹", price: 75000, qty: 0, i18nKey: "bcSkatePark" },
    { name: "Soccer Field", emoji: "⚽", price: 90000, qty: 0, i18nKey: "bcSoccerField" },
    { name: "Splash Pad", emoji: "💦", price: 110000, qty: 0, i18nKey: "bcSplashPad" },
    { name: "Community Garden", emoji: "🌻", price: 120000, qty: 0, i18nKey: "bcCommunityGarden" },

    // --- Community & Commerce ($150k – $1.2M) ---
    { name: "Food Market", emoji: "🍎", price: 180000, qty: 0, i18nKey: "bcFoodMarket" },
    { name: "Parking Garage", emoji: "🅿️", price: 250000, qty: 0, i18nKey: "bcParkingGarage" },
    { name: "Child Care Center", emoji: "👶", price: 320000, qty: 0, i18nKey: "bcChildCare" },
    { name: "Recycling Center", emoji: "♻️", price: 400000, qty: 0, i18nKey: "bcRecyclingCenter" },
    { name: "Police Station", emoji: "🚔", price: 500000, qty: 0, i18nKey: "bcPoliceStation" },
    { name: "Coworking Space", emoji: "💻", price: 550000, qty: 0, i18nKey: "bcCoworking" },
    { name: "Senior Center", emoji: "👴", price: 650000, qty: 0, i18nKey: "bcSeniorCenter" },
    { name: "Animal Shelter", emoji: "🐾", price: 750000, qty: 0, i18nKey: "bcAnimalShelter" },
    { name: "Art Installation", emoji: "🎨", price: 800000, qty: 0, i18nKey: "bcArtInstallation" },
    { name: "Mosque", emoji: "🕌", price: 900000, qty: 0, i18nKey: "bcMosque" },
    { name: "Church", emoji: "⛪", price: 950000, qty: 0, i18nKey: "bcChurch" },
    { name: "Bike Lane (1 mi)", emoji: "🚴", price: 1200000, qty: 0, i18nKey: "bcBikeLane" },

    // --- Civic & Culture ($1.5M – $8M) ---
    { name: "Marina", emoji: "🚤", price: 1500000, qty: 0, i18nKey: "bcMarina" },
    { name: "Skyscraper", emoji: "🏙️", price: 1800000, qty: 0, i18nKey: "bcSkyscraper" },
    { name: "Public Library", emoji: "📚", price: 2000000, qty: 0, i18nKey: "bcPublicLibrary" },
    { name: "Movie Theater", emoji: "🎬", price: 2500000, qty: 0, i18nKey: "bcMovieTheater" },
    { name: "Museum", emoji: "🏺", price: 2800000, qty: 0, i18nKey: "bcMuseum" },
    { name: "Shopping Mall", emoji: "🛍️", price: 3200000, qty: 0, i18nKey: "bcShoppingMall" },
    { name: "Homeless Shelter", emoji: "🏠", price: 3500000, qty: 0, i18nKey: "bcHomelessShelter" },
    { name: "Botanical Garden", emoji: "🌿", price: 4000000, qty: 0, i18nKey: "bcBotanicalGarden" },
    { name: "Amphitheater", emoji: "🎪", price: 4500000, qty: 0, i18nKey: "bcAmphitheater" },
    { name: "Fire Station", emoji: "🚒", price: 5000000, qty: 0, i18nKey: "bcFireStation" },
    { name: "Indoor Arena", emoji: "🏟️", price: 5500000, qty: 0, i18nKey: "bcIndoorArena" },
    { name: "Ice Rink", emoji: "⛸️", price: 6500000, qty: 0, i18nKey: "bcIceRink" },
    { name: "Golf Course", emoji: "⛳", price: 7500000, qty: 0, i18nKey: "bcGolfCourse" },
    { name: "Community Pool", emoji: "🏊", price: 8000000, qty: 0, i18nKey: "bcCommunityPool" },

    // --- Major Infrastructure ($10M – $50M) ---
    { name: "Water Treatment", emoji: "💧", price: 10000000, qty: 0, i18nKey: "bcWaterTreatment" },
    { name: "Zoo", emoji: "🦁", price: 12000000, qty: 0, i18nKey: "bcZoo" },
    { name: "Ferry Terminal", emoji: "⛴️", price: 14000000, qty: 0, i18nKey: "bcFerryTerminal" },
    { name: "School", emoji: "🏫", price: 15000000, qty: 0, i18nKey: "bcSchool" },
    { name: "Data Center", emoji: "🖥️", price: 18000000, qty: 0, i18nKey: "bcDataCenter" },
    { name: "Desalination Plant", emoji: "🌊", price: 20000000, qty: 0, i18nKey: "bcDesalinationPlant" },
    { name: "Power Plant", emoji: "⚡", price: 25000000, qty: 0, i18nKey: "bcPowerPlant" },
    { name: "Tunnel (1 mi)", emoji: "🕳️", price: 30000000, qty: 0, i18nKey: "bcTunnel" },
    { name: "Bridge", emoji: "🌉", price: 35000000, qty: 0, i18nKey: "bcBridge" },
    { name: "Wind Farm", emoji: "🌬️", price: 40000000, qty: 0, i18nKey: "bcWindFarm" },
    { name: "Research Lab", emoji: "🔬", price: 45000000, qty: 0, i18nKey: "bcResearchLab" },
    { name: "Hospital", emoji: "🏥", price: 50000000, qty: 0, i18nKey: "bcHospital" },

    // --- Landmark ($55M – $100M) ---
    { name: "Opera House", emoji: "🎼", price: 60000000, qty: 0, i18nKey: "bcOperaHouse" },
    { name: "Amusement Park", emoji: "🎠", price: 65000000, qty: 0, i18nKey: "bcAmusementPark" },
    { name: "Convention Center", emoji: "🏛️", price: 75000000, qty: 0, i18nKey: "bcConventionCenter" },
    { name: "Aquarium", emoji: "🐟", price: 85000000, qty: 0, i18nKey: "bcAquarium" },
    { name: "National Park", emoji: "🏞️", price: 95000000, qty: 0, i18nKey: "bcNationalPark" },
    { name: "Sports Stadium", emoji: "🏟️", price: 100000000, qty: 0, i18nKey: "bcSportsStadium" },

    // --- Mega ($125M – $500M) ---
    { name: "Monorail", emoji: "🚝", price: 125000000, qty: 0, i18nKey: "bcMonorail" },
    { name: "Metro Line", emoji: "🚇", price: 150000000, qty: 0, i18nKey: "bcMetroLine" },
    { name: "Solar Farm", emoji: "☀️", price: 175000000, qty: 0, i18nKey: "bcSolarFarm" },
    { name: "Concert Hall", emoji: "🎭", price: 200000000, qty: 0, i18nKey: "bcConcertHall" },
    { name: "Harbor", emoji: "🚢", price: 225000000, qty: 0, i18nKey: "bcHarbor" },
    { name: "Bullet Train", emoji: "🚄", price: 250000000, qty: 0, i18nKey: "bcBulletTrain" },
    { name: "Fusion Reactor", emoji: "⚛️", price: 275000000, qty: 0, i18nKey: "bcFusionReactor" },
    { name: "University", emoji: "🎓", price: 300000000, qty: 0, i18nKey: "bcUniversity" },
    { name: "Hyperloop", emoji: "🔄", price: 350000000, qty: 0, i18nKey: "bcHyperloop" },
    { name: "Theme Park", emoji: "🎢", price: 400000000, qty: 0, i18nKey: "bcThemePark" },
    { name: "Underwater Hotel", emoji: "🤿", price: 450000000, qty: 0, i18nKey: "bcUnderwaterHotel" },
    { name: "Airport", emoji: "✈️", price: 500000000, qty: 0, i18nKey: "bcAirport" },

    // --- Giga ($600M+) ---
    { name: "Space Elevator", emoji: "🛗", price: 600000000, qty: 0, i18nKey: "bcSpaceElevator" },
    { name: "Artificial Island", emoji: "🏝️", price: 700000000, qty: 0, i18nKey: "bcArtificialIsland" },
    { name: "Floating City District", emoji: "🌐", price: 800000000, qty: 0, i18nKey: "bcFloatingCity" },
    { name: "Mega Dam", emoji: "🏗️", price: 900000000, qty: 0, i18nKey: "bcMegaDam" },
    { name: "Space Center", emoji: "🚀", price: 2000000000, qty: 0, alwaysUnaffordable: true, i18nKey: "bcSpaceCenter" }
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
      nameDiv.textContent = I18N.t(item.i18nKey);

      var priceDiv = document.createElement("div");
      priceDiv.className = "item-price";
      priceDiv.textContent = "$" + fmt(item.price);

      var noteDiv = document.createElement("div");
      noteDiv.className = "item-note";
      if (item.alwaysUnaffordable) {
        noteDiv.textContent = I18N.t("buildCityCantAfford");
      }

      var qtyDiv = document.createElement("div");
      qtyDiv.className = "item-quantity";
      qtyDiv.setAttribute("data-qty", i);

      var btnsDiv = document.createElement("div");
      btnsDiv.className = "item-buttons";

      var buyBtn = document.createElement("button");
      buyBtn.className = "btn-buy";
      buyBtn.textContent = I18N.t("buildCityBuildBtn");
      buyBtn.setAttribute("data-buy", i);
      buyBtn.addEventListener("click", function () {
        buyItem(i);
      });

      var sellBtn = document.createElement("button");
      sellBtn.className = "btn-sell";
      sellBtn.textContent = I18N.t("buildCityDemolishBtn");
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
        qtyEl.textContent = I18N.t("buildCityBuilt") + ": " + fmt(item.qty);
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
        left.textContent = item.emoji + " " + I18N.t(item.i18nKey) + " x" + fmt(item.qty);

        var right = document.createElement("span");
        right.textContent = "$" + fmt(item.price * item.qty);

        row.appendChild(left);
        row.appendChild(right);
        receiptListEl.appendChild(row);
      }
    });

    spentDisplayEl.textContent = I18N.t("buildCityAllocated") + ": $" + fmt(spent) + "  |  " + I18N.t("buildCityRemaining") + ": $" + fmt(remaining);

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

  // Listen for language changes
  window.addEventListener("langchange", function () {
    buildGrid();
    updateAll();
    I18N.applyDOM();
  });

  // Init
  buildGrid();
  updateAll();
  I18N.applyDOM();
})();
