import ApexCharts from "apexcharts";

// Helper: read CSS variable
const cv = (n: string): string => {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
};

// Mobile responsive config appended to every chart that has xaxis labels
// Prevents text overlapping on small screens
const mobileResponsive = (reducedHeight?: number) => [
  {
    breakpoint: 640,
    options: {
      chart: reducedHeight ? { height: reducedHeight } : {},
      xaxis: {
        labels: {
          style: { fontSize: "9px" },
          rotate: -45,
          rotateAlways: false,
        },
      },
      yaxis: {
        labels: { style: { fontSize: "9px" } },
      },
    },
  },
];

// ─── HRM Dashboard Charts ───────────────────────────────────────────────────
export function initHrmCharts(): () => void {
  const instances: ApexCharts[] = [];
  const primary = cv("--color-primary") || "#0F766E";
  const success = cv("--color-success") || "#059669";
  const orange  = cv("--color-orange")  || "#E65100";
  const pink    = cv("--color-pink")    || "#CC25B0";
  const dark    = cv("--color-dark")    || "#1E293B";
  const gray400 = cv("--color-gray-400")|| "#9096A1";

  // Employee Distribution donut
  const empEl = document.getElementById("employee-distribution-chart");
  if (empEl) {
    empEl.innerHTML = "";
    const chart = new ApexCharts(empEl, {
      chart: { type: "donut", height: 150, width: 150,
        events: {
          dataPointMouseEnter(_: any, ctx: any, cfg: any) {
            const v = ctx.w.globals.series[cfg.dataPointIndex];
            const l = ctx.w.globals.labels[cfg.dataPointIndex];
            const vn = document.querySelector("#employee-distribution-chart .apexcharts-datalabel-value");
            const ln = document.querySelector("#employee-distribution-chart .apexcharts-datalabel-label");
            if (vn) (vn as HTMLElement).textContent = v.toLocaleString();
            if (ln) (ln as HTMLElement).textContent = l;
          },
          dataPointMouseLeave() {
            const vn = document.querySelector("#employee-distribution-chart .apexcharts-datalabel-value");
            const ln = document.querySelector("#employee-distribution-chart .apexcharts-datalabel-label");
            if (vn) (vn as HTMLElement).textContent = "1,284";
            if (ln) (ln as HTMLElement).textContent = "Employees";
          },
        },
      },
      grid: { padding: { top: 0, right: 0, bottom: -10, left: 0 } },
      series: [488, 282, 231, 180, 103],
      labels: ["Engineering", "Marketing", "Finance", "Sales", "HR"],
      colors: [primary, orange, success, pink, dark],
      stroke: { width: 0 },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: true, fontSize: "10px", color: gray400, offsetY: 18 },
              value: { show: true, fontSize: "18px", fontWeight: 700, color: dark, offsetY: -10 },
              total: {
                show: true, showAlways: true, label: "Employees",
                fontSize: "10px", fontWeight: 400, color: gray400,
                formatter: () => "1,284",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
    });
    chart.render();
    instances.push(chart);
  }

  // Weekly Attendance bar
  const attEl = document.getElementById("weekly-attendance-chart");
  if (attEl) {
    attEl.innerHTML = "";
    const chart = new ApexCharts(attEl, {
      chart: { type: "bar", height: 110, toolbar: { show: false }, sparkline: { enabled: false } },
      series: [{ name: "Present", data: [86, 92, 88, 78, 95, 70, 45] }],
      xaxis: {
        categories: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false, padding: { left: 0, right: 0, top: -20, bottom: 0 } },
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 3, distributed: true } },
      colors: [primary, primary, primary, orange, primary, primary, primary],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => v + "%" } },
      responsive: mobileResponsive(90),
    });
    chart.render();
    instances.push(chart);
  }

  // Payroll trend area
  const payEl = document.getElementById("payroll-trend-chart");
  if (payEl) {
    payEl.innerHTML = "";
    const chart = new ApexCharts(payEl, {
      chart: { type: "area", height: 80, toolbar: { show: false }, sparkline: { enabled: false }, background: "transparent" },
      series: [{ name: "Payroll", data: [950, 1080, 1020, 1180, 1100, 1248] }],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun"],
        labels: { style: { colors: "var(--color-gray-900)", fontSize: "10px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false, padding: { left: 10, right: 0, top: -10, bottom: 0 } },
      stroke: { curve: "smooth", width: 2 },
      colors: [success],
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] } },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", y: { formatter: (v: number) => "$" + v + "K" } },
      markers: { size: 0 },
    });
    chart.render();
    instances.push(chart);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}

