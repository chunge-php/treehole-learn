-- 导学历: 扩展作业任务表, 支持多种任务类型 + 学科分组 + 系统推荐来源
-- 数据源: admin 后台 / parent 家长小程序 / student App 自建 / recommendation 心屿世界推荐

-- 1. 扩 source 枚举: 加 student (App 自建) + recommendation (心屿世界系统推荐, 后续接第三方真接口)
alter table assignments drop constraint if exists assignments_source_check;
alter table assignments add constraint assignments_source_check
  check (source in ('admin', 'parent', 'student', 'recommendation'));

-- 2. 学科 + 任务类型 + 时长 + 富内容字段
alter table assignments
  add column if not exists subject text,
  add column if not exists task_type text not null default 'homework'
    check (task_type in ('homework', 'video_course', 'event_registration')),
  add column if not exists estimated_minutes int,
  add column if not exists actual_minutes int,
  add column if not exists cover_url text,
  add column if not exists content_md text,
  add column if not exists video_url text,
  add column if not exists meta jsonb not null default '{}'::jsonb;
  -- meta 灵活字段:
  --   video_course:        { teacher_name, teacher_avatar, teacher_school, teacher_info }
  --   event_registration:  { location, organizer_name, organizer_avatar, registered_count, event_time }
  --   recommendation:      { source_engine, score_basis, mind_world_category, ... }

create index if not exists assignments_task_type_idx on assignments(task_type);
create index if not exists assignments_subject_idx on assignments(subject);
