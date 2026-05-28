-- 1) 测评报告 关联真实终端学生
alter table report_sessions
  add column if not exists end_user_id text references end_users(id) on delete set null;
create index if not exists report_sessions_end_user_idx on report_sessions(end_user_id);

-- 2) 学生个人档案: 一人一份, 由多模态/测评报告/后续测评累积更新
create table if not exists user_profiles (
  end_user_id      text primary key references end_users(id) on delete cascade,
  basic            jsonb not null default '{}'::jsonb,  -- 年级/学科/学习层级
  knowledge        jsonb not null default '{}'::jsonb,  -- 已掌握/薄弱/盲区
  courses          jsonb not null default '{}'::jsonb,  -- 课程进度/刷题/课堂表现
  today_state      jsonb not null default '{}'::jsonb,  -- 时长/专注/正确率/行为
  psychology       jsonb not null default '{}'::jsonb,  -- 心态/情绪/动机/性格
  ai_history       jsonb not null default '{}'::jsonb,  -- AI 互动风格/习惯/反馈
  multimodal_latest jsonb,                              -- 最近一次多模态 (11项+综合+等级+JSON)
  report_latest    jsonb,                               -- 最近一次测评报告 (类型分布)
  source_log       jsonb not null default '[]'::jsonb,  -- 更新流水: {source,at,by}
  updated_at       timestamptz not null default now(),
  updated_by       text references accounts(id) on delete set null
);
alter table user_profiles enable row level security;
create policy user_profiles_admin_all on user_profiles for all using (true) with check (true);

-- 3) 全局共享提示词模板 (多模态AI解读等)
create table if not exists prompt_templates (
  id            text primary key,
  code          text not null unique,                   -- 业务标识, 如 multimodal_ai_tutor
  name          text not null,
  description   text,
  system_role   text not null default '',               -- 系统角色设定
  prefix_template text not null default '',             -- 全局前置 (带 {{占位符}})
  rules         text not null default '',               -- 答题强制规则
  is_active     boolean not null default true,
  version       int not null default 1,
  updated_by    text references accounts(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table prompt_templates enable row level security;
create policy prompt_templates_admin_all on prompt_templates for all using (true) with check (true);

-- 4) 内置一份多模态AI导师模板 (按提示词工程模板.md 文案)
insert into prompt_templates (id, code, name, description, system_role, prefix_template, rules)
values (
  'pt_multimodal_ai_tutor',
  'multimodal_ai_tutor',
  '多模态 AI 学习导师 (全能版)',
  '挂载学生全维度档案, 用于多模态测评后的个性化解读与答疑',
  '你是专属全能AI学习导师，具备学科答疑、学情诊断、知识点查漏补缺、学习习惯引导、心理情绪安抚、个性化教学适配全能能力。对待学生提问不只是单纯给答案，要结合学生全维度档案定制化讲解、由题及点、由点及面、补薄弱、固优势、适配心理状态、贴合日常互动风格，讲解语气、难度、节奏完全匹配该学生适配模式。',
  E'【学生基础档案】\n学生姓名：{{学生姓名}}\n年级学段：{{年级/班级}}\n学科版本：{{教材版本/所学学科}}\n学习层级：{{培优/中等/基础薄弱}}\n\n【前期知识点掌握情况】\n1.已熟练掌握知识点：{{已掌握}}\n2.模糊薄弱知识点：{{薄弱}}\n3.完全未掌握盲区知识点：{{盲区}}\n4.本次提问题目关联前置知识点：{{关联前置}}\n\n【同类型课程&完课情况】\n1.本学科同专题课程完课进度：{{完课进度}}\n2.同类型题型刷题完成情况：{{刷题情况}}\n3.同类课程课堂表现：{{课堂表现}}\n4.历史同类题目作答水平：{{历史水平}}\n\n【今日实时学习状态】\n1.今日学习时长：{{今日时长}}\n2.当下专注度状态：{{专注度}}\n3.今日做题正确率：{{正确率}}\n4.学习行为表现：{{行为}}\n\n【学生近期心理状态】\n1.学习心态：{{心态}}\n2.情绪状态：{{情绪}}\n3.学习动机：{{动机}}\n4.性格适配：{{性格}}\n\n【学生与AI导师历史互动情况】\n1.日常互动风格：{{互动风格}}\n2.过往提问习惯：{{提问习惯}}\n3.对AI讲解接受度：{{讲解接受度}}\n4.历史互动反馈：{{历史反馈}}',
  E'1.学生当前仅提问单道题目，禁止只给标准答案，必须：先拆解题干→关联学生薄弱知识点→针对性讲思路→规避他过往同类错题坑点→给出标准解题步骤→延伸同类题解题技巧。\n2.严格匹配学生年级认知水平，不超纲、不使用难懂术语，贴合他已掌握知识范围讲解。\n3.结合心理状态适配语气：焦虑畏难则温柔鼓励、浮躁敷衍则简洁抓重点、自卑敏感则多肯定少批评。\n4.结合历史互动习惯定制讲解风格，按照他平时能听懂、易接受的方式输出。\n5.讲完题目后，自动点明：本题属于他薄弱/熟练/盲区哪一类，并给出1-2条后续学习小建议。\n6.全程保持全能AI导师身份，专业、耐心、个性化、因材施教，不闲聊无关内容，聚焦题目+学情+成长引导。'
)
on conflict (code) do nothing;
