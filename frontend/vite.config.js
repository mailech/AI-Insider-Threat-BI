import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Charting is by far the heaviest dependency; splitting it keeps the
        // initial console payload small for pages that do not render charts.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          vendor: ['axios', 'date-fns', 'lucide-react', 'clsx'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
