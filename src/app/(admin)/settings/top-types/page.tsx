import { listTopTypesTree, listTopLevelOptions } from "./actions";
import { Client } from "./_components/Client";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function TopTypesPage() {
  const [tree, parents] = await Promise.all([listTopTypesTree(), listTopLevelOptions()]);
  return (
    <div>
      <PageHeader
        title="顶级类型"
        description="维护测评类型分类树。一级显示封面图，二级显示选中/未选中图标"
      />
      <Client initialTree={tree} initialParents={parents} />
    </div>
  );
}
