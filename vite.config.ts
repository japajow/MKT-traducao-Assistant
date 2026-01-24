import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração padrão do Vite para React
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  }
})
