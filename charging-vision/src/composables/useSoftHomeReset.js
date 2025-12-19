// 软返回 Home 并重置核心状态，而不整页刷新
import { useMonthlyReportStore } from "@/stores/monthlyReportStore.js";
import { useMonthlyReportTop10Store } from "@/stores/monthlyReportTop10Store.js";
import { useChargingAmrStore } from "@/stores/chargingAmrStore.js";
import { useWarningStore } from "@/stores/warningStore.js";

export function useSoftHomeReset() {
  function resetMonthly() {
    try {
      const s = useMonthlyReportStore();
      s.clearS890601Cache?.();
      // 清理 KPI / 简单字段
      s.kpi.value = {
        total_cnt: null,
        total_dur: null,
        avg_dur: null,
        avg_per: null,
        mom: { total_cnt: null, total_dur: null, avg_dur: null, avg_per: null },
        hint: "加载中",
      };
    } catch {}
    try {
      const t = useMonthlyReportTop10Store();
      t.list = [];
      t.hasLoaded = false;
    } catch {}
  }
  function resetRealtime() {
    try {
      const c = useChargingAmrStore();
      c.cardList = [];
    } catch {}
    try {
      const w = useWarningStore();
      w.warningListStr = [];
    } catch {}
  }
  async function softReset() {
    resetMonthly();
    resetRealtime();
  }
  return { softReset };
}
