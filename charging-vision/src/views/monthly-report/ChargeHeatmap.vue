<template>
  <n-card size="small" title="热力图" :bordered="false">
    <div ref="el" class="chart"></div>
  </n-card>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { NCard } from 'naive-ui'
import * as echarts from 'echarts'

const el = ref(null)
let chart

function init() {
  if (!el.value) return
  chart = echarts.init(el.value)
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const days = Array.from({ length: 7 }, (_, i) => `周${'一二三四五六日'[i]}`)
  const data = []
  for (let d = 0; d < days.length; d++) {
    for (let h = 0; h < hours.length; h++) {
      data.push([h, d, Math.round(Math.random() * 100)])
    }
  }
  chart.setOption({
    tooltip: { position: 'top' },
    grid: { left: 60, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: hours, splitArea: { show: true } },
    yAxis: { type: 'category', data: days, splitArea: { show: true } },
    visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', bottom: 0 },
    series: [{
      name: '次数', type: 'heatmap', data, label: { show: true },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.3)' } }
    }]
  })
}

function resize() { chart && chart.resize() }

onMounted(() => { init(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); chart?.dispose() })
</script>

<style scoped>
.chart { height: 280px; width: 100%; }
</style>
