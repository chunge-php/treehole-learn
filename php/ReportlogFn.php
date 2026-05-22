<?php

namespace app\modules\dimension\reportLog\fns;

use app\modules\channel\store\model\Store;
use app\modules\dimension\reportLog\model\ReportItem;
use app\modules\dimension\reportLog\model\ReportLog;
use app\modules\evaluation\model\Evaluation;
use app\modules\user\userInfo\model\UserIdentitie;
use support\Db;
use GuzzleHttp\Client;


class  ReportlogFn
{
    protected $model;
    protected $evaluation;
    protected $userIdentitie;
    protected $reportItem;
    protected $client;
    protected $store;
    public function __construct(ReportLog $model, Evaluation $evaluation, UserIdentitie $userIdentitie, ReportItem $reportItem, Client $client, Store $store)
    {
        $this->model = $model;
        $this->evaluation = $evaluation;
        $this->userIdentitie = $userIdentitie;
        $this->reportItem = $reportItem;
        $this->client = $client;
        $this->store = $store;
    }
    public function index($info, $limit = 20, $offset = 1): array
    {
        $where = $this->model
            ->when($info['jwtUserType'] != user_str, fn($query) => $query->where('uid', $info['uid']))
            ->when($info['jwtUserType'] == user_str, fn($query) => $query->where('uid', $info['jwtUserId']))
            ->when(isset($info['status']) && $info['status'] > -1, fn($query) => $query->where('status', $info['status']))
            ->when(!empty($info['seek']), function ($query) use ($info) {
                return $query->where(function ($query) use ($info) {
                    return $query->where('code', 'like', '%' . $info['seek'] . '%')
                        ->orWhere('name', 'like', '%' . $info['seek'] . '%')
                        ->orWhere('account_number', 'like', '%' . $info['seek'] . '%');
                });
            });
        $total = $where->count();
        if ($total < 1) {
            return ['total' => 0, 'list' => []];
        } else {
            $list  = $where
                ->orderBy('updated_at', 'desc')
                ->limit($limit)
                ->offset($offset)
                ->get()
                ->toArray();
            return ['total' => $total, 'list' => $list];
        }
    }
    public function create($info)
    {

        $user_info =   $this->userIdentitie
            ->select([
                'user_identities.account_number',
                'users.last_name',
            ])
            ->join('users', 'users.id', 'user_identities.uid')
            ->where('user_identities.uid', $info['jwtUserId'])
            ->first()?->toArray();
        if (!$user_info) tryFun('user_info_not', info_err);
        $info['uid'] = $info['jwtUserId'];
        $info['account_number'] = $user_info['account_number'];
        $info['name'] = $user_info['last_name'];
        $date = date('Y-m-d');
        list($info['years'], $info['months'], $info['days']) = explode('-', $date);
        $info['topic_total'] = $this->evaluation->where('status', state_one)->count();
        $id =  $this->model->insertGetId(filterFields($info, $this->model));
        $this->store->where('id', $info['jwtStoresId'])->increment('test_total',1);
        $this->model->where('id', $id)->update(['code' => buildSerial($id)]);
        return $id;
    }

