<template>
  <div class="history-alarm-analysis-card">
    <div class="history-alarm-analysis-title">历史数据汇总</div>
    <div class="history-alarm-analysis-content" v-if="!loading && !error">
      <div class="analysis-row total-row" v-if="totalCount !== null">
        <span>异常报警总数：</span>
        <span class="analysis-value">{{ totalCount }}</span>
      </div>
      <div v-for="item in items" :key="item.kind" class="analysis-row">
        <span>{{ item.kdnm || "类型" + item.kind }}：</span>
        <span class="analysis-value">{{ item.tqty }}</span>
      </div>
      <div v-if="!items.length" class="empty">暂无数据</div>
    </div>
    <div v-else-if="loading" class="state loading">
      <span class="loader"></span>
    </div>
    <div v-else-if="error" class="state error">
      <div class="msg">加载失败</div>
      <button class="retry" @click="fetchData">重试</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { getReportS890701 } from "@/services/mrApi.js";
import "@/composables/justLoading.css";

// 可后续通过 props 传递筛选维度（ftid、wkid、yymm、kind）
const props = defineProps({
  ftid: { type: String, default: "" },
  wkid: { type: String, default: "" },
  yymm: { type: String, default: "" },
  kind: { type: String, default: "" },
});

const loading = ref(false);
const error = ref(null);
const list = ref([]);
let reqToken = 0;

async function fetchData() {
  const token = ++reqToken;
  loading.value = true;
  error.value = null;
  try {
    const data = await getReportS890701({
      ftid: props.ftid,
      wkid: props.wkid,
      yymm: props.yymm,
      kind: props.kind,
      opid: 4,
    });
    if (token !== reqToken) return;
    // 聚合相同 kind（保险：若后端已聚合则无需）
    const map = new Map();
    data.forEach((r) => {
      const k = r.kind;
      if (!map.has(k)) map.set(k, { kind: k, kdnm: r.kdnm, tqty: 0, mint: 0 });
      const obj = map.get(k);
      obj.tqty += Number(r.tqty || 0);
      obj.mint += Number(r.mint || 0);
    });
    list.value = Array.from(map.values()).sort((a, b) => b.tqty - a.tqty);
  } catch (e) {
    if (token !== reqToken) return;
    error.value = e || new Error("加载失败");
    list.value = [];
  } finally {
    if (token === reqToken) loading.value = false;
  }
}

const totalCount = computed(() => {
  if (!list.value.length) return 0;
  return list.value.reduce((sum, r) => sum + Number(r.tqty || 0), 0);
});
const items = computed(() => list.value);

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.history-alarm-analysis-card {
  background: #dfecfd;
  border-radius: 20px;
  border-top: rgb(177, 215, 251) 4px solid;
  border-bottom: rgb(197, 216, 231) 4px solid;
  border-left: rgb(177, 215, 251) 1px solid;
  border-right: rgb(197, 216, 231) 1px solid;
  box-shadow: 15px 15px 30px #d6e3ff, -15px -15px 30px #f7f8fd;
  padding: 24px 16px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.history-alarm-analysis-title {
  font-size: 18px;
  color: #4572d9;
  font-weight: bold;
  text-align: left;
  margin-bottom: 18px;
}
.history-alarm-analysis-content {
  width: 100%;
  max-height: 180px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.history-alarm-analysis-content::-webkit-scrollbar {
  display: none;
}
.analysis-row {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  margin-bottom: 10px;
  background: transparent;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background-color 0.25s, transform 0.25s, box-shadow 0.25s;
}
.analysis-row:hover {
  background: rgba(69, 114, 217, 0.08);
  box-shadow: 0 4px 12px -4px rgba(32, 74, 135, 0.22);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .analysis-row {
    transition: none;
  }
}
.analysis-value {
  font-weight: bold;
  color: #fa541c;
}
.total-row .analysis-value {
  color: #d4380d;
}
.state {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}
.state.error {
  flex-direction: column;
  gap: 8px;
  color: #ef4444;
}
.retry {
  background: #4572d9;
  border: none;
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.retry:hover {
  background: #3358a9;
}
.empty {
  text-align: center;
  width: 100%;
  padding: 12px 0;
  color: #64748b;
}
</style>
