import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================================
// 1. CONFIGURATION & STATE
// ============================================================================
const PARTICLE_COUNT = 32000;

const PALETTES = {
  interstellar: {
    primary: new THREE.Color('#ff9d2e'),
    secondary: new THREE.Color('#00e5ff'),
    core: new THREE.Color('#fff3e0'),
    accent: '#00e5ff'
  },
  cyberpunk: {
    primary: new THREE.Color('#ff007f'),
    secondary: new THREE.Color('#00f0ff'),
    core: new THREE.Color('#ffccf9'),
    accent: '#ff007f'
  },
  matrix: {
    primary: new THREE.Color('#00ff88'),
    secondary: new THREE.Color('#0066ff'),
    core: new THREE.Color('#d0ffe8'),
    accent: '#00ff88'
  },
  supernova: {
    primary: new THREE.Color('#ff2a2a'),
    secondary: new THREE.Color('#ffcc00'),
    core: new THREE.Color('#ffffff'),
    accent: '#ff5500'
  },
  aurora: {
    primary: new THREE.Color('#a855f7'),
    secondary: new THREE.Color('#38bdf8'),
    core: new THREE.Color('#f3e8ff'),
    accent: '#a855f7'
  }
};

const MODE_INFO = {
  blackhole: {
    title: 'Hố Đen Siêu Khối Lượng Gargantua',
    desc: 'Mô phỏng đĩa bồi tụ phát sáng và tia bức xạ cực quanh chân trời sự kiện. Di chuột để bẻ cong quỹ đạo hạt hoặc nhấn Space để tạo vụ nổ Siêu Tân Tinh.',
    bodies: 3
  },
  quantum: {
    title: 'Lõi Lượng Tử & Hình Học Đa Chiều',
    desc: 'Cấu trúc nút thắt Torus Knot 4D kết hợp lồng đa diện đối xứng. Các hạt lượng tử chuyển động theo trường vector xoắn ốc và phản ứng tức thời với con trỏ 3D.',
    bodies: 5
  },
  solaris: {
    title: 'Hệ Hành Tinh & Hấp Dẫn Vũ Trụ',
    desc: 'Mô phỏng hệ sao trung tâm cùng 6 hành tinh có vành đai và mặt trăng. Nhấn Click Đúp hoặc nút "Phóng Sao Chổi" để bắn các thiên thể mới vào quỹ đạo!',
    bodies: 14
  },
  cyberwave: {
    title: 'Sóng Ngân Hà & Ma Trận Âm Thanh',
    desc: 'Bề mặt sóng giao thoa 3D thời gian thực kết hợp tinh thể năng lượng. Bật Âm Thanh (góc trên bên phải) để cảm nhận tần số âm nhạc điều khiển không gian.',
    bodies: 8
  }
};

const state = {
  mode: 'blackhole',
  forceType: 'vortex', // 'vortex' | 'attract' | 'repel'
  paletteKey: 'interstellar',
  speed: 1.0,
  bloomStrength: 1.4,
  forceRadius: 18.0,
  particleSize: 1.2,
  autoRotate: true,
  showGrid: true,
  audioEnabled: false,
  time: 0,
  supernovaBoost: 0
};

// ============================================================================
// 2. PROCEDURAL WEB AUDIO SYNTHESIZER (ZERO EXTERNAL ASSETS)
// ============================================================================
class CosmicAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.filter = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.001;
    this.masterGain.connect(this.ctx.destination);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 260;
    this.filter.Q.value = 4.0;
    this.filter.connect(this.masterGain);

    // Ambient Space Drone Oscillators
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc2.type = 'triangle';
    this.droneOsc1.frequency.value = 55; // A1
    this.droneOsc2.frequency.value = 82.41; // E2

    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.18;

    this.droneOsc1.connect(droneGain);
    this.droneOsc2.connect(droneGain);
    droneGain.connect(this.filter);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  toggle() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = !this.isPlaying;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(
      this.isPlaying ? 0.35 : 0.0001,
      now + 0.5
    );
    return this.isPlaying;
  }

  modulate(cursorSpeed, time) {
    if (!this.isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    const targetFreq = 180 + Math.min(cursorSpeed * 1200, 900) + Math.sin(time * 0.8) * 60;
    this.filter.frequency.setTargetAtTime(targetFreq, now, 0.1);
  }

  playChime(freqMultiplier = 1.0) {
    if (!this.isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    const scale = [220, 277.18, 329.63, 440, 554.37, 659.25, 880];
    const freq = scale[Math.floor(Math.random() * scale.length)] * freqMultiplier;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.45);
  }

  playSupernovaBoom() {
    if (!this.isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.8);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.95);
    this.playChime(0.5);
    setTimeout(() => this.playChime(1.5), 180);
  }
}

