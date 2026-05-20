-- 删除上级时不级联删除下级, 改为置空 (SET NULL):
-- · 删渠道 → stores / end_users / assessment_records 保留, 关联字段变 null
-- · 删店铺 → end_users / assessment_records 保留, store_id 变 null
-- · 删终端用户仍 CASCADE 删除其测评记录 (用户要求)

alter table stores drop constraint stores_channel_id_fkey;
alter table stores add constraint stores_channel_id_fkey
  foreign key (channel_id) references channels(id) on delete set null;

alter table end_users drop constraint end_users_store_id_fkey;
alter table end_users add constraint end_users_store_id_fkey
  foreign key (store_id) references stores(id) on delete set null;

alter table end_users drop constraint end_users_channel_id_fkey;
alter table end_users add constraint end_users_channel_id_fkey
  foreign key (channel_id) references channels(id) on delete set null;

alter table assessment_records drop constraint assessment_records_channel_id_fkey;
alter table assessment_records add constraint assessment_records_channel_id_fkey
  foreign key (channel_id) references channels(id) on delete set null;

alter table assessment_records drop constraint assessment_records_store_id_fkey;
alter table assessment_records add constraint assessment_records_store_id_fkey
  foreign key (store_id) references stores(id) on delete set null;

-- 同时把 not null 放宽 (允许变孤儿)
alter table assessment_records alter column channel_id drop not null;
alter table assessment_records alter column store_id   drop not null;
