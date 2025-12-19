import { defineStore } from 'pinia'
import { getReportS890702 } from '@/services/mrApi.js'

/**
 * 报警 Top10 设备 Store
 * 负责：
 *  - 通过筛选(ftid,wkid,yymm,kind)加载20条原始数据
 *  - 提供高Top10、低Top10、双列表
 *  - 处理加载状态/错误状态
 */
export const useAlarmTop10Store = defineStore('alarmTop10', {
  state: () => ({
    raw: [], // 原始最多20条
    filters: { ftid: '', wkid: '', yymm: '', kind: '' },
    loading: false,
    error: null,
    hasLoaded: false,
    reqToken: 0
  }),
  getters: {
    highTop10: (s) => [...s.raw].sort((a,b) => b.tqty - a.tqty).slice(0,10),
    lowTop10: (s) => [...s.raw].sort((a,b) => a.tqty - b.tqty).slice(0,10),
    bothTop10: (s) => {
      const high = [...s.raw].sort((a,b) => b.tqty - a.tqty).slice(0,10)
      const low = [...s.raw].sort((a,b) => a.tqty - b.tqty).slice(0,10)
      return { high, low }
    }
  },
  actions: {
    setFilters(patch) {
      this.filters = { ...this.filters, ...patch }
    },
    async fetchData() {
      const token = ++this.reqToken
      this.loading = true
      this.error = null
      try {
        const { ftid, wkid, yymm, kind } = this.filters
        const data = await getReportS890702({ ftid, wkid, yymm, kind, opid: 0 })
        if (token !== this.reqToken) return // 废弃
        this.raw = Array.isArray(data) ? data : []
        this.hasLoaded = true
      } catch (e) {
        if (token !== this.reqToken) return
        this.error = e || new Error('加载失败')
        this.raw = []
      } finally {
        if (token === this.reqToken) this.loading = false
      }
    }
  }
})