const audio = new CosmicAudioEngine();

// ============================================================================
// 3. THREE.JS SCENE, CAMERA, RENDERER & POST-PROCESSING
// ============================================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03050a, 0.0035);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 26, 58);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true // Enables screenshot capture
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 180;
controls.minDistance = 8;
controls.autoRotate = state.autoRotate;
controls.autoRotateSpeed = 0.65;

// Post-processing Composer (Unreal Bloom)
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  state.bloomStrength,
  0.55,
  0.12
);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ============================================================================
// 4. BACKGROUND STARFIELD & SPACETIME GRID
// ============================================================================
function createBackgroundStars() {
  const starCount = 4500;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 160 + Math.random() * 280;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);

    const tint = 0.7 + Math.random() * 0.3;
    colors[i * 3] = tint;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}

const bgStars = createBackgroundStars();

// Spacetime Polar Grid
const gridGroup = new THREE.Group();
const polarGrid = new THREE.PolarGridHelper(65, 16, 8, 64, 0x00e5ff, 0x1e293b);
polarGrid.material.transparent = true;
polarGrid.material.opacity = 0.16;
polarGrid.position.y = -14;
gridGroup.add(polarGrid);
scene.add(gridGroup);

// ============================================================================
// 5. GPU SHADER PARTICLE SYSTEM (32,000 INTERACTIVE PARTICLES)
// ============================================================================
const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
const velocities = new Float32Array(PARTICLE_COUNT * 3);
const colorMixAttr = new Float32Array(PARTICLE_COUNT);
const randomSeedAttr = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  colorMixAttr[i] = Math.random();
  randomSeedAttr[i] = 0.5 + Math.random() * 1.0;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeometry.setAttribute('aColorMix', new THREE.BufferAttribute(colorMixAttr, 1));
particleGeometry.setAttribute('aSeed', new THREE.BufferAttribute(randomSeedAttr, 1));

const particleUniforms = {
  uTime: { value: 0 },
  uSize: { value: state.particleSize * renderer.getPixelRatio() },
  uColorPrimary: { value: PALETTES.interstellar.primary.clone() },
  uColorSecondary: { value: PALETTES.interstellar.secondary.clone() },
  uColorCore: { value: PALETTES.interstellar.core.clone() },
  uSupernova: { value: 0.0 }
};