    public function show($info)
    {
        return $this->model->where('id', $info['id'])->where('uid', $info['jwtUserId'])->first()?->toArray();
    }
    public function delete($info)
    {
        if (!is_array($info['id'])) {
            $info['id'] = [$info['id']];
        }
        return $this->model->whereIn('id', $info['id'])->where('uid', $info['jwtUserId'])->delete();
    }
    public function rapid($info)
    {
        $list =  $this->evaluation->select(['id', 'dimension_type', 'topic_type', 'options'])->where('status', state_one)->orderBy('sort', 'asc')->get()->toArray();
        $total = count($list) - 1;
        foreach ($list as $k => $v) {
            $answer = '';
            if (!empty($v['options'])) {
                $num =  random_int(0, count($v['options']) - 1);
                $answer = $v['options'][$num]['name'] ?? '';
            }
            if ($v['dimension_type'] == state_three) {
                $answer = 'https://aiemotion.obs.cn-north-4.myhuaweicloud.com/1/XXL0001_12-03-16-32/3bc9ed9a0bc5b8ba.wav';
            }
            $data = [
                'jwtUserId' => $info['jwtUserId'],
                'topics_id' => $v['id'],
                'id' => $info['id'],
                'answer' => $answer,
                'status' => state_zero,
            ];
            if ($k == $total) {
                $data['status'] = state_one;
            }
            $this->submit($data);
        }
        return true;
    }
    public function submit($info)
    {
        $topics_id = $info['topics_id'];
        $logs_id = $info['id'];
        $result = 0;
        $answer = $info['answer'];
        $duration = $info['duration'] ?? '';
        $status = isset($info['status']) && $info['status'] == state_one ? state_two : state_zero;
        $info['uid'] = $info['jwtUserId'];
        $extend_json = null;
        $evaluation_info =   $this->evaluation->where('id', $topics_id)->first()?->toArray();
        if (!$evaluation_info) tryFun('topics_id_not_info', info_err);
        //判断题
        if ($evaluation_info['topic_type'] == state_one) {
            if ($evaluation_info['result'] == $answer) {
                $result = state_one;
            }
        } elseif ($evaluation_info['topic_type'] == state_zero) {
            //单选题
            if ($evaluation_info['dimension_type'] == state_two) {
                $total_num =  count($evaluation_info['options']);
                $result = calcOptionScore($answer, $total_num);
            } else {
                if ($evaluation_info['result'] == $answer) {
                    $result = state_one;
                }
            }
        } elseif ($evaluation_info['topic_type'] == state_two) {

            //发送语音
            $url =  config('app.fazhanmao_url');
            if (empty($url)) {
                tryFun('fazhanmao_url_error', fazhanmao_url_error);
            }
            // 取出 URL 里的路径部分：/1/XXL0001_12-03-16-32/3bc9ed9a0bc5b8ba.wav
            $path = parse_url($answer, PHP_URL_PATH);
            $answer =  $path;
            // 目录：/1/XXL0001_12-03-16-32
            $fileDir = substr($path, 0, strrpos($path, '/'));
            $message = [
                'audio_id' => buildSerial($logs_id),
                'file_dir' => $fileDir,
                'file_path' => $path,
            ];
            try {
                $response = $this->client->post($url, ['json' => $message]);
            } catch (\Exception $e) {
                tryFun('multimoding_resp', info_err);
            }
            $json_data = json_decode((string) $response->getBody(), true);
            if (!isset($json_data['code'])) {
                tryFun('multimoding_resp', info_err);
            }
            if ($json_data['code'] != 200 && !empty($json_data['msg'])) {
                tryFun($json_data['msg'], info_err);
            }
            if (!empty($json_data['data']['audio_id'])) {
                $audio_id = $json_data['data']['audio_id'];
                //语音题
                $extend_json = [
                    'status_anxiety_score' =>  $json_data['data']['status_anxiety_score'] ?? 0, //状态焦虑
                    'trait_anxiety_score' => $json_data['data']['trait_anxiety_score'] ?? 0, //特质焦虑
                    'learning_stress_score' => $json_data['data']['learning_stress_score'] ?? 0, //学习压力
                    'timestamp' => dayDateTime(),
                    'audio_id' => $audio_id
                ];
            } else {
                tryFun('audio_id_not', info_err);
            }
            $extend_json = json_encode($extend_json);
        }
        $data = [
            'result' => $result,
            'answer' => $answer,
            'logs_id' => $logs_id,
            'topics_id' => $topics_id,
            'dimension_type' => $evaluation_info['dimension_type'],
            'project' => $evaluation_info['project'] ?? '',
            'extend_json' => $extend_json
        ];
        Db::beginTransaction();
        try {
            $is2 = $this->reportItem->insert($data);
            $is =  $this->model->where('id', $logs_id)->update(['status' => $status, 'duration' => $duration, 'now_number' => (int)$evaluation_info['sort'], 'done_total' => Db::raw('done_total+1')]);
            if ($is && $is2) {
                Db::commit();
            }
            return true;
        } catch (\Exception $e) {
            debugMessage($e->getMessage());
            Db::rollBack();
        }
        return false;
    }
    public function reportShow($info)
    {
        $report_info =  (new ReportLog())->where('id', $info['id'])->where('uid', $info['uid'])->first()?->toArray();
        if (!$report_info) return false;
        $list =  (new ReportItem())->select(['answer', 'result', 'dimension_type', 'project', 'extend_json'])->where('logs_id', $report_info['id'])->orderBy('id', 'asc')->get()->toArray();
        $data = [
            'name' => $report_info['name'],
            'account_number' => $report_info['account_number'],
            'code' => $report_info['code'],
            'dates' => $report_info['years'] . '-' . $report_info['months'] . '-' . $report_info['days'],
            'value1' => [
                'name' => '',
                'img' => 0,
                'title' => '',
                'describe' => '',
                'content' => ''
            ],
            'value2' => [],
            'value3' => [
                'title' => '',
                'content' => '',
            ],
            'value4' => [],
            'value5' => [
                [
                    'title' => '状态焦虑',
                    'value' => 0,
                ],
                [
                    'title' => '特质焦虑',
                    'value' => 0,
                ],
                [
                    'title' => '感知压力',
                    'value' => 0,
                ],
            ],
            'value6' => [],
            'value7' => [],
            'value8' => [
                'scores_cake' => [],
                'career_name' => '', //兴趣类型
                'top3' => '', //小三码
                'distinguish' => '', //区分性
                'self_introduce' => '', //自我介绍三码
                'interest_arr' => [], //兴趣大类类型推荐
                'major_arr' => []
            ],
            'value9' => [],
            'value10' => [],
        ];
        try {
            //自陈相关数据
            $SelfReport = [
                'ranges' => [], //根据项目分类统计
                'report_result' => 0,
                'data' => [],
                'report_cake' => [], //饼状图构建
            ];
            //兴趣相关数据
            $interest_data = [
                'number' => 1,
                'data' => [],
                'result' => []
            ];
            //多元性
            $multivariant_data = [
                'ranges' => [],
                'multiple_number' => 0,
                'multimoding_result' => 0,
                'multivariant_cake' => [], //饼状图构建
                'scoring_arr' => [], //计分
                'multielementResult' => [], //多元性计分结果
                'project_arr' => [], //子项目计分项
            ];
            //多模态
            $multimoding_data = [
                'multimoding_result' => 0, //多模态高低结果
                'status_anxiety_score' => 0, //状态焦虑
                'trait_anxiety_score' => 0, //特质焦虑
                'learning_stress_score' => 0, //学习压力
                'multimoding_cake' => [], //饼状图构建
                'data' => []
            ];
            //八维学格
            $octuple = [];
            foreach ($list as $item) {
                if ($item['dimension_type'] == state_zero) {
                    //多元性结果
                    $multivariant_data['ranges'][$item['project']][] = (int)$item['result'];
                } elseif ($item['dimension_type'] == state_one) {
                    //自陈结果
                    if (isset($SelfReport['ranges'][$item['project']])) {
                        $SelfReport['ranges'][$item['project']][0]++;
                        $SelfReport['ranges'][$item['project']][1] += (int)$item['result'];
                    } else {
                        $SelfReport['ranges'][$item['project']] = [1, (int)$item['result']];
                    }
                } elseif ($item['dimension_type'] == state_two) {
                    //兴趣结果
                    $interest_data['data'][$interest_data['number']] = (int)$item['result'];
                    $interest_data['number']++;
                } elseif ($item['dimension_type'] == state_three) {
                    //多模态
                    if (!empty($item['extend_json'])) {
                        $status_anxiety_score = $item['extend_json']['status_anxiety_score'] ?? 0;
                        $trait_anxiety_score = $item['extend_json']['trait_anxiety_score'] ?? 0;
                        $learning_stress_score = $item['extend_json']['learning_stress_score'] ?? 0;
                        $multimoding_data['status_anxiety_score'] = $status_anxiety_score;
                        $multimoding_data['trait_anxiety_score'] = $trait_anxiety_score;
                        $multimoding_data['learning_stress_score'] = $learning_stress_score;
                        $multimoding_data['multimoding_result'] = getPercentResult(3, ($status_anxiety_score + $trait_anxiety_score + $learning_stress_score));
                    }
                }
            }
            foreach ($multivariant_data['ranges'] as $key => $value) {
                $calc_score_data = feature('myclass.Arithmetic.calcScoreByResults', $value, $key);
                $multivariant_data['multiple_number'] += $calc_score_data['result'] ?? 0;
                if (isset($multivariant_data['multivariant_cake'][$calc_score_data['name']])) {
                    $multivariant_data['multivariant_cake'][$calc_score_data['name']] += $calc_score_data['result'];
                    $multivariant_data['scoring_arr'][$calc_score_data['name']]['point'] += $calc_score_data['number'];
                    $multivariant_data['scoring_arr'][$calc_score_data['name']]['total']++;
                } else {
                    $multivariant_data['multivariant_cake'][$calc_score_data['name']] = $calc_score_data['result'];
                    $multivariant_data['scoring_arr'][$calc_score_data['name']] = [
                        'point' => $calc_score_data['number'],
                        'total' => 1
                    ];
                }
                $multivariant_data['project_arr'][] = [
                    'name' => $key,
                    'value' => $calc_score_data['number']
                ];
            }
            $multivariant_data['multiple_result'] =  getPercentResult(count($multivariant_data['ranges']), $multivariant_data['multiple_number']); //多元高低结果
            foreach ($multivariant_data['scoring_arr'] as $ks => $vs) {
                $multivariant_data['multielementResult'][$ks] = getPercentResult($vs['total'], $vs['point']);
            }
            $multimoding_data['multimoding_cake'] = feature('myclass.Arithmetic.calcMultiModalPetalScore', $multimoding_data['status_anxiety_score'], $multimoding_data['trait_anxiety_score'], $multimoding_data['learning_stress_score']);
            $interest_data['result'] =  feature('myclass.Arithmetic.getInterestResult', $interest_data['data']);
            $SelfReport['data'] =  feature('myclass.Arithmetic.evaluateStudyProfile', $SelfReport['ranges']);
            $report_result_arr = [];
            $report_proposal_arr = [];
            foreach ($SelfReport['data']['details'] as $k => $item) {
                if (isset($report_cake[$k])) {
                    $SelfReport['report_cake'][$k] += $item['isHigh'];
                } else {
                    $SelfReport['report_cake'][$k] = $item['isHigh'];
                }
                $report_result_arr[] = [
                    'name' => $k,
                    'value' => $item['result'],
                ];
                $report_proposal_arr[] = [
                    'name' => $k,
                    'title' => $item['title'],
                    'value' => $item['proposal'],
                ];
            }

            $SelfReport['report_result'] = $SelfReport['data']['group'] ?? 0;
            $octuple =  feature('myclass.Arithmetic.getOctupleName', $multimoding_data['multimoding_result'], $multivariant_data['multiple_result'], $SelfReport['report_result']);
            //获得第一组数据 兴趣+八维学格
            $xuege_info = feature('myclass.Arithmetic.getXueGeName', $octuple['type']);
            $user_name =  feature('myclass.Arithmetic.interestUserName', $interest_data['result']['career_name']); //传奇人物姓名
            $value1_content =  feature('myclass.Arithmetic.interestContent',  $interest_data['result']['career_name'], $octuple['type']);
            $multimoding_cake = ['抗压能力' => $multimoding_data['multimoding_cake']];
            $data['value1'] = [
                'name' => $user_name['name'],
                'img' => $user_name['img'],
                'title' => $value1_content['name'],
                'describe' => $xuege_info['describe'],
                'content' => $value1_content['content']
            ];
            $data['value2'] = array_merge($multimoding_cake, $multivariant_data['multivariant_cake'], $SelfReport['report_cake']); //饼状图
            $number = [0 => 10, 1 => 40, 2 => 70, 3 => 100];
            foreach ($data['value2'] as &$val) {
                $val = $number[$val] ?? 10;
            }
            $xuege_unscramble = feature('myclass.Arithmetic.getXueGeUnscramble', $octuple['type']); //学格解读内容和建议
            $multimoding_data['data'] =  feature('myclass.Arithmetic.calcAllLevels', $multimoding_data['status_anxiety_score'], $multimoding_data['trait_anxiety_score'], $multimoding_data['learning_stress_score']);
            $data['value3'] = [
                'title' => $octuple['type'],
                'str' => $octuple['str'],
                'content' => $xuege_unscramble['content'],
            ];
            $data['value4'] = [
                'status_anxiety' => $multimoding_data['data']['state'],
                'trait_anxiety' => $multimoding_data['data']['trait'],
                'study_anxiety' => $multimoding_data['data']['study'],
            ];
            $data['value5'] = [
                [
                    'title' => '状态焦虑',
                    'value' => $multimoding_data['status_anxiety_score'],
                ],
                [
                    'title' => '特质焦虑',
                    'value' => $multimoding_data['trait_anxiety_score'],
                ],
                [
                    'title' => '感知压力',
                    'value' => $multimoding_data['learning_stress_score'],
                ],
            ];
            $data['value6'] = feature('myclass.Arithmetic.multielementResult', $multivariant_data['multielementResult']);
            $data['value7'] = $multivariant_data['project_arr'];
            $scores_cake = [];
            foreach ($interest_data['result']['scores_arr'] as $k => $v) {
                $scores_cake[] = [
                    'name' => $k,
                    'title' => $v['title'],
                    'value' => $v['value'],
                ];
            }
            $interest_arr = [];
            foreach ($interest_data['result']['career'] as $item) {
                $stars = str_repeat(' ★ ', $item['stars']);
                $majorsName = implode(' / ', $item['majors']);
                $interest_arr[] = "  - 代码 {$item['code']}（{$stars}）：{$majorsName}\n";
            }
            $major_arr = [];
            if (!empty($interest_data['result']['majors_data'])) {
                foreach ($interest_data['result']['majors_data'] as $idx => $row) {
                    $n = $idx + 1;
                    $stars = str_repeat(' ★ ', $row['stars']);
                    $major_arr[] = "  {$n}. {$row['major']}  [{$row['category']}]  ({$row['match_code']} / {$stars})\n";
                }
            } else {
                $major_arr[] = "  暂无匹配专业\n";
            }
            $data['value8'] = [
                'scores_cake' => $scores_cake,
                'career_name' => $interest_data['result']['career_name'], //兴趣类型
                'top3' => $interest_data['result']['top3'], //小三码
                'top3_arr' => $interest_data['result']['top3_arr'], //小三码
                'distinguish' => "区分性 D 值：{$interest_data['result']['diff_value']}  （{$interest_data['result']['diff_level']}）", //区分性
                'diff_value' => $interest_data['result']['diff_value'] ?? '',
                'diff_level' => $interest_data['result']['diff_level'] ?? '',
                'norm_level' => $interest_data['result']['harmony_level'] ?? '',
                'harmony_value' => $interest_data['result']['harmony_value'] ?? '',
                'self_introduce' => $interest_data['result']['self_introduce'], //自我介绍三码
                'interest_arr' => $interest_arr, //兴趣大类类型推荐
                'major_arr' => $major_arr
            ];
            $data['value9'] = $report_result_arr;
            $data['value10'] = $report_proposal_arr;
            return $data;
        } catch (\Exception $e) {
            debugMessage([$e->getMessage(), $e->getFile()], $e->getLine());
            return $data;
        }
    }
}
