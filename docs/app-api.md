# 树洞 App 端接口文档

> 给同事(平板端/Flutter)对接用。所有接口前缀 `/api/app/*`,前后端独立,**不使用 cookie**,通过 Bearer Token 鉴权。

## 基础信息

| 环境 | Base URL |
|---|---|
| **本地开发**(同局域网) | `http://192.168.101.44:3006` |
| 生产 | 待部署(域名后续告知) |

所有接口路径在 baseUrl 后拼,例如 `http://192.168.101.44:3006/api/app/auth/login`。

## 基础约定

### 鉴权方式
- 登录成功后,服务端返回 `token` 字符串
- 后续请求必须在 HTTP 头里带:`Authorization: Bearer <token>`
- token 有效期 **30 天**,过期需重新登录
- 兼容头:也可以用 `X-App-Token: <token>` (备选,跟 Authorization 等价)

### 响应统一结构
所有接口返回 JSON,结构统一:
```jsonc
// 成功
{ "ok": true, ...其他业务字段 }

// 失败
{ "ok": false, "error": "提示文案", "code": "BUSINESS_CODE" }
```

### HTTP 状态码约定
| 状态码 | 含义 |
|---|---|
| 200 | 成功(`ok: true`) |
| 400 | 请求参数缺失/格式错(`ok: false, code: MISSING_FIELDS` 等) |
| 401 | 未登录 / token 过期(`code: UNAUTHORIZED`) → 跳登录页 |
| 403 | 账号被禁用(`code: ACCOUNT_DISABLED`) |
| 404 | 资源不存在(`code: NOT_FOUND`) |
| 500 | 服务端异常 |

### 接口列表

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | `/api/app/auth/login` | 学生账号密码登录 | ❌ |
| GET | `/api/app/me` | 获取当前登录学生信息(启动时校验 token) | ✅ |
| GET | `/api/app/home/today` | 首页今日数据(三态机:测评卡 / 解锁卡 / 完整 3 卡) | ✅ |
| POST | `/api/app/eval/start` | 开始学习力测评(返回会话 + 自动续答) | ✅ |
| GET | `/api/app/eval/sessions` | **当前学生所有测评记录列表**(历史 + 进行中) | ✅ |
| GET | `/api/app/eval/sessions/:id` | 拿测评会话详情(题目 + 已答 map) | ✅ |
| POST | `/api/app/eval/sessions/:id/answer` | 提交单题作答(完成时自动同步学生档案) | ✅ |
| GET | `/api/app/eval/sessions/:id/result` | 拿测评报告(value1..value10 结构,**用于自渲染**) | ✅ |
| POST | `/api/app/ai/upload-image` | 拍照/选本地图上传(返回 public URL) | ✅ |
| POST | `/api/app/ai/chat` | **AI 聊天 SSE 流式**(扣子工作流,支持文字+图片+多轮) | ✅ |
| POST | `/api/app/face-check/upload-media` | **多模态文件上传**(audio/video/script → 华为云 OBS) | ✅ |
| POST | `/api/app/face-check/finalize` | **多模态评估完成**(生成 11 项分值 + 写学生档案) | ✅ |

> 后续接口陆续补充: 导学历日历、心屿世界推荐、错题本、作文批改等。

---

## POST `/api/app/auth/login` — 登录

学生账号密码登录。账号 = 学生在管理后台「用户管理」里设置的 `login_username`,密码 = 老师/家长设置的初始密码。

### 请求

