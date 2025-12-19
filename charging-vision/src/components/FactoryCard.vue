<template>
  <div
    class="stats-card-container"
    ref="tiltRef"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <div class="card factory-card">
      <div class="title">AMR品牌</div>
      <div class="stat-value" v-if="!loading && hasSelection && hasData">{{ value || '--' }}</div>
  <div class="placeholder" v-else-if="loading"><span class="loader" aria-label="加载中" /></div>
      <div class="placeholder" v-else-if="!hasSelection">未选择</div>
      <div class="placeholder" v-else>--</div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { use3DTilt } from "@/composables/use3DTilt.js";
defineProps({
  value: { type:String, default:'' },
  hasSelection: { type:Boolean, default:false },
  hasData: { type:Boolean, default:false },
  loading: { type:Boolean, default:false }
});

const { tiltRef, onMouseMove, onMouseLeave } = use3DTilt();
</script>

<style scoped>
@import "@/assets/3Dcard.css";
@import "@/composables/justLoading.css";

.stat-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.3),
  0 0 10px rgba(255, 255, 255, 0.5); /* 添加发光效果 */
  letter-spacing: 2px; /* 增加字间距 */
  z-index: 10;
}
/* 更新标题样式 */
.title {
  font-size: 1.6rem; /* 增大标题 */
  margin-bottom: 8px; /* 增加间距 */
}

.placeholder {
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffffcc;
  text-shadow: 0 2px 6px rgba(0,0,0,.3);
}
</style>