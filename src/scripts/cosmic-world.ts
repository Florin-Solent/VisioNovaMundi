import * as THREE from "three";

type Orbiter = {
  mesh: THREE.Mesh;
  glow: THREE.Sprite;
  light: THREE.PointLight;
  radiusX: number;
  radiusY: number;
  depth: number;
  phase: number;
  scrollTravel: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createRadialTexture = (inner: string, outer: string) => {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 128;
  textureCanvas.height = 128;
  const context = textureCanvas.getContext("2d");

  if (!context) return null;

  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.22, inner);
  gradient.addColorStop(0.58, outer);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createStarfield = () => {
  const count = 1050;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color("#355b83"), new THREE.Color("#a77f3d"), new THREE.Color("#2c7e83")];

  for (let index = 0; index < count; index += 1) {
    const radius = 4.8 + Math.random() * 7.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const sinPhi = Math.sin(phi);
    const positionIndex = index * 3;
    positions[positionIndex] = radius * sinPhi * Math.cos(theta);
    positions[positionIndex + 1] = radius * Math.cos(phi);
    positions[positionIndex + 2] = radius * sinPhi * Math.sin(theta);

    const color = palette[index % palette.length];
    colors[positionIndex] = color.r;
    colors[positionIndex + 1] = color.g;
    colors[positionIndex + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.84,
    vertexColors: true,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
};

const createOrbit = (radiusX: number, radiusY: number, color: string, opacity: number) => {
  const points: THREE.Vector3[] = [];
  const segments = 128;

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 0));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  return new THREE.LineLoop(geometry, material);
};

const createMetalMaterial = (color: string, roughness = 0.35) =>
  new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.85,
    roughness,
    emissive: color,
    emissiveIntensity: 0.1,
    clearcoat: 0.55,
    clearcoatRoughness: 0.16,
  });

const createGimbal = (radius: number, tube: number, color: string, rotation: [number, number, number]) => {
  const group = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 24, 160), createMetalMaterial(color));
  const bevel = new THREE.Mesh(
    new THREE.TorusGeometry(radius + tube * 0.32, tube * 0.16, 16, 160),
    createMetalMaterial("#dfc98f", 0.22),
  );

  group.add(band, bevel);
  group.rotation.set(rotation[0], rotation[1], rotation[2]);
  return group;
};

type EarthLayers = {
  surface: THREE.MeshPhongMaterial;
  nightLights: THREE.MeshBasicMaterial;
  clouds: THREE.MeshLambertMaterial;
};

