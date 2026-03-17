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
    visible: true,
    // New: animation state
    blinkTimer: 0,
    blinkFrame: 0,
    breathPhase: 0,
    headTilt: 0,
    headTiltTarget: 0,
    armWave: 0,
    armWaveActive: false,
    emoteBubble: '',
    emoteBubbleTimer: 0,
    lookX: 0,
    lookY: 0,
    lookTarget: { x: 0, y: 0 }
  };

  function drawSloth(ctx, x, y, scale, t) {
    if (!slothState.visible) return;
    var s = scale || 1;
    slothState.x = x;
    slothState.y = y;
    slothState.bobPhase += 0.03;
    slothState.breathPhase += 0.025;

    // Blink timer
    slothState.blinkTimer--;
    if (slothState.blinkTimer <= 0) {
      slothState.blinkTimer = 180 + Math.random() * 200; // blink every 3-6s
      slothState.blinkFrame = 8;
    }
    if (slothState.blinkFrame > 0) slothState.blinkFrame--;

    // Smooth head tilt
    slothState.headTilt += (slothState.headTiltTarget - slothState.headTilt) * 0.05;

    // Smooth eye look
    slothState.lookX += (slothState.lookTarget.x - slothState.lookX) * 0.08;
    slothState.lookY += (slothState.lookTarget.y - slothState.lookY) * 0.08;

    // Arm wave
    if (slothState.armWaveActive) {
      slothState.armWave += 0.12;
      if (slothState.armWave > Math.PI * 4) {
        slothState.armWave = 0;
        slothState.armWaveActive = false;
      }
    }

    // Emote bubble
    if (slothState.emoteBubbleTimer > 0) slothState.emoteBubbleTimer--;

    var springVal = slothState.scaleSpring.update();
    var bob = Math.sin(slothState.bobPhase) * 3;
    var breathScale = 1 + Math.sin(slothState.breathPhase) * 0.015;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s * springVal * breathScale, s * (2 - springVal));

    // 1. Shadow (reactive to bob)
    ctx.fillStyle = 'rgba(0,0,0,' + (0.12 + Math.sin(slothState.bobPhase) * 0.03) + ')';
    ctx.beginPath();
    ctx.ellipse(0, 55, 35 - bob * 0.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Body with fur texture
    var bodyGrad = ctx.createRadialGradient(0, 15, 5, 0, 20, 45);
    bodyGrad.addColorStop(0, '#C4A97D');
    bodyGrad.addColorStop(0.5, '#A8956B');
    bodyGrad.addColorStop(1, '#8B7355');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 20, 30, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly highlight
    var bellyGrad = ctx.createRadialGradient(0, 22, 2, 0, 25, 22);
    bellyGrad.addColorStop(0, '#E8DCC8');
    bellyGrad.addColorStop(1, '#D4C5A9');
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 25, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fur lines on belly
    ctx.strokeStyle = 'rgba(139,115,85,0.2)';
    ctx.lineWidth = 1;
    for (var fl = 0; fl < 5; fl++) {
      ctx.beginPath();
      ctx.moveTo(-10 + fl * 5, 12 + fl * 2);
      ctx.quadraticCurveTo(-8 + fl * 5, 18 + fl * 2, -10 + fl * 5, 24 + fl * 2);
      ctx.stroke();
    }

    // 3. Arms (with wave animation on right arm)
    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    ctx.ellipse(-32, 15, 10, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Right arm (waveable)
    ctx.save();
    if (slothState.armWaveActive) {
      ctx.translate(32, 5);
      ctx.rotate(Math.sin(slothState.armWave) * 0.4 - 0.5);
      ctx.translate(-32, -5);
    }
    ctx.beginPath();
    ctx.ellipse(32, 15, 10, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Right claws
    ctx.strokeStyle = '#5C4A3A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (var c = -1; c <= 1; c++) {
      ctx.beginPath();
      ctx.moveTo(35, 30 + c * 4);
      ctx.lineTo(42, 33 + c * 5);
      ctx.stroke();
    }
    ctx.restore();

    // Left claws
    ctx.strokeStyle = '#5C4A3A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (var cl = -1; cl <= 1; cl++) {
      ctx.beginPath();
      ctx.moveTo(-35, 30 + cl * 4);
      ctx.lineTo(-42, 33 + cl * 5);
      ctx.stroke();
    }

    // 5. Head (with tilt)
    ctx.save();
    ctx.rotate(slothState.headTilt * 0.1);

    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    ctx.arc(0, -22, 26, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#7A6548';
    ctx.beginPath();
    ctx.ellipse(-22, -32, 7, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(22, -32, 7, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Inner ears
    ctx.fillStyle = '#C4A97D';
    ctx.beginPath();
    ctx.ellipse(-22, -32, 4, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(22, -32, 4, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 6. Face mask (lighter area)
    var faceGrad = ctx.createRadialGradient(0, -20, 3, 0, -20, 20);
    faceGrad.addColorStop(0, '#E8DCC8');
    faceGrad.addColorStop(1, '#D4C5A9');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(0, -20, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 7. Eye patches (dark fur, more detailed shape)
    ctx.fillStyle = '#5C4A3A';
    ctx.beginPath();
    ctx.ellipse(-9, -26, 10, 8, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, -26, 10, 8, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Patch gradient
    ctx.fillStyle = 'rgba(42,30,20,0.3)';
    ctx.beginPath();
    ctx.ellipse(-9, -25, 7, 5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, -25, 7, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 8. Eyes
    var isBlinking = slothState.blinkFrame > 3;
    if (isBlinking) {
      drawEyesBlink(ctx);
    } else {
      drawEyes(ctx, slothState.expression.eyes, t);
    }

    // 9. Nose (more detailed)
    var noseGrad = ctx.createRadialGradient(0, -16, 1, 0, -16, 4);
    noseGrad.addColorStop(0, '#4A3A2A');
    noseGrad.addColorStop(1, '#2A1A0A');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.ellipse(0, -16, 4.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nose shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(-1, -17, 2, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 10. Mouth
    drawMouth(ctx, slothState.expression.mouth);

    ctx.restore(); // head tilt

    // Emote bubble
    if (slothState.emoteBubbleTimer > 0 && slothState.emoteBubble) {
      var ea = Math.min(1, slothState.emoteBubbleTimer / 15);
      var eyo = -60 - (60 - slothState.emoteBubbleTimer) * 0.3;
      ctx.globalAlpha = ea;
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(slothState.emoteBubble, 20, eyo);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    ctx.restore(); // main transform
  }

  function drawEyesBlink(ctx) {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -26); ctx.lineTo(-4, -26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -26); ctx.lineTo(14, -26); ctx.stroke();
  }

  function drawEyes(ctx, type, t) {
    var lx = slothState.lookX * 2;
    var ly = slothState.lookY * 1.5;

    switch (type) {
      case 'sleepy':
        // Half-lidded with eye tracking
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-9, -26, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9, -26, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath(); ctx.arc(-9 + lx, -25 + ly * 0.5, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9 + lx, -25 + ly * 0.5, 2.2, 0, Math.PI * 2); ctx.fill();
        // Heavy eyelids
        ctx.fillStyle = '#5C4A3A';
        ctx.beginPath();
        ctx.moveTo(-15, -30); ctx.quadraticCurveTo(-9, -27, -3, -30);
        ctx.lineTo(-15, -30);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3, -30); ctx.quadraticCurveTo(9, -27, 15, -30);
        ctx.lineTo(3, -30);
        ctx.fill();
        break;

      case 'wide':
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-9, -26, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -26, 6.5, 0, Math.PI * 2); ctx.fill();
        // Iris
        ctx.fillStyle = '#3A2510';
        ctx.beginPath(); ctx.arc(-9 + lx, -26 + ly, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9 + lx, -26 + ly, 3.5, 0, Math.PI * 2); ctx.fill();
        // Pupil
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(-9 + lx, -26 + ly, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9 + lx, -26 + ly, 2, 0, Math.PI * 2); ctx.fill();
        // Shine
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-7 + lx * 0.5, -28 + ly * 0.5, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(11 + lx * 0.5, -28 + ly * 0.5, 1.8, 0, Math.PI * 2); ctx.fill();
        break;

      case 'concerned':
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-9, -26, 5.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9, -26, 5.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath(); ctx.arc(-9 + lx, -25 + ly, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9 + lx, -25 + ly, 2.5, 0, Math.PI * 2); ctx.fill();
        // Worried brows (angled)
        ctx.strokeStyle = '#5C4A3A';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-15, -34); ctx.quadraticCurveTo(-9, -32, -4, -33); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, -34); ctx.quadraticCurveTo(9, -32, 4, -33); ctx.stroke();
        // Sweat drop
        ctx.fillStyle = 'rgba(100,180,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(18, -35);
        ctx.quadraticCurveTo(20, -30, 18, -28);
        ctx.quadraticCurveTo(16, -30, 18, -35);
        ctx.fill();
        break;

      case 'happy':
        // Closed happy arcs with cheek blush
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-9, -25, 5, Math.PI + 0.3, -0.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(9, -25, 5, Math.PI + 0.3, -0.3); ctx.stroke();
        // Cheek blush
        ctx.fillStyle = 'rgba(230,150,130,0.3)';
        ctx.beginPath(); ctx.ellipse(-15, -20, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(15, -20, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        break;
    }
  }

  function drawMouth(ctx, type) {
    var open = slothState.speaking && slothState.mouthOpen;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    switch (type) {
      case 'smile':
        if (open) {
          // Open mouth with tongue
          ctx.fillStyle = '#3A2A1A';
          ctx.beginPath();
          ctx.ellipse(0, -9, 7, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#C46B6B';
          ctx.beginPath();
          ctx.ellipse(0, -7, 4, 2.5, 0, 0, Math.PI);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#3A2A1A';
          ctx.beginPath();
          ctx.moveTo(-8, -11);
          ctx.quadraticCurveTo(0, -4, 8, -11);
          ctx.stroke();
        }
        break;
      case 'neutral':
        if (open) {
          ctx.fillStyle = '#3A2A1A';
          ctx.beginPath();
          ctx.ellipse(0, -11, 5, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#3A2A1A';
          ctx.beginPath();
          ctx.moveTo(-5, -11);
          ctx.lineTo(5, -11);
          ctx.stroke();
        }
        break;
      case 'worried':
        if (open) {
          ctx.fillStyle = '#3A2A1A';
          ctx.beginPath();
          ctx.ellipse(0, -10, 6, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#3A2A1A';
          ctx.beginPath();
          ctx.moveTo(-7, -9);
          ctx.quadraticCurveTo(0, -14, 7, -9);
          ctx.stroke();
        }
        break;
      case 'open':
        ctx.fillStyle = '#3A2A1A';
        ctx.beginPath();
        ctx.ellipse(0, -8, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#C46B6B';
        ctx.beginPath();
        ctx.ellipse(0, -6, 5, 3, 0, 0, Math.PI);
        ctx.fill();
        break;
    }
  }

  /* ── Sam (Ch1: bed mound with hair + breathing blanket) ── */
  function drawSamBed(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    var breathe = Math.sin((t || 0) * 1.2) * 2;

    // Bed frame
    ctx.fillStyle = '#4A3A2E';
    ctx.fillRect(-75, 15, 150, 12);
    // Headboard
    ctx.fillStyle = '#5C4A3A';
    ctx.fillRect(-75, -20, 10, 35);

    // Blanket mound (breathing)
    var blanketGrad = ctx.createLinearGradient(-60, 0, 60, 30);
    blanketGrad.addColorStop(0, '#6B5B95');
    blanketGrad.addColorStop(0.5, '#7B6BA5');
    blanketGrad.addColorStop(1, '#4A3F6B');
    ctx.fillStyle = blanketGrad;
    ctx.beginPath();
    ctx.moveTo(-65, 15);
    ctx.quadraticCurveTo(-30, -25 + breathe, 0, -20 + breathe * 0.7);
    ctx.quadraticCurveTo(40, -15 + breathe * 0.5, 65, 15);
    ctx.lineTo(-65, 15);
    ctx.closePath();
    ctx.fill();

    // Blanket pattern (stripes)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-50 + i * 25, 12);
      ctx.quadraticCurveTo(-35 + i * 25, -5 + breathe * 0.5, -20 + i * 25, 12);
      ctx.stroke();
    }

    // Pillow (with indent)
    var pillowGrad = ctx.createRadialGradient(-40, -2, 5, -40, 0, 30);
    pillowGrad.addColorStop(0, '#F0E8F8');
    pillowGrad.addColorStop(1, '#D8D0E0');
    ctx.fillStyle = pillowGrad;
    ctx.beginPath();
    ctx.ellipse(-40, 0, 30, 12, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Pillow crease
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.moveTo(-55, 0);
    ctx.quadraticCurveTo(-40, -5, -25, 0);
    ctx.stroke();

    // Hair poking out (more detailed)
    ctx.fillStyle = '#3A2A1A';
    ctx.beginPath();
    ctx.arc(-35, -8, 12, Math.PI, 0);
    ctx.fill();
    // Hair strands
    ctx.strokeStyle = '#2A1A0A';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-42, -10); ctx.quadraticCurveTo(-45, -18, -40, -22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-35, -12); ctx.quadraticCurveTo(-33, -20, -30, -22); ctx.stroke();

    // Phone on nightstand (glowing)
    ctx.fillStyle = '#3A3040';
    ctx.fillRect(50, -5, 18, 10);
    // Screen glow (pulsing)
    var phoneGlow = 0.15 + Math.sin((t || 0) * 3) * 0.1;
    ctx.fillStyle = 'rgba(120,160,255,' + phoneGlow + ')';
    ctx.fillRect(51, -4, 16, 8);

    // Alarm clock
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(55, -15, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a4a1a';
    ctx.fillRect(49, -19, 12, 6);
    // Clock face
    ctx.fillStyle = '#4ade80';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('6:45', 55, -14);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  /* ── Sam standing (Ch2+) ── */
  function drawSamStanding(ctx, x, y, scale, t) {
    var s = scale || 1;
    t = t || 0;
    var sway = Math.sin(t * 0.8) * 1.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 70, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (jeans with shading)
    var jeansGrad = ctx.createLinearGradient(-12, 48, 12, 70);
    jeansGrad.addColorStop(0, '#3A4A6B');
    jeansGrad.addColorStop(1, '#2E3E5A');
    ctx.fillStyle = jeansGrad;
    ctx.beginPath();
    ctx.moveTo(-12, 48); ctx.lineTo(-14, 68); ctx.lineTo(-2, 68); ctx.lineTo(-2, 48);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 48); ctx.lineTo(2, 68); ctx.lineTo(14, 68); ctx.lineTo(12, 48);
    ctx.fill();

    // Shoes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-8, 70, 9, 4, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 70, 9, 4, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-8, 70, 9, 4, -0.1, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(8, 70, 9, 4, 0.1, 0, Math.PI * 2); ctx.stroke();

    // Body (hoodie with details)
    var hoodieGrad = ctx.createLinearGradient(-18, -10, 18, 50);
    hoodieGrad.addColorStop(0, '#7B6BA5');
    hoodieGrad.addColorStop(0.6, '#6B5B95');
    hoodieGrad.addColorStop(1, '#5A4A85');
    ctx.fillStyle = hoodieGrad;
    ctx.beginPath();
    ctx.moveTo(-18, -5);
    ctx.quadraticCurveTo(-22, 25, -20, 50);
    ctx.lineTo(20, 50);
    ctx.quadraticCurveTo(22, 25, 18, -5);
    ctx.quadraticCurveTo(0, -12, -18, -5);
    ctx.closePath();
    ctx.fill();

    // Hood strings
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-5, 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(5, 15); ctx.stroke();

    // Hoodie pocket
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, 28); ctx.quadraticCurveTo(0, 32, 12, 28);
    ctx.stroke();

    // Arms (with subtle sway)
    ctx.fillStyle = '#6B5B95';
    ctx.save();
    ctx.translate(-22, 15);
    ctx.rotate(Math.sin(t * 0.8) * 0.05);
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 18, -0.1, 0, Math.PI * 2); ctx.fill();
    // Hand
    ctx.fillStyle = '#D4A574';
    ctx.beginPath(); ctx.arc(0, 17, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#6B5B95';
    ctx.save();
    ctx.translate(22, 15);
    ctx.rotate(-Math.sin(t * 0.8) * 0.05);
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 18, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#D4A574';
    ctx.beginPath(); ctx.arc(0, 17, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Neck
    ctx.fillStyle = '#D4A574';
    ctx.fillRect(-4, -12, 8, 8);

    // Head
    ctx.fillStyle = '#D4A574';
    ctx.beginPath();
    ctx.arc(sway * 0.3, -22, 16, 0, Math.PI * 2);
    ctx.fill();

    // Hair (more detailed)
    ctx.fillStyle = '#3A2A1A';
    ctx.beginPath();
    ctx.arc(sway * 0.3, -26, 16, Math.PI + 0.2, -0.2);
    ctx.fill();
    // Side hair
    ctx.fillRect(-16 + sway * 0.3, -28, 4, 12);
    ctx.fillRect(12 + sway * 0.3, -28, 4, 12);
    // Hair highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sway * 0.3, -28, 12, Math.PI + 0.5, -0.5);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-5 + sway * 0.3, -22, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5 + sway * 0.3, -22, 2.2, 0, Math.PI * 2); ctx.fill();
    // Eye whites
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-5.5 + sway * 0.3, -22.5, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5 + sway * 0.3, -22.5, 0.8, 0, Math.PI * 2); ctx.fill();

    // Mouth
    ctx.strokeStyle = '#8B6B5A';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3 + sway * 0.3, -15);
    ctx.quadraticCurveTo(sway * 0.3, -13.5, 3 + sway * 0.3, -15);
    ctx.stroke();

    // Backpack strap
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.quadraticCurveTo(-16, 10, -14, 20);
    ctx.stroke();

    ctx.restore();
  }

  /* ── Sam at desk (Ch3/4) ── */
  function drawSamDesk(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    t = t || 0;

    // Desk (wood grain)
    var deskGrad = ctx.createLinearGradient(-55, 10, 55, 18);
    deskGrad.addColorStop(0, '#6B5A48');
    deskGrad.addColorStop(0.5, '#7B6A58');
    deskGrad.addColorStop(1, '#5C4A3A');
    ctx.fillStyle = deskGrad;
    ctx.fillRect(-55, 10, 110, 8);
    // Desk edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(-55, 10, 110, 2);
    // Desk legs
    ctx.fillStyle = '#4A3A2E';
    ctx.fillRect(-50, 18, 4, 28);
    ctx.fillRect(46, 18, 4, 28);

    // Coffee mug
    ctx.fillStyle = '#E8E0D0';
    ctx.fillRect(30, -2, 12, 14);
    ctx.strokeStyle = '#C4B8A4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(44, 5, 5, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    // Steam
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (var st = 0; st < 2; st++) {
      ctx.beginPath();
      ctx.moveTo(34 + st * 4, -3);
      ctx.quadraticCurveTo(33 + st * 4 + Math.sin(t * 2 + st) * 3, -10, 35 + st * 4, -16);
      ctx.stroke();
    }

    // Laptop (more detailed)
    // Screen
    ctx.fillStyle = '#333';
    ctx.fillRect(-25, -20, 50, 30);
    // Screen bezel
    ctx.fillStyle = '#222';
    ctx.fillRect(-25, -20, 50, 2);
    ctx.fillRect(-25, 8, 50, 2);
    ctx.fillRect(-25, -20, 2, 30);
    ctx.fillRect(23, -20, 2, 30);
    // Screen content glow
    var screenGlow = ctx.createLinearGradient(-23, -18, -23, 8);
    screenGlow.addColorStop(0, 'rgba(80,160,255,0.2)');
    screenGlow.addColorStop(1, 'rgba(80,160,255,0.05)');
    ctx.fillStyle = screenGlow;
    ctx.fillRect(-23, -18, 46, 26);
    // Typing cursor blink
    if (Math.sin(t * 4) > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-10, -3, 1, 8);
    }
    // Screen text lines
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (var li = 0; li < 5; li++) {
      var lw = 15 + (li * 7) % 20;
      ctx.fillRect(-18, -15 + li * 4.5, lw, 1.5);
    }

    // Keyboard base
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(-25, 10);
    ctx.lineTo(-30, 14);
    ctx.lineTo(30, 14);
    ctx.lineTo(25, 10);
    ctx.fill();

    // Chair (office chair)
    ctx.fillStyle = '#3A3050';
    ctx.beginPath();
    ctx.moveTo(-20, -35);
    ctx.quadraticCurveTo(0, -38, 20, -35);
    ctx.lineTo(22, -5);
    ctx.lineTo(-22, -5);
    ctx.closePath();
    ctx.fill();
    // Chair cushion highlight
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(-18, -33, 36, 10);

    // Sam's upper body (sitting)
    var sitBob = Math.sin(t * 0.5) * 1;
    ctx.fillStyle = '#6B5B95';
    ctx.beginPath();
    ctx.ellipse(0, -22 + sitBob, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms reaching to keyboard
    ctx.fillStyle = '#6B5B95';
    ctx.beginPath();
    ctx.moveTo(-16, -18 + sitBob);
    ctx.quadraticCurveTo(-22, -5, -18, 8);
    ctx.lineTo(-12, 8);
    ctx.quadraticCurveTo(-16, -5, -12, -18 + sitBob);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, -18 + sitBob);
    ctx.quadraticCurveTo(22, -5, 18, 8);
    ctx.lineTo(12, 8);
    ctx.quadraticCurveTo(16, -5, 12, -18 + sitBob);
    ctx.fill();

    // Hands on keyboard
    ctx.fillStyle = '#D4A574';
    ctx.beginPath(); ctx.arc(-15, 9, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, 9, 4, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.fillStyle = '#D4A574';
    ctx.beginPath();
    ctx.arc(0, -40 + sitBob, 13, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#3A2A1A';
    ctx.beginPath();
    ctx.arc(0, -43 + sitBob, 13, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-13, -45 + sitBob, 3, 8);
    ctx.fillRect(10, -45 + sitBob, 3, 8);

    // Screen light on face
    ctx.fillStyle = 'rgba(80,160,255,0.06)';
    ctx.beginPath();
    ctx.arc(0, -38 + sitBob, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ── Public API ── */
  window.Characters = {
    sloth: slothState,
    drawSloth: drawSloth,
    drawSamBed: drawSamBed,
    drawSamStanding: drawSamStanding,
    drawSamDesk: drawSamDesk,
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
    },

    wave: function () {
      slothState.armWaveActive = true;
      slothState.armWave = 0;
    },

    emote: function (emoji) {
      slothState.emoteBubble = emoji;
      slothState.emoteBubbleTimer = 60;
    },

    tiltHead: function (dir) {
      slothState.headTiltTarget = dir || 0; // -1 left, 0 center, 1 right
    },

    lookAt: function (nx, ny) {
      slothState.lookTarget.x = Math.max(-1, Math.min(1, nx));
      slothState.lookTarget.y = Math.max(-1, Math.min(1, ny));
    },

    // Hit test for clicking the sloth
    hitTest: function (px, py) {
      var dx = px - slothState.x;
      var dy = py - slothState.y;
      return (dx * dx + dy * dy) < (60 * 60);
    }
  };
})();
