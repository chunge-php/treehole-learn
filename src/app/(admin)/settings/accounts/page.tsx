import { listAccounts, listChannelsForAccount } from "./actions";
import { Client } from "./_components/Client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AccountsPage({ searchParams }: { searchParams: { q?: string; page?: string; role?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const role = searchParams.role || "";
  const [{ rows, total }, channels] = await Promise.all([
    listAccounts({ q, page, role, pageSize: 20 }),
    listChannelsForAccount()
  ]);

  return (
    <div>
      <PageHeader
        title="账号管理"
        description="维护后台用户：超级管理员、平台管理员、渠道管理员"
      />
      <Client
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        initialRole={role}
        channels={channels}
      />
    </div>
  );
}
