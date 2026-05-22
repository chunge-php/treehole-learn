<template>
  <div ref="pieRef" class="chart-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
const emit = defineEmits(['chartReady'])
const pieRef = ref(null)
let chartInstance = null
let resizeObserver = null
const props = defineProps({
  isTid: Number,
  isData: {
    type: Object,
    default: () => ({})
  }
});

const chartData = ref([]);


watch(
  () => props.isTid,
  (newValue) => {
    if (newValue) {
      chartData.value = props.isData?.data ?? []
      initChart()
      window.addEventListener('resize', resizeChart)
    }
  },
  { immediate: true }
);

const initChart = () => {
  if (!pieRef.value) {
    return
  }

  try {
    if (chartInstance) {
      chartInstance.dispose()
    }

    chartInstance = echarts.init(pieRef.value)
    const option = {
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 'center',
        bottom: 'auto',
        left: 'auto',
        textStyle: {
          fontSize: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: 100
        },
        scrollDataIndex: 0,
        pageButtonPosition: 'end',
        pageIconSize: 12,
        pageTextStyle: {
          fontSize: 12
        }
      },
      series: [
        {
          name: 'Nightingale Chart',
          type: 'pie',
          radius: [40, 120],
          center: ['40%', '50%'],
          roseType: 'area',
          itemStyle: {
            borderRadius: 0
          },
          data: chartData.value ?? [],
          color: [
            "#57DCC1",
            "#E04372",
            "#F6B901",
            "#7A4BFE",
            "#2E9AEB",
            "#7DD900",
            "#455DEF",
            "#CB40E4",
            "#FFEB3B",
          ]
        }
      ]
    };

    chartInstance.setOption(option)
    emit('chartReady')
  } catch (error) {
  }
}

const resizeChart = () => {
  if (chartInstance) chartInstance.resize()
}

onMounted(() => {
  window.addEventListener('resize', resizeChart)

})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
})

</script>

<style scoped>
.chart-container {
  width: 700px;
  height: 260px;
}
</style>