<template>
  <n-drawer v-model:show="show" :width="520" placement="right">
    <n-drawer-content :title="deviceTitle">
      <n-timeline>
        <n-timeline-item v-for="(e, idx) in events" :key="idx" :title="e.title" :time="e.time" :type="e.type" />
      </n-timeline>
      <template #footer>
        <n-button @click="show=false">关闭</n-button>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { NDrawer, NDrawerContent, NButton, NTimeline, NTimelineItem } from 'naive-ui'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  device: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])

const show = ref(false)
watch(() => props.modelValue, v => show.value = v, { immediate: true })
watch(show, v => emit('update:modelValue', v))

const events = ref([
  { title: '温度异常(高)', time: '2025-08-12 14:22', type: 'error' },
  { title: '电压波动', time: '2025-08-12 13:58', type: 'warning' },
  { title: '电流不稳定', time: '2025-08-11 09:40', type: 'warning' },
  { title: '夜间频繁充电', time: '2025-08-10 23:10', type: 'info' }
])

const deviceTitle = computed(() => props.device ? `设备 ${props.device.device_name} 的报警时间线` : '报警时间线')
</script>
