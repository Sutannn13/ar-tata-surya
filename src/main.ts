/**
 * Main Entry Point
 * 
 * File ini mengatur:
 * 1. Navigasi antar halaman (landing page ↔ AR page)
 * 2. Pengecekan keamanan (HTTPS / secure context)
 * 3. Preflight camera permission
 * 4. Loading status bertahap
 * 5. Error handling yang jelas untuk user
 */

import './styles/main.css';
import { initARScene, destroyScene, waitForCameraVideoReady } from './ar/solarSystem';
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

// ===== Loading Elements =====
const loadingOverlay = document.getElementById('ar-loading')!;
const loadingContent = document.getElementById('loading-content')!;
const loadingError = document.getElementById('loading-error')!;
const loadingTitle = document.getElementById('loading-title')!;
const loadingStatus = document.getElementById('loading-status')!;
const loadingSpinner = document.getElementById('loading-spinner')!;
const loadingHint = document.getElementById('loading-hint')!;
const errorTitle = document.getElementById('error-title')!;
const errorMessage = document.getElementById('error-message')!;
const errorDetails = document.getElementById('error-details')!;
const errorDetailsText = document.getElementById('error-details-text')!;
const btnRetry = document.getElementById('btn-retry')!;
const btnErrorBack = document.getElementById('btn-error-back')!;

// ===== Helper: Update loading step icon =====
function setStepStatus(stepId: string, status: 'pending' | 'active' | 'done' | 'error'): void {
  const icon = document.getElementById(`step-icon-${stepId}`);
  if (!icon) return;
  const icons: Record<string, string> = {
    pending: '⏳',
    active: '🔄',
    done: '✅',
    error: '❌',
  };
  icon.textContent = icons[status];
}

// ===== Helper: Show error state =====
function showError(title: string, message: string, details?: string): void {
  loadingContent.classList.add('hidden');
  loadingError.classList.remove('hidden');
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  if (details) {
    errorDetails.classList.remove('hidden');
    errorDetailsText.textContent = details;
  } else {
    errorDetails.classList.add('hidden');
  }
}

// ===== Helper: Reset loading state =====
function resetLoadingState(): void {
  loadingContent.classList.remove('hidden');
  loadingError.classList.add('hidden');
  loadingSpinner.classList.remove('hidden');
  loadingHint.classList.add('hidden');
  loadingTitle.textContent = 'Mempersiapkan AR...';
  loadingStatus.textContent = 'Mengecek keamanan halaman...';
  
  // Reset all step icons
  ['security', 'camera', 'aframe', 'arjs', 'marker'].forEach((step) => {
    setStepStatus(step, 'pending');
  });
}

// ===== Helper: Check if secure context =====
function isSecureForCamera(): boolean {
  // localhost dan 127.0.0.1 selalu aman
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return true;
  }
  // Cek window.isSecureContext (true jika HTTPS)
  return window.isSecureContext === true;
}

// ===== Helper: Check camera support =====
function hasCameraSupport(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function isDebugEnabled(): boolean {
  const hostname = window.location.hostname;
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  return isDev || new URLSearchParams(window.location.search).has('debug');
}

// ===== Helper: Preflight camera permission =====
async function preflightCamera(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  // Berhasil — segera hentikan stream sementara, AR.js akan meminta ulang
  stream.getTracks().forEach((track) => track.stop());
}

// ===== Helper: Get user-friendly camera error message =====
function getCameraErrorMessage(err: any): { title: string; message: string; details?: string } {
  const name = err?.name || '';
  const msg = err?.message || String(err);

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        title: 'Izin Kamera Ditolak',
        message: 'Anda menolak akses kamera. Untuk menggunakan AR, izinkan akses kamera di pengaturan browser lalu coba lagi.',
        details: `Error: ${name}`,
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        title: 'Kamera Tidak Ditemukan',
        message: 'Perangkat Anda tidak memiliki kamera atau kamera tidak dapat diakses.',
        details: `Error: ${name}`,
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        title: 'Kamera Sedang Digunakan',
        message: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi yang menggunakan kamera lalu coba lagi.',
        details: `Error: ${name}`,
      };
    case 'OverconstrainedError':
      return {
        title: 'Kamera Tidak Sesuai',
        message: 'Kamera tidak mendukung pengaturan yang diminta. Coba gunakan browser lain.',
        details: `Error: ${name} — ${msg}`,
      };
    case 'AbortError':
      return {
        title: 'Permintaan Kamera Dibatalkan',
        message: 'Permintaan akses kamera dibatalkan. Silakan coba lagi.',
        details: `Error: ${name}`,
      };
    default:
      return {
        title: 'Gagal Mengakses Kamera',
        message: `Terjadi kesalahan saat mengakses kamera: ${msg}`,
        details: `Error: ${name || 'Unknown'} — ${msg}`,
      };
  }
}

