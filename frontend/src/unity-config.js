// Bump this after each Unity WebGL rebuild to invalidate caches (index.html, loader/data/wasm).
export const UNITY_BUILD_VERSION = '2026-04-23-1'

// Unity static files are too large for Cloudflare Pages (25 MiB per-file limit).
// Host Unity output (unity-game/) on a separate static host/CDN (e.g. R2 public bucket),
// then point the frontend at it via VITE_UNITY_GAME_BASE_URL.
//
// Examples:
// - VITE_UNITY_GAME_BASE_URL=/unity-game                (local dev / same-origin)
// - VITE_UNITY_GAME_BASE_URL=https://cdn.example.com/unity-game
const normalizeBase = (s) => {
  const raw = (s || '').trim()
  if (!raw) return '/unity-game'
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export const UNITY_GAME_BASE_URL = normalizeBase(import.meta.env.VITE_UNITY_GAME_BASE_URL)
export const UNITY_BUILD_BASE = `${UNITY_GAME_BASE_URL}/Build`
export const UNITY_SHELL_VERSION = '2'

const versionQuery = `v=${encodeURIComponent(UNITY_BUILD_VERSION)}`

export const UNITY_INDEX_URL = `${UNITY_GAME_BASE_URL}/index.html?${versionQuery}`

export const getUnityShellUrl = (isMobile = false) =>
  `/unity-shell.html?mobile=${isMobile ? '1' : '0'}&shell=${UNITY_SHELL_VERSION}&base=${encodeURIComponent(
    UNITY_GAME_BASE_URL
  )}&${versionQuery}`

const pickFirst = (re, text) => {
  const m = text.match(re)
  return m ? m[1] : null
}

export const parseUnityIndexHtml = (html) => {
  // Unity index.html contains filenames under Build/, usually:
  //   "/<hash>.loader.js"
  //   "/<hash>.data(.br|.gz)?"
  //   "/<hash>.framework.js(.br|.gz)?"
  //   "/<hash>.wasm(.br|.gz)?"
  const loader = pickFirst(/([0-9a-f]+\.loader\.js)/i, html)

  const pickPrefer = (res) => {
    for (const re of res) {
      const v = pickFirst(re, html)
      if (v) return v
    }
    return null
  }

  // Prefer compressed assets when multiple variants exist.
  const data = pickPrefer([
    /([0-9a-f]+\.data\.br)/i,
    /([0-9a-f]+\.data\.gz)/i,
    /([0-9a-f]+\.data)/i
  ])
  const framework = pickPrefer([
    /([0-9a-f]+\.framework\.js\.br)/i,
    /([0-9a-f]+\.framework\.js\.gz)/i,
    /([0-9a-f]+\.framework\.js)/i
  ])
  const wasm = pickPrefer([
    /([0-9a-f]+\.wasm\.br)/i,
    /([0-9a-f]+\.wasm\.gz)/i,
    /([0-9a-f]+\.wasm)/i
  ])

  if (!loader || !data || !framework || !wasm) {
    return null
  }

  return { loader, data, framework, wasm }
}

export const getUnityWarmupUrls = async () => {
  const res = await fetch(UNITY_INDEX_URL, { credentials: 'same-origin' })
  const html = await res.text()
  const parsed = parseUnityIndexHtml(html)
  if (!parsed) return []

  // Add the same version query to ensure cache/version consistency.
  return [
    `${UNITY_BUILD_BASE}/${parsed.loader}?${versionQuery}`,
    `${UNITY_BUILD_BASE}/${parsed.framework}?${versionQuery}`,
    `${UNITY_BUILD_BASE}/${parsed.data}?${versionQuery}`,
    `${UNITY_BUILD_BASE}/${parsed.wasm}?${versionQuery}`
  ]
}
