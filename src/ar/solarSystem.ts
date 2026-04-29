/**
 * Solar System Builder v6
 *
 * GLB model support:
 * - solar_system.glb for main solar system mode
 * - Individual planet GLB for focus mode
 * - Fallback to procedural spheres if GLB fails
 * - Device-aware scaling
 * - Focus/Solar system mode switching
 */

import {
  planets, sunData, type Planet,
  solarSystemConfig, getPlanetById,
  getSolarSystemModelScale, getFocusPlanetScale,
  getDeviceProfile, getSolarSystemTargetSize,
  getFocusPlanetTargetSize, getPlanetFocusTargetSize,
  getSolarSystemModelPosition, getFocusPlanetModelPosition,
} from '../data/planets';
import { registerAllComponents } from './aframeComponents';

declare const AFRAME: any;

export type ProgressCallback = (step: string) => void;
export type PlanetTapCallback = (planetId: string) => void;
export type ModeChangeCallback = (mode: 'solar-system' | 'focus', planetId?: string) => void;

let onPlanetTap: PlanetTapCallback | null = null;
let onModeChange: ModeChangeCallback | null = null;

let isPaused = false;
let currentMode: 'solar-system' | 'focus' = 'solar-system';
let focusedPlanetId: string | null = null;
let solarSystemModelRoot: HTMLElement | null = null;
let focusPlanetRoot: HTMLElement | null = null;
let proceduralRoot: HTMLElement | null = null;
let sceneEl: HTMLElement | null = null;
let markerEl: HTMLElement | null = null;
let markerFoundCount = 0;
let markerLostCount = 0;
let markerVisible = false;
let usingSolarSystemGLB = false;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetZ = 0;
let offsetX = 0;
let offsetY = 0;
let offsetZ = 0;

const loadedModels: Set<string> = new Set();
const textureCache: Map<string, any> = new Map();

type AutoModelScaleOptions = {
  targetSize: number;
  multiplier: number;
  fallbackScale: number;
  modelName: string;
  minScale?: number;
  maxScale?: number;
  centerModel?: boolean;
};

function isDebugEnabled(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || new URLSearchParams(window.location.search).has('debug');
}

function debugLog(...args: unknown[]): void {
  if (isDebugEnabled()) console.log('[AR]', ...args);
}

function getViewportSize(): { width: number; height: number } {
  const vv = window.visualViewport;
  const width = Math.ceil(Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0,
    vv?.width || 0
  ));
  const height = Math.ceil(Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0,
    vv?.height || 0
  ));

  return { width, height };
}

function getThree(): any {
  return AFRAME?.THREE || (window as any).THREE;
}

function resolvePublicAssetPath(assetPath: string): string {
  if (assetPath.startsWith('http') || assetPath.startsWith('/')) return assetPath;
  return `${getTextureBaseUrl()}${assetPath}`;
}

function getCachedTexture(assetPath: string): any | null {
  const THREE = getThree();
  if (!THREE?.TextureLoader) return null;

  const url = resolvePublicAssetPath(assetPath);
  const cached = textureCache.get(url);
  if (cached) return cached;

  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';
  const texture = loader.load(
    url,
    () => debugLog('Texture recovery loaded', url),
    undefined,
    () => console.warn('[AR] Failed to recover texture:', url)
  );

  texture.flipY = false;
  if ('colorSpace' in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if ('encoding' in texture && THREE.sRGBEncoding) {
    texture.encoding = THREE.sRGBEncoding;
  }

  textureCache.set(url, texture);
  return texture;
}

function buildAutoModelScaleAttribute(options: AutoModelScaleOptions): string {
  const minScale = options.minScale ?? 0.02;
  const maxScale = options.maxScale ?? 1.2;
  const centerModel = options.centerModel ?? true;

  return [
    `targetSize: ${options.targetSize}`,
    `multiplier: ${options.multiplier}`,
    `minScale: ${minScale}`,
    `maxScale: ${maxScale}`,
    `centerModel: ${centerModel}`,
    `fallbackScale: ${options.fallbackScale}`,
    `modelName: ${options.modelName}`,
  ].join('; ');
}

function setAutoModelScale(el: HTMLElement, options: AutoModelScaleOptions): void {
  const value = buildAutoModelScaleAttribute(options);
  if (el.dataset.autoModelScale === value) return;

  el.dataset.autoModelScale = value;
  el.setAttribute('auto-model-scale', value);
}

function getMaterials(material: any): any[] {
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

function materialHasTexture(material: any): boolean {
  return getMaterials(material).some((entry) => !!entry?.map);
}

function isFlatRingMesh(mesh: any): boolean {
  const THREE = getThree();
  const geometry = mesh?.geometry;
  if (!THREE?.Vector3 || !geometry) return false;

  if (!geometry.boundingBox) geometry.computeBoundingBox?.();
  const box = geometry.boundingBox;
  if (!box) return false;

  const size = new THREE.Vector3();
  box.getSize(size);
  const dims = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)].sort((a, b) => a - b);
  return dims[0] <= Math.max(dims[2] * 0.04, 0.01);
}

