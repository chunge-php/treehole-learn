// 把旧系统报告用的纯数据 PHP 文件 (return [...]) 精确转成 JSON
// 这些文件全是单引号字符串、无转义, 故用极简递归解析器
// 用法: node scripts/php_data_to_json.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

function parsePhpArray(src) {
  // 去掉 <?php 头与 leading return; 保留数组体
  let s = src.replace(/^\s*<\?php/, "").replace(/^\s*return\b/, "");
  // 截取到第一个 [ 开始
  const start = s.indexOf("[");
  if (start > 0) s = s.slice(start);
  let i = 0;
  const n = s.length;

  function skipWs() {
    while (i < n) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && s[i + 1] === "/") { while (i < n && s[i] !== "\n") i++; continue; }
      if (c === "/" && s[i + 1] === "*") { i += 2; while (i < n && !(s[i] === "*" && s[i + 1] === "/")) i++; i += 2; continue; }
      break;
    }
  }
  function parseValue() {
    skipWs();
    const c = s[i];
    if (c === "[") return parseArray();
    if (c === "'") return parseString("'");
    if (c === '"') return parseString('"');
    if (c === "$") { i++; while (i < n && /[a-zA-Z0-9_]/.test(s[i])) i++; return null; } // $var → null
    if (s.startsWith("true", i)) { i += 4; return true; }
    if (s.startsWith("false", i)) { i += 5; return false; }
    if (s.startsWith("null", i)) { i += 4; return null; }
    const m = /^-?\d+(\.\d+)?/.exec(s.slice(i));
    if (m) { i += m[0].length; return m[1] ? parseFloat(m[0]) : parseInt(m[0], 10); }
    throw new Error("parse fail near " + i + ": " + s.slice(i, i + 30));
  }
  function parseString(quote) {
    i++; // skip open quote
    let buf = "";
    while (i < n) {
      const c = s[i];
      if (c === "\\") { buf += s[i + 1]; i += 2; continue; }
      if (c === quote) { i++; break; }
      buf += c; i++;
    }
    return buf;
  }
  function parseArray() {
    i++; // [
    const entries = [];
    let isAssoc = false;
    skipWs();
    while (i < n && s[i] !== "]") {
      const val = parseValue();
      skipWs();
      if (s.startsWith("=>", i)) {
        i += 2;
        const realVal = parseValue();
        entries.push([val, realVal]);
        isAssoc = true;
      } else {
        entries.push([null, val]);
      }
      skipWs();
      if (s[i] === ",") { i++; skipWs(); }
    }
    i++; // ]
    if (isAssoc) {
      const obj = {};
      let auto = 0;
      for (const [k, v] of entries) obj[k === null ? auto++ : k] = v;
      return obj;
    }
    return entries.map(e => e[1]);
  }

  return parseValue();
}

// 从 Arithmetic.php 某方法里提取 `$data = [ ... ];` 数组体
function extractData(file, methodName) {
  const mIdx = file.indexOf("function " + methodName);
  if (mIdx < 0) throw new Error("method not found: " + methodName);
  const dIdx = file.indexOf("$data = [", mIdx);
  if (dIdx < 0) throw new Error("$data not found in " + methodName);
  let i = dIdx + "$data = ".length; // 指向 [
  // 括号匹配, 跳过字符串
  let depth = 0, start = i, quote = null;
  for (; i < file.length; i++) {
    const c = file[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { i++; break; } }
  }
  return parsePhpArray(file.slice(start, i));
}

const arith = readFileSync(new URL("../php/Arithmetic.php", import.meta.url), "utf8");

const out = {
  reportData: parsePhpArray(readFileSync(new URL("../php/reportData.php", import.meta.url), "utf8")),
  interestContent: parsePhpArray(readFileSync(new URL("../php/interestContent.php", import.meta.url), "utf8")),
  pluralism: parsePhpArray(readFileSync(new URL("../php/pluralism.php", import.meta.url), "utf8")),
  arithmetic: {
    multielementResult: extractData(arith, "multielementResult"),
    getPrContrast: extractData(arith, "getPrContrast"),
    getXueGeName: extractData(arith, "getXueGeName"),
    getXueGeUnscramble: extractData(arith, "getXueGeUnscramble"),
    studyScoreResult: extractData(arith, "studyScoreResult"),
    traitAnxietyResult: extractData(arith, "traitAnxietyResult"),
    stateAnxietyResult: extractData(arith, "stateAnxietyResult"),
    interestUserName: extractData(arith, "interestUserName"),
    getUserTypeName: extractData(arith, "getUserTypeName"),
  },
};

mkdirSync(new URL("../src/lib/report/", import.meta.url), { recursive: true });
const dest = new URL("../src/lib/report/report-content.json", import.meta.url);
writeFileSync(dest, JSON.stringify(out, null, 2), "utf8");

console.log("reportData 条目:", out.reportData.length);
console.log("interestContent 键数:", Object.keys(out.interestContent).length);
console.log("pluralism 条目:", out.pluralism.length);
console.log("输出:", dest.pathname);
