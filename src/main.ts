/**
 * Main Entry Point v4
 *
 * Changes:
 * - Removed preflightCamera() — AR.js is the sole camera owner
 * - Removed manual preview fallback — was causing double streams
 * - Simplified flow: check secure context → check API → let AR.js own camera
 * - Loading overlay transitions to "scan marker" instruction once video ready
 */

import './styles/main.css';
import { initARScene, destroyScene, waitForCameraVideoReady, updateDebugPanel } from './ar/solarSystem';
import { initControls } from './ui/controls';

// ===== DOM Elements =====
const landingPage = document.getElementById('landing-page')!;
const arPage = document.getElementById('ar-page')!;
const markerModal = document.getElementById('marker-modal')!;

const btnStartAR = document.getElementById('btn-start-ar')!;
const btnMarkerGuide = document.getElementById('btn-marker-guide')!;
const btnCloseModal = document.getElementById('btn-close-modal')!;
const btnBack = document.getElementById('btn-back')!;

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

// ===== Helpers =====

function setStepStatus(stepId: string, status: 'pending' | 'active' | 'done' | 'error'): void {
  const icon = document.getElementById(`step-icon-${stepId}`);
  if (!icon) return;
  const icons: Record<string, string> = { pending: '⏳', active: '🔄', done: '✅', error: '❌' };
  icon.textContent = icons[status];
}

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

function resetLoadingState(): void {
  loadingContent.classList.remove('hidden');
  loadingError.classList.add('hidden');
  loadingSpinner.classList.remove('hidden');
  loadingHint.classList.add('hidden');
  loadingTitle.textContent = 'Mempersiapkan AR...';
  loadingStatus.textContent = 'Mengecek keamanan halaman...';
  ['security', 'camera', 'aframe', 'arjs', 'marker'].forEach((step) => setStepStatus(step, 'pending'));
}

function isSecureForCamera(): boolean {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return true;
  return window.isSecureContext === true;
}

function hasCameraSupport(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// ===== Open AR Page =====

async function openARPage(): Promise<void> {
  landingPage.classList.add('hidden');
  arPage.classList.remove('hidden');
  loadingOverlay.classList.remove('hidden');
  resetLoadingState();
  history.pushState({ page: 'ar' }, '', '#ar');

  let resolveSceneReady: (() => void) | null = null;
  const sceneReadyPromise = new Promise<void>((resolve) => { resolveSceneReady = resolve; });

  try {
    // STEP 1: Security Check
    setStepStatus('security', 'active');
    loadingStatus.textContent = 'Mengecek keamanan halaman...';
    await sleep(200);

    if (!isSecureForCamera()) {
      setStepStatus('security', 'error');
      showError(
        'HTTPS Diperlukan',
        'Kamera tidak bisa dibuka karena halaman belum menggunakan HTTPS.',
        `Halaman: ${window.location.protocol}//${window.location.host}\n\nSolusi:\n1. Deploy ke Vercel/Netlify (otomatis HTTPS)\n2. npm run dev:https\n3. ngrok http 5173`
      );
      return;
    }
    setStepStatus('security', 'done');

    // STEP 2: Camera API check (no preflight stream!)
    setStepStatus('camera', 'active');
    loadingStatus.textContent = 'Memeriksa dukungan kamera...';

    if (!hasCameraSupport()) {
      setStepStatus('camera', 'error');
      showError(
        'Browser Tidak Mendukung',
        'Browser Anda tidak mendukung akses kamera. Gunakan Chrome, Edge, atau Safari terbaru.',
      );
      return;
    }
    setStepStatus('camera', 'done');

    // STEP 3: Load A-Frame + AR.js, build scene
    setStepStatus('aframe', 'active');
    loadingStatus.textContent = 'Memuat A-Frame...';

    await initARScene((step) => {
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
        resolveSceneReady?.();
      }
    });

    // Init UI controls
    initControls();

    await sceneReadyPromise;

    // STEP 4: Wait for AR.js video to be ready
    const videoReady = await waitForCameraVideoReady({ timeoutMs: 10000 });

    if (!videoReady.ready) {
      // Don't hard-fail — show instruction instead
      console.warn('[AR] Video not ready within timeout, showing anyway');
    }

    // Update debug panel
    updateDebugPanel();

    // Transition loading overlay to instruction
    loadingStatus.textContent = 'Arahkan kamera ke marker Hiro';
    loadingTitle.textContent = 'AR Siap!';
    loadingHint.textContent = '📷 Arahkan kamera ke marker Hiro';
    loadingHint.classList.remove('hidden');
    loadingSpinner.classList.add('hidden');

    // Fade out overlay
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
    }, 800);

  } catch (err: any) {
    console.error('Error initializing AR:', err);
    const cameraErrors = ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'OverconstrainedError', 'AbortError', 'PermissionDeniedError'];
    if (cameraErrors.includes(err?.name)) {
      const errInfo = getCameraErrorMessage(err);
      showError(errInfo.title, errInfo.message, errInfo.details);
    } else {
      showError(
        'Gagal Memuat AR',
        'Terjadi kesalahan saat memuat komponen AR. Periksa koneksi internet Anda dan coba lagi.',
        `Error: ${err?.message || String(err)}`
      );
    }
  }
}

// ===== Navigation =====

function backToLanding(): void {
  destroyScene();
  arPage.classList.add('hidden');
  landingPage.classList.remove('hidden');
}

function openMarkerGuide(): void {
  markerModal.classList.remove('hidden');
}

function closeMarkerGuide(): void {
  markerModal.classList.add('hidden');
}

// ===== Event Listeners =====

btnStartAR.addEventListener('click', openARPage);
btnMarkerGuide.addEventListener('click', openMarkerGuide);
btnCloseModal.addEventListener('click', closeMarkerGuide);
btnBack.addEventListener('click', backToLanding);

btnRetry.addEventListener('click', () => {
  destroyScene();
  openARPage();
});

btnErrorBack.addEventListener('click', backToLanding);

markerModal.addEventListener('click', (e) => {
  if (e.target === markerModal) closeMarkerGuide();
});

window.addEventListener('popstate', () => {
  if (!arPage.classList.contains('hidden')) backToLanding();
});

console.log('🪐 AR Tata Surya - Loaded');
