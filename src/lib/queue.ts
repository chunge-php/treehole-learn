/**
 * 内存级 key-串行队列 — 同 key 的任务排队执行, 不同 key 并行。
 *
 * 用途: 防止同一学生 (end_user_id) 的档案写入并发, 避免
 *   - 知识点数组 merge 时 "读 cur → 改 → 写回" 的数据竞争
 *   - 多次扣子分析回写互相覆盖
 *
 * 注意:
 *   - 单进程内有效。Vercel / 多实例部署时, 每个实例各自有自己的队列;
 *     需要严格全局串行时, 应改用 Postgres advisory lock 或 Redis 队列。
 *   - 任务抛错不影响后续排队任务 (内部 catch 后继续 chain), 但抛错会原样
 *     被 await enqueueByKey 的调用方收到。
 */
const chains = new Map<string, Promise<any>>();
const lengths = new Map<string, number>();  // 当前队列长度 (含 in-flight), 用于诊断/限流

export function enqueueByKey<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) || Promise.resolve();
  lengths.set(key, (lengths.get(key) || 0) + 1);
  // 用 prev.catch 屏蔽前一个任务的错误, 让 chain 不会因为一个任务挂了就崩
  const next = prev.catch(() => undefined).then(task);
  chains.set(key, next);
  next.finally(() => {
    const cur = (lengths.get(key) || 1) - 1;
    if (cur <= 0) {
      lengths.delete(key);
      // 仅当 chain 末尾还是这个 next 才清理 map (防止覆盖后续任务)
      if (chains.get(key) === next) chains.delete(key);
    } else {
      lengths.set(key, cur);
    }
  });
  return next;
}

/** 调试: 看某个 key 当前排队多少 (含 in-flight) */
export function queueLength(key: string): number {
  return lengths.get(key) || 0;
}
