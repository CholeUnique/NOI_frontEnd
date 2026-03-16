<template>
  <div ref="container" class="universe-container" :class="{ 'is-resizing': isResizing }">
    <div class="warp-overlay" :style="{ opacity: overlayOpacity, backgroundColor: overlayColor }"></div>
    
    <div v-if="hoveredPlanet" v-show="!isNavigating && !showUploadModal" class="hud-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
      <h3>{{ hoveredPlanet.name }}</h3>
      <div class="hud-line"></div>
      <p>知识库: {{ hoveredPlanet.count }}</p>
      <p class="click-hint">点击探索</p>
    </div>

    <div class="upload-trigger" @click="showUploadModal = true" v-show="!isNavigating">
      <div class="trigger-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <span class="trigger-text">上传知识</span>
    </div>

    <KnowledgeInjectionModal :show="showUploadModal" @close="showUploadModal = false" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, onActivated, onDeactivated, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGalaxyStore } from '../stores/galaxy';
import { useAuthStore } from '../stores/auth';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import KnowledgeInjectionModal from '../components/KnowledgeInjectionModal.vue';

// ... 状态定义保持不变 ...
const container = ref(null);
const store = useGalaxyStore();
const authStore = useAuthStore();
const router = useRouter();
const hoveredPlanet = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const isNavigating = ref(false);
const overlayOpacity = ref(1);
const overlayColor = ref('#000000'); 
const showUploadModal = ref(false);
const isResizing = ref(false);

let scene, camera, renderer, labelRenderer, composer, controls;
let planets = []; 
let particles;   
let raycaster, mouse;
let animationId;
let galaxy;
let resizeObserver; 
let resizeTimer = null; // 用于防抖

// --- Three.js 初始化 ---
const initThree = () => {
  if (!container.value) return;
  const width = container.value.clientWidth;
  const height = container.value.clientHeight;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.002);

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
  camera.position.set(0, 30, 60);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height); // 初始设置
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  container.value.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.value.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.maxDistance = 200;
  controls.minDistance = 20;

  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  const sunLight = new THREE.PointLight(0xffffff, 2, 500);
  sunLight.position.set(0, 50, 0);
  scene.add(sunLight);

  const renderScene = new RenderPass(scene, camera);
  // 根据设备性能调整 Bloom 参数
  const isHighPerformance = navigator.hardwareConcurrency >= 8;
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height), 
    isHighPerformance ? 1.5 : 1.0, 
    0.4, 
    isHighPerformance ? 0.85 : 0.7
  );
  bloomPass.threshold = 0.1;
  bloomPass.strength = isHighPerformance ? 1.2 : 0.8;
  bloomPass.radius = 0.5;
  
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  createBackground();
  createGalaxy();
  createPlanets();

  // ★★★ 核心修改 1：ResizeObserver 只做“防抖后的最终修正” ★★★
  resizeObserver = new ResizeObserver(() => {
    // 只要触发 resize，立即标记为“正在调整”，触发 CSS 淡出
    isResizing.value = true;
    // 只有当尺寸停止变化 100ms 后，才真正重置缓冲区大小 (Sharpness)
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      finalResizeUpdate();
      isResizing.value = false; // 动画结束，淡入标签
    }, 150);
  });
  resizeObserver.observe(container.value);
  
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);
  
  animate();
  startEntranceAnimation(); 
};

// --- KeepAlive 生命周期管理 ---
onActivated(() => {
  // 重置导航状态，防止返回时黑屏或无法交互
  if (isNavigating.value) {
    isNavigating.value = false;
    overlayOpacity.value = 0;
    controls.enabled = true;
    //重置相机位置到初始视角（可选，或者保留当前视角）
    camera.position.set(0, 30, 60);
    // camera.lookAt(0, 0, 0);
  }

  // 当组件被缓存并重新激活时，重新启动动画循环
  if (!animationId && scene) {
    animate();
  }
  // 重新连接 ResizeObserver
  if (resizeObserver && container.value) {
    resizeObserver.observe(container.value);
  }
  // 强制刷新一次尺寸，防止在隐藏期间尺寸变化导致变形
  setTimeout(finalResizeUpdate, 50);
});

