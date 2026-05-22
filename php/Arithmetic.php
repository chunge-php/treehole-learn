<?php

namespace app\modules\myclass;

use app\modules\dimension\pluralism\model\Pluralism;
use app\modules\dimension\report\model\Report;
use support\Db;

class Arithmetic
{

    protected $ReportData = [];
    protected $pluralismData = [];
    /**
     * 传入【总题数 + 答对题数】，自动判断每项是否高分
     *
     * @param array $ranges 格式如下：
     *   [
     *      'time'        => [4, 3], //总题数,答对题数
     *      'confidence'  => [4, 2],
     *      'achievement' => [7, 5],
     *      'motivation'  => [7, 4],
     *      'support'     => [5, 1],
     *   ]
     */
    //自称量表 算法
    /**
     * 高分判定：答对题数 >= 总题目数 * 0.5  就算高分
     */
    public function evaluateStudyProfile(array $ranges): array
    {
        $details = [];
        $highCount = 0;
        $total_points = 0; //总分
        foreach ($ranges as $key => [$total, $correct]) {

            // 答对 ≥ 50%（包含等于）就算高分
            $minCorrect = ceil($total * 0.5);
            $isHigh = $correct >= $minCorrect;
            $result = '';
            $proposal = '';
            if ($isHigh) {
                $total_points++;
                $reporting_data = $this->selfReportingScale($key, '高');
                if ($reporting_data) {
                    list($result, $proposal, $title) = $reporting_data;
                }
            } else {
                $reporting_data = $this->selfReportingScale($key, '低');
                if ($reporting_data) {
                    list($result, $proposal, $title) = $reporting_data;
                }
            }
            $details[$key] = [
                'total'      => $total,
                'correct'    => $correct,
                'minCorrect' => $minCorrect, // 计算出的最低高分门槛
                'isHigh'     => $isHigh ? 1 : 0,     // 是否为高分（true/false）
                'result' => $result, //$result,
                'title' => $title, //$result,
                'proposal' => $proposal //$proposal
            ];

            if ($isHigh) $highCount++;
        }

        // 结果等级判断
        $levelMap = [
            5 => '五项为高分',
            4 => '四项为高分',
            3 => '三项为高分',
            2 => '两项为高分',
            1 => '一项为高分',
            0 => '0项为高分',
        ];

        // 高分组合或低分组合
        $group = ($highCount >= 3) ? 1 : 0;

        return [
            'group'     => $group,
            'total_points' => $total_points,
            'level'     => $levelMap[$highCount],
            'highCount' => $highCount,
            'details'   => $details
        ];
    }
    /**
     * 自陈量表结果匹配
     */
    public function selfReportingScale($key, $type)
    {
        // 定义常量，避免使用魔术数字 0/1
        $TYPE_RESULT   = 0;
        $TYPE_PROPOSAL = 1;
        $TYPE_TITLE = 2;

        // 如果已经缓存过，直接取
        if (isset($this->ReportData[$key][$type])) {
            return $this->ReportData[$key][$type];
        }

        // 如果未构建数据，则只构建一次
        if (empty($this->ReportData)) {
            // $reports = Report::select(['name', 'level', 'result', 'proposal'])->get();
            $reports = config('reportData') ?? [];
            // 结构化数据
            foreach ($reports as $item) {
                $this->ReportData[$item['name']][$item['level']] = [
                    $TYPE_RESULT   => $item['result']   ?? '',
                    $TYPE_PROPOSAL => $item['proposal'] ?? [],
                    $TYPE_TITLE => $item['title'] ?? '',
                ];
            }
        }

        // 返回数据，如果不存在则返回空数组
        return $this->ReportData[$key][$type] ?? [];
    }

    /**
     * 多元结果解读  逻辑思维 阅读力 专注力
     * @return array|null
     */
    public function multielementResult($arr)
    {
        $data = [
            '逻辑思维0' => '要么整体思维基础薄弱（三维度均难以解构问题），要么存在 “致命短板”（如数字概念推理≤20 分，导致无法衔接逻辑与空间任务），理科解题、抽象知识理解易遇阻。',
            '逻辑思维1' => '具备 “空间想象 - 数字规律 - 逻辑演绎” 的协同思维能力，能应对跨维度复杂任务（如几何证明需空间 + 逻辑、数据分析需数字 + 逻辑），理科学习（数学、物理）中易展现优势，抽象问题理解与解决效率高。',
            '阅读能力0' => '具备 “语义深度理解 + 语法规范应用” 的综合阅读能力，能精准解读文本隐含意义（如语文阅读题）、规范表达（如写作），语文、英语学科中阅读与写作优势显著。',
            '阅读能力1' => '在阅读力表现上，要么难以精准理解语义（如混淆近义词、误解文本），要么语法应用混乱（如写作语病多），或两者兼具，语文阅读题失分多、写作质量低，影响语言类学科学习。',
            '专注力0' => '注意力易分散，细节处理粗心（如作业频繁看错数字）',
            '专注力1' => '注意力集中，视知觉加工高效（如文书处理不易出错）'
        ];
        $res = [];
        foreach ($arr as $key => $value) {
            $res[] = [
                'value' => $value,
                'title' => $key,
                'content' => $data[$key . $value] ?? ''
            ];
        }
        return  $res;
    }
    /**
     * 多元性向得分算法
     *
     * @param int[] $results  每题结果：正确=1，错误=0，比如 [1,0,1,1,0,...]
     * @param string $name  项目名称
     * @return array          最终得分（满分100）
     */
    public function calcScoreByResults(array $results, $name = ''): array
    {
        $total = count($results);
        if ($total === 0) {
            $result = $this->getCalcScoreByResultsName($name, 0);
            return [
                'number' => 0,
                'name' => $result['name'],
                'result' => $result['result'],
            ]; // 没有题目就0分
        }

        // 统计答对题数（结果为1的个数）
        $correct = 0;
        foreach ($results as $v) {
            // 防守性处理：只把值为1当成正确
            if ((int)$v === 1) {
                $correct++;
            }
        }

        // 按比例计算得分：正确率 × 100
        // $score = ($correct / $total) * 100;

        // 保留两位小数（可以根据需要调整）
        // $number =  round($score, 2);
        $number = $this->getPrContrast($name, $correct);
        $result = $this->getCalcScoreByResultsName($name, $number);
        return [
            'number' => $number,
            'name' => $result['name'] ?? '',
            'result' => $result['result'],
        ];
    }
    /**
     * 八维学格 获取
     *
     * @param int $multimode_result 多模态结果 1高0低
     * @param int $multiple_result  多元性结果 1高0低
     * @param int $report_result    自陈结果 1高0低
     * @return array
     */
    public function getOctupleName(int $multimode_result, int $multiple_result, int $report_result): array
    {
        // 统一限制一下输入，防止传 2、-1 等异常值
        $multimode_result = $multimode_result ? 1 : 0;
        $multiple_result  = $multiple_result ? 1 : 0;
        $report_result    = $report_result ? 1 : 0;

        // 拼成三位 key，例如 "011"、"100"
        $key = $multimode_result . $multiple_result . $report_result;

        // 映射表：key => 类型名称
        $map = [
            '0' . '1' . '1' => '波动焦虑型', // 低 高 高
            '0' . '0' . '1' => '死磕傻学型', // 低 低 高
            '0' . '0' . '0' => '摆烂到底型', // 低 低 低
            '1' . '1' . '1' => '稳定卓越型', // 高 高 高
            '1' . '0' . '1' => '策略僵化型', // 高 低 高
            '1' . '0' . '0' => '佛系躺平型', // 高 低 低 
            '1' . '1' . '0' => '动力缺失型', // 高 高 低
            '0' . '1' . '0' => '潜力待挖型', // 低 高 低
        ];

        // 返回对应名称，如果没匹配上就给一个默认值
        $res =  $map[$key] ?? '未知类型';
        return  [
            'type' => $res,
            'str' => $this->getUserTypeName($res),
        ];
    }
    public function getUserTypeName($str)
    {
        $data = [
            '波动焦虑型' => '情绪管理',
            '死磕傻学型' => '学习策略',
            '摆烂到底型' => '学习状态',
            '稳定卓越型' => '',
            '策略僵化型' => '学习方法',
            '佛系躺平型' => '学习心态',
            '动力缺失型' => '学习动力',
            '潜力待挖型' => '学习潜力',
        ];
        return $data[$str] ?? '';
    }


