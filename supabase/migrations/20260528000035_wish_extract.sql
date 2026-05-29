-- 心愿来源升级: 甲方明确「心愿通过 AI 聊天收集」, 不再依赖学生手动在 App 端逐条添加。
-- 聊天每轮后, 由大模型 (复用 profile_extract 通用抽取工作流, 换 wish_extract 提示词)
-- 从对话里识别学生表达的心愿, 写入 student_wish_items (source='ai_chat')。
-- 月底家长信生成链路 (buildLetterContext) 已经在读 student_wish_items, 零改动即生效。

-- 1) student_wish_items 增加来源/分类/原文留档字段
alter table student_wish_items add column if not exists source         text not null default 'manual';  -- manual(App手动) / ai_chat(聊天识别)
alter table student_wish_items add column if not exists category       text;                            -- 物质 / 体验 / 陪伴 / 学习目标 / 情感诉求 (大模型给, 选填)
alter table student_wish_items add column if not exists source_message text;                            -- 识别出心愿的对话原文片段, 审计/复核用

-- 2) 心愿抽取提示词模板 (复用 profile_extract 那条扣子工作流, system_prompt 不同而已)
insert into prompt_templates (id, code, name, description, system_role, prefix_template, rules, is_active, version)
values (
  'pt_wish_extract',
  'wish_extract',
  '心愿识别 (对话抽取)',
  '从单轮对话 (学生提问 + AI 回答) 里识别学生主动表达的心愿/愿望/诉求, 输出严格 JSON, 月底打包进家长信',
  $$你是「孩子心愿」识别助手。任务: 从学生本轮发言里, 找出学生主动表达的、真实具体的「心愿 / 愿望 / 诉求」, 用于月底汇总成一封写给父母的信。

【什么算心愿】
- 想要某样东西 ("想要一套漫画" "想买双新球鞋")
- 想做某件事 / 想去某地 ("想去看海" "周末想休息一天" "想养只猫")
- 对父母的诉求 ("希望爸妈别老盯着分数" "想要多一点陪伴" "希望周末能一起出去玩")
- 学习相关的小目标也算 ("想这次月考进前十" "想把英语补上来")

【不算心愿, 一律忽略】
- 单纯的学科问题 / 解题求助 ("这道题怎么做")
- 情绪宣泄但没有具体诉求 ("好累啊")
- AI 导师说的话 (只看学生说的)
- 客套、寒暄、无意义内容

【输出要求】
严格输出 JSON, 不要任何前后多余文字 (包括 ```json 标记):

{
  "wishes": [
    { "content": "用孩子第一人称、简洁陈述这个心愿 (≤40字)", "category": "物质/体验/陪伴/学习目标/情感诉求 里选一个" }
  ]
}

【规则】
1. content 用孩子第一人称原意复述, 保留真实口吻, 不美化、不替换、不替学生编造。
2. 一轮对话可能 0 个、也可能多个心愿; 没有就输出 {"wishes": []}。
3. category 必须从给定 5 类里选一个最贴近的, 选不准用 "情感诉求"。
4. 同一个意思只输出一条, 不要重复。
5. 整个输出必须是合法 JSON, 不要注释、不要代码块标记、不要解释。$$,
  '',
  '',
  true,
  1
)
on conflict (code) do nothing;
