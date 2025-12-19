<template>
  <n-card size="small" title="近30天充电趋势" :bordered="false" class="chart-card">
    <div class="chart-container">
      <div ref="el" class="chart"></div>
      <div v-if="loading" class="overlay loader-wrapper"><span class="loader"></span></div>
      <div v-else-if="error" class="overlay state-box error">
        <div class="msg">加载失败</div>
        <n-button size="small" tertiary @click="onRetry">重试</n-button>
      </div>
      <div v-else-if="hasLoaded && dataCount === 0" class="overlay state-box empty">暂无数据</div>
    </div>
  </n-card>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { NCard, NButton } from 'naive-ui'
import '@/composables/justLoading.css'
import * as echarts from 'echarts'
import { useMonthlyReportStore } from '@/stores/monthlyReportStore.js'

const el = ref(null)
let chart
const store = useMonthlyReportStore()

const props = defineProps({
  selected: { type: Object, default: () => ({}) },
  refreshKey: { type: Number, default: 0 }
})

// 默认展示：首个工厂 + 其首个车间
let defaultLoaded = false
const currentFactoryName = ref('')
const currentWorkshopName = ref('')
const loading = ref(false)
const error = ref(false)
const hasLoaded = ref(false)
const dataCount = ref(0)
const lastFactoryId = ref('')
const lastWorkshopId = ref('')

function init() {
  if (!el.value) return
  chart = echarts.init(el.value)
  baseOption()
}

function resize() { chart && chart.resize() }

onMounted(() => {
  init()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  if (chart) { chart.dispose(); chart = null }
})

defineExpose({
  getExportOption: () => chart ? chart.getOption() : null,
  getExportImage: () => chart ? chart.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' }) : null
})

function baseOption() {
  if (!chart) return
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 64, top: 30, bottom: 30 },
    legend: { data: ['充电次数', '充电时长(min)'] },
    xAxis: { type: 'category', data: [], boundaryGap: true },
    yAxis: [
      { type: 'value', name: '次数', axisLabel: { formatter: v => formatNum(v) } },
      { type: 'value', name: '时长(min)', min: 0, axisLabel: { formatter: v => formatNum(v) } }
    ],
    series: [
      { name: '充电次数', type: 'bar', data: [], itemStyle: { color: '#6ba3ff' }, barMaxWidth: 22 },
      { name: '充电时长(min)', type: 'line', yAxisIndex: 1, smooth: true, data: [], showSymbol: false, itemStyle: { color: '#ff7f50' } }
    ]
  })
}

function formatNum(v) {
  if (v == null) return ''
  return Number(v).toLocaleString('zh-CN')
}

