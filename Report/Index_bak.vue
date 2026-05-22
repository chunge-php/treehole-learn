<template>
    <div class="user-pdf">
        <div class="user-report" ref="reportRoot">
            <div class="pdf-page pdf-page-home">
                <div class="pdf-page-header flex justify-between">
                    <div class="pdf-header-logo cover"></div>
                    <div class="pdf-header-info">
                        <div class="pdf-header-title">个人报告</div>
                        <div class="pdf-header-tips flex">
                            <span>评测日期：2025年11月24日</span>
                            <span>编号：NK00000000001</span>
                        </div>
                    </div>
                </div>
                <div class="pdf-page-content">
                    <div class="text-center">
                        <h1>《个性化学习与发展评估报告》</h1>
                    </div>
                    <div class="pdf-home-line"></div>
                    <div class="text-center">
                        <h2>个人报告</h2>
                    </div>
                    <div class="pdf-home-form">
                        <div class="pdf-home-item flex justify-center align-center" v-for="(item, index) in homeForm"
                            :key="index">
                            <div class="pdf-home-label"><span v-html="item.label"></span>：</div>
                            <div class="pdf-home-value flex align-center">
                                <div class="pdf-home-unit">[</div>
                                <div class="pdf-home-text">{{ item.value }}</div>
                                <div class="pdf-home-unit">]</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="pdf-page">
                <div class="pdf-page-header flex justify-between">
                    <div class="pdf-header-logo cover"></div>
                    <div class="pdf-header-info">
                        <div class="pdf-header-title">个人报告</div>
                        <div class="pdf-header-tips flex">
                            <span>评测日期：2025年11月24日</span>
                            <span>编号：NK00000000001</span>
                        </div>
                    </div>
                </div>
                <div class="pdf-page-content">
                    <div class="pdf-h1">
                        <h1>《个性化学习与发展评估报告》</h1>
                    </div>
                    <div class="pdf-title display-flex">
                        <h1>一、报告导读</h1>
                    </div>
                    <h3 class="title-h3">通用导读</h3>
                    <p>本报告基于多模态测评记录、多元性向潜能发展测评、初中生兴趣测评及主观自陈量表四份测评，从抗压能力、自信心等 10
                        个维度，全面评估初三女生的学习状态与发展潜力。报告将明确其学习类型，解读测评结果，并提供针对性发展建议，助力优化学习策略、改善学习心态。</p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">学习与发展综合数字画像</h3>
                    </div>
                    <div class="pdf-info flex justify-between">
                        <div class="pdf-info-text">
                            <div class="pdf-info-title">脆弱的梵高</div>
                            <div class="pdf-info-content">
                                兼具艺术特质与情绪敏感的特点。在兴趣层面，她艺术型倾向突出，对文艺创作、视觉设计等领域有强烈热情，具备较强的审美感知与创意表达潜力，如同梵高对艺术的执着与天赋。但在情绪与抗压层面，她属于波动焦虑型，日常学习表现尚可，可一旦面临考试等压力场景，焦虑感便显著上升，易出现紧张、思路混乱甚至失常发挥的情况，情绪稳定性较弱，如同梵高创作中敏感脆弱的一面。整体来看，她拥有鲜明的艺术优势，但需通过针对性调整，提升情绪抗压能力，让艺术特质更好地为学习与成长赋能。
                            </div>
                        </div>
                        <div class="pdf-info-image cover" :style="{ 'background-image': 'url(/pdf/i1.png)' }"></div>
                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">各维度数据展示</h3>
                    </div>
                    <div class="pdf-info-chart flex justify-center">
                        <PieCharts></PieCharts>
                    </div>
                    <div class="pdf-title display-flex">
                        <h1>二、综合结论与类型界定</h1>
                    </div>
                    <div class="pad-podium flex justify-center">
                        <div class="pad-podium-item flex" :class="'pad-podium-' + item.value"
                            v-for="(item, index) in podiumItems" :key="index">
                            <div class="pad-podium-title">{{ item.label }}</div>
                            <div class="pad-podium-box">
                                <div class="pad-podium-top"></div>
                                <div class="pad-podium-bottom flex justify-center align-center">
                                    {{ item.value }}
                                </div>
                            </div>
                        </div>

                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h2 text-center">八维学格类型</h3>
                    </div>
                    <div class="pdf-table">
                        <div class="pdf-table-top grid grid-cols-2">
                            <div class="pdf-table-item">八维学格</div>
                            <div class="pdf-table-item">组合规则 <span>（l-表示低 h-表示高）</span></div>
                        </div>
                        <div class="pdf-table-header grid grid-cols-2">
                            <div class="pdf-table-item"></div>
                            <div class="pdf-table-item grid grid-cols-3">
                                <div class="pdf-table-th">
                                    <div>多模态</div>
                                    <div>Eh /El</div>
                                </div>
                                <div class="pdf-table-th">
                                    <div>多元性向</div>
                                    <div>R Rh/Rl</div>
                                </div>
                                <div class="pdf-table-th">
                                    <div>自陈量表</div>
                                    <div>S Sh/Sl</div>
                                </div>
                            </div>
                        </div>
                        <div class="pdf-table-body grid grid-cols-2" v-for="(item, index) in tableData" :key="index">
                            <div class="pdf-table-item">
                                <div class="pdf-table-tr">{{ item.label }}</div>
                                <div class="pdf-table-value">{{ item.value }}</div>
                            </div>
                            <div class="pdf-table-item grid grid-cols-3">
                                <div class="pdf-table-td">
                                    {{ item.a }}
                                </div>
                                <div class="pdf-table-td">
                                    {{ item.b }}
                                </div>
                                <div class="pdf-table-td">
                                    {{ item.c }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">（一）多模态测评记录</h3>
                    </div>
                    <p>该学生符合波动焦虑型的核心特点，即一考试就爆，焦虑值拉满。平时学习不错，但考试时因过度紧张经常失常发挥，这是波动焦虑型的典型表现。同时，她积极努力学习，并非摆烂或躺平，进一步印证主要类型为波动焦虑型。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">（二）多模态测评记录</h3>
                    </div>
                    <p>她有学习的积极性和努力的态度，但缺乏有效的学习方法，属于蛮干型。从策略方法维度的评估可知，其没有太多学习方法，习惯管理也不佳，符合死磕傻学型 “没方法、埋头硬冲”
                        的特点，因此将其列为次要类型之一。
                    </p>
                    <div class="pdf-title display-flex">
                        <h1>三、测评维度深度解读</h1>
                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">（一）多模态测评记录</h3>
                    </div>
                    <p><span class="text-color">测评核心：</span>聚焦日常及压力场景下的情绪表现，重点观察面对考试、学习挫折时的心态变化。
                    </p>
                    <p><span class="text-color">结果解读：</span>抗挫力强，情绪稳定+应对积极，能自主解决学习困难。
                    </p>
                    <div class="pdf-info-chart flex justify-center">
                        <BarCharts></BarCharts>
                    </div>
                    <p>抗挫力和情绪心态不是 “天生的”，而是靠后天 “遇到困难、解决困难”慢慢练出来的。如果孩子目前抗挫力低分，不用着急 --
                        抗挫力训练营会用孩子能接受的方式(如游戏化情景、同龄人案例)教方法，避免“说教式”培训，让孩子在轻松的氛围里学会“怎么面对学习里的'小挫折””，逐步养成“不轻易放弃”的心态。</p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">（二）多元性向潜能发展测评</h3>
                    </div>
                    <p><span
                            class="text-color">测评核心：</span>准备一个“进步本”，每天记录自己在学习中的小进步，如“今天比昨天多记住10个英语单词”“数学题的正确率提高了5%”等，定期翻看，感受自己的成长。
                    </p>
                    <p><span class="text-color">结果解读：</span>
                    </p>
                    <p><span>自我认知与心态：</span>对自身学习能力的信心不足，尤其是在学习结果不理想时，容易否定自己，选择逃避而非主动解决问题;面对考试时，即使做好准备也会感到紧张，缺乏稳定的应试心态。
                    </p>
                    <p><span>学习习惯与方法：</span>在时间安排上缺乏规划，容易拖延重要学习任务，且学习时易受手机等外界因素干扰;没有形成系统的学习流程，比如课前预习、课后复习、错题整理等环节落实不到位，影响学习效果。
                    </p>
                    <p><span>目标与动力：</span>没有清晰的学习目标，不知道如何将长期目标拆解为可执行的短期任务，也不会定期检查学习进度;学习动力依赖结果反馈，一旦成绩不理想，就容易失去学习热情，内在学习动力需要进一步强化。
                    </p>
                    <p><span>支持感知：</span>对家庭支持的感受需结合具体表现判断，若在遇到学习压力或情绪问题时，能感受到家人的理解和安慰，而非仅关注成绩，会更有利于缓解焦虑;若家人过度关注分数、忽视情绪需求，则可能加重学习压力。
                    </p>
                    <div class="pdf-info-chart flex justify-center">
                        <BarXCharts></BarXCharts>
                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">（三）兴趣测评</h3>
                    </div>
                    <p><span
                            class="text-color">测评核心：</span>准备一个“进步本”，每天记录自己在学习中的小进步，如“今天比昨天多记住10个英语单词”“数学题的正确率提高了5%”等，定期翻看，感受自己的成长。
                    </p>
                    <p><span class="text-color">结果解读：</span>
                    </p>
                    <p><span>自我认知与心态：</span>对自身学习能力的信心不足，尤其是在学习结果不理想时，容易否定自己，选择逃避而非主动解决问题;面对考试时，即使做好准备也会感到紧张，缺乏稳定的应试心态。
                    </p>
                    <p><span>学习习惯与方法：</span>在时间安排上缺乏规划，容易拖延重要学习任务，且学习时易受手机等外界因素干扰;没有形成系统的学习流程，比如课前预习、课后复习、错题整理等环节落实不到位，影响学习效果。
                    </p>
                    <p><span>目标与动力：</span>没有清晰的学习目标，不知道如何将长期目标拆解为可执行的短期任务，也不会定期检查学习进度;学习动力依赖结果反馈，一旦成绩不理想，就容易失去学习热情，内在学习动力需要进一步强化。
                    </p>
                    <p><span>支持感知：</span>对家庭支持的感受需结合具体表现判断，若在遇到学习压力或情绪问题时，能感受到家人的理解和安慰，而非仅关注成绩，会更有利于缓解焦虑;若家人过度关注分数、忽视情绪需求，则可能加重学习压力。
                    </p>
                    <div class="pdf-info grid grid-cols-2 pdf-info-none">
                        <div class="pdf-info-chart">

                            <div class="pdf-chart-header">
                                <h3 class="title-h3">兴趣组型</h3>
                                <p>兴趣量表测验所得的兴趣组型</p>
                            </div>
                            <div class="pdf-chart-abc grid grid-cols-3">
                                <div class="pdf-abs-item">
                                    <div class="pdf-abs-text" style="color:#3180C3">
                                        A
                                    </div>
                                    <div class="pdf-abs-value">
                                        艺术
                                    </div>
                                </div>
                                <div class="pdf-abs-item">
                                    <div class="pdf-abs-text" style="color: #55AF32;">
                                        R
                                    </div>
                                    <div class="pdf-abs-value">
                                        实际
                                    </div>
                                </div>
                                <div class="pdf-abs-item">
                                    <div class="pdf-abs-text" style="color: #D50000;">
                                        S
                                    </div>
                                    <div class="pdf-abs-value">
                                        社会
                                    </div>
                                </div>
                            </div>

                            <div class="pdf-chart-rose">
                                <PieRCharts></PieRCharts>
                            </div>
                        </div>
                        <div class="pdf-info-chart">
                            <div class="pdf-chart-header">
                                <h3 class="title-h3">兴趣类型分数图</h3>
                                <p>各类兴趣类型得分直方图</p>
                            </div>

                            <div class="pdf-chart-box">
                                <BarYCharts></BarYCharts>
                            </div>

                        </div>
                    </div>
                    <div class="pdf-info">
                        <div class=" grid grid-cols-2">
                            <div class="pdf-info-auto">

                                <div class="pdf-chart-header">
                                    <h3 class="title-h3">区分性指标：<span>高</span></h3>
                                    <p>各类型的得分差异程度指标，分为三个等级:高/中/低·等级越高表示越容易比较出喜欢与不喜欢的兴趣类型 ;</p>
                                </div>
                                <div class="pdf-vs">
                                    <div class="pdf-chart-vs flex justify-center">
                                        <div class="pdf-vs-title text-right">ARS</div>
                                        <div class="pdf-vs-title pdf-vs-center">VS</div>
                                        <div class="pdf-vs-title">RAS</div>
                                    </div>
                                    <div class="pdf-chart-vs flex justify-center">
                                        <div class="pdf-vs-value text-right">（兴趣组型）</div>
                                        <div class="pdf-vs-center"></div>
                                        <div class="pdf-vs-value">（自我介绍组型）</div>
                                    </div>
                                </div>

                            </div>
                            <div class="pdf-info-auto">
                                <div class="pdf-chart-header">
                                    <h3 class="title-h3">谐和度指标：<span>高</span></h3>
                                    <p>量表测验所得的兴趣组型兴自我介绍组型的相近程度指标。分为四种等级 :高/中上/普通/低。等级越高表示两组型越相近</p>
                                </div>
                            </div>
                        </div>
                        <div class="pdf-info-line">
                            <p>此页为测验结果的综合报告，即测验结果与重要指标的汇整。本测验结果的核心包括:兴趣组型、兴趣六角图、兴趣类型分数图、区分性和谐和度指标。在接下来的报告中，将会呈现每部分做详细的说明与结果的解释。你可以依循此综合报告，作为阅读时的参考工具，协助你完整地认识生涯兴趣量表和你的测验结果0
                            </p>
                        </div>
                    </div>

                    <div class="pdf-title-h3">
                        <h3 class="title-h3">（四）主观自陈量表</h3>
                    </div>
                    <p><span
                            class="text-color">测评核心：</span>准备一个“进步本”，每天记录自己在学习中的小进步，如“今天比昨天多记住10个英语单词”“数学题的正确率提高了5%”等，定期翻看，感受自己的成长。
                    </p>
                    <p><span class="text-color">结果解读：</span>
                    </p>
                    <p><span>自我认知与心态：</span>对自身学习能力的信心不足，尤其是在学习结果不理想时，容易否定自己，选择逃避而非主动解决问题;面对考试时，即使做好准备也会感到紧张，缺乏稳定的应试心态。
                    </p>
                    <p><span>学习习惯与方法：</span>在时间安排上缺乏规划，容易拖延重要学习任务，且学习时易受手机等外界因素干扰;没有形成系统的学习流程，比如课前预习、课后复习、错题整理等环节落实不到位，影响学习效果。
                    </p>
                    <p><span>目标与动力：</span>没有清晰的学习目标，不知道如何将长期目标拆解为可执行的短期任务，也不会定期检查学习进度;学习动力依赖结果反馈，一旦成绩不理想，就容易失去学习热情，内在学习动力需要进一步强化。
                    </p>
                    <p><span>支持感知：</span>对家庭支持的感受需结合具体表现判断，若在遇到学习压力或情绪问题时，能感受到家人的理解和安慰，而非仅关注成绩，会更有利于缓解焦虑;若家人过度关注分数、忽视情绪需求，则可能加重学习压力。
                    </p>
                    <div class="pdf-title display-flex">
                        <h1>四、发展建议及能力提升方向</h1>
                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">（一）针对学习策路、学习动力等方面的提升建议</h3>
                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">1、关于学习信心的建议</h3>
                    </div>
                    <p><span>01.记录学习进步：</span>准备一个“进步本”，每天记录自己在学习中的小进步，如“今天比昨天多记住10个英语单词”“数学题的正确率提高了5%”等，定期翻看，感受自己的成长。
                    </p>
                    <p><span>02.积极参与课堂互动：</span>从简单的回答开始，如老师提问课文内容时，主动举手回答，即使回答错误，也把它当作一次学习机会，逐渐克服不敢发言的心理。
                    </p>
                    <p><span>03.合理安排薄弱学科学习：</span>不要将薄弱学科放在最后学习，每天安排固定的30-60分钟学习薄弱学科，从基础知识点入手，逐步攻克难点，提高对薄弱学科的掌控感。
                    </p>
                    <p><span>04.调整考试心态：</span>0考试前进行积极的心理暗示，如“我已经做好了充分准备，我能行”;考试过程中如果感到紧张，可正念呼吸3-5次，缓解紧张情绪。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">2、关于学习信心的建议</h3>
                    </div>
                    <p><span>01.记录学习进步：</span>准备一个“进步本”，每天记录自己在学习中的小进步，如“今天比昨天多记住10个英语单词”“数学题的正确率提高了5%”等，定期翻看，感受自己的成长。
                    </p>
                    <p><span>02.积极参与课堂互动：</span>从简单的回答开始，如老师提问课文内容时，主动举手回答，即使回答错误，也把它当作一次学习机会，逐渐克服不敢发言的心理。
                    </p>
                    <p><span>03.合理安排薄弱学科学习：</span>不要将薄弱学科放在最后学习，每天安排固定的30-60分钟学习薄弱学科，从基础知识点入手，逐步攻克难点，提高对薄弱学科的掌控感。
                    </p>
                    <p><span>04.调整考试心态：</span>0考试前进行积极的心理暗示，如“我已经做好了充分准备，我能行”;考试过程中如果感到紧张，可正念呼吸3-5次，缓解紧张情绪。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">3、关于成就目标定向的建议</h3>
                    </div>
                    <p><span>01.学习设定具体目标：</span>从短期、具体的目标开始，如“本周掌握数学的一元二次方程解法”“明天背诵20个语文古诗”等，目标要清晰、可衡量，便于检查完成情况。
                    </p>
                    <p><span>02.学习分解任务：</span>以完成一次语文作文写作为例，将其分解为“确定作文主题(30 分钟)-收集作文素材(1 小时)-列作文提纲(40 分钟)-撰写作文初稿(2
                        小时)-修改作文(1小时)”等小步骤，逐步完成。
                    </p>
                    <p><span>03.养成定期检查进度的习惯：</span>每天晚上花 10 分钟回顾当天的学习任务完成情况，每周日晚上总结本周学习进度分析未完成任务的原因，及时调整下周学习计划。
                    </p>
                    <p><span>04.主动调整学习策略：</span>当发现某种学习方法效果不佳时，如用死记硬背的方式记英语单词效率低，可尝试联想记忆法、词根词缀记忆法等，找到适合自己的学习方法。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">>（二）针对学习策路、学习动力等方面的提升建议</h3>
                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">1、关于学习信心的建议</h3>
                    </div>
                    <p><span>01.记录学习进步：</span>准备一个“进步本”，每天记录自己在学习中的小进步，如“今天比昨天多记住10个英语单词”“数学题的正确率提高了5%”等，定期翻看，感受自己的成长。
                    </p>
                    <p><span>02.积极参与课堂互动：</span>从简单的回答开始，如老师提问课文内容时，主动举手回答，即使回答错误，也把它当作一次学习机会，逐渐克服不敢发言的心理。
                    </p>
                    <p><span>03.合理安排薄弱学科学习：</span>不要将薄弱学科放在最后学习，每天安排固定的30-60分钟学习薄弱学科，从基础知识点入手，逐步攻克难点，提高对薄弱学科的掌控感。
                    </p>
                    <p><span>04.调整考试心态：</span>0考试前进行积极的心理暗示，如“我已经做好了充分准备，我能行”;考试过程中如果感到紧张，可正念呼吸3-5次，缓解紧张情绪。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">2、关于学习信心的建议</h3>
                    </div>
                    <p><span>01.记录学习进步：</span>准备一个“进步本”，每天记录自己在学习中的小进步，如“今天比昨天多记住10个英语单词”“数学题的正确率提高了5%”等，定期翻看，感受自己的成长。
                    </p>
                    <p><span>02.积极参与课堂互动：</span>从简单的回答开始，如老师提问课文内容时，主动举手回答，即使回答错误，也把它当作一次学习机会，逐渐克服不敢发言的心理。
                    </p>
                    <p><span>03.合理安排薄弱学科学习：</span>不要将薄弱学科放在最后学习，每天安排固定的30-60分钟学习薄弱学科，从基础知识点入手，逐步攻克难点，提高对薄弱学科的掌控感。
                    </p>
                    <p><span>04.调整考试心态：</span>0考试前进行积极的心理暗示，如“我已经做好了充分准备，我能行”;考试过程中如果感到紧张，可正念呼吸3-5次，缓解紧张情绪。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">3、关于成就目标定向的建议</h3>
                    </div>
                    <p><span>01.学习设定具体目标：</span>从短期、具体的目标开始，如“本周掌握数学的一元二次方程解法”“明天背诵20个语文古诗”等，目标要清晰、可衡量，便于检查完成情况。
                    </p>
                    <p><span>02.学习分解任务：</span>以完成一次语文作文写作为例，将其分解为“确定作文主题(30 分钟)-收集作文素材(1 小时)-列作文提纲(40 分钟)-撰写作文初稿(2
                        小时)-修改作文(1小时)”等小步骤，逐步完成。
                    </p>
                    <p><span>03.养成定期检查进度的习惯：</span>每天晚上花 10 分钟回顾当天的学习任务完成情况，每周日晚上总结本周学习进度分析未完成任务的原因，及时调整下周学习计划。
                    </p>
                    <p><span>04.主动调整学习策略：</span>当发现某种学习方法效果不佳时，如用死记硬背的方式记英语单词效率低，可尝试联想记忆法、词根词缀记忆法等，找到适合自己的学习方法。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">4、关于学习动机的建议</h3>
                    </div>
                    <p><span>01.寻找学科兴趣点：</span>每个学科都有其有趣的一面，如数学中的逻辑推理、语文中的诗词意境、物理中的实验现象等，主动发现学科的有趣之处，培养学习兴趣。
                    </p>
                    <p><span>02.培养内在驱动：</span>制定“自主学习清单”，每周选择1-2个自己感兴趣的学习主题，如“探索宇宙的奥秘”“了解中国传统节日的起源”等，主动查阅资料、学习相关知识，逐步培养自主学习能力。
                    </p>
                    <p><span>03.树立正确的学习观念：</span>认识到学习不仅是为了分数，更是为了获取知识、提升能力，为未来的发展打下基础。每次学习后，思考自己从中学到了哪些新知识、掌握了哪些新技能，而不是只关注考试分数。
                    </p>
                    <p><span>04.培养毅力：</span>面对枯燥的学习任务时，如背诵英语语法规则，设定一个小目标，如“先背诵3条语法规则”，完成后再继续，逐步培养坚持的毅力;遇到困难时，不要轻易放弃，告诉自己“再尝试一次，也许就能解决“
                    </p>
                    <p><span>05.建立成长型思维：</span>明白能力不是天生的，而是可以通过努力不断提升的。当遇到不擅长的科目时，告诉自己“只要我努力学习，找到正确的方法，就一定能学好”，并积极采取行动，逐步提高学习成绩。
                    </p>
                    <p><span>06.缓解学习压力：</span>与父母、老师沟通，表达自己对考试成绩的担忧，寻求他们的理解和支持;通过运动、听音乐与朋友聊天等方式释放学习压力，保持良好的学习心态。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3 text-color">5、关于学生能感知到的支持的建议</h3>
                    </div>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">@学生的建议:</h3>
                    </div>
                    <p><span>01.主动与朋友沟通：</span>尝试主动与同学交流，从共同的兴趣爱好入手，如讨论喜欢的游戏、动漫、书籍等，逐步建立信任，然后分享自己的困惑和喜怒哀乐，寻求朋友的支持和理解。
                    </p>
                    <p><span>02.改善与家人的沟通：</span>选择合适的时机，如饭后散步、周末聊天时，向家人表达自己对学习压力、情绪状态的感受，希望家人能更多地关注自己的情绪，而不仅仅是成绩;当与父母有不同看法时，耐心听取他们的意见，同时也清晰地表达自己的想法，争取达成共识。
                    </p>
                    <p><span>03.主动寻求老师帮助：</span>当在学习中遇到困难时，不要害怕，主动向老师请教，告诉老师自己的困惑和问题，相信老师会给予有效的指导和帮助;也可以与老师分享自己的学习计划和目标，寻求老师的建议和支持。
                    </p>
                    <div class="pdf-title-h3">
                        <h3 class="title-h3">@家长建议:</h3>
                    </div>
                    <p><span>01.加强情感沟通：</span>每天抽出一定的时间与孩子交流，了解孩子的学习情况、生活趣事和情绪状态，认真倾听孩子的想法和感受，让孩子感受到家长的关心和重视;当孩子在学习中遇到挫折或情绪低落时，给予及时的安慰和鼓励,帮助孩子树立信心，缓解负面情绪。
                    </p>
                    <p><span>02.调整教育方式：</span>尊重孩子的个性和差异，不要将自己的期望强加给孩子，避免过度关注孩子的学习成绩，而是更多地关注孩子的学习过程和综合素质的提升;当孩子与自己有不同看法时，耐心听取孩子的意见，给予孩子表达自己想法的机会，与孩子一起探讨解决问题的方法，培养孩子的独立思考能力和自主意识。
                    </p>
                    <p><span>03.协助孩子构建支持系统：</span>鼓励孩子多与同学、朋友交往，教给孩子一些与人沟通的技巧和方法，帮助孩子建立良好的人际关系;与学校老师保持密切联系，及时了解孩子在学校的学习情况和表现，与老师共同探讨教育孩子的方法和策略，形成家校教育合力，为孩子提供更全面的支持。
                    </p>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, watchEffect, inject } from 'vue'
