import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useArticleStore = defineStore('article', () => {
  const currentArticle = ref(null);
  const mindMapData = ref(null);

  const setArticle = (data) => {
    currentArticle.value = data;
    // 如果后端返回了 mind_map_json，就存下来
    if (data.mind_map_json) {
      mindMapData.value = data.mind_map_json;
    } else {
      mindMapData.value = null;
    }
  };

  const clearArticle = () => {
    currentArticle.value = null;
    mindMapData.value = null;
  };

  return {
    currentArticle,
    mindMapData,
    setArticle,
    clearArticle
  };
});
