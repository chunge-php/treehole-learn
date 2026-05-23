-- 作业任务来源: admin=后台添加, parent=家长端(小程序)添加
-- 存量数据均为后台创建, 默认 admin
alter table assignments
  add column if not exists source text not null default 'admin'
  check (source in ('admin', 'parent'));