// ===== Populate Debug Panel =====
function populateDebugPanel(): void {
  const debugBody = document.getElementById('debug-body');
  const debugPanel = document.getElementById('debug-panel');
  if (!debugBody || !debugPanel) return;

  // Hanya tampilkan di development (localhost/127.0.0.1)
  const hostname = window.location.hostname;
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  
  // Juga tampilkan jika ada query param ?debug=true
  const showDebug = isDev || new URLSearchParams(window.location.search).has('debug');
  if (!showDebug) return;

  debugPanel.classList.remove('hidden');

  const info = [
    { label: 'isSecureContext', value: String(window.isSecureContext) },
    { label: 'Protocol', value: window.location.protocol },
    { label: 'Hostname', value: hostname },
    { label: 'Port', value: window.location.port || '(default)' },
    { label: 'mediaDevices', value: String(!!navigator.mediaDevices) },
    { label: 'getUserMedia', value: String(!!(navigator.mediaDevices?.getUserMedia)) },
  ];

  // Cek camera permission status jika tersedia
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'camera' as PermissionName }).then((status) => {
      const permEl = document.createElement('div');
      permEl.className = 'debug-row';
      permEl.innerHTML = `<span class="debug-label">Camera Permission</span><span class="debug-value">${status.state}</span>`;
      debugBody.appendChild(permEl);
    }).catch(() => {
      // Permission API not supported for camera — skip
    });
  }

  debugBody.innerHTML = info
    .map((i) => `<div class="debug-row"><span class="debug-label">${i.label}</span><span class="debug-value">${i.value}</span></div>`)
    .join('');

  // Close button
  document.getElementById('btn-close-debug')?.addEventListener('click', () => {
    debugPanel.classList.add('hidden');
  });
}

