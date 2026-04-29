# 🪐 AR Tata Surya — Media Pembelajaran Interaktif

> Aplikasi Web Augmented Reality Tata Surya sebagai Media Pembelajaran Interaktif Menggunakan A-Frame dan AR.js

---

## 📖 Deskripsi Project

**AR Tata Surya** adalah aplikasi berbasis web yang memanfaatkan teknologi **Augmented Reality (AR)** untuk menampilkan model 3D tata surya secara interaktif. Pengguna cukup membuka website melalui smartphone, mengarahkan kamera ke **marker Hiro**, dan sistem tata surya mini akan muncul di atas marker secara real-time.

Aplikasi ini dirancang sebagai media pembelajaran yang memungkinkan siswa/mahasiswa memahami susunan tata surya dengan cara yang lebih menarik dan interaktif dibandingkan media konvensional.

---

## 🎯 Tujuan Project

1. Membuat aplikasi AR berbasis web yang ringan dan mudah diakses
2. Menerapkan konsep **Augmented Reality** menggunakan library **A-Frame** dan **AR.js**
3. Menyediakan media pembelajaran interaktif tentang tata surya
4. Mendemonstrasikan penggunaan marker-based AR tracking
5. Menampilkan model 3D GLB planet yang realistis

---

## 📚 Kesesuaian dengan Materi Virtual dan Augmented Reality

| Konsep | Implementasi |
|--------|-------------|
| **Augmented Reality** | Overlay objek 3D tata surya di atas dunia nyata melalui kamera |
| **Marker-Based Tracking** | Menggunakan marker Hiro sebagai anchor point untuk objek AR |
| **3D Rendering** | Model GLB planet dan tata surya ditampilkan via A-Frame/Three.js |
| **Real-Time Interaction** | User dapat memilih planet, zoom, pause, dan fokus planet secara real-time |
| **Computer Vision** | AR.js mendeteksi dan melacak marker secara real-time dari feed kamera |
| **Web-Based AR** | Implementasi AR tanpa instalasi native app (WebXR/WebAR) |

---

## ✨ Fitur Aplikasi

### Landing Page
- Desain modern bertema luar angkasa
- Animasi bintang di background
- Tombol "Mulai AR" dan "Panduan Marker"
- Penjelasan cara penggunaan aplikasi

### Mode AR — Tata Surya
- Kamera aktif menggunakan AR.js
- Deteksi marker Hiro secara real-time
- Model **solar_system.glb** muncul di atas marker Hiro
- Model berputar pelan agar terlihat hidup
- Jika solar_system.glb gagal dimuat, fallback ke procedural solar system (sphere + texture)

### Mode AR — Fokus Planet
- User memilih planet lewat chip UI (Merkurius s/d Neptunus)
- Model GLB planet individu muncul lebih besar
- Planet fokus berputar smooth
- Informasi planet tampil di panel
- Tombol "Kembali ke Tata Surya" untuk kembali ke mode utama
- Jika model GLB planet gagal load, fallback ke sphere berwarna

### Interaksi
- **Planet Chips** — Pilih planet untuk masuk focus mode
- **Panel Informasi** — Nama, urutan, deskripsi, dan fakta menarik planet
- **Pause/Play** — Hentikan atau jalankan rotasi
- **Zoom In/Out** — Perbesar atau perkecil model
- **Reset** — Kembalikan ke mode tata surya
- **Kembali** — Kembali ke landing page

---

## 🛠️ Tech Stack

