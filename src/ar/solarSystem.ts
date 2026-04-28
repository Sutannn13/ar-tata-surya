/**
 * Solar System Builder v2
 * 
 * Fitur baru:
 * - Ambient + directional light agar planet terang
 * - Semua planet shader:flat agar cerah di AR
 * - Default scale ~0.5 dan posisi Y terangkat
 * - Drag/pan gesture untuk geser tata surya
 * - Tap/click planet 3D via raycaster
 * - Smooth focus/zoom ke planet terpilih
 * - Camera stream cleanup saat destroy
 */

import { planets, sunData, type Planet } from '../data/planets';
import { registerAllComponents } from './aframeComponents';

declare const AFRAME: any;

export type ProgressCallback = (step: string) => void;

// Callback ketika planet di-tap di scene 3D
export type PlanetTapCallback = (planetId: string) => void;
let onPlanetTap: PlanetTapCallback | null = null;

// ===== Constants =====
const DEFAULT_SCALE = 0.5;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.15;
const DEFAULT_POS_Y = 0.25;
const FOCUS_SCALE_MULTIPLIER = 1.4; // scale naik 40% saat focus

// ===== State =====
let isPaused = false;
let currentScale = DEFAULT_SCALE;
let offsetX = 0;
let offsetY = DEFAULT_POS_Y;
let offsetZ = 0;
let focusedPlanetId: string | null = null;

// References
let solarSystemRoot: HTMLElement | null = null;
let sceneEl: HTMLElement | null = null;
let highlightedPlanetId: string | null = null;

// Drag state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetZ = 0;

/**
 * Register planet tap callback
 */
export function onPlanetTapEvent(cb: PlanetTapCallback): void {
  onPlanetTap = cb;
}

/**
 * Inisialisasi scene AR
 */
