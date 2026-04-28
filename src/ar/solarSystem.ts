/**
 * Solar System Builder
 * 
 * File ini bertanggung jawab untuk:
 * 1. Memuat A-Frame dan AR.js secara dinamis
 * 2. Membangun hierarki entity tata surya di atas marker
 * 3. Mengelola state orbit (pause/play)
 * 4. Mengelola zoom dan highlight planet
 * 5. Melaporkan progress loading ke UI
 * 6. Menghentikan camera stream saat destroy
 * 
 * Hierarki Entity:
 *   a-scene
 *     a-marker (hiro)
 *       solar-system-root (entity dengan scale)
 *         sun (sphere)
 *         orbit-group-mercury (entity)
 *           orbit-path (ring)
 *           orbit-pivot (entity dengan orbit-rotation)
 *             planet-sphere (sphere dengan self-rotation)
 *         orbit-group-venus ...
 *         ... dst
 *     a-camera
 */

import { planets, sunData, type Planet } from '../data/planets';
import { registerAllComponents } from './aframeComponents';

declare const AFRAME: any;

// ===== Type untuk progress callback =====
export type ProgressCallback = (step: string) => void;

// ===== State =====
let isPaused = false;
let currentScale = 1;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.3;
const DEFAULT_SCALE = 1;

// References
let solarSystemRoot: HTMLElement | null = null;
let sceneEl: HTMLElement | null = null;
let highlightedPlanetId: string | null = null;

/**
 * Inisialisasi scene AR
 * Memuat A-Frame dan AR.js secara dinamis, lalu membangun scene.
 * Menerima progress callback untuk melaporkan status loading.
 */
export async function initARScene(onProgress?: ProgressCallback): Promise<void> {
  // Load A-Frame
  await loadScript('https://aframe.io/releases/1.6.0/aframe.min.js');
  onProgress?.('aframe-loaded');

  // Load AR.js
  await loadScript('https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js');
  onProgress?.('arjs-loaded');

  // Register custom components setelah A-Frame tersedia
  registerAllComponents();

  // Build the scene
  buildScene(onProgress);
}

/**
 * Load script secara dinamis dan menunggu sampai selesai.
 * Cek apakah script sudah pernah diload agar tidak duplikat.
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Gagal memuat library: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Bangun keseluruhan scene A-Frame
 */
function buildScene(onProgress?: ProgressCallback): void {
  const container = document.getElementById('ar-scene-container');
  if (!container) return;

  // Bersihkan container jika ada scene sebelumnya
  container.innerHTML = '';

  // Buat elemen scene
  sceneEl = document.createElement('a-scene');
  sceneEl.setAttribute('embedded', '');
  sceneEl.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;');
  sceneEl.setAttribute('renderer', 'logarithmicDepthBuffer: true; precision: medium;');
  sceneEl.setAttribute('vr-mode-ui', 'enabled: false');

  // Buat marker
  const marker = document.createElement('a-marker');
  marker.setAttribute('preset', 'hiro');
  marker.setAttribute('smooth', 'true');
  marker.setAttribute('smoothCount', '5');
  marker.setAttribute('smoothTolerance', '0.01');
  marker.setAttribute('smoothThreshold', '2');

  // Solar system root (untuk zoom/scale)
  solarSystemRoot = document.createElement('a-entity');
  solarSystemRoot.setAttribute('id', 'solar-system-root');
  solarSystemRoot.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
  solarSystemRoot.setAttribute('position', '0 0 0');

  // Bangun matahari
  buildSun(solarSystemRoot);

  // Bangun setiap planet
  planets.forEach((planet) => {
    buildPlanetGroup(solarSystemRoot!, planet);
  });

  marker.appendChild(solarSystemRoot);
  sceneEl.appendChild(marker);

  // Camera entity untuk AR.js
  const camera = document.createElement('a-entity');
  camera.setAttribute('camera', '');
  sceneEl.appendChild(camera);

  container.appendChild(sceneEl);

  // Event: scene loaded → report scene-ready
  // Ini berarti A-Frame scene dan AR.js webcam sudah aktif
  sceneEl.addEventListener('loaded', () => {
    setTimeout(() => {
      onProgress?.('scene-ready');
    }, 800);
  });
}

/**
 * Bangun entity Matahari
 */
