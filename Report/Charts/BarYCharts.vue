<template>
  <div class="bar-y">
    <div ref="barYRef" class="chart-container"></div>
    <div class="bar-y-list">
      <div class="bar-y-item flex">
        <div class="bar-y-title">得分排名</div>
        <div class="bar-y-content grid" :class="'grid-cols-' + itemsData.length">
          <div class="bar-y-value flex justify-center  align-center" v-for="(item, index) in itemsData" :key="index">
            <div :style="{ 'color': itemsColor[index].start, 'font-weight': 'bold' }">{{ item.rank }}</div>
          </div>
        </div>
      </div>
      <div class="bar-y-line"></div>
      <div class="bar-y-item flex">
        <div class="bar-y-title">兴趣类型</div>
        <div class="bar-y-content grid" :class="'grid-cols-' + itemsData.length">
          <div class="bar-y-value flex justify-center align-center" v-for="(item, index) in itemsData" :key="index">
            <div style="color:#666">
              <div>{{ item.name }}</div>
              <div>{{ item.utils }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
const emit = defineEmits(['chartReady'])

const barYRef = ref(null)
let chartInstanceY = null
const colors = [
  { start: '#4CA95E', end: '#B7E9CF' }, // 实际 R
  { start: '#02D1D4', end: '#A3EAF8' }, // 研究 I
  { start: '#2580CA', end: '#ADD6FC' }, // 艺术 A
  { start: '#BB1228', end: '#DBBDD0' }, // 社会 S
  { start: '#AF8E40', end: '#DADBCC' }, // 企业 E
  { start: '#9D6CDB', end: '#CFC8FB' }, // 事物 C
]
const getGradientColor = (index) => {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: colors[index % colors.length].start },
    { offset: 1, color: colors[index % colors.length].end }
  ])
}
const itemsData = ref([]);
const itemsColor = ref(colors);

const props = defineProps({
  isTid: Number,
  isData: {
    type: Array,
    default: () => ([])
  }
});

watch(
  () => props.isTid,
  (newValue) => {
    if (newValue) {
      itemsData.value = props.isData ?? []
      initChart()
    }
  },
  { immediate: true }
);
const initChart = () => {
  if (!barYRef.value) return
  if (chartInstanceY) chartInstanceY.dispose()

  chartInstanceY = echarts.init(barYRef.value)
  const option = {
    grid: {
      top: '15%',
      left: 70,
      right: '0%',
      bottom: 5,
      containLabel: true
    },

    xAxis: {
      type: 'category',
      data: itemsData.value.map(item => item.name),
      axisLabel: {
        show: false,
        rich: {
          rank: {
            fontSize: 11,
            color: '#7D7D7D',
            lineHeight: 18,
            padding: [0, 0, 4, 0]
          },
          label: {
            fontSize: 12,
            color: '#333',
            lineHeight: 18
          }
        },
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#999999', fontSize: 12 },
      axisLine: { lineStyle: { color: '#ECECEC' } },
      axisTick: { lineStyle: { color: '#ECECEC' } },
      splitLine: { lineStyle: { color: '#ECECEC', type: 'solid' } }
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    label: {
      show: true,
      position: 'top',
      formatter: '{c}', //%
      color: '#3180C3',
      fontSize: 12,
      padding: [5, 0]
    },
    series: [
      {
        type: 'bar',
        data: itemsData.value.map(item => item.score),
        barWidth: '30%',
        itemStyle: {
          borderRadius: [10, 10, 0, 0],
          color: (params) => getGradientColor(params.dataIndex),
        }
      }
    ]
  }

  chartInstanceY.setOption(option)
  emit('chartReady')
}

const resizeChart = () => {
  if (chartInstanceY) chartInstanceY.resize()
}

onMounted(() => {
  window.addEventListener('resize', resizeChart)

})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstanceY?.dispose()
})
</script>

<style scoped>
.bar-y {
  position: relative;
  width: 326px;
}

.chart-container {
  width: 326px;
  height: 200px;
}

.bar-y-list {
  position: relative;
  width: 100%;
  height: 57px;
}

.bar-y-item {
  height: 28px;
  line-height: 28px;
}

.bar-y-line {
  position: relative;
  width: 100%;
  height: 1px;
  background-color: #666;
}

.bar-y-title {
  width: 80px;
  text-align: center;
  flex-shrink: 0;
  margin-right: 5px;
  color: #666;
}

.bar-y-value {
  text-align: center;
  padding: 0 2px;
  line-height: 12px;
  font-size: 12px;
}
</style>
