<template>
  <div
    class="stats-card-container"
    ref="tiltRef"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <div class="card stats-card">
      <div class="title">AMR总览</div>
      <div class="stat-grid" v-if="!loading">
        <div class="stat-item" v-for="s in stats" :key="s.label">
          <div class="stat-number">
            <CountUpNumber :value="s.value" :duration="900" />
          </div>
            <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
      <div v-else class="loading-wrapper">
        <span class="loader" aria-label="加载中" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useOverviewStore } from "@/stores/overviewStore.js";
import { use3DTilt } from "@/composables/use3DTilt.js";
import CountUpNumber from "@/components/CountUpNumber.vue";

const overviewStore = useOverviewStore();
const { factories, loading } = storeToRefs(overviewStore);

onMounted(() => {
  if (!factories.value.length && !loading.value) {
    overviewStore.fetchOverview();
  }
});

const totalAmr = computed(() =>
  factories.value.reduce((sum, f) => sum + (f.amrCount || 0), 0)
);
const totalCharging = computed(() =>
  factories.value.reduce((sum, f) => sum + (f.chargeCount || 0), 0)
);
const totalAbnormal = computed(() =>
  factories.value.reduce((sum, f) => sum + (f.abnormalCount || 0), 0)
);

const stats = computed(() => [
  { label: "AMR", value: totalAmr.value },
  { label: "充电", value: totalCharging.value },
  { label: "异常", value: totalAbnormal.value },
]);

const { tiltRef, onMouseMove, onMouseLeave } = use3DTilt();
</script>

<style scoped>
@import "@/assets/3Dcard.css";
@import "@/composables/justLoading.css";

/* 统计网格样式 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  width: 100%;
  padding: 0 20px;
  z-index: 10;
}

.stat-item {
  text-align: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 6px 2px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.stat-number {
  font-size: 1rem;
  font-weight: bold;
  color: white;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.stat-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 5px;
}

.loading-wrapper {
  width: 100%;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
  letter-spacing: 2px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .stat-number {
    font-size: 1.5rem;
  }
}

@media (max-width: 992px) {
  .stat-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .stat-item {
    padding: 8px;
  }
}
</style>
