<template>
  <div class="fill-card">
    <n-card size="small" title="关注要点" :bordered="false" class="card">
      <ul class="tips">
        <li>
          高风险时段：<b>08:00–10:00</b>、<b>20:00–22:00</b>
        </li>
        <li>
          高频类型：<b>{{ selectedType || '电压' }}</b>（近期占比偏高）
        </li>
        <li>
          建议抽样复核：<b>近 7 天</b>设备日志与阈值配置
        </li>
      </ul>
    </n-card>
  </div>
</template>

<script setup>
import { NCard } from 'naive-ui'
const props = defineProps({ selectedType: { type: String, default: '' } })
</script>

<style scoped>
.fill-card { flex: 1 1 auto; display: flex; min-height: 80px; }
.card { width: 100%; height: 100%; display: flex; }
.tips { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
.tips li { font-size: 13px; color: #475569; }
.tips b { color: #334155; }
</style>
