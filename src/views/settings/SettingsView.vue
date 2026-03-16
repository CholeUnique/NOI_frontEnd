<template>
  <div class="settings-container">
    <!-- 左侧导航 -->
    <nav class="settings-nav">
      <div class="nav-header">
        <h2 class="nav-title">系统设置</h2>
      </div>
      
      <div class="nav-items">
        <div 
          v-for="item in navItems" 
          :key="item.id"
          class="nav-item"
          :class="{ active: activeSection === item.id }"
          @click="activeSection = item.id"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </div>
    </nav>
    
    <!-- 右侧内容区 -->
    <main class="settings-content">
      <div class="content-header">
        <h1 class="content-title">{{ currentSectionTitle }}</h1>
        <p class="content-desc">{{ currentSectionDesc }}</p>
      </div>
      
      <div class="content-body custom-scrollbar">
        <!-- 画像配置 -->
        <section v-if="activeSection === 'profile'" class="settings-section">
          <ProfilePromptConfig />
        </section>
        
        <!-- 对话设置 -->
        <section v-else-if="activeSection === 'chat'" class="settings-section">
          <div class="setting-group">
            <h3 class="group-title">对话偏好</h3>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">启用画像上下文</span>
                <span class="setting-desc">在对话中自动注入用户画像信息</span>
              </div>
              <div class="setting-control">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="chatSettings.enableProfileContext">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">显示上下文指示器</span>
                <span class="setting-desc">在对话界面显示当前画像状态</span>
              </div>
              <div class="setting-control">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="chatSettings.showContextIndicator">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">默认回答语言</span>
                <span class="setting-desc">AI 回答的首选语言</span>
              </div>
              <div class="setting-control">
                <select v-model="chatSettings.defaultLanguage" class="setting-select">
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="auto">自动检测</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="setting-group">
            <h3 class="group-title">行为追踪</h3>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">启用行为追踪</span>
                <span class="setting-desc">记录交互行为用于画像分析</span>
              </div>
              <div class="setting-control">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="chatSettings.enableBehaviorTracking">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 外观设置 -->
        <section v-else-if="activeSection === 'appearance'" class="settings-section">
          <div class="setting-group">
            <h3 class="group-title">界面主题</h3>
            
            <div class="theme-cards">
              <div 
                class="theme-card" 
                :class="{ active: appearanceSettings.theme === 'dark' }"
                @click="appearanceSettings.theme = 'dark'"
              >
                <div class="theme-preview dark-preview"></div>
                <span class="theme-name">深色</span>
              </div>
              <div 
                class="theme-card" 
                :class="{ active: appearanceSettings.theme === 'light' }"
                @click="appearanceSettings.theme = 'light'"
              >
                <div class="theme-preview light-preview"></div>
                <span class="theme-name">浅色</span>
              </div>
              <div 
                class="theme-card" 
                :class="{ active: appearanceSettings.theme === 'system' }"
                @click="appearanceSettings.theme = 'system'"
              >
                <div class="theme-preview system-preview"></div>
                <span class="theme-name">跟随系统</span>
              </div>
            </div>
          </div>
          
          <div class="setting-group">
            <h3 class="group-title">字体大小</h3>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">界面字体</span>
              </div>
              <div class="setting-control">
                <select v-model="appearanceSettings.fontSize" class="setting-select">
                  <option value="small">小</option>
                  <option value="medium">中</option>
                  <option value="large">大</option>
                </select>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 关于 -->
        <section v-else-if="activeSection === 'about'" class="settings-section">
          <div class="about-content">
            <div class="about-logo">
              <span class="logo-icon">✧</span>
              <h2 class="logo-text">NoI 知识库</h2>
            </div>
            
            <div class="about-info">
              <p class="version">版本 1.1.0</p>
              <p class="desc">智能科研助手，让知识触手可及</p>
            </div>
            
            <div class="about-links">
              <a href="#" class="about-link">使用文档</a>
              <a href="#" class="about-link">问题反馈</a>
              <a href="#" class="about-link">更新日志</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue';
import ProfilePromptConfig from './ProfilePromptConfig.vue';

// 导航项
const navItems = [
  { id: 'profile', label: '画像配置', icon: '🧠' },
  { id: 'chat', label: '对话设置', icon: '💬' },
  { id: 'appearance', label: '外观', icon: '🎨' },
  { id: 'about', label: '关于', icon: 'ℹ️' }
];

// 当前激活的部分
const activeSection = ref('profile');

