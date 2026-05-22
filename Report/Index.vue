<template>
    <div class="user-pdf">
        <PdfPage ref="pdfRef" :isTid="pdfRefTid" @forPdfPage="forPdfPage" :isData="reportDataHeader"
            :canRender="chartOK" v-if="pdfMarkTitle != 'empty'">
            <template #pdf-home>
                <div class="text-center">
                    <h1>《个性化学习与发展评估报告》</h1>
                </div>
                <div class="pdf-home-line"></div>
                <div class="text-center">
                    <h2>个人报告</h2>
                </div>
                <div class="pdf-home-form">
                    <div class="pdf-home-item" v-for="(item, index) in homeForm" :key="index">
                        <div class="form-item flex">
                            <div class="pdf-home-label"><span v-html="item.label"></span>：</div>
                            <div class="pdf-home-value flex align-center">
                                <div class="pdf-home-unit">[</div>
                                <div class="pdf-home-text">{{ item.value }}</div>
                                <div class="pdf-home-unit">]</div>
                            </div>
                        </div>

                    </div>
                </div>
            </template>
            <template #pdf-body>
                <div class="pdf-h1">
                    <h1>《个性化学习与发展评估报告》</h1>
                </div>
                <div class="pdf-title display-flex">
                    <h1>一、通用导读</h1>
                </div>
                <h3 class="title-h3">通用导读</h3>
                <p>本报告基于多模态测评记录、多元性向潜能发展测评、兴趣测评及主观自陈量表四份测评，从抗压能力、自信心等
                    9个维度，全面评估学生学习状态与发展潜力。报告将明确其学习类型，解读测评结果，并提供针对性发展建议，助力优化学习策略、改善学习心态。</p>
                <div class="pdf-title-h3">
                    <h3 class="title-h3">学习发展综合数字画像</h3>
                </div>
                <div class="p-bottom-15">
                    <div class="pdf-info flex justify-between">
                        <div class="pdf-info-text">
                            <div class="pdf-info-title">{{ reportData?.value1?.title ?? '' }}</div>
                            <div class="pdf-info-content">
                                {{ reportData?.value1?.content ?? '' }}
                            </div>
                        </div>
                        <div class="pdf-info-image cover"
                            :style="{ 'background-image': `url(/pdf/i${reportData?.value1?.img ?? ''}.png)` }">
                        </div>
                    </div>
                </div>
                <div class="pdf-title-h3">
                    <h3 class="title-h3">各维度数据展示</h3>
                </div>
                <div class="pdf-pie">
                    <div class="pdf-info-chart flex justify-center">
                        <PieCharts @chartReady="onChartReady" :isTid="chartTid" :isData="pieData"></PieCharts>
                    </div>
                </div>
                <div>
                    <div class="pdf-title display-flex">
                        <h1>二、综合结论与类型界定</h1>
                    </div>
                </div>
                <div>
                    <div class="title-2 flex align-center">
                        <div class="title-2-label">经过测评您在八维学格类型中属于:</div>
                        <div class="title-2-value">{{ reportData?.value3?.title ?? "" }}</div>
                    </div>
                </div>
                <div>
                    <div class="pdf-table">
                        <div class="pdf-table-top grid grid-cols-2">
                            <div class="pdf-table-item">八维学格</div>
                            <div class="pdf-table-item">组合规则 <span>（l-表示低 &nbsp; h-表示高）</span></div>
                        </div>
                        <div class="pdf-table-header grid grid-cols-2">
                            <div class="pdf-table-item"></div>
                            <div class="pdf-table-item grid grid-cols-3">
                                <div class="pdf-table-th">
                                    <div>多模态</div>
                                    <div>Eh/El</div>
                                </div>
                                <div class="pdf-table-th">
                                    <div>多元性向R</div>
                                    <div>Rh/Rl</div>
                                </div>
                                <div class="pdf-table-th">
                                    <div>自陈量表S</div>
                                    <div>Sh/Sl</div>
                                </div>
                            </div>
                        </div>
                        <div class="pdf-table-body grid grid-cols-2" v-for="(item, index) in tableData" :key="index">
                            <div class="pdf-table-item">
                                <div class="pdf-table-tr">{{ item.label }}</div>
                                <div class="pdf-table-value">{{ item.value }}</div>
                            </div>
                            <div class="pdf-table-item grid grid-cols-3">
                                <div class="pdf-table-td">
                                    {{ item.a }}
                                </div>
                                <div class="pdf-table-td">
                                    {{ item.b }}
                                </div>
                                <div class="pdf-table-td">
                                    {{ item.c }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">主要类型：{{ reportData?.value3?.title ?? "" }}</h3>
                    </div>
                </div>
                <p>{{ reportData?.value3?.content ?? "" }}
                </p>
                <div class="pdf-title display-flex title-top">
                    <h1>三、测评维度深度解读</h1>
                </div>
                <div class="pdf-title-h3">
                    <h3 class="title-h3">（一）多模态测评记录</h3>
                </div>
                <p><span class="text-color">测评核心：</span>聚焦日常及压力场景下的情绪表现，重点观察面对考试、学习挫折时的心态变化。
                </p>
                <p><span class="text-color">结果解读：</span>
                </p>
                <div v-if="reportData?.value4">
                    <p><span>{{ reportData?.value4?.status_anxiety?.title ?? "" }}：</span> {{
                        reportData?.value4?.status_anxiety?.result ?? "" }}
                    </p>
                    <p><span>{{ reportData?.value4?.trait_anxiety?.title ?? "" }}：</span> {{
                        reportData?.value4?.trait_anxiety?.result ?? "" }}
                    </p>
                    <p><span>{{ reportData?.value4?.study_anxiety?.title ?? "" }}：</span> {{
                        reportData?.value4?.study_anxiety?.result ?? "" }}
                    </p>
                </div>
                <div class="pdf-info-chart flex justify-center">
                    <BarCharts @chartReady="onChartReady" :isTid="chartTid" :isData="barData"></BarCharts>
                </div>
                <div class="pdf-title-h3">
                    <h3 class="title-h3">（二）多元性向潜能发展测评</h3>
                </div>
                <p><span
                        class="text-color">测评核心：</span>从语文辞意、数学概念、抽象逻辑、立体空间、中文字词、中文语法等多个角度，观察学习相关的核心能力表现，判断不同学科学习中的优势与待提升点。
                </p>
                <p><span class="text-color">结果解读：</span>
                </p>
                <p v-for="(item, index) in reportData?.value6 ?? []" :key="index"><span>{{ item?.title ?? ""
                        }}：</span>
                    {{
                        item?.content ?? "" }}
                </p>

                <div class="pdf-info-chart flex justify-center">
                    <BarXCharts @chartReady="onChartReady" :isTid="chartTid" :isData="barXData"></BarXCharts>
                </div>
                <div class="pdf-title-h3">
                    <h3 class="title-h3">（三）兴趣测评</h3>
                </div>
                <p><span class="text-color">测评核心：</span>通过观察对不同活动、职业、课程的偏好，明确兴趣倾向，为学习动力激发、未来选科和职业规划提供参考。
                </p>
                <p><span class="text-color">结果解读：</span>
                </p>
                <p><span>自我认知与心态：</span>对自身学习能力的信心不足，尤其是在学习结果不理想时，容易否定自己，选择逃避而非主动解决问题;面对考试时，即使做好准备也会感到紧张，缺乏稳定的应试心态。
                </p>
                <p><span>学习习惯与方法：</span>在时间安排上缺乏规划，容易拖延重要学习任务，且学习时易受手机等外界因素干扰;没有形成系统的学习流程，比如课前预习、课后复习、错题整理等环节落实不到位，影响学习效果。
                </p>
                <p><span>目标与动力：</span>没有清晰的学习目标，不知道如何将长期目标拆解为可执行的短期任务，也不会定期检查学习进度;学习动力依赖结果反馈，一旦成绩不理想，就容易失去学习热情，内在学习动力需要进一步强化。
                </p>
                <p><span>支持感知：</span>对家庭支持的感受需结合具体表现判断，若在遇到学习压力或情绪问题时，能感受到家人的理解和安慰，而非仅关注成绩，会更有利于缓解焦虑;若家人过度关注分数、忽视情绪需求，则可能加重学习压力。
                </p>
                <div class="p-bottom-15">
                    <div class="pdf-info-none">
                        <div class="pdf-info1 grid grid-cols-2 ">
                            <div class="pdf-info-chart">

                                <div class="pdf-chart-header">
                                    <h3 class="title-h3">兴趣组型</h3>
                                    <p>兴趣量表测验所得的兴趣组型</p>
                                </div>
                                <div class="pdf-chart-abc grid grid-cols-3">
                                    <div class="pdf-abs-item" v-for="(item, index) in data1" :key="index">
                                        <div class="pdf-abs-text" :style="{ color: item.color }">
                                            {{ item.value }}
                                        </div>
                                        <div class="pdf-abs-value">
                                            {{ item.name }}
                                        </div>
                                    </div>
                                </div>

                                <div class="pdf-chart-rose">
                                    <PieRCharts @chartReady="onChartReady" :isTid="chartTid" :isData="pieRData">
                                    </PieRCharts>
                                </div>
                            </div>
                            <div class="pdf-info-chart">
                                <div class="pdf-chart-header">
                                    <h3 class="title-h3">兴趣类型分数图</h3>
                                    <p>各类兴趣类型得分直方图</p>
                                </div>

                                <div class="pdf-chart-box">
                                    <BarYCharts @chartReady="onChartReady" :isTid="chartTid" :isData="barYData">
                                    </BarYCharts>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-bottom-20">
                    <div class="pdf-info">
                        <div class=" grid grid-cols-2">
                            <div class="pdf-info-auto">

                                <div class="pdf-chart-header">
                                    <h3 class="title-h3">区分性指标：<span>{{ reportData?.value8?.diff_level ?? ''
                                            }}</span>
                                    </h3>
                                    <p>各类型的得分差异程度指标，分为三个等级:高/中/低·等级越高表示越容易比较出喜欢与不喜欢的兴趣类型 ;</p>
                                </div>
                                <div class="pdf-vs">
                                    <div class="pdf-chart-vs flex justify-center">
                                        <div class="pdf-vs-title text-right">{{ reportData?.value8?.top3 ?? '' }}
                                        </div>
                                        <div class="pdf-vs-title pdf-vs-center">VS</div>
                                        <div class="pdf-vs-title">{{ reportData?.value8?.self_introduce ?? '' }}
                                        </div>
                                    </div>
                                    <div class="pdf-chart-vs flex justify-center">
                                        <div class="pdf-vs-value text-right">（兴趣组型）</div>
                                        <div class="pdf-vs-center"></div>
                                        <div class="pdf-vs-value">（自我介绍组型）</div>
                                    </div>
                                </div>

                            </div>
                            <div class="pdf-info-auto">
                                <div class="pdf-chart-header">
                                    <h3 class="title-h3">谐和度指标：<span>{{ reportData?.value8?.norm_level ?? ''
                                            }}</span>
                                    </h3>
                                    <p>量表测验所得的兴趣组型兴自我介绍组型的相近程度指标。分为四种等级 :高/中上/普通/低。等级越高表示两组型越相近</p>
                                </div>
                            </div>
                        </div>
                        <div class="pdf-info-line">
                            <p>此页为测验结果的综合报告，即测验结果与重要指标的汇整。本测验结果的核心包括:兴趣组型、兴趣六角图、兴趣类型分数图、区分性和谐和度指标。在接下来的报告中，将会呈现每部分做详细的说明与结果的解释。你可以依循此综合报告，作为阅读时的参考工具，协助你完整地认识生涯兴趣量表和你的测验结果
                            </p>
                        </div>
                    </div>
                </div>
                <div class="pdf-table">
                    <div class="pdf-table-top flex">
                        <div class="pdf-table-flex">类型</div>
                        <div class="pdf-table-col">解读</div>
                    </div>
                    <div class="pdf-table-body flex" v-for="(item, index) in tableData1" :key="index">
                        <div class="pdf-table-flex ">
                            <div class="pdf-table-tr">{{ item.label }}</div>
                            <div class="pdf-table-value">{{ item.value }}</div>
                        </div>
                        <div class="pdf-table-col">
                            <p><span>兴趣类型：</span>{{ item?.a ?? "" }}
                            </p>
                            <p><span>职业活动：</span>{{ item?.b ?? "" }}
                            </p>
                            <p><span>性格特征：</span>{{ item?.c ?? "" }}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="pdf-title-h3">
                    <h3 class="title-h3">（四）主观自陈量表</h3>
                </div>
                <p><span class="text-color">测评核心：</span>结合日常学习中的真实想法和行为，从自我认知、习惯养成、目标管理、支持感知等角度，分析学习过程中的内在状态。
                </p>
                <p><span class="text-color">结果解读：</span>
                </p>
                <p v-for="(item, index) in reportData?.value9 ?? []" :key="index">
                    <span>{{ item?.name ?? "" }}：</span>{{ item?.value ?? "" }}
                </p>

                <div class="pdf-title display-flex title-top">
                    <h1>四、发展建议及能力提升方向</h1>
                </div>
                <p>结合学生当前学习状态与测评结果，建议从{{ reportData?.value3?.str ?? "" }}方向入手，针对性提升能力，充分发挥其学习潜力。
                </p>
                <div class="pdf-title-h3">
                    <h3 class="title-h3">（一）针对学生的抗压能力和情绪状态的建议</h3>
                </div>
                <div v-for="(item, index) in data2" :key="index">
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">{{ index + 1 }}、{{ item.title }}</h3>
                    </div>
                    <div v-for="(child, num) in item.value" :key="num">
                        <p><span class="text-color">{{ child?.title ?? "" }}</span>{{ child?.value
                            ?? "" }}
                        </p>
                    </div>
                </div>
                <div class="pdf-title-h3">
                    <h3 class="title-h3">（二）针对学习策路、学习动力等方面的提升建议</h3>
                </div>
                <div>
                    <div v-for="(item, index) in data3" :key="index">
                        <div class="pdf-title-h3">
                            <h3 class="title-h3 text-color">{{ index + 1 }}、{{ item?.title ?? "" }}</h3>
                        </div>
                        <div v-for="(child, num) in item.value" :key="num">
                            <p><span>{{ child?.title ?? "" }}</span>{{ child?.value ?? "" }}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="pdf-title-h3">
                    <h3 class="title-h3 text-color">5、关于学生能感知到的支持的建议</h3>
                </div>
                <div class="pdf-title-h3">
                    <h3 class="title-h3">@学生的建议:</h3>
                </div>
                <div v-for="(item, index) in data4?.student ?? []" :key="index">
                    <p><span>{{ item?.title ?? "" }}</span>{{ item?.value ?? "" }}</p>
                </div>

                <div class="pdf-title-h3">
                    <h3 class="title-h3">@家长建议:</h3>
                </div>
                <div v-for="(item, index) in data4?.parents ?? []" :key="index">
                    <p><span>{{ item?.title ?? "" }}</span>{{ item?.value ?? "" }}</p>
                </div>
            </template>
        </PdfPage>
        <div class="user-pdf-mark flex justify-center align-center" v-if="pdfRefLoading || pdfMarkTitle == 'empty'">
            <div class="mark-title cover" :class="'mark-title__' + pdfMarkTitle"></div>
        </div>
        <div class="user-pdf-download flex align-center" @click="handleDownloadPdf"
            v-if="downloadAction == 'view-download'">
            <div class="download-icon">
                <Icon isIcon="ea90" isSize="20"></Icon>
            </div>
            <div class="download-text">下载报告</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted } from 'vue'
