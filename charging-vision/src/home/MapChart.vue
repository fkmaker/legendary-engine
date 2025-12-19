<template>
  <n-card
    style="
      height: 100%;
      background: #e9f6fe;
      border-top: rgb(177, 215, 251) 1px solid;
      border-bottom: rgb(197, 216, 231) 1px solid;
      border-left: rgb(177, 215, 251) 1px solid;
      border-right: rgb(197, 216, 231) 1px solid;
      border-radius: 10px 10px 10px 10px;
      position: relative;
      overflow: hidden;
    "
  >
    <div class="map-toolbar">
      <n-button
        quaternary
        circle
        size="small"
        @click="resetMap"
        title="复原视图"
      >
        <template #icon>
          <n-icon>
            <svg
              viewBox="0 0 1024 1024"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path
                d="M512 128a384 384 0 0 1 271.04 655.04A32 32 0 1 1 740.8 740.8 320 320 0 1 0 192 512h96a32 32 0 0 1 0 64H160a32 32 0 0 1-32-32V352a32 32 0 0 1 64 0v73.92A384 384 0 0 1 512 128z"
              />
            </svg>
          </n-icon>
        </template>
      </n-button>
    </div>
    <div ref="chartRef" style="height: 100%"></div>
  </n-card>
</template>
<script setup>
import * as echarts from "echarts";
import { ref, onMounted, onUnmounted, watch } from "vue";
import { NCard, NButton, NIcon } from "naive-ui";
import wuhuJson from "@/assets/wuhu.json";
import { useOverviewStore } from "@/stores/overviewStore.js";
import { storeToRefs } from "pinia";

const chartRef = ref(null);
let chartInstance = null;
const defaultCenter = [118.374087, 31.430816];
const defaultZoom = 1.2;

// 静态工厂经纬度（根据用户原先已绘制的坐标；名称需与 overviewStore factories.name 对应）
const factoryCoordinates = {
  三厂: [118.374087, 31.430816],
  超一: [118.381143, 31.472018],
  超二: [118.299723, 31.480211],
  物流园: [118.368921, 31.471579],
  超三: [118.18, 31.2],
  超四: [118.32, 31.37],
};

const overviewStore = useOverviewStore();
const { factories, loading } = storeToRefs(overviewStore);
if (!overviewStore.rawList.length) {
  overviewStore.fetchOverview();
}

function buildSeriesData() {
  // 将 store 中的工厂数据映射为散点数据：value=[lng,lat,count]
  const simplify = (n = "") => n.replace(/(总装|工厂|厂)/g, "").trim();
  const coordKeys = Object.keys(factoryCoordinates);
  const warnUnmatched = [];
  const result = factories.value
    .map((f) => {
      const originalName = f.name || "";
      let coord = factoryCoordinates[originalName];
      if (!coord) {
        const simp = simplify(originalName);
        let key = coordKeys.find((k) => simplify(k) === simp);
        if (!key) {
          key = coordKeys.find(
            (k) => k.includes(originalName) || originalName.includes(k)
          );
        }
        if (key) coord = factoryCoordinates[key];
      }
      if (!coord) {
        warnUnmatched.push(originalName);
        return null;
      }
      const count = Number(f.amrCount) || 0;
      const abnormal = Number(f.abnormalCount) || 0;
      // value: [lng, lat, amrCount, abnormalCount]
      return {
        name: originalName,
        value: [...coord, count, abnormal],
        extra: f,
      };
    })
    .filter(Boolean);
  if (warnUnmatched.length) {
    console.warn("[MapChart] 未找到坐标的工厂:", warnUnmatched.join(", "));
  }
  return result;
}

