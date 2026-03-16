<template>
 <div class="app-container">
    
    <header class="glass-card top-nav allow-overflow">
     <div class="logo-container-3d">
        <div class="logo-wrapper">

          <svg class="noi-svg-text" viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <text id="noi-text-def" class="noi-font" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">NOI</text>
              
              <mask id="text-mask-noi">
                <use xlink:href="#noi-text-def" fill="white" />
              </mask>
            </defs>

            <use xlink:href="#noi-text-def" class="base-text" fill="#334155" />

            <g mask="url(#text-mask-noi)">
              <g class="circuit-group">
                  <path class="circuit-path delay-1" d="M10 35 L10 5 L35 35 L35 5" stroke="#38bdf8" stroke-width="3" fill="none" stroke-linecap="square" />
                  <circle class="circuit-path delay-2" cx="70" cy="20" r="15" stroke="#38bdf8" stroke-width="3" fill="none" />
                  <path class="circuit-path delay-3" d="M105 5 L130 5 M117.5 5 L117.5 35 M105 35 L130 35" stroke="#38bdf8" stroke-width="3" fill="none" />
                  
                  <rect class="energy-fill" x="0" y="40" width="140" height="40" fill="rgba(56, 189, 248, 0.3)" />
              </g>
            </g>
          </svg>

          <span class="logo-sub">知识库</span>
        </div>
      </div>
      
      <nav class="nav-center">
        <router-link to="/universe" class="nav-link" active-class="active">宇宙</router-link>
        <router-link to="/archives" class="nav-link" active-class="active">档案</router-link>
      </nav>
      
      <div class="nav-controls">
        <button 
          class="ai-trigger-btn" 
          :class="{ active: isChatOpen }" 
          @click="toggleChat"
          title="切换神经链接"
        >
          <div class="trigger-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
              <path d="M12 12 2.1 12.1"></path>
              <path d="M12 12 12 21.9"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <span class="trigger-label">NoI</span>
          <div class="status-light"></div>
        </button>

        <div class="user-menu-container" ref="userMenuRef">
          <div 
            class="user-avatar-btn" 
            :class="{ active: isUserMenuOpen }"
            @click="toggleUserMenu"
          >
            <div class="avatar-ring">
              <img 
                v-if="!avatarError" 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                alt="User" 
                class="avatar-img"
                @error="avatarError = true"
              />
              <div v-else class="avatar-fallback">{{ userInitial }}</div>
            </div>
          </div>
            <!-- <span class="username">{{ username }}</span> -->
            <!-- <span class="arrow-icon">▼</span> -->

          <transition name="dropdown-fade">
            <div v-if="isUserMenuOpen" class="user-dropdown-card">
              
              <div class="profile-section">
                <div class="avatar-ring large">
                  <img 
                    v-if="!avatarError" 
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                    alt="User" 
                    class="avatar-img"
                    @error="avatarError = true"
                  />
                  <div v-else class="avatar-fallback large">{{ userInitial }}</div>
                  <div class="camera-badge">📷</div>
                </div>
                <div class="profile-name">{{ username }}</div>
                <div class="profile-email">commander@noi-link.sys</div>
              </div>

              <div class="action-grid">
                <div class="action-card" @click="handleMenuAction('settings')">
                  <span class="action-icon">⚙️</span>
                  <span class="action-text">系统设置</span>
                </div>
                
                <div class="action-card danger" @click="handleLogout">
                  <svg class="action-icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span class="action-text">退出登录</span>
                </div>
              </div>

            </div>
          </transition>
        </div>
      </div>
    </header>

    <main ref="mainBodyRef" class="main-body">
      <div
        v-show="!isChatFullscreen"
        ref="leftPaneRef"
        class="glass-card universe-pane"
        :style="leftPaneStyle"
      >
        <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
                <KeepAlive>
                    <component :is="Component" />
                </KeepAlive>
            </transition>
        </router-view>
      </div>

      <div 
        v-if="showVisualPanel && !isChatFullscreen" 
        class="resize-handle" 
        :class="{ active: resizeSession?.type === 'left' }"
        @pointerdown.prevent="startResize('left', $event)"
        @dblclick.stop="resetSize('left')"
      >
        <div class="handle-bar"></div>
      </div>

      <Transition name="slide-fade">
        <div v-show="showVisualPanel" class="glass-card visual-pane">
          <VisualPanel />
        </div>
      </Transition>

      <div 
        v-if="isChatOpen && !isChatFullscreen" 
        class="resize-handle" 
        :class="{ active: resizeSession?.type === 'right' }"
        @pointerdown.prevent="startResize('right', $event)"
        @dblclick.stop="resetSize('right')"
      >
        <div class="handle-bar"></div>
      </div>

      <Transition name="slide-fade">
        <div 
            v-show="isChatOpen" 
            class="glass-card chat-pane"
            :class="{ 'fullscreen': isChatFullscreen }"
            :style="!isChatFullscreen ? { width: chatWidth + 'px' } : {}"
        >
          <AIChatPanel 
            :is-fullscreen="isChatFullscreen" 
            @toggle-fullscreen="handleToggleFullscreen" 
          />
        </div>
      </Transition>

      <SettingsModal :show="showSettingsModal" @close="showSettingsModal = false" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AIChatPanel from '../components/AIChatPanel.vue';   
