-- end_users 增加最近登录时间字段
-- 由 App / 小程序登录接口在认证成功后更新

alter table end_users add column last_login_at timestamptz;
create index end_users_last_login_idx on end_users(last_login_at);
