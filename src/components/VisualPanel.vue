<template>
  <div class="visual-panel-container" ref="container">
    <canvas ref="canvas" class="bg-canvas"></canvas>

    <div class="ui-layer">
      <div class="tech-tabs">
        <div 
          v-for="(tab, index) in tabs" 
          :key="index"
          class="tab-item"
          :class="{ active: currentTab === index }"
          @click="switchTab(index)"
        >
          <span class="tab-marker">►</span> {{ tab }}
        </div>
      </div>

      <div class="content-viewport">
        
        <!-- 知识图谱 -->
        <transition name="fade" mode="out-in">
          <div v-if="currentTab === 0" class="tab-pane graph-pane">
            <div class="galaxy-container">
              <div class="planet sun">
                <div class="planet-label">CORE: AI</div>
              </div>
              <div class="orbit orbit-1">
                <div class="planet earth">
                  <div class="planet-label">Vue3</div>
                </div>
              </div>
              <div class="orbit orbit-2">
                <div class="planet mars">
                  <div class="planet-label">WebGL</div>
                </div>
              </div>
              <div class="orbit orbit-3">
                <div class="planet jupiter">
                  <div class="planet-label">Node.js</div>
                </div>
              </div>
            </div>
            <div class="graph-info">
              <p>SYSTEM STATUS: ONLINE</p>
              <p>NODES DETECTED: 4</p>
            </div>
          </div>
        </transition>

        <!-- 思维导图 -->
        <transition name="fade" mode="out-in">
          <div v-if="currentTab === 1" class="tab-pane map-pane">
            
            <div class="map-toolbar">
             <div class="toolbar-actions">
                <button class="liquid-btn mini" @click="expandAllNodes">EXPAND</button>
                <button class="liquid-btn mini" @click="collapseAllNodes">COLLAPSE</button>
                <button class="liquid-btn mini" @click="resetZoom">RECENTER</button>
              </div>
            </div>

            <div ref="d3Container" class="d3-wrapper"></div>
          </div>
        </transition>

        <!-- 览前筑基 -->
        <transition name="fade" mode="out-in">
          <div v-if="currentTab === 2" class="tab-pane primer-pane liquid-theme">
            <div class="glass-panel header-panel">
              <h1 class="doc-title">{{ primerData.title }}</h1>
              <div class="meta-info-wrapper">
                <div class="author-info">
                  <div class="avatar-glow">
                    <span class="avatar-placeholder">{{ primerData.author.charAt(0) }}</span>
                  </div>
                  <div class="author-text">
                    <span class="author-name">{{ primerData.author }}</span>
                    <span class="org-name">{{ primerData.institution }}</span>
                  </div>
                </div>
                <div class="tag-group">
                  <span class="liquid-pill difficulty-pill">⚡ {{ primerData.difficulty }}</span>
                  <span class="liquid-pill time-pill">⏱ {{ primerData.readTime }}</span>
                </div>
              </div>
            </div>

            <div class="glass-panel abstract-panel">
              <div class="panel-title">ABSTRACT</div>
              <p class="abstract-content">{{ primerData.abstract }}</p>
            </div>

            <div class="section-block">
              <div class="section-header">
                <span class="section-title">KNOWLEDGE NODES</span>
                <span class="section-count">{{ primerData.knowledgeCards.length }}</span>
              </div>
              <div class="knowledge-grid">
                <div 
                  v-for="(card, i) in primerData.knowledgeCards" 
                  :key="i" 
                  class="glass-card holo-card"
                >
                  <div class="card-blur-bg"></div>
                  <div class="card-content">
                    <div class="card-term">{{ card.term }}</div>
                    <div class="card-desc">{{ card.desc }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="section-block">
              <div class="section-title">TACTICAL ANALYSIS</div>
              <div class="glass-panel strategy-panel">
                <div v-for="(tip, i) in primerData.strategies" :key="i" class="strategy-item">
                  <div class="strategy-marker">{{ i + 1 }}</div>
                  <span class="strategy-text">{{ tip }}</span>
                </div>
              </div>
            </div>

            <div class="section-block">
              <div class="section-title">RECOMMENDED STREAM</div>
              <div class="paper-list">
                <div v-for="paper in primerData.recommends" :key="paper.id" class="glass-card paper-item">
                  <div class="paper-main">
                    <div class="paper-title">{{ paper.title }}</div>
                    <div class="paper-meta">
                      <span>{{ paper.author }}</span>
                      <span class="meta-divider">•</span>
                      <span>Cited: {{ paper.citations }}</span>
                    </div>
                  </div>
                  <div class="liquid-actions">
                    <button class="liquid-btn icon-btn" :class="{ 'active': paper.liked }" @click="toggleAction(paper, 'liked')">
                      ♥
                    </button>
                    <button class="liquid-btn icon-btn" :class="{ 'active': paper.collected }" @click="toggleAction(paper, 'collected')">
                      ★
                    </button>
                    <button class="liquid-btn icon-btn">💬</button>
                    <button class="liquid-btn text-btn">Is. LIBRARY</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </transition>

      </div>
    </div>

    <!-- <div class="overlay-text">DATA VISUALIZATION // SYS.V.1.0</div> -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch, nextTick, computed } from 'vue';
import * as d3 from 'd3';
import { useArticleStore } from '../stores/article';

// --- 状态管理 ---
const currentTab = ref(0); 
const tabs = ['知识图谱', '思维导图', '览前筑基'];
const container = ref(null);
const canvas = ref(null);
const d3Container = ref(null);
let animationId = null;
const articleStore = useArticleStore();

const initCanvas = () => {
  if (!canvas.value || !container.value) return;
  const ctx = canvas.value.getContext('2d');
  
  const resizeCanvas = () => {
    canvas.value.width = container.value.clientWidth;
    canvas.value.height = container.value.clientHeight;
  };
  resizeCanvas();
  // 监听 resize
  window.addEventListener('resize', resizeCanvas);

  // 初始化粒子
  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.value.width,
    y: Math.random() * canvas.value.height,
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    size: Math.random() * 2 + 1,
    color: `rgba(0, 247, 255, ${Math.random() * 0.4 + 0.1})`
  }));

  const draw = () => {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height); 
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      // 边界反弹
      if (p.x < 0 || p.x > canvas.value.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.value.height) p.vy *= -1;

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // 绘制连线
      particles.forEach(p2 => {
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0, 247, 255, ${0.15 - dist / 700})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
    });
    animationId = requestAnimationFrame(draw);
  };
  draw();
};


