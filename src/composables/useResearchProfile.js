/**
 * 科研画像状态管理 Composable
 * 
 * 提供画像数据的获取、缓存、更新等功能
 * 支持三维度画像：知识结构、学术风格、思维模式
 */
import { ref, computed, reactive, readonly, watch } from 'vue';
import {
  getProfileSummary,
  quickAnalyze,
  analyzeProfile,
  getKnowledgeStructure,
  getAcademicStyle,
  getThinkingPattern,
  PROFILE_DIMENSIONS,
  ANALYSIS_DEPTH
} from '../api/profile';


// ============ 全局状态 ============

// 画像摘要
const profileSummary = ref(null);

// 详细画像数据
const profileData = reactive({
  knowledge_structure: null,
  academic_style: null,
  thinking_pattern: null
});

// 加载状态
const loading = reactive({
  summary: false,
  knowledge_structure: false,
  academic_style: false,
  thinking_pattern: false,
  full: false
});

// 错误状态
const errors = reactive({
  summary: null,
  knowledge_structure: null,
  academic_style: null,
  thinking_pattern: null
});

// 缓存时间戳
const lastFetchTime = reactive({
  summary: null,
  knowledge_structure: null,
  academic_style: null,
  thinking_pattern: null
});

// 缓存有效期（5分钟）
const CACHE_TTL = 5 * 60 * 1000;


// ============ 工具函数 ============

/**
 * 检查缓存是否有效
 * @param {string} key - 缓存键
 * @returns {boolean} - 缓存是否有效
 */
const isCacheValid = (key) => {
  const timestamp = lastFetchTime[key];
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
};

/**
 * 清除缓存
 * @param {string} [key] - 缓存键，为空则清除全部
 */
const clearCache = (key = null) => {
  if (key) {
    lastFetchTime[key] = null;
    if (key === 'summary') {
      profileSummary.value = null;
    } else if (profileData[key] !== undefined) {
      profileData[key] = null;
    }
  } else {
    lastFetchTime.summary = null;
    lastFetchTime.knowledge_structure = null;
    lastFetchTime.academic_style = null;
    lastFetchTime.thinking_pattern = null;
    profileSummary.value = null;
    profileData.knowledge_structure = null;
    profileData.academic_style = null;
    profileData.thinking_pattern = null;
  }
};


// ============ Composable 主函数 ============

/**
 * 科研画像 Composable
 * 
 * @param {Object} [options] - 配置选项
 * @param {boolean} [options.autoLoad=false] - 是否自动加载摘要
 * @param {number} [options.cacheTTL] - 缓存有效期（毫秒）
 * @returns {Object} - 画像管理接口
 * 
 * @example
 * ```js
 * const { 
 *   summary,
 *   isLoading,
 *   fetchSummary,
 *   fetchDimension,
 *   getProfileTags
 * } = useResearchProfile({ autoLoad: true });
 * ```
 */