import type { PdfPageExpose } from './components/PdfPage.vue'
import dayjs from "dayjs";
import { getReportPdf } from "@/shared/utils/http"
import { PdfPage } from './components'
import AESHelper from "@/shared/ui/AESHelper"
import { useRoute } from "vue-router"
import ZoomController from "@/shared/ui/ZoomController"
const nietz: any = inject('nietz')
const route = useRoute();
const aesInstance = new AESHelper();
const pdfMarkTitle = ref('loading')
const zoomController = new ZoomController();
import {
    BarCharts,
    BarXCharts,
    BarYCharts,
    PieCharts,
    PieRCharts
} from "./Charts"
const emit = defineEmits(['forPdf']);

const homeForm = ref([
    { label: "测评姓名", value: "" },
    { label: "测评编号", value: "" },
    { label: "测评日期", value: "" },
])

const podiumItems = ref([
    // { label: "波动焦虑型", value: 2 },
    { label: "", value: 1 },
    // { label: "潜力待挖型", value: 3 }
])

const tableData = ref([
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "死磕傻学型", value: "蛮干，埋头硬冲到底型", a: "l", b: "l", c: "h" },
    { label: "摆烂到底型", value: "躺平到完全躺平，毫无波澜", a: "l", b: "l", c: "l" },
    { label: "稳定卓越型", value: "全能无短板，八边形学霸天花板级", a: "h", b: "h", c: "h" },
    { label: "策略僵化型", value: "方法老套到极致，低效到没救", a: "h", b: "l", c: "h" },
    { label: "佛系躺平型", value: "彻底摆烂，自我放弃到极致", a: "h", b: "l", c: "l" },
    { label: "动力缺失型", value: "内驱力彻底告急，毫无冲劲", a: "l", b: "h", c: "h" },
    { label: "潜力待挖型", value: "黑马属性拉满，潜力大到爆炸", a: "l", b: "h", c: "l" },
])