// ─── POS Dashboard Charts ────────────────────────────────────────────────────
export function initPosCharts(): () => void {
  const instances: ApexCharts[] = [];
  const primary  = cv("--color-primary") || "#0F766E";
  const success  = cv("--color-success") || "#059669";
  const orange   = cv("--color-orange")  || "#E65100";
  const pink     = cv("--color-pink")    || "#CC25B0";
  const purple   = cv("--color-purple")  || "#6A1B9A";
  const info     = cv("--color-info")    || "#0EA5E9";
  const dark     = cv("--color-dark")    || "#1E293B";
  const gray400  = cv("--color-gray-400")|| "#9096A1";
  void primary; void dark;

  // Product Sales bar
  const psEl = document.getElementById("pos-product-sales-chart");
  if (psEl) {
    psEl.innerHTML = "";
    const chart = new ApexCharts(psEl, {
      chart: { type: "bar", height: 170, toolbar: { show: false } },
      series: [{ name: "Sales", data: [42, 38, 45, 32, 52, 38, 35, 30, 36, 38, 45, 50] }],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: gray400, fontSize: "11px" }, formatter: (v: number) => v + "K" } },
      grid: { padding: { left: 0 }, borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      plotOptions: { bar: { columnWidth: "60%", borderRadius: 3 } },
      fill: { type: "gradient", gradient: { type: "vertical", shade: "light", shadeIntensity: 0.3, gradientToColors: [success], opacityFrom: 0.85, opacityTo: 0.4, stops: [0, 100] } },
      colors: [success], legend: { show: false }, dataLabels: { enabled: false },
      tooltip: { theme: "dark", y: { formatter: (v: number) => "$" + (v * 1000).toLocaleString() } },
      responsive: mobileResponsive(140),
    });
    chart.render();
    instances.push(chart);
  }

  // 4 sparklines
  [
    { id: "pos-spark-1", color: success, data: [12,14,13,18,16,22,19,25,21,28,24,32] },
    { id: "pos-spark-2", color: purple,  data: [22,18,24,20,28,24,30,26,32,28,36,30] },
    { id: "pos-spark-3", color: info,    data: [14,18,16,22,20,26,23,30,26,32,28,36] },
    { id: "pos-spark-4", color: pink,    data: [18,22,19,26,22,30,26,32,28,36,30,38] },
  ].forEach((s) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    el.innerHTML = "";
    const chart = new ApexCharts(el, {
      chart: { type: "area", height: 60, sparkline: { enabled: true } },
      series: [{ data: s.data }],
      stroke: { curve: "smooth", width: 2 }, colors: [s.color],
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] } },
      tooltip: { enabled: false },
    });
    chart.render();
    instances.push(chart);
  });

  // Sales vs Returns bar (positive + negative)
  const srEl = document.getElementById("pos-sales-returns-chart");
  if (srEl) {
    srEl.innerHTML = "";
    const chart = new ApexCharts(srEl, {
      chart: { type: "bar", height: 250, stacked: false, toolbar: { show: false } },
      series: [
        { name: "Sales",   data: [100,300,200,100,140,280,180,220,350,260,120,180] },
        { name: "Returns", data: [-150,-300,-200,-100,-140,-280,-240,-100,-150,-330,-70,-140] },
      ],
      colors: ["#32827A", "#DE8434"],
      plotOptions: { bar: { columnWidth: "85%", borderRadius: 2, borderRadiusApplication: "around" } },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4, padding: { left: 0, right: 0, bottom: 0 } },
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        axisBorder: { show: false }, axisTicks: { show: false },
        labels: { style: { colors: gray400, fontSize: "10px" } },
      },
      yaxis: {
        min: -400, max: 400, tickAmount: 8,
        labels: { offsetX: -10, style: { colors: gray400, fontSize: "11px" }, formatter: (v: number) => String(Math.abs(v)) },
      },
      tooltip: { y: { formatter: (v: number) => String(Math.abs(v)) } },
      responsive: mobileResponsive(200),
    });
    chart.render();
    instances.push(chart);
  }

  // High Selling Categories radar
  const rcEl = document.getElementById("pos-categories-radar");
  if (rcEl) {
    rcEl.innerHTML = "";
    const chart = new ApexCharts(rcEl, {
      chart: { type: "radar", height: 280, toolbar: { show: false }, parentHeightOffset: 0 },
      series: [{ name: "Sales", data: [62, 78, 55, 48, 65, 72, 58, 50] }],
      xaxis: {
        categories: ["Appliances","Headphones","Footwear","Furniture","Apparel","Smartphones","Computers","Watches"],
        labels: { style: { colors: Array(8).fill(gray400), fontSize: "10px" } },
      },
      yaxis: { show: false, tickAmount: 4 },
      colors: [orange],
      stroke: { width: 2 },
      fill: { type: "gradient", gradient: { shade: "light", type: "radial", shadeIntensity: 0.3, opacityFrom: 0.6, opacityTo: 0.2, stops: [0, 100] } },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { theme: "dark" },
      responsive: [{
        breakpoint: 640,
        options: {
          chart: { height: 220 },
          xaxis: { labels: { style: { fontSize: "8px" } } },
        },
      }],
    });
    chart.render();
    instances.push(chart);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}

// ─── Inventory Dashboard Charts ──────────────────────────────────────────────
export function initInventoryCharts(): () => void {
  const instances: ApexCharts[] = [];
  const success = cv("--color-success") || "#059669";
  const orange  = cv("--color-orange")  || "#E65100";
  const gray400 = cv("--color-gray-400")|| "#9096A1";

  // Total Stock sparkline
  const tsEl = document.getElementById("inv-total-stock-spark");
  if (tsEl) {
    tsEl.innerHTML = "";
    const c = new ApexCharts(tsEl, {
      chart: { type: "area", height: 80, width: "100%", sparkline: { enabled: true } },
      series: [{ data: [12,18,16,22,26,21,28,32,27,34,30,38] }],
      stroke: { curve: "smooth", width: 2 }, colors: [success],
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0,100] } },
      tooltip: { enabled: false },
    });
    c.render(); instances.push(c);
  }

  // Inventory Value sparkline
  const ivEl = document.getElementById("inv-value-spark");
  if (ivEl) {
    ivEl.innerHTML = "";
    const c = new ApexCharts(ivEl, {
      chart: { type: "area", height: 80, width: "100%", sparkline: { enabled: true } },
      series: [{ data: [22,28,25,32,30,36,28,22,30,24,28,26] }],
      stroke: { curve: "smooth", width: 2 }, colors: [orange],
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0,100] } },
      tooltip: { enabled: false },
    });
    c.render(); instances.push(c);
  }

  // Category Distribution horizontal bar
  const catEl = document.getElementById("inv-category-chart");
  if (catEl) {
    catEl.innerHTML = "";
    const c = new ApexCharts(catEl, {
      chart: { type: "bar", height: 240, width: "100%", toolbar: { show: false } },
      series: [{ data: [110, 95, 78, 62, 55, 38] }],
      xaxis: {
        categories: ["Electronics","Clothing","Machines","Sports","Bikes","Books"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { color: "var(--color-border-color)" }, axisTicks: { color: "var(--color-border-color)" },
      },
      yaxis: { labels: { offsetX: 0, style: { colors: gray400, fontSize: "11px" } } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4, padding: { left: 0, right: -2, top: 0, bottom: 0 } },
      plotOptions: { bar: { horizontal: true, barHeight: "55%", borderRadius: 3, distributed: false } },
      colors: [success], legend: { show: false }, dataLabels: { enabled: false },
      tooltip: { theme: "dark" },
      responsive: [{
        breakpoint: 640,
        options: {
          chart: { height: 180 },
          xaxis: { labels: { style: { fontSize: "9px" } } },
          yaxis: { labels: { style: { fontSize: "9px" } } },
        },
      }],
    });
    c.render(); instances.push(c);
  }

  // Product Stock Levels combo bar+line
  const slEl = document.getElementById("inv-stock-levels-chart");
  if (slEl) {
    slEl.innerHTML = "";
    const c = new ApexCharts(slEl, {
      chart: { type: "line", height: 240, width: "100%", toolbar: { show: false } },
      series: [
        { name: "Total Products", type: "bar", data: [220,240,200,260,728,320,280,360,410,340,290,370] },
        { name: "Out Of Stock",   type: "line", data: [60,80,50,90,24,110,70,130,150,100,80,120] },
      ],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { labels: { offsetX: -15, style: { colors: gray400, fontSize: "11px" } } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4, padding: { left: 0, right: -10, top: 0, bottom: 0 } },
      plotOptions: { bar: { columnWidth: "40%", borderRadius: 3 } },
      stroke: { width: [0, 2], curve: "smooth" },
      colors: [success, orange], legend: { show: false }, dataLabels: { enabled: false },
      tooltip: { theme: "dark", shared: true, intersect: false },
      responsive: mobileResponsive(180),
    });
    c.render(); instances.push(c);
  }

  // Inventory Value full area
  const ivfEl = document.getElementById("inv-value-chart");
  if (ivfEl) {
    ivfEl.innerHTML = "";
    const c = new ApexCharts(ivfEl, {
      chart: { type: "area", height: 320, width: "100%", toolbar: { show: false } },
      series: [{ name: "Inventory Value", data: [320,410,380,460,568,420,510,480,540,460,520,580] }],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "11px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { tickAmount: 7, labels: { offsetX: -15, style: { colors: gray400, fontSize: "11px" } } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      stroke: { curve: "smooth", width: 2 }, colors: [success],
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0,100] } },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", y: { formatter: (v: number) => "$" + (v * 100).toLocaleString("en-US", { minimumFractionDigits: 2 }) } },
      markers: { size: 0 },
      responsive: mobileResponsive(220),
    });
    c.render(); instances.push(c);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}

