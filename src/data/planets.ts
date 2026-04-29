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
  modelScale: number;       // Scale default model GLB di mode tata surya
  focusScale: number;       // Scale model GLB di mode focus
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
  fallbackEnabled: boolean;
}

/**
 * Konfigurasi model tata surya utama (solar_system.glb)
 */
export const solarSystemConfig: SolarSystemModelConfig = {
  modelPath: '/models/solar_system.glb',
  defaultScale: 0.3,
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
    modelScale: 0.08,
    focusScale: 0.4,
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

/**
 * Deteksi device profile berdasarkan viewport
 */
export function getDeviceProfile(): DeviceProfile {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);

  if (minDim <= 360) return 'small-phone';
  if (minDim <= 414 && maxDim <= 950) return 'phone';
  if (minDim <= 500 && maxDim <= 1100) return 'large-phone';
  if (minDim <= 820) return 'tablet';
  return 'desktop';
}

const DEVICE_SCALE_MAP: Record<DeviceProfile, { solarSystem: number; focusMultiplier: number; posY: number }> = {
  'small-phone': { solarSystem: 0.15, focusMultiplier: 0.7, posY: 0.15 },
  'phone':       { solarSystem: 0.2,  focusMultiplier: 0.85, posY: 0.2 },
  'large-phone': { solarSystem: 0.25, focusMultiplier: 1.0, posY: 0.2 },
  'tablet':      { solarSystem: 0.35, focusMultiplier: 1.2, posY: 0.25 },
  'desktop':     { solarSystem: 0.45, focusMultiplier: 1.4, posY: 0.3 },
};

/**
 * Scale model solar_system.glb sesuai device
 */
export function getSolarSystemModelScale(): number {
  const profile = getDeviceProfile();
  return DEVICE_SCALE_MAP[profile].solarSystem;
}

/**
 * Scale focus planet sesuai device dan data planet
 */
export function getFocusPlanetScale(planetId: string): number {
  const planet = getPlanetById(planetId);
  if (!planet) return 0.3;
  const profile = getDeviceProfile();
  return planet.focusScale * DEVICE_SCALE_MAP[profile].focusMultiplier;
}

/**
 * Posisi model AR di atas marker sesuai device
 */
export function getARModelPosition(): string {
  const profile = getDeviceProfile();
  return `0 ${DEVICE_SCALE_MAP[profile].posY} 0`;
}
