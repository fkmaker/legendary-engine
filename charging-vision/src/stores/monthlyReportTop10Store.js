import { defineStore } from "pinia";
import { ref } from "vue";
import { getS890604 } from "@/services/mrApi.js";

// 占位：等待新接口（将来替换 fetchTop10Data 内部实现）
export const useMonthlyReportTop10Store = defineStore(
  "monthlyReportTop10",
  () => {
    // 筛选条件
    const ftid = ref(""); // 工厂
    const yymm = ref(""); // 月份 (yyyyMM)
    const mode = ref("both"); // both | high | low （对应：高、低TOP10 / 高TOP10 / 低TOP10）

    // 数据状态
    const loading = ref(false);
    const error = ref(null);
    const list = ref([]); // [{ name, value }]
    const hasLoaded = ref(false); // 是否已尝试加载至少一次

    function setFilters({ newFtid, newYymm, newMode }) {
      if (newFtid !== undefined) ftid.value = newFtid;
      if (newYymm !== undefined) yymm.value = newYymm;
      if (newMode !== undefined) mode.value = newMode;
    }

    // 接入真实接口（当前实现：opid=0 返回高低混合列表；前端再拆分/取前10）
    async function fetchTop10Data() {
      loading.value = true;
      error.value = null;
      // 仅首次加载时清空，避免加载过程出现“暂无数据”闪烁
      if (!hasLoaded.value) list.value = [];
      try {
        const raw = await getS890604({
          ftid: ftid.value,
          yymm: yymm.value,
          opid: 0,
        });
        // 仅使用 ftid, ftnm, yymm, tcnt, crid/ipid 构造、避免其余字段参与逻辑
        const rows = (raw || []).map((r) => ({
          ftid: r.ftid,
          ftnm: r.ftnm,
          yymm: r.yymm,
          crid: r.crid,
          ipid: r.ipid,
          crnm: r.crnm,
          tcnt: Number(r.tcnt || 0),
        }));
        // 排序逻辑
        let sortedHigh = [...rows].sort((a, b) => b.tcnt - a.tcnt).slice(0, 10);
        let sortedLow = [...rows].sort((a, b) => a.tcnt - b.tcnt).slice(0, 10);

        if (mode.value === "high") {
          list.value = sortedHigh.map((item) => ({
            name: `AMR${String(item.crid).padStart(3, "0")}`,
            value: item.tcnt,
            group: "high",
            crnm: item.crnm,
            ftnm: item.ftnm,
            crid: item.crid,
          }));
        } else if (mode.value === "low") {
          list.value = sortedLow.map((item) => ({
            name: `AMR${String(item.crid).padStart(3, "0")}`,
            value: item.tcnt,
            group: "low",
            crnm: item.crnm,
            ftnm: item.ftnm,
            crid: item.crid,
          }));
        } else {
          // both：先低后高，并保留 group 标记
          const merged = [
            ...sortedLow.map((item) => ({
              name: `AMR${String(item.crid).padStart(3, "0")}`,
              value: item.tcnt,
              group: "low",
              crnm: item.crnm,
              ftnm: item.ftnm,
              crid: item.crid,
            })),
            ...sortedHigh.map((item) => ({
              name: `AMR${String(item.crid).padStart(3, "0")}`,
              value: item.tcnt,
              group: "high",
              crnm: item.crnm,
              ftnm: item.ftnm,
              crid: item.crid,
            })),
          ];
          list.value = merged;
        }
      } catch (e) {
        error.value = e;
        list.value = [];
      } finally {
        loading.value = false;
        hasLoaded.value = true;
      }
    }

    return {
      ftid,
      yymm,
      mode,
      loading,
      error,
      list,
      hasLoaded,
      setFilters,
      fetchTop10Data,
    };
  }
);