import SettingsModal from '../components/SettingsModal.vue';
import VisualPanel from '../components/VisualPanel.vue';

const route = useRoute();

const router = useRouter();
const authStore = useAuthStore();
// 控制右侧面板状态，默认展开
const isChatOpen = ref(true);

// 是否显示中间的视觉面板 (仅在 ArticleDetail 路由下显示)
const showVisualPanel = computed(() => route.name === 'ArticleDetail');
const toggleChat = () => {
  isChatOpen.value = !isChatOpen.value;
};

const mainBodyRef = ref(null);
const leftPaneRef = ref(null);

const STORAGE_KEYS = {
  chatWidth: 'noi.ui.chatWidth',
  knowledgeWidth: 'noi.ui.knowledgeWidth'
};

const GAP_PX = 10;
const HANDLE_WIDTH_PX = 10; // Updated to match CSS
const MIN_KNOWLEDGE_PX = 200;
const MIN_CHAT_PX = 300;
const MIN_CENTER_PX = 200;
const MIN_MAIN_PX = 300;

const DEFAULT_CHAT_PX = 600;
const DEFAULT_KNOWLEDGE_PX = 520;

const chatWidth = ref(600);
const knowledgeWidth = ref(520);
const isChatFullscreen = ref(false);
const resizeSession = ref(null);
const pendingClientX = ref(null);
let rafId = 0;

const leftPaneStyle = computed(() => {
  if (isChatFullscreen.value) return {};
  if (!showVisualPanel.value) return {};
  return {
    width: `${knowledgeWidth.value}px`,
    flex: '0 0 auto'
  };
});

const clamp = (value, min, max) => {
  const normalizedMax = Math.max(min, max);
  return Math.max(min, Math.min(value, normalizedMax));
};

const getFixedSpace = () => {
  if (isChatFullscreen.value) return 0;

  const hasVisual = showVisualPanel.value;
  const hasChat = isChatOpen.value;

  if (!hasVisual) {
    if (!hasChat) return 0;
    // Just one handle (Universe | Chat)
    return HANDLE_WIDTH_PX;
  }

  if (!hasChat) {
    // Just one handle (Universe | Visual) - wait, Visual is usually center?
    // If showVisualPanel is true, it means we have Universe | Handle | Visual
    return HANDLE_WIDTH_PX;
  }

  // Universe | Handle | Visual | Handle | Chat
  return HANDLE_WIDTH_PX * 2;
};

const getContainerWidth = () => {
  return mainBodyRef.value?.clientWidth || document.body.clientWidth;
};

const ensureWidthsWithinBounds = () => {
  if (isChatFullscreen.value) return;

  const containerWidth = getContainerWidth();
  const fixed = getFixedSpace();

  if (showVisualPanel.value) {
    const maxKnowledge = containerWidth - fixed - MIN_CENTER_PX - (isChatOpen.value ? chatWidth.value : 0);
    knowledgeWidth.value = clamp(knowledgeWidth.value, MIN_KNOWLEDGE_PX, maxKnowledge);

    if (isChatOpen.value) {
      const maxChat = containerWidth - fixed - knowledgeWidth.value - MIN_CENTER_PX;
      chatWidth.value = clamp(chatWidth.value, MIN_CHAT_PX, maxChat);
    }

    return;
  }

  if (isChatOpen.value) {
    const maxChat = containerWidth - fixed - MIN_MAIN_PX;
    chatWidth.value = clamp(chatWidth.value, MIN_CHAT_PX, maxChat);
  }
};

