import * as THREE from "three";

type Actor = {
  group: THREE.Group;
  origin: THREE.Vector3;
  phase: number;
  radius: number;
  speed: number;
};

type FlowTrack = {
  curve: THREE.CatmullRomCurve3;
  pulses: THREE.Mesh[];
  duration: number;
  offset: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const surface = (color: string, roughness = 0.62, metalness = 0.08) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: 0.18,
    clearcoatRoughness: 0.24,
  });

const glassSurface = (color: string, opacity = 0.32) =>
  new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    transmission: 0.35,
    roughness: 0.16,
    metalness: 0.06,
    ior: 1.46,
    thickness: 0.08,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    depthWrite: false,
  });

const emissiveSurface = (color: string, intensity = 0.65) =>
  new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.28,
    metalness: 0.18,
    clearcoat: 0.5,
  });

const addMesh = (
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

const createTextTexture = (text: string, background: string, foreground: string) => {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 720;
  textureCanvas.height = 180;
  const context = textureCanvas.getContext("2d");

  if (!context) return null;

  context.fillStyle = background;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.fillStyle = foreground;
  context.font = "800 48px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, textureCanvas.width / 2, textureCanvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createPlaque = (text: string, width: number, height: number) => {
  const texture = createTextTexture(text, "#091322", "#d7c18b");
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture ?? undefined, transparent: true }),
  );
};

const createCoordinateGrid = () => {
  const positions: number[] = [];
  const minX = -4.1;
  const maxX = 4.1;
  const minZ = -2.65;
  const maxZ = 2.65;

  for (let x = minX; x <= maxX; x += 0.5) {
    positions.push(x, 0.012, minZ, x, 0.012, maxZ);
  }

  for (let z = minZ; z <= maxZ; z += 0.5) {
    positions.push(minX, 0.012, z, maxX, 0.012, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: "#1a4e5b", transparent: true, opacity: 0.3, depthWrite: false }),
  );
};

const createArchitecturalCutaway = () => {
  const venue = new THREE.Group();
  const concrete = surface("#55636c", 0.82, 0.08);
  const concreteDark = surface("#273744", 0.76, 0.12);
  const steel = surface("#9baeb0", 0.28, 0.82);
  const timber = surface("#73543b", 0.48, 0.12);
  const glass = glassSurface("#2a7484", 0.3);
  const shadowGlass = glassSurface("#163649", 0.42);

  addMesh(venue, new THREE.BoxGeometry(3.7, 0.24, 2.48), concreteDark, [0, 0.12, 0]);
  addMesh(venue, new THREE.BoxGeometry(3.42, 0.16, 2.2), concrete, [0, 0.32, 0]);

  // Back wall and side return leave the front facade open as a readable cutaway.
  addMesh(venue, new THREE.BoxGeometry(3.52, 1.72, 0.16), concreteDark, [0, 1.18, -1.08]);
  addMesh(venue, new THREE.BoxGeometry(0.17, 1.72, 2.25), concrete, [-1.67, 1.18, 0]);
  addMesh(venue, new THREE.BoxGeometry(0.2, 1.72, 0.2), concreteDark, [1.62, 1.18, -0.99]);
  addMesh(venue, new THREE.BoxGeometry(0.2, 1.72, 0.2), concreteDark, [1.62, 1.18, 0.98]);

  addMesh(venue, new THREE.BoxGeometry(3.35, 1.5, 0.035), shadowGlass, [0, 1.2, -0.98]);
  [-1.38, -0.45, 0.48, 1.35].forEach((x) => {
    addMesh(venue, new THREE.BoxGeometry(0.045, 1.58, 0.08), steel, [x, 1.22, -0.94]);
  });
  addMesh(venue, new THREE.BoxGeometry(3.35, 0.045, 0.08), steel, [0, 0.62, -0.94]);
  addMesh(venue, new THREE.BoxGeometry(3.35, 0.045, 0.08), steel, [0, 1.72, -0.94]);

  // A restrained canopy and timber soffit give the building a civic, buildable scale.
  addMesh(venue, new THREE.BoxGeometry(3.82, 0.1, 2.45), glass, [0, 2.08, -0.02]);
  addMesh(venue, new THREE.BoxGeometry(3.95, 0.08, 0.1), steel, [0, 2.02, 1.06]);
  addMesh(venue, new THREE.BoxGeometry(3.9, 0.08, 0.1), steel, [0, 2.02, -1.08]);
  [-1.3, -0.42, 0.46, 1.3].forEach((x) => {
    addMesh(venue, new THREE.BoxGeometry(0.1, 0.1, 2.22), timber, [x, 2.02, 0]);
  });

  const sign = createPlaque("UNITY HOUSE", 1.28, 0.27);
  sign.position.set(-0.04, 1.82, 1.09);
  sign.castShadow = false;
  venue.add(sign);

  return venue;
};

