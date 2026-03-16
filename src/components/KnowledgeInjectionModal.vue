<template>
  <div v-if="show" class="modal-overlay" @click.self="closeModal">
    <div class="upload-modal">
      <div class="modal-corner top-left"></div>
      <div class="modal-corner top-right"></div>
      <div class="modal-corner bottom-left"></div>
      <div class="modal-corner bottom-right"></div>

      <div class="modal-header">
        <h2>知识注入程序</h2>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="drop-zone" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop" @click="triggerFileSelect" :class="{ 'dragging': isDragging }">
        <input type="file" ref="fileInput" multiple @change="handleFileSelect" style="display: none"
          accept=".pdf,.md,.txt,.doc,.docx,.mp4,.mp3,.wav" />
        <div class="drop-icon">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p>拖拽文件至此 或 <span class="highlight">点击选择</span></p>
        <div class="supported-types">支持格式: PDF, MD, TXT, DOCX, MP4, MP3, WAV</div>
      </div>

      <!-- 修改点：添加滚动事件监听，滚动时隐藏 Tooltip -->
      <div class="file-list custom-scrollbar" @scroll="hideTooltip">

        <!-- 第一部分：活跃任务列表 -->
        <div class="list-section" v-if="activeFiles.length > 0">
          <div class="section-title active-title">待处理任务</div>
          <div v-for="file in activeFiles" :key="file.id" class="file-item is-active">
            <div class="file-icon">{{ getFileIcon(file.name) }}</div>
            <div class="file-content">
              <div class="file-header">
                <span class="file-name" :title="file.name">{{ file.name }}</span>
                <span class="file-size">{{ file.sizeStr }}</span>
                
                <!-- 等待处理状态：和文件名同一行 -->
                <div v-if="file.status === 'pending'" class="status-inline pending">
                  <span class="status-dot"></span>
                  <span class="status-text">等待处理</span>
                  <button class="cancel-btn" @click.stop="removeFile(file.id)" title="取消任务">✕</button>
                </div>
              </div>

              <div class="file-status-bar" v-if="file.status !== 'pending'">
                <!-- 2. 正在传输 -->
                <div v-if="file.status === 'uploading_to_ai'" class="status-row uploading">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: (file.mockProgress || 0) + '%' }"></div>
                  </div>
                  <span class="status-text">正在传输 {{ Math.round(file.mockProgress || 0) }}%</span>
                </div>

                <!-- 3. AI 解析中 -->
                <div v-if="file.status === 'parsing'" class="status-row parsing">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: (file.mockProgress || 30) + '%' }"></div>
                  </div>
                  <div class="status-info">
                    <span class="spin-loader">⟳</span>
                    <span class="status-text blink">AI 深度阅读中 {{ Math.round(file.mockProgress || 30) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分割线：进行中 -> 失败 -->
        <div class="list-divider" v-if="activeFiles.length > 0 && failedFiles.length > 0"></div>

        <!-- 第二部分：失败文件列表 -->
        <div class="list-section failed-section" v-if="failedFiles.length > 0">
          <div class="section-title failed-title">异常任务</div>
          <div v-for="file in failedFiles" :key="file.id" class="file-item is-failed">
            <div class="file-icon">{{ getFileIcon(file.name) }}</div>
            <div class="file-content">
              <div class="file-header">
                <span class="file-name" :title="file.name">{{ file.name }}</span>
                <span class="file-size">{{ file.sizeStr }}</span>
                
                <!-- 失败状态：和文件名同一行 -->
                <div class="status-inline failed">
                  <span class="fail-mark">✕</span>
                  <div class="error-wrapper" 
                       @mouseenter="showErrorTooltip($event, file.errorMsg)"
                       @mouseleave="hideErrorTooltip">
                    <span class="status-text error-text">解析失败</span>
                  </div>
                  <div class="action-group">
                    <button class="text-btn retry" @click.stop="retryFile(file)" :disabled="file.isDeleting">重试</button>
                    <button class="text-btn delete" @click.stop="removeFile(file.id)" :disabled="file.isDeleting">
                      <span v-if="file.isDeleting" class="spin-loader">⟳</span>
                      <span v-else>删除</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分割线：失败/进行中 -> 已收录 -->
        <div class="list-divider" v-if="(activeFiles.length > 0 || failedFiles.length > 0) && mergedCompletedFiles.length > 0"></div>

        <!-- 第二部分：已收录列表 -->
        <div class="list-section completed-section" v-if="mergedCompletedFiles.length > 0">
          <div class="section-title">近三日收录</div>

          <div v-if="isLoadingHistory && mergedCompletedFiles.length === 0" class="loading-history">
            读取历史记录...
          </div>

          <div v-for="file in mergedCompletedFiles" :key="file.id" class="file-item is-completed">
            <div class="file-icon">{{ getFileIcon(file.name) }}</div>
            <div class="file-content">
              <div class="file-header">
                <span class="file-name" :title="file.name">{{ file.name }}</span>
                <span class="file-size">{{ file.sizeStr }}</span>
              </div>
              <div class="file-status-bar">

                <!-- 4. 已完成 (升级版：智能归类展示) -->
                <div class="status-row completed">
                  <div class="progress-track" style="display:none;">
                    <div class="progress-fill" style="width: 100%"></div>
                  </div>

                  <div class="result-badges right-aligned">

                    <span class="check-mark">✓</span>

                    <span class="detail-link" 
                          @mouseenter="showTooltip($event, file)"
                          @mouseleave="hideTooltip">查看归档详情</span>

                    <span class="date-tag-end" v-if="file.date">{{ file.date }}</span>

                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="modal-footer">
        <button class="action-btn" @click="startBatchProcessing" :disabled="isProcessing || activeFiles.length === 0">
          <span class="btn-content">{{ isProcessing ? '后台处理中...' : '开始注入' }}</span>
          <div class="btn-glitch"></div>
        </button>
      </div>
    </div>

    <!-- 全局单例悬浮卡片 -->
    <transition name="fade">
      <div v-if="tooltipState.show" class="info-tooltip fixed-tooltip"
        :style="{ bottom: tooltipState.bottom + 'px', left: tooltipState.x + 'px' }">
        <div class="tooltip-arrow"></div>
        <div class="tt-header">知识归档详情</div>
        <div class="tt-row" v-if="tooltipState.file.categories?.length">
          <span class="tt-label">领域:</span>
          <span class="tt-val highlight">{{ tooltipState.file.categories.join(', ') }}</span>
        </div>
        <div class="tt-row" v-if="tooltipState.file.tags?.length">
          <span class="tt-label">标签:</span>
          <div class="tt-tags-wrap">
            <span v-for="t in tooltipState.file.tags" :key="t" class="tt-tag-item">{{ t }}</span>
          </div>
        </div>
        <!-- 修改点：移除悬浮框里的时间显示 -->
      </div>
    </transition>

    <!-- 错误提示 Tooltip (全局 fixed 定位) -->
    <transition name="fade">
      <div v-if="errorTooltipState.show" 
           class="error-tooltip-fixed"
           :style="{ top: errorTooltipState.y + 'px', left: errorTooltipState.x + 'px' }">
        <div class="tooltip-arrow"></div>
        {{ errorTooltipState.message }}
      </div>
    </transition>

    <!-- Toast 提示 -->
    <transition name="toast">
      <div v-if="toastState.show" class="toast-notification" :class="toastState.type">
        <span class="toast-icon">⚠</span>
        <span class="toast-message">{{ toastState.message }}</span>
        <button class="toast-close" @click="toastState.show = false">×</button>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useGalaxyStore } from '../stores/galaxy';
import { API_CONFIG } from '../config/api';

const props = defineProps({
  show: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'upload-complete']);

const isDragging = ref(false);
const fileInput = ref(null);
const uploadFiles = ref([]); 
const historyFiles = ref([]); 
const isProcessing = ref(false); 
const isLoadingHistory = ref(false);
const authStore = useAuthStore();
const galaxyStore = useGalaxyStore();

// --- Toast 提示状态 ---
const toastState = ref({
  show: false,
  message: '',
  type: 'warning' // 'warning' | 'error' | 'success'
});

// 显示重复文件提示
const showDuplicateToast = (duplicates) => {
  const messages = duplicates.map(d => `「${d.name}」${d.reason}`).join('、');
  toastState.value = {
    show: true,
    message: `${messages}`,
    type: 'warning'
  };
  // 3秒后自动隐藏
  setTimeout(() => {
    toastState.value.show = false;
  }, 3000);
};

// --- Tooltip 状态 ---
const tooltipState = ref({
  show: false,
  x: 0,
  bottom: 0,
  file: {}
});

// --- 错误提示 Tooltip 状态 ---
const errorTooltipState = ref({
  show: false,
  x: 0,
  y: 0,
  message: ''
});

// 显示错误提示 Tooltip
const showErrorTooltip = (event, errorMsg) => {
  if (!errorMsg) return;
  const rect = event.currentTarget.getBoundingClientRect();
  errorTooltipState.value = {
    show: true,
    x: rect.left + rect.width / 2,
    y: rect.top - 10,
    message: errorMsg
  };
};

const hideErrorTooltip = () => {
  errorTooltipState.value.show = false;
};

// 计算 Tooltip 位置并显示
const showTooltip = (event, file) => {
  const rect = event.currentTarget.getBoundingClientRect();
  // 计算悬浮框位置：水平居中于目标元素
  const tooltipX = rect.left + rect.width / 2;
  // 使用 bottom 定位：窗口高度 - 目标元素顶部位置 + 间距
  const tooltipBottom = window.innerHeight - rect.top;
  
  tooltipState.value = {
    show: true,
    x: tooltipX,
    bottom: tooltipBottom,
    file: file
  };
};

const hideTooltip = () => {
  tooltipState.value.show = false;
};

// 进行中的文件（不包含已完成和失败）
const activeFiles = computed(() => {
  return uploadFiles.value.filter(f => !['completed', 'failed'].includes(f.status));
});

// 失败的文件
const failedFiles = computed(() => {
  return uploadFiles.value.filter(f => f.status === 'failed');
});

const mergedCompletedFiles = computed(() => {
  const currentCompleted = uploadFiles.value.filter(f => f.status === 'completed');
  // 去重逻辑
  const currentIds = new Set(uploadFiles.value.map(f => f.assetId).filter(Boolean));
  const filteredHistory = historyFiles.value.filter(f => !currentIds.has(f.id));

  // Fake fixed video item
  const fakeVideo = {
    id: 'fake-rag-video-1',
    name: 'AWS re:Invent 2025 - Knowledge Graphs for AI.mp4',
    status: 'completed',
      date: '2小时前',
    mockProgress: 100,
    summary: 'A comprehensive comparison between traditional RAG and GraphRAG methodologies.',
    tags: ['RAG', 'GraphRAG', 'Video'],
    categories: ['Artificial Intelligence']
  };

  return [...currentCompleted, fakeVideo, ...filteredHistory];
});

// --- API 配置 ---
const API_BASE = `${API_CONFIG.base.url}/api/v1`;

// --- 真实 API 调用 ---

/**
 * 获取近三天已收录的文档列表
 */
const fetchRecentIndexedDocs = async () => {
  isLoadingHistory.value = true;
  try {
    const response = await fetch(`${API_BASE}/assets/list`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });
    const result = await response.json();
    if (result.code === 200 && result.data) {
      return result.data
        .filter(asset => asset.status === 'completed')
        .slice(0, 20)
        .map(asset => ({
          id: asset.id,
          name: asset.filename,
          status: 'completed',
          sizeStr: '', 
          date: formatRelativeTime(asset.created_at),
          mockProgress: 100,
          summary: asset.summary,
          tags: asset.tags || [],
          categories: asset.categories || []
        }));
    }
    return [];
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
};

/**
 * 上传文件到后端
 */
const uploadFileToBackend = async (fileObj) => {
  const formData = new FormData();
  formData.append('file', fileObj.file);
  
  const response = await fetch(`${API_BASE}/upload/file`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${authStore.token}`}
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { detail: errorData.detail || `上传失败: HTTP ${response.status}` };
  }
  
  const result = await response.json();
  
  if (result.code === 200 && result.data) {
    return {
      status: result.data.status,
      assetId: result.data.asset_id,
      filename: result.data.filename
    };
  } else {
    throw { detail: result.message || '上传失败' };
  }
};

/**
 * 轮询获取文件处理状态
 */
const fetchFileStatus = async (fileObj) => {
  try {
    const response = await fetch(`${API_BASE}/assets/${fileObj.assetId}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });
    
    if (!response.ok) {
       return { status: 'parsing', mockProgress: 50, errorReason: '' };
    }
    const result = await response.json();
    
    if (result.code === 200 && result.data) {
      const asset = result.data;
      if (asset) {
        const statusMap = {
          'uploaded': { status: 'uploading_to_ai', progress: 25 },
          'uploading_to_ai': { status: 'uploading_to_ai', progress: 30 },
          'parsing': { status: 'parsing', progress: 60 },
          'completed': { status: 'completed', progress: 100 },
          'failed': { status: 'failed', progress: 0 }
        };
        
        const mapped = statusMap[asset.status] || { status: asset.status, progress: 50 };
        return {
          status: mapped.status,
          mockProgress: mapped.progress,
          errorReason: asset.status === 'failed' ? (asset.summary || '解析失败') : '',
          summary: asset.summary,
          tags: asset.tags,
          categories: asset.categories
        };
      }
    }
    return { status: 'parsing', mockProgress: 50, errorReason: '' };
  } catch (error) {
    return { status: 'parsing', mockProgress: 50, errorReason: '' };
  }
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
};

