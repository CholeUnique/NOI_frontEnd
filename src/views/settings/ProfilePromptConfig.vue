<template>
  <div class="profile-prompt-config">
    <!-- 画像摘要卡片 -->
    <div class="profile-summary-card">
      <div class="summary-header">
        <h3 class="summary-title">当前画像</h3>
        <button class="refresh-btn" @click="refreshProfile" :disabled="isLoading">
          <span class="refresh-icon" :class="{ spinning: isLoading }">↻</span>
          刷新
        </button>
      </div>
      
      <div v-if="summary" class="summary-content">
        <div class="summary-tags">
          <span 
            v-for="tag in profileTags" 
            :key="tag" 
            class="profile-tag"
          >{{ tag }}</span>
        </div>
        
        <div class="summary-metrics">
          <div class="metric-item">
            <span class="metric-label">知识广度</span>
            <div class="metric-bar">
              <div class="metric-fill" :style="{ width: `${knowledgeBreadth * 100}%` }"></div>
            </div>
            <span class="metric-value">{{ Math.round(knowledgeBreadth * 100) }}%</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">知识深度</span>
            <div class="metric-bar">
              <div class="metric-fill depth" :style="{ width: `${knowledgeDepth * 100}%` }"></div>
            </div>
            <span class="metric-value">{{ Math.round(knowledgeDepth * 100) }}%</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">正式程度</span>
            <div class="metric-bar">
              <div class="metric-fill formality" :style="{ width: `${formalityLevel * 100}%` }"></div>
            </div>
            <span class="metric-value">{{ getFormalityDescription() }}</span>
          </div>
        </div>
        
        <div class="summary-domains" v-if="topDomains.length > 0">
          <span class="domains-label">主要领域：</span>
          <span class="domains-list">{{ topDomains.join('、') }}</span>
        </div>
      </div>
      
      <div v-else class="summary-empty">
        <span class="empty-icon">📊</span>
        <p>暂无画像数据，开始使用后将自动生成</p>
      </div>
    </div>
    
    <!-- 提示词配置 -->
    <div class="prompt-config-section">
      <div class="section-header">
        <h3 class="section-title">提示词模板</h3>
        <div class="section-actions">
          <select v-model="selectedPurpose" class="purpose-select">
            <option value="chat">对话场景</option>
            <option value="writing">写作场景</option>
            <option value="recommendation">推荐场景</option>
          </select>
        </div>
      </div>
      
      <div class="template-editor-wrapper">
        <PromptEditor 
          :template="currentTemplate"
          :slots="slotValues"
          :available-slots="availableSlots"
          @update:template="handleTemplateUpdate"
          @preview="handlePreview"
        />
      </div>
      
      <div class="config-actions">
        <button class="action-btn secondary" @click="resetTemplate">
          重置为默认
        </button>
        <button class="action-btn primary" @click="saveTemplate">
          保存模板
        </button>
      </div>
    </div>
    
    <!-- 上下文预览 -->
    <div class="context-preview-section" v-if="previewContext">
      <div class="section-header">
        <h3 class="section-title">生成预览</h3>
        <button class="close-preview-btn" @click="previewContext = ''">×</button>
      </div>
      
      <div class="preview-content">
        <pre class="preview-text">{{ previewContext }}</pre>
      </div>
    </div>
    
    <!-- 高级设置 -->
    <div class="advanced-settings">
      <div class="setting-group-header" @click="showAdvanced = !showAdvanced">
        <span class="group-icon">⚙️</span>
        <span class="group-label">高级设置</span>
        <span class="expand-icon" :class="{ expanded: showAdvanced }">▼</span>
      </div>
      
      <transition name="slide">
        <div v-if="showAdvanced" class="advanced-content">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">生成策略</span>
              <span class="setting-desc">选择上下文生成方式</span>
            </div>
            <select v-model="promptConfig.strategy" class="setting-select">
              <option value="rule_based">规则生成（快速）</option>
              <option value="llm_enhanced">LLM 增强（自然）</option>
              <option value="hybrid">混合模式（平衡）</option>
            </select>
          </div>
          
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">最大 Token 数</span>
              <span class="setting-desc">上下文长度限制</span>
            </div>
            <input 
              type="number" 
              v-model.number="promptConfig.maxTokens" 
              class="setting-input"
              min="100"
              max="2000"
            />
          </div>
          
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">自动刷新</span>
              <span class="setting-desc">自动更新画像上下文</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="promptConfig.autoRefresh">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useResearchProfile } from '../../composables/useResearchProfile';
import { useProfilePrompt } from '../../composables/useProfilePrompt';
import PromptEditor from '../../components/settings/PromptEditor.vue';

// 使用 composables
const {
  summary,
  profileTags,
  topDomains,
  knowledgeBreadth,
  knowledgeDepth,
  formalityLevel,
  isLoading,
  fetchSummary,
  getFormalityDescription
} = useResearchProfile({ autoLoad: true });