const createHostedKitchen = () => {
  const kitchen = new THREE.Group();
  const stainless = surface("#aab9ba", 0.2, 0.92);
  const stainlessDark = surface("#53676d", 0.25, 0.68);
  const warm = emissiveSurface("#d7c18b", 0.42);
  const dark = surface("#172b37", 0.52, 0.28);

  addMesh(kitchen, new THREE.BoxGeometry(1.28, 0.1, 0.48), stainless, [-0.9, 0.62, -0.36]);
  addMesh(kitchen, new THREE.BoxGeometry(1.2, 0.55, 0.08), stainlessDark, [-0.9, 0.92, -0.58]);
  addMesh(kitchen, new THREE.BoxGeometry(0.48, 0.66, 0.42), dark, [-1.42, 0.65, -0.35]);
  addMesh(kitchen, new THREE.BoxGeometry(0.38, 0.025, 0.28), stainless, [-1.42, 1.0, -0.35]);
  addMesh(kitchen, new THREE.BoxGeometry(0.38, 0.2, 0.38), stainlessDark, [-0.48, 0.72, -0.35]);
  addMesh(kitchen, new THREE.BoxGeometry(0.22, 0.045, 0.18), warm, [-0.48, 0.84, -0.35]);
  addMesh(kitchen, new THREE.BoxGeometry(1.18, 0.04, 0.04), warm, [-0.9, 1.22, -0.56]);

  const plaque = createPlaque("HOSTED KITCHEN", 0.96, 0.16);
  plaque.position.set(-0.9, 1.3, -0.53);
  plaque.rotation.y = Math.PI;
  plaque.castShadow = false;
  kitchen.add(plaque);

  kitchen.position.set(-0.18, 0, 0);
  return kitchen;
};

const createCommunityHub = () => {
  const hub = new THREE.Group();
  const timber = surface("#806044", 0.48, 0.1);
  const timberLight = surface("#b28b5c", 0.42, 0.08);
  const steel = surface("#687c80", 0.3, 0.64);
  const panel = surface("#294c59", 0.64, 0.16);

  addMesh(hub, new THREE.BoxGeometry(1.12, 0.1, 0.5), timberLight, [0.56, 0.66, 0.22]);
  [0.16, 0.96].forEach((x) => {
    addMesh(hub, new THREE.BoxGeometry(0.05, 0.58, 0.05), steel, [x, 0.38, 0.05]);
    addMesh(hub, new THREE.BoxGeometry(0.05, 0.58, 0.05), steel, [x, 0.38, 0.39]);
  });
  [0.1, 0.98].forEach((x) => {
    addMesh(hub, new THREE.BoxGeometry(1.12, 0.1, 0.22), timber, [0.56, 0.38, x - 0.05]);
  });
  addMesh(hub, new THREE.BoxGeometry(0.92, 0.86, 0.05), panel, [0.56, 1.1, -0.78]);
  addMesh(hub, new THREE.BoxGeometry(0.55, 0.04, 0.04), timberLight, [0.56, 1.36, -0.74]);
  addMesh(hub, new THREE.BoxGeometry(0.22, 0.04, 0.04), timberLight, [0.28, 1.18, -0.74]);
  addMesh(hub, new THREE.BoxGeometry(0.28, 0.04, 0.04), timberLight, [0.86, 1.06, -0.74]);

  const plaque = createPlaque("PLAY / LEARN", 0.86, 0.16);
  plaque.position.set(0.56, 1.51, -0.74);
  plaque.castShadow = false;
  hub.add(plaque);

  hub.position.set(0.24, 0, 0.12);
  return hub;
};

const createWelcomePortico = () => {
  const portico = new THREE.Group();
  const timber = surface("#73543b", 0.46, 0.1);
  const steel = surface("#778c8e", 0.28, 0.72);
  const dark = surface("#102432", 0.5, 0.24);

  addMesh(portico, new THREE.BoxGeometry(0.84, 0.08, 0.58), timber, [1.22, 1.62, 0.82]);
  addMesh(portico, new THREE.BoxGeometry(0.07, 1.35, 0.07), steel, [0.88, 0.9, 0.62]);
  addMesh(portico, new THREE.BoxGeometry(0.07, 1.35, 0.07), steel, [1.56, 0.9, 0.62]);
  addMesh(portico, new THREE.BoxGeometry(0.66, 0.84, 0.04), dark, [1.22, 0.72, 0.74]);
  addMesh(portico, new THREE.BoxGeometry(0.5, 0.04, 0.18), steel, [1.22, 0.82, 0.7]);

  const plaque = createPlaque("WELCOME POINT", 0.74, 0.15);
  plaque.position.set(1.22, 1.75, 0.82);
  plaque.castShadow = false;
  portico.add(plaque);

  portico.position.set(0, 0, 0);
  return portico;
};

