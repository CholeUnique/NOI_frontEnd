/**
 * API配置工具
 * 统一管理所有API相关的环境变量配置
 */

// 基础API配置
export const API_CONFIG = {
  // 认证相关API
  auth: {
    baseURL: import.meta.env.VITE_API_AUTH_URL || 'http://localhost:8000/api/auth',
    timeout: 10000, // 10秒超时
  },
  
  // 基础API地址
  base: {
    url: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 15000, // 15秒超时
  },
  
  // 应用配置
  app: {
    title: import.meta.env.VITE_APP_TITLE || 'Knowledge Universe',
    environment: import.meta.env.MODE || 'development',
    isDevelopment: import.meta.env.DEV || false,
    isProduction: import.meta.env.PROD || false,
  }
};

// 导出常用的环境变量
export const ENV = {
  API_BASE_URL: API_CONFIG.base.url,
  API_AUTH_URL: API_CONFIG.auth.baseURL,
  APP_TITLE: API_CONFIG.app.title,
  ENVIRONMENT: API_CONFIG.app.environment,
};

// 调试工具
export const debugConfig = () => {
  console.group('🔧 API Configuration');
  console.log('Base URL:', API_CONFIG.base.url);
  console.log('Auth URL:', API_CONFIG.auth.baseURL);
  console.log('Environment:', API_CONFIG.app.environment);
  console.log('Is Development:', API_CONFIG.app.isDevelopment);
  console.log('Is Production:', API_CONFIG.app.isProduction);
  console.groupEnd();
};

// 开发环境下自动输出配置
if (API_CONFIG.app.isDevelopment) {
  debugConfig();
}