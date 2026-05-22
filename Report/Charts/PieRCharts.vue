<template>
  <div ref="pieRRef" class="chart-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const emit = defineEmits(['chartReady'])
const pieRRef = ref(null)
let chartInstancePie = null

const props = defineProps({
  isTid: Number,
  isData: {
    type: Object,
    default: () => ({})
  }
})

const chartData = ref({})

watch(
  () => props.isTid,
  (newValue) => {
    if (newValue) {
      chartData.value = props.isData ?? {}
      initChart()
      window.addEventListener('resize', resizeChart)
    }
  },
  { immediate: true }
)

const initChart = () => {
  if (!pieRRef.value) {
    console.warn('图表容器未找到')
    return
  }

  try {
    if (chartInstancePie) {
      chartInstancePie.dispose()
    }

    chartInstancePie = echarts.init(pieRRef.value)

    const option = {
      color: [chartData.value?.color ?? '#4CA95E'],
      tooltip: {
        trigger: 'axis'
      },
      radar: {
        indicator: [
          { name: '实际', max: 100, color: '#4CA95E' },
          { name: '研究', max: 100, color: '#02D1D4' },
          { name: '艺术', max: 100, color: '#2580CA' },
          { name: '社会', max: 100, color: '#BB1228' },
          { name: '企业', max: 100, color: '#AF8E40' },
          { name: '事物', max: 100, color: '#9D6CDB' }
        ],
        center: ['50%', '50%'],
        radius: 70,
        axisName: {
          color: '#666'
        }
      },
      series: [
        {
          name: '兴趣测评',
          type: 'radar',
          tooltip: {
            trigger: 'item'
          },
          data: [
            {
              value: chartData.value?.data ?? [],
              label: {
                show: true,
                formatter: function (params) {
                  return params.value
                }
              },
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.1, 0.6, 1, [
                  {
                    color: 'rgba(255, 145, 124, 0.1)',
                    offset: 0
                  },
                  {
                    color:
                      chartData.value?.color ?? 'rgba(255, 145, 124, 0.9)',
                    offset: 1
                  }
                ])
              }
            }
          ]
        }
      ]
    }

    chartInstancePie.setOption(option)
    emit('chartReady')
  } catch (error) {
    console.error('ECharts 初始化失败:', error)
  }
}

const resizeChart = () => {
  if (chartInstancePie) chartInstancePie.resize()
}

onMounted(() => {
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstancePie?.dispose()
})
</script>

<style scoped>
.chart-container {
  width: 326px;
  height: 230px;
}
</style>