function applyRecoveredTexture(mesh: any, texture: any, planet: Planet, isRing: boolean): void {
  const THREE = getThree();
  getMaterials(mesh.material).forEach((material) => {
    if (!material) return;
    material.map = texture;
    if (material.color && THREE?.Color) material.color = new THREE.Color('#ffffff');
    if ('metalness' in material) material.metalness = 0;
    if ('roughness' in material) material.roughness = isRing ? 0.7 : 1;
    if (THREE?.DoubleSide) material.side = THREE.DoubleSide;
    if (isRing) {
      material.transparent = true;
      material.alphaTest = 0.12;
    }
    material.needsUpdate = true;
  });

  if (isDebugEnabled()) {
    debugLog('Recovered GLB material texture', {
      planet: planet.id,
      mesh: mesh.name || 'mesh',
      texture: isRing ? planet.ringTexturePath : planet.texturePath,
    });
  }
}

function normalizeModelMaterials(root: any): void {
  const THREE = getThree();
  root?.traverse?.((child: any) => {
    if (!child?.isMesh) return;
    child.frustumCulled = false;

    getMaterials(child.material).forEach((material) => {
      if (!material) return;
      if (material.color && THREE?.Color) material.color = new THREE.Color('#ffffff');
      if ('metalness' in material) material.metalness = 0;
      if ('roughness' in material) material.roughness = Math.max(material.roughness ?? 0.8, 0.8);
      if (THREE?.DoubleSide) material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    });
  });
}

function recoverPlanetModelMaterials(root: any, planet: Planet): void {
  normalizeModelMaterials(root);

  const planetTexture = getCachedTexture(planet.texturePath);
  const ringTexture = planet.ringTexturePath ? getCachedTexture(planet.ringTexturePath) : null;
  if (!planetTexture && !ringTexture) return;

  root?.traverse?.((child: any) => {
    if (!child?.isMesh || materialHasTexture(child.material)) return;
    const useRingTexture = !!ringTexture && isFlatRingMesh(child);
    const texture = useRingTexture ? ringTexture : planetTexture;
    if (texture) applyRecoveredTexture(child, texture, planet, useRingTexture);
  });
}

// ===== Adopt AR.js video into container =====

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
  for (const v of videos) { if (v.srcObject) return v; }
  return videos[0] || null;
}

// ===== Debug panel =====

export function updateDebugPanel(): void {
  if (!isDebugEnabled()) return;
  const debugBody = document.getElementById('debug-body');
  const debugPanel = document.getElementById('debug-panel');
  if (!debugBody || !debugPanel) return;
  debugPanel.classList.remove('hidden');

  const arVideo = getARVideoElement();
  const viewport = getViewportSize();
  const rows: { label: string; value: string }[] = [
    { label: 'Mode', value: currentMode },
    { label: 'Focus', value: focusedPlanetId || 'none' },
    { label: 'GLB', value: usingSolarSystemGLB ? 'yes' : 'fallback' },
    { label: 'Device', value: getDeviceProfile() },
    { label: 'SolarT', value: getSolarSystemTargetSize().toFixed(2) },
    { label: 'FocusT', value: getFocusPlanetTargetSize().toFixed(2) },
    { label: 'MrkVis', value: String(markerVisible) },
    { label: 'MrkFound', value: String(markerFoundCount) },
    { label: 'Videos', value: String(document.querySelectorAll('video').length) },
    { label: 'AR Vid', value: arVideo ? `${arVideo.videoWidth}x${arVideo.videoHeight}` : 'none' },
    { label: 'Viewport', value: `${viewport.width}x${viewport.height}` },
  ];

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

export type VideoReadyResult = { ready: boolean; videoWidth: number; videoHeight: number; trackState: string };

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
  return { ready: false, videoWidth: v?.videoWidth ?? 0, videoHeight: v?.videoHeight ?? 0, trackState: v?.srcObject ? (v.srcObject as MediaStream).getVideoTracks().map((t) => t.readyState).join(',') : 'none' };
}

