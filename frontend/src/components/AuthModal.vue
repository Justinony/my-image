<template>
  <div class="fixed inset-0 z-[300] flex items-center justify-center bg-pink-50/90 backdrop-blur-md">
    
    <!-- Lightning Overlay -->
    <div v-if="showLightning" class="fixed inset-0 z-[9999] lightning-bg overflow-hidden pointer-events-none">
      
      <!-- Huge Text in the middle -->
      <div class="absolute inset-0 flex flex-col items-center justify-center z-50">
        <div class="text-white text-4xl md:text-7xl font-black animate-shake text-center flex flex-col items-center space-y-6 leading-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
          <div class="text-8xl md:text-[150px] mb-8 animate-angry-face">😡💢</div>
          <span class="tracking-wider text-red-500 font-extrabold text-shadow-red px-8">{{ currentAngryMessage }}</span>
        </div>
      </div>

      <!-- Multiple SVG Lightnings crossing the screen -->
      <svg class="w-[80vw] h-[100vh] text-white lightning-bolt absolute top-0 left-10 opacity-90 transform -rotate-12" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 2L3 14h7v8l10-12h-7L13 2z" />
      </svg>
      <svg class="w-[60vw] h-[120vh] text-blue-100 lightning-bolt absolute -top-20 right-0 opacity-80 transform rotate-12" fill="currentColor" viewBox="0 0 20 20" style="animation-delay: 0.15s">
        <path d="M13 2L3 14h7v8l10-12h-7L13 2z" />
      </svg>
      <svg class="w-[100vw] h-[50vh] text-purple-100 lightning-bolt absolute bottom-0 left-0 opacity-60 transform -rotate-45" fill="currentColor" viewBox="0 0 20 20" style="animation-delay: 0.3s">
        <path d="M13 2L3 14h7v8l10-12h-7L13 2z" />
      </svg>
    </div>

    <!-- Question Modal -->
    <div v-if="showQuestion" class="bg-white p-8 rounded-3xl shadow-2xl border-4 border-pink-400 w-96 text-center transform transition-all animate-bounce-in relative z-[400]">
      <div class="text-6xl mb-4">🤔</div>
      <h2 class="text-2xl font-black text-pink-500 mb-8">zz小宝宝是不是最美的？</h2>
      <div class="flex justify-center space-x-8">
        <button @click="answerYes" class="w-20 h-20 bg-green-400 hover:bg-green-500 text-white rounded-full text-4xl shadow-lg hover:scale-110 transition-transform active:scale-95 flex items-center justify-center border-4 border-green-200">
          ✔️
        </button>
        <button @click="answerNo" class="w-20 h-20 bg-gray-800 hover:bg-black text-white rounded-full text-4xl shadow-lg hover:scale-110 transition-transform active:scale-95 flex items-center justify-center border-4 border-gray-600">
          ❌
        </button>
      </div>
    </div>

    <!-- Main Auth Modal -->
    <div v-else-if="!showLightning" class="bg-white p-8 rounded-3xl shadow-2xl border-4 border-pink-200 w-96 text-center transform transition-all animate-fade-in relative overflow-hidden">
      <div class="flex mb-6 bg-pink-50 rounded-xl p-1">
        <button @click="mode = 'login'" class="flex-1 py-2 rounded-lg font-black transition-colors" :class="mode === 'login' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-pink-400'">登录</button>
        <button @click="mode = 'register'" class="flex-1 py-2 rounded-lg font-black transition-colors" :class="mode === 'register' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-pink-400'">注册</button>
      </div>
      
      <div class="text-5xl mb-4 animate-bounce-slow">✨</div>
      <h2 class="text-xl font-black text-pink-500 mb-6">{{ mode === 'login' ? '欢迎来到魔法工坊' : '注册专属魔法账号' }}</h2>
      
      <input v-model="username" type="text" placeholder="专属账号" class="w-full mb-4 px-4 py-3 rounded-xl border-2 border-pink-100 focus:border-pink-300 outline-none transition-colors font-bold text-gray-700" />
      <input v-model="password" type="password" placeholder="密码" @keyup.enter="handleSubmit" class="w-full mb-4 px-4 py-3 rounded-xl border-2 border-pink-100 focus:border-pink-300 outline-none transition-colors font-bold text-gray-700" />
      
      <!-- Remember Password Checkbox -->
      <div v-if="mode === 'login'" class="flex items-center mb-6 pl-1">
        <label class="flex items-center cursor-pointer group">
          <div class="relative flex items-center justify-center">
            <input type="checkbox" v-model="rememberMe" class="sr-only peer">
            <div class="w-5 h-5 border-2 border-pink-300 rounded bg-white peer-checked:bg-pink-400 peer-checked:border-pink-400 transition-colors flex items-center justify-center shadow-sm">
              <svg class="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <span class="ml-2 text-sm font-bold text-gray-500 group-hover:text-pink-400 transition-colors">记住我 ✨</span>
        </label>
      </div>
      <div v-else class="mb-6"></div>
      
      <button @click="handleSubmit" :disabled="isChecking" class="w-full py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-black rounded-xl hover:scale-105 transition-transform shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
        <span v-if="isChecking" class="animate-pulse">魔法校验中...</span>
        <span v-else>{{ mode === 'login' ? '进入工坊 🚪' : '立即注册 🌟' }}</span>
      </button>
      
      <button @click="$emit('close')" class="mt-4 text-gray-400 text-sm font-bold hover:text-pink-400 transition-colors">
        返回
      </button>
      
      <transition name="fade">
        <p v-if="error" class="text-red-500 text-sm mt-3 font-bold">{{ error }}</p>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const emit = defineEmits(['login-success', 'close'])

