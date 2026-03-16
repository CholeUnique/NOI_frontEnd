/**
 * 行为追踪 Composable
 * 
 * 提供 Vue 组件中使用的行为追踪功能
 * 支持自动追踪和手动追踪，批量上报优化
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { 
  trackBehaviorEvent, 
  trackBehaviorEventsBatch,
  EVENT_TYPES,
  TARGET_TYPES 
} from '../api/behavior';
import { API_CONFIG } from '../config/api';

// ============ 配置常量 ============

/**
 * 批量上报配置
 */
const BATCH_CONFIG = {
  maxSize: 20,           // 最大批量大小
  flushInterval: 10000,  // 定时上报间隔（毫秒）
  retryDelay: 3000,      // 重试延迟（毫秒）
  maxRetries: 3          // 最大重试次数
};

/**
 * 阅读行为配置
 */
const READ_CONFIG = {
  minReadTime: 3000,     // 最小阅读时间（毫秒）
  sampleInterval: 5000,  // 采样间隔（毫秒）
  scrollThreshold: 0.1   // 滚动阈值（10%变化触发）
};


// ============ 全局状态 ============

// 事件队列（用于批量上报）
const eventQueue = ref([]);

// 上报状态
const isUploading = ref(false);

// 上报统计
const stats = ref({
  totalTracked: 0,
  totalUploaded: 0,
  failedCount: 0,
  lastUploadTime: null
});

// 定时器引用
let flushTimer = null;


// ============ 核心函数 ============

/**
 * 生成会话ID
 * @returns {string} 会话ID
 */
const generateSessionId = () => {
  // 优先使用已存储的会话ID
  let sessionId = sessionStorage.getItem('behavior_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('behavior_session_id', sessionId);
  }
  return sessionId;
};

/**
 * 获取当前会话ID
 * @returns {string} 会话ID
 */
const getSessionId = () => {
  return sessionStorage.getItem('behavior_session_id') || generateSessionId();
};

/**
 * 将事件加入队列
 * @param {Object} event - 事件数据
 */
const enqueueEvent = (event) => {
  eventQueue.value.push({
    ...event,
    session_id: event.session_id || getSessionId(),
    _queuedAt: Date.now()
  });
  
  stats.value.totalTracked++;
  
  // 如果队列达到最大大小，立即上报
  if (eventQueue.value.length >= BATCH_CONFIG.maxSize) {
    flushEvents();
  }
};

/**
 * 上报队列中的事件
 * @param {number} [retryCount=0] - 当前重试次数
 */
const flushEvents = async (retryCount = 0) => {
  if (isUploading.value || eventQueue.value.length === 0) {
    return;
  }
  
  isUploading.value = true;
  
  // 取出待上报的事件
  const eventsToUpload = eventQueue.value.splice(0, BATCH_CONFIG.maxSize);
  
  // 移除内部字段
  const cleanEvents = eventsToUpload.map(({ _queuedAt, ...rest }) => rest);
  
  try {
    if (cleanEvents.length === 1) {
      // 单个事件直接上报
      await trackBehaviorEvent(cleanEvents[0]);
    } else {
      // 批量上报
      await trackBehaviorEventsBatch(cleanEvents);
    }
    
    stats.value.totalUploaded += cleanEvents.length;
    stats.value.lastUploadTime = new Date().toISOString();
    
  } catch (error) {
    console.error('[BehaviorTracker] 上报失败:', error);
    stats.value.failedCount += cleanEvents.length;
    
    // 重试逻辑
    if (retryCount < BATCH_CONFIG.maxRetries) {
      // 放回队列头部
      eventQueue.value.unshift(...eventsToUpload);
      
      setTimeout(() => {
        flushEvents(retryCount + 1);
      }, BATCH_CONFIG.retryDelay * (retryCount + 1));
    }
  } finally {
    isUploading.value = false;
  }
};

/**
 * 启动定时上报
 */
const startFlushTimer = () => {
  if (flushTimer) return;
  
  flushTimer = setInterval(() => {
    flushEvents();
  }, BATCH_CONFIG.flushInterval);
};

/**
 * 停止定时上报
 */
const stopFlushTimer = () => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
};


// ============ Composable 主函数 ============

/**
 * 行为追踪 Composable
 * 
 * @param {Object} [options] - 配置选项
 * @param {boolean} [options.autoFlush=true] - 是否自动定时上报
 * @param {boolean} [options.flushOnUnmount=true] - 组件卸载时是否上报
 * @returns {Object} 追踪器实例
 * 
 * @example
 * ```js
 * const { 
 *   trackRead, 
 *   trackSearch, 
 *   trackClick,
 *   trackGenerate,
 *   trackFeedback 
 * } = useBehaviorTracker();
 * 
 * // 追踪阅读行为
 * trackRead('doc_123', { scrollDepth: 0.8, focusAreas: ['abstract'] });
 * 
 * // 追踪搜索行为
 * trackSearch('machine learning', { resultsCount: 10 });
 * ```
 */
