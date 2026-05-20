import { listResources, listCategories } from "./actions";
import { ResourcesClient } from "./_components/ResourcesClient";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function ResourcesPage({ searchParams }: { searchParams: { q?: string; page?: string; type?: string } }) {
  const page = Number(searchParams.page || 1);
  const q = searchParams.q || "";
  const type = searchParams.type || "";
  const [{ rows, total }, categories] = await Promise.all([
    listResources({ q, type, page, pageSize: 20 }),
    listCategories()
  ]);

  return (
    <div>
      <PageHeader
        title="资源库"
        description="管理学习资源，含文本、视频与文件三种类型，支持分类与上下架"
      />
      <ResourcesClient
        initialRows={rows}
        initialTotal={total}
        initialQ={q}
        initialPage={page}
        initialType={type}
        categories={categories}
      />
    </div>
  );
}
