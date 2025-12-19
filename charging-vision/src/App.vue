<template>
  <div class="app-bg">
    <n-config-provider>
      <router-view />
    </n-config-provider>
  </div>
</template>

<script setup>
import { NConfigProvider } from 'naive-ui';
</script>

<style>
html, body {
  min-height: 100%;
  height: auto;
  margin: 0;
  overflow-x: hidden; /* 防止 100vw 带滚动条宽度导致水平溢出产生右侧细黑边 */
  background-color: #f0f4f9; /* 背景底色，避免图片缩放子像素出现黑缝 */
}
#app {
  min-height: 100%;
  height: auto;
}
.app-bg {
  /* 背景随内容延展，并在滚动时始终覆盖视口 */
  min-height: 100vh;
  background-image: url("/src/assets/bg.jpg"); /* 开发环境直接路径 */
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  background-attachment: fixed;
  width:100%;
  box-sizing:border-box;
}
/* 使用 import 资源，可改为：
.app-bg { background-image: url("" + bgImage + ""); }
*/
</style>