    /**
     * pr对照表得分情况
     * @param string $name
     * @param int $number
     */
    public function getPrContrast($name, $number)
    {
        if ($name == '' || $number <= 0) {
            return 0;
        }
        $data = [
            '语文辞意推理' => [1, 1, 1, 1, 1, 1, 1, 1, 2, 4, 5, 8, 11, 17, 23, 34, 48, 69, 90, 99],
            '数字概念推理' => [1, 2, 5, 12, 22, 35, 50, 64, 75, 85, 91, 95, 98, 99, 99, 99, 99, 99, 99, 99],
            '抽象逻辑推理' => [1, 1, 1, 1, 1, 2, 2, 2, 3, 5, 5, 7, 11, 18, 29, 42, 62, 79, 92, 99],
            '知觉速度统合' => [
                1,
                1,
                1,
                1,
                1,
                1,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                2,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                3,
                4,
                4,
                5,
                5,
                5,
                5,
                5,
                5,
                6,
                6,
                7,
                8,
                8,
                9,
                10,
                11,
                13,
                15,
                18,
                22,
                28,
                33,
                37,
                41,
                45,
                49,
                53,
                57,
                60,
                65,
                69,
                74,
                77,
                80,
                82,
                85,
                86,
                89,
                90,
                93,
                96,
                99,
                99
            ],
            '立体空间推理' => [
                1,
                1,
                1,
                1,
                2,
                5,
                9,
                13,
                21,
                30,
                40,
                51,
                62,
                73,
                83,
                92,
                98,
                99,
                99,
                99,
                99,
                99,
                99,
                99

            ],
            '中文语法结构' => [
                1,
                1,
                2,
                4,
                5,
                7,
                9,
                13,
                19,
                27,
                39,
                51,
                66,
                79,
                89,
                95,
                98,
                99,
                99,
                99

            ]
        ];
        return $data[$name][$number - 1] ?? 0;
    }
    /**
     * 多元性向 根据分数判断高低
     * @param array $results
     * @return array
     */
    public function getCalcScoreByResultsName($name, $number)
    {
        if (empty($this->pluralismData)) {
            // $res = Pluralism::select(['name',  'subitems', 'number'])->get()->toArray();
            $res = config('pluralism') ?? [];
            foreach ($res as $item) {
                $this->pluralismData[$item['subitems']] = [
                    'name' => $item['name'],
                    'number' => $item['number'],
                ];
            }
        }
        if (isset($this->pluralismData[$name])) {
            if ($number >= $this->pluralismData[$name]['number']) {
                return [
                    'name' => $this->pluralismData[$name]['name'],
                    'result' => 1
                ];
            } else {
                return [
                    'name' => $this->pluralismData[$name]['name'],
                    'result' => 0
                ];
            }
        }
        return [];
    }

    //--------------------------兴趣算法---------------------------------