function buildSun(parent: HTMLElement): void {
  const sun = document.createElement('a-sphere');
  sun.setAttribute('id', 'planet-sun');
  sun.setAttribute('radius', String(sunData.radius));
  sun.setAttribute('color', sunData.color);
  sun.setAttribute('position', '0 0 0');
  sun.setAttribute('self-rotation', `speed: 10; paused: ${isPaused}`);

  // Coba load texture, fallback ke warna jika gagal
  sun.setAttribute('material', `color: ${sunData.color}; shader: flat;`);
  tryLoadTexture(sun, sunData.texturePath, sunData.color, true);

  // Light dari matahari
  const light = document.createElement('a-light');
  light.setAttribute('type', 'point');
  light.setAttribute('intensity', '0.8');
  light.setAttribute('distance', '10');
  light.setAttribute('color', '#FFF8E7');
  sun.appendChild(light);

  parent.appendChild(sun);
}

/**
 * Bangun group orbit untuk satu planet:
 * - Orbit path (ring visual)
 * - Orbit pivot (entity yang berputar)
 *   - Planet sphere (di ujung orbit radius)
 */
function buildPlanetGroup(parent: HTMLElement, planet: Planet): void {
  const group = document.createElement('a-entity');
  group.setAttribute('id', `orbit-group-${planet.id}`);

  // Orbit path — ring tipis sebagai visualisasi orbit
  const orbitPath = document.createElement('a-ring');
  orbitPath.setAttribute('radius-inner', String(planet.orbitRadius - 0.005));
  orbitPath.setAttribute('radius-outer', String(planet.orbitRadius + 0.005));
  orbitPath.setAttribute('color', '#FFFFFF');
  orbitPath.setAttribute('opacity', '0.15');
  orbitPath.setAttribute('rotation', '-90 0 0');
  orbitPath.setAttribute('segments-theta', '64');
  orbitPath.setAttribute('material', 'side: double; transparent: true;');
  group.appendChild(orbitPath);

  // Orbit pivot — entity yang berotasi di sumbu Y
  const pivot = document.createElement('a-entity');
  pivot.setAttribute('id', `orbit-pivot-${planet.id}`);
  pivot.setAttribute('orbit-rotation', `speed: ${planet.orbitSpeed * 40}; paused: ${isPaused}`);

  // Planet sphere — diposisikan di orbit radius
  const sphere = document.createElement('a-sphere');
  sphere.setAttribute('id', `planet-${planet.id}`);
  sphere.setAttribute('class', 'planet-entity');
  sphere.setAttribute('radius', String(planet.radius));
  sphere.setAttribute('position', `${planet.orbitRadius} 0 0`);
  sphere.setAttribute('color', planet.color);
  sphere.setAttribute('self-rotation', `speed: ${planet.rotationSpeed * 50}; paused: ${isPaused}`);

  // Coba load texture
  tryLoadTexture(sphere, planet.texturePath, planet.color, false);

  pivot.appendChild(sphere);

  // Tambahkan ring untuk Saturnus
  if (planet.id === 'saturn') {
    const ring = document.createElement('a-ring');
    ring.setAttribute('radius-inner', String(planet.radius * 1.3));
    ring.setAttribute('radius-outer', String(planet.radius * 2.2));
    ring.setAttribute('color', '#E8D191');
    ring.setAttribute('opacity', '0.7');
    ring.setAttribute('rotation', '-75 0 0');
    ring.setAttribute('position', `${planet.orbitRadius} 0 0`);
    ring.setAttribute('segments-theta', '64');
    ring.setAttribute('material', 'side: double; transparent: true;');

    // Coba load ring texture
    tryLoadRingTexture(ring);

    pivot.appendChild(ring);
  }

  group.appendChild(pivot);
  parent.appendChild(group);
}

/**
 * Coba load texture. Jika gagal, gunakan warna fallback.
 */
function tryLoadTexture(el: HTMLElement, path: string, fallbackColor: string, isFlat: boolean): void {
  const img = new Image();
  img.onload = () => {
    if (isFlat) {
      el.setAttribute('material', `src: url(${path}); shader: flat;`);
    } else {
      el.setAttribute('material', `src: url(${path});`);
    }
  };
  img.onerror = () => {
    // Tetap gunakan warna fallback (sudah di-set sebelumnya)
    console.warn(`Texture not found: ${path}, using fallback color: ${fallbackColor}`);
  };
  img.src = path;
}

/**
 * Coba load texture ring Saturnus
 */
