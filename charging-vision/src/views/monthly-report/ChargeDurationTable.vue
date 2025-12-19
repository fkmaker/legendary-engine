<template>
  <n-card size="small" title="电池健康度分析" :bordered="false">
    <n-data-table :columns="columns" :data="rows" size="small" :bordered="false" />
  </n-card>
</template>

<script setup>
import { h, ref } from 'vue'
import { NCard, NDataTable, NTag } from 'naive-ui'

const columns = [
  { title: '设备', key: 'device' },
  { title: '平均时长(h)', key: 'avg' },
  { title: '最长(h)', key: 'max' },
  { title: '最短(h)', key: 'min' },
  { title: '次数', key: 'cnt' },
  {
    title: '异常', key: 'abn', render(row) {
      return row.abn ? h(NTag, { type: 'error', size: 'small' }, { default: () => row.abn }) : null
    }
  }
]

const rows = ref(Array.from({ length: 12 }, (_, i) => ({
  device: `AMR${String(210 + i).padStart(3, '0')}`,
  avg: (0.8 + Math.random() * 1.8).toFixed(2),
  max: (2.4 + Math.random() * 2.8).toFixed(2),
  min: (0.2 + Math.random() * 0.6).toFixed(2),
  cnt: Math.round(20 + Math.random() * 80),
  abn: Math.random() > 0.7 ? '夜间峰值异常' : ''
})))
</script>

<style scoped>
:deep(.n-data-table .n-data-table-th) { font-weight: 700; }
</style>
