-- 素材库 (统一追踪通过 uploadFile 上传到 th-media 的所有文件)
-- 用于让顶级类型/资源/测评 等表单复用已上传的图片/视频/文件

create table if not exists assets (
  id          text primary key,
  url         text not null unique,
  bucket      text not null default 'th-media',
  path        text not null,
  name        text,
  mime_type   text,
  size        bigint,
  kind        text not null default 'other',
  uploaded_by text references accounts(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists assets_kind_idx on assets(kind, created_at desc);
create index if not exists assets_name_idx on assets(name);

alter table assets enable row level security;
create policy assets_admin_all on assets for all using (true) with check (true);
