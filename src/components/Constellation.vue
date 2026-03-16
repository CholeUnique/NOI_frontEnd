<template>
  <div ref="container" class="constellation-container" :class="{ 'is-resizing': isResizing }">
    <!-- 遮罩层颜色改为黑色，避免过曝 -->
    <div class="mask-overlay" :style="{ opacity: maskOpacity, backgroundColor: maskColor }"></div>

    <div class="ui-overlay" :class="{ 'fade-in': isIntroFinished && !isExiting }">
      <button class="back-btn" @click="goBack">
        <span class="arrow">←</span> 返回知识宇宙
      </button>
      <div class="category-header" :style="{ color: themeColor }">
        <h1>{{ isRAGMode ? 'RAG 知识图谱' : currentCategoryName }}</h1>
        <p v-if="isRAGMode" class="subtitle">传统 RAG vs GraphRAG 核心概念网络</p>
      </div>

      <!-- RAG 图谱入口按钮 -->
      <button v-if="!isRAGMode" class="rag-btn" @click="enterRAGMode" :style="{ borderColor: themeColor, color: themeColor }">
        <span class="icon">🕸️</span> RAG 知识图谱
      </button>
    </div>

    <div v-if="hoveredNode" class="node-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px', maxWidth: tooltipPos.maxWidth + 'px', borderColor: themeColor }">
      <p>{{ hoveredNode.type === 'tag' ? '标签节点' : '文章节点' }}</p>
      <h4 :style="{ color: themeColor }">{{ hoveredNode.name }}</h4>
      <div v-if="hoveredNode.tags && hoveredNode.tags.length > 0" class="node-tags">
        <span 
          v-for="(tag, index) in hoveredNode.tags" 
          :key="index" 
          class="tag-capsule"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ 'is-open': isSidebarOpen }">
      <div class="sidebar-header">
        <h2 :style="{ color: themeColor }">{{ selectedTag?.name }}</h2>
        <button class="close-btn" @click="closeSidebar">×</button>
      </div>
      
      <div class="sidebar-controls">
        <div class="search-box">
          <input 
            v-model="sidebarSearchQuery" 
            type="text" 
            placeholder="搜索文章..." 
            class="search-input"
            :style="{ borderColor: themeColor, color: themeColor }"
            @keyup.enter="performSearch"
          >
          <button class="search-btn" @click="performSearch" :style="{ color: themeColor }">
            🔍
          </button>
        </div>
        <div class="sort-controls">
          <button 
            :class="{ active: sidebarSortBy === 'date' }" 
            :style="{ backgroundColor: sidebarSortBy === 'date' ? themeColor : 'transparent', borderColor: themeColor }"
            @click="sidebarSortBy = 'date'"
          >时间</button>
          <button 
            :class="{ active: sidebarSortBy === 'name' }" 
            :style="{ backgroundColor: sidebarSortBy === 'name' ? themeColor : 'transparent', borderColor: themeColor }"
            @click="sidebarSortBy = 'name'"
          >名称</button>
        </div>
      </div>

      <div class="sidebar-content" @click="closeMenu">
        <div 
          v-for="article in sidebarArticles" 
          :key="article.id" 
          class="article-item"
          :style="{ borderLeftColor: themeColor }"
          @click.stop="goToArticle(article)"
        >
          <div class="article-info">
            <h3 class="article-title">{{ article.name }}</h3>
            <p class="article-date">{{ formatDate(article.created_at) }}</p>
          </div>
          
          <div class="article-actions" @click.stop>
            <button class="more-btn" @click="toggleMenu(article.id)">
              <span class="dots">⋮</span>
            </button>
            
            <div v-if="activeMenuId === article.id" class="action-menu">
              <button @click="openRenameModal(article)">重命名</button>
              <button @click="confirmDelete(article)" class="delete-btn">删除</button>
            </div>
          </div>
        </div>
        <div v-if="sidebarArticles.length === 0" class="no-data">
          暂无文章
        </div>
      </div>

      <!-- 重命名弹窗 -->
      <div v-if="showRenameModal" class="modal-overlay" @click.self="closeRenameModal">
        <div class="rename-modal">
          <h3>重命名文档</h3>
          <input 
            v-model="renameForm.newName" 
            type="text" 
            placeholder="请输入新名称" 
            class="rename-input"
            :style="{ borderColor: themeColor }"
            @keyup.enter="submitRename"
          />
          <div class="modal-actions">
            <button @click="closeRenameModal" class="cancel-btn">取消</button>
            <button @click="submitRename" class="confirm-btn" :style="{ backgroundColor: themeColor }">确定</button>
          </div>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
        <div class="delete-modal">
          <div class="delete-icon">⚠️</div>
          <h3>确认删除</h3>
          <p class="delete-warning">确定要删除文档 "{{ deleteTarget?.name }}" 吗？</p>
          <p class="delete-hint">此操作无法撤销</p>
          <div class="modal-actions">
            <button @click="closeDeleteModal" class="cancel-btn">取消</button>
            <button @click="submitDelete" class="delete-confirm-btn">确认删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGalaxyStore } from '../stores/galaxy';