```http
POST /api/app/auth/login
Content-Type: application/json

{
  "username": "zhangxiaoming",
  "password": "abc123"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `username` | string | ✅ | 学生登录账号 |
| `password` | string | ✅ | 明文密码 |

### 响应

**成功** (200):
```jsonc
{
  "ok": true,
  "token": "eyJzdHVkZW50X2lkIjoiZXVfeHh4Iiwi...",
  "student": {
    "id": "eu_xxx",
    "name": "张小明",
    "username": "zhangxiaoming",
    "gender": "male",          // male / female / other / null
    "age": 13,
    "grade": "初二3班",
    "school": "示范中学",
    "phone": "13800138000",
    "store": "北京启明海淀店",   // 所属店铺名
    "channel": "北京启明渠道商"  // 所属渠道商名
  }
}
```

**失败**:

| HTTP | code | error 文案 | 含义 |
|---|---|---|---|
| 400 | `MISSING_FIELDS` | 请输入账号和密码 | 字段缺失 |
| 401 | `INVALID_CREDENTIALS` | 账号或密码错误 | 账号不存在 / 密码错(故意不区分,防爆破) |
| 403 | `ACCOUNT_DISABLED` | 账号已被禁用, 请联系老师 | 学生 status ≠ active |
| 500 | `DB_ERROR` | 查询失败 | 数据库异常 |

### 前端处理建议
- 把 `token` 存本地 SecureStorage / SharedPreferences,key 建议 `treehole_app_token`
- 把 `student` 整个对象也存一份(`treehole_app_student`),App 启动时优先读缓存,然后调 `/api/app/me` 后台刷新
- 收到 401 → 清除本地 token → 跳登录页

---

## GET `/api/app/me` — 获取当前学生信息

App 启动时调用,用来校验本地 token 是否还有效,顺便刷新学生最新信息(可能账号被禁用 / 信息被老师改了)。

### 请求

```http
GET /api/app/me
Authorization: Bearer eyJzdHVkZW50X2lkIjoiZXVfeHh4Iiwi...
```

无 body。

### 响应

**成功** (200):
```jsonc
{
  "ok": true,
  "student": {
    "id": "eu_xxx",
    "name": "张小明",
    "username": "zhangxiaoming",
    "gender": "male",
    "age": 13,
    "grade": "初二3班",
    "school": "示范中学",
    "phone": "13800138000",
    "parent_name": "张爸爸",
    "parent_phone": "13900139000",
    "store": "北京启明海淀店",
    "channel": "北京启明渠道商"
  }
}
```

**失败**:

| HTTP | code | 说明 |
|---|---|---|
| 401 | `UNAUTHORIZED` | token 缺失/无效/过期 → 跳登录页 |
| 403 | `ACCOUNT_DISABLED` | 账号被禁用 |
| 404 | `NOT_FOUND` | 学生已被删除 |

---

---

## GET `/api/app/home/today` — 首页今日数据

平板登录后进首页就调一次。后端根据学生**今天**做没做学习力测评 + 人脸识别多模态,返回 3 态之一:

| status | 含义 | 前端显示(对照设计图) |
|---|---|---|
| `no_eval` | 学生**从未做过**学习力测评(一次性,做过就再不显示) | 显示「学习力测评」卡(限免 5 分 / 专业 30 分) → 图 2 |
| `no_face` | 做过测评了,**今天**还没做人脸识别多模态 | 显示「解锁今日学习状态」卡(10 秒解锁) → 图 3 |
| `ready`  | 测评做过 + 今日多模态完成 | 显示完整 3 卡:学习状态 + 解压游戏 + 导学历 → 图 4 |

> 注意:**学习力测评是一次性的**(学生学情/学格是稳定属性,不需每天测)。学生做过一次后,首页就跳过 `no_eval` 直接看 `no_face`。如果想重测,从「个人中心」入口手动触发。
> 
> **人脸识别多模态是每天做的**(检测当天学习状态),所以每天首次进首页都会触发 `no_face`。

### 请求

```http
GET /api/app/home/today
Authorization: Bearer <token>
```

### 响应

#### 状态 `no_eval`(未做测评)

```jsonc
{
  "ok": true,
  "greeting": "张小明同学,准备好开启今天的学习了吗?",
  "status": "no_eval",
  "student_name": "张小明",
  "assignments_summary": {
    "pending": 0,
    "completed": 0,
    "by_subject": []
  }
}
```

> 前端这种状态下:顶部 greeting 气泡 + 中间"学习力测评卡"(测评卡内容/价格前端写死)+ 底部导学历入口。

#### 状态 `no_face`(测评做了,人脸识别未做)

跟 `no_eval` 结构一样,只是 `status: "no_face"`。前端中间卡变成「解锁今日学习状态」。

#### 状态 `ready`(完整数据)

```jsonc
{
  "ok": true,
  "greeting": "张小明回来啦~你的专属 AI 小助手已上线",
  "status": "ready",
  "student_name": "张小明",

  "multimodal": {
    "vitality": 86,                 // 动力 = 综合分 (composite_score, 0-100)
    "stress": 12,                   // 压力 = 100 - 抗压力维度均分, 越低越好
    "state_label": "极佳学习状态",  // 元气 (15 级映射)
    "level": 2,                     // 1-15
    "comment": "专注度和兴趣都在线...",
    "keywords": ["高度专注","兴趣浓厚","续航在线","状态稳定"],  // 学习状态关键词 (词云)
    "evaluated_at": "2026-05-28T15:30:00.000Z"
  },

  "game": {                          // 解压游戏 (基于多模态结果查表; 第三方提供, 当前不管资源)
    "name": "舒尔特方格",
    "keywords": "专注、巩固、稳定",
    "cover_url": null,               // 一期不返封面, 前端用默认占位图
    "duration_min": 3
  },

  "assignments_summary": {
    "pending": 3,
    "completed": 1,
    "by_subject": [
      { "subject": "数学", "count": 1, "remaining_minutes": 15 },
      { "subject": "作业", "count": 2, "remaining_minutes": 30 }
    ]
  }
}
```

### 字段说明

#### `multimodal`(只在 ready 时返回)
| 字段 | 类型 | 说明 |
|---|---|---|
| `vitality` | int | 动力 = 综合分,0-100 |
| `stress` | int | 压力 = 100 - 抗压力维度均分,越低越好(设计图 "12" 即偏放松) |
| `state_label` | string | 状态文案 (`"极佳学习状态"` / `"需调整状态"` 等 15 级文案) |
| `level` | int | 1-15 级,越小越好 |
| `comment` | string | 该等级的评语全文 |
| `keywords` | string[] | 从 11 项分值查表生成,长度 ≤ 6,可做词云/标签展示 |
| `evaluated_at` | iso8601 | 这次多模态的时间戳 |

#### `game`(只在 ready 时返回)
| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 推荐游戏名 |
| `keywords` | string | 关键词字符串(逗号分隔) |
| `cover_url` | string \| null | 一期固定 null,前端用默认图;后期接第三方游戏接入 |
| `duration_min` | int | 默认 3 分钟 |

#### `assignments_summary`(始终返回)
- `pending`:今日待办数(`start_date <= today <= end_date` 且未 `completed_at`)
- `completed`:今日已完成数
- `by_subject[]`:按学科分组(一期从 name 关键词推断:数学/语文/英语/物理/化学/生物/历史/地理/政治/手工/读书会),分不出归"作业";后期 `assignments` 表加 `subject` 字段后更准

### 前端集成建议

```dart
// 伪代码 (Flutter)
final resp = await dio.get('/api/app/home/today',
  options: Options(headers: { 'Authorization': 'Bearer $token' }));

