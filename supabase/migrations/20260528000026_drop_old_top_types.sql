-- 移除旧的默认顶级类型 (学习能力 / 情绪管理) 及其子集
-- 跟新的资源分类树 (tt_eval / tt_relief / tt_wiki, 见 20260528000025) 统一, 避免后台树形混乱
-- assessments.project_id / category_id 是 set null, 删除后引用方变 null, 不影响题目

delete from top_types where id in (
  -- 子集 (学习能力下面 4 个)
  'tt_learn_atti', 'tt_learn_meth', 'tt_learn_abil', 'tt_learn_habi',
  -- 顶级
  'tt_learn_root', 'tt_emo_root'
);
