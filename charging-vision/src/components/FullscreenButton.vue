<template>
  <n-button
    quaternary
    circle
    size="large"
    style="font-size: 1.5rem; color: #4572d9; margin-left: 8px"
    @click="toggleFullscreen"
  >
    <template #icon>
      <n-icon>
        <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="24" height="24">
          <path
            d="M4 4h7M4 4v7M20 4h-7M20 4v7M4 20h7M4 20v-7M20 20h-7M20 20v-7"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="24" height="24">
          <path
            d="M9 9H4V4h5M15 9h5V4h-5M9 15H4v5h5M15 15h5v5h-5"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
          />
        </svg>
      </n-icon>
    </template>
  </n-button>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { NButton, NIcon } from "naive-ui";

// isDomFullscreen: 使用 Fullscreen API (#app 元素)
// isWindowFullscreen: 用户按 F11 进入浏览器级全屏（无法用 API 退出）
const isDomFullscreen = ref(false);
const isWindowFullscreen = ref(false);
const isFullscreen = ref(false); // 统一对外状态（任一为 true 即视为全屏）
let targetEl = null;

function getTarget() {
  // 仅让应用容器全屏，避免浏览器 UI 变化带来的焦点问题
  if (!targetEl)
    targetEl = document.getElementById("app") || document.documentElement;
  return targetEl;
}

async function toggleFullscreen() {
  const el = getTarget();
  try {
    // 如果是 F11 浏览器全屏但不是 DOM 全屏，无法用 API 退出，只能提示用户按 F11。
    if (isWindowFullscreen.value && !isDomFullscreen.value) {
      window.$message?.info?.("当前为浏览器 F11 全屏，按 F11 退出");
      return;
    }
    if (!isDomFullscreen.value) {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  } catch (e) {
    console.warn("[Fullscreen] 切换失败", e);
  }
}

function handleFullscreenChange() {
  isDomFullscreen.value = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
  computeWindowFullscreen();
  mergeState();
  adjustOverflow();
}

function computeWindowFullscreen() {
  try {
    // 通过窗口高度与可用高度近似判断 F11（容差 2 像素）
    const h = window.innerHeight;
    const sh = window.screen.availHeight || window.screen.height;
    isWindowFullscreen.value = Math.abs(sh - h) <= 2 && !isDomFullscreen.value;
  } catch {
    isWindowFullscreen.value = false;
  }
}

function mergeState() {
  isFullscreen.value = isDomFullscreen.value || isWindowFullscreen.value;
}

function adjustOverflow() {
  const el = getTarget();
  if (!el) return;
  if (isDomFullscreen.value || isWindowFullscreen.value) {
    el.style.overflow = "auto";
    el.style.minHeight = "100%";
  } else {
    el.style.overflow = "";
  }
}

import { useRoute, onBeforeRouteUpdate } from "vue-router";
const route = useRoute();

function syncState() {
  handleFullscreenChange();
}

onMounted(() => {
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  document.addEventListener("MSFullscreenChange", handleFullscreenChange);
  window.addEventListener("resize", handleFullscreenChange); // 监听 F11 变化
  // 初始同步
  syncState();
  adjustOverflow();
});

onBeforeRouteUpdate(() => {
  // 路由切换后立即同步（如果用户在全屏状态切换页面）
  setTimeout(syncState, 0);
});

onUnmounted(() => {
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  document.removeEventListener(
    "webkitfullscreenchange",
    handleFullscreenChange
  );
  document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
  document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
  window.removeEventListener("resize", handleFullscreenChange);
});
</script>
