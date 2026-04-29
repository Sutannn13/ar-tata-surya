/**
 * Solar System Builder v4
 *
 * Root-cause fixes:
 * - Removed manual camera preview (was competing with AR.js for getUserMedia)
 * - Pinned AR.js to stable 3.4.5 release
 * - Added markerFound / markerLost event listeners
 * - Force renderer setClearColor alpha=0 so canvas is transparent
 * - AR.js owns the camera exclusively; no preflight stream
 * - Comprehensive debug panel with ?debug=true
 */

import { planets, sunData, type Planet } from '../data/planets';
import { registerAllComponents } from './aframeComponents';

declare const AFRAME: any;

export type ProgressCallback = (step: string) => void;
export type PlanetTapCallback = (planetId: string) => void;

let onPlanetTap: PlanetTapCallback | null = null;

// ===== Constants =====
const DEFAULT_SCALE = 0.5;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.15;
const DEFAULT_POS_Y = 0.25;
const FOCUS_SCALE_MULTIPLIER = 1.4;

// ===== State =====
let isPaused = false;
let currentScale = DEFAULT_SCALE;
let offsetX = 0;
let offsetY = DEFAULT_POS_Y;
let offsetZ = 0;
let focusedPlanetId: string | null = null;
let solarSystemRoot: HTMLElement | null = null;
let sceneEl: HTMLElement | null = null;
let highlightedPlanetId: string | null = null;
let markerFoundCount = 0;
let markerLostCount = 0;
let markerVisible = false;

// Drag state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetZ = 0;

const originalMaterials: Map<string, string> = new Map();

// ===== Debug helpers =====

function isDebugEnabled(): boolean {
  const h = window.location.hostname;
  const isDev = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  return isDev || new URLSearchParams(window.location.search).has('debug');
}

function debugLog(...args: any[]): void {
  if (isDebugEnabled()) console.log('[AR]', ...args);
}

/** Find the AR.js-created video (not manual preview) */
function getARVideoElement(): HTMLVideoElement | null {
  const videos = Array.from(document.querySelectorAll('video'));
  // AR.js video is typically appended to body or inside arjs internals
  for (const v of videos) {
    if (v.id === 'manual-camera-preview') continue;
    if (v.srcObject) return v;
  }
  // fallback: any video with srcObject
  return videos.find((v) => !!v.srcObject) || videos[0] || null;
}

// ===== Debug panel update =====

export function updateDebugPanel(): void {
  if (!isDebugEnabled()) return;
  const debugBody = document.getElementById('debug-body');
  const debugPanel = document.getElementById('debug-panel');
  if (!debugBody || !debugPanel) return;

  debugPanel.classList.remove('hidden');

  const videos = Array.from(document.querySelectorAll('video'));
  const arVideo = getARVideoElement();
  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement | null;
  const scene = sceneEl as any;

  const rows: { label: string; value: string }[] = [
    { label: 'Secure Context', value: String(window.isSecureContext) },
    { label: 'Video Count', value: String(videos.length) },
    { label: 'AR Video', value: arVideo ? `${arVideo.videoWidth}x${arVideo.videoHeight} rs:${arVideo.readyState}` : 'none' },
  ];

  if (arVideo?.srcObject) {
    const stream = arVideo.srcObject as MediaStream;
    const tracks = stream.getVideoTracks();
    rows.push({ label: 'Track', value: tracks.map((t) => `${t.readyState}:${t.enabled}`).join(',') || 'none' });
  } else {
    rows.push({ label: 'Track', value: 'no-stream' });
  }

  rows.push(
    { label: 'Scene Loaded', value: String(!!scene?.hasLoaded) },
    { label: 'Renderer', value: String(!!scene?.renderer) },
    { label: 'Canvas', value: canvas ? 'yes' : 'no' },
    { label: 'Canvas BG', value: canvas ? getComputedStyle(canvas).background.slice(0, 40) : 'n/a' },
    { label: 'Marker Found', value: String(markerFoundCount) },
    { label: 'Marker Lost', value: String(markerLostCount) },
    { label: 'Marker Visible', value: String(markerVisible) },
    { label: 'AR.js', value: String(typeof (window as any).AFRAME !== 'undefined' && !!(window as any).AFRAME?.components?.['arjs-look-controls'] || document.querySelector('[arjs]') !== null) },
  );

  debugBody.innerHTML = rows
    .map((r) => `<div class="debug-row"><span class="debug-label">${r.label}</span><span class="debug-value">${r.value}</span></div>`)
    .join('');

  // Close button
  const closeBtn = document.getElementById('btn-close-debug');
  if (closeBtn && !(closeBtn as any).__bound) {
    (closeBtn as any).__bound = true;
    closeBtn.addEventListener('click', () => debugPanel.classList.add('hidden'));
  }
}