const particleMaterial = new THREE.ShaderMaterial({
  uniforms: particleUniforms,
  vertexShader: `
    attribute float aColorMix;
    attribute float aSeed;
    varying float vColorMix;
    varying float vDist;
    uniform float uTime;
    uniform float uSize;
    uniform float uSupernova;

    void main() {
      vColorMix = aColorMix;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float dist = length(position);
      vDist = dist;

      float pulse = 1.0 + 0.25 * sin(uTime * 3.0 + aSeed * 12.0) + uSupernova * 1.8;
      gl_PointSize = (uSize * aSeed * pulse * 140.0) / max(-mvPosition.z, 1.0);
      gl_PointSize = clamp(gl_PointSize, 1.2, 38.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vColorMix;
    varying float vDist;
    uniform vec3 uColorPrimary;
    uniform vec3 uColorSecondary;
    uniform vec3 uColorCore;
    uniform float uSupernova;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv);
      if (d > 0.5) discard;

      // Soft exponential glow falloff
      float strength = pow(1.0 - (d * 2.0), 2.2);

      vec3 baseColor = mix(uColorPrimary, uColorSecondary, vColorMix);
      float coreFactor = clamp(1.0 - (vDist / 16.0), 0.0, 1.0);
      vec3 finalColor = mix(baseColor, uColorCore, coreFactor * 0.65 + uSupernova * 0.5);

      gl_FragColor = vec4(finalColor, strength * 0.92);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);

// Compute Target Formations for Each Mode
function computeTargetsForMode(modeName) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const t = i / PARTICLE_COUNT;

    if (modeName === 'blackhole') {
      // 85% Accretion Disk, 15% Relativistic Polar Jets
      if (i < PARTICLE_COUNT * 0.85) {
        const radius = 5.5 + Math.pow(Math.random(), 1.5) * 42.0;
        const angle = i * 0.1375 + radius * 0.35;
        const thickness = (1.0 - Math.min(radius / 48.0, 0.9)) * 2.2 + 0.3;
        targetPositions[i3] = Math.cos(angle) * radius;
        targetPositions[i3 + 1] = (Math.random() - 0.5) * thickness * (radius < 9 ? 2.2 : 1.0);
        targetPositions[i3 + 2] = Math.sin(angle) * radius;
      } else {
        // Polar jets shooting up and down
        const side = i % 2 === 0 ? 1 : -1;
        const h = 4.5 + Math.random() * 44.0;
        const spread = (h * 0.08) * Math.sqrt(Math.random());
        const ang = Math.random() * Math.PI * 2;
        targetPositions[i3] = Math.cos(ang) * spread;
        targetPositions[i3 + 1] = side * h;
        targetPositions[i3 + 2] = Math.sin(ang) * spread;
      }
    } else if (modeName === 'quantum') {
      // 3D Torus Knot (p=3, q=5) + Inner Quantum Shell
      if (i < PARTICLE_COUNT * 0.78) {
        const u = t * Math.PI * 2 * 16;
        const p = 3;
        const q = 5;
        const r = 16 + 7 * Math.cos(q * u);
        const tubeSpread = (Math.random() - 0.5) * 3.2;
        targetPositions[i3] = r * Math.cos(p * u) + tubeSpread;
        targetPositions[i3 + 1] = r * Math.sin(p * u) + tubeSpread;
        targetPositions[i3 + 2] = 9 * Math.sin(q * u) + (Math.random() - 0.5) * 3.2;
      } else {
        // Fibonacci Sphere Core
        const phi = Math.acos(1 - 2 * ((i % 6000) / 6000));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const rad = 7.5 + (Math.random() - 0.5) * 1.5;
        targetPositions[i3] = rad * Math.sin(phi) * Math.cos(theta);
        targetPositions[i3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
        targetPositions[i3 + 2] = rad * Math.cos(phi);
      }
    } else if (modeName === 'solaris') {
      // Spiral Asteroid Belt + Kuiper Ring + Solar Corona
      if (i < PARTICLE_COUNT * 0.2) {
        // Dense solar corona
        const r = 4.8 + Math.random() * 3.0;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        targetPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
        targetPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        targetPositions[i3 + 2] = r * Math.cos(phi);
      } else {
        // Asteroid belts & planetary rings
        const ringBand = i % 3 === 0 ? 22 + Math.random() * 5 : 38 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        targetPositions[i3] = Math.cos(angle) * ringBand;
        targetPositions[i3 + 1] = (Math.random() - 0.5) * 1.6;
        targetPositions[i3 + 2] = Math.sin(angle) * ringBand;
      }
    } else if (modeName === 'cyberwave') {
      // 3D Harmonic Wave Matrix Grid
      const gridSize = Math.floor(Math.sqrt(PARTICLE_COUNT));
      const gx = (i % gridSize) - gridSize / 2;
      const gz = Math.floor(i / gridSize) - gridSize / 2;
      const spacing = 0.48;
      const x = gx * spacing;
      const z = gz * spacing;
      const d = Math.sqrt(x * x + z * z);
      const y = Math.sin(d * 0.35) * 4.5 * Math.exp(-d * 0.015);
      targetPositions[i3] = x;
      targetPositions[i3 + 1] = y - 3.0;
      targetPositions[i3 + 2] = z;
    }
  }
}

// Initialize particle positions
computeTargetsForMode(state.mode);
for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
  positions[i] = targetPositions[i] + (Math.random() - 0.5) * 15;
}

// ============================================================================
// 6. MODE-SPECIFIC 3D HERO OBJECTS (BLACK HOLE, QUANTUM CAGE, SOLAR SYSTEM, CYBER MONOLITHS)
// ============================================================================
const heroGroups = {
  blackhole: new THREE.Group(),
  quantum: new THREE.Group(),
  solaris: new THREE.Group(),
  cyberwave: new THREE.Group()
};

Object.values(heroGroups).forEach((g) => scene.add(g));

// --- 6A. BLACK HOLE HERO ---
const eventHorizon = new THREE.Mesh(
  new THREE.SphereGeometry(4.6, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
heroGroups.blackhole.add(eventHorizon);

const photonSphereMat = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: PALETTES.interstellar.primary }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    uniform vec3 uColor;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.2);
      gl_FragColor = vec4(uColor * 2.2, fresnel * 0.95);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  depthWrite: false
});

const photonSphere = new THREE.Mesh(new THREE.SphereGeometry(5.35, 64, 64), photonSphereMat);
heroGroups.blackhole.add(photonSphere);

const lensingRing = new THREE.Mesh(
  new THREE.TorusGeometry(5.6, 0.16, 32, 128),
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  })
);
lensingRing.rotation.x = Math.PI * 0.12;
heroGroups.blackhole.add(lensingRing);

// --- 6B. QUANTUM CORE HERO ---
const quantumCoreMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(3.8, 2),
  new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    wireframe: true,
    transparent: true,
    opacity: 0.55
  })
);
const quantumOuterCage = new THREE.Mesh(
  new THREE.IcosahedronGeometry(12.5, 1),
  new THREE.MeshBasicMaterial({
    color: 0xff9d2e,
    wireframe: true,
    transparent: true,
    opacity: 0.22
  })
);
heroGroups.quantum.add(quantumCoreMesh, quantumOuterCage);

// --- 6C. SOLARIS PLANETARY SYSTEM HERO ---
const solarStar = new THREE.Mesh(
  new THREE.SphereGeometry(4.5, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffaa33 })
);
const solarLight = new THREE.PointLight(0xffddaa, 3.5, 220, 0.5);
const ambientLight = new THREE.AmbientLight(0x223355, 1.4);
scene.add(ambientLight);
heroGroups.solaris.add(solarStar, solarLight);

const planets = [];
const planetConfigs = [
  { dist: 9.5, size: 0.65, speed: 1.5, color: 0x38bdf8, hasRing: false },
  { dist: 14.0, size: 1.05, speed: 1.05, color: 0xf97316, hasRing: false },
  { dist: 19.5, size: 1.35, speed: 0.78, color: 0x10b981, hasRing: false, hasMoon: true },
  { dist: 27.5, size: 2.1, speed: 0.52, color: 0xeab308, hasRing: true },
  { dist: 35.0, size: 1.6, speed: 0.36, color: 0xa855f7, hasRing: true },
  { dist: 44.0, size: 1.15, speed: 0.24, color: 0x06b6d4, hasRing: false }
];

planetConfigs.forEach((cfg, idx) => {
  // Orbit path line
  const orbitCurve = new THREE.EllipseCurve(0, 0, cfg.dist, cfg.dist, 0, Math.PI * 2, false, 0);
  const orbitPts = orbitCurve.getPoints(128);
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(
    orbitPts.map((p) => new THREE.Vector3(p.x, 0, p.y))
  );
  const orbitLine = new THREE.LineLoop(
    orbitGeo,
    new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.22 })
  );
  heroGroups.solaris.add(orbitLine);

  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.size, 32, 32),
    new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: 0.35,
      metalness: 0.2,
      emissive: cfg.color,
      emissiveIntensity: 0.35
    })
  );

  if (cfg.hasRing) {
    const ringGeo = new THREE.RingGeometry(cfg.size * 1.45, cfg.size * 2.4, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: cfg.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55
      })
    );
    ringMesh.rotation.z = 0.35;
    mesh.add(ringMesh);
  }

  let moonPivot = null;
  if (cfg.hasMoon) {
    moonPivot = new THREE.Group();
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
    );
    moonMesh.position.set(2.4, 0.3, 0);
    moonPivot.add(moonMesh);
    mesh.add(moonPivot);
  }

  pivot.add(mesh);
  heroGroups.solaris.add(pivot);
  planets.push({
    pivot,
    mesh,
    moonPivot,
    dist: cfg.dist,
    speed: cfg.speed,
    angle: idx * 1.1
  });
});

// --- 6D. CYBERWAVE MONOLITHS HERO ---
const cyberMonoliths = [];
for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2;
  const radius = 16;
  const mono = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.8, 0),
    new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.7
    })
  );
  mono.position.set(Math.cos(angle) * radius, 4, Math.sin(angle) * radius);
  heroGroups.cyberwave.add(mono);
  cyberMonoliths.push({ mesh: mono, baseAngle: angle });
}

function updateHeroVisibility() {
  Object.keys(heroGroups).forEach((k) => {
    heroGroups[k].visible = k === state.mode;
  });
}
updateHeroVisibility();

// ============================================================================
// 7. INTERACTIVE COMETS / METEORS & SHOCKWAVE RINGS
// ============================================================================
const comets = [];
const shockwaves = [];

function spawnComet(originPoint = null) {
  const startPos = originPoint
    ? originPoint.clone()
    : new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        15 + Math.random() * 20,
        (Math.random() - 0.5) * 60
      );

  // Tangential orbital velocity around center
  const toCenter = startPos.clone().negate().normalize();
  const tangent = new THREE.Vector3(-toCenter.z, (Math.random() - 0.5) * 0.3, toCenter.x).normalize();
  const speed = 0.55 + Math.random() * 0.35;
  const velocity = tangent.multiplyScalar(speed).add(toCenter.multiplyScalar(0.12));

  const palette = PALETTES[state.paletteKey];
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.65, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  headMesh.position.copy(startPos);
  scene.add(headMesh);

  // Trail line
  const trailLength = 45;
  const trailPositions = new Float32Array(trailLength * 3);
  for (let i = 0; i < trailLength; i++) {
    trailPositions[i * 3] = startPos.x;
    trailPositions[i * 3 + 1] = startPos.y;
    trailPositions[i * 3 + 2] = startPos.z;
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trailMat = new THREE.LineBasicMaterial({
    color: palette.secondary,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const trailLine = new THREE.Line(trailGeo, trailMat);
  scene.add(trailLine);

  comets.push({
    mesh: headMesh,
    trail: trailLine,
    pos: startPos,
    vel: velocity,
    life: 420
  });

  audio.playChime(1.25);
  updateTelemetryCount();
}

function triggerShockwave(centerPos = new THREE.Vector3(0, 0, 0), isSupernova = false) {
  const palette = PALETTES[state.paletteKey];
  const ringGeo = new THREE.RingGeometry(0.8, isSupernova ? 2.4 : 1.4, 64);
  ringGeo.rotateX(Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: isSupernova ? palette.primary : palette.secondary,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.copy(centerPos);
  scene.add(ringMesh);

  shockwaves.push({
    mesh: ringMesh,
    scale: 1,
    speed: isSupernova ? 1.65 : 0.85,
    opacity: 0.95
  });
}

function triggerSupernova() {
  state.supernovaBoost = 1.6;
  triggerShockwave(new THREE.Vector3(0, 0, 0), true);
  audio.playSupernovaBoom();

  // Apply radial explosive impulse to all 32,000 particles
  const posAttr = particleGeometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const x = posAttr[i3];
    const y = posAttr[i3 + 1];
    const z = posAttr[i3 + 2];
    const len = Math.sqrt(x * x + y * y + z * z) + 0.001;
    const force = (18.0 + Math.random() * 22.0) / Math.max(len * 0.15, 1.0);
    velocities[i3] += (x / len) * force;
    velocities[i3 + 1] += (y / len) * force;
    velocities[i3 + 2] += (z / len) * force;
  }

  showToast('💥 Vụ nổ Siêu Tân Tinh đã giải phóng sóng xung kích lượng tử!');
}

// ============================================================================
// 8. 3D RAYCASTER & INTERACTIVE MOUSE FORCE FIELD
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(9999, 9999);
const cursor3D = new THREE.Vector3(0, 0, 0);
const prevCursor3D = new THREE.Vector3(0, 0, 0);
let isPointerActive = false;

const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Subtle 3D Cursor Energy Orb
const cursorOrb = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 24, 24),
  new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending
  })
);
scene.add(cursorOrb);

window.addEventListener('pointermove', (e) => {
  if (e.target.closest('.hud-top, .hud-panel, .restore-hud-btn')) {
    isPointerActive = false;
    cursorOrb.visible = false;
    return;
  }

  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Tilt interaction plane slightly towards camera for natural 3D feel
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  interactionPlane.normal.copy(camDir).negate().lerp(new THREE.Vector3(0, 1, 0), 0.65).normalize();

  raycaster.setFromCamera(mouseNDC, camera);
  prevCursor3D.copy(cursor3D);
  if (raycaster.ray.intersectPlane(interactionPlane, cursor3D)) {
    isPointerActive = true;
    cursorOrb.visible = true;
    cursorOrb.position.copy(cursor3D);
  }
});

// Double-click in 3D space to spawn a comet + shockwave
window.addEventListener('dblclick', (e) => {
  if (e.target.closest('.hud-top, .hud-panel, .restore-hud-btn')) return;
  if (isPointerActive) {
    spawnComet(cursor3D);
    triggerShockwave(cursor3D, false);
    showToast('☄️ Đã phóng Sao Chổi vào trường hấp dẫn 3D!');
  }
});

// ============================================================================
// 9. UI BINDINGS & TELEMETRY
// ============================================================================
const fpsEl = document.getElementById('stat-fps');
const forceEl = document.getElementById('stat-force');
const bodiesEl = document.getElementById('stat-bodies');
const modeTitleEl = document.getElementById('mode-title');
const modeDescEl = document.getElementById('mode-desc');
const toastEl = document.getElementById('toast-message');

let toastTimeout = null;
function showToast(htmlText) {
  toastEl.innerHTML = htmlText;
  toastEl.style.borderColor = 'rgba(0, 229, 255, 0.65)';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.style.borderColor = 'rgba(120, 210, 255, 0.18)';
  }, 1500);
}

function updateTelemetryCount() {
  const baseBodies = MODE_INFO[state.mode].bodies;
  bodiesEl.textContent = String(baseBodies + comets.length);
}

// Mode switcher buttons
document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    state.mode = btn.dataset.mode;
    computeTargetsForMode(state.mode);
    updateHeroVisibility();

    const info = MODE_INFO[state.mode];
    modeTitleEl.textContent = info.title;
    modeDescEl.textContent = info.desc;
    updateTelemetryCount();
    triggerShockwave(new THREE.Vector3(0, 0, 0), false);
    audio.playChime(1.0);
    showToast(`🌌 Đã chuyển sang chế độ: <strong>${info.title}</strong>`);
  });
});

// Force Mode Selector
const forceLabels = {
  vortex: 'XOÁY HÚT',
  attract: 'HẤP DẪN',
  repel: 'ĐẨY LƯỢNG TỬ'
};
document.querySelectorAll('#force-selector .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#force-selector .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.forceType = btn.dataset.force;
    forceEl.textContent = forceLabels[state.forceType];
    audio.playChime(1.1);
  });
});

// Color Palette Selector
document.querySelectorAll('#palette-selector .palette-swatch').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('#palette-selector .palette-swatch').forEach((s) => s.classList.remove('active'));
    swatch.classList.add('active');

    state.paletteKey = swatch.dataset.palette;
    const pal = PALETTES[state.paletteKey];
    particleUniforms.uColorPrimary.value.copy(pal.primary);
    particleUniforms.uColorSecondary.value.copy(pal.secondary);
    particleUniforms.uColorCore.value.copy(pal.core);
    photonSphereMat.uniforms.uColor.value.copy(pal.primary);
    cursorOrb.material.color.copy(pal.secondary);
    document.documentElement.style.setProperty('--accent-primary', pal.accent);
    audio.playChime(1.3);
  });
});

// Sliders
const sliderSpeed = document.getElementById('slider-speed');
const valSpeed = document.getElementById('val-speed');
sliderSpeed.addEventListener('input', (e) => {
  state.speed = parseFloat(e.target.value);
  valSpeed.textContent = `${state.speed.toFixed(2)}x`;
});

const sliderBloom = document.getElementById('slider-bloom');
const valBloom = document.getElementById('val-bloom');
sliderBloom.addEventListener('input', (e) => {
  state.bloomStrength = parseFloat(e.target.value);
  bloomPass.strength = state.bloomStrength;
  valBloom.textContent = state.bloomStrength.toFixed(2);
});

const sliderRadius = document.getElementById('slider-radius');
const valRadius = document.getElementById('val-radius');
sliderRadius.addEventListener('input', (e) => {
  state.forceRadius = parseFloat(e.target.value);
  valRadius.textContent = String(state.forceRadius);
});

const sliderSize = document.getElementById('slider-size');
const valSize = document.getElementById('val-size');
sliderSize.addEventListener('input', (e) => {
  state.particleSize = parseFloat(e.target.value);
  particleUniforms.uSize.value = state.particleSize * renderer.getPixelRatio();
  valSize.textContent = state.particleSize.toFixed(1);
});

// Toggles
document.getElementById('toggle-autorotate').addEventListener('change', (e) => {
  state.autoRotate = e.target.checked;
  controls.autoRotate = state.autoRotate;
});

document.getElementById('toggle-grid').addEventListener('change', (e) => {
  state.showGrid = e.target.checked;
  gridGroup.visible = state.showGrid;
});

// Buttons
document.getElementById('btn-supernova').addEventListener('click', triggerSupernova);
document.getElementById('btn-spawn-comet').addEventListener('click', () => {
  spawnComet();
  showToast('☄️ Sao Chổi mới đã gia nhập quỹ đạo!');
});
document.getElementById('btn-reset-cam').addEventListener('click', () => {
  camera.position.set(0, 26, 58);
  controls.target.set(0, 0, 0);
  controls.update();
});

// Audio Button
const btnAudio = document.getElementById('btn-audio');
const audioIcon = document.getElementById('audio-icon');
btnAudio.addEventListener('click', () => {
  const active = audio.toggle();
  btnAudio.classList.toggle('active-audio', active);
  audioIcon.textContent = active ? '🔊' : '🔇';
  btnAudio.querySelector('.btn-label').textContent = active ? 'Âm Thanh: BẬT' : 'Âm Thanh: TẮT';
  if (active) {
    audio.playChime(1.0);
    showToast('🎵 Đã kích hoạt Bộ Tổng Hợp Âm Thanh Vũ Trụ (Web Audio Synth)!');
  }
});

// Screenshot Button
document.getElementById('btn-photo').addEventListener('click', () => {
  composer.render();
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `nebula-forge-3d-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
  showToast('📸 Đã tải xuống ảnh chụp không gian 3D!');
});

