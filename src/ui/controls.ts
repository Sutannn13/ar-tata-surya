/**
 * UI Controls v2
 * 
 * Fitur:
 * - Planet selector chips
 * - Info panel compact/expand
 * - Tap planet 3D → selectPlanet
 * - Smooth focus on select
 * - Tombol pause/play, zoom, reset, back
 */

import { planets, getPlanetById, type Planet } from '../data/planets';
import {
  togglePause,
  zoomIn,
  zoomOut,
  resetView,
  highlightPlanet,
  focusPlanet,
  onPlanetTapEvent,
} from '../ar/solarSystem';

let selectedPlanetId: string | null = null;
let panelExpanded = false;

/**
 * Inisialisasi semua UI controls
 */
export function initControls(): void {
  buildPlanetChips();
  bindControlButtons();
  setupPanelToggle();

  // Register callback untuk tap planet 3D
  onPlanetTapEvent((planetId: string) => {
    selectPlanet(planetId);
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
      ${planet.name}
    `;

    chip.addEventListener('click', () => selectPlanet(planet.id));
    container.appendChild(chip);
  });
}

/**
 * Pilih planet — update UI, highlight, dan focus
 */
export function selectPlanet(planetId: string): void {
  const planet = getPlanetById(planetId);
  if (!planet) return;

  selectedPlanetId = planetId;

  // Update chip active state
  const chips = document.querySelectorAll('.planet-chip');
  chips.forEach((chip) => {
    const id = chip.getAttribute('data-planet-id');
    chip.classList.toggle('active', id === planetId);
  });

  // Scroll chip into view
  const activeChip = document.querySelector(`.planet-chip[data-planet-id="${planetId}"]`);
  if (activeChip) {
    activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // Update info panel (compact mode)
  updateInfoPanel(planet);

  // Highlight planet di scene AR
  highlightPlanet(planetId);

  // Smooth focus ke planet
  focusPlanet(planetId);
}

/**
 * Update panel informasi planet — compact default
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

  if (nameEl) nameEl.textContent = planet.name;
  if (orderEl) orderEl.textContent = `Planet ke-${planet.orderFromSun} dari Matahari`;
  if (descEl) descEl.textContent = planet.shortDescription;
  if (colorEl) colorEl.style.background = planet.color;

  if (factContainer && factText) {
    factText.textContent = planet.funFact;
  }

  if (panel) {
    panel.classList.add('has-planet');
    // Default: compact (collapsed)
    panel.classList.remove('expanded');
    panelExpanded = false;
  }

  if (expandBtn) {
    expandBtn.classList.remove('hidden');
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
      expandBtn.textContent = panelExpanded ? '▼ Tutup' : '▲ Detail';
    });
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
  if (expandBtn) expandBtn.classList.add('hidden');

  // Reset pause icons
  const iconPause = document.getElementById('icon-pause');
  const iconPlay = document.getElementById('icon-play');
  if (iconPause && iconPlay) {
    iconPause.classList.remove('hidden');
    iconPlay.classList.add('hidden');
  }
}