export function useBehaviorTracker(options = {}) {
  const {
    autoFlush = true,
    flushOnUnmount = true
  } = options;
  
  // 阅读追踪状态
  const readingState = ref({
    targetId: null,
    targetType: null,
    startTime: null,
    scrollDepth: 0,
    focusAreas: []
  });
  
  
  // ============ 追踪方法 ============
  
  /**
   * 追踪阅读行为
   * @param {string} targetId - 目标ID
   * @param {Object} [details] - 详细信息
   * @param {number} [details.scrollDepth] - 滚动深度（0-1）
   * @param {Array<string>} [details.focusAreas] - 关注区域
   * @param {string} [targetType='document'] - 目标类型
   */
  const trackRead = (targetId, details = {}, targetType = TARGET_TYPES.DOCUMENT) => {
    const duration = readingState.value.startTime 
      ? Date.now() - readingState.value.startTime 
      : details.duration || 0;
    
    // 只有达到最小阅读时间才记录
    if (duration < READ_CONFIG.minReadTime && !details.force) {
      return;
    }
    
    enqueueEvent({
      event_type: EVENT_TYPES.READ,
      target_type: targetType,
      target_id: targetId,
      duration: duration,
      intensity: details.scrollDepth || 0.5,
      payload: {
        scroll_depth: details.scrollDepth || readingState.value.scrollDepth,
        focus_areas: details.focusAreas || readingState.value.focusAreas,
        ...details
      }
    });
  };
  
  /**
   * 开始追踪阅读
   * @param {string} targetId - 目标ID
   * @param {string} [targetType='document'] - 目标类型
   */
  const startReadTracking = (targetId, targetType = TARGET_TYPES.DOCUMENT) => {
    readingState.value = {
      targetId,
      targetType,
      startTime: Date.now(),
      scrollDepth: 0,
      focusAreas: []
    };
  };
  
  /**
   * 更新阅读进度
   * @param {number} scrollDepth - 滚动深度（0-1）
   * @param {Array<string>} [focusAreas] - 关注区域
   */
  const updateReadProgress = (scrollDepth, focusAreas = null) => {
    if (!readingState.value.targetId) return;
    
    readingState.value.scrollDepth = Math.max(
      readingState.value.scrollDepth, 
      scrollDepth
    );
    
    if (focusAreas) {
      readingState.value.focusAreas = [
        ...new Set([...readingState.value.focusAreas, ...focusAreas])
      ];
    }
  };
  
  /**
   * 结束阅读追踪
   */
  const endReadTracking = () => {
    if (readingState.value.targetId) {
      trackRead(readingState.value.targetId, {
        scrollDepth: readingState.value.scrollDepth,
        focusAreas: readingState.value.focusAreas
      }, readingState.value.targetType);
    }
    
    readingState.value = {
      targetId: null,
      targetType: null,
      startTime: null,
      scrollDepth: 0,
      focusAreas: []
    };
  };
  
  /**
   * 追踪搜索行为
   * @param {string} query - 搜索查询
   * @param {Object} [details] - 详细信息
   * @param {number} [details.resultsCount] - 结果数量
   * @param {Array<string>} [details.filters] - 使用的过滤器
   */
  const trackSearch = (query, details = {}) => {
    enqueueEvent({
      event_type: EVENT_TYPES.SEARCH,
      target_type: TARGET_TYPES.TOPIC,
      target_id: null,
      duration: details.duration || 0,
      intensity: 1.0,
      payload: {
        query,
        results_count: details.resultsCount,
        filters: details.filters,
        ...details
      }
    });
  };
  
  /**
   * 追踪点击行为
   * @param {string} targetId - 目标ID
   * @param {string} targetType - 目标类型
   * @param {Object} [details] - 详细信息
   */
  const trackClick = (targetId, targetType, details = {}) => {
    enqueueEvent({
      event_type: EVENT_TYPES.CLICK,
      target_type: targetType,
      target_id: targetId,
      duration: 0,
      intensity: details.intensity || 1.0,
      payload: {
        action: details.action,
        position: details.position,
        context: details.context,
        ...details
      }
    });
  };
  
  /**
   * 追踪生成请求行为
   * @param {string} prompt - 生成提示词
   * @param {Object} [details] - 详细信息
   * @param {string} [details.outputId] - 生成输出ID
   * @param {string} [details.outputType] - 输出类型
   * @param {number} [details.tokensUsed] - 使用的token数
   */
  const trackGenerate = (prompt, details = {}) => {
    enqueueEvent({
      event_type: EVENT_TYPES.GENERATE,
      target_type: TARGET_TYPES.OUTPUT,
      target_id: details.outputId || null,
      duration: details.duration || 0,
      intensity: 1.0,
      payload: {
        prompt_preview: prompt.substring(0, 200),
        prompt_length: prompt.length,
        output_type: details.outputType,
        tokens_used: details.tokensUsed,
        ...details
      }
    });
  };
  
  /**
   * 追踪反馈行为
   * @param {string} targetId - 目标ID
   * @param {string} feedbackType - 反馈类型（like/dislike/report）
   * @param {Object} [details] - 详细信息
   */
  const trackFeedback = (targetId, feedbackType, details = {}) => {
    const intensityMap = {
      'like': 1.0,
      'dislike': -1.0,
      'report': -0.5
    };
    
    enqueueEvent({
      event_type: EVENT_TYPES.FEEDBACK,
      target_type: details.targetType || TARGET_TYPES.OUTPUT,
      target_id: targetId,
      duration: 0,
      intensity: intensityMap[feedbackType] || 0,
      payload: {
        feedback_type: feedbackType,
        reason: details.reason,
        comment: details.comment,
        ...details
      }
    });
  };
  
  /**
   * 追踪评分行为
   * @param {string} targetId - 目标ID
   * @param {number} rating - 评分（1-5）
   * @param {Object} [details] - 详细信息
   */
  const trackRate = (targetId, rating, details = {}) => {
    enqueueEvent({
      event_type: EVENT_TYPES.RATE,
      target_type: details.targetType || TARGET_TYPES.OUTPUT,
      target_id: targetId,
      duration: 0,
      intensity: rating / 5, // 归一化到 0-1
      payload: {
        rating,
        max_rating: 5,
        ...details
      }
    });
  };
  
  /**
   * 追踪上传行为
   * @param {string} documentId - 文档ID
   * @param {Object} [details] - 详细信息
   * @param {string} [details.filename] - 文件名
   * @param {number} [details.fileSize] - 文件大小
   * @param {string} [details.fileType] - 文件类型
   */
  const trackUpload = (documentId, details = {}) => {
    enqueueEvent({
      event_type: EVENT_TYPES.UPLOAD,
      target_type: TARGET_TYPES.DOCUMENT,
      target_id: documentId,
      duration: details.duration || 0,
      intensity: 1.0,
      payload: {
        filename: details.filename,
        file_size: details.fileSize,
        file_type: details.fileType,
        ...details
      }
    });
  };
  
  /**
   * 追踪编辑行为
   * @param {string} targetId - 目标ID
   * @param {string} editType - 编辑类型
   * @param {Object} [details] - 详细信息
   */
  const trackEdit = (targetId, editType, details = {}) => {
    enqueueEvent({
      event_type: EVENT_TYPES.EDIT,
      target_type: details.targetType || TARGET_TYPES.OUTPUT,
      target_id: targetId,
      duration: details.duration || 0,
      intensity: 0.8,
      payload: {
        edit_type: editType,
        changes_count: details.changesCount,
        ...details
      }
    });
  };
  
  /**
   * 追踪自定义事件
   * @param {string} eventType - 事件类型
   * @param {Object} eventData - 事件数据
   */
  const trackCustom = (eventType, eventData = {}) => {
    enqueueEvent({
      event_type: eventType,
      target_type: eventData.targetType || null,
      target_id: eventData.targetId || null,
      duration: eventData.duration || 0,
      intensity: eventData.intensity || 1.0,
      payload: eventData.payload || {}
    });
  };
  
  
  // ============ 生命周期管理 ============
  
  onMounted(() => {
    // 生成/恢复会话ID
    generateSessionId();
    
    // 启动自动上报
    if (autoFlush) {
      startFlushTimer();
    }
    
    // 页面关闭前上报
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 页面可见性变化时上报
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });
  
  onUnmounted(() => {
    // 结束阅读追踪
    endReadTracking();
    
    // 上报剩余事件
    if (flushOnUnmount) {
      flushEvents();
    }
    
    // 清理事件监听
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
  
  /**
   * 页面关闭前处理
   */
  const handleBeforeUnload = () => {
    // 同步上报（使用 sendBeacon）
    if (eventQueue.value.length > 0) {
      const cleanEvents = eventQueue.value.map(({ _queuedAt, ...rest }) => rest);
      const token = localStorage.getItem('token');
      const url = `${API_CONFIG.base.url}/api/v1/behavior/batch`;
      
      navigator.sendBeacon(url, JSON.stringify({
        events: cleanEvents,
        // Note: sendBeacon 不支持自定义 headers，需要后端支持其他认证方式
        // 或者在 payload 中包含 token
        _auth_token: token
      }));
    }
  };
  
  /**
   * 页面可见性变化处理
   */
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // 页面隐藏时上报
      flushEvents();
    }
  };
  
  
  // ============ 返回接口 ============
  
  return {
    // 状态
    eventQueue: computed(() => eventQueue.value),
    isUploading: computed(() => isUploading.value),
    stats: computed(() => stats.value),
    readingState: computed(() => readingState.value),
    
    // 会话管理
    getSessionId,
    generateSessionId,
    
    // 阅读追踪
    startReadTracking,
    updateReadProgress,
    endReadTracking,
    trackRead,
    
    // 行为追踪
    trackSearch,
    trackClick,
    trackGenerate,
    trackFeedback,
    trackRate,
    trackUpload,
    trackEdit,
    trackCustom,
    
    // 批量上报
    flushEvents,
    
    // 常量
    EVENT_TYPES,
    TARGET_TYPES
  };
}

export default useBehaviorTracker;
