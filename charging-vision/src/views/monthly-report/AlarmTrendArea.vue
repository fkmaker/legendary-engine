<template>
  <n-card size="small" :bordered="false">
    <template #header>
      <div class="card-header">
        <span class="title">报警指数</span>
        <div class="actions">
          <n-tooltip placement="bottom" trigger="hover">
            <template #trigger>
              <button :class="['action-btn', { active: brushActive }]" @click="toggleBrush" aria-label="框选放大">
                <span class="icon">▭</span>
              </button>
            </template>
            框选放大
          </n-tooltip>
          <n-tooltip placement="bottom" trigger="hover">
            <template #trigger>
              <button class="action-btn" @click="clearSelection" aria-label="清除框选">
                <span class="icon">✕</span>
              </button>
            </template>
            清除框选
          </n-tooltip>
          <n-tooltip placement="bottom" trigger="hover">
            <template #trigger>
              <button class="action-btn" @click="restoreView" aria-label="还原视图">
                <span class="icon">⟳</span>
              </button>
            </template>
            还原视图
          </n-tooltip>
        </div>
      </div>
    </template>
    <div class="chart-wrap">
      <div ref="el" class="chart"></div>
      <div v-if="loading" class="overlay loader-wrapper"><span class="loader"></span></div>
      <div v-else-if="error" class="overlay state-box error">
        <div class="msg">加载失败</div>
      </div>
      <div v-else-if="!bubbles.length" class="overlay state-box empty">暂无数据</div>
    </div>
  </n-card>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import { NCard, NTooltip } from 'naive-ui'
import * as echarts from 'echarts'
import { useAlarmReportStore } from '@/stores/alarmReportStore.js'
import '@/composables/justLoading.css'

const store = useAlarmReportStore()
const el = ref(null)
let chart
let zoomed = false
let fullExtent = { xmin: 0, xmax: 0, ymin: 0, ymax: 0 }
const brushActive = ref(false)

// 使用明细数据（opid=7），按车辆聚合（每辆车一个气泡）
const loading = computed(() => store.detailLoading)
const error = computed(() => store.detailError)

// 调色板 / 颜色分配（循环使用）
const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#6366f1','#0ea5e9','#14b8a6','#8b5cf6','#d946ef','#475569','#84cc16']
const typeColorMap = new Map()
function getTypeColor(kind) {
  if (!typeColorMap.has(kind)) {
    const idx = typeColorMap.size % palette.length
    typeColorMap.set(kind, palette[idx])
  }
  return typeColorMap.get(kind)
}

// 汇总每车总报警次数/时长，并判定该车主报警类型(最多次数)用于着色
const bubbles = computed(() => {
  const carMap = new Map()
  store.detail.forEach(r => {
    const carId = r.crid || r.ipid || r.carId || r.deviceId
    if (!carId) return
    if (!carMap.has(carId)) {
      carMap.set(carId, {
        id: carId,
        name: r.crnm || r.ipnm || r.ipid || ('车辆'+carId),
        tqty: 0,
        mint: 0,
        typeStats: new Map() // kind -> { tqty, mint, kdnm }
      })
    }
    const obj = carMap.get(carId)
    const kind = r.kind
    const kdnm = r.kdnm
    const addT = Number(r.tqty || 0)
    const addM = Number(r.mint || 0)
    obj.tqty += addT
    obj.mint += addM
    if (kind != null) {
      if (!obj.typeStats.has(kind)) obj.typeStats.set(kind, { kind, kdnm, tqty:0, mint:0 })
      const st = obj.typeStats.get(kind)
      st.tqty += addT
      st.mint += addM
    }
  })
  // 判定主类型 (tqty 最大，若并列 mint 大的)
  const result = []
  carMap.forEach(obj => {
    let main = null
    obj.typeStats.forEach(st => {
      if (!main || st.tqty > main.tqty || (st.tqty === main.tqty && st.mint > main.mint)) main = st
    })
    obj.kind = main?.kind
    obj.kdnm = main?.kdnm
    obj.color = main ? getTypeColor(main.kind) : '#94a3b8'
    result.push(obj)
  })
  return result.sort((a,b) => b.tqty - a.tqty)
})

function calcSymbolSize(tqty, mint) {
  // 指数简单定义：tqty * 0.6 + mint/最大mint * 0.4 * maxTqty  -> 再归一映射到 18 - 72
  const maxT = Math.max(1, ...bubbles.value.map(b => b.tqty))
  const maxM = Math.max(1, ...bubbles.value.map(b => b.mint))
  const composite = (tqty / maxT) * 0.6 + (mint / maxM) * 0.4
  return 18 + composite * 54
}

