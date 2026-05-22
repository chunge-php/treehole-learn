<template>
    <div class="user-report" ref="reportRoot">
        <div class="pdf-page pdf-page-home" ref="homeRef">
            <div class="pdf-page-header flex justify-between">
                <div class="pdf-header-logo cover"></div>
                <div class="pdf-header-info">
                    <div class="pdf-header-title">个人报告</div>
                    <div class="pdf-header-tips flex">
                        <span>评测日期：{{ reportHeaderInfo.date }}</span>
                        <span>编号：{{ reportHeaderInfo.code }}</span>
                    </div>
                </div>
            </div>
            <div class="pdf-page-content">
                <slot name="pdf-home"></slot>
            </div>
        </div>

        <div ref="pagesRoot"></div>

        <div class="source no-print" ref="contentRef" v-show="canShow">
            <slot name="pdf-body"></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watchEffect, onBeforeUnmount, defineExpose, inject, watch } from 'vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
const emit = defineEmits(['forPdfPage'])
const nietz: any = inject('nietz')

const homeRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const reportRoot = ref<HTMLDivElement | null>(null)
const pagesRoot = ref<HTMLDivElement | null>(null)


interface Props {
    isTid: number | string,
    isData: {
        type: Object,
        default: () => ({})
    },
    canRender: Boolean,
}
const reportHeaderInfo = ref<any>({})
const props = withDefaults(defineProps<Props>(), {
    isTid: 0
})
const canShow = ref(true);
const isDownloading = ref(false);
watchEffect(async () => {
    const tid = props.isTid ?? ""
    reportHeaderInfo.value = props.isData ?? {}
    if (tid) {
        canShow.value = true;
        await rebuildPreview(1)
        // observeSourceForAutoPaginate()
    }
})

watch(() => props.canRender, async (newVal) => {
    if (newVal) {
        setTimeout(async () => {
            await rebuildPreview()
            observeSourceForAutoPaginate()

        }, 1000)
    }
})

async function convertEchartsToImage() {
    const chartCanvases = contentRef.value?.querySelectorAll('canvas') || []

    for (const canvas of chartCanvases) {
        const dataURL = canvas.toDataURL('image/png')
        const img = document.createElement('img')
        img.src = dataURL
        img.style.width = canvas.style.width || canvas.width + 'px'
        img.style.height = canvas.style.height || canvas.height + 'px'

        canvas.replaceWith(img)
    }
}

/** ====== 工具：防抖 ====== */
function debounce(fn: () => void, ms = 150) {
    let t: number | undefined
    return () => {
        if (t !== undefined) window.clearTimeout(t)
        t = window.setTimeout(() => fn(), ms)
    }
}

/** ====== 监听源内容变化，自动重新分页 ====== */
let mo: MutationObserver | null = null
let ro: ResizeObserver | null = null

function observeSourceForAutoPaginate() {
    if (!contentRef.value) return
    const debounced = debounce(rebuildPreview, 200)

    mo = new MutationObserver(() => debounced())
    mo.observe(contentRef.value, {
        childList: true,
        subtree: true,
        characterData: true,
    })

    ro = new ResizeObserver(() => debounced())
    ro.observe(contentRef.value)


}

/** ====== rebuild + paginate ====== */
async function rebuildPreview(type: any = 0) {
    await nextTick()
    if (type != 1) {
        await convertEchartsToImage()
        await paginate()
    }

}

