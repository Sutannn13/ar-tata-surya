/**
 * Solar System Builder v5
 *
 * Fixes:
 * - AR.js video adopted into #ar-scene-container (not left on body)
 * - Stacking context: all AR children inside #ar-page
 * - Aggressive cleanup in destroyScene: videos, canvases, scenes
 * - html/body ar-active class for mobile viewport lock
 * - Transparent renderer canvas
 * - markerFound / markerLost tracking
 */

import { planets, sunData, type Planet } from '../data/planets';
import { registerAllComponents } from './aframeComponents';

declare const AFRAME: any;

export type ProgressCallback = (step: string) => void;
export type PlanetTapCallback = (planetId: string) => void;

let onPlanetTap: PlanetTapCallback | null = null;

const DEFAULT_SCALE = 0.5;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.15;
const DEFAULT_POS_Y = 0.25;
const FOCUS_SCALE_MULTIPLIER = 1.4;

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

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetZ = 0;

const originalMaterials: Map<string, string> = new Map();

function isDebugEnabled(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || new URLSearchParams(window.location.search).has('debug');
}

function debugLog(...args: any[]): void {
  if (isDebugEnabled()) console.log('[AR]', ...args);
}

// ===== Adopt AR.js video into container =====

/**
 * AR.js creates a <video> on <body>. We must move it into #ar-scene-container
 * so it participates in #ar-page's stacking context and doesn't cover the UI.
 */
function adoptARVideo(): void {
  const container = document.getElementById('ar-scene-container');
  if (!container) return;

  document.querySelectorAll('body > video').forEach((video) => {
    debugLog('Adopting body>video into #ar-scene-container');
    container.insertBefore(video, container.firstChild);
  });
}

function getARVideoElement(): HTMLVideoElement | null {
  const videos = Array.from(document.querySelectorAll('video'));
  for (const v of videos) {
    if (v.srcObject) return v;
  }
  return videos[0] || null;
}

// ===== Debug panel =====

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
    { label: 'Secure', value: String(window.isSecureContext) },
    { label: 'Videos', value: String(videos.length) },
    { label: 'AR Vid', value: arVideo ? `${arVideo.videoWidth}x${arVideo.videoHeight} rs:${arVideo.readyState}` : 'none' },
    { label: 'Vid Parent', value: arVideo?.parentElement?.id || arVideo?.parentElement?.tagName || 'n/a' },
  ];

  if (arVideo?.srcObject) {
    const tracks = (arVideo.srcObject as MediaStream).getVideoTracks();
    rows.push({ label: 'Track', value: tracks.map((t) => `${t.readyState}:${t.enabled}`).join(',') || 'none' });
  } else {
    rows.push({ label: 'Track', value: 'no-stream' });
  }

  rows.push(
    { label: 'Scene', value: String(!!scene?.hasLoaded) },
    { label: 'Renderer', value: String(!!scene?.renderer) },
    { label: 'Canvas', value: canvas ? 'yes' : 'no' },
    { label: 'MrkFound', value: String(markerFoundCount) },
    { label: 'MrkLost', value: String(markerLostCount) },
    { label: 'MrkVis', value: String(markerVisible) },
  );

  debugBody.innerHTML = rows
    .map((r) => `<div class="debug-row"><span class="debug-label">${r.label}</span><span class="debug-value">${r.value}</span></div>`)
    .join('');

  const closeBtn = document.getElementById('btn-close-debug');
  if (closeBtn && !(closeBtn as any).__bound) {
    (closeBtn as any).__bound = true;
    closeBtn.addEventListener('click', () => debugPanel.classList.add('hidden'));
  }
}

// ===== Video ready =====

export type VideoReadyResult = {
  ready: boolean;
  videoWidth: number;
  videoHeight: number;
  trackState: string;
};