import PdfReport from './PdfReport.vue'
import { USER_INFO, ACCESS_TOKEN } from "@/shared/utils/mutation-types"
import {
    BarCharts,
    BarXCharts,
    BarYCharts,
    PieCharts,
    PieRCharts
} from "./Charts"
const emit = defineEmits(['forPdf']);
const nietz = inject('nietz')
import { getReportPdf } from "@/shared/utils/http"

const homeForm = ref([
    { label: "测评姓名", value: "" },
    { label: "测评编号", value: "" },
    { label: "测评日期", value: "" },
])

const podiumItems = ref([
    { label: "波动焦虑型", value: 2 },
    { label: "死磕傻学型", value: 1 },
    { label: "潜力待挖型", value: 3 }
])

const tableData = ref([
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" },
    { label: "波动焦虑型", value: "一到考试就爆砸，焦虑值直接拉满", a: "l", b: "h", c: "h" }
])

const pdfStyles = ``
const pdfRef = ref(null)
const loading = ref(false)
// function onExport() {
//     if (loading.value) {
//         return false;
//     }
//     loading.value = true;
//     pdfRef.value?.exportPdf();
//     setTimeout(() => {
//         loading.value = false;
//     }, 8000)
// }

</script>

<style scoped>
.user-pdf {
    position: relative;
    padding: 0.4rem 0.6rem 0.3rem;
}

