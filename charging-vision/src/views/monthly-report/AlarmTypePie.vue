<template>
  <n-card size="small" :bordered="false">
    <template #header>
      <div class="card-header">
        <span class="title">报警类型占比</span>
        <div class="mode-switch">
          <n-radio-group v-model:value="mode" size="small" name="alarmTypeMode" button-style="solid">
            <n-radio-button v-for="opt in modeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</n-radio-button>
          </n-radio-group>
        </div>
      </div>
    </template>
    <div class="chart-wrap">
      <div ref="el" class="chart"></div>
      <div v-if="loading" class="overlay loader-wrapper"><span class="loader"></span></div>
      <div v-else-if="error" class="overlay state-box error"><span>加载失败</span></div>
      <div v-else-if="!displayList.length" class="overlay state-box empty"><span>暂无数据</span></div>
      <div v-else class="center-info" v-show="selectedSlice">
        <div class="main">{{ selectedSlice?.name }}</div>
        <div class="sub">{{ centerValueLabel }}</div>
      </div>
    </div>
  </n-card>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import { NCard, NRadioGroup, NRadioButton } from 'naive-ui'
import * as echarts from 'echarts'
import { useAlarmReportStore } from '@/stores/alarmReportStore.js'
import '@/composables/justLoading.css'

const emit = defineEmits(['selectType'])
const store = useAlarmReportStore()
const el = ref(null)
let chart

// 口径：次数 / 时长 / 指数(0.6次数+0.4时长)
const mode = ref('count')
const modeOptions = [
  { label: '次数', value: 'count' },
  { label: '时长', value: 'minutes' },
  { label: '指数', value: 'score' }
]

const loading = computed(() => store.typeLoading)
const error = computed(() => store.typeError)

// 颜色映射与气泡一致
const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#6366f1','#0ea5e9','#14b8a6','#8b5cf6','#d946ef','#475569','#84cc16']
const typeColorMap = new Map()
function getTypeColor(kind) {
  if (!typeColorMap.has(kind)) {
    typeColorMap.set(kind, palette[typeColorMap.size % palette.length])
  }
  return typeColorMap.get(kind)
}

// 构建展示列表：过滤无数据，排序，TopN聚合
const TOP_N = 8
const rawList = computed(() => store.typeAgg || [])
const displayList = computed(() => {
  const list = rawList.value
    .filter(r => (Number(r.tqty)||0) > 0 || (Number(r.mint)||0) > 0)
    .map(r => ({
      kind: r.kind,
      name: r.kdnm || ('类型'+r.kind),
      tqty: Number(r.tqty||0),
      mint: Number(r.mint||0)
    }))
  if (!list.length) return []
  list.forEach(item => { item.score = item.tqty * 0.6 + (item.mint ? (item.mint / Math.max(...list.map(l=>l.mint||1))) * 0.4 * Math.max(...list.map(l=>l.tqty||1)) : 0) })
  const sortKey = mode.value === 'count' ? 'tqty' : mode.value === 'minutes' ? 'mint' : 'score'
  const sorted = [...list].sort((a,b) => b[sortKey] - a[sortKey])
  if (sorted.length <= TOP_N) return sorted
  const head = sorted.slice(0, TOP_N - 1)
  const tail = sorted.slice(TOP_N - 1)
  const other = tail.reduce((acc, r) => {
    acc.tqty += r.tqty; acc.mint += r.mint; return acc
  }, { kind: '__other', name: '其他', tqty:0, mint:0 })
  other.score = other.tqty * 0.6 + (other.mint ? (other.mint / Math.max(...list.map(l=>l.mint||1))) * 0.4 * Math.max(...list.map(l=>l.tqty||1)) : 0)
  return [...head, other]
})

const totalCount = computed(() => displayList.value.reduce((s,i)=>s+i.tqty,0))
const totalMinutes = computed(() => displayList.value.reduce((s,i)=>s+i.mint,0))

const pieData = computed(() => {
  const key = mode.value === 'count' ? 'tqty' : mode.value === 'minutes' ? 'mint' : 'score'
  const total = key==='tqty'? totalCount.value : key==='mint'? totalMinutes.value : displayList.value.reduce((s,i)=>s+i.score,0)
  if (!total) return []
  return displayList.value.map(item => ({
    name: item.name,
    value: item[key],
    percent: total ? (item[key] / total) : 0,
    raw: item,
    itemStyle: { color: item.kind==='__other' ? '#94a3b8' : getTypeColor(item.kind) }
  }))
})

const selectedKind = ref('')
const selectedSlice = computed(() => pieData.value.find(p => p.raw.kind === selectedKind.value))
const centerValueLabel = computed(() => {
  if (!selectedSlice.value) return ''
  const v = selectedSlice.value.value
  if (mode.value === 'minutes') return v + ' min'
  if (mode.value === 'count') return v + ' 次'
  return v.toFixed(1)
})

function buildOption() {
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const raw = p.data.raw
        const countPct = totalCount.value ? (raw.tqty/totalCount.value*100).toFixed(1) : '0.0'
        const minPct = totalMinutes.value ? (raw.mint/totalMinutes.value*100).toFixed(1) : '0.0'
        return `${p.marker}${p.name}<br/>次数: ${raw.tqty} (${countPct}%)<br/>时长: ${raw.mint} (${minPct}%)`
      }
    },
    legend: { type: 'scroll', bottom: 0, icon: 'circle' },
    series: [{
      type: 'pie',
      radius: ['50%','72%'],
      center: ['50%','48%'],
      data: pieData.value,
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}\n{d}%' },
      labelLine: { length: 12, length2: 6, smooth: true },
      minAngle: 4,
      selectedMode: 'single',
      emphasis: { scale: true, scaleSize: 6 }
    }]
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
  chart.on('click', (p) => {
    const kind = p?.data?.raw?.kind
    if (!kind) return
    selectedKind.value = selectedKind.value === kind ? '' : kind
    emit('selectType', selectedKind.value)
  })
}

function resize() { chart && chart.resize() }

watch([pieData, loading, mode], () => { if (!loading.value) render() })

onMounted(() => { init(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); chart?.dispose() })

defineExpose({
  getExportOption: () => chart ? chart.getOption() : null,
  getExportImage: () => chart ? chart.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' }) : null
})
</script>

<style scoped>
.chart-wrap { position:relative; }
.chart { height: 270px; width: 100%; }
.overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.6); backdrop-filter: blur(2px); }
.loader-wrapper { height:100%; }
.state-box { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:4px; font-size:13px; color:#64748b; }
.state-box.error { color:#ef4444; }
.card-header { display:flex; align-items:center; justify-content:space-between; }
.title { font-weight:600; }
.mode-switch :deep(.n-radio-group) { display:flex; gap:4px; }
.mode-switch :deep(.n-radio-button .n-radio-button__state-border) { box-shadow:none; }
.mode-switch :deep(.n-radio-button) { --n-button-border-radius:6px; }
.center-info { position:absolute; left:50%; top:48%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
.center-info .main { font-size:14px; font-weight:600; color:#334155; }
.center-info .sub { font-size:12px; color:#64748b; margin-top:4px; }
</style>
