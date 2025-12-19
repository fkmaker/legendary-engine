<template>
  <n-layout-header
    style="
      background: linear-gradient(180deg,rgba(195, 225, 253, 1) 0%, rgba(223, 236, 254, 1) 50%);
      padding: 0;
      position: relative;
      box-shadow: 0 2px 8px #DEDCDC;
    "
  >
    <div
      style="
        display: flex;
        align-items: center;
        width: 100%;
        position: relative;
      "
    >
      <img
        src="/src/assets/logo.png"
        alt="公司Logo"
        @click="goHomeAndReload"
        style="
          height: 8vh;
          margin-bottom: auto;
          margin-left: 20px;
          margin-right: 32px;
          filter: drop-shadow(0 2px 12px #1cb5e0cc);
          object-fit: contain;
          align-self: center;
          display: flex;
          align-items: center;
          cursor: pointer;
        "
      />
      <n-button
        quaternary
        circle
        size="large"
        @click="$emit('toggle-sider')"
        style="margin-right: 0px; align-self: center; font-size: 1.5rem; color: #91a4b5"
      >
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </n-icon>
        </template>
      </n-button>
  <BreadcrumbNav :factory-name="selectedSection" :amr-code="selectedAmr" />
      <div
        style="
          position: absolute;
          left: 50%;
          top: 0;
          height: 100%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          pointer-events: none;
          z-index: 1;
        "
      >
        <span
          class="main-title"
          style="
            font-size: 2.1rem;
            font-weight: bold;
            letter-spacing: 2px;
            color: #4572D9;
            text-shadow: 0 0px 0px #0854c8, 0 0 2px #fff;
            user-select: none;
          "
          >奇瑞智能AMR充电安全管理系统</span
        >
      </div>
      <div
        style="
          margin-left: auto;
          margin-right: 32px;
          display: flex;
          align-items: center;
          position: relative;
          color: #4572D9;
        "
      >
        <HeaderSearch @search="$emit('search', $event)" />
        <FullscreenButton />
      </div>
    </div>
  </n-layout-header>
</template>

<script setup>
import { NLayoutHeader, NButton, NIcon } from 'naive-ui';
import HeaderSearch from "@/components/HeaderSearch.vue";
import FullscreenButton from "@/components/FullscreenButton.vue";
import BreadcrumbNav from '@/components/BreadcrumbNav.vue';
import { useRouter } from 'vue-router'
import { useSoftHomeReset } from '@/composables/useSoftHomeReset.js'

defineProps({
  selectedSection: String,
  selectedAmr: String,
}); // 定义props以接收选中的部分和AMR

// 旧下拉切换已移除，统一使用面包屑跳转
const router = useRouter()
const { softReset } = useSoftHomeReset()
async function goHomeAndReload() {
  const toHome = router.currentRoute.value.name !== 'Home'
  if (toHome) await router.push({ name: 'Home' })
  await softReset()
  // Home 内部需要的列表自行重新拉取，可在 Home onMounted 已实现；这里可额外触发：
  // 如需强制重新获取：
  // try { useWarningStore().fetchWarningList() } catch {}
  // try { useChargingAmrStore().fetchChargingList() } catch {}
}
</script>