const startResize = (type, event) => {
  if (event.button !== undefined && event.button !== 0) return;
  if (isChatFullscreen.value) return;

  const containerWidth = getContainerWidth();
  const currentTarget = event.currentTarget;
  const pointerId = event.pointerId;

  if (type === 'left') {
    if (!showVisualPanel.value) return;
    const currentLeft = leftPaneRef.value?.getBoundingClientRect().width || knowledgeWidth.value;
    resizeSession.value = {
      type,
      startX: event.clientX,
      startKnowledge: currentLeft,
      containerWidth,
      currentTarget,
      pointerId
    };
  } else {
    resizeSession.value = {
      type,
      startX: event.clientX,
      startChat: chatWidth.value,
      containerWidth,
      currentTarget,
      pointerId
    };
  }

  if (currentTarget?.setPointerCapture && pointerId !== undefined) {
    try {
      currentTarget.setPointerCapture(pointerId);
    } catch (_) {}
  }

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  // 防止拖拽时选中文字或触发其他交互
  document.body.classList.add('is-resizing');
};

const applyResize = (clientX) => {
  const containerWidth = getContainerWidth();
  const fixed = getFixedSpace();
  const deltaX = clientX - resizeSession.value.startX;

  if (resizeSession.value.type === 'left') {
    const reservedChat = isChatOpen.value ? chatWidth.value : 0;
    const maxKnowledge = containerWidth - fixed - MIN_CENTER_PX - reservedChat;
    knowledgeWidth.value = clamp(
      resizeSession.value.startKnowledge + deltaX,
      MIN_KNOWLEDGE_PX,
      maxKnowledge
    );
    return;
  }

  if (showVisualPanel.value) {
    const maxChat = containerWidth - fixed - knowledgeWidth.value - MIN_CENTER_PX;
    chatWidth.value = clamp(resizeSession.value.startChat - deltaX, MIN_CHAT_PX, maxChat);
    return;
  }

  const maxChat = containerWidth - fixed - MIN_MAIN_PX;
  chatWidth.value = clamp(resizeSession.value.startChat - deltaX, MIN_CHAT_PX, maxChat);
};

const onPointerMove = (event) => {
  if (!resizeSession.value) return;
  if (isChatFullscreen.value) return;

  event.preventDefault();
  pendingClientX.value = event.clientX;

  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    if (!resizeSession.value) return;
    if (pendingClientX.value === null) return;
    applyResize(pendingClientX.value);
  });
};

const stopResize = () => {
  if (!resizeSession.value) return;

  if (rafId) {
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }
  pendingClientX.value = null;

  const { currentTarget, pointerId } = resizeSession.value || {};
  if (currentTarget?.releasePointerCapture && pointerId !== undefined) {
    try {
      currentTarget.releasePointerCapture(pointerId);
    } catch (_) {}
  }

  resizeSession.value = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.body.classList.remove('is-resizing');

  localStorage.setItem(STORAGE_KEYS.chatWidth, String(Math.round(chatWidth.value)));
  if (showVisualPanel.value) {
    localStorage.setItem(STORAGE_KEYS.knowledgeWidth, String(Math.round(knowledgeWidth.value)));
  }
};

const handleToggleFullscreen = () => {
    isChatFullscreen.value = !isChatFullscreen.value;
};

const resetSize = (type) => {
  if (type === 'left') {
    knowledgeWidth.value = DEFAULT_KNOWLEDGE_PX;
    ensureWidthsWithinBounds();
    localStorage.setItem(STORAGE_KEYS.knowledgeWidth, String(Math.round(knowledgeWidth.value)));
    return;
  }

  chatWidth.value = DEFAULT_CHAT_PX;
  ensureWidthsWithinBounds();
  localStorage.setItem(STORAGE_KEYS.chatWidth, String(Math.round(chatWidth.value)));
};

// --- ★★★ 用户菜单逻辑 ★★★ ---
const isUserMenuOpen = ref(false);
const userMenuRef = ref(null);
const avatarError = ref(false);
const showSettingsModal = ref(false);

