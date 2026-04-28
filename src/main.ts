/**
 * Main Entry Point
 * 
 * File ini mengatur navigasi antar halaman (landing page ↔ AR page)
 * dan menginisialisasi semua modul yang diperlukan.
 */

import './styles/main.css';
import { initARScene, destroyScene } from './ar/solarSystem';
import { initControls } from './ui/controls';

// ===== DOM Elements =====
const landingPage = document.getElementById('landing-page')!;
const arPage = document.getElementById('ar-page')!;
const markerModal = document.getElementById('marker-modal')!;

// ===== Landing Page Buttons =====
const btnStartAR = document.getElementById('btn-start-ar')!;
const btnMarkerGuide = document.getElementById('btn-marker-guide')!;
const btnCloseModal = document.getElementById('btn-close-modal')!;
const btnBack = document.getElementById('btn-back')!;

// ===== Navigation Functions =====

/**
 * Buka halaman AR
 * - Sembunyikan landing page
 * - Tampilkan halaman AR
 * - Inisialisasi scene A-Frame + AR.js
 * - Inisialisasi UI controls
 */
function openARPage(): void {
  landingPage.classList.add('hidden');
  arPage.classList.remove('hidden');

  // Reset loading state
  const loading = document.getElementById('ar-loading');
  if (loading) loading.classList.remove('hidden');

  // Inisialisasi AR scene dan controls
  initARScene().catch((err) => {
    console.error('Error initializing AR scene:', err);
    alert('Gagal memuat AR. Pastikan browser mendukung WebGL dan kamera.');
  });

  initControls();
}

/**
 * Kembali ke landing page
 * - Destroy scene AR (bebaskan resource)
 * - Sembunyikan halaman AR
 * - Tampilkan landing page
 */
function backToLanding(): void {
  destroyScene();
  arPage.classList.add('hidden');
  landingPage.classList.remove('hidden');
}

/**
 * Buka modal panduan marker
 */
function openMarkerGuide(): void {
  markerModal.classList.remove('hidden');
}

/**
 * Tutup modal panduan marker
 */
function closeMarkerGuide(): void {
  markerModal.classList.add('hidden');
}

// ===== Event Listeners =====

btnStartAR.addEventListener('click', openARPage);
btnMarkerGuide.addEventListener('click', openMarkerGuide);
btnCloseModal.addEventListener('click', closeMarkerGuide);
btnBack.addEventListener('click', backToLanding);

// Tutup modal saat klik background overlay
markerModal.addEventListener('click', (e) => {
  if (e.target === markerModal) {
    closeMarkerGuide();
  }
});

// Handle tombol back browser
window.addEventListener('popstate', () => {
  if (!arPage.classList.contains('hidden')) {
    backToLanding();
  }
});

// Saat masuk AR, push state agar tombol back HP berfungsi
btnStartAR.addEventListener('click', () => {
  history.pushState({ page: 'ar' }, '', '#ar');
});

console.log('🪐 AR Tata Surya - Loaded');