.pdf-report {
    position: relative;
    width: 210mm !important;
    margin: 0 auto;

    .cover {
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
    }

    .page {
        padding: 10mm 12mm;
        break-after: page;
        position: relative;
        height: 297mm;
        background-color: #fff;
        margin-bottom: 10px !important;
    }

    /* 避免最后一页被强制分页造成空白页 */
    .page:last-child {
        break-after: auto;
        page-break-after: auto;
    }

    .pdf-container {
        position: relative;
        height: calc(277mm - 54px);
        width: 100%;
        padding: 10mm 0 0;
        overflow: hidden;
    }

    .pdf-content {
        position: relative;
        width: 100%;
        height: 100%;
        color: #000;
        overflow: hidden;
    }

    .pdf-footer {
        height: 70px;
        text-align: center;
        line-height: 70px;
        color: #878787;
        display: none;
    }

    /* 打印/导出隐藏源内容 */
    @media print {
        .no-print {
            display: none !important;
        }

        .pdf-report {
            box-shadow: none;
        }

        .page {
            page-break-after: always;
            margin-bottom: 0 !important;
        }

        .page:last-child {
            page-break-after: auto;
        }
    }

    /* 尽量避免中途断开（提示型，核心仍由 JS 控） */
    .pdf-content h1,
    .pdf-content h2,
    .pdf-content h3,
    .pdf-content h4,
    .pdf-content h5,
    .pdf-content h6,
    .pdf-content p,
    .pdf-content table,
    .pdf-content ul,
    .pdf-content ol,
    .pdf-content img,
    .pdf-content .block {
        break-inside: avoid;
        page-break-inside: avoid;
        color: #000;
    }

    .pdf-content img {
        max-width: 100%;
        height: auto;
    }

    /* 工具类 */
    .flex {
        display: flex;
    }

    .display-flex {
        display: flex;
    }

    .justify-center {
        justify-content: center;
    }

    .justify-between {
        justify-content: space-between;
    }

    .align-center {
        align-items: center;
        align-content: center;
    }

    .justify-end {
        justify-content: end;
    }

    .grid {
        display: grid;
    }

    .grid-cols-1 {
        grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    .grid-cols-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pdf-box {
        position: relative;
        width: 210mm !important;
        margin: 0 auto;
        color: #333;
    }

    .pdf-box ul {
        list-style: none;
        margin-bottom: 30px;
    }

    .pdf-index__form {
        width: 100%;
    }

    .pdf-box li {
        font-size: 16px;
        text-indent: 2em;
        line-height: 30px;
    }

    .pdf-box li span {
        font-size: 16px;
        font-weight: bold;
    }

    .pdf-box h3 {
        font-size: 15px;
        padding-bottom: 15px;
    }

    .pdf-box p {
        font-size: 13px;
        padding-bottom: 15px;
        line-height: 22px;
        color: #666;
    }

    .pdf-title {
        position: relative;
        padding-bottom: 20px;
    }

    .pdf-title h1 {
        position: relative;
        height: 30px;
        line-height: 30px;
        color: #3180C3;
        font-weight: bold;
        font-size: 20px;
        padding: 0 5px;
        z-index: 1;
    }


    .pdf-title h1::after {
        position: absolute;
        content: "";
        left: 0;
        height: 6px;
        right: 0;
        bottom: 2px;
        z-index: -1;
        background-color: rgba(49, 128, 195, 0.5);

    }




    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        margin-top: 5px;
        border: 1px solid #3180C3;
    }

    table thead {
        color: #000;
        background-color: #DBE3F4;

    }

    table th,
    table td {
        border: 1px solid #3180C3;
        padding: 12px 15px;
        text-align: left;
        text-align: center;
        color: #000;
        font-size: 15px;
    }

    table th {
        font-size: 15px;
        padding: 15px;
    }

    table tr {
        background-color: #fff;
    }

    table td:nth-child(1) {
        width: 20%;
    }

    table td:nth-child(2) {
        width: 20%;
    }

    table td:nth-child(3) {
        width: 60%;
    }


    table th {
        font-weight: bold;
    }

    table tr:nth-child(even) {
        background-color: #f9f9f9;
    }

    .td-content {
        width: 80%;
        margin: 0 auto;
    }

    .td-item {
        height: 20px;
        line-height: 20px;
    }

    .td-item .td-num {
        padding: 0 5px;
        flex-shrink: 0;
        width: 36px;
        text-align: center;
    }

    .td-item .td-border {
        border: 2px solid #3180C3;
        width: 100%;
        position: relative;
    }


    .td-item .td-border-min {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        background-color: #fff;
        z-index: 3;
    }

    .td-item .td-border-max {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        background-color: #3180C3;
        z-index: 2;
    }

    .pdf-report {
        position: relative;
        width: 210mm !important;
        margin: 0 auto;
    }

    .cover {
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
    }

    .pdf-header {
        position: relative;
        width: 100%;
    }

    .pdf-header::before {
        position: absolute;
        content: "";
        bottom: 0;
        left: -12mm;
        right: -12mm;
        height: 2px;
        background-color: #3180C3;
    }

    .pdf-header::after {
        position: absolute;
        content: "";
        bottom: -4px;
        left: -12mm;
        right: -12mm;
        height: 1px;
        background-color: #3180C3;
    }

    .pdf-header__logo {
        width: 140px;
        height: 100%;
        background-image: url("/pdf/logo.png");
        background-repeat: no-repeat;
        background-size: cover;
        background-position: left center;
    }

    .pdf-header__name {
        height: 18px;
        text-align: right;
        color: #3180C3;
        font-size: 12px;
        font-weight: bold;
    }

    .pdf-header__text {
        height: 18px;
        line-height: 18px;
        color: #3180C3;
        font-size: 12px;
    }

    .pdf-header__text span {
        padding-left: 20px;
    }

    .td-item .td-border-text {
        text-align: right;
    }


    .td-item .td-border-none .td-border-min {
        color: #3180C3;
    }

    .td-item .td-border-none .td-border-max {
        color: red;
        margin-left: 18px;
    }

    .pdf-footer {
        height: 70px;
        text-align: center;
        line-height: 70px;
        color: #666;
    }


    .pdf-index__title {
        position: relative;
        width: 100%;
        text-align: center;
        font-size: 50px;
        padding-top: 50mm;
        padding-bottom: 5mm;
        color: #000;
        font-weight: 600;
    }

    .pdf-index__subtitle {
        position: relative;
        width: 100%;
        text-align: center;
        font-size: 33px;
        padding-top: 5mm;
        padding-bottom: 40mm;
        color: #000;
        font-weight: 600;
    }

    .pdf-index__line {
        width: 80px;
        height: 6px;
        background-color: #3180C3;
        margin: 0 auto;
        border-radius: 3px;
    }

    .pdf-index__item {
        position: relative;
        width: 100%;
        height: 14mm;

    }

    .pdf-index__value {
        width: 250px;
        height: 40px;
        line-height: 40px;
        font-size: 20px;
        color: #000;
        font-weight: 500;
    }

    .pdf-index__unit {
        flex-shrink: 0;
        width: 10px;
        font-size: 20px;
        text-align: center;
    }

    .pdf-index__text {
        width: 100%;
        margin: 0 5px;
        height: 40px;
        line-height: 40px;
        background-color: #fff;
    }


    .pdf-index__label {
        font-size: 20px;
        height: 40px;
        line-height: 40px;
        color: #000;
        width: 100px;
        text-align: right;
    }

    .pdf-content {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .page-index {
        &::after {
            position: absolute;
            content: "";
            top: 0;
            left: 0;
            right: 0;
            height: 360px;
            background: url("/pdf/top.png") no-repeat top right;
            background-size: cover;
        }

        &::before {
            position: absolute;
            content: "";
            bottom: 0;
            left: 0;
            right: 0;
            height: 476px;
            background: url("/pdf/bottom.png") no-repeat bottom left;
            background-size: cover;
        }
    }

    .page-index .pdf-footer {
        position: absolute;
        left: 0;
        right: 0;
        text-align: center;
        z-index: 1;
    }

    .page-index .pdf-header {
        display: none
    }

    .page-index .pdf-container {
        margin-top: 50px;
    }

    .pdf-container__logo {
        position: absolute;
        top: 68px;
        left: 60px;
        width: 146px;
        height: 47px;
        background-image: url("/pdf/logo.png");
    }

    .pdf-chart {
        position: relative;
        width: 100%;
    }

    .pdf-chart__th {
        position: relative;
        width: 100%;
        height: 20px;

    }

    .pdf-chart__label {
        position: relative;
        width: 30px;
        text-align: right;
        flex-shrink: 0;
    }

    .pdf-chart__label .text {
        position: absolute;
        top: 10px;
        left: 0;
        right: 0;
        padding-right: 3px;
        color: #999;
        z-index: 1;
    }

    .label-text {
        background-color: yellow;
        position: relative;
        width: 100%;
        height: 100%;
    }

    .label-text-value {
        transform: rotate(-60deg);
        transform-origin: right center;
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(5px -50%) rotate(-60deg);
        font-size: 14px;
        white-space: nowrap;
        margin: 0;
        padding: 0;
    }

    .pdf-chart__border {
        width: 100%;
        height: 20px;
        position: relative;
        border-bottom: 1px solid #E3E3E3;
    }

    .pdf-chart__box {
        position: relative;
        margin-bottom: 20px;
        padding-top: 5px;
    }

    .pdf-chart__content {
        position: absolute;
        top: 0;
        left: 30px;
        right: 0;
        bottom: 0;
        z-index: 1;
    }

    .pdf-chart__bottom {
        padding-left: 30px;
        height: 20px;
    }

    .pdf-chart__item {
        height: 20px;
        line-height: 20px;
        text-align: center;
        color: #999;
        position: relative;
    }

    .pdf-chart__item .value {
        position: absolute;
        width: 40%;
        left: 50%;
        margin-left: -20%;
        bottom: 20px;
        z-index: 2;
        background: linear-gradient(180deg, rgba(252, 214, 69, 1) 0%, rgba(248, 128, 6, 1) 100%);
    }

    .pdf-chart__item .value-text {
        position: absolute;
        top: -26px;
        font-size: 16px;
        color: #000;
        width: 100%;
        text-align: center;
    }

    .table-tbody-child {
        background: #f1f1f1 !important;
    }

    .table-tbody-child .td-item .td-border {
        border: 2px solid #41901C;
        height: 10px;
        margin-top: 5px;
    }

    .table-tbody-child .td-item .td-border-max {
        background-color: #41901C;
    }

    .td-item .td-border-none .td-border-text {
        background: none;
    }

    .td-item .td-border-none,
    .table-tbody-child .td-item .td-border-none {
        background: none;
        border: none;
    }

    table td {
        font-weight: 600;
        font-size: 14px;
    }

    table .table-tbody-child td {
        font-weight: 300;
    }

    .pdf-chart-long {
        margin-bottom: 90px;
    }

    .pdf-box h3.title-h3 {
        font-size: 15px;
        color: #000;
        font-weight: 600;
        padding-bottom: 10px;
    }

    .pdf-title-h3 {
        padding-top: 10px;
    }

    .pdf-info {
        position: relative;
        padding: 25px;
        background-color: rgba(216, 216, 216, 0.2);
        margin-bottom: 20px;
    }

    .pdf-info-image {
        width: 140px;
        height: 176px;
        flex-shrink: 0;
        margin-left: 25px;
    }

    .pdf-info-title {
        text-align: center;
        color: #3180C3;
        font-weight: 600;
        font-size: 15px;
    }

    .pdf-info-content {
        color: #666666;
    }

    .pdf-info-chart {
        position: relative;
        width: 100%;
        height: 360px;
        background-color: yellow;
    }
}
</style>