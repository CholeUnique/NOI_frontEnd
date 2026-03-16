<template>
  <router-view></router-view>
  <NoticeDialog />
</template>
<script setup>
import NoticeDialog from './components/NoticeDialog.vue';
</script>
<style>
/* 可以在这里引入 Google Fonts 的科幻字体，比如 Orbitron */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

</style>