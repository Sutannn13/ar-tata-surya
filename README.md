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

---

## 📚 Kesesuaian dengan Materi Virtual dan Augmented Reality

Project ini menerapkan konsep-konsep utama dari mata kuliah Virtual dan Augmented Reality:

| Konsep | Implementasi |
|--------|-------------|
| **Augmented Reality** | Overlay objek 3D tata surya di atas dunia nyata melalui kamera |
| **Marker-Based Tracking** | Menggunakan marker Hiro sebagai anchor point untuk objek AR |
| **3D Rendering** | Rendering planet, matahari, dan orbit menggunakan WebGL via A-Frame |
| **Real-Time Interaction** | User dapat memilih planet, pause orbit, zoom in/out secara real-time |
| **Computer Vision** | AR.js mendeteksi dan melacak marker secara real-time dari feed kamera |
| **Web-Based AR** | Implementasi AR tanpa instalasi native app (WebXR/WebAR) |

---

## ✨ Fitur Aplikasi

### Landing Page
- Desain modern bertema luar angkasa
- Animasi bintang di background
- Tombol "Mulai AR" dan "Panduan Marker"
- Penjelasan cara penggunaan aplikasi

### Mode AR
- Kamera aktif menggunakan AR.js
- Deteksi marker Hiro secara real-time
- Mini tata surya 3D muncul di atas marker:
  - Matahari di tengah dengan efek cahaya
  - 8 planet mengorbit: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, Neptunus
  - Cincin Saturnus
  - Orbit divisualisasikan sebagai lingkaran tipis
  - Planet berotasi pada porosnya masing-masing

### Interaksi
- **Planet Selector** — Pilih planet melalui chip/tombol horizontal
- **Panel Informasi** — Nama, urutan, deskripsi, dan fakta menarik planet
- **Pause/Play** — Hentikan atau jalankan orbit planet
- **Zoom In/Out** — Perbesar atau perkecil tata surya
- **Reset** — Kembalikan ke tampilan default
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
| HTML/CSS | Struktur dan styling halaman |

---

## 📁 Struktur Folder

```
ar-tata-surya/
├── public/
│   ├── textures/          # Texture planet (JPG/PNG)
│   │   └── README.md
│   ├── markers/           # Marker kustom (opsional)
│   │   └── README.md
│   └── docs/              # Dokumentasi tambahan
│       └── README.md
├── src/
│   ├── data/
│   │   └── planets.ts     # Data informasi planet
│   ├── styles/
│   │   └── main.css       # Stylesheet utama (Tailwind CSS)
│   ├── ar/
│   │   ├── solarSystem.ts # Logic pembuatan scene AR
│   │   └── aframeComponents.ts  # Custom A-Frame components
│   ├── ui/
│   │   └── controls.ts    # Logic UI controls (chips, panel, tombol)
│   ├── main.ts            # Entry point utama
│   └── vite-env.d.ts      # Type declarations
├── index.html             # Halaman utama
├── package.json           # Dependencies dan scripts
├── tsconfig.json          # Konfigurasi TypeScript
├── vite.config.ts         # Konfigurasi Vite
└── README.md              # Dokumentasi (file ini)
```

---

## 🚀 Cara Install

### Prasyarat
- **Node.js** versi 18 atau lebih baru
- **npm** (biasanya sudah terinstall bersama Node.js)
- **Browser modern** (Chrome, Edge, Firefox, Safari)

### Langkah Instalasi

```bash
# 1. Clone atau download repository
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
# Jalankan dev server (HTTP — hanya untuk desktop)
npm run dev

# Jalankan dev server dengan HTTPS (untuk testing AR di HP)
npm run dev:https
```

Server akan berjalan di `http://localhost:5173` atau `https://localhost:5173`.

> **PENTING:** Kamera AR hanya bisa diakses di **localhost** atau **HTTPS**. Jika Anda membuka `http://192.168.x.x` di HP, kamera **tidak akan aktif** dan layar akan hitam. Gunakan `npm run dev:https` untuk testing di HP.

> **Catatan HTTPS:** Saat menggunakan `npm run dev:https`, browser HP akan menampilkan peringatan "koneksi tidak aman" karena self-signed certificate. Klik **Advanced** → **Proceed** untuk melanjutkan.

---

## 📱 Cara Testing di HP (Smartphone)

