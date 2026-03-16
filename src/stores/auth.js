import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import authAPI from '../api/auth'



export const useAuthStore = defineStore('auth', () => {
  // 状态
  const isInitialized = ref(false);
  const isAuthenticated = ref(false)
  const token = ref(null)
  const userInfo = ref(null)

  const isLoading = ref(false);
  const error = ref(null);

  const getError = computed(() => error.value);
  const getIsLoading = computed(() => isLoading.value);

  const clearError = () => { error.value = null; }; 
  const setError = (message) => { error.value = message; }; 
  const setLoading = (loading) => { isLoading.value = loading; }; 
  
  // 错误处理函数
  const handleAuthError = (error) => {
    if (error.response) {
      // 服务器返回了错误状态码
      return error.response.data.message || error.response.statusText || '认证请求失败';
    } else if (error.request) {
      // 请求已发送但没有收到响应
      return '服务器无响应，请检查网络连接';
    } else {
      // 请求配置出错
      return error.message || '认证请求失败';
    }
  };
   
  // Getters 
  const getUser = computed(() => userInfo.value)

  // 登录方法
  const login = async (credentials) => {
    try {
      setLoading(true);
      clearError();

      // const { username, password } = credentials;
      const response = await authAPI.login(credentials)

      if (response) {
        token.value = response.access_token
        userInfo.value = response.user
        isAuthenticated.value = true

        // 保存token到localStorage
        localStorage.setItem('token', token.value)
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))

        return { success: true, data: response.data };
      }else {
            setError(response.message || '登录失败');
            return { success: false, error: response.message || '登录失败' };
      }
    } catch (error) {
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
      console.error('登录错误:', error)
      return { success: false, error: errorMessage }
    } finally {
        setLoading(false);
    }
  }

  // 注册方法
  const register = async (userData) => {
    try {
      setLoading(true);
      clearError();

      const response = await authAPI.register(userData)

      if (response.id || response.username) {
          return { success: true, data: response.data };
      } else {
          setError(response.message || '注册失败');
          return { success: false, error: response.message || '注册失败' };
      }
    } catch (error) {
      const errorMessage = handleAuthError(error);
        setError(errorMessage);
        console.error('注册错误:', error);
        return { success: false, error: errorMessage };
    } finally {
        setLoading(false);
    }
  }

  // 登出方法
  const logout = () => {
    token.value = null
    userInfo.value = null
    isAuthenticated.value = false

    // 清除localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  // 验证令牌
  const verifyToken = async () => {
    try {
      // 从localStorage恢复token
      const storedToken = localStorage.getItem('token')
      const storedUserInfo = localStorage.getItem('userInfo')

      if (!storedToken || !storedUserInfo) {
          return false;
      }
      
      // 尝试验证token有效性
      const response = await authAPI.verifyToken(storedToken);
      // 后端返回valid和user信息
      if (response.valid) {
          token.value = storedToken;
          userInfo.value = JSON.parse(storedUserInfo);
          isAuthenticated.value = true;
          return true;
      } else {
          // token无效，清除本地存储
          logout();
          return false;
      }
    } catch (error) {
        console.error('验证令牌错误:', error);
        logout();
        return false;
    }
  }

  // 初始化时尝试从localStorage恢复认证状态
  const initialize = async () => {
  
    const storedToken = localStorage.getItem('token')
    const storedUserInfo = localStorage.getItem('userInfo')
  
    if (storedToken && storedUserInfo) {
      token.value = storedToken
      userInfo.value = JSON.parse(storedUserInfo)
      // 验证token有效性
      await verifyToken();
    }
    isInitialized.value = true;
  }

  return {
    // 状态
    isInitialized,
    isAuthenticated,
    token,
    userInfo,
    isLoading,
    error,

    // Getters
    getUser,
    getError,
    getIsLoading,

    //方法
    login,
    register,
    logout,
    verifyToken,
    initialize,
    clearError,
    setError,
    setLoading
  }
})