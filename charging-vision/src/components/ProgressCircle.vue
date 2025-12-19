<!-- src/components/ProgressCircle.vue -->
<template>
  <div
    class="stats-card-container"
    ref="tiltRef"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <div class="card progress-card">
      <div class="title">电量</div>
      <div class="circle-wrapper">
        <n-progress
          v-if="!loading && hasData"
          type="circle"
          :percentage="animatedPercent"
          :height="100"
          :show-indicator="true"
          gap-position="bottom"
          :gap-degree="120"
          :indicator-text-color="indicatorColor"
          :color="circleColor"
          :rail-color="railColor"
          :stroke-width="15"
        />
  <div v-else-if="loading" class="placeholder loading"><span class="loader" aria-label="加载中" /></div>
        <div v-else-if="!hasSelection" class="placeholder">未选择</div>
        <div v-else-if="hasSelection && !hasData" class="placeholder">--%</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps, ref, watch } from "vue";
import { use3DTilt } from "@/composables/use3DTilt.js";
import { NProgress } from "naive-ui";
const props = defineProps({
  percent: { type: Number, default: 0 },
  hasSelection: { type: Boolean, default: false },
  hasData: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
});

// 进度圈动画百分比
const rawPercent = computed(() => (props.hasData ? props.percent : 0));
const animatedPercent = ref(0);
let frameId = null;
let startVal = 0;
let startTime = 0;
const DURATION = 2000; // ms
const ease = (t) => 1 - Math.pow(1 - t, 3); // 缓动曲线

function step(ts) {
  if (!startTime) startTime = ts;
  const p = Math.min(1, (ts - startTime) / DURATION);
  const v = startVal + (rawPercent.value - startVal) * ease(p);
  // 显示为整数百分比，减少视觉占用（原为保留两位小数）
  animatedPercent.value = Number(v.toFixed(0));
  if (p < 1) frameId = requestAnimationFrame(step);
  else frameId = null;
}

watch(rawPercent, (nv, ov) => {
  if (nv === ov) return;
  if (frameId) cancelAnimationFrame(frameId);
  startVal = animatedPercent.value;
  startTime = 0;
  frameId = requestAnimationFrame(step);
}, { immediate: true });
const circleColor = computed(() =>
  props.hasData ? { stops: ["#FF5447", "#28EB79"] } : "#999999"
);
const railColor = computed(() => (props.hasData ? "#DBDBDB" : "#666666"));
const indicatorColor = computed(() => (props.hasData ? "#FFFF33" : "#ffffff"));

const { tiltRef, onMouseMove, onMouseLeave } = use3DTilt();
</script>

<style scoped>
@import "@/assets/3Dcard.css";
@import "@/composables/justLoading.css";

/* 增强进度圈视觉效果 */
:deep(.n-progress-circle) {
  transform: scale(0.95); /* 放大进度圈 */
  height: 90px !important; /* 控制大小 */
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25)) brightness(1.1); /* 增强亮度和阴影 */
}

/* 更新标题样式 */
.title {
  font-size: 1.3rem; /* 增大标题 */
  margin-bottom: 10px; /* 增加间距 */
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); /* 增强文字阴影 */
}

.circle-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 110px;
  height: 110px;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: #ffffffcc;
  letter-spacing: 1px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
.placeholder.loading {
  font-size: 14px;
  font-weight: 500;
}

/* 进度圈容器调整 */
:deep(.n-progress-circle) {
  transform: scale(1.1);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

/* 缩小指示文本字号 */
:deep(.n-progress-text) {
  font-size: 20px !important; /* 原默认更大，统一缩小 */
  font-weight: 700;
  letter-spacing: 1px;
}
</style>