const createPerson = (scale: number, shirtColor: string, skinColor: string) => {
  const person = new THREE.Group();
  const shirt = surface(shirtColor, 0.56, 0.04);
  const skin = surface(skinColor, 0.7, 0.02);
  const trousers = surface("#1c3444", 0.72, 0.04);

  addMesh(person, new THREE.SphereGeometry(0.13 * scale, 24, 16), skin, [0, 0.91 * scale, 0]);
  addMesh(person, new THREE.CapsuleGeometry(0.12 * scale, 0.28 * scale, 5, 12), shirt, [0, 0.6 * scale, 0]);
  addMesh(person, new THREE.BoxGeometry(0.2 * scale, 0.13 * scale, 0.14 * scale), trousers, [0, 0.36 * scale, 0]);

  const limb = new THREE.CylinderGeometry(0.028 * scale, 0.038 * scale, 0.3 * scale, 10);
  addMesh(person, limb, skin, [-0.16 * scale, 0.59 * scale, 0], [0, 0, -0.2]);
  addMesh(person, limb, skin, [0.16 * scale, 0.59 * scale, 0], [0, 0, 0.2]);
  addMesh(person, limb, trousers, [-0.07 * scale, 0.17 * scale, 0], [0, 0, -0.06]);
  addMesh(person, limb, trousers, [0.07 * scale, 0.17 * scale, 0], [0, 0, 0.06]);

  return person;
};

const createElectricVan = () => {
  const van = new THREE.Group();
  const body = surface("#314b5b", 0.25, 0.64);
  const cargo = surface("#71888b", 0.24, 0.78);
  const rubber = surface("#101b24", 0.88, 0.02);
  const wheelHub = surface("#a1afb0", 0.28, 0.86);
  const window = glassSurface("#123247", 0.16);
  const light = emissiveSurface("#d7c18b", 1.15);

  addMesh(van, new THREE.BoxGeometry(2.1, 0.18, 0.82), body, [0, 0.34, 0]);
  addMesh(van, new THREE.BoxGeometry(1.25, 0.9, 0.78), cargo, [-0.34, 0.87, 0]);
  addMesh(van, new THREE.BoxGeometry(0.72, 0.78, 0.78), body, [0.68, 0.8, 0]);
  addMesh(van, new THREE.BoxGeometry(0.04, 0.46, 0.6), window, [1.05, 0.95, 0], [0, Math.PI / 2, 0]);
  addMesh(van, new THREE.BoxGeometry(0.36, 0.3, 0.03), window, [0.67, 0.98, 0.4]);
  addMesh(van, new THREE.BoxGeometry(0.36, 0.3, 0.03), window, [0.67, 0.98, -0.4]);
  addMesh(van, new THREE.BoxGeometry(0.08, 0.16, 0.18), light, [1.08, 0.58, 0.28]);
  addMesh(van, new THREE.BoxGeometry(0.08, 0.16, 0.18), light, [1.08, 0.58, -0.28]);
  addMesh(van, new THREE.BoxGeometry(0.08, 0.15, 0.54), rubber, [1.11, 0.43, 0]);
  addMesh(van, new THREE.BoxGeometry(1.05, 0.035, 0.035), light, [-0.28, 0.58, 0.405]);
  addMesh(van, new THREE.BoxGeometry(0.62, 0.035, 0.035), light, [-0.28, 1.21, 0.405]);

  const fleetPlaque = createPlaque("SURPLUS / ELECTRIC FLEET", 0.92, 0.17);
  fleetPlaque.position.set(-0.3, 0.89, 0.405);
  fleetPlaque.castShadow = false;
  van.add(fleetPlaque);

  const wheelGeometry = new THREE.CylinderGeometry(0.23, 0.23, 0.14, 28);
  const treadGeometry = new THREE.TorusGeometry(0.23, 0.035, 12, 28);
  [-0.67, 0.68].forEach((x) => {
    [-0.45, 0.45].forEach((z) => {
      addMesh(van, wheelGeometry, rubber, [x, 0.28, z], [Math.PI / 2, 0, 0]);
      addMesh(van, treadGeometry, rubber, [x, 0.28, z]);
      addMesh(van, new THREE.CylinderGeometry(0.1, 0.1, 0.025, 20), wheelHub, [x, 0.28, z], [Math.PI / 2, 0, 0]);
    });
  });

  van.position.set(2.72, 0, -1.14);
  van.rotation.y = -0.12;
  return van;
};

