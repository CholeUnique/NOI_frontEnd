<template>
  <div class="aether-panel">
    <div class="ambient-glow"></div>

    <div class="panel-header">
      <div class="header-left-group">
        <button class="history-toggle-btn" @click="toggleHistory" title="历史记录">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
        <div class="status-indicator">
          <span class="status-text">NoI</span>
        </div>
      </div>
      
      <div class="header-actions">
        <!-- 画像上下文指示器 -->
        <div 
          v-if="showContextIndicator && isProfileEnabled" 
          class="context-indicator"
          :class="{ active: profileContext, loading: isProfileLoading }"
          @click="toggleContextPreview"
          title="画像上下文已启用"
        >
          <span class="indicator-icon">🧠</span>
          <span class="indicator-text">{{ isProfileLoading ? '加载中' : '画像' }}</span>
        </div>
        
        <!-- 消息搜索按钮 -->
        <button 
          v-if="currentSessionId" 
          class="action-icon-btn" 
          @click="toggleSearch" 
          title="搜索消息"
          :class="{ active: showSearch }"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
        
        <!-- 全屏/展开按钮 -->
        <button class="action-icon-btn" @click="emitToggleFullscreen" :title="isFullscreen ? '退出全屏' : '展开视图'">
          <svg v-if="!isFullscreen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 14 10 14 10 20"></polyline>
            <polyline points="20 10 14 10 14 4"></polyline>
            <line x1="14" y1="10" x2="21" y2="3"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
      </div>
      
      <!-- 搜索框 -->
      <transition name="search-slide">
        <div v-if="showSearch && currentSessionId" class="search-bar">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索消息内容..." 
            class="search-input"
            @input="performSearch"
            ref="searchInputRef"
          />
          <button class="search-close-btn" @click="closeSearch">×</button>
        </div>
      </transition>
      
      <!-- 画像上下文预览面板 -->
      <transition name="context-slide">
        <div v-if="showContextPreview" class="context-preview-panel">
          <div class="preview-header">
            <span class="preview-title">画像上下文预览</span>
            <button class="preview-close" @click="showContextPreview = false">×</button>
          </div>
          <div class="preview-body">
            <pre class="preview-text">{{ profileContextText || '暂无画像数据' }}</pre>
          </div>
          <div class="preview-footer">
            <button class="preview-refresh" @click="refreshProfileContext" :disabled="isProfileLoading">
              {{ isProfileLoading ? '刷新中...' : '刷新上下文' }}
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- 历史记录抽屉 (Slide-out Drawer) -->
    <transition name="drawer-slide">
      <div v-if="showHistory" class="history-drawer">
        <div class="drawer-header">
          <span class="drawer-title">时光回溯</span>
          <button class="close-drawer-btn" @click="toggleHistory">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="drawer-content custom-scrollbar">
            <div class="new-chat-row">
                <button class="new-session-btn-full" @click="createNewSession">
                    <span class="plus-icon">+</span> 开启新对话
                </button>
            </div>

            <div v-if="sessions.length === 0" class="empty-history">
                暂无历史记录
            </div>

            <div v-else class="history-groups">
                <div v-for="(group, label) in groupedSessions" :key="label" class="history-group">
                    <div class="group-label">{{ label }}</div>
                    <div 
                        v-for="session in group" 
                        :key="session.session_id"
                        class="history-item"
                        :class="{ 'active': currentSessionId === session.session_id }"
                        @click="selectSession(session.session_id)"
                    >
                        <div class="history-icon">💬</div>
                        <div class="history-info">
                            <div class="history-title">{{ session.name || '未命名会话' }}</div>
                            <div class="history-meta">{{ session.message_count }} 条消息</div>
                        </div>
                        <button class="history-delete-btn" @click.stop="openSessionDeleteModal(session.session_id)">×</button>
                    </div>
                </div>
            </div>
            
            <button 
              v-if="hasMoreSessions" 
              class="load-more-btn"
              @click="loadMoreSessions"
              :disabled="isLoadingMore"
            >
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </button>
        </div>
      </div>
    </transition>
    
    <!-- 遮罩层 -->
    <transition name="fade">
      <div v-if="showHistory" class="drawer-overlay" @click="toggleHistory"></div>
    </transition>
    
    <div v-if="!currentSessionId" class="welcome-screen">
      <div class="welcome-content">
        <div class="welcome-logo">
          <div class="logo-pulse"></div>
          <span class="logo-icon">✧</span>
        </div>
        <h1 class="welcome-title">NoI 知识库</h1>
        <p class="welcome-subtitle">准备探索数据宇宙。</p>
        
        <div class="welcome-hints">
          <div class="hint-item" @click="createNewWithPrompt('什么是 RAG?')">"什么是 RAG?"</div>
          <div class="hint-item" @click="createNewWithPrompt('分析最新文档')">"分析最新文档"</div>
          <div class="hint-item" @click="createNewWithPrompt('生成摘要')">"生成摘要"</div>
        </div>

        <!-- 最近会话气泡 -->
        <div v-if="recentSessions.length > 0" class="recent-sessions-bubbles">
            <div class="recent-label">最近访问</div>
            <div class="bubbles-row">
                <div 
                    v-for="session in recentSessions" 
                    :key="session.session_id" 
                    class="recent-bubble"
                    @click="selectSession(session.session_id)"
                >
                    <span class="recent-icon">↺</span>
                    <span class="recent-text">{{ session.name || '未命名会话' }}</span>
                </div>
            </div>
        </div>
      </div>
    </div>

    <div v-else class="scroll-area" ref="messagesRef">
      <div class="intro-message">
        <span class="intro-icon">✧</span>
        <p>神经链接已建立</p>
      </div>

      <!-- 搜索结果高亮提示 -->
      <div v-if="searchQuery && searchResults.length > 0" class="search-results-info">
        找到 {{ searchResults.length }} 条匹配消息
        <button class="clear-search-btn" @click="clearSearch">清除</button>
      </div>

      <div v-for="(msg, index) in filteredMessages" :key="index" :class="['message-group', msg.role, { 'search-highlight': isSearchResult(msg, index) }]">
        
        <!-- Message Header: Sender + Timestamp -->
        <div class="message-header">
          <span class="message-sender">{{ msg.role === 'user' ? '用户' : 'NoI' }}</span>
          <span class="timestamp">{{ msg.time }}</span>
        </div>

        <!-- 原有的消息气泡代码 -->
        <div class="bubble-wrapper">
          <!-- User Message Actions -->
          <div v-if="msg.role === 'user'" class="user-message-actions">
            <button class="action-btn copy" title="复制" @click="handleCopyMessage(msg.content)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="action-btn delete" title="删除" @click="handleDeleteMessage(index)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button class="action-btn retry" title="回退并编辑" @click="handleRewindMessage(index)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
            </button>
          </div>

          <div v-if="msg.role === 'ai'" class="ai-border-glow"></div>
          <div class="bubble">
            <!-- 1. 思考过程 (Thought) -->
            <div v-if="msg.agentLogs && msg.agentLogs.thinking.length > 0" class="part-thought" :class="{ expanded: msg.agentLogs.showThought }">
                <div class="thought-header" @click="msg.agentLogs.showThought = !msg.agentLogs.showThought">
                    <div class="thought-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div class="thought-title">思考过程 ({{ msg.agentLogs.thinking.length }} 步骤)</div>
                    <div class="thought-chevron">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
                <div v-if="msg.agentLogs.showThought" class="thought-content">
                    <div v-for="item in msg.agentLogs.timeline" :key="item.id" class="timeline-item">
                        <!-- Thought Item -->
                        <div v-if="item.type === 'thought'" class="thought-item">
                            <span class="thought-time">{{ item.time }}</span>
                            <span class="thought-text">{{ item.text }}</span>
                        </div>
                        
                        <!-- Tool Item -->
                        <div v-else-if="item.type === 'tool'" class="tool-card-wrapper">
                            <div class="tool-card">
                                <div class="tool-card-header" @click="item.open = !item.open">
                                    <div class="tool-status-icon" :class="item.status">
                                        <svg v-if="item.status === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        <svg v-else-if="item.status === 'error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        <span v-else class="tool-spinner"></span>
                                    </div>
                                    <div class="tool-card-title">决定调用工具: <span class="tool-name-highlight">{{ getToolDisplayName(item.title) }}</span></div>
                                    <div class="tool-card-chevron" :class="{ open: item.open }">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </div>
                                </div>
                                <div v-if="item.open" class="tool-card-body">
                                    <div class="tool-section">
                                        <div class="tool-section-label">输入</div>
                                        <div class="tool-code-block">{{ item.detail }}</div>
                                    </div>
                                    <div v-if="item.result" class="tool-section">
                                        <div class="tool-section-label">结果</div>
                                        <div class="tool-code-block result">{{ typeof item.result === 'object' ? JSON.stringify(item.result, null, 2) : item.result }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. 任务规划 (Plan) -->
            <div v-if="msg.agentLogs && msg.agentLogs.tasks.length > 0" class="part-plan" :class="{ expanded: msg.agentLogs.showPlan }">
                <div class="plan-header" @click="msg.agentLogs.showPlan = !msg.agentLogs.showPlan">
                    <div class="plan-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                    </div>
                    <div class="plan-title">执行计划</div>
                    <div class="plan-status">
                         {{ msg.agentLogs.tasks.filter(t => t.status === 'success').length }}/{{ msg.agentLogs.tasks.length }}
                    </div>
                    <div class="plan-chevron">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
                <div v-if="msg.agentLogs.showPlan" class="plan-content">
                    <div v-for="task in msg.agentLogs.tasks" :key="task.id" class="plan-item">
                        <div class="plan-item-icon" :class="task.status">
                            <svg v-if="task.status === 'success'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span v-else-if="task.status === 'running'" class="plan-spinner"></span>
                            <div v-else class="plan-dot"></div>
                        </div>
                        <div class="plan-item-text">{{ getToolDisplayName(task.title) }}</div>
                    </div>
                </div>
            </div>

            <!-- 3. 正文内容 (Content) -->
            <div 
              class="part-text bubble-text" 
              v-html="formatMessage(msg.content, searchQuery)"
              @mouseover="handleBubbleMouseOver($event, msg)"
              @mouseout="handleBubbleMouseOut"
            ></div>
            <!-- 引用展示区域 -->
            <div v-if="msg.references" class="ref-container">
               
               <!-- 1. 图片/图表区域 (横向滚动) -->
               <div v-if="msg.references && msg.references.chunks && msg.references.chunks.some(c => c.image_id || c.img_id)" class="ref-figures-section">
                 <div class="section-title">图表</div>
                 <div class="figures-scroller">
                   <div v-for="chunk in msg.references.chunks.filter(c => c.image_id || c.img_id)" :key="chunk.id" class="figure-card">
                      <div class="figure-image-wrapper">
                        <img 
                          :src="`${API_CONFIG.base.url}/api/v1/chat/images/${chunk.image_id || chunk.img_id}`" 
                          :alt="chunk.document_name"
                          class="figure-image hoverable"
                          loading="lazy"
                          @mousemove="handleImageMove"
                          @mouseenter="handleImageHover($event, `${API_CONFIG.base.url}/api/v1/chat/images/${chunk.image_id || chunk.img_id}`, chunk.document_name)"
                          @mouseleave="handleImageLeave"
                        />
                      </div>
                      <div class="figure-caption">图 {{ chunk.id.substring(0, 4) }}</div>
                   </div>
                 </div>
               </div>

               <!-- 2. 文档来源列表 (列表视图) -->
               <div v-if="msg.references && msg.references.doc_aggs && msg.references.doc_aggs.length" class="ref-docs-section">
                  <div class="section-title">参考来源</div>
                  <div class="docs-list">
                    <div v-for="doc in msg.references.doc_aggs" :key="doc.doc_id" class="doc-item">
                      <div class="doc-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                      <div class="doc-info">
                        <div class="doc-name">{{ doc.doc_name }}</div>
                        <div class="doc-count">引用 {{ doc.count }} 次</div>
                      </div>
                    </div>
                  </div>
               </div>
            
            </div>
          </div>
        </div>
        <!-- AI消息反馈按钮 -->
        <div v-if="msg.role === 'ai' && !isTyping" class="feedback-buttons">
          <button 
            class="feedback-btn like" 
            :class="{ active: msg.feedback === 'like' }"
            @click="handleFeedback(index, 'like')"
            title="有帮助"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
          </button>
          <button 
            class="feedback-btn dislike" 
            :class="{ active: msg.feedback === 'dislike' }"
            @click="handleFeedback(index, 'dislike')"
            title="需改进"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="isTyping" class="message-group ai typing">
        <div class="bubble typing-bubble">
          <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        </div>
      </div>
    </div>

    <div class="input-dock">
      <!-- 上下文胶囊区域 -->
      <transition name="fade">
        <div v-if="contextNode" class="context-capsule-area">
            <div class="context-pill">
                <span class="pill-icon">🔗</span>
                <span class="pill-text">Linked: {{ contextNode }}</span>
                <button class="pill-close" @click="clearContext">×</button>
            </div>
        </div>
      </transition>

      <div class="input-card" :class="{ 'has-context': !!contextNode }">
        <textarea 
          v-model="inputContent" 
          @keydown.enter.prevent="handleEnterKey"
          @input="autoResize"
          ref="inputRef"
          rows="1"
          placeholder="问点什么... (输入 / 获取指令)" 
          class="chat-textarea"
        ></textarea>

        <div class="input-footer">
            <!-- 左侧：模式选择器 -->
            <div class="left-tools">
                <div class="mode-selector">
                    <button 
                      class="mode-btn" 
                      :class="{ active: chatMode === 'agent' }"
                      @click="chatMode = 'agent'"
                      title="Agent 模式 - SessionLoop 引擎，支持工具调用"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
                      </svg>
                      <span>Agent</span>
                    </button>
                    <button 
                      class="mode-btn" 
                      :class="{ active: chatMode === 'ask' }"
                      @click="chatMode = 'ask'"
                      title="Ask 模式 - RAGFlow 引擎，知识库问答"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <span>Ask</span>
                    </button>
                </div>
            </div>
            
            <!-- 右侧：工具按钮 + 发送按钮 -->
            <div class="right-tools">
                <button class="tool-btn" title="添加来源" @click="handleAttachmentClick">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                </button>
                <input 
                  type="file" 
                  ref="fileInputRef" 
                  style="display: none" 
                  @change="handleFileSelected"
                  multiple
                />
                
                <button 
                  class="send-btn-rect" 
                  @click="isTyping ? stopGeneration() : sendMessage()" 
                  :disabled="!isTyping && !inputContent.trim()"
                  :class="{ 'is-active': isTyping || inputContent.trim() }"
                >
                  <span v-if="!isTyping">发送</span>
                  <span v-else>停止</span>
                  <svg v-if="!isTyping" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="send-icon">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="send-icon">
                    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                  </svg>
                </button>
            </div>
        </div>
      </div>
      
      <div class="dock-footer">
        NoI 可能会展示不准确的信息，包括关于人物的信息。
      </div>
    </div>
  </div>

  <!-- 全局悬浮引用提示 - 使用 Teleport 渲染到 body -->
  <Teleport to="body">
    <div 
        v-if="tooltip.visible" 
        class="citation-tooltip"
        :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
        @mouseenter="handleTooltipMouseEnter" 
      @pointerleave="handleTooltipMouseLeave"
    >
        <div class="tooltip-header">
          <span class="tooltip-title">Reference</span>
          <!-- 相似度分数来自 RAGFlow 的向量检索结果，表示该引用与问题的匹配度 -->
          <!-- 如果不需要可以删除这个 span -->
          <span v-if="tooltip.similarity" class="tooltip-similarity">
            {{ (tooltip.similarity * 100).toFixed(1) }}%
          </span>
        </div>
        <div class="tooltip-content">{{ tooltip.content }}</div>
        <div v-if="tooltip.docName" class="tooltip-source">{{ tooltip.docName }}</div>
    </div>
  </Teleport>


  <!-- 图片悬浮预览 -->
  <Teleport to="body">
    <div 
      v-if="previewImage.visible" 
      class="image-hover-preview"
      :style="{ top: previewImage.y + 'px', left: previewImage.x + 'px' }"
    >
      <img :src="previewImage.url" :alt="previewImage.caption" class="preview-image-hover">
      <div v-if="previewImage.caption" class="preview-caption-hover">{{ previewImage.caption }}</div>
    </div>
  </Teleport>

  <!-- 删除会话确认弹窗（居中） -->
  <Teleport to="body">
    <transition name="noi-fade">
      <div
        v-if="sessionDeleteModal.open"
        class="noi-modal-overlay"
        role="presentation"
        @click.self="closeSessionDeleteModal"
      >
        <transition name="noi-modal-pop">
          <div class="noi-modal-card" role="dialog" aria-modal="true" aria-labelledby="session-delete-title">
            <div class="noi-modal-header">
              <div class="noi-modal-icon" aria-hidden="true">🗑️</div>
              <div class="noi-modal-titles">
                <div id="session-delete-title" class="noi-modal-title">删除会话</div>
                <div class="noi-modal-subtitle">将同时删除该会话的全部记录（不可撤销）</div>
              </div>
              <button class="noi-modal-close" title="关闭" @click="closeSessionDeleteModal">×</button>
            </div>

            <div class="noi-modal-body">
              <div class="noi-modal-row">
                <div class="noi-modal-label">会话</div>
                <div class="noi-modal-value" :title="sessionDeleteModal.sessionName || ''">
                  {{ sessionDeleteModal.sessionName || '未命名会话' }}
                </div>
              </div>
              <div class="noi-modal-hint">
                这会清理本地会话/消息/事件流/行为图谱/记忆等数据，并尝试同步删除 RAGFlow 会话。
              </div>
            </div>

            <div class="noi-modal-actions">
              <button class="noi-btn-secondary" :disabled="sessionDeleteModal.deleting" @click="closeSessionDeleteModal">
                取消
              </button>
              <button class="noi-btn-danger" :disabled="sessionDeleteModal.deleting" @click="confirmDeleteSession">
                <span v-if="sessionDeleteModal.deleting" class="noi-btn-spinner" aria-hidden="true"></span>
                {{ sessionDeleteModal.deleting ? '删除中...' : '删除' }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>

  <!-- 回退并编辑确认弹窗 -->
  <Teleport to="body">
    <transition name="noi-fade">
      <div
        v-if="rewindModal.open"
        class="noi-modal-overlay"
        role="presentation"
        @click.self="closeRewindModal"
      >
        <transition name="noi-modal-pop">
          <div class="noi-modal-card" role="dialog" aria-modal="true" aria-labelledby="rewind-title">
            <div class="noi-modal-header">
              <div class="noi-modal-icon" style="background: rgba(56, 189, 248, 0.12); border-color: rgba(56, 189, 248, 0.20); box-shadow: 0 0 22px rgba(56, 189, 248, 0.12);" aria-hidden="true">↺</div>
              <div class="noi-modal-titles">
                <div id="rewind-title" class="noi-modal-title">回退并编辑</div>
                <div class="noi-modal-subtitle">将回退到此轮对话并允许重新输入</div>
              </div>
              <button class="noi-modal-close" title="关闭" @click="closeRewindModal">×</button>
            </div>

            <div class="noi-modal-body">
              <div class="noi-modal-hint" style="margin-top: 0;">
                确定要回退到此轮对话吗？<br>
                <span style="color: #ef4444; font-weight: 500;">注意：该条消息及之后的所有消息将被永久删除。</span>
              </div>
            </div>

            <div class="noi-modal-actions">
              <button class="noi-btn-secondary" :disabled="rewindModal.deleting" @click="closeRewindModal">
                取消
              </button>
              <button class="noi-btn-primary" :disabled="rewindModal.deleting" @click="confirmRewind">
                <span v-if="rewindModal.deleting" class="noi-btn-spinner" aria-hidden="true"></span>
                {{ rewindModal.deleting ? '处理中...' : '确认回退' }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, reactive, computed, watch } from 'vue';
import { marked } from 'marked';
import { 
  sendChatMessageStream, 
  getChatSessions, 
  createChatSession, 
  deleteChatSession, 
  updateChatSessionName, 
  getChatHistory, 
  sendSessionChat,
  truncateSessionMessages
} from '../api/chat';
import { API_CONFIG } from '../config/api';
import { useProfilePrompt } from '../composables/useProfilePrompt';
import { useBehaviorTracker } from '../composables/useBehaviorTracker';

// 对话模式：agent (SessionLoop) | ask (RAGFlow)
const chatMode = ref('ask'); // 默认使用 Ask 模式

const props = defineProps({
  isFullscreen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle-fullscreen']);

const messagesRef = ref(null);
const inputContent = ref('');
const inputRef = ref(null); // Textarea ref
const isTyping = ref(false);
const currentAiMessage = ref('');
let hideTooltipTimer = null;

// --- New Features Refs ---
const fileInputRef = ref(null);
const abortController = ref(null);

const handleAttachmentClick = () => {
  fileInputRef.value.click();
};

const handleFileSelected = (e) => {
  if (e.target.files && e.target.files.length > 0) {
    const files = Array.from(e.target.files);
    // 直接将文件名添加到输入框
    const fileNames = files.map(f => f.name).join(', ');
    inputContent.value += (inputContent.value ? '\n' : '') + `[附件: ${fileNames}]`;
    
    // 聚焦输入框
    nextTick(() => {
      inputRef.value?.focus();
      autoResize();
    });
  }
  // 清空 value 允许重复选同一文件
  e.target.value = '';
};

const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
    isTyping.value = false;
    // 更新最后一条消息状态为已停止
    if (messages.value.length > 0) {
        const lastMsg = messages.value[messages.value.length - 1];
        if (lastMsg.role === 'ai') {
            lastMsg.content += ' [已停止]';
        }
    }
  }
};

// --- User Actions ---
const handleCopyMessage = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    // 可以加个 toast 提示
    console.log('已复制');
  });
};