switch (resp.data['status']) {
  case 'no_eval':
    showEvalCard();   // 学习力测评卡
    break;
  case 'no_face':
    showUnlockCard(); // 解锁今日学习状态
    break;
  case 'ready':
    showStatusCard(resp.data['multimodal']);
    showGameCard(resp.data['game']);
    break;
}
showAssignmentsCard(resp.data['assignments_summary']);
```

### 错误码

| HTTP | code | 说明 |
|---|---|---|
| 401 | `UNAUTHORIZED` | token 失效,跳登录页 |
| 403 | `ACCOUNT_DISABLED` | 学生账号被禁用 |
| 404 | `NOT_FOUND` | 学生记录被删了 |

---

## 学习力测评(一次性,完成后写学生档案)

测评对标后台「测评报告」功能,共 400+ 题(根据 `assessments` 表 status=active 题量决定),涵盖 4 个维度(多元性向 / 兴趣 / 自陈 / 多模态)。

### 业务规则
- **一次性**:每个学生只做一次,完成后首页不再弹「学习力测评卡」;如需重测从「个人中心」入口手动重启(后续接口提供)
- **可续答**:学生答到一半退出 App,再进时 `POST /api/app/eval/start` 会返回上次进行中的 `session_id` (resumed=true),`GET sessions/:id` 拿到题目和已答的 map,从中断点继续
- **完成即生效**:最后一题答完瞬间,后端自动生成报告 + 同步学生档案的 `basic.学生类型 / basic.八格类型 / psychology.焦虑等级 / report_latest 等`,Profile 同步反馈在 `profile_synced` 字段里

### 📄 报告详情 — 直接 WebView 嵌入公开页(推荐)

后台已经实现完整的报告渲染页(`value1..value10` 全部显示 + **PDF 导出** + **分享**),**且无需登录**。App 端不要自己重新渲染报告,直接 WebView 加载这个公开页即可:

```
GET http://192.168.101.44:3006/report/<session_id>
```

- 任何人拿到 `session_id` 都能查看,无需 Authorization
- 页面里内置「下载 PDF」「分享链接」按钮
- session_id 由 `POST /api/app/eval/start` 返回,或 `GET /api/app/eval/sessions` 列表里取(列表中 `public_report_path` 字段就是 `/report/<id>`)
- 仅当 session.status = `completed` 时可访问(进行中的 session 访问会跳 404)

**App 端集成示例**(Flutter):
```dart
// 跳转报告详情页
final sessionId = 'rs_xxx';
final reportUrl = 'http://192.168.101.44:3006/report/$sessionId';
// 用 webview_flutter / flutter_inappwebview 全屏打开
Navigator.push(context, MaterialPageRoute(
  builder: (_) => WebViewPage(url: reportUrl, title: '学习力报告')
));
```

> 如果你**确实要自渲染**(比如想做原生 Flutter 报告页),也可以调 `GET /api/app/eval/sessions/:id/result` 拿 value1..value10 raw 数据自己渲染。但**强烈推荐 WebView 方案** — 报告样式复杂(图表/表格/14 大块),Flutter 重写工作量大且容易跟后台样式不一致。

---

### POST `/api/app/eval/start` — 开始/恢复测评

```http
POST /api/app/eval/start
Authorization: Bearer <token>
```
无 body。

**响应** — 3 种情况:

1️⃣ **新建测评**(学生首次)
```jsonc
{
  "ok": true,
  "session_id": "rs_xxx",
  "code": "XXL0000123",      // 学生唯一序号 (作为多模态音频 audio_id 用)
  "total_questions": 406,
  "answered_count": 0,
  "status": "in_progress",
  "resumed": false           // 新会话
}
```

2️⃣ **续答**(有未完成的会话)
```jsonc
{
  "ok": true,
  "session_id": "rs_xxx",
  "code": "XXL0000123",
  "total_questions": 406,
  "answered_count": 87,      // 已答了 87 题
  "status": "in_progress",
  "resumed": true            // 续答
}
```

3️⃣ **已完成过**(`code: ALREADY_COMPLETED`)
```jsonc
{
  "ok": false,
  "error": "学习力测评已完成过, 如需重测请前往个人中心",
  "code": "ALREADY_COMPLETED",
  "last_completed_session_id": "rs_yyy"   // 上次完成的会话 id, 可直接调 result 拿报告
}
```
HTTP 410。前端处理:跳到个人中心 → 学习力报告卡(直接显示 last_completed_session_id 的报告)。

---

### GET `/api/app/eval/sessions` — 当前学生测评记录列表

App 个人中心「学习力报告」入口的列表展示用。返回该学生所有 (含进行中 + 已完成) 的测评 session 摘要。

```http
GET /api/app/eval/sessions?status=completed&limit=20
Authorization: Bearer <token>
```

**Query 参数**:
| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `status` | `completed` / `in_progress` / `all` | `all` | 状态过滤 |
| `limit` | int | 20 | 上限 100,最近的优先 |

**响应**:
```jsonc
{
  "ok": true,
  "sessions": [
    {
      "id": "rs_xxx",
      "code": "XXL0000123",
      "status": "completed",
      "total_questions": 406,
      "answered_count": 406,
      "progress_pct": 100,
      "completed_at": "2026-05-28T15:30:00.000Z",
      "created_at": "2026-05-28T10:00:00.000Z",
      "has_report": true,
      "public_report_path": "/report/rs_xxx"   // 完成的会话才有, 拼上 baseUrl 直接 WebView 嵌入
    },
    {
      "id": "rs_yyy",
      "code": "XXL0000122",
      "status": "in_progress",
      "total_questions": 406,
      "answered_count": 87,
      "progress_pct": 21,
      "completed_at": null,
      "created_at": "2026-05-26T08:00:00.000Z",
      "has_report": false,
      "public_report_path": null
    }
  ]
}
```

**前端集成**:
```dart
// 个人中心 → 学习力报告列表
final list = await api.get('/api/app/eval/sessions?status=completed');
ListView.builder(
  itemCount: list['sessions'].length,
  itemBuilder: (ctx, i) {
    final s = list['sessions'][i];
    return ListTile(
      title: Text(s['code']),
      subtitle: Text(s['completed_at']),
      onTap: () {
        // 点击 → WebView 打开公开报告页
        final url = 'http://192.168.101.44:3006${s['public_report_path']}';
        openWebView(url);
      },
    );
  },
);
```

---

### GET `/api/app/eval/sessions/:id` — 拿题目和已答

```http
GET /api/app/eval/sessions/rs_xxx
Authorization: Bearer <token>
```

**响应**:
```jsonc
{
  "ok": true,
  "session": {
    "id": "rs_xxx",
    "code": "XXL0000123",
    "total_questions": 406,
    "answered_count": 87,
    "status": "in_progress",
    "completed_at": null,
    "created_at": "2026-05-28T10:00:00.000Z"
  },
  "questions": [
    {
      "id": "as_001",
      "title": "下列哪个选项更符合你的学习习惯?",
      "description": null,
      "cover_url": null,         // 题面图(可选)
      "media_urls": null,        // 多图/视频(可选)
      "dimension": "多元性向量表",   // 4 大维度之一
      "qtype": "单选题",            // 单选题 / 判断题 / 语音题
      "options": [
        { "label": "认真听讲做笔记", "value": "A", "media_url": null, "media_type": null },
        { "label": "看视频跟同学讨论", "value": "B" }
        // ...
      ],
      "project_name": "学习风格",  // 题目分组名
      "sort_order": 1
    }
    // ... 共 total_questions 道, 顺序固定 (创建会话时快照)
  ],
  "answers": {
    "as_001": "A",        // 已答的题填字符串
    "as_002": "B"
    // 未答的不在这个对象里
  }
}
```

错误码:
- 401 `UNAUTHORIZED`
- 403 `NOT_OWNER`(企图访问别的学生的会话)
- 404 `NOT_FOUND`

---

### POST `/api/app/eval/sessions/:id/answer` — 提交单题

每答完一题就调一次。完成最后一题时,响应会附带档案同步结果。

```http
POST /api/app/eval/sessions/rs_xxx/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "assessment_id": "as_001",
  "answer": "A"             // 单选/判断: 选项 value; 语音题: 音频 URL; 跳过传 null
}
```

**响应** — 普通题:
```jsonc
{
  "ok": true,
  "answered": 88,
  "total": 406,
  "completed": false
}
```

**响应** — 最后一题(触发档案同步):
```jsonc
{
  "ok": true,
  "answered": 406,
  "total": 406,
  "completed": true,
  "profile_synced": {
    "ok": true,
    "fields": ["basic.学生类型", "basic.八格类型", "psychology.焦虑等级", "psychology.情绪", "report_latest"]
  }
}
```

如果同步失败:
```jsonc
{
  "ok": true, "answered": 406, "total": 406, "completed": true,
  "profile_synced": { "ok": false, "fields": [], "error": "..." }
}
```

> 注:`profile_synced` 字段**仅在最后一题完成的那次响应**才有,后续重复调不会再同步。

错误码:
- 400 `MISSING_FIELDS` / `INVALID_QUESTION`(题不属于此测评)
- 401/403/404 同上

---

### GET `/api/app/eval/sessions/:id/result` — 拿报告

测评完成后展示给学生的最终报告。

```http
GET /api/app/eval/sessions/rs_xxx/result
Authorization: Bearer <token>
```

**响应**:
```jsonc
{
  "ok": true,
  "session": {
    "id": "rs_xxx",
    "code": "XXL0000123",
    "completed_at": "2026-05-28T15:30:00.000Z"
  },
  "report": {
    "name": "张小明", "code": "XXL0000123", "dates": "2026-05-28",
    "value1": {                     // 学生类型
      "name": "张小明", "title": "自信稳健型",
      "describe": "基础扎实但缺乏突破动力...", "content": "..."
    },
    "value2": {                     // 多元性向量化分布 (维度 → 等级)
      "逻辑思维": 8, "阅读能力": 7, "专注力": 6, ...
    },
    "value3": {                     // 八格类型
      "title": "学格3型", "str": "...", "content": "...", "suggest": "..."
    },
    "value4": {                     // 焦虑等级
      "status_anxiety": "中度", "trait_anxiety": "轻度", "study_anxiety": "轻度"
    },
    "value5": [                     // 焦虑分数
      { "title": "状态焦虑", "value": 65 },
      { "title": "特质焦虑", "value": 42 },
      { "title": "感知压力", "value": 38 }
    ],
    "value6": [...],                // 多元性向结果数组
    "value7": [...],                // 项目数组
    "value8": {                     // 兴趣六型 (霍兰德)
      "scores_cake": [...], "career_name": "...",
      "top3": "S/I/A", "distinguish": "区分性 D 值: ...",
      "harmony_value": 4, "self_introduce": "...",
      "interest_arr": [...], "major_arr": [...]
    },
    "value9": [...],                // 报告结论
    "value10": [...]                // 发展建议
  }
}
```

> `value1..value10` 字段语义跟后台 `ReportView` 完全一致, 前端按这套渲染即可。

错误码:
- 409 `NOT_COMPLETED`(还在答题中,没法拿报告)
- 500 `BUILD_FAILED`(报告构建失败,极少见,看服务端日志)

---

### 完整流程示例(Flutter 伪代码)

```dart
// 1. 学生在首页 no_eval 状态, 点测评卡
final start = await api.post('/api/app/eval/start');
final sessionId = start['session_id'];