const {
  currentTemplate,
  slotValues,
  availableSlots,
  config,
  setCustomTemplate,
  resetTemplate: doResetTemplate,
  fetchContext,
  updateConfig,
  saveConfigToStorage,
  CONTEXT_PURPOSE
} = useProfilePrompt({ autoFetch: true });

// 本地状态
const selectedPurpose = ref('chat');
const showAdvanced = ref(false);
const previewContext = ref('');

// 配置对象
const promptConfig = reactive({
  strategy: config.value.strategy || 'rule_based',
  maxTokens: config.value.maxTokens || 500,
  autoRefresh: config.value.autoRefresh || true
});

// 刷新画像
const refreshProfile = async () => {
  try {
    await fetchSummary(true);
    await fetchContext(true);
  } catch (err) {
    console.error('刷新画像失败:', err);
  }
};

// 处理模板更新
const handleTemplateUpdate = (newTemplate) => {
  setCustomTemplate(selectedPurpose.value, newTemplate);
};

// 处理预览
const handlePreview = async () => {
  try {
    const result = await fetchContext(true);
    previewContext.value = result;
  } catch (err) {
    console.error('预览失败:', err);
    previewContext.value = '预览生成失败，请稍后重试';
  }
};

// 重置模板
const resetTemplate = () => {
  doResetTemplate(selectedPurpose.value);
};

// 保存模板
const saveTemplate = () => {
  updateConfig({
    strategy: promptConfig.strategy,
    maxTokens: promptConfig.maxTokens,
    autoRefresh: promptConfig.autoRefresh
  });
  saveConfigToStorage();
  
  // 显示保存成功提示（简单实现）
  alert('模板已保存');
};

// 监听用途变化
watch(selectedPurpose, (newPurpose) => {
  updateConfig({ purpose: newPurpose });
});

// 监听配置变化
watch(promptConfig, (newConfig) => {
  updateConfig(newConfig);
}, { deep: true });
</script>

<style scoped>
.profile-prompt-config {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 画像摘要卡片 */
.profile-summary-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 12px;
  padding: 20px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.1);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  display: inline-block;
  transition: transform 0.3s;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.profile-tag {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.summary-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-label {
  width: 80px;
  font-size: 12px;
  color: #94a3b8;
}

.metric-bar {
  flex: 1;
  height: 6px;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.metric-fill.depth {
  background: linear-gradient(90deg, #818cf8, #a78bfa);
}

.metric-fill.formality {
  background: linear-gradient(90deg, #34d399, #10b981);
}

.metric-value {
  width: 60px;
  text-align: right;
  font-size: 12px;
  color: #f1f5f9;
}

.summary-domains {
  font-size: 13px;
  color: #94a3b8;
}

.domains-label {
  color: #64748b;
}

.domains-list {
  color: #f1f5f9;
}

.summary-empty {
  text-align: center;
  padding: 32px;
  color: #64748b;
}

.empty-icon {
  display: block;
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

/* 提示词配置 */
.prompt-config-section {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.purpose-select {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 8px 32px 8px 12px;
  color: #f1f5f9;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.template-editor-wrapper {
  margin-bottom: 16px;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.action-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.secondary {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #94a3b8;
}

.action-btn.secondary:hover {
  background: rgba(148, 163, 184, 0.1);
  color: #f1f5f9;
}

.action-btn.primary {
  background: #38bdf8;
  border: none;
  color: #0f172a;
}

.action-btn.primary:hover {
  background: #7dd3fc;
}

/* 上下文预览 */
.context-preview-section {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.close-preview-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
  line-height: 1;
}

.close-preview-btn:hover {
  color: #f1f5f9;
}

.preview-content {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 8px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.preview-text {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #e2e8f0;
  white-space: pre-wrap;
  line-height: 1.6;
}

/* 高级设置 */
.advanced-settings {
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.setting-group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(30, 41, 59, 0.4);
  cursor: pointer;
  transition: background 0.2s;
}

.setting-group-header:hover {
  background: rgba(30, 41, 59, 0.6);
}

.group-icon {
  font-size: 16px;
}

.group-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #f1f5f9;
}

.expand-icon {
  font-size: 10px;
  color: #64748b;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.advanced-content {
  padding: 20px;
  background: rgba(15, 23, 42, 0.4);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 14px;
  color: #f1f5f9;
  margin-bottom: 2px;
}

.setting-desc {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.setting-select {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 8px 32px 8px 12px;
  color: #f1f5f9;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.setting-input {
  width: 100px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  color: #f1f5f9;
  font-size: 13px;
  outline: none;
  text-align: right;
}

.setting-input:focus {
  border-color: #38bdf8;
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

/* Slide Animation */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
