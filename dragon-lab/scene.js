// ============================================================
// Dragon Engineering Lab — Three.js Scene (v3)
// Multi-zone colour system, personality, smooth transitions,
// reward feedback, and emissive eye glow.
// ============================================================

window.Scene = (function () {
  'use strict';

  let renderer, scene, camera, controls, clock;
  let currentMode = 'lab';
  let labObjects   = [];
  let overlay, _container;

  // Each "instance" = { model, materials, meshes }
  let playerInst = null;
  let enemyInst  = null;
  let glbLoaded  = false;

  // ── Multi-zone colour state ──────────────────────────────
  // Colors object shape: { body, wings, accent, eye }
  let _pColorTarget  = { body: '#3a6e5a', wings: null, accent: null, eye: null };
  let _pColorCurrent = { body: '#3a6e5a', wings: null, accent: null, eye: null };
  let _pColorT = 1;     // 1 = at target; 0 = start of transition

  let _eColorTarget  = { body: '#7a2828', wings: null, accent: null, eye: null };

  // ── Trait state ──────────────────────────────────────────
  let _pTraits = null, _eTraits = null;

  // ── Lighting refs ────────────────────────────────────────
  let rimLight = null, fireLight = null;

  // ── Reward feedback ──────────────────────────────────────
  let _rewardTimer = 0;   // counts down from 0.28s on trait change
  let _rewardColor = new THREE.Color(0x4af0c0);

  // ── Personality / blink state ─────────────────────────────
  let _pBlink = { timer: 3.5 + Math.random() * 4, phase: 0, opening: false, closing: false };
  let _eBlink = { timer: 2.0 + Math.random() * 3, phase: 0, opening: false, closing: false };

  // ── Battle positions ──────────────────────────────────────
  let pPos = new THREE.Vector3(-2.5, 1.5, 0);
  let ePos = new THREE.Vector3( 2.5, 1.5, 0);
  let lungeAnims = [], fireParticles = [], impactFlashes = [];

  let _glowRing   = null;
  let _emberTimer = 0;

  // ── GLB source data ───────────────────────────────────────
  let _srcDragonRoot = null;
  let _srcMeshData   = [];
  let _srcModelMeta  = {};

  // ============================================================
  // COLOUR HELPERS
  // ============================================================
  function normalizeColors(input) {
    if (!input) return { body: '#3a6e5a', wings: null, accent: null, eye: null };
    if (typeof input === 'string') return { body: input, wings: null, accent: null, eye: null };
    return {
      body:   input.body   || '#3a6e5a',
      wings:  input.wings  || null,
      accent: input.accent || null,
      eye:    input.eye    || null,
    };
  }

  // Lerp between two color zone objects.  t=0 → a, t=1 → b.
  function lerpColors(a, b, t) {
    const lerp1 = (ca, cb) => {
      const c1 = new THREE.Color(ca || a.body || '#3a6e5a');
      const c2 = new THREE.Color(cb || b.body || '#3a6e5a');
      return '#' + c1.lerp(c2, t).getHexString();
    };
    return {
      body:   lerp1(a.body,   b.body),
      wings:  (a.wings  || b.wings)  ? lerp1(a.wings,  b.wings)  : null,
      accent: (a.accent || b.accent) ? lerp1(a.accent, b.accent) : null,
      eye:    (a.eye    || b.eye)    ? lerp1(a.eye,    b.eye)    : null,
    };
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function ss(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function normTraits(traits) {
    const n = {};
    if (!window.DragonData) return n;
    DragonData.TRAITS.forEach(tr => {
      n[tr.id] = Math.max(0, Math.min(1, (traits[tr.id] - tr.min) / (tr.max - tr.min)));
    });
    return n;
  }

  function traitHash(traits) {
    if (!traits || !window.DragonData) return '';
    return DragonData.TRAITS.map(tr => Math.round((traits[tr.id] || 0) * 10)).join(',');
  }

  // ============================================================
  // INIT
  // ============================================================
  function init(container) {
    _container = container;
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.style.position = 'relative';
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.FogExp2(0x06060f, 0.045);

    camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 2.2, 7.5);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.minDistance = 2;
    controls.maxDistance = 22;
    controls.update();

    setupLabLighting();
    setupLabFloor();
    loadDragonGLB();

    overlay = document.createElement('canvas');
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:none';
    container.appendChild(overlay);
    resizeOverlay();

    animate();
    window.addEventListener('resize', () => resize(container));
  }

  function resizeOverlay() {
    if (!overlay || !_container) return;
    overlay.width  = _container.clientWidth  || 800;
    overlay.height = _container.clientHeight || 500;
  }

  // ============================================================
  // LOAD GLB — builds player instance, stores source data
  // ============================================================
  function loadDragonGLB() {
    if (!THREE.GLTFLoader) return;
    const loader = new THREE.GLTFLoader();
    loader.load('assets/dragon.glb', (gltf) => {
      const root = gltf.scene;

      const box  = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      const sc = 2.8 / size.y;

      _srcModelMeta = {
        baseScale:    sc,
        meshMinY:     box.min.y,
        meshCentreX:  (box.min.x + box.max.x) / 2,
        meshCentreZ:  (box.min.z + box.max.z) / 2,
      };

      _srcDragonRoot = root;
      _srcMeshData   = [];

      root.traverse((child) => {
        if (!child.isMesh) return;
        const geo  = child.geometry;
        const attr = geo.attributes.position;
        const n    = attr.count;

        const origPos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          origPos[i*3]   = attr.getX(i);
          origPos[i*3+1] = attr.getY(i);
          origPos[i*3+2] = attr.getZ(i);
        }

        geo.computeBoundingBox();

        _srcMeshData.push({
          origPos,
          weights:  computeDeformWeights(origPos, n),
          localBox: geo.boundingBox.clone(),
        });
      });

      glbLoaded = true;

      playerInst = buildInstance();
      positionInstance(playerInst, 0, 0, 0, Math.PI * 0.10);
      scene.add(playerInst.model);

      if (_pTraits) applyTraitsToInstance(playerInst, _pTraits, _pColorTarget, '_p');
      else          paintVertexColors(playerInst, _pColorTarget);

    }, undefined, (err) => console.warn('GLB load failed:', err));
  }

  // ============================================================
  // BUILD INSTANCE
  // ============================================================
  function buildInstance() {
    const meta  = _srcModelMeta;
    const model = new THREE.Group();

    model.userData.baseScale   = meta.baseScale;
    model.userData.meshMinY    = meta.meshMinY;
    model.userData.meshCentreX = meta.meshCentreX;
    model.userData.meshCentreZ = meta.meshCentreZ;
    model.userData.baseRotY    = 0;
    model.userData.metabRate   = 0.9;
    model.userData.muscleAmp   = 0.04;
    model.userData._fireGlow   = { color: new THREE.Color(1, 0.35, 0), amt: 0 };

    const materials = [], meshes = [];
    let idx = 0;

    _srcDragonRoot.traverse((child) => {
      if (!child.isMesh) return;
      const src = _srcMeshData[idx++];
      if (!src) return;

      const geo = child.geometry.clone();

      const posAttr = geo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        posAttr.setXYZ(i, src.origPos[i*3], src.origPos[i*3+1], src.origPos[i*3+2]);
      }
      posAttr.needsUpdate = true;

      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(posAttr.count * 3), 3));

      const mat = new THREE.MeshToonMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      mesh.userData.origPos  = src.origPos;
      mesh.userData.weights  = src.weights;
      mesh.userData.localBox = src.localBox;

      model.add(mesh);
      materials.push(mat);
      meshes.push(mesh);
    });

    addEyes(model);
    return { model, materials, meshes };
  }

  function positionInstance(inst, x, y, z, rotY) {
    const meta = _srcModelMeta;
    const sc   = meta.baseScale;
    inst.model.scale.setScalar(sc);
    inst.model.position.set(
      x + -meta.meshCentreX * sc,
      y + -meta.meshMinY    * sc,
      z + -meta.meshCentreZ * sc
    );
    inst.model.userData.worldOffsetX = x;
    inst.model.userData.worldOffsetZ = z;
    inst.model.userData.baseRotY     = rotY;
    inst.model.rotation.y = rotY;
  }

  // ============================================================
  // EYE SPHERES — emissive glow iris, blink-ready groups
  // ============================================================
  function addEyes(model) {
    const eyePositions = [
      [-0.13,  0.50,  0.80],
      [ 0.13,  0.50,  0.80],
    ];

    const eyes = [];
    eyePositions.forEach(([ex, ey, ez]) => {
      const group = new THREE.Group();
      group.position.set(ex, ey, ez);

      // Sclera — white sphere
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 12, 10),
        new THREE.MeshToonMaterial({ color: 0xffffff })
      );

      // Iris — emissive so it glows visibly
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.054, 12, 10),
        new THREE.MeshToonMaterial({
          color:             new THREE.Color(0x3a6e5a),
          emissive:          new THREE.Color(0x1a4a30),
          emissiveIntensity: 0.6,
        })
      );
      iris.position.z = 0.030;

      // Pupil — dark slit
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 8, 6),
        new THREE.MeshToonMaterial({ color: 0x040406 })
      );
      pupil.position.z = 0.054;

      group.add(sclera, iris, pupil);
      model.add(group);
      eyes.push({ group, iris, sclera, pupil });
    });

    model.userData.eyes = eyes;
  }

  function updateEyeColor(model, eyeHex) {
    const eyes = model.userData.eyes;
    if (!eyes) return;
    const tint = new THREE.Color(eyeHex);
    const hsl  = {};
    tint.getHSL(hsl);

    // Iris: vibrant, saturated
    const irisCol = new THREE.Color().setHSL(
      hsl.h,
      Math.min(1, hsl.s * 1.30),
      Math.min(0.72, Math.max(0.36, hsl.l * 1.18))
    );
    // Emissive: bright, saturated glow
    const emissiveCol = new THREE.Color().setHSL(hsl.h, 0.95, 0.52);

    eyes.forEach(({ iris }) => {
      iris.material.color.copy(irisCol);
      iris.material.emissive.copy(emissiveCol);
      iris.material.emissiveIntensity = 0.60;
      iris.material.needsUpdate = true;
    });
  }

  // ============================================================
  // BLINK ANIMATION — eye groups scale Y to simulate lid closure
  // ============================================================
  function updateBlink(blink, model, delta) {
    if (!blink.closing && !blink.opening) {
      blink.timer -= delta;
      if (blink.timer <= 0) {
        blink.closing = true;
        blink.phase = 0;
      }
    }
    if (blink.closing) {
      blink.phase = Math.min(1, blink.phase + delta / 0.065);
      if (blink.phase >= 1) {
        blink.closing = false;
        blink.opening = true;
      }
    }
    if (blink.opening) {
      blink.phase = Math.max(0, blink.phase - delta / 0.110);
      if (blink.phase <= 0) {
        blink.opening = false;
        blink.timer = 2.5 + Math.random() * 4.5;
      }
    }

    const eyes = model && model.userData.eyes;
    if (eyes) {
      const lidClose = blink.phase * blink.phase;  // ease-in closure
      eyes.forEach(({ group }) => {
        group.scale.y = Math.max(0.05, 1 - lidClose * 0.93);
      });
    }
  }

  // ============================================================
  // DEFORMATION WEIGHTS
  // ============================================================
  function computeDeformWeights(origPos, n) {
    const wWing     = new Float32Array(n);
    const wNeck     = new Float32Array(n);
    const wTail     = new Float32Array(n);
    const wFrontLeg = new Float32Array(n);
    const wHindLeg  = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const x = origPos[i*3], y = origPos[i*3+1], z = origPos[i*3+2];
      wWing[i]     = ss(0.26, 0.42, Math.abs(x)) * ss(-0.28, 0.06, y);
      wNeck[i]     = ss(0.24, 0.52, z)            * ss(-0.12, 0.14, y);
      wTail[i]     = ss(-0.38, -0.65, z);
      wFrontLeg[i] = ss(-0.16, -0.46, y)          * ss(0.06, -0.14, z);
      wHindLeg[i]  = ss(-0.10, -0.38, y)          * ss(-0.05, 0.20, z) * (1 - ss(0.42, 0.62, z));
    }
    return { wWing, wNeck, wTail, wFrontLeg, wHindLeg };
  }

  // ============================================================
  // VERTEX DEFORMATION
  // ============================================================
  function applyDeformation(mesh, n) {
    const { origPos, weights: w } = mesh.userData;
    if (!origPos) return;

    const attr  = mesh.geometry.attributes.position;
    const count = attr.count;

    const wingW   = 0.45 + (n.wingspan   || 0.5) * 1.10;
    const wingA   = 0.55 + (n.wingArea   || 0.5) * 0.90;
    const neckL   = 0.50 + (n.neckLength || 0.5) * 1.00;
    const tailS   = 0.40 + (n.tailSize   || 0.5) * 1.20;
    const legH    = 0.65 + (n.musclePower|| 0.5) * 0.70;
    const bulkX   = 0.72 + (n.bodyMass   || 0.5) * 0.56;
    const bulkZ   = 0.78 + (n.musclePower|| 0.5) * 0.44;
    const bulkY   = 0.82 + (n.boneDensity|| 0.5) * 0.36;

    const WING_ROOT = 0.26, NECK_BASE = 0.24, TAIL_ROOT = -0.38, LEG_HIP_Y = -0.16;

    for (let i = 0; i < count; i++) {
      const ox = origPos[i*3], oy = origPos[i*3+1], oz = origPos[i*3+2];
      const wW = w.wWing[i], wN = w.wNeck[i], wT = w.wTail[i];
      const wFL = w.wFrontLeg[i], wHL = w.wHindLeg[i];
      const wB  = Math.max(0, 1 - wW - wN - wT - wFL - wHL);

      let dx = 0, dy = 0, dz = 0;

      if (wW > 0.001) {
        const sign  = ox >= 0 ? 1 : -1;
        const pivot = sign * WING_ROOT;
        dx += (pivot + (ox - pivot) * wingW - ox) * wW;
        dy += (oy * wingA - oy) * wW;
      }
      if (wN > 0.001) dz += (NECK_BASE + (oz - NECK_BASE) * neckL - oz) * wN;
      if (wT > 0.001) dz += (TAIL_ROOT + (oz - TAIL_ROOT) * tailS - oz) * wT;
      if (wFL > 0.001) dy += (LEG_HIP_Y + (oy - LEG_HIP_Y) * legH - oy) * wFL;
      if (wHL > 0.001) dy += (LEG_HIP_Y + (oy - LEG_HIP_Y) * legH - oy) * wHL;
      if (wB  > 0.001) {
        dx += ox * (bulkX - 1) * wB;
        dz += oz * (bulkZ - 1) * wB;
        dy += oy * (bulkY - 1) * wB;
      }

      attr.setXYZ(i, ox + dx, oy + dy, oz + dz);
    }

    attr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  // ============================================================
  // SCALE MICROPATTERN
  // ============================================================
  function scaleDetail(x, y, z) {
    const S = 0.15;
    const a = Math.sin(x * Math.PI / S) * Math.sin(z * Math.PI / S);
    const b = Math.sin((x + S * 0.5) * Math.PI / S) * Math.sin((z + S * 0.5) * Math.PI / S);
    return Math.max(0, a, b);
  }

  // ============================================================
  // VERTEX COLOURS — multi-zone: body / wings / accent / eye
  // ============================================================
  let _gradientMap = null;
  function getGradientMap() {
    if (_gradientMap) return _gradientMap;
    const c = document.createElement('canvas');
    c.width = 4; c.height = 1;
    const ctx = c.getContext('2d');
    [72, 136, 200, 255].forEach((v, i) => {
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(i, 0, 1, 1);
    });
    _gradientMap = new THREE.CanvasTexture(c);
    _gradientMap.minFilter = THREE.NearestFilter;
    _gradientMap.magFilter = THREE.NearestFilter;
    _gradientMap.generateMipmaps = false;
    return _gradientMap;
  }

  function paintVertexColors(inst, colorsInput) {
    const colors   = normalizeColors(colorsInput);
    const bodyTint = new THREE.Color(colors.body);
    const hsl = {};
    bodyTint.getHSL(hsl);

    // ── Body palette ─────────────────────────────────────────
    // Belly: warm cream, very light
    const belly = new THREE.Color().setHSL(
      (hsl.h + 0.07) % 1,
      Math.min(0.40, hsl.s * 0.50),
      0.88
    );
    // Torso: vibrant main colour
    const body = new THREE.Color().setHSL(
      hsl.h,
      Math.min(1, hsl.s * 1.08),
      Math.min(0.64, Math.max(0.38, hsl.l * 1.12))
    );
    // Dorsal: darker, cool-shifted
    const dorsal = new THREE.Color().setHSL(
      (hsl.h - 0.08 + 1) % 1,
      Math.min(1, hsl.s * 1.25),
      Math.max(0.16, hsl.l * 0.50)
    );
    // Scale seam (adds depth at seam boundaries)
    const seam = dorsal.clone().multiplyScalar(0.68);

    // ── Wing palette ──────────────────────────────────────────
    let wingMem;
    if (colors.wings) {
      const wh = {};
      new THREE.Color(colors.wings).getHSL(wh);
      wingMem = new THREE.Color().setHSL(
        wh.h,
        Math.min(1, wh.s * 1.1),
        Math.min(0.75, Math.max(0.38, wh.l))
      );
    } else {
      // Warm amber backlit membrane — default
      wingMem = new THREE.Color().setHSL(0.07, 0.78, 0.68).lerp(bodyTint, 0.30);
    }

    // ── Accent palette ────────────────────────────────────────
    let accentCol;
    if (colors.accent) {
      accentCol = new THREE.Color(colors.accent);
    } else {
      // Slightly different dorsal (darker, less saturated)
      accentCol = dorsal.clone().lerp(new THREE.Color(0.05, 0.05, 0.06), 0.28);
    }

    // ── Claw palette ──────────────────────────────────────────
    const clawDark  = new THREE.Color().setHSL((hsl.h + 0.04) % 1, 0.22, 0.08);
    const clawLight = new THREE.Color().setHSL((hsl.h + 0.04) % 1, 0.18, 0.72);

    // Apply toon gradient map once per material
    const gm = getGradientMap();
    inst.materials.forEach(mat => {
      if (!mat.gradientMap) { mat.gradientMap = gm; mat.needsUpdate = true; }
    });

    inst.meshes.forEach((mesh) => {
      const geo  = mesh.geometry;
      const orig = mesh.userData.origPos;
      if (!orig) return;

      const cnt   = orig.length / 3;
      const lb    = mesh.userData.localBox;
      const spanY = lb.max.y - lb.min.y || 1;
      const halfX = (lb.max.x - lb.min.x) / 2 || 1;
      const centX = (lb.min.x + lb.max.x) / 2;

      const buf = new Float32Array(cnt * 3);

      for (let i = 0; i < cnt; i++) {
        const x = orig[i*3], y = orig[i*3+1], z = orig[i*3+2];
        const ty = (y - lb.min.y) / spanY;        // 0 = feet,  1 = spine top
        const tx = Math.abs(x - centX) / halfX;   // 0 = spine, 1 = wing tip

        let col;

        // ── Claws ────────────────────────────────────────────
        if (ty < 0.055 && tx < 0.55) {
          const clawT = 1 - ty / 0.055;
          col = clawLight.clone().lerp(clawDark, clawT * clawT);

        // ── Wings ─────────────────────────────────────────────
        } else if (tx > 0.45 && y > -0.20) {
          const spread = ss(0.45, 0.88, tx);
          const yBlend = ss(-0.18, 0.22, y);
          col = body.clone().lerp(wingMem, (1 - yBlend) * 0.85);
          col.lerp(wingMem, spread * 0.45);
          // Custom wing colour: blend more strongly toward tips
          if (colors.wings) {
            col.lerp(new THREE.Color(colors.wings), spread * 0.55);
          }

        // ── Body ──────────────────────────────────────────────
        } else {
          if (ty < 0.36) {
            col = belly.clone().lerp(body, ty / 0.36);
          } else {
            col = body.clone().lerp(dorsal, ss(0.36, 0.82, ty));
          }

          // Scale micro-texture
          const sv    = scaleDetail(x, y, z);
          const depth = 0.30 + ty * 0.20;
          col.lerp(seam, (1 - sv) * depth * 0.55);
          col.lerp(new THREE.Color(1, 1, 1), sv * depth * 0.14);

          // Accent: applied to dorsal ridge / spike region
          if (ty > 0.74) {
            const accentT = ss(0.74, 0.92, ty) * (colors.accent ? 0.65 : 0.20);
            col.lerp(accentCol, accentT);
          }
        }

        buf[i*3]   = Math.min(1, col.r);
        buf[i*3+1] = Math.min(1, col.g);
        buf[i*3+2] = Math.min(1, col.b);
      }

      geo.setAttribute('color', new THREE.BufferAttribute(buf, 3));
      geo.attributes.color.needsUpdate = true;
    });

    // Eye colour (independent zone, or fall back to body tint)
    updateEyeColor(inst.model, colors.eye || colors.body);

    if (_glowRing) _glowRing.material.color.set(colors.body);
  }

  // ============================================================
  // APPLY TRAITS TO INSTANCE
  // ============================================================
  function applyTraitsToInstance(inst, traits, colors, cacheKey) {
    if (!inst) return;
    const n    = normTraits(traits);
    const meta = _srcModelMeta;
    const sc   = meta.baseScale;
    const c    = normalizeColors(colors);

    // Overall scale from bodyMass
    const scMass  = 0.78 + (n.bodyMass || 0.5) * 0.44;
    const scFinal = sc * scMass;
    inst.model.scale.setScalar(scFinal);
    inst.model.userData._baseSc = scFinal;

    const offX = inst.model.userData.worldOffsetX || 0;
    const offZ = inst.model.userData.worldOffsetZ || 0;
    inst.model.position.set(
      offX + -meta.meshCentreX * sc * scMass,
      -meta.meshMinY * sc * scMass,
      offZ + -meta.meshCentreZ * sc * scMass
    );

    // Vertex deformation — only when traits actually changed
    const hash    = traitHash(traits);
    const hashKey = cacheKey + 'hash';
    if (hash !== inst.model.userData[hashKey]) {
      inst.model.userData[hashKey] = hash;
      inst.meshes.forEach(mesh => applyDeformation(mesh, n));
      // Trigger reward flash on player trait change
      if (cacheKey === '_p') {
        _rewardTimer = 0.30;
        _rewardColor.setHex(0x4af0c0);
      }
    }

    // Vertex colours — skip if mid-transition (animate loop handles it then)
    const colorKey = c.body + '|' + (c.wings||'') + '|' + (c.accent||'') + '|' + (c.eye||'');
    const tintKey  = cacheKey + 'tint';
    if (colorKey !== inst.model.userData[tintKey]) {
      inst.model.userData[tintKey] = colorKey;
      if (cacheKey !== '_p' || _pColorT >= 1) {
        paintVertexColors(inst, c);
      }
    }

    // Fire emission — stored on model; animate loop applies it each frame
    const nFuel   = n.fuelGlandSize      || 0;
    const nIgn    = n.ignitionEfficiency || 0;
    const glowAmt = nFuel * 0.5 + nFuel * nIgn * 0.5;
    inst.model.userData._fireGlow = {
      color: new THREE.Color(1.0, 0.30 + nIgn * 0.20, 0),
      amt:   glowAmt * 0.42,
    };

    // Rim light tracks player tint
    if (cacheKey === '_p' && rimLight) {
      rimLight.color.set(c.body);
      rimLight.intensity = 0.28 + (n.scaleThickness || 0.4) * 0.20;
    }
    if (cacheKey === '_p' && fireLight) {
      fireLight.intensity = glowAmt * 1.2;
      fireLight.position.set(
        inst.model.position.x,
        inst.model.position.y + 0.6,
        inst.model.position.z + 0.3
      );
    }

    inst.model.userData.metabRate = 0.65 + (n.metabolism   || 0.5) * 0.70;
    inst.model.userData.muscleAmp = 0.025 + (n.musclePower || 0.5) * 0.04;
  }

  // ============================================================
  // LIGHTING
  // ============================================================
  function setupLabLighting() {
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    scene.add(new THREE.HemisphereLight(0x334466, 0x112233, 0.55));

    const key = new THREE.DirectionalLight(0xeef4ff, 1.8);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near  = 0.5;   key.shadow.camera.far   = 24;
    key.shadow.camera.left  = key.shadow.camera.bottom = -6;
    key.shadow.camera.right = key.shadow.camera.top   =  6;
    scene.add(key);
    labObjects.push(key);

    rimLight = new THREE.DirectionalLight(0x44ffbb, 0.35);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);
    labObjects.push(rimLight);

    const bounce = new THREE.PointLight(0x1144aa, 0.4, 14);
    bounce.position.set(0, -0.2, 0);
    scene.add(bounce);
    labObjects.push(bounce);

    fireLight = new THREE.PointLight(0xff5500, 0, 5);
    fireLight.position.set(0, 0.5, 0.3);
    scene.add(fireLight);
    labObjects.push(fireLight);
  }

  // ============================================================
  // FLOOR
  // ============================================================
  function setupLabFloor() {
    scene.add(new THREE.GridHelper(24, 32, 0x003333, 0x001a1a));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x06060e, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const ringGeo = new THREE.CircleGeometry(1.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3a6e5a, transparent: true, opacity: 0.10,
      side: THREE.DoubleSide, depthWrite: false
    });
    _glowRing = new THREE.Mesh(ringGeo, ringMat);
    _glowRing.rotation.x = -Math.PI / 2;
    _glowRing.position.y = 0.003;
    scene.add(_glowRing);
  }

  // ============================================================
  // PUBLIC DRAGON API
  // ============================================================
  function buildPlayerDragon(traits, colors) {
    _pTraits = traits;
    const c = normalizeColors(colors);
    _pColorTarget  = { ...c };
    _pColorCurrent = { ...c };
    _pColorT = 1;
    if (playerInst) applyTraitsToInstance(playerInst, _pTraits, c, '_p');
  }

  function updateDragon(traits, colors) {
    _pTraits = traits;
    const c = normalizeColors(colors);

    // Check if any colour zone changed → start smooth transition
    const bodyChanged  = c.body   !== _pColorTarget.body;
    const wingsChanged = c.wings  !== _pColorTarget.wings;
    const eyeChanged   = c.eye    !== _pColorTarget.eye;
    const accChanged   = c.accent !== _pColorTarget.accent;

    if (bodyChanged || wingsChanged || eyeChanged || accChanged) {
      // Snapshot the current blended state as the new 'from'
      _pColorCurrent = (_pColorT < 1)
        ? lerpColors(_pColorCurrent, _pColorTarget, easeInOut(_pColorT))
        : { ..._pColorTarget };
      _pColorTarget = { ...c };
      _pColorT = 0;
    }

    if (playerInst) applyTraitsToInstance(playerInst, _pTraits, c, '_p');
  }

  // ============================================================
  // ANIMATE
  // ============================================================
  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    const time  = clock.getElapsedTime();
    controls.update();

    // ── Smooth colour transition ──────────────────────────────
    if (_pColorT < 1 && playerInst) {
      _pColorT = Math.min(1, _pColorT + delta / 0.32);   // 320ms
      const blended = lerpColors(_pColorCurrent, _pColorTarget, easeInOut(_pColorT));
      paintVertexColors(playerInst, blended);
      if (_pColorT >= 1) _pColorCurrent = { ..._pColorTarget };
    }

    // ── Reward feedback (emissive flash on trait change) ──────
    const rewardGlow = _rewardTimer > 0
      ? (Math.sin(_rewardTimer * Math.PI * 14) * 0.5 + 0.5) * (_rewardTimer / 0.30) * 0.40
      : 0;
    if (_rewardTimer > 0) _rewardTimer = Math.max(0, _rewardTimer - delta);

    // ── Per-instance animation ────────────────────────────────
    const pairs = [
      { inst: playerInst, blink: _pBlink, isPlayer: true  },
      { inst: enemyInst,  blink: _eBlink, isPlayer: false },
    ];

    pairs.forEach(({ inst, blink, isPlayer }) => {
      if (!inst || !inst.model.visible) return;

      const rate     = inst.model.userData.metabRate || 0.9;
      const amp      = inst.model.userData.muscleAmp || 0.04;
      const baseSc   = inst.model.userData._baseSc;
      const baseRotY = inst.model.userData.baseRotY || 0;

      // ── Organic breathing (multi-harmonic irregular rhythm) ──
      // X/Z scale only so Y (height) stays constant and floorY doesn't shift
      if (baseSc) {
        const t1 = Math.sin(time * rate * 0.52);
        const t2 = Math.sin(time * rate * 1.35) * 0.28;   // secondary harmonic
        const t3 = Math.sin(time * rate * 0.19) * 0.15;   // slow deep breath
        const breathXZ = 1 + (t1 + t2 + t3) * 0.018;
        inst.model.scale.set(baseSc * breathXZ, baseSc, baseSc * breathXZ);
      }

      const floorY = -_srcModelMeta.meshMinY * (baseSc || inst.model.scale.y);

      // Vertical bob
      inst.model.position.y = floorY + Math.sin(time * rate) * amp;

      // Head micro-sway: two frequencies for organic feel
      const sway1 = Math.sin(time * 0.20) * 0.14;
      const sway2 = Math.sin(time * 0.47) * 0.05;
      const extraSway = currentMode === 'lab' ? (sway1 + sway2) : 0;
      inst.model.rotation.y = baseRotY
        + Math.sin(time * 0.18) * (currentMode === 'lab' ? 0.18 : 0.04)
        + extraSway;

      if (currentMode === 'lab') {
        inst.model.rotation.z = Math.sin(time * 0.27) * 0.016;
        inst.model.rotation.x = Math.sin(time * 0.38) * 0.007;  // subtle pitch
      }

      // ── Blinking ──────────────────────────────────────────────
      updateBlink(blink, inst.model, delta);

      // ── Fire + reward emissive (combined each frame) ──────────
      const fg    = inst.model.userData._fireGlow;
      const rGlow = isPlayer ? rewardGlow : 0;

      inst.materials.forEach(mat => {
        if (fg && fg.amt > 0.01) {
          mat.emissive.copy(fg.color).multiplyScalar(fg.amt + rGlow * 0.6);
        } else if (rGlow > 0.005) {
          mat.emissive.copy(_rewardColor).multiplyScalar(rGlow);
        } else {
          mat.emissive.set(0, 0, 0);
        }
      });
    });

    // ── Glow ring ─────────────────────────────────────────────
    if (_glowRing && playerInst) {
      _glowRing.material.opacity = 0.07 + Math.sin(time * 0.65) * 0.035;
      _glowRing.position.x = playerInst.model.position.x;
      _glowRing.position.z = playerInst.model.position.z;
    }

    // ── Ambient embers from snout when fire traits are high ───
    if (currentMode === 'lab' && playerInst && _pTraits) {
      const pn = normTraits(_pTraits);
      const fireStr = (pn.fuelGlandSize || 0) * 0.6 + (pn.ignitionEfficiency || 0) * 0.4;
      _emberTimer -= delta;
      if (fireStr > 0.25 && _emberTimer <= 0) {
        _emberTimer = 0.18 / fireStr;
        spawnAmberEmber();
      }
    }

    updateParticles(delta);
    renderer.render(scene, camera);
  }

  function spawnAmberEmber() {
    if (!playerInst || !_srcModelMeta.meshMinY) return;
    const sc = playerInst.model.scale.y;
    const px = playerInst.model.position.x + (Math.random() - 0.5) * 0.18;
    const py = playerInst.model.position.y + sc * 0.55 + (Math.random() - 0.5) * 0.15;
    const pz = playerInst.model.position.z + sc * 0.30;
    const start = new THREE.Vector3(px, py, pz);
    const end   = start.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.55,
      0.55 + Math.random() * 0.65,
      (Math.random() - 0.5) * 0.18
    ));
    const geo = new THREE.SphereGeometry(0.012 + Math.random() * 0.014, 4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.04 + Math.random() * 0.06, 1.0, 0.55 + Math.random() * 0.28),
      transparent: true, opacity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(start);
    scene.add(mesh);
    fireParticles.push({ mesh, start, end, progress: 0, speed: 0.22 + Math.random() * 0.18 });
  }

  function updateParticles(delta) {
    lungeAnims = lungeAnims.filter(la => { la.phase += delta / la.duration; return la.phase < 1; });

    fireParticles = fireParticles.filter(fp => {
      fp.progress += delta * fp.speed;
      if (fp.progress < 0) return true;
      if (fp.progress >= 1) {
        scene.remove(fp.mesh);
        fp.mesh.geometry.dispose();
        fp.mesh.material.dispose();
        return false;
      }
      fp.mesh.position.lerpVectors(fp.start, fp.end, fp.progress);
      fp.mesh.position.y += Math.sin(fp.progress * Math.PI) * 0.4;
      fp.mesh.material.opacity = 1 - fp.progress * 0.8;
      fp.mesh.scale.setScalar(1 + fp.progress);
      return true;
    });

    impactFlashes = impactFlashes.filter(fl => {
      fl.life -= delta * 4;
      if (fl.life <= 0) {
        scene.remove(fl.mesh);
        fl.mesh.geometry.dispose();
        fl.mesh.material.dispose();
        return false;
      }
      fl.mesh.material.opacity = fl.life;
      fl.mesh.scale.setScalar(1 + (1 - fl.life) * 2);
      return true;
    });
  }

  // ============================================================
  // BATTLE ARENA
  // ============================================================
  function initBattleArena(arenaKey, playerTraits, playerColors, enemyTraits, enemyColors) {
    currentMode = 'battle';
    _pTraits = playerTraits;
    _eTraits = enemyTraits;

    const pC = normalizeColors(playerColors);
    const eC = normalizeColors(enemyColors);

    // Freeze transitions for battle clarity
    _pColorTarget = { ...pC }; _pColorCurrent = { ...pC }; _pColorT = 1;
    _eColorTarget = { ...eC };

    if (playerInst) {
      playerInst.model.userData.worldOffsetX = -2.5;
      playerInst.model.userData.worldOffsetZ =  0;
      positionInstance(playerInst, -2.5, 0, 0, -Math.PI * 0.35);
      applyTraitsToInstance(playerInst, _pTraits, pC, '_p');
    }

    if (!enemyInst && glbLoaded) {
      enemyInst = buildInstance();
      scene.add(enemyInst.model);
    }

    if (enemyInst) {
      positionInstance(enemyInst, 2.5, 0, 0, Math.PI + Math.PI * 0.35);
      applyTraitsToInstance(enemyInst, _eTraits, eC, '_e');
      enemyInst.model.visible = true;
    }

    camera.position.set(0, 2.5, 10);
    controls.target.set(0, 1.5, 0);

    const arenaColors = {
      mountains: 0x2a3a2e, tundra: 0x2a3a4a,
      volcanic:  0x3a1a1a, forest: 0x1a2a1a, plains: 0x3a3a2a
    };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x06060f);
    if (overlay) overlay.style.display = 'none';
  }

  function returnToLab() {
    currentMode = 'lab';
    if (playerInst) {
      positionInstance(playerInst, 0, 0, 0, Math.PI * 0.10);
      if (_pTraits) applyTraitsToInstance(playerInst, _pTraits, _pColorTarget, '_p');
    }
    if (enemyInst) enemyInst.model.visible = false;
    camera.position.set(0, 2.2, 7.5);
    controls.target.set(0, 1.2, 0);
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.FogExp2(0x06060f, 0.045);
  }

  // ============================================================
  // BATTLE EFFECTS
  // ============================================================
  function animateBattleTick(tickRecord) {
    if (!tickRecord) return;
    if (['fireBurst','sustainedFire'].includes(tickRecord.playerAction)) playFireEffect(pPos, ePos);
    if (['fireBurst','sustainedFire'].includes(tickRecord.enemyAction))  playFireEffect(ePos, pPos);
    if (tickRecord.playerDamageDealt > 5) playImpactEffect(ePos.clone().add(new THREE.Vector3(0, 0.5, 0)));
    if (tickRecord.enemyDamageDealt  > 5) playImpactEffect(pPos.clone().add(new THREE.Vector3(0, 0.5, 0)));
  }

  function playFireEffect(start, end) {
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 5, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3),
        transparent: true, opacity: 0.9
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(start).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, 0));
      scene.add(p);
      fireParticles.push({ mesh:p, start:start.clone(), end:end.clone(), progress:i*-0.06, speed:1.5+Math.random()*0.5 });
    }
  }

  function playImpactEffect(position) {
    const geo = new THREE.SphereGeometry(0.2, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const fl  = new THREE.Mesh(geo, mat);
    fl.position.copy(position);
    scene.add(fl);
    impactFlashes.push({ mesh: fl, life: 1.0 });
  }

  // ============================================================
  // ENVIRONMENT / RESIZE
  // ============================================================
  function setEnvironment(habitatKey) {
    const ec = {
      mountains:{bg:0x1a2a1e}, tundra:{bg:0x1a2a3a},
      volcanic:{bg:0x2a1010},  forest:{bg:0x0a1a0a}, plains:{bg:0x1a1a10}
    };
    scene.background = new THREE.Color((ec[habitatKey]||{bg:0x06060f}).bg);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x06060f);
  }

  function resize(container) {
    if (!renderer) return;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    resizeOverlay();
  }

  return {
    init, buildPlayerDragon, updateDragon,
    initBattleArena, returnToLab, animateBattleTick,
    playFireEffect, playImpactEffect,
    setEnvironment, resetEnvironment, resize,
    normalizeColors,
  };
})();