async function loadLatest30(factoryId, workshopId, factoryName, workshopName) {
  if (!chart || !factoryId || !workshopId) return
  loading.value = true
  error.value = false
  let rows = []
  try {
    rows = await store.fetchWorkshopLast30(factoryId, workshopId)
  } catch (e) {
    error.value = true
    rows = []
  }
  lastFactoryId.value = factoryId
  lastWorkshopId.value = workshopId
  currentFactoryName.value = factoryName || (store.factories.find(f => f.ftid === factoryId)?.ftnm || '')
  // 车间名称从 workshopsMap
  const groups = store.workshopsMap[factoryId] || []
  currentWorkshopName.value = workshopName || (groups.find(g => g.value === workshopId)?.label || '')
  // 排序已在 store 内完成；补齐缺失日期（以日历连续天为准）
  const map = new Map()
  rows.forEach(r => {
    const key = `${r.yymm}-${String(r.date).padStart(2,'0')}`
    map.set(key, r)
  })
  if (rows.length) {
    const parseDate = (r) => {
      const y = Number(r.yymm.slice(0,4))
      const m = Number(r.yymm.slice(4)) - 1
      const d = Number(r.date)
      return new Date(y, m, d)
    }
    const first = parseDate(rows[0])
    const last = parseDate(rows[rows.length - 1])
    const filled = []
    for (let dt = new Date(first); dt <= last; dt.setDate(dt.getDate() + 1)) {
      const y = dt.getFullYear()
      const m = (dt.getMonth() + 1).toString().padStart(2, '0')
      const d = dt.getDate()
      const yymm = `${y}${m}`
      const key = `${yymm}-${String(d).padStart(2,'0')}`
      if (map.has(key)) {
        filled.push(map.get(key))
      } else {
        filled.push({ yymm, date: d, tcnt: 0, tmnt: 0 })
      }
    }
    // 用填充后的数组
    filled.sort((a,b) => (a.yymm === b.yymm) ? (a.date - b.date) : a.yymm.localeCompare(b.yymm))
    // 覆盖 rows 内容引用（不直接修改原数组变量引用即可）
    rows.length = 0
    filled.forEach(f => rows.push(f))
  }
  const x = rows.map(r => String(Number(r.date)))
  const cnt = rows.map(r => r.tcnt)
  const mins = rows.map(r => r.tmnt)
  if (!error.value) {
    chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        // params[0].axisValue 是日；从第一条取 yymm 并格式化成年-月
        const idx = params[0]?.dataIndex ?? 0
        const yymm = rows[idx]?.yymm || ''
        const y = yymm.slice(0, 4)
        const m = yymm.slice(4)
        const d = x[idx]
        const lines = [`${y}-${m}-${d}`]
        if (currentFactoryName.value || currentWorkshopName.value) {
          lines.push(`${currentFactoryName.value}${currentWorkshopName.value ? ' / ' + currentWorkshopName.value : ''}`)
        }
        params.forEach(p => {
          lines.push(`${p.seriesName}: ${p.value}${p.seriesName.includes('时长') ? 'min' : ''}`)
        })
        return lines.join('<br/>')
      }
    },
    xAxis: { type: 'category', data: x, boundaryGap: true },
    series: [
      { name: '充电次数', type: 'bar', data: cnt, itemStyle: { color: '#6ba3ff' }, barMaxWidth: 22 },
      { name: '充电时长(min)', type: 'line', yAxisIndex: 1, smooth: true, data: mins, itemStyle: { color: '#ff7f50' } }
    ]
    })
  }
  if (!error.value) {
    dataCount.value = rows.length
    hasLoaded.value = true
  }
  loading.value = false
}

function onRetry() {
  if (loading.value) return
  if (lastFactoryId.value && lastWorkshopId.value) {
    loadLatest30(lastFactoryId.value, lastWorkshopId.value)
  } else {
    // 尝试使用当前选项或默认
    const { selectedFactory, selectedWorkshop } = props.selected || {}
    if (selectedFactory && selectedWorkshop) {
      loadLatest30(selectedFactory, selectedWorkshop)
    }
  }
}

// 默认加载：页面第一次加载，展示默认厂/车间近30天
onMounted(async () => {
  if (defaultLoaded) return
  try {
    if (!store.factories?.length) await store.fetchFactories()
    const factory = store.factories[0]
    if (factory) {
      // 确保已有车间数据
      await store.fetchFactoryWorkshops(factory.ftid)
      const ensure = () => {
        if (defaultLoaded) return
        const groups = store.workshopsMap[factory.ftid] || []
        const wk = groups[0]
        if (wk) {
          loadLatest30(factory.ftid, wk.value, factory.ftnm, wk.label).then(()=>{ defaultLoaded = true })
        }
      }
      ensure()
      // 兜底：若第一次返回为空，监听后续填充
  watch(() => store.workshopsMap[factory.ftid], () => ensure(), { deep: true })
    }
  } catch (e) { /* 忽略默认加载错误 */ }
})

// 仅在确认刷新且模式为最新30天时（refreshKey 变化且当前模式匹配）重新加载
watch(() => props.refreshKey, () => {
  const { selectedMode, selectedFactory, selectedWorkshop } = props.selected || {}
  if (selectedMode === 'factory_latest30') {
    loadLatest30(selectedFactory, selectedWorkshop)
  }
})

// 当用户切换到最新30天模式（并已有选择）时，可立即加载；切换离开不清空，保留当前图
watch(() => props.selected?.selectedMode, (m) => {
  if (m === 'factory_latest30') {
    const { selectedFactory, selectedWorkshop } = props.selected || {}
    if (selectedFactory && selectedWorkshop) loadLatest30(selectedFactory, selectedWorkshop)
  }
})
</script>

<style scoped>
.chart { height: 320px; width: 100%; }
.chart-container { position:relative; height:320px; }
.overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.6); backdrop-filter: blur(2px); }
.state-box { height:320px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#64748b; gap:10px; }
.state-box.error .msg { color:#ef4444; }
.loader-wrapper { height:320px; display:flex; align-items:center; justify-content:center; }
</style>
