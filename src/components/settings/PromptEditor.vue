<template>
  <div class="prompt-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-label">模板编辑器</span>
      </div>
      <div class="toolbar-right">
        <button class="toolbar-btn" @click="insertSlot" title="插入变量">
          <span class="btn-icon">{{ }}</span>
          插入变量
        </button>
        <button class="toolbar-btn" @click="formatTemplate" title="格式化">
          <span class="btn-icon">⚡</span>
          格式化
        </button>
        <button class="toolbar-btn preview-btn" @click="handlePreview">
          <span class="btn-icon">👁</span>
          预览
        </button>
      </div>
    </div>
    
    <!-- 编辑区 -->
    <div class="editor-body">
      <div class="editor-main">
        <textarea 
          ref="textareaRef"
          v-model="localTemplate"
          class="template-textarea"
          placeholder="在此输入提示词模板...

使用 {{变量名}} 插入动态变量，例如：
- {{knowledge_domains}} - 知识领域
- {{formality_level}} - 正式程度
- {{exploration_tendency}} - 探索倾向"
          @input="handleInput"
          @keydown.tab.prevent="insertTab"
        ></textarea>
        
        <!-- 行号 -->
        <div class="line-numbers">
          <span v-for="n in lineCount" :key="n" class="line-number">{{ n }}</span>
        </div>
      </div>
      
      <!-- 变量面板 -->
      <div class="slots-panel" v-if="showSlotsPanel">
        <div class="panel-header">
          <span class="panel-title">可用变量</span>
          <button class="panel-close" @click="showSlotsPanel = false">×</button>
        </div>
        <div class="slots-list">
          <div 
            v-for="slot in availableSlots" 
            :key="slot"
            class="slot-item"
            @click="insertSlotVariable(slot)"
          >
            <span class="slot-name">{{ slot }}</span>
            <span class="slot-value">{{ getSlotValue(slot) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 状态栏 -->
    <div class="editor-statusbar">
      <div class="status-left">
        <span class="char-count">{{ localTemplate.length }} 字符</span>
        <span class="line-count">{{ lineCount }} 行</span>
        <span class="slot-count">{{ slotCount }} 个变量</span>
      </div>
      <div class="status-right">
        <span v-if="hasChanges" class="unsaved-indicator">● 未保存</span>
        <span v-else class="saved-indicator">✓ 已保存</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';

const props = defineProps({
  template: {
    type: String,
    default: ''
  },
  slots: {
    type: Object,
    default: () => ({})
  },
  availableSlots: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:template', 'preview']);

// 本地状态
const localTemplate = ref(props.template);
const textareaRef = ref(null);
const showSlotsPanel = ref(false);
const originalTemplate = ref(props.template);

// 计算属性
const lineCount = computed(() => {
  return (localTemplate.value.match(/\n/g) || []).length + 1;
});

const slotCount = computed(() => {
  const matches = localTemplate.value.match(/\{\{(\w+)\}\}/g);
  return matches ? matches.length : 0;
});

const hasChanges = computed(() => {
  return localTemplate.value !== originalTemplate.value;
});

// 监听外部 template 变化
watch(() => props.template, (newVal) => {
  if (newVal !== localTemplate.value) {
    localTemplate.value = newVal;
    originalTemplate.value = newVal;
  }
});

// 处理输入
const handleInput = () => {
  emit('update:template', localTemplate.value);
};

// 插入 Tab
const insertTab = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  localTemplate.value = 
    localTemplate.value.substring(0, start) + 
    '  ' + 
    localTemplate.value.substring(end);
  
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  });
};

// 插入变量（打开面板）
const insertSlot = () => {
  showSlotsPanel.value = !showSlotsPanel.value;
};

// 插入具体变量
const insertSlotVariable = (slotName) => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const insertText = `{{${slotName}}}`;
  
  localTemplate.value = 
    localTemplate.value.substring(0, start) + 
    insertText + 
    localTemplate.value.substring(end);
  
  emit('update:template', localTemplate.value);
  
  nextTick(() => {
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
  });
  
  showSlotsPanel.value = false;
};

// 获取变量值
const getSlotValue = (slotName) => {
  const value = props.slots[slotName];
  if (!value) return '(未设置)';
  if (value.length > 30) return value.substring(0, 30) + '...';
  return value;
};

// 格式化模板
const formatTemplate = () => {
  // 简单格式化：去除多余空行，规范缩进
  let formatted = localTemplate.value
    .replace(/\n{3,}/g, '\n\n')  // 多个空行合并为两个
    .replace(/[ \t]+$/gm, '')    // 去除行尾空格
    .trim();
  
  localTemplate.value = formatted;
  emit('update:template', localTemplate.value);
};

// 预览
const handlePreview = () => {
  emit('preview');
};
</script>

<style scoped>
.prompt-editor {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.6);
}

/* 工具栏 */
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(30, 41, 59, 0.8);
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
}

.toolbar-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: rgba(148, 163, 184, 0.1);
  color: #f1f5f9;
  border-color: rgba(148, 163, 184, 0.3);
}

.toolbar-btn.preview-btn {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
  color: #38bdf8;
}

.toolbar-btn.preview-btn:hover {
  background: rgba(56, 189, 248, 0.2);
}

.btn-icon {
  font-size: 14px;
}

/* 编辑区 */
.editor-body {
  position: relative;
  display: flex;
}

.editor-main {
  flex: 1;
  display: flex;
  position: relative;
}

.line-numbers {
  width: 40px;
  padding: 12px 8px;
  background: rgba(15, 23, 42, 0.4);
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  user-select: none;
}

.line-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
  height: 19.2px;
}

.template-textarea {
  flex: 1;
  min-height: 300px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.template-textarea::placeholder {
  color: #475569;
}

/* 变量面板 */
.slots-panel {
  width: 280px;
  border-left: 1px solid rgba(148, 163, 184, 0.15);
  background: rgba(30, 41, 59, 0.6);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.panel-close {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.panel-close:hover {
  color: #f1f5f9;
}

.slots-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.slot-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}

.slot-item:hover {
  background: rgba(56, 189, 248, 0.1);
}

.slot-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #38bdf8;
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 4px;
}

.slot-value {
  display: block;
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 状态栏 */
.editor-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(30, 41, 59, 0.6);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.status-left {
  display: flex;
  gap: 16px;
}

.status-left span {
  font-size: 11px;
  color: #64748b;
}

.unsaved-indicator {
  color: #f59e0b !important;
}

.saved-indicator {
  color: #22c55e !important;
}

/* 滚动条 */
.slots-list::-webkit-scrollbar,
.template-textarea::-webkit-scrollbar {
  width: 6px;
}

.slots-list::-webkit-scrollbar-thumb,
.template-textarea::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 3px;
}
</style>
