export const UNITY_BUILD_VERSION = '2026-04-18-1'
export const UNITY_BUILD_BASE = '/unity-game/Build'
export const UNITY_SHELL_VERSION = '2'

const versionQuery = `v=${encodeURIComponent(UNITY_BUILD_VERSION)}`

export const UNITY_WARMUP_URLS = [
  `${UNITY_BUILD_BASE}/unity-game.loader.js?${versionQuery}`,
  `${UNITY_BUILD_BASE}/unity-game.framework.js.br?${versionQuery}`,
  `${UNITY_BUILD_BASE}/unity-game.data.br?${versionQuery}`,
  `${UNITY_BUILD_BASE}/unity-game.wasm.br?${versionQuery}`
]

export const getUnityShellUrl = (isMobile = false) =>
  `/unity-shell.html?mobile=${isMobile ? '1' : '0'}&shell=${UNITY_SHELL_VERSION}&${versionQuery}`
