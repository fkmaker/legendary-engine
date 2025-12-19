<template>
  <div class="mrp-header">
    <div class="left-group">
      <img :src="logoUrl" alt="logo" class="mrp-logo" />
      <div class="mrp-title-wrap">
        <div class="mrp-title">奇瑞智能AMR充电安全管理系统</div>
        <div class="mrp-subtitle">Charge Insight, Power Guard</div>
      </div>
    </div>
    <div class="right-group">
      <div class="styled-wrapper nav-btn" @click="goBack" title="返回上一页">
        <button class="back-anim-btn" type="button">
          <div class="button-box">
            <span class="button-elem">
              <svg viewBox="0 0 24 24">
                <path
                  d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                />
              </svg>
            </span>
            <span class="button-elem">
              <svg viewBox="0 0 24 24">
                <path
                  d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                />
              </svg>
            </span>
          </div>
        </button>
      </div>
      <FullscreenButton />
    </div>
  </div>
</template>

<script setup>
import logoUrl from "@/assets/logo.png";
import { useRouter } from "vue-router";
import { NButton, NIcon } from "naive-ui";
import FullscreenButton from "@/components/FullscreenButton.vue";

const router = useRouter();
function goBack() {
  if (window.history.length > 1) router.back();
  else router.push("/");
}
</script>

<style scoped>
.mrp-header {
  --logo-h: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--logo-h);
}
.left-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.right-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mrp-logo {
  height: var(--logo-h);
  width: auto;
  user-select: none;
}
.mrp-title-wrap {
  height: var(--logo-h);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.mrp-title {
  font-size: 20px;
  font-weight: 800;
  color: #244;
  letter-spacing: 1px;
}
.mrp-subtitle {
  font-size: 12px;
  color: #678;
  letter-spacing: 0.6px;
}
.nav-btn {
  color: #334155;
  cursor: pointer;
}
/* Back button animated style (scaled down) */
.styled-wrapper {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-anim-btn {
  position: relative;
  width: 36px;
  height: 36px;
  overflow: hidden;
  outline: none;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.back-anim-btn:before,
.back-anim-btn:after {
  content: "";
  position: absolute;
  border-radius: 50%;
  inset: 5px;
  transition: opacity 0.38s cubic-bezier(0.77, 0, 0.175, 1) 60ms,
    transform 0.45s cubic-bezier(0.455, 0.03, 0.515, 0.955) 60ms;
}
.back-anim-btn:before {
  border: 2px solid #4572d9;
}
.back-anim-btn:after {
  border: 2px solid rgba(69, 114, 217, 0.55);
  transform: scale(1.28);
  opacity: 0;
  transition: opacity 0.38s cubic-bezier(0.165, 0.84, 0.44, 1),
    transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.back-anim-btn:hover:before,
.back-anim-btn:focus:before {
  opacity: 0;
  transform: scale(0.7);
}
.back-anim-btn:hover:after,
.back-anim-btn:focus:after {
  opacity: 1;
  transform: scale(1);
}
.button-box {
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
}
.button-elem {
  display: block;
  width: 18px;
  height: 18px;
  margin: 10px 8px 0 10px;
  fill: #4572d9;
}
.back-anim-btn:hover .button-box,
.back-anim-btn:focus .button-box {
  transition: 0.38s;
  transform: translateX(-34px);
}
</style>
