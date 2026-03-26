// ============================================================
// Dragon Engineering Lab — Three.js Scene (Redesigned)
// Anchored anatomical rig, improved silhouette, better lighting,
// premium materials, hero camera framing.
// ============================================================

window.Scene = (function() {
  let renderer, scene, camera, controls;
  let dragonGroup, enemyGroup;
  let clock;
  let animationId;
  let currentMode = 'lab';
  let labObjects = [];

  const DRAGON_PARTS = {};
  const ENEMY_PARTS = {};

  // Store base positions for idle animation (set during build)
  let basePositions = {};

  // --------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------
  function init(container) {
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0c1e);
    scene.fog = new THREE.FogExp2(0x0c0c1e, 0.035);

    // Hero camera — 3/4 view, slightly above, looking at chest height
    camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4.5, 3.0, 5.5);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.4, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.update();

    setupLabLighting();
    setupLabFloor();

    dragonGroup = new THREE.Group();
    scene.add(dragonGroup);

    animate();
    window.addEventListener('resize', () => resize(container));
  }

  // --------------------------------------------------------
  // LIGHTING — 3-point + environment
  // --------------------------------------------------------
  function setupLabLighting() {
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    // Hemisphere: cool sky, warm ground
    const hemi = new THREE.HemisphereLight(0x5566aa, 0x222211, 0.6);
    scene.add(hemi);
    labObjects.push(hemi);

    // Key light — warm directional from upper-right-front
    const key = new THREE.DirectionalLight(0xffeedd, 1.0);
    key.position.set(4, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.001;
    scene.add(key);
    labObjects.push(key);

    // Fill light — cool from left
    const fill = new THREE.DirectionalLight(0x88aacc, 0.4);
    fill.position.set(-4, 3, 2);
    scene.add(fill);
    labObjects.push(fill);

    // Rim light — behind and above for silhouette separation
    const rim = new THREE.PointLight(0x6688cc, 0.6, 15);
    rim.position.set(-2, 4, -4);
    scene.add(rim);
    labObjects.push(rim);

    // Floor glow — subtle teal from below
    const glow = new THREE.PointLight(0x00aa88, 0.25, 8);
    glow.position.set(0, 0.1, 0);
    scene.add(glow);
    labObjects.push(glow);
  }

  // --------------------------------------------------------
  // FLOOR
  // --------------------------------------------------------
  function setupLabFloor() {
    const grid = new THREE.GridHelper(16, 24, 0x1a3a3a, 0x0a1a1a);
    grid.position.y = 0;
    scene.add(grid);
    labObjects.push(grid);

    const groundGeo = new THREE.PlaneGeometry(16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0e0e18, roughness: 0.85, metalness: 0.15
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    labObjects.push(ground);
  }

  // --------------------------------------------------------
  // MATERIAL HELPERS
  // --------------------------------------------------------
  function bodyMat(tint, n) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x2a5e4e).lerp(new THREE.Color(tint), 0.25),
      metalness: 0.08 + (n.scaleThickness || 0) * 0.18,
      roughness: 0.65 - (n.scaleThickness || 0) * 0.15,
    });
  }

  function armorMat(tint, n) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x3a4a4a).lerp(new THREE.Color(tint), 0.15),
      metalness: 0.3 + (n.scaleThickness || 0) * 0.25,
      roughness: 0.4 - (n.scaleThickness || 0) * 0.1,
    });
  }

  function membraneMat(tint, n) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x885544).lerp(new THREE.Color(tint), 0.15),
      transparent: true,
      opacity: 0.3 + (n.wingArea || 0) * 0.4,
      side: THREE.DoubleSide,
      metalness: 0.02,
      roughness: 0.85,
    });
  }

  function boneMat() {
    return new THREE.MeshStandardMaterial({
      color: 0x665544, metalness: 0.15, roughness: 0.5,
    });
  }

  function sacMat(n) {
    const intensity = 0.2 + (n.fuelGlandSize || 0) * 1.0;
    return new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: intensity,
      transparent: true,
      opacity: 0.3 + (n.fuelGlandSize || 0) * 0.5,
      metalness: 0,
      roughness: 0.3,
    });
  }

  // --------------------------------------------------------
  // PROCEDURAL DRAGON — ANCHORED RIG
  // All parts position relative to their parent anchor.
  // --------------------------------------------------------
  function buildDragon(traits, tintColor, partsRef) {
    const group = new THREE.Group();
    const tint = tintColor || '#3a6e5a';
    const t = traits;

    // Normalize all traits to 0-1
    const n = {};
    window.DragonData.TRAITS.forEach(tr => {
      n[tr.id] = (t[tr.id] - tr.min) / (tr.max - tr.min);
    });

    // ============ TORSO (root anchor) ============
    const torsoW = 0.55 + n.bodyMass * 0.45;
    const torsoH = 0.45 + n.bodyMass * 0.3 + n.musclePower * 0.1;
    const torsoD = 0.7 + n.bodyMass * 0.5;
    const torsoY = 0.9 + n.bodyMass * 0.25 + n.musclePower * 0.05;

    const torso = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      bodyMat(tint, n)
    );
    torso.scale.set(torsoW, torsoH, torsoD);
    torso.position.set(0, torsoY, 0);
    torso.castShadow = true;
    torso.name = 'torso';
    group.add(torso);
    partsRef.torso = torso;

    // Chest plate (overlapping armor layer)
    const chestMt = armorMat(tint, n);
    chestMt.transparent = true;
    chestMt.opacity = 0.2 + n.scaleThickness * 0.6;
    const chest = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), chestMt);
    chest.scale.set(torsoW * 1.04, torsoH * 0.8, torsoD * 0.6);
    // ANCHORED to torso
    chest.position.set(0, torsoY - torsoH * 0.05, torsoD * 0.15);
    chest.name = 'chest';
    group.add(chest);
    partsRef.chest = chest;

    // ============ ABDOMEN (anchored to torso rear) ============
    const abdW = torsoW * 0.8;
    const abdH = torsoH * 0.65;
    const abdD = 0.4 + n.stomachCapacity * 0.25;
    const abdomen = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 10),
      bodyMat(tint, n)
    );
    abdomen.scale.set(abdW, abdH, abdD);
    // ANCHORED: rear of torso
    abdomen.position.set(0, torsoY - torsoH * 0.12, -(torsoD * 0.65 + abdD * 0.3));
    abdomen.castShadow = true;
    abdomen.name = 'abdomen';
    group.add(abdomen);
    partsRef.abdomen = abdomen;

    // Fuel sac (anchored inside abdomen)
    const sacSz = 0.08 + n.fuelGlandSize * 0.2;
    const fuelSac = new THREE.Mesh(
      new THREE.SphereGeometry(1, 10, 8), sacMat(n)
    );
    fuelSac.scale.set(sacSz, sacSz * 0.8, sacSz * 1.1);
    fuelSac.position.copy(abdomen.position);
    fuelSac.position.y += abdH * 0.1;
    fuelSac.name = 'fuelSac';
    group.add(fuelSac);
    partsRef.fuelSac = fuelSac;

    // Fuel sac light (subtle point light inside)
    if (n.fuelGlandSize > 0.2) {
      const sacLight = new THREE.PointLight(0xff5500, n.fuelGlandSize * 0.4, 2);
      sacLight.position.copy(fuelSac.position);
      sacLight.name = 'sacLight';
      group.add(sacLight);
      partsRef.sacLight = sacLight;
    }

    // ============ NECK (anchored to torso front-top) ============
    const neckLen = 0.5 + n.neckLength * 0.6;
    const neckRad = 0.1 + n.bodyMass * 0.06 + n.musclePower * 0.03;
    const neckAngle = -0.5 - n.neckLength * 0.12; // tilts forward-up

    // Neck anchor point: front-top of torso
    const neckAnchorY = torsoY + torsoH * 0.35;
    const neckAnchorZ = torsoD * 0.55;

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(neckRad * 0.65, neckRad, neckLen, 10),
      bodyMat(tint, n)
    );
    // Position at midpoint along the neck direction from anchor
    const neckMidY = neckAnchorY + Math.cos(neckAngle) * neckLen * 0.45;
    const neckMidZ = neckAnchorZ - Math.sin(neckAngle) * neckLen * 0.45;
    neck.position.set(0, neckMidY, neckMidZ);
    neck.rotation.x = neckAngle;
    neck.castShadow = true;
    neck.name = 'neck';
    group.add(neck);
    partsRef.neck = neck;

    // ============ HEAD (anchored to neck tip) ============
    const headSz = 0.2 + n.bodyMass * 0.07 + n.intelligence * 0.04;
    // Neck end point
    const headY = neckAnchorY + Math.cos(neckAngle) * neckLen * 0.9;
    const headZ = neckAnchorZ - Math.sin(neckAngle) * neckLen * 0.9;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 10),
      bodyMat(tint, n)
    );
    head.scale.set(headSz * 0.75, headSz * 0.6, headSz * 1.1);
    head.position.set(0, headY, headZ);
    head.castShadow = true;
    head.name = 'head';
    group.add(head);
    partsRef.head = head;

    // Snout (elongated front of head)
    const snout = new THREE.Mesh(
      new THREE.ConeGeometry(headSz * 0.35, headSz * 0.8, 8),
      bodyMat(tint, n)
    );
    snout.rotation.x = Math.PI * 0.5;
    snout.position.set(0, headY - headSz * 0.08, headZ + headSz * 0.7);
    snout.name = 'snout';
    group.add(snout);
    partsRef.snout = snout;

    // Jaw
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(headSz * 0.5, headSz * 0.15, headSz * 0.6),
      armorMat(tint, n)
    );
    jaw.position.set(0, headY - headSz * 0.3, headZ + headSz * 0.3);
    jaw.name = 'jaw';
    group.add(jaw);
    partsRef.jaw = jaw;

    // Horns
    const hornH = 0.12 + n.boneDensity * 0.12;
    const hornGeo = new THREE.ConeGeometry(0.03 + n.boneDensity * 0.015, hornH, 6);
    const hornMt = boneMat();

    const hornL = new THREE.Mesh(hornGeo, hornMt);
    hornL.position.set(-headSz * 0.28, headY + headSz * 0.35, headZ - headSz * 0.15);
    hornL.rotation.set(-0.3, 0, 0.35);
    hornL.name = 'hornL';
    group.add(hornL);
    partsRef.hornL = hornL;

    const hornR = new THREE.Mesh(hornGeo.clone(), hornMt.clone());
    hornR.position.set(headSz * 0.28, headY + headSz * 0.35, headZ - headSz * 0.15);
    hornR.rotation.set(-0.3, 0, -0.35);
    hornR.name = 'hornR';
    group.add(hornR);
    partsRef.hornR = hornR;

    // Eyes
    const eyeRad = 0.025 + n.intelligence * 0.008;
    const eyeMt = new THREE.MeshStandardMaterial({
      color: 0xaaffcc, emissive: 0x44ff88, emissiveIntensity: 0.6
    });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(eyeRad, 8, 6), eyeMt);
    eyeL.position.set(-headSz * 0.32, headY + headSz * 0.12, headZ + headSz * 0.45);
    eyeL.name = 'eyeL';
    group.add(eyeL);
    partsRef.eyeL = eyeL;

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(eyeRad, 8, 6), eyeMt.clone());
    eyeR.position.set(headSz * 0.32, headY + headSz * 0.12, headZ + headSz * 0.45);
    eyeR.name = 'eyeR';
    group.add(eyeR);
    partsRef.eyeR = eyeR;

    // ============ FORELIMBS (anchored to torso front-bottom) ============
    const limbRad = 0.05 + n.musclePower * 0.035 + n.bodyMass * 0.015;
    const limbLen = 0.4 + n.bodyMass * 0.18;
    const limbMt = bodyMat(tint, n);

    // Anchor: front-bottom of torso
    const foreLegAnchorY = torsoY - torsoH * 0.45;
    const foreLegAnchorZ = torsoD * 0.3;

    const foreL = new THREE.Mesh(
      new THREE.CylinderGeometry(limbRad * 0.6, limbRad, limbLen, 8),
      limbMt
    );
    foreL.position.set(-torsoW * 0.55, foreLegAnchorY - limbLen * 0.35, foreLegAnchorZ);
    foreL.rotation.z = 0.08; // slight splay
    foreL.castShadow = true;
    foreL.name = 'foreL';
    group.add(foreL);
    partsRef.foreL = foreL;

    const foreR = new THREE.Mesh(
      new THREE.CylinderGeometry(limbRad * 0.6, limbRad, limbLen, 8),
      limbMt.clone()
    );
    foreR.position.set(torsoW * 0.55, foreLegAnchorY - limbLen * 0.35, foreLegAnchorZ);
    foreR.rotation.z = -0.08;
    foreR.castShadow = true;
    foreR.name = 'foreR';
    group.add(foreR);
    partsRef.foreR = foreR;

    // ============ HINDLIMBS (anchored to abdomen bottom) ============
    const hindRad = limbRad * 1.25;
    const hindLen = limbLen * 1.15;

    const hindAnchorY = abdomen.position.y - abdH * 0.4;
    const hindAnchorZ = abdomen.position.z;

    const hindL = new THREE.Mesh(
      new THREE.CylinderGeometry(hindRad * 0.6, hindRad, hindLen, 8),
      limbMt.clone()
    );
    hindL.position.set(-torsoW * 0.45, hindAnchorY - hindLen * 0.35, hindAnchorZ);
    hindL.rotation.z = 0.06;
    hindL.castShadow = true;
    hindL.name = 'hindL';
    group.add(hindL);
    partsRef.hindL = hindL;

    const hindR = new THREE.Mesh(
      new THREE.CylinderGeometry(hindRad * 0.6, hindRad, hindLen, 8),
      limbMt.clone()
    );
    hindR.position.set(torsoW * 0.45, hindAnchorY - hindLen * 0.35, hindAnchorZ);
    hindR.rotation.z = -0.06;
    hindR.castShadow = true;
    hindR.name = 'hindR';
    group.add(hindR);
    partsRef.hindR = hindR;

    // ============ WINGS (anchored to torso shoulder region) ============
    const wingSpan = 0.8 + n.wingspan * 2.0;
    const wingBoneRad = 0.03 + n.boneDensity * 0.015;

    // Shoulder anchor: top-side of torso
    const shoulderY = torsoY + torsoH * 0.25;
    const shoulderZ = torsoD * 0.05;

    // Wing bone (upper arm)
    const wingBoneGeo = new THREE.CylinderGeometry(wingBoneRad * 0.5, wingBoneRad, wingSpan * 0.55, 6);

    const wingArmL = new THREE.Mesh(wingBoneGeo, boneMat());
    wingArmL.position.set(
      -(torsoW * 0.5 + wingSpan * 0.2),
      shoulderY + wingSpan * 0.08,
      shoulderZ
    );
    wingArmL.rotation.z = Math.PI * 0.3 + n.wingspan * 0.08;
    wingArmL.rotation.x = 0.12;
    wingArmL.castShadow = true;
    wingArmL.name = 'wingArmL';
    group.add(wingArmL);
    partsRef.wingArmL = wingArmL;

    const wingArmR = new THREE.Mesh(wingBoneGeo.clone(), boneMat());
    wingArmR.position.set(
      torsoW * 0.5 + wingSpan * 0.2,
      shoulderY + wingSpan * 0.08,
      shoulderZ
    );
    wingArmR.rotation.z = -(Math.PI * 0.3 + n.wingspan * 0.08);
    wingArmR.rotation.x = 0.12;
    wingArmR.castShadow = true;
    wingArmR.name = 'wingArmR';
    group.add(wingArmR);
    partsRef.wingArmR = wingArmR;

    // Wing finger (forearm extension)
    const fingerLen = wingSpan * 0.45;
    const fingerGeo = new THREE.CylinderGeometry(wingBoneRad * 0.3, wingBoneRad * 0.5, fingerLen, 5);

    const wingFingerL = new THREE.Mesh(fingerGeo, boneMat());
    wingFingerL.position.set(
      -(torsoW * 0.5 + wingSpan * 0.55),
      shoulderY + wingSpan * 0.02,
      shoulderZ - 0.05
    );
    wingFingerL.rotation.z = Math.PI * 0.38;
    wingFingerL.rotation.x = 0.25;
    wingFingerL.name = 'wingFingerL';
    group.add(wingFingerL);
    partsRef.wingFingerL = wingFingerL;

    const wingFingerR = new THREE.Mesh(fingerGeo.clone(), boneMat());
    wingFingerR.position.set(
      torsoW * 0.5 + wingSpan * 0.55,
      shoulderY + wingSpan * 0.02,
      shoulderZ - 0.05
    );
    wingFingerR.rotation.z = -(Math.PI * 0.38);
    wingFingerR.rotation.x = 0.25;
    wingFingerR.name = 'wingFingerR';
    group.add(wingFingerR);
    partsRef.wingFingerR = wingFingerR;

    // Wing membranes — triangular with droop
    const memW = wingSpan * 0.75;
    const memH = 0.4 + n.wingArea * 0.8;
    const memGeo = new THREE.BufferGeometry();
    // Create a fan shape: body edge → wing tip → trailing edge
    const memVerts = new Float32Array([
      // Triangle fan from shoulder to wing tip to body rear
      0, 0, 0,                           // 0: shoulder anchor
      -memW * 0.4, memW * 0.05, 0,       // 1: mid-wing
      -memW * 0.7, -memW * 0.08, -0.1,   // 2: wing tip
      -memW * 0.5, -memH * 0.3, -memH * 0.5, // 3: trailing edge mid
      -memW * 0.15, -memH * 0.15, -memH * 0.7, // 4: trailing near body
      0, 0, -memH * 0.3,                 // 5: body rear attach
    ]);
    const memIdx = [0,1,3, 0,3,5, 1,2,3, 3,4,5, 0,1,2]; // extra tri for coverage
    memGeo.setAttribute('position', new THREE.BufferAttribute(memVerts, 3));
    memGeo.setIndex(memIdx);
    memGeo.computeVertexNormals();

    const wingMemL = new THREE.Mesh(memGeo, membraneMat(tint, n));
    wingMemL.position.set(-(torsoW * 0.45), shoulderY, shoulderZ);
    wingMemL.name = 'wingMemL';
    group.add(wingMemL);
    partsRef.wingMemL = wingMemL;

    // Mirror for right wing
    const memVertsR = new Float32Array(memVerts);
    for (let i = 0; i < memVertsR.length; i += 3) memVertsR[i] = -memVertsR[i]; // mirror X
    const memGeoR = new THREE.BufferGeometry();
    memGeoR.setAttribute('position', new THREE.BufferAttribute(memVertsR, 3));
    memGeoR.setIndex(memIdx);
    memGeoR.computeVertexNormals();

    const wingMemR = new THREE.Mesh(memGeoR, membraneMat(tint, n));
    wingMemR.position.set(torsoW * 0.45, shoulderY, shoulderZ);
    wingMemR.name = 'wingMemR';
    group.add(wingMemR);
    partsRef.wingMemR = wingMemR;

    // ============ TAIL (anchored to abdomen rear) ============
    const tailLen = 0.6 + n.tailSize * 0.9;
    const tailBaseRad = 0.08 + n.tailSize * 0.04 + n.bodyMass * 0.02;
    const tailAnchorY = abdomen.position.y;
    const tailAnchorZ = abdomen.position.z - abdD * 0.6;

    // Tail built as 3 segments for natural curve
    const seg1Len = tailLen * 0.4;
    const seg1 = new THREE.Mesh(
      new THREE.CylinderGeometry(tailBaseRad * 0.7, tailBaseRad, seg1Len, 8),
      bodyMat(tint, n)
    );
    seg1.position.set(0, tailAnchorY - 0.05, tailAnchorZ - seg1Len * 0.4);
    seg1.rotation.x = Math.PI * 0.42;
    seg1.castShadow = true;
    seg1.name = 'tailSeg1';
    group.add(seg1);
    partsRef.tailSeg1 = seg1;

    const seg2Len = tailLen * 0.35;
    const seg2 = new THREE.Mesh(
      new THREE.CylinderGeometry(tailBaseRad * 0.4, tailBaseRad * 0.7, seg2Len, 8),
      bodyMat(tint, n)
    );
    seg2.position.set(0, tailAnchorY - 0.15, tailAnchorZ - seg1Len * 0.7 - seg2Len * 0.3);
    seg2.rotation.x = Math.PI * 0.35;
    seg2.castShadow = true;
    seg2.name = 'tailSeg2';
    group.add(seg2);
    partsRef.tailSeg2 = seg2;

    const seg3Len = tailLen * 0.25;
    const tailTip = new THREE.Mesh(
      new THREE.ConeGeometry(tailBaseRad * 0.4, seg3Len, 6),
      armorMat(tint, n)
    );
    tailTip.position.set(0, tailAnchorY - 0.2, tailAnchorZ - seg1Len * 0.7 - seg2Len * 0.6 - seg3Len * 0.2);
    tailTip.rotation.x = Math.PI * 0.5;
    tailTip.name = 'tailTip';
    group.add(tailTip);
    partsRef.tailTip = tailTip;

    // ============ SPINE RIDGES (along torso-to-tail) ============
    const ridgeCount = 3 + Math.floor(n.scaleThickness * 4);
    const ridgeMt = armorMat(tint, n);
    for (let i = 0; i < ridgeCount; i++) {
      const t_pos = i / Math.max(ridgeCount - 1, 1);
      const ridgeH = 0.04 + n.scaleThickness * 0.06 * (1 - Math.abs(t_pos - 0.3) * 1.2);
      if (ridgeH < 0.02) continue;
      const ridge = new THREE.Mesh(
        new THREE.OctahedronGeometry(ridgeH, 0),
        ridgeMt
      );
      // Interpolate along spine from torso top to tail start
      const spineY = torsoY + torsoH * 0.5 - t_pos * (torsoY + torsoH * 0.5 - tailAnchorY) * 0.6;
      const spineZ = torsoD * 0.3 - t_pos * (torsoD * 0.3 - tailAnchorZ) * 0.8;
      ridge.position.set(0, spineY, spineZ);
      ridge.scale.set(0.4, 1.3, 0.6);
      ridge.name = 'ridge_' + i;
      group.add(ridge);
    }

    return group;
  }

  // --------------------------------------------------------
  // BUILD / REBUILD
  // --------------------------------------------------------
  function buildPlayerDragon(traits, tintColor) {
    if (dragonGroup) {
      while (dragonGroup.children.length > 0) {
        const child = dragonGroup.children[0];
        dragonGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    }
    Object.keys(DRAGON_PARTS).forEach(k => delete DRAGON_PARTS[k]);

    const built = buildDragon(traits, tintColor, DRAGON_PARTS);
    built.children.forEach(child => dragonGroup.add(child));

    // Store base positions for animation
    basePositions = {};
    Object.keys(DRAGON_PARTS).forEach(k => {
      const p = DRAGON_PARTS[k];
      if (p && p.position) {
        basePositions[k] = {
          y: p.position.y,
          z: p.position.z,
          rotY: p.rotation ? p.rotation.y : 0,
          rotZ: p.rotation ? p.rotation.z : 0,
          scaleY: p.scale ? p.scale.y : 1,
        };
      }
    });
  }

  function updateDragon(traits, tintColor) {
    buildPlayerDragon(traits, tintColor);
  }

  // --------------------------------------------------------
  // IDLE ANIMATION — uses stored base positions
  // --------------------------------------------------------
  function animateIdle(time) {
    const P = DRAGON_PARTS;
    const B = basePositions;
    if (!P.torso || !B.torso) return;

    // Breathing: torso scale Y
    const breath = Math.sin(time * 1.6) * 0.012;
    P.torso.scale.y = B.torso.scaleY + breath;

    // Head bob
    if (P.head && B.head) {
      P.head.position.y = B.head.y + Math.sin(time * 1.3) * 0.008;
    }
    // Snout follows head
    if (P.snout && B.snout) {
      P.snout.position.y = B.snout.y + Math.sin(time * 1.3) * 0.008;
    }
    // Jaw follows head
    if (P.jaw && B.jaw) {
      P.jaw.position.y = B.jaw.y + Math.sin(time * 1.3) * 0.008;
    }

    // Tail sway (all segments)
    const sway = Math.sin(time * 1.0) * 0.12;
    if (P.tailSeg1) P.tailSeg1.rotation.y = sway * 0.5;
    if (P.tailSeg2) P.tailSeg2.rotation.y = sway * 0.8;
    if (P.tailTip) P.tailTip.rotation.y = sway * 1.0;

    // Wing settle
    if (P.wingArmL && B.wingArmL) {
      const wingBob = Math.sin(time * 0.7) * 0.02;
      P.wingArmL.rotation.z = B.wingArmL.rotZ + wingBob;
    }
    if (P.wingArmR && B.wingArmR) {
      const wingBob = Math.sin(time * 0.7) * 0.02;
      P.wingArmR.rotation.z = B.wingArmR.rotZ - wingBob;
    }

    // Fuel sac pulse
    if (P.fuelSac && P.fuelSac.material && P.fuelSac.material.emissiveIntensity !== undefined) {
      const baseIntensity = P.fuelSac.material.userData_baseIntensity ||
        (P.fuelSac.material.userData_baseIntensity = P.fuelSac.material.emissiveIntensity);
      P.fuelSac.material.emissiveIntensity = baseIntensity + Math.sin(time * 2.2) * 0.15;
    }
  }

  // --------------------------------------------------------
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';
    camera.position.set(0, 5, 12);
    controls.target.set(0, 1.5, 0);

    const arenaColors = {
      mountains: 0x1a2a22, tundra: 0x1a2a3a,
      volcanic: 0x2a1010, forest: 0x0e1a0e, plains: 0x2a2a1a
    };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x0c0c1e);

    dragonGroup.position.set(-3, 0, 0);
    dragonGroup.rotation.y = Math.PI * 0.15;

    if (enemyGroup) scene.remove(enemyGroup);
    enemyGroup = new THREE.Group();
    const enemyBuilt = buildDragon(enemyTraits, enemyTint, ENEMY_PARTS);
    enemyBuilt.children.forEach(child => enemyGroup.add(child));
    enemyGroup.position.set(3, 0, 0);
    enemyGroup.rotation.y = -Math.PI * 0.15;
    scene.add(enemyGroup);
  }

  function returnToLab() {
    currentMode = 'lab';
    camera.position.set(4.5, 3.0, 5.5);
    controls.target.set(0, 1.4, 0);
    dragonGroup.position.set(0, 0, 0);
    dragonGroup.rotation.y = 0;
    scene.background = new THREE.Color(0x0c0c1e);
    scene.fog = new THREE.FogExp2(0x0c0c1e, 0.035);

    if (enemyGroup) {
      scene.remove(enemyGroup);
      enemyGroup = null;
    }
    Object.keys(ENEMY_PARTS).forEach(k => delete ENEMY_PARTS[k]);
  }

  // --------------------------------------------------------
  // BATTLE TICK ANIMATION
  // --------------------------------------------------------
  function animateBattleTick(tickRecord) {
    if (!tickRecord) return;

    const pAction = tickRecord.playerAction;
    const eAction = tickRecord.enemyAction;

    if (['lunge', 'bite', 'claw', 'pressure'].includes(pAction)) {
      animateLunge(dragonGroup, 0.3);
    }
    if (['lunge', 'bite', 'claw', 'pressure'].includes(eAction)) {
      animateLunge(enemyGroup, -0.3);
    }

    if (['fireBurst', 'sustainedFire'].includes(pAction)) {
      playFireEffect(dragonGroup, enemyGroup);
    }
    if (['fireBurst', 'sustainedFire'].includes(eAction)) {
      playFireEffect(enemyGroup, dragonGroup);
    }

    if (tickRecord.playerDamageDealt > 5 && enemyGroup) {
      playImpactEffect(enemyGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
    if (tickRecord.enemyDamageDealt > 5) {
      playImpactEffect(dragonGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
  }

  let lungeAnims = [];
  function animateLunge(group, offset) {
    if (!group) return;
    lungeAnims.push({ group, offset, startZ: group.position.z, phase: 0, duration: 0.4 });
  }

  let fireParticles = [];
  function playFireEffect(source, target) {
    if (!source || !target) return;
    const start = source.position.clone().add(new THREE.Vector3(0, 1.8, 0.5));
    const end = target.position.clone().add(new THREE.Vector3(0, 1.4, 0));

    for (let i = 0; i < 15; i++) {
      const geo = new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 6, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.04 + Math.random() * 0.06, 1, 0.45 + Math.random() * 0.3),
        transparent: true, opacity: 0.9
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(start).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, 0
      ));
      scene.add(p);
      fireParticles.push({
        mesh: p, start: start.clone(), end: end.clone(),
        progress: i * -0.04, speed: 1.8 + Math.random() * 0.6
      });
    }
  }

  let impactFlashes = [];
  function playImpactEffect(position) {
    const geo = new THREE.SphereGeometry(0.12, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const flash = new THREE.Mesh(geo, mat);
    flash.position.copy(position);
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

    if (currentMode === 'lab') {
      animateIdle(time);
    }

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
      if (fp.progress >= 1) {
        scene.remove(fp.mesh); fp.mesh.geometry.dispose(); fp.mesh.material.dispose();
        return false;
      }
      fp.mesh.position.lerpVectors(fp.start, fp.end, fp.progress);
      fp.mesh.position.y += Math.sin(fp.progress * Math.PI) * 0.25;
      fp.mesh.material.opacity = 1 - fp.progress * 0.8;
      fp.mesh.scale.setScalar(1 + fp.progress * 0.8);
      return true;
    });

    impactFlashes = impactFlashes.filter(fl => {
      fl.life -= delta * 4;
      if (fl.life <= 0) {
        scene.remove(fl.mesh); fl.mesh.geometry.dispose(); fl.mesh.material.dispose();
        return false;
      }
      fl.mesh.material.opacity = fl.life;
      fl.mesh.scale.setScalar(1 + (1 - fl.life) * 2);
      return true;
    });

    renderer.render(scene, camera);
  }

  // --------------------------------------------------------
  // RESIZE
  // --------------------------------------------------------
  function resize(container) {
    if (!renderer || !container) return;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------
  // ENVIRONMENT PREVIEW
  // --------------------------------------------------------
  function setEnvironment(habitatKey) {
    const envColors = {
      mountains: { bg: 0x141e18 }, tundra: { bg: 0x141e28 },
      volcanic: { bg: 0x1e1010 }, forest: { bg: 0x0a140a },
      plains: { bg: 0x1a1a10 }
    };
    const env = envColors[habitatKey] || { bg: 0x0c0c1e };
    scene.background = new THREE.Color(env.bg);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x0c0c1e);
  }

  return {
    init, buildPlayerDragon, updateDragon,
    initBattleArena, returnToLab, animateBattleTick,
    playFireEffect, playImpactEffect,
    setEnvironment, resetEnvironment, resize,
    _dragonGroup: dragonGroup,
    _DRAGON_PARTS: DRAGON_PARTS
  };
})();