function renderChart() {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
    echarts.registerMap("wuhu", wuhuJson);
  }

  const data = buildSeriesData();
  const maxCount = data.reduce((m, d) => Math.max(m, d.value[2] || 0), 0) || 1;

  const option = {
    title: {
      text: "工厂 AMR 分布",
      left: "10px",
      top: "10px",
      textStyle: { color: "#4572d9", fontSize: 16, fontWeight: "bold" },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(24,41,64,0.85)",
      borderColor: "#4572d9",
      textStyle: { color: "#fff" },
      formatter: (p) => {
        const v = p.value?.[2] || 0;
        const abn = p.value?.[3] || p.data?.extra?.abnormalCount || 0;
        const lines = [`<b>${p.name}</b>`];
        if (v > 0) lines.push(`AMR：${v} 台`);
        else lines.push("暂无数据");
        if (abn > 0)
          lines.push(
            `报警：<span style="color:#ff5a5c;font-weight:600">${abn}</span> 台`
          );
        return lines.join("<br/>");
      },
    },
    geo: {
      map: "wuhu",
      roam: true,
      zoom: defaultZoom,
      layoutCenter: ["50%", "52%"],
      layoutSize: "85%",
      label: { show: false },
      itemStyle: {
        areaColor: "#29C2FF",
        borderColor: "#4FC7E8",
        borderWidth: 1.5,
      },
      emphasis: { itemStyle: { areaColor: "#e3eef8" } },
    },
    // 去掉热力层后的两个核心图层：普通工厂散点 & 异常闪烁层
    series: [
      {
        name: "工厂AMR",
        type: "scatter",
        coordinateSystem: "geo",
        data,
        symbol: "circle",
        symbolSize: (val) => {
          const c = val[2] || 0;
          if (c <= 0) return 10;
          return 8 + (c / maxCount) * 28;
        },
        label: { show: false },
        emphasis: {
          // 关闭散点自身的悬停文字，只保留 tooltip
          label: { show: false },
          itemStyle: { color: "#ff7875" },
        },
        itemStyle: {
          color: (params) => {
            const c = params.value?.[2] || 0;
            const abn =
              params.data?.extra?.abnormalCount ?? params.value?.[3] ?? 0;
            if (abn > 0) return "#ff2d2f"; // 更鲜明的红色
            if (c <= 0) return "#5b6d7a";
            const ratio = Math.min(1, c / maxCount);
            const lerp = (a, b, t) => Math.round(a + (b - a) * t);
            const c1 = { r: 0x52, g: 0xe2, b: 0xff };
            const c2 = { r: 0x00, g: 0x4b, b: 0xff };
            const r = lerp(c1.r, c2.r, ratio);
            const g = lerp(c1.g, c2.g, ratio);
            const b = lerp(c1.b, c2.b, ratio);
            return `rgb(${r},${g},${b})`;
          },
          borderColor: (params) =>
            (params.data?.extra?.abnormalCount ?? params.value?.[3] ?? 0) > 0
              ? "#ffaaaa"
              : "#ffffff",
          borderWidth: 2,
          shadowBlur: 18,
          shadowColor: (params) =>
            (params.data?.extra?.abnormalCount ?? params.value?.[3] ?? 0) > 0
              ? "rgba(255,45,47,0.65)"
              : "rgba(0,136,255,0.55)",
        },
        zlevel: 2,
      },
      {
        name: "异常AMR",
        type: "effectScatter",
        coordinateSystem: "geo",
        data: data
          .filter((d) => (d.extra?.abnormalCount || d.value?.[3] || 0) > 0)
          .map((d) => ({ name: d.name, value: d.value })),
        symbolSize: (val) => {
          const c = val[2] || 0;
          return 12 + (c / maxCount) * 30;
        },
        rippleEffect: { period: 4, scale: 3, brushType: "stroke" },
        itemStyle: {
          color: "#ff2729",
          borderColor: "#ffe0e0",
          borderWidth: 2,
          shadowBlur: 24,
          shadowColor: "rgba(255,39,41,0.75)",
        },
        zlevel: 3,
      },
    ],
  };

  chartInstance.setOption(option);
}

onMounted(() => {
  renderChart();
});

function resetMap() {
  if (!chartInstance) return;
  chartInstance.setOption({ geo: { zoom: defaultZoom } });
}

// 数据变化时刷新
watch([factories, loading], () => {
  if (!loading.value) renderChart();
});

// 窗口自适应
const resizeHandler = () => {
  chartInstance && chartInstance.resize();
};
window.addEventListener("resize", resizeHandler);
onUnmounted(() => {
  window.removeEventListener("resize", resizeHandler);
  if (chartInstance) chartInstance.dispose();
});
</script>
<style scoped>
.map-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  z-index: 10;
}
.map-toolbar :deep(.n-button) {
  backdrop-filter: blur(4px);
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  color: #1d5ad1;
}
.map-toolbar :deep(.n-button):hover {
  background: rgba(255, 255, 255, 0.85);
}
</style>