    /**
     * 兴趣算法结果获取
     * @param array $answers
     * @return array{career: array, diff_level: string, diff_value: float, scores: array, self_introduce: string, top3: string}
     */
    public function getInterestResult(array $answers)
    {
        // 1. RIASEC题号映射 六个兴趣码对应题号
        $codes = [
            'R' => [1, 11, 15, 20, 25, 35, 39, 44, 52, 59, 61, 69, 75, 84, 87, 92, 98, 106, 112, 118, 124, 128, 133, 144, 150, 153, 158, 165, 169, 177],
            'I' => [5, 9, 14, 24, 28, 31, 37, 46, 54, 60, 65, 71, 73, 82, 89, 96, 99, 104, 109, 120, 126, 130, 136, 141, 145, 154, 162, 167, 173, 176],
            'A' => [2, 10, 13, 22, 26, 36, 42, 47, 49, 56, 66, 70, 76, 80, 85, 95, 97, 108, 111, 119, 121, 132, 134, 142, 146, 155, 157, 168, 171, 179],
            'S' => [4, 7, 17, 21, 27, 32, 40, 45, 50, 57, 62, 67, 77, 81, 88, 93, 100, 103, 113, 117, 122, 131, 137, 139, 149, 152, 159, 166, 174, 180],
            'E' => [3, 12, 16, 19, 29, 33, 38, 48, 51, 55, 64, 72, 78, 83, 86, 91, 101, 105, 114, 116, 125, 127, 135, 140, 148, 156, 161, 163, 172, 175],
            'C' => [6, 8, 18, 23, 30, 34, 41, 43, 53, 58, 63, 68, 74, 79, 90, 94, 102, 107, 110, 115, 123, 129, 138, 143, 147, 151, 160, 164, 170, 178],
        ];

        // 2. 职业/学类推荐 (自行扩充)
        $careerMap = [
            'R' => ['实用型'],
            'I' => ['研究型'],
            'A' => ['艺术型'],
            'S' => ['社会型'],
            'E' => ['企业型'],
            'C' => ['事务型'],
        ];

        // ----------------  算则1：计算六码总分  ----------------
        $scores = [];
        $scores_arr = [];
        foreach ($codes as $code => $questionList) {
            $sum = 0;
            foreach ($questionList as $q) {
                $sum += $answers[$q] ?? 0;
            }
            // 转成 0~100 分
            $scores[$code] = round($sum * 25 / 30, 2);
            $scores_arr[$code] = [
                'title' => $careerMap[$code][0] ?? '',
                'value' => $scores[$code],
            ];
        }

        // 按分数排序 (高 → 低)
        arsort($scores);
        $top3 = array_slice(array_keys($scores), 0, 3);       // [S, E, A]
        $topValues = array_slice($scores, 0, 3);              // [92, 85, 74]
        $career_name = $careerMap[$top3[0]][0] ?? '';
        // ----------------  算则2：区分性计算  ----------------
        $X1 = reset($topValues);
        $X2 = next($topValues);
        $X3 = next($topValues);

        $D = ($X1 - ($X2 + $X3) / 2) / 2;
        if ($D > 0.33) {
            $diffLevel = '高';
        } elseif ($D < 0.18) {
            $diffLevel = '低';
        } else {
            $diffLevel = '中';
        }

        // ----------------  算则3：自我介绍码(181~183题)  ----------------
        $mapSelf = ['R', 'I', 'A', 'S', 'E', 'C'];
        $self = '';
        for ($i = 181; $i <= 183; $i++) {
            if (isset($answers[$i])) {
                $self .= $mapSelf[($answers[$i] ?? 1) - 1];
            }
        }

        // ----------------  算则4：推荐学类专业  ----------------
        $recommend = [];
        $top3_arr = [];
        foreach ($top3 as $k => $code) {
            $top3_arr[] = [
                'title' => $careerMap[$code][0] ?? '',
                'value' => $code
            ];
            $stars = $k == 0 ? 3 : ($k == 1 ? 2 : 1);
            $recommend[] = [
                'code'   => $code,
                'stars'  => $stars,
                'majors' => $careerMap[$code] ?? []
            ];
        }
        $top3 = implode('', $top3);
        // ----------------  算则5：谐和度  ----------------
        // self 与 scores 的比较：将 self 转为向量，如 "SEA" => S=1,E=1,A=1,其他为0
        $selfVector = array_fill_keys(['R', 'I', 'A', 'S', 'E', 'C'], 0);
        foreach (str_split($self) as $code) {
            if (isset($selfVector[$code])) {
                $selfVector[$code] += 1;
            }
        }

        // 兴趣向量：即 $scores，本身就是 0~100 分
        $interestVector = $scores;

        // 计算余弦相似度
        $dot = 0;
        $magA = 0;
        $magB = 0;
        foreach (['R', 'I', 'A', 'S', 'E', 'C'] as $c) {
            $dot  += $selfVector[$c] * $interestVector[$c];
            $magA += pow($selfVector[$c], 2);
            $magB += pow($interestVector[$c], 2);
        }
        $harmony = ($magA * $magB) == 0 ? 0 : $dot / (sqrt($magA) * sqrt($magB));

        // 谐和度等级
        if ($harmony >= 0.85) {
            $harmonyLevel = '高';
        } elseif ($harmony >= 0.65) {
            $harmonyLevel = '中上';
        } elseif ($harmony >= 0.45) {
            $harmonyLevel = '普通';
        } else {
            $harmonyLevel = '低';
        }
        // ----------------  返回最终结果  ----------------
        return [
            'career_name' => $career_name, //小三码倾向第一个的 名称
            'scores'        => $scores,          // 六码分数
            'scores_arr' => $scores_arr,
            'top3'          => $top3, // 小三码字符串，如 "SEA"
            'top3_arr' => $top3_arr,
            'diff_value'    => round($D, 3),
            'diff_level'    => $diffLevel,
            'self_introduce' => $self,
            'career'        => $recommend,
            'harmony_value' => round($harmony, 3),  // ★谐和度数值
            'harmony_level' => $harmonyLevel,        // ★谐和度等级
            'majors_data' => $this->matchInterestMajorsByTop3($top3)
        ];
    }
    //通过兴趣类型获取传奇人物姓名
    public function interestUserName($name)
    {
        $data = [
            '实用型' => [
                'name' => '爱迪生',
                'img' => 4
            ],
            '研究型' => [
                'name' => '爱因斯坦',
                'img' => 5
            ],
            '艺术型' => [
                'name' => '梵高',
                'img' => 1
            ],
            '社会型' => [
                'name' => '孔子',
                'img' => 3
            ],
            '企业型' => [
                'name' => '胡雪岩',
                'img' => 6
            ],
            '事务型' => [
                'name' => '王安石',
                'img' => 2
            ],
        ];
        return $data[$name] ?? [
            'name' => '',
            'img' => 0
        ];
    }

