-- 测评报告: 会话(一次完整作答) + 单题作答(每答一题即提交)
-- 仅管理员可见/操作; RLS 放开 (服务端 action 已 requireAdmin + service_role)

create table if not exists report_sessions (
  id              text primary key,
  seq_no          bigserial,
  name            text not null,                       -- 记录名称 / 受测人
  remark          text,
  question_ids    jsonb not null default '[]'::jsonb,  -- 锁定题目顺序快照 (assessment id 数组)
  total_questions int  not null default 0,
  answered_count  int  not null default 0,             -- 冗余: 已答数, 便于列表展示
  status          text not null default 'in_progress' check (status in ('in_progress','completed')),
  report_data     jsonb,                               -- 生成的报告结果 (后期填)
  created_by      text references accounts(id) on delete set null,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists report_sessions_created_idx on report_sessions(created_at desc);

create table if not exists report_answers (
  id            text primary key,
  session_id    text not null references report_sessions(id) on delete cascade,
  assessment_id text not null,
  answer        text,                                  -- 选项 value (单选/判断); 语音题占位
  answered_at   timestamptz not null default now(),
  unique (session_id, assessment_id)                   -- 每会话每题一条, 重复提交=更新
);
create index if not exists report_answers_session_idx on report_answers(session_id);

alter table report_sessions enable row level security;
alter table report_answers  enable row level security;
create policy report_sessions_admin_all on report_sessions for all using (true) with check (true);
create policy report_answers_admin_all  on report_answers  for all using (true) with check (true);