watch(() => props.show, async (newVal) => {
  if (newVal) {
    isLoadingHistory.value = true;
    try {
        const data = await fetchRecentIndexedDocs();
        historyFiles.value = data;
    } finally {
        isLoadingHistory.value = false;
    }
  }
});

// --- Business Logic ---

const closeModal = () => {
  const hasActiveTasks = uploadFiles.value.some(f => 
    ['pending', 'uploading_to_ai', 'parsing'].includes(f.status)
  );
  if (!hasActiveTasks) {
    emit('close');
  }
};

const triggerFileSelect = () => { fileInput.value.click(); };

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (filename) => {
  if (!filename) return '📄';
  const lowerName = filename.toLowerCase();
  
  // Video
  if (/\.(mp4|mov|avi|mkv|webm)$/i.test(lowerName)) return '🎬';
  
  // Audio
  if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(lowerName)) return '🎵';
  
  // Default Document
  return '📄';
};

/**
 * 检查数据库中是否存在同名文件
 */
const checkDuplicatesInDB = async (filenames) => {
  try {
    const response = await fetch(`${API_BASE}/assets/check-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ filenames })
    });
    
    if (!response.ok) return [];
    
    const result = await response.json();
    if (result.code === 200 && result.data?.duplicates) {
      return result.data.duplicates;
    }
    return [];
  } catch (error) {
    console.error('检查重复文件失败:', error);
    return [];
  }
};

const addFiles = async (files) => {
  const duplicates = [];
  const filesToCheck = [];
  const filesArray = Array.from(files);
  
  // 第一步：检查前端内存中的重复
  for (const file of filesArray) {
    const isDuplicateActive = uploadFiles.value.find(f => f.name === file.name);
    if (isDuplicateActive) {
      duplicates.push({ name: file.name, reason: '已在待处理列表中' });
    } else {
      filesToCheck.push(file);
    }
  }
  
  // 第二步：调用后端接口检查数据库中的重复
  if (filesToCheck.length > 0) {
    const dbDuplicates = await checkDuplicatesInDB(filesToCheck.map(f => f.name));
    const dbDuplicateNames = new Set(dbDuplicates.map(d => d.filename));
    
    for (const file of filesToCheck) {
      if (dbDuplicateNames.has(file.name)) {
        const dupInfo = dbDuplicates.find(d => d.filename === file.name);
        const statusText = dupInfo?.status === 'completed' ? '已收录' : 
                          dupInfo?.status === 'failed' ? '上次解析失败' : '处理中';
        duplicates.push({ name: file.name, reason: statusText });
      } else {
        // 没有重复，添加到上传列表
        uploadFiles.value.push({
          id: Date.now() + Math.random(),
          file: file, 
          name: file.name,
          sizeStr: formatSize(file.size),
          status: 'pending',
          progress: 0,
          startTime: 0,
          mockProgress: 0,
          assetId: null, 
          errorMsg: '',
          isDeleting: false,
          categories: [],
          tags: []
        });
      }
    }
  }
  
  // 显示重复文件提示
  if (duplicates.length > 0) {
    showDuplicateToast(duplicates);
  }
};

const handleFileSelect = async (event) => { await addFiles(event.target.files); event.target.value = ''; };
const handleDrop = async (event) => { isDragging.value = false; await addFiles(event.dataTransfer.files); };

/**
 * 🔥 删除文件 - 同时删除后端记录和 RAGFlow 文档
 */
const removeFile = async (id) => {
  const fileObj = uploadFiles.value.find(f => f.id === id);
  if (!fileObj) return;
  
  if (fileObj.assetId) {
    // 有 assetId，需要调用后端删除接口
    fileObj.isDeleting = true;
    
    try {
      const response = await fetch(`${API_BASE}/assets/${fileObj.assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('删除失败:', errorData.detail || response.status);
        // 即使后端删除失败，也从前端列表移除（避免卡住）
      } else {
        const result = await response.json();
        if (result.data?.warnings) {
          console.warn('删除警告:', result.data.warnings);
        }
      }
    } catch (error) {
      console.error('删除请求异常:', error);
    } finally {
      fileObj.isDeleting = false;
    }
  }
  
  // 从前端列表移除
  uploadFiles.value = uploadFiles.value.filter(f => f.id !== id);
};

