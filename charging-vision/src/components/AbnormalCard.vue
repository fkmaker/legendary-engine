<!-- src/components/AbnormalCard.vue -->
<template>
  <div class="stats-card-container static-card">
    <!-- 移除 3D 倾斜事件 -->
    <div class="card abnormal-card">
      <div class="fullscreen-container">
        <div class="radio-group-container single">
          <button class="report-btn cta" @click="goMonthlyReport">
            <span class="hover-underline-animation">月度分析报告</span>
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
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

// 跳转到月度分析报告
const router = useRouter();
function goMonthlyReport() {
  router.push({ name: "MonthlyReport" });
}
</script>

<style scoped>
@import "@/assets/3Dcard.css";

.fullscreen-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100%;
  padding: 20px 0;
  box-sizing: border-box;
  z-index: 10;
}

.radio-group-container {
  padding: 15px 25px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  width: 90%;
  max-width: 280px;
}
.radio-group-container.single {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 20px;
}

/* 按钮基础样式 + 方向箭头动画 */
/* 精简按钮：仅保留箭头滑入与下划线动画，去除其余光效/缩放/滤镜 */
.report-btn {
  width: 100%;
  padding: 12px 22px 10px 22px;
  border-radius: 14px;
  background: rgba(9, 96, 235, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px) saturate(1.1);
  -webkit-backdrop-filter: blur(8px) saturate(1.1);
  cursor: pointer;
  transition: none;
}
.report-btn .arrow {
  transform: translateX(-10px);
  transition: transform 0.35s cubic-bezier(0.23, 1.21, 0.36, 1);
}
.report-btn:hover .arrow {
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
  background: #fff;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform 0.35s ease;
}
.report-btn:hover .hover-underline-animation::after {
  transform: scaleX(1);
  transform-origin: left center;
}

.report-btn:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 3px;
}

@media (max-width: 400px) {
  .report-btn {
    font-size: 14px;
    padding: 10px 18px;
  }
}
</style>
