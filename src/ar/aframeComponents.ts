/**
 * Custom A-Frame Components
 * 
 * File ini mendefinisikan custom component A-Frame yang digunakan
 * untuk mengontrol orbit dan rotasi planet di scene AR.
 */

declare const AFRAME: any;

/**
 * Component: orbit-rotation
 * 
 * Merotasi entity parent (pivot) di sumbu Y untuk mensimulasikan orbit.
 * Menggunakan delta time agar kecepatan konsisten di berbagai frame rate.
 * 
 * Schema:
 * - speed: kecepatan rotasi orbit (derajat per detik)
 * - paused: apakah orbit sedang di-pause
 */
export function registerOrbitRotation(): void {
  if (AFRAME.components['orbit-rotation']) return;

  AFRAME.registerComponent('orbit-rotation', {
    schema: {
      speed: { type: 'number', default: 30 },
      paused: { type: 'boolean', default: false },
    },

    init: function () {
      this.angle = Math.random() * 360; // random starting position
    },

    tick: function (_time: number, delta: number) {
      if (this.data.paused) return;
      const dt = delta / 1000; // convert ms to seconds
      this.angle += this.data.speed * dt;
      this.el.object3D.rotation.y = (this.angle * Math.PI) / 180;
    },
  });
}

/**
 * Component: self-rotation
 * 
 * Merotasi entity pada sumbu Y (rotasi pada poros sendiri).
 * 
 * Schema:
 * - speed: kecepatan rotasi (derajat per detik)
 * - paused: apakah rotasi sedang di-pause
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
 * Register semua custom components
 */
export function registerAllComponents(): void {
  registerOrbitRotation();
  registerSelfRotation();
}
