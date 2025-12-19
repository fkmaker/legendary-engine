<template>
  <div class="right-panel">
    <RightAlarmKpi :totals="dynamicTotals" />
    <AlarmTrendArea ref="alarmTrendRef" />
    <AlarmTypePie ref="alarmTypePieRef" @selectType="onSelectType" />
    <Top10AlarmTable
      ref="alarmTop10Ref"
      :selectedType="selectedType"
      @viewHistory="openHistory"
      @exportDevice="onExportDevice"
    />
    <RightAdviceQuick :selectedType="selectedType" />
    <RightAdviceCard
      :riskScore="0"
      :selected="selected"
      :selectedType="selectedType"
      @refresh="refreshAdvice"
    />
    <AlarmTimelineDrawer v-model="drawerShow" :device="currentDevice" />
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import RightAlarmKpi from "./RightAlarmKpi.vue";
import AlarmTrendArea from "./AlarmTrendArea.vue";
import AlarmTypePie from "./AlarmTypePie.vue";
import Top10AlarmTable from "./Top10AlarmTable.vue";
import AlarmTimelineDrawer from "./AlarmTimelineDrawer.vue";
import RightAdviceCard from "./RightAdviceCard.vue";
import RightAdviceQuick from "./RightAdviceQuick.vue";
import { useAlarmReportStore } from "@/stores/alarmReportStore.js";

const props = defineProps({ selected: { type: Object, default: () => ({}) } });

const selectedType = ref("");
const store = useAlarmReportStore();

// 动态 totals 映射（加入环比增长率）
const dynamicTotals = computed(() => ({
  total: store.totalAlarmCount || 0,
  totalDelta: store.totalMomDelta || 0, // 报警总数环比（%）
  alarmMinutes: store.totalAlarmMinutes || 0,
  alarmCarCount: store.alarmCarCount || 0,
  alarmCarDelta: store.alarmCarMomDelta || 0, // 报警小车数环比（%）
}));

function onSelectType(t) {
  selectedType.value = t;
}

const drawerShow = ref(false);
const currentDevice = ref(null);
// 子图表引用用于导出
const alarmTrendRef = ref(null);
const alarmTypePieRef = ref(null);
const alarmTop10Ref = ref(null);
function openHistory(row) {
  currentDevice.value = row;
  drawerShow.value = true;
}
function onExportDevice(row) {
  window.$message?.success?.(`已导出 ${row.device_name}`);
}

function refreshAdvice() {
  // 预留：根据最新上下文/分数重算建议
}

// 监听外部筛选 -> 拉取报警统计 (聚合 + 明细)
watch(
  () => [
    props.selected.selectedFactory,
    props.selected.selectedWorkshop,
    props.selected.selectedMonth,
    props.selected.selectedAlarmType,
    props.selected.selectedAmr,
  ],
  () => {
    const ftid = props.selected.selectedFactory || "";
    const wkid = props.selected.selectedWorkshop || "";
    const monthTs = props.selected.selectedMonth;
    const yymm = monthTs
      ? (() => {
          const d = new Date(monthTs);
          return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
        })()
      : "";
    const kind = props.selected.selectedAlarmType || "";
    const ipid = props.selected.selectedAmr || "";
    store.setFilters({ ftid, wkid, yymm, kind, ipid });
    store.fetchAll();
  },
  { immediate: true }
);

defineExpose({
  getAlarmTrendOption: () => alarmTrendRef.value?.getExportOption?.() || null,
  getAlarmTypePieOption: () =>
    alarmTypePieRef.value?.getExportOption?.() || null,
  getAlarmTrendImage: () => alarmTrendRef.value?.getExportImage?.() || null,
  getAlarmTypePieImage: () => alarmTypePieRef.value?.getExportImage?.() || null,
  getAlarmKpiTotals: () => ({
    total: dynamicTotals.value.total,
    totalDelta: dynamicTotals.value.totalDelta,
    alarmMinutes: dynamicTotals.value.alarmMinutes,
    alarmCarCount: dynamicTotals.value.alarmCarCount,
    alarmCarDelta: dynamicTotals.value.alarmCarDelta,
  }),
  getAlarmTop10Data: () =>
    alarmTop10Ref.value?.getExportData?.() || { mode: "", rows: [] },
});
</script>

<style scoped>
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}
</style>
