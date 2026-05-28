-- 心愿清单 - 学生 App 端手写「给爸爸妈妈的信」, 家长小程序读
-- 一封信 = 学生在某个时段写的一段话; 默认按月度归档展示, 但允许同月多封

create table if not exists student_wishes (
  id            text primary key,
  end_user_id   text not null references end_users(id) on delete cascade,
  channel_id    text references channels(id) on delete set null,
  store_id      text references stores(id)   on delete set null,
  title         text not null default '孩子给您的一封信',
  content       text not null,
  -- 用于 2026年X月 这种归档显示, 默认 = created_at 当月
  year          int  not null,
  month         int  not null check (month between 1 and 12),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists wishes_user_idx        on student_wishes(end_user_id);
create index if not exists wishes_user_month_idx  on student_wishes(end_user_id, year desc, month desc);

alter table student_wishes enable row level security;
create policy wishes_admin_all on student_wishes for all using (true) with check (true);