export function onPlanetTapEvent(cb: PlanetTapCallback): void { onPlanetTap = cb; }
export function onModeChangeEvent(cb: ModeChangeCallback): void { onModeChange = cb; }

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
  document.documentElement.classList.add('ar-active');
  document.body.classList.add('ar-active');
  updateViewportSize();
  window.addEventListener('resize', updateViewportSize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportSize);
  }

  await loadScript('https://aframe.io/releases/1.6.0/aframe.min.js');
  onProgress?.('aframe-loaded');
  await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js');
  onProgress?.('arjs-loaded');
  registerAllComponents();
  buildScene(onProgress);
}

// ===== Viewport =====

function updateViewportSize(): void {
  const { width, height } = getViewportSize();
  document.documentElement.style.setProperty('--app-width', `${width}px`);
  document.documentElement.style.setProperty('--app-height', `${height}px`);
  fitARSurfaceElements(width, height);
  refreshSceneDeviceLayout();
}

function fitARSurfaceElements(width = getViewportSize().width, height = getViewportSize().height): void {
  const sizeStyles = {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: `${width}px`,
    height: `${height}px`,
  };

  const applySize = (el: HTMLElement) => {
    Object.entries(sizeStyles).forEach(([property, value]) => {
      el.style.setProperty(property, value, 'important');
    });
  };

  const container = document.getElementById('ar-scene-container');
  if (container) applySize(container);
  document.querySelectorAll<HTMLElement>('#ar-scene-container a-scene, #ar-scene-container canvas.a-canvas, #ar-scene-container video')
    .forEach(applySize);
}

function refreshSceneDeviceLayout(): void {
  const solarPos = getSolarSystemModelPosition();
  const focusPos = getFocusPlanetModelPosition();
  const ssScale = getSolarSystemModelScale();

  if (solarSystemModelRoot) solarSystemModelRoot.setAttribute('position', solarPos);
  if (focusPlanetRoot) focusPlanetRoot.setAttribute('position', focusPos);
  if (proceduralRoot) {
    proceduralRoot.setAttribute('position', solarPos);
    proceduralRoot.setAttribute('scale', `${ssScale} ${ssScale} ${ssScale}`);
  }

  const solarGlb = document.getElementById('solar-system-glb');
  if (solarGlb) {
    setAutoModelScale(solarGlb, {
      targetSize: getSolarSystemTargetSize(),
      multiplier: 1,
      fallbackScale: getSolarSystemModelScale(),
      modelName: 'solar_system',
    });
  }

  const focusGlb = document.getElementById('focus-planet-glb');
  if (focusGlb && focusedPlanetId) {
    const planet = getPlanetById(focusedPlanetId);
    if (planet) {
      setAutoModelScale(focusGlb, {
        targetSize: getFocusPlanetTargetSize(),
        multiplier: planet.focusTargetSizeMultiplier ?? 1,
        fallbackScale: getFocusPlanetScale(planet.id),
        modelName: planet.id,
      });
    }
  }
}

// ===== Build Scene =====