// 思维导图数据 (支持展开/折叠)
const defaultMindMapData = {
  name: "冲突与妥协：侵犯公民个人信息罪司法裁量的数据画像",
  type: "root",
  children: [
    {
      name: "第一章：引言",type: "branch",status: "完成",
      children: [
        { name: "1.1 研究背景", type: "branch", status: "完成", 
          children: [
            { name: "数字时代个人信息犯罪频发", type: "leaf"},
            { name: "刑事立法多次修订完善罪名", type: "leaf" }
          ]
        },
        { name: "1.2 研究意义", type: "branch", status: "完成", children: [
          { name: "展现司法实践特征", type: "leaf"},
          { name: "规范罪名适用", type: "leaf" },
          { name: "提供犯罪防控措施", type: "leaf" }
        ]},
        { name: "1.3 研究思路", type: "branch", status: "完成", children: [
          { name: "数据化提炼司法实践规律", type: "leaf"},
          { name: "分析实践问题及原因", type: "leaf" },
          { name: "提出完善建议", type: "leaf" }  
        ]}
      ]
    },
    {
      name: "第二章：样本、变量和方法",
      type: "branch",
      status: "完成",
      children: [
        { name: "2.1 数据来源", type: "branch", status: "完成", children: [
          { name: "中国裁判文书网2022.1-2024.3判决书", type: "leaf"},
          { name: "最终500份判决书646个被告人样本", type: "leaf" }
        ]},
        { name: "2.2 变量设定", type: "branch", status: "完成", children: [
          { name: "核心解释变量：是否利用履职便利", type: "leaf"},
          { name: "控制变量：信息条数、获利金额", type: "leaf" },
          { name: "被解释变量：是否缓刑、刑罚长度", type: "leaf" }
        ]},
        { name: "2.3 研究方法", type: "branch", status: "完成", children: [
          { name: "Logit模型（缓刑影响分析）", type: "leaf"},
          { name: "OLS模型（刑期影响分析）", type: "leaf" },
          { name: "Stata软件量化分析", type: "leaf" }
        ]}
      ]
    },
    {
      name: "第三章：实证结果分析",
      type: "branch",
      status: "完成",
      children: [
        { name: "3.1 描述性统计", type: "branch", status: "完成", children: [
          { name: "45.36%案件存在履职便利情节", type: "leaf" },
          { name: "57.28%案件判处缓刑", type: "leaf" },
          { name: "平均刑罚长度16.02个月（低于法定均值）", type: "leaf" }
        ]},
        { name: "3.2 相关性分析", type: "branch", status: "完成", children: [
          { name: "履职便利与刑罚长度负相关", type: "leaf" },
          { name: "履职便利与缓刑概率正相关", type: "leaf" },
          { name: "信息条数、获利金额与刑罚显著相关", type: "leaf" }
        ]},
        { name: "3.3 回归结果", type: "branch", status: "完成", children: [
          { name: "履职便利者缓刑概率是他人5倍", type: "leaf" },
          { name: "履职便利对刑罚长度有抑制作用", type: "leaf" },
          { name: "控制变量逐步加入后结论稳健", type: "leaf" }
        ]},
        { name: "3.4 多重共线性检验", type: "branch", status: "完成", children: [
          { name: "最大VIF=1.02，无多重共线性", type: "leaf" }
        ]}
      ]
    },
    {
      name: "第四章：司法实践问题",
      type: "branch",
      status: "完成",
      children: [
        { name: "4.1 刑罚裁量与法律规定不匹配", type: "branch", status: "完成", children: [
          { name: "轻罚倾向明显（刑期接近法定起点）", type: "leaf" },
          { name: "缓刑滥用（情节特别严重者缓刑率68%）", type: "leaf" },
          { name: "司法解释未充分考量公共秩序", type: "leaf" }
        ]},
        { name: "4.2 司法与刑法规范存在差距", type: "branch", status: "完成", children: [
          { name: "特殊主体量刑功能缺位（应从重却偏轻）", type: "leaf" },
          { name: "刑事责任认定缺乏明确标准", type: "leaf" },
          { name: "履职便利未作为核心量刑因素", type: "leaf" }
        ]},
        { name: "4.3 “情节严重”认定单一化", type: "branch", status: "完成", children: [
          { name: "68.58%案件仅依违法所得定罪", type: "leaf" },
          { name: "违法所得难以准确衡量法益侵害性", type: "leaf" }
        ]}
      ]
    },
    {
      name: "第五章：完善方案",
      type: "branch",
      status: "完成",
      children: [
        { name: "5.1 完善入罪标准", type: "branch", status: "完成", children: [
          { name: "基于混合法益立场，构建“数额与情节并重”模式", type: "leaf" },
          { name: "扩充普通敏感信息范围（未成年人、生物识别信息）", type: "leaf" },
          { name: "构建行刑衔接治理路径", type: "leaf" }
        ]},
        { name: "5.2 明确预防刑调整下限", type: "branch", status: "完成", children: [
          { name: "采纳“幅的理论”，区分责任刑与预防刑", type: "leaf" },
          { name: "从轻处罚不得突破责任刑下限", type: "leaf" },
          { name: "减轻处罚参照量刑指导意见比例调节", type: "leaf" }
        ]},
        { name: "5.3 严格适用“违法所得”要素", type: "branch", status: "完成", children: [
          { name: "坚持“信息为主、数额为辅”原则", type: "leaf" },
          { name: "为违法所得适用设置前置条件", type: "leaf" },
          { name: "法益侵害不足者按行政违法处理", type: "leaf" }
        ]}
      ]
    },
    {
      name: "第六章：结论",
      type: "branch",
      status: "完成",
      children: [
        { name: "6.1 核心发现", type: "branch", status: "完成", children: [
          { name: "司法裁量与规范存在三重偏离", type: "leaf" },
          { name: "混合法益、责任刑预防刑区分等是解决关键", type: "leaf" }
        ]},
        { name: "6.2 研究价值", type: "branch", status: "完成", children: [
          { name: "为个人信息保护司法实践提供理论指导", type: "leaf" },
          { name: "助力精准打击预防相关犯罪", type: "leaf" }
        ]}
      ]
    }
  ]
};
const mindMapData = computed(() => articleStore.mindMapData || defaultMindMapData);

