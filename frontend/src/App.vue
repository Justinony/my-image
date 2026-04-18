<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import axios from 'axios'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import confetti from 'canvas-confetti'
import { supabase } from './supabase'
import { UNITY_WARMUP_URLS } from './unity-config'

import AuthModal from './components/AuthModal.vue'
import WardrobeGame from './components/WardrobeGame.vue'

// App State
const isWelcomeScreen = ref(true)
const isDragging = ref(false)
const showAuthModal = ref(false)
const showWardrobeGame = ref(false)
const isWardrobeLoading = ref(false)
const unityWarmupStarted = ref(false)

let unityWarmupTimer = null
let unityWarmupController = null

const clearUnityWarmupTimer = () => {
  if (unityWarmupTimer === null) return

  if (typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(unityWarmupTimer)
  } else {
    clearTimeout(unityWarmupTimer)
  }

  unityWarmupTimer = null
}

const startUnityWarmup = () => {
  if (unityWarmupStarted.value || typeof window === 'undefined') return

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (connection?.saveData) return

  unityWarmupStarted.value = true
  unityWarmupController = new AbortController()

  for (const url of UNITY_WARMUP_URLS) {
    fetch(url, {
      credentials: 'same-origin',
      cache: 'force-cache',
      signal: unityWarmupController.signal
    }).catch(() => {})
  }
}

const scheduleUnityWarmup = () => {
  if (unityWarmupStarted.value || typeof window === 'undefined') return

  clearUnityWarmupTimer()

  const runWarmup = () => {
    unityWarmupTimer = null
    if (!isWelcomeScreen.value && !showAuthModal.value && !showWardrobeGame.value) {
      startUnityWarmup()
    }
  }

  if (typeof requestIdleCallback === 'function') {
    unityWarmupTimer = requestIdleCallback(runWarmup, { timeout: 2000 })
  } else {
    unityWarmupTimer = window.setTimeout(runWarmup, 1200)
  }
}

const handleOpenMagicDoor = async () => {
  const savedUser = localStorage.getItem('zz_wardrobe_username')
  const savedPass = localStorage.getItem('zz_wardrobe_password')
  
  if (savedUser && savedPass) {
    try {
      const { data, error: dbErr } = await supabase
        .from('accounts')
        .select('password')
        .eq('username', savedUser)
        .maybeSingle()

      if (!dbErr && data) {
        if (data.password === savedPass || (savedUser === 'zz_baby' && savedPass === 'bb991210')) {
          sessionStorage.setItem('current_wardrobe_user', savedUser)
          sessionStorage.setItem('current_wardrobe_pass', savedPass)
          isWelcomeScreen.value = false
          return
        }
      }
    } catch (e) {
      console.error('Auto login failed', e)
    }
  }
  
  showAuthModal.value = true
}

const handleGlobalLogin = (username) => {
  showAuthModal.value = false
  isWelcomeScreen.value = false
  scheduleUnityWarmup()
}

const openWardrobe = () => {
  startUnityWarmup()
  showWardrobeGame.value = true
}

const handleWardrobeClose = () => {
  showWardrobeGame.value = false
}

const logout = () => {
  localStorage.removeItem('zz_wardrobe_username')
  localStorage.removeItem('zz_wardrobe_password')
  sessionStorage.removeItem('current_wardrobe_user')
  sessionStorage.removeItem('current_wardrobe_pass')
  window.location.reload()
}

const files = ref([]) // Array of { id, file, previewUrl, status, resultUrl, resultSize, error, customForm }
const selectedFileId = ref(null)
const isProcessing = ref(false)
const applyToAll = ref(true)
const showSuccessMessage = ref(false)
const currentSuccessMessage = ref('')

const cuteMessages = [
  "✨ zz小宝宝今天也超可爱呢！ ✨",
  "💖 哇哦！这是谁家的小仙女呀！ 💖",
  "🌸 魔法施展成功！美貌度 +10000 🌸",
  "🎀 世界上怎么会有这么甜的宝宝！ 🎀",
  "👑 简直就是迪士尼在逃公主本人！ 👑",
  "✨ 仙女棒挥一挥，照片变得更美啦！ ✨",
  "💫 叮咚！你有一份可爱等待查收！ 💫",
  "💕 今天也是被宝宝美貌迷倒的一天！ 💕",
  "🧚‍♀️ 下凡辛苦啦，我的小仙女！ 🧚‍♀️",
  "🍓 甜度超标警告！100%纯甜！ 🍓",
  "🌟 满天星光都不如你耀眼！ 🌟",
  "🥰 看到宝宝的照片，心都要化了！ 🥰",
  "🦋 魔法精灵说：你是最美的！ 🦋",
  "🍭 像草莓味棒棒糖一样甜！ 🍭",
  "🌈 你的笑容比彩虹还要灿烂！ 🌈",
  "🔮 叮！捕捉到一只野生小仙女！ 🔮",
  "🎈 每一张照片都在散发魅力！ 🎈",
  "💝 这么好看一定是魔法的作用吧！ 💝",
  "🌷 仿佛闻到了花香，原来是宝宝！ 🌷",
  "🍒 今天的美貌也是正常营业中！ 🍒",
  "🎀 精致度满分，可爱度爆表！ 🎀",
  "💫 你的美丽已经被宇宙记录啦！ 💫",
  "🌸 春风十里都不如你！ 🌸",
  "✨ 这绝美的颜值，真是太犯规啦！ ✨",
  "💖 魔法工坊为你转身，打出100分！ 💖",
  "👑 戴上皇冠，你就是女王！ 👑",
  "🥰 怎么看都看不够呢！ 🥰",
  "🌟 闪闪发光的小仙女，你好呀！ 🌟",
  "🍓 每一天都要像今天一样开心哦！ 🍓",
  "🦋 你就像童话里走出来的一样！ 🦋"
]

