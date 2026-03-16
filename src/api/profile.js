/**
 * 画像 API 调用层
 * 
 * 提供与后端画像接口的交互功能
 * 支持画像分析、上下文生成、画像摘要等
 */
import axios from 'axios';
import { API_CONFIG } from '../config/api';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: `${API_CONFIG.base.url}/api/v1/profile`,
  timeout: API_CONFIG.base.timeout
});

// 请求拦截器：自动附加 Token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});


// ============ 常量定义 ============

/**
 * 画像维度
 */
export const PROFILE_DIMENSIONS = {
  KNOWLEDGE_STRUCTURE: 'knowledge_structure',
  ACADEMIC_STYLE: 'academic_style',
  THINKING_PATTERN: 'thinking_pattern'
};

/**
 * 分析深度
 */
export const ANALYSIS_DEPTH = {
  QUICK: 'quick',
  STANDARD: 'standard',
  DEEP: 'deep'
};

/**
 * 上下文用途
 */
export const CONTEXT_PURPOSE = {
  CHAT: 'chat',
  WRITING: 'writing',
  RECOMMENDATION: 'recommendation',
  READING: 'reading'
};

/**
 * 生成策略
 */
export const GENERATION_STRATEGY = {
  RULE_BASED: 'rule_based',
  LLM_ENHANCED: 'llm_enhanced',
  HYBRID: 'hybrid'
};


// ============ 画像分析 API ============

/**
 * 执行画像分析
 * @param {Object} options - 分析选项
 * @param {string} [options.depth='standard'] - 分析深度
 * @param {Array<string>} [options.dimensions] - 分析维度
 * @param {number} [options.timeRangeDays] - 时间范围（天）
 * @param {boolean} [options.includeInsights=false] - 是否包含洞察
 * @returns {Promise} - 返回分析结果
 */
export const analyzeProfile = async (options = {}) => {
  const response = await apiClient.post('/analyze', {
    depth: options.depth || 'standard',
    dimensions: options.dimensions || null,
    time_range_days: options.timeRangeDays || null,
    include_insights: options.includeInsights || false
  });
  return response.data;
};

/**
 * 快速画像分析
 * @param {string} [dimension] - 指定分析维度
 * @param {number} [timeRangeDays=30] - 时间范围（天）
 * @returns {Promise} - 返回分析结果
 */
export const quickAnalyze = async (dimension = null, timeRangeDays = 30) => {
  const params = { time_range_days: timeRangeDays };
  if (dimension) {
    params.dimension = dimension;
  }
  const response = await apiClient.get('/analyze/quick', { params });
  return response.data;
};


// ============ 上下文生成 API ============

/**
 * 获取画像上下文
 * @param {Object} options - 上下文选项
 * @param {string} [options.purpose='chat'] - 上下文用途
 * @param {number} [options.maxTokens=500] - 最大 token 数
 * @param {string} [options.strategy='rule_based'] - 生成策略
 * @param {string} [options.language='zh'] - 输出语言
 * @returns {Promise} - 返回上下文结果
 */
export const getProfileContext = async (options = {}) => {
  const response = await apiClient.get('/context', {
    params: {
      purpose: options.purpose || 'chat',
      max_tokens: options.maxTokens || 500,
      strategy: options.strategy || 'rule_based',
      language: options.language || 'zh'
    }
  });
  return response.data;
};

/**
 * 生成画像上下文（POST 方法）
 * @param {Object} request - 上下文请求
 * @param {string} request.purpose - 上下文用途
 * @param {number} [request.maxTokens=500] - 最大 token 数
 * @param {string} [request.strategy='rule_based'] - 生成策略
 * @param {string} [request.language='zh'] - 输出语言
 * @param {Array<string>} [request.includeDimensions] - 包含的维度
 * @returns {Promise} - 返回上下文结果
 */
export const generateProfileContext = async (request) => {
  const params = {
    strategy: request.strategy || 'rule_based',
    language: request.language || 'zh'
  };
  
  const response = await apiClient.post('/context', {
    purpose: request.purpose,
    max_tokens: request.maxTokens || 500,
    include_dimensions: request.includeDimensions || null
  }, { params });
  
  return response.data;
};

/**
 * 快速获取对话上下文
 * @returns {Promise} - 返回快速上下文结果
 */
export const getQuickChatContext = async () => {
  const response = await apiClient.get('/context/quick');
  return response.data;
};


// ============ 画像摘要 API ============

/**
 * 获取画像摘要
 * @returns {Promise} - 返回画像摘要
 */
export const getProfileSummary = async () => {
  const response = await apiClient.get('/summary');
  return response.data;
};


// ============ 维度详情 API ============

/**
 * 获取知识结构分析
 * @param {number} [timeRangeDays] - 时间范围（天）
 * @returns {Promise} - 返回知识结构分析结果
 */
export const getKnowledgeStructure = async (timeRangeDays = null) => {
  const params = timeRangeDays ? { time_range_days: timeRangeDays } : {};
  const response = await apiClient.get('/knowledge-structure', { params });
  return response.data;
};

/**
 * 获取学术风格分析
 * @param {number} [timeRangeDays] - 时间范围（天）
 * @returns {Promise} - 返回学术风格分析结果
 */
export const getAcademicStyle = async (timeRangeDays = null) => {
  const params = timeRangeDays ? { time_range_days: timeRangeDays } : {};
  const response = await apiClient.get('/academic-style', { params });
  return response.data;
};

/**
 * 获取思维模式分析
 * @param {number} [timeRangeDays] - 时间范围（天）
 * @returns {Promise} - 返回思维模式分析结果
 */
export const getThinkingPattern = async (timeRangeDays = null) => {
  const params = timeRangeDays ? { time_range_days: timeRangeDays } : {};
  const response = await apiClient.get('/thinking-pattern', { params });
  return response.data;
};


// ============ 支持信息 API ============

/**
 * 获取支持的画像维度
 * @returns {Promise} - 返回维度列表及说明
 */
export const getSupportedDimensions = async () => {
  const response = await apiClient.get('/dimensions');
  return response.data;
};


// ============ 导出默认对象 ============

export default {
  // 常量
  PROFILE_DIMENSIONS,
  ANALYSIS_DEPTH,
  CONTEXT_PURPOSE,
  GENERATION_STRATEGY,
  
  // 画像分析
  analyzeProfile,
  quickAnalyze,
  
  // 上下文生成
  getProfileContext,
  generateProfileContext,
  getQuickChatContext,
  
  // 画像摘要
  getProfileSummary,
  
  // 维度详情
  getKnowledgeStructure,
  getAcademicStyle,
  getThinkingPattern,
  
  // 支持信息
  getSupportedDimensions
};
