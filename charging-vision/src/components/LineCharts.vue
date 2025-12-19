<template>
  <n-card
    style="
      border-top: rgb(177, 215, 251) 4px solid;
      border-bottom: rgb(197, 216, 231) 4px solid;
      border-left: rgb(177, 215, 251) 1px solid;
      border-right: rgb(197, 216, 231) 1px solid;
      background: #f6f7fc;
      box-shadow: 15px 15px 30px #d6e3ff, -15px -15px 30px #f7f8fd;
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
    "
    hoverable
  >
    <v-chart
      :option="option"
      autoresize
      style="flex: 1 1 0; min-height: 180px; width: 100%; height: 100%"
    />
  </n-card>
</template>

<script setup>
import { computed } from "vue";
import { NCard } from "naive-ui";
import { use } from "echarts/core";
import VChart from "vue-echarts";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
]);

const props = defineProps({
  title: { type: String, default: "" }, // 图表标题
  legend: { type: Array, default: () => [] }, // 图例数据
  xData: { type: Array, default: () => [] }, // X轴数据 (已格式化)
  yName: { type: String, default: "" }, // Y轴名称
  series: { type: Array, default: () => [] }, // 数据
  xLabelRotate: { type: Number, default: 0 }, // X轴文字旋转
  forceAllLabels: { type: Boolean, default: false }, // 强制显示全部标签
  maxXTicks: { type: Number, default: 8 }, // 最多显示 8 个刻度标签
  yPaddingRatio: { type: Number, default: 0 }, // 留白=0，确保Y轴数据完整展示
  color: { type: Array, default: () => [] }, // 折线颜色
});

const option = computed(() => {
  const total = props.xData.length;
  // 时间跨度判定，用于选择最短显示格式
  function parseDate(v) {
    return new Date(String(v).replace(" ", "T").replace(/\.0$/, ""));
  }
  let showMode = "time"; // 'time' => HH:mm, 'date' => MM.DD
  if (total > 1) {
    const first = parseDate(props.xData[0]);
    const last = parseDate(props.xData[total - 1]);
    const spanMs = last - first;
    const oneDay = 24 * 3600 * 1000;
    if (spanMs > oneDay) showMode = "date";
  }
  const pad = (n) => String(n).padStart(2, "0");
  function formatLabel(v) {
    const d = parseDate(v);
    if (isNaN(d.getTime())) return v;
    if (showMode === "date")
      return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  // 需要显示的索引集合
  let showIndexSet = null;
  if (!props.forceAllLabels && total > props.maxXTicks) {
    const step = Math.ceil(total / props.maxXTicks);
    showIndexSet = new Set();
    for (let i = 0; i < total; i += step) showIndexSet.add(i);
    showIndexSet.add(total - 1); // 确保最后一个
  }
  // Y轴不加 padding，保持完整
  const yMin = undefined;
  const yMax = undefined;

  return {
    color: props.color && props.color.length ? props.color : ["#5470c6"],
    title: {
      text: props.title,
      left: "0",
      textStyle: { fontSize: 16, fontWeight: "bold", color: "#4572D9" },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      backgroundColor: "rgba(255,255,255,0.95)",
      borderColor: "#d0d7e5",
      borderWidth: 1,
      textStyle: { color: "#3a4a5a" },
      extraCssText: "box-shadow:0 2px 8px rgba(0,0,0,0.08);",
      formatter: (params) => {
        if (!params || !params.length) return "";
        const time = params[0].axisValue;
        const lines = params.map(
          (p) =>
            `${p.marker} ${p.seriesName}: <b>${p.data ?? "-"}${
              p.seriesName.includes("温度")
                ? "℃"
                : p.seriesName.includes("电压")
                ? "V"
                : p.seriesName.includes("电流")
                ? "A"
                : ""
            }</b>`
        );
        return `<div style='font-size:12px;margin-bottom:4px;color:#4572D9'>${time}</div>${lines.join(
          "<br/>"
        )}`;
      },
    },
    legend: {
      data: props.legend,
      top: 30,
      textStyle: { color: "#7D78CC" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "1%",
      top: "30%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: props.xData,
      axisLabel: {
        color: "#8fa7be",
        fontSize: 12,
        rotate: props.xLabelRotate,
        interval: 0, // 自行控制隐藏
        formatter: (value, idx) => {
          if (props.forceAllLabels || total <= props.maxXTicks)
            return formatLabel(value);
          if (showIndexSet && showIndexSet.has(idx)) return formatLabel(value);
          return "";
        },
      },
      axisLine: { show: true, lineStyle: { color: "#ddd" } },
    },
    yAxis: {
      type: "value",
      name: props.yName,
      min: yMin,
      max: yMax,
      nameTextStyle: { color: "#8fa7be", fontSize: 12, padding: [0, 0, 0, 40] },
      axisLabel: { color: "#8fa7be", fontSize: 12 },
      axisLine: { show: true, lineStyle: { color: "#ddd" } },
      splitLine: { lineStyle: { color: "#f5f5f5" } },
    },
    series: props.series,
  };
});
</script>