onDeactivated(() => {
  // 当组件被缓存但未销毁时，暂停动画以节省资源
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  // 断开 ResizeObserver，避免后台调整大小触发不必要的计算
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// ... createGalaxy, createPlanets 等保持不变 ...

// ★★★ 核心修改 2：animate 循环中实时修正相机比例 ★★★
const animate = () => {
  animationId = requestAnimationFrame(animate);
  const time = Date.now() * 0.001;

  // 1. 实时检测容器大小变化
  if (container.value && camera && renderer) {
    const currentWidth = container.value.clientWidth;
    const currentHeight = container.value.clientHeight;
    
    // 如果容器大小变了（CSS 动画正在进行中），我们只更新相机，不更新渲染器！
    // 这样 3D 对象不会变形，且没有性能损耗。
    if (currentWidth > 0 && currentHeight > 0) {
       // 计算新的宽高比
       const newAspect = currentWidth / currentHeight;
       // 如果相机比例和容器比例不一致，立即修正
       if (Math.abs(camera.aspect - newAspect) > 0.01) {
         camera.aspect = newAspect;
         camera.updateProjectionMatrix();
       }
    }
  }

  // ... 动画逻辑保持不变 ...
  if (!isNavigating.value) {
      if(galaxy) galaxy.rotation.y = time * 0.1; 
      if(particles) particles.rotation.y = time * 0.02;
      controls.update(); 
  } else {
      if(particles) particles.rotation.y = time * 0.05;
  }

  planets.forEach((mesh, i) => {
    mesh.position.y += Math.sin(time + i) * 0.02; 
    if(mesh.children[0]) { 
       mesh.children[0].rotation.y = -time; 
       mesh.children[0].rotation.z = time * 0.5;
    }
    if(mesh.children[1]) { 
       mesh.children[1].rotation.z = time * 0.2;
       mesh.children[1].rotation.x = Math.PI / 2 + Math.sin(time) * 0.1;
    }
  });

  composer.render();
  labelRenderer.render(scene, camera);
};

// ★★★ 核心修改 3：最终的高质量重绘 ★★★
// 这个函数只在动画结束（手松开/面板停下）后调用一次
const finalResizeUpdate = () => {
  if (!container.value || !camera || !renderer) return;

  const width = container.value.clientWidth;
  const height = container.value.clientHeight;

  if (width === 0 || height === 0) return;

  // 这里才是真正消耗性能的操作：重置 Buffer
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
  composer.setSize(width, height);

  // 更新 Bloom Pass 分辨率
  const bloomPass = composer.passes.find(p => p.isUnrealBloomPass);
  if (bloomPass) {
    bloomPass.resolution.set(width, height);
  }
};

// ... onMouseMove, onClick 等保持不变 ...
// 注意：onMouseMove 必须使用 getBoundingClientRect 来获取偏移量，之前的修改已经包含了这点

const onMouseMove = (event) => {
  if (isNavigating.value || showUploadModal.value) return; 
  if (!container.value || !renderer) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  mouse.x = (mouseX / rect.width) * 2 - 1;
  mouse.y = -(mouseY / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets, true);

  // ... 后续逻辑保持不变 ...
  if (intersects.length > 0) {
    let object = intersects[0].object;
    while(object.parent && !object.userData.id) {
        object = object.parent;
    }
    if (object.userData.id) {
        document.body.style.cursor = 'pointer';
        if(hoveredPlanet.value?.id !== object.userData.id) {
            planets.forEach(p => p.scale.set(1,1,1));
            object.scale.set(1.2, 1.2, 1.2);
            controls.autoRotate = false;
            hoveredPlanet.value = object.userData;
        }
        tooltipPos.value = { x: event.clientX + 20, y: event.clientY + 20 };
    }
  } else {
    document.body.style.cursor = 'default';
    if (hoveredPlanet.value) {
      planets.forEach(p => p.scale.set(1,1,1));
      hoveredPlanet.value = null;
      controls.autoRotate = true;
    }
  }
};

// ... 其他函数保持不变 ...
// createBackground, createPlanets, createGalaxy, onClick, startEntranceAnimation, flyToPlanet, onMounted, onUnmounted (记得销毁 resizeObserver)

const createBackground = () => {
  const geometry = new THREE.BufferGeometry();
  // 根据设备性能调整粒子数量
  const isHighPerformance = navigator.hardwareConcurrency >= 8;
  const count = isHighPerformance ? 3000 : 1500;
  const positions = new Float32Array(count * 3);
  for(let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 600; 
    const y = (Math.random() - 0.5) * 600;
    const z = (Math.random() - 0.5) * 600;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: 0.5,
    sizeAttenuation: true,
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
};

const createPlanets = () => {
  const rawCategories = store.categories;
  const sortedCategories = [...rawCategories].sort((a, b) => b.size - a.size);

  sortedCategories.forEach((cat, index) => {
    const size = cat.size; 
    const geometry = new THREE.IcosahedronGeometry(size, 1); 
    const material = new THREE.MeshBasicMaterial({ color: cat.color });
    const mesh = new THREE.Mesh(geometry, material);

    const angle = index * 2.4; 
    const minSize = 0.5;
    const maxSize = 2.0;
    let sizeRatio = (size - minSize) / (maxSize - minSize);
    sizeRatio = Math.max(0, Math.min(1, sizeRatio)); 
    const radius = 47 - (sizeRatio * 30); 

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 4 + (1 - sizeRatio) * 8; 

    mesh.position.set(x, y, z);
    mesh.userData = { id: cat.id, name: cat.name, count: cat.count, color: cat.color };

    const wireGeo = new THREE.IcosahedronGeometry(size * 1.3, 1);
    const wireMat = new THREE.MeshBasicMaterial({ color: cat.color, wireframe: true, transparent: true, opacity: 0.3 });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    mesh.add(wireMesh); 

    const ringGeo = new THREE.TorusGeometry(size * 1.8, 0.02, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: cat.color, transparent: true, opacity: 0.5 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    mesh.add(ringMesh);

    const div = document.createElement('div');
    div.className = 'planet-label';
    div.textContent = cat.name;
    const fontSize = Math.min(24, Math.max(12, size * 8)); 
    div.style.fontSize = fontSize + 'px'; 
    div.style.color = '#ffffff'; 
    div.style.textShadow = `0 0 3px #000000, 0 0 10px ${cat.color}`;
    div.style.paddingBottom = '2px';
    const label = new CSS2DObject(div);
    label.position.set(0, size * 1.5 + 0.7, 0);
    mesh.add(label);

    planets.push(mesh);
    scene.add(mesh);
  });
};

// 🔥 清除旧的星球并重新创建
const refreshPlanets = () => {
  if (!scene) return;
  
  // 移除旧的星球
  planets.forEach(mesh => {
    // 移除 CSS2D 标签
    mesh.children.forEach(child => {
      if (child.isCSS2DObject) {
        child.element.remove();
      }
    });
    scene.remove(mesh);
    // 释放几何体和材质
    mesh.geometry?.dispose();
    mesh.material?.dispose();
  });
  planets = [];
  
  // 重新创建星球
  createPlanets();
};

const createGalaxy = () => {
  // 根据设备性能调整星系粒子数量
  const isHighPerformance = navigator.hardwareConcurrency >= 8;
  const parameters = {
    count: isHighPerformance ? 20000 : 10000, 
    size: 0.1, 
    radius: 40, 
    branches: 3, 
    spin: 1, 
    randomness: 0.5, 
    randomnessPower: 3, 
    insideColor: '#ff6030', 
    outsideColor: '#a020f0'
  };
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for(let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;
    const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY * 2; 
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: parameters.size, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true
  });
  galaxy = new THREE.Points(geometry, material);
  scene.add(galaxy);
};


const onClick = (event) => {
  if (isNavigating.value || showUploadModal.value) return; 

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets, true);

  if (intersects.length > 0) {
    let object = intersects[0].object;
    while(object.parent && !object.userData.id) {
        object = object.parent;
    }

    if (object.userData.id) {
       // 添加点击反馈动画
       object.scale.set(1.3, 1.3, 1.3);
       setTimeout(() => {
         object.scale.set(1.2, 1.2, 1.2);
       }, 150);
       
       flyToPlanet(object);
    }
  }
};

const startEntranceAnimation = () => {
  const duration = 1000; 
  const startTime = Date.now();
  
  const fade = () => {
    const now = Date.now();
    const progress = Math.min((now - startTime) / duration, 1);
    
    overlayOpacity.value = 1 - (progress * progress);
    
    if(progress < 1) {
      requestAnimationFrame(fade);
    } else {
      overlayOpacity.value = 0;
    }
  };
  fade();
};

const flyToPlanet = (targetObject) => {
    isNavigating.value = true;
    controls.enabled = false; 
    
    overlayColor.value = '#000000';

    const duration = 800; 
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const targetPos = targetObject.position.clone();
    targetPos.y += 5; // 稍微抬高视角
    
    const startTime = Date.now();

    const animateFly = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        // 使用更平滑的缓动函数
        const ease = 1 - Math.pow(1 - progress, 3); 

        camera.position.lerpVectors(startPos, targetPos, ease);
        controls.target.lerpVectors(startTarget, targetPos, ease);
        
        // 添加淡入淡出效果
        if (progress > 0.4) {
            overlayOpacity.value = (progress - 0.4) / 0.6; 
        }

        if (progress < 1) {
            requestAnimationFrame(animateFly);
        } else {
            router.push({
                name: 'Constellation',
                query: { category: targetObject.userData.name }
            });
        }
    };
    
    animateFly();
};

// 🔥 处理上传完成后的刷新
const handleUploadComplete = async () => {
  // 强制刷新星球数据
  await store.refreshCategories(authStore.token);
};

onMounted(async () => {
  // 先从后端获取 categories 数据
  await store.fetchCategories(authStore.token);
  // 然后初始化 Three.js 场景
  initThree();
});

// 🔥 监听 categories 变化，动态刷新星球
watch(
  () => store.categories,
  (newCategories, oldCategories) => {
    // 只有在场景已初始化且数据确实变化时才刷新
    if (scene && newCategories.length > 0 && JSON.stringify(newCategories) !== JSON.stringify(oldCategories)) {
      refreshPlanets();
    }
  },
  { deep: true }
);

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('click', onClick);
  if (renderer) {
      renderer.dispose();
  }
});
</script>

