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
  const count = 1550;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    new THREE.Color("#f1f8ff"),
    new THREE.Color("#1e4c70"),
    new THREE.Color("#2f8da1"),
    new THREE.Color("#a77f3d"),
  ];

  for (let index = 0; index < count; index += 1) {
    const radius = 2.8 + Math.random() * 3.8;
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
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
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

  const surfaceMap = load("/images/earth-blue-marble.jpg");
  const nightMap = load("/images/earth-night.png");
  const cloudMap = load("/images/earth-clouds.png");
  const normalMap = load("/images/earth-normal.jpg", THREE.NoColorSpace);
  const specularMap = load("/images/earth-specular.jpg", THREE.NoColorSpace);

  return {
    surface: new THREE.MeshPhongMaterial({
      map: surfaceMap,
      normalMap,
      normalScale: new THREE.Vector2(0.52, 0.52),
      specularMap,
      specular: new THREE.Color("#82c7e8"),
      shininess: 18,
      color: "#ffffff",
    }),
    nightLights: createNightLightsMaterial(nightMap),
    clouds: new THREE.MeshLambertMaterial({
      map: cloudMap,
      color: "#ffffff",
      transparent: true,
      opacity: 0.3,
      blending: THREE.NormalBlending,
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
    uniforms: { uColor: { value: new THREE.Color("#64bfff") } },
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
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
        gl_FragColor = vec4(uColor, intensity * 0.42);
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
  const cameraTarget = new THREE.Vector3(0, 0, 5.45);
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
  let cameraDistanceTarget = 5.45;
  let lastSolarUpdate = 0;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  const earthLayers = createEarthLayers(renderer);

  camera.position.set(0, 0, 5.45);
  scene.add(starfield);
  scene.add(world);
  world.add(earthGroup);

  const nebulaTexture = createRadialTexture("rgba(84,216,218,.22)", "rgba(25,99,142,.12)");
  if (nebulaTexture) {
    const nebula = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: nebulaTexture,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    nebula.scale.set(7.2, 7.2, 1);
    nebula.position.set(0.4, 0.1, -1.7);
    world.add(nebula);
  }

  const keyLight = new THREE.DirectionalLight("#fff1d4", 2.7);
  keyLight.position.set(-4.5, 2.8, 5.5);
  world.add(keyLight);
  world.add(new THREE.AmbientLight("#3f6b8a", 0.28));
  const earthFill = new THREE.HemisphereLight("#8ccff0", "#071321", 0.24);
  world.add(earthFill);
  const rimLight = new THREE.DirectionalLight("#5bb7ff", 0.42);
  rimLight.position.set(3, -1, -5);
  world.add(rimLight);

  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.42, 64, 64), earthLayers.surface);
  earthGroup.add(planet);

  const nightLights = new THREE.Mesh(new THREE.SphereGeometry(1.435, 48, 48), earthLayers.nightLights);
  earthGroup.add(nightLights);

  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.455, 48, 48), earthLayers.clouds);
  earthGroup.add(clouds);

  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.46, 48, 48), createAtmosphereMaterial());
  earthGroup.add(atmosphere);

  const outerAura = new THREE.Mesh(
    new THREE.SphereGeometry(1.58, 48, 48),
    new THREE.MeshBasicMaterial({
      color: "#4da9e8",
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  earthGroup.add(outerAura);

  const earthBaseRotation = -0.62;
  const earthAxialTilt = THREE.MathUtils.degToRad(-17);

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
    cameraDistanceTarget = clamp(cameraDistanceTarget + event.deltaY * 0.002, 4.55, 6.8);
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
    earthGroup.rotation.set(earthAxialTilt + earthRotationX, earthBaseRotation + earthSpin + mechanicalProgress * 0.56 + earthRotationY, 0);
    clouds.rotation.y = earthSpin * 0.018;
    atmosphere.rotation.y = mechanicalProgress * 0.08;
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
