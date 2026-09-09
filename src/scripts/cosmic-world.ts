import * as THREE from "three";

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

type EarthLayers = {
  surface: THREE.MeshPhongMaterial;
  nightLights: THREE.ShaderMaterial;
  clouds: THREE.MeshLambertMaterial;
};

const createNightLightsMaterial = (texture: THREE.Texture) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uColor: { value: new THREE.Color("#b9f4df") },
      uSunDirection: { value: new THREE.Vector3(0.25, 0.2, 0.95).normalize() },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normalize(normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform vec3 uSunDirection;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        float daylight = dot(normalize(vNormal), normalize(uSunDirection));
        float night = 1.0 - smoothstep(-0.2, 0.16, daylight);
        vec3 lights = texture2D(uMap, vUv).rgb * uColor;
        gl_FragColor = vec4(lights, night * 0.82);
      }
    `,
  });

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
    nightLights: createNightLightsMaterial(nightMap),
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

export const mountCosmicWorld = () => {
  const stage = document.querySelector<HTMLElement>("[data-orrery]");
  const canvas = stage?.querySelector<HTMLCanvasElement>("[data-cosmic-canvas]");

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
  const earthGroup = new THREE.Group();
  const starfield = createStarfield();
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let scrollTarget = 0;
  let scrollProgress = 0;
  let animationFrame = 0;
  let earthSpin = 0;
  let lastFrameTime = performance.now();
  let earthAutoRotate = true;
  let earthDragActive = false;
  let earthDragIntent: "undecided" | "rotate" | "scroll" = "undecided";
  let earthDragPointerId = -1;
  let earthDragLastX = 0;
  let earthDragLastY = 0;
  let earthRotationX = 0;
  let earthRotationY = 0;
  let earthRotationTargetX = 0;
  let earthRotationTargetY = 0;
  let cameraDistanceTarget = 5.9;
  let lastSolarUpdate = 0;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x000000, 0);
  const earthLayers = createEarthLayers(renderer);

  camera.position.set(0, 0, 5.9);
  scene.add(starfield);
  scene.add(world);
  world.add(earthGroup);

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

  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.3, 64, 64), earthLayers.surface);
  earthGroup.add(planet);

  const nightLights = new THREE.Mesh(new THREE.SphereGeometry(1.315, 48, 48), earthLayers.nightLights);
  earthGroup.add(nightLights);

  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.34, 48, 48), earthLayers.clouds);
  earthGroup.add(clouds);

  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.43, 48, 48), createAtmosphereMaterial());
  earthGroup.add(atmosphere);

  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(1.49, 64, 64),
    new THREE.MeshPhysicalMaterial({
      color: "#8be7ea",
      transparent: true,
      opacity: 0.075,
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
  earthGroup.add(lens);

  const lensRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.47, 0.018, 12, 160),
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
  earthGroup.add(lensRim);

  const earthBaseRotation = -0.62;

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
  const handleEarthPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && event.button !== 0) return;

    earthDragActive = true;
    earthDragIntent = event.pointerType === "mouse" ? "rotate" : "undecided";
    earthDragPointerId = event.pointerId;
    earthDragLastX = event.clientX;
    earthDragLastY = event.clientY;
    earthAutoRotate = false;
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture(event.pointerId);
  };

  const handleEarthPointerMove = (event: PointerEvent) => {
    if (!earthDragActive || event.pointerId !== earthDragPointerId) return;

    const deltaX = event.clientX - earthDragLastX;
    const deltaY = event.clientY - earthDragLastY;
    earthDragLastX = event.clientX;
    earthDragLastY = event.clientY;

    if (earthDragIntent === "undecided") {
      if (Math.hypot(deltaX, deltaY) < 5) return;
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
        earthDragIntent = "scroll";
        earthDragActive = false;
        canvas.classList.remove("is-dragging");
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        return;
      }
      earthDragIntent = "rotate";
    }

    if (earthDragIntent !== "rotate") return;
    event.preventDefault();
    earthRotationTargetY += deltaX * 0.008;
    earthRotationTargetX = clamp(earthRotationTargetX + deltaY * 0.005, -0.58, 0.58);
  };

  const handleEarthPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== earthDragPointerId) return;
    earthDragActive = false;
    earthDragIntent = "undecided";
    earthDragPointerId = -1;
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  const handleCanvasWheel = (event: WheelEvent) => {
    // Preserve normal page scrolling; only pinch-to-zoom (ctrl+wheel) changes the globe camera.
    if (!event.ctrlKey) return;
    event.preventDefault();
    cameraDistanceTarget = clamp(cameraDistanceTarget + event.deltaY * 0.002, 4.85, 7.1);
  };

  const updateSolarDirection = (timestamp: number) => {
    if (timestamp - lastSolarUpdate < 60000) return;

    const current = new Date();
    const yearStart = Date.UTC(current.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((current.getTime() - yearStart) / 86400000);
    const declination = THREE.MathUtils.degToRad(-23.44) * Math.cos((Math.PI * 2 * (dayOfYear + 10)) / 365);
    const utcHours = current.getUTCHours() + current.getUTCMinutes() / 60 + current.getUTCSeconds() / 3600;
    const solarAngle = (utcHours / 24) * Math.PI * 2 - Math.PI;
    const direction = new THREE.Vector3(
      Math.cos(declination) * Math.cos(solarAngle),
      Math.sin(declination),
      Math.cos(declination) * Math.sin(solarAngle),
    ).normalize();

    earthLayers.nightLights.uniforms.uSunDirection.value.copy(direction);
    lastSolarUpdate = timestamp;
  };

  const updateScroll = () => {
    scrollTarget = clamp(window.scrollY / Math.max(window.innerHeight * 1.2, 1), 0, 1);
  };

  stage.addEventListener("pointermove", updatePointer);
  stage.addEventListener("pointerleave", resetPointer);
  canvas.style.touchAction = "pan-y";
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", handleEarthPointerDown);
  canvas.addEventListener("pointermove", handleEarthPointerMove);
  canvas.addEventListener("pointerup", handleEarthPointerUp);
  canvas.addEventListener("pointercancel", handleEarthPointerUp);
  canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", updateScroll, { passive: true });

  const render = () => {
    const now = performance.now();
    const frameDelta = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    if (!reducedMotion && earthAutoRotate && !earthDragActive) earthSpin += frameDelta * 0.12;
    updateSolarDirection(Date.now());

    pointer.lerp(pointerTarget, reducedMotion ? 1 : 0.055);
    scrollProgress += (scrollTarget - scrollProgress) * (reducedMotion ? 1 : 0.06);
    earthRotationX += (earthRotationTargetX - earthRotationX) * (reducedMotion ? 1 : 0.08);
    earthRotationY += (earthRotationTargetY - earthRotationY) * (reducedMotion ? 1 : 0.08);

    // Ease like a weighted mechanical lock: quick engagement, long damped settling.
    const mechanicalProgress = 1 - Math.pow(1 - scrollProgress, 4);

    world.rotation.y = pointer.x * 0.075 + mechanicalProgress * 0.28;
    world.rotation.x = pointer.y * -0.045 + mechanicalProgress * 0.08;
    earthGroup.rotation.set(earthRotationX, earthBaseRotation + earthSpin + mechanicalProgress * 0.56 + earthRotationY, 0);
    clouds.rotation.y = earthSpin * 0.018;
    atmosphere.rotation.y = mechanicalProgress * 0.08;
    lens.rotation.y = mechanicalProgress * 0.08;
    lensRim.rotation.z = mechanicalProgress * -0.08;
    starfield.rotation.y = mechanicalProgress * -0.12;
    starfield.rotation.x = mechanicalProgress * 0.06;

    const desiredCameraX = pointer.x * 0.42;
    const desiredCameraY = pointer.y * -0.3;
    cameraTarget.x = desiredCameraX;
    cameraTarget.y = desiredCameraY;
    cameraTarget.z = cameraDistanceTarget - mechanicalProgress * 0.5;
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
