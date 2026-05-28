# 树洞 App 端接口文档

> 给同事(平板端/Flutter)对接用。所有接口前缀 `/api/app/*`,前后端独立,**不使用 cookie**,通过 Bearer Token 鉴权。

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
