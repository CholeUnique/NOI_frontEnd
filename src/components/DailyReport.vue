<template>
  <transition name="holo-pop">
    <div v-if="visible" class="report-panel-container glass-panel">
      
      <div class="panel-header" @click="emit('close')">
        <div class="header-left">
          <span class="icon-pulse">
            <el-icon><Calendar /></el-icon>
          </span>
          <span class="header-title">DAILY INSIGHTS</span>
          <span class="header-time">{{ todayDate }}</span>
        </div>
        
        <div class="header-actions">
           <button class="close-btn" @click.stop="emit('close')">×</button>
        </div>
      </div>

      <div class="panel-body custom-scrollbar">
        
        <div class="section-block">
          <div class="section-title">
            <el-icon><ReadingLamp /></el-icon>
            <span>EXTERNAL INTELLIGENCE</span>
          </div>

          <div v-if="loadingPapers" class="loading-state">
            <div class="scanner-bar"></div>
            <span>SCANNING ARXIV...</span>
          </div>
          
          <div v-else class="card-list">
            <div v-for="paper in recommendedPapers" :key="paper.id" class="glass-card paper-card">
              <div class="card-decoration"></div>
              <a :href="paper.link" target="_blank" class="card-link">
                <div class="paper-title">{{ paper.title }}</div>
                <div class="external-icon">↗</div>
              </a>
              
              <div class="paper-abstract">
                {{ paper.abstract }}
              </div>
              
              <div class="card-meta">
                <span class="meta-tag source-tag">{{ paper.source }}</span>
                <span class="meta-date">{{ paper.publishDate }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="divider-line"></div>

        <div class="section-block">
          <div class="section-title">
            <el-icon><DocumentCopy /></el-icon>
            <span>INTERNAL DATABASE MATCHES</span>
          </div>

          <div v-if="loadingInternalDocs" class="loading-state">
            <span>SYNCING...</span>
          </div>

          <div v-else class="card-list">
             <div 
               v-for="doc in relatedInternalDocs" 
               :key="doc.id" 
               class="glass-card doc-card" 
               @click="handleDocClick(doc.id, doc.title)"
             >
                <div class="doc-header">
                  <span class="doc-icon">📄</span>
                  <span class="doc-title">{{ doc.title }}</span>
                </div>
                <div class="doc-summary">{{ doc.summary }}</div>
                <div class="doc-footer">
                  <span class="liquid-pill">{{ doc.topic }}</span>
                  <span class="read-btn">READ FILE</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElIcon } from 'element-plus';
import { Calendar, ReadingLamp, DocumentCopy } from '@element-plus/icons-vue';

// 接收父组件控制
const props = defineProps({
  visible: Boolean
});

const emit = defineEmits(['close', 'open-doc']);

const todayDate = computed(() => {
  const today = new Date();
  return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
});

// --- Mock Data Logic (保留你原有的逻辑，稍作精简) ---
const loadingPapers = ref(true);
const recommendedPapers = ref([]);
const loadingInternalDocs = ref(true);
const relatedInternalDocs = ref([]);

const fetchData = async () => {
  loadingPapers.value = true;
  loadingInternalDocs.value = true;

  // 模拟 API
  setTimeout(() => {
    recommendedPapers.value = [
      { id: 'p1', title: 'Attention Is All You Need', abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...', source: 'arXiv', link: '#', publishDate: '2017.06' },
      { id: 'p2', title: 'BERT: Pre-training of Deep Bidirectional Transformers', abstract: 'We introduce a new language representation model called BERT...', source: 'arXiv', link: '#', publishDate: '2018.10' },
    ];
    loadingPapers.value = false;
  }, 1000);

  setTimeout(() => {
    relatedInternalDocs.value = [
      { id: 'd1', title: 'NLP基础教程总结', summary: '本文档总结了NLP领域的核心概念，包括分词、词性标注、BERT等。', topic: 'NLP' },
      { id: 'd2', title: 'Transformer模型详解', summary: '深入解析自注意力机制（Self-Attention）与位置编码。', topic: 'Deep Learning' },
    ];
    loadingInternalDocs.value = false;
  }, 1500);
};

const handleDocClick = (id, title) => {
  emit('open-doc', { id, title });
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
/* =========================================
   全局容器与动画
========================================= */
.report-panel-container {
  /* 定位：悬浮在右下角，稍微靠上一点，盖住 NotificationHub 的位置 */
  position: fixed;
  bottom: 100px; 
  right: 30px;
  width: 350px;
  height: 550px;
  z-index: 10000;
  
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  /* 玻璃质感继承 */
  background: rgba(10, 20, 30, 0.9);
  backdrop-filter: blur(25px);
  border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 247, 255, 0.1);
  border-radius: 16px;
}

/* 进场动画：从右下角弹入 */
.holo-pop-enter-active, .holo-pop-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.holo-pop-enter-from, .holo-pop-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
  filter: blur(10px);
}

