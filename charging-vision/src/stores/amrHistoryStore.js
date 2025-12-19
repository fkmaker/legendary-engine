import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { getAmrChargeHistory } from "@/services/api.js";

// AMR 历史曲线数据 Store
//  btvt -> 电压(V)
//  btvl -> 剩余电量(%) 或 kWh (需后端确认)
//  bttp -> 温度(°C)
//  chct -> 电流(A)
export const useAmrHistoryStore = defineStore("amrHistory", () => {
  const factoryId = ref("");
  const amrId = ref("");
  const rawList = ref([]); // 后端原始数组
  const loading = ref(false);
  const error = ref(null);
  const lastUpdated = ref(null);

  async function fetchHistory(ftid, crid) {
    if (!ftid || !crid) return;
    factoryId.value = ftid;
    amrId.value = crid;
    loading.value = true;
    error.value = null;
    try {
      const res = await getAmrChargeHistory(ftid, crid);
      const arr = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];
      // 按时间升序
      rawList.value = arr
        .slice()
        .sort((a, b) => new Date(a.dtim) - new Date(b.dtim));
      lastUpdated.value = Date.now();
    } catch (e) {
      rawList.value = [];
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  function formatTime(str) {
    if (!str) return "";
    // 兼容 "2025-07-10 10:12:00.0" -> Date
    const s = String(str).replace(" ", "T").replace(/\.0$/, "");
    const d = new Date(s);
    if (isNaN(d.getTime())) return str;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // 原始时间数组与格式化时间轴
  const rawTimeAxis = computed(() => rawList.value.map((i) => i.dtim));
  const xAxis = computed(() => rawList.value.map((i) => formatTime(i.dtim)));

  function buildLine(name, dataKey) {
    return {
      name,
      type: "line",
      data: rawList.value.map((i) => i[dataKey] ?? null),
      smooth: true,
      showSymbol: false,
    };
  }

  // 单指标序列(动态) - 提供分别需要的序列
  const voltageSeries = computed(() => [buildLine("电压", "btvt")]);
  const currentSeries = computed(() => [buildLine("电流", "chct")]);
  const energySeries = computed(() => [buildLine("电量", "btvl")]);
  const tempSeries = computed(() => [buildLine("温度", "bttp")]);

  // 状态派生
  const hasSelection = computed(() => !!factoryId.value && !!amrId.value);
  const hasData = computed(
    () => hasSelection.value && rawList.value.length > 0
  );
  const isEmptyAfterFetch = computed(
    () => hasSelection.value && !loading.value && rawList.value.length === 0
  );

  return {
    factoryId,
    amrId,
    rawList,
    loading,
    error,
    lastUpdated,
    fetchHistory,
    rawTimeAxis,
    xAxis, // 已格式化
    voltageSeries,
    currentSeries,
    energySeries,
    tempSeries,
    hasSelection,
    hasData,
    isEmptyAfterFetch,
  };
});
