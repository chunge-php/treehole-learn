"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Leaf, Sparkles, ShieldCheck } from "lucide-react";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get("redirect") || "/dashboard";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "登录失败");
      toast.success("登录成功，欢迎回来");
      router.push(redirect);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#E6F1FB_0%,#FFFFFF_60%)]">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-info/10 blur-3xl" />
        <svg className="absolute right-10 top-10 h-40 w-40 text-primary/10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C7 7 4 11 4 15a8 8 0 0016 0c0-4-3-8-8-13z" />
        </svg>
      </div>

      <div className="container mx-auto grid min-h-screen grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:px-12">
        {/* 左侧品牌区 */}
        <div className="hidden lg:flex flex-col gap-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">树洞 · TreeHole</div>
              <div className="text-xs text-muted-foreground">Learning Assessment SaaS</div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              让每位学生
              <br />
              <span className="text-gradient-leaf">被安静地看见。</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              面向 K12 与素质教育机构的学习力测评 SaaS，多维度科学量表 · 个性化报告 · 数据驱动的成长路径。
            </p>
          </div>

          <div className="grid max-w-md grid-cols-1 gap-3">
            {[
              { icon: Sparkles, title: "4 大维度科学测评", desc: "学习态度 / 方法 / 能力 / 习惯" },
              { icon: ShieldCheck, title: "渠道-店铺-用户三级数据隔离", desc: "RLS 行级安全，互不可见" }
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border bg-card/60 p-4 backdrop-blur">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧登录卡 */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border bg-card/80 p-8 shadow-xl backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="font-semibold">树洞 · TreeHole</span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight">欢迎登录</h2>
            <p className="mt-1 text-sm text-muted-foreground">管理员 / 渠道商 后台</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="username">账号</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="请输入账号"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label="切换可见"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                登 录
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
              默认管理员：<span className="font-mono">admin</span> / <span className="font-mono">admin123</span>
              <br />
              普通用户（终端学生）不允许登录此平台。
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} TreeHole Learn · 让每位学生被安静地看见
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