    /**
     * 根据小三码（如 SEA）匹配职业对照表，返回推荐学类专业
     *
     * 匹配规则简化版：
     * 1. 先根据小三码生成所有可能的两位组合：SE, EA, SA, ES, AE, AS
     * 2. 遍历你的对照表（code1 ~ code5 每个都是两位码，如 SI, SA, SE）
     * 3. 只要某行的任意 codeX 出现在这些两位组合中，就认为这行匹配
     * 4. 星级规则：
     *      - 匹配到 code1 → 3 颗星
     *      - 匹配到 code2 → 2 颗星
     *      - 匹配到 code3~5 → 1 颗星
     *
     * @param string $top3 小三码，如 "SEA"
     * @return array[] 每项结构：
     * [
     *   'major'      => '学类专业',
     *   'category'   => '学科门类',
     *   'match_code' => 'SA',   // 命中的那一个 codeX
     *   'stars'      => 3       // 3 / 2 / 1 星
     * ]
     */
    public function matchInterestMajorsByTop3(string $top3): array
    {
        $top3 = strtoupper(trim($top3));
        if (strlen($top3) < 2) {
            return [];
        }

        // 1. 从小三码生成所有两位组合（有顺序）
        $letters = str_split($top3);
        $pairs = [];

        for ($i = 0; $i < count($letters); $i++) {
            for ($j = 0; $j < count($letters); $j++) {
                if ($i === $j) continue;
                $pairs[] = $letters[$i] . $letters[$j];
            }
        }
        $pairs = array_values(array_unique($pairs)); // 去重

        // 2. 你的职业对照表（这里只写了部分，剩下的你按同样格式补上即可）
        $table = [
            // code1, code2, code3, code4, code5, 学類專業, 學科門類

            // 哲学类
            ['codes' => ['SI', 'SA', 'SE',  '',  ''], 'major' => '宗教学',       'category' => '哲学'],
            ['codes' => ['AS', 'SA', 'AI',  '',  ''], 'major' => '哲学',         'category' => '哲学'],

            // 经济学
            ['codes' => ['ES', 'EC', 'CE', 'CS', ''], 'major' => '會計',         'category' => '经济学'],
            ['codes' => ['ES', 'EC', 'CE', 'CS', ''], 'major' => '金融学',       'category' => '经济学'],
            ['codes' => ['ES', 'EC', 'EA', 'CS', ''], 'major' => '经济与贸易类', 'category' => '经济学'],
            ['codes' => ['ES', 'EC', 'CE', 'CS', ''], 'major' => '财政学类',     'category' => '经济学'],
            ['codes' => ['ES', 'EC', 'CE', 'CS', ''], 'major' => '保险学',       'category' => '经济学'],
            ['codes' => ['ES', 'EC', 'CE', 'EI', ''], 'major' => '经济学',       'category' => '经济学'],

            // 法学
            ['codes' => ['SI', 'SA', 'SE', '',   ''], 'major' => '社会学',         'category' => '法学'],
            ['codes' => ['SI', 'SE', 'SA', 'ES', ''], 'major' => '社会工作',       'category' => '法学'],
            ['codes' => ['SI', 'SA', 'SE', '',   ''], 'major' => '民族学',         'category' => '法学'],
            ['codes' => ['SI', 'SE', 'SA', 'AS', ''], 'major' => '家政学',         'category' => '法学'],
            ['codes' => ['SI', 'SA', 'SE', 'ES', ''], 'major' => '犯罪学',         'category' => '法学'],
            ['codes' => ['ES', 'EA', 'EI', 'SE', ''], 'major' => '法学类',         'category' => '法学'],
            ['codes' => ['ES', 'EA', 'EI', 'SA', ''], 'major' => '政治学与行政学', 'category' => '法学'],
            ['codes' => ['ES', 'EA', 'EI', 'SA', ''], 'major' => '马克思主义理论类', 'category' => '法学'],

            // 教育学（示例）
            ['codes' => ['IR', 'RI', 'IS', 'SI', ''], 'major' => '教育技术学',     'category' => '教育学'],
            ['codes' => ['SE', 'IS', 'SR', '',  ''], 'major' => '运动人体科学',   'category' => '教育学'],
            ['codes' => ['SI', 'SA', 'SE', 'AS', ''], 'major' => '教育学',         'category' => '教育学'],
            ['codes' => ['SA', 'SE', '',   '',  ''], 'major' => '特殊教育',       'category' => '教育学'],
            ['codes' => ['SE', 'SA', 'AS', '',  ''], 'major' => '学前教育',       'category' => '教育学'],
            ['codes' => ['SE', 'SA', 'AS', 'SR', ''], 'major' => '体育教育',       'category' => '教育学'],

            // ……此处请你把后面表格的内容，按同样格式继续往下补完即可
        ];

        $results = [];

        foreach ($table as $row) {
            $codes = array_filter(array_map('trim', $row['codes'])); // 去掉空 code
            $bestIndex = null;
            $bestCode  = null;

            foreach ($codes as $idx => $code) {
                if (in_array($code, $pairs, true)) {
                    // 记录最靠前的匹配（code1 优先，再 code2，再 code3..）
                    if ($bestIndex === null || $idx < $bestIndex) {
                        $bestIndex = $idx;
                        $bestCode  = $code;
                    }
                }
            }

            if ($bestIndex !== null) {
                // 星级：code1 → 3星, code2 → 2星, 其余 → 1星
                $stars = $bestIndex === 0 ? 3 : ($bestIndex === 1 ? 2 : 1);

                $results[] = [
                    'major'      => $row['major'],
                    'category'   => $row['category'],
                    'match_code' => $bestCode,
                    'stars'      => $stars,
                ];
            }
        }

        // 按星级从高到低，再按专业名称排序
        usort($results, function ($a, $b) {
            if ($a['stars'] === $b['stars']) {
                return strcmp($a['major'], $b['major']);
            }
            return $b['stars'] <=> $a['stars'];
        });

        return $results;
    }