const handleDeleteMessage = async (index) => {
  // 乐观更新：先从 UI 移除
  // 注意：如果是 User 消息，通常也要移除其后的 AI 回复
  // 这里简单实现为移除该条及之后的所有消息（回退效果），或者只移除该条（如果允许中间删除）
  // 根据需求 "回退本轮" 是 rewind，delete 可能只是删除记录
  // 这里实现为删除单条，或者删除该条及之后的配对
  
  // 简单策略：删除该消息及其后的一条 AI 消息（如果存在）
  const msg = messages.value[index];
  let deleteCount = 1;
  if (msg.role === 'user' && index + 1 < messages.value.length && messages.value[index+1].role === 'ai') {
      deleteCount = 2;
  }
  
  messages.value.splice(index, deleteCount);
  // TODO: 调用后端同步删除
};

const handleRewindMessage = (index) => {
  const msg = messages.value[index];
  if (msg.role === 'user') {
    rewindModal.value = {
      open: true,
      deleting: false,
      messageIndex: index
    };
  }
};

const closeRewindModal = () => {
  if (rewindModal.value.deleting) return;
  rewindModal.value.open = false;
};

const confirmRewind = async () => {
  const index = rewindModal.value.messageIndex;
  if (index === -1) return;
  
  rewindModal.value.deleting = true;
  try {
    const msg = messages.value[index];
    
    // 1. 恢复文本到输入框
    inputContent.value = msg.content;
    
    // 2. 调用后端 truncate 接口
    await truncateSessionMessages(currentSessionId.value, msg.content);
    
    // 3. 更新本地列表：删除该条及之后的所有消息
    messages.value = messages.value.slice(0, index);
    
    // 4. 聚焦输入框
    nextTick(() => {
      inputRef.value?.focus();
      autoResize();
    });
    
    rewindModal.value.open = false;
  } catch (error) {
    console.error('回退消息失败:', error);
    alert('回退失败，请重试');
  } finally {
    rewindModal.value.deleting = false;
  }
};

