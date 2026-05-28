-- App 端学生学习时长追踪 (设计要求: 学生登录 App 后开始计时, 退出/离开/超时停止)
-- 模式: enter → 周期心跳 → leave; 心跳 > 2 分钟视为离线自动关闭

create table if not exists student_study_sessions (
  id                text primary key,
  end_user_id       text not null references end_users(id) on delete cascade,
  started_at        timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  ended_at          timestamptz,
  duration_sec      int not null default 0,
  date              date not null default current_date,    -- 冗余, 便于按日 sum
  device_info       jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists sss_user_date_idx on student_study_sessions(end_user_id, date);
-- 部分索引: 找学生当前活动中的会话 O(1)
create index if not exists sss_active_idx on student_study_sessions(end_user_id) where ended_at is null;

alter table student_study_sessions enable row level security;
create policy sss_admin_all on student_study_sessions for all using (true) with check (true);
