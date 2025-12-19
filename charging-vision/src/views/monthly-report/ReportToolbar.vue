<template>
  <div class="mrp-toolbar">
    <!-- 统计方式 -->
    <div class="field">
      <span class="hint-label">统计方式</span>
      <n-select
        v-model:value="selectedMode"
        :options="modeOptions"
        placeholder="选择统计方式"
        class="mrp-mode"
        clearable
      />
    </div>

    <!-- 工厂 -->
    <div class="field">
      <span class="hint-label">厂</span>
      <n-select
        v-model:value="selectedFactory"
        :options="factoryOptions"
        placeholder="选择工厂"
        class="mrp-select"
        :loading="mrStore.factoryLoading"
        filterable
        clearable
      />
    </div>

    <!-- 车间 -->
    <div class="field">
      <span class="hint-label">车间</span>
      <n-select
        v-model:value="selectedWorkshop"
        :options="workshopOptions"
        placeholder="选择车间"
        class="mrp-select"
        :disabled="!selectedFactory || !needWorkshop"
        :loading="workshopLoading"
        filterable
        clearable
      />
    </div>

    <!-- 车辆（AMR） -->
    <div class="field">
      <span class="hint-label">车辆</span>
      <n-select
        v-model:value="selectedAmr"
        :options="amrOptions"
        placeholder="选择 AMR（按车号）"
        class="mrp-select"
        :disabled="!selectedFactory || !selectedWorkshop || !needAmr"
        filterable
        clearable
      />
    </div>

    <!-- 报警类型 -->
    <div class="field">
      <span class="hint-label">报警类型</span>
      <n-select
        v-model:value="selectedAlarmType"
        :options="alarmTypeOptions"
        placeholder="选择报警类型"
        class="mrp-alarm-type"
        clearable
        :loading="alarmTypeLoading"
      />
    </div>

    <!-- 年月 -->
    <div class="field">
      <span class="hint-label">年月</span>
      <n-date-picker
        v-model:value="selectedMonth"
        type="month"
        clearable
        :format="'yyyy-MM'"
        :placeholder="'选择月份'"
        class="mrp-month"
        :disabled="!needMonth"
      />
    </div>

    <!-- 日 -->
    <div class="field">
      <span class="hint-label">日</span>
      <n-select
        v-model:value="selectedDay"
        :options="dayOptions"
        placeholder="选择日"
        class="mrp-day"
        :disabled="!selectedMonth || !needDay"
        clearable
      />
    </div>

    <div class="mrp-toolbar-right">
      <n-button type="primary" ghost @click="$emit('refresh')">确认</n-button>
      <n-button tertiary @click="onReset">重置</n-button>
      <n-dropdown trigger="click" :options="exportOptions" @select="onSelectExport">
        <n-button strong secondary>导出</n-button>
      </n-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { NButton, NSelect, NDatePicker, NDropdown } from "naive-ui";
import { useMonthlyReportStore } from "@/stores/monthlyReportStore.js";
import { getAlarmTypeList } from "@/services/mrApi.js";

// v-model props（对象）与字段级代理，避免递归更新
const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["update:modelValue", "refresh", "export", "export-pdf"]);

// 统计方式
const modeOptions = [
  { label: "厂(近三月)", value: "factory" },
  { label: "厂+车间(近三月)", value: "factory_workshop" },
  { label: "厂+车间+年月", value: "factory_workshop_month" },
  { label: "厂+车间+年月+车号", value: "factory_workshop_month_car" },
  { label: "厂+年月", value: "factory_month" },
  { label: "厂+车间+年月+日", value: "factory_workshop_month_day" },
  { label: "厂+最近30天充电次数", value: "factory_latest30" }
];

// 导出下拉
const exportOptions = [
  { label: '.html(推荐)', key: 'html' },
  { label: '.PDF', key: 'pdf' }
]
function onSelectExport(key){
  if(key==='html') emit('export')
  else if(key==='pdf') emit('export-pdf')
}
const selectedMode = computed({
  get: () => props.modelValue.selectedMode ?? "factory",
  set: (v) =>
    emit("update:modelValue", { ...props.modelValue, selectedMode: v }),
});

const selectedMonth = computed({
  get: () => props.modelValue.selectedMonth ?? null,
  set: (v) =>
    emit("update:modelValue", { ...props.modelValue, selectedMonth: v }),
});
const selectedDay = computed({
  get: () => props.modelValue.selectedDay ?? null,
  set: (v) =>
    emit("update:modelValue", { ...props.modelValue, selectedDay: v }),
});
const selectedFactory = computed({
  get: () => props.modelValue.selectedFactory ?? "",
  set: (v) =>
    emit("update:modelValue", { ...props.modelValue, selectedFactory: v }),
});
const selectedWorkshop = computed({
  get: () => props.modelValue.selectedWorkshop ?? "",
  set: (v) =>
    emit("update:modelValue", { ...props.modelValue, selectedWorkshop: v }),
});
const selectedAmr = computed({
  get: () => props.modelValue.selectedAmr ?? "",
  set: (v) =>
    emit("update:modelValue", { ...props.modelValue, selectedAmr: v }),
});
const selectedAlarmType = computed({
  get: () => props.modelValue.selectedAlarmType ?? "",
  set: (v) =>
    emit("update:modelValue", { ...props.modelValue, selectedAlarmType: v }),
});
// 动态报警类型
const alarmTypeOptions = ref([]);
const alarmTypeLoading = ref(false);
const alarmTypeError = ref(false);

