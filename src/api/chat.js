import axios from 'axios';
import { API_CONFIG } from '../config/api';

export const truncateSessionMessages = async (sessionId, targetContent) => {
  return apiClient.delete(`/chat/sessions/${sessionId}/messages/truncate`, {
    params: { target_message_content: targetContent }
  });
};
const apiClient = axios.create({
  baseURL: `${API_CONFIG.base.url}/api/v1`,
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

/**
 * 发送聊天消息（非流式）
 * @param {string} question - 用户问题
 * @param {string} sessionId - 必填：会话ID
 * @returns {Promise} - 返回聊天响应
 */
export const sendChatMessage = async (question, sessionId) => {
  const payload = {
    question,
    session_id: sessionId,
    stream: false
  };
  
  return apiClient.post('/chat/completions', payload);
};

/**
 * 发送聊天消息（流式）
 * @param {string} question - 用户问题
 * @param {string} sessionId - 必填：会话ID
 * @param {Function} onMessage - 接收消息回调函数
 * @param {Function} onError - 错误回调函数
 * @param {Function} onComplete - 完成回调函数
 */
export const sendChatMessageStream = async (
  question,
  sessionId,
  onMessage,
  onError,
  onComplete
) => {
  const token = localStorage.getItem('token');
  const url = `${API_CONFIG.base.url}/api/v1/chat/completions`;
  
  const payload = {
    question,
    session_id: sessionId,
    stream: true
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (onComplete) onComplete();
        break;
      }
      
      // 解码数据
      buffer += decoder.decode(value, { stream: true });
      
      // 按行分割
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        // 处理 SSE 格式: "data: {json}"
        if (line.startsWith('data:')) {
          const dataStr = line.substring(5).trim();
          
          // 跳过空数据或结束标记
          if (dataStr === '' || dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            
            // 检查是否有错误
            if (data.error) {
              if (onError) onError(data.error);
              continue;
            }
            
            // 检查是否是结束标记
            if (data.data === true && data.code === 0) {
              if (onComplete) onComplete();
              continue;
            }
            
            // 调用消息回调
            if (onMessage) {
              onMessage(data);
            }
          } catch (parseError) {
            console.error('解析 JSON 失败:', dataStr, parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('流式请求错误:', error);
    if (onError) onError(error.message || '网络错误');
  }
};

/**
 * 获取聊天会话列表（分页）
 * @param {number} page - 页码，从1开始，默认为1
 * @param {number} limit - 每页数量，默认为10
 * @returns {Promise} - 返回会话列表
 */
export const getChatSessions = (page = 1, limit = 10) => {
  return apiClient.get('/chat/sessions', {
    params: { page, limit }
  });
};

/**
 * 创建新的聊天会话
 * @param {string} name - 会话名称，默认为 "New Chat"
 * @returns {Promise} - 返回新会话信息
 */
export const createChatSession = (name = 'New Chat') => {
  return apiClient.post('/chat/sessions', { name });
};

/**
 * 删除聊天会话
 * @param {string} sessionId - 会话ID
 * @returns {Promise}
 */
export const deleteChatSession = (sessionId) => {
  return apiClient.delete(`/chat/sessions/${sessionId}`);
};

/**
 * 更新聊天会话名称
 * @param {string} sessionId - 会话ID
 * @param {string} name - 新的会话名称
 * @returns {Promise}
 */
export const updateChatSessionName = (sessionId, name) => {
  return apiClient.patch(`/chat/sessions/${sessionId}`, { name });
};

/**
 * 获取会话的聊天历史记录
 * @param {string} sessionId - 会话ID
 * @returns {Promise} - 返回消息历史
 */
export const getChatHistory = (sessionId) => {
  return apiClient.get(`/chat/sessions/${sessionId}/history`);
};

/**
 * 使用 SessionLoop 引擎发送聊天消息（流式）
 * @param {string} question - 用户问题
 * @param {string} sessionId - 必填：会话ID
 * @param {Object} options - 配置选项
 * @param {Function} onMessage - 接收消息回调函数
 * @param {Function} onError - 错误回调函数
 * @param {Function} onComplete - 完成回调函数
 */
export const sendSessionChat = async (
  question,
  sessionId,
  options = {},
  onMessage,
  onError,
  onComplete
) => {
  const token = localStorage.getItem('token');
  const url = `${API_CONFIG.base.url}/api/v1/session/chat`;
  
  const payload = {
    question,
    session_id: sessionId,
    stream: true,
    enable_tools: options.enableTools ?? true,
    enable_context_injection: options.enableContextInjection ?? true,
    max_iterations: options.maxIterations ?? 10,
    temperature: options.temperature ?? 0.7
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (onComplete) onComplete();
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        if (line.startsWith('data:')) {
          const dataStr = line.substring(5).trim();
          
          if (dataStr === '' || dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            
            if (data.type === 'error') {
              if (onError) onError(data.data?.error || 'Unknown error');
              continue;
            }
            
            if (data.type === 'stream_complete') {
              if (onComplete) onComplete(data.data);
              continue;
            }
            
            if (onMessage) {
              onMessage(data);
            }
          } catch (parseError) {
            console.error('解析 SessionLoop JSON 失败:', dataStr, parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('SessionLoop 流式请求错误:', error);
    if (onError) onError(error.message || '网络错误');
  }
};