const tableData1 = ref([
    { label: "实用型", value: "Realistic", a: "喜欢在讲求实际、技术规范下动手做明确的工作，对机械、仪器、工具、动能设备有兴趣。生活喜以以实用为主，眼前的事胜于对未来的想象。情绪稳定，不善与人有深入的接触。", b: "适合从事机械，电子、土木建筑、生物科技等工作。", c: "情绪安稳、内向不善表达，严谨按部就班，谦虚有恒。" },
    { label: "研究型", value: "Investigative", a: "此类型的人喜欢用理性思考分析，该学生善于观察判断与推理，喜欢运用符号、概念、公式来面对工作以解决问题。", b: "喜欢从事物理、化学、生物、数学、医药等研发工作，有科学及数理的能力，不好领导与社交。", c: "重视方法分析、独立、批判、理性。" },
    { label: "艺术型", value: "Artistic", a: "此型的人善于创新、设计与美学的表达，喜欢用文字、动作、声音、色彩、音乐、舞蹈或戏剧来表达美的事物。该学生们需要敏锐的感觉、想象力与创造力。在语言方面的能力高于数理。", b: "该学生们喜欢成为设计师、作家、画家、媒体人、音乐家、歌手与表演工作者。", c: "感性、有理想、不从众、有创意、善于表达、冲动。" },
    { label: "社会型", value: "Social", a: "此类型的人善于与人相处，该学生们关怀与帮助该学生人的身心需求，希望了解、分析鼓励教导别人成为正向乐群的人。", b: "喜欢从事助人的工作，如教师、咨询师、社工师、医护人员、活动辅导员。", c: "温暖、亲切、仁慈、合作、同理、宽容、有责任、助人。" },
    { label: "企业型", value: "Enterprising", a: "兴趣类型：此类型的人喜欢运用规则能力，领导力和口语表达，组织安排及统筹管理人员，以促进机构与团队在经济、政治或社会上的利益，具有好的沟通能力，但较不在乎细部研发。", b: "该学生们喜欢销售、督导、策画、倡导等活动，有兴趣从事营销、采购、产销链、律师法官及公务行政等工作。", c: "精力充沛、动作快、冒险、外向、有企图心、社交、热情、决策快速。" },
    { label: "事务型", value: "Conventional", a: "此型的人注意细节及事务技能，擅长纪录、建文件、编辑文件或核算精细的数字。", b: "善于执行各项事务，给人的印象是整洁有序，服从规范，谨慎小心。该学生们喜欢从事会计，行政、数据处理方面的工作，如银行人员、金融分析师、税务专家、运输物流或会计出纳等工作。具有整理与用文件与数据的能力，但是较不喜欢设计创新的工作。", c: "守本分、顺从、坚毅、节俭、有条理、谨慎、实际" },

])

