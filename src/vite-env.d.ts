/// <reference types="vite/client" />

/**
 * Deklarasi tipe untuk A-Frame agar TypeScript tidak error
 * saat menggunakan global AFRAME dan custom HTML elements
 */
declare const AFRAME: any;

declare namespace JSX {
  interface IntrinsicElements {
    'a-scene': any;
    'a-marker': any;
    'a-entity': any;
    'a-sphere': any;
    'a-ring': any;
    'a-light': any;
    'a-camera': any;
    'a-box': any;
    'a-cylinder': any;
    'a-plane': any;
  }
}
