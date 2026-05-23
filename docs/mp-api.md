# 树洞 · 微信小程序（家长端）接口文档

> 给小程序端 AI 对接用。本期范围：**登录鉴权 + 协议**。学习数据 / 作业 / 心愿清单等业务接口下一期。
>
> 后端：Next.js（树洞 SaaS 后台），前后端独立，**Bearer Token** 鉴权（不依赖 cookie）。

## 1. 基础约定

| 项 | 值 |
|---|---|
| Base URL | `https://<后端域名>`（本地 `http://localhost:3000`，以实际部署为准） |
| 接口前缀 | `/api/mp` |
| 请求体 | `application/json` |
| 鉴权 | 登录成功拿到 `token`，存本地；后续需登录的接口在请求头带 `Authorization: Bearer <token>`（也支持 `x-mp-token: <token>`） |
| token 有效期 | 30 天 |

**统一响应**

成功：
```json
{ "ok": true, "...": "业务字段" }
```
失败（HTTP 4xx/5xx）：
```json
{ "ok": false, "error": "错误说明" }
```
前端判断以 body 的 `ok` 为准。

**登录成功返回的 parent 结构**（三个登录接口一致）：
```json
{
  "ok": true,
  "token": "xxx.yyy",
  "parent": {
    "id": "par_xxxxxxxx",
    "nickname": "家长昵称或 null",
    "avatar": "头像 URL 或 null",
    "phone": "手机号或 null",
    "hasPhone": true
  }
}
```

---

## 2. Mock 模式（重要 · 现在就能联调）

后端在**未配置密钥时自动 mock**，前端代码无需任何改动，配齐密钥后自动切真实：

- **微信登录 / 一键登录**：未配 `WECHAT_APPID/SECRET` 时，按 `code` 生成稳定的 mock openid；一键登录返回测试手机号（默认 `13800138000`）。
- **短信验证码**：未配腾讯云密钥时不真发短信，验证码打印在服务端日志，并在 `sms/send` 响应里多返回一个 `devCode` 字段方便联调。

因此现在就可以把 `min/utils/api.js` 的 `USE_MOCK` 关掉、接真实接口跑通整套登录流程。

---

## 3. 登录接口

### 3.1 微信授权登录

`POST /api/mp/auth/wechat-login`

| 入参 | 必填 | 说明 |
|---|---|---|
| `code` | 是 | `wx.login()` 返回的 code |
| `nickname` | 否 | 头像昵称授权拿到的昵称 |
| `avatar` | 否 | 头像 URL |

请求示例：
```json
{ "code": "081xxx", "nickname": "小明妈妈", "avatar": "https://..." }
```
返回：见 §1 登录结构。

小程序端：
```js
wx.login({
  success: (res) => {
    wx.request({
      url: BASE + '/api/mp/auth/wechat-login',
      method: 'POST',
      data: { code: res.code },
      success: (r) => {
        if (r.data.ok) {
          wx.setStorageSync('mp_token', r.data.token)
          wx.setStorageSync('mp_parent', r.data.parent)
          wx.switchTab({ url: '/pages/learning/learning' })
        } else {
          wx.showToast({ title: r.data.error, icon: 'none' })
        }
      }
    })
  }
})
```

### 3.2 本机号码一键登录

`POST /api/mp/auth/phone-login`

需要两个 code：`loginCode`（拿 openid）+ `phoneCode`（拿手机号）。

| 入参 | 必填 | 说明 |
|---|---|---|
| `loginCode` | 是 | `wx.login()` 返回的 code |
| `phoneCode` | 是 | `<button open-type="getPhoneNumber">` 回调 `e.detail.code` |

小程序端：
```html
<button open-type="getPhoneNumber" bindgetphonenumber="onGetPhone">本机号码一键登录</button>
```
```js
onGetPhone(e) {
  if (!e.detail.code) {
    wx.showToast({ title: '已取消授权', icon: 'none' }); return
  }
  const phoneCode = e.detail.code
  wx.login({
    success: (res) => {
      wx.request({
        url: BASE + '/api/mp/auth/phone-login',
        method: 'POST',
        data: { loginCode: res.code, phoneCode },
        success: (r) => {
          if (r.data.ok) {
            wx.setStorageSync('mp_token', r.data.token)
            wx.setStorageSync('mp_parent', r.data.parent)
            wx.switchTab({ url: '/pages/learning/learning' })
          } else wx.showToast({ title: r.data.error, icon: 'none' })
        }
      })
    }
  })
}
```

### 3.3 更换其他号码登录（短信验证码）

两步：先 `send` 发码，再 `verify` 校验登录。

#### 第一步 · 发送验证码
`POST /api/mp/auth/sms/send`

| 入参 | 必填 | 说明 |
|---|---|---|
| `phone` | 是 | 11 位手机号 |

返回：
```json
{ "ok": true }          // 真实模式
{ "ok": true, "devCode": "123456" }  // mock 模式额外带验证码
```
> 60 秒内重复发送返回 `429 { ok:false, error:"验证码已发送, 请稍后再试" }`。