    //---------------------------兴趣和学格匹配---------------------------------
    public function getXueGeName($name)
    {
        $data = [
            '波动焦虑型' => [
                'title' => '脆弱的',
                'describe' => '（一到考试就考砸，焦虑值拉满）'
            ],
            '死磕傻学型' => [
                'title' => '执着的',
                'describe' => '（傻学蛮干，埋头硬冲到底）'
            ],
            '摆烂到底型' => [
                'title' => '摆烂的',
                'describe' => '（完全躺平，内心毫无波澜）'
            ],
            '稳定卓越型' => [
                'title' => '稳健的',
                'describe' => '（全能无短板，学霸天花板）'
            ],
            '策略僵化型' => [
                'title' => '固执的',
                'describe' => '（学习方法老套，低效到没救）'
            ],
            '佛系躺平型' => [
                'title' => '淡然的',
                'describe' => '（彻底摆烂，自我放弃到极致）'
            ],
            '动力缺失型' => [
                'title' => '倦怠的',
                'describe' => '（内驱力彻底告急，毫无冲劲）'
            ],
            '潜力待挖型' => [
                'title' => '潜力巨大的',
                'describe' => '（黑马属性拉满，潜力待挖掘）'
            ],
        ];
        return $data[$name] ?? ['title' => '无', 'describe' => '无'];
    }

    /**
     * 评语内容获取
     * @param string $xuege 学格
     * @param string $interest 兴趣
     */
    public function interestContent($xuege, $interest)
    {
        $data = config('interestContent') ?? [];
        return $data[$xuege . '+' . $interest] ?? [
            'name' => '无',
            'content' => '无',
        ];
    }
    //---------------------------多模态算法---------------------------------

    /**
     * 多模态花瓣分数计算
     *
     * @param int|float $state   状态焦虑（X）
     * @param int|float $trait   特质焦虑（X）
     * @param int|float $stress  感知压力（原始分）
     * @return int          2 / 1 / 0；如果不在任何区间中返回
     */
    public function calcMultiModalPetalScore($state, $trait, $stress)
    {
        // 状态焦虑分界：<33、33-56、>=57
        $stateHigh    = ($state >= 57);
        $stateLowMid  = ($state < 57);  // 对应 X<33 和 33≤X<57 的整体

        // 特质焦虑分界：<34、34-51、>=57（注意你表里是 34≤X<52 和 X≥57，中间 52-56 没给规则）
        $traitHigh    = ($trait >= 57);
        $traitLowMid  = ($trait < 52);  // 对应 X<34 和 34≤X<52

        // 感知压力：14–28、29–42、43–70
        $stressLowMid = ($stress >= 14 && $stress <= 42);  // 14-28、29-42
        $stressHigh   = ($stress >= 43 && $stress <= 70);  // 43-70

        // 1) 多模态高分组合 → 得 2 分
        // 条件：状态 <57 且 特质 <52 且 感知压力 14-42 分
        // 对应你表中前 8 行所有组合
        if ($stateLowMid && $traitLowMid && $stressLowMid) {
            return 2;
        }

        // 2) 多模态低分组合 → 得 1 分
        // 2-1) 感知压力高（43-70），但状态/特质都还没到“高分”区（<57 / <52）
        // 对应：X<33 / 33≤X<57 × X<34 / 34≤X<52 × 43-70
        if ($stressHigh && $stateLowMid && $traitLowMid) {
            return 1;
        }

        // 2-2) 状态或特质有一个高分（>=57），但不是两个都高；感知压力为中等（14-42）
        // 对应你表中：
        //  - X≥57 × X<34 / 34≤X<52 × 14-42
        //  - X<33 / 33≤X<57 × X≥57 × 14-42
        if ($stressLowMid && ($stateHigh xor $traitHigh)) {
            return 1;
        }

        // 3) 多模态低分组合 → 得 0 分
        // 3-1) 状态和特质都是高分（>=57），无论感知压力是 14-28、29-42 还是 43-70
        // 对应：X≥57 × X≥57 × 14-28 / 29-42 / 43-70
        if ($stateHigh && $traitHigh && ($stressLowMid || $stressHigh)) {
            return 0;
        }

        // 3-2) 感知压力高（43-70），且“状态高或特质高”（但不是两个都低）
        // 对应：
        //  - X≥57 × X<34 / 34≤X<52 × 43-70
        //  - X<33 / 33≤X<57 × X≥57 × 43-70
        if ($stressHigh && ($stateHigh xor $traitHigh)) {
            return 0;
        }

        // 如果你之后补充了 52-56 那一段特质区间的规则，可以在这里继续加
        // 目前：不在任何已定义的区间就返回 null，方便你后面排查边界问题
        return 0;
    }

    /**
     * 一次性计算：状态焦虑、特质焦虑、学习压力 的 高+/高-/低
     * @param float|int $stateScore 状态焦虑分
     * @param float|int $traitScore 特质焦虑分
     * @param float|int $studyScore 学习压力分
     * @return array [
     *   'state' => '高+|高-|低',
     *   'trait' => '高+|高-|低',
     *   'study' => '高+|高-|低',
     * ]
     */
    public function calcAllLevels($stateScore, $traitScore, $studyScore): array
    {
        // 1. 状态焦虑
        if ($stateScore < 33) {
            $stateLevel = 2;
        } elseif ($stateScore < 57) { // 33 ≤ X < 57
            $stateLevel = 1;
        } else {                      // X ≥ 57
            $stateLevel = 0;
        }

        // 2. 特质焦虑
        if ($traitScore < 34) {
            $traitLevel = 2;
        } elseif ($traitScore < 52) { // 34 ≤ X < 52
            $traitLevel = 1;
        } else {                      // X ≥ 52 （如需 ≥57，改这里）
            $traitLevel = 0;
        }

        // 3. 学习压力
        if ($studyScore <= 28) {      // 含 14-28，<14 也归这一档
            $studyLevel = 2;
        } elseif ($studyScore <= 42) { // 29-42
            $studyLevel = 1;
        } else {                       // 43-70 及以上
            $studyLevel = 0;
        }

        return [
            'state' => $this->stateAnxietyResult($stateLevel),
            'trait' => $this->traitAnxietyResult($traitLevel),
            'study' => $this->studyScoreResult($studyLevel),
        ];
    }

