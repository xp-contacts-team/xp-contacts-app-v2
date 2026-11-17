import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const fromRoot = (value: string) => path.resolve(rootDir, value)

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^react$/, replacement: fromRoot('node_modules/react/index.js') },
      {
        find: /^react\/jsx-runtime$/,
        replacement: fromRoot('node_modules/react/jsx-runtime.js'),
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: fromRoot('node_modules/react/jsx-dev-runtime.js'),
      },
      { find: /^react-dom$/, replacement: fromRoot('node_modules/react-dom/index.js') },
      {
        find: /^react-dom\/client$/,
        replacement: fromRoot('node_modules/react-dom/client.js'),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
    restoreMocks: true,
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
  },
})