// Preview Modal State
const showModal = ref(false)
const currentPreviewIndex = ref(0)

// Theme Config
const themes = {
  pink: {
    primary: 'pink',
    bg: 'bg-pink-50',
    header: 'bg-gradient-to-r from-pink-100 to-rose-100',
    text: 'text-pink-600',
    btn: 'bg-pink-400 hover:bg-pink-500',
    border: 'border-pink-200',
    ring: 'focus:ring-pink-300',
    accent: 'bg-pink-100',
    icon: '🌸'
  },
  blue: {
    primary: 'blue',
    bg: 'bg-sky-50',
    header: 'bg-gradient-to-r from-sky-100 to-blue-100',
    text: 'text-sky-600',
    btn: 'bg-sky-400 hover:bg-sky-500',
    border: 'border-sky-200',
    ring: 'focus:ring-sky-300',
    accent: 'bg-sky-100',
    icon: '🐳'
  },
  purple: {
    primary: 'purple',
    bg: 'bg-violet-50',
    header: 'bg-gradient-to-r from-violet-100 to-fuchsia-100',
    text: 'text-violet-600',
    btn: 'bg-violet-400 hover:bg-violet-500',
    border: 'border-violet-200',
    ring: 'focus:ring-violet-300',
    accent: 'bg-violet-100',
    icon: '🦄'
  },
  cyan: {
    primary: 'cyan',
    bg: 'bg-cyan-50',
    header: 'bg-gradient-to-r from-cyan-100 to-teal-100',
    text: 'text-cyan-600',
    btn: 'bg-cyan-500 hover:bg-cyan-600',
    border: 'border-cyan-200',
    ring: 'focus:ring-cyan-300',
    accent: 'bg-cyan-100',
    icon: '🧊'
  },
  slate: {
    primary: 'slate',
    bg: 'bg-slate-50',
    header: 'bg-gradient-to-r from-slate-200 to-gray-200',
    text: 'text-slate-600',
    btn: 'bg-slate-500 hover:bg-slate-600',
    border: 'border-slate-300',
    ring: 'focus:ring-slate-400',
    accent: 'bg-slate-200',
    icon: '❄️'
  },
  emerald: {
    primary: 'emerald',
    bg: 'bg-emerald-50',
    header: 'bg-gradient-to-r from-emerald-100 to-green-100',
    text: 'text-emerald-600',
    btn: 'bg-emerald-500 hover:bg-emerald-600',
    border: 'border-emerald-200',
    ring: 'focus:ring-emerald-300',
    accent: 'bg-emerald-100',
    icon: '🍃'
  }
}
const currentTheme = ref('pink')
const t = computed(() => themes[currentTheme.value])

// Constants
const dpi = 300
const photoPresets = [
  { name: '1寸', widthPx: 295, heightPx: 413 },
  { name: '小1寸', widthPx: 260, heightPx: 378 },
  { name: '大1寸', widthPx: 390, heightPx: 567 },
  { name: '2寸', widthPx: 413, heightPx: 579 },
  { name: '小2寸', widthPx: 390, heightPx: 531 },
  { name: '大2寸', widthPx: 413, heightPx: 626 }
]

// Global default form
const globalForm = ref({
  format: 'jpeg',
  width: 295,
  height: 413,
  scale: null,
  quality: 85,
  targetSizeMode: 'none', // none, max, min, exact
  targetSizeValue: null,
  targetSizeUnit: 'KB', // KB or MB
  bgColor: '',
  unit: 'px',
  keepAspectRatio: true,
  aspectRatio: 413 / 295
})

// Computed: Which form is currently active in the sidebar?
const activeForm = computed(() => {
  if (applyToAll.value || !selectedFileId.value) return globalForm.value
  const file = files.value.find(f => f.id === selectedFileId.value)
  if (!file) return globalForm.value
  if (!file.customForm) {
    file.customForm = JSON.parse(JSON.stringify(globalForm.value))
  }
  return file.customForm
})

// Conversion Utilities
const getPixels = (value, unit) => {
  if (!value) return null
  if (unit === 'px') return Math.round(value)
  if (unit === 'in') return Math.round(value * dpi)
  if (unit === 'cm') return Math.round((value / 2.54) * dpi)
  return Math.round(value)
}

const fromPixels = (pixels, unit) => {
  if (!pixels) return null
  if (unit === 'px') return pixels
  if (unit === 'in') return Number((pixels / dpi).toFixed(2))
  if (unit === 'cm') return Number(((pixels / dpi) * 2.54).toFixed(2))
  return pixels
}

// Event Handlers: Form Changes
const handleUnitChange = (oldUnit, newUnit) => {
  if (oldUnit === newUnit) return
  const form = activeForm.value
  const widthPx = getPixels(form.width, oldUnit)
  const heightPx = getPixels(form.height, oldUnit)
  form.unit = newUnit
  form.width = fromPixels(widthPx, newUnit)
  form.height = fromPixels(heightPx, newUnit)
}

const handleWidthChange = () => {
  const form = activeForm.value
  if (form.keepAspectRatio && form.width) {
    form.height = Number((form.width * form.aspectRatio).toFixed(form.unit === 'px' ? 0 : 2))
  } else if (!form.keepAspectRatio && form.width && form.height) {
    form.aspectRatio = form.height / form.width
  }
}

