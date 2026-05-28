-- 作业起止时分: 小程序家长端添加作业有时分选择器, 原先只存日期导致二次编辑时分丢失
-- 新增可空 time 字段, 不影响 admin / pad / app 端 (它们不传, 保持 null)

alter table assignments
  add column if not exists start_time time null,
  add column if not exists end_time   time null;