export function useResearchProfile(options = {}) {
  const { autoLoad = false } = options;
  
  // ============ 计算属性 ============
  
  /**
   * 画像摘要
   */
  const summary = computed(() => profileSummary.value);
  
  /**
   * 知识结构数据
   */
  const knowledgeStructure = computed(() => profileData.knowledge_structure);
  
  /**
   * 学术风格数据
   */
  const academicStyle = computed(() => profileData.academic_style);
  
  /**
   * 思维模式数据
   */
  const thinkingPattern = computed(() => profileData.thinking_pattern);
  
  /**
   * 是否正在加载
   */
  const isLoading = computed(() => {
    return loading.summary || loading.full ||
           loading.knowledge_structure || 
           loading.academic_style || 
           loading.thinking_pattern;
  });
  
  /**
   * 是否有任何错误
   */
  const hasError = computed(() => {
    return errors.summary || errors.knowledge_structure ||
           errors.academic_style || errors.thinking_pattern;
  });
  
  /**
   * 画像标签
   */
  const profileTags = computed(() => {
    return profileSummary.value?.profile_tags || [];
  });
  
  /**
   * 顶级领域
   */
  const topDomains = computed(() => {
    return profileSummary.value?.top_domains || [];
  });
  
  /**
   * 知识广度
   */
  const knowledgeBreadth = computed(() => {
    return profileSummary.value?.knowledge_breadth || 0;
  });
  
  /**
   * 知识深度
   */
  const knowledgeDepth = computed(() => {
    return profileSummary.value?.knowledge_depth || 0;
  });
  
  /**
   * 正式程度
   */
  const formalityLevel = computed(() => {
    return profileSummary.value?.formality_level || 0.5;
  });
  
  /**
   * 探索倾向
   */
  const explorationTendency = computed(() => {
    return profileSummary.value?.exploration_tendency || 0.5;
  });
  
  /**
   * 处理风格
   */
  const processingStyle = computed(() => {
    return profileSummary.value?.processing_style || 'balanced';
  });
  
  
  // ============ 数据获取方法 ============
  
  /**
   * 获取画像摘要
   * @param {boolean} [forceRefresh=false] - 是否强制刷新
   * @returns {Promise<Object>} - 画像摘要
   */
  const fetchSummary = async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('summary') && profileSummary.value) {
      return profileSummary.value;
    }
    
    loading.summary = true;
    errors.summary = null;
    
    try {
      const response = await getProfileSummary();
      if (response.success && response.summary) {
        profileSummary.value = response.summary;
        lastFetchTime.summary = Date.now();
      }
      return profileSummary.value;
    } catch (error) {
      console.error('[ResearchProfile] 获取摘要失败:', error);
      errors.summary = error.message || '获取画像摘要失败';
      throw error;
    } finally {
      loading.summary = false;
    }
  };
  
  /**
   * 获取指定维度的详细分析
   * @param {string} dimension - 维度名称
   * @param {boolean} [forceRefresh=false] - 是否强制刷新
   * @param {number} [timeRangeDays] - 时间范围（天）
   * @returns {Promise<Object>} - 维度分析结果
   */
  const fetchDimension = async (dimension, forceRefresh = false, timeRangeDays = null) => {
    if (!forceRefresh && isCacheValid(dimension) && profileData[dimension]) {
      return profileData[dimension];
    }
    
    loading[dimension] = true;
    errors[dimension] = null;
    
    try {
      let response;
      
      switch (dimension) {
        case PROFILE_DIMENSIONS.KNOWLEDGE_STRUCTURE:
          response = await getKnowledgeStructure(timeRangeDays);
          break;
        case PROFILE_DIMENSIONS.ACADEMIC_STYLE:
          response = await getAcademicStyle(timeRangeDays);
          break;
        case PROFILE_DIMENSIONS.THINKING_PATTERN:
          response = await getThinkingPattern(timeRangeDays);
          break;
        default:
          throw new Error(`未知维度: ${dimension}`);
      }
      
      if (response.success) {
        profileData[dimension] = response[dimension];
        lastFetchTime[dimension] = Date.now();
      }
      
      return profileData[dimension];
    } catch (error) {
      console.error(`[ResearchProfile] 获取 ${dimension} 失败:`, error);
      errors[dimension] = error.message || `获取 ${dimension} 失败`;
      throw error;
    } finally {
      loading[dimension] = false;
    }
  };
  
  /**
   * 执行完整画像分析
   * @param {Object} [options] - 分析选项
   * @returns {Promise<Object>} - 完整分析结果
   */
  const fetchFullProfile = async (options = {}) => {
    loading.full = true;
    
    try {
      const response = await analyzeProfile({
        depth: options.depth || ANALYSIS_DEPTH.STANDARD,
        dimensions: options.dimensions || null,
        timeRangeDays: options.timeRangeDays || 30,
        includeInsights: options.includeInsights || false
      });
      
      if (response.success && response.profile) {
        const profile = response.profile;
        
        if (profile.knowledge_structure) {
          profileData.knowledge_structure = profile.knowledge_structure;
          lastFetchTime.knowledge_structure = Date.now();
        }
        if (profile.academic_style) {
          profileData.academic_style = profile.academic_style;
          lastFetchTime.academic_style = Date.now();
        }
        if (profile.thinking_pattern) {
          profileData.thinking_pattern = profile.thinking_pattern;
          lastFetchTime.thinking_pattern = Date.now();
        }
      }
      
      return response.profile;
    } catch (error) {
      console.error('[ResearchProfile] 完整分析失败:', error);
      throw error;
    } finally {
      loading.full = false;
    }
  };
  
  /**
   * 快速分析
   * @param {string} [dimension] - 指定维度
   * @param {number} [timeRangeDays=30] - 时间范围
   * @returns {Promise<Object>} - 分析结果
   */
  const quickFetch = async (dimension = null, timeRangeDays = 30) => {
    try {
      const response = await quickAnalyze(dimension, timeRangeDays);
      return response.profile;
    } catch (error) {
      console.error('[ResearchProfile] 快速分析失败:', error);
      throw error;
    }
  };
  
  
  // ============ 辅助方法 ============
  
  /**
   * 获取画像描述文本
   * @returns {string} - 描述文本
   */
  const getProfileDescription = () => {
    if (!profileSummary.value) return '';
    
    const s = profileSummary.value;
    const parts = [];
    
    // 知识结构描述
    if (s.top_domains?.length > 0) {
      parts.push(`主要研究领域：${s.top_domains.join('、')}`);
    }
    
    // 学术风格描述
    if (s.formality_level > 0.7) {
      parts.push('偏好正式学术写作');
    } else if (s.formality_level < 0.3) {
      parts.push('偏好实用简洁表达');
    }
    
    // 思维模式描述
    if (s.processing_style === 'depth_first') {
      parts.push('深度优先的思维方式');
    } else if (s.processing_style === 'breadth_first') {
      parts.push('广度优先的探索风格');
    }
    
    // 标签
    if (s.profile_tags?.length > 0) {
      parts.push(`特点：${s.profile_tags.join('、')}`);
    }
    
    return parts.join('；');
  };
  
  /**
   * 获取正式程度描述
   * @returns {string} - 描述文本
   */
  const getFormalityDescription = () => {
    const level = formalityLevel.value;
    if (level > 0.8) return '高度正式';
    if (level > 0.6) return '较为正式';
    if (level > 0.4) return '中等正式';
    if (level > 0.2) return '较为口语化';
    return '非常口语化';
  };
  
  /**
   * 获取探索倾向描述
   * @returns {string} - 描述文本
   */
  const getExplorationDescription = () => {
    const tendency = explorationTendency.value;
    if (tendency > 0.7) return '高度探索型';
    if (tendency > 0.5) return '偏探索型';
    if (tendency > 0.3) return '偏专注型';
    return '高度专注型';
  };
  
  /**
   * 刷新所有数据
   */
  const refreshAll = async () => {
    clearCache();
    await Promise.all([
      fetchSummary(true),
      fetchDimension(PROFILE_DIMENSIONS.KNOWLEDGE_STRUCTURE, true),
      fetchDimension(PROFILE_DIMENSIONS.ACADEMIC_STYLE, true),
      fetchDimension(PROFILE_DIMENSIONS.THINKING_PATTERN, true)
    ]);
  };
  
  
  // ============ 自动加载 ============
  
  if (autoLoad) {
    fetchSummary().catch(console.error);
  }
  
  
  // ============ 返回接口 ============
  
  return {
    // 状态
    summary,
    knowledgeStructure,
    academicStyle,
    thinkingPattern,
    isLoading,
    hasError,
    errors: readonly(errors),
    
    // 计算属性
    profileTags,
    topDomains,
    knowledgeBreadth,
    knowledgeDepth,
    formalityLevel,
    explorationTendency,
    processingStyle,
    
    // 数据获取
    fetchSummary,
    fetchDimension,
    fetchFullProfile,
    quickFetch,
    
    // 辅助方法
    getProfileDescription,
    getFormalityDescription,
    getExplorationDescription,
    
    // 缓存管理
    clearCache,
    refreshAll,
    
    // 常量
    PROFILE_DIMENSIONS,
    ANALYSIS_DEPTH
  };
}

export default useResearchProfile;
