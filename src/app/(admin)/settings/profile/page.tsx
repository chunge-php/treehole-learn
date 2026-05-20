import { getMyProfile } from "./actions";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const profile = await getMyProfile();
  return (
    <div>
      <PageHeader
        title="个人资料"
        description="修改我的资料与登录密码"
      />
      <ProfileForm profile={profile} />
    </div>
  );
}
