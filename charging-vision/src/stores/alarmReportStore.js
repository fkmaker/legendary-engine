import { defineStore } from "pinia";
import { getReportS890701 } from "@/services/mrApi.js";

// 简单 LRU + TTL 缓存实现
class SimpleCache {
  constructor(max = 50, ttl = 5 * 60 * 1000) {
    this.max = max;
    this.ttl = ttl;
    this.map = new Map();
  }
  _now() {
    return Date.now();
  }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (this._now() - entry.time > this.ttl) {
      this.map.delete(key);
      return null;
    }
    // LRU 触发：重新 set
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, time: this._now() });
    if (this.map.size > this.max) {
      // 迭代最早的
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }
}

const typeAggCache = new SimpleCache();
const detailCache = new SimpleCache();

export const useAlarmReportStore = defineStore("alarmReport", {
  state: () => ({
    filters: { ftid: "", wkid: "", yymm: "", kind: "", ipid: "" },
    // 类型聚合 (opid=4)
    typeAgg: [],
    typeLoading: false,
    typeError: null,
    typeToken: 0,
    // 明细设备 (opid=7)
    detail: [],
    detailLoading: false,
    detailError: null,
    detailToken: 0,
    // 环比（上月）缓存与增幅
    momLoading: false,
    momError: null,
    momToken: 0,
    momPrev: { total: 0, car: 0 },
    momDelta: { total: 0, car: 0 },
  }),
  getters: {
    totalAlarmCount: (s) =>
      s.typeAgg.reduce((sum, r) => sum + Number(r.tqty || 0), 0),
    totalAlarmMinutes: (s) =>
      s.typeAgg.reduce((sum, r) => sum + Number(r.mint || 0), 0),
    typeListSorted: (s) => [...s.typeAgg].sort((a, b) => b.tqty - a.tqty),
    alarmCarCount: (s) => {
      // 去重 crid 或 ipid
      const set = new Set();
      s.detail.forEach((d) => {
        const key = d.crid || d.ipid;
        if (key) set.add(key);
      });
      return set.size;
    },
    totalMomDelta: (s) => Number(s.momDelta.total || 0),
    alarmCarMomDelta: (s) => Number(s.momDelta.car || 0),
  },
  actions: {
    setFilters(patch) {
      this.filters = { ...this.filters, ...patch };
    },
    _key() {
      const { ftid, wkid, yymm, kind, ipid } = this.filters;
      return JSON.stringify({ ftid, wkid, yymm, kind, ipid });
    },

    async fetchTypeAgg() {
      const token = ++this.typeToken;
      const key = this._key() + "|type";
      const cached = typeAggCache.get(key);
      if (cached) {
        this.typeAgg = cached;
        return;
      }
      this.typeLoading = true;
      this.typeError = null;
      try {
        const { ftid, wkid, yymm, kind, ipid } = this.filters;
        const data = await getReportS890701({
          ftid,
          wkid,
          yymm,
          kind,
          ipid,
          opid: 4,
        });
        if (token !== this.typeToken) return;
        // 聚合同 kind （保险）
        const map = new Map();
        data.forEach((r) => {
          const k = r.kind;
          if (!map.has(k))
            map.set(k, { kind: k, kdnm: r.kdnm, tqty: 0, mint: 0 });
          const obj = map.get(k);
          obj.tqty += Number(r.tqty || 0);
          obj.mint += Number(r.mint || 0);
        });
        this.typeAgg = Array.from(map.values());
        typeAggCache.set(key, this.typeAgg);
      } catch (e) {
        if (token !== this.typeToken) return;
        this.typeError = e || new Error("加载失败");
        this.typeAgg = [];
      } finally {
        if (token === this.typeToken) this.typeLoading = false;
      }
    },

    async fetchDetail() {
      const token = ++this.detailToken;
      const key = this._key() + "|detail";
      const cached = detailCache.get(key);
      if (cached) {
        this.detail = cached;
        return;
      }
      this.detailLoading = true;
      this.detailError = null;
      try {
        const { ftid, wkid, yymm, kind, ipid } = this.filters;
        const data = await getReportS890701({
          ftid,
          wkid,
          yymm,
          kind,
          ipid,
          opid: 7,
        });
        if (token !== this.detailToken) return;
        this.detail = Array.isArray(data) ? data : [];
        detailCache.set(key, this.detail);
      } catch (e) {
        if (token !== this.detailToken) return;
        this.detailError = e || new Error("加载失败");
        this.detail = [];
      } finally {
        if (token === this.detailToken) this.detailLoading = false;
      }
    },

    async fetchMom() {
      const token = ++this.momToken;
      this.momLoading = true;
      this.momError = null;
      try {
        const { ftid, wkid, yymm, kind, ipid } = this.filters;
        // 没有月份无法计算环比
        if (!yymm || String(yymm).length < 6) {
          if (token !== this.momToken) return;
          this.momPrev = { total: 0, car: 0 };
          // 置零增幅
          this.momDelta = { total: 0, car: 0 };
          return;
        }
        // 计算上月 yymm
        const yyyy = Number(String(yymm).slice(0, 4));
        const mm = Number(String(yymm).slice(4, 6));
        const prevDate = new Date(yyyy, mm - 2, 1); // JS 月份从0开始，mm-2 为上月
        const yymmPrev = `${prevDate.getFullYear()}${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

        // 拉取上月：类型聚合与明细（用于小车数去重）
        const [typePrev, detailPrev] = await Promise.all([
          getReportS890701({ ftid, wkid, yymm: yymmPrev, kind, ipid, opid: 4 }),
          getReportS890701({ ftid, wkid, yymm: yymmPrev, kind, ipid, opid: 7 }),
        ]);
        if (token !== this.momToken) return;

        const prevTotal = (Array.isArray(typePrev) ? typePrev : []).reduce(
          (sum, r) => sum + Number(r.tqty || 0),
          0
        );
        const prevCar = (() => {
          const set = new Set();
          (Array.isArray(detailPrev) ? detailPrev : []).forEach((d) => {
            const key = d.crid || d.ipid;
            if (key) set.add(key);
          });
          return set.size;
        })();

        // 使用当前 store 中的最新值作为本月口径
        const curTotal = this.totalAlarmCount;
        const curCar = this.alarmCarCount;
        const pct = (cur, prev) => {
          const p = Number(prev || 0);
          if (!p) return cur ? 100 : 0; // 约定：上月为0且本月>0 则 +100%
          return ((Number(cur || 0) - p) / p) * 100;
        };
        this.momPrev = { total: prevTotal, car: prevCar };
        this.momDelta = {
          total: Number(pct(curTotal, prevTotal).toFixed(1)),
          car: Number(pct(curCar, prevCar).toFixed(1)),
        };
      } catch (e) {
        if (token !== this.momToken) return;
        this.momError = e || new Error("环比加载失败");
        this.momPrev = { total: 0, car: 0 };
        this.momDelta = { total: 0, car: 0 };
      } finally {
        if (token === this.momToken) this.momLoading = false;
      }
    },

    async fetchAll() {
      await Promise.all([this.fetchTypeAgg(), this.fetchDetail()]);
      // 在当前数据到位后再算环比
      await this.fetchMom();
    },
  },
});
