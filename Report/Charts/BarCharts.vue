<template>
  <div ref="barRef" class="chart-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
const emit = defineEmits(['chartReady'])

const barRef = ref(null)
let chartInstanceB = null
let resizeObserver = null


const getGradientColor = (index) => {
  const colors = [
    { start: '#FFDFA6', end: '#FFEFD6' },
    { start: '#FDA5A5', end: '#FFD0D0' },
    { start: '#BCB0FA', end: '#DED5FD' },
    { start: '#4CA95E', end: '#B7E9CF' }, // 实际 R
    { start: '#02D1D4', end: '#A3EAF8' }, // 研究 I
    { start: '#2580CA', end: '#ADD6FC' }, // 艺术 A
    { start: '#BB1228', end: '#DBBDD0' }, // 社会 S
    { start: '#AF8E40', end: '#DADBCC' }, // 企业 E
    { start: '#9D6CDB', end: '#CFC8FB' }, // 事物 C
  ]


  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: colors[index % colors.length].start },
    { offset: 1, color: colors[index % colors.length].end }
  ])
}


const props = defineProps({
  isTid: Number,
  isData: {
    type: Object,
    default: () => ({})
  }
});

const chartData = ref({});


watch(
  () => props.isTid,
  (newValue) => {
    if (newValue) {
      chartData.value = props.isData ?? []
      initChart()
      window.addEventListener('resize', resizeChart)
    }
  },
  { immediate: true }
);


const initChart = () => {
  if (!barRef.value) return

  if (chartInstanceB) chartInstanceB.dispose()

  chartInstanceB = echarts.init(barRef.value)
  const seriesData = chartData.value?.data ?? []
  const option = {
    xAxis: {
      type: 'category',
      data: chartData.value?.name ?? [],
      axisLabel: { color: '#999999', fontSize: 12 },
      axisLine: { lineStyle: { color: '#ECECEC' } },
      axisTick: { lineStyle: { color: '#ECECEC' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#999999', fontSize: 12 },
      axisLine: { lineStyle: { color: '#ECECEC' } },
      axisTick: { lineStyle: { color: '#ECECEC' } },
      splitLine: { lineStyle: { color: '#ECECEC', type: 'solid' } }
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { show: false },
    label: {
      show: true,
      position: 'top',
      formatter: '{c}', //%
      color: '#3180C3',
      fontSize: 14,
      padding: [5, 0]
    },
    series: [
      {
        type: 'bar',
        data: seriesData,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params) => getGradientColor(params.dataIndex)
        },
        barWidth: '40%'
      }
    ]
  }

  chartInstanceB.setOption(option)
  emit('chartReady')
}

const resizeChart = () => {
  if (chartInstanceB) chartInstanceB.resize()
}

onMounted(() => {
  window.addEventListener('resize', resizeChart)

})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstanceB?.dispose()
})
</script>

<style scoped>
.chart-container {
  width: 700px;
  height: 340px;
}
</style>
