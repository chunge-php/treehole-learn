<?php 

/**
 * 生成带前缀的流水号
 *
 * @param int|string $num   传入的数字
 * @param string     $prefix 前缀，默认 "xxl"
 * @param int        $minLen 最小数字长度，默认 7 位
 * @return string
 *
 * 示例：
 *  buildSerial(1)        => xxl0000001
 *  buildSerial(1234567)  => xxl1234567
 *  buildSerial(12345678) => xxl12345678
 */
function buildSerial($num, string $prefix = 'XXL', int $minLen = 7): string
{
    // 转成纯数字字符串
    $numStr = (string)intval($num);

    // 实际长度 = max(最小长度, 当前数字长度)
    $length = max($minLen, strlen($numStr));

    // 左侧补零到指定长度
    $padded = str_pad($numStr, $length, '0', STR_PAD_LEFT);

    return $prefix . $padded;
}

/**
 * 获取当前时间
 * @return string
 */
function dayDateTime()
{
    $times = date('Y-m-d H:i:s', time());
    return $times;
}
/**
 * 根据选项总数动态计算分数
 *
 * @param string $answer       用户答案 (A / B / C ...)
 * @param int    $totalOptions 选项数量，例如 6 则表示 A~F
 * @return int|null            返回分数，如果超出范围，返回 null
 */
function calcOptionScore(string $answer, int $totalOptions): ?int
{
    // 转大写
    $answer = strtoupper($answer);

    // 获取字母位置：A=1, B=2, C=3...
    $position = ord($answer) - ord('A') + 1;

    if ($position < 1 || $position > $totalOptions) {
        return null; // 超出范围
    }

    // 最高分 = 总数，最低 = 1
    return $totalOptions - ($position - 1);
}
/**
 * 根据得分计算百分比并判断高低
 *
 * @param int|float $total   总数
 * @param int|float $score   得分
 * @return int
 */
function getPercentResult($total, $score)
{
    if ($total <= 0) {
        return 0;
    }
    // 计算百分比
    $percent = ($score / $total) * 100;
    // 判断结果
    return $percent >= 50 ? 1 : 0;
}