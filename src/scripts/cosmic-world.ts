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
    const positionIndex = index * 3;
    positions[positionIndex] = (Math.random() - 0.5) * 8.4;
    positions[positionIndex + 1] = (Math.random() - 0.5) * 8.4;
    positions[positionIndex + 2] = -2.2 - Math.random() * 5.8;

    const color = palette[index % palette.length];
    colors[positionIndex] = color.r;
    colors[positionIndex + 1] = color.g;
    colors[positionIndex + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.038,
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
  clouds: THREE.MeshPhongMaterial;
};

const createNightLightsMaterial = (texture: THREE.Texture) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uColor: { value: new THREE.Color("#ffd39a") },
      uSunDirection: { value: new THREE.Vector3(-0.65, 0.28, 0.72).normalize() },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
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
        float night = 1.0 - smoothstep(-0.08, 0.14, daylight);
        vec3 cityTexture = texture2D(uMap, vUv).rgb;
        float luminance = dot(cityTexture, vec3(0.2126, 0.7152, 0.0722));
        float cityMask = smoothstep(0.04, 0.42, luminance);
        vec3 lights = pow(cityTexture, vec3(0.68)) * uColor * 1.8;
        gl_FragColor = vec4(lights, cityMask * night * 0.92);
      }
    `,
  });

const createEarthLayers = (renderer: THREE.WebGLRenderer): EarthLayers => {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
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
      normalScale: new THREE.Vector2(0.28, 0.28),
      specularMap,
      specular: new THREE.Color("#31586f"),
      shininess: 8,
      color: "#ffffff",
    }),
    nightLights: createNightLightsMaterial(nightMap),
    clouds: new THREE.MeshPhongMaterial({
      alphaMap: cloudMap,
      color: "#ffffff",
      transparent: true,
      opacity: 0.12,
      blending: THREE.NormalBlending,
      depthWrite: false,
      shininess: 2,
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
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

  const sunDirection = new THREE.Vector3(-0.65, 0.28, 0.72).normalize();
  const keyLight = new THREE.DirectionalLight("#fff4df", 1.85);
  keyLight.position.copy(sunDirection).multiplyScalar(8);
  scene.add(keyLight);
  scene.add(keyLight.target);
  world.add(new THREE.AmbientLight("#426780", 0.34));
  const earthFill = new THREE.HemisphereLight("#8bc8e6", "#050b14", 0.28);
  scene.add(earthFill);
  const rimLight = new THREE.DirectionalLight("#5bb7ff", 0.42);
  rimLight.position.set(3, -1, -5);
  scene.add(rimLight);

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
  earthLayers.nightLights.uniforms.uSunDirection.value.copy(sunDirection);

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
