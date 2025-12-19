<template>
  <span>{{ formatted }}</span>
</template>

<script setup>
import { ref, watch, computed, onMounted } from "vue";

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 800 }, // ms
  easing: { type: String, default: "outCubic" },
  decimals: { type: Number, default: 0 },
  format: { type: Function, default: null },
}); // 属性

const displayValue = ref(0);
let startValue = 0;
let startTime = 0;
let rafId = null;
const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;  // 是否减少动画

const easings = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

function animate(ts) {
  if (!startTime) startTime = ts;
  const progress = Math.min(1, (ts - startTime) / props.duration);
  const easeFn = easings[props.easing] || easings.outCubic; // 缓动函数
  const eased = easeFn(progress);
  displayValue.value = startValue + (props.value - startValue) * eased; // 插值计算
  if (progress < 1) {
    rafId = requestAnimationFrame(animate);
  } else {
    displayValue.value = props.value; // 精准收尾
    rafId = null;
  }
}

function start() {
  if (rafId) cancelAnimationFrame(rafId); // 取消之前的动画帧
  startValue = displayValue.value;
  startTime = 0;
  if (reduceMotion || props.duration <= 0) {
    displayValue.value = props.value;
    return;
  }
  rafId = requestAnimationFrame(animate); // 开始动画
}

watch(
  () => props.value,
  (nv, ov) => {
    if (nv === ov) return;
    start();
  }
);

onMounted(() => {
  displayValue.value = 0;
  start();
});

const formatted = computed(() => {
  const val = Number(displayValue.value.toFixed(props.decimals)); // 保留小数位数
  return props.format ? props.format(val) : val.toLocaleString();
});
</script>

<style scoped>
span {
  display: inline-block;
  transition: color 0.3s;
}
</style>