let pdfStyleText =`
.flex{display:flex}.display-flex{display:flex}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.align-center{align-items:center;align-content:center}.justify-end{justify-content:end}.grid{display:grid}.grid-cols-1{grid-template-columns:repeat(1, minmax(0, 1fr))}.grid-cols-2{grid-template-columns:repeat(2, minmax(0, 1fr))}.grid-cols-3{grid-template-columns:repeat(3, minmax(0, 1fr))}.grid-cols-4{grid-template-columns:repeat(4, minmax(0, 1fr))}.grid-cols-5{grid-template-columns:repeat(5, minmax(0, 1fr))}.grid-cols-6{grid-template-columns:repeat(6, minmax(0, 1fr))}.text-center{text-align:center}.cover{background-position:center;background-size:cover;background-repeat:no-repeat}.user-report{position:relative;width:210mm !important;margin:0 auto}.pdf-page{padding:10mm 12mm;break-after:page;position:relative;height:297mm;background-color:#fff;margin-bottom:20px}.pdf-page-home::after{position:absolute;content:"";top:0;left:0;right:0;height:360px;background:url("/pdf/top.png") no-repeat top right;background-size:cover;z-index:0}.pdf-page-home::before{position:absolute;content:"";bottom:0;left:0;right:0;height:476px;background:url("/pdf/bottom.png") no-repeat bottom left;background-size:cover;z-index:0}.pdf-page-header{position:relative;z-index:1;width:100%;height:50px}.pdf-page-header::before{position:absolute;content:"";bottom:0;left:-12mm;right:-12mm;height:2px;z-index:1;background-color:#3180c3}.pdf-page-header::after{position:absolute;content:"";bottom:-4px;left:-12mm;right:-12mm;height:1px;z-index:1;background-color:#3180c3}.pdf-header-logo{width:110px;height:36px;background-image:url("/pdf/logo.png");background-position:left center}.pdf-header-info{position:relative;height:36px;color:#3180c3;text-align:right;font-size:12px}.pdf-header-title{height:20px;line-height:20px;font-size:13px;font-weight:600}.pdf-header-tips{height:16px;line-height:16px;font-size:12px}.pdf-header-tips span{padding-left:15px}.pdf-page-home .pdf-page-header::after,.pdf-page-home .pdf-page-header::before,.pdf-page-home .pdf-header-info{display:none}.pdf-page-content{position:relative;width:100%;padding-top:40px;padding-bottom:40px;height:calc(100% - 50px)}.pdf-pie{position:relative;width:100%}.pdf-page-home h1{position:relative;width:100%;text-align:center;font-size:48px;padding-top:200px;padding-bottom:20px;color:#000;font-weight:600}.pdf-home-line{width:80px;height:6px;background-color:#3180c3;margin:0 auto;border-radius:3px}.pdf-page-home h2{position:relative;width:100%;text-align:center;font-size:32px;padding-top:5mm;padding-bottom:40mm;color:#000;font-weight:600}.pdf-home-form{position:relative;width:100%}.pdf-home-value{width:250px;height:40px;line-height:40px;font-size:20px;color:#000;font-weight:500}.pdf-home-item{position:relative;width:100%;height:14mm}.form-item{width:350px;margin:0 auto}.pdf-home-unit{flex-shrink:0;width:10px;font-size:20px;text-align:center}.pdf-home-text{width:100%;margin:0 5px;height:40px;line-height:40px;text-align:center;background-color:#fff}.pdf-home-label{font-size:20px;height:40px;line-height:40px;color:#000;min-width:100px;text-align:right;flex-shrink:0}.pdf-h1{height:80px;line-height:40px;font-size:28px;font-weight:bold;text-align:center}.pdf-title{position:relative;padding-bottom:20px}h3.title-h3{font-size:15px;color:#000;font-weight:600;padding-bottom:10px}.title-h2{font-size:20px;color:#000;font-weight:600;padding-bottom:10px}.pdf-title-h3{padding-top:10px}.title-h3 span{font-weight:bold;color:#e34d59;padding-left:2px}.pdf-info,.pdf-info1{position:relative;padding:25px;background-color:rgba(216, 216, 216, 0.2)}.pdf-info1{padding-bottom:15px}.p-bottom-20{padding-bottom:20px}.p-bottom-15{padding-bottom:15px}.p-bottom-30{padding-bottom:30px}.p-top-15{padding-bottom:15px}.pdf-info-image{width:140px;height:176px;flex-shrink:0;margin-left:25px}.pdf-info-title{text-align:center;color:#3180c3;font-weight:600;font-size:15px}.pdf-info-content{color:#666666}.pdf-info-chart{position:relative;width:100%}.bar-y-content{width:100%}h3.text-color,.text-color{color:#3180c3}p{font-size:13px;padding-bottom:15px;line-height:22px;color:#666}p span{color:#000;font-weight:600;font-size:13px}.pdf-chart-box{position:relative;width:100%;height:268px}.pdf-chart-header{padding-left:25px;padding-top:10px;min-height:80px}.pdf-info-line{padding:10px 25px 0;border-top:1px solid #666}.pdf-chart-abc{height:84px;margin-right:100px;text-align:center}.pdf-abs-text{height:60px;line-height:60px;text-align:center;font-size:44px;font-weight:500}.pdf-abs-value{font-size:13px;color:#666}.pdf-chart-rose{padding-right:50px}.pdf-info-none{margin:0}.pdf-vs-title{font-weight:bold;color:#e34d59;width:40%}.pdf-vs-center{width:20%;text-align:center;flex-shrink:0}.pdf-vs-value{color:#666;width:40%}.text-right{text-align:right}.pdf-vs{padding:10px 0 25px}.pad-podium{position:relative;height:150px;margin-bottom:20px}.pad-podium-item{position:relative;width:320px;flex-shrink:0;flex-direction:column;justify-content:flex-end}.pad-podium-title{height:40px;line-height:30px;text-align:center;font-weight:bold;font-size:22px}.pad-podium-2 .pad-podium-title{color:#6eb4f8}.pad-podium-1 .pad-podium-title{color:#f6926d}.pad-podium-3 .pad-podium-title{color:#f8cf6f}.pad-podium-top{position:relative;height:18px;overflow:hidden}.pad-podium-bottom{font-weight:bold;color:#fff;text-align:center}.pad-podium-2 .pad-podium-bottom{height:52px;background-color:#6eb4f8;font-size:40px;line-height:52px}.pad-podium-1 .pad-podium-bottom{background-color:#f6926d;height:80px;font-size:58px;line-height:80px}.pad-podium-3 .pad-podium-bottom{background-color:#f8cf6f;height:40px;font-size:30px;line-height:40px}.pad-podium-2 .pad-podium-top::before{position:absolute;content:"";left:10px;width:100%;height:18px;background:#b5d2fc;transform:skew(-50deg)}.pad-podium-1 .pad-podium-top::before{position:absolute;content:"";left:-4px;right:-4px;height:0;border-bottom:20px solid #feb8a2;border-left:20px solid transparent;border-right:20px solid transparent}.pad-podium-3 .pad-podium-top::before{position:absolute;content:"";right:10px;width:100%;height:18px;background:#fddf97;transform:skew(50deg);z-index:0}.pdf-table{padding-bottom:30px}.pdf-table-top{height:32px;line-height:32px;font-size:14px;font-weight:600;color:#000;background-color:rgba(49, 128, 195, 0.2)}.pdf-table-flex{padding:0 24px;width:120px;flex-shrink:0}.pdf-table-col{padding:0 24px}.pdf-table-item{padding:0 24px}.pdf-table-item span{font-weight:normal}.pdf-table-header{font-weight:600;padding:10px 0}.pdf-table-tr{font-size:14px;font-weight:600}.pdf-table-body{padding:10px 0;border-top:1px solid rgba(0, 0, 0, 0.3)}.pdf-table-bottom{padding:5px 0;border-top:1px solid rgba(0, 0, 0, 0.3)}.pdf-table-td{line-height:42px;color:#333;font-size:14px;font-weight:600}.user-pdf .pdf-page{margin-bottom:10px}.title-top{margin-top:30px}.pdf-table-col p{padding-bottom:5px}.title-2{font-size:14px;font-weight:bold;color:#333;height:50px;line-height:50px;margin-bottom:20px;margin-top:10px}.title-2 .title-2-label{margin-right:20px}.pdf-title h1{position:relative;height:28px;line-height:28px;font-weight:bold;font-size:20px;padding:0 5px;z-index:1;color:#3180c3}.pdf-title h1::before{position:absolute;content:"";left:0;height:6px;right:0;bottom:2px;z-index:0;border-radius:3px;background-color:rgba(49, 128, 195, 0.5)}.title-2 .title-2-value{position:relative;font-size:32px;padding:0 5px;color:rgb(246, 146, 109)}.title-2 .title-2-value::before{position:absolute;content:"";left:0;height:8px;right:0;bottom:6px;border-radius:4px;z-index:0;background-color:rgba(246, 146, 109, 0.5)}.report-h1{position:relative;width:100%;text-align:center;font-size:48px;padding-top:200px;padding-bottom:20px;color:#000;font-weight:600}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}
`
/** ====== 样式注入 ====== */
function ensureStyleInjected() {
    if (!reportRoot.value) return
    if (reportRoot.value.querySelector(':scope > style.__injected__')) return
    const style = document.createElement('style')
    style.className = '__injected__'
    style.textContent = pdfStyleText;
    reportRoot.value.insertBefore(style, reportRoot.value.firstChild)
}