export async function initARScene(onProgress?: ProgressCallback): Promise<void> {
  await loadScript('https://aframe.io/releases/1.6.0/aframe.min.js');
  onProgress?.('aframe-loaded');

  await loadScript('https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js');
  onProgress?.('arjs-loaded');

  registerAllComponents();
  buildScene(onProgress);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Gagal memuat library: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Build A-Frame scene
 */
function buildScene(onProgress?: ProgressCallback): void {
  const container = document.getElementById('ar-scene-container');
  if (!container) return;
  container.innerHTML = '';

  // Scene
  sceneEl = document.createElement('a-scene');
  sceneEl.setAttribute('embedded', '');
  sceneEl.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;');
  sceneEl.setAttribute('renderer', 'logarithmicDepthBuffer: true; precision: medium;');
  sceneEl.setAttribute('vr-mode-ui', 'enabled: false');

  // Marker
  const marker = document.createElement('a-marker');
  marker.setAttribute('preset', 'hiro');
  marker.setAttribute('smooth', 'true');
  marker.setAttribute('smoothCount', '5');
  marker.setAttribute('smoothTolerance', '0.01');
  marker.setAttribute('smoothThreshold', '2');

  // ===== Lighting =====
  // Ambient light — terang merata
  const ambientLight = document.createElement('a-light');
  ambientLight.setAttribute('type', 'ambient');
  ambientLight.setAttribute('color', '#FFF');
  ambientLight.setAttribute('intensity', '1.5');
  marker.appendChild(ambientLight);

  // Directional light — beri dimensi
  const dirLight = document.createElement('a-light');
  dirLight.setAttribute('type', 'directional');
  dirLight.setAttribute('color', '#FFF8E7');
  dirLight.setAttribute('intensity', '0.6');
  dirLight.setAttribute('position', '1 2 1');
  marker.appendChild(dirLight);

  // Solar system root
  solarSystemRoot = document.createElement('a-entity');
  solarSystemRoot.setAttribute('id', 'solar-system-root');
  solarSystemRoot.setAttribute('smooth-transform', `targetX: ${offsetX}; targetY: ${offsetY}; targetZ: ${offsetZ}; targetScale: ${currentScale}; active: true; lerpSpeed: 5;`);
  solarSystemRoot.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`);
  solarSystemRoot.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);

  // Sun
  buildSun(solarSystemRoot);

  // Planets
  planets.forEach((planet) => {
    buildPlanetGroup(solarSystemRoot!, planet);
  });

  marker.appendChild(solarSystemRoot);
  sceneEl.appendChild(marker);

  // Camera with cursor/raycaster for mobile tap
  const camera = document.createElement('a-entity');
  camera.setAttribute('camera', '');
  camera.setAttribute('cursor', 'rayOrigin: mouse; fuse: false;');
  camera.setAttribute('raycaster', 'objects: .clickable-planet; far: 100;');
  sceneEl.appendChild(camera);

  container.appendChild(sceneEl);

  // Scene loaded
  sceneEl.addEventListener('loaded', () => {
    setupDragGesture();
    setTimeout(() => { onProgress?.('scene-ready'); }, 800);
  });
}

/**
 * Build Sun entity
 */
function buildSun(parent: HTMLElement): void {
  const sun = document.createElement('a-sphere');
  sun.setAttribute('id', 'planet-sun');
  sun.setAttribute('radius', String(sunData.radius));
  sun.setAttribute('position', '0 0 0');
  sun.setAttribute('self-rotation', `speed: 10; paused: ${isPaused}`);

  // Shader flat + emissive agar matahari menyala terang
  sun.setAttribute('material', `color: ${sunData.color}; shader: flat; emissive: ${sunData.color}; emissiveIntensity: 0.5;`);
  tryLoadTexture(sun, sunData.texturePath, sunData.color);

  // Point light dari matahari
  const light = document.createElement('a-light');
  light.setAttribute('type', 'point');
  light.setAttribute('intensity', '0.5');
  light.setAttribute('distance', '6');
  light.setAttribute('color', '#FFF8E7');
  sun.appendChild(light);

  parent.appendChild(sun);
}

/**
 * Build planet orbit group
 */
function buildPlanetGroup(parent: HTMLElement, planet: Planet): void {
  const group = document.createElement('a-entity');
  group.setAttribute('id', `orbit-group-${planet.id}`);

  // Orbit path — tipis dan subtle
  const orbitPath = document.createElement('a-ring');
  orbitPath.setAttribute('radius-inner', String(planet.orbitRadius - 0.003));
  orbitPath.setAttribute('radius-outer', String(planet.orbitRadius + 0.003));
  orbitPath.setAttribute('color', '#FFFFFF');
  orbitPath.setAttribute('opacity', '0.1');
  orbitPath.setAttribute('rotation', '-90 0 0');
  orbitPath.setAttribute('segments-theta', '64');
  orbitPath.setAttribute('material', 'side: double; transparent: true; shader: flat;');
  group.appendChild(orbitPath);

  // Orbit pivot
  const pivot = document.createElement('a-entity');
  pivot.setAttribute('id', `orbit-pivot-${planet.id}`);
  pivot.setAttribute('orbit-rotation', `speed: ${planet.orbitSpeed * 40}; paused: ${isPaused}`);

  // Planet sphere — CLICKABLE
  const sphere = document.createElement('a-sphere');
  sphere.setAttribute('id', `planet-${planet.id}`);
  sphere.setAttribute('class', 'clickable-planet planet-entity');
  sphere.setAttribute('data-planet-id', planet.id);
  sphere.setAttribute('radius', String(planet.radius));
  sphere.setAttribute('position', `${planet.orbitRadius} 0 0`);
  sphere.setAttribute('self-rotation', `speed: ${planet.rotationSpeed * 50}; paused: ${isPaused}`);

  // Shader flat agar planet terlihat cerah
  sphere.setAttribute('material', `color: ${planet.color}; shader: flat;`);
  tryLoadTexture(sphere, planet.texturePath, planet.color);

  // Click/tap event
  sphere.addEventListener('click', () => {
    onPlanetTap?.(planet.id);
  });

  pivot.appendChild(sphere);

  // Saturn ring
  if (planet.id === 'saturn') {
    const ring = document.createElement('a-ring');
    ring.setAttribute('radius-inner', String(planet.radius * 1.3));
    ring.setAttribute('radius-outer', String(planet.radius * 2.2));
    ring.setAttribute('color', '#E8D191');
    ring.setAttribute('opacity', '0.7');
    ring.setAttribute('rotation', '-75 0 0');
    ring.setAttribute('position', `${planet.orbitRadius} 0 0`);
    ring.setAttribute('segments-theta', '64');
    ring.setAttribute('material', 'side: double; transparent: true; shader: flat;');
    tryLoadRingTexture(ring);
    pivot.appendChild(ring);
  }

  group.appendChild(pivot);
  parent.appendChild(group);
}

/**
 * Load texture — always use shader:flat for brightness in AR
 */
function tryLoadTexture(el: HTMLElement, path: string, fallbackColor: string): void {
  const img = new Image();
  img.onload = () => {
    el.setAttribute('material', `src: url(${path}); shader: flat;`);
  };
  img.onerror = () => {
    console.warn(`Texture not found: ${path}, using fallback color: ${fallbackColor}`);
    el.setAttribute('material', `color: ${fallbackColor}; shader: flat;`);
  };
  img.src = path;
}

function tryLoadRingTexture(el: HTMLElement): void {
  const img = new Image();
  img.onload = () => {
    el.setAttribute('material', 'src: url(textures/saturn-ring.png); side: double; transparent: true; shader: flat;');
  };
  img.onerror = () => { /* keep fallback */ };
  img.src = 'textures/saturn-ring.png';
}

// ==================== DRAG / PAN ====================

function setupDragGesture(): void {
  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });
}

function isOverUI(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y);
  if (!el) return false;
  // Cek apakah touch di atas elemen UI (bukan canvas)
  const uiOverlay = el.closest('.ar-ui-overlay, .planet-selector, .ar-controls, .planet-info-panel, .ar-topbar, .debug-panel');
  return !!uiOverlay;
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  if (isOverUI(t.clientX, t.clientY)) return;

  isDragging = true;
  dragStartX = t.clientX;
  dragStartY = t.clientY;
  dragStartOffsetX = offsetX;
  dragStartOffsetZ = offsetZ;
}

function onTouchMove(e: TouchEvent): void {
  if (!isDragging || e.touches.length !== 1) return;
  e.preventDefault(); // prevent scroll

  const t = e.touches[0];
  const dx = (t.clientX - dragStartX) * 0.005;
  const dy = (t.clientY - dragStartY) * 0.005;

  offsetX = dragStartOffsetX + dx;
  offsetZ = dragStartOffsetZ + dy;
  applyRootTransform();
}

function onTouchEnd(): void {
  isDragging = false;
}

// ==================== PUBLIC CONTROLS ====================

export function togglePause(): boolean {
  isPaused = !isPaused;
  updatePauseState();
  return isPaused;
}

function updatePauseState(): void {
  if (!sceneEl) return;
  sceneEl.querySelectorAll('[orbit-rotation]').forEach((el: any) => {
    el.setAttribute('orbit-rotation', 'paused', isPaused);
  });
  sceneEl.querySelectorAll('[self-rotation]').forEach((el: any) => {
    el.setAttribute('self-rotation', 'paused', isPaused);
  });
}

export function zoomIn(): number {
  currentScale = Math.min(currentScale + SCALE_STEP, MAX_SCALE);
  applyRootTransform();
  return currentScale;
}

export function zoomOut(): number {
  currentScale = Math.max(currentScale - SCALE_STEP, MIN_SCALE);
  applyRootTransform();
  return currentScale;
}

/**
 * Focus planet — smooth zoom ke planet terpilih
 * Menaikkan scale dan menggeser root agar planet di tengah
 */
export function focusPlanet(planetId: string): void {
  if (!sceneEl) return;
  const planet = planets.find((p) => p.id === planetId);
  if (!planet) return;

  focusedPlanetId = planetId;

  // Target scale: 40% lebih besar, tapi cap di MAX
  const targetScale = Math.min(DEFAULT_SCALE * FOCUS_SCALE_MULTIPLIER, MAX_SCALE);
  currentScale = targetScale;

  // Geser root sedikit agar planet terasa lebih dekat
  // Offset berdasarkan orbit radius (geser berlawanan arah planet)
  // Kita geser -x sedikit dan naik Y sedikit
  offsetX = 0;
  offsetY = DEFAULT_POS_Y + 0.05;
  offsetZ = 0;

  applyRootTransform();
}

/**
 * Reset view ke default
 */
export function resetView(): void {
  currentScale = DEFAULT_SCALE;
  offsetX = 0;
  offsetY = DEFAULT_POS_Y;
  offsetZ = 0;
  isPaused = false;
  focusedPlanetId = null;
  highlightedPlanetId = null;

  applyRootTransform();
  updatePauseState();
  clearHighlight();
}

/**
 * Apply position + scale via smooth-transform component
 */
function applyRootTransform(): void {
  if (!solarSystemRoot) return;
  solarSystemRoot.setAttribute('smooth-transform', `targetX: ${offsetX}; targetY: ${offsetY}; targetZ: ${offsetZ}; targetScale: ${currentScale}; active: true; lerpSpeed: 5;`);
}

/**
 * Highlight planet
 */
export function highlightPlanet(planetId: string): void {
  if (!sceneEl) return;
  clearHighlight();
  highlightedPlanetId = planetId;

  const planetEl = sceneEl.querySelector(`#planet-${planetId}`) as any;
  if (planetEl) {
    // Tambah emissive glow tanpa merusak texture
    const currentMat = planetEl.getAttribute('material') || {};
    const currentSrc = currentMat.src || '';
    if (currentSrc) {
      planetEl.setAttribute('material', 'emissive', '#6366f1');
      planetEl.setAttribute('material', 'emissiveIntensity', '0.3');
    } else {
      planetEl.setAttribute('material', 'emissive', '#6366f1');
      planetEl.setAttribute('material', 'emissiveIntensity', '0.3');
    }
  }

  // Highlight orbit
  const orbitGroup = sceneEl.querySelector(`#orbit-group-${planetId}`);
  if (orbitGroup) {
    const ring = orbitGroup.querySelector('a-ring');
    if (ring) {
      ring.setAttribute('opacity', '0.35');
      ring.setAttribute('color', '#818cf8');
    }
  }
}

function clearHighlight(): void {
  if (!sceneEl) return;

  sceneEl.querySelectorAll('.planet-entity').forEach((el: any) => {
    el.setAttribute('material', 'emissive', '#000');
    el.setAttribute('material', 'emissiveIntensity', '0');
  });

  // Reset orbits
  sceneEl.querySelectorAll('a-ring[opacity]').forEach((ring) => {
    const ri = parseFloat(ring.getAttribute('radius-inner') || '0');
    if (ri > 0.1) return; // skip saturn ring
    ring.setAttribute('opacity', '0.1');
    ring.setAttribute('color', '#FFFFFF');
  });

  highlightedPlanetId = null;
}

/**
 * Destroy scene
 */
export function destroyScene(): void {
  // Stop camera streams
  try {
    document.querySelectorAll('video').forEach((video) => {
      const stream = (video as HTMLVideoElement).srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        (video as HTMLVideoElement).srcObject = null;
      }
    });
  } catch (e) {
    console.warn('Error stopping camera streams:', e);
  }

  // Remove drag listeners
  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  }

  // Dispose scene
  if (sceneEl && sceneEl.parentNode) {
    try { (sceneEl as any).renderer?.dispose?.(); } catch (_e) { /* ignore */ }
    sceneEl.parentNode.removeChild(sceneEl);
  }

  sceneEl = null;
  solarSystemRoot = null;
  isPaused = false;
  currentScale = DEFAULT_SCALE;
  offsetX = 0;
  offsetY = DEFAULT_POS_Y;
  offsetZ = 0;
  highlightedPlanetId = null;
  focusedPlanetId = null;
  onPlanetTap = null;
}
