/**
 * UI Controls
 * 
 * File ini mengelola semua interaksi UI pada halaman AR:
 * - Planet selector chips
 * - Info panel update
 * - Tombol pause/play, zoom, reset, back
 */

import { planets, getPlanetById, type Planet } from '../data/planets';
import {
  togglePause,
  zoomIn,
  zoomOut,
  resetView,
  highlightPlanet,
} from '../ar/solarSystem';

let selectedPlanetId: string | null = null;

/**
 * Inisialisasi semua UI controls
 */
export function initControls(): void {
  buildPlanetChips();
  bindControlButtons();
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
 * Pilih planet — update UI dan highlight di scene
 */
export function selectPlanet(planetId: string): void {
  const planet = getPlanetById(planetId);
  if (!planet) return;

  selectedPlanetId = planetId;

  // Update chip active state
  const chips = document.querySelectorAll('.planet-chip');
  chips.forEach((chip) => {
    const id = chip.getAttribute('data-planet-id');
    if (id === planetId) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  // Scroll chip into view
  const activeChip = document.querySelector(`.planet-chip[data-planet-id="${planetId}"]`);
  if (activeChip) {
    activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // Update info panel
  updateInfoPanel(planet);

  // Highlight planet di scene AR
  highlightPlanet(planetId);
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

  if (nameEl) nameEl.textContent = planet.name;
  if (orderEl) orderEl.textContent = `Planet ke-${planet.orderFromSun} dari Matahari`;
  if (descEl) descEl.textContent = planet.shortDescription;
  if (colorEl) colorEl.style.background = planet.color;

  if (factContainer && factText) {
    factContainer.classList.remove('hidden');
    factText.textContent = planet.funFact;
  }

  if (panel) {
    panel.classList.add('has-planet');
  }
}

/**
 * Bind event listeners ke tombol kontrol
 */
function bindControlButtons(): void {
  // Pause / Play
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

  // Zoom In
  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      zoomIn();
    });
  }

  // Zoom Out
  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      zoomOut();
    });
  }

  // Reset
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetView();
      // Reset UI state
      selectedPlanetId = null;
      
      // Reset chips
      const chips = document.querySelectorAll('.planet-chip');
      chips.forEach((chip) => chip.classList.remove('active'));

      // Reset info panel
      const nameEl = document.getElementById('planet-info-name');
      const orderEl = document.getElementById('planet-info-order');
      const descEl = document.getElementById('planet-info-desc');
      const colorEl = document.getElementById('planet-info-color');
      const factContainer = document.getElementById('planet-info-fact');
      const panel = document.getElementById('planet-info-panel');

      if (nameEl) nameEl.textContent = 'Pilih Planet';
      if (orderEl) orderEl.textContent = '';
      if (descEl) descEl.textContent = 'Ketuk salah satu planet di atas untuk melihat informasinya';
      if (colorEl) colorEl.style.background = 'rgba(30, 41, 59, 0.7)';
      if (factContainer) factContainer.classList.add('hidden');
      if (panel) panel.classList.remove('has-planet');

      // Reset pause icons
      if (iconPause && iconPlay) {
        iconPause.classList.remove('hidden');
        iconPlay.classList.add('hidden');
      }
    });
  }
}