function tryLoadRingTexture(el: HTMLElement): void {
  const img = new Image();
  img.onload = () => {
    el.setAttribute('material', 'src: url(textures/saturn-ring.png); side: double; transparent: true;');
  };
  img.onerror = () => {
    // Tetap pakai warna default
  };
  img.src = 'textures/saturn-ring.png';
}

// ===== Public Controls =====

/**
 * Toggle pause/play orbit dan rotasi
 */
export function togglePause(): boolean {
  isPaused = !isPaused;
  updatePauseState();
  return isPaused;
}

/**
 * Update semua component orbit-rotation dan self-rotation
 */
function updatePauseState(): void {
  if (!sceneEl) return;

  const orbitEls = sceneEl.querySelectorAll('[orbit-rotation]');
  orbitEls.forEach((el: any) => {
    el.setAttribute('orbit-rotation', 'paused', isPaused);
  });

  const rotEls = sceneEl.querySelectorAll('[self-rotation]');
  rotEls.forEach((el: any) => {
    el.setAttribute('self-rotation', 'paused', isPaused);
  });
}

/**
 * Zoom in tata surya
 */
export function zoomIn(): number {
  currentScale = Math.min(currentScale + SCALE_STEP, MAX_SCALE);
  applyScale();
  return currentScale;
}

/**
 * Zoom out tata surya
 */
export function zoomOut(): number {
  currentScale = Math.max(currentScale - SCALE_STEP, MIN_SCALE);
  applyScale();
  return currentScale;
}

/**
 * Reset zoom ke default
 */
export function resetView(): void {
  currentScale = DEFAULT_SCALE;
  isPaused = false;
  highlightedPlanetId = null;
  applyScale();
  updatePauseState();
  clearHighlight();
}

/**
 * Apply scale ke solar system root
 */
function applyScale(): void {
  if (solarSystemRoot) {
    solarSystemRoot.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
  }
}

/**
 * Highlight planet tertentu (beri emissive glow)
 */
export function highlightPlanet(planetId: string): void {
  if (!sceneEl) return;

  // Clear previous highlight
  clearHighlight();

  highlightedPlanetId = planetId;

  // Highlight planet yang dipilih
  const planetEl = sceneEl.querySelector(`#planet-${planetId}`) as any;
  if (planetEl) {
    planetEl.setAttribute('material', 'emissive', '#6366f1');
    planetEl.setAttribute('material', 'emissiveIntensity', '0.4');
  }

  // Highlight orbit path
  const orbitGroup = sceneEl.querySelector(`#orbit-group-${planetId}`);
  if (orbitGroup) {
    const ring = orbitGroup.querySelector('a-ring');
    if (ring) {
      ring.setAttribute('opacity', '0.5');
      ring.setAttribute('color', '#818cf8');
    }
  }
}

/**
 * Clear semua highlight
 */
function clearHighlight(): void {
  if (!sceneEl) return;

  // Reset all planet materials
  const planetEls = sceneEl.querySelectorAll('.planet-entity') as NodeListOf<any>;
  planetEls.forEach((el: any) => {
    el.setAttribute('material', 'emissive', '#000');
    el.setAttribute('material', 'emissiveIntensity', '0');
  });

  // Reset orbit paths
  const orbitRings = sceneEl.querySelectorAll('a-ring[opacity]');
  orbitRings.forEach((ring) => {
    const radiusInner = parseFloat(ring.getAttribute('radius-inner') || '0');
    // Skip saturn ring (has different radius pattern)
    if (radiusInner > 0.1) return;
    ring.setAttribute('opacity', '0.15');
    ring.setAttribute('color', '#FFFFFF');
  });

  highlightedPlanetId = null;
}

/**
 * Destroy scene — dipanggil saat user kembali ke landing page.
 * Juga menghentikan semua active camera streams.
 */
export function destroyScene(): void {
  // Hentikan semua video/camera streams
  try {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      const stream = (video as HTMLVideoElement).srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        (video as HTMLVideoElement).srcObject = null;
      }
    });
  } catch (e) {
    console.warn('Error stopping camera streams:', e);
  }

  // Dispose A-Frame scene
  if (sceneEl && sceneEl.parentNode) {
    try {
      (sceneEl as any).renderer?.dispose?.();
    } catch (e) {
      // ignore
    }
    sceneEl.parentNode.removeChild(sceneEl);
  }

  sceneEl = null;
  solarSystemRoot = null;
  isPaused = false;
  currentScale = DEFAULT_SCALE;
  highlightedPlanetId = null;
}