// --- 览前筑基数据 (Mock Data) ---
const primerData = reactive({
  title: "基于 RAG 的大规模知识库检索优化策略",
  author: "Dr. Shadow Walker",
  institution: "DeepSpace Lab",
  difficulty: "HARD CORE",
  readTime: "25 MIN",
  abstract: "本研究提出了一种新型的检索增强生成（RAG）架构，旨在解决大规模向量数据库中的长尾检索精度问题。通过引入动态语义路由与自适应重排序机制，系统在 Recall@10 指标上提升了 15%。本文详细阐述了向量索引优化、Prompt 工程及评估框架。",
  knowledgeCards: [
    { term: "RAG", desc: "Retrieval-Augmented Generation，检索增强生成技术。" },
    { term: "Vector DB", desc: "专门用于存储和查询高维向量数据的数据库系统。" },
    { term: "Semantic Routing", desc: "根据查询意图动态选择最佳检索路径的机制。" },
    { term: "Recall@K", desc: "前 K 个检索结果中包含正确答案的比例。" }
  ],
  strategies: [
    "建议优先阅读第 3.2 节架构图，理解核心数据流向。",
    "公式 (4) 较为晦涩，可结合附录 B 的代码实现理解。",
    "实验部分只需关注表 2 的对比数据，其他表格为消融实验。"
  ],
  recommends: [
    { id: 101, title: "Attention Is All You Need", author: "Vaswani et al.", citations: 85000, liked: false, collected: true },
    { id: 102, title: "Retrieval-Augmented Generation for NLP", author: "Lewis et al.", citations: 4200, liked: true, collected: false },
    { id: 103, title: "Dense Passage Retrieval", author: "Karpukhin et al.", citations: 3100, liked: false, collected: false }
  ]
});