const createNodeBeacon = (position: [number, number, number], color: string) => {
  const node = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.012, 12, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = Math.PI / 2;
  node.add(ring);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), emissiveSurface(color, 1.2));
  node.add(core);
  node.position.set(position[0], position[1], position[2]);
  return node;
};

const createFlowTrack = (points: THREE.Vector3[], color: string, duration: number, offset: number): FlowTrack => {
  const curve = new THREE.CatmullRomCurve3(points);
  const trail = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 72, 0.018, 8, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  trail.castShadow = false;

  const pulseMaterial = emissiveSurface(color, 1.2);
  const pulseA = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), pulseMaterial);
  const pulseB = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), pulseMaterial);
  pulseA.castShadow = false;
  pulseB.castShadow = false;

  return { curve, pulses: [pulseA, pulseB], duration, offset };
};

export const mountUnityHouseWorld = () => {
  const stage = document.querySelector<HTMLElement>("[data-unity-world]");
  const canvas = stage?.querySelector<HTMLCanvasElement>("[data-unity-canvas]");

  if (!stage || !canvas) return;

  let renderer: THREE.WebGLRenderer;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    stage.classList.add("webgl-unavailable");
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2("#071321", 0.032);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const cameraTarget = new THREE.Vector3(8.4, 6.1, 9.6);
  const cameraGoal = new THREE.Vector3();
  const lookTarget = new THREE.Vector3(0, 0.78, 0);
  const world = new THREE.Group();
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  const actors: Actor[] = [];
  const flows: FlowTrack[] = [];
  const startedAt = performance.now();
  let animationFrame = 0;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  scene.add(world);
  scene.add(new THREE.HemisphereLight("#7daeb9", "#06101b", 0.95));

  const keyLight = new THREE.DirectionalLight("#f3d99a", 2.65);
  keyLight.position.set(-4.5, 8.5, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 28;
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  scene.add(keyLight);

  const slab = addMesh(world, new THREE.BoxGeometry(8.3, 0.18, 5.3), surface("#091322", 0.66, 0.24), [0, -0.09, 0]);
  slab.receiveShadow = true;
  world.add(createCoordinateGrid());
  addMesh(world, new THREE.BoxGeometry(8.15, 0.045, 0.05), emissiveSurface("#174451", 0.18), [0, 0.03, 2.54]);
  addMesh(world, new THREE.BoxGeometry(8.15, 0.045, 0.05), emissiveSurface("#174451", 0.18), [0, 0.03, -2.54]);

  const venue = createArchitecturalCutaway();
  venue.position.set(-1.16, 0, -0.05);
  world.add(venue);

  const kitchen = createHostedKitchen();
  kitchen.position.add(venue.position);
  world.add(kitchen);

  const hub = createCommunityHub();
  hub.position.add(venue.position);
  world.add(hub);

  const welcome = createWelcomePortico();
  welcome.position.add(venue.position);
  world.add(welcome);

  const kitchenLight = new THREE.PointLight("#d7c18b", 2.2, 3.2, 2);
  kitchenLight.position.set(-2.0, 1.62, -0.42);
  world.add(kitchenLight);
  const welcomeLight = new THREE.PointLight("#48d1cc", 1.25, 2.6, 2);
  welcomeLight.position.set(0.08, 1.48, 0.68);
  world.add(welcomeLight);

  world.add(createElectricVan());

  const personData = [
    { scale: 0.78, shirt: "#b58e58", skin: "#a86e50", origin: new THREE.Vector3(-0.95, 0, 0.78), phase: 0.2, radius: 0.28, speed: 0.72 },
    { scale: 0.66, shirt: "#3e7d88", skin: "#bd805e", origin: new THREE.Vector3(-0.38, 0, 0.9), phase: 2.1, radius: 0.2, speed: 0.84 },
    { scale: 0.98, shirt: "#466273", skin: "#7e573f", origin: new THREE.Vector3(-0.58, 0, 0.36), phase: 1.4, radius: 0.08, speed: 0.38 },
    { scale: 0.9, shirt: "#88734c", skin: "#d19570", origin: new THREE.Vector3(0.24, 0, 0.62), phase: 4.3, radius: 0.1, speed: 0.44 },
  ];

  personData.forEach((data) => {
    const group = createPerson(data.scale, data.shirt, data.skin);
    group.position.copy(data.origin);
    world.add(group);
    actors.push({ group, origin: data.origin, phase: data.phase, radius: data.radius, speed: data.speed });
  });

  const ball = addMesh(world, new THREE.SphereGeometry(0.09, 20, 16), emissiveSurface("#d7c18b", 0.55), [0, 0.12, 1.08]);
  ball.castShadow = true;

  const vanNode = new THREE.Vector3(1.84, 0.06, -1.12);
  const kitchenNode = new THREE.Vector3(-1.96, 0.06, -0.42);
  const hubNode = new THREE.Vector3(-0.58, 0.06, 0.18);
  const welcomeNode = new THREE.Vector3(0.02, 0.06, 0.72);

  world.add(createNodeBeacon([vanNode.x, vanNode.y, vanNode.z], "#20b2aa"));
  world.add(createNodeBeacon([kitchenNode.x, kitchenNode.y, kitchenNode.z], "#d7c18b"));
  world.add(createNodeBeacon([hubNode.x, hubNode.y, hubNode.z], "#d7c18b"));
  world.add(createNodeBeacon([welcomeNode.x, welcomeNode.y, welcomeNode.z], "#48d1cc"));

  flows.push(
    createFlowTrack(
      [vanNode, new THREE.Vector3(0.95, 0.06, -1.02), new THREE.Vector3(-0.54, 0.06, -0.64), kitchenNode],
      "#20b2aa",
      5.8,
      0,
    ),
  );
  flows.push(
    createFlowTrack(
      [kitchenNode, new THREE.Vector3(-1.38, 0.06, 0.05), new THREE.Vector3(-0.94, 0.06, 0.28), hubNode],
      "#d7c18b",
      4.6,
      0.24,
    ),
  );
  flows.push(
    createFlowTrack(
      [hubNode, new THREE.Vector3(-0.14, 0.06, 0.48), welcomeNode],
      "#48d1cc",
      3.4,
      0.46,
    ),
  );
  flows.forEach((flow) => world.add(...flow.pulses));

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const updatePointer = (event: PointerEvent) => {
    const bounds = stage.getBoundingClientRect();
    pointerTarget.set(
      clamp((event.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5),
      clamp((event.clientY - bounds.top) / bounds.height - 0.5, -0.5, 0.5),
    );
  };

  const resetPointer = () => pointerTarget.set(0, 0);
  stage.addEventListener("pointermove", updatePointer);
  stage.addEventListener("pointerleave", resetPointer);
  window.addEventListener("resize", resize);

  const render = () => {
    const elapsed = (performance.now() - startedAt) / 1000;
    pointer.lerp(pointerTarget, reducedMotion ? 1 : 0.06);

    actors.forEach((actor, index) => {
      const angle = actor.phase + (reducedMotion ? 0 : elapsed * actor.speed);
      actor.group.position.x = actor.origin.x + Math.cos(angle) * actor.radius;
      actor.group.position.z = actor.origin.z + Math.sin(angle) * actor.radius;
      actor.group.position.y = Math.abs(Math.sin(angle * 1.7)) * (index < 2 ? 0.018 : 0.008);
      actor.group.rotation.y = Math.sin(angle) * 0.16;
    });

    ball.position.set(0.06 + Math.cos(elapsed * 0.84) * 0.3, 0.14 + Math.abs(Math.sin(elapsed * 0.84)) * 0.13, 1.04 + Math.sin(elapsed * 0.84) * 0.2);

    flows.forEach((flow) => {
      flow.pulses.forEach((pulse, index) => {
        const progress = (elapsed / flow.duration + flow.offset + index * 0.5) % 1;
        pulse.position.copy(flow.curve.getPointAt(progress));
      });
    });

    world.rotation.y = pointer.x * 0.075 + (reducedMotion ? 0 : Math.sin(elapsed * 0.08) * 0.008);
    world.rotation.x = pointer.y * -0.035;

    cameraGoal.set(8.4 + pointer.x * 0.62, 6.1 - pointer.y * 0.34, 9.6 + pointer.x * 0.42);
    cameraTarget.lerp(cameraGoal, reducedMotion ? 1 : 0.045);
    camera.position.copy(cameraTarget);
    camera.lookAt(lookTarget);
    renderer.render(scene, camera);

    if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
  };

  stage.classList.add("is-webgl");
  resize();
  render();

  if (reducedMotion) window.cancelAnimationFrame(animationFrame);
};
