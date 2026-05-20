"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { provinces, citiesOf, districtsOf } from "@/lib/regions";

export function RegionPicker({
  value,
  onChange
}: {
  value: { province?: string | null; city?: string | null; district?: string | null };
  onChange: (v: { province?: string | null; city?: string | null; district?: string | null }) => void;
}) {
  const cities = citiesOf(value.province || undefined);
  const districts = districtsOf(value.province || undefined, value.city || undefined);

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        value={value.province || ""}
        onValueChange={v => onChange({ province: v, city: null, district: null })}
      >
        <SelectTrigger><SelectValue placeholder="省 / 直辖市" /></SelectTrigger>
        <SelectContent>
          {provinces().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={value.city || ""}
        disabled={!value.province}
        onValueChange={v => onChange({ province: value.province, city: v, district: null })}
      >
        <SelectTrigger><SelectValue placeholder="市" /></SelectTrigger>
        <SelectContent>
          {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        value={value.district || ""}
        disabled={!value.city}
        onValueChange={v => onChange({ province: value.province, city: value.city, district: v })}
      >
        <SelectTrigger><SelectValue placeholder="区 / 县" /></SelectTrigger>
        <SelectContent>
          {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
