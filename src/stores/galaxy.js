import { defineStore } from 'pinia';
import { API_CONFIG } from '../config/api';

// 预定义的颜色池，用于给不同的 category 分配颜色
const COLOR_POOL = [
  '#ff00cc', '#a020f0', '#8800ff', '#00bfff', '#aa00ff', 
  '#ff6030', '#00ff88', '#ff3366', '#33ccff', '#ffcc00'
];

const API_V1_BASE = `${API_CONFIG.base.url}/api/v1`;

export const useGalaxyStore = defineStore('galaxy', {
  state: () => ({
    categories: [],
    isLoading: false,
    lastFetchTime: null
  }),
  
  actions: {
    /**
     * 从后端获取星球数据（categories）
     * @param {string} token - 用户的 JWT token
     * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
     */
    async fetchCategories(token, forceRefresh = false) {
      // 如果 5 秒内已获取过且不强制刷新，跳过
      if (!forceRefresh && this.lastFetchTime && Date.now() - this.lastFetchTime < 5000) {
        return;
      }
      
      this.isLoading = true;
      try {
        const response = await fetch(`${API_V1_BASE}/galaxy/data`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const result = await response.json();
        console.log('获取星球数据结果:', result);
        if (result.code === 200 && result.data?.nodes) {
          // 将后端数据转换为前端需要的格式
          this.categories = result.data.nodes.map((node, index) => {
            // 后端 symbolSize 范围是 40-150，映射到 Three.js 需要的 0.8-2.5
            // 公式：(symbolSize - 40) / (150 - 40) * (2.5 - 0.8) + 0.8
            const backendSize = node.symbolSize || 40;
            const threeJsSize = ((backendSize - 40) / 110) * 1.7 + 0.8;
            
            return {
              id: index + 1,
              name: node.name,
              count: node.value || 0,
              color: COLOR_POOL[index % COLOR_POOL.length],
              // 使用后端计算的大小，映射到 Three.js 范围
              size: Math.min(2.5, Math.max(0.8, threeJsSize))
            };
          });
          console.log('转换后的星球分类数据:', this.categories);
          this.lastFetchTime = Date.now();
        }
      } catch (error) {
        console.error('获取星球数据失败:', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    /**
     * 强制刷新星球数据（上传新文件后调用）
     */
    async refreshCategories(token) {
      await this.fetchCategories(token, true);
    },
    
    /**
     * 获取指定 Category 下的星座数据（tags、articles 和 links）
     * @param {string} token - 用户的 JWT token
     * @param {string} categoryName - 分类名称
     * @returns {Object} 星座数据，包含去重的 articles 和 tag-article 关系
     */
    async fetchConstellationData(token, categoryName) {
      try {
        const response = await fetch(
          `${API_V1_BASE}/constellation/data?category=${encodeURIComponent(categoryName)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
          // 返回处理后的数据（新结构：去重的文章 + 连接关系）
          return {
            category: result.data.category,
            totalArticles: result.data.total_articles,
            // 标签列表（星座）
            tags: result.data.tags.map(tag => ({
              name: tag.name,
              type: 'tag',
              count: tag.count
            })),
            // 去重后的文章列表
            articles: result.data.articles.map(art => ({
              id: art.id,
              name: art.name,
              type: 'article',
              summary: art.summary,
              created_at: art.created_at, // 添加创建时间
              tags: art.tags  // 该文章关联的所有标签
            })),
            // 标签-文章关系（用于绘制连线）
            links: result.data.links
          };
        }
        
        return null;
      } catch (error) {
        console.error('获取星座数据失败:', error);
        return null;
      }
    }
  },
  
  getters: {
    // 根据分类名称获取该分类的颜色
    getCategoryColor: (state) => (categoryName) => {
      return state.categories.find(c => c.name === categoryName)?.color || '#00ffff';
    }
  }
});