// 工具名称映射表
const TOOL_NAME_MAP = {
  'knowledge_search': '检索知识库',
  'profile_query': '分析用户画像',
  'document_analyze': '深度文档分析',
  'web_search': '联网搜索',
  'rag_search': 'RAG 检索',
  'image_gen': '生成图片',
  'code_interpreter': '执行代码',
  'user_message': '接收用户指令',
  'session_complete': '任务完成',
  'error': '发生错误'
};

const getToolDisplayName = (toolId) => {
  return TOOL_NAME_MAP[toolId] || toolId;
};

// 画像上下文相关
const {
  context: profileContext,
  isEnabled: isProfileEnabled,
  isLoading: isProfileLoading,
  fetchQuickContext,
  config: profileConfig
} = useProfilePrompt({ autoFetch: true });

// 行为追踪
const { 
  trackGenerate, 
  trackFeedback,
  trackClick
} = useBehaviorTracker();

// 上下文指示器状态
const showContextIndicator = ref(true);
const showContextPreview = ref(false);
const profileContextText = ref('');

// 上下文节点 (Mock)
const contextNode = ref(null);
// 监听 store 或外部事件来设置 contextNode (此处仅为演示接口)
const setContextNode = (nodeName) => {
    contextNode.value = nodeName;
};
const clearContext = () => {
    contextNode.value = null;
};

// 自动调整 Textarea 高度
const autoResize = () => {
    const el = inputRef.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'; // Max height 150px
};

const handleEnterKey = (e) => {
    if (e.shiftKey) return; // Shift+Enter 换行
    sendMessage();
};

const createNewWithPrompt = (prompt) => {
    createNewSession();
    inputContent.value = prompt;
    // 自动聚焦
    nextTick(() => {
        inputRef.value?.focus();
    });
};

const emitToggleFullscreen = () => {
    emit('toggle-fullscreen');
};

// 画像上下文相关函数
const toggleContextPreview = async () => {
  showContextPreview.value = !showContextPreview.value;
  if (showContextPreview.value && !profileContextText.value) {
    await refreshProfileContext();
  }
};

const refreshProfileContext = async () => {
  try {
    const result = await fetchQuickContext();
    profileContextText.value = result.context || '';
  } catch (err) {
    console.error('刷新画像上下文失败:', err);
    profileContextText.value = '获取画像上下文失败';
  }
};

// 消息反馈处理
const handleFeedback = (messageIndex, feedbackType) => {
  const msg = messages.value[messageIndex];
  if (!msg) return;
  
  // 如果点击相同的反馈，取消
  if (msg.feedback === feedbackType) {
    msg.feedback = null;
  } else {
    msg.feedback = feedbackType;
    
    // 追踪反馈行为
    trackFeedback(
      currentSessionId.value || 'unknown',
      feedbackType,
      {
        messageIndex,
        targetType: 'chat_response',
        sessionId: currentSessionId.value
      }
    );
  }
};

// 配置 marked
marked.use({
  breaks: true, // 允许回车换行
  gfm: true     // 启用 GitHub 风格 Markdown (包含表格)
});
const handleTooltipMouseEnter = () => {
  if (hideTooltipTimer) {
    clearTimeout(hideTooltipTimer);
    hideTooltipTimer = null;
  }
};

// 当鼠标离开悬浮窗时，开始隐藏
const handleTooltipMouseLeave = () => {
  hideTooltipTimer = setTimeout(() => {
    tooltip.visible = false;
    tooltip.currentCid = null;
  }, 50);
};
// 会话管理
const showHistory = ref(false); // Replaced showMenu
const sessions = ref([]);
const currentSessionId = ref(null);
const currentPage = ref(1);
const hasMoreSessions = ref(false);
const isLoadingMore = ref(false);

// 会话分组逻辑
const groupedSessions = computed(() => {
    const groups = {
        '今天': [],
        '昨天': [],
        '更早': []
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    
    sessions.value.forEach(session => {
        // 假设 session 没有 timestamp，如果有的话用 session.updated_at
        // 这里暂时 mock，或者如果 API 返回了时间字段则使用
        // 由于 API 返回结构未明确包含时间戳，这里仅作演示分组
        // 实际应根据 session.updated_at 判断
        
        // 简单策略：前3个算今天，接下3个算昨天，其余更早 (Mock logic)
        // 真实逻辑应基于 session.updated_at
        groups['今天'].push(session); 
    });
    
    // 修正：如果所有都堆在今天也不太好看，简单模拟一下分布
    // 实际项目中请使用真实时间戳比较
    if (sessions.value.length > 5) {
        const all = [...sessions.value];
        groups['今天'] = all.slice(0, 2);
        groups['昨天'] = all.slice(2, 5);
        groups['更早'] = all.slice(5);
    }

    // 移除空组
    const result = {};
    if (groups['今天'].length) result['今天'] = groups['今天'];
    if (groups['昨天'].length) result['昨天'] = groups['昨天'];
    if (groups['更早'].length) result['更早'] = groups['更早'];
    
    return result;
});

// 最近会话 (Welcome Screen 用)
const recentSessions = computed(() => {
    return sessions.value.slice(0, 3);
});

const getTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// 引用提示状态
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  content: '',
  docName: '',
  similarity: null // 添加相似度显示
});

// 图片预览状态
const previewImage = reactive({
  visible: false,
  url: '',
  caption: '',
  x: 0,
  y: 0
});

// 处理鼠标移动
const handleImageMove = (event) => {
  if (!previewImage.visible) return;
  
  // 基础位置：在鼠标右下方
  let x = event.clientX + 20;
  let y = event.clientY + 20;
  
  // 视口检查
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  // 假设最大尺寸，或者获取实际 DOM 尺寸（如果已渲染）
  const previewEl = document.querySelector('.image-hover-preview');
  const previewWidth = previewEl ? previewEl.offsetWidth : 400; 
  const previewHeight = previewEl ? previewEl.offsetHeight : 400; 
  
  // X轴逻辑：右侧溢出则放左侧
  if (x + previewWidth > viewportWidth - 20) {
    x = event.clientX - previewWidth - 20;
    // 如果左侧也溢出，则强制贴左边界
    if (x < 20) x = 20;
  }
  
  // Y轴逻辑：下方溢出则放上方
  if (y + previewHeight > viewportHeight - 20) {
    y = event.clientY - previewHeight - 20;
    // 如果上方也溢出，则强制贴顶
    if (y < 20) y = 20;
  }
  
  previewImage.x = x;
  previewImage.y = y;
};

// 鼠标进入
const handleImageHover = (event, url, caption) => {
  previewImage.url = url;
  previewImage.caption = caption || '';
  previewImage.visible = true;
  handleImageMove(event); // 初始化位置
};

// 鼠标离开
const handleImageLeave = () => {
  previewImage.visible = false;
};

// 处理引用文本格式化
const formatMessage = (text, searchTerm = '') => {
  if (!text) return '';
  try {
    let html = marked.parse(text);
    // 匹配 [1] 或 [ID:1] 或 [ID:4] 格式，并替换为可交互 span
    // $1 捕获整个匹配字符串 (如 "[ID:4]") 用于显示
    // $2 捕获数字 ID (如 "4") 用于查找数据
    html = html.replace(/(\[(?:ID:)?(\d+)\])/gi, '<span class="citation-ref-inline" data-cid="$2">$1</span>');
    
    // 搜索高亮
    if (searchTerm && searchTerm.trim()) {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      html = html.replace(regex, '<mark class="search-highlight-mark">$1</mark>');
    }
    
    return html;
  } catch (e) {
    console.error('Markdown parsing error:', e);
    return text;
  }
};

// 处理引用悬停
const handleBubbleMouseOver = (event, msg) => {
  const target = event.target;
  // 查找最近的 citation-ref-inline 祖先
  const refEl = target.closest('.citation-ref-inline');
  
  
  if (refEl) {
    if (hideTooltipTimer) {
      clearTimeout(hideTooltipTimer);
      hideTooltipTimer = null;
    }
    
    
    const cidStr = refEl.dataset.cid; // 获取引用数字 ID
    if (tooltip.visible && tooltip.currentCid === cidStr) {
      return; 
    }
    const cid = parseInt(cidStr);
    
    console.log('📌 Citation clicked:', { cid, hasReferences: !!msg.references });
    
    if (msg.references && msg.references.chunks) {
      
      
      // 根据 RAGFlow 返回的数据结构，chunks 是按顺序的
      // [ID:4] 对应的是 chunks[4]，[ID:0] 对应 chunks[0]
      let chunk = null;
      
      // 策略1: 直接按 ID 索引
      if (cid >= 0 && cid < msg.references.chunks.length) {
        chunk = msg.references.chunks[cid];
        
      } else {
        console.log('❌ Chunk not found for cid:', cid);
      }
      
      if (chunk) {
        // 从 content 中提取纯文本内容（去除图表描述的冗长部分）
        let contentText = chunk.content || '';
        tooltip.content = contentText;
        tooltip.docName = chunk.document_name || '';
        tooltip.similarity = chunk.similarity || chunk.vector_similarity || null;
        tooltip.currentCid = cidStr; // 记录当前 ID
        console.log('📦 Tooltip data:', { 
          content: tooltip.content.substring(0, 50), 
          docName: tooltip.docName, 
          similarity: tooltip.similarity 
        });
        
        // 计算位置：显示在引用标记上方
        const rect = refEl.getBoundingClientRect();
        const tooltipWidth = 400; // 与 CSS 中的 max-width 一致
        
        // 水平居中，但防止溢出屏幕
        let x = rect.left + rect.width / 2 - tooltipWidth / 2;
        if (x < 10) x = 10; // 左边界
        if (x + tooltipWidth > window.innerWidth - 10) {
          x = window.innerWidth - tooltipWidth - 10; // 右边界
        }
        
        
        tooltip.x = x;
        // 初始位置，稍后在 nextTick 中修正
        tooltip.y = rect.top; 
        tooltip.visible = true;
        
        // 使用 nextTick 获取渲染后的实际高度并调整位置
        nextTick(() => {
          const tooltipEl = document.querySelector('.citation-tooltip');
          if (tooltipEl) {
            const h = tooltipEl.offsetHeight;
            const viewportHeight = window.innerHeight;
            
            // 默认尝试放在上方
            let top = rect.top - h - 10;
            
            // 如果上方溢出（top < 0），则尝试放在下方
            if (top < 10) {
               top = rect.bottom + 10;
               
               // 如果下方也溢出，则判断哪边空间大放在哪边，并限制高度（通过 CSS max-height）
               if (top + h > viewportHeight) {
                 // 简单策略：强制贴底或贴顶，让 CSS overflow 处理滚动
                 if (rect.top > viewportHeight / 2) {
                   // 元素在下半屏，强制放上方，贴顶
                   top = Math.max(10, rect.top - h - 10);
                   // 如果还是太大，可能需要由于 max-height 自动生效
                 } else {
                   // 元素在上半屏，放在下方
                   top = rect.bottom + 10;
                 }
               }
            }
            
            tooltip.y = top;
          }
        });

        tooltip.currentCid = refEl.dataset.cid;
        console.log('🎯 Tooltip shown:', { 
          x: tooltip.x, 
          y: tooltip.y, 
          visible: tooltip.visible,
          contentLength: tooltip.content.length 
        });
      }
    } else {
      console.log('⚠️ No references or chunks found');
    }
  }
};

const handleBubbleMouseOut = (event) => {
  // 检查鼠标离开后移动到的目标元素
  const relatedTarget = event.relatedTarget;
  
  // 如果鼠标是移动到了悬浮窗内部，或者是移动到了引用标签的子元素上，则不触发隐藏
  if (
    relatedTarget && 
    (relatedTarget.closest('.citation-tooltip') || relatedTarget.closest('.citation-ref-inline'))
  ) {
    return;
  }

  // 否则，启动延迟隐藏
  hideTooltipTimer = setTimeout(() => {
    tooltip.visible = false;
    tooltip.currentCid = null;
  }, 50); // 稍微增加一点点缓冲
};