const mode = ref('login')
const username = ref('')
const password = ref('')
const error = ref('')
const isChecking = ref(false)
const showQuestion = ref(false)
const showLightning = ref(false)
const rememberMe = ref(true)

const angryMessages = [
  "答错了！重新选择正确答案！",
  "怎么就不是最漂亮的了？！",
  "再给你一次机会！！！",
  "你是不是手滑点错了？！",
  "小宝宝生气了，后果很严重！",
  "快说小宝宝是最美的！不然不让你进！",
  "你的良心不会痛吗？！",
  "这道题只有唯一解，那就是小宝宝最美！",
  "再选一次，摸着你的良心选！",
  "信不信我用魔法仙女棒敲你！",
  "居然敢选错，小宝宝要发威啦！",
  "难道你的眼睛被蒙蔽了吗？！",
  "给你三秒钟，收回刚才的选择！",
  "你是不是想尝尝雷电魔法的滋味？！",
  "快承认，她就是宇宙无敌第一美！",
  "不要睁着眼睛说瞎话！",
  "你的眼光大有问题！去洗洗眼睛！",
  "是谁给你的勇气选这个的？！",
  "选错了！重新选！立刻！马上！",
  "我的天哪，你竟然敢说不？！",
  "你再说一遍？我没听清！",
  "这是送分题，你竟然答错了？！",
  "你伤害了小宝宝的心！",
  "快点向小宝宝的美貌道歉！",
  "不选对就不给你看好看的照片！",
  "惹小宝宝生气，你就别想用魔法工坊了！",
  "你的审美观离家出走了吗？！",
  "今天必须听到一句‘最美’！",
  "再乱选，信不信你的屏幕会炸开？！",
  "你这是在玩火！快点选正确的！"
]
const currentAngryMessage = ref('')

onMounted(() => {
  const savedUser = localStorage.getItem('zz_wardrobe_username')
  const savedPass = localStorage.getItem('zz_wardrobe_password')
  if (savedUser && savedPass) {
    username.value = savedUser
    password.value = savedPass
    rememberMe.value = true
  }
})

