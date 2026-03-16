<template>
  <div class="auth-container">
    <div class="welcome-text">
      <h1>欢迎来到 <span class="brand-glow">NoI</span></h1>
      <p>探索未知的 3D 数字空间</p>
    </div>

    <div class="glass-card">
      <div class="form-header">
        <h2>{{ isLogin ? '身份识别' : '建立连接' }}</h2>
        <div class="toggle-switch">
          <div class="active-bg" :style="{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }"></div>
          <span :class="{ active: isLogin }" @click="switchToLogin">登录</span>
          <span :class="{ active: !isLogin }" @click="switchToRegister">注册</span>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="form-body" novalidate>
        <div class="input-group">
          <label>用户名</label>
          <div class="input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="input-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <input 
              type="text" 
              v-model="form.username" 
              placeholder="请输入用户名" 
              required 
              autofocus
              @blur="validateField('username')"
              @input="errors.username = ''"
              :class="{ invalid: errors.username }"
            />
          </div>
          <transition name="fade">
            <div v-if="errors.username" class="error-text">{{ errors.username }}</div>
          </transition>
        </div>

        <div class="input-group" v-if="!isLogin">
          <label>通讯邮箱</label>
          <div class="input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="input-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <input 
              type="email" 
              v-model="form.email" 
              placeholder="请输入邮箱地址" 
              required 
              @blur="validateField('email')"
              @input="errors.email = ''"
              :class="{ invalid: errors.email }"
            />
          </div>
          <transition name="fade">
            <div v-if="errors.email" class="error-text">{{ errors.email }}</div>
          </transition>
        </div>

        <div class="input-group">
          <label>访问密钥 (密码)</label>
          <div class="input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <input 
              :type="isPasswordVisible ? 'text' : 'password'" 
              v-model="form.password" 
              placeholder="请输入密码" 
              required 
              @blur="validateField('password')"
              @input="errors.password = ''"
              :class="{ invalid: errors.password }"
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              class="password-toggle-icon" 
              @click="togglePasswordVisibility"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
              <line x1="1" y1="1" x2="23" y2="23" v-if="!isPasswordVisible"></line>
            </svg>
          </div>
          <transition name="fade">
            <div v-if="errors.password" class="error-text">{{ errors.password }}</div>
          </transition>
        </div>

        <div class="input-group" v-if="!isLogin">
          <label>确认密钥</label>
          <div class="input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="input-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <input 
              type="password" 
              v-model="form.confirmPassword" 
              placeholder="请再次确认密码" 
              required 
              @blur="validateField('confirmPassword')"
              @input="errors.confirmPassword = ''"
              :class="{ invalid: errors.confirmPassword }"
            />
          </div>
          <transition name="fade">
            <div v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</div>
          </transition>
        </div>

        <transition name="fade">
          <div class="error-message" v-if="authStore.getError">
            {{ authStore.getError }}
          </div>
        </transition>

        <button type="submit" class="submit-btn" :disabled="authStore.isLoading">
          <span v-if="!authStore.isLoading">
            {{ isLogin ? '启动连接' : '注册身份' }}
          </span>
          <span v-else class="button-loader">
            <div class="button-spinner"></div>
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLogin = ref(true);

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  fullName: ''
});

const errors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

const resetFormAndErrors = () => {
  Object.assign(form, { username: '', email: '', password: '', confirmPassword: '', fullName: '' });
  Object.keys(errors).forEach(key => { errors[key] = ''; });
  authStore.clearError();
};

watch(() => route.path, (newPath) => {
  isLogin.value = newPath === '/login';
  resetFormAndErrors();
});

onMounted(() => {
  isLogin.value = route.path === '/login';
});

const switchToLogin = () => {
  if (isLogin.value) return;
  isLogin.value = true;
  router.push('/login');
};

const switchToRegister = () => {
  if (!isLogin.value) return;
  isLogin.value = false;
  router.push('/register');
};

const isPasswordVisible = ref(false);
const togglePasswordVisibility = () => {
  isPasswordVisible.value = !isPasswordVisible.value;
};

