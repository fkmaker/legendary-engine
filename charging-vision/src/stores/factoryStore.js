import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { getAgvInfoList } from '../services/api';

export const useFactoryStore = defineStore('factory', () => {
  // 工厂静态数据
  const factories = ref([
    { ftid: 'S0101', ftnm: '物流园' },
    { ftid: 'S0102', ftnm: '超二' },
    { ftid: 'S0103', ftnm: '超三' },
    { ftid: 'S0104', ftnm: '超四' },
    { ftid: 'S0105', ftnm: '超一' },
    { ftid: 'S0106', ftnm: '三厂' },
  ]);

  // 记录每个工厂下的车间和AMR
  const workshopsMap = reactive({});
  const loadingMap = reactive({});

  // 工厂展开时加载数据
  async function fetchFactoryWorkshops(ftid) {
    if (workshopsMap[ftid] || loadingMap[ftid]) return;
    loadingMap[ftid] = true;
    try {
    const res = await getAgvInfoList(ftid);
    const data = Array.isArray(res) ? res : (res?.data || []);
      // 按车间分组
      const group = {};
      data.forEach(item => {
        if (!group[item.plid]) group[item.plid] = [];
        group[item.plid].push(item);
      });
      // 转为 n-menu options，AMR按crid升序，显示名AMR+三位编号
      workshopsMap[ftid] = Object.entries(group).map(([plid, amrs]) => {
        // 按 crid 去重，避免同一 AMR 出现多条记录
        const seenCrid = new Set();
        const unique = [];
        amrs
          .slice()
          .sort((a, b) => Number(a.crid) - Number(b.crid))
          .forEach(amr => {
            const id = String(amr.crid);
            if (!seenCrid.has(id)) {
              seenCrid.add(id);
              unique.push(amr);
            }
          });

        return {
          label: plid,
          key: plid,
          type: 'submenu',
          children: unique.map(amr => ({
            label: `AMR${String(amr.crid).padStart(3, '0')}`,
            key: amr.info,
            amrData: amr
          }))
        };
      });
    } catch (e) {
      workshopsMap[ftid] = [];
    } finally {
      loadingMap[ftid] = false;
    }
  }

  return {
    factories,
    workshopsMap,
    fetchFactoryWorkshops,
    loadingMap
  };
});
