/**
 * 旧项目 ai_tree_hole_bin.resource_videos 表资源批量下载脚本
 *
 * 旧服务器: http://shudong.nietzsci.com (= 82.156.210.29) 仅国内可访问
 * 用法 (在项目根目录):
 *   node scripts/download_legacy_resources.mjs
 *
 * 下载到 public/uploads/... 保持旧路径结构, 数据库 cover_url/file_url 字段无需改路径
 * 已存在的文件自动跳过 (支持断点续传)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = "https://xxl.fazhanmao.com";   // 旧项目域名 (仅国内可访问, 用于一次性迁数据)
const OUT_DIR = path.join(ROOT, "public");

// 从 SQL dump 提取的所有 cover_url + file_url (37 个 URL: 23 封面 + 14 视频/音频)
const URLS = [
  // ===== 封面 (23 张 PNG) =====
  "/uploads/20251226/7538c9c03693f9e4.png",   // id=6  腹式呼吸 cover
  "/uploads/20251226/38ba326f8e67a427.png",   // id=7  海岸 cover
  "/uploads/20251226/947c981c4cc715c7.png",   // id=8  天空 cover
  "/uploads/20251226/515f5da1f6ca7577.png",   // id=9  森林 cover
  "/uploads/20251226/ec4c79b8bb920d32.png",   // id=10 自然风光 cover
  "/uploads/20251226/cecc6cc8b060f250.png",   // id=11 正念练习-身体扫描 cover
  "/uploads/20251226/90529845961ea17c.png",   // id=12 正念呼吸 cover
  "/uploads/20251226/b3ded21c4140a7ad.png",   // id=13 认识情绪 cover
  "/uploads/20251226/d37704a23f1945de.png",   // id=14 认识压力 cover
  "/uploads/20251226/c86738201d3b43c6.png",   // id=15 道德困境 cover
  "/uploads/20251226/a6d44f40a38191c2.png",   // id=16 从众效应 cover
  "/uploads/20251226/c8be06ae06fd6383.png",   // id=17 人际敏感的正向作用 cover
  "/uploads/20251226/18cacfc0f0839f1b.png",   // id=18 好好学习不再是一句口头禅 cover
  "/uploads/20251226/6acc774a234a159a.png",   // id=19 主动解决学习上遇到的困难 cover
  "/uploads/20251229/d37fe9e1b20e8627.png",   // id=20 负面情绪不能压抑 cover
  "/uploads/20251229/5839946001a50d57.png",   // id=21 焦虑和压力成"病"如何化解 cover
  "/uploads/20251229/85ab9eda0a3da591.png",   // id=22 睡眠不足影响学生学习能力 cover
  "/uploads/20251229/5caf32fc40e1e850.png",   // id=23 学龄孩子学习障碍 cover
  "/uploads/20251229/ee8b479695d9b2f8.png",   // id=24 安抚你的"内在小孩" cover
  "/uploads/20251229/e639b4c577351eaa.png",   // id=25 自我认识 cover
  "/uploads/20251229/6764614bd4b31f84.png",   // id=26 三步呼吸空间法 cover
  "/uploads/20251229/02f82dcaadfeb160.png",   // id=27 身体扫描助您入眠的好方法 cover
  "/uploads/20251229/01212ecea8be53a8.png",   // id=28 腹式呼吸法 cover

  // ===== 视频/音频 (14 个) =====
  "/uploads/2025/12/腹式呼吸_694e4aa076e4f.mp4",                                  // id=6
  "/uploads/2025/12/海岸_694e4b5911613.mp4",                                      // id=7
  "/uploads/2025/12/天空_694e4bac5c566.mp4",                                      // id=8
  "/uploads/2025/12/森林_694e4c4c2aa65.mp4",                                      // id=9
  "/uploads/2025/12/自然风光_694e4cda75cb2.mp4",                                  // id=10
  "/uploads/2025/12/3064421531_694e4f02c39d7.mp3",                                // id=11 身体扫描音频
  "/uploads/2025/12/正念呼吸(1)_694e4f9543591.mp4",                               // id=12
  "/uploads/2025/12/01-18-认识情绪_694e50a8f3d3c.mp4",                            // id=13
  "/uploads/2025/12/01-19-认识压力_694e52761c722.mp4",                            // id=14
  "/uploads/2025/12/01-10-道德困境_694e5475ea7a8.mp4",                            // id=15
  "/uploads/2025/12/02-4-从众效应_694e54e97879b.mp4",                             // id=16
  "/uploads/2025/12/03-12-人际敏感的正向作用_694e55464416d.mp4",                  // id=17
  "/uploads/2025/12/03-3-“好好学习”不再是一句口头禅_694e570336689.mp4", // id=18 (含全角引号)
  "/uploads/2025/12/03-10-主动解决学习上遇到的困难_694e57bda177a.mp4"             // id=19
];

const MAX_RETRY = 3;
const TIMEOUT_MS = 60_000;

async function downloadOne(rel) {
  const dest = path.join(OUT_DIR, rel);
  if (fs.existsSync(dest)) {
    const size = fs.statSync(dest).size;
    if (size > 0) {
      console.log(`[skip] ${rel} (已存在, ${(size / 1024).toFixed(1)} KB)`);
      return { ok: true, skipped: true, bytes: size };
    }
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  // 中文/全角字符 URL 编码
  const url = BASE + rel.split("/").map(s => encodeURIComponent(s)).join("/");

  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(`[ok]   ${rel}  (${(buf.length / 1024).toFixed(1)} KB)`);
      return { ok: true, bytes: buf.length };
    } catch (e) {
      clearTimeout(timer);
      if (attempt === MAX_RETRY) {
        console.error(`[FAIL] ${rel}  (重试 ${MAX_RETRY} 次后失败: ${e.message || e})`);
        return { ok: false, error: e.message || String(e) };
      }
      console.warn(`[retry ${attempt}/${MAX_RETRY}] ${rel}  ${e.message || e}`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return { ok: false };
}

async function main() {
  console.log(`📦 下载 ${URLS.length} 个文件 → ${OUT_DIR}`);
  console.log(`🌐 源服务器: ${BASE}\n`);

  let ok = 0, skipped = 0, fail = 0, totalBytes = 0;
  for (const rel of URLS) {
    const r = await downloadOne(rel);
    if (r.ok) {
      if (r.skipped) skipped++; else ok++;
      totalBytes += r.bytes || 0;
    } else {
      fail++;
    }
  }

  console.log(`\n📊 完成 — 新下载 ${ok} / 已存在 ${skipped} / 失败 ${fail}`);
  console.log(`📦 总大小 ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  if (fail > 0) {
    console.log(`\n⚠️  有失败项, 请重跑脚本 (已存在的会自动跳过)`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error("脚本异常:", e);
  process.exit(1);
});
