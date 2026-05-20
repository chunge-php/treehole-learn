-- 放宽数据链 NOT NULL 约束:
-- · 店铺可以暂不关联渠道
-- · 普通用户可以暂不关联店铺/渠道
-- 用于平台管理员手工补录场景

alter table stores       alter column channel_id drop not null;
alter table end_users    alter column store_id   drop not null;
alter table end_users    alter column channel_id drop not null;
