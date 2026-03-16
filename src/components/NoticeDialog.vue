<template>
  <div class="holo-system-container">
    
    <div 
      class="orb-trigger" 
      ref="orbRef"
      :style="orbStyle"
      :class="{ 'is-dragging': isDragging, 'active': isOpen }"
      @mousedown="startDrag"
      @touchstart.passive="startDrag"
    >
      <div class="orb-core">
        <span class="orb-icon" v-if="!isOpen">📡</span>
        <span class="orb-icon" v-else>✕</span>
      </div>
      <div class="orb-ring"></div>
      <div v-if="totalUnread > 0 && !isOpen" class="total-badge">{{ totalUnread }}</div>
    </div>

    <transition :name="panelTransitionName">
      <div 
        v-if="isOpen" 
        class="comm-panel glass-panel"
        :style="panelPositionStyle"
      >
        <div class="panel-header">
          <div class="header-tab" :class="{ active: activeTab === 'messages' }" @click="activeTab = 'messages'">
            ◉ COMMS <span v-if="unreadMsg" class="badge-dot"></span>
          </div>
          <div class="header-tab" :class="{ active: activeTab === 'system' }" @click="activeTab = 'system'">
            ⚡ LOGS <span v-if="unreadSys" class="badge-dot"></span>
          </div>
          <button class="close-btn" @click="toggleAll(false)">×</button>
        </div>

        <div class="panel-body custom-scrollbar">
          <div v-if="activeTab === 'messages'" class="msg-list">
             <div v-for="chat in chatList" :key="chat.id" class="msg-item">
               <div class="avatar-box">
                 <img :src="chat.avatar" class="avatar-img" />
                 <div class="status-indicator" :class="chat.status"></div>
               </div>
               <div class="msg-content">
                 <div class="msg-top"><span class="msg-name">{{ chat.name }}</span><span class="msg-time">{{ chat.time }}</span></div>
                 <div class="msg-text">{{ chat.lastMsg }}</div>
               </div>
             </div>
          </div>

          <div v-if="activeTab === 'system'" class="sys-list">
             <div v-for="log in systemLogs" :key="log.id" class="log-card">
               <div class="log-header"><span class="log-type">{{ log.type }}</span><span class="log-time">{{ log.time }}</span></div>
               <div class="log-title">{{ log.title }}</div>
               <div class="log-desc">{{ log.desc }}</div>
               <button v-if="log.action" class="log-action-btn" @click="handleLogAction(log)">{{ log.action }}</button>
             </div>
          </div>
        </div>
      </div>
    </transition>

    <DailyReport 
      :visible="showReport" 
      :style="reportPositionStyle"
      @close="showReport = false" 
      @open-doc="handleOpenDoc"
    />

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';
import DailyReport from './DailyReport.vue';

// --- 常量定义 ---
const PANEL_MAX_HEIGHT = 600; // 预估面板最大高度 (包含边距)
const BALL_SIZE = 60;

// --- 状态管理 ---
const isOpen = ref(false);        // Hub 面板开关
const showReport = ref(false);    // 日报面板开关
const activeTab = ref('messages');

// --- 拖拽与定位核心逻辑 ---
const orbRef = ref(null);
const isDragging = ref(false);
const position = reactive({ x: 0, y: 0 }); // 悬浮球当前坐标 (left, top)
const dockSide = ref('right'); // 'left' | 'right' - 停靠在哪一侧
const verticalMode = ref('bottom'); // 'top' | 'bottom' - 决定面板往上弹还是往下弹

// 视口尺寸
const windowSize = reactive({ w: window.innerWidth, h: window.innerHeight });

// 样式：悬浮球位置
const orbStyle = computed(() => ({
  left: `${position.x}px`,
  top: `${position.y}px`,
  // 拖拽时取消过渡，实现跟手；松手时加上过渡，实现吸附动画
  transition: isDragging.value ? 'none' : 'all 0.5s cubic-bezier(0.25, 1, 0.32, 1.28)' 
}));

// 样式：Hub 面板位置计算
const panelPositionStyle = computed(() => {
  const gap = 15; // 面板与球的间距
  const style = {};
  
  // X轴：球在左边，面板靠左；球在右边，面板靠右
  if (dockSide.value === 'right') {
    style.right = `${windowSize.w - position.x + gap}px`;
    style.left = 'auto'; // 清除 left
  } else {
    style.left = `${position.x + 60 + gap}px`; // 60是球宽
    style.right = 'auto';
  }

  // Y轴：球在上半屏，面板往下弹；球在下半屏，面板往上弹
  if (verticalMode.value === 'top') {
    style.top = `${position.y}px`;
    style.bottom = 'auto';
    style.transformOrigin = dockSide.value === 'right' ? 'top right' : 'top left';
  } else {
    style.bottom = `${windowSize.h - position.y - BALL_SIZE}px`;
    style.top = 'auto';
    style.transformOrigin = dockSide.value === 'right' ? 'bottom right' : 'bottom left';
  }
  
  return style;
});