// 2. 拿题目和已答 (支持续答)
final detail = await api.get('/api/app/eval/sessions/$sessionId');
final questions = detail['questions'];
final answers = detail['answers'];

// 3. 一题一题答, 答完即提交
for (final q in questions) {
  if (answers[q['id']] != null) continue;  // 跳过已答
  final myAnswer = showQuestion(q);
  final res = await api.post('/api/app/eval/sessions/$sessionId/answer', {
    'assessment_id': q['id'],
    'answer': myAnswer,
  });
  updateProgress(res['answered'], res['total']);
  if (res['completed'] == true) {
    if (res['profile_synced']?['ok']) toast('档案已更新');
    break;
  }
}

// 4. 拿报告
final result = await api.get('/api/app/eval/sessions/$sessionId/result');
renderReport(result['report']);   // 用 value1..value10 渲染
```

---

## AI 聊天 (流式 SSE + 拍照讲解)

学生跟 AI 学习导师对话,**流式逐字输出**,支持多轮对话 + 拍照解题。后端走扣子工作流,学生档案在后台静默更新(学生**不会**看到"档案已更新"系统提示)。

### 整体流程

```
学生输入文字 (+ 可选拍照)
    ↓
(可选) POST /api/app/ai/upload-image  ← 拍照场景: 先上传拿 URL
    ↓ url
