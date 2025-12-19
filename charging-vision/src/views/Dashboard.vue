<template>
  <div class="dashboard-root">
    <HeaderBar
      :selectedSection="selectedSection"
      :selectedAmr="selectedAmr"
      @toggle-sider="collapsed = !collapsed"
      @refresh="refreshPage"
      @search="onHeaderSearch"
    />
    <div style="flex: 1 1 0; display: flex; overflow: hidden; min-height: 0">
      <div
        :style="`width:${
          collapsed ? 18 : 170
        }px; transition:width .2s; overflow-y:auto; background:rgba(255,255,255,0.08); backdrop-filter:blur(2px);`"
      >
        <SidebarMenu @select="onMenuSelect" />
      </div>
  <div class="dash-main">
        <MainStats style="flex-shrink: 0; min-height: 120px" />
  <div class="row-split">
          <div
            style="
              flex: 2 1 0;
              display: flex;
              flex-direction: column;
              gap: 1.5vh;
              position: relative;
            "
          >
            <div
              style="
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
              "
            >
              <n-switch v-model:value="mergedCharts" size="medium">
                <template #checked>合并</template>
                <template #unchecked>拆分</template>
              </n-switch>
            </div>
            <div
              v-if="mergedCharts"
              style="
                flex: 1 1 0;
                min-height: 0;
                display: flex;
                flex-direction: column;
              "
            >
              <LineCharts
                title="充电历史曲线"
                :legend="['电压', '电流', '电量', '温度']"
                :xData="rawTimeAxis"
                yName="多指标"
                :series="[
                  ...voltageSeries,
                  ...currentSeries,
                  ...energySeries,
                  ...tempSeries,
                ]"
                :max-x-ticks="8"
                :color="['#4572D9', '#00BFAE', '#FFB800', '#FF5A5C']"
                style="height: 100%; width: 100%; flex: 1 1 0"
              />
            </div>
            <template v-else>
              <div class="row-split">
                <LineCharts
                  style="flex: 1 1 0"
                  title="电池电压"
                  :legend="['电压']"
                  :xData="rawTimeAxis"
                  yName="电压(V)"
                  :series="voltageSeries"
                  :max-x-ticks="8"
                />
                <LineCharts
                  style="flex: 1 1 0"
                  title="电池电流"
                  :legend="['电流']"
                  :xData="rawTimeAxis"
                  yName="电流(A)"
                  :series="currentSeries"
                  :max-x-ticks="8"
                />
              </div>
              <div class="row-split">
                <LineCharts
                  style="flex: 1 1 0"
                  title="电池电量"
                  :legend="['电量']"
                  :xData="rawTimeAxis"
                  yName="电量(%)"
                  :series="energySeries"
                  :max-x-ticks="8"
                />
                <LineCharts
                  style="flex: 1 1 0"
                  title="电池温度"
                  :legend="['温度']"
                  :xData="rawTimeAxis"
                  yName="温度(℃)"
                  :series="tempSeries"
                  :max-x-ticks="8"
                />
              </div>
            </template>
            <div
              v-if="historyLoading"
              style="
                position: absolute; inset:0; display:flex; justify-content:center; align-items:center; pointer-events:none;
              "
            >
              <span class="loader" style="color:#4572d9" aria-label="加载中" />
            </div>
            <div
              v-else-if="!hasSelection"
              style="
                position: absolute;
                inset: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                pointer-events: none;
                color: #8fa7be;
                font-size: 14px;
              "
            >
              请选择左侧 AMR 查看历史充电曲线
            </div>
            <div
              v-else-if="isEmptyAfterFetch"
              style="
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                gap: 8px;
                justify-content: center;
                align-items: center;
                pointer-events: none;
                color: #8fa7be;
                font-size: 14px;
              "
            >
              <span>Oops! 当前 AMR 暂无历史数据</span>
              <span style="font-size: 12px; color: #a0b4c5"
                >请尝试选择其他 AMR</span
              >
            </div>
          </div>
          <div
            style="
              flex: 1 1 0;
              display: flex;
              flex-direction: column;
              gap: 1.5vh;
              min-height: 0;
            "
          >
            <ScrollList
              style="flex: 1 1 0; max-height: 50%"
              title="历史报警记录"
              :items="warningStore.warningListStr"
              @item-click="onScrollItemClick"
            />
            <ScrollList
              style="flex: 1 1 0; max-height: 50%"
              title="历史数据分析"
              :items="chargeList"
              @item-click="onScrollItemClick"
            />
          </div>
        </div>
      </div>
      <!-- 历史报警记录抽屉 -->
      <n-drawer
        v-if="showAlarmDrawer"
        v-model:show="showAlarmDrawer"
        placement="right"
        :width="420"
        :trap-focus="false"
        :auto-focus="false"
        to="#app"
      >
        <n-drawer-content title="历史报警记录详情">
          <div
            style="
              max-height: 70vh;
              overflow-y: auto;
              white-space: pre-line;
              font-size: 16px;
              color: #4572d9;
            "
          >
            {{ alarmDrawerContent }}
          </div>
        </n-drawer-content>
      </n-drawer>
      <!-- 历史数据分析抽屉 -->
      <n-drawer
        v-if="showAnalysisDrawer"
        v-model:show="showAnalysisDrawer"
        placement="right"
        :width="460"
        :trap-focus="false"
        :auto-focus="false"
        to="#app"
      >
        <n-drawer-content title="历史数据分析详情">
          <div
            style="
              max-height: 70vh;
              overflow-y: auto;
              white-space: pre-line;
              font-size: 15px;
              color: #4572d9;
            "
          >
            {{ analysisDrawerContent }}
          </div>
        </n-drawer-content>
      </n-drawer>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, watch } from "vue";
import { storeToRefs } from "pinia";
import { useWarningStore } from "@/stores/warningStore.js";
import { useAmrHistoryStore } from "@/stores/amrHistoryStore.js";
import SidebarMenu from "@/components/SidebarMenu.vue";
import LineCharts from "@/components/LineCharts.vue";
import ScrollList from "@/components/ScrollList.vue";
import HeaderBar from "@/components/HeaderBar.vue";
import MainStats from "@/components/MainStats.vue";
import { NDrawer, NDrawerContent, NSwitch } from "naive-ui";
import "@/composables/justLoading.css";
// 合并/拆分图表开关
const mergedCharts = ref(false);

// 侧边/顶部状态
const collapsed = ref(false);
const selectedSection = ref("");
const selectedAmr = ref("");

// 历史曲线 store
const historyStore = useAmrHistoryStore();
const {
  rawTimeAxis,
  xAxis,
  voltageSeries,
  currentSeries,
  energySeries,
  tempSeries,
  loading: historyLoading,
  hasSelection,
  isEmptyAfterFetch,
} = storeToRefs(historyStore);

// 报警 store
const warningStore = useWarningStore();
warningStore.fetchWarningList();

// 抽屉：历史报警 & 历史数据分析 独立
const showAlarmDrawer = ref(false);
const showAnalysisDrawer = ref(false);
const alarmDrawerContent = ref("");
const analysisDrawerContent = ref("");
function onScrollItemClick({ title, content }) {
  if (title.includes("报警")) {
    alarmDrawerContent.value = content;
    showAlarmDrawer.value = true;
  } else {
    analysisDrawerContent.value = content;
    showAnalysisDrawer.value = true;
  }
}

// 抽屉互斥，防止同时存在导致 aria-hidden 警告焦点冲突
watch(showAlarmDrawer, (v) => {
  if (v) showAnalysisDrawer.value = false;
});
watch(showAnalysisDrawer, (v) => {
  if (v) showAlarmDrawer.value = false;
});

// 搜索
const searchValue = ref("");
const searchActive = ref(false);
const searchInputRef = ref(null);
function onSearch() {
  window.$message?.info?.(`搜索：${searchValue.value}`);
  searchActive.value = false;
}
function activateSearch() {
  searchActive.value = true;
  nextTick(() => searchInputRef.value?.focus?.());
}
function onHeaderSearch(val) {
  window.$message?.info?.(`搜索：${val}`);
}

// 刷新
function refreshPage() {
  window.location.reload();
}

// 侧边栏选择 AMR
function onMenuSelect({ factory, amrData }) {
  selectedSection.value = factory?.ftnm || "";
  selectedAmr.value = amrData
    ? `AMR${String(amrData.crid).padStart(3, "0")}`
    : "";
  if (factory?.ftid && amrData?.crid) {
    historyStore.fetchHistory(
      factory.ftid,
      String(amrData.crid).padStart(3, "0")
    );
  }
}

// 静态分析列表（先保留原假数据）
const chargeList = reactive([
  "1 基础信息: AMR-012 / 包装区A3",
  "2 充电周期统计: 总充电次数 / 日均充电次数 18次 / 1.8次/天（合理值：1-3次/天）",
  "3 充电时长分析: 平均充电时长 / 最长单次充电时长 125分钟 / 138分钟（正常：90-150分钟）",
  "4 充电效率: 充电能量输入 vs 放电能量输出 效率比92%（输入8.4kWh，输出7.73kWh）",
  "5 电压特性: 起始电压 / 峰值电压 / 截止电压 45.6V / 50.4V / 50.2V（正常：45-51V）",
  "6 温度监控: 充电中最高温度 / 环境温度温差 38.5℃ / Δ+7.2℃（安全：<45℃）",
  "7 SOC变化轨迹: 充电起始SOC / 结束SOC / SOC上升速率 22% → 95% / 0.58%/min（正常速率）",
  "8 健康状态(SOH): SOH=96%（当前104Ah vs 初始108Ah）",
  "9 深度放电记录: SOC＜20%的充电次数占比 3次（占比16.7%，<25%正常）",
  "10 异常中断分析: 充电意外终止次数 / 错误代码 0次 / 无",
  "11 循环寿命预测: 已完成循环次数 vs 设计循环寿命 420次 / 设计1500次（寿命剩余71%）",
  "12 充电桩关联分析: 不同充电桩效率对比 桩A：91.5% 桩B：92.3%（差异<1%正常）",
]);
</script>

<style scoped>
.dashboard-root {
  height:100vh;
  display:flex;
  flex-direction:column;
  background:transparent;
}
.dash-main {
  flex:1 1 0;
  display:flex;
  flex-direction:column;
  gap:12px; /* 替换 1.5vh 避免垂直波动 */
  padding:12px 16px 0 16px; /* 替换 1vw 为固定内边距防止横向溢出 */
  min-height:0;
  background:rgba(255,255,255,0.05);
  backdrop-filter:blur(2px);
  box-sizing:border-box;
}
.row-split {
  flex:1 1 0;
  display:flex;
  gap:16px; /* 替换 1.5vw */
  min-height:0;
}
@media (max-width:1400px) {
  .row-split { gap:12px; }
  .dash-main { padding:12px 12px 0 12px; }
}
</style>
