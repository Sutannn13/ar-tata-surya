/**
 * Solar System Builder v3
 * 
 * Fixes & Improvements:
 * - Texture loading with absolute base URL to prevent 404 on mobile
 * - Proper material handling to prevent black planets (clearHighlight fix)
 * - Improved shader:flat usage with correct emissive handling
 * - Camera video element fix for mobile fullscreen
 * - Better cross-device compatibility (Android, iOS, desktop)
 * - Drag/pan gesture for moving solar system
 * - Tap/click planet 3D via raycaster
 * - Smooth focus/zoom to selected planet
 * - Camera stream cleanup on destroy
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

// Store original materials so we can restore them after highlight
const originalMaterials: Map<string, string> = new Map();

type VideoDebugEntry = {
  index: number;
  isManualPreview: boolean;
  readyState: number;
  videoWidth: number;
  videoHeight: number;
  paused: boolean;
  hasSrcObject: boolean;
  streamActive: boolean;
  trackSummary: string;
  isReady: boolean;
};

type VideoDebugSummary = {
  total: number;
  manualCount: number;
  readyCount: number;
  liveCount: number;
  entries: VideoDebugEntry[];
};

export type VideoReadyResult = {
  ready: boolean;
  summary: VideoDebugSummary;
};

let manualPreviewStream: MediaStream | null = null;
let manualPreviewVideo: HTMLVideoElement | null = null;

/**
 * Get the base URL for textures — works in both dev and production
 * Uses import.meta.url or falls back to location.origin
 */
function getTextureBaseUrl(): string {
  // In Vite, files in /public are served at root
  return window.location.origin + '/';
}

function isDebugEnabled(): boolean {
  const hostname = window.location.hostname;
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  return isDev || new URLSearchParams(window.location.search).has('debug');
}

function getVideoElements(): HTMLVideoElement[] {
  return Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
}

function buildTrackSummary(stream: MediaStream | null): { streamActive: boolean; summary: string } {
  if (!stream) {
    return { streamActive: false, summary: 'no-stream' };
  }

  const tracks = stream.getVideoTracks();
  const liveTracks = tracks.filter((track) => track.readyState === 'live' && track.enabled);
  const summary = tracks.length
    ? tracks.map((track) => `${track.readyState}:${track.enabled ? 'enabled' : 'disabled'}`).join(', ')
    : 'no-tracks';

  return { streamActive: stream.active && liveTracks.length > 0, summary };
}

function isVideoReady(video: HTMLVideoElement, streamActive: boolean): boolean {
  const hasFrame = video.readyState >= 2 || (video.videoWidth > 0 && video.videoHeight > 0);
  return hasFrame && streamActive;
}

function collectVideoDebugSummary(): VideoDebugSummary {
  const videos = getVideoElements();
  const entries = videos.map((video, index) => {
    const stream = (video.srcObject as MediaStream | null) || null;
    const trackInfo = buildTrackSummary(stream);
    const ready = isVideoReady(video, trackInfo.streamActive);
    const isManualPreview = video.id === 'manual-camera-preview';

    return {
      index,
      isManualPreview,
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      hasSrcObject: !!stream,
      streamActive: trackInfo.streamActive,
      trackSummary: trackInfo.summary,
      isReady: ready,
    };
  });

  return {
    total: entries.length,
    manualCount: entries.filter((entry) => entry.isManualPreview).length,
    readyCount: entries.filter((entry) => !entry.isManualPreview && entry.isReady).length,
    liveCount: entries.filter((entry) => !entry.isManualPreview && entry.streamActive).length,
    entries,
  };
}

function renderDebugVideoPanel(context: string, summary: VideoDebugSummary): void {
  if (!isDebugEnabled()) return;

  const debugBody = document.getElementById('debug-body');
  const debugPanel = document.getElementById('debug-panel');
  if (!debugBody || !debugPanel) return;

  let section = debugBody.querySelector('[data-debug-section="video"]') as HTMLElement | null;
  if (!section) {
    section = document.createElement('div');
    section.dataset.debugSection = 'video';
    section.style.marginTop = '0.5rem';
    debugBody.appendChild(section);
  }

  const rows = [
    { label: 'Video Context', value: context },
    { label: 'Video Count', value: String(summary.total) },
    { label: 'Manual Preview', value: String(summary.manualCount) },
    { label: 'Ready Videos', value: String(summary.readyCount) },
    { label: 'Live Streams', value: String(summary.liveCount) },
  ];

  const videoRows = summary.entries.map((entry) => ({
    label: `V${entry.index}`,
    value: `${entry.isManualPreview ? 'manual' : 'arjs'} rs:${entry.readyState} ${entry.videoWidth}x${entry.videoHeight} ${entry.paused ? 'paused' : 'play'} ${entry.streamActive ? 'live' : 'dead'}`,
  }));

  section.innerHTML = rows
    .concat(videoRows)
    .map((row) => `<div class="debug-row"><span class="debug-label">${row.label}</span><span class="debug-value">${row.value}</span></div>`)
    .join('');
}

