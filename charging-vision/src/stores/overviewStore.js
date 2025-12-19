import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { getCountGroupByFactory } from "@/services/api.js";

// 工厂概览（Home 一览表）
export const useOverviewStore = defineStore("overview", () => {
  const rawList = ref([]); // 原始接口数组
  const loading = ref(false);
  const error = ref(null);
  const lastUpdated = ref(null);

  /**
   * 拉取工厂概览数据
   * @param {string} factoryId 可选过滤工厂
   */
  async function fetchOverview(factoryId = "") {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      const res = await getCountGroupByFactory(factoryId);
      // 兼容后端可能外包一层 data
      const arr = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];
      rawList.value = arr;
      lastUpdated.value = Date.now();
    } catch (e) {
      rawList.value = [];
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  // 映射为组件展示结构
  const factories = computed(() =>
    rawList.value.map((item) => ({
      ftid: item.ftid,
      name: item.ftnm,
      amrCount: item.tqty ?? 0, // 总 AMR 数
      chargeCount: item.cqty ?? 0, // 正在充电数
      abnormalCount: item.eqty ?? 0, // 异常数
    }))
  );

  return { rawList, factories, loading, error, lastUpdated, fetchOverview };
});
