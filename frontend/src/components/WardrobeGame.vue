<template>
  <div class="fixed inset-0 z-[200] bg-black animate-fade-in">
    <iframe
      ref="unityFrame"
      :src="unityShellSrc"
      class="absolute inset-0 h-full w-full border-0"
      allow="autoplay; fullscreen"
      v-show="!unityLoadingError"
      @error="unityLoadingError = true"
      @load="onUnityIframeLoaded"
    ></iframe>

    <div v-if="unityLoadingError" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 px-8 text-center text-white">
      <div class="mb-4 text-6xl">🎮</div>
      <h2 class="mb-2 text-2xl font-bold">Unity 游戏加载失败</h2>
      <p class="max-w-xl text-gray-300">
        当前会直接加载 <code class="rounded bg-black/40 px-2 py-1">UNITY_GAME_BASE_URL/index.html</code>。
        如果你刚重新 Build，等资源刷新完成后再试一次。
      </p>
    </div>

    <div v-if="unityInGame" class="pointer-events-none absolute left-0 top-0 z-20 px-3 pt-3 sm:px-4 sm:pt-4" style="padding-top: calc(env(safe-area-inset-top, 0px) + 0.75rem);">
      <button
        class="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white shadow-xl backdrop-blur-md transition hover:bg-black/45 active:scale-95"
        style="opacity: 0.75;"
        @pointerdown.prevent="onMenuPointerDown"
        @pointerup.prevent="onMenuPointerUp"
        @pointercancel.prevent="onMenuPointerCancel"
        title="短按: 菜单  长按: 返回工坊"
        aria-label="菜单"
      >
        ☰
      </button>
    </div>

    <div class="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 px-3 pt-3 sm:px-4 sm:pt-4" style="padding-top: calc(env(safe-area-inset-top, 0px) + 0.75rem);">
      <div class="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-white shadow-xl backdrop-blur-md">
        <div class="flex items-center gap-1 text-xs font-black" title="金币">
          <span>🪙</span>
          <span class="text-yellow-300">{{ wallet.coins }}</span>
        </div>
        <div class="h-4 w-px bg-white/20"></div>
        <div class="flex items-center gap-1 text-xs font-black" title="钻石">
          <span>💎</span>
          <span class="text-cyan-300">{{ wallet.diamonds }}</span>
        </div>
      </div>
    </div>

    <div class="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4">
      <transition name="bounce">
        <div v-if="message" class="rounded-full border-2 border-pink-300 bg-white/92 px-6 py-3 font-black text-pink-500 shadow-xl backdrop-blur">
          ✨ {{ message }} ✨
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { supabase } from '../supabase'
import { getUnityShellUrl } from '../unity-config'

const emit = defineEmits(['close'])

const detectMobileMode = () => {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent || ''
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || (/Mac/i.test(userAgent) && navigator.maxTouchPoints > 1)
  const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 1024

  return isIOS || (isTouchDevice && isSmallScreen)
}

const message = ref('')
const wallet = ref({ coins: 0, diamonds: 0 })
const refreshingWallet = ref(false)
const isMobileMode = ref(detectMobileMode())
const unityShellSrc = computed(() => getUnityShellUrl(isMobileMode.value))
const unityInGame = ref(false)
const menuPointerDownAt = ref(0)
const MENU_LONG_PRESS_MS = 650

const showMessage = (msg) => {
  message.value = msg
  setTimeout(() => message.value = '', 3000)
}

const getAccountCredentials = () => {
  const user = sessionStorage.getItem('current_wardrobe_user') || 'zz_baby'
  const pass = sessionStorage.getItem('current_wardrobe_pass') || 'bb991210'
  return { user, pass }
}

const loadWallet = async () => {
  try {
    const { user } = getAccountCredentials()
    const { data } = await supabase.from('wallets').select('coins, diamonds').eq('username', user).maybeSingle()
    if (data) {
      wallet.value = { coins: data.coins || 0, diamonds: data.diamonds || 0 }
    }
  } catch (err) {
    console.error('Failed to load wallet', err)
  }
}

const refreshWallet = async () => {
  refreshingWallet.value = true
  try {
    await loadWallet()
    syncMoneyToUnity()
    showMessage('钱包已同步')
  } finally {
    refreshingWallet.value = false
  }
}

const syncWalletToSupabase = async (nextWallet) => {
  const { user } = getAccountCredentials()
  const { error } = await supabase
    .from('wallets')
    .update({
      coins: nextWallet.coins,
      diamonds: nextWallet.diamonds
    })
    .eq('username', user)

  if (error) throw error
}

const deductWallet = async (currency, amount) => {
  const nextWallet = { ...wallet.value }

  if (currency === 'diamonds') {
    if (nextWallet.diamonds < amount) {
      showMessage('钻石不足 😢')
      return false
    }
    nextWallet.diamonds -= amount
  } else {
    if (nextWallet.coins < amount) {
      showMessage('金币不足 😢')
      return false
    }
    nextWallet.coins -= amount
  }

  try {
    await syncWalletToSupabase(nextWallet)
    wallet.value = nextWallet
    return true
  } catch (err) {
    console.error('Failed to sync wallet', err)
    showMessage('钱包同步失败，请稍后再试 😢')
    return false
  }
}