export function debugVideoState(context: string): VideoDebugSummary {
  const summary = collectVideoDebugSummary();
  if (isDebugEnabled()) {
    console.groupCollapsed(`[AR] Video State: ${context}`);
    console.log('summary', summary);
    console.table(summary.entries);
    console.groupEnd();
  }
  renderDebugVideoPanel(context, summary);
  return summary;
}

export async function testCameraPreview(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  const container = document.getElementById('ar-scene-container');
  if (!container || manualPreviewStream) {
    return !!manualPreviewStream;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });

    const preview = document.createElement('video');
    preview.setAttribute('playsinline', '');
    preview.setAttribute('webkit-playsinline', '');
    preview.muted = true;
    preview.autoplay = true;
    preview.playsInline = true;
    preview.srcObject = stream;
    preview.id = 'manual-camera-preview';
    preview.style.position = 'fixed';
    preview.style.inset = '0';
    preview.style.width = '100vw';
    preview.style.height = '100vh';
    preview.style.objectFit = 'cover';
    preview.style.zIndex = '51';
    preview.style.display = 'block';
    preview.style.opacity = '1';
    preview.style.visibility = 'visible';
    preview.style.background = 'transparent';

    container.appendChild(preview);
    await preview.play().catch(() => undefined);

    manualPreviewStream = stream;
    manualPreviewVideo = preview;
    return true;
  } catch (err) {
    if (isDebugEnabled()) {
      console.warn('[AR] Manual camera preview failed:', err);
    }
    return false;
  }
}

function stopCameraPreview(): void {
  if (manualPreviewStream) {
    manualPreviewStream.getTracks().forEach((track) => track.stop());
    manualPreviewStream = null;
  }
  if (manualPreviewVideo && manualPreviewVideo.parentNode) {
    manualPreviewVideo.parentNode.removeChild(manualPreviewVideo);
  }
  manualPreviewVideo = null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForCameraVideoReady(options?: {
  timeoutMs?: number;
  allowManualPreview?: boolean;
}): Promise<VideoReadyResult> {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const allowManualPreview = options?.allowManualPreview ?? false;
  const start = performance.now();
  let previewStarted = false;

  while (performance.now() - start < timeoutMs) {
    fixCameraVideoElement();
    const summary = collectVideoDebugSummary();
    if (summary.readyCount > 0 && summary.liveCount > 0) {
      stopCameraPreview();
      debugVideoState('video-ready');
      return { ready: true, summary };
    }

    if (!previewStarted && allowManualPreview && summary.total === 0 && performance.now() - start > 1200) {
      previewStarted = await testCameraPreview();
    }

    await delay(250);
  }

  stopCameraPreview();
  const finalSummary = debugVideoState('video-timeout');
  return { ready: false, summary: finalSummary };
}

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
  sceneEl.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false;');
  sceneEl.setAttribute('renderer', 'logarithmicDepthBuffer: true; precision: mediump; alpha: true; antialias: true;');
  sceneEl.setAttribute('vr-mode-ui', 'enabled: false');

  // Marker
  const marker = document.createElement('a-marker');
  marker.setAttribute('preset', 'hiro');
  marker.setAttribute('smooth', 'true');
  marker.setAttribute('smoothCount', '5');
  marker.setAttribute('smoothTolerance', '0.01');
  marker.setAttribute('smoothThreshold', '2');

  // ===== Lighting =====
  // Ambient light — terang merata, cukup tinggi agar planet tidak gelap
  const ambientLight = document.createElement('a-light');
  ambientLight.setAttribute('type', 'ambient');
  ambientLight.setAttribute('color', '#FFF');
  ambientLight.setAttribute('intensity', '1.8');
  marker.appendChild(ambientLight);

  // Directional light — beri dimensi
  const dirLight = document.createElement('a-light');
  dirLight.setAttribute('type', 'directional');
  dirLight.setAttribute('color', '#FFF8E7');
  dirLight.setAttribute('intensity', '0.8');
  dirLight.setAttribute('position', '1 2 1');
  marker.appendChild(dirLight);

  // Secondary directional light dari bawah — kurangi shadow gelap
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
    fixCameraVideoElement();
    debugVideoState('scene-loaded');
    setTimeout(() => { onProgress?.('scene-ready'); }, 800);
  });
}

