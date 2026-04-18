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
        当前会直接加载 <code class="rounded bg-black/40 px-2 py-1">/unity-game/index.html</code>。
        如果你刚重新 Build，等资源刷新完成后再试一次。
      </p>
    </div>

    <div class="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl border border-white/20 bg-black/45 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
        <div class="min-w-0">
          <div class="truncate text-base font-black sm:text-lg">魔法衣橱</div>
          <div class="text-xs text-white/70 sm:text-sm">全屏 Unity 模式</div>
        </div>

        <div class="hidden items-center gap-3 rounded-full bg-white/10 px-3 py-2 sm:flex">
          <div class="flex items-center gap-1" title="金币">
            <span>🪙</span>
            <span class="font-black text-yellow-300">{{ wallet.coins }}</span>
          </div>
          <div class="h-4 w-px bg-white/20"></div>
          <div class="flex items-center gap-1" title="钻石">
            <span>💎</span>
            <span class="font-black text-cyan-300">{{ wallet.diamonds }}</span>
          </div>
        </div>

        <div class="pointer-events-auto flex items-center gap-2">
          <button
            @click="refreshWallet"
            :disabled="refreshingWallet"
            class="rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            {{ refreshingWallet ? '同步中...' : '同步钱包' }}
          </button>
          <button
            @click="$emit('close')"
            class="rounded-full bg-pink-400 px-3 py-2 text-xs font-black text-white transition hover:bg-pink-500 sm:px-4 sm:text-sm"
          >
            返回工坊
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isMobileMode"
      class="pointer-events-none absolute inset-x-0 bottom-0 z-30 select-none"
      style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);"
    >
      <div class="mb-2 text-center text-xs font-bold text-white/70">
        手机模式：左手移动，右手交互
      </div>

      <div class="flex items-end justify-between px-4">
        <div class="pointer-events-auto">
          <div
            ref="joystickBase"
            class="mobile-joystick relative h-32 w-32 rounded-full border border-white/20 bg-black/30 backdrop-blur-md"
            @pointerdown.prevent="startJoystick"
            @pointermove.prevent="moveJoystick"
            @pointerup.prevent="endJoystick"
            @pointercancel.prevent="endJoystick"
          >
            <div class="absolute inset-4 rounded-full border border-white/10"></div>
            <div class="mobile-joystick-thumb absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/80 shadow-xl" :style="joystickThumbStyle"></div>
          </div>
        </div>

        <div class="pointer-events-auto flex flex-col items-end gap-3">
          <button
            class="mobile-action-button h-14 min-w-[5rem] rounded-full bg-pink-500/90 px-5 text-sm font-black text-white shadow-xl"
            @pointerdown.prevent="triggerMobileAction('TriggerMobileInteract')"
          >
            交互
          </button>
          <div class="flex items-center gap-3">
            <button
              class="mobile-action-button h-12 min-w-[4.5rem] rounded-full bg-cyan-500/85 px-4 text-sm font-black text-white shadow-xl"
              @pointerdown.prevent="triggerMobileAction('TriggerMobileInteractAlternate')"
            >
              动作
            </button>
            <button
              class="mobile-action-button h-12 min-w-[4.5rem] rounded-full bg-white/20 px-4 text-sm font-black text-white shadow-xl backdrop-blur"
              @pointerdown.prevent="triggerMobileAction('TriggerMobilePause')"
            >
              暂停
            </button>
          </div>
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
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
const joystickBase = ref(null)
const joystickThumbOffset = ref({ x: 0, y: 0 })
const joystickPointerId = ref(null)
let mobileModeAnnounced = false

const joystickThumbStyle = computed(() => ({
  transform: `translate(calc(-50% + ${joystickThumbOffset.value.x}px), calc(-50% + ${joystickThumbOffset.value.y}px))`
}))

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

const getUnityInstance = () => {
  return unityFrame.value?.contentWindow?.unityInstance || null
}

const sendUnityMessage = (method, payload = '') => {
  const unityInstance = getUnityInstance()
  if (!unityInstance) return false

  unityInstance.SendMessage('GameInput', method, payload)
  return true
}

const syncMobileModeToUnity = () => {
  sendUnityMessage('SetMobileMode', isMobileMode.value ? '1' : '0')
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

const resetJoystick = () => {
  joystickPointerId.value = null
  joystickThumbOffset.value = { x: 0, y: 0 }
  sendUnityMessage('SetMobileMove', '0,0')
}

const updateJoystick = (clientX, clientY) => {
  if (!joystickBase.value) return

  const rect = joystickBase.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const maxDistance = rect.width * 0.32

  let offsetX = clientX - centerX
  let offsetY = clientY - centerY
  const distance = Math.hypot(offsetX, offsetY)

  if (distance > maxDistance && distance > 0) {
    const scale = maxDistance / distance
    offsetX *= scale
    offsetY *= scale
  }

  joystickThumbOffset.value = {
    x: Math.round(offsetX),
    y: Math.round(offsetY)
  }

  const normalizedX = offsetX / maxDistance
  const normalizedY = -offsetY / maxDistance
  sendUnityMessage('SetMobileMove', `${normalizedX.toFixed(3)},${normalizedY.toFixed(3)}`)
}

const startJoystick = (event) => {
  if (!isMobileMode.value) return

  joystickPointerId.value = event.pointerId
  event.currentTarget.setPointerCapture?.(event.pointerId)
  syncMobileModeToUnity()
  updateJoystick(event.clientX, event.clientY)
}

const moveJoystick = (event) => {
  if (joystickPointerId.value !== event.pointerId) return

  updateJoystick(event.clientX, event.clientY)
}

const endJoystick = (event) => {
  if (joystickPointerId.value !== null && joystickPointerId.value !== event.pointerId) return

  event.currentTarget.releasePointerCapture?.(event.pointerId)
  resetJoystick()
}

const triggerMobileAction = (method) => {
  syncMobileModeToUnity()
  sendUnityMessage(method, 'tap')
}

const handleUnityMessage = (event) => {
  if (event.source !== unityFrame.value?.contentWindow) return

  if (event.data?.type === 'unity-ready') {
    clearTimeout(unityLoadingTimeout)
    syncMobileModeToUnity()
    syncMoneyToUnity()

    if (isMobileMode.value && !mobileModeAnnounced) {
      mobileModeAnnounced = true
      showMessage('手机触控已启用')
    }
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

onUnmounted(() => {
  clearTimeout(unityLoadingTimeout)
  window.removeEventListener('message', handleUnityMessage)
  resetJoystick()
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

.mobile-joystick,
.mobile-action-button {
  touch-action: none;
}

.mobile-joystick-thumb {
  margin-left: -28px;
  margin-top: -28px;
}

</style>