function buildOption() {
  const maxT = Math.max(1, ...bubbles.value.map(b => b.tqty))
  const maxM = Math.max(1, ...bubbles.value.map(b => b.mint))
  const minT = Math.min(0, ...bubbles.value.map(b => b.tqty))
  const minM = Math.min(0, ...bubbles.value.map(b => b.mint))
  fullExtent = { xmin: minT, xmax: maxT, ymin: minM, ymax: maxM }
  function size(t,m){
    const composite = (t / maxT) * 0.6 + (m / maxM) * 0.4
    return 18 + composite * 54
  }
  // 分组为每种主类型一个 series
  const groupMap = new Map()
  bubbles.value.forEach(b => {
    const key = b.kind ?? '__unknown'
    if (!groupMap.has(key)) groupMap.set(key, { kind: b.kind, kdnm: b.kdnm || '未知', color: b.color, items: [] })
    groupMap.get(key).items.push(b)
  })
  const series = Array.from(groupMap.values()).map(g => ({
    name: g.kdnm,
    type: 'scatter',
    data: g.items.map(b => ({ name: b.name, value: [b.tqty, b.mint, b.id] })),
    symbolSize: (val) => size(val[0], val[1]),
    itemStyle: { color: g.color, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)', borderWidth: 1, borderColor: '#fff' },
    label: { show: false, formatter: (p) => p.name.length>6?p.name.slice(0,6)+'…':p.name, position: 'top', color: '#334' },
    emphasis: { focus: 'series' }
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const [cnt, dur] = p.value
        return `${p.marker}${p.seriesName}<br/>车辆: ${p.name}<br/>次数: ${cnt}<br/>时长(min): ${dur}`
      }
    },
    brush: {
      xAxisIndex: 'all',
      yAxisIndex: 'all',
      brushMode: 'single',
      throttleType: 'debounce',
      throttleDelay: 100
    },
  toolbox: { show: false },
  legend: { type: 'scroll', top: 0 },
  grid: { left: 50, right: 30, top: 40, bottom: 40 },
  xAxis: { name: '次数', type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
  yAxis: { name: '时间(min)', type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    series
  }
}

function render() {
  if (!chart || loading.value) return
  chart.setOption(buildOption(), true)
}

function init() {
  if (!el.value) return
  chart = echarts.init(el.value)
  render()
  // 拖拽框选缩放：使用 brush 选中后按点范围缩放
  chart.on('brushEnd', (evt) => {
    if (!evt || !evt.areas || !evt.areas.length) return
    const area = evt.areas[0]
    if (!area.coordRange) return
    const [xRange, yRange] = area.coordRange // [[xmin,xmax],[ymin,ymax]] for cartesian2d
    if (!xRange || !yRange) return
    let [xmin, xmax] = xRange
    let [ymin, ymax] = yRange
    // 避免选到同一点导致范围为 0
    if (xmax - xmin === 0) { xmin -= 0.5; xmax += 0.5 }
    if (ymax - ymin === 0) { ymin -= 0.5; ymax += 0.5 }
    const padX = (xmax - xmin) * 0.05
    const padY = (ymax - ymin) * 0.05
    xmin -= padX; xmax += padX; ymin -= padY; ymax += padY
    chart.setOption({ xAxis: { min: xmin, max: xmax }, yAxis: { min: ymin, max: ymax } }, false)
    zoomed = true
  })
  // 双击缩放：首次对点放大，再次双击任意处还原
  chart.on('dblclick', (params) => {
    if (!bubbles.value.length) return
    if (!zoomed && params?.componentType === 'series') {
      const [x, y] = params.value
      const xr = fullExtent.xmax - fullExtent.xmin || 1
      const yr = fullExtent.ymax - fullExtent.ymin || 1
      // 放大窗口：取总范围 30% 或最小固定窗口
      const spanX = Math.max(xr * 0.3, xr * 0.05)
      const spanY = Math.max(yr * 0.3, yr * 0.05)
      chart.setOption({
        xAxis: { min: Math.max(fullExtent.xmin, x - spanX / 2), max: Math.min(fullExtent.xmax, x + spanX / 2) },
        yAxis: { min: Math.max(fullExtent.ymin, y - spanY / 2), max: Math.min(fullExtent.ymax, y + spanY / 2) }
      }, false)
      zoomed = true
    } else {
      // 复位
      chart.setOption({
        xAxis: { min: null, max: null },
        yAxis: { min: null, max: null }
      }, false)
      zoomed = false
    }
  })
}

function resize() { chart && chart.resize() }

watch([bubbles, loading], () => { if (!loading.value) render() })

onMounted(() => { init(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); chart?.dispose() })

defineExpose({
  getExportOption: () => chart ? chart.getOption() : null,
  getExportImage: () => chart ? chart.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' }) : null
})

function toggleBrush() {
  brushActive.value = !brushActive.value
  if (brushActive.value) {
    chart?.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: 'rect', brushMode: 'single' } })
  } else {
    chart?.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: {} })
  }
}

function clearSelection() {
  chart?.dispatchAction({ type: 'brush', areas: [] })
}

function restoreView() {
  chart?.setOption({ xAxis: { min: null, max: null }, yAxis: { min: null, max: null } }, false)
  zoomed = false
  clearSelection()
}
</script>

<style scoped>
.chart-wrap { position:relative; }
.chart { height: 260px; width: 100%; }
.card-header { display:flex; align-items:center; justify-content:space-between; }
.title { font-weight:600; }
.actions { display:flex; gap:4px; }
.action-btn { border:none; background:transparent; cursor:pointer; width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:14px; color:#475569; transition:all .15s; }
.action-btn:hover { background:#f1f5f9; color:#0f172a; }
.action-btn.active { background:#0ea5e9; color:#fff; }
.action-btn:active { transform:scale(.9); }
.overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.6); backdrop-filter: blur(2px); }
.loader-wrapper { height:100%; }
.state-box { display:flex; flex-direction:column; gap:6px; color:#64748b; }
.state-box.error .msg { color:#ef4444; }
</style>
