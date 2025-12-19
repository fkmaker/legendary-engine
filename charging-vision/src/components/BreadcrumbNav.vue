<template>
  <n-breadcrumb separator="/" class="breadcrumb-nav">
    <n-breadcrumb-item v-for="(c, idx) in crumbs" :key="idx">
      <span v-if="!c.to" class="crumb-label current">{{ c.label }}</span>
      <a v-else class="crumb-link" @click.prevent="navigate(c.to)">{{
        c.label
      }}</a>
    </n-breadcrumb-item>
  </n-breadcrumb>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { NBreadcrumb, NBreadcrumbItem } from "naive-ui";

const props = defineProps({
  factoryName: { type: String, default: "" },
  amrCode: { type: String, default: "" },
});

const route = useRoute();
const router = useRouter();

const baseCrumbs = computed(() => {
  // 基础：Home 与 Dashboard，两者都可快速跳转
  return [
    { label: "首页", to: { name: "Home" } },
    { label: "仪表盘", to: { name: "Dashboard" } },
  ];
});

const dynamicCrumbs = computed(() => {
  const arr = [];
  if (props.factoryName) arr.push({ label: props.factoryName });
  if (props.amrCode) arr.push({ label: props.amrCode });
  return arr;
});

const crumbs = computed(() => {
  // 当前路由高亮其自身（去掉跳转）
  return baseCrumbs.value
    .map((c) => {
      if (c.to?.name === route.name) return { label: c.label }; // 当前页静态显示
      return c;
    })
    .concat(dynamicCrumbs.value);
});

function navigate(to) {
  if (!to) return;
  router.push(to);
}
</script>

<style scoped>
.breadcrumb-nav {
  margin-left: 16px;
  font-size: 1.05rem;
}
.crumb-link {
  cursor: pointer;
  color: #4572d9;
  text-decoration: none;
  transition: color 0.15s;
}
.crumb-link:hover {
  color: #1d51c3;
}
.current {
  color: #6b7f92;
  font-weight: 600;
}
</style>
