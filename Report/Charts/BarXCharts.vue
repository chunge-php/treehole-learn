<template>
  <div ref="barXRef" class="chart-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
const emit = defineEmits(['chartReady'])
const barXRef = ref(null)
let chartInstanceX = null

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
    }
  },
  { immediate: true }
);

const initChart = () => {
  if (!barXRef.value) return
  if (chartInstanceX) chartInstanceX.dispose()

  chartInstanceX = echarts.init(barXRef.value)

  const option = {

    xAxis: {
      type: 'value',
      max: 100,
      splitLine: { show: false },
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    yAxis: {
      type: 'category',
      data: chartData.value?.name ?? [],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#666',
        fontSize: 13,
        margin: 12
      }
    },

    series: [
      {
        type: 'bar',
        data: chartData.value?.data ?? [],
        barWidth: 14,
        itemStyle: {
          color: '#3180C3',
          borderWidth: 2,
          borderColor: '#3180C3',
          borderRadius: 0
        },
        backgroundStyle: {
          color: '#3180C3',
          borderRadius: 10
        },

        label: {
          show: true,
          position: 'right',
          formatter: '{c}', //%
          color: '#3180C3',
          fontSize: 14,
          padding: [0, 5]
        }
      }
    ]
  }

  chartInstanceX.setOption(option)

  emit('chartReady')
}

const resizeChart = () => {
  if (chartInstanceX) chartInstanceX.resize()
}

onMounted(() => {
  window.addEventListener('resize', resizeChart)

})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstanceX?.dispose()
})

</script>

<style scoped>
.chart-container {
  width: 700px;
  height: 340px;
}
</style>