export async function waitForCameraVideoReady(options?: { timeoutMs?: number }): Promise<VideoReadyResult> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const start = performance.now();

  while (performance.now() - start < timeoutMs) {
    adoptARVideo();
    fixCameraVideoElement();
    const v = getARVideoElement();
    if (v && v.srcObject) {
      const tracks = (v.srcObject as MediaStream).getVideoTracks();
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

export function onPlanetTapEvent(cb: PlanetTapCallback): void { onPlanetTap = cb; }

function getTextureBaseUrl(): string { return window.location.origin + '/'; }

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

// ===== Init =====

export async function initARScene(onProgress?: ProgressCallback): Promise<void> {
  // Lock viewport for mobile
  document.documentElement.classList.add('ar-active');
  document.body.classList.add('ar-active');

  await loadScript('https://aframe.io/releases/1.6.0/aframe.min.js');
  onProgress?.('aframe-loaded');

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

  sceneEl = document.createElement('a-scene');
  sceneEl.setAttribute('embedded', '');
  sceneEl.setAttribute('arjs', 'sourceType: webcam; trackingMethod: best; debugUIEnabled: false;');
  sceneEl.setAttribute('renderer', 'logarithmicDepthBuffer: true; precision: mediump; alpha: true; antialias: true;');
  sceneEl.setAttribute('vr-mode-ui', 'enabled: false');

  const marker = document.createElement('a-marker');
  marker.setAttribute('preset', 'hiro');
  marker.setAttribute('smooth', 'true');
  marker.setAttribute('smoothCount', '5');
  marker.setAttribute('smoothTolerance', '0.01');
  marker.setAttribute('smoothThreshold', '2');

  marker.addEventListener('markerFound', () => {
    markerFoundCount++; markerVisible = true;
    debugLog('markerFound', markerFoundCount);
    updateDebugPanel();
    updateMarkerStatus(true);
  });
  marker.addEventListener('markerLost', () => {
    markerLostCount++; markerVisible = false;
    debugLog('markerLost', markerLostCount);
    updateDebugPanel();
    updateMarkerStatus(false);
  });

  // Lights
  const al = document.createElement('a-light');
  al.setAttribute('type', 'ambient'); al.setAttribute('color', '#FFF'); al.setAttribute('intensity', '1.8');
  marker.appendChild(al);
  const dl = document.createElement('a-light');
  dl.setAttribute('type', 'directional'); dl.setAttribute('color', '#FFF8E7');
  dl.setAttribute('intensity', '0.8'); dl.setAttribute('position', '1 2 1');
  marker.appendChild(dl);
  const dl2 = document.createElement('a-light');
  dl2.setAttribute('type', 'directional'); dl2.setAttribute('color', '#E8E0FF');
  dl2.setAttribute('intensity', '0.4'); dl2.setAttribute('position', '-1 -1 -1');
  marker.appendChild(dl2);

  solarSystemRoot = document.createElement('a-entity');
  solarSystemRoot.setAttribute('id', 'solar-system-root');
  solarSystemRoot.setAttribute('smooth-transform', `targetX: ${offsetX}; targetY: ${offsetY}; targetZ: ${offsetZ}; targetScale: ${currentScale}; active: true; lerpSpeed: 5;`);
  solarSystemRoot.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`);
  solarSystemRoot.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);

  buildSun(solarSystemRoot);
  planets.forEach((p) => buildPlanetGroup(solarSystemRoot!, p));

  marker.appendChild(solarSystemRoot);
  sceneEl.appendChild(marker);

  const cam = document.createElement('a-entity');
  cam.setAttribute('camera', '');
  cam.setAttribute('cursor', 'rayOrigin: mouse; fuse: false;');
  cam.setAttribute('raycaster', 'objects: .clickable-planet; far: 100;');
  sceneEl.appendChild(cam);

  container.appendChild(sceneEl);

  sceneEl.addEventListener('loaded', () => {
    debugLog('Scene loaded');
    forceTransparentRenderer();
    adoptARVideo();
    fixCameraVideoElement();
    setupDragGesture();
    updateDebugPanel();
    setTimeout(() => onProgress?.('scene-ready'), 500);
  });
}

function forceTransparentRenderer(): void {
  if (!sceneEl) return;
  const renderer = (sceneEl as any).renderer;
  if (renderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
  }
  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement | null;
  if (canvas) canvas.style.background = 'transparent';
  if (sceneEl) (sceneEl as HTMLElement).style.background = 'transparent';
}

function updateMarkerStatus(found: boolean): void {
  const hint = document.getElementById('loading-hint');
  if (hint && !document.getElementById('ar-loading')?.classList.contains('hidden')) {
    hint.textContent = found ? '✅ Marker terdeteksi!' : 'Arahkan kamera ke marker Hiro';
  }
}

/**
 * Style AR.js video inside #ar-scene-container.
 * Uses position:absolute relative to the container, NOT position:fixed on body.
 */
function fixCameraVideoElement(): void {
  const apply = () => {
    const container = document.getElementById('ar-scene-container');
    if (!container) return;

    // First adopt any stray body videos
    adoptARVideo();

    container.querySelectorAll('video').forEach((video) => {
      video.style.position = 'absolute';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.zIndex = '1';
      video.style.display = 'block';
      video.style.opacity = '1';
      video.style.visibility = 'visible';
      video.style.background = 'transparent';
      video.style.transform = 'none';
      (video.style as any).webkitTransform = 'none';
      video.style.pointerEvents = 'none';
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;
      if (video.srcObject && video.paused) {
        video.play().catch(() => undefined);
      }
    });
  };

  apply();
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 3000);

  if (!(window as any).__arVideoObserver) {
    const observer = new MutationObserver(() => {
      adoptARVideo();
      apply();
      forceTransparentRenderer();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    (window as any).__arVideoObserver = observer;
  }
}

// ===== Build Sun / Planets =====

function buildSun(parent: HTMLElement): void {
  const baseUrl = getTextureBaseUrl();
  const sun = document.createElement('a-sphere');
  sun.setAttribute('id', 'planet-sun');
  sun.setAttribute('radius', String(sunData.radius));
  sun.setAttribute('position', '0 0 0');
  sun.setAttribute('self-rotation', `speed: 10; paused: ${isPaused}`);
  sun.setAttribute('material', `color: ${sunData.color}; shader: flat;`);
  tryLoadTexture(sun, baseUrl + sunData.texturePath, sunData.color, 'sun');
  const light = document.createElement('a-light');
  light.setAttribute('type', 'point'); light.setAttribute('intensity', '0.5');
  light.setAttribute('distance', '6'); light.setAttribute('color', '#FFF8E7');
  sun.appendChild(light);
  parent.appendChild(sun);
}

function buildPlanetGroup(parent: HTMLElement, planet: Planet): void {
  const baseUrl = getTextureBaseUrl();
  const group = document.createElement('a-entity');
  group.setAttribute('id', `orbit-group-${planet.id}`);

  const orbitPath = document.createElement('a-ring');
  orbitPath.setAttribute('radius-inner', String(planet.orbitRadius - 0.003));
  orbitPath.setAttribute('radius-outer', String(planet.orbitRadius + 0.003));
  orbitPath.setAttribute('color', '#FFFFFF'); orbitPath.setAttribute('opacity', '0.1');
  orbitPath.setAttribute('rotation', '-90 0 0'); orbitPath.setAttribute('segments-theta', '64');
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
  sphere.setAttribute('material', `color: ${planet.color}; shader: flat;`);
  tryLoadTexture(sphere, baseUrl + planet.texturePath, planet.color, planet.id);
  sphere.addEventListener('click', () => onPlanetTap?.(planet.id));
  pivot.appendChild(sphere);

  if (planet.id === 'saturn') {
    const ring = document.createElement('a-ring');
    ring.setAttribute('radius-inner', String(planet.radius * 1.3));
    ring.setAttribute('radius-outer', String(planet.radius * 2.2));
    ring.setAttribute('color', '#E8D191'); ring.setAttribute('opacity', '0.7');
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

function tryLoadTexture(el: HTMLElement, path: string, fallback: string, id: string): void {
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => { const m = `src: url(${path}); shader: flat;`; el.setAttribute('material', m); originalMaterials.set(id, m); };
  img.onerror = () => { const m = `color: ${fallback}; shader: flat;`; el.setAttribute('material', m); originalMaterials.set(id, m); };
  img.src = path;
}

function tryLoadRingTexture(el: HTMLElement, baseUrl: string): void {
  const p = baseUrl + 'textures/saturn-ring.png';
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => { el.setAttribute('material', `src: url(${p}); side: double; transparent: true; shader: flat;`); };
  img.onerror = () => { /* keep fallback */ };
  img.src = p;
}

// ===== Drag =====

function setupDragGesture(): void {
  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });
}

function isOverUI(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y);
  return !!el?.closest('.ar-ui-overlay, .planet-selector, .ar-controls, .planet-info-panel, .ar-topbar, .debug-panel');
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  if (isOverUI(t.clientX, t.clientY)) return;
  isDragging = true; dragStartX = t.clientX; dragStartY = t.clientY;
  dragStartOffsetX = offsetX; dragStartOffsetZ = offsetZ;
}

function onTouchMove(e: TouchEvent): void {
  if (!isDragging || e.touches.length !== 1) return;
  e.preventDefault();
  const t = e.touches[0];
  offsetX = dragStartOffsetX + (t.clientX - dragStartX) * 0.005;
  offsetZ = dragStartOffsetZ + (t.clientY - dragStartY) * 0.005;
  applyRootTransform();
}

function onTouchEnd(): void { isDragging = false; }

// ===== Controls =====

export function togglePause(): boolean { isPaused = !isPaused; updatePauseState(); return isPaused; }

function updatePauseState(): void {
  if (!sceneEl) return;
  sceneEl.querySelectorAll('[orbit-rotation]').forEach((el: any) => el.setAttribute('orbit-rotation', 'paused', isPaused));
  sceneEl.querySelectorAll('[self-rotation]').forEach((el: any) => el.setAttribute('self-rotation', 'paused', isPaused));
}

export function zoomIn(): number { currentScale = Math.min(currentScale + SCALE_STEP, MAX_SCALE); applyRootTransform(); return currentScale; }
export function zoomOut(): number { currentScale = Math.max(currentScale - SCALE_STEP, MIN_SCALE); applyRootTransform(); return currentScale; }

export function focusPlanet(planetId: string): void {
  if (!sceneEl) return;
  const planet = planets.find((p) => p.id === planetId);
  if (!planet) return;
  focusedPlanetId = planetId;
  currentScale = Math.min(DEFAULT_SCALE * FOCUS_SCALE_MULTIPLIER, MAX_SCALE);
  offsetX = 0; offsetY = DEFAULT_POS_Y + 0.05; offsetZ = 0;
  applyRootTransform();
}

export function resetView(): void {
  currentScale = DEFAULT_SCALE; offsetX = 0; offsetY = DEFAULT_POS_Y; offsetZ = 0;
  isPaused = false; focusedPlanetId = null; highlightedPlanetId = null;
  applyRootTransform(); updatePauseState(); clearHighlight();
}

function applyRootTransform(): void {
  if (!solarSystemRoot) return;
  solarSystemRoot.setAttribute('smooth-transform', `targetX: ${offsetX}; targetY: ${offsetY}; targetZ: ${offsetZ}; targetScale: ${currentScale}; active: true; lerpSpeed: 5;`);
}

export function highlightPlanet(planetId: string): void {
  if (!sceneEl) return;
  clearHighlight(); highlightedPlanetId = planetId;
  const pe = sceneEl.querySelector(`#planet-${planetId}`) as any;
  if (pe) { const r = parseFloat(pe.getAttribute('radius') || '0.1'); pe.setAttribute('data-original-radius', String(r)); pe.setAttribute('radius', String(r * 1.25)); }
  const og = sceneEl.querySelector(`#orbit-group-${planetId}`);
  if (og) { const ring = og.querySelector('a-ring'); if (ring) { ring.setAttribute('opacity', '0.35'); ring.setAttribute('color', '#818cf8'); } }
}

function clearHighlight(): void {
  if (!sceneEl) return;
  sceneEl.querySelectorAll('.planet-entity').forEach((el: any) => {
    const or = el.getAttribute('data-original-radius');
    if (or) { el.setAttribute('radius', or); el.removeAttribute('data-original-radius'); }
  });
  sceneEl.querySelectorAll('a-ring[opacity]').forEach((ring) => {
    if (parseFloat(ring.getAttribute('radius-inner') || '0') > 0.1) return;
    ring.setAttribute('opacity', '0.1'); ring.setAttribute('color', '#FFFFFF');
  });
  highlightedPlanetId = null;
}

// ===== Destroy =====

export function destroyScene(): void {
  debugLog('destroyScene: before cleanup',
    'videos:', document.querySelectorAll('video').length,
    'canvases:', document.querySelectorAll('canvas.a-canvas').length,
    'scenes:', document.querySelectorAll('a-scene').length
  );

  // 1. Disconnect observer
  try {
    const obs = (window as any).__arVideoObserver;
    if (obs) { obs.disconnect(); (window as any).__arVideoObserver = null; }
  } catch (_) { /* */ }

  // 2. Stop ALL video streams and remove videos
  document.querySelectorAll('video').forEach((video) => {
    try {
      const stream = (video as HTMLVideoElement).srcObject as MediaStream;
      if (stream) { stream.getTracks().forEach((t) => t.stop()); }
      (video as HTMLVideoElement).srcObject = null;
      video.remove();
    } catch (_) { /* */ }
  });

  // 3. Remove drag listeners
  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  }

  // 4. Dispose and remove a-scene
  if (sceneEl) {
    try { (sceneEl as any).renderer?.dispose?.(); } catch (_) { /* */ }
    sceneEl.remove();
  }

  // 5. Remove any remaining a-scene / canvas from DOM
  document.querySelectorAll('a-scene').forEach((s) => s.remove());
  document.querySelectorAll('canvas.a-canvas').forEach((c) => c.remove());

  // 6. Clear container
  const container = document.getElementById('ar-scene-container');
  if (container) container.innerHTML = '';

  // 7. Remove ar-active class
  document.documentElement.classList.remove('ar-active');
  document.body.classList.remove('ar-active');

  // 8. Reset state
  sceneEl = null; solarSystemRoot = null;
  isPaused = false; currentScale = DEFAULT_SCALE;
  offsetX = 0; offsetY = DEFAULT_POS_Y; offsetZ = 0;
  highlightedPlanetId = null; focusedPlanetId = null;
  onPlanetTap = null; originalMaterials.clear();
  markerFoundCount = 0; markerLostCount = 0; markerVisible = false;

  debugLog('destroyScene: after cleanup',
    'videos:', document.querySelectorAll('video').length,
    'canvases:', document.querySelectorAll('canvas.a-canvas').length,
    'scenes:', document.querySelectorAll('a-scene').length
  );
}
