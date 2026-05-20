import type { SessionPayload } from "./session";
import { getActingChannelId } from "./session";

/**
 * 给定当前 session，返回应当注入的 channel_id 过滤：
 *  - channel_admin: 强制 = 自己 channel
 *  - admin/super_admin 且选择了"代某渠道"操作: 注入该渠道
 *  - admin 全局: 返回 null（看全部）
 */
export function scopedChannelFilter(s: SessionPayload | null) {
  if (!s) return "__none__" as const;
  if (s.role === "channel_admin") return s.channel_id;
  return getActingChannelId();
}

/** 给写入操作生成 channel_id（必填字段时使用） */
export function scopedWriteChannelId(s: SessionPayload | null, fallback?: string | null) {
  if (!s) return null;
  if (s.role === "channel_admin") return s.channel_id;
  return getActingChannelId() || fallback || null;
}
