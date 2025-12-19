<template>
  <n-card size="small" :bordered="false" class="chart-card">
    <template #header>
      <div class="card-header">
        <span>单台月累计充电次数 Top10</span>
        <div class="filters">
          <!-- 工厂 -->
          <n-select
            v-model:value="localFtid"
            :options="factoryOptions"
            size="small"
            placeholder="工厂"
            class="w120"
          />
          <!-- 月份 -->
          <n-date-picker
            v-model:value="localMonth"
            type="month"
            size="small"
            :format="'yyyy-MM'"
            class="w120"
          />
          <!-- TOP10 统计类型 -->
          <n-select
            v-model:value="localMode"
            :options="modeOptions"
            size="small"
            class="w130"
          />
          <n-button size="small" type="primary" ghost @click="onRefresh"
            >确认</n-button
          >
        </div>
      </div>
    </template>
    <div class="chart-container">
      <div ref="el" class="chart"></div>
      <div v-if="store.loading" class="overlay loader-wrapper">
        <span class="loader"></span>
      </div>
      <div v-else-if="store.error" class="overlay state-box error">
        <div class="msg">加载失败</div>
        <n-button size="small" tertiary @click="onRefresh">重试</n-button>
      </div>
      <div
        v-else-if="store.hasLoaded && !store.list.length"
        class="overlay state-box empty"
      >
        暂无数据
      </div>
    </div>
  </n-card>
</template>

<script setup>
import {
  onMounted,
  nextTick,
  onBeforeUnmount,
  ref,
  computed,
  watch,
} from "vue";
import { NCard, NSelect, NDatePicker, NButton } from "naive-ui";
import "@/composables/justLoading.css";
import * as echarts from "echarts";
import { useMonthlyReportTop10Store } from "@/stores/monthlyReportTop10Store.js";
import { useMonthlyReportStore } from "@/stores/monthlyReportStore.js";

const el = ref(null);
let chart;
const store = useMonthlyReportTop10Store();
const baseStore = useMonthlyReportStore(); // 复用已有工厂列表

// 下拉：工厂
const factoryOptions = computed(() =>
  (baseStore.factories || []).map((f) => ({ label: f.ftnm, value: f.ftid }))
);
// 本地选择（不直接写 store 以避免频繁请求）
const localFtid = ref("");
const localMonth = ref(null); // 时间戳
const localMode = ref("both");
const modeOptions = [
  { label: "高、低TOP10", value: "both" },
  { label: "高TOP10", value: "high" },
  { label: "低TOP10", value: "low" },
];

// 统一一个 onMounted，先初始化图表再拉数据，避免首屏数据到达但图表尚未初始化导致空白
onMounted(async () => {
  await nextTick();
  init(); // chart 元素始终存在，可直接初始化
  if (!baseStore.factories.length) await baseStore.fetchFactories();
  if (!localMonth.value) {
    const d = new Date();
    localMonth.value = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  if (baseStore.factories.length && !localFtid.value) {
    localFtid.value = baseStore.factories[0].ftid;
    await onRefresh();
  } else if (store.list.length) {
    // 若进入页面前已经有数据（缓存），立即渲染
    render(store.list);
  }
  // 工厂异步才到达的情况：
  watch(
    () => baseStore.factories.length,
    (len) => {
      if (len && !localFtid.value) {
        localFtid.value = baseStore.factories[0].ftid;
        onRefresh();
      }
    }
  );
});

function formatYymm(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function init() {
  if (!el.value) return;
  chart = echarts.init(el.value);
  render([]);
}

function render(data) {
  if (!chart) return;
  const colors = {
    high: "#ef4444", // 红
    low: "#3b82f6", // 蓝
    default: "#34d399", // 绿
  };
  chart.setOption({
    grid: { left: 80, right: 20, top: 20, bottom: 10 },
    tooltip: {
      trigger: "item",
      formatter: (p) => {
        const row = store.list[p.dataIndex];
        if (!row) return `${p.name}<br/>充电次数: ${p.value}`;
        // crnm 例如: “总装264” -> 前缀(非数字部分) + AMR + 补零crid
        const crnm = row.crnm || "";
        const prefix = crnm.replace(/\d+$/, ""); // 去掉末尾数字
        const crid = String(
          row.crid || row.name?.replace(/[^0-9]/g, "")
        ).padStart(3, "0");
        const label = prefix ? `${prefix}AMR${crid}` : `AMR${crid}`;
        return `${label}<br/>充电次数: ${p.value}`;
      },
    },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: data.map((d) => d.name) },
    series: [
      {
        type: "bar",
        data: data.map((d) => ({
          value: d.value,
          itemStyle: { color: colors[d.group] || colors.default },
        })),
        label: {
          show: true,
          position: "right",
          formatter: ({ value }) => value,
        },
      },
    ],
  });
}

async function onRefresh() {
  store.setFilters({
    newFtid: localFtid.value,
    newYymm: formatYymm(localMonth.value),
    newMode: localMode.value,
  });
  await store.fetchTop10Data();
  render(store.list);
}

watch(
  () => store.list,
  (v) => {
    render(v);
  }
);

function resize() {
  chart && chart.resize();
}

// 监听尺寸
onMounted(() => {
  window.addEventListener("resize", resize);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  chart?.dispose();
});

defineExpose({
  getExportOption: () => (chart ? chart.getOption() : null),
  getExportImage: () => chart ? chart.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' }) : null,
});
</script>

<style scoped>
.chart {
  height: 320px;
  width: 100%;
}
.chart-container {
  position: relative;
  height: 320px;
}
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(2px);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
}
.w120 {
  width: 120px;
}
.w130 {
  width: 130px;
}
.state-box {
  height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  gap: 10px;
}
.state-box.error .msg {
  color: #ef4444;
}
.loader-wrapper {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
