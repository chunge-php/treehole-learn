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

> 后续接口陆续补充: 首页今日数据、导学历日历、AI 聊天 SSE 流、心屿世界推荐、错题本、作文批改、人脸识别触发多模态等。

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
- `GET /api/app/home/today` — 首页今日学习状态卡 + 解压游戏推荐 + 导学历摘要
- `POST /api/app/face-check/start` — 触发人脸识别 + 多模态测评
- `GET /api/app/assignments` — 导学历任务列表
- `POST /api/app/assignments` — 智能添加(作业添加)
- `POST /api/app/ai/chat` — AI 聊天 SSE(流式)
- `POST /api/app/ai/upload-image` — 拍照上传(返回 URL)
- `GET /api/app/mistakes` — 错题本
- `GET /api/app/compositions` — 作文批改记录
- `POST /api/app/study-session/heartbeat` — 学习时长心跳上报
