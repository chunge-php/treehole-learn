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

> 后续接口陆续补充: 导学历日历、AI 聊天 SSE 流、心屿世界推荐、错题本、作文批改、人脸识别触发多模态等。

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
