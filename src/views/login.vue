<template>
  <div class="login-page">
    <!-- 3D 背景层 -->
    <ThreeBackground />
    
    <!-- UI 层 -->
    <AuthForm />
  </div>
</template>

<script setup>
import ThreeBackground from '../components/login/ThreeBackground.vue';
import AuthForm from '../components/login/AuthForm.vue';
</script>

<style scoped>
.login-page {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent; /* 与 3D 场景背景色匹配 */
}
</style>