/**
 * Fix camera video element to fill the entire viewport on all devices
 * AR.js creates a <video> element — we need to ensure it covers the full screen
 */
function fixCameraVideoElement(): void {
  // AR.js inserts a video element — fix its styling
  const fixVideo = () => {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      video.style.position = 'fixed';
      video.style.inset = '0';
      video.style.width = '100vw';
      video.style.height = '100vh';
      video.style.objectFit = 'cover';
      video.style.zIndex = '51';
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

  // Fix immediately and also watch for late-arriving video elements
  fixVideo();
  setTimeout(fixVideo, 500);
  setTimeout(fixVideo, 1500);
  setTimeout(fixVideo, 3000);

  // MutationObserver to catch dynamically added video elements
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes as any) {
        if (node instanceof HTMLVideoElement || (node instanceof HTMLElement && node.querySelector?.('video'))) {
          fixVideo();
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Store observer ref for cleanup
  (window as any).__arVideoObserver = observer;
}

/**
 * Build Sun entity
 */
function buildSun(parent: HTMLElement): void {
  const baseUrl = getTextureBaseUrl();
  const sun = document.createElement('a-sphere');
  sun.setAttribute('id', 'planet-sun');
  sun.setAttribute('radius', String(sunData.radius));
  sun.setAttribute('position', '0 0 0');
  sun.setAttribute('self-rotation', `speed: 10; paused: ${isPaused}`);

  // Shader flat + bright color agar matahari menyala terang
  const sunMaterial = `color: ${sunData.color}; shader: flat;`;
  sun.setAttribute('material', sunMaterial);
  tryLoadTexture(sun, baseUrl + sunData.texturePath, sunData.color, 'sun');

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
  const baseUrl = getTextureBaseUrl();
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

  // Shader flat agar planet terlihat cerah di AR
  const planetMaterial = `color: ${planet.color}; shader: flat;`;
  sphere.setAttribute('material', planetMaterial);
  tryLoadTexture(sphere, baseUrl + planet.texturePath, planet.color, planet.id);

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
    tryLoadRingTexture(ring, baseUrl);
    pivot.appendChild(ring);
  }

  group.appendChild(pivot);
  parent.appendChild(group);
}

/**
 * Load texture — always use shader:flat for brightness in AR
 * Uses absolute URL and stores original material for safe highlight/clear
 */
function tryLoadTexture(el: HTMLElement, absolutePath: string, fallbackColor: string, planetId: string): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const mat = `src: url(${absolutePath}); shader: flat;`;
    el.setAttribute('material', mat);
    originalMaterials.set(planetId, mat);
  };
  img.onerror = () => {
    console.warn(`Texture not found: ${absolutePath}, using fallback color: ${fallbackColor}`);
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
 * Highlight planet — adds a subtle glow without destroying the texture
 * We no longer set emissive on shader:flat materials (which doesn't work properly)
 * Instead, we scale the planet up slightly for visual feedback
 */
export function highlightPlanet(planetId: string): void {
  if (!sceneEl) return;
  clearHighlight();
  highlightedPlanetId = planetId;

  const planetEl = sceneEl.querySelector(`#planet-${planetId}`) as any;
  if (planetEl) {
    // Visual feedback: scale the planet up by 25% 
    const currentRadius = parseFloat(planetEl.getAttribute('radius') || '0.1');
    planetEl.setAttribute('data-original-radius', String(currentRadius));
    planetEl.setAttribute('radius', String(currentRadius * 1.25));
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

  // Restore planet original radius
  sceneEl.querySelectorAll('.planet-entity').forEach((el: any) => {
    const origRadius = el.getAttribute('data-original-radius');
    if (origRadius) {
      el.setAttribute('radius', origRadius);
      el.removeAttribute('data-original-radius');
    }
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
  // Stop MutationObserver
  try {
    const observer = (window as any).__arVideoObserver;
    if (observer) {
      observer.disconnect();
      (window as any).__arVideoObserver = null;
    }
  } catch (_e) { /* ignore */ }

  stopCameraPreview();

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
  originalMaterials.clear();
}
