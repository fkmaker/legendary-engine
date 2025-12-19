import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import {
  getFactoryData,
  getAllAmrList,
  getAmrQty,
  getS890601,
} from "@/services/mrApi.js";
import { fmtYyyyMm, prevMonth } from "@/utils/date.js";

/**
 * Monthly Report 专用：工厂/车间/AMR 级联数据
 * 隔离旧的 factoryStore，与新接口对接。
 */
export const useMonthlyReportStore = defineStore("monthlyReport", () => {
  // --- getS890601 缓存：支持 TTL + LRU 大小上限 ---
  const S890601_CACHE_MAX = 120; // 最大筛选组合缓存条目
  const S890601_CACHE_TTL = 5 * 60 * 1000; // 5 分钟失效
  const s890601Cache = new Map(); // key -> { data, ts }
  const s890601Inflight = new Map(); // key -> Promise<data>
  function pruneS890601Cache() {
    // 按插入顺序淘汰最老（Map 迭代顺序即插入顺序）
    while (s890601Cache.size > S890601_CACHE_MAX) {
      const oldestKey = s890601Cache.keys().next().value;
      if (!oldestKey) break;
      s890601Cache.delete(oldestKey);
    }
  }
  function getS890601Cached(params = {}) {
    const key = JSON.stringify(params);
    const now = Date.now();
    const hit = s890601Cache.get(key);
    if (hit && now - hit.ts < S890601_CACHE_TTL) {
      // LRU: 触发最近使用，移动到尾部
      s890601Cache.delete(key);
      s890601Cache.set(key, hit);
      return Promise.resolve(hit.data);
    }
    if (s890601Inflight.has(key)) return s890601Inflight.get(key);
    const p = getS890601(params)
      .then((res) => {
        s890601Inflight.delete(key);
        s890601Cache.set(key, { data: res, ts: Date.now() });
        pruneS890601Cache();
        return res;
      })
      .catch((err) => {
        s890601Inflight.delete(key);
        throw err;
      });
    s890601Inflight.set(key, p);
    return p;
  }
  function clearS890601Cache() {
    s890601Cache.clear();
    s890601Inflight.clear();
  }
  function getS890601CacheStats() {
    return { size: s890601Cache.size };
  }
  // 工厂列表（选项）
  const factories = ref([]);
  const factoryLoading = ref(false);
  const factoryError = ref(null);

  // 每个工厂的车间与 AMR 映射：{ [ftid]: Array<{ label, value, type:'submenu', children: Array<{ label, value, crid, ipid }> }> }
  const workshopsMap = reactive({});
  const loadingMap = reactive({});

  // 数量缓存与状态
  const qtyList = ref([]); // 原始列表 [{ ftid, ftnm, wkid, qty }]
  const qtyLoading = ref(false);
  const qtyError = ref(null);

  // 厂级 KPI 状态
  const kpiLoading = ref(false);
  const kpiError = ref(null);
  const kpi = ref({
    total_cnt: null, // tcnt
    total_dur: null, // tmnt
    avg_dur: null, // tmnt/tcnt (min/次)
    avg_per: null, // tcnt/车辆数
    mom: {
      // 环比占位（上月无数据则为 null）
      total_cnt: null,
      total_dur: null,
      avg_dur: null,
      avg_per: null,
    },
    hint: "加载中",
  });

  // ---- 并发 / 竞态防护：仅最新请求可以落地 ----
  const kpiReqToken = ref(0);
  function nextKpiToken() {
    kpiReqToken.value += 1;
    return kpiReqToken.value;
  }
  const last30ReqToken = ref(0);
  function nextLast30Token() {
    last30ReqToken.value += 1;
    return last30ReqToken.value;
  }

  /**
   * 拉取工厂列表
   * @param {{ ftid?: string, ftnm?: string }} [filters]
   */
  let factoryFetchPromise = null;
  async function fetchFactories(filters = {}) {
    if (factoryLoading.value && factoryFetchPromise) return factoryFetchPromise;
    factoryLoading.value = true;
    factoryError.value = null;
    factoryFetchPromise = (async () => {
      try {
        const list = await getFactoryData(filters);
        factories.value = (list || []).map((item) => ({
          ftid: item.ftid,
          ftnm: item.ftnm,
        }));
      } catch (e) {
        factories.value = [];
        factoryError.value = e;
      } finally {
        factoryLoading.value = false;
      }
    })();
    return factoryFetchPromise;
  }

  /**
   * 按工厂ID拉取该工厂下的车间与 AMR 数据，并构造成下拉选项
   * 规则：
   * - 基于 wkid 分组为车间；wkid 为空/缺失归为 “未分配”
   * - AMR 显示名：AMR + crid(3位补零)
   * - 选项 value：建议使用 ipid 作为唯一标识（后续接口调用绑定 AMR）
   */
  const workshopPromises = reactive({});
  async function fetchFactoryWorkshops(ftid) {
    if (!ftid) return;
    if (workshopsMap[ftid]) return workshopsMap[ftid];
    if (workshopPromises[ftid]) return workshopPromises[ftid];
    loadingMap[ftid] = true;
    workshopPromises[ftid] = (async () => {
      try {
        const list = await getAllAmrList(ftid);
        // 分组：wkid -> AMR 数组
        const group = {};
        for (const item of list || []) {
          const wk = item.wkid || "未分配";
          if (!group[wk]) group[wk] = [];
          group[wk].push(item);
        }
        // 生成选项：每个车间一组，AMR 用 ipid 作为 value，保留 crid/ipid
        const groups = Object.entries(group).map(([wkid, amrs]) => {
          // 去重：同 ipid 只保留一条，使用 Map 和 reduce 提高效率
          const childrenMap = amrs.reduce((map, amr) => {
            const key = String(amr.ipid || "");
            if (!key || map.has(key)) return map;
            map.set(key, {
              label: `AMR${String(amr.crid).padStart(3, "0")}`,
              value: key, // ipid 作为 AMR 唯一值
              crid: String(amr.crid || ""),
              ipid: key,
              amrData: amr,
            });
            return map;
          }, new Map());
          const children = Array.from(childrenMap.values()).sort((a, b) =>
            a.crid.localeCompare(b.crid, "en", { numeric: true })
          );
          return {
            label: wkid,
            value: wkid,
            type: "submenu",
            children,
          };
        });
        workshopsMap[ftid] = groups;
      } catch (e) {
        workshopsMap[ftid] = [];
      } finally {
        loadingMap[ftid] = false;
        delete workshopPromises[ftid];
      }
      return workshopsMap[ftid];
    })();
    return workshopPromises[ftid];
  }

  /**
   * 拉取厂级 KPI（opid=0），按选定工厂与月份统计；
   * monthTs: 月份时间戳（取 yymm = yyyyMM），若空则不过滤月份。
   */
  async function fetchFactoryKpi(ftid, monthTs, options = {}) {
    const reqToken = nextKpiToken();
    const computeMom = options.computeMom ?? Boolean(monthTs);
    kpiLoading.value = true;
    kpiError.value = null;
    kpi.value.hint = "加载中";
    try {
      // 当月
      const cur = await getS890601Cached({
        ftid: ftid ?? "",
        yymm: fmtYyyyMm(monthTs),
      });
      // 聚合（若返回多行则合并）
      const tcnt = (cur || []).reduce((s, r) => s + Number(r.tcnt || 0), 0);
      const tmnt = (cur || []).reduce((s, r) => s + Number(r.tmnt || 0), 0);

      // 环比：仅在 computeMom 为真时计算
      let mom = {
        total_cnt: null,
        total_dur: null,
        avg_dur: null,
        avg_per: null,
      };
      if (computeMom) {
        mom = await computeMometrics({
          curCnt: tcnt,
          curDur: tmnt,
          getPrev: async () => {
            let prevTs = null;
            if (monthTs) {
              const d = new Date(monthTs);
              prevTs = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
            }
            const pre = await getS890601Cached({
              ftid: ftid ?? "",
              yymm: fmtYyyyMm(prevMonth(monthTs)),
            });
            return pre;
          },
          getQtyPair: () => {
            const cur = getQtyByFactory(ftid);
            return { qtyCur: cur, qtyPre: cur };
          },
        });
      }

      // 赋值 KPI（只在最新请求）
      if (reqToken === kpiReqToken.value) {
        const qty = getQtyByFactory(ftid);
        kpi.value = {
          total_cnt: tcnt || 0,
          total_dur: tmnt || 0,
          avg_dur: tcnt ? tmnt / tcnt : 0,
          avg_per: qty ? tcnt / qty : 0,
          mom,
          hint: tcnt || tmnt ? "" : "无数据",
        };
      }
    } catch (e) {
      if (reqToken === kpiReqToken.value) {
        kpiError.value = e;
        kpi.value.hint = "加载失败";
      }
    } finally {
      if (reqToken === kpiReqToken.value) kpiLoading.value = false;
    }
  }

  /**
   * 厂+车间 KPI（opid=1），忽略年月/车辆/日期
   */
  async function fetchWorkshopKpi(ftid, wkid, options = {}) {
    const reqToken = nextKpiToken();
    const computeMom = options.computeMom ?? false;
    kpiLoading.value = true;
    kpiError.value = null;
    kpi.value.hint = "加载中";
    try {
      const cur = await getS890601Cached({
        ftid: ftid ?? "",
        wkid: wkid ?? "",
        yymm: "",
        ipid: "",
        opid: 1,
      });
      const tcnt = (cur || []).reduce((s, r) => s + Number(r.tcnt || 0), 0);
      const tmnt = (cur || []).reduce((s, r) => s + Number(r.tmnt || 0), 0);

      let mom = {
        total_cnt: null,
        total_dur: null,
        avg_dur: null,
        avg_per: null,
      };
      if (computeMom) {
        // 预留：目前缺少 opid=1 上月口径示例，后续可补；保持结构一致
      }

      if (reqToken === kpiReqToken.value) {
        const qty = getQtyByFactoryWorkshop(ftid, wkid);
        kpi.value = {
          total_cnt: tcnt || 0,
          total_dur: tmnt || 0,
          avg_dur: tcnt ? tmnt / tcnt : 0,
          avg_per: qty ? tcnt / qty : 0,
          mom,
          hint: tcnt || tmnt ? "" : "无数据",
        };
      }
    } catch (e) {
      if (reqToken === kpiReqToken.value) {
        kpiError.value = e;
        kpi.value.hint = "加载失败";
      }
    } finally {
      if (reqToken === kpiReqToken.value) kpiLoading.value = false;
    }
  }

  /**
   * 厂+车间+年月 KPI（opid=2），按传入月份 yymm 汇总；默认计算环比（上月同厂同车间）。
   */
  async function fetchWorkshopMonthKpi(ftid, wkid, monthTs, options = {}) {
    const reqToken = nextKpiToken();
    const computeMom = options.computeMom ?? true;
    kpiLoading.value = true;
    kpiError.value = null;
    kpi.value.hint = "加载中";
    try {
      const yymm = fmtYyyyMm(monthTs);
      const cur = await getS890601Cached({
        ftid: ftid ?? "",
        wkid: wkid ?? "",
        yymm,
        ipid: "",
        opid: 2,
      });
      const tcnt = (cur || []).reduce((s, r) => s + Number(r.tcnt || 0), 0);
      const tmnt = (cur || []).reduce((s, r) => s + Number(r.tmnt || 0), 0);

      let mom = {
        total_cnt: null,
        total_dur: null,
        avg_dur: null,
        avg_per: null,
      };
      if (computeMom && monthTs) {
        mom = await computeMometrics({
          curCnt: tcnt,
          curDur: tmnt,
          getPrev: async () => {
            const d = new Date(monthTs);
            const prevTs = new Date(
              d.getFullYear(),
              d.getMonth() - 1,
              1
            ).getTime();
            const pyymm = fmtYyyyMm(prevTs);
            return await getS890601Cached({
              ftid: ftid ?? "",
              wkid: wkid ?? "",
              yymm: pyymm,
              ipid: "",
              opid: 2,
            });
          },
          getQtyPair: () => {
            const q = getQtyByFactoryWorkshop(ftid, wkid);
            return { qtyCur: q, qtyPre: q };
          },
        });
      }

      if (reqToken === kpiReqToken.value) {
        const qty = getQtyByFactoryWorkshop(ftid, wkid);
        kpi.value = {
          total_cnt: tcnt || 0,
          total_dur: tmnt || 0,
          avg_dur: tcnt ? tmnt / tcnt : 0,
          avg_per: qty ? tcnt / qty : 0,
          mom,
          hint: tcnt || tmnt ? "" : "无数据",
        };
      }
    } catch (e) {
      if (reqToken === kpiReqToken.value) {
        kpiError.value = e;
        kpi.value.hint = "加载失败";
      }
    } finally {
      if (reqToken === kpiReqToken.value) kpiLoading.value = false;
    }
  }

  /**
   * 厂+车间+年月+车号 KPI（opid=3），按指定车辆(ipid)与月份汇总；默认计算环比。
   * 单车分母固定为 1。
   */
  async function fetchWorkshopMonthCarKpi(
    ftid,
    wkid,
    monthTs,
    ipid,
    options = {}
  ) {
    const reqToken = nextKpiToken();
    const computeMom = options.computeMom ?? true;
    kpiLoading.value = true;
    kpiError.value = null;
    kpi.value.hint = "加载中";
    try {
      const yymm = fmtYyyyMm(monthTs);
      const cur = await getS890601Cached({
        ftid: ftid ?? "",
        wkid: wkid ?? "",
        yymm,
        ipid: ipid ?? "",
        opid: 3,
      });
      const tcnt = (cur || []).reduce((s, r) => s + Number(r.tcnt || 0), 0);
      const tmnt = (cur || []).reduce((s, r) => s + Number(r.tmnt || 0), 0);

      let mom = {
        total_cnt: null,
        total_dur: null,
        avg_dur: null,
        avg_per: null,
      };
      if (computeMom && monthTs) {
        mom = await computeMometrics({
          curCnt: tcnt,
          curDur: tmnt,
          getPrev: async () => {
            const d = new Date(monthTs);
            const prevTs = new Date(
              d.getFullYear(),
              d.getMonth() - 1,
              1
            ).getTime();
            const pyymm = fmtYyyyMm(prevTs);
            return await getS890601Cached({
              ftid: ftid ?? "",
              wkid: wkid ?? "",
              yymm: pyymm,
              ipid: ipid ?? "",
              opid: 3,
            });
          },
          getQtyPair: () => ({ qtyCur: 1, qtyPre: 1 }),
        });
      }

      if (reqToken === kpiReqToken.value) {
        const qty = 1;
        kpi.value = {
          total_cnt: tcnt || 0,
          total_dur: tmnt || 0,
          avg_dur: tcnt ? tmnt / tcnt : 0,
          avg_per: qty ? tcnt / qty : 0,
          mom,
          hint: tcnt || tmnt ? "" : "无数据",
        };
      }
    } catch (e) {
      if (reqToken === kpiReqToken.value) {
        kpiError.value = e;
        kpi.value.hint = "加载失败";
      }
    } finally {
      if (reqToken === kpiReqToken.value) kpiLoading.value = false;
    }
  }

  /**
   * 厂+车间+年月+日 KPI（opid=5）。
   * 后端返回该月的按天明细（包含 date 字段），前端在同一响应中筛选指定日并汇总。
   * 环比：默认与上月同日对比（若上月无该日或无数据，则环比为 null）。
   */
  async function fetchWorkshopMonthDayKpi(
    ftid,
    wkid,
    monthTs,
    day,
    options = {}
  ) {
    const reqToken = nextKpiToken();
    const computeMom = options.computeMom ?? true;
    kpiLoading.value = true;
    kpiError.value = null;
    kpi.value.hint = "加载中";
    try {
      const yymm = fmtYyyyMm(monthTs);
      const curAll = await getS890601Cached({
        ftid: ftid ?? "",
        wkid: wkid ?? "",
        yymm,
        ipid: "",
        opid: 5,
      });
      const curRows = (curAll || []).filter(
        (r) => Number(r.date) === Number(day)
      );
      const tcnt = curRows.reduce((s, r) => s + Number(r.tcnt || 0), 0);
      const tmnt = curRows.reduce((s, r) => s + Number(r.tmnt || 0), 0);

      let mom = {
        total_cnt: null,
        total_dur: null,
        avg_dur: null,
        avg_per: null,
      };
      if (computeMom && monthTs && day != null) {
        mom = await computeMometrics({
          curCnt: tcnt,
          curDur: tmnt,
          getPrev: async () => {
            const d = new Date(monthTs);
            const prevTs = new Date(
              d.getFullYear(),
              d.getMonth() - 1,
              1
            ).getTime();
            const pyymm = fmtYyyyMm(prevTs);
            const preAll = await getS890601Cached({
              ftid: ftid ?? "",
              wkid: wkid ?? "",
              yymm: pyymm,
              ipid: "",
              opid: 5,
            });
            return (preAll || []).filter((r) => Number(r.date) === Number(day));
          },
          getQtyPair: () => {
            const q = getQtyByFactoryWorkshop(ftid, wkid);
            return { qtyCur: q, qtyPre: q };
          },
        });
      }

      if (reqToken === kpiReqToken.value) {
        const qty = getQtyByFactoryWorkshop(ftid, wkid);
        kpi.value = {
          total_cnt: tcnt || 0,
          total_dur: tmnt || 0,
          avg_dur: tcnt ? tmnt / tcnt : 0,
          avg_per: qty ? tcnt / qty : 0,
          mom,
          hint: tcnt || tmnt ? "" : "无数据",
        };
      }
    } catch (e) {
      if (reqToken === kpiReqToken.value) {
        kpiError.value = e;
        kpi.value.hint = "加载失败";
      }
    } finally {
      if (reqToken === kpiReqToken.value) kpiLoading.value = false;
    }
  }

  /**
   * 厂+年月 KPI（opid=4），按工厂与月份汇总；默认计算环比。
   */
  async function fetchFactoryMonthKpi(ftid, monthTs, options = {}) {
    const reqToken = nextKpiToken();
    const computeMom = options.computeMom ?? true;
    kpiLoading.value = true;
    kpiError.value = null;
    kpi.value.hint = "加载中";
    try {
      const yymm = fmtYyyyMm(monthTs);

      // 为提升性能：不要直接用 opid=4（厂+月），而是并行调用 "车间+月"（opid=2）并汇总，且隔绝其他字段（仅传 wkid 与 yymm）。
      // 1) 确保已拿到该厂的车间列表
      if (!workshopsMap[ftid]) {
        await fetchFactoryWorkshops(ftid);
      }
      const wkGroups = workshopsMap[ftid] || [];
      const wkids = Array.from(
        new Set(wkGroups.map((g) => String(g.value || "")).filter(Boolean))
      );

      // 若没有拿到车间列表，兜底回退到一次性调用（避免页面卡死）
      if (wkids.length === 0) {
        const curFallback = await getS890601Cached({
          ftid: ftid ?? "",
          yymm,
          wkid: "",
          ipid: "",
          opid: 4,
        });
        const tcntFb = (curFallback || []).reduce(
          (s, r) => s + Number(r.tcnt || 0),
          0
        );
        const tmntFb = (curFallback || []).reduce(
          (s, r) => s + Number(r.tmnt || 0),
          0
        );
        const qtyFb = getQtyByFactory(ftid);
        kpi.value = {
          total_cnt: tcntFb || 0,
          total_dur: tmntFb || 0,
          avg_dur: tcntFb ? tmntFb / tcntFb : 0,
          avg_per: qtyFb ? tcntFb / qtyFb : 0,
          mom: {
            total_cnt: null,
            total_dur: null,
            avg_dur: null,
            avg_per: null,
          },
          hint: tcntFb || tmntFb ? "" : "无数据",
        };
        return;
      }

      // 2) 当前月：并行按车间请求（仅 wkid+yymm，opid=2）
      const curList = await Promise.all(
        wkids.map((wk) =>
          getS890601Cached({ ftid: "", wkid: wk, yymm, ipid: "", opid: 2 })
        )
      );
      const flatCur = curList.flat().filter(Boolean);
      const tcnt = flatCur.reduce((s, r) => s + Number(r.tcnt || 0), 0);
      const tmnt = flatCur.reduce((s, r) => s + Number(r.tmnt || 0), 0);

      // 3) 环比：同样方式聚合上月
      let mom = {
        total_cnt: null,
        total_dur: null,
        avg_dur: null,
        avg_per: null,
      };
      if (computeMom && monthTs) {
        mom = await computeMometrics({
          curCnt: tcnt,
          curDur: tmnt,
          getPrev: async () => {
            const d = new Date(monthTs);
            const prevTs = new Date(
              d.getFullYear(),
              d.getMonth() - 1,
              1
            ).getTime();
            const pyymm = fmtYyyyMm(prevTs);
            const preList = await Promise.all(
              wkids.map((wk) =>
                getS890601Cached({
                  ftid: "",
                  wkid: wk,
                  yymm: pyymm,
                  ipid: "",
                  opid: 2,
                })
              )
            );
            return preList.flat().filter(Boolean);
          },
          getQtyPair: () => {
            const q = getQtyByFactory(ftid);
            return { qtyCur: q, qtyPre: q };
          },
        });
      }

      if (reqToken === kpiReqToken.value) {
        const qty = getQtyByFactory(ftid);
        kpi.value = {
          total_cnt: tcnt || 0,
          total_dur: tmnt || 0,
          avg_dur: tcnt ? tmnt / tcnt : 0,
          avg_per: qty ? tcnt / qty : 0,
          mom,
          hint: tcnt || tmnt ? "" : "无数据",
        };
      }
    } catch (e) {
      if (reqToken === kpiReqToken.value) {
        kpiError.value = e;
        kpi.value.hint = "加载失败";
      }
    } finally {
      if (reqToken === kpiReqToken.value) kpiLoading.value = false;
    }
  }

  /**
   * 拉取 AMR 数量列表，并缓存；支持可选筛选（若后端忽略筛选也能兼容）
   * @param {{ ftid?: string, wkid?: string }} [filters]
   */
  async function fetchAmrQty(filters = {}) {
    if (qtyLoading.value) return;
    qtyLoading.value = true;
    qtyError.value = null;
    try {
      const list = await getAmrQty(filters);
      // 数据清洗：qty 转 number
      qtyList.value = (list || []).map((x) => ({
        ftid: String(x.ftid || ""),
        ftnm: String(x.ftnm || ""),
        wkid: String(x.wkid || ""),
        qty: Number(x.qty || 0),
      }));
    } catch (e) {
      qtyList.value = [];
      qtyError.value = e;
    } finally {
      qtyLoading.value = false;
    }
  }

  /**
   * 近30天趋势（opid=6）：厂+车间，返回按天记录（跨月），包含 yymm 与 date。
   * 仅传递必要字段：ftid、wkid、opid=6；yymm/ipid 传空字符串。
   * 返回排序后的数组（按 yymm 升序、date 升序）。
   */
  async function fetchWorkshopLast30(ftid, wkid) {
    const token = nextLast30Token();
    const list = await getS890601Cached({
      ftid: ftid ?? "",
      wkid: wkid ?? "",
      yymm: "",
      ipid: "",
      opid: 6,
    });
    if (token !== last30ReqToken.value) return []; // 废弃
    const rows = (list || []).map((r) => ({
      ftid: String(r.ftid || ""),
      wkid: String(r.wkid || ""),
      yymm: String(r.yymm || ""),
      date: Number(r.date || 0),
      tcnt: Number(r.tcnt || 0),
      tmnt: Number(r.tmnt || 0),
    }));
    rows.sort((a, b) =>
      a.yymm === b.yymm ? a.date - b.date : a.yymm.localeCompare(b.yymm)
    );
    return rows;
  }

  // 统一环比计算辅助
  async function computeMometrics({ curCnt, curDur, getPrev, getQtyPair }) {
    try {
      const prevRows = await getPrev();
      const ptcnt = (prevRows || []).reduce(
        (s, r) => s + Number(r.tcnt || 0),
        0
      );
      const ptmnt = (prevRows || []).reduce(
        (s, r) => s + Number(r.tmnt || 0),
        0
      );
      const ratio = (a, b) => (b ? ((a - b) / b) * 100 : null);
      const { qtyCur, qtyPre } = getQtyPair();
      const total_cnt = ratio(curCnt, ptcnt);
      const total_dur = ratio(curDur, ptmnt);
      const avgCur = curCnt ? curDur / curCnt : null;
      const avgPre = ptcnt ? ptmnt / ptcnt : null;
      const avg_dur =
        avgCur != null && avgPre != null && avgPre !== 0
          ? ((avgCur - avgPre) / avgPre) * 100
          : null;
      const perCur = qtyCur ? curCnt / qtyCur : null;
      const perPre = qtyPre ? ptcnt / qtyPre : null;
      const avg_per =
        perCur != null && perPre != null && perPre !== 0
          ? ((perCur - perPre) / perPre) * 100
          : null;
      return { total_cnt, total_dur, avg_dur, avg_per };
    } catch (e) {
      return { total_cnt: null, total_dur: null, avg_dur: null, avg_per: null };
    }
  }

  /**
   * 获取某厂的 AMR 数量
   */
  function getQtyByFactory(ftid) {
    // 未指定 ftid 视为汇总全部工厂（用于总览）
    if (!ftid) return qtyList.value.reduce((s, x) => s + (x.qty || 0), 0);
    return qtyList.value
      .filter((x) => x.ftid === ftid)
      .reduce((s, x) => s + (x.qty || 0), 0);
  }

  /**
   * 获取某厂-车间的 AMR 数量
   */
  function getQtyByFactoryWorkshop(ftid, wkid) {
    if (!ftid || !wkid) return 0;
    return qtyList.value
      .filter((x) => x.ftid === ftid && x.wkid === wkid)
      .reduce((s, x) => s + (x.qty || 0), 0);
  }

  return {
    factories,
    factoryLoading,
    factoryError,
    workshopsMap,
    loadingMap,
    qtyList,
    qtyLoading,
    qtyError,
    fetchFactories,
    fetchFactoryWorkshops,
    fetchAmrQty,
    getQtyByFactory,
    getQtyByFactoryWorkshop,
    kpiLoading,
    kpiError,
    kpi,
    fetchFactoryKpi,
    fetchWorkshopKpi,
    fetchWorkshopMonthKpi,
    fetchWorkshopMonthDayKpi,
    fetchWorkshopMonthCarKpi,
    fetchFactoryMonthKpi,
    fetchWorkshopLast30,
    // utils
    computeMometrics,
    clearS890601Cache,
  };
});