// Toggle HUD Visibility
const btnRestoreHud = document.getElementById('btn-restore-hud');
function toggleHUD() {
  const hidden = document.body.classList.toggle('hud-hidden');
  btnRestoreHud.classList.toggle('hidden', !hidden);
}
document.getElementById('btn-hud').addEventListener('click', toggleHUD);
btnRestoreHud.addEventListener('click', toggleHUD);

// Fullscreen
document.getElementById('btn-fullscreen').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    triggerSupernova();
  } else if (e.key === 'h' || e.key === 'H') {
    toggleHUD();
  } else if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
});

// Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// 10. MAIN ANIMATION & PHYSICS LOOP
// ============================================================================
let lastTime = performance.now();
let frames = 0;
let fpsTimer = performance.now();

// Spawn 2 initial comets for immediate dynamic motion
spawnComet(new THREE.Vector3(24, 6, -12));
spawnComet(new THREE.Vector3(-28, -5, 16));

// Hide loader smoothly
const loaderBar = document.getElementById('loader-bar');
loaderBar.style.width = '100%';
setTimeout(() => {
  document.getElementById('loader').classList.add('fade-out');
}, 650);

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  // FPS Counter
  frames++;
  if (now - fpsTimer >= 500) {
    const fps = Math.round((frames * 1000) / (now - fpsTimer));
    fpsEl.textContent = String(Math.min(fps, 144));
    frames = 0;
    fpsTimer = now;
  }

  state.time += dt * state.speed;
  particleUniforms.uTime.value = state.time;

  // Decay supernova boost
  if (state.supernovaBoost > 0.001) {
    state.supernovaBoost *= 0.92;
    particleUniforms.uSupernova.value = state.supernovaBoost;
    bloomPass.strength = state.bloomStrength + state.supernovaBoost * 1.1;
  } else {
    state.supernovaBoost = 0;
    particleUniforms.uSupernova.value = 0;
  }

  // Modulate Web Audio synth with cursor speed
  const cursorMoveDist = cursor3D.distanceTo(prevCursor3D);
  audio.modulate(cursorMoveDist, state.time);

  // Rotate background stars slowly
  bgStars.rotation.y += dt * 0.02;

  // Animate Mode Hero Meshes
  if (state.mode === 'blackhole') {
    lensingRing.rotation.z += dt * 0.8 * state.speed;
    photonSphere.scale.setScalar(1.0 + Math.sin(state.time * 3.0) * 0.025);
  } else if (state.mode === 'quantum') {
    quantumCoreMesh.rotation.x += dt * 0.7 * state.speed;
    quantumCoreMesh.rotation.y += dt * 0.9 * state.speed;
    quantumOuterCage.rotation.y -= dt * 0.25 * state.speed;
    quantumOuterCage.rotation.z += dt * 0.18 * state.speed;
  } else if (state.mode === 'solaris') {
    solarStar.scale.setScalar(1.0 + Math.sin(state.time * 4.0) * 0.04);
    planets.forEach((p) => {
      p.angle += dt * p.speed * 0.45 * state.speed;
      p.mesh.position.set(Math.cos(p.angle) * p.dist, 0, Math.sin(p.angle) * p.dist);
      p.mesh.rotation.y += dt * 1.5;
      if (p.moonPivot) {
        p.moonPivot.rotation.y += dt * 2.6 * state.speed;
      }
    });
  } else if (state.mode === 'cyberwave') {
    cyberMonoliths.forEach((m, idx) => {
      const a = m.baseAngle + state.time * 0.25;
      m.mesh.position.x = Math.cos(a) * 18;
      m.mesh.position.z = Math.sin(a) * 18;
      m.mesh.position.y = 4.5 + Math.sin(state.time * 2.2 + idx) * 2.5;
      m.mesh.rotation.y += dt * 1.2;
      m.mesh.rotation.x += dt * 0.6;
    });
  }

  // Update Comets & Orbital Gravity
  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i];
    const distSq = Math.max(c.pos.lengthSq(), 12.0);
    const accel = c.pos.clone().negate().normalize().multiplyScalar(14.0 / distSq);
    c.vel.add(accel.multiplyScalar(dt * 12 * state.speed));
    c.pos.addScaledVector(c.vel, state.speed);
    c.mesh.position.copy(c.pos);

    // Shift trail vertices
    const tArr = c.trail.geometry.attributes.position.array;
    for (let j = tArr.length - 3; j >= 3; j -= 3) {
      tArr[j] = tArr[j - 3];
      tArr[j + 1] = tArr[j - 2];
      tArr[j + 2] = tArr[j - 1];
    }
    tArr[0] = c.pos.x;
    tArr[1] = c.pos.y;
    tArr[2] = c.pos.z;
    c.trail.geometry.attributes.position.needsUpdate = true;

    c.life--;
    if (c.life <= 0 || c.pos.length() > 160) {
      scene.remove(c.mesh);
      scene.remove(c.trail);
      comets.splice(i, 1);
      updateTelemetryCount();
    }
  }

  // Update Shockwave Rings
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.scale += sw.speed;
    sw.opacity *= 0.93;
    sw.mesh.scale.setScalar(sw.scale);
    sw.mesh.material.opacity = sw.opacity;
    if (sw.opacity < 0.02) {
      scene.remove(sw.mesh);
      shockwaves.splice(i, 1);
    }
  }

  // Update 32,000 Interactive Particles
  const posAttr = particleGeometry.attributes.position.array;
  const radiusSq = state.forceRadius * state.forceRadius;
  const cx = cursor3D.x;
  const cy = cursor3D.y;
  const cz = cursor3D.z;
  const swirlAngle = dt * 0.42 * state.speed;
  const cosA = Math.cos(swirlAngle);
  const sinA = Math.sin(swirlAngle);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    // Rotate target positions slightly for orbital flow
    if (state.mode === 'blackhole' || state.mode === 'solaris') {
      const tx = targetPositions[i3];
      const tz = targetPositions[i3 + 2];
      targetPositions[i3] = tx * cosA - tz * sinA;
      targetPositions[i3 + 2] = tx * sinA + tz * cosA;
    } else if (state.mode === 'cyberwave') {
      const tx = targetPositions[i3];
      const tz = targetPositions[i3 + 2];
      const d = Math.sqrt(tx * tx + tz * tz);
      targetPositions[i3 + 1] =
        Math.sin(d * 0.35 - state.time * 2.6) * 4.2 * Math.exp(-d * 0.015) - 3.0;
    }

    let px = posAttr[i3];
    let py = posAttr[i3 + 1];
    let pz = posAttr[i3 + 2];

    let vx = velocities[i3];
    let vy = velocities[i3 + 1];
    let vz = velocities[i3 + 2];

    // Spring force toward target formation
    vx += (targetPositions[i3] - px) * 0.045;
    vy += (targetPositions[i3 + 1] - py) * 0.045;
    vz += (targetPositions[i3 + 2] - pz) * 0.045;

    // Interactive 3D Mouse Force Field
    if (isPointerActive) {
      const dx = px - cx;
      const dy = py - cy;
      const dz = pz - cz;
      const dSq = dx * dx + dy * dy + dz * dz;

      if (dSq < radiusSq && dSq > 0.001) {
        const d = Math.sqrt(dSq);
        const factor = (1.0 - d / state.forceRadius) * 0.55;

        if (state.forceType === 'repel') {
          vx += (dx / d) * factor * 2.2;
          vy += (dy / d) * factor * 2.2;
          vz += (dz / d) * factor * 2.2;
        } else if (state.forceType === 'attract') {
          vx -= (dx / d) * factor * 1.8;
          vy -= (dy / d) * factor * 1.8;
          vz -= (dz / d) * factor * 1.8;
        } else {
          // Vortex swirl + gentle pull
          vx += (-dz / d - (dx / d) * 0.35) * factor * 2.0;
          vy += Math.sin(d * 0.5 + state.time * 4.0) * factor * 0.6;
          vz += (dx / d - (dz / d) * 0.35) * factor * 2.0;
        }
      }
    }

    // Damping
    vx *= 0.86;
    vy *= 0.86;
    vz *= 0.86;

    posAttr[i3] = px + vx;
    posAttr[i3 + 1] = py + vy;
    posAttr[i3 + 2] = pz + vz;

    velocities[i3] = vx;
    velocities[i3 + 1] = vy;
    velocities[i3 + 2] = vz;
  }

  particleGeometry.attributes.position.needsUpdate = true;

  controls.update();
  composer.render();
}

requestAnimationFrame(animate);