/* =========================================
   Header Style
========================================= */
.panel-header {
  padding: 8px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(90deg, rgba(0, 247, 255, 0.05), transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.header-left { display: flex; align-items: center; gap: 10px; }
.icon-pulse { color: var(--accent-cyan, #0ff); animation: pulse 2s infinite; }
.header-title { font-family:  sans-serif; font-weight: bold; color: #fff; letter-spacing: 1px; font-size: 13px; }
.header-time { font-family:  sans-serif; font-weight: bold; color: #34ddfb; letter-spacing: 1px; font-size: 10px;margin-left:50px; }

.header-actions { display: flex; align-items: center; gap: 10px; }
.close-hint { font-size: 9px; color: rgba(255,255,255,0.3); font-weight: bold; }
.close-btn {
  background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; opacity: 0.7;margin-top:2px;
}
.close-btn:hover { opacity: 1; color: var(--accent-pink, #0eabdf); }

/* =========================================
   Body Content
========================================= */
.panel-body {
  flex: 1;
  padding: 15px 20px;
  overflow-y: auto;
}

.section-block { margin-bottom:10px; }
.section-title {
  display: flex; align-items: center; gap: 8px;
  color: var(--accent-cyan, #0ff);
  font-size: 11px; font-weight: bold; letter-spacing: 1px;
  margin-bottom: 15px; opacity: 0.8;
}

.divider-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  margin: 0px 0 10px 0;
}

/* =========================================
   Cards: 论文卡片
========================================= */
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--accent-cyan, #0ff);
  transform: translateX(4px);
  box-shadow: -4px 4px 15px rgba(0,0,0,0.3);
}

.paper-card .card-decoration {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--accent-cyan, #0ff);
  opacity: 0; transition: 0.2s;
}
.paper-card:hover .card-decoration { opacity: 1; }

.card-link { text-decoration: none; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
.paper-title { color: #fff; font-size: 14px; font-weight: 600; line-height: 1.4; }
.external-icon { font-size: 10px; color: var(--accent-cyan, #0ff); opacity: 0; transform: translate(-5px, 5px); transition: 0.2s; }
.paper-card:hover .external-icon { opacity: 1; transform: translate(0,0); }

.paper-abstract {
  font-size: 12px; color: #8899aa; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-bottom: 10px;
}

.card-meta { display: flex; justify-content: space-between; font-size: 10px; color: #556677; }
.source-tag { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #ccc; }

/* =========================================
   Cards: 内部文档
========================================= */
.doc-card { cursor: pointer; }
.doc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.doc-title { color: #e0faff; font-weight: 600; font-size: 13px; }
.doc-summary { font-size: 11px; color: #667788; margin-bottom: 10px; }
.doc-footer { display: flex; justify-content: space-between; align-items: center; }

.liquid-pill {
  font-size: 10px; padding: 2px 8px; border-radius: 10px;
  background: rgba(0, 247, 255, 0.1); color: var(--accent-cyan, #0ff);
  border: 1px solid rgba(0, 247, 255, 0.2);
}
.read-btn {
  font-size: 10px; font-weight: bold; color: #fff; opacity: 0.5; transition: 0.2s;
}
.doc-card:hover .read-btn { opacity: 1; color: var(--accent-cyan, #0ff); }

/* =========================================
   Loading State
========================================= */
.loading-state {
  text-align: center; color: var(--accent-cyan, #0ff); padding: 20px;
  font-size: 12px; letter-spacing: 1px;
}
.scanner-bar {
  height: 2px; width: 50%; background: var(--accent-cyan, #0ff);
  margin: 0 auto 10px auto;
  box-shadow: 0 0 10px var(--accent-cyan, #0ff);
  animation: scan 1s infinite alternate;
}
@keyframes scan { from { width: 10%; opacity: 0.5; } to { width: 80%; opacity: 1; } }
@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

/* 滚动条美化 */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
</style>