import { useAuthStore } from '../stores/auth';
import { API_CONFIG } from '../config/api';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// --- Vue 逻辑 ---
const route = useRoute();
const router = useRouter();
const store = useGalaxyStore();
const authStore = useAuthStore();
const container = ref(null);

const API_V1_BASE = `${API_CONFIG.base.url}/api/v1`;

const currentCategoryName = route.query.category || '未知';
const themeColor = ref(store.getCategoryColor(currentCategoryName));

// 转场状态
const maskOpacity = ref(1); 
const maskColor = ref('#000000'); 
const isIntroFinished = ref(false);
const isExiting = ref(false); 
const isResizing = ref(false);

const isDataLoaded = ref(false);
const isRAGMode = ref(false);

const hoveredNode = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });

// --- Sidebar Logic ---
const isSidebarOpen = ref(false);
const selectedTag = ref(null);
const sidebarSearchQuery = ref('');
const activeSearchQuery = ref('');
const sidebarSortBy = ref('date');

const performSearch = () => {
  activeSearchQuery.value = sidebarSearchQuery.value;
};

// --- Menu & Actions Logic ---
const activeMenuId = ref(null);
const showRenameModal = ref(false);
const renameForm = ref({ id: null, newName: '' });
const showDeleteModal = ref(false);
const deleteTarget = ref(null);

const toggleMenu = (id) => {
  activeMenuId.value = activeMenuId.value === id ? null : id;
};

const closeMenu = () => {
  activeMenuId.value = null;
};

const openRenameModal = (article) => {
  renameForm.value = { id: article.id, newName: article.name };
  showRenameModal.value = true;
  activeMenuId.value = null;
};

const closeRenameModal = () => {
  showRenameModal.value = false;
};

const submitRename = async () => {
  if (!renameForm.value.newName.trim()) return;
  try {
    const response = await fetch(`${API_V1_BASE}/assets/${renameForm.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ filename: renameForm.value.newName })
    });
    if (response.ok) {
      await refreshConstellationView(); // 刷新数据并更新视图
      closeRenameModal();
      showSuccessToast('重命名成功');
    } else {
      throw new Error('重命名失败');
    }
  } catch (e) {
    console.error('Rename failed', e);
    alert('重命名失败');
  }
};

const confirmDelete = (article) => {
  deleteTarget.value = article;
  showDeleteModal.value = true;
  activeMenuId.value = null;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  deleteTarget.value = null;
};

const submitDelete = async () => {
  if (!deleteTarget.value) return;
  try {
    const response = await fetch(`${API_V1_BASE}/assets/${deleteTarget.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });
    if (response.ok) {
      await refreshConstellationView(); // 刷新数据并更新视图
      closeDeleteModal();
      // 显示成功提示（使用简单的临时提示）
      showSuccessToast('删除成功');
    } else {
      throw new Error('删除失败');
    }
  } catch (e) {
    console.error('Delete failed', e);
    alert('删除失败');
  }
};

