-- 心愿条目: 学生 App 端零散输入的小心愿 ("我想要 xx 小说" / "想去长白山" 等)
-- 月底由扣子工作流把当月所有条目 + 学生档案打包生成一封家长信 (写入 student_wishes 表)

create table if not exists student_wish_items (
  id           text primary key,
  end_user_id  text not null references end_users(id) on delete cascade,
  channel_id   text references channels(id) on delete set null,
  store_id     text references stores(id)   on delete set null,
  content      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists wish_items_user_idx       on student_wish_items(end_user_id, created_at desc);
create index if not exists wish_items_user_month_idx on student_wish_items(end_user_id, (date_trunc('month', created_at)));

alter table student_wish_items enable row level security;
create policy wish_items_admin_all on student_wish_items for all using (true) with check (true);
