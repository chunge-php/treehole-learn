import { redirect } from "next/navigation";
import { getCurrentSession, getActingChannelId } from "@/lib/session";
import { adminSupabase } from "@/lib/supabase/admin";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { AppTopbar } from "@/components/admin/AppTopbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/login");

  const sb = adminSupabase();
  const isAdmin = session.role !== "channel_admin";
  const { data: channels = [] } = isAdmin
    ? await sb.from("channels").select("id, name").order("created_at", { ascending: false }).limit(100)
    : { data: [] };
  const acting = getActingChannelId();

  return (
    <div className="flex min-h-screen bg-muted/20">
      <AppSidebar role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar session={session} channels={channels || []} actingChannelId={acting} />
        <main className="flex-1 overflow-x-hidden p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