const unityLoadingError = ref(false)
const unityFrame = ref(null)
let unityLoadingTimeout = null
let previousBodyOverflow = null

const getUnityInstance = () => {
  return unityFrame.value?.contentWindow?.unityInstance || null
}

const pauseGame = () => {
  const unityInstance = getUnityInstance()
  if (!unityInstance) {
    showMessage('游戏还在加载中...')
    return
  }

  // Trigger pause via the GameInput object in the Unity scene.
  unityInstance.SendMessage('GameInput', 'TriggerMobilePause', 'tap')
}

const onMenuPointerDown = () => {
  menuPointerDownAt.value = Date.now()
}

const onMenuPointerUp = () => {
  const elapsed = Date.now() - menuPointerDownAt.value
  menuPointerDownAt.value = 0

  // Short press: open Unity's built-in PAUSED menu.
  if (elapsed > 0 && elapsed < MENU_LONG_PRESS_MS) {
    pauseGame()
    return
  }

  // Long press: exit back to workshop.
  if (elapsed >= MENU_LONG_PRESS_MS) {
    emit('close')
  }
}

const onMenuPointerCancel = () => {
  menuPointerDownAt.value = 0
}

const syncMoneyToUnity = () => {
  const unityInstance = getUnityInstance()
  if (!unityInstance) return

  unityInstance.SendMessage('VueBridge', 'SetMoney', wallet.value.coins.toString())
}

const onUnityIframeLoaded = () => {
  // Check if it actually loaded the unity game or a 404 page
  try {
    if (unityFrame.value && unityFrame.value.contentDocument) {
      const title = unityFrame.value.contentDocument.title
      if (title && title !== 'Unity Game Shell') {
        unityLoadingError.value = true
        showMessage('Unity 壳页面没有正确加载，请刷新后重试')
        return
      }

      if (title.includes("Error") || title.includes("404")) {
        unityLoadingError.value = true
        showMessage('Unity 页面加载失败，请刷新后重试')
        return
      }
    }
  } catch (e) {
    // Cross-origin issues might mean it loaded correctly if hosted differently, 
    // but usually means it loaded.
  }

  clearTimeout(unityLoadingTimeout)
  unityLoadingTimeout = setTimeout(() => {
    showMessage('Unity 仍在加载中，如果长时间不动请按 Cmd+Shift+R 强制刷新')
  }, 30000)
}

const handleUnityMessage = (event) => {
  if (event.source !== unityFrame.value?.contentWindow) return

  if (event.data?.type === 'unity-ready') {
    clearTimeout(unityLoadingTimeout)
    syncMoneyToUnity()
  }

  if (event.data?.type === 'unity-exit') {
    emit('close')
  }

  if (event.data?.type === 'unity-in-game') {
    unityInGame.value = event.data?.value === 1 || event.data?.value === true
  }
}

const lockBodyScroll = () => {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

const unlockBodyScroll = () => {
  if (previousBodyOverflow !== null) {
    document.body.style.overflow = previousBodyOverflow
  }
}

// 建立与 Unity 的通信桥梁
onMounted(() => {
  window.addEventListener('message', handleUnityMessage)

  window.VueBridge = {
    syncMoney: (amount) => {
      // Unity 可能会同步钱，但在我们的架构里 Vue 才是主数据源
      console.log('Unity reported money:', amount);
    },
    getMoney: () => {
      syncMoneyToUnity()
    },
    requestPurchase: async (itemId, price) => {
      // Unity 项目当前只有单币种金钱字段，这里统一按金币处理并同步到 Supabase
      const purchased = await deductWallet('coins', price)
      if (unityFrame.value && unityFrame.value.contentWindow && unityFrame.value.contentWindow.unityInstance) {
        if (purchased) {
          unityFrame.value.contentWindow.unityInstance.SendMessage('VueBridge', 'OnPurchaseSuccess', itemId.toString());
          unityFrame.value.contentWindow.unityInstance.SendMessage('VueBridge', 'SetMoney', wallet.value.coins.toString());
          showMessage(`购买成功！花费了 ${price} 金币`)
        } else {
          unityFrame.value.contentWindow.unityInstance.SendMessage('VueBridge', 'OnPurchaseFailed', '金币不足或同步失败')
        }
      }
    }
  }

  loadWallet()
})

onActivated(() => {
  lockBodyScroll()
})

onDeactivated(() => {
  unlockBodyScroll()
})

onUnmounted(() => {
  clearTimeout(unityLoadingTimeout)
  window.removeEventListener('message', handleUnityMessage)
  unlockBodyScroll()
  if (window.VueBridge) {
    delete window.VueBridge
  }
})
</script>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.bounce-enter-active {
  animation: bounce-in 0.5s;
}
.bounce-leave-active {
  animation: bounce-in 0.3s reverse;
}
@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
