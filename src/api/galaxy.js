import axios from 'axios';
import { API_CONFIG } from '../config/api';

// 创建 axios 实例（如果你项目里有统一的 request.js 封装，请直接使用那个）
const apiClient = axios.create({
  baseURL: `${API_CONFIG.base.url}/api/v1`,
  timeout: API_CONFIG.base.timeout
});

// 请求拦截器：自动附加 Token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token'); // 假设你的 token 存在 localStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 获取星系数据
export const fetchGalaxyData = () => {
  return apiClient.get('/galaxy/data');
};