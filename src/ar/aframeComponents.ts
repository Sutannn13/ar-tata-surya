/**
 * Custom A-Frame Components
 * 
 * Components:
 * - orbit-rotation: Rotasi orbit planet di sumbu Y
 * - self-rotation: Rotasi planet pada poros sendiri
 * - smooth-transform: Animasi smooth posisi + scale (untuk focus)
 */

declare const AFRAME: any;

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
    },

    init: function () {
      this.angle = 0;
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
 * Register semua custom components
 */
export function registerAllComponents(): void {
  registerOrbitRotation();
  registerSelfRotation();
  registerSmoothTransform();
}
