<template>
  <div class="mrp-page">
    <ReportHeader />

    <ReportToolbar
      v-model="toolbarState"
      @refresh="onRefresh"
      @export="onExport"
      @export-pdf="onExportPdf"
    />

    <!-- 两列主区域布局 -->
    <div class="mrp-main">
      <!-- 左列 65%：充电数据统计 -->
      <div class="col left">
        <LeftKpiBar
          :data="kpiData"
          :loading="mrStore.kpiLoading"
          :hint="mrStore.kpi.hint"
        />
        <ChargeTrendsMix
          ref="trendRef"
          :selected="toolbarState"
          :refreshKey="refreshKey"
        />
        <Top10ChargeCount ref="top10Ref" />
        <ChargeDurationTable />
        <ChargeHeatmap />
      </div>

      <!-- 右列 35%：报警信息统计模块化面板 -->
      <div class="col right">
        <RightAlarmPanel ref="rightAlarmPanelRef" :selected="toolbarState" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from "vue";
import ReportHeader from "./monthly-report/ReportHeader.vue";
import ReportToolbar from "./monthly-report/ReportToolbar.vue";
import LeftKpiBar from "./monthly-report/LeftKpiBar.vue";
import ChargeTrendsMix from "./monthly-report/ChargeTrendsMix.vue";
import Top10ChargeCount from "./monthly-report/Top10ChargeCount.vue";
import ChargeDurationTable from "./monthly-report/ChargeDurationTable.vue";
import ChargeHeatmap from "./monthly-report/ChargeHeatmap.vue";
import RightAlarmPanel from "./monthly-report/RightAlarmPanel.vue";
// 报警相关图在 RightAlarmPanel 内部引用, 通过 ref 暴露导出
import { useMonthlyReportStore } from "@/stores/monthlyReportStore.js";
// 直接按模块方式引入 ECharts，避免依赖 window.echarts
import * as echarts from 'echarts';

// 延迟加载 PDF 依赖，避免初始包体积上升
let jsPDFLib = null; // 构造函数 jsPDF
let autoTableFn = null; // autotable 函数（也可通过 doc.autoTable 调用）
let html2canvasLib = null; // html2canvas 函数
let pdfLibLoading = false;
async function ensurePdfLibs() {
  if (jsPDFLib || pdfLibLoading) return;
  pdfLibLoading = true;
  try {
    // jsPDF 2.x ESM 暴露的是命名导出 { jsPDF }
    const [jsPDFModule, atModule, h2cModule] = await Promise.all([
      import(/* @vite-ignore */ 'jspdf'),
      import(/* @vite-ignore */ 'jspdf-autotable'),
      import(/* @vite-ignore */ 'html2canvas')
    ]);
    jsPDFLib = jsPDFModule.jsPDF || jsPDFModule.default || jsPDFModule;
    autoTableFn = atModule.default || atModule.autoTable || atModule;
    html2canvasLib = h2cModule.default || h2cModule;
    if (!jsPDFLib) throw new Error('jsPDF 模块未正确加载');
  } catch (err) {
    console.error('加载 PDF 依赖失败:', err);
    window.$message?.error?.('加载 PDF 依赖失败，请刷新后重试');
    throw err;
  } finally {
    pdfLibLoading = false;
  }
}

// 统一管理工具栏 v-model 的对象
const toolbarState = ref({
  selectedMode: "factory",
  selectedMonth: null,
  selectedDay: null,
  selectedFactory: "",
  selectedWorkshop: "",
  selectedAmr: "",
});

const refreshKey = ref(0);