> ⚠️ **PENTING:** Kamera browser di smartphone **hanya bisa diakses melalui HTTPS**. Membuka `http://192.168.x.x` akan menyebabkan layar hitam karena browser menolak akses kamera pada koneksi tidak aman.

### Opsi 1: Dev Server HTTPS (Direkomendasikan)

```bash
# Jalankan dev server dengan HTTPS
npm run dev:https
```

1. Pastikan laptop dan HP terhubung ke **WiFi yang sama**
2. Perhatikan output di terminal, cari baris seperti:
   ```
   ➜ Network: https://192.168.x.x:5173/
   ```
3. Buka URL **HTTPS** tersebut di browser HP
4. Browser akan menampilkan peringatan keamanan → klik **Advanced** → **Proceed**
5. Izinkan akses kamera saat diminta

### Opsi 2: Melalui ngrok

```bash
# Jalankan dev server biasa
npm run dev

# Di terminal lain, buat tunnel HTTPS
npx ngrok http 5173
```

Lalu buka URL HTTPS dari ngrok di browser HP.

### Opsi 3: Deploy ke Hosting (Lihat bagian Deploy)

---

## 🌐 Cara Deploy

### Deploy ke Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Build project
npm run build

# 3. Deploy
vercel --prod
```

Atau hubungkan repository GitHub ke [vercel.com](https://vercel.com) untuk auto-deploy.

### Deploy ke Netlify

```bash
# 1. Build project
npm run build

# 2. Upload folder 'dist' ke Netlify
# Atau hubungkan repo GitHub di netlify.com
# Build command: npm run build
# Publish directory: dist
```

### Deploy ke GitHub Pages

```bash
# 1. Build project
npm run build

# 2. Deploy folder dist ke GitHub Pages
# Gunakan gh-pages package atau manual upload
npx gh-pages -d dist
```

> **PENTING:** Setelah deploy, pastikan website diakses melalui **HTTPS**. Browser smartphone **memerlukan HTTPS** untuk mengizinkan akses kamera.

---

## 🖼️ Cara Menambahkan Texture Planet

1. Siapkan file texture planet dalam format **JPG** atau **PNG**
2. Resolusi yang disarankan: **1024×512** atau **2048×1024** (equirectangular projection)
3. Letakkan file di folder `public/textures/` dengan nama berikut:

| File | Keterangan |
|------|-----------|
| `sun.jpg` | Texture permukaan Matahari |
| `mercury.jpg` | Texture Merkurius |
| `venus.jpg` | Texture Venus |
| `earth.jpg` | Texture Bumi |
| `mars.jpg` | Texture Mars |
| `jupiter.jpg` | Texture Jupiter |
| `saturn.jpg` | Texture Saturnus |
| `uranus.jpg` | Texture Uranus |
| `neptune.jpg` | Texture Neptunus |
| `saturn-ring.png` | Texture cincin Saturnus (PNG transparan) |

4. Restart dev server (`npm run dev`)
5. Texture akan otomatis ter-load saat scene AR dijalankan

> **Catatan:** Jika file texture belum tersedia, aplikasi tetap berjalan menggunakan **warna fallback** untuk setiap planet. Tidak akan terjadi error.

### Sumber Texture Gratis

- [Solar System Scope](https://www.solarsystemscope.com/textures/) — Texture planet gratis berkualitas tinggi
- [NASA 3D Resources](https://nasa3d.arc.nasa.gov/images) — Texture resmi dari NASA

---

## 🔄 Alur Sistem AR

```
┌─────────────────┐
│  User membuka   │
│    website       │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Landing Page   │
│  ditampilkan    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ User klik       │
│ "Mulai AR"      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Browser meminta │
│ izin kamera     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Kamera aktif,   │
│ AR.js berjalan  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ User arahkan    │
│ kamera ke       │
│ marker Hiro     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Marker          │
│ terdeteksi      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Mini tata surya │
│ muncul di atas  │
│ marker          │
└────────┬────────┘
         ▼