// 样式：Report 面板位置 (类似 Hub，但偏移更多)
const reportPositionStyle = computed(() => {
  // 简单的复用 Hub 的定位逻辑，但为了不遮挡 Hub，我们需要做一些偏移
  // 这里为了简化，我们让 Report 覆盖在 Hub 之上，或者并在 Hub 旁边
  // 采用“覆盖模式”，因为空间有限
  return {
    ...panelPositionStyle.value,
    zIndex: 10001 // 确保在 Hub 之上
  };
});

// 动画名：根据方向决定
const panelTransitionName = computed(() => {
  return verticalMode.value === 'top' ? 'panel-slide-down' : 'panel-slide-up';
});

// --- 拖拽事件处理 ---
let startX = 0, startY = 0;
let initialX = 0, initialY = 0;
let hasMoved = false; // 区分点击和拖拽

const startDrag = (e) => {
  // 兼容触摸和鼠标
  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  
  isDragging.value = true;
  hasMoved = false;
  startX = clientX;
  startY = clientY;
  initialX = position.x;
  initialY = position.y;

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('touchend', stopDrag);
};

const onDrag = (e) => {
  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

  const dx = clientX - startX;
  const dy = clientY - startY;

  // 防抖动：只有移动超过一点距离才算拖拽
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;

  // 限制边界
  let newX = initialX + dx;
  let newY = initialY + dy;
  
  // 简单的边界限制 (球宽60)
  if (newX < 0) newX = 0;
  if (newX > windowSize.w - 60) newX = windowSize.w - 60;
  if (newY < 0) newY = 0;
  if (newY > windowSize.h - 60) newY = windowSize.h - 60;

  position.x = newX;
  position.y = newY;
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', stopDrag);

  if (!hasMoved) {
    // 如果是点击 (没有明显移动)，则切换开关
    toggleAll(!isOpen.value);
  } else {
    // 如果是拖拽结束，执行吸附逻辑
    snapToEdge();
  }
};

// 核心功能：自动吸附边缘
const snapToEdge = () => {
  // 1. 左右吸附
  const centerX = position.x + BALL_SIZE/2;
  if (centerX < windowSize.w / 2) {
    position.x = 20; dockSide.value = 'left';
  } else {
    position.x = windowSize.w - BALL_SIZE - 20; dockSide.value = 'right';
  }

  // 2. 上下判断 (智能高度检测)
  // 计算球体下方的剩余空间
  const spaceBelow = windowSize.h - position.y;
  // 计算球体上方的剩余空间
  const spaceAbove = position.y;

  // 逻辑：如果下方空间足够放面板，就向下弹；否则，如果上方空间够，就向上弹；
  // 如果都不够（屏幕太矮），哪边空间大往哪边弹。
  if (spaceBelow >= PANEL_MAX_HEIGHT) {
    verticalMode.value = 'top'; // Downwards
  } else if (spaceAbove >= PANEL_MAX_HEIGHT) {
    verticalMode.value = 'bottom'; // Upwards
  } else {
    verticalMode.value = spaceBelow > spaceAbove ? 'top' : 'bottom';
  }

  // Y轴防贴边
  if (position.y < 50) position.y = 50;
  if (position.y > windowSize.h - 80) position.y = windowSize.h - 80;
};
// --- 业务逻辑 ---

const toggleAll = (state) => {
  if (state === false) {
    // 关闭所有
    isOpen.value = false;
    showReport.value = false; // 联动关闭 Report
  } else {
    // 打开 Hub
    isOpen.value = true;
    showReport.value = false; // 确保 Report 默认是关的
  }
};

const handleLogAction = (log) => {
  if (log.type === 'DAILY_REPORT') {
    showReport.value = true;
    // 保持 Hub 开启或者关闭 Hub 看个人喜好，这里不关闭 Hub，只是层级覆盖
  }
};

const handleOpenDoc = ({ id, title }) => {
  console.log("Open Doc:", title);
  toggleAll(false); // 跳转后关闭所有悬浮窗
};

// 监听窗口大小变化
const onResize = () => {
  windowSize.w = window.innerWidth;
  windowSize.h = window.innerHeight;
  snapToEdge(); // 重新吸附
};

// 初始化位置 (右下角)
onMounted(() => {
  window.addEventListener('resize', onResize);
  position.x = window.innerWidth - 80;
  position.y = window.innerHeight - 150;
  snapToEdge();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});

// Mock Data (保留你原有的)
const chatList = reactive([
  { id: 1, name: 'Dr. Sarah', avatar: 'https://i.pravatar.cc/150?u=1', status: 'online', time: '10:42 AM', lastMsg: '知识图谱的节点数据已更新。' },
  { id: 2, name: 'Team Alpha', avatar: 'https://i.pravatar.cc/150?u=2', status: 'busy', time: 'Yesterday', lastMsg: '[文件] Q3_Data.pdf' }
]);
const systemLogs = reactive([
  { id: 101, type: 'DAILY_REPORT', time: '08:00 AM', title: '每日学报生成完毕', desc: '今日收录新论文 5 篇。', action: 'VIEW REPORT' },
  { id: 102, type: 'SECURITY', time: '09:30 AM', title: '异常登录检测', desc: 'IP: 192.168.1.50', action: null }
]);
const unreadMsg = ref(2);
const unreadSys = ref(1);
const totalUnread = computed(() => unreadMsg.value + unreadSys.value);