let svg, g, zoom, root;
let i = 0; // 节点计数器

const initD3MindMap = () => {
  if (!d3Container.value) return;
  const data = mindMapData.value;
  if (!data) {
    d3.select(d3Container.value).selectAll("*").remove();
    return;
  }
  
  // 清理
  d3.select(d3Container.value).selectAll("*").remove();

  const width = d3Container.value.clientWidth;
  const height = d3Container.value.clientHeight;

  // 创建SVG
  svg = d3.select(d3Container.value)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("cursor", "grab");

  // 主画板
  g = svg.append("g").attr("transform", `translate(10, ${height / 2})`);

  // Zoom
  zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", (e) => g.attr("transform", e.transform));
  svg.call(zoom).on("dblclick.zoom", null);

  // 数据层级化
  root = d3.hierarchy(data, (d) => d.children);
  root.x0 = height / 2;
  root.y0 = 0;

  // 初始折叠所有子节点
  if (root.children) {
    root.children.forEach(collapse);
  }

  update(root);
};

// D3 Update 核心函数
const update = (source) => {
  if (!g) return;
  const duration = 500;

  // 树状布局 [h, w]
  const treeMap = d3.tree().nodeSize([80, 240]);
  const treeData = treeMap(root);
  
  const nodes = treeData.descendants();
  const links = treeData.links();

  // --- Nodes ---
  const node = g.selectAll('g.node')
    .data(nodes, d => d.id || (d.id = ++i));

  // Enter
  const nodeEnter = node.enter().append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${source.y0},${source.x0})`)
    .on('click', clickNode);

  // 嵌入 HTML 卡片
  const fo = nodeEnter.append('foreignObject')
    .attr('width', 220)
    .attr('height', 70) // 高度给足
    .attr('x', -10)
    .attr('y', -35);

  fo.append('xhtml:div')
    .attr('class', d => `d3-card-wrapper ${d.data.type}`)
    .html(d => {
      let metaHtml = '';
      if(d.data.status) metaHtml += `<span class="badge ${d.data.status === '完成' ? 'done' : 'doing'}">${d.data.status}</span>`;
      if(d.data.priority) metaHtml += `<span class="badge pri">${d.data.priority}</span>`;
      
      const hasChildren = d._children || d.children;
      const expandBtn = hasChildren ? `<div class="toggle-circle ${d._children ? 'closed' : 'open'}"></div>` : '';

      return `
        <div class="glass-mind-card">
          <div class="card-header">${d.data.name}</div>
          <div class="card-meta">${metaHtml}</div>
          ${expandBtn}
        </div>
      `;
    });

  // Update
  const nodeUpdate = nodeEnter.merge(node);
  nodeUpdate.transition().duration(duration)
    .attr('transform', d => `translate(${d.y},${d.x})`);

  // 更新折叠圈状态
  nodeUpdate.select('.toggle-circle')
    .attr('class', d => `toggle-circle ${d._children ? 'closed' : 'open'}`);

  // Exit
  node.exit().transition().duration(duration)
    .attr('transform', d => `translate(${source.y},${source.x})`)
    .remove();

  // --- Links ---
  const link = g.selectAll('path.link')
    .data(links, d => d.target.id);

  // Enter
  const linkEnter = link.enter().insert('path', "g")
    .attr("class", "link")
    .attr('d', d => {
      const o = { x: source.x0, y: source.y0 };
      return diagonal(o, o);
    });

  // Update
  linkEnter.merge(link).transition().duration(duration)
    .attr('d', d => diagonal(d.source, d.target));

  // Exit
  link.exit().transition().duration(duration)
    .attr('d', d => {
      const o = { x: source.x, y: source.y };
      return diagonal(o, o);
    })
    .remove();

  // Stash old positions
  nodes.forEach(d => {
    d.x0 = d.x;
    d.y0 = d.y;
  });
};

const diagonal = (s, d) => {
  return `M ${s.y} ${s.x} C ${(s.y + d.y) / 2} ${s.x}, ${(s.y + d.y) / 2} ${d.x}, ${d.y} ${d.x}`;
};

const clickNode = (e, d) => {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
};

// 辅助功能
const collapse = (d) => {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
};
const expandAllNodes = () => {
  if (!root) return;
  root.descendants().forEach(d => {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }
  });
  update(root);
};
const collapseAllNodes = () => {
   if (!root) return;
   if (root.children) {
     root.children.forEach(collapse);
   }
   update(root);
}
const resetZoom = () => {
  if (!svg || !zoom) return;
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity.translate(10, d3Container.value.clientHeight / 2)
  );
};

const toggleAction = (item, field) => {
  item[field] = !item[field];
};

// --- 生命周期 ---
const switchTab = (index) => {
  currentTab.value = index;
  if (index === 1) {
    nextTick(() => initD3MindMap());
  }
};

watch(
  () => articleStore.mindMapData,
  () => {
    if (currentTab.value === 1) {
      nextTick(() => initD3MindMap());
    }
  }
);

onMounted(() => {
  initCanvas();
  if (currentTab.value === 1) initD3MindMap();
  window.addEventListener('resize', () => {
    if(currentTab.value === 1) initD3MindMap();
  });
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
});

</script>

<style scoped>
/* 保持原有容器样式 */
.visual-panel-container {
  width: 100%;
  height: 100%;
  background: #000;
  position: relative;
  overflow: hidden;
  /* 确保字体在暗色背景下清晰 */
  font-family:'Segoe UI', sans-serif;
}

/* 1. Canvas 作为背景层 */
.bg-canvas {
  position: absolute;
  width:100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 0; /* 最底层 */
}

/* 2. UI 层覆盖在上方 */
.ui-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 10px;
  box-sizing: border-box;
}

/* Tabs 样式 */
.tech-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 0px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  z-index: 20;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  color: #00f3ff;
  background: rgba(0, 20, 20, 0.6);
  cursor: pointer;
  border: 1px solid transparent;
  font-size: 13px;
  transition: all 0.3s;
  font-weight: bold;
  border-radius: 8px 8px 0 0;
  /* clip-path: polygon(10% 0, 100% 0, 100% 100%, 0 100%, 0 20%); 科幻切角 */
}

.tab-item:hover {
  background: rgba(0, 255, 255, 0.294);
}

.tab-item.active {
  background: #00f3ff;
  border: 1px solid #0ff;
  text-shadow: 0 0 5px #0ff;
  box-shadow: 0 0 15px #00f3ff;
  color: #000;
  font-weight:bolder;
}

/* 箭头标签 */
.tab-marker {
  font-size: 14px;
  opacity: 0.5;
  margin-right: 5px;
}

/* 内容显示区 */
.content-viewport {
  flex: 1;
  position: relative;
  overflow-y: hidden; /* 允许内容滚动 */
}

.tab-pane {
  height: 100%;
  width: 100%;
}

/* Tab 1: 星球图谱 */
.graph-pane {
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
}
.galaxy-container {
  width: 100%;
  height: 90%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
}

.planet {
  border-radius: 50%;
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px currentColor;
  transition: all 0.3s; cursor: pointer;
}
.planet:hover { transform: scale(1.1); filter: brightness(1.3); }
.planet-label {
  position: absolute;
  top: 120%;
  color: #fff;
  font-size: 10px;
  white-space: nowrap;
  font-weight: bold;
}

.sun {
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, #fff, var(--accent-cyan, #0ff));
  color: var(--accent-cyan, #0ff);
  z-index: 10;
  box-shadow: 0 0 30px var(--accent-cyan, #0ff);
}

.orbit {
  position: absolute;
  border: 1px dashed rgba(0, 247, 255, 0.2);
  border-radius: 50%;
  animation: rotate linear infinite;
}

.orbit-1 { width: 140px; height: 140px; animation-duration: 10s; }
.orbit-2 { width: 220px; height: 220px; animation-duration: 15s; }
.orbit-3 { width: 300px; height: 300px; animation-duration: 25s; }

.earth { top: -10px; right: 20px; width: 20px; height: 20px; background: #0088ff; color: #0088ff; }
.mars { bottom: 20px; left: 10px; width: 15px; height: 15px; background: #ff4400; color: #ff4400; }
.jupiter { top: 50%; left: -15px; width: 30px; height: 30px; background: #ffcc00; color: #ffcc00; }

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes counter-rotate { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

.graph-info {
  text-align: center;
  color: rgba(0, 255, 255, 0.72);
  font-size: 11px;
  border-top: 1px solid rgba(0, 255, 255, 0.2);
  padding-top: 10px;
  font-weight: bold;
  margin-top: 20px;
}

/* Tab 2: 思维导图 */
.d3-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.map-toolbar {
  position: absolute;
  top: 10px; 
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex; gap: 20px; align-items: center;
  width: 90%;
  justify-content: center;
}
.toolbar-title {
  color: #0ff; 
  font-weight: bold; 
  font-family: 'Orbitron', 
  sans-serif; letter-spacing: 2px;
}
.toolbar-actions{
  display: flex; gap: 10px;
  flex-direction: row;
  justify-content: space-around; 
  align-content: center;
}
.liquid-btn.mini {
  background: rgba(0, 247, 255, 0.1); border: 1px solid rgba(0, 247, 255, 0.3);
  color: #00f7ff; padding: 4px 10px; font-size: 10px; border-radius: 4px; cursor: pointer;
}
.liquid-btn.mini:hover { background: #00f7ff; color: #000; }

/* --- D3 连线样式 --- */
:deep(.link) { fill: none; stroke: rgba(0, 247, 255, 0.3); stroke-width: 2px; transition: all 0.5s; }
:deep(.glass-mind-card) {
  width: 100%; height: 100%;
  background: rgba(10, 20, 30, 0.7); backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 247, 255, 0.2); border-radius: 8px;
  padding: 8px 12px; box-sizing: border-box; color: #fff;
  display: flex; flex-direction: column; justify-content: center;
  transition: all 0.3s; cursor: pointer;
}
:deep(.glass-mind-card:hover) {
  border-color: #00f7ff; background: rgba(0, 247, 255, 0.15);
  box-shadow: 0 0 15px rgba(0, 247, 255, 0.2);
}
:deep(.d3-card-wrapper.root .glass-mind-card) {
  border-color: #00f7ff; background: linear-gradient(135deg, rgba(0, 247, 255, 0.25), transparent);
}
:deep(.card-header) { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
:deep(.card-meta) { display: flex; gap: 5px; }
:deep(.badge) { font-size: 10px; padding: 2px 4px; border-radius: 3px; }
:deep(.badge.done) { background: rgba(0, 255, 100, 0.2); color: #0f0; }
:deep(.badge.doing) { background: rgba(0, 247, 255, 0.2); color: #0ff; }
:deep(.badge.pri) { border: 1px solid #ff9900; color: #ff9900; }
:deep(.toggle-circle) {
  position: absolute; right: -6px; top: 50%; margin-top: -6px;
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid #00f7ff; background: #000; z-index: 10;
}
:deep(.toggle-circle.closed) { background: #00f7ff; }


/* Tab 3: 览前筑基 */

.primer-pane.liquid-theme {
  padding: 2px;
  height: 100%;       /* 占满父容器 */
  width: 100%;        /* 确保宽度也占满 */
  box-sizing: border-box; /* 🔥 关键：防止 padding 导致尺寸超出 100% 从而触发外层滚动条 */
  color: var(--text-primary);
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  /* 字体优化：使用更现代、清晰的无衬线字体 */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  letter-spacing: 0.5px;
   /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: #0ff #001;
  padding:2px 15px;
}

/* --- 通用玻璃面板基类 --- */
.glass-panel, .glass-card {
  background: var(--glass-bg);
  /* 核心：背景模糊滤镜，创造景深感 */
  backdrop-filter: blur(var(--blur-strength));
  -webkit-backdrop-filter: blur(var(--blur-strength));
  /* 玻璃边缘高光：利用内阴影模拟 */
  box-shadow: 
    inset 0 1px 1px var(--glass-shine),
    0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--glass-border);
  border-radius: var(--panel-radius);
  margin-bottom: 15px;
  overflow: hidden; /* 确保子元素不溢出圆角 */
  transition: all 0.3s ease;
}

/* 鼠标悬停时的光影互动 */
.glass-panel:hover, .glass-card:hover {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 
    inset 0 1px 1px rgba(255, 255, 255, 0.2),
    0 8px 30px rgba(0, 10, 20, 0.5);
  transform: translateY(-2px);
}
/* --- A. Header 区域 (布局修复核心) --- */
.header-panel {
  padding: 24px;
  background: linear-gradient(135deg, rgba(0,247,255,0.1), var(--glass-bg) 40%);
}

.doc-title {
  margin: -10px 0 20px 0;
  padding:0 auto;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(90deg, #fff, var(--accent-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(0, 247, 255, 0.3);
}

/* 🔥 布局修复关键：Flex Wrap */
.meta-info-wrapper {
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  gap: 20px; /* 行与列之间的间距 */
  align-items: center;
  justify-content: space-between; /* 空间足够时两端对齐 */
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0; /* 防止作者信息被过度挤压 */
}

.avatar-glow {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(45deg, var(--accent-cyan), #0066ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 0 15px var(--accent-cyan);
}

.author-text { display: flex; flex-direction: column; }
.author-name { font-weight: 600; font-size: 14px; }
.org-name { font-size: 12px; color: var(--accent-cyan); opacity: 0.8; }

/* 液态标签胶囊 */
.tag-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap; /* 标签本身也允许换行 */
}

.liquid-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 1px var(--glass-shine);
  backdrop-filter: blur(10px);
}
.pill-icon { margin-right: 6px; font-style: normal; }
.difficulty-pill { color: var(--accent-cyan); border-color: rgba(0, 247, 255, 0.3); }
.time-pill { color: #ff9900; border-color: rgba(255, 153, 0, 0.3); }


/* --- B. 摘要面板 --- */
.abstract-panel {
  padding: 24px;
}
.panel-title, .section-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  display: block;
  font-weight: 700;
}
.section-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
}
.section-count {
    background: var(--accent-cyan); color: #000; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold;
}
.abstract-content {
  line-height: 1.8;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
}


/* --- C. 知识卡片 --- */
.knowledge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* 自动填充，最小220px */
  gap: 20px;
  margin-bottom: 30px;
}

.holo-card {
  padding: 20px;
  margin-bottom: 0; /* Grid布局不需要margin-bottom */
  position: relative;
  background: rgba(0, 247, 255, 0.03);
}

.card-term {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-cyan);
  margin-bottom: 10px;
}
.card-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}


/* --- D. 战术分析 --- */
.strategy-panel { padding: 10px 0; }
.strategy-item {
  display: flex;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: flex-start;
}
.strategy-item:last-child { border-bottom: none; }

.strategy-marker {
  width: 24px; height: 24px;
  background: rgba(0, 247, 255, 0.1);
  color: var(--accent-cyan);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 12px;
  margin-right: 16px; flex-shrink: 0;
  border: 1px solid rgba(0, 247, 255, 0.3);
}
.strategy-text { font-size: 14px; line-height: 1.6; }


/* --- E. Paper List & Buttons --- */
.paper-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  margin-bottom: 16px;
  flex-wrap: wrap; /* 允许在极窄屏下换行 */
  gap: 16px;
}
.paper-main { flex: 1; min-width: 200px; }
.paper-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.paper-meta { font-size: 12px; color: var(--text-secondary); display: flex; gap: 8px; }
.meta-divider { opacity: 0.5; }

.liquid-actions {
  display: flex;
  gap: 10px;
}

.liquid-btn {
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(5px);
  border: 1px solid transparent;
}
.liquid-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  transform: scale(1.05);
}

.icon-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
}
.icon-btn.active {
  background: linear-gradient(135deg, var(--accent-pink), #ff5e00);
  color: #fff;
  box-shadow: 0 4px 15px rgba(255, 45, 136, 0.4);
}

.text-btn {
  padding: 0 16px;
  height: 36px;
  font-weight: 600; font-size: 12px;
  background: rgba(0, 247, 255, 0.1);
  color: var(--accent-cyan);
  border-color: rgba(0, 247, 255, 0.3);
}
.text-btn:hover {
  background: var(--accent-cyan); color: #000;
  box-shadow: 0 0 15px rgba(0, 247, 255, 0.5);
}

/* --- 滚动条美化 (液态风格) --- */
.primer-pane::-webkit-scrollbar { width: 8px; }
.primer-pane::-webkit-scrollbar-track { background: transparent; }
.primer-pane::-webkit-scrollbar-thumb {
  background: rgba(0, 247, 255, 0.2);
  border-radius: 4px;
  border: 2px solid transparent; /* 创建悬浮感 */
  background-clip: padding-box;
}
.primer-pane::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 247, 255, 0.5);
}

/* 动画 */
@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 原有Overlay文字微调 */
.overlay-text {
  position: absolute;
  bottom: 10px;
  right: 10px;
  color: rgba(0, 255, 255, 0.5);
  font-family: 'Orbitron', sans-serif;
  font-size: 12px;
  pointer-events: none;
  z-index: 20; /* 确保在UI层之上 */
}
</style>
