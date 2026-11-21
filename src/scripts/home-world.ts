import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BackSide,
  Color,
  DirectionalLight,
  EllipseCurve,
  BufferGeometry,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LoadingManager,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  QuadraticBezierCurve3,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { createAtmosphereMaterial, createEarthLayers, createRadialTexture, createStarfield } from "./cosmic-world";

const EARTH_RADIUS = 1.42;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smooth = (value: number) => value * value * (3 - 2 * value);

// Places VNM works from and the wider world it hopes to contribute to.
const places = {
  london: [51.51, -0.13],
  bucharest: [44.43, 26.1],
  cluj: [46.77, 23.6],
  covasna: [45.85, 25.93],
  brussels: [50.85, 4.35],
  newYork: [40.71, -74.0],
  nairobi: [-1.29, 36.82],
  delhi: [28.61, 77.21],
  saoPaulo: [-23.55, -46.63],
  singapore: [1.35, 103.82],
} as const;

type PlaceName = keyof typeof places;

const routes: [PlaceName, PlaceName][] = [
  ["london", "bucharest"],
  ["london", "cluj"],
  ["bucharest", "covasna"],
  ["london", "brussels"],
  ["london", "newYork"],
  ["london", "nairobi"],
  ["bucharest", "delhi"],
  ["london", "saoPaulo"],
  ["brussels", "singapore"],
];

// Matches the UV layout of three's SphereGeometry, so points sit on the right place on the texture.
const toVector = ([lat, lon]: readonly [number, number], radius: number) => {
  const phi = MathUtils.degToRad(90 - lat);
  const theta = MathUtils.degToRad(lon + 180);
  return new Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
};

