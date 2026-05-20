"use client";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchProvinces, fetchCities, fetchDistricts, type Division } from "@/lib/regions";

type Value = { province?: string | null; city?: string | null; district?: string | null };

export function RegionPicker({
  value,
  onChange
}: {
  value: Value;
  onChange: (v: Value) => void;
}) {
  const [provinces, setProvinces] = useState<Division[]>([]);
  const [cities, setCities] = useState<Division[]>([]);
  const [districts, setDistricts] = useState<Division[]>([]);
  const [loading, setLoading] = useState({ city: false, district: false });

  useEffect(() => { fetchProvinces().then(setProvinces); }, []);

  // 当 province 改变时载入 cities; 若是直辖市仅一个"市辖区"则 API 端已穿透为区县
  useEffect(() => {
    if (!value.province) { setCities([]); setDistricts([]); return; }
    const p = provinces.find(x => x.name === value.province);
    if (!p) return;
    setLoading(l => ({ ...l, city: true }));
    fetchCities(p.id).then(rows => {
      setLoading(l => ({ ...l, city: false }));
      // 如果返回的是 level 3，说明直辖市已穿透 → 把它当作 districts，自动把 city 设为 province
      if (rows.length > 0 && rows[0].level === 3) {
        setCities([]);
        setDistricts(rows);
        if (value.city !== value.province) onChange({ ...value, city: value.province });
      } else {
        setCities(rows);
        setDistricts([]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.province, provinces.length]);

  useEffect(() => {
    if (!value.city || !value.province || cities.length === 0) return;
    const c = cities.find(x => x.name === value.city);
    if (!c) return;
    setLoading(l => ({ ...l, district: true }));
    fetchDistricts(c.id).then(rows => {
      setLoading(l => ({ ...l, district: false }));
      setDistricts(rows);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.city, cities.length]);

  const isMunicipality = cities.length === 0 && districts.length > 0;

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        value={value.province || ""}
        onValueChange={v => onChange({ province: v, city: null, district: null })}
      >
        <SelectTrigger><SelectValue placeholder="省 / 直辖市" /></SelectTrigger>
        <SelectContent className="max-h-72">
          {provinces.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={value.city || ""}
        disabled={!value.province || isMunicipality}
        onValueChange={v => onChange({ province: value.province, city: v, district: null })}
      >
        <SelectTrigger>
          <SelectValue placeholder={isMunicipality ? "(直辖市)" : (loading.city ? "加载中…" : "市")} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {cities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={value.district || ""}
        disabled={!value.city || districts.length === 0}
        onValueChange={v => onChange({ province: value.province, city: value.city, district: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading.district ? "加载中…" : "区 / 县"} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {districts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
