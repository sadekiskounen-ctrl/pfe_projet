import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/odata': { target: 'http://localhost:4004', changeOrigin: true },
      '/api': { target: 'http://localhost:4004', changeOrigin: true },
    }
  },
  build: {
    outDir: '../frontend/admin',
    emptyOutDir: false, // Maintain login.html in the output directory
    rollupOptions: {
      input: {
        dashboard: './dashboard.html'
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
