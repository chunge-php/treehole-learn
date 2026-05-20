/**
 * 行政区划数据 — 客户端 fetch 封装
 * 数据源: supabase divisions 表 (GB/T 2260), 通过 /api/public/divisions 提供
 */
export type Division = { id: number; name: string; pid: number | null; level: 1 | 2 | 3 };

const cache = new Map<string, Promise<Division[]>>();

async function fetchDivisions(params: URLSearchParams): Promise<Division[]> {
  const key = params.toString();
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const res = await fetch(`/api/public/divisions?${key}`, { cache: "force-cache" });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.rows || []) as Division[];
    })());
  }
  return cache.get(key)!;
}

export function fetchProvinces() {
  return fetchDivisions(new URLSearchParams({ level: "1" }));
}
export function fetchCities(pid: number) {
  return fetchDivisions(new URLSearchParams({ pid: String(pid) }));
}
export function fetchDistricts(pid: number) {
  return fetchDivisions(new URLSearchParams({ pid: String(pid) }));
}