const messages = ref([
  { 
    role: 'ai', 
    content: '你好。我已连接到星系知识库。<br>准备进行数据分析。', 
    time: getTime() 
  }
]);

// 搜索相关状态
const showSearch = ref(false);
const searchQuery = ref('');
const searchResults = ref([]);
const searchInputRef = ref(null);

// 切换搜索
const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    nextTick(() => {
      if (searchInputRef.value) {
        searchInputRef.value.focus();
      }
    });
  } else {
    clearSearch();
  }
};

// 关闭搜索
const closeSearch = () => {
  showSearch.value = false;
  clearSearch();
};

// 清除搜索
const clearSearch = () => {
  searchQuery.value = '';
  searchResults.value = [];
};

// 执行搜索（防抖）
let searchTimer = null;
const performSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  
  searchTimer = setTimeout(() => {
    if (!searchQuery.value.trim()) {
      searchResults.value = [];
      return;
    }
    
    const query = searchQuery.value.toLowerCase().trim();
    const results = [];
    
    messages.value.forEach((msg, index) => {
      const content = msg.content?.toLowerCase() || '';
      if (content.includes(query)) {
        results.push(index);
      }
    });
    
    searchResults.value = results;
    
    // 如果有结果，滚动到第一个结果
    if (results.length > 0) {
      scrollToMessage(results[0]);
    }
  }, 300); // 300ms 防抖
};

// 判断是否是搜索结果
const isSearchResult = (msg, index) => {
  return searchQuery.value && searchResults.value.includes(index);
};

// 滚动到指定消息
const scrollToMessage = (index) => {
  nextTick(() => {
    if (messagesRef.value) {
      const messageElements = messagesRef.value.querySelectorAll('.message-group');
      if (messageElements[index]) {
        messageElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 添加临时高亮效果
        messageElements[index].classList.add('search-scroll-highlight');
        setTimeout(() => {
          messageElements[index].classList.remove('search-scroll-highlight');
        }, 2000);
      }
    }
  });
};

// 过滤后的消息列表（用于搜索时只显示匹配的消息）
const filteredMessages = computed(() => {
  if (!searchQuery.value || !searchQuery.value.trim()) {
    return messages.value;
  }
  
  // 如果有搜索结果，只显示匹配的消息
  if (searchResults.value.length > 0) {
    return searchResults.value.map(index => messages.value[index]);
  }
  
  return messages.value;
});

// 切换菜单显示
const toggleHistory = () => {
  showHistory.value = !showHistory.value;
  if (showHistory.value && sessions.value.length === 0) {
    loadSessions(true); // 重置并加载第一页
  }
};

// 加载会话列表
const loadSessions = async (reset = false) => {
  try {
    if (reset) {
      currentPage.value = 1;
      sessions.value = [];
    }
    
    const response = await getChatSessions(currentPage.value, 10);
    const data = response.data.data;
    
    if (reset) {
      sessions.value = data.sessions || [];
    } else {
      sessions.value = [...sessions.value, ...(data.sessions || [])];
    }
    
    hasMoreSessions.value = data.has_more;
  } catch (error) {
    console.error('加载会话列表失败:', error);
  }
};

// 加载更多会话
const loadMoreSessions = async () => {
  if (isLoadingMore.value || !hasMoreSessions.value) return;
  
  isLoadingMore.value = true;
  try {
    currentPage.value += 1;
    await loadSessions(false);
  } finally {
    isLoadingMore.value = false;
  }
};

// 更新会话名称
const updateSessionName = async (sessionId, newName) => {
  try {
    await updateChatSessionName(sessionId, newName);
    // 更新本地缓存
    const session = sessions.value.find(s => s.session_id === sessionId);
    if (session) {
      session.name = newName;
    }
  } catch (error) {
    console.error('更新会话名称失败:', error);
  }
};

// 创建新会话 (仅重置 UI，懒创建)
const createNewSession = async () => {
    currentSessionId.value = null;
    messages.value = [];
    showHistory.value = false;
    
    // 清除 URL 参数
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
};

// 选择会话
const selectSession = async (sessionId) => {
  if (currentSessionId.value === sessionId) {
    // 如果已经是当前会话，只是关闭菜单
    showHistory.value = false;
    return;
  }
  
  currentSessionId.value = sessionId;
  showHistory.value = false;
  
  // 更新 URL
  const newUrl = `${window.location.pathname}?session_id=${sessionId}`;
  window.history.pushState({ path: newUrl }, '', newUrl);
  
  // 加载该会话的历史消息
  try {
    const response = await getChatHistory(sessionId);
    console.log('📥 获取历史消息响应:', response); // 调试日志
    const history = response.data.data.messages || [];
    console.log('📋 历史消息数量:', history.length); // 调试日志
    
    if (history.length > 0) {
      // 将历史消息转换为界面消息格式
      messages.value = history.map(msg => {
        console.log('📨 处理历史消息:', { 
          role: msg.role, 
          hasReference: !!msg.reference,
          hasParts: !!msg.parts,
          referenceKeys: msg.reference ? Object.keys(msg.reference) : []
        });
        
        return {
          role: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          // RAGFlow 历史记录中的引用数据
          references: msg.reference || null,
          // Agent 模式的日志数据
          agentLogs: msg.parts ? {
            open: true,
            tab: 'tasks',
            thinking: msg.parts.thinking || [],
            tasks: msg.parts.tasks || [],
            timeline: msg.parts.timeline || [],
            indexByCallId: {}, // 历史记录不需要实时更新索引
            showThought: false, // 历史记录默认折叠
            showPlan: false // 历史记录默认折叠
          } : null,
          time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : getTime()
        };
      });
      
      console.log('✅ 历史消息加载完成，引用数据:', 
        messages.value.filter(m => m.references).length + '/' + messages.value.length
      );
    } else {
      // 无历史消息
      messages.value = [
        { 
          role: 'ai', 
          content: '已切换会话。我们可以开始对话了。', 
          time: getTime() 
        }
      ];
    }
    
    scrollToBottom();
  } catch (error) {
    console.error('加载会话历史失败:', error);
    // 即使加载失败，也切换会话
    messages.value = [
      { 
        role: 'ai', 
        content: '已切换会话。无法加载历史记录，但您可以开始新的对话。', 
        time: getTime() 
      }
    ];
  }
};

// 删除会话
const sessionDeleteModal = ref({
  open: false,
  deleting: false,
  sessionId: null,
  sessionName: ''
});

// 回退确认弹窗状态
const rewindModal = ref({
  open: false,
  deleting: false,
  messageIndex: -1
});

const openSessionDeleteModal = (sessionId) => {
  if (!sessionId) return;
  const session = sessions.value.find(s => s.session_id === sessionId);
  sessionDeleteModal.value = {
    open: true,
    deleting: false,
    sessionId,
    sessionName: session?.name || ''
  };
};

const closeSessionDeleteModal = () => {
  if (sessionDeleteModal.value.deleting) return;
  sessionDeleteModal.value.open = false;
};

const confirmDeleteSession = async () => {
  const sessionId = sessionDeleteModal.value.sessionId;
  if (!sessionId || sessionDeleteModal.value.deleting) return;

  sessionDeleteModal.value.deleting = true;
  try {
    await deleteChatSession(sessionId);
    await loadSessions(true); // 重新加载会话列表

    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null;
      messages.value = [
        {
          role: 'ai',
          content: '请选择或创建一个会话开始对话。',
          time: getTime()
        }
      ];
    }

    sessionDeleteModal.value.open = false;
  } catch (error) {
    console.error('删除会话失败:', error);
    alert('删除会话失败，请重试');
  } finally {
    sessionDeleteModal.value.deleting = false;
  }
};

const handleGlobalKeydown = (e) => {
  if (e.key === 'Escape' && sessionDeleteModal.value.open) {
    closeSessionDeleteModal();
  }
};