/**
 * 🔥 重试文件处理 - 智能判断从哪一步开始
 * 如果有 assetId，调用后端重试接口（从失败步骤继续）
 * 如果没有 assetId，重新上传文件
 */
const retryFile = async (fileObj) => {
  // 重置 UI 状态
  fileObj.errorMsg = '';
  fileObj.mockProgress = 0;
  isProcessing.value = true;

  if (fileObj.assetId) {
    // 有 assetId，调用后端重试接口
    try {
      fileObj.status = 'uploading_to_ai';
      fileObj.startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/assets/${fileObj.assetId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { detail: errorData.detail || `重试失败: HTTP ${response.status}` };
      }
      
      const result = await response.json();
      
      if (result.code === 200) {
        console.log(`🔄 从 ${result.data.retry_from} 步骤重试`);
        // 根据返回的状态更新 UI
        fileObj.status = result.data.status;
        if (result.data.status === 'parsing') {
          fileObj.mockProgress = 50;
        } else {
          fileObj.mockProgress = 20;
        }
        // 开始轮询状态
        startPolling(fileObj);
      } else {
        throw { detail: result.message || '重试失败' };
      }
    } catch (error) {
      fileObj.status = 'failed';
      fileObj.errorMsg = error.detail || '重试请求失败';
      checkAllFinished();
    }
  } else {
    // 没有 assetId，需要重新上传文件
    if (!fileObj.file) {
      fileObj.status = 'failed';
      fileObj.errorMsg = '文件对象丢失，请删除后重新添加';
      checkAllFinished();
      return;
    }
    fileObj.status = 'pending';
    fileObj.startTime = 0;
    processFileWorkflow(fileObj);
  }
};

