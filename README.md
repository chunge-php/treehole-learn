# 🌱 树洞 TreeHole · 学习力测评 SaaS

> 让每位学生被安静地看见

面向 K12 与素质教育机构的**学习力测评 SaaS 后台管理平台**。

---

## 业务模型

```
管理员 (Admin)        全平台数据 + 可切换以"某渠道身份"代操作
   ↓
渠道商 (Channel)      渠道级别 + 归属省/市/区 + 1 个渠道管理员账号
   ↓
店铺 (Store)          归属渠道 + 详细地址 + 设备数量
   ↓
普通用户 (End User)   归属店铺 → 反推归属渠道 + 付费记录 + 测评结果
                     ⚠️ 不允许登录平台端
```

## 技术栈

- **Next.js 14** App Router + RSC + Server Actions
- **TypeScript** 严格模式
- **Tailwind CSS** + **shadcn/ui** (new-york 风格)
- **Supabase** Postgres + RLS 行级安全 + Service Role
- **bcryptjs** 自签名 HMAC Cookie Session
- **xlsx** 批量导入导出 (字段严格按当前账号上下文)
- **recharts** 数据可视化
- **lucide-react** 图标
- **sonner** Toast

## 主题色

> 树洞绿 `#1E9B6B` · 静谧 · 安心 · 不刺眼

```
--primary:  158 68% 36%   (静谧绿)
--accent:   158 60% 94%   (淡绿底)
--info:     210 92% 50%
--warning:  35 92% 50%
```

## 目录结构

```
src/
├── app/
│   ├── (admin)/                  # 后台路由组 (中间件保护)
│   │   ├── layout.tsx
│   │   ├── dashboard/            # 数据看板
│   │   ├── channels/             # 渠道商 CRUD
│   │   ├── stores/               # 店铺 CRUD
│   │   ├── end-users/            # 普通用户 CRUD
│   │   ├── assessments/          # 测评题库
│   │   ├── resources/            # 资源库
│   │   ├── orders/               # 订单
│   │   └── settings/             # 渠道级别 / 顶级类型 / 账号
│   ├── login/                    # 登录页
│   ├── api/auth/                 # 登录/登出/切换acting
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn 原子组件
│   └── admin/                    # 业务通用 (PageHeader / StatCard / DataToolbar...)
├── lib/
│   ├── supabase/                 # 客户端 / 服务端 / admin / middleware helper
│   ├── session.ts                # 自签名 HMAC cookie
│   ├── auth.ts                   # requireSession / requireAdmin
│   ├── scope.ts                  # 数据隔离 helper
│   ├── regions.ts                # 中国省市区数据
│   ├── excel.ts                  # 导入导出
│   └── utils.ts                  # nanoid / 格式化
├── middleware.ts                 # 路由守卫 + 角色拦截
└── types/database.ts             # DB 类型
supabase/
├── migrations/
│   ├── 20260520000001_init_schema.sql
│   └── 20260520000002_rls.sql
└── seed.sql                      # admin / admin123
```

## 数据隔离 (核心)

- 全表 **RLS 行级安全** 启用
- `auth_channel_id()` 优先读 JWT claim `acting_channel_id` (管理员代渠道时注入)，否则取账号自身的 `channel_id`
- `can_access_channel(target)` → admin 全开，channel_admin 限定自己

应用层兜底：`scopedChannelFilter(session)` / `scopedWriteChannelId(session)`

## 角色与导入导出

| 角色 | 平台登录 | 看到的数据 | 导入归属 |
|---|---|---|---|
| 超级管理员 / 管理员 | ✅ | 全平台；可切换"以XX渠道操作" | 默认全局；切换后归属该渠道 |
| 渠道商管理员 | ✅ | 自己渠道下的店铺/用户/订单 | 强制锁定自己渠道，忽略 Excel 中的渠道字段 |
| 终端学生 | ❌ | — | — |

## 本地开发

```bash
pnpm install                       # 或 npm i
cp .env.example .env.local         # 填 Supabase 配置
supabase start                     # 本地 Postgres (端口 54421/54422/54423)
supabase db reset                  # 跑 migration + seed
pnpm dev                           # http://localhost:3006
```

**端口分配** (避开常用占用)：
- Web Dev:        `3006`
- Supabase API:   `55421`
- Supabase DB:    `55422`
- Supabase Studio: `55423` → http://localhost:55423

默认账号：`admin` / `admin123`

## 部署

- 推荐 Vercel + Supabase
- 必填环境变量:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SESSION_SECRET` (生产环境必须设置)

## 后续

- 测评结果分析与个性化报告
- 终端 App 数据对接 (OpenAPI 抛接口)
- 渠道返佣结算
- 设备管理与心跳

---

© TreeHole Learn · 2026
