<template>
  <n-card size="small" :bordered="false">
    <div class="kpi-vert">
      <!-- 报警总数 -->
      <div class="kpi-item">
        <div class="kpi-row">
          <div class="kpi-icon warn" aria-hidden="true">
            <!-- 简单告警三角形图标 -->
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M1 20h22L12 2 1 20zm12-3v2h-2v-2h2zm0-8v6h-2V9h2z"/>
            </svg>
          </div>
          <div class="kpi-main">
            <div class="kpi-label">报警总数</div>
            <div class="kpi-value-row">
              <div class="kpi-value">
                <CountUpNumber :value="totals.total" :duration="800" />
              </div>
              <div class="kpi-delta" :class="totalDelta >= 0 ? 'up' : 'down'">
                <span v-if="totalDelta >= 0">▲</span>
                <span v-else>▼</span>
                {{ Math.abs(totalDelta).toFixed(1) }}%
              </div>
            </div>
            <div class="kpi-sub">
              报警总数：
              <template v-if="totalDelta >= 0">较上月 ↑{{ Math.abs(totalDelta).toFixed(1) }}%</template>
              <template v-else>环比下降 {{ Math.abs(totalDelta).toFixed(1) }}%</template>
            </div>
          </div>
        </div>
      </div>

      <!-- 报警分钟数 -->
      <div class="kpi-item">
        <div class="kpi-row">
          <div class="kpi-icon device" aria-hidden="true">
            <!-- 简单设备(方块+天线)图标 -->
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M3 7h18v10H3V7zm2 2v6h14V9H5zm6 8h2v2h-2v-2zM7 4h10v2H7V4z"/>
            </svg>
          </div>
          <div class="kpi-main">
            <div class="kpi-label">报警分钟数</div>
            <div class="kpi-value">
              <CountUpNumber :value="alarmMinutes" :duration="800" />
            </div>
            <div class="kpi-sub">
              本月累计报警时长（分钟）
            </div>
          </div>
        </div>
      </div>

      <!-- 报警小车数 -->
      <div class="kpi-item">
        <div class="kpi-row">
          <div class="kpi-icon car" aria-hidden="true">
            <!-- 车辆 / AMR 图标 -->
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a1 1 0 0 1 1 1v4.5a1.5 1.5 0 0 1-1.5 1.5H18a2 2 0 1 1-4 0H10a2 2 0 1 1-4 0H4.5A1.5 1.5 0 0 1 3 16.5V12a1 1 0 0 1 1-1h1zm2.2-4l-1.2 4h11l-1.2-4a.5.5 0 0 0-.48-.35H7.68a.5.5 0 0 0-.48.35zM7 16.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zm10 0a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1z" />
            </svg>
          </div>
          <div class="kpi-main">
            <div class="kpi-label">报警小车数</div>
            <div class="kpi-score">
              <span class="score">
                <CountUpNumber :value="alarmCarCount" :duration="800" />
              </span>
              <span class="delta" :class="alarmCarDelta >= 0 ? 'up' : 'down'">
                <span v-if="alarmCarDelta >= 0">▲</span>
                <span v-else>▼</span>
                {{ Math.abs(alarmCarDelta).toFixed(1) }}%
              </span>
            </div>
            <div class="kpi-sub">发生过报警的 AMR 数</div>
          </div>
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup>
import { computed } from 'vue'
import { NCard } from 'naive-ui'
import CountUpNumber from '@/components/CountUpNumber.vue'

const props = defineProps({
  totals: {
    type: Object,
    default: () => ({
      total: 382,
      totalDelta: 12.0,
      alarmMinutes: 1234,
      alarmCarCount: 46,
      alarmCarDelta: 4.2
    })
  }
})

const totalDelta = computed(() => Number(props.totals.totalDelta ?? 0))

// 兼容：如果上游尚未调整字段，做回退映射
const alarmMinutes = computed(() => Number(props.totals.alarmMinutes ?? props.totals.deviceCount ?? 0))
const alarmCarCount = computed(() => Number(props.totals.alarmCarCount ?? props.totals.riskScore ?? 0))
const alarmCarDelta = computed(() => Number(props.totals.alarmCarDelta ?? props.totals.riskDelta ?? 0))
</script>

<style scoped>
.kpi-vert { display: flex; flex-direction: column; gap: 10px; }
.kpi-item { background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.06); border-radius: 10px; padding: 10px 12px; }
.kpi-row { display: flex; align-items: center; gap: 12px; }
.kpi-label { font-size: 12px; color: #567; }
.kpi-main { flex: 1; min-width: 0; }
.kpi-value { font-size: 24px; font-weight: 800; color: #223; }
.kpi-value-row { display: flex; align-items: baseline; gap: 8px; }
.kpi-delta { margin-left: auto; font-size: 12px; font-weight: 700; }
.kpi-delta.down { color: #16a34a; }
.kpi-delta.up { color: #ef4444; }
.kpi-sub { margin-top: 2px; font-size: 12px; color: #6b7280; }

.kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; }
.kpi-icon.warn { background: linear-gradient(135deg, #f59e0b, #ef4444); }
.kpi-icon.device { background: linear-gradient(135deg, #0ea5e9, #6366f1); }

.kpi-icon.car { background: linear-gradient(135deg, #6366f1, #8b5cf6); }

.kpi-score { display: flex; align-items: baseline; gap: 6px; font-weight: 800; }
.kpi-score .score { font-size: 26px; }
.kpi-score .unit { font-size: 12px; color: #678; }
.kpi-score .delta { margin-left: auto; font-size: 12px; font-weight: 700; }
.kpi-score .delta.down { color: #16a34a; }
.kpi-score .delta.up { color: #ef4444; }
.kpi-score.up { color: #ef4444; }
.kpi-score.down { color: #16a34a; }
</style>