const validateField = (field) => {
  errors[field] = ''; 
  switch (field) {
    case 'username':
      if (!form.username.trim()) errors.username = '请输入用户名';
      else if (form.username.length < 3) errors.username = '用户名至少需要3个字符';
      break;
    case 'email':
      if (!isLogin.value) {
        if (!form.email.trim()) errors.email = '请输入邮箱';
        else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = '请输入有效的邮箱地址';
      }
      break;
    case 'password':
      if (!form.password) errors.password = '请输入密码';
      else if (form.password.length < 8) errors.password = '密码至少需要8个字符';
      break;
    case 'confirmPassword':
      if (!isLogin.value && form.password !== form.confirmPassword) {
        errors.confirmPassword = '两次密码输入不一致';
      }
      break;
  }
};

const processPassword = (password) => {
  if (!password) return password;
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  if (passwordBytes.length > 72) {
    const truncatedBytes = passwordBytes.slice(0, 72);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(truncatedBytes);
    } catch (e) {
      return new TextDecoder('utf-8', { fatal: true }).decode(truncatedBytes.slice(0, -1));
    }
  }
  return password;
};

const validateForm = () => {
  validateField('username');
  validateField('password');
  if (!isLogin.value) {
    validateField('email');
    validateField('confirmPassword');
  }
  return !Object.values(errors).some(error => error);
};

const handleSubmit = async () => {
  authStore.clearError();
  if (!validateForm()) return;

  try {
    const processedPassword = processPassword(form.password);
    const credentials = {
        username: form.username.trim(),
        password: processedPassword
    };

    const userData = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: processedPassword,
    };

    const result = isLogin.value 
        ? await authStore.login(credentials)
        : await authStore.register(userData);

    if (result.success) {
        if (isLogin.value) {
            router.push('/main');
        } else {
            alert('注册成功！请使用您的账号登录。');
            switchToLogin();
        }
    }
  } catch (error) {
    console.error('操作失败:', error);
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

/* 全局容器：允许鼠标穿透背景，但子元素可点击 */
.auth-container {
  position: absolute;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  margin: 0 auto;
  pointer-events: none; 
  font-family: 'Inter', system-ui, sans-serif;
}

/* --- 1. 欢迎文本适配深色背景 --- */
.welcome-text {
  position: absolute;
  top: 15%; /* 稍微下移，避开头部留白 */
  left: 10%;
  text-align: left;
  pointer-events: none;
  z-index: 20;
}

.welcome-text h1 {
  font-size: 3.5rem;
  color: #ffffff; /* 纯白文字 */
  margin: 0 0 15px 0;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.8); /* 增加阴影，防止背景过亮时看不清 */
}

/* 品牌发光效果 */
.brand-glow {
  font-family: 'Orbitron', sans-serif;
  color: #00ffff;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.6), 0 0 30px rgba(0, 255, 255, 0.4);
}

.welcome-text p {
  font-size: 1.2rem;
  color: #a0aec0; /* 灰蓝色 */
  margin: 0;
  font-weight: 400;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* --- 2. 玻璃拟态卡片 (Dark Theme) --- */
.glass-card {
  position: absolute;
  pointer-events: auto;
  width: 420px; /* 稍微加宽 */
  right: 10%; 
  
  /* 核心：深色半透明背景 */
  background: rgba(10, 20, 35, 0.65);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  
  /* 发光边框 - 使用更细腻的边框 */
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 
    0 20px 50px rgba(0, 0, 0, 0.6), 
    inset 0 0 30px rgba(0, 255, 255, 0.03);
  
  border-radius: 24px;
  padding: 48px;
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s ease;
}

.glass-card:hover {
  border-color: rgba(0, 255, 255, 0.2);
  box-shadow: 
    0 30px 60px rgba(0, 0, 0, 0.7), 
    0 0 20px rgba(0, 255, 255, 0.05),
    inset 0 0 20px rgba(0, 255, 255, 0.05);
}

.form-header {
  text-align: center;
  margin-bottom: 36px;
}

.form-header h2 {
  margin-bottom: 28px;
  color: #ffffff;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1.5px;
  font-size: 1.6rem;
  text-shadow: 0 0 10px rgba(255,255,255,0.2);
}

/* --- 3. 切换开关 (Neon Style) --- */
.toggle-switch {
  display: inline-flex;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 30px;
  padding: 4px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

.toggle-switch span {
  padding: 10px 32px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.3s ease;
  color: #64748b;
  z-index: 1;
  position: relative;
}

.toggle-switch .active-bg {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: linear-gradient(90deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.2));
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 25px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
  transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.toggle-switch span.active {
  color: #e2e8f0;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
}
.toggle-switch span:hover:not(.active) {
  color: #94a3b8;
}

/* --- 4. 输入框样式 (Dark Input) --- */
.input-group {
  margin-bottom: 24px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #94a3b8; /* 浅灰蓝 */
  font-weight: 500;
  padding-left: 4px;
  letter-spacing: 0.5px;
  transition: color 0.3s;
}

/* 聚焦时 label 高亮 */
.input-group:focus-within label {
  color: #38bdf8;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.3);
  transition: color 0.3s, filter 0.3s;
  pointer-events: none;
}

.password-toggle-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s;
  padding: 4px;
}

.password-toggle-icon:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
}

