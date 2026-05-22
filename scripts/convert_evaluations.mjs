// 把旧系统 MySQL evaluations 题库 dump 转成树洞 assessments 种子 SQL
// 用法: node scripts/convert_evaluations.mjs
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../evaluations.sql", import.meta.url);
const OUT = new URL("../supabase/seed_assessments.sql", import.meta.url);
// 旧系统相对路径 /uploads/... 所在主机 (从 cover_url 绝对地址推断)
const HOST = "https://shudong.nietzsci.com";

const DIM = { 0: "多元性向量表", 1: "自陈量表", 2: "兴趣量表", 3: "多模态" };
const QTYPE = { 0: "单选题", 1: "判断题", 2: "语音题" };

const raw = readFileSync(SRC, "utf8");

// 解析单条 VALUES(...) 元组: 逐字符, 处理单引号字符串与 \ 转义
function parseTuple(s) {
  const out = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    while (i < n && /[\s,]/.test(s[i])) i++;
    if (i >= n) break;
    if (s[i] === "'") {
      i++;
      let buf = "";
      while (i < n) {
        const c = s[i];
        if (c === "\\") { // 反斜杠转义
          const nx = s[i + 1];
          const map = { n: "\n", r: "\r", t: "\t", "0": "\0" };
          buf += map[nx] ?? nx;
          i += 2;
          continue;
        }
        if (c === "'") {
          if (s[i + 1] === "'") { buf += "'"; i += 2; continue; } // '' 转义
          i++;
          break;
        }
        buf += c;
        i++;
      }
      out.push(buf);
    } else {
      let buf = "";
      while (i < n && !/[,]/.test(s[i])) { buf += s[i]; i++; }
      buf = buf.trim();
      out.push(buf === "NULL" ? null : buf);
    }
  }
  return out;
}

// 把旧 url (相对/绝对) 规整成绝对 url
function absUrl(u) {
  const v = String(u || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return HOST + (v.startsWith("/") ? v : "/" + v);
}

function guessType(u) {
  const ext = (u.split(".").pop() || "").toLowerCase().split(/[?#]/)[0];
  const img = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml" };
  const vid = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", avi: "video/x-msvideo", mkv: "video/x-matroska" };
  return img[ext] || vid[ext] || "application/octet-stream";
}

function pgStr(v) {
  if (v === null || v === undefined || v === "") return "null";
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function pgJson(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

const lines = raw.split("\n").filter(l => l.startsWith("INSERT INTO `evaluations`"));
const rows = [];
const stats = { dim: {}, qtype: {}, sortDup: 0, noAnswer: 0, imgOption: 0 };
const seenSort = new Set();

for (const line of lines) {
  const m = line.match(/VALUES\s*\((.*)\);\s*$/s);
  if (!m) continue;
  const t = parseTuple(m[1]);
  // 列: id,title,describe,cover_url,status,sort,dimension_type,project,topic_type,result,topic_url,options,created_at,updated_at
  const [id, title, describe, cover_url, status, sort, dimType, project, topicType, result, topic_url, optionsRaw] = t;

  const dimension = DIM[Number(dimType)] ?? "多元性向量表";
  const qtype = QTYPE[Number(topicType)] ?? "单选题";
  stats.dim[dimension] = (stats.dim[dimension] || 0) + 1;
  stats.qtype[qtype] = (stats.qtype[qtype] || 0) + 1;

  // title/description 智能映射: 优先把真正题干放到 title
  const oldTitle = (title || "").trim();
  const oldDesc = (describe || "").trim();
  const proj = (project || "").trim();
  let newTitle, newDesc;
  if (oldDesc) {
    newTitle = oldDesc;
    newDesc = oldTitle && oldTitle !== proj && oldTitle !== oldDesc ? oldTitle : null;
  } else {
    newTitle = oldTitle || proj || "(无题干)";
    newDesc = null;
  }

  // options: [{name,parse}] -> [{label,value}]
  let options = [];
  if (qtype !== "语音题" && optionsRaw) {
    try {
      const arr = JSON.parse(optionsRaw);
      if (Array.isArray(arr)) {
        options = arr.map((o, idx) => {
          const raw = String(o.parse ?? o.label ?? "").trim();
          const value = String(o.name ?? o.value ?? String.fromCharCode(65 + idx)).trim();
          // 选项内容是图片/视频 URL: 放进 media_url, label 留空
          if (/^https?:\/\//i.test(raw)) {
            stats.imgOption++;
            const media_type = /\.(mp4|webm|mov|avi|mkv|m4v)(\?|#|$)/i.test(raw) ? "video" : "image";
            return { label: "", value, media_url: raw, media_type };
          }
          return { label: raw, value };
        });
      }
    } catch { /* 保底空 */ }
  }

  const answer = qtype === "语音题" ? null : ((result || "").trim() || null);
  if (qtype !== "语音题" && !answer) stats.noAnswer++;

  // media_urls (题目文件) + cover
  const media = String(topic_url || "").split(/[,，\n]/).map(s => s.trim()).filter(Boolean)
    .map(u => { const url = absUrl(u); return { url, type: guessType(url), name: url.split("/").pop() }; });
  const cover = absUrl(cover_url) || null;

  let sortOrder = Number(sort);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) sortOrder = Number(id);
  while (seenSort.has(sortOrder)) { sortOrder++; stats.sortDup++; }
  seenSort.add(sortOrder);

  rows.push({
    id: "as_e" + id,
    title: newTitle,
    description: newDesc,
    cover_url: cover,
    media_urls: media,
    project_name: proj || null,
    dimension, qtype, options, answer,
    sort_order: sortOrder,
    status: Number(status) === 0 ? "disabled" : "active",
  });
}

// 生成 SQL
const head = `-- 测评题库种子 (由旧系统 evaluations 表转换, 共 ${rows.length} 题)
-- 生成脚本: scripts/convert_evaluations.mjs  请勿手改, 重跑脚本即可
-- 幂等: on conflict (id) do update, 可反复 db reset

insert into assessments (id, title, description, cover_url, media_urls, project_name, dimension, qtype, options, answer, sort_order, status) values
`;

const body = rows.map(r =>
  `  (${pgStr(r.id)}, ${pgStr(r.title)}, ${pgStr(r.description)}, ${pgStr(r.cover_url)}, ${pgJson(r.media_urls)}, ${pgStr(r.project_name)}, ${pgStr(r.dimension)}, ${pgStr(r.qtype)}, ${pgJson(r.options)}, ${pgStr(r.answer)}, ${r.sort_order}, ${pgStr(r.status)})`
).join(",\n");

const tail = `
on conflict (id) do update set
  title = excluded.title, description = excluded.description, cover_url = excluded.cover_url,
  media_urls = excluded.media_urls, project_name = excluded.project_name, dimension = excluded.dimension,
  qtype = excluded.qtype, options = excluded.options, answer = excluded.answer,
  sort_order = excluded.sort_order, status = excluded.status, updated_at = now();
`;

writeFileSync(OUT, head + body + tail, "utf8");

console.log("题目总数:", rows.length);
console.log("维度分布:", stats.dim);
console.log("题型分布:", stats.qtype);
console.log("图片选项数:", stats.imgOption, "| 无答案题数:", stats.noAnswer, "| sort冲突修正:", stats.sortDup);
console.log("所属项目种类:", [...new Set(rows.map(r => r.project_name))].filter(Boolean).length);
console.log("输出:", OUT.pathname);
