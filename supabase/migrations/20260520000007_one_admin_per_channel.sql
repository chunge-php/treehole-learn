-- 每个渠道仅允许 1 个 channel_admin 账号 (其他角色 / NULL 不受限)
-- 用部分唯一索引

create unique index accounts_one_channel_admin
  on accounts (channel_id)
  where role = 'channel_admin' and channel_id is not null;