POST /api/app/ai/chat  body: {user_message, image_url, history}
    ↓ SSE 流
逐字推送 AI 回复
    ↓
done 事件 → 完整文本
    ↓ (后台静默)
学生档案 user_profiles 累积更新 (ai_history / knowledge / psychology 等)
```

---

### POST `/api/app/ai/upload-image` — 拍照/选本地图上传

学生在 AI 聊天页要"拍照解题"时,先调这个接口拿 URL,再带着 url 调聊天接口。

```http
POST /api/app/ai/upload-image
Authorization: Bearer <token>
Content-Type: multipart/form-data

(field: file = <image binary>)
```

**响应**(200):
```jsonc
{
  "ok": true,
  "url": "http://192.168.101.44:46421/storage/v1/object/public/th-media/chat/eu_xxx/202605/abc123.png",
  "name": "题目截图.png",
  "type": "image/png",
  "size": 234567
}
```

**错误码**:
| HTTP | code | 说明 |
|---|---|---|
| 400 | `MISSING_FILE` / `INVALID_TYPE` / `INVALID_FORM` | 字段错 / 不是图片 / 非 multipart |
| 401 | `UNAUTHORIZED` | token 失效 |
| 413 | `FILE_TOO_LARGE` | 超过 10MB |
| 500 | `UPLOAD_FAILED` | 上传到 Supabase 失败 |

**限制**:
- 仅支持图片 (`image/*` MIME)
- 最大 **10 MB**(超过 413)
- 存储路径:`th-media/chat/<student_id>/<yyyymm>/<random>.<ext>`,公开可读

---

### POST `/api/app/ai/chat` — AI 聊天 SSE

```http
POST /api/app/ai/chat
Authorization: Bearer <token>
Content-Type: application/json
Accept: text/event-stream

{
  "user_message": "帮我讲讲二元一次方程怎么消元",
  "image_url": "http://.../some-image.png",            // 选填: 拍照解题时带
  "history": [                                          // 选填: 多轮对话历史
    { "role": "user",      "content": "之前的问题..." },
    { "role": "assistant", "content": "之前的回答..." }
  ]
}
```

**body 字段**:
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_message` | string | ✅(无图时) | 学生本轮文字提问;**有 image_url 时可为空**(纯看图) |
| `image_url` | string | ❌ | 上面接口拿到的 URL(后端会自动转扣子 file_id 给视觉模型看) |
| `history` | `[{role,content}]` | ❌ | 之前的多轮对话(role: `user` / `assistant`);**前端自己维护**,每次发送把累积的对话传过来 |

> 至少 `user_message` 和 `image_url` 有一个,否则 400 `MISSING_FIELDS`

**响应**:`Content-Type: text/event-stream`,SSE 格式

```
event: delta
data: {"text":"二元一次方程组"}

event: delta
data: {"text":"的核心是消元——"}

event: delta
data: {"text":"把两个未知数变成一个..."}

...

event: done
data: {"full":"完整 Markdown 格式的 AI 回复..."}
```

**事件类型**:
| event | data | 说明 |
|---|---|---|
| `delta` | `{ text: string }` | AI 回复的**增量片段**(前端累积拼接) |
| `done` | `{ full: string }` | 流式结束,带本次完整回复 |
| `error` | `{ message: string }` | 出错(扣子调用失败 / 图片处理失败 等),流会立即关闭 |

> ⚠️ App 端**不会**收到 `profile_updated` 事件(那是测试中心专用)。学生档案在后台静默更新,学生无感知。

**错误码**(401/400 直接返回 JSON,不是 SSE):
| HTTP | code | 说明 |
|---|---|---|
| 400 | `MISSING_FIELDS` | user_message 和 image_url 都空 |
| 401 | `UNAUTHORIZED` | token 失效 |
| 404 | `NOT_FOUND` | 学生记录不存在 |
| 500 | `SERVER_NOT_READY` | 后端扣子配置缺失(管理员问题,非业务错) |
| 500 | `PROMPT_BUILD_FAILED` | 拼提示词失败 |

**SSE 内 error 事件**(已建立流式后出错):
SSE 已开始流式 → 出错时**不会**变 HTTP 状态码,而是推一个 `event: error` 事件,然后正常 close。前端要监听 `error` 事件做兜底。

---

### 完整集成示例(Flutter)

```dart
// Step 1 (可选): 拍照上传
String? imageUrl;
if (pickedImage != null) {
  final formData = FormData.fromMap({
    'file': MultipartFile.fromFileSync(pickedImage.path),
  });
  final upload = await dio.post('/api/app/ai/upload-image',
    data: formData,
    options: Options(headers: { 'Authorization': 'Bearer $token' }),
  );
  imageUrl = upload.data['url'];
}

// Step 2: SSE 调聊天接口
final req = http.Request('POST', Uri.parse('${baseUrl}/api/app/ai/chat'));
req.headers.addAll({
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json',
  'Accept': 'text/event-stream',
});
req.body = jsonEncode({
  'user_message': inputText,
  'image_url': imageUrl,
  'history': chatHistory.map((m) => {'role': m.role, 'content': m.content}).toList(),
});

final resp = await req.send();
String full = "";
String? buffer = "";
await for (final chunk in resp.stream.transform(utf8.decoder)) {
  buffer = buffer! + chunk;
  // 按 \n\n 切 SSE 事件
  while (buffer!.contains("\n\n")) {
    final idx = buffer.indexOf("\n\n");
    final evt = buffer.substring(0, idx);
    buffer = buffer.substring(idx + 2);
    String? event;
    String? dataStr;
    for (final line in evt.split("\n")) {
      if (line.startsWith("event:")) event = line.substring(6).trim();
      else if (line.startsWith("data:")) dataStr = line.substring(5).trim();
    }
    if (dataStr == null) continue;
    final data = jsonDecode(dataStr);
    switch (event) {
      case "delta":
        full += data['text'] as String;
        updateUI(full);   // 增量更新气泡显示
        break;
      case "done":
        full = data['full'] as String;
        finalizeUI(full);
        // 把这轮加进 history 给下次用
        chatHistory.add(ChatMessage(role: 'user', content: inputText));
        chatHistory.add(ChatMessage(role: 'assistant', content: full));
        break;
      case "error":
        showError(data['message']);
        break;
    }
  }
}
```

### 注意事项

1. **Markdown 渲染**:AI 回复是 Markdown 格式(含 `**加粗**` / `### 标题` / 列表 / 数学公式 `$x=2$` 等),Flutter 建议用 `flutter_markdown` 包渲染。数学公式可叠加 `flutter_math_fork`。
2. **历史对话上下文**:`history` 由前端自己维护(本地 state),每次调聊天接口都把累积的传过来。**不需要**调单独接口去拿历史(后端不存,只算"长期对话历史"在 user_profiles.ai_history 里,那个是分析用)。
3. **多轮记忆**:扣子工作流会读 `history`,所以 AI 能记住本会话之前的对话(类似 ChatGPT 同一会话)。但**清空 history = 新对话**。
4. **流式中断**:如果用户切页/关闭对话,客户端断开请求即可,后端会自动 cleanup。
5. **图片有效期**:Supabase Storage 存的图永久保留(直到学生注销),扣子那边 file_id 3 个月过期但不影响业务(URL 一直能访问)。

---

## 人脸识别 + 多模态评估

学生在首页处于 `no_face` 状态时,点「解锁今日学习状态」卡 → 平板调用人脸识别 SDK + 录制 10 秒视频/音频 → 上传到华为云 OBS → 触发多模态评估 → 拿到「动力 / 压力 / 元气」等今日学习状态数据,首页变 `ready` 态。

> ⚠️ **一期开发模式**:第三方多模态识别接口(发展猫)还没给,**App 端一期可以完全跳过文件上传**,直接调 `/finalize` 拿模拟分值即可。平板上的人脸识别录制依然要做(动画/UX),但录完的文件可以**先不上传**,等二期对接发展猫后再启用 `/upload-media` 接口。

### 整体流程

#### 🚀 一期简化版(当前阶段,推荐)

```
平板端 (Flutter)
├ 1. 学生点「解锁」卡, 播放 10s 人脸识别动画 (可走 mock)
└ 2. 动画播完直接调:
     POST /api/app/face-check/finalize  body: {} (空)
     ↓ 后端 generateRandomScores 模拟分
     ↓ 写 user_profiles.multimodal_latest
     ↓ 返回 { multimodal, game }
└ 3. 用响应直接更新首页 state, 进入 ready 状态
```

#### 🔮 二期完整版(等发展猫接口给了再切)

```
平板端 (Flutter)
├ 1. 启动人脸识别 / 录制 10s (audio.wav + video.mp4 + asr-text.txt)
├ 2. 逐个上传文件:
│    POST /api/app/face-check/upload-media (kind=audio/video/script)
│    ↓ 返回 url + file_id
└ 3. 触发评估:
     POST /api/app/face-check/finalize body 带上一步的 url/file_id
     ↓ 后端调发展猫 API 拿真实 11 项分
     ↓ 写学生档案
     ↓ 返回 { multimodal, game }

服务端二期文件存储:
   华为云 OBS, 严格按文档路径:
   data/{XXL+7位}/{audio|video|script}/{timestamp}/{timestamp}{user_id}raw.{ext}
```

> 接口签名(URL + 字段)**两期完全一致**,后端切换由 `debug.mode` 标记区分:
> - 一期 `local_simulation` — body 不传文件 / 不调发展猫 / 本地查表
> - 二期 `fazhanmao_real` — body 带文件 URL / 后端调发展猫 / 真分

---

### POST `/api/app/face-check/upload-media` — 上传多模态文件

```http
POST /api/app/face-check/upload-media
Authorization: Bearer <token>
Content-Type: multipart/form-data

(field: file = <binary>)
(field: kind = "audio" | "video" | "script")
```

**file 字段要求**(按发展猫文档 3.1 规范):
| kind | MIME 前缀 | 默认后缀 | 内容要求 | 最大 |
|---|---|---|---|---|
| `audio` | `audio/*` | `.wav` | 采样率 16kHz | 50 MB |
| `video` | `video/*` | `.mp4` | 帧率 25fps | 500 MB |
| `script` | `text/*` | `.txt` | UTF-8 编码 (一般是 ASR 转录文本) | 5 MB |

**响应**(200):
```jsonc
{
  "ok": true,
  "url": "https://aiemotion.obs.cn-north-4.myhuaweicloud.com/data/XXL0000123/audio/20260528163025/20260528163025XXL0000123raw.wav",
  "file_id": "20260528163025XXL0000123raw.wav",   // 喂发展猫 audio_id 用
  "path": "/data/XXL0000123/audio/20260528163025/20260528163025XXL0000123raw.wav",
  "timestamp": "20260528163025",
  "kind": "audio",
  "bytes": 156800,
  "xxl_user_id": "XXL0000123"
}
```

**错误码**:
| HTTP | code | 说明 |
|---|---|---|
| 400 | `INVALID_KIND` | kind 必须是 audio/video/script |
| 400 | `INVALID_TYPE` | 文件 MIME 不匹配 kind |
| 400 | `MISSING_FILE` | file 字段缺失 |
| 401 | `UNAUTHORIZED` | token 失效 |
| 413 | `FILE_TOO_LARGE` | 超过 kind 对应的 maxSize |
| 500 | `OBS_NOT_CONFIGURED` | 后端华为 OBS 未配置(管理员问题) |
| 500 | `UPLOAD_FAILED` | OBS 上传失败 |

**OBS 路径规范**(发展猫文档 3.1 节硬性要求):

```
data/{XXL_user_id}/{kind}/{timestamp}/{timestamp}{XXL_user_id}raw.{ext}

示例:
data/XXL0000123/audio/20260528163025/20260528163025XXL0000123raw.wav
data/XXL0000123/video/20260528163025/20260528163025XXL0000123raw.mp4
data/XXL0000123/script/20260528163025/20260528163025XXL0000123raw.txt
```

- `XXL_user_id`:学生固定编号 = `XXL` + `seq_no`(end_users 表的自增序号)补 7 位零
- `timestamp`:**秒级**时间戳 `yyyyMMddHHmmss`
- 文件名后缀 `raw`:原始上传(发展猫处理生成的中间文件后缀是 `processed`)

---

### POST `/api/app/face-check/finalize` — 完成多模态评估

接收上一步上传的文件 URL/file_id,生成本次评估的 11 项分值并写入学生档案。

```http
POST /api/app/face-check/finalize
Authorization: Bearer <token>
Content-Type: application/json

{
  "audio_url": "https://....wav",
  "video_url": "https://....mp4",
  "txt_url":   "https://....txt",
  "audio_file_id": "20260528163025XXL0000123raw.wav",
  "video_file_id": "20260528163025XXL0000123raw.mp4",
  "txt_file_id":   "20260528163025XXL0000123raw.txt"
}
```

**body 字段全部选填**:
- 没传任何文件 → 后端仍会生成模拟分值(一期开发联调用)
- 传了 file_id → 写入外部 JSON 用于审计与二期对接

**响应**(200):
```jsonc
{
  "ok": true,
  "multimodal": {
    "vitality": 86,                  // 动力 (综合分)
    "stress": 12,                    // 压力 (越低越好)
    "state_label": "极佳学习状态",
    "level": 2,                      // 1-15
    "comment": "今天状态全开...",
    "keywords": ["高度专注","兴趣浓厚","续航在线"],
    "evaluated_at": "2026-05-28T16:30:25.000Z"
  },
  "game": {
    "name": "舒尔特方格",
    "keywords": "专注、巩固、稳定",
    "cover_url": null,
    "duration_min": 3
  },
  "debug": {                          // 调试用, 一期返回, 生产可不展示
    "raw_scores": { /* 11 项分值 */ },
    "dimensions": { "concentration": 78, "stress": 88, "status": 75 },
    "adjustments": [],
    "external_json": { /* 按发展猫文档 3.2 格式 */ },
    "mode": "local_simulation"        // 一期本地模拟, 二期接发展猫后变 "fazhanmao_real"
  }
}
```

**字段说明**:`multimodal` + `game` **完全等同**首页 `/api/app/home/today` ready 态返回的字段,前端直接用这个响应更新首页 state 即可,**不需要再调一次 today**。

**错误码**:
| HTTP | code | 说明 |
|---|---|---|
| 401 | `UNAUTHORIZED` | token 失效 |
| 403 | `ACCOUNT_DISABLED` | 账号被禁用 |
| 404 | `NOT_FOUND` | 学生不存在 |

---

### 集成示例

#### 🚀 一期(直接调 finalize 拿模拟分,推荐先用这个)

```dart
// 学生点「解锁」卡 → 播放 10s 人脸识别动画 (可只是动画, 不真录)
await playFaceRecognitionAnimation();

