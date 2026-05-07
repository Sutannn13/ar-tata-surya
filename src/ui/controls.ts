/**
 * UI Controls v3
 *
 * Fitur:
 * - Planet selector chips
 * - Info panel compact/expand
 * - Focus mode: planet GLB individu
 * - Solar system mode: solar_system.glb
 * - Tombol "Kembali ke Tata Surya"
 * - Tombol pause/play, zoom, reset, back
 * - Camera switch (front/back)
 */

import { planets, getPlanetById, type Planet } from '../data/planets';
import {
  togglePause,
  zoomIn,
  zoomOut,
  resetView,
  enterFocusMode,
  exitFocusMode,
  onPlanetTapEvent,
  onModeChangeEvent,
  getCurrentMode,
  switchCamera,
  onCameraFacingChange,
  getCurrentFacingMode,
} from '../ar/solarSystem';

let selectedPlanetId: string | null = null;
let panelExpanded = false;
let controlsBound = false;

/**
 * Inisialisasi semua UI controls
 */
export function initControls(): void {
  buildPlanetChips();

  if (!controlsBound) {
    bindControlButtons();
    setupPanelToggle();
    setupBackToSolarSystem();
    setupCameraSwitch();
    controlsBound = true;
  }

  resetUIState();

  // Register callback untuk tap planet 3D
  onPlanetTapEvent((planetId: string) => {
    selectPlanet(planetId);
  });

  // Register callback untuk mode change
  onModeChangeEvent((mode, planetId) => {
    if (mode === 'solar-system') {
      resetUIState();
    } else if (mode === 'focus' && planetId) {
      updateUIForFocus(planetId);
    }
  });
}

/**
 * Bangun planet selector chips
 */
function buildPlanetChips(): void {
  const container = document.getElementById('planet-chips');
  if (!container) return;

  container.innerHTML = '';

  planets.forEach((planet) => {
    const chip = document.createElement('button');
    chip.className = 'planet-chip';
    chip.setAttribute('data-planet-id', planet.id);
    chip.innerHTML = `
      <span class="planet-chip-dot" style="background: ${planet.color}"></span>
      ${planet.displayName}
    `;

    chip.addEventListener('click', () => selectPlanet(planet.id));
    container.appendChild(chip);
  });
}

/**
 * Pilih planet — masuk focus mode
 */
export function selectPlanet(planetId: string): void {
  const planet = getPlanetById(planetId);
  if (!planet) return;

  selectedPlanetId = planetId;

  // Enter focus mode (GLB individual planet)
  enterFocusMode(planetId);

  // UI updates handled by onModeChange callback
}

/**
 * Update UI saat masuk focus mode
 */
function updateUIForFocus(planetId: string): void {
  const planet = getPlanetById(planetId);
  if (!planet) return;

  selectedPlanetId = planetId;

  // Update chip active state
  document.querySelectorAll('.planet-chip').forEach((chip) => {
    const id = chip.getAttribute('data-planet-id');
    chip.classList.toggle('active', id === planetId);
  });

  // Scroll chip into view
  const activeChip = document.querySelector(`.planet-chip[data-planet-id="${planetId}"]`);
  if (activeChip) {
    activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // Update info panel
  updateInfoPanel(planet);

  // Show back button
  showBackToSolarSystem(true);
}

/**
 * Update panel informasi planet
 */
function updateInfoPanel(planet: Planet): void {
  const panel = document.getElementById('planet-info-panel');
  const nameEl = document.getElementById('planet-info-name');
  const orderEl = document.getElementById('planet-info-order');
  const descEl = document.getElementById('planet-info-desc');
  const colorEl = document.getElementById('planet-info-color');
  const factContainer = document.getElementById('planet-info-fact');
  const factText = document.getElementById('planet-info-fact-text');
  const expandBtn = document.getElementById('btn-expand-panel');

  if (nameEl) nameEl.textContent = planet.displayName;
  if (orderEl) orderEl.textContent = `Planet ke-${planet.orderFromSun} dari Matahari`;
  if (descEl) descEl.textContent = planet.shortDescription;
  if (colorEl) colorEl.style.background = planet.color;

  if (factContainer && factText) {
    factContainer.classList.remove('hidden');
    factText.textContent = planet.funFact;
  }

  if (panel) {
    panel.classList.add('has-planet');
    panel.classList.remove('expanded');
    panelExpanded = false;
  }

  if (expandBtn) {
    expandBtn.classList.remove('hidden');
    expandBtn.setAttribute('aria-expanded', 'false');
    expandBtn.textContent = '▲ Detail';
  }
}

/**
 * Setup panel expand/collapse toggle
 */
function setupPanelToggle(): void {
  const expandBtn = document.getElementById('btn-expand-panel');
  const panel = document.getElementById('planet-info-panel');

  if (expandBtn && panel) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panelExpanded = !panelExpanded;
      panel.classList.toggle('expanded', panelExpanded);
      expandBtn.setAttribute('aria-expanded', String(panelExpanded));
      expandBtn.textContent = panelExpanded ? '▼ Tutup' : '▲ Detail';
    });
  }
}

