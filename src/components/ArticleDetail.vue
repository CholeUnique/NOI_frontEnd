<template>
  <div class="planet-detail-container liquid-theme">
    <header class="control-bridge glass-panel-header">
      <button class="nav-btn back-btn" @click="goBack">
        <span class="icon">❮</span> BACK TO GALAXY
      </button>
      
      <div class="header-meta">
        <span class="system-time">TIME: {{ currentTime }}</span>
      </div>
    </header>

    <main class="data-viewport">
      
      <div v-if="loading" class="loading-signal">
        <div class="scanner-line"></div>
        <p>DECRYPTING SIGNAL FROM /api/v1/assets/{{ articleId }}...</p>
      </div>

      <div v-else-if="error" class="error-mode glass-panel-error">
        <h2 style="color: #ff0055; text-shadow: 0 0 10px #ff0055;">CONNECTION FAILED</h2>
        <p>{{ errorMsg }}</p>
        <button class="nav-btn retry-btn" @click="fetchDetails">RETRY SIGNAL</button>
      </div>

      <div v-else class="file-content">
        
        <div class="file-header glass-panel-meta" v-if="['word', 'text', 'markdown'].includes(articleData.type)">
          <div class="title-row">
            <input 
              v-if="['word', 'text', 'markdown'].includes(articleData.type)"
              v-model="articleData.title"
              class="glass-input title-input"
              type="text"
              @blur="saveTitle"
              @keyup.enter="$event.target.blur()"
              placeholder="ENTER TITLE..."
            />
            <h1 v-else class="file-title">{{ articleData.title }}</h1>
          </div>
          <div class="file-meta-row">
            <div class="author-capsule">
              <div class="avatar-circle">{{ articleData.author.charAt(0) }}</div>
              <span class="meta-text">{{ articleData.author }}</span>
            </div>
            
            <span class="liquid-pill type-pill">
              TYPE: {{ articleData.type.toUpperCase() }}
            </span>
            
            <span class="liquid-pill status-pill" :class="articleData.status">
              STATUS: {{ articleData.status.toUpperCase() }}
            </span>
          </div>
        </div>

        <div class="content-body glass-viewport" :class="{ 'pdf-mode-body': articleData.type === 'pdf' }">
          
          <div v-if="['word', 'text', 'markdown'].includes(articleData.type)" class="editor-mode">
            
            <div v-if="articleData.status !== 'completed'" class="processing-overlay">
              <div class="pulse-ring"></div>
              <p>AI ANALYSIS IN PROGRESS...</p>
            </div>
            
            <div v-else class="quill-wrapper custom-scrollbar">
              <QuillEditor 
                  theme="snow"
                  v-model:content="articleData.content" 
                  contentType="html"
                  :options="editorOptions"
                  class="dark-quill-editor"
              />
              <div class="editor-top-bar glass-toolbar">
                <div class="action-controls">
                    <span v-if="lastSavedTime" class="last-saved">Synced: {{ lastSavedTime }}</span>
                    <button class="save-btn liquid-btn" @click="saveContent" :disabled="isSaving">
                        {{ isSaving ? 'SAVING...' : 'SAVE' }}
                    </button>
                </div>
              </div> 
            </div>
          </div>

          <div v-else-if="articleData.type === 'image'" class="media-mode custom-scrollbar">
             <img v-if="articleData.url" :src="articleData.url" alt="Evidence" class="evidence-img" />
             <div v-else class="error-text glass-message">
               {{ fileErrorMsg || 'IMAGE URL INVALID' }} <br/>
               IMAGE PATH: {{ articleData.filePath }}
             </div>
          </div>

          <div v-else-if="articleData.type === 'pdf'" class="frame-mode pdf-viewer" >
             <div v-if="!articleData.url" class="error-text glass-message">{{ fileErrorMsg || 'PDF URL INVALID' }}</div>
             <!-- <InteractivePdfViewer v-else :url="pdfUrlWithParams" /> -->
              <iframe v-else :src="pdfUrlWithParams" class="portal-frame" ></iframe>
          </div>

          <div v-else class="error-mode glass-message">UNSUPPORTED FORMAT: {{ articleData.type }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted, computed } from 'vue';
    import { useRoute, useRouter } from 'vue-router';
    import axios from 'axios';
    import { useAuthStore } from '../stores/auth';
    import { useArticleStore } from '../stores/article';
    import { API_CONFIG } from '../config/api';
    import InteractivePdfViewer from '@/components/InteractivePdfViewer.vue'; 
    
    // Quill
    import { QuillEditor } from '@vueup/vue-quill';
    import '@vueup/vue-quill/dist/vue-quill.snow.css';

    const route = useRoute();
    const router = useRouter();
    const authStore = useAuthStore();
    const articleStore = useArticleStore();

    const articleId = route.params.id;
    const parentCategory = route.query.category;

    const loading = ref(true);
    const error = ref(false);
    const errorMsg = ref('');
    const fileErrorMsg = ref('');
    const currentTime = ref('');
    const lastSavedTime = ref('');
    const isSaving = ref(false);

    // const Size = Quill.import('attributors/style/size');
    // Size.whitelist = ['small', 'normal', 'large', 'huge'];
    // Quill.register(Size, true);

    // ===== 段首缩进 2 字（全角空格）=====
    function applyFirstLineIndent(quill, range) {
        if (!range) return;

        const [line] = quill.getLine(range.index);
        if (!line) return;

        const text = line.domNode.innerText || '';

        // 防止重复缩进
        if (text.startsWith('　　')) return;

        const index = quill.getIndex(line);
        quill.insertText(index, '　　', 'user');
    }


    // ===== 字号控制 =====
    const FONT_SIZES = ['small', 'normal', 'large', 'huge'];

    function changeFontSize(quill, step) {
        const range = quill.getSelection();
        if (!range) return;

        const format = quill.getFormat(range);
        const current = format.size || 'normal';

        let index = FONT_SIZES.indexOf(current);
        if (index === -1) index = 1;

        index = Math.max(0, Math.min(FONT_SIZES.length - 1, index + step));

        if (range.length === 0) {
            // 无选区：影响后续输入（Word 行为）
            quill.format('size', FONT_SIZES[index], 'user');
        } else {
            // 有选区：只影响选中内容
            quill.formatText(
                range.index,
                range.length,
                { size: FONT_SIZES[index] },
                'user'
            );
        }
    }
    
    // Quill Options
    const editorOptions = {
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
                [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
                [{ 'direction': 'rtl' }],                         // text direction

                [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

                [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                [{ 'font': [] }],
                [{ 'align': [] }],

                ['clean']                                         // remove formatting button
            ],
            keyboard: {
                bindings: {
                    // 保存 (Ctrl/Cmd + S)
                    save: {
                        key: 'S',
                        shortKey: true,
                        handler: () => {
                            saveContent();
                            return false; // Prevent default save action
                        }
                    },
                    // 撤销 (Ctrl/Cmd + Z) - Quill 默认自带，但显式声明更好
                    undo: {
                        key: 'Z',
                        shortKey: true,
                        handler: function() {
                            this.quill.history.undo();
                        }
                    },
                    // 重做 (Ctrl/Cmd + Shift + Z)
                    redo: {
                        key: 'Z',
                        shortKey: true,
                        shiftKey: true,
                        handler: function() {
                            this.quill.history.redo();
                        }
                    },
                    // 加粗 (Ctrl/Cmd + B)
                    bold: {
                        key: 'B',
                        shortKey: true,
                        handler: function(range, context) {
                            this.quill.format('bold', !context.format.bold);
                        }
                    },
                    // 斜体 (Ctrl/Cmd + I)
                    italic: {
                        key: 'I',
                        shortKey: true,
                        handler: function(range, context) {
                            this.quill.format('italic', !context.format.italic);
                        }
                    },
                    // 下划线 (Ctrl/Cmd + U)
                    underline: {
                        key: 'U',
                        shortKey: true,
                        handler: function(range, context) {
                            this.quill.format('underline', !context.format.underline);
                        }
                    },
                    // ===== 对齐（WPS 风格）=====
                    alignCenter: {
                        key: 'E',
                        shortKey: true,
                        handler() {
                            this.quill.format('align', 'center');
                        }
                    },
                    alignLeft: {
                        key: 'L',
                        shortKey: true,
                        handler() {
                            this.quill.format('align', false);
                        }
                    },
                    alignRight: {
                        key: 'R',
                        shortKey: true,
                        handler() {
                            this.quill.format('align', 'right');
                        }
                    },

                    // ===== 上 / 下角标 =====
                    superscript: {
                      key: '.',
                      shortKey: true,
                      shiftKey: true,
                      handler(range, context) {
                          const value =
                              context.format.script === 'super' ? false : 'super';
                          this.quill.format('script', value, 'user');
                      }
                    },
                    subscript: {
                        key: ',',
                        shortKey: true,
                        shiftKey: true,
                        handler(range, context) {
                            const value =
                                context.format.script === 'sub' ? false : 'sub';
                            this.quill.format('script', value, 'user');
                        }
                    },

                    // ===== 字号增减（不冲突、不被吞）=====
                    fontSizeUp: {
                        key: '=',
                        shortKey: true,
                        altKey: true,
                        handler() {
                            changeFontSize(this.quill, +1);
                            return false;
                        }
                    },
                    fontSizeDown: {
                        key: '-',
                        shortKey: true,
                        altKey: true,
                        handler() {
                            changeFontSize(this.quill, -1);
                            return false;
                        }
                    },

                    // ===== 段首缩进 2 字 =====
                    indentTwoChars: {
                        key: 'Tab',
                        shortKey: true,
                        altKey: true,
                        handler(range) {
                            applyFirstLineIndent(this.quill, range);
                            return false;
                        }
                    },


                    // 打印 (Ctrl/Cmd + P) - 阻止浏览器默认打印
                    print: {
                        key: 'P',
                        shortKey: true,
                        handler: () => false
                    }
                }
            },
            history: {
                delay: 1000,
                maxStack: 500,
                userOnly: true
            }
        },
        placeholder: 'No summary generated yet...',
        readOnly: false,
        theme: 'snow'
    };

    // 数据模型
    const articleData = ref({
      id: '',
      title: '',
      author: 'Current User', // 后端未返回用户名，默认为当前用户
      type: 'text',
      status: 'unknown',
      content: '', 
      url: '',
      filePath: ''
    });

    const saveTitle = async () => {
      if (!articleData.value.title) return;
      console.log("Saving new title:", articleData.value.title);
      
      // 复用 saveContent 的逻辑，或者调用专门的 API
      // 这里假设 PATCH 接口同时支持 update title 和 content
      await saveContent(); 
    };

    // 时间更新
    let timer;
    onMounted(() => {
      currentTime.value = new Date().toLocaleTimeString();
      timer = setInterval(() => {
          currentTime.value = new Date().toLocaleTimeString();
      }, 1000);
      
      fetchDetails();
    });

    onUnmounted(() => {
      clearInterval(timer);
    });

    const goBack = () => {
      router.push({ name: 'Constellation', query: { category: parentCategory } });
    };

    // 创建一个专门处理 PDF URL 的计算属性
    const pdfUrlWithParams = computed(() => {
      const url = articleData.value.url;
      const type = articleData.value.type;
      
      if (!url) return '';
      
      // 只有 PDF 类型才添加参数
      if (type === 'pdf') {
        // 检查 URL 是否已经包含 #，避免重复
        // view=FitH 表示 "Fit Horizontal" (适应宽度)
        // toolbar=0 可以隐藏顶部工具栏节省空间（可选）
        // navpanes=0 隐藏左侧缩略图（可选）
        return `${url}#view=FitH&toolbar=0&navpanes=0`;
      }
      
      return url;
    });

    // ---------------------------------------------------------
    // 核心：请求 Python 后端
    // ---------------------------------------------------------
    const fetchDetails = async () => {
      loading.value = true;
      error.value = false;

      try {
        const response = await axios.get(
          `${API_CONFIG.base.url}/api/v1/assets/${articleId}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`
            }
          }
        );
        
        console.log("📡 后端原始返回:", response);

        let backendData = null;

        if (response.data && response.data.data) {
            backendData = response.data.data;
        } 
        else if (response.data && response.code === 200) {
            backendData = response.data;
        }
        else if (response.data && response.data.filename) {
            backendData = response.data;
        }
        else if (response.filename) {
            backendData = response;
        }

        if (!backendData) {
            console.error("❌ 数据提取失败，当前 response 结构:", response);
            throw new Error("无法解析后端返回的数据结构");
        }
        
        articleStore.setArticle(backendData);

        // 3. 字段映射 (Mapping)
        const rawFilename = backendData.filename || 'Untitled Asset';
        // 智能拆分文件名和后缀
        const lastDotIndex = rawFilename.lastIndexOf("."); 
        let displayTitle = rawFilename;
        let hiddenExtension = "";
        // 只有当存在点，且点不是第一个字符（排除隐藏文件 .env）时才拆分
        if (lastDotIndex > 0) {
            displayTitle = rawFilename.substring(0, lastDotIndex);
            hiddenExtension = rawFilename.substring(lastDotIndex); // 包含点，例如 ".docx"
        }

        const fileExt = hiddenExtension.replace('.', '').toLowerCase(); 
        const determinedType = determineType(fileExt); // 使用你现有的 helper 函数
        
        // 🔥 2. 核心修改：动态获取作者
        // 优先级：后端返回的作者 > 当前登录用户名 > 默认值
        // 注意：请确认 authStore.user 结构，如果是 authStore.username 请自行调整
        const currentUser = authStore.user?.username || authStore.username || 'Unknown User';
        const realAuthor = backendData.author || backendData.owner || currentUser;

        articleData.value = {
          id: backendData.id || articleId,
          title: displayTitle, // 显示标题（不包含后缀）
          extension: hiddenExtension, // 👈 偷偷藏起来后缀名 (如 ".docx")
          author: realAuthor,                                   
          status: backendData.status || 'unknown',
          type: determinedType,
          content: backendData.summary || 'Content analysis pending...',
          filePath: backendData.file_path || '',
          url: '' 
        };

        // 4. 如果是图片或PDF，获取文件流用于预览
        if (['image', 'pdf'].includes(determinedType)) {
            fileErrorMsg.value = '';
            try {
                const fileResponse = await axios.get(
                    `${API_CONFIG.base.url}/api/v1/assets/${articleId}/file`,
                    {
                        headers: { Authorization: `Bearer ${authStore.token}` },
                        responseType: 'blob'
                    }
                );
                console.log('✅ 成功获取文件流:', fileResponse);
                if (fileResponse.data.type === 'application/json') {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const rawText = reader.result || '';
                        let detailText = rawText;
                        try {
                            const parsed = JSON.parse(rawText);
                            detailText = parsed.detail || rawText;
                        } catch {
                            detailText = rawText;
                        }
                        fileErrorMsg.value = detailText || 'FILE RESPONSE INVALID';
                    };
                    reader.readAsText(fileResponse.data);
                    return; // ⛔ 终止后续逻辑，不要生成 URL
                }
                // 释放之前的 URL (如果有)
                if (articleData.value.url) {
                    URL.revokeObjectURL(articleData.value.url);
                }
                articleData.value.url = URL.createObjectURL(fileResponse.data);
                console.log('✅ 成功创建 Blob URL:', articleData.value.url);
            } catch (fileErr) {
                let detailText = fileErr?.message || 'FILE REQUEST FAILED';
                const blobData = fileErr?.response?.data;
                if (blobData instanceof Blob) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const rawText = reader.result || '';
                        try {
                            const parsed = JSON.parse(rawText);
                            fileErrorMsg.value = parsed.detail || rawText || detailText;
                        } catch {
                            fileErrorMsg.value = rawText || detailText;
                        }
                    };
                    reader.readAsText(blobData);
                } else {
                    fileErrorMsg.value = detailText;
                }
            }
        }

      } catch (err) {
        console.error('Fetch error details:', err);
        error.value = true;
        // 尝试获取更详细的错误信息
        const serverMsg = err.response?.data?.detail || err.message;
        errorMsg.value = `ERROR: ${serverMsg}`;
      } finally {
        loading.value = false;
      }
    };

    // 清理 Blob URL
    onUnmounted(() => {
        if (articleData.value.url && articleData.value.url.startsWith('blob:')) {
            URL.revokeObjectURL(articleData.value.url);
        }
        clearInterval(timer);
    });

    // --- 辅助工具函数 ---

    // 1. 获取后缀名
    const getExtension = (filename) => {
    if (!filename) return '';
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    };

    // 2. 根据后缀判断类型
    const determineType = (ext) => {
    const map = {
        'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'webp': 'image', 'svg': 'image',
        'pdf': 'pdf',
        'doc': 'word', 'docx': 'word', 'odt': 'word', 'odf': 'word',
        'txt': 'text', 'md': 'markdown'
    };
    return map[ext] || 'unknown';
    };

    // 3. 保存内容
    const saveContent = async () => {
        if (isSaving.value) return;
        isSaving.value = true;
        
        try {
          const finalFilename = `${articleData.value.title}${articleData.value.extension}`;
            const payload = {
              filename: finalFilename, // 假设后端用 filename 字段存标题
              summary: articleData.value.content
            };
            
            await axios.patch(
                `${API_CONFIG.base.url}/api/v1/assets/${articleId}`,
                payload,
                {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                }
            );

            // 更新保存时间
            const now = new Date();
            lastSavedTime.value = now.toLocaleTimeString();
            
            // 可以选择弹出一个小的提示，但按钮状态变化已经提供了反馈
        } catch (err) {
            console.error("Save failed:", err);
            alert("Save failed! Please try again.");
        } finally {
            isSaving.value = false;
        }
    };
