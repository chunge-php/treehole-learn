-- end_users 增加小程序/平板登录字段
-- · login_username  登录账号 (可选, 全局唯一)
-- · login_password_hash  bcrypt hash
-- 已有 phone 字段复用为登录手机号 (业务称'关联手机号')

alter table end_users add column login_username       text;
alter table end_users add column login_password_hash  text;

-- 用户名部分唯一索引 (NULL 不参与)
create unique index end_users_login_username_unique
  on end_users(login_username)
  where login_username is not null;
