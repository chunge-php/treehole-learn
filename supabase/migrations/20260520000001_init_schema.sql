-- TreeHole Learn 初始 schema
-- 数据链: admin → channel(渠道商) → store(店铺) → end_user(普通用户)

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. 账号表（管理员 + 渠道商管理员 单表 + role 区分）
-- ============================================================
create type user_role as enum ('super_admin', 'admin', 'channel_admin');
create type account_status as enum ('active', 'disabled');

create table accounts (
  id          text primary key,                              -- nanoid
  username    text not null unique,
  password_hash text not null,
  display_name text not null,
  phone       text,
  email       text,
  avatar_url  text,
  role        user_role not null default 'admin',
  channel_id  text,                                          -- 渠道管理员归属渠道；admin 为 null
  status      account_status not null default 'active',
  last_login_at timestamptz,
  remark      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index accounts_channel_idx on accounts(channel_id);
create index accounts_role_idx on accounts(role);

-- ============================================================
-- 2. 渠道级别字典
-- ============================================================
create table channel_levels (
  id          text primary key,
  name        text not null,
  rank        int not null default 0,
  remark      text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3. 渠道商
-- ============================================================
create table channels (
  id            text primary key,
  seq_no        bigserial,
  name          text not null,
  level_id      text references channel_levels(id) on delete set null,
  province      text,
  city          text,
  district      text,
  address       text,
  contact_name  text,
  contact_phone text,
  status        account_status not null default 'active',
  remark        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index channels_level_idx on channels(level_id);
create index channels_status_idx on channels(status);

-- 加上账号→渠道外键（循环）
alter table accounts add constraint accounts_channel_fk
  foreign key (channel_id) references channels(id) on delete set null;

-- ============================================================
-- 4. 店铺
-- ============================================================
create table stores (
  id            text primary key,
  seq_no        bigserial,
  channel_id    text not null references channels(id) on delete cascade,
  name          text not null,
  province      text,
  city          text,
  district      text,
  address       text,
  contact_name  text,
  contact_phone text,
  device_count  int not null default 0,
  status        account_status not null default 'active',
  remark        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index stores_channel_idx on stores(channel_id);
create index stores_status_idx on stores(status);

-- ============================================================
-- 5. 普通用户（终端学生）
-- ============================================================
create table end_users (
  id            text primary key,
  seq_no        bigserial,
  store_id      text not null references stores(id) on delete cascade,
  channel_id    text not null references channels(id) on delete cascade, -- 反推方便 RLS
  name          text not null,
  phone         text,
  gender        text check (gender in ('male','female','other')),
  age           int,
  grade         text,
  school        text,
  parent_name   text,
  parent_phone  text,
  paid_amount   numeric(10,2) not null default 0,
  status        account_status not null default 'active',
  remark        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index end_users_store_idx on end_users(store_id);
create index end_users_channel_idx on end_users(channel_id);

-- ============================================================
-- 6. 顶级类型（树形：一级 + 二级）
-- ============================================================
create table top_types (
  id          text primary key,
  parent_id   text references top_types(id) on delete cascade,
  name        text not null,
  cover_url   text,                       -- 一级用：封面
  selected_icon_url text,                 -- 二级用：选中图标
  unselected_icon_url text,               -- 二级用：未选中图标
  sort_order  int not null default 0,
  status      account_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index top_types_parent_idx on top_types(parent_id);

-- ============================================================
-- 7. 测评题库
-- ============================================================
create type assessment_dimension as enum ('learning_attitude', 'learning_method', 'learning_ability', 'learning_habit');
create type assessment_qtype as enum ('single', 'multiple', 'text');

create table assessments (
  id            text primary key,
  seq_no        bigserial,
  project_id    text,                                  -- 所属项目（顶级类型二级 id）
  dimension     assessment_dimension not null,
  qtype         assessment_qtype not null,
  title         text not null,
  options       jsonb not null default '[]'::jsonb,    -- [{label,value,score,explanation?}]
  answer        jsonb,                                  -- 正确答案
  explanation   text,
  score         int not null default 1,
  sort_order    int not null default 0,
  status        account_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index assessments_dimension_idx on assessments(dimension);
create index assessments_project_idx on assessments(project_id);

-- ============================================================
-- 8. 资源库
-- ============================================================
create type resource_type as enum ('text', 'video', 'file');
create type resource_status as enum ('online', 'offline');

create table resources (
  id            text primary key,
  seq_no        bigserial,
  type          resource_type not null,
  title         text not null,
  cover_url     text,
  body          text,                       -- type=text 时
  media_url     text,                       -- type=video/file 时
  duration_sec  int,                        -- 视频时长
  file_size     bigint,                     -- 文件大小（字节）
  file_ext      text,
  category_id   text,                       -- 关联 top_types 二级
  status        resource_status not null default 'online',
  sort_order    int not null default 0,
  remark        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index resources_type_idx on resources(type);
create index resources_category_idx on resources(category_id);
create index resources_status_idx on resources(status);

-- ============================================================
-- 9. 订单（占位）
-- ============================================================
create table orders (
  id            text primary key,
  seq_no        bigserial,
  order_no      text not null unique,
  channel_id    text references channels(id) on delete set null,
  store_id      text references stores(id) on delete set null,
  end_user_id   text references end_users(id) on delete set null,
  amount        numeric(10,2) not null default 0,
  pay_status    text not null default 'pending',
  pay_method    text,
  paid_at       timestamptz,
  remark        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index orders_channel_idx on orders(channel_id);
create index orders_store_idx on orders(store_id);
create index orders_status_idx on orders(pay_status);

-- ============================================================
-- 10. 测评结果（普通用户答题记录，后续 App 端用）
-- ============================================================
create table assessment_records (
  id            text primary key,
  seq_no        bigserial,
  end_user_id   text not null references end_users(id) on delete cascade,
  channel_id    text not null references channels(id) on delete cascade,
  store_id      text not null references stores(id) on delete cascade,
  project_id    text,
  total_score   int not null default 0,
  dimension_scores jsonb not null default '{}'::jsonb,
  answers       jsonb not null default '[]'::jsonb,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index ar_user_idx on assessment_records(end_user_id);
create index ar_channel_idx on assessment_records(channel_id);

-- ============================================================
-- 11. 导入任务表
-- ============================================================
create type import_status as enum ('pending', 'processing', 'success', 'partial', 'failed');

create table import_jobs (
  id            text primary key,
  account_id    text not null references accounts(id) on delete cascade,
  acting_channel_id text,                   -- 管理员代渠道导入时记录
  entity        text not null,              -- channels | stores | end_users | assessments | resources
  file_url      text,
  total_rows    int not null default 0,
  success_rows  int not null default 0,
  failed_rows   int not null default 0,
  errors        jsonb not null default '[]'::jsonb,
  status        import_status not null default 'pending',
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index import_jobs_account_idx on import_jobs(account_id);

-- ============================================================
-- updated_at 触发器
-- ============================================================
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array['accounts','channels','stores','end_users','top_types','assessments','resources','orders']) loop
    execute format('drop trigger if exists trg_%I_updated on %I;', t, t);
    execute format('create trigger trg_%I_updated before update on %I for each row execute function touch_updated_at();', t, t);
  end loop;
end$$;