/**
 * Setup tombol "Kembali ke Tata Surya"
 */
function setupBackToSolarSystem(): void {
  const wrapper = document.getElementById('btn-back-solar');
  const btn = wrapper?.querySelector('.btn-back-solar-inner');
  if (btn) {
    btn.addEventListener('click', () => {
      exitFocusMode();
    });
  }
}

/**
 * Setup camera switch button
 */
function setupCameraSwitch(): void {
  const btnSwitchCamera = document.getElementById('btn-switch-camera');
  if (btnSwitchCamera) {
    btnSwitchCamera.addEventListener('click', () => {
      // Note: AR.js marker tracking works best with back camera
      // Front camera may cause tracking issues
      const newFacing = switchCamera();

      // Show feedback
      const title = newFacing === 'environment' ? 'Kamera Belakang' : 'Kamera Depan';
      console.log('[UI] Camera switched to:', title);

      // For marker-based AR, it's recommended to use back camera
      // Show warning if switched to front camera
      if (newFacing === 'user') {
        console.warn('[UI] Front camera may affect marker tracking quality');
      }
    });
  }
}

function showBackToSolarSystem(show: boolean): void {
  const btn = document.getElementById('btn-back-solar');
  if (btn) {
    btn.classList.toggle('hidden', !show);
  }
}

/**
 * Bind event listeners ke tombol kontrol
 */
function bindControlButtons(): void {
  const btnPause = document.getElementById('btn-pause');
  const iconPause = document.getElementById('icon-pause');
  const iconPlay = document.getElementById('icon-play');

  if (btnPause) {
    btnPause.addEventListener('click', () => {
      const paused = togglePause();
      if (iconPause && iconPlay) {
        iconPause.classList.toggle('hidden', paused);
        iconPlay.classList.toggle('hidden', !paused);
      }
    });
  }

  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => { zoomIn(); });
  }

  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => { zoomOut(); });
  }

  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetView();
      resetUIState();
    });
  }
}

/**
 * Reset UI state — clear selection, panel, chips
 */
function resetUIState(): void {
  selectedPlanetId = null;
  panelExpanded = false;

  // Reset chips
  document.querySelectorAll('.planet-chip').forEach((chip) => chip.classList.remove('active'));

  // Reset info panel
  const nameEl = document.getElementById('planet-info-name');
  const orderEl = document.getElementById('planet-info-order');
  const descEl = document.getElementById('planet-info-desc');
  const colorEl = document.getElementById('planet-info-color');
  const factContainer = document.getElementById('planet-info-fact');
  const panel = document.getElementById('planet-info-panel');
  const expandBtn = document.getElementById('btn-expand-panel');

  if (nameEl) nameEl.textContent = 'Pilih Planet';
  if (orderEl) orderEl.textContent = '';
  if (descEl) descEl.textContent = 'Ketuk planet di layar atau pilih dari daftar di atas';
  if (colorEl) colorEl.style.background = 'rgba(30, 41, 59, 0.7)';
  if (factContainer) factContainer.classList.add('hidden');
  if (panel) { panel.classList.remove('has-planet', 'expanded'); }
  if (expandBtn) {
    expandBtn.classList.add('hidden');
    expandBtn.setAttribute('aria-expanded', 'false');
  }

  // Hide back-to-solar button
  showBackToSolarSystem(false);

  // Reset pause icons
  const iconPause = document.getElementById('icon-pause');
  const iconPlay = document.getElementById('icon-play');
  if (iconPause && iconPlay) {
    iconPause.classList.remove('hidden');
    iconPlay.classList.add('hidden');
  }

  // Check if we need to indicate current mode
  if (getCurrentMode() === 'solar-system') {
    showBackToSolarSystem(false);
  }
}
