// ============================================================
// Dragon Engineering Lab — Three.js Scene
// GLB model with per-vertex deformation driven by trait sliders.
// Body regions identified spatially: wings, neck/head, tail,
// front legs, hind legs, body bulk — all deformed independently.
// ============================================================

window.Scene = (function () {
  let renderer, scene, camera, controls, clock;
  let currentMode = 'lab';
  let labObjects   = [];

  let overlay, _container;

  let _pTraits = null, _pTint = '#3a6e5a';
  let _eTraits = null, _eTint = '#3a6e5a';

  let dragonModel     = null;
  let dragonMaterials = [];
  let dragonMeshes    = [];
  let dragonLoaded    = false;
  let _lastTint       = null;
  let _lastTraitHash  = null;

  let rimLight  = null;
  let fireLight = null;

  let pPos = new THREE.Vector3(-3, 1.5, 0);
  let ePos = new THREE.Vector3( 3, 1.5, 0);
  let lungeAnims = [], fireParticles = [], impactFlashes = [];

  // --------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------
  // Smooth-step falloff: 0 when x<=a, 1 when x>=b
  function ss(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  // Trait normalisation → 0..1
  function norm(traits) {
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

  // --------------------------------------------------------
  // INIT
  // --------------------------------------------------------
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
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.08;
    controls.maxPolarAngle  = Math.PI * 0.82;
    controls.minDistance    = 2;
    controls.maxDistance    = 22;
    controls.update();

    setupLabLighting();
    setupLabFloor();
    loadDragonModel();

    overlay = document.createElement('canvas');
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none';
    overlay.style.display = 'block';
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

  // --------------------------------------------------------
  // LOAD GLB
  // --------------------------------------------------------
  function loadDragonModel() {
    if (!THREE.GLTFLoader) return;
    const loader = new THREE.GLTFLoader();
    loader.load(
      'assets/dragon.glb',
      (gltf) => {
        dragonModel = gltf.scene;

        const box  = new THREE.Box3().setFromObject(dragonModel);
        const size = new THREE.Vector3();
        box.getSize(size);

        const sc = 2.8 / size.y;
        dragonModel.scale.setScalar(sc);

        dragonModel.userData.baseScale   = sc;
        dragonModel.userData.meshMinY    = box.min.y;
        dragonModel.userData.meshCentreX = (box.min.x + box.max.x) / 2;
        dragonModel.userData.meshCentreZ = (box.min.z + box.max.z) / 2;

        dragonModel.position.set(
          -dragonModel.userData.meshCentreX * sc,
          -dragonModel.userData.meshMinY    * sc,
          -dragonModel.userData.meshCentreZ * sc
        );
        dragonModel.userData.baseRotY = Math.PI * 0.1;
        dragonModel.rotation.y = dragonModel.userData.baseRotY;

        dragonMaterials = [];
        dragonMeshes    = [];

        dragonModel.traverse((child) => {
          if (!child.isMesh) return;

          // Make geometry writable
          child.geometry = child.geometry.clone();
          child.geometry.computeBoundingBox();
          child.userData.localBox = child.geometry.boundingBox.clone();

          // Pre-compute vertex skinning weights for each body region
          initDeformWeights(child);

          // Toon material using vertex colours
          child.material = new THREE.MeshToonMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
          });
          child.castShadow    = true;
          child.receiveShadow = true;
          dragonMaterials.push(child.material);
          dragonMeshes.push(child);
        });

        paintVertexColors(_pTint);

        scene.add(dragonModel);
        dragonLoaded = true;

        if (_pTraits) applyTraits(_pTraits, _pTint);
        if (overlay) overlay.style.display = 'none';
      },
      undefined,
      (err) => {
        console.warn('Dragon GLB load failed:', err);
        if (overlay) overlay.style.display = 'block';
      }
    );
  }

  // --------------------------------------------------------
  // PRE-COMPUTE DEFORMATION WEIGHTS
  // One weight per region per vertex, stored as typed arrays.
  //
  // Coordinate frame (from analysis):
  //   X: -0.62 (left wing tip) → +0.62 (right wing tip)
  //   Y: -0.85 (feet) → +0.84 (back / top)
  //   Z: -1.00 (tail) → +1.00 (head+neck, held high)
  // --------------------------------------------------------
  function initDeformWeights(child) {
    const geo  = child.geometry;
    const attr = geo.attributes.position;
    const n    = attr.count;

    // Store original positions for re-deformation
    const orig = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      orig[i*3]   = attr.getX(i);
      orig[i*3+1] = attr.getY(i);
      orig[i*3+2] = attr.getZ(i);
    }
    child.userData.origPos = orig;

    // Five region weight arrays
    const wWing     = new Float32Array(n);
    const wNeck     = new Float32Array(n);
    const wTail     = new Float32Array(n);
    const wFrontLeg = new Float32Array(n);
    const wHindLeg  = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const x = orig[i*3], y = orig[i*3+1], z = orig[i*3+2];

      // Wings: wide X, above waist
      wWing[i] = ss(0.26, 0.42, Math.abs(x)) * ss(-0.28, 0.06, y);

      // Neck + head: +Z end, elevated
      wNeck[i] = ss(0.24, 0.52, z) * ss(-0.12, 0.14, y);

      // Tail: -Z end
      wTail[i] = ss(-0.38, -0.65, z);  // rises as z→ -1

      // Front legs: low Y, Z < 0 half
      wFrontLeg[i] = ss(-0.16, -0.46, y) * ss(0.06, -0.14, z);

      // Hind legs: low Y, mild +Z, not too far toward head
      wHindLeg[i] = ss(-0.10, -0.38, y) * ss(-0.05, 0.20, z) * (1 - ss(0.42, 0.62, z));
    }

    child.userData.weights = { wWing, wNeck, wTail, wFrontLeg, wHindLeg };
  }

  // --------------------------------------------------------
  // DEFORM VERTICES from trait values
  // Called every time a slider moves (28k verts ≈ <5ms).
  // --------------------------------------------------------
  function applyDeformation(child, n) {
    const { origPos, weights } = child.userData;
    if (!origPos || !weights) return;

    const { wWing, wNeck, wTail, wFrontLeg, wHindLeg } = weights;
    const attr  = child.geometry.attributes.position;
    const count = attr.count;

    // Scale factors centered around 1.0 = default (trait 0.5)
    // each produces a range that makes visual sense
    const wingW   = 0.45 + (n.wingspan  || 0.5) * 1.10;   // 0.45 – 1.55
    const wingA   = 0.55 + (n.wingArea  || 0.5) * 0.90;   // 0.55 – 1.45  (Y thickness)
    const neckL   = 0.50 + (n.neckLength|| 0.5) * 1.00;   // 0.50 – 1.50
    const tailS   = 0.40 + (n.tailSize  || 0.5) * 1.20;   // 0.40 – 1.60
    const legH    = 0.65 + (n.musclePower||0.5) * 0.70;   // 0.65 – 1.35
    const bulkX   = 0.72 + (n.bodyMass  || 0.5) * 0.56;   // body width
    const bulkZ   = 0.78 + (n.musclePower||0.5) * 0.44;   // body depth
    const bulkY   = 0.82 + (n.boneDensity||0.5) * 0.36;   // body height

    // Pivot points in local mesh coordinates
    const WING_ROOT  = 0.26;   // |X| where wing leaves body
    const NECK_BASE  = 0.24;   // Z at base of neck
    const TAIL_ROOT  = -0.38;  // Z at tail root
    const LEG_HIP_Y  = -0.16;  // Y at hip / shoulder attachment

    for (let i = 0; i < count; i++) {
      const ox = origPos[i*3], oy = origPos[i*3+1], oz = origPos[i*3+2];

      const wW  = wWing[i];
      const wN  = wNeck[i];
      const wT  = wTail[i];
      const wFL = wFrontLeg[i];
      const wHL = wHindLeg[i];
      // Body region = whatever isn't claimed by specialised regions
      const wB  = Math.max(0, 1 - wW - wN - wT - wFL - wHL);

      let dx = 0, dy = 0, dz = 0;

      // ---- Wings: stretch X outward from wing root ----
      if (wW > 0.001) {
        const sign   = ox >= 0 ? 1 : -1;
        const pivot  = sign * WING_ROOT;
        const newX   = pivot + (ox - pivot) * wingW;
        const newY   = oy * wingA;          // thicker/thinner membrane
        dx += (newX - ox) * wW;
        dy += (newY - oy) * wW;
      }

      // ---- Neck + head: stretch Z forward from neck base ----
      if (wN > 0.001) {
        const newZ = NECK_BASE + (oz - NECK_BASE) * neckL;
        dz += (newZ - oz) * wN;
      }

      // ---- Tail: stretch Z backward from tail root ----
      if (wT > 0.001) {
        const newZ = TAIL_ROOT + (oz - TAIL_ROOT) * tailS;
        dz += (newZ - oz) * wT;
      }

      // ---- Front legs: scale Y downward from hip ----
      if (wFL > 0.001) {
        const newY = LEG_HIP_Y + (oy - LEG_HIP_Y) * legH;
        dy += (newY - oy) * wFL;
      }

      // ---- Hind legs: scale Y downward from hip ----
      if (wHL > 0.001) {
        const newY = LEG_HIP_Y + (oy - LEG_HIP_Y) * legH;
        dy += (newY - oy) * wHL;
      }

      // ---- Body bulk: scale X/Z/Y of central mass ----
      if (wB > 0.001) {
        dx += ox * (bulkX - 1) * wB;
        dz += oz * (bulkZ - 1) * wB;
        dy += oy * (bulkY - 1) * wB;
      }

      attr.setXYZ(i, ox + dx, oy + dy, oz + dz);
    }

    attr.needsUpdate = true;
    child.geometry.computeVertexNormals();
  }

  // --------------------------------------------------------
  // VERTEX COLOURS  — map body zones to colour palette
  // Computed from ORIGINAL positions (before deformation).
  // --------------------------------------------------------
  function paintVertexColors(tintHex) {
    if (!dragonMeshes.length) return;
    _lastTint = tintHex;

    const tint   = new THREE.Color(tintHex);
    const belly  = tint.clone().lerp(new THREE.Color(0.96, 0.88, 0.74), 0.52).multiplyScalar(1.12);
    const dorsal = tint.clone().multiplyScalar(0.80);
    const wing   = tint.clone().lerp(new THREE.Color(1, 1, 1), 0.28).multiplyScalar(1.10);
    const leg    = tint.clone().multiplyScalar(0.68);
    const neck   = tint.clone().lerp(new THREE.Color(1, 1, 1), 0.15);

    dragonMeshes.forEach((child) => {
      const geo   = child.geometry;
      const orig  = child.userData.origPos;
      if (!orig) return;
      const n     = geo.attributes.position.count;
      const lb    = child.userData.localBox;
      const spanY = lb.max.y - lb.min.y || 1;
      const spanX = lb.max.x - lb.min.x || 1;
      const centX = (lb.min.x + lb.max.x) / 2;
      const halfX = spanX / 2;

      const buf = new Float32Array(n * 3);

      for (let i = 0; i < n; i++) {
        const x = orig[i*3], y = orig[i*3+1], z = orig[i*3+2];

        // ty: 0 = feet, 1 = back
        const ty = (y - lb.min.y) / spanY;
        // tx: 0 = centre, 1 = wing tip
        const tx = Math.abs(x - centX) / halfX;
        // tz: 0–1 front → back
        const tz = (z - lb.min.z) / (lb.max.z - lb.min.z || 1);

        // Base: belly↔dorsal by height
        const c = new THREE.Color().lerpColors(belly, dorsal, Math.pow(ty, 0.65));

        // Wing blend
        if (tx > 0.55) c.lerp(wing, ss(0.55, 0.85, tx));

        // Leg blend (low Y, not in wings)
        if (ty < 0.28 && tx < 0.60) c.lerp(leg, ss(0.28, 0.0, ty) * 0.6);

        // Neck/head blend (+Z, elevated)
        if (tz > 0.70 && ty > 0.45) c.lerp(neck, ss(0.70, 0.90, tz) * 0.5);

        buf[i*3]   = c.r;
        buf[i*3+1] = c.g;
        buf[i*3+2] = c.b;
      }

      geo.setAttribute('color', new THREE.BufferAttribute(buf, 3));
      geo.attributes.color.needsUpdate = true;
    });
  }

  // --------------------------------------------------------
  // APPLY TRAITS → deform + colour + lights
  // --------------------------------------------------------
  function applyTraits(traits, tintHex) {
    if (!dragonLoaded || !dragonModel) return;

    const n    = norm(traits);
    const base = dragonModel.userData.baseScale;

    // Overall model scale (overall body size from bodyMass)
    const scMass = 0.78 + (n.bodyMass || 0.5) * 0.44;
    dragonModel.scale.setScalar(base * scMass);
    dragonModel.position.y = -dragonModel.userData.meshMinY * base * scMass;

    // Per-vertex deformation — skip if traits unchanged
    const hash = traitHash(traits);
    if (hash !== _lastTraitHash) {
      _lastTraitHash = hash;
      dragonMeshes.forEach(child => applyDeformation(child, n));
    }

    // Vertex colours — repaint only on tint change
    if (tintHex !== _lastTint) paintVertexColors(tintHex);

    // Fire emission
    const nFuel   = n.fuelGlandSize      || 0;
    const nIgn    = n.ignitionEfficiency || 0;
    const glowAmt = nFuel * 0.5 + nFuel * nIgn * 0.5;
    const fireCol = new THREE.Color(1.0, 0.3 + nIgn * 0.2, 0);
    for (const mat of dragonMaterials) {
      mat.emissive.copy(fireCol).multiplyScalar(glowAmt * 0.45);
      mat.needsUpdate = true;
    }

    // Rim light — tracks tint colour
    if (rimLight) {
      rimLight.color.set(tintHex);
      rimLight.intensity = 0.28 + (n.scaleThickness || 0.4) * 0.20;
    }

    // Belly fire light
    if (fireLight) {
      fireLight.intensity = glowAmt * 1.2;
      fireLight.position.set(0, dragonModel.position.y + 0.6, 0.3);
    }

    // Idle anim params
    dragonModel.userData.metabRate = 0.65 + (n.metabolism  || 0.5) * 0.70;
    dragonModel.userData.muscleAmp = 0.025 + (n.musclePower || 0.5) * 0.04;
  }

  // --------------------------------------------------------
  // LIGHTING
  // --------------------------------------------------------
  function setupLabLighting() {
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    scene.add(new THREE.HemisphereLight(0x334466, 0x112233, 0.55));

    const key = new THREE.DirectionalLight(0xeef4ff, 1.8);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near  = 0.5;
    key.shadow.camera.far   = 24;
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

  // --------------------------------------------------------
  // FLOOR
  // --------------------------------------------------------
  function setupLabFloor() {
    const grid = new THREE.GridHelper(24, 32, 0x003333, 0x001a1a);
    scene.add(grid);
    labObjects.push(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x06060e, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    labObjects.push(ground);
  }

  // --------------------------------------------------------
  // DRAGON API
  // --------------------------------------------------------
  function buildPlayerDragon(traits, tintColor) {
    _pTraits = traits;
    _pTint   = tintColor || '#3a6e5a';
    applyTraits(_pTraits, _pTint);
  }

  function updateDragon(traits, tintColor) {
    _pTraits = traits;
    _pTint   = tintColor || _pTint;
    applyTraits(_pTraits, _pTint);
  }

  // --------------------------------------------------------
  // ANIMATE
  // --------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time  = clock.getElapsedTime();

    controls.update();

    if (dragonLoaded && dragonModel && currentMode === 'lab') {
      const rate   = dragonModel.userData.metabRate || 0.9;
      const amp    = dragonModel.userData.muscleAmp || 0.04;
      const floorY = -dragonModel.userData.meshMinY * dragonModel.scale.y;
      dragonModel.position.y = floorY + Math.sin(time * rate) * amp;
      dragonModel.rotation.y = (dragonModel.userData.baseRotY || 0) + Math.sin(time * 0.18) * 0.18;
    }

    if (overlay && overlay.style.display !== 'none' && _pTraits) {
      if (currentMode === 'battle' && _eTraits) {
        DragonCanvas.drawBattle(overlay, _pTraits, _pTint, _eTraits, _eTint, time);
      } else if (!dragonLoaded) {
        DragonCanvas.draw(overlay, _pTraits, _pTint, time);
      }
    }

    updateParticles(delta);
    renderer.render(scene, camera);
  }

  function updateParticles(delta) {
    lungeAnims = lungeAnims.filter(la => { la.phase += delta / la.duration; return la.phase < 1; });

    fireParticles = fireParticles.filter(fp => {
      fp.progress += delta * fp.speed;
      if (fp.progress < 0) return true;
      if (fp.progress >= 1) { scene.remove(fp.mesh); fp.mesh.geometry.dispose(); fp.mesh.material.dispose(); return false; }
      fp.mesh.position.lerpVectors(fp.start, fp.end, fp.progress);
      fp.mesh.position.y += Math.sin(fp.progress * Math.PI) * 0.4;
      fp.mesh.material.opacity = 1 - fp.progress * 0.8;
      fp.mesh.scale.setScalar(1 + fp.progress);
      return true;
    });

    impactFlashes = impactFlashes.filter(fl => {
      fl.life -= delta * 4;
      if (fl.life <= 0) { scene.remove(fl.mesh); fl.mesh.geometry.dispose(); fl.mesh.material.dispose(); return false; }
      fl.mesh.material.opacity = fl.life;
      fl.mesh.scale.setScalar(1 + (1 - fl.life) * 2);
      return true;
    });
  }

  // --------------------------------------------------------
  // BATTLE
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    _pTraits = playerTraits; _pTint = playerTint  || '#3a6e5a';
    _eTraits = enemyTraits;  _eTint = enemyTint   || '#6e3a3a';
    if (dragonModel) dragonModel.visible = false;
    if (overlay) overlay.style.display = 'block';
    camera.position.set(0, 2, 10);
    controls.target.set(0, 0.5, 0);
    const arenaColors = { mountains:0x2a3a2e, tundra:0x2a3a4a, volcanic:0x3a1a1a, forest:0x1a2a1a, plains:0x3a3a2a };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x06060f);
  }

  function returnToLab() {
    currentMode = 'lab';
    _eTraits = null;
    if (dragonModel) dragonModel.visible = true;
    if (overlay) overlay.style.display = 'none';
    camera.position.set(0, 2.2, 7.5);
    controls.target.set(0, 1.2, 0);
    scene.background = new THREE.Color(0x06060f);
    scene.fog = new THREE.FogExp2(0x06060f, 0.045);
  }

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
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3), transparent: true, opacity: 0.9 });
      const p   = new THREE.Mesh(geo, mat);
      p.position.copy(start).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, 0));
      scene.add(p);
      fireParticles.push({ mesh: p, start: start.clone(), end: end.clone(), progress: i * -0.06, speed: 1.5 + Math.random() * 0.5 });
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

  // --------------------------------------------------------
  // ENVIRONMENT / RESIZE
  // --------------------------------------------------------
  function setEnvironment(habitatKey) {
    const ec = { mountains:{bg:0x1a2a1e}, tundra:{bg:0x1a2a3a}, volcanic:{bg:0x2a1010}, forest:{bg:0x0a1a0a}, plains:{bg:0x1a1a10} };
    scene.background = new THREE.Color((ec[habitatKey] || { bg:0x06060f }).bg);
  }

  function resetEnvironment() { scene.background = new THREE.Color(0x06060f); }

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
    setEnvironment, resetEnvironment, resize
  };
})();