</script>

<style scoped>
  .planet-detail-container{
    background: radial-gradient(circle at top right, #1a2a3a 0%, #000 100%);
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
  }
  /* =========================================
    顶部导航栏 (Glass Header)
  ========================================= */
  .control-bridge {
    height: 35px;
    display: flex;
    border-bottom: 2px solid #2c3e50;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    
    /* 玻璃特效 */
    background: rgba(5, 10, 16, 0.8);
    backdrop-filter: blur(10px);
    border-bottom: none;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    z-index: 100;
  }

  .nav-btn {
    background: rgba(0, 247, 255, 0.1);
    border: 1px solid rgba(0, 247, 255, 0.3);
    color: var(--accent-cyan);
    padding: 5px 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 600;
    border-radius: var(--radius-sm);
    display: flex; 
    align-items: center; 
    gap: 8px;
    font-size: 10px;
    letter-spacing: 1px;
    margin-top:10px;
  }

  .nav-btn:hover {
    background: var(--accent-cyan);
    color: #000;
    box-shadow: 0 0 15px rgba(0, 247, 255, 0.4);
  }

  .system-time {
    font-family: 'Courier New', monospace;
    color: var(--text-dim);
    font-size: 10px;
  }

  /* =========================================
    主视口布局
  ========================================= */
  .data-viewport {
    flex: 1;
    padding: 10px;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 防止双重滚动 */
  }

  /* 加载动画 */
  .loading-signal {
    text-align: center; margin-top: 100px; color: var(--accent-cyan);
    animation: pulse 2s infinite;
  }

  /* =========================================
    头部元数据 (Meta Panel)
  ========================================= */
  .file-header {
    margin-bottom: 5px;
    padding: 5px 18px;
    
    /* 玻璃面板 */
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 4px 30px rgba(0,0,0,0.2);
  }

  .title-row {
    margin-bottom: 8px;
    position: relative;
  }

  .glass-input.title-input {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 5px 0;
    font-family: inherit;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
    /* 渐变文字效果 */
    background: linear-gradient(90deg, #fff, var(--accent-cyan));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Focus 状态：底部出现光剑般的线条 */
  .glass-input.title-input:focus {
    border-bottom: 2px solid var(--accent-cyan);
    -webkit-text-fill-color: #fff; /* 编辑时取消渐变，保证清晰 */
    background: rgba(255, 255, 255, 0.05);
    padding-left: 10px; /* 稍微缩进 */
    border-radius: 4px;
  }

  .file-title {
    margin: -4px 0 8px 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1px;
    background: linear-gradient(90deg, #fff, var(--accent-cyan));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .file-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  /* 作者胶囊 */
  .author-capsule {
    display: flex; 
    align-items: center; 
    gap: 10px;
    background: rgba(255,255,255,0.05);
    padding: 2px 12px 4px 4px;
    border-radius: 20px;
    border: 1px solid var(--glass-border);
  }
  .avatar-circle {
    width: 24px; height: 24px;
    background: linear-gradient(135deg, var(--accent-cyan), #0066ff);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 12px; color: #fff;
  }
  .meta-text { font-size: 12px; color: var(--text-main); }

  /* 标签胶囊 */
  .liquid-pill {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    border: 1px solid transparent;
    backdrop-filter: blur(5px);
  }
  .type-pill {
    background: rgba(0, 247, 255, 0.1);
    color: var(--accent-cyan);
    border-color: rgba(0, 247, 255, 0.2);
  }
  .status-pill {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-dim);
  }
  .status-pill.completed { color: #00ff88; background: rgba(0, 255, 136, 0.1); }
  .status-pill.parsing { color: #ffcc00; background: rgba(255, 204, 0, 0.1); }

  /* =========================================
    内容视窗 (Glass Viewport)
  ========================================= */
  .content-body {
    height: calc(100vh - 212px);
    flex: 1;
    /* 玻璃面板 */
    background: rgba(10, 15, 20, 0.4);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
    overflow: hidden; /* 内部内容滚动 */
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .pdf-viewer{
    height: 100vh;
  }

  /* ✅ 新增：针对 PDF 模式的覆盖样式 */
  .content-body.pdf-mode-body {
    /* PDF 模式下，因为没有 file-header，高度可以更高 */
    /* 这里假设 header 高度约 80px，所以减去顶部 header (header-meta) 的高度即可 */
    height: calc(100vh - 100px); 
    
    /* ⚠️ 关键：PDF 模式下，content-body 本身不需要 overflow:hidden
      我们把滚动权交给子组件 InteractivePdfViewer
    */
    overflow: hidden; 
    padding: 0; /* 移除可能的内边距 */
  }

  /* 1. 编辑器模式 */
  .editor-mode {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .editor-top-bar {
    padding: 8px 10px;
    background: transparent;
    border-bottom: 1px solid var(--glass-border);
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0; /* 工具栏不许压缩 */
    z-index: 20; /* 确保在内容之上 */
  }
  .quill-flex-container {
    flex: 1; /* 占据剩余所有空间 */
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 防止容器本身滚动，交给内部的 quill */
    min-height: 0; /* Flexbox 嵌套滚动的关键魔法 */
  }

  .action-controls { display: flex; align-items: center; gap: 15px; }
  .last-saved { font-size: 11px; color: var(--text-dim); font-family: monospace; }

  .save-btn {
    background: var(--accent-cyan);
    color: #000;
    border: none;
    padding: 6px 16px;
    border-radius:var(--radius-lg);
    font-size: 11px; font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }
  .save-btn:hover:not(:disabled) {
    background: #fff;
    box-shadow: 0 0 10px var(--accent-cyan);
  }
  .save-btn:disabled {
    background: #333; color: #666; cursor: not-allowed;
  }

  /* Quill 定制 */
  .quill-wrapper {
    flex: 1;
    overflow-y: auto; /* 允许滚动 */
    background: transparent;
    display: flex;
    flex-direction: column;
  }

  /* 核心修复：固定 Toolbar */
  :deep(.ql-toolbar.ql-snow) {
    border: none !important;
    border-bottom: 1px solid var(--glass-border) !important;
    background: rgba(0,0,0,0.2);
    padding:5px;
    gap:5px;
    /* 关键属性：吸附在顶部 */
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(5px);
  }
  
  :deep(.ql-container.ql-snow) {
    border: none !important;
    font-family: 'Roboto', sans-serif;
    font-size: 13px;
    color: #ccc;
    padding:0;
    /* 让 container 占据剩余空间 */
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 防止双滚动条 */
  }

  /* 核心修复：编辑区独立滚动 */
  :deep(.ql-editor) {
    padding: 10px;
    line-height: 1.8;
    flex: 1;
    overflow-y: auto;
  }

  /* 2. 媒体/PDF 模式 */
  .media-mode, .frame-mode {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    background: #000;
  }
  .evidence-img { max-width: 100%; max-height: 100%; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
  .portal-frame { width: 100%; min-height: 100%; border: none; background: #fff; }

  /* 错误/空状态提示 - 玻璃卡片 */
  .glass-message {
    padding: 40px;
    text-align: center;
    border: 1px dashed var(--glass-border);
    border-radius: 12px;
    background: rgba(255,255,255,0.02);
    color: var(--text-dim);
  }


  /* =========================================
    自定义滚动条 (Liquid Scrollbar)
  ========================================= */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 247, 255, 0.3) transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 247, 255, 0.2);
    border-radius: 4px;
    border: 2px solid transparent; /* 制造悬浮感 */
    background-clip: padding-box;
    transition: background 0.3s;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 247, 255, 0.5); /* 悬停变亮 */
  }

  /* 动画 */
  @keyframes pulse {
    0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; }
  }

  .processing-overlay {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; color: var(--accent-cyan); gap: 20px;
  }
  .pulse-ring {
    width: 40px; height: 40px; border: 2px solid var(--accent-cyan);
    border-radius: 50%; animation: pulse 1.5s infinite;
  }
</style>