function buildScene(onProgress?: ProgressCallback): void {
  const container = document.getElementById('ar-scene-container');
  if (!container) return;
  container.innerHTML = '';

  sceneEl = document.createElement('a-scene');
  sceneEl.setAttribute('embedded', '');
  const viewport = getViewportSize();
  sceneEl.setAttribute(
    'arjs',
    `sourceType: webcam; trackingMethod: best; debugUIEnabled: false; sourceWidth: ${viewport.width}; sourceHeight: ${viewport.height}; displayWidth: ${viewport.width}; displayHeight: ${viewport.height};`
  );
  sceneEl.setAttribute('renderer', 'logarithmicDepthBuffer: true; precision: mediump; alpha: true; antialias: true;');
  sceneEl.setAttribute('vr-mode-ui', 'enabled: false');

  markerEl = document.createElement('a-marker');
  markerEl.setAttribute('preset', 'hiro');
  markerEl.setAttribute('smooth', 'true');
  markerEl.setAttribute('smoothCount', '5');
  markerEl.setAttribute('smoothTolerance', '0.01');
  markerEl.setAttribute('smoothThreshold', '2');

  markerEl.addEventListener('markerFound', () => {
    markerFoundCount++; markerVisible = true;
    debugLog('markerFound', markerFoundCount);
    updateDebugPanel();
    updateMarkerStatus(true);
  });
  markerEl.addEventListener('markerLost', () => {
    markerLostCount++; markerVisible = false;
    debugLog('markerLost', markerLostCount);
    updateDebugPanel();
    updateMarkerStatus(false);
  });

  // Lights
  const al = document.createElement('a-light');
  al.setAttribute('type', 'ambient'); al.setAttribute('color', '#FFF'); al.setAttribute('intensity', '1.8');
  markerEl.appendChild(al);
  const dl = document.createElement('a-light');
  dl.setAttribute('type', 'directional'); dl.setAttribute('color', '#FFF8E7');
  dl.setAttribute('intensity', '0.8'); dl.setAttribute('position', '1 2 1');
  markerEl.appendChild(dl);
  const dl2 = document.createElement('a-light');
  dl2.setAttribute('type', 'directional'); dl2.setAttribute('color', '#E8E0FF');
  dl2.setAttribute('intensity', '0.4'); dl2.setAttribute('position', '-1 -1 -1');
  markerEl.appendChild(dl2);

  // Solar System Model Root (GLB mode)
  const solarPos = getSolarSystemModelPosition();
  const focusPos = getFocusPlanetModelPosition();
  const ssScale = getSolarSystemModelScale();
  solarSystemModelRoot = document.createElement('a-entity');
  solarSystemModelRoot.setAttribute('id', 'solar-system-model-root');
  solarSystemModelRoot.setAttribute('position', solarPos);
  solarSystemModelRoot.setAttribute('scale', '1 1 1');
  solarSystemModelRoot.setAttribute('visible', 'true');
  markerEl.appendChild(solarSystemModelRoot);

  // Focus Planet Root
  focusPlanetRoot = document.createElement('a-entity');
  focusPlanetRoot.setAttribute('id', 'focus-planet-root');
  focusPlanetRoot.setAttribute('position', focusPos);
  focusPlanetRoot.setAttribute('scale', '1 1 1');
  focusPlanetRoot.setAttribute('visible', 'false');
  markerEl.appendChild(focusPlanetRoot);

  // Procedural Root (fallback)
  proceduralRoot = document.createElement('a-entity');
  proceduralRoot.setAttribute('id', 'procedural-root');
  proceduralRoot.setAttribute('position', solarPos);
  proceduralRoot.setAttribute('visible', 'false');
  proceduralRoot.setAttribute('scale', `${ssScale} ${ssScale} ${ssScale}`);
  markerEl.appendChild(proceduralRoot);

  // Build procedural fallback (hidden by default)
  buildProceduralSolarSystem(proceduralRoot);

  // Load solar_system.glb
  loadSolarSystemGLB();

  sceneEl.appendChild(markerEl);

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

function loadSolarSystemGLB(): void {
  if (!solarSystemModelRoot) return;

  const targetSize = getSolarSystemTargetSize();
  const fallbackScale = getSolarSystemModelScale();
  const glbEntity = document.createElement('a-entity');
  glbEntity.setAttribute('id', 'solar-system-glb');
  glbEntity.setAttribute('gltf-model', `url(${solarSystemConfig.modelPath})`);
  setAutoModelScale(glbEntity, {
    targetSize,
    multiplier: 1,
    fallbackScale,
    modelName: 'solar_system',
  });
  glbEntity.setAttribute('self-rotation', `speed: 2; paused: ${isPaused}; baseY: 90`);

  glbEntity.addEventListener('model-loaded', () => {
    debugLog('solar_system.glb loaded', { targetSize, fallbackScale });
    normalizeModelMaterials((glbEntity as any).getObject3D('mesh'));
    usingSolarSystemGLB = true;
    if (proceduralRoot) proceduralRoot.setAttribute('visible', 'false');
    if (solarSystemModelRoot) solarSystemModelRoot.setAttribute('visible', 'true');
    updateDebugPanel();
  });

  glbEntity.addEventListener('model-error', () => {
    console.warn('[AR] solar_system.glb failed, using fallback');
    usingSolarSystemGLB = false;
    if (solarSystemModelRoot) solarSystemModelRoot.setAttribute('visible', 'false');
    if (proceduralRoot) proceduralRoot.setAttribute('visible', 'true');
    updateDebugPanel();
  });

  solarSystemModelRoot.appendChild(glbEntity);
}

// ===== Procedural Fallback =====

function buildProceduralSolarSystem(parent: HTMLElement): void {
  const baseUrl = getTextureBaseUrl();
  // Sun
  const sun = document.createElement('a-sphere');
  sun.setAttribute('radius', String(sunData.radius));
  sun.setAttribute('position', '0 0 0');
  sun.setAttribute('self-rotation', `speed: 10; paused: ${isPaused}`);
  sun.setAttribute('material', `color: ${sunData.color}; shader: flat;`);
  tryLoadTexture(sun, baseUrl + sunData.texturePath, sunData.color);
  const light = document.createElement('a-light');
  light.setAttribute('type', 'point'); light.setAttribute('intensity', '0.5');
  light.setAttribute('distance', '6'); light.setAttribute('color', '#FFF8E7');
  sun.appendChild(light);
  parent.appendChild(sun);

  planets.forEach((p) => buildProceduralPlanet(parent, p, baseUrl));
}

function buildProceduralPlanet(parent: HTMLElement, planet: Planet, baseUrl: string): void {
  const group = document.createElement('a-entity');
  const orbitPath = document.createElement('a-ring');
  orbitPath.setAttribute('radius-inner', String(planet.orbitRadius - 0.003));
  orbitPath.setAttribute('radius-outer', String(planet.orbitRadius + 0.003));
  orbitPath.setAttribute('color', '#FFFFFF'); orbitPath.setAttribute('opacity', '0.1');
  orbitPath.setAttribute('rotation', '-90 0 0'); orbitPath.setAttribute('segments-theta', '64');
  orbitPath.setAttribute('material', 'side: double; transparent: true; shader: flat;');
  group.appendChild(orbitPath);

  const pivot = document.createElement('a-entity');
  pivot.setAttribute('orbit-rotation', `speed: ${planet.orbitSpeed * 40}; paused: ${isPaused}`);
  const sphere = document.createElement('a-sphere');
  sphere.setAttribute('class', 'clickable-planet');
  sphere.setAttribute('data-planet-id', planet.id);
  sphere.setAttribute('radius', String(planet.radius));
  sphere.setAttribute('position', `${planet.orbitRadius} 0 0`);
  sphere.setAttribute('self-rotation', `speed: ${planet.rotationSpeed * 50}; paused: ${isPaused}`);
  sphere.setAttribute('material', `color: ${planet.color}; shader: flat;`);
  tryLoadTexture(sphere, baseUrl + planet.texturePath, planet.color);
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
    pivot.appendChild(ring);
  }

  group.appendChild(pivot);
  parent.appendChild(group);
}

