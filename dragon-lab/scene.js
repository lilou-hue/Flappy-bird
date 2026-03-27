// ============================================================
// Dragon Engineering Lab — Three.js Scene
// Lab environment (floor, lighting) rendered in WebGL.
// Dragon is a GLB model with MeshToonMaterial (cel shading).
// Canvas overlay is kept for battle mode only.
// ============================================================

window.Scene = (function () {
  let renderer, scene, camera, controls, clock;
  let currentMode = 'lab';
  let labObjects = [];

  // Canvas overlay — used for battle mode only
  let overlay, _container;

  // Dragon state
  let _pTraits = null, _pTint = '#3a6e5a';
  let _eTraits = null, _eTint = '#3a6e5a';

  // 3D dragon model
  let dragonModel = null;
  let dragonMaterials = [];
  let dragonLoaded = false;

  // Battle particle positions
  let pPos = new THREE.Vector3(-3, 1.5, 0);
  let ePos = new THREE.Vector3( 3, 1.5, 0);

  let lungeAnims    = [];
  let fireParticles = [];
  let impactFlashes = [];

  // gradient map built on demand if needed
  function buildGradientMap() { return null; }

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

    // Canvas overlay — visible until 3D model loads, then battle only
    overlay = document.createElement('canvas');
    overlay.style.position    = 'absolute';
    overlay.style.top         = '0';
    overlay.style.left        = '0';
    overlay.style.width       = '100%';
    overlay.style.height      = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.display     = 'block'; // shown until GLB ready
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
  function dbg(msg) {
    let el = document.getElementById('_dbg');
    if (!el) {
      el = document.createElement('div');
      el.id = '_dbg';
      el.style.cssText = 'position:fixed;top:60px;left:8px;background:rgba(0,0,0,0.9);color:#0f0;font:14px monospace;padding:8px 12px;z-index:99999;border-radius:4px;max-width:90vw;white-space:pre-wrap;pointer-events:none';
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }

  function loadDragonModel() {
    if (!THREE.GLTFLoader) { dbg('ERR: GLTFLoader missing'); return; }
    dbg('Loading dragon.glb...');
    const loader = new THREE.GLTFLoader();
    loader.load(
      'assets/dragon.glb',
      (gltf) => {
        dragonModel = gltf.scene;

        // Auto-fit: centre on bounding box, sit on floor
        const box = new THREE.Box3().setFromObject(dragonModel);
        const size   = new THREE.Vector3();
        const centre = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(centre);

        // Scale so dragon is ~2.8 units tall
        const targetH = 2.8;
        const sc = targetH / size.y;
        dragonModel.scale.setScalar(sc);

        // Sit on floor (y=0)
        dragonModel.position.set(
          -centre.x * sc,
          -box.min.y * sc,
          -centre.z * sc
        );

        // Face slightly toward camera
        dragonModel.rotation.y = Math.PI * 0.1;

        // Apply toon material to every mesh
        dragonMaterials = [];
        dragonModel.traverse((child) => {
          if (!child.isMesh) return;

          const toonMat = new THREE.MeshToonMaterial({
            color: new THREE.Color(_pTint),
            side: THREE.DoubleSide,  // fixes inverted-normal meshes from AI generators
          });
          child.material = toonMat;
          child.castShadow = true;
          child.receiveShadow = true;
          dragonMaterials.push(toonMat);
        });

        scene.add(dragonModel);
        dragonModel.userData.floorY = dragonModel.position.y;
        dragonLoaded = true;

        dbg(`OK: dragon loaded\npos y=${dragonModel.position.y.toFixed(2)} sc=${dragonModel.scale.x.toFixed(2)}\nmeshes=${dragonMaterials.length}`);

        // Hide 2D canvas — 3D model takes over
        if (overlay) overlay.style.display = 'none';
      },
      undefined,
      (xhr) => {
        if (xhr.total) dbg(`Loading: ${Math.round(xhr.loaded/xhr.total*100)}%`);
      },
      (err) => {
        dbg(`ERR loading GLB:\n${err.message || err}`);
        // Fallback: keep showing 2D canvas dragon
        if (overlay) overlay.style.display = 'block';
      }
    );
  }

  // --------------------------------------------------------
  // TINT COLOR
  // --------------------------------------------------------
  function applyToonColor(hex) {
    if (!dragonLoaded) return;
    const col = new THREE.Color(hex);
    for (const mat of dragonMaterials) {
      mat.color.set(col);
      mat.needsUpdate = true;
    }
  }

  // --------------------------------------------------------
  // LIGHTING — tuned for toon material (fewer, harder lights)
  // --------------------------------------------------------
  function setupLabLighting() {
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    // Ambient fill — subtle, keeps shadows from going pure black
    scene.add(new THREE.HemisphereLight(0x334466, 0x112233, 0.6));

    // Key light — main toon shadow split
    const key = new THREE.DirectionalLight(0xddeeff, 1.6);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near   = 0.5;
    key.shadow.camera.far    = 24;
    key.shadow.camera.left   = key.shadow.camera.bottom = -6;
    key.shadow.camera.right  = key.shadow.camera.top   =  6;
    scene.add(key);
    labObjects.push(key);

    // Rim light — teal, makes the silhouette pop
    const rim = new THREE.DirectionalLight(0x00ffcc, 0.45);
    rim.position.set(-5, 3, -4);
    scene.add(rim);
    labObjects.push(rim);

    // Floor bounce
    const bounce = new THREE.PointLight(0x1144aa, 0.4, 12);
    bounce.position.set(0, -0.2, 0);
    scene.add(bounce);
    labObjects.push(bounce);
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
    applyToonColor(_pTint);
  }

  function updateDragon(traits, tintColor) {
    _pTraits = traits;
    _pTint   = tintColor || _pTint;
    applyToonColor(_pTint);
  }

  // --------------------------------------------------------
  // ANIMATE
  // --------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time  = clock.getElapsedTime();

    controls.update();

    // Idle animation — gentle breathing bob + slow sway
    if (dragonLoaded && dragonModel && currentMode === 'lab') {
      dragonModel.position.y += (Math.sin(time * 0.9) * 0.035)
        - (dragonModel.position.y - dragonModel.userData.floorY || 0) * 0;
      // Recalculate absolute floor Y to avoid drift
      dragonModel.position.y = (dragonModel.userData.floorY || 0)
        + Math.sin(time * 0.9) * 0.04;
      dragonModel.rotation.y = Math.PI * 0.1 + Math.sin(time * 0.18) * 0.18;
    }

    // Canvas overlay: 2D dragon while loading, battle mode when fighting
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
    lungeAnims = lungeAnims.filter(la => {
      la.phase += delta / la.duration;
      return la.phase < 1;
    });

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

  // --------------------------------------------------------
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    _pTraits = playerTraits;
    _pTint   = playerTint  || '#3a6e5a';
    _eTraits = enemyTraits;
    _eTint   = enemyTint   || '#6e3a3a';

    // Hide 3D model, show canvas overlay for battle
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

    // Show 3D model, hide canvas overlay
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