const handleHeightChange = () => {
  const form = activeForm.value
  if (form.keepAspectRatio && form.height) {
    form.width = Number((form.height * (1 / form.aspectRatio)).toFixed(form.unit === 'px' ? 0 : 2))
  } else if (!form.keepAspectRatio && form.width && form.height) {
    form.aspectRatio = form.height / form.width
  }
}

const applyPreset = (preset) => {
  const form = activeForm.value
  form.unit = 'px'
  form.width = preset.widthPx
  form.height = preset.heightPx
  form.aspectRatio = preset.heightPx / preset.widthPx
}

// File Handlers
const fileInput = ref(null)
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFiles = (newFiles) => {
  Array.from(newFiles).forEach(file => {
    if (!file.type.startsWith('image/')) return
    const id = Date.now() + Math.random().toString(36).substr(2, 9)
    files.value.push({
      id,
      file,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      previewUrl: URL.createObjectURL(file),
      status: 'pending', // pending, processing, success, error
      resultUrl: null,
      resultSize: null,
      resultFilename: null,
      error: null,
      customForm: null
    })
    if (!selectedFileId.value) selectedFileId.value = id
  })
}

const handleFileChange = (e) => {
  if (e.target.files.length) handleFiles(e.target.files)
  e.target.value = ''
}

const handleDrop = (e) => {
  isDragging.value = false
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
}

const removeFile = (id) => {
  files.value = files.value.filter(f => f.id !== id)
  if (selectedFileId.value === id) {
    selectedFileId.value = files.value.length ? files.value[0].id : null
  }
}

const clearAll = () => {
  files.value = []
  selectedFileId.value = null
}

// Processing
const processFile = async (f) => {
  f.status = 'processing'
  f.error = null
  
  const formToUse = applyToAll.value ? globalForm.value : (f.customForm || globalForm.value)
  const formData = new FormData()
  
  formData.append('file', f.file)
  formData.append('format', formToUse.format)
  
  const widthPx = getPixels(formToUse.width, formToUse.unit)
  const heightPx = getPixels(formToUse.height, formToUse.unit)
  
  if (widthPx) formData.append('width', widthPx)
  if (heightPx) formData.append('height', heightPx)
  if (formToUse.scale) formData.append('scale', formToUse.scale / 100)
  formData.append('quality', formToUse.quality)
  
  if (formToUse.targetSizeMode !== 'none' && formToUse.targetSizeValue) {
    const sizeInKB = formToUse.targetSizeUnit === 'MB' 
      ? formToUse.targetSizeValue * 1024 
      : formToUse.targetSizeValue
    formData.append('target_size_kb', sizeInKB)
    formData.append('target_size_mode', formToUse.targetSizeMode)
  }
  
  if (formToUse.bgColor) formData.append('bg_color', formToUse.bgColor)

  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    const response = await axios.post(`${baseUrl}/api/process-image`, formData, {
      responseType: 'blob'
    })
    
    const disposition = response.headers['content-disposition']
    let filename = `processed_${f.name.split('.')[0]}.${formToUse.format}`
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      const matches = filenameRegex.exec(disposition)
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '')
      }
    }
    
    f.resultFilename = decodeURIComponent(filename)
    f.resultSize = (response.data.size / 1024).toFixed(2)
    f.resultUrl = window.URL.createObjectURL(new Blob([response.data]))
    f.status = 'success'
  } catch (err) {
    console.error(err)
    f.status = 'error'
    f.error = '处理失败'
  }
}

const processAll = async () => {
  if (!files.value.length || isProcessing.value) return
  isProcessing.value = true
  
  // Process sequentially or in parallel depending on your needs. 
  // Parallel is faster but might overload if too many images.
  const promises = files.value.map(f => processFile(f))
  await Promise.all(promises)
  
  isProcessing.value = false

  // Check if any succeeded to trigger success animation
  if (files.value.some(f => f.status === 'success')) {
    triggerSuccessAnimation()
  }
}