function tryLoadTexture(el: HTMLElement, path: string, fallback: string): void {
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => el.setAttribute('material', `src: url(${path}); shader: flat;`);
  img.onerror = () => el.setAttribute('material', `color: ${fallback}; shader: flat;`);
  img.src = path;
}

// ===== FASE 4 — Focus Mode =====

export function enterSolarSystemMode(): void {
  currentMode = 'solar-system';
  focusedPlanetId = null;
  clearFocusPlanet();

  if (focusPlanetRoot) focusPlanetRoot.setAttribute('visible', 'false');

  if (usingSolarSystemGLB) {
    if (solarSystemModelRoot) solarSystemModelRoot.setAttribute('visible', 'true');
    if (proceduralRoot) proceduralRoot.setAttribute('visible', 'false');
  } else {
    if (solarSystemModelRoot) solarSystemModelRoot.setAttribute('visible', 'false');
    if (proceduralRoot) proceduralRoot.setAttribute('visible', 'true');
  }

  onModeChange?.('solar-system');
  updateDebugPanel();
  debugLog('Entered solar-system mode');
}

export function enterFocusMode(planetId: string): void {
  const planet = getPlanetById(planetId);
  if (!planet) return;

  currentMode = 'focus';
  focusedPlanetId = planetId;

  // Hide solar system
  if (solarSystemModelRoot) solarSystemModelRoot.setAttribute('visible', 'false');
  if (proceduralRoot) proceduralRoot.setAttribute('visible', 'false');

  // Show focus root
  if (focusPlanetRoot) focusPlanetRoot.setAttribute('visible', 'true');

  updateFocusPlanet(planetId);
  onModeChange?.('focus', planetId);
  updateDebugPanel();
  debugLog('Entered focus mode:', planetId);
}