const startBatchProcessing = async () => {
  const pendingFiles = activeFiles.value.filter(f => f.status === 'pending');
  if (pendingFiles.length === 0) return;
  isProcessing.value = true;
  pendingFiles.forEach(file => { processFileWorkflow(file); });
};

const processFileWorkflow = async (fileObj) => {
  try {
    fileObj.status = 'uploading_to_ai';
    await simulateUploadProgress(fileObj);
    const res = await uploadFileToBackend(fileObj);
    fileObj.assetId = res.assetId;
    fileObj.startTime = Date.now();
    startPolling(fileObj);
  } catch (error) {
    fileObj.status = 'failed';
    fileObj.errorMsg = error.detail || '未知网络错误';
    checkAllFinished();
  }
};

const simulateUploadProgress = (fileObj) => {
  return new Promise((resolve) => {
    let p = 0;
    const interval = setInterval(() => {
      p += 2 + Math.random() * 3; 
      if (p >= 30) { p = 30; clearInterval(interval); resolve(); }
      fileObj.mockProgress = p;
    }, 100);
  });
};

const startPolling = (fileObj) => {
  const POLL_INTERVAL = 3000;
  const poll = async () => {
    if (fileObj.status === 'completed' || fileObj.status === 'failed') {
      checkAllFinished();
      return;
    }
    try {
      const data = await fetchFileStatus(fileObj);
      if (data.status !== 'failed') {
          fileObj.status = data.status;
          fileObj.mockProgress = data.mockProgress;
          if (data.status === 'completed') {
              fileObj.date = '刚刚';
              fileObj.categories = data.categories || [];
              fileObj.tags = data.tags || [];
              fileObj.summary = data.summary || '';
              // 🔥 文件处理完成后，刷新星球数据
              galaxyStore.refreshCategories(authStore.token);
              emit('upload-complete', { assetId: fileObj.assetId });
          }
      } else {
          fileObj.status = 'failed';
          fileObj.errorMsg = data.errorReason || '解析中断';
      }
      if (fileObj.status !== 'completed' && fileObj.status !== 'failed') {
        setTimeout(poll, POLL_INTERVAL);
      } else {
        checkAllFinished();
      }
    } catch (err) {
      setTimeout(poll, POLL_INTERVAL); 
    }
  };
  setTimeout(poll, POLL_INTERVAL);
};