const triggerSuccessAnimation = () => {
  // Show random cute message
  currentSuccessMessage.value = cuteMessages[Math.floor(Math.random() * cuteMessages.length)];
  showSuccessMessage.value = true;

  // 1. Full screen fireworks
  const duration = 1.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    // Adapt initial fireworks colors based on theme
    let fireworkColors = ['#FFD700', '#FF69B4', '#FF1493', '#ff0000', '#87CEEB', '#9370DB'];
    if (currentTheme.value === 'slate') fireworkColors = ['#FFFFFF', '#D3D3D3', '#A9A9A9', '#FFD700'];
    if (currentTheme.value === 'emerald') fireworkColors = ['#FFD700', '#00FF7F', '#3CB371', '#20B2AA'];
    if (currentTheme.value === 'cyan') fireworkColors = ['#E0FFFF', '#00FFFF', '#7FFFD4', '#40E0D0'];
    if (currentTheme.value === 'blue') fireworkColors = ['#ADD8E6', '#87CEFA', '#1E90FF', '#4169E1'];

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults, particleCount,
      origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
      colors: fireworkColors
    });
  }, 200);

  // 2. Transition to particle heart outline
  setTimeout(() => {
    const end = Date.now() + 1500;
    
    // Choose colors based on the current theme to match the vibe
    let heartColors = ['#FF1493', '#ff0a54', '#ff477e', '#ff7096', '#ff85a1'];
    if (currentTheme.value === 'blue' || currentTheme.value === 'cyan') {
      heartColors = ['#00BFFF', '#87CEEB', '#1E90FF', '#4682B4', '#00CED1'];
    } else if (currentTheme.value === 'purple') {
      heartColors = ['#9370DB', '#8A2BE2', '#9400D3', '#DA70D6', '#DDA0DD'];
    } else if (currentTheme.value === 'emerald') {
      heartColors = ['#2E8B57', '#3CB371', '#20B2AA', '#66CDAA', '#00FA9A'];
    } else if (currentTheme.value === 'slate') {
      heartColors = ['#A9A9A9', '#C0C0C0', '#D3D3D3', '#778899', '#B0C4DE'];
    }

    (function frame() {
      // Create continuous fireworks that look like heart bursts from different angles
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: heartColors,
        zIndex: 9999
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: heartColors,
        zIndex: 9999
      });
      
      // Heart-like explosion in the center
      confetti({
        particleCount: 12,
        spread: 360,
        startVelocity: 35,
        origin: { x: 0.5, y: 0.5 },
        colors: heartColors,
        zIndex: 9999,
        gravity: 0.8
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
    
    // Fallback manual big heart burst (Top-Left, Top-Right, Bottom-Center)
    // This creates a large visual heart shape manually
    setTimeout(() => {
      confetti({ particleCount: 150, spread: 60, angle: 135, startVelocity: 60, origin: { x: 0.35, y: 0.4 }, colors: heartColors, zIndex: 9999 });
      confetti({ particleCount: 150, spread: 60, angle: 45, startVelocity: 60, origin: { x: 0.65, y: 0.4 }, colors: heartColors, zIndex: 9999 });
      confetti({ particleCount: 200, spread: 80, angle: 270, startVelocity: 70, origin: { x: 0.5, y: 0.3 }, colors: heartColors, zIndex: 9999 });
    }, 200);

  }, 800);

  // 3. Hide text after 3.5 seconds
  setTimeout(() => {
    showSuccessMessage.value = false;
  }, 3500);
}

// Download
const downloadFile = (f) => {
  if (!f.resultUrl) return
  saveAs(f.resultUrl, f.resultFilename)
}

const downloadAll = async () => {
  const successfulFiles = files.value.filter(f => f.status === 'success')
  if (successfulFiles.length === 0) return
  
  if (successfulFiles.length === 1) {
    downloadFile(successfulFiles[0])
    return
  }
  
  const zip = new JSZip()
  for (const f of successfulFiles) {
    const response = await fetch(f.resultUrl)
    const blob = await response.blob()
    zip.file(f.resultFilename, blob)
  }
  
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'processed_images.zip')
}

// Modal Navigation
const openPreview = (index) => {
  currentPreviewIndex.value = index
  showModal.value = true
}

const prevPreview = () => {
  if (currentPreviewIndex.value > 0) currentPreviewIndex.value--
}

const nextPreview = () => {
  if (currentPreviewIndex.value < files.value.length - 1) currentPreviewIndex.value++
}

watch([isWelcomeScreen, showAuthModal], ([welcomeScreenVisible, authModalVisible]) => {
  if (!welcomeScreenVisible && !authModalVisible) {
    scheduleUnityWarmup()
  }
})

onUnmounted(() => {
  clearUnityWarmupTimer()
  unityWarmupController?.abort()
})
</script>

