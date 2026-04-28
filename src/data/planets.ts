/**
 * Data Planet Tata Surya
 * 
 * File ini berisi informasi lengkap setiap planet yang ditampilkan
 * dalam aplikasi AR Tata Surya. Semua nilai radius, orbit, dan kecepatan
 * sudah dioptimalkan agar proporsional di atas marker AR.
 */

export interface Planet {
  id: string;
  name: string;
  orderFromSun: number;
  shortDescription: string;
  funFact: string;
  color: string;            // Warna fallback jika texture belum tersedia
  texturePath: string;      // Path ke file texture di public/textures/
  radius: number;           // Radius planet (skala A-Frame)
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

/**
 * Data Matahari
 */
export const sunData: SunData = {
  id: 'sun',
  name: 'Matahari',
  color: '#FDB813',
  texturePath: 'textures/sun.jpg',
  radius: 0.35,
};

/**
 * Data 8 Planet Tata Surya
 * 
 * Catatan skala:
 * - Radius dan orbit sudah disesuaikan agar muat di atas marker
 * - Kecepatan orbit dibuat proporsional (planet dekat lebih cepat)
 * - Semua nilai BUKAN skala realistis, melainkan untuk visualisasi
 */
export const planets: Planet[] = [
  {
    id: 'mercury',
    name: 'Merkurius',
    orderFromSun: 1,
    shortDescription:
      'Planet terkecil dan terdekat dari Matahari. Permukaannya penuh kawah mirip bulan dan tidak memiliki atmosfer yang signifikan.',
    funFact:
      'Satu hari di Merkurius (sunrise ke sunrise) setara dengan 176 hari di Bumi! Merkurius juga merupakan planet dengan perubahan suhu terbesar: dari -180°C hingga 430°C.',
    color: '#A0826D',
    texturePath: 'textures/mercury.jpg',
    radius: 0.06,
    orbitRadius: 0.7,
    orbitSpeed: 0.8,
    rotationSpeed: 0.5,
  },
  {
    id: 'venus',
    name: 'Venus',
    orderFromSun: 2,
    shortDescription:
      'Dijuluki "Bintang Kejora", Venus adalah planet terpanas di tata surya karena efek rumah kaca yang ekstrem. Atmosfernya sangat tebal dan beracun.',
    funFact:
      'Venus berotasi berlawanan arah dengan planet lain (retrograde), sehingga Matahari terbit di barat dan terbenam di timur!',
    color: '#E8CDA0',
    texturePath: 'textures/venus.jpg',
    radius: 0.09,
    orbitRadius: 0.95,
    orbitSpeed: 0.6,
    rotationSpeed: 0.3,
  },
  {
    id: 'earth',
    name: 'Bumi',
    orderFromSun: 3,
    shortDescription:
      'Planet ketiga dari Matahari dan satu-satunya planet yang diketahui mendukung kehidupan. Memiliki air cair, atmosfer yang kaya oksigen, dan medan magnet pelindung.',
    funFact:
      'Bumi adalah satu-satunya planet yang tidak dinamai dari mitologi Yunani atau Romawi. Nama "Earth" berasal dari bahasa Anglo-Saxon "ertha" yang berarti tanah.',
    color: '#4B89DC',
    texturePath: 'textures/earth.jpg',
    radius: 0.1,
    orbitRadius: 1.2,
    orbitSpeed: 0.5,
    rotationSpeed: 1.0,
  },
  {
    id: 'mars',
    name: 'Mars',
    orderFromSun: 4,
    shortDescription:
      'Dijuluki "Planet Merah" karena kandungan besi oksida di permukaannya. Mars memiliki gunung tertinggi di tata surya, Olympus Mons.',
    funFact:
      'Olympus Mons di Mars tingginya 21.9 km — hampir 3 kali lipat Gunung Everest! Mars juga memiliki 2 bulan kecil bernama Phobos dan Deimos.',
    color: '#C1440E',
    texturePath: 'textures/mars.jpg',
    radius: 0.08,
    orbitRadius: 1.5,
    orbitSpeed: 0.4,
    rotationSpeed: 0.9,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    orderFromSun: 5,
    shortDescription:
      'Planet terbesar di tata surya, sebuah raksasa gas yang massanya 2.5 kali gabungan semua planet lain. Terkenal dengan Great Red Spot-nya.',
    funFact:
      'Great Red Spot adalah badai raksasa yang sudah berlangsung lebih dari 350 tahun! Ukurannya cukup besar untuk menelan Bumi. Jupiter juga memiliki 95 bulan yang diketahui.',
    color: '#C88B3A',
    texturePath: 'textures/jupiter.jpg',
    radius: 0.18,
    orbitRadius: 1.95,
    orbitSpeed: 0.25,
    rotationSpeed: 1.5,
  },
  {
    id: 'saturn',
    name: 'Saturnus',
    orderFromSun: 6,
    shortDescription:
      'Terkenal dengan sistem cincinnya yang megah, Saturnus adalah raksasa gas kedua terbesar. Cincinnya terdiri dari es dan batuan.',
    funFact:
      'Saturnus memiliki kepadatan yang sangat rendah — jika ada kolam renang cukup besar, Saturnus akan mengapung! Cincinnya membentang hingga 282.000 km tetapi tebalnya hanya sekitar 10 meter.',
    color: '#E8D191',
    texturePath: 'textures/saturn.jpg',
    radius: 0.16,
    orbitRadius: 2.45,
    orbitSpeed: 0.18,
    rotationSpeed: 1.3,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    orderFromSun: 7,
    shortDescription:
      'Planet es raksasa yang unik karena berotasi dengan kemiringan hampir 98°, seolah-olah "berbaring" pada orbitnya. Atmosfernya mengandung metana yang memberi warna biru-hijau.',
    funFact:
      'Uranus berotasi "miring" hampir 90 derajat, kemungkinan akibat tabrakan dahsyat dengan objek seukuran Bumi miliaran tahun lalu.',
    color: '#73C2D0',
    texturePath: 'textures/uranus.jpg',
    radius: 0.13,
    orbitRadius: 2.9,
    orbitSpeed: 0.12,
    rotationSpeed: 1.1,
  },
  {
    id: 'neptune',
    name: 'Neptunus',
    orderFromSun: 8,
    shortDescription:
      'Planet terjauh dari Matahari, Neptunus adalah raksasa es dengan angin tercepat di tata surya (hingga 2.100 km/jam). Warna birunya berasal dari metana di atmosfer.',
    funFact:
      'Satu tahun di Neptunus setara dengan 165 tahun Bumi! Neptunus baru menyelesaikan satu orbit penuh sejak ditemukan pada tahun 1846 — tepatnya pada tahun 2011.',
    color: '#3E54A3',
    texturePath: 'textures/neptune.jpg',
    radius: 0.12,
    orbitRadius: 3.3,
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