export function updateFocusPlanet(planetId: string): void {
  const planet = getPlanetById(planetId);
  if (!planet || !focusPlanetRoot) return;

  clearFocusPlanet();
  focusedPlanetId = planetId;

  const fallbackScale = getFocusPlanetScale(planetId);
  const focusTargetSize = getPlanetFocusTargetSize(planetId);
  const focusMultiplier = planet.focusTargetSizeMultiplier ?? 1;
  const wrapper = document.createElement('a-entity');
  wrapper.setAttribute('id', 'focus-planet-entity');
  wrapper.setAttribute('scale', '1 1 1');
  wrapper.setAttribute('position', planet.modelPositionOffset ?? '0 0 0');
  if (planet.modelRotationOffset) {
    wrapper.setAttribute('rotation', planet.modelRotationOffset);
  }

  // Try loading GLB
  const glbEntity = document.createElement('a-entity');
  glbEntity.setAttribute('id', 'focus-planet-glb');
  glbEntity.setAttribute('gltf-model', `url(${planet.modelPath})`);
  glbEntity.setAttribute('class', 'clickable-planet');
  setAutoModelScale(glbEntity, {
    targetSize: getFocusPlanetTargetSize(),
    multiplier: focusMultiplier,
    fallbackScale,
    modelName: planet.id,
  });
  glbEntity.setAttribute('self-rotation', `speed: 25; paused: ${isPaused}`);

  glbEntity.addEventListener('model-loaded', () => {
    debugLog(`${planet.id}.glb loaded for focus`, { focusTargetSize, fallbackScale });
    recoverPlanetModelMaterials((glbEntity as any).getObject3D('mesh'), planet);
    loadedModels.add(planet.id);
  });

  glbEntity.addEventListener('model-error', () => {
    console.warn(`[AR] ${planet.id}.glb failed, using fallback sphere`);
    // Remove failed glb entity
    glbEntity.remove();
    // Add fallback sphere
    const fallback = document.createElement('a-sphere');
    fallback.setAttribute('id', 'focus-planet-fallback');
    fallback.setAttribute('radius', String(Math.max(focusTargetSize * 0.5, 0.08)));
    fallback.setAttribute('color', planet.fallbackColor);
    fallback.setAttribute('material', `color: ${planet.fallbackColor}; shader: flat;`);
    fallback.setAttribute('self-rotation', `speed: 25; paused: ${isPaused}`);
    wrapper.appendChild(fallback);
  });

  wrapper.appendChild(glbEntity);
  focusPlanetRoot.appendChild(wrapper);
}

export function clearFocusPlanet(): void {
  if (!focusPlanetRoot) return;
  while (focusPlanetRoot.firstChild) {
    focusPlanetRoot.removeChild(focusPlanetRoot.firstChild);
  }
}

export function exitFocusMode(): void {
  enterSolarSystemMode();
}

export function resetView(): void {
  if (currentMode === 'focus') {
    enterSolarSystemMode();
  }
  isPaused = false;
  updatePauseState();
}

export function getCurrentMode(): 'solar-system' | 'focus' { return currentMode; }
export function getFocusedPlanetId(): string | null { return focusedPlanetId; }

// ===== Renderer / Video =====

