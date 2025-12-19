<template>
  <n-card size="small" :bordered="false">
    <template #header>
      <div class="card-header">
        <span>Top10 报警设备</span>
        <div class="filters">
          <n-select
            v-model:value="localMode"
            :options="modeOptions"
            size="small"
            class="w110"
          />
          <n-button size="small" type="primary" ghost @click="onRefresh"
            >确认</n-button
          >
          <n-button size="small" secondary @click="exportCsv">导出</n-button>
        </div>
      </div>
    </template>
    <div class="table-wrap">
      <n-data-table
        :columns="columns"
        :data="displayRows"
        size="small"
        :bordered="false"
        :scroll-x="scrollX"
        :max-height="tableMaxHeight"
        virtual-scroll
      />
      <div v-if="store.loading" class="overlay loader-wrapper">
        <span class="loader"></span>
      </div>
      <div v-else-if="store.error" class="overlay state-box error">
        <div class="msg">加载失败</div>
        <n-button size="tiny" tertiary @click="onRefresh">重试</n-button>
      </div>
      <div
        v-else-if="store.hasLoaded && !displayRows.length"
        class="overlay state-box empty"
      >
        暂无数据
      </div>
    </div>
  </n-card>
</template>

<script setup>
import { h, computed, ref, watch, onMounted } from "vue";
import { NCard, NDataTable, NSelect, NButton } from "naive-ui";
import { useAlarmTop10Store } from "@/stores/alarmTop10Store.js";
import "@/composables/justLoading.css";

const props = defineProps({
  selectedFactory: { type: String, default: "" },
  selectedWorkshop: { type: String, default: "" },
  selectedMonth: { type: Number, default: null }, // 时间戳
  selectedAlarmType: { type: String, default: "" },
});

const store = useAlarmTop10Store();

const columns = [
  { title: "序号", key: "rank", width: 56, align: "center" },
  {
    title: "工厂",
    key: "ftnm",
    width: 55,
    align: "center",
    ellipsis: { tooltip: true },
  },
  {
    title: "车间",
    key: "wkid",
    minWidth: 55,
    align: "center",
    ellipsis: { tooltip: true },
  },
  { title: "年月", key: "yymm", width: 80, align: "center" },
  {
    title: "设备",
    key: "crnm",
    minWidth: 130,
    align: "center",
    ellipsis: { tooltip: true },
  },
  { title: "次数", key: "tqty", width: 70, align: "center" },
  { title: "报警时长(min)", key: "mint", width: 110, align: "center" },
  {
    title: "报警类型",
    key: "kdnm",
    minWidth: 130,
    align: "center",
    ellipsis: { tooltip: true },
  },
];

// 模式：both=高低Top10合并显示(默认显示高Top10)，high=高Top10，low=低Top10
const localMode = ref("high");
const modeOptions = [
  { label: "高TOP10", value: "high" },
  { label: "低TOP10", value: "low" },
  { label: "高+低TOP10", value: "both" },
];

const yymmFromTs = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function buildRows() {
  let list = [];
  if (localMode.value === "high") list = store.highTop10;
  else if (localMode.value === "low") list = store.lowTop10;
  else {
    // both: 将高+低合并；避免重复（同一设备可能同时进入两个列表，按 tqty 去重）
    const seen = new Set();
    const merged = [...store.highTop10, ...store.lowTop10];
    list = merged
      .filter((r) => {
        const key = r.ipid || r.crid;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20);
  }
  // 排序依据模式
  if (localMode.value === "low")
    list = [...list].sort((a, b) => a.tqty - b.tqty);
  else list = [...list].sort((a, b) => b.tqty - a.tqty);
  return list.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

const displayRows = computed(() => buildRows());

async function onRefresh() {
  store.setFilters({
    ftid: props.selectedFactory,
    wkid: props.selectedWorkshop,
    yymm: yymmFromTs(props.selectedMonth),
    kind: props.selectedAlarmType,
  });
  await store.fetchData();
}

// 导出CSV文件
function exportCsv() {
  const data = displayRows.value || [];
  if (!data.length) {
    window.$message?.warning?.("无可导出数据");
    return;
  }
  const headers = [
    "序号",
    "工厂",
    "车间",
    "年月",
    "设备",
    "次数",
    "报警时长(min)",
    "报警类型",
  ];
  const lines = [headers.join(",")];
  data.forEach((r) => {
    const row = [
      r.rank,
      r.ftnm,
      r.wkid,
      r.yymm,
      r.crnm,
      r.tqty,
      r.mint,
      r.kdnm,
    ].map((v) => {
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    });
    lines.push(row.join(","));
  });
  const csvContent = "\ufeff" + lines.join("\n"); // BOM 适配 Excel
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(
    2,
    "0"
  )}${String(now.getMinutes()).padStart(2, "0")}`;
  a.href = url;
  a.download = `alarm_top10_${localMode.value}_${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.$message?.success?.("导出完成");
}

// 当外部筛选变化时自动刷新（可视化性能考虑加简单防抖，此处直接触发）
watch(
  () => [
    props.selectedFactory,
    props.selectedWorkshop,
    props.selectedMonth,
    props.selectedAlarmType,
  ],
  () => {
    onRefresh();
  }
);

onMounted(() => {
  onRefresh();
});

const scrollX = 900;
// 固定表格最大高度，超出显示内部滚动条
const tableMaxHeight = 400;

// 导出接口：返回当前模式和显示行
defineExpose({
  getExportData: () => ({ mode: localMode.value, rows: displayRows.value }),
});
</script>

<style scoped>
:deep(.n-data-table .n-data-table-th) {
  font-weight: 700;
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
.w110 {
  width: 110px;
}
.table-wrap {
  position: relative;
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
.loader-wrapper {
  height: 100%;
}
.state-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #64748b;
}
.state-box.error .msg {
  color: #ef4444;
}
</style>
