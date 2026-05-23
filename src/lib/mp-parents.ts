/**
 * 小程序家长账号读写 + 统一登录响应。供各登录接口复用。
 */
import { adminSupabase } from "@/lib/supabase/admin";
import { signMpToken } from "@/lib/mp-session";
import { shortId } from "@/lib/utils";

export type ParentRow = {
  id: string;
  open_id: string | null;
  union_id: string | null;
  phone: string | null;
  nickname: string | null;
  avatar_url: string | null;
  status: string;
};

/** 按 openid 找到或创建家长 (微信授权登录入口) */
export async function findOrCreateByOpenId(
  openid: string,
  extra?: { union_id?: string | null; nickname?: string | null; avatar_url?: string | null }
): Promise<ParentRow> {
  const sb = adminSupabase();
  const { data: found } = await sb.from("mp_parents").select("*").eq("open_id", openid).maybeSingle();
  if (found) return found as ParentRow;

  const id = shortId("par");
  const { data, error } = await sb
    .from("mp_parents")
    .insert({
      id,
      open_id: openid,
      union_id: extra?.union_id ?? null,
      nickname: extra?.nickname ?? null,
      avatar_url: extra?.avatar_url ?? null
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ParentRow;
}

/** 按手机号找到或创建家长 (短信登录入口); 可附带 openid 做关联 */
export async function findOrCreateByPhone(phone: string, openid?: string | null): Promise<ParentRow> {
  const sb = adminSupabase();
  // 优先用 openid 命中已有账号 (同一微信换号场景)
  if (openid) {
    const { data: byOpen } = await sb.from("mp_parents").select("*").eq("open_id", openid).maybeSingle();
    if (byOpen) {
      if ((byOpen as ParentRow).phone !== phone) {
        await sb.from("mp_parents").update({ phone }).eq("id", (byOpen as ParentRow).id);
      }
      return { ...(byOpen as ParentRow), phone };
    }
  }
  const { data: byPhone } = await sb.from("mp_parents").select("*").eq("phone", phone).maybeSingle();
  if (byPhone) {
    if (openid && !(byPhone as ParentRow).open_id) {
      await sb.from("mp_parents").update({ open_id: openid }).eq("id", (byPhone as ParentRow).id);
      return { ...(byPhone as ParentRow), open_id: openid };
    }
    return byPhone as ParentRow;
  }

  const id = shortId("par");
  const { data, error } = await sb
    .from("mp_parents")
    .insert({ id, phone, open_id: openid ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ParentRow;
}

/** 设置手机号 (一键登录: 已有 openid 账号补手机号) */
export async function setParentPhone(parentId: string, phone: string) {
  const sb = adminSupabase();
  await sb.from("mp_parents").update({ phone }).eq("id", parentId);
}

export async function touchLogin(parentId: string) {
  const sb = adminSupabase();
  await sb.from("mp_parents").update({ last_login_at: new Date().toISOString() }).eq("id", parentId);
}

/** 统一登录成功响应: token + 家长公开信息 */
export function loginResult(p: ParentRow) {
  const token = signMpToken({ parent_id: p.id, open_id: p.open_id, phone: p.phone });
  return {
    ok: true,
    token,
    parent: {
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar_url,
      phone: p.phone,
      hasPhone: !!p.phone
    }
  };
}
