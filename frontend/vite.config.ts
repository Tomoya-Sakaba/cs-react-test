import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [plugin()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:44346/AAA/',
        changeOrigin: true,
        secure: false, // Å© Ç±ÇÍÇí«â¡
      },
    },
  },
})
