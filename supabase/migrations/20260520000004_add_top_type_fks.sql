-- 为 assessments.project_id / resources.category_id 补上外键
-- 让 Supabase PostgREST 能识别关系并自动 join top_types(name)

alter table assessments
  add constraint assessments_project_fk
  foreign key (project_id) references top_types(id) on delete set null;

alter table resources
  add constraint resources_category_fk
  foreign key (category_id) references top_types(id) on delete set null;

-- 让 PostgREST 立即感知 schema 变化
notify pgrst, 'reload schema';
