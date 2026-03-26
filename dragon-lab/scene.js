// ============================================================
// Dragon Engineering Lab — Three.js Scene
// 3D dragon visualization, lab environment, battle arena,
// idle animations, and stat-reactive mesh updates.
// ============================================================

window.Scene = (function() {
  let renderer, scene, camera, controls;
  let dragonGroup, enemyGroup;
  let clock;
  let animationId;
  let currentMode = 'lab'; // 'lab' or 'battle'
  let labObjects = [];
  let battleObjects = [];

  const DRAGON_PARTS = {};
  const ENEMY_PARTS = {};

  // --------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------
  function init(container) {
    clock = new THREE.Clock();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 12, 30);

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5, 4, 8);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.update();

    // Lighting
    setupLabLighting();

    // Floor
    setupLabFloor();

    // Dragon
    dragonGroup = new THREE.Group();
    dragonGroup.position.set(0, 0, 0);
    scene.add(dragonGroup);

    // Start animation loop
    animate();

    // Resize handler
    window.addEventListener('resize', () => resize(container));
  }

  function setupLabLighting() {
    // Clear existing lights
    scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

    const hemi = new THREE.HemisphereLight(0x334466, 0x111122, 0.5);
    scene.add(hemi);
    labObjects.push(hemi);

    const dir = new THREE.DirectionalLight(0xccddff, 0.8);
    dir.position.set(5, 8, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 25;
    dir.shadow.camera.left = -8;
    dir.shadow.camera.right = 8;
    dir.shadow.camera.top = 8;
    dir.shadow.camera.bottom = -8;
    scene.add(dir);
    labObjects.push(dir);

    // Subtle lab glow from below
    const point = new THREE.PointLight(0x00aa88, 0.3, 10);
    point.position.set(0, -0.5, 0);
    scene.add(point);
    labObjects.push(point);

    // Rim light
    const rim = new THREE.PointLight(0x4466aa, 0.3, 15);
    rim.position.set(-5, 3, -3);
    scene.add(rim);
    labObjects.push(rim);
  }

  function setupLabFloor() {
    // Grid
    const grid = new THREE.GridHelper(20, 30, 0x003333, 0x001a1a);
    grid.position.y = 0;
    scene.add(grid);
    labObjects.push(grid);

    // Ground plane for shadows
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a12, roughness: 0.9, metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    labObjects.push(ground);
  }

  // --------------------------------------------------------
  // PROCEDURAL DRAGON BUILDER
  // --------------------------------------------------------
  function buildDragon(traits, tintColor, partsRef) {
    const group = new THREE.Group();
    const tint = new THREE.Color(tintColor || '#3a6e5a');
    const baseMat = (color, metalness, roughness) => new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).lerp(tint, 0.3),
      metalness: metalness || 0.2, roughness: roughness || 0.6
    });

    const t = traits;
    // Normalized helpers (0-1 range)
    const n = {};
    window.DragonData.TRAITS.forEach(tr => {
      n[tr.id] = (t[tr.id] - tr.min) / (tr.max - tr.min);
    });

    // ---- TORSO ----
    const torsoW = 0.6 + n.bodyMass * 0.6;
    const torsoH = 0.5 + n.bodyMass * 0.4 + n.musclePower * 0.15;
    const torsoD = 0.8 + n.bodyMass * 0.7;
    const torsoGeo = new THREE.SphereGeometry(1, 16, 12);
    const torso = new THREE.Mesh(torsoGeo, baseMat(0x2a5e4e, 0.15 + n.scaleThickness * 0.15, 0.7 - n.scaleThickness * 0.2));
    torso.scale.set(torsoW, torsoH, torsoD);
    torso.position.set(0, 1.2 + n.bodyMass * 0.2, 0);
    torso.castShadow = true;
    torso.name = 'torso';
    group.add(torso);
    partsRef.torso = torso;

    // ---- CHEST PLATE (armor overlay) ----
    const chestGeo = new THREE.SphereGeometry(1, 12, 8);
    const chestMat = baseMat(0x3a3a3a, 0.3 + n.scaleThickness * 0.3, 0.5);
    chestMat.transparent = true;
    chestMat.opacity = 0.3 + n.scaleThickness * 0.5;
    const chest = new THREE.Mesh(chestGeo, chestMat);
    chest.scale.set(torsoW * 1.05, torsoH * 0.85, torsoD * 0.7);
    chest.position.copy(torso.position);
    chest.position.z += 0.1;
    chest.position.y -= 0.05;
    chest.name = 'chest';
    group.add(chest);
    partsRef.chest = chest;

    // ---- ABDOMEN ----
    const abdW = torsoW * 0.85;
    const abdH = torsoH * 0.7;
    const abdD = 0.5 + n.stomachCapacity * 0.3 + n.fuelGlandSize * 0.1;
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), baseMat(0x254e3e, 0.1, 0.75));
    abdomen.scale.set(abdW, abdH, abdD);
    abdomen.position.set(0, torso.position.y - 0.15, -torsoD * 0.7);
    abdomen.castShadow = true;
    abdomen.name = 'abdomen';
    group.add(abdomen);
    partsRef.abdomen = abdomen;

    // ---- FUEL SAC (glowing internal organ) ----
    const sacSize = 0.1 + n.fuelGlandSize * 0.25;
    const sacGeo = new THREE.SphereGeometry(1, 10, 8);
    const sacMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff4400,
      emissiveIntensity: 0.3 + n.fuelGlandSize * 0.8 + n.ignitionEfficiency * 0.2,
      transparent: true, opacity: 0.4 + n.fuelGlandSize * 0.4,
      metalness: 0, roughness: 0.3
    });
    const fuelSac = new THREE.Mesh(sacGeo, sacMat);
    fuelSac.scale.set(sacSize, sacSize * 0.8, sacSize * 1.2);
    fuelSac.position.set(0, abdomen.position.y + 0.1, abdomen.position.z + 0.1);
    fuelSac.name = 'fuelSac';
    group.add(fuelSac);
    partsRef.fuelSac = fuelSac;

    // ---- NECK ----
    const neckLen = 0.6 + n.neckLength * 0.8;
    const neckRad = 0.12 + n.bodyMass * 0.08 + n.musclePower * 0.04;
    const neckGeo = new THREE.CylinderGeometry(neckRad * 0.7, neckRad, neckLen, 8);
    const neck = new THREE.Mesh(neckGeo, baseMat(0x2a5a4a, 0.15, 0.65));
    neck.position.set(0, torso.position.y + torsoH * 0.5, torsoD * 0.5 + neckLen * 0.3);
    neck.rotation.x = -0.6 - n.neckLength * 0.15;
    neck.castShadow = true;
    neck.name = 'neck';
    group.add(neck);
    partsRef.neck = neck;

    // ---- HEAD ----
    const headSize = 0.25 + n.bodyMass * 0.1 + n.intelligence * 0.05;
    const headGeo = new THREE.SphereGeometry(1, 12, 10);
    const head = new THREE.Mesh(headGeo, baseMat(0x2e6050, 0.2, 0.6));
    head.scale.set(headSize * 0.8, headSize * 0.7, headSize * 1.2);
    const neckEndX = neck.position.x;
    const neckEndY = neck.position.y + Math.cos(neck.rotation.x) * neckLen * 0.5;
    const neckEndZ = neck.position.z - Math.sin(neck.rotation.x) * neckLen * 0.5;
    head.position.set(neckEndX, neckEndY + 0.1, neckEndZ + 0.15);
    head.castShadow = true;
    head.name = 'head';
    group.add(head);
    partsRef.head = head;

    // ---- JAW ----
    const jawGeo = new THREE.BoxGeometry(headSize * 0.6, headSize * 0.25, headSize * 0.9);
    const jaw = new THREE.Mesh(jawGeo, baseMat(0x2a4a3e, 0.2, 0.65));
    jaw.position.set(head.position.x, head.position.y - headSize * 0.3, head.position.z + headSize * 0.2);
    jaw.castShadow = true;
    jaw.name = 'jaw';
    group.add(jaw);
    partsRef.jaw = jaw;

    // ---- HORNS ----
    const hornH = 0.15 + n.boneDensity * 0.15 + n.scaleThickness * 0.05;
    const hornGeo = new THREE.ConeGeometry(0.04 + n.boneDensity * 0.02, hornH, 6);
    const hornMat = baseMat(0x555544, 0.4, 0.4);

    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(head.position.x - headSize * 0.3, head.position.y + headSize * 0.4, head.position.z - headSize * 0.2);
    hornL.rotation.z = 0.3;
    hornL.rotation.x = -0.2;
    hornL.name = 'hornL';
    group.add(hornL);
    partsRef.hornL = hornL;

    const hornR = new THREE.Mesh(hornGeo.clone(), hornMat.clone());
    hornR.position.set(head.position.x + headSize * 0.3, head.position.y + headSize * 0.4, head.position.z - headSize * 0.2);
    hornR.rotation.z = -0.3;
    hornR.rotation.x = -0.2;
    hornR.name = 'hornR';
    group.add(hornR);
    partsRef.hornR = hornR;

    // ---- EYES ----
    const eyeGeo = new THREE.SphereGeometry(0.03 + n.intelligence * 0.01, 8, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xaaffaa, emissive: 0x44ff66, emissiveIntensity: 0.5 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(head.position.x - headSize * 0.35, head.position.y + headSize * 0.1, head.position.z + headSize * 0.5);
    eyeL.name = 'eyeL';
    group.add(eyeL);
    partsRef.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone());
    eyeR.position.set(head.position.x + headSize * 0.35, head.position.y + headSize * 0.1, head.position.z + headSize * 0.5);
    eyeR.name = 'eyeR';
    group.add(eyeR);
    partsRef.eyeR = eyeR;

    // ---- FORELIMBS ----
    const limbRad = 0.06 + n.musclePower * 0.04 + n.bodyMass * 0.02;
    const limbLen = 0.5 + n.bodyMass * 0.2;
    const limbGeo = new THREE.CylinderGeometry(limbRad * 0.7, limbRad, limbLen, 8);
    const limbMat = baseMat(0x2a5848, 0.15, 0.65);

    const foreL = new THREE.Mesh(limbGeo, limbMat);
    foreL.position.set(-torsoW * 0.6, torso.position.y - torsoH * 0.5 - limbLen * 0.3, torsoD * 0.2);
    foreL.castShadow = true;
    foreL.name = 'foreL';
    group.add(foreL);
    partsRef.foreL = foreL;

    const foreR = new THREE.Mesh(limbGeo.clone(), limbMat.clone());
    foreR.position.set(torsoW * 0.6, torso.position.y - torsoH * 0.5 - limbLen * 0.3, torsoD * 0.2);
    foreR.castShadow = true;
    foreR.name = 'foreR';
    group.add(foreR);
    partsRef.foreR = foreR;

    // ---- HINDLIMBS ----
    const hindRad = limbRad * 1.3;
    const hindLen = limbLen * 1.1;
    const hindGeo = new THREE.CylinderGeometry(hindRad * 0.7, hindRad, hindLen, 8);

    const hindL = new THREE.Mesh(hindGeo, limbMat.clone());
    hindL.position.set(-torsoW * 0.5, torso.position.y - torsoH * 0.6 - hindLen * 0.3, -torsoD * 0.3);
    hindL.castShadow = true;
    hindL.name = 'hindL';
    group.add(hindL);
    partsRef.hindL = hindL;

    const hindR = new THREE.Mesh(hindGeo.clone(), limbMat.clone());
    hindR.position.set(torsoW * 0.5, torso.position.y - torsoH * 0.6 - hindLen * 0.3, -torsoD * 0.3);
    hindR.castShadow = true;
    hindR.name = 'hindR';
    group.add(hindR);
    partsRef.hindR = hindR;

    // ---- WING ARMS ----
    const wingSpan = 1.0 + n.wingspan * 2.5;
    const wingArmRad = 0.04 + n.boneDensity * 0.02;
    const wingArmGeo = new THREE.CylinderGeometry(wingArmRad * 0.5, wingArmRad, wingSpan, 6);
    const wingArmMat = baseMat(0x2a5040, 0.2, 0.6);

    const wingArmL = new THREE.Mesh(wingArmGeo, wingArmMat);
    wingArmL.position.set(-torsoW * 0.5 - wingSpan * 0.4, torso.position.y + torsoH * 0.3, 0);
    wingArmL.rotation.z = Math.PI * 0.35 + n.wingspan * 0.1;
    wingArmL.rotation.x = 0.1;
    wingArmL.castShadow = true;
    wingArmL.name = 'wingArmL';
    group.add(wingArmL);
    partsRef.wingArmL = wingArmL;

    const wingArmR = new THREE.Mesh(wingArmGeo.clone(), wingArmMat.clone());
    wingArmR.position.set(torsoW * 0.5 + wingSpan * 0.4, torso.position.y + torsoH * 0.3, 0);
    wingArmR.rotation.z = -Math.PI * 0.35 - n.wingspan * 0.1;
    wingArmR.rotation.x = 0.1;
    wingArmR.castShadow = true;
    wingArmR.name = 'wingArmR';
    group.add(wingArmR);
    partsRef.wingArmR = wingArmR;

    // ---- WING MEMBRANES ----
    const memW = wingSpan * 0.8;
    const memH = 0.5 + n.wingArea * 1.0;
    const memGeo = new THREE.PlaneGeometry(memW, memH, 4, 3);
    // Warp vertices for organic look
    const memPos = memGeo.attributes.position;
    for (let i = 0; i < memPos.count; i++) {
      const x = memPos.getX(i);
      const y = memPos.getY(i);
      memPos.setZ(i, Math.sin(x * 1.5) * 0.1 - Math.abs(x) * 0.08);
      memPos.setY(i, y - Math.abs(x) * 0.15);
    }
    memGeo.computeVertexNormals();

    const memMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x885533).lerp(tint, 0.2),
      transparent: true, opacity: 0.35 + n.wingArea * 0.35,
      side: THREE.DoubleSide, metalness: 0.05, roughness: 0.8
    });

    const wingMemL = new THREE.Mesh(memGeo, memMat);
    wingMemL.position.set(-torsoW * 0.5 - memW * 0.45, torso.position.y + torsoH * 0.15, -0.1);
    wingMemL.rotation.x = 0.15;
    wingMemL.name = 'wingMemL';
    group.add(wingMemL);
    partsRef.wingMemL = wingMemL;

    const wingMemR = new THREE.Mesh(memGeo.clone(), memMat.clone());
    wingMemR.position.set(torsoW * 0.5 + memW * 0.45, torso.position.y + torsoH * 0.15, -0.1);
    wingMemR.rotation.x = 0.15;
    wingMemR.name = 'wingMemR';
    group.add(wingMemR);
    partsRef.wingMemR = wingMemR;

    // ---- TAIL ----
    const tailLen = 0.8 + n.tailSize * 1.2;
    const tailBaseRad = 0.1 + n.tailSize * 0.06 + n.bodyMass * 0.03;
    const tailGeo = new THREE.CylinderGeometry(0.02, tailBaseRad, tailLen, 8);
    const tail = new THREE.Mesh(tailGeo, baseMat(0x2a5848, 0.15, 0.65));
    tail.position.set(0, torso.position.y - 0.1, -torsoD * 0.8 - tailLen * 0.35);
    tail.rotation.x = Math.PI * 0.4 + n.tailSize * 0.1;
    tail.castShadow = true;
    tail.name = 'tailBase';
    group.add(tail);
    partsRef.tailBase = tail;

    // Tail tip
    const tipGeo = new THREE.ConeGeometry(0.04 + n.tailSize * 0.02, 0.15 + n.tailSize * 0.1, 6);
    const tailTip = new THREE.Mesh(tipGeo, baseMat(0x444433, 0.3, 0.5));
    tailTip.position.set(0, tail.position.y - tailLen * 0.3, tail.position.z - tailLen * 0.4);
    tailTip.rotation.x = Math.PI * 0.5;
    tailTip.name = 'tailTip';
    group.add(tailTip);
    partsRef.tailTip = tailTip;

    // ---- SPINE RIDGES ----
    const ridgeCount = 3 + Math.floor(n.scaleThickness * 3);
    for (let i = 0; i < ridgeCount; i++) {
      const t_pos = i / (ridgeCount - 1);
      const ridgeH = 0.05 + n.scaleThickness * 0.08 * (1 - Math.abs(t_pos - 0.5));
      const ridgeGeo = new THREE.OctahedronGeometry(ridgeH, 0);
      const ridgeMat = baseMat(0x3a3a3a, 0.35, 0.45);
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.position.set(
        0,
        torso.position.y + torsoH * 0.6 - t_pos * 0.1,
        torsoD * 0.4 - t_pos * (torsoD + tailLen * 0.5)
      );
      ridge.scale.set(0.5, 1.2, 0.8);
      ridge.name = 'ridge_' + i;
      group.add(ridge);
    }

    return group;
  }

  // --------------------------------------------------------
  // BUILD / REBUILD PLAYER DRAGON
  // --------------------------------------------------------
  function buildPlayerDragon(traits, tintColor) {
    // Remove old dragon
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

    const newDragon = buildDragon(traits, tintColor, DRAGON_PARTS);
    newDragon.children.forEach(child => dragonGroup.add(child));
  }

  // --------------------------------------------------------
  // UPDATE DRAGON (debounced by main.js)
  // --------------------------------------------------------
  function updateDragon(traits, tintColor) {
    buildPlayerDragon(traits, tintColor);
  }

  // --------------------------------------------------------
  // IDLE ANIMATION
  // --------------------------------------------------------
  function animateIdle(time) {
    if (!DRAGON_PARTS.torso) return;

    // Breathing
    const breathPhase = Math.sin(time * 1.8) * 0.015;
    DRAGON_PARTS.torso.scale.y *= (1 + breathPhase);

    // Tail sway
    if (DRAGON_PARTS.tailBase) {
      DRAGON_PARTS.tailBase.rotation.y = Math.sin(time * 1.2) * 0.15;
    }

    // Head bob
    if (DRAGON_PARTS.head) {
      DRAGON_PARTS.head.position.y += Math.sin(time * 1.5) * 0.01;
    }

    // Wing settle
    if (DRAGON_PARTS.wingArmL) {
      const wingBob = Math.sin(time * 0.8) * 0.03;
      DRAGON_PARTS.wingArmL.rotation.z += wingBob;
      DRAGON_PARTS.wingArmR.rotation.z -= wingBob;
    }

    // Fuel sac pulse
    if (DRAGON_PARTS.fuelSac && DRAGON_PARTS.fuelSac.material) {
      DRAGON_PARTS.fuelSac.material.emissiveIntensity += Math.sin(time * 2.5) * 0.1;
    }
  }

  // --------------------------------------------------------
  // BATTLE ARENA
  // --------------------------------------------------------
  function initBattleArena(arenaKey, playerTraits, playerTint, enemyTraits, enemyTint) {
    currentMode = 'battle';

    // Widen camera
    camera.position.set(0, 6, 14);
    controls.target.set(0, 1.5, 0);

    // Change floor color based on arena
    const arenaColors = {
      mountains: 0x2a3a2e, tundra: 0x2a3a4a,
      volcanic: 0x3a1a1a, forest: 0x1a2a1a, plains: 0x3a3a2a
    };
    scene.background = new THREE.Color(arenaColors[arenaKey] || 0x0a0a1a);

    // Move player dragon to left
    dragonGroup.position.set(-3, 0, 0);
    dragonGroup.rotation.y = Math.PI * 0.15;

    // Build enemy dragon
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
    camera.position.set(5, 4, 8);
    controls.target.set(0, 1.5, 0);
    dragonGroup.position.set(0, 0, 0);
    dragonGroup.rotation.y = 0;
    scene.background = new THREE.Color(0x0a0a1a);

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

    // Move dragons based on actions
    const pAction = tickRecord.playerAction;
    const eAction = tickRecord.enemyAction;

    // Simple lunge animation
    if (['lunge', 'bite', 'claw', 'pressure'].includes(pAction)) {
      animateLunge(dragonGroup, 0.3);
    }
    if (['lunge', 'bite', 'claw', 'pressure'].includes(eAction)) {
      animateLunge(enemyGroup, -0.3);
    }

    // Fire effect
    if (['fireBurst', 'sustainedFire'].includes(pAction)) {
      playFireEffect(dragonGroup, enemyGroup);
    }
    if (['fireBurst', 'sustainedFire'].includes(eAction)) {
      playFireEffect(enemyGroup, dragonGroup);
    }

    // Impact flash on damage
    if (tickRecord.playerDamageDealt > 5 && enemyGroup) {
      playImpactEffect(enemyGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
    if (tickRecord.enemyDamageDealt > 5) {
      playImpactEffect(dragonGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
  }

  // Simple lunge: move forward briefly then back
  let lungeAnims = [];
  function animateLunge(group, offset) {
    if (!group) return;
    const startZ = group.position.z;
    lungeAnims.push({
      group, offset, startZ,
      phase: 0, duration: 0.4
    });
  }

  // Fire particles
  let fireParticles = [];
  function playFireEffect(source, target) {
    if (!source || !target) return;
    const start = source.position.clone().add(new THREE.Vector3(0, 2, 0.5));
    const end = target.position.clone().add(new THREE.Vector3(0, 1.5, 0));

    for (let i = 0; i < 12; i++) {
      const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 6, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3),
        transparent: true, opacity: 0.9
      });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(start).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, 0
      ));
      scene.add(particle);
      fireParticles.push({
        mesh: particle, start: start.clone(), end: end.clone(),
        progress: i * -0.05, speed: 1.5 + Math.random() * 0.5
      });
    }
  }

  // Impact flash
  let impactFlashes = [];
  function playImpactEffect(position) {
    const geo = new THREE.SphereGeometry(0.15, 8, 6);
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

    // Idle animation for player dragon
    if (currentMode === 'lab') {
      animateIdle(time);
    }

    // Process lunge animations
    lungeAnims = lungeAnims.filter(la => {
      la.phase += delta / la.duration;
      if (la.phase >= 1) {
        la.group.position.z = la.startZ;
        return false;
      }
      const t = la.phase < 0.5 ? la.phase * 2 : (1 - la.phase) * 2;
      la.group.position.z = la.startZ + la.offset * t;
      return true;
    });

    // Process fire particles
    fireParticles = fireParticles.filter(fp => {
      fp.progress += delta * fp.speed;
      if (fp.progress < 0) return true; // waiting to start
      if (fp.progress >= 1) {
        scene.remove(fp.mesh);
        fp.mesh.geometry.dispose();
        fp.mesh.material.dispose();
        return false;
      }
      fp.mesh.position.lerpVectors(fp.start, fp.end, fp.progress);
      fp.mesh.position.y += Math.sin(fp.progress * Math.PI) * 0.3;
      fp.mesh.material.opacity = 1 - fp.progress * 0.8;
      fp.mesh.scale.setScalar(1 + fp.progress);
      return true;
    });

    // Process impact flashes
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

    renderer.render(scene, camera);
  }

  // --------------------------------------------------------
  // RESIZE
  // --------------------------------------------------------
  function resize(container) {
    if (!renderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------
  // ENVIRONMENT PREVIEW (for habitat tab)
  // --------------------------------------------------------
  function setEnvironment(habitatKey) {
    const envColors = {
      mountains: { bg: 0x1a2a1e, fog: 0x1a2a1e },
      tundra: { bg: 0x1a2a3a, fog: 0x2a3a4a },
      volcanic: { bg: 0x2a1010, fog: 0x3a1a1a },
      forest: { bg: 0x0a1a0a, fog: 0x1a2a1a },
      plains: { bg: 0x1a1a10, fog: 0x2a2a1a }
    };
    const env = envColors[habitatKey] || { bg: 0x0a0a1a, fog: 0x0a0a1a };
    scene.background = new THREE.Color(env.bg);
    scene.fog = new THREE.Fog(env.fog, 12, 30);
  }

  function resetEnvironment() {
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 12, 30);
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