// 从 store 获取用户信息 (假设 store 里有 user 对象)
const username = computed(() => authStore.user?.username || '指挥官');
const userInitial = computed(() => username.value.charAt(0).toUpperCase());

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
};

const closeUserMenu = () => {
  isUserMenuOpen.value = false;
};

// 点击菜单项的处理
const handleMenuAction = (action) => {
  console.log('Action:', action);
  closeUserMenu();
  // 路由跳转
  if (action === 'settings') {
    showSettingsModal.value = true;
  } else if (action === 'profile') {
    showSettingsModal.value = true;
  }
};

// 退出登录
const handleLogout = async () => {
  closeUserMenu();
  // 执行 store 中的退出逻辑
  if (authStore.logout) {
    await authStore.logout();
  }
  // 跳转回登录页
  router.push('/login');
};

// 点击外部关闭菜单
const handleClickOutside = (event) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
    closeUserMenu();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);

  const savedChatWidth = Number(localStorage.getItem(STORAGE_KEYS.chatWidth));
  if (Number.isFinite(savedChatWidth) && savedChatWidth > 0) {
    chatWidth.value = savedChatWidth;
  }

  const savedKnowledgeWidth = Number(localStorage.getItem(STORAGE_KEYS.knowledgeWidth));
  if (Number.isFinite(savedKnowledgeWidth) && savedKnowledgeWidth > 0) {
    knowledgeWidth.value = savedKnowledgeWidth;
  }

  ensureWidthsWithinBounds();

  window.addEventListener('pointermove', onPointerMove, { passive: false, capture: true });
  window.addEventListener('pointerup', stopResize, { passive: true, capture: true });
  window.addEventListener('pointercancel', stopResize, { passive: true, capture: true });
  window.addEventListener('resize', ensureWidthsWithinBounds, { passive: true });
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);

  window.removeEventListener('pointermove', onPointerMove, { capture: true });
  window.removeEventListener('pointerup', stopResize, { capture: true });
  window.removeEventListener('pointercancel', stopResize, { capture: true });
  window.removeEventListener('resize', ensureWidthsWithinBounds);
});

watch([showVisualPanel, isChatOpen, isChatFullscreen], () => {
  ensureWidthsWithinBounds();
});
</script>

<style scoped>
/* --- 全局容器 --- */
.app-container {
  width: 100vw;
  height: 100vh;
  /* Deep Space Slate Gradient: 更加沉稳、专业的深空蓝灰色调 */
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 10px; 
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px; 
  overflow: hidden;
  font-family: 'Inter', 'Segoe UI', sans-serif; /* 更加现代、中性的字体 */
  color: #f1f5f9; /* Slate 100 文本色 */
}

/* --- 通用玻璃拟态卡片样式 (Research Grade) --- */
.glass-card {
  /* 更高透明度，更细腻的模糊，减少塑料感 */
  background: rgba(30, 41, 59, 0.65); /* Slate 800 with opacity */
  backdrop-filter: blur(20px);         
  border: 1px solid rgba(148, 163, 184, 0.245); /* Slate 400 极细边框 */
  border-radius: 16px;                 /* 稍微减小圆角，更显专业 */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* Tailwind 风格阴影 */
  overflow: hidden;
  transition: all 0.3s ease;
}

/* --- 顶部导航栏 --- */
.top-nav {
  height: 30px; /* 稍微紧凑一点 */
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px 0 18px;
  z-index: 10;
  /* 导航栏背景更深一点，区分层级 */
  background: rgba(15, 23, 42, 0.8); 
  border-bottom: 1px solid rgba(148, 163, 184, 0.05);
  backdrop-filter: blur(20px);
}
.top-nav.allow-overflow {
  overflow: visible !important;
  z-index: 1000;
}

/* Logo 区域 */
/* 引入 Orbitron 字体 */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');

/* --- 1. 3D 舞台容器 --- */
.logo-container-3d {
  /* 开启 3D 透视空间 */
  perspective: 1000px;
  display: inline-block;
  padding: 20px 0; /* 留出破壁空间 */
  cursor: pointer;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  /* 核心：保持 3D 变换 */
  transform-style: preserve-3d;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}


