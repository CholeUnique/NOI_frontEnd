<template>
  <div class="archives-container">
    <div class="header-section">
      <h1 class="page-title">数据档案</h1>
      <div class="controls">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="搜索数据模块..." v-model="searchQuery">
        </div>
        <button class="upload-btn">
          <span>+</span> 上传数据
        </button>
      </div>
    </div>

    <div class="table-container glass-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>文件名</th>
            <th>类型</th>
            <th>大小</th>
            <th>日期</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in filteredFiles" :key="file.assetId">
            <td class="col-id">#{{ file.shortId }}</td>
            <td class="col-name">
              <span class="file-icon">📄</span>
              {{ file.name }}
            </td>
            <td>{{ file.type }}</td>
            <td>{{ file.size }}</td>
            <td>{{ file.date }}</td>
            <td>
              <span class="status-badge" :class="file.statusClass">
                {{ file.status }}
              </span>
            </td>
            <td>
              <button class="action-btn delete" title="删除" @click="openDeleteModal(file)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 删除确认弹窗 -->
    <transition name="fade">
      <div
        v-if="deleteModal.open"
        class="modal-overlay"
        role="presentation"
        @click.self="closeDeleteModal"
      >
        <transition name="modal-pop">
          <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div class="modal-header">
              <div class="modal-icon" aria-hidden="true">🗑️</div>
              <div class="modal-titles">
                <div id="delete-modal-title" class="modal-title">确认删除</div>
                <div class="modal-subtitle">该操作不可撤销</div>
              </div>
              <button class="modal-close" title="关闭" @click="closeDeleteModal">×</button>
            </div>

            <div class="modal-body">
              <div class="modal-file">
                <div class="modal-file-label">文件</div>
                <div class="modal-file-name" :title="deleteModal.fileName || ''">
                  {{ deleteModal.fileName || '（未知文件）' }}
                </div>
              </div>
              <div class="modal-hint">
                将同时删除服务器记录与本地文件；若已同步到知识库，也会触发后端清理。
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn-secondary" :disabled="deleteModal.deleting" @click="closeDeleteModal">
                取消
              </button>
              <button class="btn-danger" :disabled="deleteModal.deleting" @click="confirmDelete">
                <span v-if="deleteModal.deleting" class="btn-spinner" aria-hidden="true"></span>
                {{ deleteModal.deleting ? '删除中...' : '删除' }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '../stores/auth';
import { API_CONFIG } from '../config/api';

const authStore = useAuthStore();
const searchQuery = ref('');
const files = ref([]);
const isLoading = ref(false);
const API_BASE = `${API_CONFIG.base.url}/api/v1`;

const deleteModal = ref({
  open: false,
  deleting: false,
  assetId: null,
  fileName: ''
});

const fetchFiles = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`${API_BASE}/assets/list`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });
    const result = await response.json();
    if (result.code === 200 && result.data) {
      files.value = result.data.map(asset => {
        // 解析文件类型
        const nameParts = asset.filename.split('.');
        const ext = nameParts.length > 1 ? nameParts.pop().toUpperCase() : 'UNKNOWN';
        
        // 映射状态
        let status = 'UNKNOWN';
        let statusClass = 'processing';
        
        if (asset.status === 'completed') {
            status = 'INDEXED';
            statusClass = 'indexed';
        } else if (asset.status === 'failed') {
            status = 'ERROR';
            statusClass = 'error';
        } else if (asset.status === 'parsing' || asset.status === 'uploading_to_ai') {
            status = 'PROCESSING';
            statusClass = 'processing';
        }

        return {
          assetId: asset.id, // 完整ID用于后端删除/详情
          shortId: asset.id.substring(0, 8), // UI 展示用短ID
          name: asset.filename,
          type: ext,
          size: formatSize(asset.size || asset.meta_info?.file_size || 0),
          date: formatRelativeTime(asset.created_at),
          status: status,
          statusClass: statusClass,
          rawStatus: asset.status
        };
      });
    }
  } catch (error) {
    console.error('获取文件列表失败:', error);
  } finally {
    isLoading.value = false;
  }
};