/** ====== 溢出判断 + 试加节点 ====== */
function isOverflow(target: HTMLElement): boolean {
    return target.scrollHeight > target.clientHeight + 1
}

function tryAppend(target: HTMLElement, node: HTMLElement): boolean {
    const marker = document.createComment('marker')
    target.appendChild(marker)
    target.insertBefore(node, marker)
    const overflow = isOverflow(target)
    if (overflow) node.remove()
    marker.remove()
    return !overflow
}

/** ====== 拆分 <p> 段落（按字数二分法） ====== */
function splitParagraph(
    p: HTMLParagraphElement,
    target: HTMLElement
): { fitNode: HTMLParagraphElement | null; remainNode: HTMLParagraphElement } {
    const full = p.textContent || ''
    if (!full) return { fitNode: null, remainNode: p }

    let lo = 0
    let hi = full.length
    let best = 0
    const testP = p.cloneNode(false) as HTMLParagraphElement

    while (lo <= hi) {
        const mid = (lo + hi) >> 1
        testP.textContent = full.slice(0, mid)
        const ok = tryAppend(target, testP)
        if (ok) {
            best = mid
            testP.remove()
            lo = mid + 1
        } else {
            testP.remove()
            hi = mid - 1
        }
    }

    if (best === 0) return { fitNode: null, remainNode: p }
    const first = p.cloneNode(false) as HTMLParagraphElement
    first.textContent = full.slice(0, best)
    const remain = p.cloneNode(false) as HTMLParagraphElement
    remain.textContent = full.slice(best)
    return { fitNode: first, remainNode: remain }
}