// ─── CRM Dashboard Charts ────────────────────────────────────────────────────
export function initCrmCharts(): () => void {
  const instances: ApexCharts[] = [];
  const success = cv("--color-success") || "#059669";
  const orange  = cv("--color-orange")  || "#E65100";
  const pink    = cv("--color-pink")    || "#CC25B0";
  const purple  = cv("--color-purple")  || "#6A1B9A";
  const info    = cv("--color-info")    || "#0EA5E9";
  const warning = cv("--color-warning") || "#D97706";
  const dark    = cv("--color-dark")    || "#1E293B";
  const gray400 = cv("--color-gray-400")|| "#9096A1";

  // Leads Generated combo bar+line
  const lgEl = document.getElementById("crm-leads-generated-chart");
  if (lgEl) {
    lgEl.innerHTML = "";
    const c = new ApexCharts(lgEl, {
      chart: { type: "line", height: 250, toolbar: { show: false } },
      series: [
        { name: "No of Leads Generated", type: "bar",  data: [320,410,450,380,520,480,580,510,620,720,540,690] },
        { name: "No of Leads Expected",  type: "line", data: [380,440,420,460,500,520,560,540,600,680,580,650] },
      ],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { tickAmount: 7, min: 0, max: 700, labels: { offsetX: -15, style: { colors: gray400, fontSize: "11px" } } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4, padding: { left: 0, right: -15, top: 0, bottom: 0 } },
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 3 } },
      stroke: { width: [0, 2], curve: "smooth" },
      colors: [success, orange],
      fill: { type: ["gradient", "solid"], gradient: { type: "vertical", shade: "light", shadeIntensity: 0.3, gradientToColors: [pink], opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] } },
      legend: { show: false }, dataLabels: { enabled: false },
      tooltip: { theme: "dark", shared: true, intersect: false },
      responsive: mobileResponsive(180),
    });
    c.render(); instances.push(c);
  }

  // Contact By Sources donut
  const csEl = document.getElementById("crm-contact-sources-chart");
  if (csEl) {
    csEl.innerHTML = "";
    const c = new ApexCharts(csEl, {
      chart: {
        type: "donut", height: 215, width: 215,
        events: {
          dataPointMouseEnter(_: any, ctx: any, cfg: any) {
            const v = ctx.w.globals.series[cfg.dataPointIndex];
            const l = ctx.w.globals.labels[cfg.dataPointIndex];
            const vn = document.querySelector("#crm-contact-sources-chart .apexcharts-datalabel-value");
            const ln = document.querySelector("#crm-contact-sources-chart .apexcharts-datalabel-label");
            if (vn) (vn as HTMLElement).textContent = v + "%";
            if (ln) (ln as HTMLElement).textContent = l;
          },
          dataPointMouseLeave() {
            const vn = document.querySelector("#crm-contact-sources-chart .apexcharts-datalabel-value");
            const ln = document.querySelector("#crm-contact-sources-chart .apexcharts-datalabel-label");
            if (vn) (vn as HTMLElement).textContent = "25%";
            if (ln) (ln as HTMLElement).textContent = "Organic Search";
          },
        },
      },
      series: [25, 15, 15, 10, 15, 20],
      labels: ["Organic Search","Campaigns","Referral","Marketing","Paid Social","Events"],
      colors: [info, orange, success, pink, purple, warning],
      grid: { padding: { top: 0, bottom: -10, left: -5, right: 0 } },
      stroke: { width: 0 },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              name: { show: true, fontSize: "11px", color: gray400, offsetY: 20 },
              value: { show: true, fontSize: "22px", fontWeight: 700, color: dark, offsetY: -12 },
              total: {
                show: true, showAlways: true, label: "Organic Search",
                fontSize: "11px", fontWeight: 400, color: gray400,
                formatter: () => "25%",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
    });
    c.render(); instances.push(c);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}

// ─── Sales Dashboard Charts ──────────────────────────────────────────────────
export function initSalesCharts(): () => void {
  const instances: ApexCharts[] = [];
  const success = cv("--color-success") || "#059669";
  const orange  = cv("--color-orange")  || "#E65100";
  const gray400 = cv("--color-gray-400")|| "#9096A1";

  const srtEl = document.getElementById("sales-revenue-trends-chart");
  if (srtEl) {
    srtEl.innerHTML = "";
    const data = [180,220,320,380,540,850,480,600,540,720,660,580];
    const maxIdx = data.indexOf(Math.max(...data));
    const c = new ApexCharts(srtEl, {
      chart: { type: "bar", height: 340, toolbar: { show: false } },
      series: [{ name: "Revenue", data }],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "11px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { tickAmount: 5, labels: { style: { colors: gray400, fontSize: "11px" }, formatter: (v: number) => v >= 1000 ? (v/1000) + "M" : v + "K" } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 3, distributed: true } },
      colors: data.map((_, i) => i === maxIdx ? orange : "#F8E6D6"),
      legend: { show: false }, dataLabels: { enabled: false },
      tooltip: { theme: "dark", y: { formatter: (v: number) => "$" + v + "K" } },
      responsive: mobileResponsive(240),
    });
    c.render(); instances.push(c);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}

// ─── Procurement Dashboard Charts ────────────────────────────────────────────
export function initProcurementCharts(): () => void {
  const instances: ApexCharts[] = [];
  const success = cv("--color-success") || "#059669";
  const orange  = cv("--color-orange")  || "#E65100";
  const pink    = cv("--color-pink")    || "#CC25B0";
  const purple  = cv("--color-purple")  || "#6A1B9A";
  const info    = cv("--color-info")    || "#0EA5E9";
  const dark    = cv("--color-dark")    || "#1E293B";
  const gray400 = cv("--color-gray-400")|| "#9096A1";

  // Sparklines
  [
    { id: "proc-spark-1", color: success, data: [12,14,13,18,16,22,19,25,21,28,24,32] },
    { id: "proc-spark-2", color: purple,  data: [22,18,24,20,28,24,30,26,32,28,36,30] },
    { id: "proc-spark-3", color: orange,  data: [14,18,16,22,20,26,23,30,26,32,28,36] },
    { id: "proc-spark-4", color: pink,    data: [18,22,19,26,22,30,26,32,28,36,30,38] },
  ].forEach((s) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    el.innerHTML = "";
    const c = new ApexCharts(el, {
      chart: { type: "area", height: 60, sparkline: { enabled: true } },
      series: [{ data: s.data }],
      stroke: { curve: "smooth", width: 2 }, colors: [s.color],
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0,100] } },
      tooltip: { enabled: false },
    });
    c.render(); instances.push(c);
  });

  // Top Suppliers horizontal bar
  const tsEl = document.getElementById("proc-top-suppliers-chart");
  if (tsEl) {
    tsEl.innerHTML = "";
    const c = new ApexCharts(tsEl, {
      chart: { type: "bar", height: 280, toolbar: { show: false } },
      series: [{ data: [48, 38, 30, 24, 17, 10] }],
      xaxis: {
        categories: ["Alpha Distributors","Beta Industries","Zenith Supplies","Orion Equipments","Stellar Tools","Denny Shoes"],
        labels: { style: { colors: gray400, fontSize: "10px" }, formatter: (v: any) => v + "k" },
      },
      yaxis: { labels: { style: { colors: gray400, fontSize: "11px" } } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      plotOptions: { bar: { horizontal: true, barHeight: "55%", borderRadius: 3 } },
      colors: [success], legend: { show: false }, dataLabels: { enabled: false },
      tooltip: { theme: "dark", y: { formatter: (v: number) => "$" + v + "k" } },
      responsive: [{
        breakpoint: 640,
        options: {
          chart: { height: 200 },
          yaxis: { labels: { style: { fontSize: "9px" } } },
        },
      }],
    });
    c.render(); instances.push(c);
  }

  // Monthly Spend area
  const msEl = document.getElementById("proc-monthly-spend-chart");
  if (msEl) {
    msEl.innerHTML = "";
    const c = new ApexCharts(msEl, {
      chart: { type: "area", height: 280, toolbar: { show: false } },
      series: [{ name: "Expense", data: [38,28,42,30,50,36,42,28,38,30,36,28] }],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: gray400, fontSize: "11px" }, formatter: (v: number) => v + "K" } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      stroke: { curve: "smooth", width: 2 }, colors: [orange],
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0,100] } },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", y: { formatter: (v: number) => "Expense : $" + (v * 200) } },
      markers: { size: 0 },
      responsive: mobileResponsive(200),
    });
    c.render(); instances.push(c);
  }

  // Supplier Performance bubble
  const spEl = document.getElementById("proc-supplier-perf-chart");
  if (spEl) {
    spEl.innerHTML = "";
    const c = new ApexCharts(spEl, {
      chart: { type: "bubble", height: 220, toolbar: { show: false } },
      series: [
        { name: "Quality",         data: [[15,70,14],[38,80,18],[55,65,12],[75,85,16],[90,50,10]] },
        { name: "Cost Efficiency", data: [[20,45,12],[42,55,14],[60,40,10],[80,60,12],[95,35,16]] },
      ],
      xaxis: {
        tickAmount: 6, min: 0, max: 100,
        labels: { style: { colors: gray400, fontSize: "10px" }, formatter: (v: any) => v + "K" },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { min: 0, max: 100, tickAmount: 5, labels: { style: { colors: gray400, fontSize: "11px" } } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      colors: [info, orange], legend: { show: false }, dataLabels: { enabled: false },
      fill: { opacity: 0.6 }, tooltip: { theme: "dark" },
      responsive: mobileResponsive(170),
    });
    c.render(); instances.push(c);
  }

  // Spend by Category semi-donut
  const scEl = document.getElementById("proc-spend-cat-chart");
  if (scEl) {
    const chartHeight = 320;
    const clipHeight  = chartHeight / 2 + 20;
    scEl.style.marginBottom = `-${chartHeight / 2 + 20}px`;
    if (!scEl.parentElement?.classList.contains("semi-donut-wrapper")) {
      const wrapper = document.createElement("div");
      wrapper.className = "semi-donut-wrapper";
      wrapper.style.cssText = `position:relative;overflow:hidden;height:${clipHeight}px;width:100%;`;
      scEl.parentNode!.insertBefore(wrapper, scEl);
      wrapper.appendChild(scEl);
    }
    scEl.innerHTML = "";
    const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const darkColor = isDark ? "#f0f0f0" : "#1a1a1a";
    const c = new ApexCharts(scEl, {
      chart: { type: "donut", height: chartHeight, width: "100%", toolbar: { show: false } },
      series: [42, 38, 20], labels: ["", "", ""],
      colors: ["#E8920A", "#1D9E75", "#5DCAA5"],
      stroke: { width: 2, colors: ["#fff"] }, legend: { show: false },
      plotOptions: {
        pie: {
          startAngle: -90, endAngle: 90, offsetY: 10,
          donut: { size: "65%", labels: { show: false,
            value: { show: true, fontSize: "28px", fontWeight: 700, color: darkColor, offsetY: -10, formatter: () => "42%" },
            total: { show: false, showAlways: true, label: "", fontSize: "28px", fontWeight: 700, color: darkColor, formatter: () => "42%" },
          }},
        },
      },
      dataLabels: { enabled: false },
      tooltip: { enabled: true, fillSeriesColor: false,
        custom: ({ series, seriesIndex, w }: any) => {
          const label = w.globals.labels[seriesIndex];
          const value = series[seriesIndex];
          const color = w.globals.colors[seriesIndex];
          return `<div style="background:#fff;border:none;border-radius:5px;padding:10px 14px;display:flex;align-items:center;gap:8px;font-family:sans-serif;min-width:30px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
            <span style="color:#555;font-size:13px;">${label}:</span>
            <span style="color:#111;font-size:13px;font-weight:700;margin-left:auto;">${value}%</span>
          </div>`;
        },
      },
      states: { hover: { filter: { type: "darken", value: 0.85 } }, active: { filter: { type: "darken", value: 0.75 } } },
    });
    c.render(); instances.push(c);
  }

  // Order Status multi-ring donut (fin-revenue-donut style)
  const orEl = document.getElementById("proc-order-status-chart");
  if (orEl) {
    orEl.innerHTML = "";
    const c = new ApexCharts(orEl, {
      chart: { type: "donut", height: 220, toolbar: { show: false } },
      series: [44, 28, 18, 10],
      labels: ["Completed","Processing","Pending","Cancelled"],
      colors: [success, info, orange, pink],
      stroke: { width: 0 }, legend: { show: false }, dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: "72%", labels: {
        show: true,
        name: { show: true, fontSize: "11px", color: gray400, offsetY: 20 },
        value: { show: true, fontSize: "22px", fontWeight: 700, color: dark, offsetY: -12 },
        total: { show: true, showAlways: true, label: "Completed", fontSize: "11px", fontWeight: 400, color: gray400, formatter: () => "44%" },
      }}}},
      tooltip: { theme: "dark" },
    });
    c.render(); instances.push(c);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}

