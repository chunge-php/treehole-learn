// 把测评题里挂在旧服务器(禁止境外访问/即将退役)的图片, 下载并重传到自己的 Supabase 存储
// 必须在能访问旧服务器的网络(国内)运行
//
// 用法:
//   node scripts/rehost_old_images.mjs            # 实际执行
//   node scripts/rehost_old_images.mjs --dry      # 仅扫描, 不下载不写库
//
// 依赖 .env.local / .env 里的 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DRY = process.argv.includes("--dry");
const BUCKET = "th-media";
// 需要搬走的旧主机
const OLD_HOSTS = ["lapi.fazhanmao.com", "shudong.nietzsci.com"];

// ---- 读取 env ----
function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = new URL("../" + f, import.meta.url);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (检查 .env.local)");
  process.exit(1);
}
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

const isOld = (u) => typeof u === "string" && OLD_HOSTS.some(h => u.includes(h));
const extOf = (u) => {
  const e = (u.split("?")[0].split("#")[0].split(".").pop() || "").toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(e) ? e : "png";
};
const mimeOf = (ext) => ({
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime"
}[ext] || "application/octet-stream");

// 同一旧 URL → 稳定新路径, 重跑幂等
const urlMap = new Map();        // oldUrl -> newUrl
const failed = new Map();        // oldUrl -> reason

async function rehost(oldUrl) {
  if (urlMap.has(oldUrl)) return urlMap.get(oldUrl);
  if (failed.has(oldUrl)) return null;
  const ext = extOf(oldUrl);
  const path = `rehost/${createHash("md5").update(oldUrl).digest("hex")}.${ext}`;
  if (DRY) { urlMap.set(oldUrl, "(dry)"); return "(dry)"; }
  try {
    const res = await fetch(oldUrl, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://" + new URL(oldUrl).host + "/" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error("空文件");
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: mimeOf(ext), upsert: true });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    const newUrl = data.publicUrl;
    urlMap.set(oldUrl, newUrl);
    // 登记素材库 (best-effort)
    await sb.from("assets").upsert({
      id: "as_rh" + createHash("md5").update(oldUrl).digest("hex").slice(0, 12),
      url: newUrl, bucket: BUCKET, path, name: oldUrl.split("/").pop(),
      mime_type: mimeOf(ext), size: buf.length, kind: mimeOf(ext).startsWith("video") ? "video" : "image"
    }, { onConflict: "id" }).then(() => {}, () => {});
    return newUrl;
  } catch (e) {
    failed.set(oldUrl, e.message || String(e));
    return null;
  }
}

// 把一行里所有旧 URL 替换掉, 返回 {changed, newRow}
async function processRow(r) {
  let changed = false;
  const patch = {};

  if (isOld(r.cover_url)) {
    const nu = await rehost(r.cover_url);
    if (nu && !DRY) { patch.cover_url = nu; changed = true; } else if (DRY && nu) changed = true;
  }

  if (Array.isArray(r.media_urls) && r.media_urls.some(m => isOld(m?.url))) {
    const nm = [];
    for (const m of r.media_urls) {
      if (isOld(m?.url)) { const nu = await rehost(m.url); nm.push(nu && !DRY ? { ...m, url: nu } : m); }
      else nm.push(m);
    }
    if (!DRY) { patch.media_urls = nm; }
    changed = true;
  }

  if (Array.isArray(r.options) && r.options.some(o => isOld(o?.media_url) || isOld(o?.label))) {
    const no = [];
    for (const o of r.options) {
      let oo = { ...o };
      if (isOld(o?.media_url)) { const nu = await rehost(o.media_url); if (nu && !DRY) oo.media_url = nu; }
      if (isOld(o?.label)) { const nu = await rehost(o.label); if (nu && !DRY) { oo.media_url = nu; oo.label = ""; oo.media_type = mimeOf(extOf(o.label)).startsWith("video") ? "video" : "image"; } }
      no.push(oo);
    }
    if (!DRY) patch.options = no;
    changed = true;
  }

  if (changed && !DRY && Object.keys(patch).length) {
    const { error } = await sb.from("assessments").update(patch).eq("id", r.id);
    if (error) console.warn("  写库失败", r.id, error.message);
  }
  return changed;
}

// ---- main ----
console.log(DRY ? "== 试运行(仅扫描) ==" : "== 开始搬图 ==", "目标:", URL_);
const { data: rows, error } = await sb.from("assessments").select("id, cover_url, media_urls, options");
if (error) { console.error("读取 assessments 失败:", error.message); process.exit(1); }

let touched = 0;
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const c = await processRow(r);
  if (c) { touched++; if (touched % 20 === 0) console.log(`  已处理 ${touched} 行...`); }
}

console.log("\n题目扫描:", rows.length, "| 含旧图行:", touched);
console.log("唯一旧图:", urlMap.size + failed.size, "| 成功搬运:", DRY ? 0 : urlMap.size, "| 失败:", failed.size);
if (failed.size) {
  console.log("失败明细(前10):");
  [...failed.entries()].slice(0, 10).forEach(([u, e]) => console.log("  ✗", e, u));
}
console.log(DRY ? "\n试运行结束, 未改动任何数据。去掉 --dry 实际执行。" : "\n完成。");
