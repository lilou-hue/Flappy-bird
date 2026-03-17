/* ═══════════════════════════════════════════════════════════════
   characters.js  –  Procedural canvas drawing (sloth + Sam)
   The Art of Doing Nothing
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Spring physics (ncase-style squash/stretch) ── */
  function Spring(stiffness, damping) {
    this.k = stiffness || 0.15;
    this.d = damping || 0.7;
    this.target = 1;
    this.value = 1;
    this.velocity = 0;
  }

  Spring.prototype.update = function () {
    var force = -this.k * (this.value - this.target);
    this.velocity += force;
    this.velocity *= this.d;
    this.value += this.velocity;
    return this.value;
  };

  Spring.prototype.punch = function (amount) {
    this.velocity += amount;
  };

  /* ── Sloth character ── */
  var slothState = {
    x: 0,
    y: 0,
    expression: { eyes: 'sleepy', mouth: 'smile' },
    speaking: false,
    mouthOpen: false,
    scaleSpring: new Spring(0.15, 0.7),
    bobPhase: 0,
    visible: true
  };

  function drawSloth(ctx, x, y, scale, t) {
    if (!slothState.visible) return;
    var s = scale || 1;
    slothState.x = x;
    slothState.y = y;
    slothState.bobPhase += 0.03;

    var springVal = slothState.scaleSpring.update();
    var bob = Math.sin(slothState.bobPhase) * 3;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s * springVal, s * (2 - springVal)); // squash/stretch

    // 1. Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 55, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Body
    var bodyGrad = ctx.createLinearGradient(-30, -20, 30, 50);
    bodyGrad.addColorStop(0, '#8B7355');
    bodyGrad.addColorStop(0.6, '#C4A97D');
    bodyGrad.addColorStop(1, '#8B7355');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 20, 30, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly highlight
    ctx.fillStyle = '#D4C5A9';
    ctx.beginPath();
    ctx.ellipse(0, 25, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Arms
    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    ctx.ellipse(-32, 15, 10, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(32, 15, 10, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 4. Claws
    ctx.strokeStyle = '#5C4A3A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (var side = -1; side <= 1; side += 2) {
      for (var c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.moveTo(side * 35, 30 + c * 4);
        ctx.lineTo(side * 42, 33 + c * 5);
        ctx.stroke();
      }
    }

    // 5. Head
    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    ctx.arc(0, -22, 26, 0, Math.PI * 2);
    ctx.fill();

    // 6. Face mask (lighter area)
    ctx.fillStyle = '#D4C5A9';
    ctx.beginPath();
    ctx.ellipse(0, -20, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 7. Eye patches (dark fur)
    ctx.fillStyle = '#5C4A3A';
    ctx.beginPath();
    ctx.ellipse(-9, -26, 9, 7, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, -26, 9, 7, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 8. Eyes (expression-dependent)
    drawEyes(ctx, slothState.expression.eyes, t);

    // 9. Nose
    ctx.fillStyle = '#3A2A1A';
    ctx.beginPath();
    ctx.ellipse(0, -16, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 10. Mouth
    drawMouth(ctx, slothState.expression.mouth);

    ctx.restore();
  }

  function drawEyes(ctx, type, t) {
    switch (type) {
      case 'sleepy':
        // Half-lidded
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-9, -26, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9, -26, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(-9, -25, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -25, 2, 0, Math.PI * 2); ctx.fill();
        // Eyelids
        ctx.fillStyle = '#5C4A3A';
        ctx.fillRect(-15, -32, 12, 5);
        ctx.fillRect(3, -32, 12, 5);
        break;
      case 'wide':
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-9, -26, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -26, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(-9, -26, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -26, 3, 0, Math.PI * 2); ctx.fill();
        // Shine
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-7, -28, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(11, -28, 1.5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'concerned':
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-9, -26, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9, -26, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(-9, -25, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -25, 2.5, 0, Math.PI * 2); ctx.fill();
        // Worried brows
        ctx.strokeStyle = '#5C4A3A';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-14, -33); ctx.lineTo(-5, -31); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14, -33); ctx.lineTo(5, -31); ctx.stroke();
        break;
      case 'happy':
        // Closed happy arcs
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-9, -25, 5, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(9, -25, 5, Math.PI, 0); ctx.stroke();
        break;
    }
  }

  function drawMouth(ctx, type) {
    var open = slothState.speaking && slothState.mouthOpen;
    ctx.strokeStyle = '#3A2A1A';
    ctx.fillStyle = '#3A2A1A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    switch (type) {
      case 'smile':
        if (open) {
          ctx.beginPath();
          ctx.ellipse(0, -10, 6, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-7, -11);
          ctx.quadraticCurveTo(0, -5, 7, -11);
          ctx.stroke();
        }
        break;
      case 'neutral':
        if (open) {
          ctx.beginPath();
          ctx.ellipse(0, -11, 4, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-5, -11);
          ctx.lineTo(5, -11);
          ctx.stroke();
        }
        break;
      case 'worried':
        if (open) {
          ctx.beginPath();
          ctx.ellipse(0, -10, 5, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-6, -10);
          ctx.quadraticCurveTo(0, -14, 6, -10);
          ctx.stroke();
        }
        break;
      case 'open':
        ctx.beginPath();
        ctx.ellipse(0, -9, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  /* ── Sam (Ch1: bed mound with hair) ── */
  function drawSamBed(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Blanket mound
    var blanketGrad = ctx.createLinearGradient(-60, 0, 60, 30);
    blanketGrad.addColorStop(0, '#6B5B95');
    blanketGrad.addColorStop(1, '#4A3F6B');
    ctx.fillStyle = blanketGrad;
    ctx.beginPath();
    ctx.moveTo(-70, 20);
    ctx.quadraticCurveTo(-30, -25, 0, -20);
    ctx.quadraticCurveTo(40, -15, 70, 20);
    ctx.lineTo(-70, 20);
    ctx.closePath();
    ctx.fill();

    // Pillow
    ctx.fillStyle = '#E8E0F0';
    ctx.beginPath();
    ctx.ellipse(-40, 0, 30, 12, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Hair poking out
    ctx.fillStyle = '#3A2A1A';
    ctx.beginPath();
    ctx.arc(-35, -8, 12, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }

  /* ── Public API ── */
  window.Characters = {
    sloth: slothState,
    drawSloth: drawSloth,
    drawSamBed: drawSamBed,
    Spring: Spring,

    setExpression: function (eyes, mouth) {
      slothState.expression.eyes = eyes || slothState.expression.eyes;
      slothState.expression.mouth = mouth || slothState.expression.mouth;
    },

    react: function () {
      slothState.scaleSpring.punch(0.3);
    },

    setSpeaking: function (on) {
      slothState.speaking = !!on;
    },

    toggleMouth: function () {
      slothState.mouthOpen = !slothState.mouthOpen;
    }
  };
})();