async function onRefresh() {
  // 拉取 KPI（根据统计方式切换，当前实现厂级）
  const mode = toolbarState.value.selectedMode;
  const ftid = toolbarState.value.selectedFactory;
  const wkid = toolbarState.value.selectedWorkshop;
  const monthTs = toolbarState.value.selectedMonth;
  const day = toolbarState.value.selectedDay;
  if (mode === "factory_latest30") {
    // 仅刷新趋势图，不动 KPI
    refreshKey.value++;
    return;
  }
  await mrStore.fetchAmrQty({ ftid });
  if (mode === "factory") {
    // 厂级：不带月份筛选，环比不计算
    await mrStore.fetchFactoryKpi(ftid, null, { computeMom: false });
  } else if (mode === "factory_workshop") {
    // 厂+车间：不带月份、不带车辆，opid=1
    await mrStore.fetchWorkshopKpi(ftid, wkid, { computeMom: false });
  } else if (mode === "factory_workshop_month") {
    // 厂+车间+年月：opid=2，计算环比
    await mrStore.fetchWorkshopMonthKpi(ftid, wkid, monthTs, {
      computeMom: true,
    });
  } else if (mode === "factory_workshop_month_car") {
    // 厂+车间+年月+车号：opid=3，计算环比（分母=1）
    const ipid = toolbarState.value.selectedAmr;
    await mrStore.fetchWorkshopMonthCarKpi(ftid, wkid, monthTs, ipid, {
      computeMom: true,
    });
  } else if (mode === "factory_month") {
    // 厂+年月：opid=4
    await mrStore.fetchFactoryMonthKpi(ftid, monthTs, { computeMom: true });
  } else if (mode === "factory_workshop_month_day") {
    // 厂+车间+年月+日：opid=5，按指定日
    await mrStore.fetchWorkshopMonthDayKpi(ftid, wkid, monthTs, day, {
      computeMom: true,
    });
  } else {
    await mrStore.fetchFactoryKpi(ftid, monthTs);
  }
}

const trendRef = ref(null);
const top10Ref = ref(null);
const rightAlarmPanelRef = ref(null);