const pdfRef = ref<PdfPageExpose | null>(null)
const pdfRefTid = ref(0);
const pdfRefLoading = ref(true);

const chartOK = ref(false);


const chartReadyCount = ref(0)
const totalCharts = ref(5)  // 你有几个图表，可以传入 props

const reportData = ref<any>({})
const reportDataHeader = ref<any>({})

const chartTid = ref(0);
const pieData = ref<any>({})
const barData = ref<any>({})
const barXData = ref<any>({})
const data1 = ref<any>([])
const barYData = ref<any>([])
const pieRData = ref<any>({})
const data2 = ref<any>([])
const data3 = ref<any>([])
const data4 = ref<any>({})

const downloadAction = ref("loading")


function onChartReady() {
    pdfMarkTitle.value = "loading"
    chartReadyCount.value++
    if (chartReadyCount.value === totalCharts.value) {
        chartReadyCount.value = 0;
        chartOK.value = true;
    }
}

onMounted(() => {
    let query = route.query;
    if (query && query.k) {
        // 模拟加密
        // let encryptValue = aesInstance.jsEncrypt(JSON.stringify({
        //     uid: "1",
        //     pid: "1",
        //     action: "download"
        // }));
        let queryK = query?.k ?? "";
        if (queryK) {
            pdfMarkTitle.value = "loading"
            pdfRefLoading.value = true;
            let decryptData = aesInstance.jsDecrypt(queryK as string);
            let decryptDataObj = JSON.parse(decryptData);
            downloadAction.value = decryptDataObj.action;
            const queryO = decryptDataObj?.o ?? "";
            if (queryO) {
                const isOver5Min = dayjs(Number(queryO ?? 0) * 1000).diff(dayjs(), 'minute') > 5;
                if (!isOver5Min) {
                    pdfRefLoading.value = true;
                    pdfMarkTitle.value = "timeout";
                    return false;
                }
            }

            if (decryptDataObj && decryptDataObj.action == "download") {
                getReportPdfInit(decryptDataObj, 1)
            } else {

                getReportPdfInit(decryptDataObj, 0)
            }
        }
    }

    zoomController.enable();
})


