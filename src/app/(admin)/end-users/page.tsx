import { listEndUsers, listStoresForSelect } from "./actions";
import { EndUsersClient } from "./_components/EndUsersClient";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function EndUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const [{ rows, total }, stores] = await Promise.all([
    listEndUsers({ q, page, pageSize: 20 }),
    listStoresForSelect()
  ]);

  return (
    <div>
      <PageHeader
        title="普通用户"
        description="管理店铺旗下的终端学员，含基础信息、家长联系方式与付费金额"
      />
      <EndUsersClient
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        stores={stores as any}
      />
    </div>
  );
}