.input-group input {
  width: 100%;
  padding: 16px 18px 16px 48px;
  
  /* 深色半透明底 */
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  
  outline: none;
  transition: all 0.3s ease;
  color: #f1f5f9;
  box-sizing: border-box;
  font-size: 15px;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.5px;
}

/* 输入框占位符颜色 */
.input-group input::placeholder {
  color: rgba(255, 255, 255, 0.15);
  font-weight: 300;
}

/* 覆盖浏览器自动填充的默认样式 */
.input-group input:-webkit-autofill,
.input-group input:-webkit-autofill:hover, 
.input-group input:-webkit-autofill:focus, 
.input-group input:-webkit-autofill:active  {
    -webkit-box-shadow: 0 0 0 30px rgba(10, 20, 35, 0.8) inset !important; /* 使用与卡片背景接近的深色 */
    -webkit-text-fill-color: #fff !important;
    transition: background-color 5000s ease-in-out 0s; /* 延缓背景色变白 */
    caret-color: #fff; /* 光标颜色 */
}

/* 聚焦状态：赛博青发光 */
.input-group input:focus {
  border-color: rgba(56, 189, 248, 0.5); /* Sky blue */
  background: rgba(0, 0, 0, 0.4);
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.1);
}

.input-group input:focus + .input-icon,
.input-group input:not(:placeholder-shown) + .input-icon {
  color: #38bdf8;
  filter: drop-shadow(0 0 2px rgba(56, 189, 248, 0.5));
}

.input-group input.invalid {
  border-color: #ef4444; /* Red 500 */
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: 6px;
  padding-left: 4px;
  display: flex;
  align-items: center;
}
.error-text::before {
  content: '!';
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 14px;
  height: 14px;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-radius: 50%;
  margin-right: 6px;
  font-size: 10px;
  font-weight: bold;
}

/* --- 5. 提交按钮 (Holographic/Neon) --- */
.submit-btn {
  width: 100%;
  padding: 18px;
  margin-top: 20px;
  
  /* 渐变背景 */
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 100, 255, 0.4) 100%);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-top: 1px solid rgba(0, 255, 255, 0.5);
  
  color: #00ffff;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 2px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  text-transform: uppercase;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

/* 按钮光效动画 */
.submit-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: 0.5s;
}

.submit-btn:hover::before {
  left: 100%;
}

.submit-btn:hover {
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.3) 0%, rgba(0, 100, 255, 0.6) 100%);
  border-color: #00ffff;
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.3);
  text-shadow: 0 0 8px rgba(255,255,255,0.8);
  transform: translateY(-2px);
}

.submit-btn:active {
  transform: scale(0.98);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(100%);
  transform: none;
}

/* 错误消息框 */
.error-message {
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  margin: 16px 0;
  font-size: 13px;
  text-align: center;
  backdrop-filter: blur(5px);
}

/* 按钮加载动画 */
.button-loader {
  display: flex;
  justify-content: center;
  align-items: center;
}

.button-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式适配 */
@media (max-width: 992px) {
  .glass-card {
    right: 50%;
    transform: translateX(50%);
    width: 85%;
    max-width: 400px;
    padding: 32px 24px;
  }
  .welcome-text {
    top: 8%;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    width: 90%;
  }
  .welcome-text h1 {
    font-size: 2.2rem;
  }
  
  /* 在移动端覆盖 hover 效果，防止卡片一直处于 active 状态 */
  .glass-card:hover {
    transform: translateX(50%); 
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  }
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>