async function loadAlarmTypes() {
  alarmTypeLoading.value = true;
  alarmTypeError.value = false;
  try {
    const list = await getAlarmTypeList();
    alarmTypeOptions.value = (list || []).map((it) => ({
      label: it.kdnm,
      value: it.kind,
    }));
  } catch (e) {
    alarmTypeError.value = true;
    alarmTypeOptions.value = [];
    window.$message?.error?.("报警类型加载失败");
  } finally {
    alarmTypeLoading.value = false;
  }
}

// 根据统计方式控制可用项
const needWorkshop = computed(() =>
  [
    "factory_workshop",
    "factory_workshop_month",
    "factory_workshop_month_car",
    "factory_workshop_month_day",
    "factory_latest30",
  ].includes(selectedMode.value)
);
const needAmr = computed(() =>
  ["factory_workshop_month_car"].includes(selectedMode.value)
);
const needMonth = computed(() =>
  [
    "factory_workshop_month",
    "factory_workshop_month_car",
    "factory_month",
    "factory_workshop_month_day",
  ].includes(selectedMode.value)
);
const needDay = computed(() =>
  ["factory_workshop_month_day"].includes(selectedMode.value)
);

// 初始化月份（仅当父未提供时）
onMounted(() => {
  if (!selectedMonth.value) {
    const d = new Date();
    selectedMonth.value = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
});

const mrStore = useMonthlyReportStore();
// 工厂选项
const factoryOptions = computed(() =>
  (mrStore.factories || []).map((f) => ({ label: f.ftnm, value: f.ftid }))
);
// 车间选项
const workshopOptions = computed(() => {
  const ftid = selectedFactory.value;
  if (!ftid) return [];
  const groups = mrStore.workshopsMap[ftid] || [];
  return groups.map((g) => ({ label: g.label, value: g.value }));
});

// 车间加载态（按工厂维度）
const workshopLoading = computed(
  () => !!mrStore.loadingMap[selectedFactory.value]
);

// AMR 下拉
const amrOptions = ref([]);

// 首次加载工厂列表
onMounted(() => {
  mrStore.fetchFactories();
  loadAlarmTypes();
});

// 切换工厂 -> 加载车间与 AMR 分组
watch(
  () => selectedFactory.value,
  async (ftid) => {
    // 工厂变化 -> 级联清空下级；若清空工厂则直接刷新
    selectedWorkshop.value = "";
    selectedAmr.value = "";
    amrOptions.value = [];
    if (!ftid) {
      emit("refresh");
      return;
    }
    await mrStore.fetchFactoryWorkshops(ftid);
  }
);

// 切换车间 -> 生成对应 AMR 下拉
watch([() => selectedFactory.value, () => selectedWorkshop.value], () => {
  selectedAmr.value = "";
  amrOptions.value = [];
  const ftid = selectedFactory.value;
  const wkid = selectedWorkshop.value;
  if (!ftid || !wkid) {
    if (!wkid) emit("refresh");
    return;
  }
  const groups = mrStore.workshopsMap[ftid] || [];
  const group = groups.find((g) => g.value === wkid);
  if (!group) {
    emit("refresh");
    return;
  }
  const opts = (group.children || []).map((amr) => ({
    label: amr.label,
    value: String(amr.value), // 使用 ipid 作为 value
    crid: String(amr.crid ?? ""),
  }));
  // 去重
  const seen = new Set();
  amrOptions.value = opts.filter((o) =>
    seen.has(o.value) ? false : (seen.add(o.value), true)
  );
});

// AMR 清空时刷新
watch(
  () => selectedAmr.value,
  (v, ov) => {
    if (!v && ov) emit("refresh");
  }
);

// 工厂加载错误提示
watch(
  () => mrStore.factoryError,
  (e) => {
    if (e) window.$message?.error?.("工厂列表加载失败");
  }
);

// 日选项：基于选中月份计算天数
const dayOptions = computed(() => {
  if (!selectedMonth.value) return [];
  const d = new Date(selectedMonth.value);
  const y = d.getFullYear();
  const m = d.getMonth();
  const max = new Date(y, m + 1, 0).getDate();
  const opts = Array.from({ length: max }, (_, i) => ({
    label: `${i + 1} 日`,
    value: i + 1,
  }));
  // 若当前选择的日 > 本月天数，自动清空
  if (selectedDay.value && selectedDay.value > max) selectedDay.value = null;
  return opts;
});

// 模式变化时，清理不需要的字段
watch(selectedMode, () => {
  if (!needWorkshop.value) selectedWorkshop.value = "";
  if (!needAmr.value) selectedAmr.value = "";
  if (!needMonth.value) selectedMonth.value = selectedMonth.value; // 保留或可置空，这里保留
  if (!needDay.value) selectedDay.value = null;
});

// 重置按钮：清空选择并回到当月
function onReset() {
  const now = new Date();
  const monthTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const next = {
    ...props.modelValue,
    selectedMode: "factory",
    selectedFactory: "",
    selectedWorkshop: "",
    selectedAmr: "",
    selectedAlarmType: "",
    selectedMonth: monthTs,
    selectedDay: null,
  };
  emit("update:modelValue", next);
  // 同时清理本地 AMR 选项
  amrOptions.value = [];
}
</script>

<style scoped>
.mrp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 10px 12px;
  backdrop-filter: blur(6px);
}
.field {
  display: flex;
  align-items: center;
  gap: 6px;
}
.hint-label {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}
.mrp-month {
  width: 120px;
}
.mrp-day {
  width: 120px;
}
.mrp-select {
  width: 130px;
}
.mrp-alarm-type {
  width: 130px;
}
.mrp-mode {
  width: 180px;
}
.mrp-toolbar-right {
  margin-left: auto;
  display: flex;
  gap: 10px;
}
@media (max-width: 1024px) {
  .mrp-select {
    width: 140px;
  }
}
</style>