#### 第二步 · 校验并登录
`POST /api/mp/auth/sms/verify`

| 入参 | 必填 | 说明 |
|---|---|---|
| `phone` | 是 | 同上手机号 |
| `code` | 是 | 收到的 6 位验证码 |
| `loginCode` | 否 | `wx.login()` code，传则把该号账号与当前微信 openid 关联 |

返回：见 §1 登录结构。验证码 5 分钟有效，用后即焚。

小程序端（对应 `pages/phone/phone.js`）：
```js
// 发码
wx.request({
  url: BASE + '/api/mp/auth/sms/send', method: 'POST',
  data: { phone: this.data.phone },
  success: (r) => {
    if (r.data.ok) { /* 启动 60s 倒计时 */ }
    else wx.showToast({ title: r.data.error, icon: 'none' })
  }
})
// 验证（验证码输满 6 位时）
wx.login({ success: (res) => {
  wx.request({
    url: BASE + '/api/mp/auth/sms/verify', method: 'POST',
    data: { phone: this.data.phone, code: v, loginCode: res.code },
    success: (r) => {
      if (r.data.ok) {
        wx.setStorageSync('mp_token', r.data.token)
        wx.setStorageSync('mp_parent', r.data.parent)
        wx.switchTab({ url: '/pages/learning/learning' })
      } else wx.showToast({ title: r.data.error, icon: 'none' })
    }
  })
}})
```

> 注意：现有 `phone.js` 用了"图片验证码"占位（`captcha`）。本期后端短信无需图形验证码，可忽略该字段；如需防刷由后端 60s 限频兜底。

---

## 4. 协议接口

`GET /api/mp/agreements`           → 返回用户协议 + 隐私政策
`GET /api/mp/agreements?type=user` → 仅用户协议（`type=user|privacy`）

公开接口，无需登录。返回：
```json
{
  "ok": true,
  "agreements": [
    { "type": "user",    "title": "用户服务协议", "content": "# 用户服务协议\n...(Markdown)", "version": "1.0", "updatedAt": "2026-05-23T..." },
    { "type": "privacy", "title": "隐私政策",     "content": "# 隐私政策\n...", "version": "1.0", "updatedAt": "2026-05-23T..." }
  ]
}
```
`content` 为 Markdown 文本，小程序端可用 `towxml` / `wemark` 等渲染，或自行解析展示。协议正文由后台管理员在「设置 → 协议管理」维护，前端实时读取。

---

## 5. 建议的前端改造（`min/utils/`）

把 `utils/api.js` 改成统一请求封装（带 token）：
```js
const BASE = 'https://<后端域名>'

function request(path, { method = 'GET', data, auth = false } = {}) {
  const header = { 'content-type': 'application/json' }
  if (auth) {
    const t = wx.getStorageSync('mp_token')
    if (t) header.Authorization = 'Bearer ' + t
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE + path, method, data, header,
      success: (res) => res.data && res.data.ok ? resolve(res.data) : reject(res.data || res),
      fail: reject
    })
  })
}

module.exports = {
  wechatLogin: (code) => request('/api/mp/auth/wechat-login', { method: 'POST', data: { code } }),
  phoneLogin:  (loginCode, phoneCode) => request('/api/mp/auth/phone-login', { method: 'POST', data: { loginCode, phoneCode } }),
  smsSend:     (phone) => request('/api/mp/auth/sms/send', { method: 'POST', data: { phone } }),
  smsVerify:   (phone, code, loginCode) => request('/api/mp/auth/sms/verify', { method: 'POST', data: { phone, code, loginCode } }),
  agreements:  (type) => request('/api/mp/agreements' + (type ? '?type=' + type : ''))
}
```

`utils/auth.js` 登录态改为以 token 判定：
```js
function isLoggedIn() { return !!wx.getStorageSync('mp_token') }
function logout() { wx.removeStorageSync('mp_token'); wx.removeStorageSync('mp_parent') }
```

---

## 6. 错误码

| HTTP | 场景 |
|---|---|
| 400 | 参数缺失 / 手机号格式错 / 验证码错或过期 |
| 401 | （后续业务接口）token 无效或过期，需重新登录 |
| 429 | 验证码发送过于频繁（60s 限频） |
| 500 / 502 | 服务端或第三方（微信 / 腾讯云）异常，`error` 字段含原因 |

---

## 7. 下一期（预告，未实现）

需登录的业务接口将基于同一 token：
- `GET /api/mp/profile` 家长信息 + 名下学生
- `GET /api/mp/learning` 学习状态（专注度曲线 / 三维雷达 / 词云 / AI 要点）
- 作业任务 CRUD（对应 `pages/homework`）
- 心愿清单 / 活动（对应 `pages/wishlist`）
- 用户绑定（家长 ↔ 学生）

字段以各页面 mock 结构为基线，届时再出文档。
