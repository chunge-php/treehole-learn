-- 测评题加回'答案'字段 (存储选项 value: 单选 'A'/'B'... 判断 'T'/'F')
-- 语音题无答案

alter table assessments add column if not exists answer text;