/* --- 2. 悬浮交互：整体破壁立体化 --- */
.logo-container-3d:hover .logo-wrapper {
  /* 像你的要求一样，冲出容器，Z轴突进 */
  transform: translateZ(60px) rotateX(5deg);
}

.logo-container-3d:hover .side-icon {
  /* 图标稍微退后一点，制造层次感 */
  transform: translateZ(-20px);
  filter: drop-shadow(0 0 5px #38bdf8);
}

/* --- 3. SVG 文字容器样式 --- */
.noi-svg-text {
  width: 140px;  /* 根据需要调整整体宽度 */
  height: 40px;
  /* 文字主体在 3D 空间中靠前 */
  transform: translateZ(10px);
  transition: all 0.4s;
  /* 默认微弱投影 */
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.602));
}

.logo-container-3d:hover .noi-svg-text {
  /* 悬浮时增强发光投影，强调立体感 */
  filter: drop-shadow(0 10px 20px rgba(56, 191, 248, 0.621));
}

/* 底层文字颜色 */
.base-text {
  transition: fill 0.4s;
}
.logo-container-3d:hover .base-text {
  fill: #1e293b; /* 悬浮时稍微变深，衬托亮光 */
}

/* --- 4. 内部动画：电路生长 (Circuit Growth) --- */
.circuit-path {
  /* 核心技巧：用 stroke-dasharray 隐藏线条 */
  stroke-dasharray: 150;
  stroke-dashoffset: 150; /* 初始偏移量等于长度，造成不可见 */
  opacity: 0;
  transition: all 0.8s ease-in-out;
  filter: drop-shadow(0 0 2px #38bdf8);
}

/* 悬浮时触发动画 */
.logo-container-3d:hover .circuit-path {
  stroke-dashoffset: 0; /* 偏移量归零，线条“生长”出来 */
  opacity: 1;
}

/* 简单的延迟，让生长有先后顺序 */
.delay-1 { transition-delay: 0.1s; }
.delay-2 { transition-delay: 0.3s; }
.delay-3 { transition-delay: 0.5s; }

/* 内部能量向上填充 */
.energy-fill {
  transition: all 0.6s ease-out;
}
.logo-container-3d:hover .energy-fill {
  transform: translateY(-40px); /* 向上移动填满字母 */
}

/* --- 副标题 --- */
.logo-sub {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 8px;
  transform: translateZ(5px); /* 稍微有点深度 */
  transition: all 0.4s;
  margin-left:-10px;
}
.logo-container-3d:hover .logo-sub {
  color: #38bdf8;
  letter-spacing: 2px;
}
.noi-font {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 38px;
}

/* 中间导航链接 */
.nav-center {
  display: flex;
  background: rgba(15, 23, 42, 0.6);
  padding: 4px;
  border-radius: 100px; /* 胶囊圆角 */
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.nav-link {
  color: #94a3b8;
  text-decoration: none;
  padding: 8px 24px;
  border-radius: 100px; /* 胶囊圆角 */
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.nav-link:hover {
  color: #f1f5f9;
}

.nav-link.active {
  color: #0f172a; /* Slate 900 - 深色文字对比 */
  background: #38bdf8; /* Sky 400 - 亮色背景 */
  font-weight: 600;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.4); /* 恢复发光效果 */
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}


/* AI 助手唤醒按钮 - 战术终端风格 */
.ai-trigger-btn {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px; /* 稍微硬朗一点的圆角 */
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  height: 36px;
}

.trigger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.3s;
}

.trigger-label {
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s;
  font-family: 'JetBrains Mono', monospace;
}

/* 状态指示灯 */
.status-light {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #475569; /* 默认灰色 */
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
  transition: all 0.3s;
}

/* 悬停状态 */
.ai-trigger-btn:hover {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(56, 189, 248, 0.3);
}
.ai-trigger-btn:hover .trigger-icon,
.ai-trigger-btn:hover .trigger-label {
  color: #e2e8f0;
}

/* 激活状态 */
.ai-trigger-btn.active {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.15);
}

.ai-trigger-btn.active .trigger-icon {
  color: #38bdf8;
  filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.5));
}

.ai-trigger-btn.active .trigger-label {
  color: #38bdf8;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
}

.ai-trigger-btn.active .status-light {
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}

