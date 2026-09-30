	
	'use strict';
	
	document.addEventListener('DOMContentLoaded', function () {
			const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
			const primary = cssVar('--color-primary') || '#0F766E';
			const success = cssVar('--color-success') || '#059669';
			const orange  = cssVar('--color-orange')  || '#E65100';
			const pink    = cssVar('--color-pink')    || '#CC25B0';
			const dark    = cssVar('--color-dark')    || '#1E293B';
			const gray400 = cssVar('--color-gray-400')|| '#9096A1';
				const warning = cssVar('--color-warning') || '#D97706';
				const purple  = cssVar('--color-purple')  || '#6A1B9A';
				const info    = cssVar('--color-info')    || '#0EA5E9';
			const border  = cssVar('--color-border-color') || '#E8E9EC';


			// Employee Distribution (donut)
			if (document.getElementById('employee-distribution-chart')) {
				new ApexCharts(document.getElementById('employee-distribution-chart'), {
					chart: { 
						type: 'donut', 
						height: 150, 
						width: 150,
						events: {
							// Triggered when hovering over a specific donut slice
							dataPointMouseEnter: function(event, chartContext, config) {
								const seriesIndex = config.dataPointIndex;
								const hoveredValue = chartContext.w.globals.series[seriesIndex];
								const hoveredLabel = chartContext.w.globals.labels[seriesIndex];

								// Safely locate ApexCharts built-in center label nodes
								const totalValNode = document.querySelector('#employee-distribution-chart .apexcharts-datalabel-value');
								const totalLblNode = document.querySelector('#employee-distribution-chart .apexcharts-datalabel-label');
								
								if (totalValNode) totalValNode.textContent = hoveredValue.toLocaleString();
								if (totalLblNode) totalLblNode.textContent = hoveredLabel;
							},
							// Triggered when the mouse leaves a slice entirely
							dataPointMouseLeave: function(event, chartContext, config) {
								const totalValNode = document.querySelector('#employee-distribution-chart .apexcharts-datalabel-value');
								const totalLblNode = document.querySelector('#employee-distribution-chart .apexcharts-datalabel-label');
								
								if (totalValNode) totalValNode.textContent = '1,284';
								if (totalLblNode) totalLblNode.textContent = 'Employees';
							}
						}
					},
					grid: {
						padding: {
							top: 0,
							right: 0,
							bottom: -10,
							left: 0
						}
					},
					series: [488, 282, 231, 180, 103],
					labels: ['Engineering', 'Marketing', 'Finance', 'Sales', 'HR'],
					colors: [primary, orange, success, pink, dark],
					stroke: { width: 0 },
					legend: { show: false },
					plotOptions: {
						pie: {
							donut: {
								size: '72%',
								labels: {
									show: true,
									name: { show: true, fontSize: '10px', color: gray400, offsetY: 18 }, 
									value: { show: true, fontSize: '18px', fontWeight: 700, color: dark, offsetY: -10 },
									total: {
										show: true,
										showAlways: true,
										label: 'Employees',
										fontSize: '10px',
										fontWeight: 400,
										color: gray400,
										formatter: function() {
											return '1,284';
										}
									}
								}
							}
						}
					},
					dataLabels: { enabled: false },
					tooltip: { enabled: false }
				}).render();
			}

			// Weekly Attendance Trend (bar)
			if (document.getElementById('weekly-attendance-chart')) {
				new ApexCharts(document.getElementById('weekly-attendance-chart'), {
					chart: { type: 'bar', height: 110, toolbar: { show: false }, sparkline: { enabled: false } },
					series: [{ name: 'Present', data: [86, 92, 88, 78, 95, 70, 45] }],
					xaxis: {
						categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
						labels: { style: { colors: gray400, fontSize: '10px' } },
						axisBorder: { show: false },
						axisTicks: { show: false }
					},
					yaxis: { show: false },
					grid: { show: false, padding: { left: 0, right: 0, top: -20, bottom: 0 } },
					plotOptions: {
						bar: { columnWidth: '50%', borderRadius: 3, distributed: true }
					},
					colors: [primary, primary, primary, orange, primary, primary, primary],
					legend: { show: false },
					dataLabels: { enabled: false },
					tooltip: { y: { formatter: v => v + '%' } }
				}).render();
			}

			// 6-Month Payroll Trend (area)
			if (document.getElementById('payroll-trend-chart')) {
				new ApexCharts(document.getElementById('payroll-trend-chart'), {
					chart: {
						type: 'area', height: 80,
						toolbar: { show: false },
						sparkline: { enabled: false },
						background: 'transparent'
					},
					series: [{ name: 'Payroll', data: [950, 1080, 1020, 1180, 1100, 1248] }],
					xaxis: {
						categories: ['Jan','Feb','Mar','Apr','May','Jun'],
						labels: { style: { colors: 'var(--color-gray-900)', fontSize: '10px' } },
						axisBorder: { show: false },
						axisTicks: { show: false }
					},
					yaxis: { show: false },
					grid: { show: false, padding: { left: 10, right: 0, top: -10, bottom: 0 } },
					stroke: { curve: 'smooth', width: 2 },
					colors: [success],
					fill: {
						type: 'gradient',
						gradient: {
							shadeIntensity: 1,
							opacityFrom: 0.5,
							opacityTo: 0,
							stops: [0, 100]
						}
					},
					dataLabels: { enabled: false },
					tooltip: {
						theme: 'dark',
						y: { formatter: v => '$' + v + 'K' }
					},
					markers: { size: 0 }
				}).render();
			}
			
		setTimeout(() => window.dispatchEvent(new Event('resize')), 200);

		// Sparkline: Total Stock
		if (document.getElementById('inv-total-stock-spark')) {
			new ApexCharts(document.getElementById('inv-total-stock-spark'), {
				chart: { type: 'area', height: 80, width: '100%', sparkline: { enabled: true } },
				series: [{ data: [12, 18, 16, 22, 26, 21, 28, 32, 27, 34, 30, 38] }],
				stroke: { curve: 'smooth', width: 2 }, colors: [success],
				fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] } },
				tooltip: { enabled: false }
			}).render();
		}

		// Sparkline: Inventory Value
		if (document.getElementById('inv-value-spark')) {
			new ApexCharts(document.getElementById('inv-value-spark'), {
				chart: { type: 'area', height: 80, width: '100%', sparkline: { enabled: true } },
				series: [{ data: [22, 28, 25, 32, 30, 36, 28, 22, 30, 24, 28, 26] }],
				stroke: { curve: 'smooth', width: 2 }, colors: [orange],
				fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] } },
				tooltip: { enabled: false }
			}).render();
		}

		// Category Distribution horizontal bars
		if (document.getElementById('inv-category-chart')) {
			new ApexCharts(document.getElementById('inv-category-chart'), {
				chart: { type: 'bar', height: 240, width: '100%', toolbar: { show: false } },
				series: [{ data: [110, 95, 78, 62, 55, 38] }],
				xaxis: { categories: ['Electronics','Clothing','Machines','Sports','Bikes','Books'], labels: { style: { colors: gray400, fontSize: '10px' }}, axisBorder: { color: 'var(--color-border-color)', }, axisTicks: { color: 'var(--color-border-color)', } },
				yaxis: { labels: { offsetX: 0, style: { colors: gray400, fontSize: '11px' } }, axisBorder: { color: 'var(--color-border-color)', } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4, padding: { left: 0, right: -2, top: 0, bottom: 0 } },
				plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 3, distributed: false } },
				colors: [success], legend: { show: false }, dataLabels: { enabled: false },
				tooltip: { theme: 'dark' }
			}).render();
		}
		
		// Product Stock Levels — combo bar + line
		if (document.getElementById('inv-stock-levels-chart')) {
			new ApexCharts(document.getElementById('inv-stock-levels-chart'), {
				chart: { type: 'line', height: 240, width: '100%', toolbar: { show: false } },
				series: [
					{ name: 'Total Products', type: 'bar', data: [220, 240, 200, 260, 728, 320, 280, 360, 410, 340, 290, 370] },
					{ name: 'Out Of Stock', type: 'line', data: [60, 80, 50, 90, 24, 110, 70, 130, 150, 100, 80, 120] }
				],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { labels: { offsetX: -15, style: { colors: gray400, fontSize: '11px' } } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4, padding: { left: 0, right: -10, top: 0, bottom: 0 } },
				plotOptions: { bar: { columnWidth: '40%', borderRadius: 3 } },
				stroke: { width: [0, 2], curve: 'smooth' },
				colors: [success, orange], legend: { show: false }, dataLabels: { enabled: false },
				tooltip: { theme: 'dark', shared: true }
			}).render();
		}

		// Inventory Value full-width line
		if (document.getElementById('inv-value-chart')) {
			new ApexCharts(document.getElementById('inv-value-chart'), {
				chart: { type: 'area', height: 320, width: '100%', toolbar: { show: false } },
				series: [{ name: 'Inventory Value', data: [320, 410, 380, 460, 568, 420, 510, 480, 540, 460, 520, 580] }],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { tickAmount: 7, labels: { offsetX: -15, style: { colors: gray400, fontSize: '11px' } } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				stroke: { curve: 'smooth', width: 2 }, colors: [success],
				fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
				dataLabels: { enabled: false },
				tooltip: { theme: 'dark', y: { formatter: v => '$' + (v * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) } },
				markers: { size: 0 }
			}).render();
		}

		// Leads Generated (combo: bars + line)
		if (document.getElementById('crm-leads-generated-chart')) {
			new ApexCharts(document.getElementById('crm-leads-generated-chart'), {
				chart: { type: 'line', height: 250, toolbar: { show: false } },
				series: [
					{ name: 'No of Leads Generated', type: 'bar', data: [320, 410, 450, 380, 520, 480, 580, 510, 620, 720, 540, 690] },
					{ name: 'No of Leads Expected', type: 'line', data: [380, 440, 420, 460, 500, 520, 560, 540, 600, 680, 580, 650] }
				],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { tickAmount: 7, min: 0, max: 700, labels: { offsetX: -15,style: { colors: gray400, fontSize: '11px' } } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4, padding: { left: 0, right: -15, top: 0, bottom: 0 } },
				plotOptions: { bar: { columnWidth: '50%', borderRadius: 3 } },
				stroke: { width: [0, 2], curve: 'smooth' },
				colors: [success, orange],
				fill: { type: ['gradient', 'solid'], gradient: { type: 'vertical', shade: 'light', shadeIntensity: 0.3, gradientToColors: [pink], opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] } },
				legend: { show: false },
				dataLabels: { enabled: false },
				tooltip: { theme: 'dark', shared: true, intersect: false }
			}).render();
		}

		// Contact By Sources donut
		if (document.getElementById('crm-contact-sources-chart')) {
			new ApexCharts(document.getElementById('crm-contact-sources-chart'), {
				chart: { 
					type: 'donut', 
					height: 215, 
					width: 215,
					events: {
						dataPointMouseEnter: function(event, chartContext, config) {
							const seriesIndex = config.dataPointIndex;
							const hoveredValue = chartContext.w.globals.series[seriesIndex];
							const hoveredLabel = chartContext.w.globals.labels[seriesIndex];

							const totalValNode = document.querySelector('#crm-contact-sources-chart .apexcharts-datalabel-value');
							const totalLblNode = document.querySelector('#crm-contact-sources-chart .apexcharts-datalabel-label');
							
							if (totalValNode) totalValNode.textContent = hoveredValue + '%';
							if (totalLblNode) totalLblNode.textContent = hoveredLabel;
						},
						dataPointMouseLeave: function(event, chartContext, config) {
							const totalValNode = document.querySelector('#crm-contact-sources-chart .apexcharts-datalabel-value');
							const totalLblNode = document.querySelector('#crm-contact-sources-chart .apexcharts-datalabel-label');
							
							if (totalValNode) totalValNode.textContent = '25%';
							if (totalLblNode) totalLblNode.textContent = 'Organic Search';
						}
					}
				},
				series: [25, 15, 15, 10, 15, 20],
				labels: ['Organic Search','Campaigns','Referral','Marketing','Paid Social','Events'],
				colors: [info, orange, success, pink, purple, warning],
				grid: { padding: { top: 0, bottom: -10, left: -5, right: 0 } },
				stroke: { width: 0 },
				legend: { show: false },
				plotOptions: { 
					pie: { 
						donut: { 
							size: '70%', 
							labels: { 
								show: true, 
								name: { show: true, fontSize: '11px', color: gray400, offsetY: 20 }, 
								value: { show: true, fontSize: '22px', fontWeight: 700, color: dark, offsetY: -12 }, 
								total: { 
									show: true, 
									showAlways: true, 
									label: 'Organic Search', 
									fontSize: '11px', 
									fontWeight: 400, 
									color: gray400, 
									formatter: function() { 
										return '25%'; 
									} 
								} 
							} 
						} 
					} 
				},
				dataLabels: { enabled: false },
				tooltip: { enabled: false }
			}).render();
		}
		
	});

	// Sales Revenue Trends chart
	document.addEventListener('DOMContentLoaded', function () {
		const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
		const success = cv('--color-success') || '#059669', orange = cv('--color-orange') || '#E65100', gray400 = cv('--color-gray-400') || '#9096A1';

		if (document.getElementById('sales-revenue-trends-chart')) {
			const data = [180, 220, 320, 380, 540, 850, 480, 600, 540, 720, 660, 580];
			const maxIdx = data.indexOf(Math.max(...data));
			new ApexCharts(document.getElementById('sales-revenue-trends-chart'), {
				chart: { type: 'bar', height: 340, toolbar: { show: false } },
				series: [{ name: 'Revenue', data }],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { tickAmount: 5, labels: { style: { colors: gray400, fontSize: '11px' }, formatter: v => (v >= 1000 ? (v/1000) + 'M' : v + 'K') } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				plotOptions: { bar: { columnWidth: '55%', borderRadius: 3, distributed: true } },
				colors: data.map((_, i) => i === maxIdx ? orange : '#F8E6D6'),
				legend: { show: false }, dataLabels: { enabled: false },
				tooltip: { theme: 'dark', y: { formatter: v => '$' + v + 'K' } }
			}).render();
		}
	});

	// Procument Dashboard
	document.addEventListener('DOMContentLoaded', function () {
		const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
		const success = cv('--color-success') || '#059669', orange = cv('--color-orange') || '#E65100', pink = cv('--color-pink') || '#CC25B0', purple = cv('--color-purple') || '#6A1B9A', info = cv('--color-info') || '#0EA5E9', danger = cv('--color-danger') || '#B91C1C', dark = cv('--color-dark') || '#1E293B', gray400 = cv('--color-gray-400') || '#9096A1';

		// Sparklines
		[
			{ id: 'proc-spark-1', color: success, data: [12, 14, 13, 18, 16, 22, 19, 25, 21, 28, 24, 32] },
			{ id: 'proc-spark-2', color: purple,  data: [22, 18, 24, 20, 28, 24, 30, 26, 32, 28, 36, 30] },
			{ id: 'proc-spark-3', color: orange,  data: [14, 18, 16, 22, 20, 26, 23, 30, 26, 32, 28, 36] },
			{ id: 'proc-spark-4', color: pink,    data: [18, 22, 19, 26, 22, 30, 26, 32, 28, 36, 30, 38] },
		].forEach(s => { if (document.getElementById(s.id)) new ApexCharts(document.getElementById(s.id), { chart: { type: 'area', height: 60, sparkline: { enabled: true } }, series: [{ data: s.data }], stroke: { curve: 'smooth', width: 2 }, colors: [s.color], fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] } }, tooltip: { enabled: false } }).render(); });

		// Top Suppliers horizontal bars
		if (document.getElementById('proc-top-suppliers-chart')) {
			new ApexCharts(document.getElementById('proc-top-suppliers-chart'), {
				chart: { type: 'bar', height: 280, toolbar: { show: false } },
				series: [{ data: [48, 38, 30, 24, 17, 10] }],
				xaxis: { categories: ['Alpha Distributors','Beta Industries','Zenith Supplies','Orion Equipments','Stellar Tools','Denny Shoes'], labels: { style: { colors: gray400, fontSize: '10px' }, formatter: v => v + 'k' } },
				yaxis: { labels: { style: { colors: gray400, fontSize: '11px' } } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 3 } },
				colors: [success], legend: { show: false }, dataLabels: { enabled: false },
				tooltip: { theme: 'dark', y: { formatter: v => '$' + v + 'k' } }
			}).render();
		}

		// Monthly Spend Trend area
		if (document.getElementById('proc-monthly-spend-chart')) {
			new ApexCharts(document.getElementById('proc-monthly-spend-chart'), {
				chart: { type: 'area', height: 280, toolbar: { show: false } },
				series: [{ name: 'Expense', data: [38, 28, 42, 30, 50, 36, 42, 28, 38, 30, 36, 28] }],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { labels: { style: { colors: gray400, fontSize: '11px' }, formatter: v => v + 'K' } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				stroke: { curve: 'smooth', width: 2 }, colors: [orange],
				fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
				dataLabels: { enabled: false }, tooltip: { theme: 'dark', y: { formatter: v => 'Expense : $' + (v * 200) } }, markers: { size: 0 }
			}).render();
		}

		// Supplier Performance bubble
		if (document.getElementById('proc-supplier-perf-chart')) {
			new ApexCharts(document.getElementById('proc-supplier-perf-chart'), {
				chart: { type: 'bubble', height: 220, toolbar: { show: false } },
				series: [
					{ name: 'Quality',         data: [[15, 70, 14], [38, 80, 18], [55, 65, 12], [75, 85, 16], [90, 50, 10]] },
					{ name: 'Cost Efficiency', data: [[20, 45, 12], [42, 55, 14], [60, 40, 10], [80, 60, 12], [95, 35, 16]] }
				],
				xaxis: { tickAmount: 6, min: 0, max: 100, labels: { style: { colors: gray400, fontSize: '10px' }, formatter: v => v + 'K' }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { min: 0, max: 100, tickAmount: 5, labels: { style: { colors: gray400, fontSize: '11px' } } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				colors: [info, orange], legend: { show: false }, dataLabels: { enabled: false },
				fill: { opacity: 0.6 }, tooltip: { theme: 'dark' }
			}).render();
		}

		// Spend by Category half-donut (semi)
		if (document.getElementById('proc-spend-cat-chart')) {

			// ✅ Customize size here
			const chartWidth = '100%';
			const chartHeight = 320;
			const clipHeight = chartHeight / 2 + 20; // visible arc area

			const el = document.getElementById('proc-spend-cat-chart');
			el.style.marginBottom = `-${chartHeight / 2 + 20}px`;

			const wrapper = document.createElement('div');
			wrapper.style.cssText = `position:relative;overflow:hidden;height:${clipHeight}px;width:${chartWidth}px;`;
			el.parentNode.insertBefore(wrapper, el);
			wrapper.appendChild(el);

			const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
			const dark = isDark ? '#f0f0f0' : '#1a1a1a';

			new ApexCharts(el, {
				chart: {
				type: 'donut',
				height: chartHeight,
				width: chartWidth,
				toolbar: { show: false }
				},
				series: [42, 38, 20],
				labels: ['', '', ''],
				colors: ['#E8920A', '#1D9E75', '#5DCAA5'],
				stroke: { width: 2, colors: ['#fff'] },
				legend: { show: false },
				plotOptions: {
				pie: {
					startAngle: -90,
					endAngle: 90,
					offsetY: 10,
					donut: {
					size: '65%',
					labels: {
						show: false,
						name: { show: false },
						value: {
						show: true,
						fontSize: '28px',
						fontWeight: 700,
						color: dark,
						offsetY: -10,
						formatter: () => '42%'
						},
						total: {
						show: false,
						showAlways: true,
						label: '',
						fontSize: '28px',
						fontWeight: 700,
						color: dark,
						formatter: () => '42%'
						}
					}
					}
				}
				},
				dataLabels: { enabled: false },
				tooltip: {
				enabled: true,
				fillSeriesColor: false,
				custom: function({ series, seriesIndex, w }) {
					const label = w.globals.labels[seriesIndex];
					const value = series[seriesIndex];
					const color = w.globals.colors[seriesIndex];
					return `<div style="
					background:#fff;
					border:none;
					border-radius:5px;
					box-shadow:unset !important;
					padding:10px 14px;
					display:flex;
					align-items:center;
					gap:8px;
					font-family:sans-serif;
					min-width:30px;
					">
					<span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
					<span style="color:#555;font-size:13px;">${label}:</span>
					<span style="color:#111;font-size:13px;font-weight:700;margin-left:auto;">${value}%</span>
					</div>`;
				}
				},
				states: {
				hover: { filter: { type: 'darken', value: 0.85 } },
				active: { filter: { type: 'darken', value: 0.75 } }
				}
			}).render();
		}

		// Order Status — multi-ring donut
		if (document.getElementById('proc-order-status-chart')) {
		new ApexCharts(document.getElementById('proc-order-status-chart'), {
			chart: {
			type: 'radialBar',
			height: 200,
			width: 200,
			toolbar: { show: false }
			},
			series: [80, 60, 45, 25],
			colors: [danger, orange, info, success], // pink, orange, teal, blue — match your vars
			labels: ['Approved', 'Pending', 'Delivered', 'Rejected'],
			plotOptions: {
			radialBar: {
				offsetY: 0,
				startAngle: -180,
				endAngle: 180,
				hollow: {
				size: '38%',
				background: '#f8f9fb',
				dropShadow: {
					enabled: true,
					top: 0, left: 0,
					blur: 8,
					opacity: 0.08
				}
				},
				track: {
				show: true,
				background: '#eef0f4',
				strokeWidth: '90%',
				opacity: 1,
				margin: 5  // ✅ spacing between rings
				},
				dataLabels: {
				show: false,
				name: { show: false },
				value: {
					show: true,
					fontSize: '26px',
					fontWeight: 700,
					color: dark,
					offsetY: 10,
					formatter: () => '80%'
				},
				total: {
					show: true,
					label: '',
					fontSize: '26px',
					fontWeight: 700,
					color: dark,
					formatter: () => '80%'
				}
				}
			}
			},
			stroke: { lineCap: 'round' },  // ✅ rounded ends
			legend: { show: false },
			tooltip: {
			enabled: true,
			fillSeriesColor: false,
			custom: function({ seriesIndex, w }) {
				const label = w.globals.labels[seriesIndex];
				const value = w.globals.series[seriesIndex];
				const color = w.globals.colors[seriesIndex];
				return `<div style="
				background:#fff;
				border-radius:8px;
				box-shadow:0 4px 16px rgba(0,0,0,0.12);
				padding:9px 14px;
				display:flex;
				align-items:center;
				gap:8px;
				font-family:sans-serif;
				">
				<span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
				<span style="color:#555;font-size:13px;">${label}:</span>
				<span style="color:#111;font-size:13px;font-weight:700;margin-left:4px;">${value}%</span>
				</div>`;
			}
			}
		}).render();
		}
	});
	
	// Finance dashboard charts
	document.addEventListener('DOMContentLoaded', function () {
		const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
		const primary = cv('--color-primary') || '#0F766E', success = cv('--color-success') || '#059669', orange = cv('--color-orange') || '#E65100', pink = cv('--color-pink') || '#CC25B0', purple = cv('--color-purple') || '#6A1B9A', info = cv('--color-info') || '#0EA5E9', dark = cv('--color-dark') || '#1E293B', gray400 = cv('--color-gray-400') || '#9096A1';

		// Revenue vs Expense
		if (document.getElementById('fin-rev-exp-chart')) {
			new ApexCharts(document.getElementById('fin-rev-exp-chart'), {
				chart: { type: 'bar', height: 200, toolbar: { show: false } },
				series: [
					{ name: 'Revenue', data: [40, 70, 28, 38, 48, 60, 22, 42, 36, 36, 28, 60] },
					{ name: 'Expense', data: [22, 48, 25, 30, 36, 42, 18, 30, 25, 22, 18, 22] }
				],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { labels: { style: { colors: gray400, fontSize: '11px' }, formatter: v => v + 'K' } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
				colors: [success, orange], legend: { show: false }, dataLabels: { enabled: false },
				tooltip: { theme: 'dark', y: { formatter: v => '$' + v + 'K' } }
			}).render();
		}

		// Revenue donut (center 73%)
		if (document.getElementById('fin-revenue-donut')) {
			new ApexCharts(document.getElementById('fin-revenue-donut'), {
				chart: { 
				type: 'donut', 
				height: 250, 
				width: '100%',
				events: {
					// Triggered when hovering over a specific donut slice
					dataPointMouseEnter: function(event, chartContext, config) {
						const seriesIndex = config.dataPointIndex;
						const hoveredValue = chartContext.w.globals.series[seriesIndex];
						const hoveredLabel = chartContext.w.globals.labels[seriesIndex];

						// Safely locate ApexCharts built-in center label nodes
						const totalValNode = document.querySelector('#fin-revenue-donut .apexcharts-datalabel-value');
						const totalLblNode = document.querySelector('#fin-revenue-donut .apexcharts-datalabel-label');
						
						if (totalValNode) totalValNode.textContent = hoveredValue.toLocaleString();
						if (totalLblNode) totalLblNode.textContent = hoveredLabel;
					},
					// Triggered when the mouse leaves a slice entirely
					dataPointMouseLeave: function(event, chartContext, config) {
						const totalValNode = document.querySelector('#fin-revenue-donut .apexcharts-datalabel-value');
						const totalLblNode = document.querySelector('#fin-revenue-donut .apexcharts-datalabel-label');
						
						if (totalValNode) totalValNode.textContent = '1,284';
						if (totalLblNode) totalLblNode.textContent = 'Employees';
					}
				}
			},
			grid: {
			padding: {
				top: 0,
				right: 0,
				bottom: -10,
				left: 0
			}
			},
			series: [68, 31, 12],
			labels: ['Sales', 'Recurring', 'Service Fees', 'Other'],
			colors: [success, orange, purple],
			stroke: { width: 0 },
			legend: { show: false },
			plotOptions: {
				pie: {
					donut: {
						size: '72%',
						labels: {
							show: true,
							name: { show: false, fontSize: '10px', color: gray400, offsetY: 18 }, 
							value: { show: true, fontSize: '24', fontWeight: 700, color: dark, offsetY: 10 }, 
							total: {
								show: true,
								showAlways: true,
								label: 'Sales',
								fontSize: '10px',
								fontWeight: 400,
								color: gray400,
								formatter: function() {
									return '90%';
								}
							}
						}
					}
				}
			},
			dataLabels: { enabled: false },
			tooltip: { enabled: false }
			}).render();
		}

		// Profit Margin vs Sales lines
		if (document.getElementById('fin-profit-sales-chart')) {
			new ApexCharts(document.getElementById('fin-profit-sales-chart'), {
				chart: { type: 'line', height: 240, toolbar: { show: false } },
				series: [
					{ name: 'Profit Margin', data: [55, 48, 50, 32, 40, 38, 45, 35, 25, 28, 22, 30] },
					{ name: 'Sales',         data: [25, 22, 28, 35, 30, 38, 32, 45, 42, 55, 48, 60] }
				],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { labels: { style: { colors: gray400, fontSize: '11px' }, formatter: v => v + 'K' } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				stroke: { curve: 'smooth', width: [2.5, 2.5] },
				colors: [orange, success], legend: { show: false }, dataLabels: { enabled: false },
				tooltip: { theme: 'dark', shared: true },
				markers: { size: 0 }
			}).render();
		}

		// Expense donut (center 50% Salaries)
		if (document.getElementById('fin-expense-donut')) {

				var options = {
					series: [50, 30, 20],
					labels: ['Salaries', 'Miscellaneous', 'Marketing'],
					chart: {
						type: 'donut',
						height: 200,
						events: {
							dataPointMouseEnter: function (event, chartContext, config) {

								const values = [50, 30, 20];
								const labels = ['Salaries', 'Miscellaneous', 'Marketing'];

								const index = config.dataPointIndex;

								const valueNode = document.querySelector(
									'#fin-expense-donut .apexcharts-datalabel-value'
								);

								const labelNode = document.querySelector(
									'#fin-expense-donut .apexcharts-datalabel-label'
								);

								if (valueNode) {
									valueNode.textContent = values[index] + '%';
								}

								if (labelNode) {
									labelNode.textContent = labels[index];
								}
							},

							dataPointMouseLeave: function () {

								const valueNode = document.querySelector(
									'#fin-expense-donut .apexcharts-datalabel-value'
								);

								const labelNode = document.querySelector(
									'#fin-expense-donut .apexcharts-datalabel-label'
								);

								if (valueNode) {
									valueNode.textContent = '50%';
								}

								if (labelNode) {
									labelNode.textContent = 'Salaries';
								}
							}
						}
					},
					colors: ['#E28A34', '#3D8C84', '#7B3FB3'],
					stroke: {
						width: 4,
						colors: ['var(--color-white)']
					},
					dataLabels: {
						enabled: false
					},
					legend: {
						show: false
					},
					tooltip: {
						enabled: false
					},
					plotOptions: {
						pie: {
							donut: {
								size: '78%',
								labels: {
									show: true,

									name: {
									show: true,
									offsetY: 14,
									fontSize: '14px',
									fontWeight: 400,
									color: '#6B7280'
								},

									value: {
										show: true,
										offsetY: -20,
										fontSize: '18',
										fontWeight: 700,
										color: '#374151',
										formatter: function (val) {
											return parseInt(val) + '%';
										}
									},

									total: {
										show: true,
										showAlways: true,
										label: 'Salaries',
										formatter: function () {
											return '50%';
										}
									}
								}
							}
						}
					}
				};

				var chart = new ApexCharts(
					document.querySelector('#fin-expense-donut'),
					options
				);

				chart.render();

				// Set default label after render
				setTimeout(function () {
					const labelNode = document.querySelector(
						'#fin-expense-donut .apexcharts-datalabel-label'
					);

					if (labelNode) {
						labelNode.textContent = 'Salaries';
					}
				}, 300);
		}
	});

	// Pos Dashboard Charts
	document.addEventListener('DOMContentLoaded', function () {
		const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
		const primary = cv('--color-primary') || '#0F766E', success = cv('--color-success') || '#059669', orange = cv('--color-orange') || '#E65100', pink = cv('--color-pink') || '#CC25B0', purple = cv('--color-purple') || '#6A1B9A', info = cv('--color-info') || '#0EA5E9', dark = cv('--color-dark') || '#1E293B', gray400 = cv('--color-gray-400') || '#9096A1';

		// Product Sales area+bar
		if (document.getElementById('pos-product-sales-chart')) {
			new ApexCharts(document.getElementById('pos-product-sales-chart'), {
				chart: { type: 'bar', height: 170, toolbar: { show: false } },
				series: [{ name: 'Sales', data: [42, 38, 45, 32, 52, 38, 35, 30, 36, 38, 45, 50] }],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { labels: { style: { colors: gray400, fontSize: '11px' }, formatter: v => v + 'K' } },
				grid: { padding: {left: 0, }, borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				plotOptions: { bar: { columnWidth: '60%', borderRadius: 3 } },
				fill: { type: 'gradient', gradient: { type: 'vertical', shade: 'light', shadeIntensity: 0.3, gradientToColors: [success], opacityFrom: 0.85, opacityTo: 0.4, stops: [0, 100] } },
				colors: [success], legend: { show: false }, dataLabels: { enabled: false },
				tooltip: { theme: 'dark', y: { formatter: v => '$' + (v * 1000).toLocaleString() } }
			}).render();
		}

		// 4 sparklines
		const sparkData = [
			{ id: 'pos-spark-1', color: success, data: [12, 14, 13, 18, 16, 22, 19, 25, 21, 28, 24, 32] },
			{ id: 'pos-spark-2', color: purple,  data: [22, 18, 24, 20, 28, 24, 30, 26, 32, 28, 36, 30] },
			{ id: 'pos-spark-3', color: info,    data: [14, 18, 16, 22, 20, 26, 23, 30, 26, 32, 28, 36] },
			{ id: 'pos-spark-4', color: pink,    data: [18, 22, 19, 26, 22, 30, 26, 32, 28, 36, 30, 38] },
		];
		sparkData.forEach(s => {
			if (document.getElementById(s.id)) {
				new ApexCharts(document.getElementById(s.id), {
					chart: { type: 'area', height: 60, sparkline: { enabled: true } },
					series: [{ data: s.data }],
					stroke: { curve: 'smooth', width: 2 }, colors: [s.color],
					fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] } },
					tooltip: { enabled: false }
				}).render();
			}
		});

		// Sales Vs Returns — bars with positive and negative

		if (document.getElementById('pos-sales-returns-chart')) {

			var options = {
				series: [
					{
						name: 'Sales',
						data: [100, 300, 200, 100, 140, 280, 180, 220, 350, 260, 120, 180]
					},
					{
						name: 'Returns',
						data: [-150, -300, -200, -100, -140, -280, -240, -100, -150, -330, -70, -140]
					}
				],
				chart: {
					type: 'bar',
					height: 250,
					stacked: false,
					toolbar: {
						show: false
					}
				},
				colors: ['#32827A', '#DE8434'],
				plotOptions: {
					bar: {
						columnWidth: '85%',
						borderRadius: 2,
						borderRadiusApplication: 'around'
					}
				},
				dataLabels: {
					enabled: false
				},
				legend: {
					show: false
				},
				grid: {
					borderColor: 'var(--color-border-color)',
					strokeDashArray: 4,
					padding: {
						left: 0,
						right: 0,
						bottom: 0
					}
				},
				xaxis: {
					categories: [
						'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
						'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
					],
					axisBorder: {
						show: false
					},
					axisTicks: {
						show: false
					}
				},
				yaxis: {
					min: -400,
					max: 400,
					tickAmount: 8,
					labels: {
						offsetX: -10,
						formatter: function (val) {
							return Math.abs(val);
						}
					}
				},
				tooltip: {
					y: {
						formatter: function (val) {
							return Math.abs(val);
						}
					}
				}
			};

			var chart = new ApexCharts(
				document.querySelector("#pos-sales-returns-chart"),
				options
			);

			chart.render();
		}

		// High Selling Categories — radar
		if (document.getElementById('pos-categories-radar')) {
			new ApexCharts(document.getElementById('pos-categories-radar'), {
				chart: {
					type: 'radar',
					height: 280,
					toolbar: {
						show: false
					},
					parentHeightOffset: 0
				},

				series: [{
					name: 'Sales',
					data: [62, 78, 55, 48, 65, 72, 58, 50]
				}],

				xaxis: {
					categories: [
						'Appliances',
						'Headphones',
						'Footwear',
						'Furniture',
						'Apparel',
						'Smartphones',
						'Computers',
						'Watches'
					],
					labels: {
						style: {
							colors: Array(8).fill(gray400),
							fontSize: '10px'
						}
					}
				},

				yaxis: {
					show: false,
					tickAmount: 4
				},

				colors: [orange],

				stroke: {
					width: 2
				},

				fill: {
					opacity: 0.35
				},

				markers: {
					size: 2,
					colors: [orange],
					strokeWidth: 0
				},

				plotOptions: {
					radar: {
						size: 105, // reduce if still too much space
						polygons: {
							strokeColors: '#e8e9ec',
							connectorColors: '#e8e9ec',
							fill: {
								colors: ['transparent']
							}
						}
					}
				},

				grid: {
					padding: {
						top: -20,
						right: -10,
						bottom: -30,
						left: -10
					}
				},

				dataLabels: {
					enabled: false
				},

				legend: {
					show: false
				},

				tooltip: {
					theme: 'dark'
				}
			}).render();
		}
	});

	// Support Dashboard Charts
    document.addEventListener('DOMContentLoaded', function () {
        const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
        const success = cv('--color-success') || '#059669', orange = cv('--color-orange') || '#E65100', danger = cv('--color-danger') || '#B91C1C', info = cv('--color-info') || '#0EA5E9', purple = cv('--color-purple') || '#6A1B9A', dark = cv('--color-dark') || '#1E293B', gray400 = cv('--color-gray-400') || '#9096A1';

        // Ticket Volume — stacked-style bars (Created back, Resolved front)
        if (document.getElementById('sup-ticket-volume-chart')) {
            var options = {
                chart: {
                    type: 'bar',
                    height: 280,
                    stacked: false, // OFF so we can control overlapping positions manually
                    toolbar: {
                        show: false
                    }
                },

                // Swapping array order ensures 'Resolved' renders directly on top of 'Created'
                series: [
                    {
                        name: 'Tickets Created',
                        data: [42, 54, 18, 50, 72, 32, 70, 81, 87, 75, 50, 42] // Adjusted matching image baseline heights
                    },
                    {
                        name: 'Tickets Resolved',
                        data: [26, 16, 10, 2, 24, 6, 20, 26, 49, 31, 31, 26] // Exact focal data metrics
                    }
                ],

                // Hex matches your exact screenshot palette components
                colors: ['#EAEFF0', '#0A8564'],

                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '52%',
                        // 'true' forces ApexCharts to overlay the series instead of drawing side-by-side
                        rangeBarOverlap: true, 
                        borderRadius: 4,
                        borderRadiusApplication: 'around', // Smooth bubble cap curves
                        borderRadiusWhenStacked: 'all',
                        dataLabels: {
                            position: 'top'
                        }
                    }
                },

                dataLabels: {
                    enabled: false
                },

                legend: {
                    show: false
                },

                grid: {
                    show: true,
                    borderColor: 'var(--color-border-color)',
                    strokeDashArray: 3, // Clean dotted background grid
                    xaxis: {
                        lines: {
                            show: false // Hides vertical partition walls
                        }
                    },
                    yaxis: {
                        lines: {
                            show: true
                        }
                    },
                    padding: {
                        left: 0, 
                        right: 0,
                        top: 0,
                        bottom: -10
                    }
                },

                xaxis: {
                    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    axisBorder: {
                        show: false
                    },
                    axisTicks: {
                        show: false
                    },
                    labels: {
                        style: {
                            colors: '#64748B',
                            fontSize: '12px',
                            fontFamily: 'sans-serif'
                        }
                    }
                },

                yaxis: {
                    tickAmount: 5,
                    min: 0,
                    max: 100, // Matching 0 to 100 scale limits
                    labels: {
						offsetX:-20,
                        style: {
                            colors: '#64748B',
                            fontSize: '12px'
                        }
                    }
                },

                // --- MATCHES THE CUSTOM WHITE LIGHT TOOLTIP CARD ---
                tooltip: {
                    enabled: true,
                    shared: true,
                    intersect: false,
                    theme: 'light',
                    custom: function({ series, seriesIndex, dataPointIndex, w }) {
                        var month = w.globals.categoryLabels[dataPointIndex];
                        var created = series[0][dataPointIndex];
                        var resolved = series[1][dataPointIndex];
                        
                        return `
                            <div style="padding: 14px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); font-family: sans-serif; min-width: 170px;">
                                <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">${month}</div>
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 8px; color: #64748b;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span style="width: 7px; height: 7px; background: #CBD5E1; border-radius: 50%; display: inline-block;"></span>
                                        <span>Tickets Created</span>
                                    </div>
                                    <span style="font-weight: 700; color: #1e293b;">${created}</span>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #64748b;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span style="width: 7px; height: 7px; background: #0A8564; border-radius: 50%; display: inline-block;"></span>
                                        <span>Tickets Resolved</span>
                                    </div>
                                    <span style="font-weight: 700; color: #1e293b;">${resolved}</span>
                                </div>
                            </div>
                        `;
                    }
                }
            };

            var chart = new ApexCharts(document.querySelector('#sup-ticket-volume-chart'), options);
            chart.render();
        }

        // SLA Breaches pie
        if (document.getElementById('sup-sla-pie')) {
            new ApexCharts(document.getElementById('sup-sla-pie'), {
                chart: { type: 'pie', height: 240, width: 240 },
                series: [70, 30],
                labels: ['SLA Compliant','SLA Breached'],
                colors: [success, orange],
                stroke: { width: 0 },
                legend: { show: false },
                dataLabels: { style: { fontSize: '12px', colors: ['#fff'], fontWeight: 600 }, formatter: (val, opts) => opts.w.config.labels[opts.seriesIndex] + '\n' + opts.w.config.series[opts.seriesIndex] },
                tooltip: { enabled: true }
            }).render();
        }

        // 4 sparklines
        [
            { id: 'sup-spark-1', color: orange, data: [12, 18, 14, 22, 16, 24, 20, 28, 22, 30, 24, 32] },
            { id: 'sup-spark-2', color: danger, data: [18, 14, 22, 16, 24, 20, 28, 22, 30, 24, 32, 26] },
            { id: 'sup-spark-3', color: success,data: [10, 14, 12, 18, 14, 20, 16, 24, 18, 26, 20, 28] },
            { id: 'sup-spark-4', color: purple, data: [14, 18, 16, 22, 18, 26, 20, 28, 22, 30, 24, 32] },
        ].forEach(s => { if (document.getElementById(s.id)) new ApexCharts(document.getElementById(s.id), { chart: { type: 'area', height: 60, sparkline: { enabled: true } }, series: [{ data: s.data }], stroke: { curve: 'smooth', width: 2 }, colors: [s.color], fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] } }, tooltip: { enabled: false } }).render(); });

        // Satisfaction Rate gauge (semi-radial)
        if (document.getElementById('sup-satisfaction-gauge')) {

            // ✅ Customize size here
            const chartWidth = '100%';
            const chartHeight = 320;
            const clipHeight = chartHeight / 2 + 20; // visible arc area

            const el = document.getElementById('sup-satisfaction-gauge');
            el.style.marginBottom = `-${chartHeight / 2 + 20}px`;

            const wrapper = document.createElement('div');
            wrapper.style.cssText = `position:relative;overflow:hidden;height:${clipHeight}px;width:${chartWidth}px;`;
            el.parentNode.insertBefore(wrapper, el);
            wrapper.appendChild(el);

            const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
            const dark = isDark ? '#f0f0f0' : '#1a1a1a';

            new ApexCharts(el, {
                chart: {
                type: 'donut',
                height: chartHeight,
                width: chartWidth,
                toolbar: { show: false }
                },
                series: [42, 38, 20],
                labels: ['', '', ''],
                colors: ['#b91c1c', '#0ea5e9', '#059669'],
                stroke: { width: 2, colors: ['#fff'] },
                legend: { show: false },
                plotOptions: {
                pie: {
                    startAngle: -90,
                    endAngle: 90,
                    offsetY: 10,
                    donut: {
                    size: '65%',
                    labels: {
                        show: false,
                        name: { show: false },
                        value: {
                        show: true,
                        fontSize: '28px',
                        fontWeight: 700,
                        color: dark,
                        offsetY: -10,
                        formatter: () => '42%'
                        },
                        total: {
                        show: false,
                        showAlways: true,
                        label: '',
                        fontSize: '28px',
                        fontWeight: 700,
                        color: dark,
                        formatter: () => '42%'
                        }
                    }
                    }
                }
                },
                dataLabels: { enabled: false },
                tooltip: {
                enabled: true,
                fillSeriesColor: false,
                custom: function({ series, seriesIndex, w }) {
                    const label = w.globals.labels[seriesIndex];
                    const value = series[seriesIndex];
                    const color = w.globals.colors[seriesIndex];
                    return `<div style="
                    background:#fff;
                    border:none;
                    border-radius:5px;
                    box-shadow:unset !important;
                    padding:10px 14px;
                    display:flex;
                    align-items:center;
                    gap:8px;
                    font-family:sans-serif;
                    min-width:30px;
                    ">
                    <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
                    <span style="color:#555;font-size:13px;">${label}:</span>
                    <span style="color:#111;font-size:13px;font-weight:700;margin-left:auto;">${value}%</span>
                    </div>`;
                }
                },
                states: {
                hover: { filter: { type: 'darken', value: 0.85 } },
                active: { filter: { type: 'darken', value: 0.75 } }
                }
            }).render();
        }

        // Ticket Response Rate (multi-line area)
        if (document.getElementById('sup-response-rate-chart')) {
        var primaryTeal  = typeof success !== 'undefined' ? success : '#117A73'; 
        var primaryOrange = typeof info    !== 'undefined' ? info    : '#D97706';
        var textGray      = typeof gray400 !== 'undefined' ? gray400 : '#64748B';

        new ApexCharts(document.getElementById('sup-response-rate-chart'), {
            chart: { 
                type: 'area', 
                height: 180, 
                stacked: true, // Crucial: Stacks creation time directly over response time
                toolbar: { show: false },
                sparkline: { enabled: false }
            },
            // Using realistic micro-fluctuation coordinates to build that continuous jagged timeline
            series: [
                { name: 'Creation Time', data: [3.2, 3.5, 2.9, 3.8, 3.4, 2.7, 3.1, 3.6, 2.8, 3.3, 3.0, 2.9] },
                { name: 'Response Time', data: [4.1, 4.3, 4.0, 4.5, 4.2, 3.9, 4.4, 4.6, 4.1, 4.5, 4.2, 4.0] }
            ],
            xaxis: { 
                categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], 
                labels: { 
                    show: true,
                    style: { colors: textGray, fontSize: '11px', fontFamily: 'sans-serif' } 
                }, 
                axisBorder: { show: false }, 
                axisTicks: { show: false },
                crosshairs: {
                    show: true,
                    stroke: {
                        color: '#94A3B8',
                        width: 1,
                        dashArray: 3 // Dotted vertical tracking crosshair line
                    }
                }
            },
            yaxis: { 
                tickAmount: 4, 
                max: 8, 
                labels: { 
                    offsetX: -15, 
                    style: { colors: textGray, fontSize: '11px' }, 
                    formatter: function(v) {
                        return v === 0 ? '0' : v + ' hrs'; // Removes 'hrs' extension on zero base row
                    }
                } 
            },
            grid: { 
                show: false, // Disables background grid lines completely to match the sample layout
                padding: { left: 0, right: 0, top: 0, bottom: 0 }
            },
            stroke: { 
                curve: 'straight', // Gives precise timeline ridges instead of exaggerated smooth bubbles
                width: 1.5 
            }, 
            colors: [primaryTeal, primaryOrange],
            fill: { 
                type: 'solid', // Changes gradient to solid opaque fills
                opacity: 1 
            },
            dataLabels: { enabled: false }, 
            markers: { size: 0 },
            
            // --- CUSTOM COMPONENT TOOLTIP CARD ---
            tooltip: { 
                enabled: true,
                shared: true,
                theme: 'light', // Sets custom light card background
                custom: function({ series, seriesIndex, dataPointIndex, w }) {
                    var month = w.globals.categoryLabels[dataPointIndex];
                    // Calculates true baseline relative index values
                    var val1 = series[0][dataPointIndex];
                    var val2 = series[1][dataPointIndex];
                    
                    return `
                        <div style="padding: 14px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); font-family: sans-serif; min-width: 175px;">
                            <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">${month}</div>
                            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #64748b;">
                                <span>Creation Time</span>
                                <span style="font-weight: 700; color: #1e293b;">${Math.round(val1)} hrs</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
                                <span>Response Time</span>
                                <span style="font-weight: 700; color: #1e293b;">${Math.round(val2)} hrs</span>
                            </div>
                        </div>
                    `;
                }
            }
        }).render();
        }
    });

	// Sales Revenue Trends chart
	document.addEventListener('DOMContentLoaded', function () {
		const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
		const success = cv('--color-success') || '#059669', orange = cv('--color-orange') || '#E65100', gray400 = cv('--color-gray-400') || '#9096A1';

		if (document.getElementById('sales-revenue-trends-chart')) {
			const data = [180, 220, 320, 380, 540, 850, 480, 600, 540, 720, 660, 580];
			const maxIdx = data.indexOf(Math.max(...data));
			new ApexCharts(document.getElementById('sales-revenue-trends-chart'), {
				chart: { type: 'bar', height: 340, toolbar: { show: false } },
				series: [{ name: 'Revenue', data }],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { tickAmount: 5, labels: { style: { colors: gray400, fontSize: '11px' }, formatter: v => (v >= 1000 ? (v/1000) + 'M' : v + 'K') } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				plotOptions: { bar: { columnWidth: '55%', borderRadius: 3, distributed: true } },
				colors: data.map((_, i) => i === maxIdx ? orange : '#F8E6D6'),
				legend: { show: false }, dataLabels: { enabled: false },
				tooltip: { theme: 'dark', y: { formatter: v => '$' + v + 'K' } }
			}).render();
		}
	});

	// Project Dashboard
	document.addEventListener('DOMContentLoaded', function () {
		const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
		const success = cv('--color-success') || '#059669', orange = cv('--color-orange') || '#E65100', pink = cv('--color-pink') || '#CC25B0', purple = cv('--color-purple') || '#6A1B9A', info = cv('--color-info') || '#0EA5E9', warning = cv('--color-warning') || '#D97706', danger = cv('--color-danger') || '#B91C1C', dark = cv('--color-dark') || '#1E293B', gray400 = cv('--color-gray-400') || '#9096A1';

		// 4 KPI bar sparklines
		[
			{ id: 'pj-spark-1', color: orange, data: [4,6,3,7,5,8,4,9,5,7,4,8,5,6,3,7,5,8,4,9,5,7,4,8,5,6] },
			{ id: 'pj-spark-2', color: info,   data: [5,3,6,4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5] },
			{ id: 'pj-spark-3', color: purple, data: [4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9] },
			{ id: 'pj-spark-4', color: success,data: [6,4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6] },
		].forEach(s => { if (document.getElementById(s.id)) new ApexCharts(document.getElementById(s.id), { chart: { type: 'bar', height: 60, sparkline: { enabled: true } }, series: [{ data: s.data }], plotOptions: { bar: { columnWidth: '50%', borderRadius: 1 } }, colors: [s.color], tooltip: { enabled: false } }).render(); });

		// Projects Progress 4-line chart
		if (document.getElementById('pj-progress-chart')) {
			new ApexCharts(document.getElementById('pj-progress-chart'), {
				chart: { type: 'line', height: 200, toolbar: { show: false } },
				series: [
					{ name: 'Completed',       data: [30, 40, 35, 50, 25, 55, 70, 60, 75, 80, 70, 65] },
					{ name: 'Inprogress',      data: [20, 30, 25, 35, 19, 40, 45, 50, 55, 45, 50, 40] },
					{ name: 'Not Started Yet', data: [40, 30, 35, 20, 19, 30, 25, 35, 25, 30, 35, 30] },
					{ name: 'Cancelled',       data: [60, 50, 55, 40, 70, 50, 45, 55, 50, 60, 65, 55] }
				],
				xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], labels: { style: { colors: gray400, fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
				yaxis: { min: 0, max: 100, tickAmount: 5, labels: { offsetX: -15, style: { colors: gray400, fontSize: '11px' } } },
				grid: { borderColor: 'var(--color-border-color)', strokeDashArray: 4 },
				stroke: { curve: 'smooth', width: 2 },
				colors: [success, info, warning, danger], legend: { show: false },
				dataLabels: { enabled: false },
				tooltip: { theme: 'dark', shared: true, intersect: false },
				markers: { size: 4, hover: { size: 6 } }
			}).render();
		}

		// Task Summary donut
		if (document.getElementById('pj-task-summary-chart')) {
			new ApexCharts(document.getElementById('pj-task-summary-chart'), {
				chart: { 
					type: 'donut', 
					height: 150, 
					width: 150,
					events: {
						dataPointMouseEnter: function(event, chartContext, config) {
							const seriesIndex = config.dataPointIndex;
							const hoveredValue = chartContext.w.globals.series[seriesIndex];
							const hoveredLabel = chartContext.w.globals.labels[seriesIndex];

							const totalValNode = document.querySelector('#pj-task-summary-chart .apexcharts-datalabel-value');
							const totalLblNode = document.querySelector('#pj-task-summary-chart .apexcharts-datalabel-label');
							
							if (totalValNode) totalValNode.textContent = hoveredValue + '%';
							if (totalLblNode) totalLblNode.textContent = hoveredLabel;
						},
						dataPointMouseLeave: function(event, chartContext, config) {
							const totalValNode = document.querySelector('#pj-task-summary-chart .apexcharts-datalabel-value');
							const totalLblNode = document.querySelector('#pj-task-summary-chart .apexcharts-datalabel-label');
							
							if (totalValNode) totalValNode.textContent = '40%';
							if (totalLblNode) totalLblNode.textContent = 'Completed';
						}
					}
				},
				series: [30, 25, 20, 15, 10],
				labels: ['Completed','Pending','In Progress','Active','Cancelled'],
				colors: [success, orange, info, purple, danger],
				stroke: { width: 0 }, 
				legend: { show: false },
				plotOptions: { 
					pie: { 
						donut: { 
							size: '75%', 
							labels: { 
								show: true, 
								name: { show: true, fontSize: '11px', color: gray400, offsetY: 20 }, 
								value: { show: true, fontSize: '24px', fontWeight: 700, color: dark, offsetY: -10 }, 
								total: { 
									show: true, 
									showAlways: true, 
									label: 'Completed', 
									fontSize: '11px', 
									color: gray400, 
									formatter: function() { 
										return '40%'; 
									} 
								} 
							} 
						} 
					} 
				},
				dataLabels: { enabled: false }
			}).render();
		}

	});

	// Progress Segment Dashboard Chart
	document.addEventListener('DOMContentLoaded', function () {
		const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
		const successColor = cv('--color-success') || '#00966b';
		const lightBg = '#f1f5f9';

		if (document.getElementById('resource-chart')) {
			var options = {
			chart: {
				type: 'heatmap',
				height: 230,
				toolbar: {
					show: false
				}
			},
			// Updated data structure to map perfectly to categories
			series: [
				{ name: 'Admin', data: [{x: '0%', y: 0}, {x: '20%', y: 0}, {x: '40%', y: 0}, {x: '60%', y: 0}, {x: '80%', y: 0}] },
				{ name: 'Devops', data: [{x: '0%', y: 1}, {x: '20%', y: 1}, {x: '40%', y: 0}, {x: '60%', y: 0}, {x: '80%', y: 0}] },
				{ name: 'Document', data: [{x: '0%', y: 1}, {x: '20%', y: 0}, {x: '40%', y: 0}, {x: '60%', y: 0}, {x: '80%', y: 0}] },
				{ name: 'Testing', data: [{x: '0%', y: 1}, {x: '20%', y: 2}, {x: '40%', y: 3}, {x: '60%', y: 4}, {x: '80%', y: 0}] },
				{ name: 'Backend', data: [{x: '0%', y: 1}, {x: '20%', y: 2}, {x: '40%', y: 0}, {x: '60%', y: 0}, {x: '80%', y: 0}] },
				{ name: 'Frontend', data: [{x: '0%', y: 1}, {x: '20%', y: 2}, {x: '40%', y: 0}, {x: '60%', y: 0}, {x: '80%', y: 0}] },
				{ name: 'UI/UX', data: [{x: '0%', y: 1}, {x: '20%', y: 2}, {x: '40%', y: 3}, {x: '60%', y: 4}, {x: '80%', y: 5}] }
			],
			plotOptions: {
				heatmap: {
					radius: 6,
					enableShades: false,
					useFillColorAsStroke: false,
					colorScale: {
						ranges: [
							{ from: 0, to: 0, color: '#f1f5f9' },
							{ from: 1, to: 1, color: '#a3dec9' },
							{ from: 2, to: 2, color: '#7bcfae' },
							{ from: 3, to: 3, color: '#4cb991' },
							{ from: 4, to: 4, color: '#1ca175' },
							{ from: 5, to: 5, color: '#00966b' }
						]
					}
				}
			},
			dataLabels: {
				enabled: false
			},
			legend: {
				show: false
			},
			stroke: {
				width: 5,
				colors: ['var(--color-white)']
			},
			grid: {
				show: false,
				padding: {
					top: -10,
					right: -10,
					bottom: 0,
					left: 0
				}
			},
			xaxis: {
				type: 'category',
				categories: ['0%', '20%', '40%', '60%', '80%'],
				axisBorder: { show: false },
				axisTicks: { show: false },
				labels: {
					style: {
						colors: '#94a3b8',
						fontSize: '12px',
						fontFamily: 'sans-serif'
					}
				}
			},
			yaxis: {
				axisBorder: { show: false },
				axisTicks: { show: false },
				labels: {
					offsetX: -10,
					style: {
						colors: '#64748b',
						fontSize: '12px',
						fontFamily: 'sans-serif'
					}
				}
			},
			tooltip: {
				theme: 'light',
				custom: function({ series, seriesIndex, dataPointIndex, w }) {
					const labelName = w.globals.seriesNames[seriesIndex];
					
					// Map index states back to clean display percentage values
					const valueMap = {
						'Admin': 0,
						'Devops': 40,
						'Document': 20,
						'Testing': 80,
						'Backend': 40,
						'Frontend': 50,
						'UI/UX': 100
					};
					const displayVal = valueMap[labelName] || 0;

					return `
						<div class="p-3 rounded border border-border-color">
							<span style="font-weight: 600; color: #1e293b;">${labelName}:</span> 
							<span style="color: #00966b; font-weight: 700;">${displayVal}%</span>
						</div>
					`;
				}
			}
		};

        var chart = new ApexCharts(document.querySelector('#resource-chart'), options);
        chart.render();
    }
});


	// Simple Line
	if (document.getElementById('s-line')) {
		const sline = {
			chart: {
				height: 350,
				type: 'line',
				zoom: {
					enabled: false
				},
				toolbar: {
					show: false,
				},
				borderWidth: 1,
				borderColor: '#000',
			},
			colors: ['var(--color-primary)'],
			dataLabels: {
				enabled: false
			},
			stroke: {
				curve: 'straight',
				width: 2,
			},
			series: [{
				name: "Desktops",
				data: [10, 41, 35, 51, 49, 62, 69, 91, 148]
			}],
			title: {
				text: 'Product Trends by Month',
				align: 'left',
				style: {
					color: 'var(--color-default)',
				},
			},
			grid: {
				borderColor: 'var(--color-border-color)',
				row: {

					opacity: 0.5
				},
				padding: {
					left: -5,
					right: 0,
				},
			},
			xaxis: {
				labels: {
					style: {
						colors: 'var(--color-default)',
					},
				},
				axisBorder: {
					color: ['var(--color-border-color)'],
				},
				axisTicks: {
					color: ['var(--color-border-color)'],
				},
				categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
			},
			yaxis: {
				labels: {
					offsetX: -15,
					style: {
						colors: 'var(--color-default)',
					},
				},
			},
		}

		const chart = new ApexCharts(
			document.querySelector("#s-line"),
			sline
		);

		chart.render();
	}

	// Simple Line Area
	if (document.getElementById('s-line-area')) {
		const sLineArea = {
			chart: {
				height: 350,
				type: 'area',
				toolbar: {
					show: false,
				}
			},
			colors: ['var(--color-primary)', 'var(--color-warning)'],
			dataLabels: {
				enabled: false
			},
			stroke: {
				curve: 'straight',
				width: 1,
			},
			grid: {
				borderColor: 'var(--color-border-color)',
				padding: {
					left: -5,
					right: -15,
				},
			},
			series: [{
				name: 'Income',
				data: [40, 56, 28, 50, 42, 50, 60]
			}, {
				name: 'Expense',
				data: [20, 36, 20, 40, 25, 40, 30]
			}],

			xaxis: {
				labels: {
					style: {
						colors: 'var(--color-default)',
					},
				},
				axisBorder: {
					color: ['var(--color-border-color)'],
				},
				axisTicks: {
					color: ['var(--color-border-color)'],
				},
				type: 'datetime',
				categories: ["2018-09-19T00:00:00", "2018-09-19T01:30:00", "2018-09-19T02:30:00", "2018-09-19T03:30:00", "2018-09-19T04:30:00", "2018-09-19T05:30:00", "2018-09-19T05:35:00"],
			},
			tooltip: {
				x: {
					format: 'dd/MM/yy HH:mm'
				},
			},
			yaxis: {
				min: 0,
				max: 60,
				labels: {
					offsetX: -15,
					style: {
						colors: 'var(--color-default)',
					},
				},
			},
			legend: {
				labels: {
					colors: 'var(--color-default)',
				}
			},
		}

		const chart = new ApexCharts(
			document.querySelector("#s-line-area"),
			sLineArea
		);

		chart.render();
	}

	if (document.getElementById('s-col')) {
		const sCol = {
			chart: {
				height: 290,
				type: 'bar',
				toolbar: {
					show: false,
				}
			},
			plotOptions: {
				bar: {
					horizontal: false,
					columnWidth: '50%',
					borderRadius: 5,
					endingShape: 'rounded', // This rounds the top edges of the bars
				},
			},
			colors: ['var(--color-primary-500)', 'var(--color-success-500)', 'var(--color-warning-500)'],
			dataLabels: {
				enabled: false
			},
			stroke: {
				show: true,
				width: 2,
				colors: ['transparent']
			},

			series: [{
				name: 'Inprogress',
				data: [19, 65, 19, 19, 19, 19, 19]
			}, {
				name: 'Active',
				data: [89, 45, 89, 46, 61, 25, 79]
			},
			{
				name: 'Completed',
				data: [39, 39, 39, 80, 48, 48, 48]
			}],
			xaxis: {
				categories: ['15 Jan', '16 Jan', '17 Jan', '18 Jan', '19 Jan', '20 Jan', '21 Jan'],
				labels: {
					style: {
						colors: 'var(--color-default)',
						fontSize: '12px',
					}
				},
				axisBorder: {
					color: ['var(--color-border-color)'],
				},
				axisTicks: {
					color: ['var(--color-border-color)'],
				},
			},
			yaxis: {
				labels: {
					offsetX: -15,
					style: {
						colors: 'var(--color-default)',
						fontSize: '14px',
					}
				}
			},
			grid: {
				borderColor: 'var(--color-border-color)',
				strokeDashArray: 5,
				padding: {
					left: -8,
					right: -15,
				},
			},
			fill: {
				opacity: 1
			},
			tooltip: {
				y: {
					formatter: function (val) {
						return "" + val + "%"
					}
				}
			},
			legend: {
				labels: {
					colors: 'var(--color-default)',
				}
			},
		}

		const chart = new ApexCharts(
			document.querySelector("#s-col"),
			sCol
		);

		chart.render();
	}

	// Simple Column Stacked
	if (document.getElementById('s-col-stacked')) {
		const sColStacked = {
			chart: {
				height: 290,
				type: 'bar',
				stacked: true,
				toolbar: {
					show: false,
				}
			},
			responsive: [{
				breakpoint: 480,
				options: {
					legend: {
						position: 'bottom',
						offsetX: -10,
						offsetY: 0
					}
				}
			}],
			plotOptions: {
				bar: {
					horizontal: false,
				},
			},
			grid: {
				borderColor: 'var(--color-border-color)',
				padding: {
					left: -5,
					right: -15,
				},
			},
			colors: ['var(--color-primary-500)', 'var(--color-success-500)', 'var(--color-warning-500)', 'var(--color-pink-500)'],
			series: [{
				name: 'Laptops',
				data: [44, 55, 41, 67, 22, 43]
			}, {
				name: 'Cosmetics',
				data: [13, 23, 20, 8, 13, 27]
			}, {
				name: 'Medical Devices',
				data: [11, 17, 15, 15, 21, 14]
			}, {
				name: 'Software',
				data: [21, 7, 25, 13, 22, 8]
			}],
			yaxis: {
				labels: {
					offsetX: -15,
					style: {
						colors: 'var(--color-default)',
					},
				},
			},
			xaxis: {
				labels: {
					style: {
						colors: 'var(--color-default)',
					},
				},
				axisBorder: {
					color: ['var(--color-border-color)'],
				},
				axisTicks: {
					color: ['var(--color-border-color)'],
				},
				type: 'datetime',
				categories: ['01/01/2011 GMT', '01/02/2011 GMT', '01/03/2011 GMT', '01/04/2011 GMT', '01/05/2011 GMT', '01/06/2011 GMT'],
			},
			legend: {
				labels: {
					colors: 'var(--color-default)',
				},
			},
			fill: {
				opacity: 1
			},
		}

		const chart = new ApexCharts(
			document.querySelector("#s-col-stacked"),
			sColStacked
		);

		chart.render();
	}

	// Simple Bar
	if (document.getElementById('s-bar')) {
		const sBar = {
			chart: {
				height: 350,
				type: 'bar',
				toolbar: {
					show: false,
				}
			},
			colors: ['var(--color-primary-600)'],
			grid: {
				borderColor: 'var(--color-border-color)',
				padding: {
					left: 0,
					right: -15,
				},
			},
			plotOptions: {
				bar: {
					horizontal: true,
				}
			},
			dataLabels: {
				enabled: false
			},
			series: [{
				data: [400, 430, 448, 470, 540, 580, 690, 1100, 1200, 1380]
			}],
			xaxis: {
				labels: {
					style: {
						colors: 'var(--color-default)',
					},
				},
				axisBorder: {
					color: ['var(--color-border-color)'],
				},
				axisTicks: {
					color: ['var(--color-border-color)'],
				},
				categories: ['South Korea', 'Canada', 'United Kingdom', 'Netherlands', 'Italy', 'France', 'Japan', 'United States', 'China', 'Germany'],
			},
			yaxis: {
				labels: {
					offsetX: -10,
					style: {
						colors: 'var(--color-default)',
					},
				},
			},
		}

		const chart = new ApexCharts(
			document.querySelector("#s-bar"),
			sBar
		);

		chart.render();
	}

	// Mixed Chart
	if (document.getElementById('mixed-chart')) {
		const options = {
			chart: {
				height: 350,
				type: 'line',
				toolbar: {
					show: false,
				}
			},
			colors: ['var(--color-primary-600)', 'var(--color-success-600)'],
			series: [{
				name: 'Website Blog',
				type: 'column',
				data: [440, 505, 414, 671, 227, 413, 201, 352, 752, 320, 257, 160]
			}, {
				name: 'Social Media',
				type: 'line',
				data: [23, 42, 35, 27, 43, 22, 17, 31, 22, 22, 12, 16]
			}],
			stroke: {
				width: [0, 4]
			},
			grid: {
				borderColor: 'var(--color-border-color)',
				padding: {
					left: -5,
					right: -15,
				},
			},
			title: {
				text: 'Traffic Sources',
				style: {
					color: 'var(--color-default)',
				},
			},
			legend: {
				labels: {
					colors: 'var(--color-default)',
				}
			},
			labels: ['01 Jan 2001', '02 Jan 2001', '03 Jan 2001', '04 Jan 2001', '05 Jan 2001', '06 Jan 2001', '07 Jan 2001', '08 Jan 2001', '09 Jan 2001', '10 Jan 2001', '11 Jan 2001', '12 Jan 2001'],
			xaxis: {
				type: 'datetime',
				labels: {
					style: {
						colors: 'var(--color-default)',
					},
				},
				axisBorder: {
					color: ['var(--color-border-color)'],
				},
				axisTicks: {
					color: ['var(--color-border-color)'],
				}
			},
			yaxis: [{
				title: {
					text: 'Website Blog',
				},
				labels: {
					offsetX: -15,
					style: {
						colors: 'var(--color-default)',
					},
				},

			}, {
				opposite: true,
				title: {
					text: 'Social Media'
				},
				labels: {
					offsetX: -15,
					style: {
						colors: 'var(--color-default)',
					},
				},
			}]

		}

		const chart = new ApexCharts(
			document.querySelector("#mixed-chart"),
			options
		);

		chart.render();
	}

	// Donut Chart
	if (document.getElementById('donut-chart')) {
		const donutChart = {
			chart: {
				height: 330,
				type: 'donut',
				toolbar: {
					show: false,
				}
			},
			legend: {
				position: 'bottom',
				labels: {
					colors: 'var(--color-default)',
				}
			},
			colors: ['var(--color-primary-600)', 'var(--color-success-600)', 'var(--color-warning-600)', 'var(--color-pink-600)'],
			labels: ['Laptops', 'Cosmetics', 'Medical Devices', 'Software'],
			series: [44, 55, 41, 17],
			responsive: [{
				breakpoint: 480,
				options: {
					chart: {
						width: 200
					},
					legend: {
						position: 'bottom'
					}
				}
			}]
		}

		const donut = new ApexCharts(
			document.querySelector("#donut-chart"),
			donutChart
		);

		donut.render();
	}

	// Radial Chart
	if (document.getElementById('radial-chart')) {
		const radialChart = {
			chart: {
				height: 350,
				type: 'radialBar',
				toolbar: {
					show: false,
				}
			},
			colors: ['var(--color-primary-600)', 'var(--color-success-600)', 'var(--color-warning-600)', 'var(--color-pink-600)'],
			plotOptions: {
				radialBar: {
					dataLabels: {
						name: {
							fontSize: '22px',
							color: 'var(--color-title)',
						},
						value: {
							fontSize: '16px',
							color: 'var(--color-default)',
						},
						total: {
							show: true,
							label: 'Total',
							color: 'var(--color-default)',
							formatter: function (w) {
								return 249
							}
						}
					}
				}
			},
			series: [44, 55, 67, 83],
			labels: ['Apples', 'Oranges', 'Bananas', 'Berries'],
		}

		const chart = new ApexCharts(
			document.querySelector("#radial-chart"),
			radialChart
		);

		chart.render();
	}


	
