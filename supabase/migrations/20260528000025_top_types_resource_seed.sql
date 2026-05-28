-- 资源分类顶级树 (沿用旧项目 option_values scope=resource 的 3 大顶级 + 8 二级)
-- 全部幂等 INSERT, 跑多次无副作用
-- 图标路径: /static/top-types/  (Next.js public 目录, 浏览器直接访问)
-- 图片素材清单见 public/static/top-types/README.md

-- 一级 (3 个顶级)
insert into top_types (id, parent_id, name, cover_url, sort_order, status) values
  ('tt_eval',   null, '学习力测评', '/static/top-types/eval.png',   0, 'active'),
  ('tt_relief', null, '减压练习',   '/static/top-types/relief.png', 1, 'active'),
  ('tt_wiki',   null, '智能百科',   '/static/top-types/wiki.png',   2, 'active')
on conflict (id) do nothing;

-- 二级 — 减压练习
insert into top_types (id, parent_id, name, selected_icon_url, unselected_icon_url, sort_order, status) values
  ('tt_relief_mindful',  'tt_relief', '正念呼吸',
    '/static/top-types/relief-mindful-selected.png',
    '/static/top-types/relief-mindful-unselected.png', 0, 'active'),
  ('tt_relief_bodyscan', 'tt_relief', '躯体扫描',
    '/static/top-types/relief-bodyscan-selected.png',
    '/static/top-types/relief-bodyscan-unselected.png', 1, 'active'),
  ('tt_relief_belly',    'tt_relief', '腹式呼吸',
    '/static/top-types/relief-belly-selected.png',
    '/static/top-types/relief-belly-unselected.png', 2, 'active'),
  ('tt_relief_video',    'tt_relief', '减压视频',
    '/static/top-types/relief-video-selected.png',
    '/static/top-types/relief-video-unselected.png', 3, 'active')
on conflict (id) do nothing;

-- 二级 — 智能百科
insert into top_types (id, parent_id, name, selected_icon_url, unselected_icon_url, sort_order, status) values
  ('tt_wiki_emotion',  'tt_wiki', '情绪管理',
    '/static/top-types/wiki-emotion-selected.png',
    '/static/top-types/wiki-emotion-unselected.png', 0, 'active'),
  ('tt_wiki_social',   'tt_wiki', '人际关系',
    '/static/top-types/wiki-social-selected.png',
    '/static/top-types/wiki-social-unselected.png', 1, 'active'),
  ('tt_wiki_tutor',    'tt_wiki', '学习辅导',
    '/static/top-types/wiki-tutor-selected.png',
    '/static/top-types/wiki-tutor-unselected.png', 2, 'active'),
  ('tt_wiki_selfknow', 'tt_wiki', '自我认识',
    '/static/top-types/wiki-selfknow-selected.png',
    '/static/top-types/wiki-selfknow-unselected.png', 3, 'active')
on conflict (id) do nothing;
