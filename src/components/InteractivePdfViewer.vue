<template>
  <div class="pdf-scroll-container custom-scrollbar">
    
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>正在渲染文档...</p>
    </div>

    <VuePdfEmbed
      ref="pdfRef"
      class="pdf-document"
      :source="url"
      :text-layer="true"
      :annotation-layer="true"
      @loaded="handleLoaded"
      @loading-failed="handleError"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import VuePdfEmbed from 'vue-pdf-embed';

// ❌ 不要再引用那个报错的 CSS 了
// ✅ 我们在下面的 <style> 里手动补全它

const props = defineProps({
  url: { type: String, required: true }
});

const isLoading = ref(true);
const pdfRef = ref(null);

const handleLoaded = () => {
  console.log("PDF 渲染完毕");
  isLoading.value = false;
};

const handleError = (e) => {
  console.error("PDF 加载失败:", e);
  isLoading.value = false;
};

// 监听 URL 变化，重置 loading
watch(() => props.url, () => {
  isLoading.value = true;
});
</script>

<style scoped>
/* --- 1. 布局适配 --- */
.pdf-scroll-container {
  /* 适配父组件 .content-body (flex-direction: column) */
  flex: 1; 
  width: 100%;
  
  /* 内部滚动 */
  overflow-y: auto;
  overflow-x: hidden;
  
  /* 视觉样式 */
  position: relative;
  display: flex;
  justify-content: center; /* PDF 居中 */
  padding: 40px 0; /* 上下留白 */
}

/* PDF 文档本体样式 */
.pdf-document {
  /* 限制最大宽度，防止在大屏上太宽难看，类似 Notion/豆包 */
  width: 90%; 
  max-width: 900px; 
  
  box-shadow: 0 4px 20px rgba(0,0,0,0.3); /* 阴影增加立体感 */
  background-color: white;
}

/* --- 2. 加载动画 --- */
.loading-state {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: rgba(255,255,255,0.7);
  z-index: 10;
}
.spinner {
  width: 30px; height: 30px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: #00f7ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* --- 3. 核心修复：手动添加 TextLayer 样式 --- */
/* 这就是那个报错文件里缺失的内容。
   手动写在这里，能保证文字层绝对对齐且透明。
*/

/* 必须声明：让 PDF 容器成为定位基准 */
:deep(.vue-pdf-embed__page) {
  position: relative;
  margin-bottom: 20px; /* 页间距 */
}

/* 隐藏 Canvas 之上的文字，但保留选中能力 */
:deep(.textLayer) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  line-height: 1.0;
  opacity: 1;
  mix-blend-mode: multiply; /* 混合模式，防止覆盖颜色 */
}

:deep(.textLayer span) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

/* 选中后的高亮颜色 - 豆包蓝风格 */
:deep(.textLayer ::selection) {
  background: rgba(0, 102, 204, 0.4);
  color: transparent;
}
</style>