// 直接调 finalize, body 空对象
final finalize = await dio.post('/api/app/face-check/finalize',
  data: {},
  options: Options(headers: {'Authorization': 'Bearer $token'}),
);

// 用响应直接更新首页 state
setState(() {
  homeMultimodal = finalize.data['multimodal'];
  homeGame = finalize.data['game'];
  homeStatus = 'ready';
});
```

#### 🔮 二期(发展猫接口对接后切换)

```dart
// Step 1: 录制 (平板原生 SDK, 假设拿到三个 File 对象)
final audioFile = ...; // wav 16kHz
final videoFile = ...; // mp4 25fps
final txtFile   = ...; // 可选: ASR 转录文本

// Step 2: 并发上传三个文件 (走 OBS)
final results = await Future.wait([
  _uploadOne(audioFile, 'audio'),
  _uploadOne(videoFile, 'video'),
  if (txtFile != null) _uploadOne(txtFile, 'script'),
]);

// Step 3: 触发评估, 把 URL/file_id 一起带上
final finalize = await dio.post('/api/app/face-check/finalize',
  data: {
    'audio_url': results[0]['url'],
    'video_url': results[1]['url'],
    if (txtFile != null) 'txt_url': results[2]['url'],
    'audio_file_id': results[0]['file_id'],
    'video_file_id': results[1]['file_id'],
    if (txtFile != null) 'txt_file_id': results[2]['file_id'],
  },
  options: Options(headers: {'Authorization': 'Bearer $token'}),
);

