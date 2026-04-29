/**
 * Custom A-Frame Components
 * 
 * Components:
 * - orbit-rotation: Rotasi orbit planet di sumbu Y
 * - self-rotation: Rotasi planet pada poros sendiri
 * - smooth-transform: Animasi smooth posisi + scale (untuk focus)
 * - auto-model-scale: Normalisasi ukuran GLB berdasarkan bounding box
 */

declare const AFRAME: any;

type ScaleVector = {
  x: number;
  y: number;
  z: number;
};

function isDebugEnabled(): boolean {
  const host = window.location.hostname;
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '[::1]'
    || new URLSearchParams(window.location.search).has('debug');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatScale(scale: ScaleVector): string {
  return `${scale.x.toFixed(4)} ${scale.y.toFixed(4)} ${scale.z.toFixed(4)}`;
}

/**
 * Component: orbit-rotation
 */
export function registerOrbitRotation(): void {
  if (AFRAME.components['orbit-rotation']) return;

  AFRAME.registerComponent('orbit-rotation', {
    schema: {
      speed: { type: 'number', default: 30 },
      paused: { type: 'boolean', default: false },
    },

    init: function () {
      this.angle = Math.random() * 360;
    },

    tick: function (_time: number, delta: number) {
      if (this.data.paused) return;
      const dt = delta / 1000;
      this.angle += this.data.speed * dt;
      this.el.object3D.rotation.y = (this.angle * Math.PI) / 180;
    },
  });
}

/**
 * Component: self-rotation
 */
export function registerSelfRotation(): void {
  if (AFRAME.components['self-rotation']) return;

  AFRAME.registerComponent('self-rotation', {
    schema: {
      speed: { type: 'number', default: 50 },
      paused: { type: 'boolean', default: false },
      baseX: { type: 'number', default: 0 },
      baseY: { type: 'number', default: 0 },
      baseZ: { type: 'number', default: 0 },
    },

    init: function () {
      this.angle = 0;
    },

    tick: function (_time: number, delta: number) {
      if (this.data.paused) return;
      const dt = delta / 1000;
      this.angle += this.data.speed * dt;
      this.el.object3D.rotation.x = (this.data.baseX * Math.PI) / 180;
      this.el.object3D.rotation.y = ((this.data.baseY + this.angle) * Math.PI) / 180;
      this.el.object3D.rotation.z = (this.data.baseZ * Math.PI) / 180;
    },
  });
}

/**
 * Component: smooth-transform
 * 
 * Animasi lerp posisi dan scale menuju target.
 * Digunakan untuk smooth focus/zoom ke planet.
 */
export function registerSmoothTransform(): void {
  if (AFRAME.components['smooth-transform']) return;

  AFRAME.registerComponent('smooth-transform', {
    schema: {
      targetX: { type: 'number', default: 0 },
      targetY: { type: 'number', default: 0 },
      targetZ: { type: 'number', default: 0 },
      targetScale: { type: 'number', default: 1 },
      lerpSpeed: { type: 'number', default: 4 },
      active: { type: 'boolean', default: false },
    },

    tick: function (_time: number, delta: number) {
      if (!this.data.active) return;
      const dt = Math.min(delta / 1000, 0.05); // cap dt
      const speed = this.data.lerpSpeed * dt;
      const pos = this.el.object3D.position;
      const scl = this.el.object3D.scale;

      pos.x += (this.data.targetX - pos.x) * speed;
      pos.y += (this.data.targetY - pos.y) * speed;
      pos.z += (this.data.targetZ - pos.z) * speed;

      const ts = this.data.targetScale;
      scl.x += (ts - scl.x) * speed;
      scl.y += (ts - scl.y) * speed;
      scl.z += (ts - scl.z) * speed;
    },
  });
}

/**
 * Component: auto-model-scale
 *
 * Normalisasi ukuran GLB agar max dimension cocok dengan targetSize A-Frame.
 * Log detail hanya muncul di localhost atau saat URL memiliki ?debug.
 */
export function registerAutoModelScale(): void {
  if (AFRAME.components['auto-model-scale']) return;

  AFRAME.registerComponent('auto-model-scale', {
    schema: {
      targetSize: { type: 'number', default: 1 },
      multiplier: { type: 'number', default: 1 },
      minScale: { type: 'number', default: 0.02 },
      maxScale: { type: 'number', default: 1.2 },
      centerModel: { type: 'boolean', default: true },
      fallbackScale: { type: 'number', default: 1 },
      modelName: { type: 'string', default: 'model' },
    },

    init: function () {
      this.attempts = 0;
      this.maxAttempts = 10;
      this.normalized = false;
      this.normalizeBound = () => {
        this.attempts = 0;
        this.normalized = false;
        this.tryNormalize();
      };
      this.el.addEventListener('model-loaded', this.normalizeBound);
      this.tryNormalize();
    },

    update: function (oldData: Record<string, unknown>) {
      if (oldData && Object.keys(oldData).length > 0) {
        this.normalized = false;
      }
      if (this.normalized) return;
      this.attempts = 0;
      this.tryNormalize();
    },

    remove: function () {
      this.el.removeEventListener('model-loaded', this.normalizeBound);
    },

    retry: function () {
      if (this.normalized) return;
      if (this.attempts >= this.maxAttempts) {
        this.applyFallbackScale('mesh-not-ready', false);
        return;
      }

      this.attempts += 1;
      window.setTimeout(() => this.tryNormalize(), 120);
    },

    tryNormalize: function () {
      if (this.normalized) return;

      const mesh = this.el.getObject3D('mesh');
      if (!mesh) {
        this.retry();
        return;
      }

      const THREE = AFRAME.THREE || (window as any).THREE;
      if (!THREE?.Box3 || !THREE?.Vector3) {
        this.retry();
        return;
      }

      try {
        mesh.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDimension = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
          this.applyFallbackScale('invalid-bounding-box');
          return;
        }

        const targetSize = this.data.targetSize * this.data.multiplier;
        const currentScale = this.el.object3D.scale.clone();
        const currentUniformScale = Math.max(currentScale.x, currentScale.y, currentScale.z) || 1;
        const normalizedScale = clamp(
          currentUniformScale * (targetSize / maxDimension),
          this.data.minScale,
          this.data.maxScale
        );

        if (this.data.centerModel) {
          const localCenter = center.clone();
          this.el.object3D.worldToLocal(localCenter);
          mesh.position.x -= localCenter.x;
          mesh.position.y -= localCenter.y;
          mesh.position.z -= localCenter.z;
          mesh.updateMatrixWorld(true);
        }

        this.el.object3D.scale.set(normalizedScale, normalizedScale, normalizedScale);
        this.el.setAttribute('scale', `${normalizedScale} ${normalizedScale} ${normalizedScale}`);
        this.normalized = true;

        if (isDebugEnabled()) {
          console.log('[AR][auto-model-scale]', {
            modelName: this.data.modelName,
            boundingBoxSize: {
              x: Number(size.x.toFixed(4)),
              y: Number(size.y.toFixed(4)),
              z: Number(size.z.toFixed(4)),
            },
            maxDimension: Number(maxDimension.toFixed(4)),
            currentScale: formatScale(currentScale),
            targetSize: Number(targetSize.toFixed(4)),
            normalizedScale: Number(normalizedScale.toFixed(4)),
          });
        }
      } catch (err) {
        this.applyFallbackScale(err instanceof Error ? err.message : 'unknown-error');
      }
    },

    applyFallbackScale: function (reason: string, lock = true) {
      const fallbackScale = clamp(
        this.data.fallbackScale,
        this.data.minScale,
        this.data.maxScale
      );

      this.el.object3D.scale.set(fallbackScale, fallbackScale, fallbackScale);
      this.el.setAttribute('scale', `${fallbackScale} ${fallbackScale} ${fallbackScale}`);
      this.normalized = lock;

      if (isDebugEnabled()) {
        console.warn('[AR][auto-model-scale] fallback scale applied', {
          modelName: this.data.modelName,
          reason,
          fallbackScale,
        });
      }
    },
  });
}

/**
 * Register semua custom components
 */
export function registerAllComponents(): void {
  registerOrbitRotation();
  registerSelfRotation();
  registerSmoothTransform();
  registerAutoModelScale();
}
