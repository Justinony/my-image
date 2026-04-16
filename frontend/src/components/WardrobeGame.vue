<template>
  <div class="fixed inset-0 z-[200] bg-white flex flex-col animate-fade-in">
    <!-- Header -->
    <header class="h-14 sm:h-16 bg-gradient-to-r from-pink-100 to-purple-100 border-b-2 border-pink-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div class="flex items-center space-x-2">
        <span class="text-2xl animate-bounce-slow">👗</span>
        <h2 class="text-lg sm:text-xl font-black text-pink-600 truncate max-w-[150px] sm:max-w-none">zz宝宝的魔法衣橱</h2>
      </div>
      
      <div class="flex items-center space-x-2 sm:space-x-4">
        <!-- Wallet Display -->
        <div class="hidden sm:flex items-center space-x-3 bg-white/60 px-3 py-1 rounded-full border-2 border-pink-100 shadow-sm">
          <div class="flex items-center space-x-1" title="金币">
            <span class="text-lg leading-none">🪙</span>
            <span class="font-black text-yellow-500 text-sm">{{ wallet.coins }}</span>
          </div>
          <div class="w-px h-4 bg-pink-200"></div>
          <div class="flex items-center space-x-1" title="钻石">
            <span class="text-lg leading-none">💎</span>
            <span class="font-black text-cyan-500 text-sm">{{ wallet.diamonds }}</span>
          </div>
        </div>

        <div class="flex space-x-2 sm:space-x-3">
          <button 
            @click="saveGame" 
            :disabled="saving || loading"
            class="px-3 sm:px-4 py-1.5 sm:py-2 bg-pink-400 text-white text-xs sm:text-sm rounded-full font-bold shadow-md hover:scale-105 transition-transform active:scale-95 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '存档 💾' }}
          </button>
          <button 
            @click="loadGame" 
            :disabled="saving || loading"
            class="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-400 text-white text-xs sm:text-sm rounded-full font-bold shadow-md hover:scale-105 transition-transform active:scale-95 disabled:opacity-50"
          >
            {{ loading ? '读取中...' : '读档 📂' }}
          </button>
          <button 
            @click="$emit('close')" 
            class="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-600 text-xs sm:text-sm rounded-full font-bold shadow-md hover:scale-105 transition-transform active:scale-95"
          >
            返回工坊 🏠
          </button>
        </div>
      </div>
    </header>

    <!-- Main Game Area -->
    <div class="flex-1 flex flex-col lg:flex-row overflow-hidden bg-pink-50/30">
      
      <!-- Left: Avatar Display -->
      <div class="lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 border-b-2 lg:border-b-0 lg:border-r-4 border-white relative min-h-[40vh] lg:min-h-0 bg-gradient-to-br from-pink-50 to-purple-50">
        
        <!-- The Avatar Canvas -->
        <div class="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-white rounded-full shadow-2xl border-8 border-pink-200 flex items-center justify-center overflow-hidden relative transition-transform hover:scale-[1.02] duration-500">
          <!-- Loading Spinner Overlay -->
          <div v-if="imgLoading" class="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <span class="text-4xl animate-spin">🌀</span>
          </div>
          <img 
            :src="avatarUrl" 
            @load="imgLoading = false"
            @error="imgLoading = false"
            class="w-full h-full object-cover object-top transition-opacity duration-300"
            :class="imgLoading ? 'opacity-0' : 'opacity-100'"
          />
        </div>

        <!-- Toast Message -->
        <transition name="bounce">
          <div v-if="message" class="absolute top-4 lg:top-10 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-xl border-2 border-pink-300 text-pink-500 font-black z-20">
            ✨ {{ message }} ✨
          </div>
        </transition>
      </div>

      <!-- Right: Wardrobe Controls -->
      <div class="lg:w-1/2 bg-white flex flex-col overflow-hidden shadow-[-10px_0_20px_rgba(0,0,0,0.02)] z-10">
        
        <!-- Category Tabs -->
        <div class="flex p-3 sm:p-4 border-b-2 border-gray-100 overflow-x-auto custom-scrollbar gap-2 shrink-0 bg-white sticky top-0">
          <button 
            v-for="cat in categories" 
            :key="cat.id" 
            @click="activeCat = cat.id"
            class="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-black text-xs sm:text-sm whitespace-nowrap transition-all duration-300 shadow-sm shrink-0"
            :class="activeCat === cat.id ? 'bg-pink-400 text-white scale-105 shadow-pink-200' : 'bg-gray-50 text-gray-500 hover:bg-pink-50 border-2 border-transparent'"
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- Items Grid -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gray-50/50">
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 content-start">
             <button 
               v-for="item in currentItems" 
               :key="item" 
               @click="selectItem(activeCat, item)"
               class="aspect-square bg-white rounded-2xl border-4 hover:border-pink-300 flex items-center justify-center transition-all overflow-hidden relative group"
               :class="config[activeCat] === item ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] scale-105' : 'border-gray-100 hover:shadow-md'"
             >
               <!-- None / Remove Option -->
               <span v-if="item === 'none'" class="text-3xl opacity-50 group-hover:opacity-100 transition-opacity">🚫</span>
               
               <!-- Preview Image -->
              <img 
                v-else
                :src="getPreviewUrl(activeCat, item)" 
                loading="lazy"
                class="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-110" 
              />
               
               <!-- Active Indicator -->
               <div v-if="config[activeCat] === item" class="absolute bottom-1 right-1 w-4 h-4 bg-pink-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                 <svg class="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
               </div>
             </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../supabase'

