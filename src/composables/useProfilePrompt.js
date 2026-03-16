/**
 * 画像提示词管理 Composable
 * 
 * 提供画像上下文的获取、模板管理、变量插槽等功能
 * 用于在对话和其他场景中注入个性化上下文
 */
import { ref, computed, reactive, watch } from 'vue';
import {
  getProfileContext,
  getQuickChatContext,
  generateProfileContext,
  CONTEXT_PURPOSE,
  GENERATION_STRATEGY
} from '../api/profile';


// ============ 默认模板 ============

const DEFAULT_TEMPLATES = {
  chat: `## 用户画像上下文

### 知识背景
{{knowledge_domains}}

### 学术风格
- 正式程度：{{formality_level}}
- 主要引用风格：{{citation_style}}
- 偏好语言：{{primary_language}}

### 思维特点
- 探索倾向：{{exploration_tendency}}
- 处理风格：{{processing_style}}
- 活跃时段：{{active_hours}}

### 个性化指导
请根据以上用户画像，调整回答风格和深度，以更好地满足用户的科研需求。`,

  writing: `## 写作辅助上下文

### 用户写作风格
- 正式程度：{{formality_level}}
- 句子复杂度偏好：{{sentence_complexity}}
- 专业术语使用：{{term_density}}

### 研究领域
{{knowledge_domains}}

### 引用习惯
- 主要风格：{{citation_style}}
- 语言偏好：{{primary_language}}

请根据用户的写作习惯提供建议，保持风格一致性。`,

  recommendation: `## 推荐系统上下文

### 用户研究兴趣
{{knowledge_domains}}

### 行为模式
- 探索 vs 专注：{{exploration_tendency}}
- 知识广度：{{knowledge_breadth}}
- 知识深度：{{knowledge_depth}}

### 活跃模式
{{active_hours}}

根据用户的研究兴趣和行为模式推荐相关文献。`
};


// ============ 全局状态 ============

// 当前上下文
const currentContext = ref('');

// 上下文摘要
const contextSummary = ref('');

// 加载状态
const isLoading = ref(false);

// 错误状态
const error = ref(null);

// 用户自定义模板
const customTemplates = reactive({
  chat: null,
  writing: null,
  recommendation: null,
  reading: null
});

// 提示词配置
const promptConfig = reactive({
  enabled: true,              // 是否启用画像注入
  purpose: 'chat',            // 当前用途
  strategy: 'rule_based',     // 生成策略
  maxTokens: 500,             // 最大 token 数
  language: 'zh',             // 语言
  autoRefresh: true,          // 自动刷新
  refreshInterval: 300000     // 刷新间隔（5分钟）
});

// 变量插槽值
const slotValues = reactive({
  knowledge_domains: '',
  formality_level: '',
  citation_style: '',
  primary_language: '',
  exploration_tendency: '',
  processing_style: '',
  active_hours: '',
  knowledge_breadth: '',
  knowledge_depth: '',
  sentence_complexity: '',
  term_density: '',
  profile_tags: ''
});

// 上次刷新时间
let lastRefreshTime = null;


// ============ Composable 主函数 ============

/**
 * 画像提示词管理 Composable
 * 
 * @param {Object} [options] - 配置选项
 * @param {string} [options.purpose='chat'] - 默认用途
 * @param {boolean} [options.autoFetch=false] - 是否自动获取
 * @returns {Object} - 提示词管理接口
 * 
 * @example
 * ```js
 * const { 
 *   context,
 *   isEnabled,
 *   fetchContext,
 *   updateConfig,
 *   getTemplateWithSlots
 * } = useProfilePrompt({ autoFetch: true });
 * ```
 */
