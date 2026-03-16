<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="settings-modal">
      <button class="close-btn" @click="$emit('close')">×</button>
      
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
            
            <!-- LLM 配置 -->
            <section v-else-if="activeSection === 'llm'" class="settings-section">
              <div class="setting-group">
                <h3 class="group-title">模型提供商</h3>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">Provider</span>
                  </div>
                  <div class="setting-control">
                    <select v-model="llmSettings.provider" class="setting-select">
                      <option value="openai">OpenAI</option>
                      <option value="azure">Azure OpenAI</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="custom">Custom (OpenAI Compatible)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="setting-group">
                <h3 class="group-title">连接设置</h3>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">Base URL</span>
                    <span class="setting-desc">API 服务的接入点地址</span>
                  </div>
                  <div class="setting-control">
                    <input type="text" v-model="llmSettings.baseUrl" class="setting-input" placeholder="https://api.openai.com/v1">
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">API Key</span>
                    <span class="setting-desc">用于认证的密钥 (本地存储，不上传服务器)</span>
                  </div>
                  <div class="setting-control">
                    <input type="password" v-model="llmSettings.apiKey" class="setting-input" placeholder="sk-...">
                  </div>
                </div>
              </div>

              <div class="setting-group">
                <h3 class="group-title">模型参数</h3>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">Model Name</span>
                    <span class="setting-desc">使用的具体模型标识符</span>
                  </div>
                  <div class="setting-control">
                    <input type="text" v-model="llmSettings.modelName" class="setting-input" placeholder="gpt-4-turbo">
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">Temperature</span>
                    <span class="setting-desc">控制输出的随机性 (0.0 - 2.0)</span>
                  </div>
                  <div class="setting-control">
                    <div class="slider-control">
                      <input type="range" v-model.number="llmSettings.temperature" min="0" max="2" step="0.1" class="range-slider">
                      <span class="slider-value">{{ llmSettings.temperature }}</span>
                    </div>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">Max Tokens</span>
                    <span class="setting-desc">单次生成的最大 token 数</span>
                  </div>
                  <div class="setting-control">
                    <input type="number" v-model.number="llmSettings.maxTokens" class="setting-input number-input">
                  </div>
                </div>
              </div>
            </section>

            <!-- Skills 配置 -->
            <section v-else-if="activeSection === 'skills'" class="settings-section">
              <div class="setting-group">
                <h3 class="group-title">核心能力</h3>
                
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">知识库检索 (RAG)</span>
                    <span class="setting-desc">允许 AI 检索和引用本地上传的文档知识</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input type="checkbox" v-model="skillsSettings.knowledgeRetrieval">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">联网搜索</span>
                    <span class="setting-desc">允许 AI 搜索互联网获取最新信息</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input type="checkbox" v-model="skillsSettings.webSearch">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="setting-group">
                <h3 class="group-title">工具箱</h3>
                
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">计算器</span>
                    <span class="setting-desc">执行复杂的数学计算</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input type="checkbox" v-model="skillsSettings.calculator">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">数据分析</span>
                    <span class="setting-desc">处理 CSV/Excel 数据并生成图表 (Python Code Interpreter)</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input type="checkbox" v-model="skillsSettings.dataAnalysis">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">图像生成</span>
                    <span class="setting-desc">根据文本描述生成图片 (DALL-E / Stable Diffusion)</span>
                  </div>
                  <div class="setting-control">
                    <label class="toggle-switch">
                      <input type="checkbox" v-model="skillsSettings.imageGeneration">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, defineProps, defineEmits } from 'vue';
import ProfilePromptConfig from '../views/settings/ProfilePromptConfig.vue';

const props = defineProps({
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

// 导航项
const navItems = [
  { id: 'profile', label: '画像配置', icon: '🧠' },
  { id: 'llm', label: '模型配置', icon: '🤖' },
  { id: 'skills', label: '技能扩展', icon: '🛠️' },
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
  llm: { 
    title: '模型配置', 
    desc: '配置大语言模型参数、API 密钥及连接信息' 
  },
  skills: { 
    title: '技能扩展', 
    desc: '启用或禁用 AI 的工具调用能力（如联网搜索、数据分析等）' 
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

// LLM 设置
const llmSettings = reactive({
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000
});

// Skills 设置
const skillsSettings = reactive({
  webSearch: true,
  calculator: true,
  dataAnalysis: false,
  imageGeneration: false,
  knowledgeRetrieval: true
});

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
    localStorage.setItem('noi_llm_settings', JSON.stringify(llmSettings));
    localStorage.setItem('noi_skills_settings', JSON.stringify(skillsSettings));
    localStorage.setItem('noi_chat_settings', JSON.stringify(chatSettings));
    localStorage.setItem('noi_appearance_settings', JSON.stringify(appearanceSettings));
  } catch (err) {
    console.error('保存设置失败:', err);
  }
};

// 加载设置
const loadSettings = () => {
  try {
    const llmData = localStorage.getItem('noi_llm_settings');
    if (llmData) Object.assign(llmSettings, JSON.parse(llmData));

    const skillsData = localStorage.getItem('noi_skills_settings');
    if (skillsData) Object.assign(skillsSettings, JSON.parse(skillsData));

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
watch([llmSettings, skillsSettings, chatSettings, appearanceSettings], saveSettings, { deep: true });

// 初始化加载
loadSettings();
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.settings-modal {
  width: 900px;
  height: 650px;
  max-width: 95vw;
  max-height: 90vh;
  background: #0f172a;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.1);
  position: relative;
  overflow: hidden;
  animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.1);
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.settings-container {
  display: flex;
  height: 100%;
  width: 100%;
  background: transparent;
  overflow: hidden;
}

/* 左侧导航 */
.settings-nav {
  width: 240px;
  flex-shrink: 0;
  background: rgba(15, 23, 42, 0.5);
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
  position: relative;
}

.content-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  flex-shrink: 0;
  padding-right: 60px; /* 避开关闭按钮 */
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
  min-width: 160px;
}

/* Input Fields */
.setting-input {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  color: #f1f5f9;
  font-size: 14px;
  outline: none;
  width: 240px;
  transition: all 0.2s;
}

.setting-input:focus {
  border-color: #38bdf8;
  background: rgba(30, 41, 59, 1);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.1);
}

.number-input {
  width: 100px;
}

/* Range Slider */
.slider-control {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 240px;
}

.range-slider {
  flex: 1;
  -webkit-appearance: none;
  height: 4px;
  background: rgba(148, 163, 184, 0.3);
  border-radius: 2px;
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #38bdf8;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider-value {
  width: 32px;
  text-align: right;
  font-size: 13px;
  color: #f1f5f9;
  font-family: 'JetBrains Mono', monospace;
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

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