<style scoped>
.universe-container {
  width: 100%;
  height: 100%; 
  position: relative;
  background: transparent;
  overflow: hidden;
  font-family: sans-serif;
  border-radius: 20px;
}

/* 强制 Canvas 填满容器，CSS 负责拉伸，JS 负责修正相机防畸变 */
.universe-container :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

/* ... 其他样式 ... */
.warp-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    transition: opacity 0.1s linear; 
    background-color: black; 
}

/* 上传触发器 (Research Grade) */
.upload-trigger {
  position: absolute;
  bottom: 32px;
  left: 32px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  z-index: 200;
}

.trigger-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.8); /* Slate 800 */
  border: 1px solid rgba(148, 163, 184, 0.2); /* Slate 400 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #38bdf8; /* Sky 400 */
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-trigger:hover .trigger-icon {
  background: rgba(56, 189, 248, 0.1); /* Sky 400 with opacity */
  border-color: rgba(56, 189, 248, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(56, 189, 248, 0.2);
}

.trigger-text {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #94a3b8; /* Slate 400 */
  letter-spacing: 0.05em;
  transition: color 0.3s ease;
}

.upload-trigger:hover .trigger-text {
  color: #38bdf8; /* Sky 400 */
}

/* ...原有的 Label/HUD 样式 ... */
:deep(.planet-label) {
  font-family: 'Orbitron', sans-serif;
  color: white;
  text-shadow: 0 0 5px rgba(0,0,0,0.8);
  pointer-events: none;
  font-weight: bold;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
  transform: scale(1) translateZ(0); /* translateZ 开启 GPU 加速 */
  opacity: 1;
  
}

/* 当处于 Resizing 状态时，添加这个类到容器，利用父级控制子级 */
.universe-container.is-resizing :deep(.planet-label) {
  opacity: 0;           /* 变透明 */
  transform: scale(0.8); /* 稍微缩小，增加动效感 */
  pointer-events: none;  /* 此时禁止交互 */
}
.hud-tooltip {
  position: absolute;
  background: rgba(10, 20, 40, 0.85);
  border: 1px solid rgba(0, 255, 255, 0.5);
  backdrop-filter: blur(4px);
  padding: 15px;
  border-radius: 4px;
  color: #fff;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
  min-width: 150px;
  transition: opacity 0.3s; 
}

.hud-tooltip h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #00ffff;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.hud-line {
  height: 1px;
  background: linear-gradient(90deg, #00ffff, transparent);
  margin: 8px 0;
}

.hud-tooltip p {
  margin: 5px 0;
  font-size: 0.9rem;
  color: #ccc;
}

.click-hint {
  font-size: 0.7rem !important;
  color: #ff00ff !important;
  margin-top: 10px !important;
  animation: blink 1s infinite;
}

@keyframes blink {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style>
