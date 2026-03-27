// ============================================================
// Dragon Engineering Lab — Three.js Scene
// Two independent dragon instances (player + enemy).
// Per-vertex skinning weights drive trait-slider deformation.
// Eye spheres (white/iris/pupil) added as model children.
// ============================================================

window.Scene = (function () {
  let renderer, scene, camera, controls, clock;
  let currentMode = 'lab';
  let labObjects   = [];
  let overlay, _container;

  // Each "instance" = { model, materials, meshes }
  let playerInst = null;
  let enemyInst  = null;
  let glbLoaded  = false;   // raw GLB loaded

  let _pTraits = null, _pTint = '#3a6e5a';
  let _eTraits = null, _eTint = '#7a2828';
  let _lastPHash = null, _lastEHash = null;
  let _lastPTint = null, _lastETint = null;

  let rimLight = null, fireLight = null;

  let pPos = new THREE.Vector3(-2.5, 1.5, 0);
  let ePos = new THREE.Vector3( 2.5, 1.5, 0);
  let lungeAnims = [], fireParticles = [], impactFlashes = [];

  // ── raw source data kept for cloning ─────────────────────
  let _srcMeshData = [];   // [{origPos, weights, localBox, indexAttr, colorAttr}]
  let _srcModelMeta = {};  // baseScale, meshMinY, meshCentreX, meshCentreZ

  // --------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // LOAD GLB — builds player instance, stores source data
  // --------------------------------------------------------
  function loadDragonGLB() {
    if (!THREE.GLTFLoader) return;
    const loader = new THREE.GLTFLoader();
    loader.load('assets/dragon.glb', (gltf) => {
      const root = gltf.scene;

      // Compute bounding box at scale=1
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

      // Extract and cache raw source data from each mesh
      _srcMeshData = [];
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
        const localBox = geo.boundingBox.clone();
        const weights  = computeDeformWeights(origPos, n);

        _srcMeshData.push({
          origPos,
          weights,
          localBox,
          indexAttr: geo.index ? geo.index.clone() : null,
          normalAttr: geo.attributes.normal ? geo.attributes.normal.clone() : null,
        });
      });

      glbLoaded = true;

      // Build player instance
      playerInst = buildInstance();
      positionInstance(playerInst, 0, 0, 0, Math.PI * 0.10);
      scene.add(playerInst.model);

      if (_pTraits) applyTraitsToInstance(playerInst, _pTraits, _pTint, '_p');
      else paintVertexColors(playerInst, _pTint);

    }, undefined, (err) => console.warn('GLB load failed:', err));
  }

  // --------------------------------------------------------
  // BUILD INSTANCE — fresh meshes from source data
  // --------------------------------------------------------
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

    const materials = [], meshes = [];

    _srcMeshData.forEach((src) => {
      const geo  = new THREE.BufferGeometry();
      const n    = src.origPos.length / 3;

      // Position buffer (writable copy)
      const posBuf = new Float32Array(src.origPos);
      geo.setAttribute('position', new THREE.BufferAttribute(posBuf, 3));

      // Normal buffer
      if (src.normalAttr) geo.setAttribute('normal', src.normalAttr.clone());

      // Index
      if (src.indexAttr) geo.setIndex(src.indexAttr.clone());

      // Colour buffer (will be painted later)
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));

      geo.computeBoundingBox();

      const mat = new THREE.MeshToonMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;

      mesh.userData.origPos  = src.origPos;     // shared read-only reference
      mesh.userData.weights  = src.weights;
      mesh.userData.localBox = src.localBox;

      model.add(mesh);
      materials.push(mat);
      meshes.push(mesh);
    });

    // Add eye spheres
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

  // --------------------------------------------------------
  // EYE SPHERES
  // Eyes are children of the model so they scale/move with it.
  // Positions in LOCAL model coordinates (before model scale).
  // --------------------------------------------------------
  function addEyes(model) {
    // Head is at +Z end. Eyes are slightly to the sides, elevated.
    const eyePositions = [
      [-0.085,  0.46,  0.74],   // left
      [ 0.085,  0.46,  0.74],   // right
    ];

    const eyes = [];
    eyePositions.forEach(([ex, ey, ez]) => {
      const group = new THREE.Group();
      group.position.set(ex, ey, ez);

      // Sclera (white)
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 10, 8),
        new THREE.MeshToonMaterial({ color: 0xffffff })
      );

      // Iris (tint colour, slightly smaller, pushed forward)
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.030, 10, 8),
        new THREE.MeshToonMaterial({ color: 0x3a6e5a })
      );
      iris.position.z = 0.022;

      // Pupil (black, smallest, furthest forward)
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 8, 6),
        new THREE.MeshToonMaterial({ color: 0x050508 })
      );
      pupil.position.z = 0.038;

      group.add(sclera, iris, pupil);
      model.add(group);
      eyes.push({ group, iris });
    });

    model.userData.eyes = eyes;
  }

  function updateEyeColor(model, tintHex) {
    const eyes = model.userData.eyes;
    if (!eyes) return;
    const tint = new THREE.Color(tintHex);
    // Iris: tint desaturated slightly, medium brightness
    const irisCol = tint.clone().lerp(new THREE.Color(0.6, 0.6, 0.6), 0.25);
    eyes.forEach(({ iris }) => {
      iris.material.color.copy(irisCol);
    });
  }

  // --------------------------------------------------------
  // DEFORMATION WEIGHTS  (computed once per source mesh)
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // VERTEX DEFORMATION
  // --------------------------------------------------------
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
        const sign = ox >= 0 ? 1 : -1;
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

  // --------------------------------------------------------
  // VERTEX COLOURS
  // Independent regions: belly, dorsal, wings, legs, dorsal
  // spikes, neck/head, underbelly highlight.
  // Computed from ORIGINAL positions (pre-deformation).
  // Eyes handled separately as spheres (always white/iris/pupil).
  // --------------------------------------------------------
  function paintVertexColors(inst, tintHex) {
    const tint   = new THREE.Color(tintHex);

    // ── PALETTE derived from tint ──────────────────────────
    const belly       = tint.clone().lerp(new THREE.Color(0.96, 0.88, 0.74), 0.55).multiplyScalar(1.14);
    const bellyDeep   = tint.clone().lerp(new THREE.Color(0.90, 0.78, 0.60), 0.40).multiplyScalar(1.05);
    const dorsal      = tint.clone().multiplyScalar(0.78);
    const wingUpper   = tint.clone().lerp(new THREE.Color(1,1,1), 0.32).multiplyScalar(1.12);
    const wingUnder   = tint.clone().lerp(new THREE.Color(0.95, 0.85, 0.70), 0.50).multiplyScalar(1.06);
    const legUpper    = tint.clone().multiplyScalar(0.82);
    const legLower    = tint.clone().lerp(new THREE.Color(0.15, 0.10, 0.08), 0.30).multiplyScalar(0.70);
    const spikeColor  = tint.clone().lerp(new THREE.Color(1,1,1), 0.45).multiplyScalar(0.95); // pale tinted spikes
    const neckColor   = tint.clone().lerp(new THREE.Color(1,1,1), 0.12).multiplyScalar(0.92);
    const headColor   = tint.clone().lerp(new THREE.Color(1,1,1), 0.20).multiplyScalar(0.96);

    inst.meshes.forEach((mesh) => {
      const geo  = mesh.geometry;
      const orig = mesh.userData.origPos;
      if (!orig) return;

      const cnt  = orig.length / 3;
      const lb   = mesh.userData.localBox;
      const spanY = lb.max.y - lb.min.y || 1;
      const spanX = lb.max.x - lb.min.x || 1;
      const centX = (lb.min.x + lb.max.x) / 2;
      const halfX = spanX / 2;
      const spanZ = lb.max.z - lb.min.z || 1;

      const buf = new Float32Array(cnt * 3);

      for (let i = 0; i < cnt; i++) {
        const x = orig[i*3], y = orig[i*3+1], z = orig[i*3+2];

        // Normalised position 0→1
        const ty  = (y - lb.min.y) / spanY;          // 0=feet, 1=top
        const tx  = Math.abs(x - centX) / halfX;     // 0=centre, 1=wing tip
        const tz  = (z - lb.min.z) / spanZ;           // 0=tail, 1=head

        const isWing      = tx > 0.52 && y > -0.15;
        const isNeckHead  = tz > 0.68 && ty > 0.35;
        const isSpike     = ty > 0.82 && tx < 0.35;
        const isLeg       = ty < 0.30 && tx < 0.60;

        let c;

        if (isSpike) {
          // Dorsal spikes — pale tinted, independent from body
          c = spikeColor.clone();

        } else if (isNeckHead) {
          // Neck and head region
          const headBlend = ss(0.68, 0.88, tz);
          c = neckColor.clone().lerp(headColor, headBlend);
          // Lower jaw / chin slightly darker
          if (ty < 0.52) c.multiplyScalar(0.88);

        } else if (isWing) {
          // Wing membrane — upper bright, lower warm
          const wingBlend = ss(0.52, 0.82, tx);
          if (y > 0) {
            c = wingUpper.clone().multiplyScalar(0.9 + 0.1 * wingBlend);
          } else {
            c = wingUnder.clone();
          }

        } else if (isLeg) {
          // Legs — upper muscular, lower dark feet
          const legBlend = 1 - ty / 0.30;
          c = legUpper.clone().lerp(legLower, legBlend * 0.7);

        } else {
          // Body — belly↔dorsal gradient by Y
          if (ty < 0.42) {
            // Underbelly
            const bellyBlend = 1 - ty / 0.42;
            c = bellyDeep.clone().lerp(belly, bellyBlend * 0.6);
          } else {
            // Mid-body to dorsal
            c = belly.clone().lerp(dorsal, ss(0.42, 0.78, ty));
          }
        }

        buf[i*3]   = c.r;
        buf[i*3+1] = c.g;
        buf[i*3+2] = c.b;
      }

      geo.setAttribute('color', new THREE.BufferAttribute(buf, 3));
      geo.attributes.color.needsUpdate = true;
    });

    updateEyeColor(inst.model, tintHex);
  }

  // --------------------------------------------------------
  // APPLY TRAITS TO INSTANCE
  // --------------------------------------------------------
  function applyTraitsToInstance(inst, traits, tintHex, cacheKey) {
    if (!inst) return;
    const n    = normTraits(traits);
    const meta = _srcModelMeta;
    const sc   = meta.baseScale;

    // Overall scale from bodyMass
    const scMass = 0.78 + (n.bodyMass || 0.5) * 0.44;
    inst.model.scale.setScalar(sc * scMass);

    // Recalculate floor Y
    const offX = inst.model.userData.worldOffsetX || 0;
    const offZ = inst.model.userData.worldOffsetZ || 0;
    inst.model.position.set(
      offX + -meta.meshCentreX * sc * scMass,
      -meta.meshMinY * sc * scMass,
      offZ + -meta.meshCentreZ * sc * scMass
    );

    // Vertex deformation (skip if unchanged)
    const hash = traitHash(traits);
    const hashKey = cacheKey + 'hash';
    if (hash !== inst.model.userData[hashKey]) {
      inst.model.userData[hashKey] = hash;
      inst.meshes.forEach(mesh => applyDeformation(mesh, n));
    }

    // Vertex colours (skip if tint unchanged)
    const tintKey = cacheKey + 'tint';
    if (tintHex !== inst.model.userData[tintKey]) {
      inst.model.userData[tintKey] = tintHex;
      paintVertexColors(inst, tintHex);
    }

    // Fire emission
    const nFuel   = n.fuelGlandSize      || 0;
    const nIgn    = n.ignitionEfficiency || 0;
    const glowAmt = nFuel * 0.5 + nFuel * nIgn * 0.5;
    const fireCol = new THREE.Color(1.0, 0.3 + nIgn * 0.2, 0);
    inst.materials.forEach(mat => {
      mat.emissive.copy(fireCol).multiplyScalar(glowAmt * 0.45);
    });

    // Rim light tracks player tint
    if (cacheKey === '_p' && rimLight) {
      rimLight.color.set(tintHex);
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

    // Idle anim params
    inst.model.userData.metabRate = 0.65 + (n.metabolism   || 0.5) * 0.70;
    inst.model.userData.muscleAmp = 0.025 + (n.musclePower || 0.5) * 0.04;
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

  // --------------------------------------------------------
  // FLOOR
  // --------------------------------------------------------
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
  }

  // --------------------------------------------------------
  // PUBLIC DRAGON API
  // --------------------------------------------------------
  function buildPlayerDragon(traits, tintColor) {
    _pTraits = traits;
    _pTint   = tintColor || '#3a6e5a';
    if (playerInst) applyTraitsToInstance(playerInst, _pTraits, _pTint, '_p');
  }

  function updateDragon(traits, tintColor) {
    _pTraits = traits;
    _pTint   = tintColor || _pTint;
    if (playerInst) applyTraitsToInstance(playerInst, _pTraits, _pTint, '_p');
  }

  // --------------------------------------------------------
  // ANIMATE
  // --------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time  = clock.getElapsedTime();
    controls.update();

    // Idle bob for visible instances
    [playerInst, enemyInst].forEach((inst) => {
      if (!inst || !inst.model.visible) return;
      const rate   = inst.model.userData.metabRate || 0.9;
      const amp    = inst.model.userData.muscleAmp || 0.04;
      const scY    = inst.model.scale.y;
      const floorY = -_srcModelMeta.meshMinY * scY;
      const offZ   = inst.model.userData.worldOffsetZ || 0;
      const baseRotY = inst.model.userData.baseRotY || 0;

      inst.model.position.y = floorY + Math.sin(time * rate) * amp;
      inst.model.rotation.y = baseRotY + Math.sin(time * 0.18) * (currentMode === 'lab' ? 0.18 : 0.04);
    });

    updateParticles(delta);
    renderer.render(scene, camera);
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

  // --------------------------------------------------------
  // BATTLE ARENA — two 3D dragons facing each other
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    _pTraits = playerTraits; _pTint = playerTint || '#3a6e5a';
    _eTraits = enemyTraits;  _eTint = enemyTint  || '#7a2828';

    // Reposition player to left side, facing right
    if (playerInst) {
      playerInst.model.userData.worldOffsetX = -2.5;
      playerInst.model.userData.worldOffsetZ =  0;
      positionInstance(playerInst, -2.5, 0, 0, -Math.PI * 0.35);
      applyTraitsToInstance(playerInst, _pTraits, _pTint, '_p');
    }

    // Build enemy instance if needed (first battle)
    if (!enemyInst && glbLoaded) {
      enemyInst = buildInstance();
      scene.add(enemyInst.model);
    }

    if (enemyInst) {
      positionInstance(enemyInst, 2.5, 0, 0, Math.PI + Math.PI * 0.35);
      applyTraitsToInstance(enemyInst, _eTraits, _eTint, '_e');
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

    // Re-centre player dragon
    if (playerInst) {
      positionInstance(playerInst, 0, 0, 0, Math.PI * 0.10);
      if (_pTraits) applyTraitsToInstance(playerInst, _pTraits, _pTint, '_p');
    }

    // Hide enemy
    if (enemyInst) enemyInst.model.visible = false;

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

  // --------------------------------------------------------
  // ENVIRONMENT / RESIZE
  // --------------------------------------------------------
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
    setEnvironment, resetEnvironment, resize
  };
})();