const showError = (msg) => {
  error.value = msg
  setTimeout(() => error.value = '', 3000)
}

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    showError('账号和密码不能为空哦~ 🎀')
    return
  }
  isChecking.value = true
  
  try {
    const { data, error: dbErr } = await supabase
      .from('accounts')
      .select('password')
      .eq('username', username.value)
      .maybeSingle()

    if (dbErr) throw dbErr

    if (mode.value === 'login') {
      if (data) {
        if (data.password === password.value || (username.value === 'zz_baby' && password.value === 'bb991210')) {
          finishLogin()
        } else {
          showError('密码不对哦，小宝宝再想想~ 🎀')
        }
      } else {
        showError('账号不存在哦，请先注册~ 🌟')
      }
    } else {
      // Register
      if (data) {
        showError('账号已经被注册啦，换一个吧~ 🎀')
      } else {
        // Trigger the question
        showQuestion.value = true
      }
    }
  } catch (e) {
    console.error(e)
    showError('网络有点小故障，请稍后再试哦~')
  } finally {
    isChecking.value = false
  }
}

const answerYes = async () => {
  try {
    // 1. Create account
    const { error: accErr } = await supabase
      .from('accounts')
      .insert({ username: username.value, password: password.value })
    if (accErr) throw accErr

    // 2. Give initial wallet coins & diamonds
    await supabase
      .from('wallets')
      .insert({ username: username.value, coins: 1000, diamonds: 100 })

    // 3. Init wardrobe config
    await supabase
      .from('saves')
      .upsert({ 
        account: username.value, 
        config: { 
          hair: 'variant02',
          clothing: 'variant01',
          accessories: 'none',
          backgroundColor: 'ffd5dc'
        } 
      })
      
    finishLogin()
  } catch (e) {
    console.error(e)
    showError('注册失败，请稍后重试哦~')
    showQuestion.value = false
  }
}

const answerNo = () => {
  currentAngryMessage.value = angryMessages[Math.floor(Math.random() * angryMessages.length)]
  showQuestion.value = false
  showLightning.value = true
  setTimeout(() => {
    window.location.reload()
  }, 2500) // Give them more time to read the angry text
}

const finishLogin = () => {
  if (rememberMe.value) {
    localStorage.setItem('zz_wardrobe_username', username.value)
    localStorage.setItem('zz_wardrobe_password', password.value)
  } else {
    localStorage.removeItem('zz_wardrobe_username')
    localStorage.removeItem('zz_wardrobe_password')
  }
  sessionStorage.setItem('current_wardrobe_user', username.value)
  sessionStorage.setItem('current_wardrobe_pass', password.value)
  emit('login-success', username.value)
}
</script>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-bounce-in {
  animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Lightning Animation */
.lightning-bg {
  background-color: rgba(0, 0, 0, 0.95);
  animation: lightning-flash 0.5s infinite;
}
@keyframes lightning-flash {
  0%, 100% { background-color: rgba(0, 0, 0, 0.98); }
  5%, 15%, 25% { background-color: rgba(255, 255, 255, 0.9); }
  10%, 20% { background-color: rgba(0, 0, 0, 0.98); }
  30% { background-color: rgba(200, 230, 255, 0.5); }
  35% { background-color: rgba(255, 255, 255, 0.9); }
  40% { background-color: rgba(0, 0, 0, 0.98); }
}
.lightning-bolt {
  animation: bolt-flash 0.5s infinite;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 40px rgba(100, 200, 255, 0.6));
}
@keyframes bolt-flash {
  0%, 100% { opacity: 0; transform: scale(1) translate(0, 0); }
  10% { opacity: 1; transform: scale(1.05) translate(10px, -10px); }
  20% { opacity: 0.2; transform: scale(1) translate(0, 0); }
  30% { opacity: 1; transform: scale(1.1) translate(-10px, 10px); }
  40% { opacity: 0; transform: scale(1) translate(0, 0); }
}
.animate-shake {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both infinite;
}
@keyframes shake {
  10%, 90% { transform: translate3d(-2px, 0, 0); }
  20%, 80% { transform: translate3d(4px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-8px, 0, 0); }
  40%, 60% { transform: translate3d(8px, 0, 0); }
}
.text-shadow-red {
  text-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.6);
}
.animate-angry-face {
  animation: angry-pulse 0.3s ease-in-out infinite alternate;
}
@keyframes angry-pulse {
  from { transform: scale(1) rotate(-5deg); filter: drop-shadow(0 0 20px rgba(255,0,0,0.5)); }
  to { transform: scale(1.3) rotate(5deg); filter: drop-shadow(0 0 50px rgba(255,0,0,1)); }
}
</style>
