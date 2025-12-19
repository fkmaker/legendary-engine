<template>
  <div>
    <HeaderBar />
    <div class="home-content">
      <div class="card-columns">
        <!-- 第一列 -->
        <div class="card-col">
          <HomeOverviewCard />
        </div>
        <!-- 第二列，三行卡片 -->
        <div class="card-col mid-col">
          <HomeChargeInfoCard :charge-list="chargingAmrStore.cardList" />
          <HomeHistoryAlarmCard :alarm-list="warningStore.warningListStr" />
          <HomeHistoryAlarmAnalysisCard />
        </div>
        <!-- 第三列 地图卡片 -->
        <div class="card-col">
          <MapChart class="map-chart" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useWarningStore } from "@/stores/warningStore.js";
import { useChargingAmrStore } from "@/stores/chargingAmrStore.js";
import HeaderBar from "../components/HeaderBar.vue";
import HomeOverviewCard from "../home/HomeOverviewCard.vue";
import HomeChargeInfoCard from "../home/HomeChargeInfoCard.vue";
import HomeHistoryAlarmCard from "../home/HomeHistoryAlarmCard.vue";
import HomeHistoryAlarmAnalysisCard from "../home/HomeHistoryAlarmAnalysisCard.vue";
import MapChart from "../home/MapChart.vue";

const warningStore = useWarningStore();
const chargingAmrStore = useChargingAmrStore();
onMounted(() => {
  warningStore.fetchWarningList();
  chargingAmrStore.fetchChargingList();
});
</script>

<style scoped>
html,
body,
#app,
.home-content {
  height: 100%;
  margin: 0;
  padding: 0;
}
.home-content {
  height: calc(100vh - 80px); /* 64px 预留HeaderBar高度，可根据实际调整 */
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: rgba(255, 255, 255, 0.08); /* 轻薄透明让背景图透出 */
  backdrop-filter: blur(2px);
  padding: 16px 0;
}
.card-columns {
  display: flex;
  /* 原来使用 calc(100vw - 48px) 在出现垂直滚动条时会比可视区域再宽一个滚动条宽度，
     某些浏览器窗口下可能在最右出现 1~2px 背景/黑边。
     改为 100% 让其随父容器宽度自适应，避免视口单位包含滚动条造成的溢出或缝隙。 */
  width: 100%;
  height: 100%;
  gap: 24px; /* 列间距 */
  padding: 0 24px; /* 两侧内边距 */
  box-sizing: border-box;
}
.card-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: calc(33.3333% - 16px);
  min-width: 0;
  height: 100%;
  /* justify-content: center; */
}

/* 第二列悬浮交互效果 */
.mid-col > * {
  transition: transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1),
    box-shadow 0.35s, filter 0.35s;
  will-change: transform;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}
.mid-col > *:hover {
  transform: translateY(-6px) scale(1.015);
  box-shadow: 0 12px 28px -6px rgba(32, 74, 135, 0.18),
    0 4px 12px rgba(0, 0, 0, 0.08);
  filter: brightness(1.03);
}
@media (prefers-reduced-motion: reduce) {
  .mid-col > * {
    transition: none;
  }
}
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 32px 24px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #3a4a5a;
  flex: 1 1 0;
}
/* 地图卡片样式 */
.map-chart {
  flex: 1; /* 占据全部可用空间 */
  min-height: 0; /* 允许内容溢出 */
  border-radius: 12px;
  overflow: hidden; /* 确保圆角效果 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); /* 添加阴影保持与其他卡片一致 */
}

/* 移除底部按钮相关样式 */
</style>