| Teknologi | Fungsi |
|-----------|--------|
| [Vite](https://vitejs.dev/) | Build tool dan dev server |
| [TypeScript](https://www.typescriptlang.org/) | Bahasa pemrograman utama |
| [Tailwind CSS v4](https://tailwindcss.com/) | Framework CSS untuk styling |
| [A-Frame](https://aframe.io/) | Framework WebXR untuk 3D/VR/AR |
| [AR.js](https://ar-js-org.github.io/AR.js-Docs/) | Library AR marker-based tracking |

---

## 📁 Struktur Folder

```
ar-tata-surya/
├── public/
│   ├── models/            # Model 3D GLB
│   │   ├── solar_system.glb   # Model tata surya utama
│   │   ├── mercury.glb
│   │   ├── venus.glb
│   │   ├── earth.glb
│   │   ├── mars.glb
│   │   ├── jupiter.glb
│   │   ├── saturn.glb
│   │   ├── uranus.glb
│   │   └── neptune.glb
│   ├── textures/          # Texture planet (JPG/PNG) — fallback
│   └── docs/
├── src/
│   ├── data/
│   │   └── planets.ts     # Data planet + device scaling
│   ├── styles/
│   │   └── main.css       # Stylesheet utama
│   ├── ar/
│   │   ├── solarSystem.ts # Logic AR scene + GLB loading
│   │   └── aframeComponents.ts  # Custom A-Frame components
│   ├── ui/
│   │   └── controls.ts    # UI controls (chips, panel, focus mode)
│   ├── main.ts            # Entry point utama
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🗂️ Model GLB

Model GLB diletakkan di folder `public/models/`. Berikut daftar file yang digunakan:

| File | Fungsi |
|------|--------|
| `solar_system.glb` | Mode tata surya utama — muncul saat marker Hiro terdeteksi |
| `mercury.glb` | Focus mode planet Merkurius |
| `venus.glb` | Focus mode planet Venus |
| `earth.glb` | Focus mode planet Bumi |
| `mars.glb` | Focus mode planet Mars |
| `jupiter.glb` | Focus mode planet Jupiter |
| `saturn.glb` | Focus mode planet Saturnus |
| `uranus.glb` | Focus mode planet Uranus |
| `neptune.glb` | Focus mode planet Neptunus |

### Fallback

Jika model GLB gagal dimuat (file tidak ditemukan, koneksi lambat, dll):
- **solar_system.glb** → fallback ke procedural solar system (sphere + orbit + texture)
- **Planet GLB** → fallback ke `a-sphere` dengan warna planet

Aplikasi **tidak akan error** jika model gagal load.

### Mengganti Model GLB

Jika model terlalu besar atau kecil:
1. Edit `src/data/planets.ts`
2. Ubah `focusScale` pada planet yang bersangkutan
3. Ubah `solarSystemConfig.defaultScale` untuk model utama
4. Device scaling otomatis menyesuaikan berdasarkan ukuran layar

---

## 🚀 Cara Install

### Prasyarat
- **Node.js** versi 18 atau lebih baru
- **npm**
- **Browser modern** (Chrome, Edge, Firefox, Safari)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone <url-repo>
cd ar-tata-surya

# 2. Install dependencies
npm install

# 3. Jalankan development server
npm run dev
```

---

## 💻 Cara Menjalankan Lokal

```bash
# Development biasa (HTTP — desktop)
npm run dev

# Development dengan HTTPS (untuk testing AR di HP)
npm run dev:https
```

> **PENTING:** Kamera AR hanya bisa diakses di **localhost** atau **HTTPS**.

---

## 📱 Cara Testing di HP

> ⚠️ Kamera browser di smartphone **hanya bisa diakses melalui HTTPS**.

### Opsi 1: Dev Server HTTPS

```bash
npm run dev:https
```

1. Pastikan laptop dan HP terhubung ke WiFi yang sama
2. Buka URL HTTPS yang muncul di terminal
3. Browser akan menampilkan peringatan keamanan → klik **Advanced** → **Proceed**
4. Izinkan akses kamera saat diminta

### Opsi 2: ngrok

```bash
npm run dev
npx ngrok http 5173
```

### Opsi 3: Deploy ke Vercel/Netlify

---

## 🌐 Cara Deploy

### Vercel
```bash
npm install -g vercel
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
# Upload folder dist ke Netlify
# Build command: npm run build
# Publish directory: dist
```

---

## 📋 Panduan Marker Hiro

1. Download: [https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png](https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png)
2. Print di kertas putih (minimal 8×8 cm) atau tampilkan di layar lain
3. Arahkan kamera HP ke marker, jaga jarak 15–40 cm

---

## 🔄 Alur Sistem AR

```
User membuka website
        ↓
Landing page ditampilkan
        ↓
User klik "Mulai AR"
        ↓
Browser meminta izin kamera
        ↓
Kamera aktif, AR.js berjalan
        ↓
User arahkan kamera ke marker Hiro
        ↓
solar_system.glb muncul di atas marker (berputar)
        ↓
User memilih planet via chip UI
        ↓
Focus mode: planet GLB individu muncul besar
Info planet tampil, tombol "Kembali ke Tata Surya"
        ↓
User klik "Kembali" → solar_system.glb muncul lagi
```

---

## ⚠️ Catatan Penting

1. **HTTPS:** Browser smartphone memerlukan HTTPS untuk akses kamera
2. **Kompatibilitas:** Chrome Android, Safari iOS, Chrome Desktop, Edge
3. **Performa:** Jika lambat, kurangi ukuran model GLB atau gunakan model yang lebih ringan
4. **Fallback:** Aplikasi tetap jalan tanpa model GLB (fallback ke sphere)

---

## 🔧 Troubleshooting

### Model GLB tidak muncul
- Pastikan file ada di `public/models/`
- Nama file harus tepat: `solar_system.glb`, `earth.glb`, dll
- Cek console browser untuk error loading
- Aplikasi tetap jalan dengan fallback sphere

### Layar hitam saat klik "Mulai AR"
- Gunakan `npm run dev:https` untuk HP
- Atau deploy ke Vercel/Netlify (otomatis HTTPS)

### Marker tidak terdeteksi
- Pastikan marker jelas dan tidak terpotong
- Jarak kamera 15–40 cm
- Pencahayaan cukup terang

---

## 🧪 Testing Checklist

- [ ] `npm run build` sukses
- [ ] Landing page tampil rapi di mobile
- [ ] Tombol "Mulai AR" membuka kamera
- [ ] Marker Hiro memunculkan solar_system.glb
- [ ] solar_system.glb berputar pelan
- [ ] Klik chip planet masuk focus mode
- [ ] Focus mode menampilkan GLB planet
- [ ] Planet focus berputar smooth
- [ ] Info planet tampil benar
- [ ] Tombol "Kembali ke Tata Surya" berfungsi
- [ ] Fallback sphere jika GLB gagal
- [ ] AR page rapi di mobile
- [ ] Back ke landing membersihkan scene/video/canvas
- [ ] Tombol "Panduan Marker" tetap bisa diklik setelah keluar AR

---

## 📝 Lisensi

Project ini dibuat untuk keperluan akademik (Tugas Mata Kuliah Virtual dan Augmented Reality).

---

**Dibuat dengan ❤️ menggunakan A-Frame, AR.js, Vite, TypeScript, dan Tailwind CSS**
