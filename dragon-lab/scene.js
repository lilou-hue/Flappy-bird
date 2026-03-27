// ============================================================
// Dragon Engineering Lab — Three.js Scene
// Lab environment rendered in WebGL.
// Dragon is a GLB model with MeshToonMaterial (cel shading).
// Canvas overlay kept for battle mode only.
// ============================================================

window.Scene = (function () {
  let renderer, scene, camera, controls, clock;
  let currentMode = 'lab';
  let labObjects = [];

  // Canvas overlay — battle mode only
  let overlay, _container;

  // Dragon state
  let _pTraits = null, _pTint = '#3a6e5a';
  let _eTraits = null, _eTint = '#3a6e5a';

  // 3D dragon model
  let dragonModel     = null;
  let dragonMaterials = [];
  let dragonMeshes    = [];
  let dragonLoaded    = false;
  let _lastTint       = null;

  // Dynamic lights driven by traits
  let rimLight  = null;
  let fireLight = null;

  // Battle particles
  let pPos = new THREE.Vector3(-3, 1.5, 0);
  let ePos = new THREE.Vector3( 3, 1.5, 0);
  let lungeAnims    = [];
  let fireParticles = [];
  let impactFlashes = [];

  // --------------------------------------------------------
  // TRAIT NORMALISATION  (0 → 1)
  // --------------------------------------------------------
  function norm(traits) {
    const n = {};
    if (!window.DragonData) return n;
    DragonData.TRAITS.forEach(tr => {
      n[tr.id] = Math.max(0, Math.min(1, (traits[tr.id] - tr.min) / (tr.max - tr.min)));
    });
    return n;
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
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.minDistance = 2;
    controls.maxDistance = 22;
    controls.update();

    setupLabLighting();
    setupLabFloor();
    loadDragonModel();

    // Canvas overlay — visible while GLB loads, then battle only
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
  // LOAD 3D DRAGON MODEL
  // --------------------------------------------------------
  function loadDragonModel() {
    if (!THREE.GLTFLoader) return;
    const loader = new THREE.GLTFLoader();
    loader.load(
      'assets/dragon.glb',
      (gltf) => {
        dragonModel = gltf.scene;

        // Auto-fit: centre + sit on floor
        const box  = new THREE.Box3().setFromObject(dragonModel);
        const size = new THREE.Vector3();
        box.getSize(size);

        const targetH = 2.8;
        const sc = targetH / size.y;
        dragonModel.scale.setScalar(sc);

        // Store for trait-driven rescaling
        dragonModel.userData.baseScale  = sc;
        dragonModel.userData.meshMinY   = box.min.y;   // local-space bottom (negative)
        dragonModel.userData.meshCentreX = (box.min.x + box.max.x) / 2;
        dragonModel.userData.meshCentreZ = (box.min.z + box.max.z) / 2;

        dragonModel.position.set(
          -dragonModel.userData.meshCentreX * sc,
          -dragonModel.userData.meshMinY    * sc,
          -dragonModel.userData.meshCentreZ * sc
        );
        dragonModel.userData.baseRotY = Math.PI * 0.1;
        dragonModel.rotation.y = dragonModel.userData.baseRotY;

        // Apply toon material + vertex colors to every mesh
        dragonMaterials = [];
        dragonMeshes    = [];
        dragonModel.traverse((child) => {
          if (!child.isMesh) return;
          // Pre-compute per-mesh local bbox for vertex colour mapping
          child.geometry.computeBoundingBox();
          child.userData.localBox = child.geometry.boundingBox.clone();

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

        // Apply current trait state immediately
        if (_pTraits) applyTraits(_pTraits, _pTint);

        // Swap to 3D; hide canvas fallback
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
  // VERTEX COLOURS — paint body regions from tint
  // belly lighter/cream, dorsal main tint, wings brighter
  // --------------------------------------------------------
  function paintVertexColors(tintHex) {
    if (!dragonMeshes.length) return;
    _lastTint = tintHex;

    const tint = new THREE.Color(tintHex);

    // Derive palette
    const belly  = tint.clone().lerp(new THREE.Color(0.95, 0.88, 0.75), 0.50).multiplyScalar(1.12);
    const dorsal = tint.clone().multiplyScalar(0.82);
    const wing   = tint.clone().lerp(new THREE.Color(1, 1, 1), 0.30).multiplyScalar(1.08);
    const leg    = tint.clone().multiplyScalar(0.72);

    dragonMeshes.forEach((child) => {
      const geo = child.geometry;
      const pos = geo.attributes.position;
      const lb  = child.userData.localBox;
      const cnt = pos.count;

      const spanY  = lb.max.y - lb.min.y || 1;
      const spanX  = lb.max.x - lb.min.x || 1;
      const centX  = (lb.min.x + lb.max.x) / 2;
      const halfX  = spanX / 2;

      const buf = new Float32Array(cnt * 3);

      for (let i = 0; i < cnt; i++) {
        const lx = pos.getX(i);
        const ly = pos.getY(i);

        // ty: 0 = very bottom (belly), 1 = very top (dorsal)
        const ty = (ly - lb.min.y) / spanY;
        // tx: 0 = body centre, 1 = wing tip
        const tx = Math.abs(lx - centX) / halfX;

        // belly ↔ dorsal blend by height
        const c = new THREE.Color().lerpColors(belly, dorsal, Math.pow(ty, 0.7));

        // wings blend in at outer extremes
        if (tx > 0.60) {
          c.lerp(wing, Math.pow((tx - 0.60) / 0.40, 1.2) * 0.75);
        }

        // lower legs — slightly darker
        if (ty < 0.22 && tx < 0.55) {
          c.lerp(leg, (0.22 - ty) / 0.22 * 0.5);
        }

        buf[i * 3]     = c.r;
        buf[i * 3 + 1] = c.g;
        buf[i * 3 + 2] = c.b;
      }

      geo.setAttribute('color', new THREE.BufferAttribute(buf, 3));
      geo.attributes.color.needsUpdate = true;
    });
  }

  // --------------------------------------------------------
  // APPLY TRAITS → 3D MODEL
  // --------------------------------------------------------
  function applyTraits(traits, tintHex) {
    if (!dragonLoaded || !dragonModel) return;

    const n   = norm(traits);
    const base = dragonModel.userData.baseScale;

    // ---- SCALE ----
    // bodyMass: overall size 0.75–1.25
    // wingspan: widens the dragon (x) 0.80–1.40
    // musclePower: deepens the body (z) 0.85–1.20
    // boneDensity: adds height (y) 0.90–1.15
    const scMass   = 0.75 + (n.bodyMass    || 0.5) * 0.50;
    const scWing   = 0.80 + (n.wingspan    || 0.5) * 0.60;
    const scMuscle = 0.85 + (n.musclePower || 0.5) * 0.35;
    const scBone   = 0.90 + (n.boneDensity || 0.5) * 0.25;

    const sx = base * scMass * scWing;
    const sy = base * scMass * scBone;
    const sz = base * scMass * scMuscle;
    dragonModel.scale.set(sx, sy, sz);

    // Recalculate floor Y so bottom always touches ground
    dragonModel.position.y = -dragonModel.userData.meshMinY * sy;

    // ---- VERTEX COLOURS — repaint only when tint changes ----
    if (tintHex !== _lastTint) paintVertexColors(tintHex);

    // ---- FIRE GLOW emission ----
    const nFuel   = n.fuelGlandSize       || 0;
    const nIgn    = n.ignitionEfficiency  || 0;
    const glowAmt = nFuel * 0.5 + nFuel * nIgn * 0.5;
    const fireCol = new THREE.Color(1.0, 0.3 + nIgn * 0.2, 0);

    for (const mat of dragonMaterials) {
      mat.emissive.copy(fireCol).multiplyScalar(glowAmt * 0.45);
      mat.needsUpdate = true;
    }

    // ---- RIM LIGHT — tinted to dragon colour ----
    if (rimLight) {
      rimLight.color.set(tintHex);
      rimLight.intensity = 0.28 + (n.scaleThickness || 0.4) * 0.18;
    }

    // ---- FIRE BELLY LIGHT ----
    if (fireLight) {
      fireLight.color.set(0xff5500);
      fireLight.intensity = glowAmt * 1.2;
      // Position under the dragon's belly
      const bellyCentreY = dragonModel.position.y + sy * 0.35;
      fireLight.position.set(
        dragonModel.position.x,
        bellyCentreY,
        dragonModel.position.z + sz * 0.2
      );
    }

    // ---- IDLE ANIM PARAMS (stored for animate loop) ----
    dragonModel.userData.metabRate = 0.65 + (n.metabolism || 0.5) * 0.70;
    dragonModel.userData.muscleAmp = 0.025 + (n.musclePower || 0.5) * 0.04;
  }

  // --------------------------------------------------------
  // LIGHTING — tuned for toon cel shading
  // --------------------------------------------------------
  function setupLabLighting() {
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    // Soft ambient — keeps shadow side from going pure black
    scene.add(new THREE.HemisphereLight(0x334466, 0x112233, 0.55));

    // Key light — main toon shadow split, slightly warm
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

    // Rim — colour updated dynamically from tint
    rimLight = new THREE.DirectionalLight(0x44ffbb, 0.35);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);
    labObjects.push(rimLight);

    // Floor bounce — cool blue
    const bounce = new THREE.PointLight(0x1144aa, 0.4, 14);
    bounce.position.set(0, -0.2, 0);
    scene.add(bounce);
    labObjects.push(bounce);

    // Fire belly light — intensity driven by fuelGlandSize
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

    // Idle animation
    if (dragonLoaded && dragonModel && currentMode === 'lab') {
      const rate = dragonModel.userData.metabRate || 0.9;
      const amp  = dragonModel.userData.muscleAmp || 0.04;
      const floorY = -dragonModel.userData.meshMinY * dragonModel.scale.y;
      dragonModel.position.y  = floorY + Math.sin(time * rate) * amp;
      dragonModel.rotation.y  = (dragonModel.userData.baseRotY || 0)
                                + Math.sin(time * 0.18) * 0.18;
    }

    // Canvas: draw 2D dragon while loading, or during battle
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
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    _pTraits = playerTraits;
    _pTint   = playerTint  || '#3a6e5a';
    _eTraits = enemyTraits;
    _eTint   = enemyTint   || '#6e3a3a';

    if (dragonModel) dragonModel.visible = false;
    if (overlay) overlay.style.display = 'block';

    camera.position.set(0, 2, 10);
    controls.target.set(0, 0.5, 0);

    const arenaColors = {
      mountains: 0x2a3a2e, tundra: 0x2a3a4a,
      volcanic:  0x3a1a1a, forest: 0x1a2a1a, plains: 0x3a3a2a
    };
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

  // --------------------------------------------------------
  // BATTLE EFFECTS
  // --------------------------------------------------------
  function animateBattleTick(tickRecord) {
    if (!tickRecord) return;
    if (['fireBurst', 'sustainedFire'].includes(tickRecord.playerAction)) playFireEffect(pPos, ePos);
    if (['fireBurst', 'sustainedFire'].includes(tickRecord.enemyAction))  playFireEffect(ePos, pPos);
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
  // ENVIRONMENT
  // --------------------------------------------------------
  function setEnvironment(habitatKey) {
    const ec = {
      mountains: { bg: 0x1a2a1e }, tundra: { bg: 0x1a2a3a },
      volcanic:  { bg: 0x2a1010 }, forest: { bg: 0x0a1a0a },
      plains:    { bg: 0x1a1a10 }
    };
    scene.background = new THREE.Color((ec[habitatKey] || { bg: 0x06060f }).bg);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x06060f);
  }

  // --------------------------------------------------------
  // RESIZE
  // --------------------------------------------------------
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
