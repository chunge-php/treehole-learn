-- 多模态(语音题)支持
-- report_sessions.code: 报告流水号, 作发展猫 API 的 audio_id
-- report_answers.extend_json: 语音题焦虑分 {status_anxiety_score, trait_anxiety_score, learning_stress_score}

alter table report_sessions add column if not exists code text;
alter table report_answers  add column if not exists extend_json jsonb;
