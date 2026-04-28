import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatYen(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

export function formatManYen(value: number): string {
  return `${(Math.round(value / 1000) / 10).toLocaleString("ja-JP")}万円`;
}

export function formatKwh(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")} kWh`;
}

export function formatKg(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")} kg`;
}

export function formatYears(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  return `${value.toFixed(1)} 年`;
}