// 部分标题和描述
const sectionMeta = {
  profile: { 
    title: '画像配置', 
    desc: '管理科研画像和提示词模板，个性化 AI 回答风格' 
  },
  chat: { 
    title: '对话设置', 
    desc: '配置对话行为和上下文注入选项' 
  },
  appearance: { 
    title: '外观', 
    desc: '自定义界面主题和显示选项' 
  },
  about: { 
    title: '关于', 
    desc: 'NoI 知识库系统信息' 
  }
};

const currentSectionTitle = computed(() => sectionMeta[activeSection.value]?.title || '');
const currentSectionDesc = computed(() => sectionMeta[activeSection.value]?.desc || '');

// 对话设置
const chatSettings = reactive({
  enableProfileContext: true,
  showContextIndicator: true,
  defaultLanguage: 'zh',
  enableBehaviorTracking: true
});

// 外观设置
const appearanceSettings = reactive({
  theme: 'dark',
  fontSize: 'medium'
});

// 保存设置到本地存储
const saveSettings = () => {
  try {
    localStorage.setItem('noi_chat_settings', JSON.stringify(chatSettings));
    localStorage.setItem('noi_appearance_settings', JSON.stringify(appearanceSettings));
  } catch (err) {
    console.error('保存设置失败:', err);
  }
};

// 加载设置
const loadSettings = () => {
  try {
    const chatData = localStorage.getItem('noi_chat_settings');
    if (chatData) {
      Object.assign(chatSettings, JSON.parse(chatData));
    }
    
    const appearanceData = localStorage.getItem('noi_appearance_settings');
    if (appearanceData) {
      Object.assign(appearanceSettings, JSON.parse(appearanceData));
    }
  } catch (err) {
    console.error('加载设置失败:', err);
  }
};

// 监听设置变化并保存
watch([chatSettings, appearanceSettings], saveSettings, { deep: true });

// 初始化加载
loadSettings();
</script>

<style scoped>
.settings-container {
  display: flex;
  height: 100%;
  width: 100%;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 16px;
  overflow: hidden;
}

/* 左侧导航 */
.settings-nav {
  width: 240px;
  flex-shrink: 0;
  background: rgba(15, 23, 42, 0.8);
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  flex-direction: column;
}

.nav-header {
  padding: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.nav-items {
  padding: 16px 12px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.nav-item:hover {
  background: rgba(148, 163, 184, 0.1);
  color: #f1f5f9;
}

.nav-item.active {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.nav-icon {
  font-size: 18px;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}

/* 右侧内容区 */
.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  flex-shrink: 0;
}

.content-title {
  font-size: 24px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 8px 0;
}

.content-desc {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.content-body {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 3px;
}

/* 设置组 */
.settings-section {
  max-width: 800px;
}

.setting-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 16px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #f1f5f9;
  margin-bottom: 4px;
}

.setting-desc {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.setting-control {
  flex-shrink: 0;
  margin-left: 24px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(148, 163, 184, 0.3);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #f1f5f9;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #38bdf8;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Select */
.setting-select {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 8px 32px 8px 12px;
  color: #f1f5f9;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.setting-select:focus {
  border-color: #38bdf8;
}

/* Theme Cards */
.theme-cards {
  display: flex;
  gap: 16px;
}

.theme-card {
  width: 120px;
  padding: 12px;
  background: rgba(30, 41, 59, 0.6);
  border: 2px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.theme-card:hover {
  border-color: rgba(148, 163, 184, 0.3);
}

.theme-card.active {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
}

.theme-preview {
  height: 60px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.dark-preview {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.light-preview {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

.system-preview {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #f1f5f9 50%, #e2e8f0 100%);
}

.theme-name {
  font-size: 12px;
  color: #94a3b8;
}

.theme-card.active .theme-name {
  color: #38bdf8;
}

/* About Section */
.about-content {
  text-align: center;
  padding: 48px 0;
}

.about-logo {
  margin-bottom: 24px;
}

.about-logo .logo-icon {
  display: block;
  font-size: 48px;
  color: #38bdf8;
  margin-bottom: 16px;
  text-shadow: 0 0 20px rgba(56, 189, 248, 0.5);
}

.about-logo .logo-text {
  font-family: 'Orbitron', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.about-info {
  margin-bottom: 32px;
}

.about-info .version {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 8px 0;
}

.about-info .desc {
  font-size: 16px;
  color: #94a3b8;
  margin: 0;
}

.about-links {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.about-link {
  color: #38bdf8;
  text-decoration: none;
  font-size: 14px;
  padding: 8px 16px;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  transition: all 0.2s;
}

.about-link:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: #38bdf8;
}
</style>