/** ====== 创建正文页骨架（从第 2 页起） ====== */
function buildContentPage(): { page: HTMLDivElement; content: HTMLDivElement } {
    const page = document.createElement('div') as HTMLDivElement
    page.className = 'pdf-page'

    // header
    const header = document.createElement('div') as HTMLDivElement
    header.className = 'pdf-page-header flex justify-between'

    const logo = document.createElement('div') as HTMLDivElement
    logo.className = 'pdf-header-logo cover'

    const info = document.createElement('div') as HTMLDivElement
    info.className = 'pdf-header-info'

    const title = document.createElement('div') as HTMLDivElement
    title.className = 'pdf-header-title'
    title.textContent = '个人报告'

    const tips = document.createElement('div') as HTMLDivElement
    tips.className = 'pdf-header-tips flex'

    tips.innerHTML = `
    <span>评测日期：${reportHeaderInfo.value.date}</span>
    <span>编号：${reportHeaderInfo.value.code}</span>
  `

    info.append(title, tips)
    header.append(logo, info)

    // 内容区域
    const contentWrapper = document.createElement('div') as HTMLDivElement
    contentWrapper.className = 'pdf-page-content'

    page.append(header, contentWrapper)
    return { page, content: contentWrapper }
}

function createNewPage(): { page: HTMLDivElement; content: HTMLDivElement } {
    const { page, content } = buildContentPage()
    pagesRoot.value?.appendChild(page)
    return { page, content }
}

