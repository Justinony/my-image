export const UNITY_BUILD_VERSION = '2026-04-18-1'
export const UNITY_BUILD_BASE = '/unity-game/Build'
export const UNITY_SHELL_VERSION = '2'

const versionQuery = `v=${encodeURIComponent(UNITY_BUILD_VERSION)}`

export const UNITY_INDEX_URL = `/unity-game/index.html?${versionQuery}`

export const getUnityShellUrl = (isMobile = false) =>
  `/unity-shell.html?mobile=${isMobile ? '1' : '0'}&shell=${UNITY_SHELL_VERSION}&${versionQuery}`

const pickFirst = (re, text) => {
  const m = text.match(re)
  return m ? m[1] : null
}

export const parseUnityIndexHtml = (html) => {
  // Unity index.html contains filenames under Build/, usually:
  //   "/<hash>.loader.js", "/<hash>.data.br", "/<hash>.framework.js.br", "/<hash>.wasm.br"
  const loader = pickFirst(/([0-9a-f]+\.loader\.js)/i, html)
  const data = pickFirst(/([0-9a-f]+\.data\.br)/i, html)
  const framework = pickFirst(/([0-9a-f]+\.framework\.js\.br)/i, html)
  const wasm = pickFirst(/([0-9a-f]+\.wasm\.br)/i, html)

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
