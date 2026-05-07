/**
 * Data Planet Tata Surya
 * 
 * File ini berisi informasi lengkap setiap planet yang ditampilkan
 * dalam aplikasi AR Tata Surya. Semua nilai radius, orbit, dan kecepatan
 * sudah dioptimalkan agar proporsional di atas marker AR.
 * 
 * v3: Added GLB model paths, focus scales, and device-aware scaling.
 * Model GLB diletakkan di public/models/
 */

export type ModelOffset = string;

export interface Planet {
  id: string;
  name: string;
  displayName: string;
  orderFromSun: number;
  shortDescription: string;
  funFact: string;
  color: string;            // Warna fallback jika texture/model belum tersedia
  fallbackColor: string;    // Warna fallback untuk focus sphere
  texturePath: string;      // Path ke file texture di public/textures/
  modelPath: string;        // Path ke file GLB di public/models/
  modelScale: number;       // Fallback scale manual jika normalisasi GLB gagal
  focusScale: number;       // Fallback scale manual jika normalisasi focus gagal
  focusTargetSizeMultiplier?: number;
  solarTargetSizeMultiplier?: number;
  modelRotationOffset?: ModelOffset;
  modelPositionOffset?: ModelOffset;
  ringTexturePath?: string;
  focusPosition?: string;   // Override posisi saat focus (A-Frame format)
  radius: number;           // Radius planet (skala A-Frame, procedural fallback)
  orbitRadius: number;      // Jarak orbit dari matahari
  orbitSpeed: number;       // Kecepatan orbit (derajat per frame)
  rotationSpeed: number;    // Kecepatan rotasi pada poros sendiri
}

export interface SunData {
  id: string;
  name: string;
  color: string;
  texturePath: string;
  radius: number;
}

export interface SolarSystemModelConfig {
  modelPath: string;
  defaultScale: number;
  targetSizeMultiplier: number;
  fallbackEnabled: boolean;
}

/**
 * Konfigurasi model tata surya utama (solar_system.glb)
 */
export const solarSystemConfig: SolarSystemModelConfig = {
  modelPath: '/models/solar_system.glb',
  defaultScale: 0.3,
  targetSizeMultiplier: 1,
  fallbackEnabled: true,
};

/**
 * Data Matahari
 */
export const sunData: SunData = {
  id: 'sun',
  name: 'Matahari',
  color: '#FDB813',
  texturePath: 'textures/sun.jpg',
  radius: 0.25,
};

/**
 * Data 8 Planet Tata Surya
 * 
 * Catatan skala (v3):
 * - Orbit radius diperkecil ~40% dari v1 agar muat di marker
 * - Planet radius sedikit diperbesar agar lebih terlihat
 * - Kecepatan orbit dibuat proporsional (planet dekat lebih cepat)
 * - modelPath menunjuk ke file GLB di public/models/
 * - modelScale adalah scale GLB saat mode tata surya (procedural)
 * - focusScale adalah scale GLB saat planet difokuskan
 * - fallbackColor dipakai jika GLB gagal load
 */