async function onExportPdf() {
  try {
    window.$message?.loading?.('生成 PDF...', { duration: 3000 });
    await ensurePdfLibs();
    await nextTick();
    const trendOpt = trendRef.value?.getExportOption?.() || null;
    const top10Opt = top10Ref.value?.getExportOption?.() || null;
    const alarmTrendOpt = rightAlarmPanelRef.value?.getAlarmTrendOption?.() || null;
    const alarmTypePieOpt = rightAlarmPanelRef.value?.getAlarmTypePieOption?.() || null;
    const alarmTop10Data = rightAlarmPanelRef.value?.getAlarmTop10Data?.() || { mode: '', rows: [] };
    const alarmTotals = rightAlarmPanelRef.value?.getAlarmKpiTotals?.() || null;
    async function optionToImage(opt, w = 880, h = 360) {
      if (!opt) return null;
      if (!echarts || !echarts.init) {
        console.warn('ECharts 未加载，跳过该图导出');
        return null;
      }
      const div = document.createElement('div');
      div.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;background:#fff;`;
      document.body.appendChild(div);
      const inst = echarts.init(div, undefined, { renderer: 'canvas' });
      const finalOpt = { animation: false, ...opt };
      const img = await new Promise(resolve => {
        let done = false;
        const finish = () => {
          if (done) return; done = true;
          try { resolve(inst.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' })); } catch { resolve(null); }
        };
        try { inst.on('finished', finish); } catch { /* ignore */ }
        inst.setOption(finalOpt, true);
        // 双保险超时
        setTimeout(finish, 600);
      });
      inst.dispose();
      document.body.removeChild(div);
      return img;
    }

    // 将 HTML 片段渲染成图片（解决中文字体缺失导致的乱码）
    async function htmlBlockToImage(html, widthPx = 880) {
      if (!html2canvasLib) return null;
      const box = document.createElement('div');
      box.style.cssText = `position:fixed;left:-9999px;top:0;width:${widthPx}px;padding:8px 12px;font:14px/1.5 -apple-system,blinkmacsystemfont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#111;background:#fff;`;
      box.innerHTML = html;
      document.body.appendChild(box);
      const canvas = await html2canvasLib(box, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
      document.body.removeChild(box);
      return { dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
    }
    // 优先直接从现有实例获取截图，避免重新渲染导致样式/数据差异
    const images = {
      trend: await (trendRef.value?.getExportImage?.() || optionToImage(trendOpt)),
      top10: await (top10Ref.value?.getExportImage?.() || optionToImage(top10Opt)),
      alarmTrend: await (rightAlarmPanelRef.value?.getAlarmTrendImage?.() || optionToImage(alarmTrendOpt)),
      alarmPie: await (rightAlarmPanelRef.value?.getAlarmTypePieImage?.() || optionToImage(alarmTypePieOpt))
    };
    const doc = new jsPDFLib('p', 'mm', 'a4');
    const pageW = 210, margin = 12, contentW = pageW - margin * 2;
    let y = 14;
    // 头部（中文）使用截图方式
    const headerHtml = `<div style="width:${contentW}mm;">
        <div style='font-size:20px;font-weight:600;'>月报</div>
        <div style='font-size:11px;color:#555;margin-top:2px;'>导出时间：${new Date().toLocaleString()}</div>
      </div>`;
    const headerImg = await htmlBlockToImage(headerHtml, 900);
    if (headerImg) {
      const ratio = headerImg.h / headerImg.w; const h = contentW * ratio;
      doc.addImage(headerImg.dataUrl, 'PNG', margin, y, contentW, h, undefined, 'FAST');
      y += h + 4;
    }
    const modeMap = { 'factory': '厂(近三月)', 'factory_workshop': '厂+车间(近三月)', 'factory_workshop_month': '厂+车间+年月', 'factory_workshop_month_car': '厂+车间+年月+车号', 'factory_month': '厂+年月', 'factory_workshop_month_day': '厂+车间+年月+日', 'factory_latest30': '厂+最近30天充电次数' };
    const tsMonth = toolbarState.value.selectedMonth;
    const monthStr = tsMonth ? (() => { const d = new Date(tsMonth); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })() : '全部';
    const filters = [
      ['统计方式', modeMap[toolbarState.value.selectedMode] || toolbarState.value.selectedMode],
      ['工厂', toolbarState.value.selectedFactory || '全部'],
      ['车间', toolbarState.value.selectedWorkshop || '全部'],
      ['车辆', toolbarState.value.selectedAmr || '全部'],
      ['报警类型', toolbarState.value.selectedAlarmType || '全部'],
      ['年月', monthStr],
      ['日', toolbarState.value.selectedDay || '-']
    ];
    // 组合一个 HTML 块（中文通过浏览器字体渲染，再截图为图片）
    const kpiHtmlLines = kpiData.value.map(k => `<div class="kpi-item"><strong>${k.label}</strong>：${k.value ?? 0}${k.unit ? ' '+k.unit : ''}</div>`).join('');
    const alarmKpiHtmlLines = alarmTotals ? [ ['报警总数', alarmTotals.total], ['报警分钟数', alarmTotals.alarmMinutes], ['报警小车数', alarmTotals.alarmCarCount] ].map(r=>`<div class="kpi-item"><strong>${r[0]}</strong>：${r[1]}</div>`).join('') : '';
    const blockHtml = `
      <div style="font-size:13px;display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px;">${filters.map(f=>`<div style=\"background:#f5f5f5;padding:4px 8px;border-radius:4px;\"><strong>${f[0]}</strong>：${f[1]}</div>`).join('')}</div>
      <div style="margin-top:4px;font-size:14px;"> <div style="font-size:15px;margin-bottom:4px;font-weight:600;">充电 KPI</div>${kpiHtmlLines}</div>
      ${ alarmTotals ? `<div style=\"margin-top:8px;font-size:14px;\"><div style=\"font-size:15px;margin-bottom:4px;font-weight:600;\">报警 KPI</div>${alarmKpiHtmlLines}</div>` : '' }
    `;
    const blockImg = await htmlBlockToImage(blockHtml);
    if (blockImg) {
      const ratio = blockImg.h / blockImg.w;
      const targetH = contentW * ratio;
      if (y + targetH > 285) { doc.addPage(); y = 14; }
      doc.addImage(blockImg.dataUrl, 'PNG', margin, y, contentW, targetH, undefined, 'FAST');
      y += targetH + 6;
    }
    async function addChart(title, key) {
      const img = images[key]; if (!img) return; const targetH = 70; if (y + targetH + 14 > 287) { doc.addPage(); y = 14; }
      const titleBlock = await htmlBlockToImage(`<div style='font-size:14px;font-weight:600;'>${title}</div>`, 600);
      if (titleBlock) {
        const r = titleBlock.h / titleBlock.w; const th = contentW * r;
        doc.addImage(titleBlock.dataUrl, 'PNG', margin, y, contentW, th, undefined, 'FAST');
        y += th + 2;
      }
      doc.addImage(img, 'PNG', margin, y, contentW, targetH, undefined, 'FAST'); y += targetH + 6;
    }
  await addChart('近30天充电趋势', 'trend');
  await addChart('单台月累计充电次数 Top10', 'top10');
  await addChart('报警指数 (气泡)', 'alarmTrend');
  await addChart('报警类型占比', 'alarmPie');
    if (alarmTop10Data.rows?.length) {
      if (y > 250) { doc.addPage(); y = 14; }
      const tableHtml = `<div style='font-size:14px;font-weight:600;margin-bottom:4px;'>Top10 报警设备${alarmTop10Data.mode ? '（'+alarmTop10Data.mode+'）' : ''}</div>
        <table style='border-collapse:collapse;font-size:11px;width:100%;'>
        <thead><tr style='background:#f5f5f5;'>
          <th style='border:1px solid #ccc;padding:3px 4px;'>序号</th>
          <th style='border:1px solid #ccc;padding:3px 4px;'>设备</th>
          <th style='border:1px solid #ccc;padding:3px 4px;'>次数</th>
          <th style='border:1px solid #ccc;padding:3px 4px;'>时长(min)</th>
          <th style='border:1px solid #ccc;padding:3px 4px;'>类型</th>
        </tr></thead><tbody>
        ${alarmTop10Data.rows.map(r=>`<tr>
          <td style='border:1px solid #ccc;padding:2px 4px;text-align:center;'>${r.rank}</td>
          <td style='border:1px solid #ccc;padding:2px 4px;text-align:center;'>${r.crnm||''}</td>
          <td style='border:1px solid #ccc;padding:2px 4px;text-align:center;'>${r.tqty??''}</td>
          <td style='border:1px solid #ccc;padding:2px 4px;text-align:center;'>${r.mint??''}</td>
          <td style='border:1px solid #ccc;padding:2px 4px;text-align:center;'>${r.kdnm||''}</td>
        </tr>`).join('')}
        </tbody></table>`;
      const tableImg = await htmlBlockToImage(tableHtml, 900);
      if (tableImg) {
        const ratio = tableImg.h / tableImg.w; const h = contentW * ratio;
        if (y + h > 285) { doc.addPage(); y = 14; }
        doc.addImage(tableImg.dataUrl, 'PNG', margin, y, contentW, h, undefined, 'FAST');
        y += h + 6;
      }
    }
    const timeStr = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    doc.save('monthly-report-' + timeStr + '.pdf');
    window.$message?.success?.('PDF 已生成');
  } catch (e) {
    console.error(e);
    window.$message?.error?.('PDF 导出失败');
  }
}

async function onExport() {
  try {
    window.$message?.loading?.("正在生成离线页面...", { duration: 3000 });
    await nextTick();
    // 快照 KPI
    const kpiList = kpiData.value.map((k) => ({
      label: k.label,
      value: k.value,
      unit: k.unit || "",
    }));
    // 报警 KPI (来自 RightAlarmPanel)
    const alarmTotals = rightAlarmPanelRef.value?.getAlarmKpiTotals?.() || null;
    const alarmKpiList = alarmTotals
      ? [
          { label: "报警总数", value: alarmTotals.total },
          { label: "报警分钟数", value: alarmTotals.alarmMinutes, unit: "min" },
          { label: "报警小车数", value: alarmTotals.alarmCarCount },
        ]
      : [];
    // 图表 option
    const trendOpt = trendRef.value?.getExportOption?.() || null;
    const top10Opt = top10Ref.value?.getExportOption?.() || null;
    const alarmTrendOpt =
      rightAlarmPanelRef.value?.getAlarmTrendOption?.() || null;
    const alarmTypePieOpt =
      rightAlarmPanelRef.value?.getAlarmTypePieOption?.() || null;
    const alarmTop10Data = rightAlarmPanelRef.value?.getAlarmTop10Data?.() || {
      mode: "",
      rows: [],
    };
    const timeStr = new Date()
      .toISOString()
      .replace(/[:T]/g, "-")
      .split(".")[0];
    const fileName = `monthly-report-${timeStr}.html`;
    const style = `body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:16px;background:#f5f7fa;}h1{font-size:20px;margin:0 0 12px;}section{background:#fff;border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:14px;} .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;} .kpi-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px;} .kpi-item .val{font-size:18px;font-weight:600;} .chart-box{height:340px;} .footer-note{margin-top:24px;color:#64748b;font-size:12px;text-align:center;} .title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;} .sub{color:#64748b;font-size:12px;} table{width:100%;border-collapse:collapse;font-size:12px;} th,td{border:1px solid #e5e7eb;padding:4px 6px;text-align:center;} th{background:#f1f5f9;} .mode-tag{display:inline-block;padding:2px 6px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-size:10px;margin-left:6px;} .filters-summary{margin-top:4px;} .filters-summary ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px;} .filters-summary li{background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:12px;color:#334155;} .filters-summary strong{color:#0f172a;} .filters-summary .kv-label{color:#64748b;margin-right:2px;}`;
    // 构造筛选摘要
    const modeMap = {
      factory: "厂(近三月)",
      factory_workshop: "厂+车间(近三月)",
      factory_workshop_month: "厂+车间+年月",
      factory_workshop_month_car: "厂+车间+年月+车号",
      factory_month: "厂+年月",
      factory_workshop_month_day: "厂+车间+年月+日",
      factory_latest30: "厂+最近30天充电次数",
    };
    const ftid = toolbarState.value.selectedFactory;
    const wkid = toolbarState.value.selectedWorkshop;
    const ipid = toolbarState.value.selectedAmr;
    const alarmType = toolbarState.value.selectedAlarmType;
    const monthTs = toolbarState.value.selectedMonth;
    const day = toolbarState.value.selectedDay;
    const factoryName = ftid
      ? mrStore.factories.find((f) => f.ftid === ftid)?.ftnm || ftid
      : "全部";
    let workshopName = "全部";
    if (ftid && wkid && mrStore.workshopsMap[ftid]) {
      const g = mrStore.workshopsMap[ftid].find((x) => x.value === wkid);
      if (g) workshopName = g.label;
    }
    let amrName = "全部";
    if (ftid && wkid && ipid && mrStore.workshopsMap[ftid]) {
      const g = mrStore.workshopsMap[ftid].find((x) => x.value === wkid);
      const child = g?.children?.find((c) => c.value === ipid);
      if (child) amrName = child.label;
    }
    const monthStr = monthTs
      ? (() => {
          const d = new Date(monthTs);
          return (
            d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
          );
        })()
      : "全部";
    const dayStr = day ? String(day) : "-";
    const alarmTypeStr = alarmType || "全部";
    const filterItems = [
      [
        "统计方式",
        modeMap[toolbarState.value.selectedMode] ||
          toolbarState.value.selectedMode,
      ],
      ["工厂", factoryName],
      ["车间", workshopName],
      ["车辆", amrName],
      ["报警类型", alarmTypeStr],
      ["年月", monthStr],
      ["日", dayStr],
    ];
    const filterSummaryHtml =
      '<section><strong>筛选条件</strong><div class="filters-summary"><ul>' +
      filterItems
        .map(
          (kv) =>
            '<li><span class="kv-label">' +
            kv[0] +
            '：</span><span class="kv-val">' +
            kv[1] +
            "</span></li>"
        )
        .join("") +
      "</ul></div></section>";
    const serialize = (obj) => JSON.stringify(obj);
    const kpiHtml = kpiList
      .map(
        (k) =>
          '<div class="kpi-item"><div class="label">' +
          k.label +
          '</div><div class="val">' +
          Number(k.value).toLocaleString("zh-CN") +
          (k.unit ? ' <span class="unit">' + k.unit + "</span>" : "") +
          "</div></div>"
      )
      .join("");
    const alarmKpiHtml = alarmKpiList
      .map(
        (k) =>
          '<div class="kpi-item"><div class="label">' +
          k.label +
          '</div><div class="val">' +
          Number(k.value).toLocaleString("zh-CN") +
          (k.unit ? ' <span class="unit">' + k.unit + "</span>" : "") +
          "</div></div>"
      )
      .join("");
    // 通过占位拆分避免 </scr + 'ipt>' 终止 SFC
    const html =
      '<!DOCTYPE html><html lang="zh-cn"><head><meta charset="UTF-8"><title>月报离线导出</title><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
      "<style>" +
      style +
      "</style>" +
      '<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></' +
      "script>" +
      "</head><body><h1>月报离线导出</h1>" +
      filterSummaryHtml +
      '<section><div class="title-row"><strong>KPI 指标</strong><span class="sub">导出时间: ' +
      new Date().toLocaleString() +
      '</span></div><div class="kpi-grid">' +
      kpiHtml +
      "</div></section>" +
      '<section><strong>近30天充电趋势</strong><div id="trendChart" class="chart-box"></div></section>' +
      '<section><strong>单台月累计充电次数 Top10</strong><div id="top10Chart" class="chart-box"></div></section>' +
      (alarmTop10Data.rows.length
        ? "<section><strong>Top10 报警设备" +
          (alarmTop10Data.mode
            ? '<span class="mode-tag">模式: ' + alarmTop10Data.mode + "</span>"
            : "") +
          '</strong><div class="table-wrap"><table><thead><tr><th>序号</th><th>工厂</th><th>车间</th><th>年月</th><th>设备</th><th>次数</th><th>报警时长(min)</th><th>报警类型</th></tr></thead><tbody>' +
          alarmTop10Data.rows
            .map(
              (r) =>
                "<tr><td>" +
                r.rank +
                "</td><td>" +
                (r.ftnm || "") +
                "</td><td>" +
                (r.wkid || "") +
                "</td><td>" +
                (r.yymm || "") +
                "</td><td>" +
                (r.crnm || "") +
                "</td><td>" +
                (r.tqty ?? "") +
                "</td><td>" +
                (r.mint ?? "") +
                "</td><td>" +
                (r.kdnm || "") +
                "</td></tr>"
            )
            .join("") +
          "</tbody></table></div></section>"
        : "") +
      (alarmKpiList.length
        ? '<section><strong>报警KPI</strong><div class="kpi-grid">' +
          alarmKpiHtml +
          "</div></section>"
        : "") +
      '<section><strong>报警指数 (气泡)</strong><div id="alarmTrendChart" class="chart-box"></div></section>' +
      '<section><strong>报警类型占比</strong><div id="alarmTypePieChart" class="chart-box"></div></section>' +
      '<div class="footer-note">本页面为离线导出，实际数据以系统为准</div>' +
      "<script>" +
      "const trendOption=" +
      serialize(trendOpt) +
      ";" +
      "const top10Option=" +
      serialize(top10Opt) +
      ";" +
      "const alarmTrendOption=" +
      serialize(alarmTrendOpt) +
      ";" +
      "const alarmTypePieOption=" +
      serialize(alarmTypePieOpt) +
      ";" +
      "function mount(){" +
      'if(trendOption){const t=echarts.init(document.getElementById("trendChart"));t.setOption(trendOption);}' +
      'if(top10Option){const t2=echarts.init(document.getElementById("top10Chart"));t2.setOption(top10Option);}' +
      'if(alarmTrendOption){const t3=echarts.init(document.getElementById("alarmTrendChart"));t3.setOption(alarmTrendOption);}' +
      'if(alarmTypePieOption){const t4=echarts.init(document.getElementById("alarmTypePieChart"));t4.setOption(alarmTypePieOption);}' +
      'window.addEventListener("resize",()=>{["trendChart","top10Chart","alarmTrendChart","alarmTypePieChart"].forEach(id=>{const inst=echarts.getInstanceByDom(document.getElementById(id));if(inst)inst.resize();});});' +
      "}" +
      'document.readyState==="loading"?document.addEventListener("DOMContentLoaded",mount):mount();' +
      "</" +
      "script></body></html>";
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 2000);
    window.$message?.success?.("离线页面已生成");
  } catch (e) {
    console.error(e);
    window.$message?.error?.("导出失败");
  }
}

const mrStore = useMonthlyReportStore();

// 初次加载与工厂/月份变更时可以预拉（也可仅在确认时拉取，以下为同步示例）
onMounted(async () => {
  await mrStore.fetchAmrQty();
  // 初次：默认按厂级展示（不带月份）
  await mrStore.fetchFactoryKpi(toolbarState.value.selectedFactory, null, {
    computeMom: false,
  });
});

// KPI 数据映射给 LeftKpiBar
const kpiData = computed(() => [
  {
    key: "total_cnt",
    label: "总充电次数",
    value: mrStore.kpi.total_cnt ?? 0,
    mom: mrStore.kpi.mom?.total_cnt ?? null,
  },
  {
    key: "avg_dur",
    label: "平均单次充电时长",
    value: mrStore.kpi.avg_dur ?? 0,
    mom: mrStore.kpi.mom?.avg_dur ?? null,
    unit: "min/次",
  },
  {
    key: "total_dur",
    label: "总充电时间",
    value: mrStore.kpi.total_dur ?? 0,
    mom: mrStore.kpi.mom?.total_dur ?? null,
    unit: "min",
  },
  {
    key: "avg_per",
    label: "单台平均充电次数",
    value: mrStore.kpi.avg_per ?? 0,
    mom: mrStore.kpi.mom?.avg_per ?? null,
  },
]);
</script>

<style scoped>
.mrp-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px 24px;
  height: 100%;
  box-sizing: border-box;
}

/* 内容占位 */
.mrp-main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 65% 35%;
  gap: 12px;
}

.col.left,
.col.right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
</style>
