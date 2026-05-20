-- 渠道级别名称全局唯一
alter table channel_levels
  add constraint channel_levels_name_unique unique (name);
