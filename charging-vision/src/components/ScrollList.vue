<template>
  <n-card
    style="
      height: 100%;
      border-radius: 30px;
      border-top: rgb(177, 215, 251) 4px solid;
      border-bottom: rgb(197, 216, 231) 4px solid;
      border-left: rgb(177, 215, 251) 1px solid;
      border-right: rgb(197, 216, 231) 1px solid;
      background: #f6f7fc;
      box-shadow: 15px 15px 30px #d6e3ff, -15px -15px 30px #f7f8fd;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    "
  >
    <h3
      style="
        margin: 0;
        padding: 12px;
        font-size: 1.1rem;
        color: #4572d9;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      "
    >
      {{ title }}
    </h3>
    <div
      class="scroll-wrapper"
      ref="scrollWrapper"
      style="
        height: 100%;
        flex: 1;
        font-size: 12px;
        color: #809ab2;
        position: relative;
      "
      @wheel.prevent="onWheel"
    >
      <div
        class="scroll-container"
        ref="scrollContainer"
        :style="{ transform: `translateY(-${scrollY}px)` }"
        @mouseenter="pauseScrolling = true"
        @mouseleave="pauseScrolling = false"
      >
        <div
          v-for="(item, idx) in renderList"
          :key="'a' + idx"
          class="scroll-item"
          @click="handleItemClick(item)"
          style="cursor: pointer"
        >
          {{ item }}
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import { NCard } from "naive-ui";
const emit = defineEmits(["item-click"]);

// 定义 props
const props = defineProps({
  title: String,
  items: Array,
});

const scrollWrapper = ref(null);
const scrollContainer = ref(null);
const scrollY = ref(0);
const pauseScrolling = ref(false);
const itemHeight = ref(36);
const scrollTimer = ref(null);
const wheelPauseTimer = ref(null);

// 渲染两份内容用于无缝滚动
const renderList = computed(() => {
  if (!props.items || props.items.length === 0) return [];
  // 内容不足一屏时只渲染一份
  if (
    props.items.length * itemHeight.value <=
    (scrollWrapper.value?.offsetHeight || 0)
  ) {
    return props.items;
  }
  // 否则渲染两份
  return [...props.items, ...props.items];
});

// 处理项点击
function handleItemClick(item) {
  emit("item-click", { title: props.title, content: item });
}

// 更新每个项的高度
const updateItemHeight = () => {
  nextTick(() => {
    const el = scrollWrapper.value?.querySelector(".scroll-item");
    if (el) itemHeight.value = el.offsetHeight;
  });
};

// 开始滚动
const startScroll = () => {
  if (scrollTimer.value) clearInterval(scrollTimer.value);
  if (!props.items || props.items.length === 0) return;
  updateItemHeight();
  scrollY.value = 0;
  scrollTimer.value = setInterval(() => {
    if (pauseScrolling.value) return;
    const totalHeight = props.items.length * itemHeight.value;
    // 内容不足一屏不滚动
    if (totalHeight <= (scrollWrapper.value?.offsetHeight || 0)) return;
    scrollY.value += 1;
    if (scrollY.value >= totalHeight) {
      scrollY.value = 0;
    }
  }, 50); // 速度可调（单位：毫秒）
};

// 鼠标滚轮手动滚动
function onWheel(e) {
  if (!props.items || props.items.length === 0) return;
  const totalHeight = props.items.length * itemHeight.value;
  const wrapperH = scrollWrapper.value?.offsetHeight || 0;
  if (totalHeight <= wrapperH) return; // 不足一屏无需滚动
  pauseScrolling.value = true;
  // 调整滚动速度：deltaY 直接使用，限制单次最大偏移避免过快
  const delta = Math.max(-60, Math.min(60, e.deltaY));
  scrollY.value += delta;
  if (scrollY.value < 0) scrollY.value += totalHeight; // 向上滚到顶后循环
  if (scrollY.value >= totalHeight) scrollY.value -= totalHeight; // 向下循环
  if (wheelPauseTimer.value) clearTimeout(wheelPauseTimer.value);
  wheelPauseTimer.value = setTimeout(() => {
    pauseScrolling.value = false;
  }, 2500); // 1.5s 无操作后恢复自动滚动
}

// 组件挂载时初始化
onMounted(() => {
  nextTick(() => {
    updateItemHeight();
    startScroll();
  });
  window.addEventListener("resize", startScroll);
});

// 组件卸载时清理定时器和事件监听
onUnmounted(() => {
  if (scrollTimer.value) clearInterval(scrollTimer.value);
  window.removeEventListener("resize", startScroll);
});

// 监听 props.items 的变化
watch(
  () => props.items,
  () => {
    nextTick(() => {
      updateItemHeight();
      startScroll();
    });
  },
  { deep: true }
);
</script>

<style scoped>
.scroll-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.scroll-container {
  position: absolute;
  width: 100%;
  left: 0;
  top: 0;
  will-change: transform;
}

.scroll-item {
  padding: 8px 12px;
  line-height: 1.5;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
  height: 36px;
  display: flex;
  align-items: center;
  background: transparent;
}
.scroll-item { transition: background-color .25s, transform .25s, box-shadow .25s; }
.scroll-item:hover {
  background: rgba(69,114,217,0.10);
  box-shadow: 0 4px 10px -4px rgba(32,74,135,.25);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .scroll-item { transition: none; }
}
</style>
