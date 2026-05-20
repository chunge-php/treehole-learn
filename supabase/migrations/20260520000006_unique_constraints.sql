-- 业务唯一约束:
-- · 渠道商名称全局唯一
-- · 店铺名称在同一渠道下唯一 (NULL 渠道也算同一组, 即"未关联"组内同名店铺只允许一个)

alter table channels
  add constraint channels_name_unique unique (name);

-- Postgres 15+ 的 NULLS NOT DISTINCT 让 (name, NULL) 也参与去重
create unique index stores_name_channel_unique
  on stores (name, channel_id)
  nulls not distinct;