const formatSize = (bytes) => {
  if (bytes === 0) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

const openDeleteModal = (file) => {
  if (!file?.assetId) return;
  deleteModal.value = {
    open: true,
    deleting: false,
    assetId: file.assetId,
    fileName: file.name || ''
  };
};

const closeDeleteModal = () => {
  if (deleteModal.value.deleting) return;
  deleteModal.value.open = false;
};

const confirmDelete = async () => {
  const id = deleteModal.value.assetId;
  if (!id || deleteModal.value.deleting) return;

  deleteModal.value.deleting = true;
  try {
    const response = await fetch(`${API_BASE}/assets/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `删除失败: HTTP ${response.status}`);
    }

    const result = await response.json().catch(() => ({}));
    if (result?.data?.warnings) {
      console.warn('删除完成但有警告:', result.data.warnings);
    }

    files.value = files.value.filter(f => f.assetId !== id);
    deleteModal.value.open = false;
  } catch (e) {
    console.error('删除文件失败:', e);
    alert(e?.message || '删除失败');
  } finally {
    deleteModal.value.deleting = false;
  }
};

const handleKeydown = (e) => {
  if (e.key === 'Escape' && deleteModal.value.open) {
    closeDeleteModal();
  }
};

onMounted(() => {
    fetchFiles();
    window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value;
  return files.value.filter(file => 
    file.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
</script>

<style scoped>
.archives-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 1.8rem;
  color: #f1f5f9;
  letter-spacing: 0.5px;
  margin: 0;
}

.controls {
  display: flex;
  gap: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  width: 300px;
  transition: all 0.3s ease;
}
.search-box:focus-within {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.1);
}

.search-icon {
  margin-right: 8px;
  opacity: 0.6;
  color: #94a3b8;
}

.search-box input {
  background: transparent;
  border: none;
  color: #f1f5f9;
  width: 100%;
  outline: none;
  font-size: 0.9rem;
}
.search-box input::placeholder {
  color: #64748b;
}

.upload-btn {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.glass-panel {
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  flex: 1;
  overflow: hidden; /* For table scroll */
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.table-container {
  overflow-y: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.data-table th {
  background: rgba(15, 23, 42, 0.4);
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table tr:hover {
  background: rgba(56, 189, 248, 0.02);
}

.col-id {
  font-family: 'JetBrains Mono', monospace;
  color: #64748b;
  font-size: 0.85rem;
}

.col-name {
  color: #f1f5f9;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.file-icon {
  opacity: 0.8;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.status-badge.indexed {
  background: rgba(16, 185, 129, 0.1); /* Emerald */
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-badge.processing {
  background: rgba(245, 158, 11, 0.1); /* Amber */
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-badge.error {
  background: rgba(239, 68, 68, 0.1); /* Red */
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
  font-size: 1.1rem;
}

.action-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* ===== 删除确认弹窗 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(1200px 600px at 50% 30%, rgba(56, 189, 248, 0.10), transparent 60%),
              rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(10px);
}

.modal-card {
  width: min(520px, 100%);
  border-radius: 16px;
  background: rgba(30, 41, 59, 0.62);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(56, 189, 248, 0.06) inset;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: rgba(15, 23, 42, 0.35);
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.modal-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.20);
  box-shadow: 0 0 22px rgba(239, 68, 68, 0.12);
}

.modal-titles {
  flex: 1;
  min-width: 0;
}

.modal-title {
  font-weight: 800;
  letter-spacing: 0.3px;
  color: #f1f5f9;
}

.modal-subtitle {
  margin-top: 2px;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.95);
}

.modal-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.35);
  color: rgba(226, 232, 240, 0.9);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
}

.modal-close:hover {
  background: rgba(15, 23, 42, 0.55);
  transform: translateY(-1px);
}

.modal-body {
  padding: 18px;
}

.modal-file {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.25);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.modal-file-label {
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.95);
  width: 44px;
  flex: 0 0 auto;
}

.modal-file-name {
  flex: 1;
  min-width: 0;
  color: #e2e8f0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-hint {
  margin-top: 12px;
  color: rgba(148, 163, 184, 0.95);
  font-size: 0.9rem;
  line-height: 1.45;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 18px 18px;
}

.btn-secondary,
.btn-danger {
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, opacity 0.15s ease;
}

.btn-secondary {
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.18);
  color: rgba(226, 232, 240, 0.92);
}

.btn-secondary:hover {
  transform: translateY(-1px);
  background: rgba(148, 163, 184, 0.16);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.22);
  color: #fecaca;
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.05) inset;
}

.btn-danger:hover {
  transform: translateY(-1px);
  background: rgba(239, 68, 68, 0.22);
  box-shadow: 0 10px 30px rgba(239, 68, 68, 0.12);
}

.btn-secondary:disabled,
.btn-danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 8px;
  border-radius: 999px;
  border: 2px solid rgba(226, 232, 240, 0.35);
  border-top-color: rgba(226, 232, 240, 0.95);
  animation: spin 0.9s linear infinite;
  vertical-align: -2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-pop-enter-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.modal-pop-leave-active {
  transition: transform 0.14s ease, opacity 0.14s ease;
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
