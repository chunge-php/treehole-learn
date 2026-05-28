# 顶级类型 (资源分类) 图标素材

放置位置:`public/static/top-types/`(本目录)
访问 URL:`http://<host>/static/top-types/<filename>.png`(Next.js 自动暴露 public)

## 命名规则

- 一级分类(顶级):`<top>.png` — 单张封面图
- 二级分类:`<top>-<sub>-selected.png` / `<top>-<sub>-unselected.png` — 选中/未选中两张图标

## 完整清单(19 张图)

按旧项目 `option_values` 旧路径对照,wget 下载后改名放进本目录:

### 一级 (3 张, cover_url)

| 新文件名 | 旧路径 |
|---|---|
| `eval.png` | `/uploads/20251211/beeccb5a99bf1225.png` |
| `relief.png` | `/uploads/20251211/1e98093a66a5fa24.png` |
| `wiki.png` | `/uploads/20251211/f3c4c41a66bfe52b.png` |

### 二级 — 减压练习 (8 张, selected + unselected)

| 新文件名 | 旧路径 |
|---|---|
| `relief-mindful-selected.png` | `/uploads/20251211/3c0603cfe96c473f.png` |
| `relief-mindful-unselected.png` | `/uploads/20251211/f545ea0b24b3f046.png` |
| `relief-bodyscan-selected.png` | `/uploads/20251211/a886590e35557bbb.png` |
| `relief-bodyscan-unselected.png` | `/uploads/20251211/5ce604c719983b20.png` |
| `relief-belly-selected.png` | `/uploads/20251211/f09e3b21ff3eaf64.png` |
| `relief-belly-unselected.png` | `/uploads/20251211/56c95c25bfc3b68d.png` |
| `relief-video-selected.png` | `/uploads/20251211/ff1280cfd43af8ea.png` |
| `relief-video-unselected.png` | `/uploads/20251211/89dbdcd29625c3aa.png` |

### 二级 — 智能百科 (8 张, selected + unselected)

| 新文件名 | 旧路径 |
|---|---|
| `wiki-emotion-selected.png` | `/uploads/20251211/a8ae89aeba7ba91a.png` |
| `wiki-emotion-unselected.png` | `/uploads/20251211/012843e451eac596.png` |
| `wiki-social-selected.png` | `/uploads/20251211/ec6f1dd12d3c10c1.png` |
| `wiki-social-unselected.png` | `/uploads/20251211/f765f8a689fc5542.png` |
| `wiki-tutor-selected.png` | `/uploads/20251211/77b8f2ac5a859698.png` |
| `wiki-tutor-unselected.png` | `/uploads/20251211/e7d06c2d7f222006.png` |
| `wiki-selfknow-selected.png` | `/uploads/20251211/aa7307f143b46bd8.png` |
| `wiki-selfknow-unselected.png` | `/uploads/20251211/10ef20ed910d2bca.png` |

## 旧 → 新 映射规则

旧 `option_values` schema:
- `icon_open` = 未选中态(默认显示)
- `icon_close` = 选中态(高亮显示)

新 `top_types` schema:
- 一级:`cover_url = icon_open`(只有未选中态,作为封面)
- 二级:`selected_icon_url = icon_close` / `unselected_icon_url = icon_open`

> ⚠️ 如果 selected/unselected 跟旧业务实际显示效果反了,直接对调文件即可(数据库不用动)。

## 批量下载脚本(可选)

旧服务器 `shudong.nietzsci.com` (= 82.156.210.29) 国内能访问,境外拉不到。下载脚本(国内电脑跑):

```powershell
# Windows PowerShell
$ErrorActionPreference = 'Stop'
$base = 'http://shudong.nietzsci.com'
$out = 'public/static/top-types'
$map = @{
  'eval.png'                          = '/uploads/20251211/beeccb5a99bf1225.png';
  'relief.png'                        = '/uploads/20251211/1e98093a66a5fa24.png';
  'wiki.png'                          = '/uploads/20251211/f3c4c41a66bfe52b.png';
  'relief-mindful-selected.png'       = '/uploads/20251211/3c0603cfe96c473f.png';
  'relief-mindful-unselected.png'     = '/uploads/20251211/f545ea0b24b3f046.png';
  'relief-bodyscan-selected.png'      = '/uploads/20251211/a886590e35557bbb.png';
  'relief-bodyscan-unselected.png'    = '/uploads/20251211/5ce604c719983b20.png';
  'relief-belly-selected.png'         = '/uploads/20251211/f09e3b21ff3eaf64.png';
  'relief-belly-unselected.png'       = '/uploads/20251211/56c95c25bfc3b68d.png';
  'relief-video-selected.png'         = '/uploads/20251211/ff1280cfd43af8ea.png';
  'relief-video-unselected.png'       = '/uploads/20251211/89dbdcd29625c3aa.png';
  'wiki-emotion-selected.png'         = '/uploads/20251211/a8ae89aeba7ba91a.png';
  'wiki-emotion-unselected.png'       = '/uploads/20251211/012843e451eac596.png';
  'wiki-social-selected.png'          = '/uploads/20251211/ec6f1dd12d3c10c1.png';
  'wiki-social-unselected.png'        = '/uploads/20251211/f765f8a689fc5542.png';
  'wiki-tutor-selected.png'           = '/uploads/20251211/77b8f2ac5a859698.png';
  'wiki-tutor-unselected.png'         = '/uploads/20251211/e7d06c2d7f222006.png';
  'wiki-selfknow-selected.png'        = '/uploads/20251211/aa7307f143b46bd8.png';
  'wiki-selfknow-unselected.png'      = '/uploads/20251211/10ef20ed910d2bca.png';
}
foreach ($k in $map.Keys) { Invoke-WebRequest "$base$($map[$k])" -OutFile "$out\$k" }
```

或用 bash:
```bash
cd public/static/top-types
declare -A m=(
  [eval.png]=/uploads/20251211/beeccb5a99bf1225.png
  [relief.png]=/uploads/20251211/1e98093a66a5fa24.png
  # ... (照上面 PowerShell 的对照表填)
)
for k in "${!m[@]}"; do curl -o "$k" "http://shudong.nietzsci.com${m[$k]}"; done
```

## 缺图时的兜底

如果某张图暂时拿不到,前端按 `top_types` 设计图标:`SafeImage` 组件会加载失败时显示默认占位(项目里已有)。所以可以先跑起来,慢慢补图。