// Step 4: 用 finalize.data['multimodal'] 直接更新首页 state
setState(() {
  homeMultimodal = finalize.data['multimodal'];
  homeGame = finalize.data['game'];
  homeStatus = 'ready';
});

// 辅助: 上传单个文件
Future<Map> _uploadOne(File f, String kind) async {
  final form = FormData.fromMap({
    'file': await MultipartFile.fromFile(f.path),
    'kind': kind,
  });
  final resp = await dio.post('/api/app/face-check/upload-media',
    data: form, options: Options(headers: {'Authorization': 'Bearer $token'}));
  return resp.data;
}
```

### 业务规则

- **每日一次**:多模态评估**每天**做一次,做完首页就 `ready` 直到第二天
- **重做**:如果学生想重做(比如刚才录得不好),再调一次 `finalize` 即可,后端覆盖 `user_profiles.multimodal_latest`
- **历史累积**:每次评估的完整数据也存到 `multimodal_history` 数组,供个人中心的「24小时专注度曲线」(图10)使用
- **跳过文件**(测试模式):一期允许不传任何文件直接调 finalize → 后端随机模拟分(联调期间方便)

### 二期 TODO(等真接口)

- 接发展猫 API `http://gpu.fazhanmao.com:9096/system/learning_ability/get_file_paths` 拿真实 11 项分值
- 启动判别:`status === "ok"` → 用真分;否则降级到本地模拟
- `debug.mode` 变成 `fazhanmao_real`