const actionType = ref(0)
onUnmounted(() => {
    zoomController.destroy();
});

function forPdfPage(e: any) {
    if (e && e.tid) {
        if (e.type == "success") {
            if (actionType.value == 1) {
                pdfMarkTitle.value = "download"
                setTimeout(() => {
                    pdfRef.value?.exportPdf()
                }, 2000)
            } else {
                actionType.value = 0;
                pdfMarkTitle.value = "";
                pdfRefLoading.value = false;
            }
        } else if (e.type == "download") {
            nietz.store.ai.setToast({
                opts: {
                    severity: 'success',
                    summary: "提示",
                    detail: "下载成功",
                    life: 3000
                }, tid: nietz.TZM.isTid(3)
            })
            actionType.value = 0;
            pdfMarkTitle.value = "";
            pdfRefLoading.value = false;
        }

    }
}

const handleDownloadPdf = () => {
    pdfRefLoading.value = true;
    pdfMarkTitle.value = "download"
    setTimeout(() => {
        pdfRef.value?.exportPdf()
    }, 1000)
}

async function getReportPdfInit(ups: any, type: number = 0) {
    try {
        let { data } = await getReportPdf({
            iv_report: aesInstance.getIV(),
            encrypted_report: aesInstance.encrypt(JSON.stringify({
                uid: ups.uid,
                id: ups.pid
            })),
        })
        reportData.value = data ?? {};
        actionType.value = type;
        if (data) {
            homeForm.value[0].value = data?.name ?? (data?.account_number ?? "");
            homeForm.value[1].value = data?.code ?? ""
            homeForm.value[2].value = data?.dates ?? ""

            reportDataHeader.value = {
                "name": data?.name ?? (data?.account_number ?? ""),
                "code": data?.code ?? "",
                "date": nietz.TZM.formatLocal(data?.dates ?? "", "YYYY年MM月DD日"),
            }

            //pieData
            let value2 = data?.value2 ?? {} as any;
            let value2Data = [] as any;
            for (let key in value2) {
                let item = value2[key as keyof typeof value2];
                value2Data.push({
                    "name": key,
                    "value": item
                })
            }
            pieData.value = {
                data: value2Data
            }

            // data2
            let value4 = data?.value4 ?? {} as any;
            let statusData = {
                0: "低",
                1: "中",
                2: "高"
            } as any;
            // let statusData1 = {
            //     0: "低",
            //     1: "普通",
            //     2: "中上",
            //     3: "高"
            // } as any;
            let title1 = statusData[value4?.status_anxiety?.status ?? 0],
                title2 = statusData[value4?.trait_anxiety?.status ?? 0],
                title3 = statusData[value4?.study_anxiety?.status ?? 0];
            data2.value = [
                { title: `${title1}-水平状态焦虑`, value: value4?.status_anxiety?.proposal ?? [] },
                { title: `${title2}-水平特质焦虑`, value: value4?.trait_anxiety?.proposal ?? [] },
                { title: `感知压力水平为-${title3}`, value: value4?.status_anxiety?.proposal ?? [] }
            ]

            // barData
            let value5 = data?.value5 ?? [] as any;
            let value5DataX = [] as any, value5DataY = [] as any;
            if (value5 && value5.length) {
                value5.forEach((item: any) => {
                    value5DataX.push(item.title)
                    value5DataY.push(item.value)
                })
            }
            barData.value = {
                name: value5DataX,
                data: value5DataY
            }

            // barData
            let value7 = data?.value7 ?? [] as any;
            let value7DataX = [] as any, value7DataY = [] as any;
            if (value7 && value7.length) {
                value7.forEach((item: any) => {
                    value7DataX.push(item.name)
                    value7DataY.push(item.value)
                })
            }
            barXData.value = {
                name: value7DataX,
                data: value7DataY
            }

            //data1
            let value8Colors = {
                "R": "#4CA95E",
                "I": "#02D1D4",
                "A": "#2580CA",
                "S": "#BB1228",
                "E": "#AF8E40",
                "C": "#9D6CDB",
            } as any;
            let value8 = data?.value8 ?? {} as any;
            let top3_arr = value8?.top3_arr ?? [];
            let data1List = [] as any;
            if (top3_arr && top3_arr.length) {
                top3_arr.forEach((item: any) => {
                    data1List.push({
                        "name": item.title,
                        "value": item.value,
                        "color": value8Colors[item.value]
                    })
                })
            }
            data1.value = data1List ?? [];
            // barYData
            let barYDataList = [] as any;
            let scores_cake = value8?.scores_cake ?? [];
            let pieRDataList = [] as any, pieRDataColorArr = [] as any;
            if (scores_cake && scores_cake.length) {
                let newScoresCake = rankData(scores_cake)
                newScoresCake.forEach((item: any) => {
                    barYDataList.push({
                        "name": item.title,
                        "utils": item.name,
                        "rank": `（${item?.rank ?? ''}）`,
                        "score": item.value,
                        "color": value8Colors[item.name]
                    })
                    pieRDataColorArr.push({
                        "score": item.value,
                        "utils": item.name,
                    })
                    pieRDataList.push(item.value)
                })

            }
            barYData.value = barYDataList;
            let pieRDataColorArrNew = pieRDataColorArr.sort((a: any, b: any) => {
                return (b?.score ?? 0) - (a?.score ?? 0)
            })
            if (pieRDataColorArrNew && pieRDataColorArrNew.length) {
                pieRData.value = {
                    data: pieRDataList,
                    color: value8Colors[pieRDataColorArrNew[0]?.utils ?? ""]
                }
            }

            //data3
            let value10 = data?.value10 ?? [] as any;
            let data3List = [] as any, dataSuggest = [] as any;
            if (value10 && value10.length) {
                value10.forEach((item: any) => {
                    let values = item?.value ?? [];
                    let valuesString = values ? JSON.stringify(values) : ""
                    if (valuesString && (valuesString.includes("学生建议") || valuesString.includes("家长建议"))) {
                        dataSuggest.push(item)
                    } else {
                        data3List.push(item)
                    }
                });
            }
            let data4List = {} as any;
            if (dataSuggest && dataSuggest.length) {
                let data4Student = [] as any, data4Parents = [] as any;

                dataSuggest.forEach((item: any) => {
                    let dataSuggestValue = item?.value ?? []
                    if (dataSuggestValue && dataSuggestValue.length) {
                        dataSuggestValue.forEach((child: any) => {
                            if (child && child.tops) {
                                if (child.tops.includes("学生建议")) {
                                    data4Student.push(child)
                                } else {
                                    data4Parents.push(child)
                                }
                            }
                        })
                    }

                })
                data4List.student = data4Student
                data4List.parents = data4Parents
            }
            data3.value = data3List;
            data4.value = data4List;
            podiumItems.value[0].label = data?.value3.title ?? "";
            chartTid.value = nietz.TZM.isTid(3);
            pdfRefTid.value = nietz.TZM.isTid(3);
        } else {
            pdfRefLoading.value = false;
            pdfMarkTitle.value = "empty"
        }



    } catch (err) {
        console.log(err)
    }

}

