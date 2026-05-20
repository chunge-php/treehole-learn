-- 种子数据：超级管理员 + 渠道级别字典 + 演示渠道/店铺/用户
-- 密码均为 admin123 的 bcrypt hash（10 rounds）

insert into channel_levels (id, name, rank) values
  ('lv_prov', '省级', 1),
  ('lv_city', '市级', 2),
  ('lv_dist', '区级', 3)
on conflict (id) do nothing;

-- 超级管理员: admin / admin123  (bcryptjs 10 轮加盐)
insert into accounts (id, username, password_hash, display_name, role, status) values
  ('acc_root00000', 'admin', '$2a$10$7CM1XSq50iIXqChW6chn8uFIq9aBi8ESPmi1gquazXOp9.6zIgYH.', '超级管理员', 'super_admin', 'active')
on conflict (id) do nothing;

-- 演示渠道
insert into channels (id, name, level_id, province, city, district, address, contact_name, contact_phone) values
  ('ch_demo_bj01', '北京启明渠道商', 'lv_city', '北京市', '北京市', '海淀区', '中关村大街1号', '李明', '13800138001'),
  ('ch_demo_sh02', '上海智学渠道商', 'lv_city', '上海市', '上海市', '浦东新区', '张江高科技园', '王芳', '13800138002')
on conflict (id) do nothing;

-- 演示店铺
insert into stores (id, channel_id, name, province, city, district, address, contact_name, contact_phone, device_count) values
  ('st_demo_bj01a', 'ch_demo_bj01', '海淀旗舰店', '北京市', '北京市', '海淀区', '中关村大街1号A座', '陈强', '13900139001', 5),
  ('st_demo_bj01b', 'ch_demo_bj01', '朝阳分店', '北京市', '北京市', '朝阳区', '建国路88号', '刘洋', '13900139002', 3),
  ('st_demo_sh02a', 'ch_demo_sh02', '张江总店', '上海市', '上海市', '浦东新区', '张江高科技园8号', '赵敏', '13900139003', 4)
on conflict (id) do nothing;

-- 顶级类型
insert into top_types (id, parent_id, name, sort_order) values
  ('tt_learn_root', null, '学习能力', 1),
  ('tt_emo_root', null, '情绪管理', 2)
on conflict (id) do nothing;

insert into top_types (id, parent_id, name, sort_order) values
  ('tt_learn_atti', 'tt_learn_root', '学习态度', 1),
  ('tt_learn_meth', 'tt_learn_root', '学习方法', 2),
  ('tt_learn_abil', 'tt_learn_root', '学习能力', 3),
  ('tt_learn_habi', 'tt_learn_root', '学习习惯', 4)
on conflict (id) do nothing;