// ===== Video ready check (no manual preview) =====

export type VideoReadyResult = {
  ready: boolean;
  videoWidth: number;
  videoHeight: number;
  trackState: string;
};

export async function waitForCameraVideoReady(options?: {
  timeoutMs?: number;
}): Promise<VideoReadyResult> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const start = performance.now();

  while (performance.now() - start < timeoutMs) {
    fixCameraVideoElement();
    const v = getARVideoElement();
    if (v && v.srcObject) {
      const stream = v.srcObject as MediaStream;
      const tracks = stream.getVideoTracks();
      const live = tracks.some((t) => t.readyState === 'live' && t.enabled);
      const hasFrame = v.readyState >= 2 || (v.videoWidth > 0 && v.videoHeight > 0);
      if (live && hasFrame) {
        debugLog('Video ready', v.videoWidth, v.videoHeight);
        updateDebugPanel();
        return { ready: true, videoWidth: v.videoWidth, videoHeight: v.videoHeight, trackState: 'live' };
      }
    }
    await delay(300);
  }

  updateDebugPanel();
  const v = getARVideoElement();
  return {
    ready: false,
    videoWidth: v?.videoWidth ?? 0,
    videoHeight: v?.videoHeight ?? 0,
    trackState: v?.srcObject ? (v.srcObject as MediaStream).getVideoTracks().map((t) => t.readyState).join(',') : 'none',
  };
}

// ===== Planet tap =====
export function onPlanetTapEvent(cb: PlanetTapCallback): void {
  onPlanetTap = cb;
}

// ===== Texture base URL =====
function getTextureBaseUrl(): string {
  return window.location.origin + '/';
}

// ===== Script loader =====
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ===== Init AR Scene =====

export async function initARScene(onProgress?: ProgressCallback): Promise<void> {
  // A-Frame 1.6.0
  await loadScript('https://aframe.io/releases/1.6.0/aframe.min.js');
  onProgress?.('aframe-loaded');

  // AR.js pinned to stable 3.4.5
  await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js');
  onProgress?.('arjs-loaded');

  registerAllComponents();
  buildScene(onProgress);
}

// ===== Build Scene =====