</script>

<style scoped>
/* 容器全屏穿透，不挡点击 */
.holo-system-container {
  position: fixed; top: 0; left: 0; width: 0; height: 0;
  z-index: 9999;
}

/* ============================
   1. 悬浮球 (Orb)
   ============================ */
.orb-trigger {
  width: 60px; height: 60px;
  position: fixed; /* 使用 fixed 定位，通过 js 控制 top/left */
  cursor: grab;
  z-index: 10002; /* 最高层级 */
  touch-action: none; /* 防止移动端滚动 */
}
.orb-trigger:active { cursor: grabbing; }

/* 拖拽时稍微放大 */
.orb-trigger.is-dragging .orb-core { transform: scale(0.9); box-shadow: 0 0 10px var(--accent-cyan); }

.orb-core {
  width: 50px; height: 50px;
  background: radial-gradient(circle, #fff, var(--accent-cyan));
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 15px var(--accent-cyan);
  position: absolute; top: 5px; left: 5px;
  transition: all 0.3s;
}

.orb-icon { font-size: 20px; color: #000; font-weight: bold; }
.orb-trigger.active .orb-core { background: var(--accent-pink); box-shadow: 0 0 15px var(--accent-pink); }
.orb-trigger.active .orb-icon { color: #fff; }

.orb-ring {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  border: 1px solid var(--accent-cyan); border-radius: 50%;
  animation: ripple 2s infinite; opacity: 0; pointer-events: none;
}
@keyframes ripple { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }

.total-badge {
  position: absolute; top: 0; right: 0;
  background: var(--accent-pink); color: #fff;
  font-size: 10px; padding: 2px 5px; border-radius: 10px; border: 1px solid #000;
}

/* ============================
   2. 面板通用样式
   ============================ */
.comm-panel {
  position: fixed; /* 也是 fixed */
  width: 320px; height: 450px;
  display: flex; flex-direction: column;
  background: rgba(10, 20, 30, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  border-radius: 16px;
  overflow: hidden;
  z-index: 10000;
  /* 初始不可见，由 transition 控制 */
}

/* Header & Body 样式保持不变 (省略部分细节以节省篇幅，沿用之前的 CSS 即可) */
.panel-header { display: flex; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0 10px; }
.header-tab { flex: 1; padding: 8px 0; text-align: center; color: #889; cursor: pointer; font-size: 12px; font-weight: bold; }
.header-tab.active { color: var(--accent-cyan); border-bottom: 2px solid var(--accent-cyan); background: linear-gradient(to top, rgba(0,247,255,0.1), transparent); }
.badge-dot { display: inline-block; width: 6px; height: 6px; background: var(--accent-pink); border-radius: 50%; margin-left: 4px; }
.close-btn { background: none; border: none; color: #667; font-size: 20px; padding: 0 10px; cursor: pointer; }
.panel-body { flex: 1; overflow-y: auto; padding: 10px; }

/* 列表样式 (简化版) */
.msg-item, .log-card { margin-bottom: 10px; padding: 10px; border-radius: 8px; cursor: pointer; }
.msg-item:hover { background: rgba(255,255,255,0.05); }
.log-card { background: rgba(0,247,255,0.05); border-left: 2px solid var(--accent-cyan); }
.msg-top, .log-header { display: flex; justify-content: space-between; font-size: 12px; color: #aaa; margin-bottom: 4px; }
.msg-text { font-size: 12px; color: #fff; }
.msg-name, .log-title { color: #fff; font-weight: bold; font-size:13px;}
.log-desc{font-size:12px;}
.log-action-btn { margin-top: 5px; background: transparent; border: 1px solid var(--accent-cyan); color: var(--accent-cyan); font-size: 10px; padding: 2px 8px; cursor: pointer; }
.log-action-btn:hover { background: var(--accent-cyan); color: #000; }

.avatar-box { width: 30px; height: 30px; border-radius: 50%; background: #333; float: left; margin-right: 10px; position: relative; }
.avatar-img { width: 100%; height: 100%; border-radius: 50%; }
.status-indicator { width: 8px; height: 8px; position: absolute; bottom: 0; right: 0; border-radius: 50%; background: #0f0; border: 1px solid #000; }

/* ============================
   3. 动画：方向感知
   ============================ */

/* 向上弹出动画 (Bottom Mode) */
.panel-slide-up-enter-active, .panel-slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.panel-slide-up-enter-from, .panel-slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

/* 向下弹出动画 (Top Mode) */
.panel-slide-down-enter-active, .panel-slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.panel-slide-down-enter-from, .panel-slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

</style>