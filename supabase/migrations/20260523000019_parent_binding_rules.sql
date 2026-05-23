-- 家长绑定规则:
-- · 一个家长可绑多个学生 (支持小程序"切换孩子") → 去掉 open_id 唯一(与多绑冲突)
-- · 每个学生独占, 只能被一个家长绑定 (要换需原主先解绑) → end_user_id 唯一

alter table parent_bindings drop constraint if exists parent_bindings_open_id_key;

create unique index if not exists parent_bindings_end_user_unique
  on parent_bindings(end_user_id);
