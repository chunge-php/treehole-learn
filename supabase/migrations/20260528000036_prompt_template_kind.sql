-- prompt_templates 加 kind 字段, 把"聊天页能选哪些模板"从黑名单 (.neq 逐个排除)
-- 改成白名单 (kind='chat')。根治反复踩的坑: 每加一个抽取/信件模板就得记得去补过滤。
--   chat    主对话提示词 (聊天页可选)
--   extract 抽取类 (档案分析 / 心愿识别, 输出 JSON, 聊天页禁选)
--   letter  信件类 (月度家长信, 聊天页禁选)

alter table prompt_templates add column if not exists kind text not null default 'chat';

-- 回填存量: 按 code 归类 (覆盖历史所有 migration 插入的行)
update prompt_templates set kind = 'extract' where code in ('profile_extract', 'wish_extract');
update prompt_templates set kind = 'letter'  where code in ('monthly_wish_letter');
-- 其余 (multimodal_ai_tutor 等) 保持默认 'chat'

-- 约束: 只允许这三类
do $$ begin
  alter table prompt_templates add constraint prompt_templates_kind_chk check (kind in ('chat', 'extract', 'letter'));
exception when duplicate_object then null; end $$;
