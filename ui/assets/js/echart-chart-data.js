// Map Chart
if (document.getElementById('chart-container')) {
	const apiUsageData = [
		{ name: 'Canada', value: [-106.35, 56.13, 70] }, //
		{ name: 'Malaysia', value: [101.98, 4.21, 55] }, //
		{ name: 'Portugal', value: [-8.22, 39.4, 40] } //
	];

	function initializeChart() {
		const chartDom = document.getElementById('chart-container');
		const myChart = echarts.init(chartDom);

		const option = {
			tooltip: { trigger: 'item' },
			visualMap: {
				min: 0,
				max: 100,
				dimension: 2,
				show: false, // Set 'show' to false to hide the sidebar
				inRange: {
					symbolSize: [10]
				}
			},
			geo: {
				map: 'world', // This now works because world.js was loaded above
				roam: true,
				itemStyle: {
					areaColor: '#EDE6FF',
					borderColor: '#EDE6FF'
				}
			},
			series: [{
				type: 'scatter',
				coordinateSystem: 'geo',
				data: apiUsageData,
				itemStyle: {
					color: '#7A13F0', borderColor: '#F5F1FF',
					borderWidth: 6
				},
				symbolSize: 2
			}]
		};

		myChart.setOption(option);

		// This makes the chart responsive
		window.addEventListener('resize', function () {
			myChart.resize();
		});
	}

	initializeChart();
}
