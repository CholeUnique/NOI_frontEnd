<template>
  <div ref="canvasContainer" class="cyber-void"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import * as THREE from 'three';

const canvasContainer = ref(null);
let scene, camera, renderer, animationId;

// 鼠标交互变量
const mouse = new THREE.Vector2();
const targetRotation = { x: 0, y: 0 };
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

// 场景物体引用
let neuralCore, outerField, dataParticles;

const initThree = () => {
  // 1. 场景初始化
  scene = new THREE.Scene();
  // 使用纯色背景，因为我们会用 CSS 渐变叠加，这样更灵活
  scene.background = null; 
  // 极淡的雾化，增加空间深度感
  scene.fog = new THREE.FogExp2(0x050a10, 0.0015);

  // 2. 相机
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 100;

  // 3. 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (canvasContainer.value) {
    canvasContainer.value.appendChild(renderer.domElement);
  }

  // --- 物体构建开始 ---

  // A. 核心：神经晶格 (The Neural Core)
  // 使用二十面体，增加细分以获得复杂的三角形网格
  const geometryCore = new THREE.IcosahedronGeometry(24, 2); 
  
  // 材质：线框模式，青色，半透明，叠加混合模式制造发光感
  const materialCore = new THREE.MeshBasicMaterial({
    color: 0x00ffff,     // 赛博青
    wireframe: true,
    transparent: true,
    opacity: 0.15,       // 低透明度，若隐若现
    blending: THREE.AdditiveBlending, // 关键：叠加混合，重叠处会变亮
    side: THREE.DoubleSide
  });
  
  neuralCore = new THREE.Mesh(geometryCore, materialCore);
  scene.add(neuralCore);

  // B. 外层场域 (The Outer Field)
  // 一个更大的、稀疏的保护层
  const geometryOuter = new THREE.IcosahedronGeometry(45, 1);
  const materialOuter = new THREE.MeshBasicMaterial({
    color: 0x0055ff,     // 深科技蓝
    wireframe: true,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending
  });
  outerField = new THREE.Mesh(geometryOuter, materialOuter);
  scene.add(outerField);

  // C. 数据尘埃 (Data Particles)
  // 散布在空间中的粒子
  const particlesGeo = new THREE.BufferGeometry();
  const particleCount = 600;
  const posArray = new Float32Array(particleCount * 3);
  
  for(let i = 0; i < particleCount * 3; i++) {
    // 在 -100 到 100 之间随机分布
    posArray[i] = (Math.random() - 0.5) * 200;
  }
  
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  
  const particlesMat = new THREE.PointsMaterial({
    size: 0.5,
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  
  dataParticles = new THREE.Points(particlesGeo, particlesMat);
  scene.add(dataParticles);

  // --- 物体构建结束 ---

  // 事件监听
  document.addEventListener('mousemove', onDocumentMouseMove);
  window.addEventListener('resize', onWindowResize);

  animate();
};

const onDocumentMouseMove = (event) => {
  mouse.x = (event.clientX - windowHalfX);
  mouse.y = (event.clientY - windowHalfY);
};

const onWindowResize = () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  const time = Date.now() * 0.0005;

  // 1. 核心自转
  neuralCore.rotation.x -= 0.0005;
  neuralCore.rotation.y -= 0.001;

  // 2. 外层反向慢速旋转
  outerField.rotation.x += 0.0005;
  outerField.rotation.y += 0.0005;

  // 3. 粒子流呼吸运动
  // 让粒子整体缓慢旋转
  dataParticles.rotation.y = time * 0.1;
  // 模拟呼吸感：缩放
  const scale = 1 + Math.sin(time * 2) * 0.05;
  dataParticles.scale.set(scale, scale, scale);

  // 4. 鼠标视差交互 (Smooth Parallax)
  // 目标旋转角度基于鼠标位置
  targetRotation.x = (mouse.y * 0.001);
  targetRotation.y = (mouse.x * 0.001);

  // 核心物体跟随鼠标略微倾斜 (Lerp 插值平滑过渡)
  neuralCore.rotation.x += 0.05 * (targetRotation.x - neuralCore.rotation.x);
  neuralCore.rotation.y += 0.05 * (targetRotation.y - neuralCore.rotation.y);

  renderer.render(scene, camera);
};

onMounted(() => {
  initThree();
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDocumentMouseMove);
  window.removeEventListener('resize', onWindowResize);
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.cyber-void {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  /* * 背景设计：
   * 使用径向渐变模拟深空光照。
   * 中心稍微亮一点的深蓝 (#0b1a2b)，向四周的纯黑 (#050a10) 过渡。
   * 这与 MainLayout 的色调完美匹配。
   */
  background: radial-gradient(circle at 50% 50%, #0b1a2b 0%, #050a10 90%);
  overflow: hidden;
}
</style>