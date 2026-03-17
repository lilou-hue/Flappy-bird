(function () {
  'use strict';

  // --- Constants ---
  var METERS_PER_PX = 1 / 8; // 8px per meter
  var MAX_DEPTH = 10994;
  var TOTAL_HEIGHT = Math.ceil(MAX_DEPTH / METERS_PER_PX);
  var VIEWPORT_PADDING = 800; // px above/below viewport for visibility checks

  // --- Color zones ---
  var COLOR_STOPS = [
    { depth: 0,     color: [0, 119, 190] },  // #0077be
    { depth: 200,   color: [0, 64, 128] },    // #004080
    { depth: 1000,  color: [0, 0, 51] },      // #000033
    { depth: 4000,  color: [10, 10, 10] },    // #0a0a0a
    { depth: 6000,  color: [5, 5, 5] },       // #050505
    { depth: 10994, color: [0, 0, 0] }        // #000
  ];

  // --- Creatures / landmarks ---
  var CREATURES = [
    { depth: 0,     emoji: '🌊', name: 'Surface',              fact: 'Sunlight floods the first 200 meters' },
    { depth: 20,    emoji: '🪸', name: 'Coral Reef',            fact: 'Home to 25% of all marine species' },
    { depth: 40,    emoji: '🐢', name: 'Sea Turtle',            fact: 'Can hold their breath for 5 hours' },
    { depth: 100,   emoji: '🤿', name: 'Scuba Limit',           fact: 'Maximum depth for recreational diving' },
    { depth: 200,   emoji: '☀️', name: 'Sunlight Zone Ends',    fact: 'Below here, not enough light for photosynthesis' },
    { depth: 332,   emoji: '🐧', name: 'Emperor Penguin',       fact: 'Deepest diving bird on Earth' },
    { depth: 500,   emoji: '🦑', name: 'Giant Squid',           fact: 'Eyes the size of dinner plates' },
    { depth: 830,   emoji: '🚁', name: 'Helicopter Crash Depth',fact: 'Deepest helicopter wreck recovery' },
    { depth: 1000,  emoji: '🌑', name: 'Twilight Zone Ends',    fact: 'Total darkness from here on' },
    { depth: 1280,  emoji: '🐟', name: 'Giant Oarfish',         fact: 'The longest bony fish, up to 11 meters' },
    { depth: 2000,  emoji: '🐉', name: 'Black Dragonfish',      fact: 'Produces invisible infrared light to hunt' },
    { depth: 2500,  emoji: '🐋', name: 'Sperm Whale Dive',      fact: 'Deepest diving mammal — hunts giant squid here' },
    { depth: 3000,  emoji: '🔦', name: 'Anglerfish',            fact: 'Uses a bioluminescent lure in total darkness' },
    { depth: 3800,  emoji: '🚢', name: 'RMS Titanic',           fact: 'Resting on the ocean floor since 1912' },
    { depth: 4000,  emoji: '🧊', name: 'Abyssal Zone',          fact: 'Water temperature: 1–4°C everywhere' },
    { depth: 4500,  emoji: '🐙', name: 'Dumbo Octopus',         fact: 'Named for ear-like fins, lives deeper than any octopus' },
    { depth: 6000,  emoji: '💀', name: 'Hadal Zone Begins',     fact: 'Named after Hades, Greek god of the underworld' },
    { depth: 7000,  emoji: '🐌', name: 'Snailfish',             fact: 'Deepest living fish ever recorded' },
    { depth: 8848,  emoji: '🏔️', name: 'Mount Everest',         fact: "If placed here, its peak wouldn't reach the surface" },
    { depth: 10000, emoji: '🐠', name: 'Mariana Snailfish',     fact: 'Thrives under 1,000 atmospheres of pressure' },
    { depth: 10916, emoji: '🏴', name: 'Challenger Deep',       fact: 'The deepest known point on Earth. James Cameron visited in 2012.' },
    { depth: 10994, emoji: '⬛', name: 'The Bottom',            fact: 'You made it. The deepest point in the ocean. Pressure here is 1,086 bars — over 1,000 times surface pressure.', isBottom: true }
  ];

  var TOTAL_CREATURES = CREATURES.length;

  // --- Zone labels ---
  var ZONES = [
    { depth: 10,   name: 'Sunlight Zone' },
    { depth: 250,  name: 'Twilight Zone' },
    { depth: 1050, name: 'Midnight Zone' },
    { depth: 4050, name: 'Abyssal Zone' },
    { depth: 6050, name: 'Hadal Zone' }
  ];

  // --- Discovery state ---
  var discoveredSet = {};
  try {
    var stored = localStorage.getItem('theDeepDiscovered');
    if (stored) {
      var arr = JSON.parse(stored);
      arr.forEach(function (d) { discoveredSet[d] = true; });
    }
  } catch (e) {}

  function saveDiscoveries() {
    try {
      localStorage.setItem('theDeepDiscovered', JSON.stringify(Object.keys(discoveredSet)));
    } catch (e) {}
  }

  function getDiscoveredCount() {
    return Object.keys(discoveredSet).length;
  }

  // --- Utility ---
  function depthToPx(depth) {
    return depth / METERS_PER_PX;
  }

  function pxToDepth(px) {
    return px * METERS_PER_PX;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function getColorAtDepth(depth) {
    if (depth <= 0) return COLOR_STOPS[0].color;
    if (depth >= MAX_DEPTH) return COLOR_STOPS[COLOR_STOPS.length - 1].color;

    for (var i = 1; i < COLOR_STOPS.length; i++) {
      if (depth <= COLOR_STOPS[i].depth) {
        var prev = COLOR_STOPS[i - 1];
        var next = COLOR_STOPS[i];
        var t = (depth - prev.depth) / (next.depth - prev.depth);
        return [
          Math.round(lerp(prev.color[0], next.color[0], t)),
          Math.round(lerp(prev.color[1], next.color[1], t)),
          Math.round(lerp(prev.color[2], next.color[2], t))
        ];
      }
    }
    return COLOR_STOPS[COLOR_STOPS.length - 1].color;
  }

  // --- DOM setup ---
  var ocean = document.getElementById('ocean');
  ocean.style.height = TOTAL_HEIGHT + 'px';

  // Title card
  var titleCard = document.createElement('div');
  titleCard.className = 'title-card';
  titleCard.innerHTML = '<h1>' + I18N.t('theDeepTitle') + '</h1><div class="expedition-subtitle">' + I18N.t('theDeepSubtitle') + '</div><div class="subtitle">' + I18N.t('theDeepScrollDown') + '</div>';
  ocean.appendChild(titleCard);

  // Discovery counter
  var discoveryCounter = document.getElementById('discovery-counter');
  var discoveredCountEl = document.getElementById('discovered-count');
  var totalCountEl = document.getElementById('total-count');
  totalCountEl.textContent = TOTAL_CREATURES;

  function updateCounter() {
    var count = getDiscoveredCount();
    discoveredCountEl.textContent = count;
    if (count >= TOTAL_CREATURES) {
      discoveryCounter.innerHTML = '🎉 ' + I18N.t('theDeepAllDiscovered');
      discoveryCounter.classList.add('complete');
    }
  }
  updateCounter();

  // Depth indicator
  var depthIndicator = document.createElement('div');
  depthIndicator.className = 'depth-indicator';
  depthIndicator.textContent = '0m';
  document.body.appendChild(depthIndicator);

  // Sonar sweep background
  var sonarSweep = document.createElement('div');
  sonarSweep.className = 'sonar-sweep';
  document.body.appendChild(sonarSweep);

  // Light rays container
  var lightRaysContainer = document.createElement('div');
  lightRaysContainer.className = 'light-rays';
  document.body.appendChild(lightRaysContainer);

  // Create light rays
  var NUM_RAYS = 8;
  var rays = [];
  for (var i = 0; i < NUM_RAYS; i++) {
    var ray = document.createElement('div');
    ray.className = 'light-ray';
    var leftPos = 10 + Math.random() * 80;
    var rotation = -15 + Math.random() * 30;
    var width = 1 + Math.random() * 3;
    ray.style.left = leftPos + '%';
    ray.style.transform = 'rotate(' + rotation + 'deg)';
    ray.style.width = width + 'px';
    ray.style.animationDelay = (Math.random() * 2) + 's';
    lightRaysContainer.appendChild(ray);
    rays.push(ray);
  }

  // Particles (marine snow)
  var NUM_PARTICLES = 40;
  var particles = [];
  for (var p = 0; p < NUM_PARTICLES; p++) {
    var particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.opacity = '0.08';
    particle.style.width = (1 + Math.random() * 2) + 'px';
    particle.style.height = particle.style.width;
    document.body.appendChild(particle);
    particles.push({
      el: particle,
      x: Math.random() * 100,
      y: Math.random() * 100,
      speed: 0.3 + Math.random() * 0.7,
      drift: (Math.random() - 0.5) * 0.2,
      size: 1 + Math.random() * 2
    });
  }

  // Create creature elements
  var creatureElements = [];
  CREATURES.forEach(function (c, index) {
    var depthKey = String(c.depth);
    var alreadyDiscovered = !!discoveredSet[depthKey];

    var div = document.createElement('div');
    var classes = 'creature';
    if (c.isBottom) classes += ' bottom';
    if (alreadyDiscovered) {
      classes += ' discovered';
    } else {
      classes += ' undiscovered';
    }
    div.className = classes;
    var yPos = depthToPx(c.depth);
    div.style.top = (yPos + window.innerHeight * 0.4) + 'px';

    // Build inner HTML — undiscovered shows sonar blip, discovered shows real info
    div.innerHTML = buildCreatureHTML(c, alreadyDiscovered);

    // Store data attributes for reveal
    div.setAttribute('data-depth', depthKey);
    div.setAttribute('data-emoji', c.emoji);
    div.setAttribute('data-name', c.name);
    div.setAttribute('data-fact', c.fact);
    div.setAttribute('data-depth-label', c.depth.toLocaleString() + ' m');

    // Click handler for discovery
    div.addEventListener('click', function (e) {
      if (!div.classList.contains('undiscovered') || !div.classList.contains('visible')) return;

      // Start pinging
      div.classList.remove('undiscovered');
      div.classList.add('pinging');

      // Create ping rings at click position relative to the creature
      var rect = div.getBoundingClientRect();
      var pingX = rect.left + rect.width / 2;
      var pingY = rect.top + rect.height * 0.3;
      createPingRings(pingX, pingY);

      // After ping animation, reveal
      setTimeout(function () {
        div.classList.remove('pinging');
        div.classList.add('discovered');
        div.innerHTML = buildCreatureHTML(c, true);

        // Save discovery
        discoveredSet[depthKey] = true;
        saveDiscoveries();
        updateCounter();
      }, 600);
    });

    ocean.appendChild(div);
    creatureElements.push({ el: div, depth: c.depth, yPos: yPos + window.innerHeight * 0.4 });
  });

  function buildCreatureHTML(creature, isDiscovered) {
    if (isDiscovered) {
      return '<span class="emoji">' + creature.emoji + '</span>' +
        '<div class="name">' + creature.name + '</div>' +
        '<div class="depth-label">' + creature.depth.toLocaleString() + ' m</div>' +
        '<div class="fact">' + creature.fact + '</div>';
    } else {
      return '<span class="emoji sonar-blip">?</span>' +
        '<div class="name">' + I18N.t('theDeepUnknownSignal') + '</div>' +
        '<div class="depth-label">' + creature.depth.toLocaleString() + ' m</div>' +
        '<div class="fact">' + I18N.t('theDeepTapToIdentify') + '</div>';
    }
  }

  function createPingRings(x, y) {
    for (var i = 0; i < 3; i++) {
      (function (delay) {
        var ring = document.createElement('div');
        ring.className = 'ping-ring';
        ring.style.left = x + 'px';
        ring.style.top = y + 'px';
        document.body.appendChild(ring);

        setTimeout(function () {
          ring.classList.add('animate');
        }, delay);

        setTimeout(function () {
          if (ring.parentNode) ring.parentNode.removeChild(ring);
        }, delay + 800);
      })(i * 150);
    }
  }

  // Create zone labels
  var zoneElements = [];
  ZONES.forEach(function (z) {
    var div = document.createElement('div');
    div.className = 'zone-label';
    var yPos = depthToPx(z.depth);
    div.style.top = (yPos + window.innerHeight * 0.3) + 'px';
    div.innerHTML =
      '<div class="zone-name">' + z.name + '</div>' +
      '<div class="zone-line"></div>';
    ocean.appendChild(div);
    zoneElements.push({ el: div, yPos: yPos + window.innerHeight * 0.3 });
  });

  // --- Animation loop ---
  var lastScrollY = -1;
  var animationTime = 0;
  var lastTimestamp = 0;

  function update(timestamp) {
    var dt = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0.016;
    lastTimestamp = timestamp;
    animationTime += dt;

    var scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Always animate particles regardless of scroll
    updateParticles(dt, scrollY);

    if (Math.abs(scrollY - lastScrollY) < 0.5) {
      requestAnimationFrame(update);
      return;
    }
    lastScrollY = scrollY;

    var currentDepth = pxToDepth(scrollY);
    if (currentDepth < 0) currentDepth = 0;
    if (currentDepth > MAX_DEPTH) currentDepth = MAX_DEPTH;

    // Update depth indicator
    depthIndicator.textContent = Math.round(currentDepth).toLocaleString() + 'm';

    // Update background color
    var color = getColorAtDepth(currentDepth);
    document.body.style.backgroundColor = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';

    // Title fade out
    var titleOpacity = 1 - Math.min(1, scrollY / (window.innerHeight * 0.5));
    if (titleOpacity < 0) titleOpacity = 0;
    titleCard.style.opacity = titleOpacity;

    // Light rays fade
    var rayOpacity = 1 - Math.min(1, currentDepth / 200);
    lightRaysContainer.style.opacity = rayOpacity;

    // Sonar sweep visibility — more visible in deeper zones
    var sweepOpacity = Math.min(0.06, currentDepth / 8000 * 0.06);
    sonarSweep.style.opacity = sweepOpacity;

    // Update creature visibility
    var viewTop = scrollY - VIEWPORT_PADDING;
    var viewBottom = scrollY + window.innerHeight + VIEWPORT_PADDING;

    creatureElements.forEach(function (c) {
      var inView = c.yPos > viewTop && c.yPos < viewBottom;
      // Fade in when creature is near center of viewport
      var distFromCenter = Math.abs(c.yPos - (scrollY + window.innerHeight * 0.5));
      var visible = distFromCenter < window.innerHeight * 0.8;
      if (visible) {
        c.el.classList.add('visible');
      } else {
        c.el.classList.remove('visible');
      }
    });

    // Update zone label visibility
    zoneElements.forEach(function (z) {
      var distFromCenter = Math.abs(z.yPos - (scrollY + window.innerHeight * 0.5));
      var visible = distFromCenter < window.innerHeight * 0.7;
      if (visible) {
        z.el.classList.add('visible');
      } else {
        z.el.classList.remove('visible');
      }
    });

    requestAnimationFrame(update);
  }

  function updateParticles(dt, scrollY) {
    var currentDepth = pxToDepth(scrollY);
    // Increase particle opacity slightly in deep zones
    var baseOpacity = 0.06 + Math.min(0.12, currentDepth / 10000 * 0.12);

    particles.forEach(function (p) {
      p.y -= p.speed * dt * 3; // float upward
      p.x += p.drift * dt;

      if (p.y < -2) p.y = 102;
      if (p.x < -2) p.x = 102;
      if (p.x > 102) p.x = -2;

      p.el.style.left = p.x + '%';
      p.el.style.top = p.y + '%';
      p.el.style.opacity = baseOpacity;
    });
  }

  // --- i18n support ---
  window.addEventListener('langchange', function () {
    // Re-apply title card
    titleCard.innerHTML = '<h1>' + I18N.t('theDeepTitle') + '</h1><div class="expedition-subtitle">' + I18N.t('theDeepSubtitle') + '</div><div class="subtitle">' + I18N.t('theDeepScrollDown') + '</div>';

    // Re-apply discovery counter
    updateCounter();

    // Re-apply undiscovered creature text
    creatureElements.forEach(function (c) {
      if (c.el.classList.contains('undiscovered')) {
        var creature = CREATURES.filter(function (cr) { return cr.depth === c.depth; })[0];
        if (creature) {
          c.el.innerHTML = buildCreatureHTML(creature, false);
        }
      }
    });

    // Apply data-i18n attributes
    I18N.applyDOM();
  });

  I18N.applyDOM();

  // Start
  requestAnimationFrame(update);

})();