/** ====== 分页主逻辑 ====== */
async function paginate() {
    if (!reportRoot.value || !pagesRoot.value || !contentRef.value) return

    ensureStyleInjected()

    // 清空旧的内容页
    pagesRoot.value.innerHTML = ''

    // 用源内容的每个顶层块做分页
    const blocks = Array.from(contentRef.value.children).map(n =>
        (n as HTMLElement).cloneNode(true)
    ) as HTMLElement[]

    let { content } = createNewPage()

    for (let i = 0; i < blocks.length; i++) {
        const node = blocks[i]

        // 整块能塞下
        if (tryAppend(content, node)) continue

        // 是 <p> 就按字数拆
        if (node.tagName === 'P') {
            const { fitNode, remainNode } = splitParagraph(node as HTMLParagraphElement, content)
            if (fitNode) content.appendChild(fitNode)
            const np = createNewPage()
            content = np.content
            if (remainNode && remainNode.textContent?.trim()) {
                blocks.splice(i + 1, 0, remainNode as unknown as HTMLElement)
            }
            continue
        }

        // 复杂块：尝试逐个子元素塞
        const children = Array.from(node.children) as HTMLElement[]
        if (children.length) {
            for (const child of children) {
                const cloneChild = child.cloneNode(true) as HTMLElement
                if (!tryAppend(content, cloneChild)) {
                    const np = createNewPage()
                    content = np.content
                    if (!tryAppend(content, cloneChild)) content.appendChild(cloneChild)
                }
            }
        } else {
            // 小块直接新起一页
            const np = createNewPage()
            content = np.content
            if (!tryAppend(content, node)) content.appendChild(node)
        }
    }

    // 清理无内容页
    const allPages = Array.from(pagesRoot.value.querySelectorAll('.pdf-page')) as HTMLElement[]
    for (const p of allPages) {
        const c = p.querySelector('.pdf-page-content') as HTMLElement | null
        if (c && c.childElementCount === 0) p.remove()
    }
    canShow.value = false;
    setTimeout(() => {
        emit("forPdfPage", { type: "success", tid: nietz.TZM.isTid(2) })
    }, 500)


}

/** ====== 导出 PDF ====== */
async function exportPdf() {
    // ensureStyleInjected()
    if (isDownloading.value) return
    isDownloading.value = true

    try {
        if (!reportRoot.value) return

        const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true })
        const pages = Array.from(reportRoot.value.querySelectorAll(".pdf-page")) as HTMLElement[]

        for (let i = 0; i < pages.length; i++) {
            const el = pages[i]
            const canvas = await html2canvas(el, {
                scale: 3,
                useCORS: true,
                backgroundColor: "#fff",
                logging: false // 关闭日志，提高性能
            })
            const img = canvas.toDataURL("image/jpeg", 1)
            const w = pdf.internal.pageSize.getWidth()
            const h = pdf.internal.pageSize.getHeight()
            pdf.addImage(img, "JPEG", 0, 0, w, h)
            if (i < pages.length - 1) pdf.addPage()
        }

        // 直接保存，不使用定时器触发事件
        pdf.save("《个性化学习与发展评估报告》.pdf");

        // 立即触发事件，不需要延迟
        emit("forPdfPage", { type: "download", tid: nietz.TZM.isTid(2) })
    } catch (error) {
        console.error('PDF导出失败:', error)
    } finally {
        // 释放锁
        isDownloading.value = false
    }
}

export type PdfPageExpose = {
    exportPdf: () => void
    rebuildPreview: () => void
}
defineExpose({ exportPdf, rebuildPreview })


onBeforeUnmount(() => {
    mo?.disconnect()
    ro?.disconnect()
})
</script>

<style scoped>
/* 这里简单写一点，你可以用自己原来的 pdf 样式替换 */
.user-report {
    width: 210mm;
    margin: 0 auto;
}

.pdf-page {
    width: 210mm;
    height: 297mm;
    background: #fff;
    box-sizing: border-box;
    padding: 10mm 12mm;
}

.pdf-page-content {
    height: calc(297mm - 40mm);
    overflow: hidden;
}
</style>
