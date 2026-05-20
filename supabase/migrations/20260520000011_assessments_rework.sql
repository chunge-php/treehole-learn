-- 测评题模型重做 (破坏性: truncate 现有数据)
--
-- 新字段语义:
--   description    题目描述
--   cover_url      封面图 URL
--   media_urls     题目文件 (jsonb 数组, [{url,type,name}], 图片/视频)
--   project_name   所属项目 (手动输入文本)
--   dimension      维度: 多元性向量表 / 自陈量表 / 兴趣量表 / 多模态
--   qtype          题型: 单选题 / 判断题 / 语音题
--   sort_order     序号 (全局唯一)
-- 删除字段: answer / explanation / score / project_id

-- 1. Storage bucket th-media (公共读)
insert into storage.buckets (id, name, public, file_size_limit)
values ('th-media', 'th-media', true, 52428800) -- 50MB
on conflict (id) do update set public = true, file_size_limit = 52428800;

-- 公共读策略
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'th_media_public_read' and tablename = 'objects'
  ) then
    create policy "th_media_public_read"
      on storage.objects for select
      using (bucket_id = 'th-media');
  end if;
end$$;

-- 2. 清空数据 (旧 schema 太不一样, 不强行迁移)
truncate table assessments cascade;

-- 3. 删旧字段
alter table assessments drop column if exists answer;
alter table assessments drop column if exists explanation;
alter table assessments drop column if exists score;
alter table assessments drop constraint if exists assessments_project_fk;
alter table assessments drop column if exists project_id;

-- 4. 加新字段
alter table assessments add column if not exists description    text;
alter table assessments add column if not exists cover_url      text;
alter table assessments add column if not exists media_urls     jsonb not null default '[]'::jsonb;
alter table assessments add column if not exists project_name   text;

-- 5. 改 dimension/qtype 列类型为 text (旧枚举 cascade 删除)
alter table assessments alter column dimension type text using dimension::text;
alter table assessments alter column qtype     type text using qtype::text;
drop type if exists assessment_dimension cascade;
drop type if exists assessment_qtype     cascade;

-- 6. 加新 check 约束
alter table assessments drop constraint if exists assessments_dimension_check;
alter table assessments add constraint assessments_dimension_check
  check (dimension in ('多元性向量表', '自陈量表', '兴趣量表', '多模态'));

alter table assessments drop constraint if exists assessments_qtype_check;
alter table assessments add constraint assessments_qtype_check
  check (qtype in ('单选题', '判断题', '语音题'));

-- 7. sort_order 唯一
create unique index if not exists assessments_sort_order_unique on assessments(sort_order);
