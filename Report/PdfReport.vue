<template>
  <div class="pdf-report" ref="reportRoot">
    <!-- 封面（第 1 页） -->
    <div class="page page-index">
      <div class="pdf-header"></div>
      <div class="pdf-container__logo contain"></div>
      <div class="pdf-container">
        <div class="pdf-index__title">{{ coverHeader || '个性化学习与发展评估报告' }}</div>
        <div class="pdf-index__line"></div>
        <div class="pdf-index__subtitle">个人报告</div>
        <div class="pdf-index__form">
          <div class="pdf-index__item flex justify-center" v-for="(item, index) in coverForm" :key="index">
            <div class="pdf-index__label"><span v-html="item.label"></span>：</div>
            <div class="pdf-index__value flex align-center">
              <div class="pdf-index__unit">[</div>
              <div class="pdf-index__text">{{ item.value }}</div>
              <div class="pdf-index__unit">]</div>
            </div>
          </div>
        </div>
      </div>
      <div class="pdf-footer">©版权所有：{{ owner }}</div>
    </div>

    <!-- 第 2 页 模板页 -->
    <div ref="pagesRoot" class="pdf-box"></div>

    <!-- 源内容（slot 进来，仅用于测量/拆分，不参与导出/打印） -->
    <div class="source no-print" ref="source">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { ref, nextTick, onBeforeUnmount, watchEffect, withDefaults, defineProps } from "vue"

/** ======= TS 类型定义 ======= */
interface CoverFormItem {
  label: string
  value: string
}

interface HeaderInfo {
  name: string
  sex: string
  no: string
  time: string
}

interface Props {
  coverHeader?: string
  logoBackgroundUrl?: string
  logoBackgroundTop?: string
  logoBackgroundBottom?: string
  owner?: string
  pageHeader?: string
  headerInfo: HeaderInfo
  coverFormData: CoverFormItem[]
  styleText?: string
  fileName?: string
  isTid: number | string
}

/** ======= Props 默认值 ======= */
const props = withDefaults(defineProps<Props>(), {
  coverHeader: "",
  logoBackgroundUrl: "",
  owner: "",
  pageHeader: "个性化学习与发展评估报告",
  headerInfo: () => ({ name: "", sex: "", no: "", time: "" }),
  coverFormData: () => [
    { label: "测评姓名", value: "" },
    { label: "测评编号", value: "" },
    { label: "测评日期", value: "" },
  ],
  styleText: "",
  fileName: "个性化学习与发展评估报告.pdf",
  isTid: 0
})

const coverHeader = props.coverHeader
const logoBackgroundUrlValue = props.logoBackgroundUrl


const owner = props.owner

/** ======= Refs ======= */
const reportRoot = ref<HTMLDivElement | null>(null)
const pagesRoot = ref<HTMLDivElement | null>(null)
const source = ref<HTMLDivElement | null>(null)
const coverForm = ref<any>(props.coverFormData)

/** ======= 监听 isTid，触发重建 ======= */
watchEffect(async () => {
  const tid = props.isTid ?? ""
  if (tid) {
    await rebuildPreview()
    observeSourceForAutoPaginate()

    coverForm.value[0]!.value = props.headerInfo?.name ?? ""
    coverForm.value[1]!.value = props.headerInfo?.sex ?? ""
    coverForm.value[2]!.value = props.headerInfo?.no ?? ""
    coverForm.value[3]!.value = props.headerInfo?.time ?? ""
  }
})

/** ======= 样式注入 ======= */
function ensureStyleInjected() {
  if (!reportRoot.value || !props.styleText) return
  if (reportRoot.value.querySelector(":scope > style.__injected__")) return
  const style = document.createElement("style")
  style.className = "__injected__"
  style.textContent = props.styleText
  reportRoot.value.insertBefore(style, reportRoot.value.firstChild)
}

/** ======= 创建内容页骨架（包括 header/footer） ======= */
function buildContentPage(): { page: HTMLDivElement; content: HTMLDivElement } {
  const page = document.createElement("div") as HTMLDivElement
  page.className = "page"

  const header = document.createElement("div") as HTMLDivElement
  header.className = "pdf-header flex justify-between"

  const logo = document.createElement("div") as HTMLDivElement
  logo.className = "pdf-header__logo"
  logo.style.backgroundImage = `url(${logoBackgroundUrlValue})`

  const info = document.createElement("div") as HTMLDivElement
  info.className = "pdf-header__info"

  const name = document.createElement("div") as HTMLDivElement
  name.className = "pdf-header__name"
  name.textContent = props.pageHeader || "个人报告"

  const meta = document.createElement("div") as HTMLDivElement
  meta.className = "pdf-header__text"
  meta.innerHTML = `
    <span>评测日期：${props.headerInfo?.name ?? ""}</span>
    <span>编号：${props.headerInfo?.no ?? ""}</span>
  `

  info.append(name, meta)
  header.append(logo, info)

  const container = document.createElement("div") as HTMLDivElement
  container.className = "pdf-container"

  const content = document.createElement("div") as HTMLDivElement
  content.className = "pdf-content"
  container.appendChild(content)

  const footer = document.createElement("div") as HTMLDivElement
  footer.className = "pdf-footer"
  footer.textContent = `©版权所有：${owner || ""}`

  page.append(header, container, footer)
  return { page, content }
}