// 发送消息
const sendMessage = async () => {
  if (!inputContent.value.trim() || isTyping.value) return;
  
  if (!currentSessionId.value) {
    // 自动创建新会话
    try {
      const userText = inputContent.value;
      const sessionName = userText.length > 30 ? userText.substring(0, 30) + '...' : userText;
      const response = await createChatSession(sessionName);
      const newSessionId = response.data.data.session_id;
      
      // 更新状态
      currentSessionId.value = newSessionId;
      await loadSessions(true); // 刷新列表
      
      // 更新 URL
      const newUrl = `${window.location.pathname}?session_id=${newSessionId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      
    } catch (e) {
      console.error('自动创建会话失败:', e);
      alert('无法创建新会话，请重试');
      return;
    }
  }
  
  const userText = inputContent.value;
  
  // 如果当前会话是第一次发消息，用第一句话作为会话名称（异步不阻塞）
  const currentSession = sessions.value.find(s => s.session_id === currentSessionId.value);
  if (currentSession && currentSession.message_count === 0) {
    // 截取前30个字符作为会话名
    const sessionName = userText.length > 30 ? userText.substring(0, 30) + '...' : userText;
    // 不等待更新完成，让它在后台执行
    updateSessionName(currentSessionId.value, sessionName).catch(err => {
      console.error('更新会话名称失败:', err);
    });
  }
  
  messages.value.push({ role: 'user', content: userText, time: getTime(), engine: chatMode.value });
  inputContent.value = '';
  scrollToBottom();

  isTyping.value = true;
  currentAiMessage.value = '';
  
  const aiMessageIndex = messages.value.length;
  messages.value.push({ 
    role: 'ai', 
    content: '', 
    references: null, // 初始化引用
    time: getTime(),
    engine: chatMode.value,
    agentLogs: chatMode.value === 'agent'
      ? { 
          open: true, 
          tab: 'tasks', 
          thinking: [], 
          tasks: [
            {
              id: `init_${Date.now()}`,
              time: getTime(),
              title: 'user_message', // Will be mapped to '接收用户指令'
              status: 'success',
              statusText: '已接收',
              detail: userText
            }
          ], 
          timeline: [], 
          indexByCallId: {}, 
          showThought: true, 
          showPlan: true 
        }
      : null,
  });
  scrollToBottom();

  try {
    const handleStreamMessage = (data) => {
      let content = '';
      let didChange = false;
      
      if (chatMode.value === 'agent') {
        const msg = messages.value[aiMessageIndex];
        const logs = msg?.agentLogs;
        const eventType = data?.type;
        const eventData = data?.data || {};
        const eventTime = data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : getTime();

        if (logs && eventType && eventType !== 'llm_chunk' && eventType !== 'llm_response') {
          const safeJson = (obj) => {
            try {
              return JSON.stringify(obj, null, 2);
            } catch (e) {
              return String(obj);
            }
          };

          const pushThinking = (text) => {
            if (!text) return;
            const item = {
              id: `t_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              time: eventTime,
              text,
            };
            logs.thinking.push(item);
            logs.timeline.push({ type: 'thought', ...item });
          };

          const upsertTaskByCallId = (callId, patch) => {
            const idx = callId ? logs.indexByCallId?.[callId] : undefined;
            if (idx === undefined || idx === null) {
              const item = {
                id: patch.id || `s_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                time: eventTime,
                title: patch.title || '任务',
                summary: patch.summary || '',
                status: patch.status || 'info',
                statusText: patch.statusText || '进行中',
                detail: patch.detail || null,
                open: false,
                callId,
              };
              logs.tasks.push(item);
              if (callId) logs.indexByCallId[callId] = logs.tasks.length - 1;
              
              // 同步到 timeline
              if (callId) {
                  logs.timeline.push({ type: 'tool', ...item, args: patch.detail, result: null });
              }
              return;
            }

            const old = logs.tasks[idx];
            const newItem = {
              ...old,
              ...patch,
              time: eventTime,
            };
            logs.tasks[idx] = newItem;

            // 更新 timeline 中的 tool item
            if (callId) {
                const tIdx = logs.timeline.findIndex(t => t.type === 'tool' && t.callId === callId);
                if (tIdx !== -1) {
                    const oldTool = logs.timeline[tIdx];
                    // 如果有结果，解析出来
                    let result = oldTool.result;
                    if (patch.detail) {
                        try {
                            const d = JSON.parse(patch.detail);
                            if (d.result !== undefined) result = d.result;
                        } catch(e) {}
                    }
                    
                    logs.timeline[tIdx] = { ...oldTool, ...newItem, result };
                }
            }
          };

          if (eventType === 'agent_progress') {
            pushThinking(eventData?.thinking || eventData?.reasoning || '');
            didChange = true;
          } else if (eventType === 'tool_call') {
            const callId = eventData?.call_id || eventData?.callId || '';
            const toolName = eventData?.tool_name || eventData?.tool_id || 'tool';
            upsertTaskByCallId(callId, {
              title: toolName,
              summary: eventData?.thinking || eventData?.reasoning || `准备调用工具: ${toolName}`,
              status: 'queued',
              statusText: '待执行',
              detail: safeJson({ arguments: eventData?.arguments || {} }),
            });
            pushThinking(eventData?.thinking || eventData?.reasoning || '');
            if (!logs.showPlan) logs.showPlan = true;
            didChange = true;
          } else if (eventType === 'tool_executing') {
            const callId = eventData?.call_id || eventData?.callId || '';
            const toolId = eventData?.tool_id || 'tool';
            upsertTaskByCallId(callId, {
              title: toolId,
              summary: eventData?.thinking || eventData?.reasoning || `正在执行: ${toolId}`,
              status: 'running',
              statusText: '执行中',
            });
            if (!logs.showPlan) logs.showPlan = true;
            didChange = true;
          } else if (eventType === 'tool_result') {
            const callId = eventData?.call_id || eventData?.callId || '';
            const toolId = eventData?.tool_id || 'tool';
            const ok = !!eventData?.success;
            const detailObj = {
              result: eventData?.result ?? null,
              error: eventData?.error ?? null,
              execution_time_ms: eventData?.execution_time_ms ?? null,
            };
            upsertTaskByCallId(callId, {
              title: toolId,
              summary: eventData?.thinking || eventData?.reasoning || (ok ? `完成: ${toolId}` : `失败: ${toolId}`),
              status: ok ? 'success' : 'error',
              statusText: ok ? '成功' : '失败',
              detail: safeJson(detailObj),
            });
            didChange = true;
          } else if (eventType === 'doom_loop_detected') {
            logs.tasks.push({
              id: `s_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              time: eventTime,
              title: 'Doom Loop',
              summary: eventData?.message || eventData?.thinking || '检测到循环风险',
              status: 'warning',
              statusText: '警告',
              detail: safeJson(eventData),
              open: false,
            });
            if (!logs.showPlan) logs.showPlan = true;
            didChange = true;
          } else if (eventType === 'iteration_limit_reached' || eventType === 'tool_limit_reached') {
            logs.tasks.push({
              id: `s_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              time: eventTime,
              title: '限制触发',
              summary: eventData?.thinking || eventData?.reasoning || eventType,
              status: 'warning',
              statusText: '已停止',
              detail: safeJson(eventData),
              open: false,
            });
            didChange = true;
          } else if (eventType === 'error') {
            logs.tasks.push({
              id: `s_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              time: eventTime,
              title: '错误',
              summary: eventData?.error || eventData?.thinking || '发生错误',
              status: 'error',
              statusText: '失败',
              detail: safeJson(eventData),
              open: false,
            });
            if (!logs.showPlan) logs.showPlan = true;
            didChange = true;
          } else if (eventType === 'session_complete' || eventType === 'stream_complete') {
            logs.tasks.push({
              id: `s_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              time: eventTime,
              title: '完成',
              summary: eventData?.thinking || eventData?.reasoning || (eventType === 'stream_complete' ? '流式结束' : '会话完成'),
              status: 'success',
              statusText: '完成',
              detail: safeJson(eventData),
              open: false,
            });
            didChange = true;
          } else {
            const summary = eventData?.thinking || eventData?.reasoning || eventType;
            logs.tasks.push({
              id: `s_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              time: eventTime,
              title: eventType,
              summary,
              status: 'info',
              statusText: '信息',
              detail: safeJson(eventData),
              open: false,
            });
            didChange = true;
          }
        }

        if (data?.type === 'llm_chunk') {
          content = data?.data?.content || '';
          if (content) {
            currentAiMessage.value += content;
            didChange = true;
          }
        } else if (data?.type === 'llm_response') {
          content = data?.data?.content || '';
          if (content) {
            currentAiMessage.value = content;
            didChange = true;
          }
        }
      } else {
        // Ask 模式（RAGFlow 引擎）
        if (data.choices && data.choices[0]) {
          content = data.choices[0].delta?.content || '';
        } else if (data.data) {
          if (typeof data.data === 'string') {
            content = data.data;
          } else if (data.data.answer) {
            content = data.data.answer;
          } else if (data.data.content) {
            content = data.data.content;
          }
          
          if (data.data.reference) {
            messages.value[aiMessageIndex].references = data.data.reference;
            didChange = true;
          }
        }
        
        if (content) {
          if (currentAiMessage.value && content.startsWith(currentAiMessage.value)) {
            currentAiMessage.value = content;
            didChange = true;
          } else if (data.data && data.data.answer) {
            currentAiMessage.value = content;
            didChange = true;
          } else {
            currentAiMessage.value += content;
            didChange = true;
          }
        }
      }
      
      if (didChange) {
        messages.value[aiMessageIndex].content = currentAiMessage.value;
        scrollToBottom();
      }
    };
    
    const handleStreamError = (error) => {
      console.error('Chat error:', error);
      isTyping.value = false;
      messages.value[aiMessageIndex].content = `错误: ${error}`;
    };
    
    const handleStreamComplete = () => {
      isTyping.value = false;
      if (!messages.value[aiMessageIndex].content) {
        messages.value[aiMessageIndex].content = '已收到您的消息，但暂时没有回应。';
      }
      scrollToBottom();
      
      trackGenerate(userText, {
        outputId: currentSessionId.value,
        outputType: 'chat_response',
        sessionId: currentSessionId.value,
        engine: chatMode.value
      });
    };
    
    if (chatMode.value === 'agent') {
      await sendSessionChat(
        userText,
        currentSessionId.value,
        {},
        handleStreamMessage,
        handleStreamError,
        handleStreamComplete
      );
    } else {
      await sendChatMessageStream(
        userText,
        currentSessionId.value,
        handleStreamMessage,
        handleStreamError,
        handleStreamComplete
      );
    }
  } catch (error) {
    console.error('Send message failed:', error);
    isTyping.value = false;
    messages.value[aiMessageIndex].content = '连接错误，请重试。';
  }
};

// 滚动到底部（节流）
let scrollTimer = null;
const scrollToBottom = () => {
  if (scrollTimer) return; // 节流：避免频繁滚动
  
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTo({
        top: messagesRef.value.scrollHeight,
        behavior: 'smooth'
      });
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
      }, 100);
    }
  });
};

onMounted(async () => {
  try {
    window.addEventListener('keydown', handleGlobalKeydown);

    // 加载会话列表 (用于菜单)
    await loadSessions(true);

    // 检查 URL 参数
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');

    if (sid) {
       // 如果 URL 有 ID，尝试加载该会话
       await selectSession(sid);
    } else {
       // 否则进入欢迎状态
       currentSessionId.value = null;
       messages.value = [];
    }
  } catch (error) {
    console.error('初始化失败:', error);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Orbitron:wght@500&display=swap');

.aether-panel {
  /* Research Grade Theme Variables */
  --glass-bg: rgba(30, 41, 59, 0.5); /* Slate 800 */
  --glass-border: rgba(148, 163, 184, 0.1); /* Slate 400 */
  --accent-cyan: #38bdf8; /* Sky 400 */
  --accent-indigo: #818cf8; /* Indigo 400 */
  --text-primary: #f1f5f9; /* Slate 100 */
  --text-secondary: #94a3b8; /* Slate 400 */
  
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Inter', sans-serif;
  color: var(--text-primary);
  overflow: hidden;
  /* 更纯净的背景 */
  background: rgba(15, 23, 42, 0.6); 
  backdrop-filter: blur(20px);
  border-left: 1px solid var(--glass-border);
}

.ambient-glow {
  /* 移除过于夸张的顶部辉光，改为极淡的环境光 */
  display: none;
}


.panel-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 1001;
  border-bottom: 1px solid var(--glass-border);
  position: relative;
  background: rgba(15, 23, 42, 0.4);
}

.status-indicator { display: flex; align-items: center; gap: 10px; }
.pulse-dot {
  width: 8px; height: 8px; background: var(--accent-cyan); border-radius: 50%;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.4); 
  /* 移除 pulse 动画，或者使其非常微弱，减少干扰 */
  opacity: 0.8;
}
.status-text { 
  font-family: 'Inter', sans-serif; /* 改回 Inter，更易读 */
  font-weight: 600;
  font-size: 16px; 
  letter-spacing: 0.5px; 
  color: var(--text-primary); 
}
.header-actions { display: flex; gap: 6px; align-items: center; }
.action-dot { width: 4px; height: 4px; background: var(--text-secondary); border-radius: 50%; }

/* 搜索按钮 */
.search-btn {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.search-btn:hover {
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-primary);
}

.search-btn.active {
  background: rgba(56, 189, 248, 0.1);
  color: var(--accent-cyan);
}

/* 搜索栏 */
.search-bar {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
}

.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.search-close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  line-height: 1;
}

.search-close-btn:hover {
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-primary);
}

