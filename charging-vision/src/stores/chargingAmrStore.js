import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getChargingAmrList } from '@/services/api.js';

export const useChargingAmrStore = defineStore('chargingAmr', () => {
  const chargingList = ref([]);

  async function fetchChargingList() {
    try {
      const result = await getChargingAmrList();
      chargingList.value = Array.isArray(result) ? result : [];
    } catch (error) {
      chargingList.value = [];
    }
  }

  // 转换为 HomeChargeInfoCard 需要的格式
  const cardList = computed(() =>
    chargingList.value.map((item, idx) => ({
      id: idx + 1,
      area: item.factoryName,
      brand: item.brand,
      code: item.amrId,
      power: item.quantityOfElectricity + '%',
    }))
  );

  return { chargingList, cardList, fetchChargingList };
});
