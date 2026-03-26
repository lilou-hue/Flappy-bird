// ============================================================
// Dragon Engineering Lab — Three.js Scene (v3 — Clean Rebuild)
// Spline-based body, silhouette-first design, elegant wings.
// ============================================================

window.Scene = (function() {
  let renderer, scene, camera, controls, clock;
  let dragonGroup, enemyGroup;
  let animationId;
  let currentMode = 'lab';
  let labObjects = [];

  const P = {};       // player dragon parts
  const EP = {};      // enemy dragon parts
  let baseState = {}; // stored base values for idle anim

  // --------------------------------------------------------
  // INIT
  // --------------------------------------------------------
  function init(container) {
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0e1e);
    scene.fog = new THREE.FogExp2(0x0e0e1e, 0.028);

    camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 80);
    camera.position.set(3.5, 2.8, 5.0);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.minDistance = 2.5;
    controls.maxDistance = 12;
    controls.update();

    setupLighting();
    setupFloor();

    dragonGroup = new THREE.Group();
    scene.add(dragonGroup);

    animate();
    window.addEventListener('resize', () => resize(container));
  }

  // --------------------------------------------------------
  // LIGHTING — bright enough to read, dark enough to feel premium
  // --------------------------------------------------------
  function setupLighting() {
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    const hemi = new THREE.HemisphereLight(0x6677aa, 0x222218, 0.7);
    scene.add(hemi); labObjects.push(hemi);

    // Key: warm, upper-right
    const key = new THREE.DirectionalLight(0xfff0dd, 1.1);
    key.position.set(3, 7, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 18;
    key.shadow.camera.left = -5; key.shadow.camera.right = 5;
    key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.001;
    scene.add(key); labObjects.push(key);

    // Fill: cool, left
    const fill = new THREE.DirectionalLight(0x99bbdd, 0.5);
    fill.position.set(-4, 3, 2);
    scene.add(fill); labObjects.push(fill);

    // Rim: behind for silhouette pop
    const rim = new THREE.PointLight(0x7799cc, 0.7, 12);
    rim.position.set(-1, 3.5, -4);
    scene.add(rim); labObjects.push(rim);

    // Floor accent
    const accent = new THREE.PointLight(0x00cc99, 0.2, 6);
    accent.position.set(0, 0.2, 0);
    scene.add(accent); labObjects.push(accent);
  }

  function setupFloor() {
    const grid = new THREE.GridHelper(14, 20, 0x1a3535, 0x0c1a1a);
    scene.add(grid); labObjects.push(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: 0x0c0c18, roughness: 0.85, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground); labObjects.push(ground);
  }

  // --------------------------------------------------------
  // MATERIAL PALETTE
  // --------------------------------------------------------
  function mkBodyMat(tint, n) {
    const c = new THREE.Color(0x2a6050).lerp(new THREE.Color(tint), 0.2);
    return new THREE.MeshStandardMaterial({
      color: c,
      metalness: 0.06 + n.scaleThickness * 0.16,
      roughness: 0.7 - n.scaleThickness * 0.15,
    });
  }
  function mkAccentMat(tint, n) {
    const c = new THREE.Color(0x1e4a3e).lerp(new THREE.Color(tint), 0.15);
    return new THREE.MeshStandardMaterial({
      color: c,
      metalness: 0.2 + n.scaleThickness * 0.2,
      roughness: 0.5,
    });
  }
  function mkMembraneMat(tint, n) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x7a5540).lerp(new THREE.Color(tint), 0.1),
      transparent: true, opacity: 0.25 + n.wingArea * 0.45,
      side: THREE.DoubleSide, metalness: 0.0, roughness: 0.9,
    });
  }
  function mkBoneMat() {
    return new THREE.MeshStandardMaterial({ color: 0x6a5a44, metalness: 0.12, roughness: 0.55 });
  }
  function mkSacMat(n) {
    return new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff4400,
      emissiveIntensity: 0.15 + n.fuelGlandSize * 1.2,
      transparent: true, opacity: 0.25 + n.fuelGlandSize * 0.55,
      metalness: 0, roughness: 0.35,
    });
  }

  // --------------------------------------------------------
  // HELPER: smooth tube along points
  // --------------------------------------------------------
  function makeTube(points, radiusFn, segments, radialSegs, mat) {
    const curve = new THREE.CatmullRomCurve3(points);
    // TubeGeometry doesn't support varying radius, so we use LatheGeometry trick:
    // Build a custom TubeBufferGeometry with per-segment radius
    const tubSegs = segments || 24;
    const radSegs = radialSegs || 10;
    const frames = curve.computeFrenetFrames(tubSegs, false);
    const positions = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i <= tubSegs; i++) {
      const t = i / tubSegs;
      const pos = curve.getPointAt(t);
      const N = frames.normals[i];
      const B = frames.binormals[i];
      const r = radiusFn(t);

      for (let j = 0; j <= radSegs; j++) {
        const angle = (j / radSegs) * Math.PI * 2;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        const nx = cos * N.x + sin * B.x;
        const ny = cos * N.y + sin * B.y;
        const nz = cos * N.z + sin * B.z;

        positions.push(pos.x + r * nx, pos.y + r * ny, pos.z + r * nz);
        normals.push(nx, ny, nz);
      }
    }

    for (let i = 0; i < tubSegs; i++) {
      for (let j = 0; j < radSegs; j++) {
        const a = i * (radSegs + 1) + j;
        const b = a + radSegs + 1;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  // --------------------------------------------------------
  // BUILD DRAGON
  // The body is ONE continuous spline tube: tail → torso → neck → head
  // Wings, limbs, horns, eyes attach to computed points on the spline.
  // --------------------------------------------------------
  function buildDragon(traits, tintColor, ref) {
    const group = new THREE.Group();
    const tint = tintColor || '#3a6e5a';
    const t = traits;

    // Normalize
    const n = {};
    window.DragonData.TRAITS.forEach(tr => {
      n[tr.id] = Math.max(0, Math.min(1, (t[tr.id] - tr.min) / (tr.max - tr.min)));
    });

    // ---- BODY SPLINE ----
    // Key dimensions derived from stats
    const bulk = 0.5 + n.bodyMass * 0.5;         // overall thickness
    const neckLen = 0.8 + n.neckLength * 0.7;     // neck extension
    const tailLen = 0.8 + n.tailSize * 1.0;        // tail extension
    const torsoLen = 0.7 + n.bodyMass * 0.4;       // torso length
    const muscle = 0.85 + n.musclePower * 0.15;    // width multiplier

    // Spline control points (Z = forward, Y = up)
    // Tail tip → tail mid → hip → torso peak → shoulder → neck mid → head base → snout
    const bodyPoints = [
      new THREE.Vector3(0, 0.6 - tailLen * 0.15, -(torsoLen * 0.5 + tailLen)),         // 0: tail tip
      new THREE.Vector3(0, 0.7,                  -(torsoLen * 0.5 + tailLen * 0.5)),    // 1: tail mid
      new THREE.Vector3(0, 0.85 + bulk * 0.15,   -(torsoLen * 0.4)),                   // 2: hip
      new THREE.Vector3(0, 0.95 + bulk * 0.25,   0),                                    // 3: torso center (highest)
      new THREE.Vector3(0, 0.9 + bulk * 0.2,     torsoLen * 0.35),                     // 4: shoulder
      new THREE.Vector3(0, 1.0 + bulk * 0.15,    torsoLen * 0.35 + neckLen * 0.45),    // 5: neck mid
      new THREE.Vector3(0, 1.15 + bulk * 0.1 + neckLen * 0.15, torsoLen * 0.35 + neckLen * 0.85), // 6: head base
      new THREE.Vector3(0, 1.15 + bulk * 0.08 + neckLen * 0.12, torsoLen * 0.35 + neckLen + 0.25), // 7: snout
    ];

    // Radius along the spline (t=0 is tail tip, t=1 is snout)
    const maxR = 0.2 + bulk * 0.2;
    function bodyRadius(t) {
      // Tail: thin → thick. Torso: thick. Neck: tapers. Head: bulge then taper.
      if (t < 0.12) return 0.02 + t * 1.2 * maxR * 0.5;                    // tail tip
      if (t < 0.25) return maxR * 0.3 + (t - 0.12) * maxR * 3.0;           // tail thickening
      if (t < 0.55) return maxR * muscle;                                     // torso (widest)
      if (t < 0.7)  return maxR * muscle * (1.0 - (t - 0.55) * 2.5);        // shoulder taper
      if (t < 0.85) return maxR * 0.35 + n.musclePower * 0.05;              // neck
      if (t < 0.92) return maxR * 0.4 + n.intelligence * 0.03;              // head bulge
      return maxR * 0.25 * (1.0 - (t - 0.92) * 8);                          // snout taper
    }

    const body = makeTube(bodyPoints, bodyRadius, 32, 12, mkBodyMat(tint, n));
    body.name = 'body';
    group.add(body);
    ref.body = body;

    // We need anchor positions from the spline for attaching parts
    const spline = new THREE.CatmullRomCurve3(bodyPoints);
    const shoulderPt = spline.getPointAt(0.52);  // shoulder area
    const hipPt = spline.getPointAt(0.28);        // hip area
    const neckPt = spline.getPointAt(0.75);       // mid-neck
    const headPt = spline.getPointAt(0.88);       // head center
    const snoutPt = spline.getPointAt(0.97);      // snout tip
    const bellyPt = spline.getPointAt(0.4);       // belly for fuel sac
    const spinePts = [0.2, 0.3, 0.4, 0.5, 0.55]; // spine ridge positions

    // ---- BELLY ARMOR (subtle underside overlay) ----
    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.4),
      mkAccentMat(tint, n)
    );
    const bellyR = maxR * muscle * 0.7;
    belly.scale.set(bellyR, bellyR * 0.4, torsoLen * 0.5 + 0.1);
    belly.position.set(0, bellyPt.y - maxR * muscle * 0.3, bellyPt.z);
    belly.rotation.x = Math.PI;
    belly.name = 'belly';
    group.add(belly);
    ref.belly = belly;

    // ---- FUEL SAC ----
    const sacSz = 0.06 + n.fuelGlandSize * 0.16;
    const fuelSac = new THREE.Mesh(
      new THREE.SphereGeometry(sacSz, 10, 8),
      mkSacMat(n)
    );
    fuelSac.position.set(0, bellyPt.y - maxR * 0.1, bellyPt.z - 0.15);
    fuelSac.name = 'fuelSac';
    group.add(fuelSac);
    ref.fuelSac = fuelSac;

    if (n.fuelGlandSize > 0.15) {
      const sacLight = new THREE.PointLight(0xff5500, n.fuelGlandSize * 0.5, 1.5);
      sacLight.position.copy(fuelSac.position);
      sacLight.name = 'sacLight';
      group.add(sacLight);
      ref.sacLight = sacLight;
    }

    // ---- HEAD DETAILS ----
    // Horns
    const hornH = 0.08 + n.boneDensity * 0.1;
    const hornGeo = new THREE.ConeGeometry(0.025 + n.boneDensity * 0.01, hornH, 5);
    const bm = mkBoneMat();

    const hornL = new THREE.Mesh(hornGeo, bm);
    hornL.position.set(-0.06, headPt.y + 0.08, headPt.z - 0.05);
    hornL.rotation.set(-0.4, 0, 0.3);
    hornL.name = 'hornL';
    group.add(hornL); ref.hornL = hornL;

    const hornR = new THREE.Mesh(hornGeo.clone(), bm.clone());
    hornR.position.set(0.06, headPt.y + 0.08, headPt.z - 0.05);
    hornR.rotation.set(-0.4, 0, -0.3);
    hornR.name = 'hornR';
    group.add(hornR); ref.hornR = hornR;

    // Eyes
    const eyeR_sz = 0.02 + n.intelligence * 0.006;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xbbffcc, emissive: 0x44ff88, emissiveIntensity: 0.7
    });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(eyeR_sz, 8, 6), eyeMat);
    eyeL.position.set(-0.07, headPt.y + 0.02, headPt.z + 0.08);
    eyeL.name = 'eyeL';
    group.add(eyeL); ref.eyeL = eyeL;

    const eyeRm = new THREE.Mesh(new THREE.SphereGeometry(eyeR_sz, 8, 6), eyeMat.clone());
    eyeRm.position.set(0.07, headPt.y + 0.02, headPt.z + 0.08);
    eyeRm.name = 'eyeR';
    group.add(eyeRm); ref.eyeR = eyeRm;

    // ---- SPINE RIDGES ----
    const ridgeCount = 3 + Math.floor(n.scaleThickness * 3);
    const ridgeMt = mkAccentMat(tint, n);
    for (let i = 0; i < ridgeCount; i++) {
      const st = 0.18 + (i / Math.max(ridgeCount - 1, 1)) * 0.45;
      const pt = spline.getPointAt(st);
      const rh = 0.03 + n.scaleThickness * 0.05 * (1 - Math.abs(st - 0.35) * 2);
      if (rh < 0.015) continue;
      const ridge = new THREE.Mesh(new THREE.OctahedronGeometry(rh, 0), ridgeMt);
      ridge.position.set(0, pt.y + bodyRadius(st) * 0.85, pt.z);
      ridge.scale.set(0.35, 1.2, 0.55);
      ridge.name = 'ridge_' + i;
      group.add(ridge);
    }

    // ---- FORELIMBS ----
    const limbRad = 0.04 + n.musclePower * 0.025 + n.bodyMass * 0.01;
    const limbLen = 0.3 + n.bodyMass * 0.15;
    const limbMt = mkBodyMat(tint, n);

    // Attach to shoulder area
    const fLegY = shoulderPt.y - bodyRadius(0.52) * 0.6;
    const fLegZ = shoulderPt.z;

    const foreL = new THREE.Mesh(
      new THREE.CylinderGeometry(limbRad * 0.55, limbRad, limbLen, 8),
      limbMt
    );
    foreL.position.set(-maxR * muscle * 0.65, fLegY - limbLen * 0.35, fLegZ);
    foreL.castShadow = true;
    foreL.name = 'foreL';
    group.add(foreL); ref.foreL = foreL;

    const foreR = new THREE.Mesh(
      new THREE.CylinderGeometry(limbRad * 0.55, limbRad, limbLen, 8),
      limbMt.clone()
    );
    foreR.position.set(maxR * muscle * 0.65, fLegY - limbLen * 0.35, fLegZ);
    foreR.castShadow = true;
    foreR.name = 'foreR';
    group.add(foreR); ref.foreR = foreR;

    // ---- HINDLIMBS ----
    const hRad = limbRad * 1.2;
    const hLen = limbLen * 1.1;
    const hLegY = hipPt.y - bodyRadius(0.28) * 0.5;
    const hLegZ = hipPt.z;

    const hindL = new THREE.Mesh(
      new THREE.CylinderGeometry(hRad * 0.55, hRad, hLen, 8),
      limbMt.clone()
    );
    hindL.position.set(-maxR * muscle * 0.55, hLegY - hLen * 0.35, hLegZ);
    hindL.castShadow = true;
    hindL.name = 'hindL';
    group.add(hindL); ref.hindL = hindL;

    const hindR = new THREE.Mesh(
      new THREE.CylinderGeometry(hRad * 0.55, hRad, hLen, 8),
      limbMt.clone()
    );
    hindR.position.set(maxR * muscle * 0.55, hLegY - hLen * 0.35, hLegZ);
    hindR.castShadow = true;
    hindR.name = 'hindR';
    group.add(hindR); ref.hindR = hindR;

    // ---- WINGS ----
    const wingSpan = 0.7 + n.wingspan * 1.8;
    const wingArea = 0.3 + n.wingArea * 0.7;
    const boneRad = 0.02 + n.boneDensity * 0.008;

    // Wing anchor: shoulder top
    const wAnchorY = shoulderPt.y + bodyRadius(0.52) * 0.5;
    const wAnchorZ = shoulderPt.z;

    // Wing shape: defined as a 2D silhouette, extruded to flat mesh
    // Points: shoulder → elbow → tip → trailing edge → body
    function makeWingShape(side) {
      const s = side; // -1 = left, 1 = right
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);                                             // shoulder
      shape.quadraticCurveTo(s * wingSpan * 0.3, wingSpan * 0.12,    // elbow curve
                             s * wingSpan * 0.55, wingSpan * 0.05);  // mid-wing
      shape.lineTo(s * wingSpan * 0.75, -wingSpan * 0.03);            // wing tip
      shape.quadraticCurveTo(s * wingSpan * 0.5, -wingArea * 0.4,    // trailing droop
                             s * wingSpan * 0.15, -wingArea * 0.5);  // near body
      shape.lineTo(0, -wingArea * 0.2);                               // body attach
      shape.lineTo(0, 0);                                             // close

      const geo = new THREE.ShapeGeometry(shape, 6);
      return geo;
    }

    const memMatL = mkMembraneMat(tint, n);
    const wingL = new THREE.Mesh(makeWingShape(-1), memMatL);
    wingL.position.set(0, wAnchorY, wAnchorZ);
    wingL.rotation.x = -0.15; // slight backward tilt
    wingL.name = 'wingL';
    group.add(wingL); ref.wingL = wingL;

    const wingR = new THREE.Mesh(makeWingShape(1), mkMembraneMat(tint, n));
    wingR.position.set(0, wAnchorY, wAnchorZ);
    wingR.rotation.x = -0.15;
    wingR.name = 'wingR';
    group.add(wingR); ref.wingR = wingR;

    // Wing leading edge bone (one per wing)
    const wingBoneLen = wingSpan * 0.6;
    const wbGeo = new THREE.CylinderGeometry(boneRad * 0.4, boneRad, wingBoneLen, 5);

    const wbL = new THREE.Mesh(wbGeo, mkBoneMat());
    wbL.position.set(-wingBoneLen * 0.25, wAnchorY + wingSpan * 0.04, wAnchorZ);
    wbL.rotation.z = Math.PI * 0.35 + n.wingspan * 0.05;
    wbL.name = 'wingBoneL';
    group.add(wbL); ref.wingBoneL = wbL;

    const wbR = new THREE.Mesh(wbGeo.clone(), mkBoneMat());
    wbR.position.set(wingBoneLen * 0.25, wAnchorY + wingSpan * 0.04, wAnchorZ);
    wbR.rotation.z = -(Math.PI * 0.35 + n.wingspan * 0.05);
    wbR.name = 'wingBoneR';
    group.add(wbR); ref.wingBoneR = wbR;

    return group;
  }

  // --------------------------------------------------------
  // BUILD / REBUILD
  // --------------------------------------------------------
  function clearGroup(grp, partsObj) {
    while (grp.children.length > 0) {
      const child = grp.children[0];
      grp.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
    Object.keys(partsObj).forEach(k => delete partsObj[k]);
  }

  function buildPlayerDragon(traits, tintColor) {
    clearGroup(dragonGroup, P);
    const built = buildDragon(traits, tintColor, P);
    built.children.forEach(c => dragonGroup.add(c));

    // Store base values for animation
    baseState = {};
    Object.keys(P).forEach(k => {
      if (P[k] && P[k].position) {
        baseState[k] = {
          y: P[k].position.y,
          ry: P[k].rotation ? P[k].rotation.y : 0,
          rz: P[k].rotation ? P[k].rotation.z : 0,
        };
      }
    });
  }

  function updateDragon(traits, tintColor) {
    buildPlayerDragon(traits, tintColor);
  }

  // --------------------------------------------------------
  // IDLE ANIMATION
  // --------------------------------------------------------
  function animateIdle(time) {
    if (!P.body) return;
    const B = baseState;

    // Subtle body breathing — slight Y bob
    if (P.body && B.body) {
      P.body.position.y = B.body.y + Math.sin(time * 1.5) * 0.008;
    }

    // Wing flutter
    if (P.wingL && B.wingL) {
      P.wingL.rotation.z = Math.sin(time * 0.7) * 0.03;
      P.wingR.rotation.z = -Math.sin(time * 0.7) * 0.03;
    }

    // Fuel sac pulse
    if (P.fuelSac && P.fuelSac.material) {
      const bi = P.fuelSac.material._baseEI;
      if (bi === undefined) P.fuelSac.material._baseEI = P.fuelSac.material.emissiveIntensity;
      P.fuelSac.material.emissiveIntensity = (P.fuelSac.material._baseEI || 0.5) + Math.sin(time * 2.0) * 0.15;
    }
  }

  // --------------------------------------------------------
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    camera.position.set(0, 4.5, 11);
    controls.target.set(0, 1.2, 0);

    const arenaColors = {
      mountains: 0x141e18, tundra: 0x141e28,
      volcanic: 0x1e1010, forest: 0x0a140a, plains: 0x1a1a10
    };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x0e0e1e);

    dragonGroup.position.set(-2.5, 0, 0);
    dragonGroup.rotation.y = Math.PI * 0.12;

    if (enemyGroup) { clearGroup(enemyGroup, EP); scene.remove(enemyGroup); }
    enemyGroup = new THREE.Group();
    const built = buildDragon(enemyTraits, enemyTint, EP);
    built.children.forEach(c => enemyGroup.add(c));
    enemyGroup.position.set(2.5, 0, 0);
    enemyGroup.rotation.y = -Math.PI * 0.12;
    scene.add(enemyGroup);
  }

  function returnToLab() {
    currentMode = 'lab';
    camera.position.set(3.5, 2.8, 5.0);
    controls.target.set(0, 1.2, 0);
    dragonGroup.position.set(0, 0, 0);
    dragonGroup.rotation.y = 0;
    scene.background = new THREE.Color(0x0e0e1e);
    scene.fog = new THREE.FogExp2(0x0e0e1e, 0.028);

    if (enemyGroup) { clearGroup(enemyGroup, EP); scene.remove(enemyGroup); enemyGroup = null; }
  }

  // --------------------------------------------------------
  // BATTLE TICK ANIMATION
  // --------------------------------------------------------
  function animateBattleTick(tickRecord) {
    if (!tickRecord) return;
    const pa = tickRecord.playerAction;
    const ea = tickRecord.enemyAction;

    if (['lunge','bite','claw','pressure'].includes(pa)) animateLunge(dragonGroup, 0.3);
    if (['lunge','bite','claw','pressure'].includes(ea)) animateLunge(enemyGroup, -0.3);
    if (['fireBurst','sustainedFire'].includes(pa)) playFireEffect(dragonGroup, enemyGroup);
    if (['fireBurst','sustainedFire'].includes(ea)) playFireEffect(enemyGroup, dragonGroup);
    if (tickRecord.playerDamageDealt > 5 && enemyGroup) playImpactEffect(enemyGroup.position.clone().add(new THREE.Vector3(0,1.3,0)));
    if (tickRecord.enemyDamageDealt > 5) playImpactEffect(dragonGroup.position.clone().add(new THREE.Vector3(0,1.3,0)));
  }

  let lungeAnims = [];
  function animateLunge(grp, offset) {
    if (!grp) return;
    lungeAnims.push({ group: grp, offset, startZ: grp.position.z, phase: 0, duration: 0.35 });
  }

  let fireParticles = [];
  function playFireEffect(src, tgt) {
    if (!src || !tgt) return;
    const start = src.position.clone().add(new THREE.Vector3(0, 1.5, 0.4));
    const end = tgt.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 5, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.04 + Math.random() * 0.06, 1, 0.4 + Math.random() * 0.3),
        transparent: true, opacity: 0.9
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(start).add(new THREE.Vector3((Math.random()-0.5)*0.12, (Math.random()-0.5)*0.12, 0));
      scene.add(p);
      fireParticles.push({ mesh: p, start: start.clone(), end: end.clone(), progress: i * -0.04, speed: 1.6 + Math.random() * 0.6 });
    }
  }

  let impactFlashes = [];
  function playImpactEffect(pos) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 })
    );
    flash.position.copy(pos);
    scene.add(flash);
    impactFlashes.push({ mesh: flash, life: 1.0 });
  }

  // --------------------------------------------------------
  // ANIMATION LOOP
  // --------------------------------------------------------
  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    controls.update();

    if (currentMode === 'lab') animateIdle(time);

    lungeAnims = lungeAnims.filter(la => {
      la.phase += delta / la.duration;
      if (la.phase >= 1) { la.group.position.z = la.startZ; return false; }
      const t = la.phase < 0.5 ? la.phase * 2 : (1 - la.phase) * 2;
      la.group.position.z = la.startZ + la.offset * t;
      return true;
    });

    fireParticles = fireParticles.filter(fp => {
      fp.progress += delta * fp.speed;
      if (fp.progress < 0) return true;
      if (fp.progress >= 1) { scene.remove(fp.mesh); fp.mesh.geometry.dispose(); fp.mesh.material.dispose(); return false; }
      fp.mesh.position.lerpVectors(fp.start, fp.end, fp.progress);
      fp.mesh.position.y += Math.sin(fp.progress * Math.PI) * 0.2;
      fp.mesh.material.opacity = 1 - fp.progress * 0.8;
      fp.mesh.scale.setScalar(1 + fp.progress * 0.7);
      return true;
    });

    impactFlashes = impactFlashes.filter(fl => {
      fl.life -= delta * 4;
      if (fl.life <= 0) { scene.remove(fl.mesh); fl.mesh.geometry.dispose(); fl.mesh.material.dispose(); return false; }
      fl.mesh.material.opacity = fl.life;
      fl.mesh.scale.setScalar(1 + (1 - fl.life) * 1.8);
      return true;
    });

    renderer.render(scene, camera);
  }

  function resize(container) {
    if (!renderer || !container) return;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  }

  function setEnvironment(habitatKey) {
    const colors = { mountains: 0x121e16, tundra: 0x121e28, volcanic: 0x1e0e0e, forest: 0x0a140a, plains: 0x181810 };
    scene.background = new THREE.Color(colors[habitatKey] || 0x0e0e1e);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x0e0e1e);
  }

  return {
    init, buildPlayerDragon, updateDragon,
    initBattleArena, returnToLab, animateBattleTick,
    playFireEffect, playImpactEffect,
    setEnvironment, resetEnvironment, resize,
    _dragonGroup: dragonGroup, _DRAGON_PARTS: P
  };
})();
