import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 服务端管理客户端（service_role）— 绕过 RLS
 * 仅在已通过 session 验证过身份后使用，并由代码层做数据过滤
 */
export function adminSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
