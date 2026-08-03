// ============================================================
// Dragon Engineering Lab — Canvas Dragon Renderer
// Stylised 2.5D specimen / evolutionary-blueprint illustration.
// Drawn on an HTML5 canvas overlay; no WebGL texture pipeline.
// Art direction: science-fantasy anatomy panel / specimen diagram.
// ============================================================

window.DragonCanvas = (function () {

  // ---- Color helpers ----
  function hex2rgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function lerp(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }

  function rc(c, a) {
    if (a === undefined) return `rgb(${c.r},${c.g},${c.b})`;
    return `rgba(${c.r},${c.g},${c.b},${a})`;
  }

  // Unit perpendicular from segment AB, length len
  function perp(ax, ay, bx, by, len) {
    const dx = bx - ax, dy = by - ay;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / d * len, y: dx / d * len };
  }

  // ============================================================
  // MAIN DRAW FUNCTION
  // ============================================================
  function draw(canvas, traits, tintHex, animTime) {
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // ---- Lab specimen background ----
    ctx.fillStyle = 'rgba(5, 7, 16, 0.96)';
    ctx.fillRect(0, 0, W, H);

    // Fine grid — blueprint engineering feel
    ctx.strokeStyle = 'rgba(0, 55, 45, 0.16)';
    ctx.lineWidth = 0.5;
    const gridStep = 24;
    for (let gx = 0; gx < W; gx += gridStep) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Corner brackets
    const bsz = 30;
    ctx.strokeStyle = 'rgba(0, 190, 148, 0.52)';
    ctx.lineWidth = 2.2;
    for (const [cx2, cy2, sx, sy] of [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]]) {
      ctx.beginPath();
      ctx.moveTo(cx2 + sx * bsz, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + sy * bsz);
      ctx.stroke();
    }

    const t = animTime || 0;

    // ---- Normalize traits ----
    const n = {};
    window.DragonData.TRAITS.forEach(tr => {
      n[tr.id] = (traits[tr.id] - tr.min) / (tr.max - tr.min);
    });

    // ---- Color palette (tint-shifted) ----
    const tint  = hex2rgb(tintHex || '#2a8870');
    const skin  = lerp({ r: 20, g: 56, b: 44 }, tint, 0.48);
    const top_  = lerp({ r: 30, g: 82, b: 62 }, tint, 0.58);
    const dark  = lerp({ r: 8,  g: 20, b: 14 }, tint, 0.20);
    const belly = lerp({ r: 44, g: 92, b: 72 }, tint, 0.36);
    const rim   = lerp({ r: 72, g: 148, b: 112 }, tint, 0.60);  // edge highlight
    const mem   = lerp({ r: 82, g: 28, b: 20  }, tint, 0.18);
    const bone  = { r: 60, g: 58, b: 46 };
    const spec  = { r: 190, g: 230, b: 210 };   // specular
    const eye_c = { r: 100, g: 255, b: 185 };

    // ---- Scale factors ----
    const sc     = 0.80 + n.bodyMass    * 0.40;
    const nkFac  = 0.75 + n.neckLength  * 0.50;
    const tlFac  = 0.68 + n.tailSize    * 0.64;
    const wsF    = 0.60 + n.wingspan    * 0.80;
    const waF    = 0.62 + n.wingArea    * 0.76;
    const musF   = 0.60 + n.musclePower * 0.80;
    const insF   = 0.76 + n.insulation  * 0.58;
    const stomF  = 0.62 + n.stomachCapacity * 0.70;

    // Breathing
    const br = Math.sin(t * 1.72) * 0.014;

    // ---- Body anchor points ----
    const ox = W * 0.42,  oy = H * 0.600;
    const bw = W * 0.200 * sc;   // slightly wider
    const bh = H * 0.112 * sc;   // slightly flatter

    // Neck base
    const nbx = ox + bw * 0.72,  nby = oy - bh * 0.82;
    // Neck end
    const nex = nbx + W * 0.054 + W * 0.018 * (nkFac - 1);
    const ney = nby - H * 0.178 * nkFac;
    // Neck bezier controls — gentle S
    const nc1x = nbx + W * 0.010, nc1y = nby - H * 0.054;
    const nc2x = nex - W * 0.020, nc2y = ney + H * 0.060;
    // Neck tube radii
    const nrBase = bh * 0.270;
    const nrEnd  = bh * 0.130;

    // Head
    const hs  = W * 0.060 * sc;
    const hx  = nex + W * 0.016, hy = ney;
    const stx = hx + hs * 1.42,  sty = hy + hs * 0.10;
    const jx  = stx,              jy  = sty + hs * 0.44;
    const crx = hx + hs * 0.08,  cry = hy  - hs * 0.60;
    const hnL = hs * (0.70 + n.boneDensity * 0.62);
    const eX  = hx + hs * 0.44,  eY  = hy  - hs * 0.06;
    const eR  = hs * 0.148;

    // Tail
    const tbx   = ox - bw * 0.90,  tby  = oy - bh * 0.10;
    const tlLen = W * 0.16 * tlFac;
    const tRad  = bh * 0.28;
    const tSway = Math.sin(t * 1.10 + 0.55) * H * 0.010;
    const tc1x  = tbx - tlLen * 0.32, tc1y = tby + H * 0.046 + tSway * 0.50;
    const tc2x  = tbx - tlLen * 0.65, tc2y = tby + H * 0.088 + tSway;
    const ttx   = tbx - tlLen,         tty  = tby + H * 0.060 + tSway * 0.62;

    // Wing
    const wSpan = W * 0.27 * wsF;
    const wArea = H * 0.30 * waF;
    const wrx  = ox + bw * 0.44,  wry  = oy - bh * 0.88;   // wing root on body
    const wax  = wrx + W * 0.032 * wsF, way = wry - H * 0.10 * wsF;  // arm elbow
    // Three primary fingers
    const wf1x = wax + wSpan * 0.38, wf1y = way - wArea * 0.64;
    const wf2x = wax + wSpan * 0.54, wf2y = way - wArea * 0.34;
    const wf3x = wax + wSpan * 0.58, wf3y = way - wArea * 0.08;
    // Trailing edge anchors on body
    const wtx  = ox + bw * 0.06,  wty  = oy - bh * 0.72;
    const wbx  = ox - bw * 0.28,  wby  = oy - bh * 0.32;

    // Legs — thicker, more substantial
    const legW    = (9.0 + n.musclePower * 10.0) * sc;
    const lgW     = legW;
    const clawLen = (6.0 + n.boneDensity * 10.0) * sc;
    const kSpur   = legW * (0.30 + n.boneDensity * 0.48);

    // Front leg
    const flHx = ox + bw * 0.52,  flHy = oy + bh * 0.80;
    const flKx = flHx + W*0.015,  flKy = flHy + H*0.092;
    const flAx = flKx - W*0.007,  flAy = flKy + H*0.068;
    const flMx = flAx + W*0.028,  flMy = flAy + H*0.018;

    // Hind leg
    const hlHx = ox - bw * 0.26,  hlHy = oy + bh * 0.80;
    const hlKx = hlHx + W*0.012,  hlKy = hlHy + H*0.100;
    const hlAx = hlKx - W*0.013,  hlAy = hlKy + H*0.064;
    const hlMx = hlAx + W*0.024,  hlMy = hlAy + H*0.016;

    // Ground line (for shadow + annotations)
    const groundY = Math.max(hlMy, flMy) + legW * 0.6 + clawLen * 0.5;

    // Fuel sac
    const fsR  = (5.0 + n.fuelGlandSize * 8.0) * sc;
    const fsx  = ox + bw * 0.12,  fsy = oy + bh * 0.38;
    const fsGl = Math.max(0.1, 0.38 + n.fuelGlandSize * 0.72 + Math.sin(t * 2.5) * 0.16);

    // ============================================================
    // LOCAL HELPER — segmented toe + knuckle + digital pad + claw
    // ============================================================
    const drawToe = (bx, by, ang, toeLen, toeW) => {
      const proxFrac = 0.52;
      const mx = bx + Math.cos(ang) * toeLen * proxFrac;
      const my = by + Math.sin(ang) * toeLen * proxFrac;
      const tx = bx + Math.cos(ang) * toeLen;
      const ty = by + Math.sin(ang) * toeLen;

      const pW = toeW * 1.15;
      const dW = toeW * 0.88;
      const tW = toeW * 0.54;

      const pB   = perp(bx, by, mx, my, pW);
      const pMid = perp(bx, by, mx, my, dW * 0.98);
      const dK   = perp(mx, my, tx, ty, dW);
      const dT   = perp(mx, my, tx, ty, tW);

      // Proximal phalanx
      ctx.fillStyle   = rc(lerp(dark, skin, 0.15), 0.92);
      ctx.strokeStyle = rc(dark, 0.30);
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.moveTo(bx + pB.x, by + pB.y);
      ctx.quadraticCurveTo(
        (bx + mx) * 0.5 + pMid.x * 1.12, (by + my) * 0.5 + pMid.y * 1.12,
        mx + dK.x, my + dK.y
      );
      ctx.lineTo(mx - dK.x, my - dK.y);
      ctx.quadraticCurveTo(
        (bx + mx) * 0.5 - pMid.x * 0.85, (by + my) * 0.5 - pMid.y * 0.85,
        bx - pB.x, by - pB.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Knuckle
      ctx.beginPath();
      ctx.arc(mx, my, toeW * (0.52 + n.boneDensity * 0.20), 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(skin, bone, 0.40), 0.92);
      ctx.fill();

      // Distal phalanx
      ctx.fillStyle = rc(lerp(dark, skin, 0.10), 0.90);
      ctx.beginPath();
      ctx.moveTo(mx + dK.x, my + dK.y);
      ctx.quadraticCurveTo(
        (mx + tx) * 0.5 + dT.x * 1.08, (my + ty) * 0.5 + dT.y * 1.08,
        tx + dT.x * 0.52, ty + dT.y * 0.52
      );
      ctx.lineTo(tx - dT.x * 0.52, ty - dT.y * 0.52);
      ctx.quadraticCurveTo(
        (mx + tx) * 0.5 - dT.x * 0.84, (my + ty) * 0.5 - dT.y * 0.84,
        mx - dK.x, my - dK.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Digital pad
      const pnRaw = perp(mx, my, tx, ty, 1);
      const pnL   = Math.hypot(pnRaw.x, pnRaw.y) || 1;
      const pnx   = pnRaw.x / pnL, pny = pnRaw.y / pnL;
      ctx.fillStyle = rc(lerp(belly, dark, 0.30), 0.55);
      ctx.beginPath();
      ctx.ellipse(
        tx - pnx * toeW * 0.55, ty - pny * toeW * 0.55,
        toeW * 0.54, toeW * 0.36, ang, 0, Math.PI * 2
      );
      ctx.fill();

      // Dorsal scale arcs
      if (n.scaleThickness > 0.18) {
        const nS  = 1 + Math.floor(n.scaleThickness * 2);
        const sOp = (n.scaleThickness - 0.18) * 0.30;
        ctx.strokeStyle = rc(lerp(rim, spec, 0.20), sOp);
        ctx.lineWidth   = 0.45;
        for (let si = 0; si < nS; si++) {
          const su = 0.12 + si / (nS + 0.5) * 0.70;
          const sx2 = bx + Math.cos(ang) * toeLen * su;
          const sy2 = by + Math.sin(ang) * toeLen * su;
          const sr  = toeW * (0.60 - si * 0.06);
          ctx.beginPath();
          ctx.arc(sx2 + pnx * sr * 0.12, sy2 + pny * sr * 0.12,
            sr, ang + Math.PI * 0.54, ang - Math.PI * 0.54 + Math.PI * 2);
          ctx.stroke();
        }
      }

      // Claw — elegant scythe shape (less extreme hook)
      const clW   = toeW * (0.44 + n.boneDensity * 0.22);
      const hookD = clawLen * (0.12 + n.boneDensity * 0.14);
      const ceX   = tx + Math.cos(ang) * clawLen;
      const ceY   = ty + Math.sin(ang) * clawLen + hookD;
      const cc1x  = tx + Math.cos(ang) * clawLen * 0.38;
      const cc1y  = ty + Math.sin(ang) * clawLen * 0.38 + hookD * 0.22;
      const cc2x  = tx + Math.cos(ang) * clawLen * 0.74;
      const cc2y  = ty + Math.sin(ang) * clawLen * 0.74 + hookD * 0.60;
      const cp    = perp(tx, ty, ceX, ceY, clW);

      const cg = ctx.createLinearGradient(tx, ty, ceX, ceY);
      cg.addColorStop(0.00, rc(lerp(skin, bone, 0.48), 0.90));
      cg.addColorStop(0.55, rc(bone, 0.86));
      cg.addColorStop(1.00, rc(lerp(bone, spec, 0.28), 0.72));
      ctx.fillStyle   = cg;
      ctx.strokeStyle = rc(dark, 0.40);
      ctx.lineWidth   = 0.6;
      ctx.beginPath();
      ctx.moveTo(tx + cp.x, ty + cp.y);
      ctx.bezierCurveTo(
        cc1x + cp.x * 0.56, cc1y + cp.y * 0.56,
        cc2x + cp.x * 0.22, cc2y + cp.y * 0.22,
        ceX, ceY
      );
      ctx.bezierCurveTo(
        cc2x - cp.x * 0.22, cc2y - cp.y * 0.22,
        cc1x - cp.x * 0.56, cc1y - cp.y * 0.56,
        tx - cp.x, ty - cp.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Claw dorsal edge highlight
      ctx.save();
      ctx.strokeStyle = rc(lerp(bone, spec, 0.48), 0.44);
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.bezierCurveTo(
        cc1x + cp.x * 0.16, cc1y + cp.y * 0.16,
        cc2x + cp.x * 0.06, cc2y + cp.y * 0.06,
        ceX, ceY
      );
      ctx.stroke();
      ctx.restore();
    };

    // ============================================================
    // LAYER 0 — GROUND SHADOW (soft ellipse under feet)
    // ============================================================
    {
      const sW = bw * 0.70, sH = bh * 0.10;
      const sg = ctx.createRadialGradient(ox, groundY, 0, ox, groundY, sW);
      sg.addColorStop(0.0, 'rgba(0,0,0,0.32)');
      sg.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(ox, groundY, sW, sH, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ============================================================
    // LAYER 1 — WING MEMBRANE (behind everything)
    // ============================================================
    {
      // Wing root socket
      ctx.save();
      const sockG = ctx.createRadialGradient(wrx, wry, 0, wrx, wry, legW * 0.88);
      sockG.addColorStop(0.0, rc(lerp(skin, top_, 0.6), 0.72));
      sockG.addColorStop(1.0, rc(skin, 0.0));
      ctx.fillStyle = sockG;
      ctx.beginPath();
      ctx.ellipse(wrx, wry, legW * 0.88, legW * 0.66, -0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Membrane fill
      const g = ctx.createRadialGradient(wax, way, 0, wax, way, wSpan * 1.20);
      g.addColorStop(0.0,  rc(mem, 0.70));
      g.addColorStop(0.50, rc(mem, 0.42));
      g.addColorStop(1.0,  rc(mem, 0.08));
      ctx.save();
      ctx.fillStyle   = g;
      ctx.strokeStyle = rc(lerp(mem, { r: mem.r + 30, g: mem.g + 20, b: mem.b + 14 }, 0.5), 0.34);
      ctx.lineWidth   = 1.0;
      ctx.beginPath();
      ctx.moveTo(wrx, wry);
      // Leading edge sweep to finger 1 (top)
      ctx.bezierCurveTo(
        wax - wSpan * 0.04, wry - wArea * 0.12,
        wf1x - wSpan * 0.12, wf1y + wArea * 0.16,
        wf1x, wf1y
      );
      // Notch 1→2 (deep concave)
      ctx.bezierCurveTo(
        wf1x + wSpan * 0.04, wf1y + wArea * 0.18,
        wf2x - wSpan * 0.06, wf2y - wArea * 0.08,
        wf2x, wf2y
      );
      // Notch 2→3
      ctx.bezierCurveTo(
        wf2x + wSpan * 0.04, wf2y + wArea * 0.12,
        wf3x - wSpan * 0.04, wf3y - wArea * 0.06,
        wf3x, wf3y
      );
      // Trailing edge sweep down to body
      ctx.bezierCurveTo(
        wf3x - wSpan * 0.02, wf3y + wArea * 0.28,
        wtx + W * 0.04, wty - H * 0.016,
        wtx, wty
      );
      ctx.bezierCurveTo(
        wtx - W * 0.028, wty + H * 0.044,
        wbx + W * 0.018, wby - H * 0.010,
        wbx, wby
      );
      ctx.bezierCurveTo(
        wbx + W * 0.012, wby - H * 0.030,
        wrx - W * 0.010, wry + H * 0.020,
        wrx, wry
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Membrane inner vein structure
      ctx.save();
      const vOp = 0.40;
      ctx.lineCap = 'round';
      // Primary veins arm → fingers
      for (const [fx, fy] of [[wf1x, wf1y], [wf2x, wf2y], [wf3x, wf3y]]) {
        ctx.strokeStyle = rc(lerp(mem, { r: mem.r + 40, g: mem.g + 28, b: mem.b + 18 }, 0.5), vOp);
        ctx.lineWidth   = 1.0;
        ctx.beginPath(); ctx.moveTo(wax, way); ctx.lineTo(fx, fy); ctx.stroke();
      }
      // Secondary cross-veins (subtle)
      ctx.strokeStyle = rc(lerp(mem, { r: mem.r + 24, g: mem.g + 16, b: mem.b + 10 }, 0.5), 0.22);
      ctx.lineWidth = 0.55;
      const midF1F2x = (wf1x + wf2x) * 0.5, midF1F2y = (wf1y + wf2y) * 0.5;
      ctx.beginPath(); ctx.moveTo(wax + (wf1x - wax)*0.5, way + (wf1y - way)*0.5);
      ctx.lineTo(midF1F2x, midF1F2y); ctx.stroke();
      ctx.restore();

      // Arm bone
      ctx.save();
      ctx.strokeStyle = rc(lerp(bone, rim, 0.28), 0.68);
      ctx.lineWidth   = lgW * 0.48;
      ctx.lineCap     = 'round';
      ctx.beginPath(); ctx.moveTo(wrx, wry); ctx.lineTo(wax, way); ctx.stroke();
      // Elbow knob
      ctx.beginPath();
      ctx.arc(wax, way, lgW * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(bone, skin, 0.32), 0.82);
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 2 — HIND LEG (behind body)
    // ============================================================
    {
      ctx.save();
      const hlGrad = ctx.createLinearGradient(hlHx, hlHy, hlMx, hlMy + H*0.06);
      hlGrad.addColorStop(0.00, rc(top_));
      hlGrad.addColorStop(0.38, rc(skin));
      hlGrad.addColorStop(1.00, rc(dark));

      // Thigh — broad haunch with posterior muscle bulge
      const hlThighW = legW * 1.52;
      const phH   = perp(hlHx, hlHy, hlKx, hlKy, hlThighW);
      const phK   = perp(hlHx, hlHy, hlKx, hlKy, legW * 0.88);
      const hlTMx = (hlHx + hlKx) * 0.5, hlTMy = (hlHy + hlKy) * 0.5;
      const phMid = perp(hlHx, hlHy, hlKx, hlKy, hlThighW * 1.00);
      ctx.fillStyle   = hlGrad;
      ctx.strokeStyle = rc(dark, 0.30);
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(hlHx + phH.x, hlHy + phH.y);
      ctx.quadraticCurveTo(
        hlTMx + phMid.x * 1.28, hlTMy + phMid.y * 1.28,
        hlKx + phK.x, hlKy + phK.y
      );
      ctx.lineTo(hlKx - phK.x, hlKy - phK.y);
      ctx.quadraticCurveTo(
        hlTMx - phMid.x * 0.72, hlTMy - phMid.y * 0.72,
        hlHx - phH.x, hlHy - phH.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Thigh rim highlight
      ctx.save();
      ctx.strokeStyle = rc(rim, 0.22);
      ctx.lineWidth   = legW * 0.18;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(hlHx + phH.x * 0.60, hlHy + phH.y * 0.60);
      ctx.quadraticCurveTo(hlTMx + phMid.x * 0.70, hlTMy + phMid.y * 0.70, hlKx + phK.x * 0.55, hlKy + phK.y * 0.55);
      ctx.stroke();
      ctx.restore();

      // Knee cap
      ctx.beginPath();
      ctx.arc(hlKx, hlKy, legW * 0.78, 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(skin, bone, 0.42), 0.94);
      ctx.fill();
      ctx.strokeStyle = rc(dark, 0.22);
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      // Knee spur
      const hlTDx = hlHx - hlKx, hlTDy = hlHy - hlKy;
      const hlTLen = Math.sqrt(hlTDx*hlTDx + hlTDy*hlTDy) || 1;
      const hlBX = hlTDx / hlTLen, hlBY = hlTDy / hlTLen;
      const hlPX = -hlBY, hlPY = hlBX;
      const spurTx = hlKx + hlBX * legW * 0.28 + hlPX * kSpur;
      const spurTy = hlKy + hlBY * legW * 0.28 + hlPY * kSpur;
      const spg = ctx.createLinearGradient(hlKx, hlKy, spurTx, spurTy);
      spg.addColorStop(0, rc(lerp(skin, bone, 0.50), 0.88));
      spg.addColorStop(1, rc(lerp(bone, spec, 0.24), 0.76));
      ctx.beginPath();
      ctx.moveTo(hlKx + hlPX * legW * 0.52, hlKy + hlPY * legW * 0.52);
      ctx.lineTo(spurTx, spurTy);
      ctx.lineTo(hlKx - hlPX * legW * 0.28, hlKy - hlPY * legW * 0.28);
      ctx.closePath();
      ctx.fillStyle = spg;
      ctx.fill();
      ctx.strokeStyle = rc(dark, 0.30);
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      // Shin — with gastrocnemius bulge
      const pshK   = perp(hlKx, hlKy, hlAx, hlAy, legW * 0.80);
      const pshA   = perp(hlKx, hlKy, hlAx, hlAy, legW * 0.46);
      const hlSMx  = (hlKx + hlAx) * 0.5, hlSMy = (hlKy + hlAy) * 0.5;
      const pshMid = perp(hlKx, hlKy, hlAx, hlAy, legW * 0.70);
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.moveTo(hlKx + pshK.x, hlKy + pshK.y);
      ctx.quadraticCurveTo(
        hlSMx + pshMid.x * 0.96, hlSMy + pshMid.y * 0.96,
        hlAx + pshA.x, hlAy + pshA.y
      );
      ctx.lineTo(hlAx - pshA.x, hlAy - pshA.y);
      ctx.quadraticCurveTo(
        hlSMx - pshMid.x * 0.74, hlSMy - pshMid.y * 0.74,
        hlKx - pshK.x, hlKy - pshK.y
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ankle knob
      ctx.beginPath();
      ctx.arc(hlAx, hlAy, legW * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(skin, bone, 0.34), 0.90);
      ctx.fill();

      // Metatarsal
      const pmeA = perp(hlAx, hlAy, hlMx, hlMy, legW * 0.52);
      const pmeM = perp(hlAx, hlAy, hlMx, hlMy, legW * 0.36);
      ctx.fillStyle = rc(lerp(dark, skin, 0.10), 0.94);
      ctx.beginPath();
      ctx.moveTo(hlAx + pmeA.x, hlAy + pmeA.y);
      ctx.lineTo(hlMx + pmeM.x, hlMy + pmeM.y);
      ctx.lineTo(hlMx - pmeM.x, hlMy - pmeM.y);
      ctx.lineTo(hlAx - pmeA.x, hlAy - pmeA.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Toes × 3
      const hlToeAngles = [-0.32, 0.05, 0.42];
      const hlToeLen    = legW * 1.44;
      const hlToeW      = legW * 0.36;
      for (const ang of hlToeAngles) {
        drawToe(hlMx, hlMy, Math.PI * 0.08 + ang, hlToeLen, hlToeW);
      }
      ctx.restore();
    }

    // ============================================================
    // LAYER 3 — BODY SILHOUETTE + ANATOMY OVERLAYS
    // ============================================================
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(1 + br * 0.26, 1 + br);
    ctx.translate(-ox, -oy);
    {
      // Four-stop gradient: rim-lit spine → dorsal → mid skin → dark underside
      const g = ctx.createLinearGradient(ox, oy - bh * 1.28, ox, oy + bh * 1.24);
      g.addColorStop(0.00, rc(lerp(top_, spec, 0.12)));
      g.addColorStop(0.14, rc(top_));
      g.addColorStop(0.40, rc(skin));
      g.addColorStop(0.70, rc(dark));
      g.addColorStop(1.00, rc(dark));
      ctx.fillStyle   = g;
      ctx.strokeStyle = rc(dark, 0.50);
      ctx.lineWidth   = 1.6;

      ctx.beginPath();
      // ---- UPPER: tail top → haunch → waist dip → shoulder ridge → neck ----
      ctx.moveTo(tbx, tby - tRad * 0.68);
      ctx.bezierCurveTo(
        tbx + bw * 0.20, oy - bh * (0.82 + musF * 0.05),
        ox  - bw * 0.22, oy - bh * (0.92 + musF * 0.04),
        ox  + bw * 0.12, oy - bh * (0.96 + musF * 0.10)
      );
      ctx.bezierCurveTo(
        ox + bw * 0.52, oy - bh * (0.94 + musF * 0.08),
        nbx - W * 0.008, nby + H * 0.010,
        nbx, nby
      );
      ctx.bezierCurveTo(nc1x, nc1y, nc2x, nc2y, nex, ney);
      // Head upper arc
      ctx.bezierCurveTo(
        hx - hs * 0.20, hy - hs * 0.74,
        crx - hs * 0.08, cry + hs * 0.10,
        crx, cry
      );
      // Forehead → snout
      ctx.bezierCurveTo(
        crx + hs * 0.40, cry - hs * 0.08,
        stx - hs * 0.22, sty - hs * 0.24,
        stx, sty
      );
      // Snout tip → jaw
      ctx.bezierCurveTo(
        stx + hs * 0.08, sty + hs * 0.16,
        jx  + hs * 0.08, jy  - hs * 0.08,
        jx, jy
      );
      // Lower jaw → throat → neck base lower
      ctx.bezierCurveTo(
        jx  - hs * 0.32, jy  + hs * 0.10,
        hx  + hs * 0.10, hy  + hs * 0.50,
        hx  - hs * 0.12, hy  + hs * 0.38
      );
      ctx.bezierCurveTo(
        nc2x - W * 0.010, nc2y + H * 0.062,
        nc1x - W * 0.014, nc1y + H * 0.052,
        nbx  - W * 0.010, nby  + H * 0.068
      );
      // ---- LOWER: chest → barrel belly → haunch → tail base ----
      ctx.bezierCurveTo(
        ox + bw * (0.54 + musF * 0.04), oy + bh * (0.54 + stomF * 0.05),
        ox + bw * 0.08, oy + bh * (1.00 + insF * 0.06),
        ox - bw * 0.08, oy + bh * (1.02 + insF * 0.07)
      );
      ctx.bezierCurveTo(
        ox - bw * 0.50, oy + bh * (0.98 + insF * 0.05),
        tbx + bw * 0.26, oy + bh * (0.78 + insF * 0.03),
        tbx, tby + tRad * 0.68
      );
      ctx.bezierCurveTo(
        tbx - bw * 0.04, tby + tRad * 0.28,
        tbx - bw * 0.04, tby - tRad * 0.28,
        tbx, tby - tRad * 0.68
      );
      ctx.fill();
      ctx.stroke();

      // ---- Dorsal spine ridge highlight ----
      ctx.save();
      const ridgeG = ctx.createLinearGradient(ox - bw * 0.20, oy - bh * 0.92, ox + bw * 0.50, oy - bh * 1.06);
      ridgeG.addColorStop(0.00, rc(rim, 0.00));
      ridgeG.addColorStop(0.40, rc(lerp(rim, spec, 0.30), 0.28));
      ridgeG.addColorStop(1.00, rc(rim, 0.00));
      ctx.strokeStyle = ridgeG;
      ctx.lineWidth   = bh * 0.08;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(ox - bw * 0.18, oy - bh * (0.91 + musF * 0.06));
      ctx.bezierCurveTo(
        ox + bw * 0.12, oy - bh * (0.97 + musF * 0.10),
        ox + bw * 0.40, oy - bh * (0.95 + musF * 0.08),
        nbx, nby
      );
      ctx.stroke();
      ctx.restore();

      // ---- Shoulder muscle pad ----
      const shlCx = ox + bw * 0.38, shlCy = oy - bh * 0.70;
      const shlG  = ctx.createRadialGradient(shlCx, shlCy, 0, shlCx, shlCy, bw * 0.36);
      shlG.addColorStop(0.0, rc(skin, 0.40));
      shlG.addColorStop(0.5, rc(skin, 0.16));
      shlG.addColorStop(1.0, rc(skin, 0.00));
      ctx.fillStyle = shlG;
      ctx.beginPath();
      ctx.ellipse(shlCx, shlCy, bw * (0.26 + musF * 0.09), bh * (0.54 + musF * 0.12), 0.12, 0, Math.PI * 2);
      ctx.fill();

      // ---- Haunch muscle pad ----
      const hchCx = ox - bw * 0.18, hchCy = oy + bh * 0.42;
      const hchG  = ctx.createRadialGradient(hchCx, hchCy, 0, hchCx, hchCy, bw * 0.30);
      hchG.addColorStop(0.0, rc(skin, 0.32));
      hchG.addColorStop(0.6, rc(skin, 0.10));
      hchG.addColorStop(1.0, rc(skin, 0.00));
      ctx.fillStyle = hchG;
      ctx.beginPath();
      ctx.ellipse(hchCx, hchCy, bw * (0.22 + musF * 0.08), bh * (0.58 + musF * 0.11), -0.10, 0, Math.PI * 2);
      ctx.fill();

      // ---- Chest keel highlight ----
      const kealG = ctx.createLinearGradient(ox + bw * 0.55, oy + bh * 0.15, ox + bw * 0.55, oy + bh * 0.75);
      kealG.addColorStop(0.0, rc(belly, 0.00));
      kealG.addColorStop(0.4, rc(belly, 0.20));
      kealG.addColorStop(1.0, rc(belly, 0.00));
      ctx.fillStyle = kealG;
      ctx.beginPath();
      ctx.ellipse(ox + bw * 0.44, oy + bh * 0.45, bw * 0.14, bh * 0.32, 0.08, 0, Math.PI * 2);
      ctx.fill();

      // ---- Rib surface lines (high musclePower) ----
      if (n.musclePower > 0.14) {
        ctx.save();
        const ribOp = (n.musclePower - 0.14) * 0.22;
        const ribN  = 4;
        for (let ri = 0; ri < ribN; ri++) {
          const tR   = 0.16 + ri / (ribN - 1) * 0.58;
          const ribx = nbx - bw * (0.12 + tR * 1.00);
          const riby = oy  - bh * (0.76 - tR * 0.18);
          const ribH = bh  * (0.32 + tR * 0.24);
          ctx.strokeStyle = rc(lerp(rim, spec, 0.12), ribOp);
          ctx.lineWidth   = 0.65;
          ctx.beginPath();
          ctx.arc(ribx - ribH * 0.10, riby + ribH * 0.08, ribH, -Math.PI * 0.56, Math.PI * 0.08);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();

    // ============================================================
    // LAYER 4 — BELLY PLATES + SCALE SEGMENTS
    // ============================================================
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(1 + br * 0.26, 1 + br);
    ctx.translate(-ox, -oy);
    {
      const bCy = oy + bh * (0.28 + insF * 0.05);
      const bHH = bh * (0.52 + insF * 0.10);
      const bHW = bw * (0.42 + stomF * 0.07);

      const bg = ctx.createLinearGradient(ox, bCy - bHH, ox, bCy + bHH);
      bg.addColorStop(0.00, rc(belly, 0.00));
      bg.addColorStop(0.20, rc(belly, 0.68));
      bg.addColorStop(0.58, rc(belly, 0.50));
      bg.addColorStop(1.00, rc(belly, 0.00));
      ctx.fillStyle = bg;

      ctx.beginPath();
      ctx.moveTo(ox + bHW, bCy);
      ctx.bezierCurveTo(
        ox + bHW * 0.88, bCy - bHH * 0.56,
        ox + bHW * 0.38, bCy - bHH,
        ox - bHW * 0.24, bCy - bHH * 0.86
      );
      ctx.bezierCurveTo(
        ox - bHW * 0.74, bCy - bHH * 0.74,
        ox - bHW * 0.96, bCy - bHH * 0.06,
        ox - bHW * 0.96, bCy + bHH * 0.30
      );
      ctx.bezierCurveTo(
        ox - bHW * 0.84, bCy + bHH,
        ox - bHW * 0.36, bCy + bHH * 0.88,
        ox + bHW * 0.24, bCy + bHH * 0.76
      );
      ctx.bezierCurveTo(
        ox + bHW * 0.72, bCy + bHH * 0.54,
        ox + bHW * 0.96, bCy + bHH * 0.18,
        ox + bHW, bCy
      );
      ctx.fill();

      // Belly scale arc strokes
      const pN  = 5 + Math.floor(n.scaleThickness * 4);
      const pOp = 0.14 + n.scaleThickness * 0.24;
      for (let pli = 0; pli < pN; pli++) {
        const tP = pli / (pN - 1);
        const px = (ox + bHW) - tP * (bHW + bHW * 0.96);
        const py = bCy + bHH * (0.28 + 0.16 * Math.sin(tP * Math.PI));
        const pR = bHH * (0.26 + 0.20 * Math.sin(tP * Math.PI));
        ctx.strokeStyle = rc(lerp(belly, spec, 0.14), pOp);
        ctx.lineWidth   = 0.65;
        ctx.beginPath();
        ctx.arc(px, py - pR * 0.08, pR, -Math.PI * 0.66, Math.PI * 0.66);
        ctx.stroke();
      }
    }
    ctx.restore();

    // ============================================================
    // LAYER 5 — DORSAL SPINE FINS
    // ============================================================
    {
      const finN        = 6 + Math.floor(n.scaleThickness * 5);
      const finMaxH     = (6.0 + n.scaleThickness * 11.0) * sc;
      const spineStartX = nbx - W * 0.030;
      const spineEndX   = tbx + bw * 0.10;

      for (let fi = 0; fi < finN; fi++) {
        const tp     = fi / (finN - 1);
        const fx     = spineStartX - tp * (spineStartX - spineEndX);
        const fyRef  = oy - bh * (0.96 + musF * 0.10);
        const fy     = (fyRef + (nby - fyRef) * Math.max(0, 1 - tp * 5)) - bh * 0.04 * Math.sin(tp * Math.PI);
        const fh     = finMaxH * Math.max(0.08, Math.sin(tp * Math.PI));
        const fw     = fh * (0.17 + 0.09 * (1 - tp));
        const lean   = -fh * 0.10;

        const fg = ctx.createLinearGradient(fx, fy, fx + lean, fy - fh);
        fg.addColorStop(0.00, rc(top_, 0.86));
        fg.addColorStop(0.50, rc(lerp(bone, top_, 0.44), 0.88));
        fg.addColorStop(1.00, rc(lerp(bone, spec, 0.24), 0.72));

        ctx.save();
        ctx.fillStyle   = fg;
        ctx.strokeStyle = rc(lerp(bone, dark, 0.38), 0.36);
        ctx.lineWidth   = 0.65;
        ctx.beginPath();
        ctx.moveTo(fx - fw, fy);
        ctx.bezierCurveTo(fx - fw * 0.58, fy - fh * 0.44, fx + lean - fw * 0.16, fy - fh * 0.80, fx + lean, fy - fh);
        ctx.bezierCurveTo(fx + lean + fw * 0.14, fy - fh * 0.82, fx + fw * 0.44, fy - fh * 0.46, fx + fw, fy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Fin edge rim
        ctx.strokeStyle = rc(lerp(rim, spec, 0.30), 0.28);
        ctx.lineWidth   = 0.4;
        ctx.beginPath();
        ctx.moveTo(fx - fw * 0.6, fy - fh * 0.20);
        ctx.bezierCurveTo(fx - fw * 0.30, fy - fh * 0.60, fx + lean - fw * 0.12, fy - fh * 0.84, fx + lean, fy - fh);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ============================================================
    // LAYER 6 — FUEL SAC GLOW (integrated belly accent)
    // ============================================================
    {
      // Outer body glow (screen blend — shows through body as amber belly)
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(fsx, fsy, 0, fsx, fsy, fsR * 2.2);
      g.addColorStop(0.00, `rgba(255,140,25,${Math.min(1, fsGl * 0.68)})`);
      g.addColorStop(0.40, `rgba(255,55,4,${Math.min(1, fsGl * 0.38)})`);
      g.addColorStop(1.00, `rgba(255,12,0,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fsx, fsy, fsR * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Hard core
      ctx.save();
      ctx.shadowColor = 'rgba(255,80,0,0.88)';
      ctx.shadowBlur  = fsR * 2.0 * fsGl;
      ctx.fillStyle   = `rgba(255,168,44,0.94)`;
      ctx.beginPath();
      ctx.arc(fsx, fsy, fsR * 0.54, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Annotation ring (specimen diagram aesthetic)
      ctx.save();
      ctx.strokeStyle = `rgba(255,168,44,${0.28 + fsGl * 0.14})`;
      ctx.lineWidth   = 0.6;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(fsx, fsy, fsR * 1.08, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ============================================================
    // LAYER 7 — TAIL
    // ============================================================
    {
      const tR0 = tRad * (0.62 + n.musclePower * 0.14);
      const tR1 = tRad * 0.62;
      const tR2 = tRad * 0.28;
      const tR3 = tRad * 0.07;

      function bezPt(p0x,p0y,c1x,c1y,c2x,c2y,p3x,p3y,u) {
        const om = 1 - u;
        return {
          x: om*om*om*p0x + 3*om*om*u*c1x + 3*om*u*u*c2x + u*u*u*p3x,
          y: om*om*om*p0y + 3*om*om*u*c1y + 3*om*u*u*c2y + u*u*u*p3y
        };
      }
      const s0 = { x: tbx, y: tby };
      const s1 = bezPt(tbx,tby, tc1x,tc1y, tc2x,tc2y, ttx,tty, 0.33);
      const s2 = bezPt(tbx,tby, tc1x,tc1y, tc2x,tc2y, ttx,tty, 0.66);
      const s3 = { x: ttx, y: tty };

      const tn0 = perp(s0.x, s0.y, s1.x, s1.y, tR0);
      const tn1 = perp(s0.x, s0.y, s2.x, s2.y, tR1);
      const tn2 = perp(s1.x, s1.y, s3.x, s3.y, tR2);
      const tn3 = perp(s2.x, s2.y, s3.x, s3.y, tR3);

      ctx.save();
      const tg = ctx.createLinearGradient(tbx, tby, ttx, tty);
      tg.addColorStop(0.00, rc(top_, 0.90));
      tg.addColorStop(0.28, rc(skin));
      tg.addColorStop(0.70, rc(lerp(skin, dark, 0.44)));
      tg.addColorStop(1.00, rc(dark, 0.90));
      ctx.fillStyle   = tg;
      ctx.strokeStyle = rc(dark, 0.30);
      ctx.lineWidth   = 0.8;

      ctx.beginPath();
      ctx.moveTo(s0.x + tn0.x, s0.y + tn0.y);
      ctx.quadraticCurveTo((s0.x+tn0.x+s1.x+tn1.x)*0.5, (s0.y+tn0.y+s1.y+tn1.y)*0.5, s1.x+tn1.x, s1.y+tn1.y);
      ctx.quadraticCurveTo((s1.x+tn1.x+s2.x+tn2.x)*0.5, (s1.y+tn1.y+s2.y+tn2.y)*0.5, s2.x+tn2.x, s2.y+tn2.y);
      ctx.quadraticCurveTo((s2.x+tn2.x+s3.x+tn3.x)*0.5, (s2.y+tn2.y+s3.y+tn3.y)*0.5, s3.x, s3.y);
      ctx.quadraticCurveTo((s3.x-tn3.x+s2.x-tn2.x)*0.5, (s3.y-tn3.y+s2.y-tn2.y)*0.5, s2.x-tn2.x, s2.y-tn2.y);
      ctx.quadraticCurveTo((s2.x-tn2.x+s1.x-tn1.x)*0.5, (s2.y-tn2.y+s1.y-tn1.y)*0.5, s1.x-tn1.x, s1.y-tn1.y);
      ctx.quadraticCurveTo((s1.x-tn1.x+s0.x-tn0.x)*0.5, (s1.y-tn1.y+s0.y-tn0.y)*0.5, s0.x-tn0.x, s0.y-tn0.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dorsal highlight strip
      {
        const dg = ctx.createLinearGradient(tbx, tby, ttx, tty);
        dg.addColorStop(0.00, rc(lerp(rim, spec, 0.30), 0.50));
        dg.addColorStop(0.55, rc(rim, 0.18));
        dg.addColorStop(1.00, rc(rim, 0.00));
        ctx.strokeStyle = dg;
        ctx.lineWidth   = tR0 * 0.28;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(s0.x + tn0.x * 0.52, s0.y + tn0.y * 0.52);
        ctx.quadraticCurveTo((s0.x+tn0.x*0.50+s1.x+tn1.x*0.50)*0.5, (s0.y+tn0.y*0.50+s1.y+tn1.y*0.50)*0.5, s1.x+tn1.x*0.48, s1.y+tn1.y*0.48);
        ctx.quadraticCurveTo((s1.x+tn1.x*0.48+s2.x+tn2.x*0.44)*0.5, (s1.y+tn1.y*0.48+s2.y+tn2.y*0.44)*0.5, s2.x+tn2.x*0.40, s2.y+tn2.y*0.40);
        ctx.stroke();
      }

      // Tail spines
      {
        const nSpines = 2 + Math.round(n.scaleThickness * 3);
        for (let i = 0; i < nSpines; i++) {
          const u    = 0.08 + (i / (nSpines - 0.5)) * 0.56;
          const sp   = bezPt(tbx,tby, tc1x,tc1y, tc2x,tc2y, ttx,tty, u);
          const uN   = Math.min(u + 0.05, 1);
          const sp2  = bezPt(tbx,tby, tc1x,tc1y, tc2x,tc2y, ttx,tty, uN);
          const sn   = perp(sp.x, sp.y, sp2.x, sp2.y, 1);
          const spR  = tR0 * (1 - u * 0.72);
          const spH  = spR * (1.10 + n.scaleThickness * 1.40);
          const spW  = spR * 0.50;
          const nx_  = sn.x / (Math.hypot(sn.x, sn.y) || 1);
          const ny_  = sn.y / (Math.hypot(sn.x, sn.y) || 1);
          const bx_  = -ny_, by_ = nx_;
          const tipX = sp.x + nx_ * spH, tipY = sp.y + ny_ * spH;
          const spg  = ctx.createLinearGradient(sp.x, sp.y, tipX, tipY);
          spg.addColorStop(0.00, rc(dark, 0.84));
          spg.addColorStop(0.60, rc(lerp(skin, top_, 0.54), 0.72));
          spg.addColorStop(1.00, rc(lerp(bone, spec, 0.22), 0.58));
          ctx.fillStyle   = spg;
          ctx.strokeStyle = rc(dark, 0.22);
          ctx.lineWidth   = 0.65;
          ctx.beginPath();
          ctx.moveTo(sp.x - bx_ * spW, sp.y - by_ * spW);
          ctx.quadraticCurveTo(sp.x + nx_*spH*0.40 - bx_*spW*0.20, sp.y + ny_*spH*0.40 - by_*spW*0.20, tipX, tipY);
          ctx.quadraticCurveTo(sp.x + nx_*spH*0.40 + bx_*spW*0.20, sp.y + ny_*spH*0.40 + by_*spW*0.20, sp.x + bx_*spW, sp.y + by_*spW);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Arrowhead blade
      {
        const bladeLen = (10 + n.tailSize * 22) * sc;
        const bladeW   = (3.5 + n.tailSize * 5.5) * sc;
        const barbLen  = bladeLen * (0.28 + n.boneDensity * 0.26);
        const dx_ = s3.x - s2.x, dy_ = s3.y - s2.y;
        const dl  = Math.hypot(dx_, dy_) || 1;
        const ux_ = dx_/dl, uy_ = dy_/dl;
        const px_ = -uy_, py_ = ux_;
        const tipX = s3.x + ux_*bladeLen, tipY = s3.y + uy_*bladeLen;
        const wLX = s3.x - ux_*bladeLen*0.22 + px_*bladeW;
        const wLY = s3.y - uy_*bladeLen*0.22 + py_*bladeW;
        const wRX = s3.x - ux_*bladeLen*0.22 - px_*bladeW;
        const wRY = s3.y - uy_*bladeLen*0.22 - py_*bladeW;
        const bLX = s3.x - ux_*barbLen + px_*bladeW*0.44;
        const bLY = s3.y - uy_*barbLen + py_*bladeW*0.44;
        const bRX = s3.x - ux_*barbLen - px_*bladeW*0.44;
        const bRY = s3.y - uy_*barbLen - py_*bladeW*0.44;
        const blg = ctx.createLinearGradient(s3.x, s3.y, tipX, tipY);
        blg.addColorStop(0.00, rc(lerp(skin, bone, 0.42), 0.90));
        blg.addColorStop(0.55, rc(bone, 0.84));
        blg.addColorStop(1.00, rc(lerp(bone, spec, 0.28), 0.74));
        ctx.fillStyle   = blg;
        ctx.strokeStyle = rc(dark, 0.44);
        ctx.lineWidth   = 1.0;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(wLX, wLY); ctx.lineTo(bLX, bLY);
        ctx.lineTo(s3.x - ux_*tRad*0.52 + px_*tR3*0.5, s3.y - uy_*tRad*0.52 + py_*tR3*0.5);
        ctx.lineTo(s3.x - ux_*tRad*0.52 - px_*tR3*0.5, s3.y - uy_*tRad*0.52 - py_*tR3*0.5);
        ctx.lineTo(bRX, bRY); ctx.lineTo(wRX, wRY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Blade centerline
        ctx.save();
        ctx.strokeStyle = rc(lerp(bone, spec, 0.48), 0.52);
        ctx.lineWidth   = 0.7;
        ctx.beginPath(); ctx.moveTo(s3.x, s3.y); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // ============================================================
    // LAYER 8 — FRONT LEG (foreground)
    // ============================================================
    {
      ctx.save();
      const flGrad = ctx.createLinearGradient(flHx, flHy, flMx, flMy + H*0.05);
      flGrad.addColorStop(0.00, rc(top_));
      flGrad.addColorStop(0.36, rc(skin));
      flGrad.addColorStop(1.00, rc(dark));

      // Thigh
      const flThighW = legW * 1.20;
      const pfH   = perp(flHx, flHy, flKx, flKy, flThighW);
      const pfK   = perp(flHx, flHy, flKx, flKy, legW * 0.82);
      const flTMx = (flHx + flKx) * 0.5, flTMy = (flHy + flKy) * 0.5;
      const pfMid = perp(flHx, flHy, flKx, flKy, flThighW * 0.92);
      ctx.fillStyle   = flGrad;
      ctx.strokeStyle = rc(dark, 0.30);
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(flHx + pfH.x, flHy + pfH.y);
      ctx.quadraticCurveTo(flTMx + pfMid.x * 1.12, flTMy + pfMid.y * 1.12, flKx + pfK.x, flKy + pfK.y);
      ctx.lineTo(flKx - pfK.x, flKy - pfK.y);
      ctx.quadraticCurveTo(flTMx - pfMid.x * 0.78, flTMy - pfMid.y * 0.78, flHx - pfH.x, flHy - pfH.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Thigh rim
      ctx.save();
      ctx.strokeStyle = rc(rim, 0.20);
      ctx.lineWidth   = legW * 0.16;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(flHx + pfH.x * 0.58, flHy + pfH.y * 0.58);
      ctx.quadraticCurveTo(flTMx + pfMid.x * 0.66, flTMy + pfMid.y * 0.66, flKx + pfK.x * 0.52, flKy + pfK.y * 0.52);
      ctx.stroke();
      ctx.restore();

      // Knee cap
      ctx.beginPath();
      ctx.arc(flKx, flKy, legW * 0.68, 0, Math.PI * 2);
      ctx.fillStyle   = rc(lerp(skin, bone, 0.34), 0.92);
      ctx.fill();
      ctx.strokeStyle = rc(dark, 0.22);
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      // Shin
      const pfsK   = perp(flKx, flKy, flAx, flAy, legW * 0.72);
      const pfsA   = perp(flKx, flKy, flAx, flAy, legW * 0.42);
      const flSMx  = (flKx + flAx) * 0.5, flSMy = (flKy + flAy) * 0.5;
      const pfsMid = perp(flKx, flKy, flAx, flAy, legW * 0.62);
      ctx.fillStyle = flGrad;
      ctx.beginPath();
      ctx.moveTo(flKx + pfsK.x, flKy + pfsK.y);
      ctx.quadraticCurveTo(flSMx + pfsMid.x * 0.88, flSMy + pfsMid.y * 0.88, flAx + pfsA.x, flAy + pfsA.y);
      ctx.lineTo(flAx - pfsA.x, flAy - pfsA.y);
      ctx.quadraticCurveTo(flSMx - pfsMid.x * 0.68, flSMy - pfsMid.y * 0.68, flKx - pfsK.x, flKy - pfsK.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ankle knob
      ctx.beginPath();
      ctx.arc(flAx, flAy, legW * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = rc(lerp(skin, bone, 0.30), 0.88);
      ctx.fill();

      // Metatarsal
      const pfmA = perp(flAx, flAy, flMx, flMy, legW * 0.48);
      const pfmM = perp(flAx, flAy, flMx, flMy, legW * 0.32);
      ctx.fillStyle = rc(lerp(dark, skin, 0.10), 0.94);
      ctx.beginPath();
      ctx.moveTo(flAx + pfmA.x, flAy + pfmA.y);
      ctx.lineTo(flMx + pfmM.x, flMy + pfmM.y);
      ctx.lineTo(flMx - pfmM.x, flMy - pfmM.y);
      ctx.lineTo(flAx - pfmA.x, flAy - pfmA.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Toes × 3
      const flToeAngles = [-0.28, 0.06, 0.40];
      const flToeLen    = legW * 1.36;
      const flToeW      = legW * 0.34;
      for (const ang of flToeAngles) {
        drawToe(flMx, flMy, Math.PI * 0.07 + ang, flToeLen, flToeW);
      }
      ctx.restore();
    }

    // ============================================================
    // LAYER 9 — NECK (3-sample tube, dorsal crest, throat plates)
    // ============================================================
    {
      const bezN = (u) => {
        const om = 1 - u;
        return {
          x: om*om*om*nbx + 3*om*om*u*nc1x + 3*om*u*u*nc2x + u*u*u*nex,
          y: om*om*om*nby + 3*om*om*u*nc1y + 3*om*u*u*nc2y + u*u*u*ney
        };
      };

      const ns0 = { x: nbx, y: nby };
      const ns1 = bezN(0.44);
      const ns2 = { x: nex, y: ney };

      const nr0 = nrBase * (1.0 + musF * 0.08 + br * 0.10);
      const nr1 = nrBase * 0.74;
      const nr2 = nrEnd;

      const nsA = bezN(0.40), nsB = bezN(0.48);
      const pn0 = perp(nbx,   nby,   nc1x,  nc1y,  nr0);
      const pn1 = perp(nsA.x, nsA.y, nsB.x, nsB.y, nr1);
      const pn2 = perp(nc2x,  nc2y,  nex,   ney,   nr2);

      ctx.save();

      // Main tube
      const ng = ctx.createLinearGradient(nbx, nby, nex, ney);
      ng.addColorStop(0.00, rc(lerp(skin, dark, 0.18)));
      ng.addColorStop(0.25, rc(skin));
      ng.addColorStop(0.62, rc(lerp(skin, top_, 0.60)));
      ng.addColorStop(1.00, rc(top_));
      ctx.fillStyle   = ng;
      ctx.strokeStyle = rc(dark, 0.38);
      ctx.lineWidth   = 1.0;

      ctx.beginPath();
      ctx.moveTo(ns0.x + pn0.x, ns0.y + pn0.y);
      ctx.quadraticCurveTo((ns0.x+pn0.x+ns1.x+pn1.x)*0.5, (ns0.y+pn0.y+ns1.y+pn1.y)*0.5, ns1.x+pn1.x, ns1.y+pn1.y);
      ctx.quadraticCurveTo((ns1.x+pn1.x+ns2.x+pn2.x)*0.5, (ns1.y+pn1.y+ns2.y+pn2.y)*0.5, ns2.x+pn2.x, ns2.y+pn2.y);
      ctx.quadraticCurveTo(ns2.x, ns2.y, ns2.x - pn2.x, ns2.y - pn2.y);
      ctx.quadraticCurveTo((ns2.x-pn2.x+ns1.x-pn1.x)*0.5, (ns2.y-pn2.y+ns1.y-pn1.y)*0.5, ns1.x-pn1.x, ns1.y-pn1.y);
      ctx.quadraticCurveTo((ns1.x-pn1.x+ns0.x-pn0.x)*0.5, (ns1.y-pn1.y+ns0.y-pn0.y)*0.5, ns0.x-pn0.x, ns0.y-pn0.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dorsal rim highlight
      {
        const dhg = ctx.createLinearGradient(nbx, nby, nex, ney);
        dhg.addColorStop(0.00, rc(rim, 0.00));
        dhg.addColorStop(0.28, rc(lerp(rim, spec, 0.30), 0.38));
        dhg.addColorStop(0.68, rc(rim, 0.16));
        dhg.addColorStop(1.00, rc(rim, 0.00));
        ctx.strokeStyle = dhg;
        ctx.lineWidth   = nr0 * 0.26;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(ns0.x - pn0.x * 0.50, ns0.y - pn0.y * 0.50);
        ctx.quadraticCurveTo((ns0.x-pn0.x*0.48+ns1.x-pn1.x*0.48)*0.5, (ns0.y-pn0.y*0.48+ns1.y-pn1.y*0.48)*0.5, ns1.x-pn1.x*0.48, ns1.y-pn1.y*0.48);
        ctx.quadraticCurveTo((ns1.x-pn1.x*0.48+ns2.x-pn2.x*0.44)*0.5, (ns1.y-pn1.y*0.48+ns2.y-pn2.y*0.44)*0.5, ns2.x-pn2.x*0.44, ns2.y-pn2.y*0.44);
        ctx.stroke();
      }

      // Ventral throat plate band
      {
        const f = 0.22;
        const vg = ctx.createLinearGradient(nbx, nby, nex, ney);
        vg.addColorStop(0.00, rc(belly, 0.00));
        vg.addColorStop(0.18, rc(belly, 0.66));
        vg.addColorStop(0.70, rc(belly, 0.48));
        vg.addColorStop(1.00, rc(belly, 0.16));
        ctx.fillStyle = vg;
        ctx.beginPath();
        ctx.moveTo(ns0.x - pn0.x*f, ns0.y - pn0.y*f);
        ctx.quadraticCurveTo((ns0.x-pn0.x*f+ns1.x-pn1.x*f)*0.5, (ns0.y-pn0.y*f+ns1.y-pn1.y*f)*0.5, ns1.x-pn1.x*f, ns1.y-pn1.y*f);
        ctx.quadraticCurveTo((ns1.x-pn1.x*f+ns2.x-pn2.x*f)*0.5, (ns1.y-pn1.y*f+ns2.y-pn2.y*f)*0.5, ns2.x-pn2.x*f, ns2.y-pn2.y*f);
        ctx.quadraticCurveTo(ns2.x, ns2.y, ns2.x+pn2.x*f, ns2.y+pn2.y*f);
        ctx.quadraticCurveTo((ns2.x+pn2.x*f+ns1.x+pn1.x*f)*0.5, (ns2.y+pn2.y*f+ns1.y+pn1.y*f)*0.5, ns1.x+pn1.x*f, ns1.y+pn1.y*f);
        ctx.quadraticCurveTo((ns1.x+pn1.x*f+ns0.x+pn0.x*f)*0.5, (ns1.y+pn1.y*f+ns0.y+pn0.y*f)*0.5, ns0.x+pn0.x*f, ns0.y+pn0.y*f);
        ctx.closePath();
        ctx.fill();

        // Throat scale arcs
        if (n.scaleThickness > 0.15) {
          const nPl  = 3 + Math.floor(n.scaleThickness * 4);
          const plOp = (n.scaleThickness - 0.15) * 0.28;
          ctx.strokeStyle = rc(lerp(belly, spec, 0.20), plOp);
          ctx.lineWidth   = 0.58;
          for (let pi = 0; pi < nPl; pi++) {
            const pu  = 0.10 + pi / (nPl - 0.5) * 0.76;
            const pp  = bezN(pu);
            const pu2 = Math.min(pu + 0.05, 1);
            const ppn = perp(pp.x, pp.y, bezN(pu2).x, bezN(pu2).y, 1);
            const ppL = Math.hypot(ppn.x, ppn.y) || 1;
            const pnx = ppn.x/ppL, pny = ppn.y/ppL;
            const rr  = nr0 * (1 - pu * 0.44) * 0.36;
            const bA  = Math.atan2(pny, pnx);
            ctx.beginPath();
            ctx.arc(pp.x - pnx*rr*0.10, pp.y - pny*rr*0.10, rr, bA + Math.PI*0.58, bA - Math.PI*0.58 + Math.PI*2);
            ctx.stroke();
          }
        }
      }

      // Dorsal neck crest fins
      {
        const nFinN = 3 + Math.floor(n.scaleThickness * 3);
        for (let fi = 0; fi < nFinN; fi++) {
          const fu  = fi / (nFinN - 0.1) * 0.92;
          const fp  = bezN(fu);
          const fp2 = bezN(Math.min(fu + 0.07, 1));
          const fnR = perp(fp.x, fp.y, fp2.x, fp2.y, 1);
          const fnL = Math.hypot(fnR.x, fnR.y) || 1;
          const fnx = -fnR.x / fnL, fny = -fnR.y / fnL;
          const fbt = -fny, fbty = fnx;
          const rAtU = nr0 * (1 - fu * 0.55);
          const fH   = rAtU * (0.52 + n.boneDensity * 0.86) * Math.sin((fi + 0.5) / nFinN * Math.PI);
          const fW   = rAtU * 0.28;
          const tipX = fp.x + fnx * fH, tipY = fp.y + fny * fH;
          const ffg  = ctx.createLinearGradient(fp.x, fp.y, tipX, tipY);
          ffg.addColorStop(0.0, rc(dark, 0.84));
          ffg.addColorStop(0.6, rc(lerp(top_, bone, 0.46), 0.72));
          ffg.addColorStop(1.0, rc(lerp(bone, spec, 0.22), 0.56));
          ctx.fillStyle   = ffg;
          ctx.strokeStyle = rc(dark, 0.22);
          ctx.lineWidth   = 0.62;
          ctx.beginPath();
          ctx.moveTo(fp.x - fbt*fW, fp.y - fbty*fW);
          ctx.quadraticCurveTo(fp.x+fnx*fH*0.40-fbt*fW*0.18, fp.y+fny*fH*0.40-fbty*fW*0.18, tipX, tipY);
          ctx.quadraticCurveTo(fp.x+fnx*fH*0.40+fbt*fW*0.18, fp.y+fny*fH*0.40+fbty*fW*0.18, fp.x+fbt*fW, fp.y+fbty*fW);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Neck muscle ridges
      if (n.musclePower > 0.22) {
        const mOp = (n.musclePower - 0.22) * 0.22;
        ctx.strokeStyle = rc(lerp(rim, spec, 0.14), mOp);
        ctx.lineWidth   = 0.58;
        ctx.lineCap     = 'round';
        for (const side of [0.44, -0.44]) {
          const sp0 = bezN(0.08), sp1 = bezN(0.45), sp2 = bezN(0.88);
          const sn0 = perp(nbx, nby, nc1x, nc1y, nr0 * side);
          const sn1 = perp(nsA.x, nsA.y, nsB.x, nsB.y, nr1 * side);
          const snA = bezN(0.84), snB = bezN(0.92);
          const sn2 = perp(snA.x, snA.y, snB.x, snB.y, nr2 * side);
          ctx.beginPath();
          ctx.moveTo(sp0.x + sn0.x, sp0.y + sn0.y);
          ctx.quadraticCurveTo((sp0.x+sn0.x+sp1.x+sn1.x)*0.5, (sp0.y+sn0.y+sp1.y+sn1.y)*0.5, sp1.x+sn1.x, sp1.y+sn1.y);
          ctx.quadraticCurveTo((sp1.x+sn1.x+sp2.x+sn2.x)*0.5, (sp1.y+sn1.y+sp2.y+sn2.y)*0.5, sp2.x+sn2.x, sp2.y+sn2.y);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // ============================================================
    // LAYER 10 — HEAD
    // ============================================================
    {
      ctx.save();

      // Head base gradient
      const hg = ctx.createLinearGradient(hx - hs, hy - hs * 0.8, hx + hs * 0.5, hy + hs);
      hg.addColorStop(0.00, rc(lerp(top_, spec, 0.08)));
      hg.addColorStop(0.12, rc(top_));
      hg.addColorStop(0.44, rc(skin));
      hg.addColorStop(1.00, rc(dark));
      ctx.fillStyle   = hg;
      ctx.strokeStyle = rc(dark, 0.52);
      ctx.lineWidth   = 1.4;

      ctx.beginPath();
      ctx.moveTo(nex, ney);
      // Cranium arch
      ctx.bezierCurveTo(
        hx - hs * 0.22, hy - hs * 0.74,
        crx - hs * 0.10, cry + hs * 0.10,
        crx, cry
      );
      // Crown → snout bridge
      ctx.bezierCurveTo(
        crx + hs * 0.42, cry - hs * 0.08,
        stx - hs * 0.22, sty - hs * 0.24,
        stx, sty
      );
      // Snout tip → jaw point
      ctx.bezierCurveTo(
        stx + hs * 0.08, sty + hs * 0.16,
        jx + hs * 0.08,  jy  - hs * 0.08,
        jx, jy
      );
      // Jaw → chin → throat (smooth transition back to neck)
      ctx.bezierCurveTo(
        jx - hs * 0.34, jy + hs * 0.10,
        hx + hs * 0.10, hy + hs * 0.50,
        hx - hs * 0.14, hy + hs * 0.38
      );
      // Throat connects cleanly to neck end
      ctx.bezierCurveTo(
        nc2x - W * 0.010, nc2y + H * 0.062,
        nc1x - W * 0.014, nc1y + H * 0.052,
        nbx  - W * 0.010, nby  + H * 0.068
      );
      ctx.fill();
      ctx.stroke();

      // Lower jaw plane / shadow
      ctx.fillStyle = rc(dark, 0.24);
      ctx.beginPath();
      ctx.moveTo(hx + hs * 0.08, hy + hs * 0.12);
      ctx.bezierCurveTo(hx + hs * 0.56, hy + hs * 0.22, stx - hs * 0.24, sty + hs * 0.06, jx, jy);
      ctx.bezierCurveTo(jx - hs * 0.32, jy + hs * 0.09, hx + hs * 0.10, hy + hs * 0.40, hx + hs * 0.08, hy + hs * 0.12);
      ctx.fill();

      // Cheek plate highlight
      const chkG = ctx.createRadialGradient(hx + hs * 0.22, hy - hs * 0.12, 0, hx + hs * 0.22, hy - hs * 0.12, hs * 0.50);
      chkG.addColorStop(0.0, rc(lerp(rim, spec, 0.28), 0.30));
      chkG.addColorStop(1.0, rc(rim, 0.00));
      ctx.fillStyle = chkG;
      ctx.beginPath();
      ctx.ellipse(hx + hs * 0.22, hy - hs * 0.12, hs * 0.46, hs * 0.34, 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Snout ridge highlight
      ctx.strokeStyle = rc(lerp(rim, spec, 0.32), 0.36);
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(crx + hs * 0.10, cry + hs * 0.24);
      ctx.bezierCurveTo(crx + hs * 0.28, cry + hs * 0.06, stx - hs * 0.26, sty - hs * 0.10, stx - hs * 0.06, sty - hs * 0.02);
      ctx.stroke();

      // Jaw line definition
      ctx.strokeStyle = rc(dark, 0.38);
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.moveTo(hx + hs * 0.10, hy + hs * 0.16);
      ctx.bezierCurveTo(hx + hs * 0.48, hy + hs * 0.22, stx - hs * 0.26, sty + hs * 0.02, jx, jy);
      ctx.stroke();

      ctx.restore();
    }

    // ============================================================
    // LAYER 11 — HORN(S)
    // ============================================================
    {
      ctx.save();
      const hornBase = lerp(skin, bone, 0.52);

      // Main horn — elegant swept curve
      const hg2 = ctx.createLinearGradient(hx - hs*0.08, hy - hs*0.44, hx + hs*0.09, hy - hs*0.44 - hnL);
      hg2.addColorStop(0.0, rc(hornBase, 0.90));
      hg2.addColorStop(0.6, rc(bone, 0.86));
      hg2.addColorStop(1.0, rc(lerp(bone, spec, 0.30), 0.78));
      ctx.fillStyle   = hg2;
      ctx.strokeStyle = rc(dark, 0.44);
      ctx.lineWidth   = 0.75;
      ctx.beginPath();
      ctx.moveTo(hx - hs * 0.10, hy - hs * 0.42);
      ctx.bezierCurveTo(
        hx - hs * 0.26, hy - hs * 0.44 - hnL * 0.34,
        hx + hs * 0.04, hy - hs * 0.44 - hnL * 0.70,
        hx + hs * 0.08, hy - hs * 0.44 - hnL
      );
      ctx.bezierCurveTo(
        hx + hs * 0.06, hy - hs * 0.44 - hnL * 0.74,
        hx + hs * 0.22, hy - hs * 0.44 - hnL * 0.44,
        hx + hs * 0.22, hy - hs * 0.38
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Horn specular edge
      ctx.strokeStyle = rc(lerp(bone, spec, 0.50), 0.42);
      ctx.lineWidth   = 0.45;
      ctx.beginPath();
      ctx.moveTo(hx - hs * 0.05, hy - hs * 0.44);
      ctx.bezierCurveTo(hx - hs * 0.18, hy - hs * 0.52 - hnL * 0.28, hx - hs * 0.02, hy - hs * 0.46 - hnL * 0.64, hx + hs * 0.08, hy - hs * 0.44 - hnL);
      ctx.stroke();

      // Secondary horn
      ctx.globalAlpha = 0.58;
      const h2L = hnL * 0.52;
      ctx.beginPath();
      ctx.moveTo(hx - hs * 0.26, hy - hs * 0.30);
      ctx.bezierCurveTo(hx - hs * 0.38, hy - hs * 0.30 - h2L * 0.34, hx - hs * 0.20, hy - hs * 0.30 - h2L * 0.70, hx - hs * 0.16, hy - hs * 0.30 - h2L);
      ctx.bezierCurveTo(hx - hs * 0.12, hy - hs * 0.30 - h2L * 0.60, hx - hs * 0.04, hy - hs * 0.30 - h2L * 0.28, hx - hs * 0.04, hy - hs * 0.24);
      ctx.closePath();
      ctx.fillStyle = hg2;
      ctx.fill();
      ctx.restore();
    }

    // ============================================================
    // LAYER 12 — EYE
    // ============================================================
    {
      const eyeFlick = 0.78 + Math.sin(t * 1.18) * 0.12;

      // Glow halo
      ctx.save();
      ctx.shadowColor = rc(eye_c, 0.88);
      ctx.shadowBlur  = eR * 3.8 * eyeFlick;
      ctx.fillStyle   = rc(eye_c);
      ctx.beginPath();
      ctx.arc(eX, eY, eR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Iris
      const eyeG = ctx.createRadialGradient(eX, eY, 0, eX, eY, eR);
      eyeG.addColorStop(0.0, 'rgba(160,255,210,0.98)');
      eyeG.addColorStop(0.7, 'rgba(100,255,185,0.95)');
      eyeG.addColorStop(1.0, 'rgba(60,180,130,0.88)');
      ctx.save();
      ctx.fillStyle = eyeG;
      ctx.beginPath();
      ctx.arc(eX, eY, eR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Vertical slit pupil
      ctx.save();
      ctx.fillStyle = 'rgba(3, 8, 6, 0.97)';
      ctx.beginPath();
      ctx.ellipse(eX, eY, eR * 0.20, eR * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Specular highlight
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.76)';
      ctx.beginPath();
      ctx.arc(eX - eR * 0.24, eY - eR * 0.26, eR * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Eye ring
      ctx.save();
      ctx.strokeStyle = rc(dark, 0.50);
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.arc(eX, eY, eR + 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ============================================================
    // LAYER 13 — NOSTRIL
    // ============================================================
    {
      ctx.save();
      ctx.fillStyle = rc(dark, 0.55);
      ctx.beginPath();
      ctx.ellipse(stx - hs * 0.50, sty - hs * 0.08, hs * 0.066, hs * 0.046, 0.44, 0, Math.PI * 2);
      ctx.fill();
      // Nostril rim
      ctx.strokeStyle = rc(lerp(dark, skin, 0.30), 0.40);
      ctx.lineWidth   = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    // ============================================================
    // LAYER 14 — SCALE ARMOR DETAIL
    // ============================================================
    if (n.scaleThickness > 0.25) {
      const op = (n.scaleThickness - 0.25) * 0.46;
      ctx.save();
      ctx.strokeStyle = rc(lerp(rim, spec, 0.20), op);
      ctx.lineWidth   = 0.85;
      for (let i = 0; i < 5; i++) {
        const px = ox + bw * (0.40 - i * 0.112);
        const py = oy - bh * (0.60 + i * 0.03);
        ctx.beginPath();
        ctx.ellipse(px, py, bw * 0.095, bh * 0.20, -0.22, 0, Math.PI * 1.08);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ============================================================
    // LAYER 15 — LAB ANNOTATION OVERLAY (specimen diagram)
    // ============================================================
    {
      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = 'rgba(0, 200, 155, 0.90)';
      ctx.fillStyle   = 'rgba(0, 200, 155, 0.72)';
      ctx.lineWidth   = 0.55;
      ctx.setLineDash([2, 5]);

      // Wing span callout line
      ctx.beginPath();
      ctx.moveTo(wrx, wry - H * 0.028);
      ctx.lineTo(wf2x, wf2y - H * 0.018);
      ctx.stroke();

      // Body length callout (tail to head)
      ctx.beginPath();
      ctx.moveTo(tbx + bw * 0.05, oy + bh * 1.18);
      ctx.lineTo(hx + hs * 0.80, oy + bh * 1.18);
      ctx.stroke();

      // Neck callout
      ctx.beginPath();
      ctx.moveTo(nbx + W * 0.018, nby - H * 0.018);
      ctx.lineTo(nex + W * 0.018, ney - H * 0.018);
      ctx.stroke();

      ctx.setLineDash([]);

      // Small tick marks at ends of body length callout
      const tickH = 4;
      ctx.lineWidth = 0.55;
      for (const tx2 of [tbx + bw * 0.05, hx + hs * 0.80]) {
        ctx.beginPath();
        ctx.moveTo(tx2, oy + bh * 1.18 - tickH);
        ctx.lineTo(tx2, oy + bh * 1.18 + tickH);
        ctx.stroke();
      }

      // Body center crosshair (very subtle)
      ctx.globalAlpha = 0.10;
      ctx.lineWidth   = 0.5;
      ctx.setLineDash([1, 6]);
      ctx.beginPath();
      ctx.moveTo(ox, oy - bh * 1.4); ctx.lineTo(ox, oy + bh * 1.6); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox - bw * 1.4, oy); ctx.lineTo(ox + bw * 1.6, oy); ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }
  }

  // ============================================================
  // BATTLE DRAW — two dragons facing each other
  // ============================================================
  function drawBattle(canvas, pTraits, pTint, eTraits, eTint, animTime) {
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');

    // Battle background
    ctx.fillStyle = 'rgba(8, 5, 18, 0.96)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(50, 0, 60, 0.22)';
    ctx.lineWidth = 0.5;
    const gs = 28;
    for (let gx = 0; gx < W; gx += gs) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += gs) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    const bsz = 24;
    ctx.strokeStyle = 'rgba(180, 30, 220, 0.55)';
    ctx.lineWidth = 2.5;
    for (const [cx2, cy2, sx, sy] of [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]]) {
      ctx.beginPath(); ctx.moveTo(cx2 + sx*bsz, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + sy*bsz); ctx.stroke();
    }
    const div = ctx.createLinearGradient(W*0.5 - 2, 0, W*0.5 + 2, 0);
    div.addColorStop(0, 'rgba(200,40,30,0)');
    div.addColorStop(0.5, 'rgba(200,40,30,0.38)');
    div.addColorStop(1, 'rgba(200,40,30,0)');
    ctx.fillStyle = div;
    ctx.fillRect(W*0.5 - 2, H*0.06, 4, H*0.88);

    // Draw each dragon onto offscreen canvas, then blit
    const oc = document.createElement('canvas');
    oc.width = W; oc.height = H;
    const sc = 0.46;

    draw(oc, pTraits, pTint, animTime);
    ctx.save();
    ctx.translate(W * 0.03, H * 0.06);
    ctx.scale(sc, sc);
    ctx.drawImage(oc, 0, 0);
    ctx.restore();

    draw(oc, eTraits, eTint, animTime);
    ctx.save();
    ctx.translate(W * 0.97, H * 0.06);
    ctx.scale(-sc, sc);
    ctx.drawImage(oc, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.textAlign  = 'center';
    ctx.font       = `bold ${Math.round(H * 0.072)}px monospace`;
    ctx.shadowColor = 'rgba(220,40,20,0.90)';
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = 'rgba(255,80,50,0.92)';
    ctx.fillText('VS', W * 0.5, H * 0.55);
    ctx.restore();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function create(width, height) {
    const c = document.createElement('canvas');
    c.width  = width  || 1024;
    c.height = height || 700;
    return c;
  }

  return { draw, drawBattle, create };

})();