/* 附件弹窗样式 - UI UX Pro Max */
.noi-modal-card {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.noi-modal-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.noi-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.noi-modal-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.noi-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.noi-modal-body {
  padding: 24px;
}

.attachment-drop-zone {
  border: 2px dashed rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(30, 41, 59, 0.2);
  position: relative;
  overflow: hidden;
  display: block; /* 修复 display flex 导致的布局问题 */
}

.attachment-drop-zone:hover {
  border-color: var(--accent-cyan);
  background: rgba(56, 189, 248, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -10px rgba(56, 189, 248, 0.15);
}

.upload-icon-wrapper {
  width: 64px;
  height: 64px;
  background: rgba(56, 189, 248, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: var(--accent-cyan);
  transition: all 0.3s ease;
}

.attachment-drop-zone:hover .upload-icon-wrapper {
  transform: scale(1.1);
  background: rgba(56, 189, 248, 0.2);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
}

.upload-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.upload-hint {
  font-size: 13px;
  color: var(--text-secondary);
  opacity: 0.8;
}

.selected-files-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 4px;
}

.selected-files-list::-webkit-scrollbar {
  width: 4px;
}

.selected-files-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 2px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.file-item:hover {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(148, 163, 184, 0.2);
  transform: translateX(2px);
}

.file-icon {
  margin-right: 12px;
  color: var(--accent-cyan);
  display: flex;
  align-items: center;
}

.file-name {
  flex: 1;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.file-size {
  color: var(--text-secondary);
  font-size: 12px;
  margin: 0 16px;
  font-family: 'JetBrains Mono', monospace;
}

.remove-file {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  line-height: 1;
  transition: all 0.2s;
  opacity: 0.6;
}

.remove-file:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ff6b6b;
  opacity: 1;
  transform: scale(1.1);
}

.noi-modal-actions {
  padding: 20px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: rgba(15, 23, 42, 0.3);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.noi-btn-primary {
  background: linear-gradient(135deg, var(--accent-cyan) 0%, #0ea5e9 100%);
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.noi-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
  filter: brightness(1.1);
}

.noi-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  background: rgba(148, 163, 184, 0.2);
  color: rgba(255, 255, 255, 0.4);
}

.noi-btn-secondary {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: var(--text-secondary);
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.noi-btn-secondary:hover {
  border-color: rgba(148, 163, 184, 0.4);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

@keyframes modalPop {
  0% { opacity: 0; transform: scale(0.95) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* Message Header (Sender + Timestamp) */
.message-header {
  display: flex;
  align-items: baseline; /* Baseline alignment for better text alignment */
  gap: 8px;
  margin-bottom: 4px;
  padding: 0 4px;
}

.message-sender {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  opacity: 0.9;
}

.timestamp {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.6;
}

/* User: Timestamp [Gap] Sender (Right Aligned) */
.message-group.user .message-header {
  justify-content: flex-end;
  flex-direction: row-reverse; /* Put timestamp (2nd child) on left of sender (1st child) */
}

/* NoI: Sender [Gap] Timestamp (Left Aligned) */
.message-group.ai .message-header {
  justify-content: flex-start;
  flex-direction: row;
}

/* User Message Actions - Optimized */
.message-group.user {
  position: relative;
  display: flex;
  align-items: flex-end; /* 底部对齐，与气泡一致 */
}

.user-message-actions {
  position: absolute;
  top: 50%;
  right: 100%; /* 始终位于容器左侧 */
  left: auto;
  margin-right: 12px; /* 保持固定间距 */
  transform: translateY(-50%) translateX(8px); /* 初始位移用于动画 */
  display: flex;
  gap: 6px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  padding: 6px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10;
  height: 30px; /* 固定高度确保垂直居中一致 */
  align-items: center; /* 内部图标垂直居中 */
}

.message-group.user:hover .user-message-actions {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(0);
}

/* 确保气泡容器也有正确的高度支撑 */
.message-group.user .bubble-wrapper {
  position: relative;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  padding: 0;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: scale(1.1);
}

.action-btn.delete:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.15);
}

.action-btn.retry:hover {
  color: var(--accent-cyan);
  background: rgba(56, 189, 248, 0.15);
}

.clear-search-btn:hover {
  background: var(--accent-cyan);
  color: #0f172a;
}

/* 消息 Part 样式 */
.message-part {
  margin-bottom: 12px;
}

.message-part:last-child {
  margin-bottom: 0;
}

/* 思考过程 Part */
.part-thought {
  background: rgba(30, 41, 59, 0.4);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.1);
  margin-bottom: 16px;
}

.thought-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  background: rgba(30, 41, 59, 0.6);
  transition: background 0.2s;
}

.thought-header:hover {
  background: rgba(30, 41, 59, 0.8);
}

.thought-icon {
  color: var(--text-secondary);
  transition: transform 0.3s ease;
}

.thought-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  flex: 1;
}

.thought-duration {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.8;
}

.thought-chevron {
  color: var(--text-secondary);
  transition: transform 0.3s;
}

.part-thought.expanded .thought-chevron {
  transform: rotate(180deg);
}

.thought-content {
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  font-family: 'JetBrains Mono', monospace;
  white-space: pre-wrap;
  background: rgba(15, 23, 42, 0.3);
}

/* 工具调用 Part */
.part-tool {
  background: rgba(56, 189, 248, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(56, 189, 248, 0.1);
  border-bottom: 1px solid rgba(56, 189, 248, 0.1);
}

.tool-icon {
  font-size: 14px;
}

.tool-name {
  font-size: 13px;
  font-weight: 600;
  color: #38bdf8;
  flex: 1;
}

.tool-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.tool-status.running {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
}

.tool-status.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.tool-content {
  padding: 10px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #cbd5e1;
  overflow-x: auto;
}

.tool-args {
  margin-bottom: 8px;
  color: #94a3b8;
}

.tool-result {
  color: #f1f5f9;
  border-top: 1px dashed rgba(56, 189, 248, 0.2);
  padding-top: 8px;
}

/* 任务规划 Part */
.part-plan {
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  background: rgba(30, 41, 59, 0.4);
  transition: background 0.2s;
}

.plan-header:hover {
  background: rgba(30, 41, 59, 0.6);
}

.plan-icon {
  color: var(--accent-cyan);
  display: flex;
  align-items: center;
}

.plan-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.plan-status {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(148, 163, 184, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.plan-chevron {
  color: var(--text-secondary);
  transition: transform 0.3s;
}

.part-plan.expanded .plan-chevron {
  transform: rotate(180deg);
}

.plan-content {
  padding: 8px 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.plan-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  border-radius: 6px;
}

.plan-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.plan-item-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plan-item-icon.success { color: #4ade80; }
.plan-item-icon.running { color: var(--accent-cyan); }
.plan-item-icon.error { color: #ef4444; }
.plan-item-icon.queued { color: var(--text-secondary); }

.plan-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.3);
}

.plan-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.plan-item-text {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 思考过程内容样式补充 */
.thought-item {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  align-items: flex-start;
}
.thought-time {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.5);
  min-width: 60px;
  margin-top: 2px;
  font-family: 'JetBrains Mono', monospace;
}
.thought-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  flex: 1;
}

/* Tool Card Styles in Timeline */
.tool-card-wrapper {
  margin: 12px 0 12px 70px; /* Indent to align with thought text */
}

.tool-card {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.tool-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(15, 23, 42, 0.6);
}

.tool-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  background: rgba(56, 189, 248, 0.05);
}

.tool-status-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-status-icon.success { color: #4ade80; }
.tool-status-icon.error { color: #ef4444; }
.tool-status-icon.running { color: var(--accent-cyan); }

.tool-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(56, 189, 248, 0.2);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.tool-card-title {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
}

.tool-name-highlight {
  color: var(--accent-cyan);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.tool-card-chevron {
  color: var(--text-secondary);
  transition: transform 0.2s;
  opacity: 0.7;
}

.tool-card-chevron.open {
  transform: rotate(180deg);
}

.tool-card-body {
  border-top: 1px solid rgba(56, 189, 248, 0.1);
  padding: 12px;
  background: rgba(2, 6, 23, 0.2);
}

.tool-section {
  margin-bottom: 12px;
}

.tool-section:last-child {
  margin-bottom: 0;
}

.tool-section-label {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.6);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tool-code-block {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.5);
  padding: 8px;
  border-radius: 4px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.tool-code-block.result {
  color: #94a3b8;
  border-left: 2px solid var(--accent-cyan);
}

/* 文本内容 Part */
.part-text {
  font-size: 15px;
  line-height: 1.7;
  color: #e2e8f0;
}

/* 搜索高亮 */
.message-group.search-highlight {
  background: rgba(56, 189, 248, 0.05);
  border-left: 3px solid var(--accent-cyan);
  padding-left: 8px;
}

.message-group.search-scroll-highlight {
  animation: searchPulse 2s ease-out;
}

@keyframes searchPulse {
  0%, 100% { background: transparent; }
  50% { background: rgba(56, 189, 248, 0.2); }
}

:deep(.search-highlight-mark) {
  background: rgba(56, 189, 248, 0.4);
  color: var(--text-primary);
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
}

/* 搜索动画 */
.search-slide-enter-active,
.search-slide-leave-active {
  transition: all 0.3s ease;
}

.search-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.search-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* --- Messages --- */
.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 1;
}
.scroll-area::-webkit-scrollbar { width: 4px; }
.scroll-area::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 2px; }

.intro-message { text-align: center; margin-bottom: 20px; color: var(--text-secondary); font-size: 12px; letter-spacing: 0.5px; opacity: 0.8; }
.intro-icon { display: block; font-size: 16px; margin-bottom: 5px; color: var(--accent-cyan); }

.message-group { display: flex; flex-direction: column; gap: 6px; max-width: 90%; animation: floatUp 0.3s ease-out; }
.message-group.user { align-self: flex-end; align-items: flex-end; }

.bubble-wrapper { position: relative; display: inline-block; max-width: 100%; }

/* AI 消息样式 - 移除复杂的 glow border，改为干净的卡片 */
.ai-border-glow {
  display: none; /* 移除旧的边框辉光 */
}

/* 
.message-group.ai .bubble {
  background: transparent; 
  border: none; 
  box-shadow: none; 
  padding: 0; 
} 
*/

.message-group.ai .bubble-text {
  padding: 0; /* 移除内边距 */
  background: transparent; /* 移除背景色 */
  border: none; /* 移除边框 */
  border-radius: 0; /* 移除圆角 */
  margin-top: 8px; /* 与上面的思考面板拉开距离 */
}

.message-group.user .bubble {
  background: rgba(56, 189, 248, 0.15); /* Sky 400 15% */
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 12px 12px 4px 12px; /* 右下角尖角 */
  color: #fff;
  padding: 12px 16px; /* 保持用户的 padding */
}

.bubble {
  font-size: 14px;
  line-height: 1.6;
  position: relative;
  backdrop-filter: blur(0px); /* 不需要 blur，提高性能 */
  z-index: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

/* Trae Agent Panel Styles - Redesigned */
.trae-agent {
  margin-top: 0;
  margin-bottom: 12px;
  background: rgba(30, 41, 59, 0.2);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.trae-agent:hover {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.3);
}

.trae-agent-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.trae-agent-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trae-agent-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.trae-agent-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.trae-agent-icon.spinning {
  animation: spin 2s linear infinite;
  color: var(--accent-cyan);
}

.trae-agent-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.trae-mini-stat {
  font-size: 12px;
  color: var(--text-secondary);
}

.trae-chevron {
  transition: transform 0.2s ease;
  opacity: 0.6;
}

.trae-chevron.open {
  transform: rotate(180deg);
}

.trae-agent-body {
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  padding: 12px;
  background: rgba(15, 23, 42, 0.2);
}

/* 引用文件列表 */
.trae-ref-files {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trae-file-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.trae-file-link:hover {
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-primary);
}

/* 简化版任务列表 */
.trae-step-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-left: 4px;
}

.step-icon-success {
  color: #4ade80; /* Green 400 */
  display: flex;
  align-items: center;
}

.trae-simple-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  border-radius: 6px;
  transition: background 0.2s;
}

.trae-simple-step:hover {
  background: rgba(148, 163, 184, 0.05);
}

.trae-simple-step-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.3);
}

.state-running .step-dot {
  background: var(--accent-cyan);
  box-shadow: 0 0 4px var(--accent-cyan);
}

.trae-simple-step-content {
  flex: 1;
  min-width: 0;
}

.step-text {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.state-running .step-text {
  color: var(--text-primary);
}

/* 底部生成条 */
.trae-generating-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(56, 189, 248, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.1);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.trae-spinner-sm {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.trae-agent-list {
  max-height: 220px;
  overflow: auto;
  padding-right: 4px;
}

.trae-step {
  display: flex;
  gap: 10px;
  padding: 8px 0;
}

.trae-step-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
}

.trae-step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.35);
  border: 1px solid rgba(148, 163, 184, 0.25);
  margin-top: 2px;
}

.trae-step-line {
  width: 2px;
  flex: 1;
  background: rgba(148, 163, 184, 0.14);
  margin-top: 6px;
  border-radius: 2px;
}

.trae-step-main {
  flex: 1;
  min-width: 0;
}

.trae-step-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.trae-step-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  color: rgba(241, 245, 249, 0.8);
  background: rgba(15, 23, 42, 0.18);
}

.trae-step-summary {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(241, 245, 249, 0.85);
  line-height: 1.5;
  white-space: pre-wrap;
}

.trae-step-card {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.16);
  overflow: hidden;
}

.trae-step-card-head {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 10px;
  cursor: pointer;
  color: inherit;
}

.trae-step-card-head:hover {
  background: rgba(56, 189, 248, 0.06);
}

.trae-step-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.trae-step-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.trae-step-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.trae-step-meta {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.9);
  white-space: nowrap;
}

.trae-chevron {
  color: rgba(148, 163, 184, 0.9);
  transition: transform 0.15s ease;
}

.trae-chevron.open {
  transform: rotate(180deg);
}

.trae-step-card-body {
  padding: 0 10px 10px 10px;
}