┌─────────────────┐
│ User memilih    │
│ planet via UI   │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Planet di-       │
│ highlight,      │
│ info berubah    │
└─────────────────┘
```

---

## 📋 Panduan Marker Hiro

Marker **Hiro** adalah marker default yang digunakan oleh AR.js. Berikut cara mendapatkan marker:

### Cara 1: Download dan Print
1. Download marker Hiro dari: [https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png](https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png)
2. Print di kertas putih (ukuran minimal 8×8 cm)
3. Pastikan marker tercetak jelas dan tidak terpotong

### Cara 2: Tampilkan di Layar
1. Buka link marker di atas di laptop/tablet/HP lain
2. Tampilkan gambar marker di layar
3. Arahkan kamera HP ke layar tersebut

### Tips
- Hindari pantulan cahaya pada marker
- Jaga jarak kamera 15–40 cm dari marker
- Pastikan pencahayaan cukup terang
- Jangan menutupi sebagian marker

---

## ⚠️ Catatan Penting

1. **HTTPS untuk Kamera:** Browser smartphone memerlukan koneksi **HTTPS** untuk mengizinkan akses kamera. Gunakan `localhost` (untuk development), ngrok, atau deploy ke hosting dengan HTTPS.

2. **Kompatibilitas Browser:**
   - ✅ Chrome Android (direkomendasikan)
   - ✅ Safari iOS (iOS 11+)
   - ✅ Chrome Desktop
   - ✅ Edge Desktop
   - ⚠️ Firefox (dukungan terbatas untuk AR.js)

3. **Performa:** Jika performa lambat, coba:
   - Kurangi ukuran texture (gunakan 512×256)
   - Tutup aplikasi lain di HP
   - Gunakan browser Chrome terbaru

4. **Texture Opsional:** Aplikasi berjalan normal tanpa texture. Texture hanya menambah kualitas visual.

---

## 🔧 Troubleshooting

### Layar hitam saat klik "Mulai AR"

**Penyebab:** Halaman dibuka melalui HTTP (bukan HTTPS) di smartphone.

**Solusi:**
- Gunakan `npm run dev:https` untuk testing di HP
- Atau deploy ke Vercel/Netlify (otomatis HTTPS)
- Atau gunakan ngrok: `npx ngrok http 5173`
- Di localhost/desktop biasanya tidak masalah

### Izin kamera ditolak

**Solusi:**
1. Buka pengaturan browser → Site Settings → Camera
2. Cari URL website dan ubah izin kamera menjadi "Allow"
3. Refresh halaman dan klik "Mulai AR" lagi

### Marker Hiro tidak terdeteksi

**Solusi:**
- Pastikan marker tercetak/tampil jelas dan tidak terpotong
- Jaga jarak kamera 15–40 cm dari marker
- Pastikan pencahayaan cukup terang
- Hindari pantulan cahaya pada marker
- Pastikan ukuran marker minimal 8×8 cm
- Coba pegang HP lebih stabil

### A-Frame / AR.js CDN gagal dimuat

**Penyebab:** Koneksi internet lambat atau CDN tidak tersedia.

**Solusi:**
- Pastikan koneksi internet stabil
- Coba refresh halaman
- Periksa apakah domain `aframe.io` dan `raw.githack.com` tidak diblokir

### Texture planet tidak muncul

**Solusi:**
- Pastikan file texture ada di `public/textures/`
- Nama file harus sesuai: `sun.jpg`, `mercury.jpg`, dst.
- Format: JPG untuk planet, PNG untuk saturn-ring
- Restart dev server setelah menambah texture
- Tanpa texture, aplikasi tetap jalan dengan warna fallback

---

## 🧪 Testing Checklist

- [ ] `npm install` berhasil tanpa error
- [ ] `npm run dev` berhasil menjalankan server
- [ ] Landing page tampil dengan desain rapi
- [ ] Tombol "Mulai AR" membuka mode AR
- [ ] Kamera aktif setelah izin diberikan
- [ ] Marker Hiro memunculkan tata surya 3D
- [ ] Planet mengorbit mengelilingi matahari
- [ ] Planet berotasi pada porosnya
- [ ] User bisa memilih planet via chip
- [ ] Informasi planet berubah saat planet dipilih
- [ ] Tombol pause/play berfungsi
- [ ] Tombol zoom in/out berfungsi
- [ ] Tombol reset berfungsi
- [ ] Tombol kembali berfungsi
- [ ] Project bisa di-build (`npm run build`)

---

## 📝 Lisensi

Project ini dibuat untuk keperluan akademik (Tugas Mata Kuliah Virtual dan Augmented Reality).

---

**Dibuat dengan ❤️ menggunakan A-Frame, AR.js, Vite, TypeScript, dan Tailwind CSS**