// ===== Main: Open AR Page =====
async function openARPage(): Promise<void> {
  // Tampilkan halaman AR
  landingPage.classList.add('hidden');
  arPage.classList.remove('hidden');
  loadingOverlay.classList.remove('hidden');

  // Reset loading state
  resetLoadingState();

  // Populate debug panel
  populateDebugPanel();

  // Push state untuk tombol back browser
  history.pushState({ page: 'ar' }, '', '#ar');

  const debugEnabled = isDebugEnabled();
  let resolveSceneReady: (() => void) | null = null;
  const sceneReadyPromise = new Promise<void>((resolve) => {
    resolveSceneReady = resolve;
  });

  try {
    // ===== STEP 1: Security Check =====
    setStepStatus('security', 'active');
    loadingStatus.textContent = 'Mengecek keamanan halaman...';

    // Sedikit delay agar user bisa lihat progress
    await sleep(300);

    if (!isSecureForCamera()) {
      setStepStatus('security', 'error');
      showError(
        'HTTPS Diperlukan',
        'Kamera tidak bisa dibuka karena halaman belum menggunakan HTTPS. Browser smartphone memerlukan koneksi aman (HTTPS) untuk mengizinkan akses kamera.',
        `Halaman saat ini: ${window.location.protocol}//${window.location.host}\n\nSolusi:\n1. Deploy ke Vercel/Netlify/GitHub Pages (otomatis HTTPS)\n2. Jalankan dev server dengan HTTPS:\n   npm run dev:https\n3. Gunakan ngrok untuk membuat tunnel HTTPS:\n   ngrok http 5173`
      );
      return;
    }
    setStepStatus('security', 'done');

    // ===== STEP 2: Camera Permission =====
    setStepStatus('camera', 'active');
    loadingStatus.textContent = 'Meminta izin kamera...';

    if (!hasCameraSupport()) {
      setStepStatus('camera', 'error');
      showError(
        'Browser Tidak Mendukung',
        'Browser Anda tidak mendukung akses kamera (mediaDevices API tidak tersedia). Gunakan browser modern seperti Chrome, Edge, atau Safari versi terbaru.',
      );
      return;
    }

    await preflightCamera();
    setStepStatus('camera', 'done');

    // ===== STEP 3: Load A-Frame =====
    setStepStatus('aframe', 'active');
    loadingStatus.textContent = 'Memuat A-Frame...';

    await initARScene((step) => {
      // Callback untuk update status dari solarSystem.ts
      if (step === 'aframe-loaded') {
        setStepStatus('aframe', 'done');
        setStepStatus('arjs', 'active');
        loadingStatus.textContent = 'Memuat AR.js...';
      } else if (step === 'arjs-loaded') {
        setStepStatus('arjs', 'done');
        setStepStatus('marker', 'active');
        loadingStatus.textContent = 'Menyiapkan marker Hiro...';
      } else if (step === 'scene-ready') {
        setStepStatus('marker', 'done');
        loadingStatus.textContent = 'Menunggu video kamera...';
        loadingHint.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        resolveSceneReady?.();
      }
    });

    // Inisialisasi UI controls
    initControls();

    await sceneReadyPromise;

    const videoReady = await waitForCameraVideoReady({
      timeoutMs: 5000,
      allowManualPreview: debugEnabled,
    });

    if (!videoReady.ready) {
      setStepStatus('marker', 'error');
      showError(
        'Video Kamera Tidak Tampil',
        'Kamera berhasil diminta, tetapi video kamera tidak tampil. Kemungkinan elemen video tertutup layer CSS atau browser memblokir stream.',
        `Video elements: ${videoReady.summary.total}\nManual preview: ${videoReady.summary.manualCount}\nReady videos: ${videoReady.summary.readyCount}\nLive streams: ${videoReady.summary.liveCount}`
      );
      return;
    }

    loadingStatus.textContent = 'AR siap! Arahkan kamera ke marker Hiro.';
    loadingHint.classList.remove('hidden');
    loadingSpinner.classList.add('hidden');

    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
    }, 600);

  } catch (err: any) {
    console.error('Error initializing AR:', err);

    // Cek apakah error kamera
    const cameraErrors = ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'OverconstrainedError', 'AbortError', 'PermissionDeniedError'];
    if (cameraErrors.includes(err?.name)) {
      const errInfo = getCameraErrorMessage(err);
      showError(errInfo.title, errInfo.message, errInfo.details);
    } else {
      // Error loading script atau error lainnya
      showError(
        'Gagal Memuat AR',
        'Terjadi kesalahan saat memuat komponen AR. Periksa koneksi internet Anda dan coba lagi.',
        `Error: ${err?.message || String(err)}`
      );
    }
  }
}

// ===== Kembali ke landing page =====
function backToLanding(): void {
  destroyScene();
  arPage.classList.add('hidden');
  landingPage.classList.remove('hidden');
}

// ===== Buka modal panduan marker =====
function openMarkerGuide(): void {
  markerModal.classList.remove('hidden');
}

// ===== Tutup modal panduan marker =====
function closeMarkerGuide(): void {
  markerModal.classList.add('hidden');
}

// ===== Helper: sleep =====
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== Event Listeners =====

btnStartAR.addEventListener('click', openARPage);
btnMarkerGuide.addEventListener('click', openMarkerGuide);
btnCloseModal.addEventListener('click', closeMarkerGuide);
btnBack.addEventListener('click', backToLanding);

// Error overlay buttons
btnRetry.addEventListener('click', () => {
  // Reset dan coba lagi
  destroyScene();
  openARPage();
});

btnErrorBack.addEventListener('click', backToLanding);

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

console.log('🪐 AR Tata Surya - Loaded');
