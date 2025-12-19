<template>
  <n-card size="small" :bordered="false" class="kpi-card">
    <div class="loader-wrapper" v-if="loading"><span class="loader"></span></div>
    <template v-else>
      <div v-if="!hint" class="kpi-grid">
        <div v-for="k in kpis" :key="k.key" class="kpi-item">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-value">
            <CountUpNumber :value="Number(k.value || 0)" :duration="800" />
            <span v-if="k.unit" class="kpi-unit">{{ k.unit }}</span>
          </div>
          <div class="kpi-sub">
            环比
            <template v-if="k.mom === null">
              <span class="kpi-mom none">无数据</span>
            </template>
            <template v-else>
              <span :class="['kpi-mom', k.mom >= 0 ? 'up' : 'down']">
                <span v-if="k.mom >= 0">▲</span>
                <span v-else>▼</span>
                {{ Math.abs(k.mom).toFixed(1) }}%
              </span>
            </template>
          </div>
        </div>
      </div>
      <div v-else class="kpi-hint">{{ hint }}</div>
    </template>
  </n-card>
</template>

<script setup>
import { computed } from 'vue'
import { NCard } from 'naive-ui'
import '@/composables/justLoading.css'
import CountUpNumber from '@/components/CountUpNumber.vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => ([
      { key: 'total_cnt', label: '总充电次数', value: 1250, mom: 8.2 },
      { key: 'avg_dur', label: '平均单次充电时长', value: 1.8, mom: -2.1, unit: 'h' },
      { key: 'total_dur', label: '总充电时长', value: 2350, mom: 5.4, unit: 'h' },
      { key: 'avg_per', label: '单台平均充电次数', value: 32.4, mom: 3.3 }
    ])
  },
  loading: { type: Boolean, default: false },
  hint: { type: String, default: '' }
})

const kpis = computed(() => props.data)
</script>

<style scoped>
.kpi-card { padding: 8px 12px; }
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi-item {
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 10px;
  padding: 10px 12px;
}
.kpi-label { font-size: 12px; color: #567; }
.kpi-value { font-size: 26px; font-weight: 800; color: #223; display: flex; align-items: baseline; gap: 6px; }
.kpi-unit { font-size: 12px; color: #678; }
.kpi-sub { margin-top: 4px; font-size: 12px; color: #789; }
.kpi-mom { margin-left: 4px; font-weight: 700; }
.kpi-mom.down { color: #16a34a; }
.kpi-mom.up { color: #ef4444; }
.kpi-mom.none { color: #94a3b8; }
.kpi-hint { text-align: center; color: #64748b; padding: 12px 0; }
@media (max-width: 1280px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
.loader-wrapper { min-height:120px; display:flex; align-items:center; justify-content:center; }
</style>
