import axios from 'axios';
import { API_CONFIG } from '../config/api.js';

// 创建 axios 实例（可选，但推荐）
const apiClient = axios.create({
  baseURL: API_CONFIG.auth.baseURL,
  timeout: API_CONFIG.auth.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default {
  /**
   * 用户登录
   * @param {object} credentials - {username, password}
   */
  async login(credentials) {
    // axios.post 返回的是 Response 对象，我们需要返回 .data 给 Store
    const response = await apiClient.post('/login', credentials);
    return response.data;
    
  },

  /**
   * 用户注册
   * @param {object} userData - {username, email, password, full_name}
   */
  async register(userData) {
    // 直接发送，后端负责验证和哈希
    const response = await apiClient.post('/register', userData);
    return response.data;
  },

  /**
   * 获取当前用户信息
   * @param {string} token 
   */
  async getCurrentUser(token) {
    const response = await apiClient.get('/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * 验证令牌
   * @param {string} token 
   */
  async verifyToken(token) {
    const response = await apiClient.get('/verify-token', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * 更新用户信息
   * @param {string} token 
   * @param {object} updateData 
   */
  async updateCurrentUser(token, updateData) {
    const response = await apiClient.put('/me', updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * 用户登出
   * @param {string} token 
   */
  async logout(token) {
    const response = await apiClient.post('/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};