// ─── Finance Dashboard Charts ────────────────────────────────────────────────
export function initFinanceCharts(): () => void {
  const instances: ApexCharts[] = [];
  const success = cv("--color-success") || "#059669";
  const orange  = cv("--color-orange")  || "#E65100";
  const info    = cv("--color-info")    || "#0EA5E9";
  const pink    = cv("--color-pink")    || "#CC25B0";
  const dark    = cv("--color-dark")    || "#1E293B";
  const gray400 = cv("--color-gray-400")|| "#9096A1";

  // Revenue vs Expense
  const rvEl = document.getElementById("fin-rev-exp-chart") || document.getElementById("fin-revenue-expense-chart");
  if (rvEl) {
    rvEl.innerHTML = "";
    const c = new ApexCharts(rvEl, {
      chart: { type: "bar", height: 280, toolbar: { show: false } },
      series: [
        { name: "Revenue", data: [320,410,380,460,568,420,510,480,540,460,520,580] },
        { name: "Expense", data: [180,220,200,260,310,240,290,270,310,260,290,320] },
      ],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { labels: { offsetX: -15, style: { colors: gray400, fontSize: "11px" }, formatter: (v: number) => v + "K" } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
      colors: [success, orange], legend: { show: false }, dataLabels: { enabled: false },
      tooltip: { theme: "dark", shared: true, intersect: false, y: { formatter: (v: number) => "$" + v + "K" } },
      responsive: mobileResponsive(200),
    });
    c.render(); instances.push(c);
  }

  // Revenue donut (center 73%)
  const rdEl = document.getElementById("fin-revenue-donut");
  if (rdEl) {
    rdEl.innerHTML = "";
    const c = new ApexCharts(rdEl, {
      chart: {
        type: "donut", height: 200,
        events: {
          dataPointMouseEnter(_: any, ctx: any, cfg: any) {
            const values = [73, 27]; const labels = ["Revenue","Remaining"];
            const vn = document.querySelector("#fin-revenue-donut .apexcharts-datalabel-value");
            const ln = document.querySelector("#fin-revenue-donut .apexcharts-datalabel-label");
            if (vn) (vn as HTMLElement).textContent = values[cfg.dataPointIndex] + "%";
            if (ln) (ln as HTMLElement).textContent = labels[cfg.dataPointIndex];
          },
          dataPointMouseLeave() {
            const vn = document.querySelector("#fin-revenue-donut .apexcharts-datalabel-value");
            const ln = document.querySelector("#fin-revenue-donut .apexcharts-datalabel-label");
            if (vn) (vn as HTMLElement).textContent = "73%";
            if (ln) (ln as HTMLElement).textContent = "Sales";
          },
        },
      },
      series: [73, 27], labels: ["Revenue","Remaining"],
      colors: [info, "#E2E8F0"],
      stroke: { width: 4, colors: ["var(--color-white)"] },
      dataLabels: { enabled: false }, legend: { show: false },
      tooltip: { enabled: false },
      plotOptions: {
        pie: { donut: { size: "78%", labels: {
          show: true,
          name: { show: true, offsetY: 14, fontSize: "14px", fontWeight: 400, color: "#6B7280" },
          value: { show: true, offsetY: -20, fontSize: "18px", fontWeight: 700, color: "#374151", formatter: (v: any) => parseInt(v) + "%" },
          total: { show: true, showAlways: true, label: "Sales", fontSize: "10px", fontWeight: 400, color: gray400, formatter: () => "73%" },
        }}},
      },
    });
    c.render(); instances.push(c);
  }

  // Profit Margin vs Sales
  const pfEl = document.getElementById("fin-profit-sales-chart");
  if (pfEl) {
    pfEl.innerHTML = "";
    const c = new ApexCharts(pfEl, {
      chart: { type: "line", height: 240, toolbar: { show: false } },
      series: [
        { name: "Profit Margin", data: [55,48,50,32,40,38,45,35,25,28,22,30] },
        { name: "Sales",         data: [25,22,28,35,30,38,32,45,42,55,48,60] },
      ],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: gray400, fontSize: "11px" }, formatter: (v: number) => v + "K" } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      stroke: { curve: "smooth", width: [2.5, 2.5] },
      colors: [orange, success], legend: { show: false }, dataLabels: { enabled: false },
      tooltip: { theme: "dark", shared: true, intersect: false },
      markers: { size: 0 },
      responsive: mobileResponsive(180),
    });
    c.render(); instances.push(c);
  }

  // Expense donut (center 50% Salaries)
  const edEl = document.getElementById("fin-expense-donut");
  if (edEl) {
    edEl.innerHTML = "";
    const c = new ApexCharts(edEl, {
      chart: {
        type: "donut", height: 200,
        events: {
          dataPointMouseEnter(_: any, ctx: any, cfg: any) {
            const values = [50,30,20]; const labels = ["Salaries","Miscellaneous","Marketing"];
            const vn = document.querySelector("#fin-expense-donut .apexcharts-datalabel-value");
            const ln = document.querySelector("#fin-expense-donut .apexcharts-datalabel-label");
            if (vn) (vn as HTMLElement).textContent = values[cfg.dataPointIndex] + "%";
            if (ln) (ln as HTMLElement).textContent = labels[cfg.dataPointIndex];
          },
          dataPointMouseLeave() {
            const vn = document.querySelector("#fin-expense-donut .apexcharts-datalabel-value");
            const ln = document.querySelector("#fin-expense-donut .apexcharts-datalabel-label");
            if (vn) (vn as HTMLElement).textContent = "50%";
            if (ln) (ln as HTMLElement).textContent = "Salaries";
          },
        },
      },
      series: [50, 30, 20], labels: ["Salaries","Miscellaneous","Marketing"],
      colors: ["#E28A34","#3D8C84","#7B3FB3"],
      stroke: { width: 4, colors: ["var(--color-white)"] },
      dataLabels: { enabled: false }, legend: { show: false }, tooltip: { enabled: false },
      plotOptions: {
        pie: { donut: { size: "78%", labels: {
          show: true,
          name: { show: true, offsetY: 14, fontSize: "14px", fontWeight: 400, color: "#6B7280" },
          value: { show: true, offsetY: -20, fontSize: "18px", fontWeight: 700, color: "#374151", formatter: (v: any) => parseInt(v) + "%" },
          total: { show: true, showAlways: true, label: "Salaries", formatter: () => "50%" },
        }}},
      },
    });
    c.render(); instances.push(c);
    setTimeout(() => {
      const ln = document.querySelector("#fin-expense-donut .apexcharts-datalabel-label");
      if (ln) (ln as HTMLElement).textContent = "Salaries";
    }, 300);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}

