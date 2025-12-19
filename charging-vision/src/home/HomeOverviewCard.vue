<template>
  <div class="overview-card">
    <div class="overview-title">一览表</div>
    <div class="overview-table">
      <div class="overview-header">
        <div class="overview-cell">工厂</div>
        <div class="overview-cell">AMR数量</div>
        <div class="overview-cell">充电数量</div>
        <div class="overview-cell">异常数量</div>
      </div>
      <div
        class="overview-row"
        v-for="factory in factories"
        :key="factory.name"
      >
        <div class="overview-cell">
          <button
            class="btn"
            style="width: 90%; height: 100%; padding: 0.5em 0; font-size: 15px"
          >
            {{ factory.name }}
          </button>
        </div>
        <div class="overview-cell">
          <button
            class="btn"
            style="width: 70%; height: 100%; padding: 0.5em 0; font-size: 15px"
          >
            <CountUpNumber :value="factory.amrCount" />
          </button>
        </div>
        <div class="overview-cell">
          <button
            class="btn"
            style="width: 70%; height: 100%; padding: 0.5em 0; font-size: 15px"
          >
            <CountUpNumber :value="factory.chargeCount" />
          </button>
        </div>
        <div class="overview-cell">
          <button
            class="btn"
            :style="`width: 70%; height: 100%; padding: 0.5em 0; font-size: 15px; color: ${
              factory.abnormalCount === 0 ? '#52c41a' : '#ff4d4f'
            };`"
          >
            <CountUpNumber :value="factory.abnormalCount" />
          </button>
        </div>
      </div>
      <div
        style="
          width: 100%;
          display: flex;
          justify-content: center;
          margin-top: 16px;
          flex-direction: column;
          align-items: center;
        "
      >
        <div class="Hovercard">Charge Insight, Power Guard</div>
        <button class="report-btn-inline" @click="goMonthlyReport">
          <div class="text-block">
            <span class="hover-underline-animation main-text"
              >月度分析报告</span
            >
            <span class="desc"
              >查看本月 KPI 趋势、TOP10 活跃度与充电异常概览</span
            >
          </div>
          <svg
            class="arrow"
            xmlns="http://www.w3.org/2000/svg"
            width="34"
            height="12"
            viewBox="0 0 46 16"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M8,0,6.545,1.455l5.506,5.506H-30V9.039H12.052L6.545,14.545,8,16l8-8Z"
              transform="translate(30)"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useOverviewStore } from "@/stores/overviewStore.js";
import CountUpNumber from "@/components/CountUpNumber.vue";

const overviewStore = useOverviewStore();
const { factories, loading, error } = storeToRefs(overviewStore);

onMounted(() => {
  overviewStore.fetchOverview();
});

// 跳转
const router = useRouter();
function goMonthlyReport() {
  router.push({ name: "MonthlyReport" });
}
</script>

<style scoped>
@import "../assets/3Dbutton.css";
@import "../assets/HomeOverview.css";
.overview-card {
  background: #dfecfd;
  border-radius: 20px;
  border-top: rgb(177, 215, 251) 4px solid;
  border-bottom: rgb(197, 216, 231) 4px solid;
  border-left: rgb(177, 215, 251) 1px solid;
  border-right: rgb(197, 216, 231) 1px solid;
  box-shadow: 15px 15px 30px #d6e3ff, -15px -15px 30px #f7f8fd;
  padding: 24px 16px 12px 16px;
  height: 100%;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.overview-title {
  font-size: 18px;
  color: #4572d9;
  font-weight: bold;
  text-align: center;
  margin-bottom: 18px;
}
.overview-table {
  width: 100%;
}

.overview-header,
.overview-row {
  display: flex;
  font-size: 16px;
  color: #738a9f;
  width: 100%;
}
.overview-header {
  font-weight: bold;
  background: #e9ecfc;
  border-radius: 6px;
  margin-bottom: 8px;
}
.overview-cell {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px 0;
  font-size: 18px;
}

/* 内联按钮样式（复用简化版动画） */
.report-btn-inline {
  margin-top: 18px;
  width: 100%;
  padding: 14px 26px 14px;
  border-radius: 16px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.55),
    rgba(255, 255, 255, 0.25)
  );
  border: 1px solid rgba(69, 114, 217, 0.55);
  color: #8a929e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55),
    0 4px 12px -4px rgba(69, 114, 217, 0.28);
  backdrop-filter: blur(8px) saturate(1.15);
  -webkit-backdrop-filter: blur(8px) saturate(1.15);
  transition: none;
  text-align: left;
}
.report-btn-inline .text-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.report-btn-inline .main-text {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 3px;
}
.report-btn-inline .desc {
  font-size: 13px;
  font-weight: 500;
  color: #5c6c80;
  letter-spacing: 1px;
}
.report-btn-inline .arrow {
  flex-shrink: 0;
  transform: translateX(-12px);
  transition: transform 0.38s cubic-bezier(0.23, 1.21, 0.36, 1);
}
.report-btn-inline:hover .arrow {
  transform: translateX(0);
}
.hover-underline-animation {
  position: relative;
  padding-bottom: 4px;
}
.hover-underline-animation::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  background: #2f4160;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform 0.38s ease;
}
.report-btn-inline:hover .hover-underline-animation::after {
  transform: scaleX(1);
  transform-origin: left center;
}
.report-btn-inline:focus-visible {
  outline: 2px solid #2f4160;
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .report-btn-inline .arrow {
    transition: none;
  }
  .hover-underline-animation::after {
    transition: none;
  }
}
</style>
