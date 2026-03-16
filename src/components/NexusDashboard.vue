<template>
  <div class="nexus-container">
    <div class="dashboard-header">
      <h1 class="glitch-text" data-text="枢纽控制台">枢纽控制台</h1>
      <div class="system-time">{{ currentTime }}</div>
    </div>

    <div class="grid-layout">
      <!-- 核心指标卡片 -->
      <div class="glass-panel stat-card">
        <div class="card-icon">🧠</div>
        <div class="card-content">
          <div class="stat-label">神经节点</div>
          <div class="stat-value">1,024</div>
          <div class="stat-trend positive">▲ 本周 12%</div>
        </div>
      </div>

      <div class="glass-panel stat-card">
        <div class="card-icon">⚡</div>
        <div class="card-content">
          <div class="stat-label">突触连接</div>
          <div class="stat-value">8,192</div>
          <div class="stat-trend positive">▲ 本周 5%</div>
        </div>
      </div>

      <div class="glass-panel stat-card">
        <div class="card-icon">💾</div>
        <div class="card-content">
          <div class="stat-label">向量存储</div>
          <div class="stat-value">450 MB</div>
          <div class="stat-trend neutral">● 稳定</div>
        </div>
      </div>

      <!-- 系统状态图表 (模拟) -->
      <div class="glass-panel main-chart">
        <div class="panel-title">系统负载</div>
        <div class="chart-placeholder">
          <div class="bar" style="height: 40%"></div>
          <div class="bar" style="height: 60%"></div>
          <div class="bar" style="height: 30%"></div>
          <div class="bar" style="height: 80%"></div>
          <div class="bar" style="height: 50%"></div>
          <div class="bar" style="height: 70%"></div>
          <div class="bar" style="height: 45%"></div>
          <div class="bar" style="height: 65%"></div>
          <div class="bar" style="height: 90%"></div>
          <div class="bar" style="height: 55%"></div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="glass-panel recent-activity">
        <div class="panel-title">最近上传</div>
        <ul class="activity-list">
          <li v-for="(item, index) in activities" :key="index" class="activity-item">
            <span class="status-dot" :class="item.status"></span>
            <span class="activity-name">{{ item.name }}</span>
            <span class="activity-time">{{ item.time }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const currentTime = ref('');
const activities = ref([
  { name: 'Quantum_Mechanics_Basics.pdf', time: '10 min ago', status: 'success' },
  { name: 'AI_Ethics_Protocol_v2.docx', time: '1 hour ago', status: 'processing' },
  { name: 'Neural_Network_Architecture.pdf', time: '3 hours ago', status: 'success' },
  { name: 'Mars_Colonization_Plan.txt', time: '1 day ago', status: 'failed' },
]);

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false });
};

let timer;
onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<style scoped>
.nexus-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  padding-bottom: 16px;
}

.glitch-text {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 1.8rem;
  color: #f1f5f9;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
  text-shadow: none; /* 移除故障效果 */
}

.system-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.3);
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr;
  gap: 24px;
  height: calc(100% - 80px);
}

.glass-panel {
  background: rgba(30, 41, 59, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.glass-panel:hover {
  border-color: rgba(56, 189, 248, 0.3);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Stat Cards */
.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
}

.card-icon {
  font-size: 2rem;
  background: rgba(56, 189, 248, 0.1);
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #38bdf8;
}

.stat-label {
  color: #94a3b8;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.stat-value {
  font-family: 'Inter', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 4px 0;
}

.stat-trend {
  font-size: 0.85rem;
  font-weight: 500;
}
.stat-trend.positive { color: #10b981; } /* Emerald 500 */
.stat-trend.neutral { color: #94a3b8; }
.stat-trend.negative { color: #ef4444; }

/* Main Chart Area */
.main-chart {
  grid-column: span 2;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 24px;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-title::before {
  content: '';
  display: block;
  width: 4px;
  height: 16px;
  background: #38bdf8;
  border-radius: 2px;
}

.chart-placeholder {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 0;
}

.bar {
  flex: 1;
  background: linear-gradient(to top, rgba(56, 189, 248, 0.2), rgba(56, 189, 248, 0.6));
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  position: relative;
}
.bar::after {
  display: none; /* 移除顶部发光条 */
}

/* Recent Activity */
.recent-activity {
  grid-column: span 1;
  overflow-y: auto;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}
.activity-item:last-child {
  border-bottom: none;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 12px;
}
.status-dot.success { background: #10b981; }
.status-dot.processing { background: #f59e0b; animation: pulse 2s infinite; }
.status-dot.failed { background: #ef4444; }

.activity-name {
  flex: 1;
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-time {
  color: #64748b;
  font-size: 0.8rem;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
</style>