import axios from "axios";

const BASE_URL = "http://192.168.120.185:8086";

/**
 * 获取工厂列表
 * GET /api/getFactoryData?ftid&ftnm
 * @param {{ ftid?: string, ftnm?: string }} [params]
 * @returns {Promise<Array<{ cpid:string, cpnm:string, ftid:string, ftnm:string }>>>}
 */
export async function getFactoryData(params = {}) {
  // 一些后端会要求参数键存在，即使值为空；默认追加空字符串
  const query = { ftid: params.ftid ?? "", ftnm: params.ftnm ?? "" };
  const res = await axios.get(`${BASE_URL}/api/getFactoryData`, {
    params: query,
  });
  // 兼容后端可能外包 data 的情况
  return Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
}

/**
 * 获取指定工厂下的 AMR 列表（含车间）
 * GET /api/getAllAmrList?factoryId=FTID
 * 返回示例项：{ ftid, ftnm, crid, ipid, wkid }
 * @param {string} factoryId
 * @returns {Promise<Array<{ ftid:string, ftnm:string, crid:string, ipid:string, wkid?:string }>>}
 */
export async function getAllAmrList(factoryId) {
  // 后端允许 factoryId 为空，但通常要求键存在
  const res = await axios.get(`${BASE_URL}/api/getAllAmrList`, {
    params: { factoryId: factoryId ?? "" },
  });
  const arr = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
  return arr;
}

/**
 * 获取 AMR 数量（用于计算“单台平均充电次数”分母）
 * GET /api/getAmrQty
 * 可选参数：ftid、wkid（若后端不支持筛选会被忽略）
 * 返回项示例：{ ftid, ftnm, wkid, qty }
 * @param {{ ftid?: string, wkid?: string }} [params]
 * @returns {Promise<Array<{ ftid: string, ftnm: string, wkid: string, qty: number }>>}
 */
export async function getAmrQty(params = {}) {
  const query = { ftid: params.ftid ?? "", wkid: params.wkid ?? "" };
  const res = await axios.get(`${BASE_URL}/api/getAmrQty`, { params: query });
  return Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
}

/**
 * 厂级 KPI 数据（opid=0）
 * GET /api/getS890601?ftid&yymm&wkid&ipid&opid=0
 * 仅使用 opid=0，其余参数可为空字符串（保证键存在）
 * 返回项：{ ftid, ftnm, wkid, ipid, yymm, mnth, date, tmnt, tcnt, ... }
 */
export async function getS890601(params = {}) {
  const query = {
    ftid: params.ftid ?? "",
    yymm: params.yymm ?? "",
    wkid: params.wkid ?? "",
    ipid: params.ipid ?? "",
    opid: params.opid ?? 0,
  };
  const res = await axios.get(`${BASE_URL}/api/getS890601`, { params: query });
  return Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
}

/**
 * 单台月累计充电次数 Top10（高、低）
 * GET /api/getS890604?ftid&yymm&ipid&opid=0
 * 仅使用：ftid, yymm, opid=0（隔绝其他筛选）
 * 返回字段示例：{ ftid, ftnm, crid, ipid, crnm, yymm, tmnt, tcnt }
 */
export async function getS890604(params = {}) {
  const query = {
    ftid: params.ftid ?? "",
    yymm: params.yymm ?? "",
    ipid: params.ipid ?? "", // 占位，不使用
    opid: params.opid ?? 0,
  };
  const res = await axios.get(`${BASE_URL}/api/getS890604`, { params: query });
  return Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
}

/**
 * 报警类型列表（下拉）
 * GET /api/getAlarmType
 * 返回示例：[{ kind: '1', kdnm: '电池电量预警' }, ...]
 * @returns {Promise<Array<{ kind:string, kdnm:string }>>}
 */
export async function getAlarmTypeList() {
  const res = await axios.get(`${BASE_URL}/api/getAlarmType`);
  return Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
}

/**
 * 报警设备 Top 数据 (支持 20 条，需前端再切高/低 Top10)
 * GET /api/getReportS890702?ftid=&yymm=&wkid=&kind=&ipid=&opid=0
 * 返回字段示例：{ ftid, ftnm, yymm, wkid, kind, kdnm, crid, ipid, crnm, tqty, mint }
 * @param {{ ftid?:string, yymm?:string, wkid?:string, kind?:string, ipid?:string, opid?:number }} params
 * @returns {Promise<Array<{ ftid:string, ftnm:string, yymm:string, wkid:string, kind:string, kdnm:string, crid:string, ipid:string, crnm:string, tqty:number, mint:number }>>}
 */
export async function getReportS890702(params = {}) {
  const query = {
    ftid: params.ftid ?? "",
    yymm: params.yymm ?? "",
    wkid: params.wkid ?? "",
    kind: params.kind ?? "",
    ipid: params.ipid ?? "",
    opid: params.opid ?? 0,
  };
  const res = await axios.get(`${BASE_URL}/api/getReportS890702`, {
    params: query,
  });
  return Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
}

/**
 * 历史报警统计（按类型聚合）
 * GET /api/getReportS890701?ftid=&yymm=&wkid=&kind=&ipid=&opid=4
 * 返回字段示例：{ ftid, ftnm, yymm, wkid, kind, kdnm, crid, ipid, crnm, tqty, mint }
 * 其中 crid/ipid/crnm 多为 null（聚合层级），tqty=次数，mint=分钟
 * @param {{ ftid?:string, yymm?:string, wkid?:string, kind?:string, ipid?:string, opid?:number }} params
 * @returns {Promise<Array<{ ftid:string, ftnm:string, yymm:string|null, wkid:string|null, kind:string, kdnm:string, tqty:number, mint:number }>>}
 */
export async function getReportS890701(params = {}) {
  const query = {
    ftid: params.ftid ?? "",
    yymm: params.yymm ?? "",
    wkid: params.wkid ?? "",
    kind: params.kind ?? "",
    ipid: params.ipid ?? "",
    opid: params.opid ?? 4,
  };
  const res = await axios.get(`${BASE_URL}/api/getReportS890701`, {
    params: query,
  });
  return Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];
}
