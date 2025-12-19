<template>
  <n-card size="small" title="管理建议" :bordered="false">
    <div class="advice">
      <div class="advice-line" v-for="(a, idx) in advices" :key="idx">
        <span class="tag" :class="a.level">{{ a.levelLabel }}</span>
        <span class="text">{{ a.text }}</span>
      </div>
    </div>
    <template #action>
      <n-space>
        <n-button type="primary" size="small" @click="onCreateOrder"
          >生成工单</n-button
        >
        <n-button tertiary size="small" @click="$emit('refresh')"
          >刷新建议</n-button
        >
      </n-space>
    </template>
  </n-card>
</template>

<script setup>
import { computed } from "vue";
import { NCard, NButton, NSpace } from "naive-ui";

const props = defineProps({
  // 评分与上下文，用于输出建议
  riskScore: { type: Number, default: 63 },
  selected: { type: Object, default: () => ({}) },
  selectedType: { type: String, default: "" },
});

const advices = computed(() => {
  const list = [];
  const s = props.riskScore;
  if (s >= 70) {
    list.push({
      level: "red",
      levelLabel: "红色",
      text: "立即排查高风险设备：检查充电桩/线缆、复核报警阈值、安排值班复检。",
    });
  } else if (s >= 40) {
    list.push({
      level: "yellow",
      levelLabel: "黄色",
      text: "检查充电线缆、查看最近 3 次报错、重点关注高频时段。",
    });
  } else {
    list.push({
      level: "green",
      levelLabel: "绿色",
      text: "整体风险较低：保持日常巡检，关注偶发异常。",
    });
  }
  if (props.selectedType) {
    list.push({
      level: "tip",
      levelLabel: "类型",
      text: `建议优先处理「${props.selectedType}」相关告警，优化相关策略与限值。`,
    });
  }
  return list;
});

function onCreateOrder() {
  // 本地演示：不调用接口，仅提示
  window.$message?.success?.("已生成工单（演示）");
}
</script>

<style scoped>
.advice {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.advice-line {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 18px;
  padding: 0 6px;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
}
.tag.red {
  background: #ef4444;
}
.tag.yellow {
  background: #d97706;
}
.tag.green {
  background: #16a34a;
}
.tag.tip {
  background: #3b82f6;
}
</style>