<template>
  <div class="relative min-h-screen lg:h-screen font-sans flex flex-col transition-colors duration-500 lg:overflow-hidden" :class="t.bg">
    
    <AuthModal 
      v-if="showAuthModal" 
      @close="showAuthModal = false" 
      @login-success="handleGlobalLogin" 
    />
    <WardrobeGame 
      v-if="showWardrobeGame" 
      @close="handleWardrobeClose" 
    />

    <!-- Welcome Screen -->
    <transition name="welcome-fade">
      <div v-if="isWelcomeScreen" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl transition-colors duration-500">
        <div class="text-7xl sm:text-8xl animate-bounce-slow mb-6 sm:mb-8">{{ t.icon }}</div>
        <h1 class="text-3xl sm:text-5xl md:text-6xl font-black mb-3 sm:mb-4 text-center px-4 drop-shadow-sm" :class="t.text">zz 小宝宝专属工坊 ✨</h1>
        <p class="text-base sm:text-lg md:text-xl text-gray-500 font-bold mb-8 sm:mb-12 text-center px-4">最可爱、最简单的图片处理魔法 🪄</p>
        <button @click="handleOpenMagicDoor" class="px-8 py-4 sm:px-10 sm:py-5 rounded-full text-white text-lg sm:text-xl font-black shadow-2xl hover:scale-110 hover:-translate-y-2 transition-all duration-300 active:scale-95 animate-pulse-slow" :class="t.btn">
          开启魔法大门 🚪✨
        </button>
      </div>
    </transition>

    <!-- Success Floating Message -->
    <transition name="toast-fade">
      <div v-if="showSuccessMessage" class="fixed top-[15%] left-1/2 -translate-x-1/2 z-[110] pointer-events-none">
        <div class="bg-white/90 backdrop-blur-md px-6 sm:px-8 py-3 sm:py-4 rounded-full shadow-2xl border-4 border-pink-200 flex flex-col items-center animate-bounce-slow">
          <span class="text-xl sm:text-3xl font-black text-pink-500 tracking-wider text-center drop-shadow-sm whitespace-nowrap">
            {{ currentSuccessMessage }}
          </span>
        </div>
      </div>
    </transition>

    <!-- Top Header -->
    <header class="shadow-sm border-b z-20 shrink-0 sticky top-0 transition-colors duration-500" :class="[t.header, t.border]">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        <div class="flex items-center space-x-1.5 sm:space-x-3">
          <div class="text-lg sm:text-2xl animate-bounce-slow">{{ t.icon }}</div>
          <h1 class="text-sm sm:text-xl font-black tracking-tight truncate max-w-[140px] sm:max-w-none" :class="t.text">zz 小宝宝专属工坊 ✨</h1>
        </div>
        <div class="flex items-center space-x-1.5 sm:space-x-4">
          <!-- Theme Switcher -->
          <div class="flex space-x-1 sm:space-x-2 bg-white/50 backdrop-blur-sm p-1 rounded-full border border-white">
            <button @click="currentTheme = 'pink'" class="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-pink-400 hover:scale-110 transition-transform shadow-sm" :class="{'ring-2 ring-white ring-offset-1': currentTheme === 'pink'}" title="樱花粉"></button>
            <button @click="currentTheme = 'blue'" class="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-sky-400 hover:scale-110 transition-transform shadow-sm" :class="{'ring-2 ring-white ring-offset-1': currentTheme === 'blue'}" title="天空蓝"></button>
            <button @click="currentTheme = 'purple'" class="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-violet-400 hover:scale-110 transition-transform shadow-sm" :class="{'ring-2 ring-white ring-offset-1': currentTheme === 'purple'}" title="梦幻紫"></button>
            <button @click="currentTheme = 'cyan'" class="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-cyan-400 hover:scale-110 transition-transform shadow-sm" :class="{'ring-2 ring-white ring-offset-1': currentTheme === 'cyan'}" title="冰川青"></button>
            <button @click="currentTheme = 'emerald'" class="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-emerald-400 hover:scale-110 transition-transform shadow-sm" :class="{'ring-2 ring-white ring-offset-1': currentTheme === 'emerald'}" title="薄荷绿"></button>
            <button @click="currentTheme = 'slate'" class="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-slate-400 hover:scale-110 transition-transform shadow-sm" :class="{'ring-2 ring-white ring-offset-1': currentTheme === 'slate'}" title="极简灰"></button>
          </div>
          
          <!-- Magic Wardrobe Portal -->
          <button 
            @click="openWardrobe" 
            @mouseenter="scheduleUnityWarmup"
            @touchstart.passive="scheduleUnityWarmup"
            class="px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-pink-400 to-purple-400 text-white text-[10px] sm:text-sm font-bold rounded-full shadow-md hover:scale-105 transition-all flex items-center shrink-0 active:scale-95"
          >
            <span class="mr-1 hidden sm:inline">👑</span>魔法衣橱
          </button>

          <!-- Logout Button -->
          <button 
            @click="logout" 
            class="px-2 sm:px-4 py-1 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-600 text-[10px] sm:text-sm font-bold rounded-full shadow-md transition-all flex items-center shrink-0 active:scale-95"
          >
            退出登录 🚪
          </button>

          <button v-if="files.length" @click="clearAll" class="hidden sm:block text-xs sm:text-sm font-bold text-gray-500 hover:text-red-500 transition-colors bg-white/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">清空全部 🗑️</button>
          <button v-if="files.some(f => f.status === 'success')" @click="downloadAll" class="px-2 sm:px-4 py-1 sm:py-2 text-white text-[10px] sm:text-sm font-bold rounded-full shadow-md transition-all flex items-center hover:scale-105 active:scale-95 shrink-0" :class="t.btn">
            <svg class="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span class="hidden sm:inline">打包带走 🎁</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Workspace -->
    <main class="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-3 sm:p-6 gap-4 sm:gap-6 lg:min-h-0 lg:h-[calc(100vh-64px)]">
      
      <!-- Left: Gallery Area -->
      <div class="flex-1 flex flex-col bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl border-2 sm:border-4 transition-colors duration-500 lg:min-h-0" :class="t.border">
        
        <!-- Dropzone (Empty State) -->
        <div v-if="!files.length" 
             class="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center transition-all duration-300 lg:min-h-0"
             :class="isDragging ? `${t.accent} border-2 sm:border-4 ${t.border} border-dashed` : 'bg-white/50 border-2 border-transparent'"
             @dragover.prevent="isDragging = true"
             @dragleave.prevent="isDragging = false"
             @drop.prevent="handleDrop"
        >
          <div class="w-20 h-20 sm:w-28 sm:h-28 mb-4 sm:mb-6 rounded-full shadow-lg border-2 sm:border-4 flex items-center justify-center animate-bounce-slow text-4xl sm:text-5xl transition-colors duration-500" :class="[t.accent, t.border]">
            {{ t.icon }}
          </div>
          <h3 class="text-xl sm:text-3xl font-black mb-2 sm:mb-3" :class="t.text">把照片喂给我吧！</h3>
          <p class="text-xs sm:text-base text-gray-500 font-medium mb-6 sm:mb-8">支持同时拉入好多好多张图片哦 (JPG, PNG, WEBP)</p>
          <button @click="triggerFileInput" class="px-6 py-3 sm:px-8 sm:py-4 text-white font-black rounded-full shadow-lg transition-all hover:-translate-y-1 active:scale-95 text-base sm:text-lg" :class="t.btn">
            点我选照片 ✨
          </button>
          <input type="file" ref="fileInput" @change="handleFileChange" accept="image/*" multiple class="hidden" />
        </div>

        <!-- Grid State (Files present) -->
        <div v-else class="flex-1 flex flex-col overflow-hidden lg:min-h-0">
          <!-- Always keep file input available for "Continue adding" -->
          <input type="file" ref="fileInput" @change="handleFileChange" accept="image/*" multiple class="hidden" />
          
          <div class="p-3 sm:p-4 border-b-2 sm:border-b-4 bg-white/50 backdrop-blur flex justify-between items-center shrink-0 transition-colors duration-500" :class="t.border">
            <span class="text-xs sm:text-sm font-black text-gray-600">已捕捉 {{ files.length }} 只宝宝图 🧸</span>
            <button @click="triggerFileInput" class="text-xs sm:text-sm font-bold flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm transition-all hover:scale-105" :class="[t.accent, t.text]">
              <span class="mr-1 text-base sm:text-lg leading-none">+</span> 再来几张
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-3 sm:p-5 bg-white/30 custom-scrollbar lg:min-h-0">
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              <!-- File Card -->
              <div v-for="(f, index) in files" :key="f.id" 
                   @click="selectedFileId = f.id"
                   class="group relative bg-white rounded-2xl border-4 transition-all cursor-pointer overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-1"
                   :class="selectedFileId === f.id ? t.border : 'border-white'">
                
                <!-- Status Badge -->
                <div class="absolute top-2 left-2 z-10 flex gap-1">
                  <span v-if="f.status === 'success'" class="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">成功</span>
                  <span v-else-if="f.status === 'error'" class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">失败</span>
                  <span v-else-if="f.status === 'processing'" class="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center">
                    <svg class="animate-spin w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>处理中
                  </span>
                  
                  <span v-if="!applyToAll && f.customForm" class="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">独立配置</span>
                </div>

                <!-- Delete Button -->
                <button @click.stop="removeFile(f.id)" class="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <!-- Thumbnail -->
                <div class="h-32 bg-gray-100 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
                  <img :src="f.resultUrl || f.previewUrl" class="max-h-full max-w-full object-contain" />
                  
                  <!-- Overlay Actions -->
                  <div v-if="f.status === 'success'" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button @click.stop="openPreview(index)" class="p-2 bg-white/90 rounded-full hover:bg-white text-gray-800 transition-transform hover:scale-110" title="全屏对比">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <button @click.stop="downloadFile(f)" class="p-2 bg-white/90 rounded-full hover:bg-white text-gray-800 transition-transform hover:scale-110" title="下载">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </button>
                  </div>
                </div>

                <!-- Info -->
                <div class="p-3 bg-white border-t border-gray-50/50">
                  <p class="text-xs font-black text-gray-700 truncate" :title="f.name">{{ f.name }}</p>
                  <div class="flex justify-between mt-1 items-center">
                    <span class="text-[10px] text-gray-400 font-medium">{{ f.size }}</span>
                    <span v-if="f.resultSize" class="text-[10px] font-black flex items-center" :class="t.text">
                      <span class="mr-0.5">✨</span>
                      {{ f.resultSize }} KB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Parameters Sidebar -->
      <div class="w-full lg:w-96 shrink-0 flex flex-col bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl border-2 sm:border-4 relative transition-colors duration-500 lg:min-h-0" :class="t.border">
        <!-- Settings Header -->
        <div class="p-3 sm:p-4 border-b-2 sm:border-b-4 bg-white/50 shrink-0 sticky top-0 z-10 rounded-t-2xl sm:rounded-t-3xl transition-colors duration-500" :class="t.border">
          <div class="flex p-1.5 rounded-xl border-2" :class="[t.accent, t.border]">
            <button @click="applyToAll = true" class="flex-1 py-2 text-xs font-black rounded-lg transition-all" :class="applyToAll ? `bg-white shadow-md ${t.text}` : 'text-gray-500 hover:text-gray-700'">所有宝宝同款 👯</button>
            <button @click="applyToAll = false" class="flex-1 py-2 text-xs font-black rounded-lg transition-all" :class="!applyToAll ? `bg-white shadow-md ${t.text}` : 'text-gray-500 hover:text-gray-700'" :disabled="!files.length">单个宝宝特调 🎨</button>
          </div>
          <div v-if="!applyToAll && selectedFileId" class="mt-3 text-xs text-center py-2 rounded-xl border-2 font-bold transition-colors duration-500" :class="[t.accent, t.border, t.text]">
            正在打扮: <span class="font-black ml-1">{{ files.find(f => f.id === selectedFileId)?.name || '未选择' }}</span>
          </div>
        </div>

        <!-- Scrollable Form -->
        <div class="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 sm:space-y-7 custom-scrollbar lg:min-h-0" :class="{'opacity-50 pointer-events-none grayscale-[0.3]': !files.length}">
          
          <!-- 目标格式 -->
          <div class="space-y-3 bg-white p-4 rounded-2xl border-2 shadow-sm transition-colors duration-500" :class="t.border">
            <label class="flex items-center text-sm font-black text-gray-800">
              <span class="text-lg mr-2">{{ t.icon }}</span> 换个新衣服 (格式)
            </label>
            <div class="grid grid-cols-3 gap-3">
              <label v-for="fmt in ['jpeg', 'png', 'webp']" :key="fmt" 
                     class="relative flex items-center justify-center py-2.5 rounded-xl border-2 cursor-pointer transition-all hover:-translate-y-0.5"
                     :class="activeForm.format === fmt ? `${t.accent} ${t.border} ${t.text} shadow-sm scale-105` : 'border-gray-100 hover:border-gray-300 text-gray-400 hover:text-gray-600'">
                <input type="radio" v-model="activeForm.format" :value="fmt" class="sr-only" />
                <span class="text-xs font-black uppercase tracking-wider">{{ fmt }}</span>
              </label>
            </div>
          </div>

          <!-- 尺寸重塑 -->
          <div class="space-y-4 bg-white p-4 rounded-2xl border-2 shadow-sm transition-colors duration-500" :class="t.border">
            <div class="flex items-center justify-between">
              <label class="flex items-center text-sm font-black text-gray-800">
                <span class="text-lg mr-2">📏</span> 长高高变瘦瘦
              </label>
              <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="activeForm.keepAspectRatio" class="sr-only peer">
                <div class="relative w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" :class="activeForm.keepAspectRatio ? t.btn : ''"></div>
                <span class="ms-2 text-xs font-black text-gray-500">锁定身材</span>
              </label>
            </div>
            
            <div class="flex flex-wrap gap-2">
              <button v-for="preset in photoPresets" :key="preset.name" @click="applyPreset(preset)" 
                      class="px-2.5 py-1.5 text-xs font-black hover:scale-105 border-2 rounded-xl transition-all" 
                      :class="activeForm.width === preset.widthPx && activeForm.height === preset.heightPx && activeForm.unit === 'px' ? `${t.accent} ${t.text} ${t.border} shadow-sm scale-105` : `bg-gray-50 ${t.border} ${t.text}`">
                {{ preset.name }}
              </button>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="relative">
                <label class="block text-[10px] font-black text-gray-400 mb-1.5 ml-1">宽度 (胖瘦)</label>
                <input type="number" step="any" v-model="activeForm.width" @input="handleWidthChange" class="block w-full px-4 py-2.5 text-sm border-2 rounded-xl bg-gray-50 focus:bg-white transition-colors font-bold text-gray-700" :class="[t.ring, t.border]" />
              </div>
              <div class="relative">
                <label class="block text-[10px] font-black text-gray-400 mb-1.5 ml-1">高度 (高矮)</label>
                <input type="number" step="any" v-model="activeForm.height" @input="handleHeightChange" class="block w-full px-4 py-2.5 text-sm border-2 rounded-xl bg-gray-50 focus:bg-white transition-colors font-bold text-gray-700" :class="[t.ring, t.border]" />
              </div>
            </div>
            
            <div class="flex bg-gray-100 p-1.5 rounded-xl border-2 border-transparent">
              <button v-for="unit in ['px', 'cm', 'in']" :key="unit"
                @click="() => { const old = activeForm.unit; handleUnitChange(old, unit); }"
                class="flex-1 py-1.5 text-xs font-black rounded-lg transition-all"
                :class="activeForm.unit === unit ? `bg-white shadow-sm ${t.text}` : 'text-gray-400 hover:text-gray-600'">
                {{ unit === 'in' ? '英寸 📏' : unit === 'cm' ? '厘米 📐' : '像素 🔲' }}
              </button>
            </div>
          </div>

          <!-- 智能文件大小 -->
          <div class="space-y-4 bg-white p-4 rounded-2xl border-2 shadow-sm transition-colors duration-500" :class="t.border">
            <label class="flex items-center text-sm font-black text-gray-800">
              <span class="text-lg mr-2">🗜️</span> 减肥增肥 (文件大小)
            </label>
            <select v-model="activeForm.targetSizeMode" class="block w-full px-4 py-2.5 text-sm border-2 rounded-xl bg-gray-50 focus:bg-white transition-colors font-bold text-gray-700" :class="[t.ring, t.border]">
              <option value="none">自然身材 (保留最佳质量)</option>
              <option value="max">必须小于某值 (缩小)</option>
              <option value="min">必须大于某值 (增大)</option>
              <option value="exact">精准匹配指定大小</option>
            </select>
            
            <div v-if="activeForm.targetSizeMode !== 'none'" class="relative mt-2 animate-fade-in flex space-x-2">
              <div class="relative flex-1">
                <input type="number" step="any" v-model="activeForm.targetSizeValue" placeholder="输入目标大小" class="block w-full px-4 py-2.5 text-sm border-2 rounded-xl bg-gray-50 focus:bg-white transition-colors font-bold text-gray-700" :class="[t.ring, t.border]" />
              </div>
              <select v-model="activeForm.targetSizeUnit" class="w-24 px-2 py-2 text-sm border-2 rounded-xl bg-gray-50 focus:bg-white transition-colors text-center font-black text-gray-700" :class="[t.ring, t.border]">
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
            
            <!-- 手动质量回退 -->
            <div v-if="activeForm.targetSizeMode === 'none' && ['jpeg', 'webp'].includes(activeForm.format)" class="mt-3 animate-fade-in">
              <div class="flex justify-between items-center mb-1">
                <span class="text-[10px] font-black text-gray-500">手动压缩质量: {{ activeForm.quality }}%</span>
              </div>
              <input type="range" v-model="activeForm.quality" min="1" max="100" class="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer" :class="t.accent">
            </div>
          </div>

          <!-- AI 抠图换底 -->
          <div class="space-y-4 bg-white p-4 rounded-2xl border-2 shadow-sm transition-colors duration-500" :class="t.border">
            <label class="flex items-center text-sm font-black text-gray-800">
              <span class="text-lg mr-2">🪄</span> 魔法去背景
            </label>
            <div class="flex gap-2">
              <button @click="activeForm.bgColor = '#FFFFFF'" class="w-8 h-8 rounded-full border-2 border-gray-200 bg-white hover:scale-110 transition-transform shadow-sm" :class="{'ring-4 ring-offset-2 ring-gray-300': activeForm.bgColor === '#FFFFFF'}"></button>
              <button @click="activeForm.bgColor = '#438EDB'" class="w-8 h-8 rounded-full border-2 border-blue-200 bg-[#438EDB] hover:scale-110 transition-transform shadow-sm" :class="{'ring-4 ring-offset-2 ring-blue-400': activeForm.bgColor === '#438EDB'}"></button>
              <button @click="activeForm.bgColor = '#FF0000'" class="w-8 h-8 rounded-full border-2 border-red-200 bg-[#FF0000] hover:scale-110 transition-transform shadow-sm" :class="{'ring-4 ring-offset-2 ring-red-400': activeForm.bgColor === '#FF0000'}"></button>
              <div class="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 hover:scale-110 transition-transform shadow-sm" :class="{'ring-4 ring-offset-2': activeForm.bgColor && !['#FFFFFF','#438EDB','#FF0000'].includes(activeForm.bgColor), [t.ring]: activeForm.bgColor && !['#FFFFFF','#438EDB','#FF0000'].includes(activeForm.bgColor)}">
                <input type="color" v-model="activeForm.bgColor" class="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
              </div>
              <div class="flex-1"></div>
              <button v-if="activeForm.bgColor" @click="activeForm.bgColor = ''" class="text-[10px] text-red-500 font-black hover:bg-red-50 px-2 rounded-lg border-2 border-transparent hover:border-red-200 transition-colors">清除底色 ❌</button>
            </div>
          </div>

        </div>

        <!-- Action Footer -->
        <div class="p-3 sm:p-5 border-t-2 sm:border-t-4 bg-white/50 backdrop-blur shrink-0 sticky bottom-0 z-10 rounded-b-2xl sm:rounded-b-3xl transition-colors duration-500" :class="t.border">
          <button 
            @click="processAll" 
            :disabled="!files.length || isProcessing"
            class="w-full flex justify-center items-center py-3 sm:py-4 px-4 rounded-2xl shadow-xl text-base sm:text-lg font-black text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            :class="t.btn"
          >
            <span v-if="isProcessing" class="mr-2 animate-spin text-2xl">🌀</span>
            {{ isProcessing ? '魔法施展中...' : (applyToAll ? '施展魔法！(全部)' : '只给宝宝这张图片施展施法') }}
          </button>
        </div>
      </div>
    </main>

    <!-- Preview Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm transition-opacity">
      <!-- Close -->
      <button @click="showModal = false" class="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>

      <!-- Nav Left -->
      <button @click="prevPreview" :disabled="currentPreviewIndex === 0" class="absolute left-6 text-white/50 hover:text-white disabled:opacity-20 transition-colors">
        <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>

      <!-- Content -->
      <div class="flex flex-col items-center w-full max-w-5xl px-10 sm:px-20 h-full justify-center">
        <div class="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full h-[60vh] sm:h-[70vh]">
          <div class="flex-1 flex flex-col items-center bg-gray-800/50 rounded-2xl p-4 min-h-0">
            <span class="text-gray-400 font-bold mb-2 sm:mb-4 text-xs sm:text-sm tracking-widest shrink-0">原图</span>
            <div class="flex-1 w-full relative flex items-center justify-center min-h-0">
              <img :src="files[currentPreviewIndex].previewUrl" class="max-h-full max-w-full object-contain drop-shadow-2xl" />
            </div>
          </div>
          <div class="flex-1 flex flex-col items-center bg-gray-800/50 rounded-2xl p-4 relative min-h-0">
            <span class="text-green-400 font-bold mb-2 sm:mb-4 text-xs sm:text-sm tracking-widest shrink-0">处理后</span>
            <div class="flex-1 w-full relative flex items-center justify-center min-h-0">
              <img v-if="files[currentPreviewIndex].resultUrl" :src="files[currentPreviewIndex].resultUrl" class="max-h-full max-w-full object-contain drop-shadow-2xl" />
              <div v-else class="text-gray-500 text-sm">暂未处理</div>
            </div>
            <!-- Download Btn -->
            <button v-if="files[currentPreviewIndex].resultUrl" @click="downloadFile(files[currentPreviewIndex])" class="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-green-500 hover:bg-green-600 text-white p-2 sm:p-3 rounded-full shadow-xl transition-transform hover:scale-110 z-10">
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
          </div>
        </div>
        <div class="text-white mt-6 sm:mt-8 font-medium tracking-wider text-xs sm:text-sm bg-gray-800/50 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full shrink-0">
          {{ currentPreviewIndex + 1 }} / {{ files.length }}
        </div>
      </div>

      <!-- Nav Right -->
      <button @click="nextPreview" :disabled="currentPreviewIndex === files.length - 1" class="absolute right-6 text-white/50 hover:text-white disabled:opacity-20 transition-colors">
        <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
    
  </div>
</template>

<style>
/* Reset basic styles and add custom scrollbar */
html, body {
  margin: 0;
  min-height: 100vh;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #E5E7EB;
  border-radius: 20px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #D1D5DB;
}

@keyframes bounce-slow {
  0%, 100% { transform: translateY(-5%); }
  50% { transform: translateY(5%); }
}
.animate-bounce-slow {
  animation: bounce-slow 3s infinite ease-in-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}

.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

.animate-pulse-slow {
  animation: pulse-slow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .9; transform: scale(1.05); }
}

.toast-fade-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-fade-leave-active {
  transition: all 0.4s ease-in;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.9);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.95);
}

/* Range input styling overrides */
input[type=range] {
  -webkit-appearance: none;
  background: transparent;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 14px;
  width: 14px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  margin-top: -4px;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.4);
  transition: transform 0.1s;
}
input[type=range]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  cursor: pointer;
  background: #e2e8f0;
  border-radius: 4px;
}
</style>