export const planets: Planet[] = [
  {
    id: 'mercury',
    name: 'Merkurius',
    displayName: 'Merkurius',
    orderFromSun: 1,
    shortDescription:
      'Planet terkecil dan terdekat dari Matahari. Permukaannya penuh kawah mirip bulan dan tidak memiliki atmosfer yang signifikan.',
    funFact:
      'Satu hari di Merkurius (sunrise ke sunrise) setara dengan 176 hari di Bumi! Merkurius juga merupakan planet dengan perubahan suhu terbesar: dari -180°C hingga 430°C.',
    color: '#B5A292',
    fallbackColor: '#B5A292',
    texturePath: 'textures/mercury.jpg',
    modelPath: '/models/mercury.glb',
    modelScale: 0.05,
    focusScale: 0.4,
    focusTargetSizeMultiplier: 1,
    radius: 0.055,
    orbitRadius: 0.5,
    orbitSpeed: 0.8,
    rotationSpeed: 0.5,
  },
  {
    id: 'venus',
    name: 'Venus',
    displayName: 'Venus',
    orderFromSun: 2,
    shortDescription:
      'Dijuluki "Bintang Kejora", Venus adalah planet terpanas di tata surya karena efek rumah kaca yang ekstrem. Atmosfernya sangat tebal dan beracun.',
    funFact:
      'Venus berotasi berlawanan arah dengan planet lain (retrograde), sehingga Matahari terbit di barat dan terbenam di timur!',
    color: '#E8CDA0',
    fallbackColor: '#E8CDA0',
    texturePath: 'textures/venus.jpg',
    modelPath: '/models/venus.glb',
    modelScale: 0.06,
    focusScale: 0.45,
    focusTargetSizeMultiplier: 1,
    radius: 0.08,
    orbitRadius: 0.7,
    orbitSpeed: 0.6,
    rotationSpeed: 0.3,
  },
  {
    id: 'earth',
    name: 'Bumi',
    displayName: 'Bumi',
    orderFromSun: 3,
    shortDescription:
      'Planet ketiga dari Matahari dan satu-satunya planet yang diketahui mendukung kehidupan. Memiliki air cair, atmosfer yang kaya oksigen, dan medan magnet pelindung.',
    funFact:
      'Bumi adalah satu-satunya planet yang tidak dinamai dari mitologi Yunani atau Romawi. Nama "Earth" berasal dari bahasa Anglo-Saxon "ertha" yang berarti tanah.',
    color: '#4B89DC',
    fallbackColor: '#4B89DC',
    texturePath: 'textures/earth.jpg',
    modelPath: '/models/earth.glb',
    modelScale: 0.06,
    focusScale: 0.5,
    focusTargetSizeMultiplier: 1,
    radius: 0.085,
    orbitRadius: 0.9,
    orbitSpeed: 0.5,
    rotationSpeed: 1.0,
  },
  {
    id: 'mars',
    name: 'Mars',
    displayName: 'Mars',
    orderFromSun: 4,
    shortDescription:
      'Dijuluki "Planet Merah" karena kandungan besi oksida di permukaannya. Mars memiliki gunung tertinggi di tata surya, Olympus Mons.',
    funFact:
      'Olympus Mons di Mars tingginya 21.9 km — hampir 3 kali lipat Gunung Everest! Mars juga memiliki 2 bulan kecil bernama Phobos dan Deimos.',
    color: '#C1440E',
    fallbackColor: '#C1440E',
    texturePath: 'textures/mars.jpg',
    modelPath: '/models/mars.glb',
    modelScale: 0.05,
    focusScale: 0.45,
    focusTargetSizeMultiplier: 0.9,
    radius: 0.07,
    orbitRadius: 1.1,
    orbitSpeed: 0.4,
    rotationSpeed: 0.9,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    displayName: 'Jupiter',
    orderFromSun: 5,
    shortDescription:
      'Planet terbesar di tata surya, sebuah raksasa gas yang massanya 2.5 kali gabungan semua planet lain. Terkenal dengan Great Red Spot-nya.',
    funFact:
      'Great Red Spot adalah badai raksasa yang sudah berlangsung lebih dari 350 tahun! Ukurannya cukup besar untuk menelan Bumi. Jupiter juga memiliki 95 bulan yang diketahui.',
    color: '#C88B3A',
    fallbackColor: '#C88B3A',
    texturePath: 'textures/jupiter.jpg',
    modelPath: '/models/jupiter.glb',
    modelScale: 0.1,
    focusScale: 0.5,
    focusTargetSizeMultiplier: 0.8,
    radius: 0.15,
    orbitRadius: 1.4,
    orbitSpeed: 0.25,
    rotationSpeed: 1.5,
  },
  {
    id: 'saturn',
    name: 'Saturnus',
    displayName: 'Saturnus',
    orderFromSun: 6,
    shortDescription:
      'Terkenal dengan sistem cincinnya yang megah, Saturnus adalah raksasa gas kedua terbesar. Cincinnya terdiri dari es dan batuan.',
    funFact:
      'Saturnus memiliki kepadatan yang sangat rendah — jika ada kolam renang cukup besar, Saturnus akan mengapung! Cincinnya membentang hingga 282.000 km tetapi tebalnya hanya sekitar 10 meter.',
    color: '#E8D191',
    fallbackColor: '#E8D191',
    texturePath: 'textures/saturn.jpg',
    modelPath: '/models/saturn.glb',
    ringTexturePath: 'textures/saturn-ring.png',
    modelScale: 0.08,
    focusScale: 0.4,
    focusTargetSizeMultiplier: 0.68,
    radius: 0.13,
    orbitRadius: 1.75,
    orbitSpeed: 0.18,
    rotationSpeed: 1.3,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    displayName: 'Uranus',
    orderFromSun: 7,
    shortDescription:
      'Planet es raksasa yang unik karena berotasi dengan kemiringan hampir 98°, seolah-olah "berbaring" pada orbitnya. Atmosfernya mengandung metana yang memberi warna biru-hijau.',
    funFact:
      'Uranus berotasi "miring" hampir 90 derajat, kemungkinan akibat tabrakan dahsyat dengan objek seukuran Bumi miliaran tahun lalu.',
    color: '#73C2D0',
    fallbackColor: '#73C2D0',
    texturePath: 'textures/uranus.jpg',
    modelPath: '/models/uranus.glb',
    modelScale: 0.07,
    focusScale: 0.45,
    focusTargetSizeMultiplier: 0.95,
    radius: 0.11,
    orbitRadius: 2.1,
    orbitSpeed: 0.12,
    rotationSpeed: 1.1,
  },
  {
    id: 'neptune',
    name: 'Neptunus',
    displayName: 'Neptunus',
    orderFromSun: 8,
    shortDescription:
      'Planet terjauh dari Matahari, Neptunus adalah raksasa es dengan angin tercepat di tata surya (hingga 2.100 km/jam). Warna birunya berasal dari metana di atmosfer.',
    funFact:
      'Satu tahun di Neptunus setara dengan 165 tahun Bumi! Neptunus baru menyelesaikan satu orbit penuh sejak ditemukan pada tahun 1846 — tepatnya pada tahun 2011.',
    color: '#5B7FC7',
    fallbackColor: '#5B7FC7',
    texturePath: 'textures/neptune.jpg',
    modelPath: '/models/neptune.glb',
    modelScale: 0.07,
    focusScale: 0.45,
    focusTargetSizeMultiplier: 0.95,
    radius: 0.10,
    orbitRadius: 2.4,
    orbitSpeed: 0.08,
    rotationSpeed: 1.0,
  },
];