.trae-step-detail-empty {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.9);
  padding-top: 6px;
}

.trae-spinner {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(56, 189, 248, 0.25);
  border-top-color: rgba(56, 189, 248, 0.95);
  animation: traeSpin 0.9s linear infinite;
}

@keyframes traeSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.trae-step-detail {
  margin-top: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.10);
  color: rgba(226, 232, 240, 0.9);
  font-size: 11px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre-wrap;
}

.trae-thought {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 6px 0;
}

.trae-thought-time {
  min-width: 72px;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.9);
  white-space: nowrap;
}

.trae-thought-text {
  flex: 1;
  font-size: 12px;
  color: rgba(241, 245, 249, 0.85);
  white-space: pre-wrap;
  word-break: break-word;
}

.state-queued {
  background: rgba(148, 163, 184, 0.35);
  border-color: rgba(148, 163, 184, 0.25);
}

.state-running {
  background: rgba(56, 189, 248, 0.45);
  border-color: rgba(56, 189, 248, 0.35);
}

.state-success {
  background: rgba(34, 197, 94, 0.45);
  border-color: rgba(34, 197, 94, 0.35);
}

.state-warning {
  background: rgba(245, 158, 11, 0.45);
  border-color: rgba(245, 158, 11, 0.35);
}

.state-error {
  background: rgba(239, 68, 68, 0.45);
  border-color: rgba(239, 68, 68, 0.35);
}

.state-info {
  background: rgba(148, 163, 184, 0.35);
  border-color: rgba(148, 163, 184, 0.25);
}

/* Markdown 样式 - 优化可读性 */
:deep(.bubble-text) {
  /* 表格 */
  table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; border-radius: 8px; overflow: hidden; border-style: hidden; box-shadow: 0 0 0 1px rgba(148,163,184,0.2); }
  th, td { border: 1px solid rgba(148, 163, 184, 0.15); padding: 8px 12px; text-align: left; }
  th { background: rgba(15, 23, 42, 0.3); font-weight: 600; color: var(--text-primary); }
  tr:nth-child(even) { background: rgba(255, 255, 255, 0.02); }
  
  /* 段落 */
  p { margin: 0 0 8px 0; }
  p:last-child { margin-bottom: 0; }
  
  /* 代码块 */
  pre { background: #0f172a; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 10px 0; border: 1px solid rgba(148,163,184,0.1); }
  code { background: rgba(148, 163, 184, 0.15); padding: 2px 5px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; color: #e2e8f0; }
  pre code { background: transparent; padding: 0; color: #e2e8f0; }
  
  /* 列表 */
  ul, ol { padding-left: 20px; margin: 8px 0; }
  li { margin: 4px 0; color: #e2e8f0; }
  
  /* 标题 */
  h1, h2, h3, h4 { margin-top: 1.2em; margin-bottom: 0.5em; line-height: 1.3; font-weight: 600; color: #f8fafc; }
  h1 { font-size: 1.4em; border-bottom: 1px solid rgba(148,163,184,0.2); padding-bottom: 0.3em; }
  h2 { font-size: 1.2em; }
  h3 { font-size: 1.1em; color: var(--accent-cyan); }
  
  /* 引用 */
  blockquote { border-left: 3px solid var(--accent-cyan); margin: 10px 0; padding-left: 12px; color: var(--text-secondary); background: rgba(56, 189, 248, 0.05); padding: 8px 12px; border-radius: 0 4px 4px 0; }

  /* 链接 */
  a { color: var(--accent-cyan); text-decoration: none; border-bottom: 1px solid rgba(56, 189, 248, 0.3); transition: all 0.2s; }
  a:hover { background: rgba(56, 189, 248, 0.1); border-color: var(--accent-cyan); }
  
  /* 分割线 */
  hr { border: 0; border-top: 1px solid rgba(148,163,184,0.2); margin: 16px 0; }
}

/* 引用区域容器 */
.ref-container {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: refFadeIn 0.3s ease-out;
}

@keyframes refFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
  font-weight: 600;
}

/* 1. 图表区域 (Figures) */
.ref-figures-section {
  width: 100%;
}

.figures-scroller {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px; /* 留出滚动条空间 */
}

/* 隐藏滚动条但保留功能 */
.figures-scroller::-webkit-scrollbar {
  height: 4px;
}
.figures-scroller::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.figure-card {
  flex: 0 0 auto;
  width: 140px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.figure-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 255, 255, 0.2);
}

.figure-image-wrapper {
  height: 90px;
  width: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.figure-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.9;
  transition: opacity 0.2s;
}

.figure-card:hover .figure-image {
  opacity: 1;
}

.figure-caption {
  padding: 6px 8px;
  font-size: 10px;
  color: var(--accent-cyan);
  background: rgba(0, 0, 0, 0.3);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 2. 文档列表区域 (Reference Sources) */
.ref-docs-section {
  display: flex;
  flex-direction: column;
}

.docs-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.doc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.2s;
  cursor: pointer;
}

.doc-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateX(4px);
}

.doc-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}

.doc-icon {
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.doc-info {
  flex: 1;
  min-width: 0; /* 允许文本截断 */
}

.doc-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.doc-count {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

/* --- 修复点 2：AI 气泡本体 --- */
.message-group.ai .bubble {
  /* 现代卡片风格 - 美化版 */
  background: rgba(15, 23, 42, 0.45); /* 深色半透明背景，比面板略深 */
  border: 1px solid rgba(148, 163, 184, 0.1); /* 极细微的边框 */
  border-radius: 12px;
  
  /* 阴影增加层次感 */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  
  color: rgba(255, 255, 255, 0.95);
  padding: 16px 24px; /* 增加内边距，提升呼吸感 */
  margin-top: 4px;
  position: relative;
  overflow: hidden; /* 防止内部内容溢出圆角 */
}

/* 移除之前可能存在的强制透明覆盖 */
.message-group.ai .bubble-text {
  background: transparent;
  padding: 0;
}

/* 确保内部文本元素背景透明，避免遮挡卡片背景 */
.message-group.ai .bubble-text :deep(p),
.message-group.ai .bubble-text :deep(div),
.message-group.ai .bubble-text :deep(span) {
  background-color: transparent;
}

/* 恢复代码块等特殊元素的背景 */
.message-group.ai .bubble-text :deep(pre) {
    background: #0f172a !important;
    border: 1px solid rgba(148, 163, 184, 0.1);
    border-radius: 8px;
    margin: 12px 0;
}

.message-group.ai .bubble-text :deep(code) {
    background: rgba(148, 163, 184, 0.15);
    padding: 2px 5px;
    border-radius: 4px;
}
.user .bubble { background: linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 150, 255, 0.15) 100%); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 16px 16px 4px 16px; color: #fff; text-shadow: 0 0 10px rgba(0,0,0,0.5); }


/* Typing */
.typing-bubble { display: flex; gap: 6px; padding: 18px 24px !important; }
.typing-dot { width: 4px; height: 4px; background: var(--accent-cyan); border-radius: 50%; animation: wave 1.4s infinite ease-in-out; }
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

/* --- 3. NotebookLM Style Input Dock --- */
.input-dock {
  padding: 24px 30px 20px 30px;
  z-index: 5;
  /* 底部稍微加深一点背景，突出输入框 */
  background: linear-gradient(0deg, rgba(0,5,10,0.6) 0%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 核心输入框容器：胶囊状 */
.notebook-capsule {
  display: flex;
  align-items: center;
  /* 玻璃背景 */
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px; /* 大圆角胶囊 */
  padding: 8px 8px 8px 16px; /* 右侧padding小一点，因为按钮自带margin */
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.notebook-capsule:focus-within {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(0, 255, 255, 0.3); /* 聚焦时亮青色边框 */
  box-shadow: 0 8px 30px rgba(0, 255, 255, 0.1); /* 聚焦时辉光 */
  transform: translateY(-2px);
}

input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 15px;
  outline: none;
  font-weight: 400;
  padding: 0 10px;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* 按钮通用样式 */
.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

/* 左侧添加按钮 */
.add-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-right: 4px;
}
.add-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}

/* 右侧发送按钮 */
.send-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
}
.send-btn.is-active {
  background: var(--accent-cyan);
  color: #000;
  box-shadow: 0 0 10px var(--accent-cyan);
}
.send-btn:hover.is-active {
  transform: scale(1.05);
}

/* 底部免责声明 */
.dock-footer {
  text-align: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5px;
}

/* 动画 */
@keyframes pulse {
  0% { opacity: 0.5; box-shadow: 0 0 0 var(--accent-cyan); }
  50% { opacity: 1; box-shadow: 0 0 10px var(--accent-cyan); }
  100% { opacity: 0.5; box-shadow: 0 0 0 var(--accent-cyan); }
}
@keyframes wave {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
@keyframes floatUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 会话菜单样式 */
.menu-btn {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: all 0.2s;
}

.menu-btn:hover {
  opacity: 0.7;
}


.hoverable {
  cursor: zoom-in;
  transition: transform 0.2s;
  border: 1px solid rgba(0, 255, 255, 0.2);
}

.hoverable:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  border-color: var(--accent-cyan);
}

/* --- New Design Styles --- */

/* Header Updates */
.header-left-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-toggle-btn:hover {
  color: var(--accent-cyan);
  background: rgba(56, 189, 248, 0.1);
}

.action-icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-icon-btn:hover, .action-icon-btn.active {
  color: var(--accent-cyan);
  background: rgba(56, 189, 248, 0.1);
}

/* 画像上下文指示器 */
.context-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 8px;
}

.context-indicator:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.4);
}

.context-indicator.active {
  border-color: rgba(56, 189, 248, 0.5);
}

.context-indicator.loading {
  opacity: 0.7;
}

.indicator-icon {
  font-size: 12px;
}

.indicator-text {
  font-size: 11px;
  color: #38bdf8;
  font-weight: 500;
}

/* 画像上下文预览面板 */
.context-preview-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.98);
  border-bottom: 1px solid var(--glass-border);
  z-index: 999;
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.preview-close {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}

.preview-close:hover {
  color: #f1f5f9;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.preview-text {
  margin: 0;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  color: #94a3b8;
  white-space: pre-wrap;
  line-height: 1.6;
}

.preview-footer {
  padding: 12px 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  justify-content: flex-end;
}

.preview-refresh {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-refresh:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.2);
}

.preview-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 上下文预览动画 */
.context-slide-enter-active,
.context-slide-leave-active {
  transition: all 0.3s ease;
}

.context-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.context-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 消息反馈按钮 */
.feedback-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-group:hover .feedback-buttons {
  opacity: 1;
}

.feedback-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-btn:hover {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.feedback-btn.like:hover,
.feedback-btn.like.active {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.feedback-btn.dislike:hover,
.feedback-btn.dislike.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* History Drawer */
.history-drawer {
  position: absolute;
  top: 0;
  left: 0;
  width: 280px;
  height: 100%;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--glass-border);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  box-shadow: 10px 0 30px rgba(0,0,0,0.5);
}

.drawer-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--glass-border);
}

.drawer-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
  letter-spacing: 0.5px;
}

.close-drawer-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.new-chat-row {
  margin-bottom: 20px;
}

.new-session-btn-full {
  width: 100%;
  padding: 10px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px dashed rgba(56, 189, 248, 0.3);
  color: var(--accent-cyan);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.new-session-btn-full:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: var(--accent-cyan);
}

.history-group {
  margin-bottom: 24px;
}

.group-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-left: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.history-item.active {
  background: rgba(56, 189, 248, 0.1);
}

.history-icon {
  font-size: 14px;
  opacity: 0.6;
}

.history-info {
  flex: 1;
  overflow: hidden;
}

.history-title {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.history-item.active .history-title {
  color: var(--accent-cyan);
}

.history-meta {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.6;
}

.history-delete-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
  font-size: 16px;
  padding: 0 4px;
}

.history-item:hover .history-delete-btn {
  opacity: 1;
}

.history-delete-btn:hover {
  color: #ef4444;
}

