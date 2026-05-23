-- 微信小程序(家长端)登录鉴权 + 协议管理
-- 家长登录小程序后管理其名下普通用户(学生)。前后端独立, 用 Bearer Token 鉴权。

-- 1. 小程序家长账号 (身份主体, 与 parent_bindings 的绑定关系解耦)
create table if not exists mp_parents (
  id            text primary key,
  open_id       text unique,           -- 微信 openid
  union_id      text,                  -- 微信 unionid (开放平台关联时有)
  phone         text,                  -- 手机号 (一键登录/短信登录获取)
  nickname      text,
  avatar_url    text,
  status        account_status not null default 'active',
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists mp_parents_phone_idx on mp_parents(phone);

alter table mp_parents enable row level security;
create policy mp_parents_admin_all on mp_parents for all using (true) with check (true);

drop trigger if exists trg_mp_parents_updated on mp_parents;
create trigger trg_mp_parents_updated before update on mp_parents
  for each row execute function touch_updated_at();

-- 2. 短信验证码 (换号登录用; 腾讯云发送, 无 key 时后端 mock)
create table if not exists mp_sms_codes (
  id          text primary key,
  phone       text not null,
  code        text not null,
  scene       text not null default 'login',
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists mp_sms_codes_phone_idx on mp_sms_codes(phone, created_at desc);

alter table mp_sms_codes enable row level security;
create policy mp_sms_codes_admin_all on mp_sms_codes for all using (true) with check (true);

-- 3. 协议 (用户协议 / 隐私协议; 后台可管, 小程序公开读)
create table if not exists agreements (
  id         text primary key,
  type       text not null unique check (type in ('user', 'privacy')),
  title      text not null,
  content    text not null,            -- 富文本/Markdown 正文
  version    text not null default '1.0',
  updated_at timestamptz not null default now()
);

alter table agreements enable row level security;
create policy agreements_admin_all on agreements for all using (true) with check (true);

-- 4. parent_bindings 关联到 mp_parents (绑定关系: 一个家长可管多个学生)
alter table parent_bindings add column if not exists parent_id text references mp_parents(id) on delete cascade;
create index if not exists parent_bindings_parent_idx on parent_bindings(parent_id);
