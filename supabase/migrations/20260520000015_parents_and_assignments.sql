-- 1. 家长绑定 (一个学员可能多家长: 爸/妈, 后续微信小程序填手机号关联)
create table if not exists parent_bindings (
  id          text primary key,
  end_user_id text not null references end_users(id) on delete cascade,
  nickname    text,
  open_id     text unique,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
create index if not exists parent_bindings_user_idx on parent_bindings(end_user_id);

alter table parent_bindings enable row level security;
create policy parent_bindings_admin_all on parent_bindings for all using (true) with check (true);

-- 2. 作业任务
create table if not exists assignments (
  id           text primary key,
  end_user_id  text not null references end_users(id) on delete cascade,
  channel_id   text references channels(id) on delete set null,
  store_id     text references stores(id) on delete set null,
  name         text not null,
  start_date   date not null,
  end_date     date not null,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists assignments_user_idx on assignments(end_user_id);
create index if not exists assignments_date_idx on assignments(start_date, end_date);
create index if not exists assignments_completed_idx on assignments(completed_at);

alter table assignments enable row level security;
create policy assignments_admin_all on assignments for all using (true) with check (true);

-- updated_at 触发器
drop trigger if exists trg_assignments_updated on assignments;
create trigger trg_assignments_updated before update on assignments
  for each row execute function touch_updated_at();