export function useProfilePrompt(options = {}) {
  const { purpose = 'chat', autoFetch = false } = options;
  
  // 初始化用途
  if (purpose) {
    promptConfig.purpose = purpose;
  }
  
  
  // ============ 计算属性 ============
  
  /**
   * 当前上下文
   */
  const context = computed(() => currentContext.value);
  
  /**
   * 上下文摘要
   */
  const summary = computed(() => contextSummary.value);
  
  /**
   * 是否启用
   */
  const isEnabled = computed(() => promptConfig.enabled);
  
  /**
   * 当前配置
   */
  const config = computed(() => ({ ...promptConfig }));
  
  /**
   * 当前模板
   */
  const currentTemplate = computed(() => {
    const purpose = promptConfig.purpose;
    return customTemplates[purpose] || DEFAULT_TEMPLATES[purpose] || DEFAULT_TEMPLATES.chat;
  });
  
  /**
   * 可用的插槽列表
   */
  const availableSlots = computed(() => {
    const template = currentTemplate.value;
    const matches = template.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
  });
  
  /**
   * 渲染后的模板（填充插槽值）
   */
  const renderedTemplate = computed(() => {
    let template = currentTemplate.value;
    
    for (const [key, value] of Object.entries(slotValues)) {
      const placeholder = `{{${key}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value || `[未设置: ${key}]`);
    }
    
    return template;
  });
  
  
  // ============ 上下文获取方法 ============
  
  /**
   * 获取画像上下文
   * @param {boolean} [force=false] - 是否强制刷新
   * @returns {Promise<string>} - 上下文文本
   */
  const fetchContext = async (force = false) => {
    // 检查是否需要刷新
    if (!force && lastRefreshTime && 
        Date.now() - lastRefreshTime < promptConfig.refreshInterval) {
      return currentContext.value;
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await getProfileContext({
        purpose: promptConfig.purpose,
        maxTokens: promptConfig.maxTokens,
        strategy: promptConfig.strategy,
        language: promptConfig.language
      });
      
      currentContext.value = response.context || '';
      lastRefreshTime = Date.now();
      
      // 解析插槽值（如果后端返回了详细数据）
      if (response.slots) {
        for (const slot of response.slots) {
          if (slotValues.hasOwnProperty(slot.name)) {
            slotValues[slot.name] = slot.value;
          }
        }
      }
      
      return currentContext.value;
    } catch (err) {
      console.error('[ProfilePrompt] 获取上下文失败:', err);
      error.value = err.message || '获取画像上下文失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * 快速获取对话上下文
   * @returns {Promise<Object>} - 上下文和摘要
   */
  const fetchQuickContext = async () => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await getQuickChatContext();
      
      if (response.success) {
        currentContext.value = response.context || '';
        contextSummary.value = response.summary || '';
        lastRefreshTime = Date.now();
      }
      
      return {
        context: currentContext.value,
        summary: contextSummary.value
      };
    } catch (err) {
      console.error('[ProfilePrompt] 快速获取失败:', err);
      error.value = err.message || '快速获取上下文失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };
  
  
  // ============ 配置管理方法 ============
  
  /**
   * 更新配置
   * @param {Object} updates - 配置更新
   */
  const updateConfig = (updates) => {
    Object.assign(promptConfig, updates);
    
    // 如果改变了用途，可能需要刷新上下文
    if (updates.purpose && promptConfig.autoRefresh) {
      fetchContext(true).catch(console.error);
    }
  };
  
  /**
   * 启用/禁用画像注入
   * @param {boolean} enabled - 是否启用
   */
  const setEnabled = (enabled) => {
    promptConfig.enabled = enabled;
  };
  
  /**
   * 设置用途
   * @param {string} purpose - 用途
   */
  const setPurpose = (purpose) => {
    updateConfig({ purpose });
  };
  
  /**
   * 设置生成策略
   * @param {string} strategy - 策略
   */
  const setStrategy = (strategy) => {
    updateConfig({ strategy });
  };
  
  
  // ============ 模板管理方法 ============
  
  /**
   * 设置自定义模板
   * @param {string} purpose - 用途
   * @param {string} template - 模板内容
   */
  const setCustomTemplate = (purpose, template) => {
    if (customTemplates.hasOwnProperty(purpose)) {
      customTemplates[purpose] = template;
      saveTemplatesToStorage();
    }
  };
  
  /**
   * 重置模板为默认
   * @param {string} purpose - 用途
   */
  const resetTemplate = (purpose) => {
    if (customTemplates.hasOwnProperty(purpose)) {
      customTemplates[purpose] = null;
      saveTemplatesToStorage();
    }
  };
  
  /**
   * 获取模板（填充插槽后）
   * @param {string} [purpose] - 用途，默认为当前用途
   * @returns {string} - 渲染后的模板
   */
  const getTemplateWithSlots = (purpose = null) => {
    const targetPurpose = purpose || promptConfig.purpose;
    let template = customTemplates[targetPurpose] || DEFAULT_TEMPLATES[targetPurpose] || '';
    
    for (const [key, value] of Object.entries(slotValues)) {
      const placeholder = `{{${key}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value || '');
    }
    
    return template;
  };
  
  
  // ============ 插槽管理方法 ============
  
  /**
   * 更新插槽值
   * @param {string} slotName - 插槽名称
   * @param {string} value - 插槽值
   */
  const updateSlotValue = (slotName, value) => {
    if (slotValues.hasOwnProperty(slotName)) {
      slotValues[slotName] = value;
    }
  };
  
  /**
   * 批量更新插槽值
   * @param {Object} values - 插槽值对象
   */
  const updateSlotValues = (values) => {
    for (const [key, value] of Object.entries(values)) {
      if (slotValues.hasOwnProperty(key)) {
        slotValues[key] = value;
      }
    }
  };
  
  /**
   * 从画像摘要更新插槽值
   * @param {Object} summary - 画像摘要
   */
  const updateSlotsFromSummary = (summary) => {
    if (!summary) return;
    
    // 知识领域
    if (summary.top_domains?.length > 0) {
      slotValues.knowledge_domains = summary.top_domains.join('、');
    }
    
    // 正式程度
    const formality = summary.formality_level || 0.5;
    if (formality > 0.7) slotValues.formality_level = '高度正式';
    else if (formality > 0.5) slotValues.formality_level = '较为正式';
    else if (formality > 0.3) slotValues.formality_level = '中等';
    else slotValues.formality_level = '口语化';
    
    // 引用风格
    slotValues.citation_style = summary.primary_citation_style || 'IEEE';
    
    // 语言
    slotValues.primary_language = summary.primary_language === 'zh' ? '中文' : '英文';
    
    // 探索倾向
    const exploration = summary.exploration_tendency || 0.5;
    if (exploration > 0.6) slotValues.exploration_tendency = '探索型';
    else if (exploration < 0.4) slotValues.exploration_tendency = '专注型';
    else slotValues.exploration_tendency = '平衡型';
    
    // 处理风格
    slotValues.processing_style = {
      'depth_first': '深度优先',
      'breadth_first': '广度优先',
      'balanced': '平衡'
    }[summary.processing_style] || '平衡';
    
    // 活跃时段
    if (summary.active_hours?.length > 0) {
      slotValues.active_hours = summary.active_hours.map(h => `${h}:00`).join('、');
    }
    
    // 知识广度深度
    slotValues.knowledge_breadth = `${Math.round((summary.knowledge_breadth || 0) * 100)}%`;
    slotValues.knowledge_depth = `${Math.round((summary.knowledge_depth || 0) * 100)}%`;
    
    // 标签
    if (summary.profile_tags?.length > 0) {
      slotValues.profile_tags = summary.profile_tags.join('、');
    }
  };
  
  
  // ============ 持久化 ============
  
  /**
   * 保存模板到本地存储
   */
  const saveTemplatesToStorage = () => {
    try {
      const data = JSON.stringify(customTemplates);
      localStorage.setItem('noi_profile_templates', data);
    } catch (err) {
      console.error('[ProfilePrompt] 保存模板失败:', err);
    }
  };
  
  /**
   * 从本地存储加载模板
   */
  const loadTemplatesFromStorage = () => {
    try {
      const data = localStorage.getItem('noi_profile_templates');
      if (data) {
        const templates = JSON.parse(data);
        Object.assign(customTemplates, templates);
      }
    } catch (err) {
      console.error('[ProfilePrompt] 加载模板失败:', err);
    }
  };
  
  /**
   * 保存配置到本地存储
   */
  const saveConfigToStorage = () => {
    try {
      const data = JSON.stringify(promptConfig);
      localStorage.setItem('noi_profile_prompt_config', data);
    } catch (err) {
      console.error('[ProfilePrompt] 保存配置失败:', err);
    }
  };
  
  /**
   * 从本地存储加载配置
   */
  const loadConfigFromStorage = () => {
    try {
      const data = localStorage.getItem('noi_profile_prompt_config');
      if (data) {
        const config = JSON.parse(data);
        Object.assign(promptConfig, config);
      }
    } catch (err) {
      console.error('[ProfilePrompt] 加载配置失败:', err);
    }
  };
  
  
  // ============ 初始化 ============
  
  // 加载持久化数据
  loadTemplatesFromStorage();
  loadConfigFromStorage();
  
  // 自动获取
  if (autoFetch && promptConfig.enabled) {
    fetchContext().catch(console.error);
  }
  
  
  // ============ 返回接口 ============
  
  return {
    // 状态
    context,
    summary,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // 配置
    isEnabled,
    config,
    
    // 模板
    currentTemplate,
    renderedTemplate,
    availableSlots,
    slotValues: computed(() => ({ ...slotValues })),
    
    // 上下文获取
    fetchContext,
    fetchQuickContext,
    
    // 配置管理
    updateConfig,
    setEnabled,
    setPurpose,
    setStrategy,
    saveConfigToStorage,
    
    // 模板管理
    setCustomTemplate,
    resetTemplate,
    getTemplateWithSlots,
    
    // 插槽管理
    updateSlotValue,
    updateSlotValues,
    updateSlotsFromSummary,
    
    // 常量
    CONTEXT_PURPOSE,
    GENERATION_STRATEGY,
    DEFAULT_TEMPLATES
  };
}

export default useProfilePrompt;
