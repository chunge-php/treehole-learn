-- TreeHole Learn 行级安全策略
-- 思路:
--   - 用 Supabase auth.uid() 关联 accounts.id（accounts.id == auth.users.id）
--   - 提供两个辅助函数：current_role()/current_channel()
--   - admin / super_admin 全开
--   - channel_admin 仅看自己 channel_id (含管理员 acting_as 通过 JWT claim 注入)
--   - end_users 永远不通过 RLS 登录平台（普通用户不创建 auth.users）

create or replace function auth_role()
returns text language sql stable as $$
  select coalesce(
    (select role::text from accounts where id = auth.uid()::text),
    'anon'
  );
$$;

create or replace function auth_channel_id()
returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'acting_channel_id', ''),
    (select channel_id from accounts where id = auth.uid()::text)
  );
$$;

create or replace function is_admin()
returns boolean language sql stable as $$
  select auth_role() in ('admin','super_admin');
$$;

-- 通用 helper：当前账号是否有权访问某 channel
create or replace function can_access_channel(target text)
returns boolean language sql stable as $$
  select is_admin() or auth_channel_id() = target;
$$;

-- 启用 RLS
alter table accounts          enable row level security;
alter table channel_levels    enable row level security;
alter table channels          enable row level security;
alter table stores            enable row level security;
alter table end_users         enable row level security;
alter table top_types         enable row level security;
alter table assessments       enable row level security;
alter table resources         enable row level security;
alter table orders            enable row level security;
alter table assessment_records enable row level security;
alter table import_jobs       enable row level security;

-- ---------- accounts ----------
create policy accounts_self_read on accounts for select using (
  id = auth.uid()::text or is_admin()
);
create policy accounts_admin_all on accounts for all using (is_admin()) with check (is_admin());
create policy accounts_self_update on accounts for update using (id = auth.uid()::text) with check (id = auth.uid()::text);

-- ---------- channel_levels (全员可读, 仅管理员写) ----------
create policy ch_level_read on channel_levels for select using (true);
create policy ch_level_write on channel_levels for all using (is_admin()) with check (is_admin());

-- ---------- channels ----------
create policy channels_read on channels for select using (
  is_admin() or id = auth_channel_id()
);
create policy channels_write on channels for all using (is_admin()) with check (is_admin());

-- ---------- stores ----------
create policy stores_read on stores for select using (
  is_admin() or channel_id = auth_channel_id()
);
create policy stores_write on stores for all using (
  can_access_channel(channel_id)
) with check (
  can_access_channel(channel_id)
);

-- ---------- end_users ----------
create policy end_users_read on end_users for select using (
  is_admin() or channel_id = auth_channel_id()
);
create policy end_users_write on end_users for all using (
  can_access_channel(channel_id)
) with check (
  can_access_channel(channel_id)
);

-- ---------- top_types (全员可读, 仅管理员写) ----------
create policy top_types_read on top_types for select using (true);
create policy top_types_write on top_types for all using (is_admin()) with check (is_admin());

-- ---------- assessments (全员可读, 仅管理员写) ----------
create policy assessments_read on assessments for select using (true);
create policy assessments_write on assessments for all using (is_admin()) with check (is_admin());

-- ---------- resources ----------
create policy resources_read on resources for select using (
  status = 'online' or is_admin()
);
create policy resources_write on resources for all using (is_admin()) with check (is_admin());

-- ---------- orders ----------
create policy orders_read on orders for select using (
  is_admin() or channel_id = auth_channel_id()
);
create policy orders_write on orders for all using (is_admin()) with check (is_admin());

-- ---------- assessment_records ----------
create policy ar_read on assessment_records for select using (
  is_admin() or channel_id = auth_channel_id()
);
create policy ar_write on assessment_records for all using (is_admin()) with check (is_admin());

-- ---------- import_jobs ----------
create policy ij_read on import_jobs for select using (
  is_admin() or account_id = auth.uid()::text
);
create policy ij_write on import_jobs for all using (
  is_admin() or account_id = auth.uid()::text
) with check (
  is_admin() or account_id = auth.uid()::text
);
