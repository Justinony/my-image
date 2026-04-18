# Debug Session: unity-webgl-runtime
- **Status**: [OPEN]
- **Issue**: Unity WebGL 在网站内加载到进度条后触发 `RuntimeError: unreachable`，无法进入游戏
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-unity-webgl-runtime.ndjson

## Reproduction Steps
1. 启动前端本地服务
2. 打开网站并点击“魔法衣橱”
3. Unity WebGL 加载到进度条后报 `RuntimeError: unreachable`

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Unity 资源都已加载，但启动场景脚本在运行时抛错并触发 wasm unreachable | High | Med | Confirmed |
| B | VueBridge/iframe 通信在 Unity 初始化早期触发异常调用 | Med | Low | Rejected |
| C | WebGL 下某个插件/桥接不可用，进入错误分支后崩溃 | High | Med | Pending |
| D | 场景依赖缺失资源或对象引用为空，启动期触发内部断言 | Med | Med | Confirmed |

## Log Evidence
- `bootstrap`、`loader-script`、`create-instance` 均成功上报，说明页面和资源入口正常
- 进度只到约 `50.8%`，且从未出现 `instance-ready`
- `window-error` / `create-instance-error` 均记录到 `RuntimeError: unreachable`
- 静态检索确认 `GameManager.Awake -> SaveManager.InitData -> DataBase/FileTools.ReadJson` 在启动期同步读取 `StreamingAssets`
- 静态检索确认 `LuaUIBehaviour.Awake -> LoadStreamingAssetsFile` 在启动期同步读取 `StreamingAssets/*.lua.txt`
- 新一轮 `unity-shell` 日志显示进度稳定推进到约 `75.68%`
- 崩溃栈包含 `Object.removeRunDependency`、`Object.reconcile`、`IDBRequest.<anonymous>`，指向 WebGL IndexedDB/缓存协调阶段
- 当前壳页面每次加载都复用同名 `unity-game.data.gz / wasm.gz / framework.js.gz`，与频繁重建场景高度相关
- 项目当前 `ProjectSettings.asset` 中 `webGLExceptionSupport: 1`，这对应默认的 `Explicitly Thrown Exceptions Only`，容易把托管异常折叠成浏览器侧 `RuntimeError: unreachable`

## Verification Conclusion
- 已排除前端入口和 `VueBridge` 初始化时序问题
- 当前最可能根因是 WebGL 启动期同步文件 IO/资源读取路径不兼容，导致 Unity 主场景初始化崩溃
- 当前又新增一个高概率根因：浏览器 IndexedDB/缓存命中旧构建资源，与新 Build 产物错配，导致 wasm 启动时 `unreachable`
- 下一步通过将 WebGL Exception Support 提升为 Full With Stacktrace，获取真正的托管异常文本，再决定最终修复点
