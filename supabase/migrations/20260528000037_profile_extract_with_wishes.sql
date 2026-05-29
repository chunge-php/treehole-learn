-- 心愿合并进档案抽取 (甲方定): profile_extract 工作流在原档案 JSON 基础上额外吐 wishes 数组,
-- 后端 (extract.ts) 把 wishes 拆出来写 student_wish_items, 其余合并进 user_profiles。
-- 这里给 profile_extract 提示词追加「心愿识别」段落。
--   · 若扣子 profile 工作流的大模型节点引用了 {{system_prompt}} → 跑完此 migration 即自动生效
--   · 若该工作流把提示词写死在节点里 (没引用 system_prompt) → 需把下面这段 copy 进扣子工作流的提示词

do $$
declare cur text;
begin
  select system_role into cur from prompt_templates where code = 'profile_extract';
  -- 已经追加过就不重复 (幂等)
  if cur is not null and position('额外: 心愿识别' in cur) = 0 then
    update prompt_templates
    set system_role = cur || E'\n\n【额外: 心愿识别】\n'
      || E'除上述档案字段外, 如果学生在本轮发言里表达了「心愿 / 愿望 / 诉求」, 在同一个 JSON 里额外输出一个 wishes 数组:\n'
      || E'- 想要某样东西 ("想要一套漫画" "想买双新球鞋")\n'
      || E'- 想做某事 / 想去某地 ("想去看海" "周末想休息一天" "想养只猫")\n'
      || E'- 对父母的诉求 ("希望爸妈别老盯着分数" "想要多一点陪伴")\n'
      || E'- 学习相关小目标 ("想这次月考进前十" "想把英语补上来")\n'
      || E'格式: "wishes": [ { "content": "用孩子第一人称简洁陈述(≤40字)", "category": "物质/体验/陪伴/学习目标/情感诉求 里选一个" } ]\n'
      || E'规则: 用孩子原话原意, 不美化不替换不编造; 纯学科问题 / 情绪宣泄无具体诉求 / AI 导师说的话 都不算心愿; 没有心愿就不输出 wishes 键 (或输出 [])。',
        updated_at = now()
    where code = 'profile_extract';
  end if;
end $$;
