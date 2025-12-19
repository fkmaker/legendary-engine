// 日期与格式化工具
// 统一 yymm / yyyyMM / 补零 / 月份偏移逻辑，避免在 store 中重复内联函数

/**
 * 格式化时间戳为 yyyyMM 字符串；ts 为空/无效返回 ''
 * @param {number|Date|string} ts
 * @returns {string}
 */
export function fmtYyyyMm(ts) {
  if (!ts && ts !== 0) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  return `${y}${m}`
}

/**
 * 计算与给定 ts 相差 delta 月后的首日时间戳（delta 可为负）
 * @param {number|Date|string} ts
 * @param {number} delta
 */
export function shiftMonth(ts, delta) {
  const d = ts instanceof Date ? new Date(ts.getTime()) : new Date(ts)
  if (isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime()
}

/**
 * 获取上一个月首日时间戳
 */
export function prevMonth(ts) {
  return shiftMonth(ts, -1)
}

/**
 * 生成某月所有天(1~n)数组
 */
export function monthDayList(ts) {
  const d = ts instanceof Date ? ts : new Date(ts)
  if (isNaN(d.getTime())) return []
  const y = d.getFullYear()
  const m = d.getMonth()
  const lastDay = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: lastDay }, (_, i) => i + 1)
}

/**
 * 填充按天数组缺口：基于传入对象数组(含 date 字段 1~31)，返回补零结果
 */
export function fillMonthDaily(rows, ts, mapper) {
  const days = monthDayList(ts)
  const map = new Map(rows.map(r => [Number(r.date), r]))
  return days.map(d => {
    const row = map.get(d)
    return mapper ? mapper(row, d) : row || { date: d }
  })
}