function createNewPage(): { page: HTMLDivElement; content: HTMLDivElement } {
  const { page, content } = buildContentPage();
  pagesRoot.value?.appendChild(page)
  return { page, content }
}

/** ======= 分页辅助函数 ======= */
function isOverflow(target: HTMLElement): boolean {
  return target.scrollHeight > target.clientHeight + 1
}

function tryAppend(target: HTMLElement, node: HTMLElement): boolean {
  const marker = document.createComment("marker")
  target.appendChild(marker)
  target.insertBefore(node, marker)
  const overflow = isOverflow(target)
  if (overflow) node.remove()
  marker.remove()
  return !overflow
}

function splitParagraph(
  p: HTMLParagraphElement,
  target: HTMLElement
): { fitNode: HTMLParagraphElement | null; remainNode: HTMLParagraphElement } {
  const full = p.textContent || ""
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

/** ======= 保证 DOM 稳定（等待图片 & 字体） ======= */
async function waitDomStable() {
  await nextTick()
  if (source.value) await waitForImages(source.value)
  await waitForFonts()
  await doubleRAF()
}

function waitForImages(rootEl: HTMLElement): Promise<void> {
  const imgs = Array.from(rootEl.querySelectorAll("img")) as HTMLImageElement[]
  if (!imgs.length) return Promise.resolve()
  return Promise.all(
    imgs.map(
      img =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>(res => {
            img.onload = img.onerror = () => res()
          })
    )
  ).then(() => { })
}

function waitForFonts(): Promise<void | FontFaceSet> {
  if (document.fonts?.ready) return document.fonts.ready.catch(() => { })
  return Promise.resolve()
}

function doubleRAF(): Promise<void> {
  return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res())))
}

/** ======= 分页 ======= */
async function paginate() {
  if (!reportRoot.value || !pagesRoot.value || !source.value) return
  ensureStyleInjected()

  pagesRoot.value.innerHTML = ""
  let { content } = createNewPage()

  const blocks = Array.from(source.value.children).map(n =>
    n.cloneNode(true)
  ) as HTMLElement[]

  for (let i = 0; i < blocks.length; i++) {
    const node = blocks[i]

    if (tryAppend(content, node)) continue

    if (node.tagName === "P") {
      const { fitNode, remainNode } = splitParagraph(node as HTMLParagraphElement, content)
      if (fitNode) content.appendChild(fitNode)
      const np = createNewPage()
      content = np.content
      if (remainNode && remainNode.textContent?.trim()) {
        blocks.splice(i + 1, 0, remainNode as unknown as HTMLElement)
      }
      continue
    }

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
      const np = createNewPage()
      content = np.content
      if (!tryAppend(content, node)) content.appendChild(node)
    }
  }

  const allPages = Array.from(pagesRoot.value.querySelectorAll(".page")) as HTMLElement[]
  for (const p of allPages) {
    const c = p.querySelector(".pdf-content") as HTMLElement | null
    if (c && c.childElementCount === 0) p.remove()
  }
}

/** ======= 自动检测变化重建预览 ======= */
let mo: MutationObserver | null = null
let ro: ResizeObserver | null = null

function debounce(fn: () => void, ms = 150) {
  let t: number | undefined
  return () => {
    if (t !== undefined) window.clearTimeout(t)
    t = window.setTimeout(() => fn(), ms)
  }
}

async function rebuildPreview() {
  await waitDomStable()
  await paginate()
}

function observeSourceForAutoPaginate() {
  if (!source.value) return
  const debounced = debounce(rebuildPreview, 200)
  mo = new MutationObserver(() => debounced())
  mo.observe(source.value, { childList: true, subtree: true, characterData: true })
  ro = new ResizeObserver(() => debounced())
  ro.observe(source.value)
}

/** ======= 导出 PDF ======= */
async function exportPdf() {
  ensureStyleInjected()
  await rebuildPreview()
  if (!reportRoot.value) return

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true })
  const pages = Array.from(reportRoot.value.querySelectorAll(".page")) as HTMLElement[]

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i]
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" })
    const img = canvas.toDataURL("image/jpeg", 0.98)
    const w = pdf.internal.pageSize.getWidth()
    const h = pdf.internal.pageSize.getHeight()
    pdf.addImage(img, "JPEG", 0, 0, w, h)
    if (i < pages.length - 1) pdf.addPage()
  }

  pdf.save(props.fileName || "个人报告.pdf")
}

/** ======= 生命周期 ======= */
onBeforeUnmount(() => {
  mo?.disconnect()
  ro?.disconnect()
})

defineExpose({ rebuildPreview, exportPdf })
</script>

<style lang="less" scoped>
</style>
