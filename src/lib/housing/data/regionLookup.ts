// Lookup from prefecture/municipality -> energy-saving standard climate region (1-8)
//
// Source: MLIT Notice No. 265 "住宅の省エネルギー基準" (housing energy-saving standard), appendix listing the regions
// (when a prefecture spans multiple regions, major municipalities are listed in CITY_OVERRIDES)
// lastUpdated: 2026-04
//
// Note: strictly, regions are designated per municipality. This data holds representative values for the MVP;
// unknown municipalities use the prefecture default (the most populous region).

import type { Prefecture, RegionId } from "../types";

/** Default region per prefecture (based on the prefectural capital) */
export const PREFECTURE_DEFAULT: Record<Prefecture, RegionId> = {
  北海道: 2, // 札幌
  青森県: 2,
  岩手県: 3,
  宮城県: 4, // 仙台
  秋田県: 4,
  山形県: 4,
  福島県: 4,
  茨城県: 5,
  栃木県: 5,
  群馬県: 5,
  埼玉県: 6,
  千葉県: 6,
  東京都: 6,
  神奈川県: 6,
  新潟県: 5,
  富山県: 5,
  石川県: 5,
  福井県: 5,
  山梨県: 5,
  長野県: 4,
  岐阜県: 5,
  静岡県: 6,
  愛知県: 6,
  三重県: 6,
  滋賀県: 5,
  京都府: 6,
  大阪府: 6,
  兵庫県: 6,
  奈良県: 6,
  和歌山県: 6,
  鳥取県: 6,
  島根県: 6,
  岡山県: 6,
  広島県: 6,
  山口県: 6,
  徳島県: 6,
  香川県: 6,
  愛媛県: 6,
  高知県: 7,
  福岡県: 7,
  佐賀県: 7,
  長崎県: 7,
  熊本県: 6,
  大分県: 6,
  宮崎県: 7,
  鹿児島県: 7,
  沖縄県: 8,
};

/**
 * Exception map for major cities (listed only when different from the prefecture default)
 * Keys have the form `${prefecture} ${municipality}`.
 */
export const CITY_OVERRIDES: Record<string, RegionId> = {
  // Hokkaido (wide area)
  "北海道 旭川市": 1,
  "北海道 帯広市": 1,
  "北海道 北見市": 1,
  "北海道 釧路市": 1,
  "北海道 稚内市": 1,
  "北海道 札幌市": 2,
  "北海道 函館市": 3,
  "北海道 室蘭市": 3,
  // Aomori, Iwate, Fukushima
  "青森県 青森市": 2,
  "青森県 八戸市": 3,
  "岩手県 盛岡市": 3,
  "岩手県 宮古市": 4,
  "福島県 会津若松市": 3,
  "福島県 郡山市": 4,
  "福島県 福島市": 4,
  "福島県 いわき市": 5,
  // Kanto, Koshinetsu
  "栃木県 那須塩原市": 4,
  "群馬県 沼田市": 4,
  "新潟県 上越市": 5,
  "新潟県 新潟市": 5,
  "新潟県 長岡市": 4,
  "長野県 松本市": 3,
  "長野県 長野市": 4,
  "長野県 軽井沢町": 2,
  "山梨県 富士吉田市": 4,
  // Chubu, Kansai
  "岐阜県 高山市": 3,
  "岐阜県 岐阜市": 6,
  "石川県 金沢市": 5,
  "福井県 福井市": 5,
  "滋賀県 大津市": 6,
  // Chugoku, Shikoku, Kyushu
  "鳥取県 米子市": 6,
  "高知県 高知市": 6,
  "宮崎県 宮崎市": 7,
  "宮崎県 高千穂町": 5,
  // Okinawa
  "沖縄県 那覇市": 8,
};

export interface RegionLookupResult {
  region: RegionId;
  matched: "city" | "prefecture";
}

export function lookupRegion(prefecture: Prefecture, city?: string): RegionLookupResult {
  if (city) {
    const key = `${prefecture} ${city}`;
    const r = CITY_OVERRIDES[key];
    if (r !== undefined) return { region: r, matched: "city" };
  }
  return { region: PREFECTURE_DEFAULT[prefecture], matched: "prefecture" };
}

/** Return the list of city names listed in CITY_OVERRIDES for a prefecture */
export function citiesFor(prefecture: Prefecture): string[] {
  const prefix = `${prefecture} `;
  return Object.keys(CITY_OVERRIDES)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length))
    .sort();
}

export const PREFECTURE_LIST: Prefecture[] = Object.keys(PREFECTURE_DEFAULT) as Prefecture[];
