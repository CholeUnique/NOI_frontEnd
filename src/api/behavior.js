/**
 * 行为追踪 API 调用层
 * 
 * 提供与后端行为追踪接口的交互功能
 * 支持单个事件追踪、批量追踪、事件查询和图谱统计
 */
import axios from 'axios';
import { API_CONFIG } from '../config/api';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: `${API_CONFIG.base.url}/api/v1/behavior`,
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

// ============ 事件类型常量 ============

/**
 * 支持的事件类型
 */
export const EVENT_TYPES = {
  UPLOAD: 'upload',      // 上传文档
  SEARCH: 'search',      // 搜索查询
  READ: 'read',          // 阅读文档
  GENERATE: 'generate',  // 请求生成内容
  EDIT: 'edit',          // 编辑内容
  RATE: 'rate',          // 评分
  FEEDBACK: 'feedback',  // 反馈
  CLICK: 'click'         // 点击交互
};

/**
 * 支持的目标类型
 */
export const TARGET_TYPES = {
  DOCUMENT: 'document',        // 文档
  CHUNK: 'chunk',              // 文档片段
  ENTITY: 'entity',            // 知识实体
  IMAGE_ANCHOR: 'image_anchor', // 图像锚点
  OUTPUT: 'output',            // 生成输出
  TOPIC: 'topic'               // 主题标签
};


// ============ 事件采集 API ============

/**
 * 追踪单个行为事件
 * @param {Object} eventData - 事件数据
 * @param {string} eventData.event_type - 事件类型（必填）
 * @param {string} [eventData.session_id] - 会话ID
 * @param {string} [eventData.target_type] - 目标类型
 * @param {string} [eventData.target_id] - 目标ID
 * @param {number} [eventData.duration] - 持续时长（毫秒）
 * @param {number} [eventData.intensity] - 交互强度（0-1）
 * @param {Object} [eventData.payload] - 事件详细数据
 * @returns {Promise} - 返回创建的事件
 */
export const trackBehaviorEvent = async (eventData) => {
  const response = await apiClient.post('/track', eventData);
  return response.data;
};

/**
 * 批量追踪行为事件
 * @param {Array<Object>} events - 事件数据列表（最多100条）
 * @returns {Promise} - 返回批量创建结果
 */
export const trackBehaviorEventsBatch = async (events) => {
  const response = await apiClient.post('/batch', { events });
  return response.data;
};


// ============ 事件查询 API ============

/**
 * 获取行为事件列表
 * @param {Object} [params] - 查询参数
 * @param {string} [params.event_type] - 事件类型过滤
 * @param {string} [params.target_type] - 目标类型过滤
 * @param {string} [params.session_id] - 会话ID过滤
 * @param {number} [params.limit=50] - 返回数量限制
 * @param {number} [params.offset=0] - 偏移量
 * @returns {Promise} - 返回事件列表
 */
export const getBehaviorEvents = async (params = {}) => {
  const response = await apiClient.get('/events', { params });
  return response.data;
};

/**
 * 获取单个行为事件详情
 * @param {string} eventId - 事件ID
 * @returns {Promise} - 返回事件详情
 */
export const getBehaviorEvent = async (eventId) => {
  const response = await apiClient.get(`/events/${eventId}`);
  return response.data;
};

/**
 * 获取事件的所有部件
 * @param {string} eventId - 事件ID
 * @returns {Promise} - 返回部件列表
 */
export const getEventParts = async (eventId) => {
  const response = await apiClient.get(`/events/${eventId}/parts`);
  return response.data;
};

/**
 * 为事件添加部件
 * @param {string} eventId - 事件ID
 * @param {Object} partData - 部件数据
 * @param {string} partData.part_type - 部件类型
 * @param {string} [partData.content] - 部件内容
 * @param {Object} [partData.state] - 部件状态
 * @param {number} [partData.sequence] - 排序序号
 * @returns {Promise} - 返回创建的部件
 */
export const addEventPart = async (eventId, partData) => {
  const response = await apiClient.post(`/events/${eventId}/parts`, partData);
  return response.data;
};


// ============ 图谱查询 API ============

/**
 * 获取用户行为图谱的统计信息
 * @returns {Promise} - 返回图谱统计数据
 */
export const getGraphStats = async () => {
  const response = await apiClient.get('/graph/stats');
  return response.data;
};

/**
 * 获取用户的事件节点
 * @param {number} [limit=50] - 返回数量限制
 * @returns {Promise} - 返回事件节点列表
 */
export const getEventNodes = async (limit = 50) => {
  const response = await apiClient.get('/graph/event-nodes', { 
    params: { limit } 
  });
  return response.data;
};

/**
 * 获取用户的对象节点
 * @param {number} [limit=50] - 返回数量限制
 * @returns {Promise} - 返回对象节点列表
 */
export const getObjectNodes = async (limit = 50) => {
  const response = await apiClient.get('/graph/object-nodes', { 
    params: { limit } 
  });
  return response.data;
};

/**
 * 获取支持的事件类型列表
 * @returns {Promise} - 返回事件类型和目标类型定义
 */
export const getEventTypesFromServer = async () => {
  const response = await apiClient.get('/event-types');
  return response.data;
};


// ============ 导出默认对象 ============

export default {
  // 常量
  EVENT_TYPES,
  TARGET_TYPES,
  
  // 事件采集
  trackBehaviorEvent,
  trackBehaviorEventsBatch,
  
  // 事件查询
  getBehaviorEvents,
  getBehaviorEvent,
  getEventParts,
  addEventPart,
  
  // 图谱查询
  getGraphStats,
  getEventNodes,
  getObjectNodes,
  getEventTypesFromServer
};