/**
 * Helper: Cari planet berdasarkan ID
 */
export function getPlanetById(id: string): Planet | undefined {
  return planets.find((p) => p.id === id);
}

// ===== FASE 7 — Device Profile & Scaling =====

export type DeviceProfile = 'small-phone' | 'phone' | 'large-phone' | 'tablet' | 'desktop';

type DeviceScaleConfig = {
  solarSystemTargetSize: number;
  focusPlanetTargetSize: number;
  solarPositionY: number;
  focusPositionY: number;
};

const PROCEDURAL_SOLAR_SYSTEM_DIAMETER = 5.2;

/**
 * Deteksi device profile berdasarkan viewport
 */
export function getDeviceProfile(): DeviceProfile {
  const viewport = window.visualViewport;
  const w = viewport?.width ?? window.innerWidth;
  const h = viewport?.height ?? window.innerHeight;
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);
  const dpr = window.devicePixelRatio || 1;
  const isTouchLike = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const isPortrait = h >= w;

  if (!isTouchLike && minDim >= 600) return 'desktop';
  if (minDim >= 700) return 'tablet';
  if (minDim <= 360) return 'small-phone';
  if (minDim <= 390 && maxDim <= 850) return 'phone';
  if (isPortrait && minDim <= 520 && (maxDim >= 850 || dpr >= 2.5)) return 'large-phone';
  if (minDim <= 520) return 'phone';
  if (minDim <= 900) return 'tablet';
  return 'desktop';
}

export const DEVICE_TARGET_SIZE_MAP: Record<DeviceProfile, DeviceScaleConfig> = {
  'small-phone': { solarSystemTargetSize: 0.65, focusPlanetTargetSize: 0.34, solarPositionY: 0.12, focusPositionY: 0.24 },
  'phone':       { solarSystemTargetSize: 0.72, focusPlanetTargetSize: 0.38, solarPositionY: 0.12, focusPositionY: 0.24 },
  'large-phone': { solarSystemTargetSize: 0.80, focusPlanetTargetSize: 0.42, solarPositionY: 0.13, focusPositionY: 0.24 },
  'tablet':      { solarSystemTargetSize: 1.00, focusPlanetTargetSize: 0.55, solarPositionY: 0.15, focusPositionY: 0.27 },
  'desktop':     { solarSystemTargetSize: 1.10, focusPlanetTargetSize: 0.62, solarPositionY: 0.18, focusPositionY: 0.28 },
};

/**
 * Target ukuran solar_system.glb dalam world unit relatif marker.
 */
export function getSolarSystemTargetSize(): number {
  const profile = getDeviceProfile();
  return DEVICE_TARGET_SIZE_MAP[profile].solarSystemTargetSize * solarSystemConfig.targetSizeMultiplier;
}

/**
 * Target ukuran planet focus sebelum multiplier per planet.
 */
export function getFocusPlanetTargetSize(): number {
  const profile = getDeviceProfile();
  return DEVICE_TARGET_SIZE_MAP[profile].focusPlanetTargetSize;
}

/**
 * Target akhir planet focus setelah override per model.
 */
export function getPlanetFocusTargetSize(planetId: string): number {
  const planet = getPlanetById(planetId);
  const multiplier = planet?.focusTargetSizeMultiplier ?? 1;
  return getFocusPlanetTargetSize() * multiplier;
}

/**
 * Fallback scale procedural solar system jika normalisasi GLB gagal.
 */
export function getSolarSystemModelScale(): number {
  return getSolarSystemTargetSize() / PROCEDURAL_SOLAR_SYSTEM_DIAMETER;
}

/**
 * Fallback scale focus planet jika bounding box GLB gagal.
 */
export function getFocusPlanetScale(planetId: string): number {
  const planet = getPlanetById(planetId);
  if (!planet) return getFocusPlanetTargetSize() * 0.5;
  const normalizedFallback = getPlanetFocusTargetSize(planetId) * 0.5;
  return Math.min(planet.focusScale, normalizedFallback);
}

/**
 * Posisi solar system di atas marker.
 */
export function getSolarSystemModelPosition(): string {
  const profile = getDeviceProfile();
  return `0 ${DEVICE_TARGET_SIZE_MAP[profile].solarPositionY} 0`;
}

/**
 * Posisi planet focus di atas marker.
 */
export function getFocusPlanetModelPosition(): string {
  const profile = getDeviceProfile();
  return `0 ${DEVICE_TARGET_SIZE_MAP[profile].focusPositionY} 0`;
}

/**
 * Posisi legacy untuk fallback lama.
 */
export function getARModelPosition(): string {
  return getSolarSystemModelPosition();
}
