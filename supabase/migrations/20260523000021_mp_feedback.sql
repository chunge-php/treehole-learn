-- 小程序问题反馈
create table if not exists mp_feedback (
  id         text primary key,
  parent_id  text references mp_parents(id) on delete set null,
  content    text not null,
  contact    text,
  status     text not null default 'pending' check (status in ('pending', 'resolved')),
  reply      text,
  created_at timestamptz not null default now()
);
create index if not exists mp_feedback_parent_idx on mp_feedback(parent_id, created_at desc);

alter table mp_feedback enable row level security;
create policy mp_feedback_admin_all on mp_feedback for all using (true) with check (true);
