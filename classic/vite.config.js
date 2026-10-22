import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import sass from 'sass';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  build: {
    cssMinify: 'esbuild',
  },
  css: {
    preprocessorOptions: {
      scss: {
        implementation: sass,
        logger: {
          warn: (message) => {
            if (
              !message.includes('Deprecation Warning') &&
              !message.includes('@import rules are deprecated') &&
              !message.includes('Global built-in functions are deprecated and will be removed') &&
              !message.includes('The legacy JS API is deprecated and will be removed') &&
              !message.includes('https://sass-lang.com/d/color-functions') &&
              !message.includes('repetitive deprecation warnings omitted')
            ) {
              console.warn(message); // Only log non-deprecation warnings
            }
          },
        },
      },
    },
  },
  resolve: {
    alias: {
      moment: 'moment/moment.js', // Adjust path if needed
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
