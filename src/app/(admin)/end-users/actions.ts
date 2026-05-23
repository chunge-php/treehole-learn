"use server";
import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth";
import { scopedChannelFilter } from "@/lib/scope";
import { shortId } from "@/lib/utils";
import bcrypt from "bcryptjs";

export type EndUserInput = {
  id?: string;
  channel_id?: string | null;
  store_id?: string | null;
  name: string;
  phone?: string | null; // 关联手机号 (登录用)
  login_username?: string | null;
  login_password?: string; // 明文; create 必填, edit 可选 (留空保持不变)
  // 以下字段供编辑时保留, 创建时不强制
  gender?: "male" | "female" | "other" | null;
  age?: number | null;
  grade?: string | null;
  school?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  paid_amount?: number | null;
  status?: "active" | "disabled";
  remark?: string | null;
};

export async function listEndUsers(params: { q?: string; store_id?: string | null; channel_id?: string | null; page?: number; pageSize?: number }) {
  const s = requireSession();
  const sb = adminSupabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  let qb = sb.from("end_users").select("*, stores(name), channels(name)", { count: "exact" });

  const scope = scopedChannelFilter(s);
  if (scope === "__none__") return { rows: [], total: 0 };
  if (scope) qb = qb.eq("channel_id", scope);
  else if (params.channel_id) qb = qb.eq("channel_id", params.channel_id);

  if (params.store_id) qb = qb.eq("store_id", params.store_id);
  if (params.q) qb = qb.or(`name.ilike.%${params.q}%,phone.ilike.%${params.q}%,login_username.ilike.%${params.q}%`);
  qb = qb
    .order("channel_id", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await qb;
  if (error) throw new Error(error.message);
  // 不向外返回 password_hash
  const rows = (data || []).map((r: any) => {
    const { login_password_hash, ...rest } = r;
    return { ...rest, _has_login_password: !!login_password_hash };
  });

  // 附加聚合: 家长昵称 / 本周未完成作业数
  const ids = rows.map((r: any) => r.id);
  if (ids.length > 0) {
    // 本周一 (周一为一周起点) → 本周日
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // 周一=0
    const monday = new Date(now); monday.setDate(now.getDate() - day); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const [parentsRes, tasksRes] = await Promise.all([
      sb.from("parent_bindings").select("end_user_id, nickname, mp_parents(nickname, phone)").in("end_user_id", ids).order("created_at", { ascending: false }),
      sb.from("assignments").select("end_user_id")
        .in("end_user_id", ids)
        .is("completed_at", null)
        .lte("start_date", fmt(sunday))
        .gte("end_date", fmt(monday))
    ]);
    const parentMap: Record<string, string> = {};
    const parentPhoneMap: Record<string, string> = {};
    (parentsRes.data || []).forEach((p: any) => {
      // 优先取绑定家长(mp_parents)的微信昵称, 回退旧 nickname 字段
      const nick = p.mp_parents?.nickname || p.nickname;
      if (nick && !parentMap[p.end_user_id]) parentMap[p.end_user_id] = nick;
      if (p.mp_parents?.phone && !parentPhoneMap[p.end_user_id]) parentPhoneMap[p.end_user_id] = p.mp_parents.phone;
    });
    const taskMap: Record<string, number> = {};
    (tasksRes.data || []).forEach((t: any) => { taskMap[t.end_user_id] = (taskMap[t.end_user_id] || 0) + 1; });
    rows.forEach((r: any) => {
      r._parent_nickname = parentMap[r.id] || null;
      r._parent_phone = parentPhoneMap[r.id] || null;
      r._pending_tasks = taskMap[r.id] || 0;
    });
  }
  return { rows, total: count || 0 };
}

/** 实时校验 end_user 登录账号是否可用 */
export async function checkEndUserUsernameAvailable(
  username: string,
  excludeId?: string
): Promise<{ ok: boolean; reason?: string }> {
  requireSession();
  const u = (username || "").trim();
  if (!u) return { ok: false, reason: "登录账号不能为空" };
  if (u.length < 2) return { ok: false, reason: "至少 2 个字符" };
  if (!/^[一-龥a-zA-Z0-9_.-]+$/.test(u)) {
    return { ok: false, reason: "仅支持中文、字母、数字与 _ . -" };
  }
  const sb = adminSupabase();
  let qb = sb.from("end_users").select("id").eq("login_username", u).limit(1);
  if (excludeId) qb = qb.neq("id", excludeId);
  const { data } = await qb.maybeSingle();
  if (data) return { ok: false, reason: "登录账号已被占用" };
  return { ok: true };
}

export async function upsertEndUser(input: EndUserInput) {
  const s = requireSession();
  const sb = adminSupabase();

  // channel_admin 必须指定店铺; admin 可以创建无关联用户
  if (s.role === "channel_admin" && !input.store_id) {
    throw new Error("请选择所属店铺");
  }

  let store_id: string | null = null;
  let channel_id: string | null = input.channel_id ?? null;

  if (input.store_id) {
    const { data: store, error: stErr } = await sb.from("stores").select("id, channel_id").eq("id", input.store_id).maybeSingle();
    if (stErr) throw new Error(stErr.message);
    if (!store) throw new Error("所属店铺不存在");
    if (s.role === "channel_admin" && store.channel_id !== s.channel_id) {
      throw new Error("无权操作其它渠道下的店铺");
    }
    store_id = store.id;
    // 店铺归属的渠道优先 (兼容 admin 显式选了渠道但店铺渠道不一致的情况, 以店铺为准)
    channel_id = store.channel_id;
  }

  // 登录账号校验
  let login_username: string | null = null;
  if (input.login_username !== undefined && input.login_username !== null) {
    const u = String(input.login_username).trim();
    if (u) {
      if (!/^[一-龥a-zA-Z0-9_.-]+$/.test(u)) {
        throw new Error("登录账号仅支持中文、字母、数字与 _ . -");
      }
      if (u.length < 2) throw new Error("登录账号至少 2 个字符");
      let dupQ = sb.from("end_users").select("id").eq("login_username", u).limit(1);
      if (input.id) dupQ = dupQ.neq("id", input.id);
      const { data: dup } = await dupQ.maybeSingle();
      if (dup) throw new Error("登录账号已被占用");
      login_username = u;
    }
  }

  // 密码处理
  let login_password_hash: string | undefined = undefined;
  if (input.login_password && input.login_password.length > 0) {
    if (input.login_password.length < 6) throw new Error("登录密码至少 6 位");
    login_password_hash = await bcrypt.hash(input.login_password, 10);
  }
  if (!input.id && login_username && !login_password_hash) {
    throw new Error("设置了登录账号必须同时填写登录密码");
  }

  const basePayload: any = {
    store_id,
    channel_id,
    name: input.name,
    phone: input.phone,
    login_username,
    gender: input.gender ?? null,
    age: input.age ?? null,
    grade: input.grade ?? null,
    school: input.school ?? null,
    parent_name: input.parent_name ?? null,
    parent_phone: input.parent_phone ?? null,
    paid_amount: input.paid_amount ?? 0,
    status: input.status || "active",
    remark: input.remark ?? null
  };
  if (login_password_hash !== undefined) basePayload.login_password_hash = login_password_hash;

  if (input.id) {
    let qb = sb.from("end_users").update(basePayload).eq("id", input.id);
    if (s.role === "channel_admin") qb = qb.eq("channel_id", s.channel_id || "__none__");
    const { error } = await qb;
    if (error) throw new Error(error.message);
  } else {
    const id = shortId("eu");
    const { error } = await sb.from("end_users").insert({ id, ...basePayload });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/end-users");
  return { ok: true };
}

/** 重置 end_user 登录密码 */
export async function resetEndUserPassword(id: string, newPassword: string) {
  const s = requireSession();
  if (!newPassword || newPassword.length < 6) throw new Error("密码至少 6 位");
  const sb = adminSupabase();
  const hash = await bcrypt.hash(newPassword, 10);
  let qb = sb.from("end_users").update({ login_password_hash: hash }).eq("id", id);
  if (s.role === "channel_admin") qb = qb.eq("channel_id", s.channel_id || "__none__");
  const { error } = await qb;
  if (error) throw new Error(error.message);
  revalidatePath("/end-users");
  return { ok: true };
}

export async function deleteEndUser(id: string) {
  const s = requireSession();
  const sb = adminSupabase();
  let qb = sb.from("end_users").delete().eq("id", id);
  if (s.role === "channel_admin") qb = qb.eq("channel_id", s.channel_id || "__none__");
  const { error } = await qb;
  if (error) throw new Error(error.message);
  revalidatePath("/end-users");
  return { ok: true };
}

export async function bulkImportEndUsers(rows: Record<string, any>[]) {
  const s = requireSession();
  const sb = adminSupabase();

  const scope = scopedChannelFilter(s);
  let storeQb = sb.from("stores").select("id, name, channel_id");
  if (scope && scope !== "__none__") storeQb = storeQb.eq("channel_id", scope);
  const { data: stores = [] } = await storeQb;
  const storeMap = new Map<string, { id: string; channel_id: string }>();
  (stores || []).forEach((st: any) => storeMap.set(String(st.name).trim(), { id: st.id, channel_id: st.channel_id }));

  // 已有 login_username 集合
  const { data: existingUsers = [] } = await sb.from("end_users").select("login_username").not("login_username", "is", null);
  const usernameSet = new Set((existingUsers || []).map((u: any) => u.login_username));
  const usernameSeenInBatch = new Set<string>();

  let success = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r["姓名"] || r["name"] || "").trim();
    if (!name) {
      errors.push({ row: i + 2, message: "姓名为空" });
      continue;
    }
    const storeName = String(r["所属店铺名称"] || r["store_name"] || "").trim();
    let store: { id: string; channel_id: string } | null = null;
    if (storeName) {
      store = storeMap.get(storeName) || null;
      if (!store) {
        errors.push({ row: i + 2, message: `店铺「${storeName}」不存在或无权操作` });
        continue;
      }
    } else if (s.role === "channel_admin") {
      errors.push({ row: i + 2, message: "所属店铺名称为空" });
      continue;
    }

    const username = String(r["登录账号"] || r["login_username"] || "").trim() || null;
    const password = String(r["登录密码"] || r["login_password"] || "").trim() || null;
    let password_hash: string | null = null;
    if (username) {
      if (!/^[一-龥a-zA-Z0-9_.-]+$/.test(username)) {
        errors.push({ row: i + 2, message: "登录账号格式不合法" });
        continue;
      }
      if (usernameSet.has(username) || usernameSeenInBatch.has(username)) {
        errors.push({ row: i + 2, message: `登录账号「${username}」已被占用` });
        continue;
      }
      if (!password || password.length < 6) {
        errors.push({ row: i + 2, message: "设置了登录账号必须填写至少 6 位密码" });
        continue;
      }
      password_hash = await bcrypt.hash(password, 10);
    }

    const { error } = await sb.from("end_users").insert({
      id: shortId("eu"),
      store_id: store?.id || null,
      channel_id: store?.channel_id || null,
      name,
      phone: r["手机号"] || r["关联手机号"] || r["电话"] || r["phone"] || null,
      login_username: username,
      login_password_hash: password_hash,
      remark: r["备注"] || r["remark"] || null
    });
    if (error) errors.push({ row: i + 2, message: error.message });
    else {
      success++;
      if (username) usernameSeenInBatch.add(username);
    }
  }
  revalidatePath("/end-users");
  return { total: rows.length, success, failed: rows.length - success, errors };
}

/**
 * 表单/筛选用：返回当前可见的店铺列表
 */
export async function listStoresForSelect() {
  const s = requireSession();
  const sb = adminSupabase();
  const scope = scopedChannelFilter(s);
  if (scope === "__none__") return [];
  let qb = sb.from("stores")
    .select("id, name, channel_id, channels(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);
  if (scope) qb = qb.eq("channel_id", scope);
  const { data = [] } = await qb;
  return data || [];
}

/**
 * 表单用: 返回所有可见渠道
 */
export async function listChannelsForSelect() {
  const s = requireSession();
  const sb = adminSupabase();
  const scope = scopedChannelFilter(s);
  if (scope === "__none__") return [];
  let qb = sb.from("channels").select("id, name").order("created_at", { ascending: false });
  if (scope) qb = qb.eq("id", scope);
  const { data = [] } = await qb;
  return data || [];
}
