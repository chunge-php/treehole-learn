-- 旧项目 ai_tree_hole_bin.resource_videos 数据迁移到新 resources 表
-- audio 类型 (旧 file_type=audio) 在新 schema 没对应, 归入 'file'
-- 资源文件 (cover_url / media_url) 走 public/uploads/... 相对路径, 跑 scripts/download_legacy_resources.mjs 下载
-- text 类型仅迁元数据 + 摘要, 完整 HTML 正文请在后台「资源库」编辑补充

insert into resources (id, type, title, cover_url, body, media_url, category_id, status, sort_order, file_ext) values
  ('res_legacy_006', 'video', $body$腹式呼吸$body$, $body$/uploads/20251226/7538c9c03693f9e4.png$body$, null, $body$/uploads/2025/12/腹式呼吸_694e4aa076e4f.mp4$body$, 'tt_relief_belly', 'online', 0, 'mp4'),
  ('res_legacy_007', 'video', $body$海岸$body$, $body$/uploads/20251226/38ba326f8e67a427.png$body$, null, $body$/uploads/2025/12/海岸_694e4b5911613.mp4$body$, 'tt_relief_video', 'online', 0, 'mp4'),
  ('res_legacy_008', 'video', $body$天空$body$, $body$/uploads/20251226/947c981c4cc715c7.png$body$, null, $body$/uploads/2025/12/天空_694e4bac5c566.mp4$body$, 'tt_relief_video', 'online', 0, 'mp4'),
  ('res_legacy_009', 'video', $body$森林$body$, $body$/uploads/20251226/515f5da1f6ca7577.png$body$, null, $body$/uploads/2025/12/森林_694e4c4c2aa65.mp4$body$, 'tt_relief_video', 'online', 0, 'mp4'),
  ('res_legacy_010', 'video', $body$自然风光$body$, $body$/uploads/20251226/ec4c79b8bb920d32.png$body$, null, $body$/uploads/2025/12/自然风光_694e4cda75cb2.mp4$body$, 'tt_relief_video', 'online', 0, 'mp4'),
  ('res_legacy_011', 'file', $body$正念练习-身体扫描$body$, $body$/uploads/20251226/cecc6cc8b060f250.png$body$, $body$正念练习音频 (45分钟身体扫描引导)$body$, $body$/uploads/2025/12/3064421531_694e4f02c39d7.mp3$body$, 'tt_relief_bodyscan', 'online', 0, 'mp3'),
  ('res_legacy_012', 'video', $body$正念呼吸$body$, $body$/uploads/20251226/90529845961ea17c.png$body$, null, $body$/uploads/2025/12/正念呼吸(1)_694e4f9543591.mp4$body$, 'tt_relief_mindful', 'online', 0, 'mp4'),
  ('res_legacy_013', 'video', $body$认识情绪$body$, $body$/uploads/20251226/b3ded21c4140a7ad.png$body$, $body$情绪, 是对一系列主观认知经验的通称$body$, $body$/uploads/2025/12/01-18-认识情绪_694e50a8f3d3c.mp4$body$, 'tt_wiki_emotion', 'online', 0, 'mp4'),
  ('res_legacy_014', 'video', $body$认识压力$body$, $body$/uploads/20251226/d37704a23f1945de.png$body$, $body$心理压力是个体在面对外界挑战时的身心反应$body$, $body$/uploads/2025/12/01-19-认识压力_694e52761c722.mp4$body$, 'tt_wiki_emotion', 'online', 0, 'mp4'),
  ('res_legacy_015', 'video', $body$道德困境$body$, $body$/uploads/20251226/c86738201d3b43c6.png$body$, $body$道德困境是指个体在特定情境下面临两种或多种相互冲突的道德选择$body$, $body$/uploads/2025/12/01-10-道德困境_694e5475ea7a8.mp4$body$, 'tt_wiki_social', 'online', 0, 'mp4'),
  ('res_legacy_016', 'video', $body$从众效应$body$, $body$/uploads/20251226/a6d44f40a38191c2.png$body$, $body$从众效应又称乐队花车效应$body$, $body$/uploads/2025/12/02-4-从众效应_694e54e97879b.mp4$body$, 'tt_wiki_social', 'online', 0, 'mp4'),
  ('res_legacy_017', 'video', $body$人际敏感的正向作用$body$, $body$/uploads/20251226/c8be06ae06fd6383.png$body$, $body$敏感是一种正常的人格特征维度$body$, $body$/uploads/2025/12/03-12-人际敏感的正向作用_694e55464416d.mp4$body$, 'tt_wiki_social', 'online', 0, 'mp4'),
  ('res_legacy_018', 'video', $body$好好学习不再是一句口头禅$body$, $body$/uploads/20251226/18cacfc0f0839f1b.png$body$, $body$高效学习不是苦差事, 而是用聪明方法走得更远$body$, $body$/uploads/2025/12/03-3-“好好学习”不再是一句口头禅_694e570336689.mp4$body$, 'tt_wiki_tutor', 'online', 0, 'mp4'),
  ('res_legacy_019', 'video', $body$主动解决学习上遇到的困难$body$, $body$/uploads/20251226/6acc774a234a159a.png$body$, $body$主动解决学习困难是提升学习效果的关键$body$, $body$/uploads/2025/12/03-10-主动解决学习上遇到的困难_694e57bda177a.mp4$body$, 'tt_wiki_tutor', 'online', 0, 'mp4'),
  ('res_legacy_020', 'text', $body$负面情绪不能压抑 如何引导孩子恰当表达情绪$body$, $body$/uploads/20251229/d37fe9e1b20e8627.png$body$, $body$人有情绪是正常现象, 重要的是如何恰当地表达自己的情绪 (完整正文请在后台编辑补充)$body$, null, 'tt_wiki_emotion', 'online', 0, null),
  ('res_legacy_021', 'text', $body$焦虑和压力成"病"如何化解$body$, $body$/uploads/20251229/5839946001a50d57.png$body$, $body$现代人的压力无所不在, 焦虑导致很多人产生焦虑情绪 (完整正文请在后台编辑补充)$body$, null, 'tt_wiki_emotion', 'online', 0, null),
  ('res_legacy_022', 'text', $body$睡眠不足影响学生学习能力$body$, $body$/uploads/20251229/85ab9eda0a3da591.png$body$, $body$美国国家科学院学报研究: 大学生每晚睡眠不足6小时会影响学习能力 (完整正文请在后台编辑补充)$body$, null, 'tt_wiki_tutor', 'online', 0, null),
  ('res_legacy_023', 'text', $body$学龄孩子学习障碍有哪些表现?$body$, $body$/uploads/20251229/5caf32fc40e1e850.png$body$, $body$学习障碍是一种异质性综合征 (完整正文请在后台编辑补充)$body$, null, 'tt_wiki_tutor', 'online', 0, null),
  ('res_legacy_024', 'text', $body$安抚你的"内在小孩"$body$, $body$/uploads/20251229/ee8b479695d9b2f8.png$body$, $body$在印度, 大象会被一根小小的锁链拴住... 心理学称为"内在小孩"疗法 (完整正文请在后台编辑补充)$body$, null, 'tt_wiki_selfknow', 'online', 0, null),
  ('res_legacy_025', 'text', $body$自我认识: 探索内心的旅程$body$, $body$/uploads/20251229/e639b4c577351eaa.png$body$, $body$自我认识是指一个人对自己的认识和了解 (完整正文请在后台编辑补充)$body$, null, 'tt_wiki_selfknow', 'online', 0, null),
  ('res_legacy_026', 'text', $body$三步呼吸空间法$body$, $body$/uploads/20251229/6764614bd4b31f84.png$body$, $body$应对型三分钟呼吸空间练习: 觉察 → 专注 → 扩展 (完整正文请在后台编辑补充)$body$, null, 'tt_relief_mindful', 'online', 0, null),
  ('res_legacy_027', 'text', $body$身体扫描助您入眠的好方法$body$, $body$/uploads/20251229/02f82dcaadfeb160.png$body$, $body$身体扫描是正念心理治疗中最重要的练习之一 (完整正文请在后台编辑补充)$body$, null, 'tt_relief_bodyscan', 'online', 0, null),
  ('res_legacy_028', 'text', $body$"腹式呼吸法"调整呼吸缓解焦虑$body$, $body$/uploads/20251229/01212ecea8be53a8.png$body$, $body$腹式呼吸可帮助慢阻肺/新冠/高血压/消化不良等多种病症 (完整正文请在后台编辑补充)$body$, null, 'tt_relief_belly', 'online', 0, null)
on conflict (id) do nothing;