/* 扫描线动画效果 */
.ai-trigger-btn.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.2), transparent);
  animation: scan 3s infinite;
}

@keyframes scan {
  0% { left: -100%; }
  20% { left: 200%; }
  100% { left: 200%; }
}

/* --- 用户菜单样式  --- */
.user-menu-container {
  position: relative; /* 作为下拉菜单的定位基准 */
}

.user-avatar-btn {
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  transition: all 0.3s ease;
  position: relative;
}

.avatar-ring {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  padding: 2px;
  border: 2px solid rgba(148, 163, 184, 0.2);
  transition: all 0.3s ease;
  position: relative;
}
.avatar-ring.large {
  width: 72px;
  height: 72px;
  border-width: 3px;
  margin-bottom: 15px;
  box-shadow: none;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: white;
  font-weight: bold;
  font-size: 14px;
  font-family: 'Orbitron', sans-serif;
}

.avatar-fallback.large {
  font-size: 28px;
}

.user-avatar-btn:hover .avatar-ring,
.user-avatar-btn.active .avatar-ring {
  border-color: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.2);
  transform: scale(1.02);
}

/* 保留 Dropdown 里的 avatar-circle 样式，但可能需要调整 */
.avatar-circle {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.2);
  position: relative;
}
.avatar-circle.small { width: 32px; height: 32px; border-radius: 50%; font-size: 14px; }
.avatar-circle.large { width: 72px; height: 72px; border-radius: 50%; font-size: 28px; margin-bottom: 10px; }
/* 箭头旋转 */
.arrow-icon { font-size: 0.6rem; color: #94a3b8; transition: transform 0.3s; }
.user-avatar-btn.active .arrow-icon { transform: rotate(180deg); }

/* --- ★★★ 下拉卡片本体 (Research Grade) ★★★ --- */
.user-dropdown-card {
  position: absolute;
  top: 120%;
  right: 0; /* 对齐右边 */
  width: 300px; /* 稍微窄一点 */
  
  /* 深色玻璃 */
  background: rgba(30, 41, 59, 0.9);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 16px; 
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3);
  
  z-index: 1001;
  overflow: hidden;
  transform-origin: top right;
  display: flex;
  flex-direction: column;
  padding: 6px; 
}

/* --- 上半部分：个人信息 --- */
.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 20px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px 12px 4px 4px;
  margin-bottom: 6px;
}

.camera-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: #0f172a;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #38bdf8;
  color: #fff;
}

.profile-name {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
  margin-top: 5px;
  font-family: 'Orbitron', sans-serif;
}

.profile-email {
  color: #8aa;
  font-size: 0.85rem;
  margin-bottom: 20px;
}

.manage-account-btn {
  background: transparent;
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #00ffff;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
}
.manage-account-btn:hover {
  background: rgba(0, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

/* --- 下半部分：操作网格 (设置 & 退出) --- */
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 两列等宽 */
  gap: 4px;
}

.action-card {
  background: rgba(255, 255, 255, 0.03);
  padding: 15px;
  display: flex;
  flex-direction: row; /* 横向排列图标和文字 */
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px; /* 微圆角，拼在一起像一个整体 */
  color: #c0d0e0;
}

/* 左下圆角 */
.action-card:first-child {
  border-radius: 4px 8px 20px 20px;
}
/* 右下圆角 */
.action-card:last-child {
  border-radius: 8px 4px 20px 20px;
}

.action-card:hover {
  background: rgba(0, 255, 255, 0.1);
}

.action-icon { 
  font-size: 1.2rem;
  stroke: currentColor; 
  transition: stroke 0.2s;
 }
.action-text { 
  font-size: 0.9rem; 
  color: #c0d0e0; 
  font-weight: 500;
}

/* 退出按钮特殊样式 */
.action-card.danger:hover {
  background: rgba(0, 255, 255, 0.1);
}
.action-card.danger .action-text {
  color: #ffffff; /* 红色文字 */
}

/* 动画 */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.2, 0, 0, 1.2); /* 弹性效果 */
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.9);
}


/* --- 主体区域布局 --- */
.main-body {
  flex: 1; /* 占满剩余高度 */
  display: flex;
  /* gap: 16px;  Removed gap to allow custom resize handles to fill space */
  overflow: hidden; /* 防止溢出 */
  position: relative;
}