    /**
     * 学习压力结果
     * @param mixed $value
     * @return array{proposal: string, result: string, status: mixed, title: string|null}
     */
    public function studyScoreResult($value)
    {
        $data = [
            0 => [
                'status' => $value,
                'title' => '感知压力水平高',
                'result' => '这种高强度的压力（如学业，家庭，人际等）可能超出了您的应对能力（作业多觉得自己根本写不完，我在学习上怎么做，可能都达不到家长的期待），对您的身心健康造成了不同程度的影响，如睡眠质量下降、情绪波动较大、注意力难以集中、学习效率有所下降，对学习失去兴趣等。持续的高压力状态若不及时调整，可能会引发更严重的心理问题和身体疾病。您可能需要高度重视并立即采取行动来应对当前的压力状况。',
                'proposal' => [
                    [
                        'title' => '压力拆解：',
                        'value' => '将 “大压力” 转化为小目标（如 “作业太多”→ 按 “紧急程度” 排序，先做数学作业，再做语文作业，每完成 1 项打勾），减少 “无力感”。'
                    ],
                    [
                        'title' => '认知调整：',
                        'value' => '区分 “客观压力” 和 “主观压力”（如 “爸妈希望我进步” 是客观期待，同时“看到”客观期待对我的积极的意义。“我达不到就是失败” 是主观认知，可调整为 “我尽力进步就好，不用和别人比”）。'
                    ],
                    [
                        'title' => '减负行动：',
                        'value' => '合理拒绝额外压力（如 “已经报了 2 个补习班，可拒绝第 3 个，专注做好现有安排”）；每天保证 30 分钟运动（如跑步、跳绳），运动能有效降低压力激素水平。'
                    ],
                    [
                        'title' => '家庭沟通：',
                        'value' => '主动和家长坦诚交流 “我现在的压力是什么”“我需要怎样的支持”（如 “希望爸妈不要每天问成绩，多鼓励我”），争取家庭支持。'
                    ],
                ]
            ],
            1 => [
                'status' => $value,
                'title' => '感知压力水平适中',
                'result' => '您的压力知觉处于中等范围，这意味着在学习中您会时不时感受到一定程度的压力，但整体仍在可承受范围内。压力可能来自于学习任务本身、人际关系、生活琐事等多个方面。您对压力有一定的察觉，且多数情况下能够采取适当的方式进行处理，不至于让压力严重影响到您的日常学习和身心健康。不过，长期处于这个压力水平，若不加以重视，可能会逐渐积累压力，对心理状态和生活质量产生负面影响。',
                'proposal' => [
                    [
                        'title' => '平衡分配精力：',
                        'value' => '制定 “每周时间表”，明确学习、兴趣、休息的时间（如 “周一至周五晚上 7-9 点学习，9-9:30 运动，9:30-10 点放松”），避免某一领域占用过多精力。'
                    ],
                    [
                        'title' => '自我激励：',
                        'value' => '当压力增大时（如 “期中复习 + 兴趣班比赛”），肯定自己的应对能力（如 “上次我也兼顾了两件事，这次也可以”）；完成任务后给予小奖励（如奖励自己看一场电影）。'
                    ],
                ]
            ],
            2 => [
                'status' => $value,
                'title' => '感知压力水平较低',
                'result' => '您目前感知到的学习压力处于较低水平。在日常生活中，您能够较好地应对学习中的各种事务（如作业可以按时完成），很少因外界因素而感到过度紧张或焦虑。您可能具备较强的情绪调节能力，善于从积极的角度看待学习生活中的发生事件，从而使压力对您的影响减到最小。这表明您在当前阶段心理状态较为轻松、稳定，压力耐受应高，能应对学习中的挑战与压力，能合理看待外界要求。',
                'proposal' => [
                    [
                        'title' => '保持平衡：',
                        'value' => '继续维持现有生活节奏（如合理的学习时间、充足的休息），不刻意追求 “无压力”（适度压力能激发动力）。'
                    ],
                    [
                        'title' => '提升能力：',
                        'value' => '主动设定 “小挑战”（如 “尝试攻克数学难题”“参加英语演讲比赛”），在挑战中提升应对压力的能力，为未来可能的高压情境（如升学考试）做准备。'
                    ],
                ]
            ]
        ];
        return $data[$value] ?? null;
    }
    /**
     * 特质焦虑结果
     * @param int $value 特质焦虑分
     * @return array|null
     */
    public function traitAnxietyResult($value)
    {
        $data = [
            0 => [
                'status' => $value,
                'title' => '高特质焦虑',
                'result' => '面对生活、学习中的还未发生的事情，您容易过度紧张（未来上不来好大学咋办呢）和不安（担心自己不够优秀），总是处于提防状态。这种长期紧绷的感受可能让您身心疲惫，身体长期紧绷，长期失眠，胡思乱想，敏感多疑（老师提问我是不是有点针对我）甚至不愿与人来往。如果持续加重，可能会干扰到日常生活和学习的正常节奏。',
                'proposal' => [
                    [
                        'title' => '认知调整：',
                        'value' => '学习 “合理情绪疗法” 核心逻辑 —— 焦虑源于 “绝对化想法”（如 我必须考到前X名），尝试将其替换为 “弹性想法”（如 “我会尽全力备考，只要我这次与上次比较有进步的地方：总结了经验？坚持完成了复习？成绩的提升？复习的状态？或其他方面”）。同时看清，很多人的成长进步是一个螺旋上升的过程。允许暂时的反复甚至退步。'
                    ],
                    [
                        'title' => '行为训练：',
                        'value' => '每天安排 30 分钟 “无目的放松”（如发呆、看风景、做手工），避免时刻处于 “要变好” 的紧绷状态；主动参与 “低压力社交”（如和同桌一起吃饭、参加兴趣小组），逐步减少对 “被否定” 的恐惧。通过身体的放松，缓解精神的压力。如有每周1-2次对身体的按摩。'
                    ],
                    [
                        'title' => '专业支持：',
                        'value' => '务必寻求学校心理老师或专业心理咨询师的长期辅导（至少 8-12 次），家庭需配合（如家长减少对 “成绩排名” 的过度关注，多对孩子做到的部分的肯定）。'
                    ],
                ]
            ],
            1 => [
                'status' => $value,
                'title' => '中等特质焦虑',
                'result' => '日常生活中，当遇到结果不明朗或难以预判的事情时（如未来会就读的学校），您容易感到焦虑。但您不会长时间沉浸在焦虑中，而是能够通过自我调整恢复平静。这种反应可能与您性格中对压力较为敏感的特质或成长中国偶尔的否定反馈有关。属于相对可控的焦虑。',
                'proposal' => [
                    [
                        'title' => '自我接纳：',
                        'value' => '明确 “偶尔焦虑是正常的”，不必因 “自己有担忧” 而自责或者因焦虑而焦虑；当出现过度担忧时，问自己 “这件事最坏的结果是什么？我能承受吗？”我有办法解决吗？谁能协助我解决呢？（如 “作业出错，老师会讲解，我能订正，没什么大不了”）。'
                    ],
                    [
                        'title' => '行为调节：',
                        'value' => '培养 1-2 个能专注投入的兴趣爱好（如画画、弹琴、跑步），在爱好中获得成就感，减少对 “表现好坏” 的过度关注；每周至少 1 次和家人进行 “无评价沟通”（如聊兴趣、聊电视剧，不聊成绩、不批评）。'
                    ],

                ]
            ],
            2 => [
                'status' => $value,
                'title' => '低特质焦虑',
                'result' => '您的性格倾向沉稳，对未来未发生的事情担忧较少，面对压学习中的压力时能保持理性，很少因为他人的评价或者潜在的风险而焦虑，不易产生持续性焦虑情绪，情绪弹性较好。',
                'proposal' => [
                    [
                        'title' => '保持积极心态：',
                        'value' => '继续坚持自我接纳的态度，不追求 “绝对完美”；在遇到挫折时（如考试失利、人际矛盾），沿用已有的乐观思维（如 “这是一次经验，下次可以做得更好”）。'
                    ],
                    [
                        'title' => '传递正能量：',
                        'value' => '主动带动身边同学（如焦虑的朋友），分享自己的思考方式（如 “不用想太多，先做起来”）；适当参与心理科普活动（如班级心理分享会），强化自身心理优势。'
                    ],

                ]

            ]
        ];
        return $data[$value] ?? null;
    }
    /**
     * 状态焦虑
     * @return array|null
     */
    public function stateAnxietyResult($value): array|null
    {
        $data = [
            0 => [
                'status' => $value,
                'title' => '高水平状态焦虑',
                'result' => '您当前状态焦虑程度较高，您可能经常感到心神不宁，容易产生突发的强烈紧张或心慌，有时会控制不住地手抖、坐立难安、考试前失眠，注意力难以集中，担心 “考砸”。您可能会对一些事情反复纠结，甚至把一些小问题想象得特别严重，比如：这次考不好同学怎么看我呢。这些状态可能已经影响到您日常学习、情绪和人际关系​。',
                'proposal' => [
                    [
                        'title' => '即时缓解：',
                        'value' => '采用 “4-7-8 呼吸法”（吸气 4 秒→屏息 7 秒→呼气 8 秒），每次 5 分钟；或通过涂鸦、短暂散步（10 分钟）转移注意力，避免陷入 “灾难化思维”（如 “考不好就完了”明确考试的意义和目的）。也可以给自己1-2分钟的时间“看到”焦虑，接纳焦虑，尝试着与焦虑“对话”。'
                    ],
                    [
                        'title' => '长期调节：',
                        'value' => '提前为压力情境做准备（如考试前制定细化复习计划，而非笼统 “刷题”）避免事件临近未能有充足的事假安排而“慌乱”，事后复盘 “焦虑时的想法是否合理”（如 “这次没考好，下次可以针对性补弱，不是永远不行”）。'
                    ],
                    [
                        'title' => '外部支持：',
                        'value' => '向信任的老师、家长或同学倾诉，避免独自承受；若生理反应频繁（如频繁胃痛、头痛），可寻求心理咨询的帮助。'
                    ],
                ]
            ],
            1 => [
                'status' => $value,

                'title' => '中等水平状态焦虑',
                'result' => '您当前处于中度状态焦虑中，最近您可能常感到心里不踏实，容易紧张（作业多的时候会烦躁，一些比较重要的活动时会紧张）或短暂的心神不宁，有时难以集中精神，睡眠也不太安稳。但这些感受尚未打乱您的日常生活节奏，如仍能正常的完成作业，效率受些许影响。这种状态或许与近期学习（马上要期中考试）或人际交往（和好朋友有一些误会）中的压力有关。​',
                'proposal' => [
                    [
                        'title' => '自我调节：',
                        'value' => '建立 “情绪日记”，记录每周焦虑出现的次数、当时的情形、我当时的想法，用 “一句话反驳负面想法”（如 “作业多但可以分时段完成，不用急着一次性做完”）。'
                    ],
                    [
                        'title' => '时间管理：',
                        'value' => '采用 “番茄工作法”（学习 25 分钟→休息 5 分钟），避免任务堆积引发焦虑；每天留 15 分钟 “放松时间”（如听轻音乐、和家人聊天），平衡学习与休息。每天列出“学习上我做了哪些事情”的清单，让自己做到的事情量化，避免觉得自己今天啥也没有学会而产生焦虑。外部支持：可向家长，老师或同学寻求解决压力事件的方法或成功经验。'
                    ],
                ]
            ],
            2 => [
                'status' => $value,
                'title' => '低水平状态焦虑',
                'result' => '您当前的情绪平静，内心轻松，很少出现紧张和担心，遇到生活学习中的一些变化能以积极的心态快速适应（如换了新老师，新学校）这表示您可能正处于比较舒适的环境或具备良好的即时情绪调节能力（你会有独属于自己的情绪调节的方法）。情绪稳定不影响学习与生活。',
                'proposal' => [
                    [
                        'title' => '保持现状：',
                        'value' => '继续沿用已有的调节方式（如运动、听音乐），无需刻意改变；若偶尔出现焦虑，可快速自我暗示（如 “我能应对”）。'
                    ],
                    [
                        'title' => '强化优势：',
                        'value' => '主动帮助身边焦虑的同学（如分享自己的复习节奏），在帮助他人中巩固自我调节能力；尝试挑战轻微压力情境（如主动举手回答问题，挑战难题），提升心理韧性。'
                    ],
                ]
            ]
        ];
        return $data[$value] ?? null;
    }
    /**
     * 学格解读
     * @param string $value
     * @return array
     */
    public function getXueGeUnscramble(string $value)
    {

        $data = [
            '波动焦虑型' => [
                'content' => '高认知与情绪脆弱的核心失衡，成绩因焦虑呈现 “过山车” 状态，能力无法稳定输出。',
                'suggest' => '学生：
① 情绪急救：用 “4-2-6 呼吸法” 调节焦虑，设定 “15 分钟止损规则”，卡壳时标记后先做其他题；
② 策略破局：每周尝试 1 种新方法（如思维导图替代抄课文），记录效率差异；
③ 主动求助：每周向他人请教 1 道卡壳题，总结高效解题路径。
家长：
① 情绪共情：孩子焦虑时先回应感受，再讨论方法，避免说教；
② 方法引导：用 “方法盲盒” 降低孩子对新策略的抵触；
③ 过程肯定：表扬 “主动请教的态度”，弱化分数评价。'
            ],
            '死磕傻学型' => [
                'content' => '“认真却低效” 的核心困境，态度端正但认知薄弱，“蛮干” 导致的低效困境，机械努力无法获得正反馈，陷入恶性循环。',
                'suggest' => '学生：
① 从基础任务启动，每天聚焦 1 个简单知识点（如 1 个生字），用新方法扎实掌握；
② 做 “方法对比实验”，记录老方法与新方法的效率差异；
③ 情绪自救：崩溃前做 3 分钟深呼吸，避免情绪失控。
家长：
① 无压力陪伴，孩子学习时家长安静看书，不指责；
② 强化基础，提供生字卡片、基础练习册；
③ 放大微小进步，夸 “你今天主动做题了，比昨天勇敢”。'
            ],
            '摆烂到底型' => [
                'content' => '对学习的 “彻底麻木放弃”，认知、态度、情绪全面崩盘，无学习行动、无情绪波动、无进步意愿，完全脱离学习轨道。',
                'suggest' => '学生：
① 从 “无痛行动” 启动，每天仅做 1 个超简单任务（如翻 1 页课本）；
② 用 “兴趣嫁接” 唤醒感知（如用游戏学数学）；
③ 避免自我否定，每天默念 “我只是暂时没找到方法”。
家长：
① 无压力陪伴，不说 “你必须学”，而是 “想学时妈妈陪你”；
② 肯定微小行动，夸 “你愿意尝试，比昨天棒”；
③ 示范简单高效的学习方法（如图片记单词）。'
            ],
            '稳定卓越型' => [
                'content' => '持续优秀的 “理想状态”，能自主平衡学习与压力，是同学中的榜样，具备强大自我管理能力',
                'suggest' => '学生：
① 挑战创新任务，每月做 1 个跨学科项目（如用数学 + 语文完成 “家庭开支报告”）；
② 探索细分天赋，参加学科竞赛、科研小课题；
③ 总结高效方法的适用场景，主动尝试新策略。
家长：
① 提供高阶资源（如专业科普书、竞赛资料）；
② 肯定创新能力，夸 “你用跨学科思路解决问题很特别”；
③ 适度放手，给予孩子自主选择学习内容的空间。'
            ],
            '策略僵化型' => [
                'content' => '方法枷锁导致的低效困境，情绪稳定、态度认真，但依赖老套方法，学习效率低下。因认知灵活差 + 方法老套，长期努力无法获得理想成果。',
                'suggest' => '学生：① 做 “方法对比实验”，记录老方法与新方法的效率差异；② 设定 “20 分钟卡壳预警”，超时立即求助；③ 用微任务 + 即时奖励积累正反馈。
家长：① 示范高效方法（如费曼学习法）；② 肯定过程与勇气，夸 “你愿意尝试新方法很勇敢”；③ 补充认知训练资源（如逻辑小游戏）。'
            ],
            '佛系躺平型' => [
                'content' => '情绪稳定与动力缺失的平衡，抗挫力强但动机不足，对学习的成败无反应，处于 “被动接受” 的躺平状态。',
                'suggest' => '学生：① 用兴趣激活潜力（如逻辑好就玩数独）；② 每周尝试 1 种简单新方法；③ 设定微目标，逐步积累学习惯性。
家长：① 挖掘孩子兴趣点，提供对应资源；② 无压力引导，用游戏、动画关联学习；③ 肯定微小行动，逐步重建自信。'
            ],
            '动力缺失型' => [
                'content' => '高能力与低动机的核心错位，认知和情绪均无短板，但因内在动力不足，学习多为 “被动完成”，天赋被浪费，无法转化为成绩。',
                'suggest' => '学生：① 用目标锚定激活动力（如 “学好英语看原版漫画”）；② 优化学习策略，用思维导图梳理知识点；③ 探索兴趣类活动（如编程体验课），激活天赋。
家长：① 链接未来理想，让学习与长远目标关联；② 提供高效工具支持（如错题分类软件）；③ 用过程奖励强化主动行动。'
            ],
            '潜力待挖型' => [
                'content' => '被心理短板困住的 “隐形黑马”，认知能力足够支撑顶尖成绩，但因情绪脆弱和自信不足，长期无法发挥真实水平，处于 “有能力却不敢用” 的被动状态。',
                'suggest' => '学生：① 每天练 3 分钟呼吸法，遇难题先放松再思考；② 设定 “15 分钟预警”，卡壳立即标记求助；③ 用优势能力做低压力任务，积累自信。
家长：① 精准肯定天赋，夸 “你拼模型的空间感很突出”；② 情绪陪伴优先，孩子焦虑时先共情再分析方法；③ 教孩子用思维导图梳理思路，替代死磕。'
            ],

        ];
        return $data[$value] ?? [
            'content' => '',
            'suggest' => ''
        ];
    }
}