const createArcMaterial = (offset: number, speed: number) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uOffset: { value: offset },
      uSpeed: { value: speed },
      uColor: { value: new Color("#5fe3d6") },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOffset;
      uniform float uSpeed;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float head = fract(uTime * uSpeed + uOffset) * 1.3 - 0.15;
        float d = vUv.x - head;
        float pulse = smoothstep(-0.24, 0.0, d) * (1.0 - smoothstep(0.0, 0.025, d));
        float ends = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.94, 1.0, vUv.x));
        vec3 color = mix(uColor, vec3(1.0), pulse * 0.55);
        gl_FragColor = vec4(color, (0.22 + pulse * 0.95) * ends);
      }
    `,
  });

const createArc = (from: Vector3, to: Vector3) => {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const distance = from.distanceTo(to);
  mid.setLength(EARTH_RADIUS + 0.12 + distance * 0.32);
  return new QuadraticBezierCurve3(from, mid, to);
};

export const mountHomeWorld = () => {
  const stage = document.querySelector<HTMLElement>("[data-home-world]");
  const canvas = stage?.querySelector<HTMLCanvasElement>("[data-home-canvas]");
  if (!stage || !canvas) return;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    stage.classList.add("webgl-unavailable");
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 60);
  const lookTarget = new Vector3();
  const pointer = new Vector2();
  const pointerTarget = new Vector2();
  const manager = new LoadingManager();
  let animationFrame = 0;
  let elapsed = 0;
  let lastFrame = performance.now();
  let heroProgress = 0;
  let heroTarget = 0;
  let pageProgress = 0;
  let pageTarget = 0;
  let narrow = false;
  let running = false;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  // Scene graph: rig (position on screen) > tilt (axial tilt) > spin (rotation) > earth layers and network.
  const starfield = createStarfield();
  starfield.scale.set(2.4, 2.4, 1.6);
  scene.add(starfield);

  const rig = new Group();
  const tilt = new Group();
  const spin = new Group();
  scene.add(rig);
  rig.add(tilt);
  tilt.add(spin);
  tilt.rotation.set(0.6, 0, MathUtils.degToRad(-10));

  const layers = createEarthLayers(renderer, manager);
  spin.add(new Mesh(new SphereGeometry(EARTH_RADIUS, 72, 72), layers.surface));
  spin.add(new Mesh(new SphereGeometry(EARTH_RADIUS + 0.015, 48, 48), layers.nightLights));
  const clouds = new Mesh(new SphereGeometry(EARTH_RADIUS + 0.035, 48, 48), layers.clouds);
  spin.add(clouds);
  tilt.add(new Mesh(new SphereGeometry(EARTH_RADIUS + 0.04, 48, 48), createAtmosphereMaterial()));
  tilt.add(
    new Mesh(
      new SphereGeometry(EARTH_RADIUS + 0.2, 48, 48),
      new MeshBasicMaterial({ color: "#3fb7e6", transparent: true, opacity: 0.06, depthWrite: false, side: BackSide, blending: AdditiveBlending }),
    ),
  );

  // Network of connections: glowing arcs with light travelling along them.
  const arcMaterials: ShaderMaterial[] = [];
  routes.forEach(([from, to], index) => {
    const curve = createArc(toVector(places[from], EARTH_RADIUS + 0.01), toVector(places[to], EARTH_RADIUS + 0.01));
    const material = createArcMaterial(index * 0.37, 0.11 + (index % 3) * 0.025);
    arcMaterials.push(material);
    spin.add(new Mesh(new TubeGeometry(curve, 96, 0.007, 6, false), material));
  });

  const markerTexture = createRadialTexture("rgba(220,255,250,1)", "rgba(95,227,214,.45)");
  const markers: Sprite[] = [];
  if (markerTexture) {
    Object.values(places).forEach((place, index) => {
      const marker = new Sprite(new SpriteMaterial({ map: markerTexture, transparent: true, depthWrite: false, blending: AdditiveBlending }));
      marker.position.copy(toVector(place, EARTH_RADIUS + 0.02));
      marker.scale.setScalar(index < 5 ? 0.09 : 0.065);
      marker.userData.phase = index * 0.9;
      markers.push(marker);
      spin.add(marker);
    });
  }

  // A single orbit with a travelling light, tilted across the globe.
  const orbit = new Group();
  const orbitCurve = new EllipseCurve(0, 0, 2.15, 2.15, 0, Math.PI * 2, false, 0);
  const orbitLine = new Line(
    new BufferGeometry().setFromPoints(orbitCurve.getPoints(160).map((point) => new Vector3(point.x, 0, point.y))),
    new LineBasicMaterial({ color: "#7fd4ff", transparent: true, opacity: 0.18, depthWrite: false, blending: AdditiveBlending }),
  );
  orbit.add(orbitLine);
  const satelliteTexture = createRadialTexture("rgba(255,255,255,1)", "rgba(127,212,255,.5)");
  const satellite = new Sprite(new SpriteMaterial({ map: satelliteTexture ?? undefined, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  satellite.scale.setScalar(0.12);
  orbit.add(satellite);
  orbit.rotation.set(MathUtils.degToRad(72), MathUtils.degToRad(-18), MathUtils.degToRad(14));
  rig.add(orbit);

  const nebulaTexture = createRadialTexture("rgba(60,170,230,.28)", "rgba(20,90,140,.12)");
  if (nebulaTexture) {
    const nebula = new Sprite(new SpriteMaterial({ map: nebulaTexture, transparent: true, opacity: 0.32, depthWrite: false, blending: AdditiveBlending }));
    nebula.scale.set(9, 9, 1);
    nebula.position.set(0, 0, -2.5);
    rig.add(nebula);
  }

  const sun = new Vector3(-0.55, 0.32, 0.78).normalize();
  const keyLight = new DirectionalLight("#fff3dc", 2.0);
  keyLight.position.copy(sun).multiplyScalar(8);
  scene.add(keyLight);
  scene.add(new AmbientLight("#3a6a86", 0.3));
  scene.add(new HemisphereLight("#8bd0ee", "#040a14", 0.3));
  const rim = new DirectionalLight("#4fc3ff", 0.55);
  rim.position.set(3, -1, -5);
  scene.add(rim);
  layers.nightLights.uniforms.uSunDirection.value.copy(sun);

  // Europe faces the viewer at rest.
  const restSpin = -Math.PI / 2 - MathUtils.degToRad(18);

  const resize = () => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    narrow = width / height < 0.9;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!running) render();
  };

  const updateScroll = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    heroTarget = clamp(window.scrollY / Math.max(1, window.innerHeight * 0.9), 0, 1);
    pageTarget = clamp(window.scrollY / maxScroll, 0, 1);
    if (reducedMotion) render();
  };

  const updatePointer = (event: PointerEvent) => {
    pointerTarget.set(clamp(event.clientX / window.innerWidth - 0.5, -0.5, 0.5), clamp(event.clientY / window.innerHeight - 0.5, -0.5, 0.5));
  };

  function render() {
    const now = performance.now();
    const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    if (!reducedMotion) elapsed += delta;

    const ease = reducedMotion ? 1 : 0.06;
    heroProgress += (heroTarget - heroProgress) * ease;
    pageProgress += (pageTarget - pageProgress) * ease;
    pointer.lerp(pointerTarget, reducedMotion ? 1 : 0.05);

    // Hero: globe to the right on wide screens, low and large behind the headline on narrow ones.
    // Scrolling past the hero brings it to the centre and slightly back, behind the glass panels.
    const h = smooth(heroProgress);
    const restX = narrow ? 0 : 1.45;
    const restY = narrow ? -1.5 : -0.12;
    rig.position.set(MathUtils.lerp(restX, 0, h), MathUtils.lerp(restY, 0.1, h), MathUtils.lerp(0, -1.1, h));
    const cameraZ = narrow ? 7.0 : 6.5;
    camera.position.set(pointer.x * 0.35, -pointer.y * 0.22, cameraZ + pageProgress * 0.6);
    lookTarget.set(0, 0, 0);
    camera.lookAt(lookTarget);

    spin.rotation.y = restSpin + Math.sin(elapsed * 0.06) * 0.45 + pageProgress * 1.1 + pointer.x * 0.12;
    clouds.rotation.y = elapsed * 0.012;
    orbit.rotation.y = MathUtils.degToRad(-18) + elapsed * 0.05;
    const angle = elapsed * 0.35;
    satellite.position.set(Math.cos(angle) * 2.15, 0, Math.sin(angle) * 2.15);
    starfield.rotation.y = elapsed * 0.004 + pageProgress * -0.25;
    starfield.rotation.x = pageProgress * 0.08;

    arcMaterials.forEach((material) => (material.uniforms.uTime.value = reducedMotion ? 0.55 : elapsed));
    markers.forEach((marker) => {
      const base = marker.userData.baseScale ?? (marker.userData.baseScale = marker.scale.x);
      marker.scale.setScalar(base * (1 + Math.sin(elapsed * 1.6 + marker.userData.phase) * 0.18));
    });

    renderer.render(scene, camera);
    if (running) animationFrame = window.requestAnimationFrame(render);
  }

  const start = () => {
    if (reducedMotion || running) return;
    running = true;
    lastFrame = performance.now();
    animationFrame = window.requestAnimationFrame(render);
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
  };

  manager.onLoad = () => {
    stage.classList.add("is-ready");
    if (!running) render();
  };

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("pointermove", updatePointer, { passive: true });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  stage.classList.add("is-webgl");
  updateScroll();
  resize();
  render();
  start();
};
