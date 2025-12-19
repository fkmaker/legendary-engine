<template>
  <div style="display: flex; align-items: center; position: relative">
    <transition name="fade">
      <n-input
        v-if="searchActive"
        v-model:value="searchValue"
        placeholder="搜索..."
        clearable
        style="width: 240px; font-size: 1.1rem; transition: width 0.2s"
        @keydown.enter="onSearch"
        @blur="searchActive = false"
        ref="searchInputRef"
        autofocus
      >
        <template #suffix>
          <n-icon @mousedown.prevent.stop="onSearch">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
              />
              <line
                x1="18"
                y1="18"
                x2="15.5"
                y2="15.5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </n-icon>
        </template>
      </n-input>
    </transition>
    <n-button
      v-if="!searchActive"
      quaternary
      circle
      size="large"
      style="font-size: 1.5rem; color: #4572d9"
      @click="activateSearch"
    >
      <template #icon>
        <n-icon>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
            />
            <line
              x1="18"
              y1="18"
              x2="15.5"
              y2="15.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </n-icon>
      </template>
    </n-button>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";
import { NInput, NButton, NIcon } from "naive-ui";

const emit = defineEmits(["search"]);
const searchValue = ref("");
const searchActive = ref(false);
const searchInputRef = ref(null);

function onSearch() {
  emit("search", searchValue.value);
  searchActive.value = false;
} // 处理搜索逻辑

function activateSearch() {
  searchActive.value = true;
  nextTick(() => {
    if (searchInputRef.value?.focus) searchInputRef.value.focus();
  });
} // 激活搜索输入框
</script>