/* 左侧宇宙 */
.universe-pane {
  flex: 1; /* 自动伸缩，占满剩余宽度 */
  position: relative;
  /* 确保 Three.js 容器能撑满这个卡片 */
  display: flex;
  flex-direction: column;
  /* transition: all 0.4s cubic-bezier(0.2, 0, 0, 1); */ /* 禁用可能影响拖拽的动画 */
  margin-right: 0; /* Handle will provide spacing */
}

/* 强制让 UniverseView 内部容器填满卡片 */
.universe-pane :deep(.universe-container) {
  width: 100%;
  height: 100%;
  border-radius: 20px; /* 确保 canvas 不会溢出圆角 */
}

/* 右侧 AI 面板 - 使用固定宽度，由 chatWidth 控制 */
.chat-pane {
  flex: 0 0 auto;  /* 不增长、不收缩、使用内联样式指定的宽度 */
  min-width: 0;
  display: flex;
  flex-direction: column;
  z-index: 5;
  white-space: nowrap; /* 防止内部文字换行 */
  overflow: hidden;
}

.chat-pane.fullscreen {
  position: absolute;
  top: 0;
  right: 0;
  width: 100% !important;
  height: 100%;
  z-index: 50; /* Above everything */
  border-radius: 16px;
}

/* Resize Handle - 可拖动分割条 */
.resize-handle {
  width: 10px;
  height: 100%;
  cursor: col-resize;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  z-index: 100;
  flex-shrink: 0;
  background: transparent;
  position: relative;
}

/* 默认分割线 - 更明显 */
.resize-handle::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 50%;
  width: 1px;
  transform: translateX(-0.5px);
  background: rgba(148, 163, 184, 0.1);
  border-radius: 1px;
  transition: all 0.2s ease;
}

/* 中间拖动指示器 - 默认可见 */
.handle-bar {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  background: rgba(148, 163, 184, 0.1);
  opacity: 0.5;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}

/* 拖动指示器上的点 */
.handle-bar::before,
.handle-bar::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.3);
  transition: all 0.2s ease;
}
.handle-bar::before { top: 8px; }
.handle-bar::after { bottom: 8px; }

/* Hover 状态 */
.resize-handle:hover::before {
  background: rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.2);
}

.resize-handle:hover .handle-bar {
  opacity: 0.9;
  background: rgba(56, 189, 248, 0.2);
  height: 48px;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.15);
}

.resize-handle:hover .handle-bar::before,
.resize-handle:hover .handle-bar::after {
  background: rgba(56, 189, 248, 0.6);
}

/* Active/拖动状态 */
.resize-handle.active::before,
.resize-handle:active::before {
  background: rgba(56, 189, 248, 0.6);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
  width: 2px;
}

.resize-handle.active .handle-bar,
.resize-handle:active .handle-bar {
  opacity: 1;
  background: rgba(56, 189, 248, 0.3);
  height: 60px;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
}

.resize-handle.active .handle-bar::before,
.resize-handle.active .handle-bar::after,
.resize-handle:active .handle-bar::before,
.resize-handle:active .handle-bar::after {
  background: #38bdf8;
  box-shadow: 0 0 4px rgba(56, 189, 248, 0.6);
}

/* 中间视觉面板 */
.visual-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  z-index: 5;
  overflow: hidden;
}

/* --- 侧边栏进出动画 (Vue Transition) --- */
/* 进入和离开的过程 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  will-change: width, opacity, transform;
}

/* 进入前状态 和 离开后状态 */
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px); /* 向右轻微位移 */
  opacity: 0;
  width: 0px !important; /* 关键：收起时宽度变0，让左侧自动撑开 */
  flex-grow: 0 !important; /* 确保 flex 布局下也能收缩 */
  margin-left: -16px; /* 抵消 gap，实现完全无缝收起 */
}

/* 确保动画过程中内容不换行/挤压 */
.chat-pane {
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 全局 Resizing 状态，强制覆盖所有 iframe/canvas 的指针事件 */
:global(body.is-resizing) *:not(.resize-handle):not(.resize-handle *) {
  pointer-events: none !important;
  user-select: none !important;
}
:global(body.is-resizing) {
  cursor: col-resize !important;
}
</style>
