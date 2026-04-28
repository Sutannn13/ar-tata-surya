import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * Vite Configuration
 *
 * Untuk development biasa:
 *   npm run dev
 *
 * Untuk testing AR di HP (HTTPS diperlukan untuk akses kamera):
 *   npm run dev:https
 *
 * Catatan: Saat menggunakan HTTPS dengan self-signed certificate,
 * browser HP akan menampilkan peringatan keamanan. Klik "Advanced"
 * lalu "Proceed" untuk melanjutkan.
 */
export default defineConfig(({ mode }) => {
  const useHttps = process.env.VITE_HTTPS === 'true';

  return {
    plugins: [
      tailwindcss(),
      // Aktifkan basic-ssl hanya saat VITE_HTTPS=true
      ...(useHttps ? [basicSsl()] : []),
    ],
    server: {
      host: true, // agar bisa diakses dari HP via IP lokal
      port: 5173,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});