// ─── Project Dashboard Charts ─────────────────────────────────────────────────
export function initProjectCharts(): () => void {
  const instances: ApexCharts[] = [];
  const primary = cv("--color-primary") || "#0F766E";
  const success = cv("--color-success") || "#059669";
  const info    = cv("--color-info")    || "#0EA5E9";
  const orange  = cv("--color-orange")  || "#E65100";
  const warning = cv("--color-warning") || "#F59E0B";
  const danger  = cv("--color-danger")  || "#DC2626";
  const purple  = cv("--color-purple")  || "#8B5CF6";
  const gray400 = cv("--color-gray-400")|| "#9096A1";
  const dark    = cv("--color-dark")    || "#1E293B";

  // 1. 4 KPI bar sparklines
  const sparks = [
    { id: "pj-spark-1", color: orange, data: [4,6,3,7,5,8,4,9,5,7,4,8,5,6,3,7,5,8,4,9,5,7,4,8,5,6] },
    { id: "pj-spark-2", color: info,   data: [5,3,6,4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5] },
    { id: "pj-spark-3", color: purple, data: [4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9] },
    { id: "pj-spark-4", color: success,data: [6,4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6] },
  ];
  sparks.forEach((s) => {
    const el = document.getElementById(s.id);
    if (el) {
      el.innerHTML = "";
      const c = new ApexCharts(el, {
        chart: { type: "bar", height: 60, sparkline: { enabled: true } },
        series: [{ data: s.data }],
        plotOptions: { bar: { columnWidth: "50%", borderRadius: 1 } },
        colors: [s.color],
        tooltip: { enabled: false },
      });
      c.render();
      instances.push(c);
    }
  });

  // 2. Projects Progress 4-line chart
  const progEl = document.getElementById("pj-progress-chart");
  if (progEl) {
    progEl.innerHTML = "";
    const c = new ApexCharts(progEl, {
      chart: { type: "line", height: 200, toolbar: { show: false } },
      series: [
        { name: "Completed",       data: [30, 40, 35, 50, 25, 55, 70, 60, 75, 80, 70, 65] },
        { name: "Inprogress",      data: [20, 30, 25, 35, 19, 40, 45, 50, 55, 45, 50, 40] },
        { name: "Not Started Yet", data: [40, 30, 35, 20, 19, 30, 25, 35, 25, 30, 35, 30] },
        { name: "Cancelled",       data: [60, 50, 55, 40, 70, 50, 45, 55, 50, 60, 65, 55] },
      ],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { style: { colors: gray400, fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { min: 0, max: 100, tickAmount: 5, labels: { offsetX: -15, style: { colors: gray400, fontSize: "11px" } } },
      grid: { borderColor: "var(--color-border-color)", strokeDashArray: 4 },
      stroke: { curve: "smooth", width: 2 },
      colors: [success, info, warning, danger],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", shared: true, intersect: false },
      markers: { size: 4, hover: { size: 6 } },
      responsive: mobileResponsive(160),
    });
    c.render();
    instances.push(c);
  }

  // 3. Task Summary donut
  const taskEl = document.getElementById("pj-task-summary-chart");
  if (taskEl) {
    taskEl.innerHTML = "";
    const c = new ApexCharts(taskEl, {
      chart: {
        type: "donut",
        height: 150,
        width: 150,
        events: {
          dataPointMouseEnter: function(_event: any, chartContext: any, config: any) {
            const seriesIndex = config.dataPointIndex;
            const hoveredValue = chartContext.w.globals.series[seriesIndex];
            const hoveredLabel = chartContext.w.globals.labels[seriesIndex];
            const totalValNode = document.querySelector("#pj-task-summary-chart .apexcharts-datalabel-value");
            const totalLblNode = document.querySelector("#pj-task-summary-chart .apexcharts-datalabel-label");
            if (totalValNode) totalValNode.textContent = hoveredValue + "%";
            if (totalLblNode) totalLblNode.textContent = hoveredLabel;
          },
          dataPointMouseLeave: function() {
            const totalValNode = document.querySelector("#pj-task-summary-chart .apexcharts-datalabel-value");
            const totalLblNode = document.querySelector("#pj-task-summary-chart .apexcharts-datalabel-label");
            if (totalValNode) totalValNode.textContent = "40%";
            if (totalLblNode) totalLblNode.textContent = "Completed";
          },
        },
      },
      series: [30, 25, 20, 15, 10],
      labels: ["Completed", "Pending", "In Progress", "Active", "Cancelled"],
      colors: [success, orange, info, purple, danger],
      stroke: { width: 0 },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "75%",
            labels: {
              show: true,
              name: { show: true, fontSize: "11px", color: gray400, offsetY: 20 },
              value: { show: true, fontSize: "24px", fontWeight: 700, color: dark, offsetY: -10 },
              total: {
                show: true,
                showAlways: true,
                label: "Completed",
                fontSize: "11px",
                color: gray400,
                formatter: () => "40%",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
    });
    c.render();
    instances.push(c);
  }

  // 4. Resource Utilization heatmap
  const resEl = document.getElementById("resource-chart");
  if (resEl) {
    resEl.innerHTML = "";
    const c = new ApexCharts(resEl, {
      chart: {
        type: "heatmap",
        height: 230,
        toolbar: { show: false },
      },
      series: [
        { name: "Admin",    data: [{x: "0%", y: 0}, {x: "20%", y: 0}, {x: "40%", y: 0}, {x: "60%", y: 0}, {x: "80%", y: 0}] },
        { name: "Devops",   data: [{x: "0%", y: 1}, {x: "20%", y: 1}, {x: "40%", y: 0}, {x: "60%", y: 0}, {x: "80%", y: 0}] },
        { name: "Document", data: [{x: "0%", y: 1}, {x: "20%", y: 0}, {x: "40%", y: 0}, {x: "60%", y: 0}, {x: "80%", y: 0}] },
        { name: "Testing",  data: [{x: "0%", y: 1}, {x: "20%", y: 2}, {x: "40%", y: 3}, {x: "60%", y: 4}, {x: "80%", y: 0}] },
        { name: "Backend",  data: [{x: "0%", y: 1}, {x: "20%", y: 2}, {x: "40%", y: 0}, {x: "60%", y: 0}, {x: "80%", y: 0}] },
        { name: "Frontend", data: [{x: "0%", y: 1}, {x: "20%", y: 2}, {x: "40%", y: 0}, {x: "60%", y: 0}, {x: "80%", y: 0}] },
        { name: "UI/UX",    data: [{x: "0%", y: 1}, {x: "20%", y: 2}, {x: "40%", y: 3}, {x: "60%", y: 4}, {x: "80%", y: 5}] },
      ],
      plotOptions: {
        heatmap: {
          radius: 6,
          enableShades: false,
          useFillColorAsStroke: false,
          colorScale: {
            ranges: [
              { from: 0, to: 0, color: "#f1f5f9" },
              { from: 1, to: 1, color: "#a3dec9" },
              { from: 2, to: 2, color: "#7bcfae" },
              { from: 3, to: 3, color: "#4cb991" },
              { from: 4, to: 4, color: "#1ca175" },
              { from: 5, to: 5, color: "#00966b" },
            ],
          },
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 5, colors: ["var(--color-white)"] },
      grid: { show: false, padding: { top: -10, right: -10, bottom: 0, left: 0 } },
      xaxis: {
        type: "category",
        categories: ["0%", "20%", "40%", "60%", "80%"],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: "#94a3b8", fontSize: "12px", fontFamily: "sans-serif" } },
      },
      yaxis: {
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { offsetX: -10, style: { colors: "#64748b", fontSize: "12px", fontFamily: "sans-serif" } },
      },
      tooltip: {
        theme: "light",
        custom: function({ seriesIndex, w }: any) {
          const labelName = w.globals.seriesNames[seriesIndex];
          const valueMap: Record<string, number> = {
            Admin: 0,
            Devops: 40,
            Document: 20,
            Testing: 80,
            Backend: 40,
            Frontend: 50,
            "UI/UX": 100,
          };
          const displayVal = valueMap[labelName] || 0;
          return `
            <div style="padding: 10px 14px; background: #fff; border-radius: 6px; border: 1px solid var(--color-border-color); font-family: sans-serif;">
              <span style="font-weight: 600; color: #1e293b;">${labelName}:</span> 
              <span style="color: #00966b; font-weight: 700;">${displayVal}%</span>
            </div>
          `;
        },
      },
      responsive: mobileResponsive(180),
    });
    c.render();
    instances.push(c);
  }

  // Fallback support for legacy ids if any
  const psEl = document.getElementById("proj-status-chart");
  if (psEl) {
    psEl.innerHTML = "";
    const c = new ApexCharts(psEl, {
      chart: { type: "bar", height: 280, toolbar: { show: false } },
      series: [
        { name: "Inprogress", data: [19,65,19,19,19,19,19] },
        { name: "Active",     data: [89,45,89,46,61,25,79] },
        { name: "Completed",  data: [39,39,39,80,48,48,48] },
      ],
      xaxis: { categories: ["15 Jan","16 Jan","17 Jan","18 Jan","19 Jan","20 Jan","21 Jan"] },
      colors: [primary, success, orange],
    });
    c.render();
    instances.push(c);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}

// ─── Support Dashboard Charts ─────────────────────────────────────────────────
export function initSupportCharts(): () => void {
  const instances: ApexCharts[] = [];
  const success = cv("--color-success") || "#059669";
  const info    = cv("--color-info")    || "#0EA5E9";
  const orange  = cv("--color-orange")  || "#E65100";
  const danger  = cv("--color-danger")  || "#DC2626";
  const purple  = cv("--color-purple")  || "#8B5CF6";
  const gray400 = cv("--color-gray-400")|| "#9096A1";
  const dark    = cv("--color-dark")    || "#1E293B";

  // 1. Ticket Volume — overlay bars (Resolved over Created)
  const tvEl = document.getElementById("sup-ticket-volume-chart");
  if (tvEl) {
    tvEl.innerHTML = "";
    const c = new ApexCharts(tvEl, {
      chart: {
        type: "bar",
        height: 280,
        stacked: false,
        toolbar: { show: false },
      },
      series: [
        {
          name: "Tickets Created",
          data: [42, 54, 18, 50, 72, 32, 70, 81, 87, 75, 50, 42],
        },
        {
          name: "Tickets Resolved",
          data: [26, 16, 10, 2, 24, 6, 20, 26, 49, 31, 31, 26],
        },
      ],
      colors: [cv("--color-light") || "#EAEFF0", success],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "52%",
          rangeBarOverlap: true,
          borderRadius: 4,
          borderRadiusApplication: "around",
          borderRadiusWhenStacked: "all",
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: {
        show: true,
        borderColor: "var(--color-border-color)",
        strokeDashArray: 3,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 0, right: 0, top: 0, bottom: -10 },
      },
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: gray400, fontSize: "12px", fontFamily: "sans-serif" } },
      },
      yaxis: {
        tickAmount: 5,
        min: 0,
        max: 100,
        labels: { offsetX: -20, style: { colors: gray400, fontSize: "12px" } },
      },
      tooltip: {
        theme: "dark",
        shared: false,
        intersect: true,
        x: { show: true },
        y: {
          formatter: function (val: number) {
            return val + " Tickets";
          },
        },
      },
      responsive: mobileResponsive(200),
    });
    c.render();
    instances.push(c);
  }

  // 2. SLA Breaches pie
  const slaEl = document.getElementById("sup-sla-pie");
  if (slaEl) {
    slaEl.innerHTML = "";
    const c = new ApexCharts(slaEl, {
      chart: { type: "pie", height: 240, width: "100%" },
      series: [70, 30],
      labels: ["SLA Compliant", "SLA Breached"],
      colors: [success, orange],
      stroke: { width: 0 },
      legend: { show: false },
      dataLabels: {
        style: { fontSize: "12px", colors: ["#fff"], fontWeight: 600 },
        formatter: (val: any, opts: any) => opts.w.config.labels[opts.seriesIndex] + "\n" + opts.w.config.series[opts.seriesIndex],
      },
      tooltip: { enabled: true },
    });
    c.render();
    instances.push(c);
  }

  // 3. 4 KPI Sparklines
  const sparks = [
    { id: "sup-spark-1", color: orange, data: [12, 18, 14, 22, 16, 24, 20, 28, 22, 30, 24, 32] },
    { id: "sup-spark-2", color: danger, data: [18, 14, 22, 16, 24, 20, 28, 22, 30, 24, 32, 26] },
    { id: "sup-spark-3", color: success,data: [10, 14, 12, 18, 14, 20, 16, 24, 18, 26, 20, 28] },
    { id: "sup-spark-4", color: purple, data: [14, 18, 16, 22, 18, 26, 20, 28, 22, 30, 24, 32] },
  ];
  sparks.forEach((s) => {
    const el = document.getElementById(s.id);
    if (el) {
      el.innerHTML = "";
      const c = new ApexCharts(el, {
        chart: { type: "area", height: 60, sparkline: { enabled: true } },
        series: [{ data: s.data }],
        stroke: { curve: "smooth", width: 2 },
        colors: [s.color],
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] } },
        tooltip: { enabled: false },
      });
      c.render();
      instances.push(c);
    }
  });

  // 4. Customer Satisfaction gauge (semi-donut)
  const satEl = document.getElementById("sup-satisfaction-gauge");
  if (satEl) {
    satEl.innerHTML = "";
    // Safe container so React fiber parent is never reparented
    const inner = document.createElement("div");
    inner.style.cssText = "position:relative;overflow:hidden;height:180px;width:100%;display:flex;justify-content:center;";
    const chartDiv = document.createElement("div");
    chartDiv.style.cssText = "width:100%;margin-bottom:-140px;";
    inner.appendChild(chartDiv);
    satEl.appendChild(inner);

    const isDark = typeof window !== "undefined" && (document.documentElement.classList.contains("dark") || matchMedia("(prefers-color-scheme: dark)").matches);
    const darkColor = isDark ? "#f0f0f0" : dark;

    const c = new ApexCharts(chartDiv, {
      chart: { type: "donut", height: 320, width: "100%", toolbar: { show: false } },
      series: [42, 38, 20],
      labels: ["Dissatisfied", "Neutral", "Satisfied"],
      colors: ["#b91c1c", "#0ea5e9", "#059669"],
      stroke: { width: 2, colors: ["#fff"] },
      legend: { show: false },
      plotOptions: {
        pie: {
          startAngle: -90,
          endAngle: 90,
          offsetY: 10,
          donut: {
            size: "65%",
            labels: {
              show: true,
              value: {
                show: true,
                fontSize: "28px",
                fontWeight: 700,
                color: darkColor,
                offsetY: -10,
                formatter: () => "42%",
              },
              total: {
                show: true,
                showAlways: true,
                label: "",
                fontSize: "28px",
                fontWeight: 700,
                color: darkColor,
                formatter: () => "42%",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: {
        enabled: true,
        fillSeriesColor: false,
        custom: ({ series, seriesIndex, w }: any) => {
          const label = w.globals.labels[seriesIndex];
          const value = series[seriesIndex];
          const color = w.globals.colors[seriesIndex];
          return `<div style="background:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;border-radius:5px;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
            <span style="width:10px;height:10px;border-radius:50%;background:${color};"></span>
            <span style="color:#555;font-size:13px;">${label}:</span>
            <span style="color:#111;font-size:13px;font-weight:700;">${value}%</span>
          </div>`;
        },
      },
    });
    c.render();
    instances.push(c);
  }

  // 5. Ticket Response Rate stacked area
  const rrEl = document.getElementById("sup-response-rate-chart");
  if (rrEl) {
    rrEl.innerHTML = "";
    const c = new ApexCharts(rrEl, {
      chart: {
        type: "area",
        height: 180,
        stacked: true,
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      series: [
        { name: "Creation Time", data: [3.2, 3.5, 2.9, 3.8, 3.4, 2.7, 3.1, 3.6, 2.8, 3.3, 3.0, 2.9] },
        { name: "Response Time", data: [4.1, 4.3, 4.0, 4.5, 4.2, 3.9, 4.4, 4.6, 4.1, 4.5, 4.2, 4.0] },
      ],
      xaxis: {
        categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        labels: { show: true, style: { colors: gray400, fontSize: "11px", fontFamily: "sans-serif" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
        crosshairs: { show: true, stroke: { color: "#94A3B8", width: 1, dashArray: 3 } },
      },
      yaxis: {
        tickAmount: 4,
        max: 8,
        labels: { offsetX: -15, style: { colors: gray400, fontSize: "11px" }, formatter: (v: number) => v === 0 ? "0" : v + " hrs" },
      },
      grid: { show: false, padding: { left: 0, right: 0, top: 0, bottom: 0 } },
      stroke: { curve: "straight", width: 1.5 },
      colors: [success, orange],
      fill: { type: "solid", opacity: 1 },
      dataLabels: { enabled: false },
      markers: { size: 0 },
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        theme: "light",
        custom: ({ series, dataPointIndex, w }: any) => {
          const month = w.globals.categoryLabels[dataPointIndex];
          const v1 = series[0][dataPointIndex];
          const v2 = series[1][dataPointIndex];
          return `<div style="padding:14px;background:#fff;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.08);font-family:sans-serif;min-width:175px;">
            <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:10px;">${month}</div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;color:#64748b;">
              <span>Creation Time</span><span style="font-weight:700;color:#1e293b;">${Math.round(v1)} hrs</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;">
              <span>Response Time</span><span style="font-weight:700;color:#1e293b;">${Math.round(v2)} hrs</span>
            </div>
          </div>`;
        },
      },
      responsive: mobileResponsive(140),
    });
    c.render();
    instances.push(c);
  }

  return () => { instances.forEach((c) => c.destroy()); };
}