const checkAllFinished = () => {
  const hasRunning = uploadFiles.value.some(f => ['uploading_to_ai', 'parsing'].includes(f.status));
  if (!hasRunning) isProcessing.value = false;
};
</script>

<style scoped>
/* Research Grade UI System */
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.6); /* Slate 900, 60% */
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.upload-modal {
  position: relative;
  width: 640px;
  background: rgba(30, 41, 59, 0.95); /* Slate 800 */
  border: 1px solid rgba(148, 163, 184, 0.1); /* Slate 400, 10% */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  padding: 32px;
  color: #f1f5f9; /* Slate 100 */
  font-family: 'Inter', system-ui, sans-serif;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

/* Remove decorative corners for cleaner look */
.modal-corner { display: none; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 0;
  border-bottom: none;
}

.modal-header h2 {
  margin: 0;
  color: #f8fafc; /* Slate 50 */
  font-size: 1.25rem; /* 20px */
  font-weight: 600;
  letter-spacing: -0.025em;
  text-shadow: none;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8; /* Slate 400 */
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.drop-zone {
  border: 2px dashed rgba(148, 163, 184, 0.2); /* Slate 400 */
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(15, 23, 42, 0.3); /* Slate 900 */
  margin-bottom: 24px;
}

.drop-zone:hover, .drop-zone.dragging {
  border-color: #38bdf8; /* Sky 400 */
  background: rgba(56, 189, 248, 0.05);
  box-shadow: none;
}

.drop-icon {
  color: #38bdf8; /* Sky 400 */
  margin-bottom: 12px;
  opacity: 0.9;
}

.drop-zone p {
  margin: 0;
  color: #94a3b8; /* Slate 400 */
  font-size: 14px;
  font-family: 'Inter', system-ui, sans-serif;
  letter-spacing: 0;
}

.drop-zone .highlight {
  color: #38bdf8;
  font-weight: 500;
  text-decoration: none;
}

.supported-types {
  margin-top: 8px;
  font-size: 12px;
  color: #64748b; /* Slate 500 */
  letter-spacing: 0;
}

.file-list {
  max-height: 320px;
  overflow-y: auto;
  margin-bottom: 24px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.2);
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  gap: 12px;
  transition: background 0.15s;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.file-icon {
  font-size: 18px;
  opacity: 0.6;
}

.file-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-header {
  display: flex;
  align-items: center;
  font-family: 'Inter', system-ui, sans-serif;
  gap: 10px;
}

.file-name {
  font-size: 13px;
  color: #e2e8f0; /* Slate 200 */
  font-weight: 500;
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: #64748b; /* Slate 500 */
}

/* Status Colors */
.status-inline.pending .status-dot { background: #94a3b8; width: 6px; height: 6px; border-radius: 50%; }
.status-inline.pending .status-text { color: #94a3b8; font-size: 12px; }

.status-inline { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }

.cancel-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  transition: color 0.2s;
  opacity: 0.8;
}

.cancel-btn:hover {
  color: #f43f5e; /* Rose 500 */
  opacity: 1;
}

/* Status Bar & Progress */
.file-status-bar {
  font-size: 11px;
  height: auto;
  display: flex;
  align-items: center;
  width: 100%;
  margin-top: 2px;
}

.status-row { display: flex; align-items: center; gap: 10px; width: 100%; }
.progress-track {
  flex: 1;
  height: 4px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill { height: 100%; transition: width 0.3s ease; border-radius: 2px; }

.uploading { color: #38bdf8; /* Sky 400 */ }
.uploading .progress-fill { background: #38bdf8; box-shadow: none; }

.parsing { color: #fbbf24; /* Amber 400 */ }
.parsing .progress-fill { background: #fbbf24; box-shadow: none; }

.completed { color: #34d399; /* Emerald 400 */ }
.completed .progress-fill { background: #34d399; box-shadow: none; }

.failed { color: #f43f5e; /* Rose 500 */ }
.fail-mark { font-weight: 600; font-size: 12px; }
.error-text { text-decoration: none; border-bottom: 1px dotted #f43f5e; }

/* Buttons */
.modal-footer {
  text-align: right;
  margin-top: 0;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  padding-top: 24px;
}

.action-btn {
  position: relative;
  background: #38bdf8; /* Sky 400 */
  color: #0f172a; /* Slate 900 */
  border: none;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  transition: all 0.2s;
  clip-path: none; /* Remove polygon */
  letter-spacing: 0;
  overflow: hidden;
}

.action-btn:hover:not(:disabled) {
  background: #0ea5e9; /* Sky 500 */
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
  transform: translateY(-1px);
}

.action-btn:disabled {
  background: #334155; /* Slate 700 */
  color: #64748b; /* Slate 500 */
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-glitch { display: none; }

/* Section Headers */
.active-title, .completed-section .section-title, .failed-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 16px;
  background: transparent;
  border-left: none;
  color: #94a3b8; /* Slate 400 */
  margin-bottom: 0;
}

.list-divider {
  height: 1px;
  background: rgba(148, 163, 184, 0.1);
  margin: 0;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.4); }

/* Tooltips */
.fixed-tooltip {
  position: fixed;
  background: rgba(30, 41, 59, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 8px;
  min-width: 200px;
  max-width: 280px;
  z-index: 9999;
  pointer-events: none;
  transform: translateX(-50%);
  font-family: 'Inter', system-ui, sans-serif;
}

.fixed-tooltip::before {
  background: rgba(30, 41, 59, 0.98);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  border-right: 1px solid rgba(148, 163, 184, 0.2);
}

.tt-header {
  font-size: 12px;
  color: #38bdf8; /* Sky 400 */
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  padding-bottom: 8px;
  margin-bottom: 8px;
  font-weight: 600;
}

.tt-row {
  display: flex;
  margin-bottom: 4px;
  font-size: 11px;
  line-height: 1.4;
}

.tt-label {
  color: #94a3b8;
  width: 35px;
  flex-shrink: 0;
}

.tt-val {
  color: #e2e8f0;
}

.tt-val.highlight {
  color: #38bdf8;
}

.tt-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tt-tag-item {
  background: rgba(148, 163, 184, 0.1);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.2);
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 10px;
}

.tt-footer {
  margin-top: 8px;
  font-size: 9px;
  color: #64748b;
  text-align: right;
}

/* 新增：右侧时间标签样式 */
.date-tag-end {
  margin-left: 1px;
  font-size: 10px;
  color: #64748b;
  font-family: sans-serif;
  opacity: 0.8;
  white-space: nowrap;
  display: inline-block;
  width: 45px;
  text-align: right;
  flex-shrink: 0;
}

/* --- 单行布局优化 (针对已完成项目) --- */
.file-item.is-completed .file-content {
  flex-direction: row;
  align-items: center;
}

.file-item.is-completed .file-header {
  flex: 1;
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
  min-width: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
}

.file-item.is-completed .file-name {
  max-width: none;
  flex: 0 1 auto;
}

.file-item.is-completed .file-size {
  margin-left: 0;
  opacity: 0.5;
  font-size: 10px;
  flex-shrink: 0;
}

.file-item.is-completed .file-status-bar {
  width: auto;
  flex-shrink: 0;
  height: auto;
  margin-left: 20px;
}

.detail-link {
  font-size: 11px;
  color: #38bdf8; /* Sky 400 */
  margin-left: 8px;
  margin-right: 8px;
  cursor: help;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
  opacity: 0.8;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}

.detail-link:hover {
  opacity: 1;
  color: #7dd3fc; /* Sky 300 */
  text-shadow: 0 0 5px rgba(56, 189, 248, 0.4);
}

/* Toast 提示样式 */
.toast-notification {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 41, 59, 0.95); /* Slate 800 */
  border: 1px solid;
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10000;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  font-family: 'Inter', system-ui, sans-serif;
  max-width: 500px;
}

.toast-notification.warning { border-color: #fbbf24; box-shadow: 0 0 20px rgba(251, 191, 36, 0.2); }
.toast-notification.error { border-color: #f43f5e; box-shadow: 0 0 20px rgba(244, 63, 94, 0.2); }
.toast-notification.success { border-color: #34d399; box-shadow: 0 0 20px rgba(52, 211, 153, 0.2); }

.toast-icon { font-size: 16px; }
.toast-notification.warning .toast-icon { color: #fbbf24; }
.toast-notification.error .toast-icon { color: #f43f5e; }
.toast-notification.success .toast-icon { color: #34d399; }

.toast-message { font-size: 12px; color: #f1f5f9; line-height: 1.4; }

.toast-close { 
  background: transparent; 
  border: none; 
  color: #94a3b8; 
  font-size: 18px; 
  cursor: pointer; 
  padding: 0 4px;
  margin-left: 8px;
}
.toast-close:hover { color: #f1f5f9; }

/* Toast 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* Action Buttons in List */
.action-group { margin-left: auto; display: flex; gap: 8px; }
.text-btn { background: transparent; border: none; font-size: 11px; padding: 2px 6px; cursor: pointer; border-radius: 4px; transition: all 0.2s; font-weight: 500; }

.text-btn.retry { color: #38bdf8; background: rgba(56, 189, 248, 0.1); }
.text-btn.retry:hover { background: rgba(56, 189, 248, 0.2); }

.text-btn.delete { color: #f43f5e; background: rgba(244, 63, 94, 0.1); }
.text-btn.delete:hover { background: rgba(244, 63, 94, 0.2); }

/* Error Tooltip */
.error-tooltip-fixed {
  position: fixed;
  background: rgba(30, 41, 59, 0.98);
  border: 1px solid #f43f5e;
  color: #fecdd3;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 11px;
  white-space: normal;
  word-break: break-word;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  pointer-events: none;
  font-family: 'Inter', system-ui, sans-serif;
  max-width: 280px;
  line-height: 1.4;
  transform: translate(-50%, -100%);
  margin-top: -8px;
}

.error-tooltip-fixed .tooltip-arrow {
  position: absolute;
  bottom: -5px;
  left: 50%;
  margin-left: -4px;
  width: 8px;
  height: 8px;
  background: rgba(30, 41, 59, 0.98);
  border-bottom: 1px solid #f43f5e;
  border-right: 1px solid #f43f5e;
  transform: rotate(45deg);
}

/* Result Badges */
.result-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.result-badges.right-aligned { margin-left: auto; }

.check-mark { color: #34d399; font-size: 14px; }

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