const createEarthLayers = (renderer: THREE.WebGLRenderer): EarthLayers => {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const load = (path: string, colorSpace = THREE.SRGBColorSpace) => {
    const texture = loader.load(path);
    texture.colorSpace = colorSpace;
    texture.anisotropy = anisotropy;
    return texture;
  };

  const surfaceMap = load("/images/earth-day.jpg");
  const nightMap = load("/images/earth-night.png");
  const cloudMap = load("/images/earth-clouds.png");
  const normalMap = load("/images/earth-normal.jpg", THREE.NoColorSpace);
  const specularMap = load("/images/earth-specular.jpg", THREE.NoColorSpace);

  return {
    surface: new THREE.MeshPhongMaterial({
      map: surfaceMap,
      normalMap,
      normalScale: new THREE.Vector2(0.38, 0.38),
      specularMap,
      specular: new THREE.Color("#6cc9d1"),
      shininess: 24,
      color: "#ffffff",
      emissive: new THREE.Color("#18535f"),
      emissiveMap: surfaceMap,
      emissiveIntensity: 0.28,
    }),
    nightLights: new THREE.MeshBasicMaterial({
      map: nightMap,
      color: "#b9f4df",
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    clouds: new THREE.MeshLambertMaterial({
      map: cloudMap,
      color: "#bce9e8",
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
};

const createAtmosphereMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color("#82d6d8") } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.1);
        gl_FragColor = vec4(uColor, intensity * 0.56);
      }
    `,
  });

const createOrbiter = (color: string, size: number) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 32, 32),
    new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.16,
      attenuationColor: color,
      attenuationDistance: 0.8,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
    }),
  );

  const glowTexture = createRadialTexture("rgba(255,255,255,.86)", `${color}aa`);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture ?? undefined,
      color,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.scale.set(size * 5.2, size * 5.2, 1);

  const light = new THREE.PointLight(color, 0.55, 2.6, 2);

  return { mesh, glow, light };
};

export const mountCosmicWorld = () => {
  const stage = document.querySelector<HTMLElement>("[data-orrery]");
  const canvas = stage?.querySelector<HTMLCanvasElement>("[data-cosmic-canvas]");
  const blueprint = stage?.querySelector<HTMLElement>("[data-gate-blueprint]");

  if (!stage || !canvas) return;

  let renderer: THREE.WebGLRenderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    stage.classList.add("webgl-unavailable");
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  const cameraTarget = new THREE.Vector3(0, 0, 5.9);
  const lookTarget = new THREE.Vector3();
  const world = new THREE.Group();
  const orbitGroup = new THREE.Group();
  const gimbalGroup = new THREE.Group();
  const starfield = createStarfield();
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  const orbiters: Orbiter[] = [];
  let scrollTarget = 0;
  let scrollProgress = 0;
  let animationFrame = 0;
  let audioContext: AudioContext | null = null;
  let lastAudioProgress = 0;
  let detentPlayed = false;
  let earthSpin = 0;
  let lastFrameTime = performance.now();

  const ensureAudio = () => {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  };

  const playGateSound = (kind: "grind" | "detent", intensity = 1) => {
    if (reducedMotion && kind === "grind") return;
    const context = audioContext;
    if (!context || context.state !== "running") return;
    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "detent" ? 0.055 : 0.018 * intensity, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "detent" ? 0.22 : 0.16));

    if (kind === "detent") {
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(92, now);
      oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.18);
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 0.23);
      return;
    }

    const buffer = context.createBuffer(1, context.sampleRate * 0.18, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      const envelope = 1 - index / data.length;
      data[index] = (Math.random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420 + intensity * 180, now);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    source.start(now);
  };

  const unlockAudio = () => {
    ensureAudio();
    stage?.removeEventListener("pointerdown", unlockAudio);
  };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x000000, 0);
  const earthLayers = createEarthLayers(renderer);

  camera.position.set(0, 0, 5.9);
  scene.add(starfield);
  scene.add(world);
  world.add(gimbalGroup, orbitGroup);

  const nebulaTexture = createRadialTexture("rgba(84,216,218,.22)", "rgba(25,99,142,.12)");
  if (nebulaTexture) {
    const nebula = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: nebulaTexture,
        transparent: true,
        opacity: 0.74,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    nebula.scale.set(7.2, 7.2, 1);
    nebula.position.set(0.4, 0.1, -1.7);
    world.add(nebula);
  }

  const keyLight = new THREE.PointLight("#e5c985", 5.2, 10, 2);
  keyLight.position.set(-3.6, 2.8, 4.8);
  world.add(keyLight);
  world.add(new THREE.AmbientLight("#8ad4dc", 1.05));
  const earthFill = new THREE.HemisphereLight("#d7f4ff", "#123a52", 0.72);
  world.add(earthFill);

  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.18, 64, 64), earthLayers.surface);
  world.add(planet);

  const nightLights = new THREE.Mesh(new THREE.SphereGeometry(1.195, 48, 48), earthLayers.nightLights);
  world.add(nightLights);

  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.225, 48, 48), earthLayers.clouds);
  world.add(clouds);

  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.29, 48, 48), createAtmosphereMaterial());
  world.add(atmosphere);

  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(1.36, 64, 64),
    new THREE.MeshPhysicalMaterial({
      color: "#8be7ea",
      transparent: true,
      opacity: 0.18,
      transmission: 0.92,
      roughness: 0.08,
      ior: 1.54,
      thickness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  lens.scale.set(1, 1, 0.92);
  world.add(lens);

  const lensRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.34, 0.018, 12, 160),
    new THREE.MeshPhysicalMaterial({
      color: "#48d1cc",
      metalness: 0.48,
      roughness: 0.18,
      emissive: "#20b2aa",
      emissiveIntensity: 0.26,
      transparent: true,
      opacity: 0.72,
    }),
  );
  lensRim.rotation.x = Math.PI / 2;
  world.add(lensRim);

  const earthBaseRotation = -0.62;

  const planetRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.035, 16, 160),
    createMetalMaterial("#c69b56", 0.28),
  );
  planetRing.rotation.set(1.16, -0.32, 0.48);
  world.add(planetRing);

  const gimbalSpecs = [
    { radius: 2.18, tube: 0.062, color: "#c69b56", rotation: [0.88, -0.24, 0.34] as [number, number, number] },
    { radius: 1.86, tube: 0.052, color: "#20b2aa", rotation: [1.14, 0.18, -0.46] as [number, number, number] },
    { radius: 2.42, tube: 0.042, color: "#8f83bd", rotation: [0.5, 0.72, 0.14] as [number, number, number] },
  ];

  gimbalSpecs.forEach((gimbal) => {
    gimbalGroup.add(createGimbal(gimbal.radius, gimbal.tube, gimbal.color, gimbal.rotation));
  });

  const rings = [
    { radiusX: 2.12, radiusY: 1.02, color: "#d7c18b", opacity: 0.5, rotation: [0.88, -0.24, 0.34] },
    { radiusX: 1.78, radiusY: 1.58, color: "#8fd0c8", opacity: 0.34, rotation: [1.14, 0.18, -0.46] },
    { radiusX: 2.34, radiusY: 1.64, color: "#b5a3df", opacity: 0.26, rotation: [0.5, 0.72, 0.14] },
  ];

  rings.forEach((ring) => {
    const orbit = createOrbit(ring.radiusX, ring.radiusY, ring.color, ring.opacity);
    orbit.rotation.set(ring.rotation[0], ring.rotation[1], ring.rotation[2]);
    orbitGroup.add(orbit);
  });

  const orbiterData = [
    { color: "#8fd0c8", size: 0.11, radiusX: 2.12, radiusY: 1.02, depth: 0.24, phase: 2.62, scrollTravel: 0.34 },
    { color: "#d7c18b", size: 0.14, radiusX: 1.78, radiusY: 1.58, depth: -0.14, phase: 0.62, scrollTravel: -0.28 },
    { color: "#b5a3df", size: 0.1, radiusX: 2.34, radiusY: 1.64, depth: 0.12, phase: 4.15, scrollTravel: 0.22 },
  ];

  orbiterData.forEach((data) => {
    const { mesh, glow, light } = createOrbiter(data.color, data.size);
    orbitGroup.add(mesh, glow, light);
    orbiters.push({ ...data, mesh, glow, light });
  });

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
  const updateScroll = () => {
    scrollTarget = clamp(window.scrollY / Math.max(window.innerHeight * 1.2, 1), 0, 1);
  };

  stage.addEventListener("pointermove", updatePointer);
  stage.addEventListener("pointerleave", resetPointer);
  stage.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", updateScroll, { passive: true });

  const render = () => {
    const now = performance.now();
    const frameDelta = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    if (!reducedMotion) earthSpin += frameDelta * 0.12;

    pointer.lerp(pointerTarget, reducedMotion ? 1 : 0.055);
    scrollProgress += (scrollTarget - scrollProgress) * (reducedMotion ? 1 : 0.06);

    // Ease like a weighted mechanical lock: quick engagement, long damped settling.
    const mechanicalProgress = 1 - Math.pow(1 - scrollProgress, 4);

    if (Math.abs(mechanicalProgress - lastAudioProgress) > 0.065) {
      playGateSound("grind", 0.8 + mechanicalProgress * 0.4);
      lastAudioProgress = mechanicalProgress;
    }
    if (mechanicalProgress > 0.985 && !detentPlayed) {
      playGateSound("detent");
      detentPlayed = true;
    } else if (mechanicalProgress < 0.94) {
      detentPlayed = false;
    }
    if (blueprint) blueprint.parentElement?.classList.toggle("gate-complete", mechanicalProgress > 0.985);

    world.rotation.y = pointer.x * 0.075 + mechanicalProgress * 0.28;
    world.rotation.x = pointer.y * -0.045 + mechanicalProgress * 0.08;
    planet.rotation.y = earthBaseRotation + earthSpin + mechanicalProgress * 0.56;
    nightLights.rotation.y = earthBaseRotation + earthSpin * 1.02 + mechanicalProgress * 0.56;
    clouds.rotation.y = earthBaseRotation + earthSpin * 1.08 + mechanicalProgress * 0.56;
    atmosphere.rotation.y = mechanicalProgress * 0.34;
    lens.rotation.y = mechanicalProgress * 0.24;
    lensRim.rotation.z = mechanicalProgress * -0.16;
    gimbalGroup.rotation.y = mechanicalProgress * THREE.MathUtils.degToRad(15);
    gimbalGroup.rotation.x = mechanicalProgress * 0.035;
    planetRing.rotation.z = 0.48 + mechanicalProgress * 0.26;
    starfield.rotation.y = mechanicalProgress * -0.12;
    starfield.rotation.x = mechanicalProgress * 0.06;
    orbiters.forEach((orbiter) => {
      const angle = orbiter.phase + mechanicalProgress * orbiter.scrollTravel;
      const x = Math.cos(angle) * orbiter.radiusX;
      const y = Math.sin(angle) * orbiter.radiusY;
      const z = Math.sin(angle) * orbiter.depth;
      orbiter.mesh.position.set(x, y, z);
      orbiter.glow.position.set(x, y, z);
      orbiter.light.position.set(x, y, z + 0.18);
    });

    const desiredCameraX = pointer.x * 0.42;
    const desiredCameraY = pointer.y * -0.3;
    cameraTarget.x = desiredCameraX;
    cameraTarget.y = desiredCameraY;
    cameraTarget.z = 5.9 - mechanicalProgress * 0.5;
    camera.position.lerp(cameraTarget, reducedMotion ? 1 : 0.045);
    lookTarget.set(0, 0, 0);
    camera.lookAt(lookTarget);
    renderer.render(scene, camera);

    if (!reducedMotion) animationFrame = window.requestAnimationFrame(render);
  };

  stage.classList.add("is-webgl");
  resize();
  updateScroll();
  render();

  if (reducedMotion) {
    window.cancelAnimationFrame(animationFrame);
  }
};