function rankData(scores_cake: any) {
    const scoresWithRank = scores_cake
        .map((item: any, index: number) => ({ ...item, originalIndex: index }))
        .sort((a: any, b: any) => {
            if (b.value !== a.value) {
                return b.value - a.value;
            }
            return a.originalIndex - b.originalIndex;
        })
        .map((item: any, rank: any) => ({
            name: item.name,
            title: item.title,
            value: item.value,
            rank: rank + 1
        }))
        .sort((a: any, b: any) => {
            const indexA = scores_cake.findIndex((x: any) => x.name === a.name);
            const indexB = scores_cake.findIndex((x: any) => x.name === b.name);
            return indexA - indexB;
        });
    return scoresWithRank;
}

</script>

<style scoped>
.user-pdf-mark {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99;
    background: rgba(255, 255, 255, 1);
}

.mark-title {
    font-size: 24px;
    font-weight: 600;
    color: #fff;
    width: 120px;
    height: 120px;
}

.mark-title__loading {
    background-image: url("@/assets/image/loading.png");
}

.mark-title__download {
    background-image: url("@/assets/image/download.png");
}

.mark-title__empty {
    background-image: url("@/assets/image/empty.png");
}

.mark-title__timeout {
    background-image: url("@/assets/image/timeout.png");
}

.user-pdf .pdf-page {
    margin-bottom: 10px;
}

.user-pdf-download {
    position: fixed;
    top: 20px;
    right: 50%;
    margin-right: -130mm;
    height: 30px;
    z-index: 2;
    border-radius: 2px;
    color: #1d4ed8;
    cursor: pointer;
}

.download-icon {
    width: 20px;
}
</style>