const emit = defineEmits(['close'])

// Avatar previews are fetched via our backend `/api/avatar` proxy to avoid browser ORB/CORS issues.
// Use a style with obvious wardrobe differences (hair/clothing/accessories).
const categories = [
  {
    id: 'top',
    name: '仙女发型 💇‍♀️',
    items: [
      'curvy',
      'bigHair',
      'bun',
      'straight02',
      'froBand',
      'longButNotTooLong',
      'shortFlat',
      'shortWaved',
      'theCaesar',
      'frizzle',
      'dreads02',
      'shaggyMullet',
      'winterHat02',
      'hat',
      'hijab'
    ]
  },
  {
    id: 'clothing',
    name: '漂亮衣服 👗',
    items: [
      'blazerAndShirt',
      'blazerAndSweater',
      'collarAndSweater',
      'graphicShirt',
      'hoodie',
      'overall',
      'shirtCrewNeck',
      'shirtScoopNeck',
      'shirtVNeck'
    ]
  },
  {
    id: 'accessories',
    name: '精致配饰 👓',
    items: ['none', 'eyepatch', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers']
  },
  { id: 'backgroundColor', name: '梦幻背景 🖼️', items: ['ffd5dc', 'ffdfbf', 'c0aede', 'd1d4f9', 'ffdfdf', 'bbf7d0', 'fef08a', 'ffb6c1', '87cefa', 'ffffff'] }
]

const activeCat = ref('top')
const currentItems = computed(() => categories.find(c => c.id === activeCat.value).items)
const imgLoading = ref(true)

// Default Avatar Configuration
const config = ref({
  top: 'curvy',
  clothing: 'overall',
  accessories: 'none',
  backgroundColor: 'ffd5dc',
  // Keep a consistent face so wardrobe changes are obvious.
  hairColor: '4a312c',
  clothesColor: 'ffafb9',
  eyes: 'happy',
  mouth: 'smile',
  skinColor: 'ffdbb4'
})

const selectItem = (cat, item) => {
  if (config.value[cat] !== item) {
    imgLoading.value = true
    config.value[cat] = item
  }
}

// We use our backend proxy to fetch from Dicebear to completely bypass the browser's ORB blocking.
const avatarUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
  let url = `${baseUrl}/api/avatar?seed=zzbaby_cute`
  for (const [key, val] of Object.entries(config.value)) {
    if (val !== 'none' && val !== undefined && val !== null && val !== '') url += `&${key}=${val}`
  }
  return url
})

// Get a tiny preview for the wardrobe buttons
const getPreviewUrl = (cat, item) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
  let url = `${baseUrl}/api/avatar?seed=zzbaby_cute`
  
  const previewConfig = { ...config.value, [cat]: item }
  
  for (const [key, val] of Object.entries(previewConfig)) {
    if (val !== 'none' && val !== undefined && val !== null && val !== '') url += `&${key}=${val}`
  }

  if (cat !== 'backgroundColor') {
    url += `&backgroundColor=transparent`
  }
  
  return url
}

// State & Database logic
const saving = ref(false)
const loading = ref(false)
const message = ref('')
const wallet = ref({ coins: 0, diamonds: 0 })

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

const saveGame = async () => {
  saving.value = true
  try {
    const { user } = getAccountCredentials()
    const { error } = await supabase
      .from('saves')
      .upsert({ account: user, config: config.value })
      
    if (error) throw error
    showMessage('存档成功！你的美貌已保存 ✨')
  } catch (err) {
    console.error('Save error:', err)
    showMessage('存档失败啦，请检查数据库配置 😢')
  } finally {
    saving.value = false
  }
}

const loadGame = async () => {
  loading.value = true
  try {
    const { user } = getAccountCredentials()
    const { data, error } = await supabase
      .from('saves')
      .select('config')
      .eq('account', user)
      .maybeSingle() // Use maybeSingle to prevent PGRST116 error if row doesn't exist
      
    if (error) throw error
    
    if (data && data.config) {
      // Sanitize / migrate old saves so we don't leak unrelated keys into the avatar URL.
      const allowed = [
        'top',
        'clothing',
        'accessories',
        'backgroundColor',
        'hairColor',
        'clothesColor',
        'eyes',
        'mouth',
        'skinColor'
      ]
      const incoming = { ...data.config }
      if (incoming.hair && !incoming.top) incoming.top = incoming.hair
      if (incoming.clothingColor && !incoming.clothesColor) incoming.clothesColor = incoming.clothingColor
      const next = {}
      for (const k of allowed) {
        if (incoming[k] !== undefined) next[k] = incoming[k]
      }
      // Keep defaults for missing keys
      config.value = { ...config.value, ...next }
      imgLoading.value = true
      showMessage('读档成功！欢迎回来 💖')
    }
  } catch (err) {
    console.error('Load error:', err)
    // Only show error if it's not a simple "not found" which we handled with maybeSingle
    showMessage('没有找到你的专属存档哦 🤔')
  } finally {
    loading.value = false
  }
}

// Auto-load on mount
onMounted(() => {
  loadGame()
  loadWallet()
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

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #fbcfe8;
  border-radius: 10px;
}
</style>
