<!-- src/components/MainStats.vue -->
<template>
  <n-grid
    :cols="24"
    :x-gap="18"
    :y-gap="18"
    style="margin-bottom: 18px; height: 140px"
  >
    <n-grid-item :span="6"><StatsBox /></n-grid-item>
    <n-grid-item :span="6">
      <ProgressCircle
        :percent="batteryPercent"
        :has-selection="hasSelection"
        :has-data="hasData"
        :loading="loading"
      />
    </n-grid-item>
    <n-grid-item :span="6">
      <FactoryCard
        :value="brand"
        :has-selection="hasSelection"
        :has-data="hasData"
        :loading="loading"
      />
    </n-grid-item>
    <n-grid-item :span="6"><AbnormalCard /></n-grid-item>
  </n-grid>
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAmrHistoryStore } from "@/stores/amrHistoryStore.js";
import { NGrid, NGridItem } from "naive-ui";
import StatsBox from "@/components/StatsBox.vue";
import ProgressCircle from "@/components/ProgressCircle.vue";
import FactoryCard from "@/components/FactoryCard.vue";
import AbnormalCard from "@/components/AbnormalCard.vue";

const historyStore = useAmrHistoryStore();
const { rawList, hasSelection, hasData, loading } = storeToRefs(historyStore);

// 取最新一条记录
const latest = computed(() =>
  rawList.value.length ? rawList.value[rawList.value.length - 1] : null
);
// 电量字段: btvl (假设 0-100)
const batteryPercent = computed(() => {
  if (!hasData.value) return 0;
  const v = latest.value?.btvl;
  if (v == null || isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Number(v)));
});
// 品牌: btkd (示例字段)
const brand = computed(() => (hasData.value ? latest.value?.btkd || "" : ""));
</script>
