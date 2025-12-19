import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getWarningList } from '@/services/api.js';

// 报警状态管理
export const useWarningStore = defineStore('warning', () => {
  const warningList = ref([]);

  // 获取报警列表
  async function fetchWarningList() {
    try {
      const result = await getWarningList();
      if (Array.isArray(result)) {
        warningList.value = result;
      } else if (result && typeof result === 'object' && Array.isArray(result.data)) {
        warningList.value = result.data;
      } else {
        warningList.value = [];
      }
    } catch (error) {
      warningList.value = [];
    }
  }

  // 生成报警列表字符串
  const warningListStr = computed(() =>
    warningList.value.map(
      item => `${item.factoryName} - AMR${item.amrId} - ${item.warnDesc}`
    )
  );

  return { warningList, warningListStr, fetchWarningList };
});
