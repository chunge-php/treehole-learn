import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
const nano = customAlphabet(alphabet, 12);

export function shortId(prefix?: string) {
  const id = nano();
  return prefix ? `${prefix}_${id}` : id;
}

export function formatDateCN(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export function formatMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "¥0.00";
  return `¥${Number(n).toFixed(2)}`;
}

export function maskPhone(p?: string | null) {
  if (!p) return "—";
  return p.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}