function forceTransparentRenderer(): void {
  if (!sceneEl) return;
  const renderer = (sceneEl as any).renderer;
  if (renderer) { renderer.setClearColor(0x000000, 0); renderer.autoClear = true; }
  fitARSurfaceElements();
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

function fixCameraVideoElement(): void {
  const apply = () => {
    const container = document.getElementById('ar-scene-container');
    if (!container) return;
    const { width, height } = getViewportSize();
    adoptARVideo();
    fitARSurfaceElements(width, height);
    container.querySelectorAll('video').forEach((video) => {
      video.style.setProperty('position', 'absolute', 'important');
      video.style.setProperty('inset', '0', 'important');
      video.style.setProperty('width', `${width}px`, 'important');
      video.style.setProperty('height', `${height}px`, 'important');
      video.style.setProperty('min-width', '100vw', 'important');
      video.style.setProperty('min-height', '100dvh', 'important');
      video.style.setProperty('object-fit', 'cover', 'important');
      video.style.setProperty('object-position', 'center center', 'important');
      video.style.setProperty('z-index', '1', 'important');
      video.style.setProperty('display', 'block', 'important');
      video.style.setProperty('opacity', '1', 'important');
      video.style.setProperty('visibility', 'visible', 'important');
      video.style.setProperty('background', 'transparent', 'important');
      video.style.setProperty('transform', 'none', 'important');
      video.style.setProperty('-webkit-transform', 'none', 'important');
      video.style.setProperty('pointer-events', 'none', 'important');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;
      if (video.srcObject && video.paused) video.play().catch(() => undefined);
    });
  };
  apply();
  setTimeout(apply, 500); setTimeout(apply, 1500); setTimeout(apply, 3000);

  if (!(window as any).__arVideoObserver) {
    const observer = new MutationObserver(() => { adoptARVideo(); apply(); forceTransparentRenderer(); });
    observer.observe(document.body, { childList: true, subtree: true });
    (window as any).__arVideoObserver = observer;
  }
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
}

function onTouchEnd(): void { isDragging = false; }

// ===== Controls =====

export function togglePause(): boolean { isPaused = !isPaused; updatePauseState(); return isPaused; }

function updatePauseState(): void {
  if (!sceneEl) return;
  sceneEl.querySelectorAll('[orbit-rotation]').forEach((el: any) => el.setAttribute('orbit-rotation', 'paused', isPaused));
  sceneEl.querySelectorAll('[self-rotation]').forEach((el: any) => el.setAttribute('self-rotation', 'paused', isPaused));
}

export function zoomIn(): void {
  const root = currentMode === 'focus' ? focusPlanetRoot : (usingSolarSystemGLB ? solarSystemModelRoot : proceduralRoot);
  if (!root) return;
  const s = (root as any).object3D?.scale;
  if (s) { const ns = Math.min(s.x * 1.2, 3); root.setAttribute('scale', `${ns} ${ns} ${ns}`); }
}

export function zoomOut(): void {
  const root = currentMode === 'focus' ? focusPlanetRoot : (usingSolarSystemGLB ? solarSystemModelRoot : proceduralRoot);
  if (!root) return;
  const s = (root as any).object3D?.scale;
  if (s) { const ns = Math.max(s.x * 0.8, 0.05); root.setAttribute('scale', `${ns} ${ns} ${ns}`); }
}

// ===== Destroy =====

export function destroyScene(): void {
  debugLog('destroyScene: start');

  try { const obs = (window as any).__arVideoObserver; if (obs) { obs.disconnect(); (window as any).__arVideoObserver = null; } } catch (_) { /* */ }

  document.querySelectorAll('video').forEach((video) => {
    try {
      const stream = (video as HTMLVideoElement).srcObject as MediaStream;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      (video as HTMLVideoElement).srcObject = null;
      video.remove();
    } catch (_) { /* */ }
  });

  const canvas = document.querySelector('canvas.a-canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  }

  if (sceneEl) {
    try { (sceneEl as any).renderer?.dispose?.(); } catch (_) { /* */ }
    sceneEl.remove();
  }

  document.querySelectorAll('a-scene').forEach((s) => s.remove());
  document.querySelectorAll('canvas.a-canvas').forEach((c) => c.remove());

  const container = document.getElementById('ar-scene-container');
  if (container) container.innerHTML = '';

  // Remove viewport listener
  window.removeEventListener('resize', updateViewportSize);
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', updateViewportSize);
  }

  document.documentElement.classList.remove('ar-active');
  document.body.classList.remove('ar-active');
  document.documentElement.style.removeProperty('--app-width');
  document.documentElement.style.removeProperty('--app-height');

  sceneEl = null; markerEl = null;
  solarSystemModelRoot = null; focusPlanetRoot = null; proceduralRoot = null;
  isPaused = false; currentMode = 'solar-system';
  focusedPlanetId = null; onPlanetTap = null; onModeChange = null;
  usingSolarSystemGLB = false; loadedModels.clear();
  markerFoundCount = 0; markerLostCount = 0; markerVisible = false;
  offsetX = 0; offsetY = 0; offsetZ = 0;

  debugLog('destroyScene: done');
}
