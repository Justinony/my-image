<template>
  <div class="fixed inset-0 z-[200] bg-black animate-fade-in">
    <iframe
      ref="unityFrame"
      src="/unity-shell.html"
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
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase'

const emit = defineEmits(['close'])

const message = ref('')
const wallet = ref({ coins: 0, diamonds: 0 })
const refreshingWallet = ref(false)

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

const syncMoneyToUnity = () => {
  if (unityFrame.value && unityFrame.value.contentWindow && unityFrame.value.contentWindow.unityInstance) {
    unityFrame.value.contentWindow.unityInstance.SendMessage('VueBridge', 'SetMoney', wallet.value.coins.toString())
  }
}

const onUnityIframeLoaded = () => {
  // Check if it actually loaded the unity game or a 404 page
  try {
    if (unityFrame.value && unityFrame.value.contentDocument) {
      const title = unityFrame.value.contentDocument.title;
      if (title.includes("Error") || title.includes("404")) {
        unityLoadingError.value = true;
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

// 建立与 Unity 的通信桥梁
onMounted(() => {
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
