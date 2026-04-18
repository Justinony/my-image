import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function unityBrotliHeaders() {
  const applyHeaders = (res, url = '') => {
    if (!url.includes('/unity-game/Build/')) return

    if (url.endsWith('.js.br')) {
      res.setHeader('Content-Type', 'application/javascript')
    } else if (url.endsWith('.wasm.br')) {
      res.setHeader('Content-Type', 'application/wasm')
    } else if (url.endsWith('.data.br')) {
      res.setHeader('Content-Type', 'application/octet-stream')
    } else {
      return
    }

    res.setHeader('Content-Encoding', 'br')
    res.setHeader('Cache-Control', 'no-store')
  }

  return {
    name: 'unity-brotli-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        applyHeaders(res, req.url || '')
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        applyHeaders(res, req.url || '')
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), unityBrotliHeaders()],
})
