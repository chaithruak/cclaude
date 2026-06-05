import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isElectronBuild = process.env.ELECTRON_BUILD === '1'

export default defineConfig({
  plugins: [react()],
  base: isElectronBuild ? './' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      }
    }
  }
})