const showSuccessToast = (message) => {
  // 检查侧边栏是否打开
  if (!isSidebarOpen.value) return;
  
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'success-toast';
  toast.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 255, 0, 0.2);
    border: 1px solid #00ff00;
    color: #00ff00;
    padding: 15px 30px;
    border-radius: 8px;
    font-family: 'Orbitron', sans-serif;
    font-size: 1rem;
    z-index: 300;
    backdrop-filter: blur(10px);
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
    pointer-events: none;
  `;
  
  // 将提示添加到侧边栏容器内
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }
};

const sidebarArticles = computed(() => {
  // 1. 安全检查：如果用户没有选中任何标签（Tag），直接返回空数组，不显示任何文件
  if (!selectedTag.value) return [];
  // 目的：找出所有属于当前选中标签(selectedTag)的文件ID
  const linkedArticleIds = linksData
    .filter(link => link.tag === selectedTag.value.name)
    .map(link => link.articleId);
  // 目的：拿着上面的 ID 数组，去原始文章库(articlesData)里把真正的文章对象找出来
  let articles = articlesData.filter(art => linkedArticleIds.includes(art.id));
  // 目的：如果用户在搜索框输入了字（activeSearchQuery），再进行二次筛选
  if (activeSearchQuery.value) {
    const q = activeSearchQuery.value.toLowerCase();
    articles = articles.filter(art => 
      art.name.toLowerCase().includes(q) || 
      (art.summary && art.summary.toLowerCase().includes(q))
    );
  }
  // 目的：根据用户选择的排序方式（sidebarSortBy）对结果进行重新排列
  return articles.sort((a, b) => {
    if (sidebarSortBy.value === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    }
  });
});

const closeSidebar = () => {
  isSidebarOpen.value = false;
  selectedTag.value = null;
  sidebarSearchQuery.value = '';
  activeSearchQuery.value = '';
};

const goToArticle = (article) => {
  const currentCategory = route.query.category || 'default';
  
  console.log('Navigate to article:', article.id);
  router.push({ 
    name: 'ArticleDetail', 
    params: { id: article.id },
    query: { category: currentCategory }
  });

};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
};

const onMouseClick = (event) => {
  if (!isIntroFinished.value || isExiting.value) return;
  if (!container.value || !renderer) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  mouse.x = (mouseX / rect.width) * 2 - 1;
  mouse.y = -(mouseY / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactables, false);
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (object.userData.type === 'tag') {
      selectedTag.value = object.userData;
      isSidebarOpen.value = true;
    }
  }
};

// --- Three.js 变量 ---
let scene, camera, renderer, labelRenderer, composer, controls;
let interactables = []; 
let lines = []; 
let starParticles; 
let dustParticles; 
let raycaster, mouse;
let animationId;
let starSpeed = 0.5; 

// --- 交互状态管理 ---
// 记录当前鼠标是否悬浮在 DOM 标签上
let hoveredLabelNode = null; 
// 建立 ID -> Mesh 的映射，方便快速查找和控制缩放
const nodeMeshMap = {}; 

// --- 物理引擎相关变量 ---
let physicsNodes = []; 
let physicsLinks = [];
let simulationAlpha = 1.0; 

// 尺寸监听相关
let resizeObserver;
let resizeTimer = null;

// 星座数据
let tagsData = [];      
let articlesData = [];  
let linksData = [];     

const goBack = () => {
  if (isExiting.value) return; 
  startExitAnimation();
};

const fetchConstellationData = async () => {
  const data = await store.fetchConstellationData(authStore.token, currentCategoryName);
  if (data) {
    tagsData = data.tags || [];
    articlesData = data.articles || [];
    linksData = data.links || [];
    isDataLoaded.value = true;
    return tagsData.length > 0 || articlesData.length > 0;
  }
  tagsData = [];
  articlesData = [];
  linksData = [];
  isDataLoaded.value = true;
  return false;
};

// 加载 RAG 数据
const enterRAGMode = async () => {
  isRAGMode.value = true;
  await refreshConstellationView();
};

const fetchRAGData = async () => {
  try {
    const response = await fetch('/RAG文档3w.txt');
    const json = await response.json();
    const graph = json.data.graph;
    
    if (!graph) return;

    // 1. 节点处理
    // 按 PageRank 排序，选出 Top 5 作为 "Tag" (大节点/恒星)
    const sortedNodes = [...graph.nodes].sort((a, b) => (b.pagerank || 0) - (a.pagerank || 0));
    const topNodeIds = new Set(sortedNodes.slice(0, 5).map(n => n.id));

    tagsData = [];
    articlesData = [];

    // 为了性能，限制总节点数 (例如 Top 300)
    const activeNodes = sortedNodes.slice(0, 300);
    const activeNodeIds = new Set(activeNodes.map(n => n.id));

    activeNodes.forEach(node => {
      if (topNodeIds.has(node.id)) {
        // 作为 Tag
        tagsData.push({
          name: node.id,
          count: node.pagerank,
          ...node
        });
      } else {
        // 作为 Article
        articlesData.push({
          id: node.id,
          name: node.id, // RAG 数据可能 entity_name 就是 id
          summary: node.description,
          tags: [node.entity_type],
          created_at: new Date().toISOString()
        });
      }
    });

    // 2. 边处理
    linksData = [];
    graph.edges.forEach(edge => {
      // 只有当源和目标都在我们的 activeNodes 里时才添加
      if (activeNodeIds.has(edge.source) && activeNodeIds.has(edge.target)) {
        linksData.push({
          source: edge.source,
          target: edge.target,
          weight: edge.weight
        });
      }
    });

  } catch (e) {
    console.error('Failed to load RAG data:', e);
    tagsData = [];
    articlesData = [];
    linksData = [];
  }
};

const refreshConstellationView = async () => {
  if (isRAGMode.value) {
    await fetchRAGData();
  } else {
    await fetchConstellationData();
  }
  
  // 检查当前选中的标签是否还存在
  if (selectedTag.value) {
    const tagStillExists = tagsData.some(tag => tag.name === selectedTag.value.name);
    if (!tagStillExists) {
      // 标签已被删除，关闭侧边栏
      closeSidebar();
      return; // 标签不存在了，直接返回
    }
    
    // 标签还存在，强制触发侧边栏列表更新
    // 通过重新设置 selectedTag 来触发 computed 重新计算
    const currentTag = selectedTag.value;
    selectedTag.value = null;
    await new Promise(resolve => setTimeout(resolve, 0)); // 等待一个事件循环
    selectedTag.value = currentTag;
  }
  
  // 清空现有场景中的节点和连线
  interactables.forEach(obj => {
    // 递归清除所有子元素（包括CSS2D标签）
    while(obj.children.length > 0) {
      const child = obj.children[0];
      obj.remove(child);
      if (child.element) {
        // CSS2DObject 有 element 属性，需要从 DOM 中移除
        child.element.remove();
      }
    }
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  lines.forEach(line => {
    scene.remove(line);
    if (line.geometry) line.geometry.dispose();
    if (line.material) line.material.dispose();
  });
  interactables = [];
  lines = [];
  // 清空映射表
  for (const key in nodeMeshMap) delete nodeMeshMap[key];
  // 重新创建星座
  createConstellation();
};

// --- Three.js 初始化 ---
const initThree = () => {
  if (!container.value) return;
  const width = container.value.clientWidth;
  const height = container.value.clientHeight;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.02); 

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 40, 20); 
  camera.lookAt(0, 0, 0); 

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  container.value.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelRenderer.domElement.style.zIndex = '5';
  container.value.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.maxDistance = 120;
  controls.minDistance = 5;
  controls.maxPolarAngle = Math.PI / 2 - 0.1; 
  controls.enabled = false; 

  const ambientLight = new THREE.AmbientLight(0x404040, 2); 
  scene.add(ambientLight);
  
  const dirLight1 = new THREE.DirectionalLight(themeColor.value, 1.5);
  dirLight1.position.set(10, 20, 10); 
  scene.add(dirLight1);
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight2.position.set(-10, 20, -10);
  scene.add(dirLight2);


  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
  bloomPass.threshold = 0;
  bloomPass.strength = 1.5; 
  bloomPass.radius = 0.5;
  
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  createBackground(); 
  createDust();       
  createConstellation(); // 创建节点

  resizeObserver = new ResizeObserver(() => {
    isResizing.value = true;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        finalResizeUpdate();
        isResizing.value = false;
    }, 150);
  });
  resizeObserver.observe(container.value);

  window.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onMouseClick);
  
  animate();
  startEntranceAnimation(); 
};

// --- 物理模拟核心函数 ---
const updatePhysics = () => {
  if (simulationAlpha < 0.01) return;

  // 1. 排斥力
  const repulsionStrength = 100.0; 
  
  for (let i = 0; i < physicsNodes.length; i++) {
    for (let j = i + 1; j < physicsNodes.length; j++) {
      const nodeA = physicsNodes[i];
      const nodeB = physicsNodes[j];
      
      const dx = nodeA.position.x - nodeB.position.x;
      const dz = nodeA.position.z - nodeB.position.z;
      
      const distSq = dx * dx + dz * dz || 0.1;
      
      const force = (repulsionStrength * simulationAlpha) / distSq;
      
      const fx = (dx * force) / distSq; // 简化计算
      const fz = (dz * force) / distSq;
      
      nodeA.velocity.x += fx;
      nodeA.velocity.z += fz;
      
      nodeB.velocity.x -= fx;
      nodeB.velocity.z -= fz;
    }
  }

  // 2. 弹簧引力
  const springLength = 7.5; 
  const springStrength = 0.5; 
  
  physicsLinks.forEach(link => {
    const nodeA = link.source;
    const nodeB = link.target;
    
    const dx = nodeB.position.x - nodeA.position.x;
    const dz = nodeB.position.z - nodeA.position.z;
    
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.1;
    
    const displacement = dist - springLength;
    const force = displacement * springStrength * simulationAlpha;
    
    const fx = (dx / dist) * force;
    const fz = (dz / dist) * force;
    
    nodeA.velocity.x += fx;
    nodeA.velocity.z += fz;
    
    nodeB.velocity.x -= fx;
    nodeB.velocity.z -= fz;
  });

  // 3. 中心引力
  const centerStrength = 0.005;
  physicsNodes.forEach(node => {
    node.velocity.x -= node.position.x * centerStrength * simulationAlpha;
    node.velocity.z -= node.position.z * centerStrength * simulationAlpha;
    node.velocity.y = 0;
  });

  // 4. 应用速度
  physicsNodes.forEach(node => {
    node.velocity.clampLength(0, 2.5);
    node.position.add(node.velocity);
    node.position.y = 0; 
    node.velocity.multiplyScalar(0.9); 
    
    if (node.mesh) {
      node.mesh.position.copy(node.position);
    }
  });

  // 5. 更新连线
  const time = Date.now() * 0.001;
  lines.forEach((line, index) => {
    if (index < physicsLinks.length) {
      const link = physicsLinks[index];
      const positions = line.geometry.attributes.position.array;
      
      positions[0] = link.source.position.x;
      positions[1] = link.source.position.y;
      positions[2] = link.source.position.z;
      
      positions[3] = link.target.position.x;
      positions[4] = link.target.position.y;
      positions[5] = link.target.position.z;
      
      line.geometry.attributes.position.needsUpdate = true;
      
      // 连线脉冲动画
      if (line.userData) {
        const pulse = Math.sin(time * 2 + line.userData.pulsePhase) * 0.1 + 0.9;
        line.material.opacity = line.userData.originalOpacity * pulse;
      }
    }
  });

  simulationAlpha *= 0.995;
};

// --- 动画循环 ---
const animate = () => {
  animationId = requestAnimationFrame(animate);
  const time = Date.now() * 0.001;

  updatePhysics();

  if (container.value && camera) {
    const currentWidth = container.value.clientWidth;
    const currentHeight = container.value.clientHeight;
    if (currentWidth > 0 && currentHeight > 0) {
       const newAspect = currentWidth / currentHeight;
       if (Math.abs(camera.aspect - newAspect) > 0.01) {
         camera.aspect = newAspect;
         camera.updateProjectionMatrix();
       }
    }
  }

  if(starParticles) starParticles.rotation.y += starSpeed * 0.02; 
  if(dustParticles) {
    dustParticles.rotation.y -= starSpeed * 0.04; 
    dustParticles.rotation.x = Math.sin(time * 0.2) * 0.05; 
  }

  // 自转效果
  interactables.forEach(obj => {
      if (obj.userData.type === 'tag') {
          obj.rotation.y += 0.005;
          obj.rotation.z += 0.002;
      }
      if (obj.userData.type === 'article') {
          obj.rotation.x += 0.005;
          obj.rotation.y += 0.005;
      }
  });

  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);
};

const finalResizeUpdate = () => {
  if (!container.value || !camera || !renderer) return;
  const width = container.value.clientWidth;
  const height = container.value.clientHeight;
  if (width === 0 || height === 0) return;

  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
  composer.setSize(width, height);
  
  const bloomPass = composer.passes.find(p => p.isUnrealBloomPass);
  if (bloomPass) bloomPass.resolution.set(width, height);
};

// --- 修改后的交互逻辑：合并 DOM 悬停和 Raycaster 悬停 ---
const onMouseMove = (event) => {
  if (!isIntroFinished.value || isExiting.value) return; 
  if (!container.value || !renderer) return;

  const rect = renderer.domElement.getBoundingClientRect(); 

  // 1. Raycaster 检测
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  mouse.x = (mouseX / rect.width) * 2 - 1;
  mouse.y = -(mouseY / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactables, false);
  const hitMesh = intersects.length > 0 ? intersects[0].object : null;

  // 2. 决定最终的高亮目标
  const targetData = hoveredLabelNode || (hitMesh ? hitMesh.userData : null);

  if (targetData) {
    document.body.style.cursor = 'pointer';
    
    if (hoveredNode.value?.id !== targetData.id) {
      Object.values(nodeMeshMap).forEach(m => m.scale.setScalar(1));
      const targetMesh = nodeMeshMap[targetData.id];
      if (targetMesh) {
         targetMesh.scale.setScalar(1.5);
      }
      hoveredNode.value = targetData;
    }

    // 【修改点 2】: 实时计算最大宽度
    const containerX = event.clientX - rect.left;
    const containerY = event.clientY - rect.top;

    // 基础偏移量
    const offsetX = 15;
    
    // 计算右侧剩余空间：容器总宽 - 当前X坐标 - 预留边距(20px)
    // 鼠标在右侧时，剩余空间会变小
    const rightSpace = rect.width - containerX - 30; // 30 = 15(offset) + 15(padding)
    
    // 动态设置 maxWidth，但不小于 150px 防止压得太扁
    // 默认最大宽度设为 300px (或者你想设定的任意值)
    const dynamicMaxWidth = Math.max(150, Math.min(300, rightSpace));

    tooltipPos.value = { 
      x: containerX + offsetX, 
      y: containerY + 15,
      maxWidth: dynamicMaxWidth 
    };

  } else {
    document.body.style.cursor = 'default';
    if (hoveredNode.value) {
      Object.values(nodeMeshMap).forEach(m => m.scale.setScalar(1));
      hoveredNode.value = null;
    }
  }
};

const createBackground = () => {
  const geometry = new THREE.BufferGeometry();
  // 根据设备性能调整粒子数量
  const isHighPerformance = navigator.hardwareConcurrency >= 8;
  const count = isHighPerformance ? 3000 : 1500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseColor = new THREE.Color(themeColor.value);
  
  for(let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    if(Math.random() > 0.7) {
        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
    } else {
        colors[i * 3] = 0.7; 
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.7;
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.4, transparent: true, opacity: 0.6, vertexColors: true });
  starParticles = new THREE.Points(geometry, material);
  scene.add(starParticles);
};

const createDust = () => {
  const geometry = new THREE.BufferGeometry();
  // 根据设备性能调整粒子数量
  const isHighPerformance = navigator.hardwareConcurrency >= 8;
  const count = isHighPerformance ? 800 : 400; 
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseColor = new THREE.Color(themeColor.value);
  for(let i = 0; i < count; i++) {
    const r = 5 + Math.random() * 55;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const mixRatio = Math.random();
    colors[i * 3] = baseColor.r * mixRatio + 1 * (1 - mixRatio);
    colors[i * 3 + 1] = baseColor.g * mixRatio + 1 * (1 - mixRatio);
    colors[i * 3 + 2] = baseColor.b * mixRatio + 1 * (1 - mixRatio);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.2, transparent: true, opacity: 0.4, vertexColors: true, blending: THREE.AdditiveBlending });
  dustParticles = new THREE.Points(geometry, material);
  scene.add(dustParticles);
};

const startEntranceAnimation = () => {
  const duration = 1500; 
  const startPos = new THREE.Vector3(0, 80, 0); 
  const targetPos = new THREE.Vector3(0, 40, 20); 
  const startTime = Date.now();
  const loop = () => {
    if(isExiting.value) return; 
    const now = Date.now();
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); 
    if (progress > 0.1) {
        const fadeProg = Math.max(0, Math.min(1, (progress - 0.1) / 0.7));
        maskOpacity.value = 1 - fadeProg;
    }
    camera.position.lerpVectors(startPos, targetPos, ease);
    camera.lookAt(0, 0, 0);
    starSpeed = 0.5 * (1 - ease) + 0.02;
    if (progress < 1) {
      requestAnimationFrame(loop);
    } else {
      isIntroFinished.value = true;
      controls.enabled = true;
      maskOpacity.value = 0; 
      starSpeed = 0.02;      
    }
  };
  loop();
};

const startExitAnimation = () => {
  isExiting.value = true;
  controls.enabled = false; 
  const duration = 1000; 
  const startPos = camera.position.clone(); 
  const targetPos = new THREE.Vector3(0, 100, 0); 
  const startTime = Date.now();
  const loop = () => {
    const now = Date.now();
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = progress * progress; 
    camera.position.lerpVectors(startPos, targetPos, ease);
    camera.lookAt(0, 0, 0);
    if(progress > 0.3) {
      const fadeProg = (progress - 0.3) / 0.7;
      maskOpacity.value = fadeProg;
    }
    starSpeed = 0.02 + ease * 0.5;
    if(progress < 1) {
      requestAnimationFrame(loop);
    } else {
      router.push({ name: 'Universe' });
    }
  };
  loop();
};

const createConstellation = () => {
  if (tagsData.length === 0 && articlesData.length === 0) return;
  
  physicsNodes = [];
  physicsLinks = [];
  interactables = [];
  lines = [];
  // 重置映射
  for (const key in nodeMeshMap) delete nodeMeshMap[key];
  
  const nodeMap = {};

  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: themeColor.value, 
    transparent: true, 
    opacity: 0.3 
  });

  // 1. 初始化 标签 (Tags)
  tagsData.forEach(tagData => {
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      0, 
      (Math.random() - 0.5) * 10
    );

    const tagGeo = new THREE.IcosahedronGeometry(1.2, 0);
    const tagMat = new THREE.MeshBasicMaterial({ 
      color: themeColor.value, 
      wireframe: true 
    });
    const tagMesh = new THREE.Mesh(tagGeo, tagMat);
    tagMesh.position.copy(pos);
    tagMesh.userData = { id: `tag-${tagData.name}`, name: tagData.name, type: 'tag', count: tagData.count, isTag: true };
    scene.add(tagMesh);
    interactables.push(tagMesh);
    nodeMeshMap[tagMesh.userData.id] = tagMesh; // 存入映射

    const div = document.createElement('div');
    div.className = 'constellation-label tag-label';
    div.textContent = tagData.name;
    div.style.color = '#ffffff';
    div.style.textShadow = `0 0 10px ${themeColor.value}`;
    const label = new CSS2DObject(div);
    label.position.set(0, 1.8, 0);
    tagMesh.add(label);

    const node = {
      id: tagData.name,
      type: 'tag',
      mesh: tagMesh,
      position: pos,
      velocity: new THREE.Vector3(0,0,0)
    };
    physicsNodes.push(node);
    nodeMap[tagData.name] = node;
  });

  // 2. 初始化 文章 (Articles)
  articlesData.forEach(article => {
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      0, 
      (Math.random() - 0.5) * 10
    );

    const artGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const artMat = new THREE.MeshBasicMaterial({ 
      color: '#ffffff', 
      transparent: true, 
      opacity: 0.9 
    });
    const artMesh = new THREE.Mesh(artGeo, artMat);
    artMesh.position.copy(pos);
    artMesh.userData = { 
      id: article.id, 
      name: article.name, 
      type: 'article',
      summary: article.summary,
      tags: article.tags,
      isArticle: true 
    };
    scene.add(artMesh);
    interactables.push(artMesh);
    nodeMeshMap[article.id] = artMesh; // 存入映射

    const artDiv = document.createElement('div');
    artDiv.className = 'constellation-label article-label';
    const displayName = article.name.length > 20 
      ? article.name.substring(0, 18) + '...' 
      : article.name;
    artDiv.textContent = displayName;
    artDiv.style.color = '#ffffff';
    artDiv.style.fontSize = '10px';
    artDiv.style.fontFamily = "'Orbitron', sans-serif";
    artDiv.style.pointerEvents = 'none'; // 初始为 none，下面会开启
    artDiv.style.whiteSpace = 'nowrap';
    
    // 关键修改：开启文章标签的交互
    artDiv.style.pointerEvents = 'auto'; 
    artDiv.style.cursor = 'pointer';
    artDiv.addEventListener('mouseenter', () => {
        hoveredLabelNode = artMesh.userData;
    });
    artDiv.addEventListener('mouseleave', () => {
        hoveredLabelNode = null;
    });

    const artLabel = new CSS2DObject(artDiv);
    artLabel.position.set(0, 0.8, 0);
    artMesh.add(artLabel);

    const node = {
      id: article.id,
      type: 'article',
      mesh: artMesh,
      position: pos,
      velocity: new THREE.Vector3(0,0,0)
    };
    physicsNodes.push(node);
    nodeMap[article.id] = node;
  });

  // 3. 构建物理连线
  linksData.forEach(link => {
    const tagNode = nodeMap[link.tag];
    const articleNode = nodeMap[link.articleId];

    if (tagNode && articleNode) {
      physicsLinks.push({
        source: tagNode,
        target: articleNode
      });

      const points = [tagNode.position.clone(), articleNode.position.clone()];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, lineMaterial);
      
      // 添加连线动画效果
      line.userData = { 
        originalOpacity: 0.3,
        pulsePhase: Math.random() * Math.PI * 2 
      };
      
      scene.add(line);
      lines.push(line);
    } else if (link.source && link.target) {
      // 3.2 支持通用连接 (id -> id)
      const nodeA = nodeMap[link.source];
      const nodeB = nodeMap[link.target];
      
      if (nodeA && nodeB) {
        physicsLinks.push({
          source: nodeA,
          target: nodeB
        });

        const points = [nodeA.position.clone(), nodeB.position.clone()];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, lineMaterial);
        scene.add(line);
        lines.push(line);
      }
    }
  });

  simulationAlpha = 1.0;
};

onMounted(async () => {
  await fetchConstellationData();
  initThree();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('mousemove', onMouseMove);
  if (renderer) {
    renderer.domElement.removeEventListener('click', onMouseClick);
    renderer.dispose();
  }
});
</script>

<style scoped>
.constellation-container {
  width: 100%;
  height: 100%; 
  position: relative;
  background: black;
  overflow: hidden;
  border-radius: 20px;
}

.constellation-container :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
.constellation-container :deep(.constellation-label) {
  font-family: 'Orbitron', sans-serif;
  color: #e0faff; 
  font-weight: 600;
  letter-spacing: 1px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  text-shadow: 0 0 5px currentColor;
  pointer-events: none; 
  user-select: none;
  
  transform-origin: center center;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
  transform: scale(1) translateZ(0);
  opacity: 1;
}

.constellation-container :deep(.tag-label) {
  font-size: 13px;
  border-color: rgba(0, 255, 255, 0.6);
  background: rgba(0, 20, 40, 0.8);
  padding: 2px 5px; 
}

.constellation-container :deep(.article-label) {
  font-size: 10px; 
  opacity: 0.9; 
  border: 1px solid rgba(255, 255, 255, 0.3); 
  background: rgba(40, 40, 40, 0.8); 
  padding: 2px 8px; 
  border-radius: 12px; 
  text-shadow: none; 
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5); 
}

.constellation-container.is-resizing :deep(.constellation-label) {
  transition: transform 0.15s ease-in, opacity 0.1s;
  transform: scale(0) translateZ(0);
  opacity: 0;
}
.mask-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999; 
  pointer-events: none;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 40px;
  pointer-events: none;
  z-index: 10;
  display: flex;
  /* justify-content: space-between; */
  align-items: flex-start;
  opacity: 0; 
  transition: opacity 1s ease;
  box-sizing: border-box;
}

.ui-overlay.fade-in {
  opacity: 1;
}

.back-btn {
  pointer-events: auto;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 10px 20px;
  cursor: pointer;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 2px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
}

.back-btn:hover {
  background: white;
  color: black;
}

.rag-btn {
  pointer-events: auto;
  background: rgba(0,0,0,0.6);
  border: 1px solid; /* color set inline */
  padding: 10px 20px;
  cursor: pointer;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 2px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  position: fixed;
  bottom: 40px;
  left: 40px;
  z-index: 20;
}

.rag-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
  box-shadow: 0 0 15px currentColor;
}

.category-header {
  /* text-align: right; */
  text-shadow: 0 0 15px currentColor;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center; /* 文本内容居中 */
  top: 40px; /* 匹配父容器的 padding-top，与左侧按钮对齐 */
}

.category-header h1 {
  margin: 0;
  font-size: 2.4rem;
  letter-spacing: 5px;
  text-transform: uppercase;
  font-family: 'Orbitron', sans-serif;
}

.category-header .subtitle {
  color: #888;
  margin: 5px 0 0 0;
  letter-spacing: 3px;
  font-size: 0.8rem;
}

.node-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid;
  padding: 15px;
  border-radius: 4px;
  color: #fff;
  pointer-events: none;
  z-index: 100;
  min-width: 120px; /* 设置最小宽度 */
  /* 【修改点 3】: 移除 min-width 的固定值，或者设置为一个较小值，并允许换行 */
  backdrop-filter: blur(5px);
  opacity: 1;
  transition: opacity 0.2s;
  
  /* 允许内容换行 */
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
@keyframes popIn {
  from { transform: scale(0.8) translate(10px, 10px); opacity: 0; }
  to { transform: scale(1) translate(10px, 10px); opacity: 1; }
}

.node-tooltip h4 {
  margin: 5px 0 0px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 14px; 
}

.node-tooltip p {
  margin: 0px 0 0px 0;
  font-size: 12px; /* Smaller font size for subtitle */
  color: #aaa;
}

/* Sidebar Styles */
.sidebar {
  position: absolute;
  top: 0;
  right: -450px; /* Hidden by default */
  width: 420px;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  transition: right 0.3s ease-in-out;
  z-index: 200;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.sidebar.is-open {
  right: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}

.sidebar-header h2 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  letter-spacing: 2px;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
}

.sidebar-controls {
  margin-bottom: 20px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  padding: 10px;
  padding-right: 40px; /* Space for icon */
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #333;
  border-radius: 4px;
  color: #fff;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.1);
}

.search-btn {
  position: absolute;
  right: 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 5px;
  transition: transform 0.2s;
}

.search-btn:hover {
  transform: scale(1.1);
}

.sort-controls {
  display: flex;
  gap: 10px;
}

.sort-controls button {
  flex: 1;
  padding: 5px;
  background: transparent;
  border: 1px solid #333;
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.sort-controls button.active {
  color: #000;
  font-weight: bold;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.article-item {
  padding: 12px 20px;
  margin-bottom: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 12px; /* 稍微圆角的块 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative; /* For menu positioning */
}

.article-item:hover {
  background: rgba(255, 255, 255, 0.1);
  /* transform: translateX(5px); Removed to prevent scrollbar */
}

.article-info {
  flex: 1;
  overflow: hidden;
}

.article-title {
  margin: 0 0 2px 0;
  font-size: 0.75rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-date {
  font-size: 0.65rem;
  color: #888;
  margin: 0;
}

.article-actions {
  position: relative;
  margin-left: 10px;
}

.more-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
  transition: color 0.2s;
}

.more-btn:hover {
  color: #fff;
}

.action-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background: #222;
  border: 1px solid #444;
  border-radius: 4px;
  z-index: 10;
  min-width: 100px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  overflow: hidden;
}

.action-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  background: none;
  border: none;
  color: #eee;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.action-menu button:hover {
  background: #333;
}

.action-menu button.delete-btn:hover {
  background: #4a1a1a;
  color: #ff6b6b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.rename-modal {
  background: #1a1a1a;
  padding: 25px;
  border-radius: 12px;
  width: 300px;
  border: 1px solid #333;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
}

.rename-modal h3 {
  margin: 0 0 20px 0;
  color: #fff;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
  text-align: center;
}

.rename-input {
  width: 100%;
  padding: 10px;
  background: #000;
  border: 1px solid #333;
  border-radius: 4px;
  color: #fff;
  margin-bottom: 20px;
  box-sizing: border-box;
}

.rename-input:focus {
  outline: none;
  border-color: #fff;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.modal-actions button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: opacity 0.2s;
}

.modal-actions button:hover {
  opacity: 0.8;
}

.cancel-btn {
  background: #333;
  color: #aaa;
}

.confirm-btn {
  color: #000; /* Text color on theme background */
}

/* Delete Modal Styles */
.delete-modal {
  background: #1a1a1a;
  padding: 30px;
  border-radius: 12px;
  width: 320px;
  border: 1px solid #333;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  text-align: center;
}

.delete-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.delete-modal h3 {
  margin: 0 0 15px 0;
  color: #fff;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.3rem;
}

.delete-warning {
  color: #eee;
  margin: 0 0 10px 0;
  font-size: 0.95rem;
  word-break: break-word;
}

.delete-hint {
  color: #888;
  margin: 0 0 20px 0;
  font-size: 0.85rem;
}

.delete-confirm-btn {
  background: #d32f2f;
  color: #fff;
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: opacity 0.2s;
}

.delete-confirm-btn:hover {
  opacity: 0.8;
  background: #b71c1c;
}

.no-data {
  text-align: center;
  color: #666;
  margin-top: 50px;
}
.node-tags {
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  gap: 6px;        /* 标签间距 */
  margin-top: 7px; /* 与上方标题的距离 */
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1); /* 可选：加一条分割线让视觉更清晰 */
}

/* 单个标签胶囊 */
.tag-capsule {
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.85);
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  backdrop-filter: blur(2px);
  white-space: nowrap; /* 防止标签文字内部换行 */
  transition: background-color 0.2s;
}

/* 可选：鼠标悬浮在标签上稍微亮一点，虽然tooltip本身不交互，但在视觉上更精致 */
.tag-capsule:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}
</style>

<style>
.constellation-label {
  pointer-events: none;
  user-select: none;
}
</style>
