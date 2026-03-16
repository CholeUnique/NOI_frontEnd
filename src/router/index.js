import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/login.vue')
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/login.vue') // 使用同一个组件
    },
    {
      path: '/main',
      name: 'Main',
      component: () => import('../views/MainLayout.vue'),
      redirect: { name: 'Universe' },
      meta: { requiresAuth: true }, // 将权限校验提到父级
      // ★ 子路由配置
      children: [
        {
          // 访问 /main/universe
          path: '/universe',
          name: 'Universe',
          component: () => import('../components/KnowledgeUniverse.vue')
        },
        {
          // 访问 /main/archives
          path: '/archives',
          name: 'Archives',
          component: () => import('../components/ArchivesVault.vue')
        },
        {
          // 访问 /main/constellation
          path: '/constellation',
          name: 'Constellation',
          component: () => import('../components/Constellation.vue')
        },
        {
          // 访问 /main/settings
          path: '/settings',
          name: 'Settings',
          component: () => import('../views/settings/SettingsView.vue')
        },
        {
          // 访问 /main/constellation
          path: '/article/:id',
          name: 'ArticleDetail',
          component: () => import('../components/ArticleDetail.vue')
        }
      ]
    },
  ]
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 1. **在每次路由跳转前，检查并等待初始化完成**
  if (!authStore.isInitialized) {
    // 如果尚未初始化，则执行初始化，并等待其完成
    // 注意：Pinia store 是单例的，initialize 只会执行一次
    await authStore.initialize();
  }

  // 2. **执行认证检查**
  // 此时 authStore.isAuthenticated 已经是最新状态
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if ((to.name === 'Login' || to.name === 'Register') && authStore.isAuthenticated) {
    // 如果用户已登录，并且试图访问登录/注册页面，则重定向到主页
    next({ name: 'Main' });
  } else {
    // 其他情况放行
    next();
  }
})



export default router;