---

## 联调说明

### 测试环境
- 开发服务器:`http://192.168.101.44:3006`(局域网)
- 平板/小程序连这个 IP 直接联调
- 没部署到公网前,扣子相关图片接口走后端中转(已处理)

### 测试账号
后台 「用户管理」 (`/end-users`) 里新建学生时勾选「设置登录账号」,会要求填 username + 初始密码,这就是 App 登录用的。

如果没找到测试账号,可以让后台超管账号(`admin / admin123`)登录平台后,在「用户管理」给某个学生设置登录账号。

### 字段命名
- 数据库字段统一**蛇形** (`login_username`, `parent_name`)
- 接口返回也保持**蛇形**,跟数据库一致
- 平板/小程序前端如果用 camelCase,需要自己映射(Flutter 用 `json_serializable` 加 `@JsonKey(name: 'login_username')`)

---

## 待补接口(下个版本)

- `POST /api/app/auth/logout` — 退出登录(可选,客户端清 token 即可)
- `POST /api/app/auth/change-password` — 修改密码
- `POST /api/app/face-check/start` — 触发人脸识别 + 多模态测评
- `GET /api/app/assignments` — 导学历任务列表
- `POST /api/app/assignments` — 智能添加(作业添加)
- `POST /api/app/ai/chat` — AI 聊天 SSE(流式)
- `POST /api/app/ai/upload-image` — 拍照上传(返回 URL)
- `GET /api/app/mistakes` — 错题本
- `GET /api/app/compositions` — 作文批改记录
- `POST /api/app/study-session/heartbeat` — 学习时长心跳上报
