import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // 🔥🔥🔥 请添加以下 server 配置 🔥🔥🔥
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173,      // 前端端口（默认）
    proxy: {
      // 匹配所有以 /api 开头的请求
      '/api': {
        target: 'http://127.0.0.1:8000', // 👈 这里写你 Python 后端的地址和端口
        changeOrigin: true,
        // 如果后端不需要 /api 前缀，可以用 rewrite 去掉，但你的后端路由有 /api，所以不需要 rewrite
        // rewrite: (path) => path.replace(/^\/api/, '') 
      }
    }
  }
})