function buildScene(onProgress?: ProgressCallback): void {
  const container = document.getElementById('ar-scene-container');
  if (!container) return;
  container.innerHTML = '';

  // Scene
  sceneEl = document.createElement('a-scene');
  sceneEl.setAttribute('embedded', '');
  sceneEl.setAttribute('arjs', 'sourceType: webcam; trackingMethod: best; debugUIEnabled: false;');
  sceneEl.setAttribute('renderer', 'logarithmicDepthBuffer: true; precision: mediump; alpha: true; antialias: true;');
  sceneEl.setAttribute('vr-mode-ui', 'enabled: false');

  // Marker
  const marker = document.createElement('a-marker');
  marker.setAttribute('preset', 'hiro');
  marker.setAttribute('smooth', 'true');
  marker.setAttribute('smoothCount', '5');
  marker.setAttribute('smoothTolerance', '0.01');
  marker.setAttribute('smoothThreshold', '2');

  // markerFound / markerLost listeners
  marker.addEventListener('markerFound', () => {
    markerFoundCount++;
    markerVisible = true;
    debugLog('markerFound', markerFoundCount);
    updateDebugPanel();
    updateMarkerStatus(true);
  });

  marker.addEventListener('markerLost', () => {
    markerLostCount++;
    markerVisible = false;
    debugLog('markerLost', markerLostCount);
    updateDebugPanel();
    updateMarkerStatus(false);
  });

  // Lights
  const ambientLight = document.createElement('a-light');
  ambientLight.setAttribute('type', 'ambient');
  ambientLight.setAttribute('color', '#FFF');
  ambientLight.setAttribute('intensity', '1.8');
  marker.appendChild(ambientLight);

  const dirLight = document.createElement('a-light');
  dirLight.setAttribute('type', 'directional');
  dirLight.setAttribute('color', '#FFF8E7');
  dirLight.setAttribute('intensity', '0.8');
  dirLight.setAttribute('position', '1 2 1');
  marker.appendChild(dirLight);

  const dirLight2 = document.createElement('a-light');
  dirLight2.setAttribute('type', 'directional');
  dirLight2.setAttribute('color', '#E8E0FF');
  dirLight2.setAttribute('intensity', '0.4');
  dirLight2.setAttribute('position', '-1 -1 -1');
  marker.appendChild(dirLight2);

  // Solar system root
  solarSystemRoot = document.createElement('a-entity');
  solarSystemRoot.setAttribute('id', 'solar-system-root');
  solarSystemRoot.setAttribute('smooth-transform', `targetX: ${offsetX}; targetY: ${offsetY}; targetZ: ${offsetZ}; targetScale: ${currentScale}; active: true; lerpSpeed: 5;`);
  solarSystemRoot.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`);
  solarSystemRoot.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);

  // Sun
  buildSun(solarSystemRoot);

  // Planets
  planets.forEach((planet) => buildPlanetGroup(solarSystemRoot!, planet));

  marker.appendChild(solarSystemRoot);
  sceneEl.appendChild(marker);

  // Camera with cursor/raycaster
  const camera = document.createElement('a-entity');
  camera.setAttribute('camera', '');
  camera.setAttribute('cursor', 'rayOrigin: mouse; fuse: false;');
  camera.setAttribute('raycaster', 'objects: .clickable-planet; far: 100;');
  sceneEl.appendChild(camera);

  container.appendChild(sceneEl);

  // Scene loaded
  sceneEl.addEventListener('loaded', () => {
    debugLog('Scene loaded');
    forceTransparentRenderer();
    setupDragGesture();
    fixCameraVideoElement();
    updateDebugPanel();
    setTimeout(() => onProgress?.('scene-ready'), 500);
  });
}

/** Force renderer to have transparent clear color */
function forceTransparentRenderer(): void {
  if (!sceneEl) return;
  const renderer = (sceneEl as any).renderer;
  if (renderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    debugLog('Renderer setClearColor(0x000000, 0)');
  }
  // Canvas style
  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement | null;
  if (canvas) {
    canvas.style.background = 'transparent';
  }
  if (sceneEl) {
    (sceneEl as HTMLElement).style.background = 'transparent';
  }
}

/** Update marker status indicator on the loading overlay or AR UI */
function updateMarkerStatus(found: boolean): void {
  const hint = document.getElementById('loading-hint');
  if (hint && !document.getElementById('ar-loading')?.classList.contains('hidden')) {
    hint.textContent = found ? '✅ Marker terdeteksi!' : 'Arahkan kamera ke marker Hiro';
  }
}

/** Fix AR.js video element styling */
function fixCameraVideoElement(): void {
  const applyFix = () => {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      // Skip manual debug preview
      if (video.id === 'manual-camera-preview') return;

      video.style.position = 'fixed';
      video.style.inset = '0';
      video.style.width = '100vw';
      video.style.height = '100vh';
      video.style.objectFit = 'cover';
      video.style.zIndex = '1';
      video.style.display = 'block';
      video.style.opacity = '1';
      video.style.visibility = 'visible';
      video.style.background = 'transparent';
      video.style.transform = 'none';
      (video.style as any).webkitTransform = 'none';
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      (video as HTMLVideoElement).playsInline = true;

      if ((video as HTMLVideoElement).srcObject && (video as HTMLVideoElement).paused) {
        (video as HTMLVideoElement).play().catch(() => undefined);
      }
    });
  };

  applyFix();
  setTimeout(applyFix, 500);
  setTimeout(applyFix, 1500);
  setTimeout(applyFix, 3000);

  // MutationObserver
  if (!(window as any).__arVideoObserver) {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof HTMLVideoElement || (node instanceof HTMLElement && node.querySelector?.('video'))) {
            applyFix();
            forceTransparentRenderer();
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    (window as any).__arVideoObserver = observer;
  }
}

// ===== Build Sun =====

function buildSun(parent: HTMLElement): void {
  const baseUrl = getTextureBaseUrl();
  const sun = document.createElement('a-sphere');
  sun.setAttribute('id', 'planet-sun');
  sun.setAttribute('radius', String(sunData.radius));
  sun.setAttribute('position', '0 0 0');
  sun.setAttribute('self-rotation', `speed: 10; paused: ${isPaused}`);

  const sunMaterial = `color: ${sunData.color}; shader: flat;`;
  sun.setAttribute('material', sunMaterial);
  tryLoadTexture(sun, baseUrl + sunData.texturePath, sunData.color, 'sun');

  const light = document.createElement('a-light');
  light.setAttribute('type', 'point');
  light.setAttribute('intensity', '0.5');
  light.setAttribute('distance', '6');
  light.setAttribute('color', '#FFF8E7');
  sun.appendChild(light);

  parent.appendChild(sun);
}

// ===== Build Planet =====

function buildPlanetGroup(parent: HTMLElement, planet: Planet): void {
  const baseUrl = getTextureBaseUrl();
  const group = document.createElement('a-entity');
  group.setAttribute('id', `orbit-group-${planet.id}`);

  const orbitPath = document.createElement('a-ring');
  orbitPath.setAttribute('radius-inner', String(planet.orbitRadius - 0.003));
  orbitPath.setAttribute('radius-outer', String(planet.orbitRadius + 0.003));
  orbitPath.setAttribute('color', '#FFFFFF');
  orbitPath.setAttribute('opacity', '0.1');
  orbitPath.setAttribute('rotation', '-90 0 0');
  orbitPath.setAttribute('segments-theta', '64');
  orbitPath.setAttribute('material', 'side: double; transparent: true; shader: flat;');
  group.appendChild(orbitPath);

  const pivot = document.createElement('a-entity');
  pivot.setAttribute('id', `orbit-pivot-${planet.id}`);
  pivot.setAttribute('orbit-rotation', `speed: ${planet.orbitSpeed * 40}; paused: ${isPaused}`);

  const sphere = document.createElement('a-sphere');
  sphere.setAttribute('id', `planet-${planet.id}`);
  sphere.setAttribute('class', 'clickable-planet planet-entity');
  sphere.setAttribute('data-planet-id', planet.id);
  sphere.setAttribute('radius', String(planet.radius));
  sphere.setAttribute('position', `${planet.orbitRadius} 0 0`);
  sphere.setAttribute('self-rotation', `speed: ${planet.rotationSpeed * 50}; paused: ${isPaused}`);

  const planetMaterial = `color: ${planet.color}; shader: flat;`;
  sphere.setAttribute('material', planetMaterial);
  tryLoadTexture(sphere, baseUrl + planet.texturePath, planet.color, planet.id);

  sphere.addEventListener('click', () => onPlanetTap?.(planet.id));
  pivot.appendChild(sphere);

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
    tryLoadRingTexture(ring, baseUrl);
    pivot.appendChild(ring);
  }

  group.appendChild(pivot);
  parent.appendChild(group);
}

// ===== Texture loading =====

function tryLoadTexture(el: HTMLElement, absolutePath: string, fallbackColor: string, planetId: string): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const mat = `src: url(${absolutePath}); shader: flat;`;
    el.setAttribute('material', mat);
    originalMaterials.set(planetId, mat);
  };
  img.onerror = () => {
    const mat = `color: ${fallbackColor}; shader: flat;`;
    el.setAttribute('material', mat);
    originalMaterials.set(planetId, mat);
  };
  img.src = absolutePath;
}

function tryLoadRingTexture(el: HTMLElement, baseUrl: string): void {
  const ringPath = baseUrl + 'textures/saturn-ring.png';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    el.setAttribute('material', `src: url(${ringPath}); side: double; transparent: true; shader: flat;`);
  };
  img.onerror = () => { /* keep fallback */ };
  img.src = ringPath;
}

// ===== Drag / Pan =====

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
  return !!el.closest('.ar-ui-overlay, .planet-selector, .ar-controls, .planet-info-panel, .ar-topbar, .debug-panel');
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
  e.preventDefault();
  const t = e.touches[0];
  offsetX = dragStartOffsetX + (t.clientX - dragStartX) * 0.005;
  offsetZ = dragStartOffsetZ + (t.clientY - dragStartY) * 0.005;
  applyRootTransform();
}

function onTouchEnd(): void {
  isDragging = false;
}

// ===== Public Controls =====

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

export function focusPlanet(planetId: string): void {
  if (!sceneEl) return;
  const planet = planets.find((p) => p.id === planetId);
  if (!planet) return;
  focusedPlanetId = planetId;
  const targetScale = Math.min(DEFAULT_SCALE * FOCUS_SCALE_MULTIPLIER, MAX_SCALE);
  currentScale = targetScale;
  offsetX = 0;
  offsetY = DEFAULT_POS_Y + 0.05;
  offsetZ = 0;
  applyRootTransform();
}

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

function applyRootTransform(): void {
  if (!solarSystemRoot) return;
  solarSystemRoot.setAttribute('smooth-transform', `targetX: ${offsetX}; targetY: ${offsetY}; targetZ: ${offsetZ}; targetScale: ${currentScale}; active: true; lerpSpeed: 5;`);
}

export function highlightPlanet(planetId: string): void {
  if (!sceneEl) return;
  clearHighlight();
  highlightedPlanetId = planetId;

  const planetEl = sceneEl.querySelector(`#planet-${planetId}`) as any;
  if (planetEl) {
    const currentRadius = parseFloat(planetEl.getAttribute('radius') || '0.1');
    planetEl.setAttribute('data-original-radius', String(currentRadius));
    planetEl.setAttribute('radius', String(currentRadius * 1.25));
  }

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
    const origRadius = el.getAttribute('data-original-radius');
    if (origRadius) {
      el.setAttribute('radius', origRadius);
      el.removeAttribute('data-original-radius');
    }
  });
  sceneEl.querySelectorAll('a-ring[opacity]').forEach((ring) => {
    const ri = parseFloat(ring.getAttribute('radius-inner') || '0');
    if (ri > 0.1) return;
    ring.setAttribute('opacity', '0.1');
    ring.setAttribute('color', '#FFFFFF');
  });
  highlightedPlanetId = null;
}

// ===== Destroy =====

export function destroyScene(): void {
  try {
    const observer = (window as any).__arVideoObserver;
    if (observer) { observer.disconnect(); (window as any).__arVideoObserver = null; }
  } catch (_e) { /* ignore */ }

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

  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  }

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
  originalMaterials.clear();
  markerFoundCount = 0;
  markerLostCount = 0;
  markerVisible = false;
}