.drawer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 1999;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(-100%);
}

/* Recent Sessions Bubbles */
.recent-sessions-bubbles {
  margin-top: 40px;
  text-align: left;
  width: 100%;
  max-width: 600px;
}

.recent-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  padding-left: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bubbles-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.recent-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  max-width: 200px;
}

.recent-bubble:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateY(-2px);
}

.recent-icon {
  font-size: 12px;
  color: var(--accent-cyan);
}

.recent-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-bubble:hover .recent-text {
  color: var(--text-primary);
}

/* Context Capsule Area */
.context-capsule-area {
  padding-bottom: 8px;
  display: flex;
  align-items: center;
}

.context-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  color: var(--accent-cyan);
}

.pill-close {
  background: transparent;
  border: none;
  color: var(--accent-cyan);
  cursor: pointer;
  font-size: 14px;
  opacity: 0.6;
  padding: 0 2px;
}

.pill-close:hover {
  opacity: 1;
}

/* Input Card Redesign */
.input-card {
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  min-height: 88px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.input-card:focus-within {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(56, 189, 248, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(56, 189, 248, 0.1);
}

.input-card.has-context {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  border-top: none;
}

.chat-textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 15px;
  outline: none;
  padding: 4px;
  resize: none;
  max-height: 200px;
  font-family: inherit;
  line-height: 1.6;
  min-height: 40px;
}

.chat-textarea::placeholder {
  color: rgba(148, 163, 184, 0.4);
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 4px;
}

.left-tools {
  display: flex;
  gap: 8px;
}

.mode-selector {
  display: flex;
  background: rgba(2, 6, 23, 0.4);
  padding: 3px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  gap: 2px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.03);
}

.mode-btn.active {
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Agent 模式激活样式 - 紫色系 */
.mode-btn:nth-child(1).active {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
}

/* Ask 模式激活样式 - 青色系 */
.mode-btn:nth-child(2).active {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
}

.right-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-btn {
  width: 32px;
  height: 32px;
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  background: rgba(148, 163, 184, 0.15);
  color: #f1f5f9;
  border-color: rgba(148, 163, 184, 0.1);
}

.send-btn-rect {
  background: rgba(56, 189, 248, 0.1);
  color: rgba(56, 189, 248, 0.4);
  border: none;
  padding: 0 16px;
  height: 32px;
  border-radius: 8px;
  cursor: not-allowed;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.send-btn-rect.is-active {
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(14, 165, 233, 0.3);
}

.send-btn-rect.is-active:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
}

.send-icon {
  width: 14px;
  height: 14px;
}

/* Custom Scrollbar for Drawer */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 2px; }
</style>

<!-- 全局样式用于 Teleport 的模态框 -->
<style>
/* 图片悬浮预览样式 */
.image-hover-preview {
  position: fixed;
  z-index: 9999;
  pointer-events: none; /* 关键：穿透预览层，确保鼠标事件依然由下方元素触发 */
  background: rgba(10, 15, 25, 0.9);
  backdrop-filter: blur(12px);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  /* 初始不可见，通过 v-if 控制，如果不使用 v-if 则需要 opacity 控制 */
  animation: popIn 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

.preview-image-hover {
  max-width: 500px;
  max-height: 500px;
  border-radius: 4px;
  object-fit: contain;
}

.preview-caption-hover {
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  max-width: 400px;
  text-align: center;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* ===== Teleport: 删除确认弹窗（居中） ===== */
.noi-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(1200px 600px at 50% 30%, rgba(56, 189, 248, 0.12), transparent 60%),
              rgba(2, 6, 23, 0.66);
  backdrop-filter: blur(10px);
}

.noi-modal-card {
  /* Fix: Define variables for Teleported modal content */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --accent-cyan: #38bdf8;

  width: min(560px, 90vw);
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow:
    0 24px 60px -12px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(56, 189, 248, 0.1) inset;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  transform: translateZ(0);
}

.noi-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.noi-modal-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.20);
  box-shadow: 0 0 22px rgba(239, 68, 68, 0.12);
}

.noi-modal-titles { flex: 1; min-width: 0; }
.noi-modal-title { font-weight: 700; letter-spacing: 0.3px; color: #f1f5f9; font-size: 1.1rem; }
.noi-modal-subtitle { margin-top: 2px; font-size: 0.85rem; color: rgba(148, 163, 184, 0.8); }

.noi-modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(148, 163, 184, 0.6);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.noi-modal-close:hover { background: rgba(148, 163, 184, 0.1); color: #f1f5f9; }

.noi-modal-body { padding: 24px; }
.noi-modal-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.25);
  border: 1px solid rgba(148, 163, 184, 0.12);
}
.noi-modal-label { font-size: 0.82rem; color: rgba(148, 163, 184, 0.95); width: 44px; flex: 0 0 auto; }
.noi-modal-value {
  flex: 1;
  min-width: 0;
  color: #e2e8f0;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.noi-modal-hint { margin-top: 12px; color: rgba(148, 163, 184, 0.95); font-size: 0.92rem; line-height: 1.45; }

.noi-modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 18px 18px; }
.noi-btn-secondary,
.noi-btn-danger,
.noi-btn-primary {
  border-radius: 10px;
  padding: 10px 18px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.noi-btn-secondary {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.15);
  color: rgba(226, 232, 240, 0.8);
}
.noi-btn-secondary:hover { 
  background: rgba(148, 163, 184, 0.2); 
  color: #f8fafc;
  transform: translateY(-1px);
}

.noi-btn-primary {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}
.noi-btn-primary:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.15);
  transform: translateY(-1px);
}

.noi-btn-danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}
.noi-btn-danger:hover:not(:disabled) { 
  background: rgba(239, 68, 68, 0.2); 
  transform: translateY(-1px); 
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15); 
}

.noi-btn-secondary:disabled,
.noi-btn-danger:disabled,
.noi-btn-primary:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
  transform: none; 
  box-shadow: none; 
  filter: grayscale(0.5);
}

.noi-btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 8px;
  border-radius: 999px;
  border: 2px solid rgba(226, 232, 240, 0.35);
  border-top-color: rgba(226, 232, 240, 0.95);
  animation: noiSpin 0.9s linear infinite;
  vertical-align: -2px;
}
@keyframes noiSpin { to { transform: rotate(360deg); } }

/* Teleport 过渡 */
.noi-fade-enter-active,
.noi-fade-leave-active { transition: opacity 0.18s ease; }
.noi-fade-enter-from,
.noi-fade-leave-to { opacity: 0; }

.noi-modal-pop-enter-active { transition: transform 0.18s ease, opacity 0.18s ease; }
.noi-modal-pop-leave-active { transition: transform 0.14s ease, opacity 0.14s ease; }
.noi-modal-pop-enter-from,
.noi-modal-pop-leave-to { opacity: 0; transform: translateY(10px) scale(0.985); }
</style>



<style scoped>
/* 会话菜单 (Research Grade) */
.session-menu {
  position: absolute;
  top: 60px;
  right: 20px;
  width: 320px;
  background: rgba(30, 41, 59, 0.95); /* Slate 800 */
  border: 1px solid rgba(148, 163, 184, 0.2); /* Slate 400 */
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

.menu-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(15, 23, 42, 0.4);
}

.menu-title {
  font-weight: 600;
  color: #f1f5f9;
  font-size: 0.95rem;
}

.new-session-btn {
  background: rgba(56, 189, 248, 0.1); /* Sky 400 */
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.new-session-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
}

.session-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
}

.session-list::-webkit-scrollbar {
  width: 4px;
}

.session-list::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

.session-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

.session-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.session-item:hover {
  background: rgba(148, 163, 184, 0.1);
}

.session-item.active {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.2);
}

.session-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-name {
  color: #e2e8f0;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item.active .session-name {
  color: #38bdf8;
  font-weight: 500;
}

.session-meta {
  color: #64748b;
  font-size: 0.75rem;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  opacity: 0;
  transition: all 0.2s;
  font-size: 1.2rem;
  line-height: 1;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
}

.empty-state {
  padding: 30px;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}

.load-more-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: none;
  color: #38bdf8;
  cursor: pointer;
  font-size: 0.85rem;
  margin-top: 8px;
}

.load-more-btn:hover {
  text-decoration: underline;
}

/* 菜单动画 */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* 引用提示框 */
.citation-tooltip {
  position: fixed;
  z-index: 9999;
  background: linear-gradient(135deg, rgba(15, 20, 30, 0.96) 0%, rgba(10, 15, 25, 0.96) 100%);
  border: 1.5px solid rgba(0, 255, 255, 0.4);
  border-radius: 10px;
  padding: 0;
  max-width: 450px;
  min-width: 320px;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(0, 255, 255, 0.15) inset,
    0 0 30px rgba(0, 255, 255, 0.25);
  backdrop-filter: blur(25px);
  /* pointer-events: none; 防止鼠标干扰 */
  pointer-events: auto;
  /* 移除固定 transform，改为 JS 动态计算 */
  /* transform: translateY(-100%) translateY(-10px); */
  font-family: 'Inter', sans-serif;
  animation: tooltipFadeIn 0.25s ease-out;
  overflow: hidden;
}
.citation-tooltip::after {
  content: "";
  position: absolute;
  bottom: -20px; /* 向下延伸 */
  left: 0;
  right: 0;
  height: 20px; /* 高度覆盖间隙 */
  background: transparent; /* 透明但能接收鼠标事件 */
}
.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 255, 255, 0.08);
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
}

.tooltip-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(0, 255, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.tooltip-similarity {
  font-size: 11px;
  color: rgba(0, 255, 255, 0.9);
  background: rgba(0, 255, 255, 0.15);
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
  border: 1px solid rgba(0, 255, 255, 0.25);
}

.tooltip-content {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.95);
  padding: 16px 16px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: rgba(0, 0, 0, 0.2);
}

.tooltip-content::-webkit-scrollbar {
  width: 5px;
}

.tooltip-content::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.4);
  border-radius: 3px;
}

.tooltip-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.tooltip-source {
  font-size: 13px;
  color: rgba(0, 255, 255, 0.95);
  padding: 12px 16px;
  background: rgba(0, 255, 255, 0.05);
  border-top: 1px solid rgba(0, 255, 255, 0.15);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tooltip-source::before {
  content: '📄';
  font-size: 14px;
  flex-shrink: 0;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-100%) translateY(-5px); /* 减少位移幅度 */
  }
  to {
    opacity: 1;
    transform: translateY(-100%) translateY(-10px);
  }
}

/* 内联引用样式 (动态注入) */
:deep(.citation-ref-inline) {
  color: var(--accent-cyan);
  font-weight: 600;
  cursor: pointer;
  margin: 0 2px;
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(0, 255, 255, 0.08);
  transition: all 0.2s;
  display: inline-block;
  font-size: 0.9em;
  border: 1px solid rgba(0, 255, 255, 0.2);
}

:deep(.citation-ref-inline:hover) {
  background: rgba(0, 255, 255, 0.15);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
  border-color: rgba(0, 255, 255, 0.4);
  transform: translateY(-1px);
}

/* Welcome Screen Styles */
.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  opacity: 0;
  animation: fadeIn 0.8s ease-out forwards;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.welcome-logo {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.logo-icon {
  font-size: 40px;
  color: var(--accent-cyan);
  z-index: 2;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
}

.logo-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(0, 255, 255, 0.3);
  animation: pulse-ring 3s infinite;
}

.welcome-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 2px;
  margin: 0;
  background: linear-gradient(135deg, #fff 0%, rgba(0, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.welcome-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 40px;
  font-weight: 300;
}

.welcome-hints {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  max-width: 600px;
}

.hint-item {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.hint-item:hover {
  background: rgba(0, 255, 255, 0.08);
  border-color: rgba(0, 255, 255, 0.3);
  color: var(--accent-cyan);
  transform: translateY(-2px);
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0; }
  50% { opacity: 0.5; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes fadeIn {
  to { opacity: 1; }
}
</style>
