// 入力を URL トークン化（lz-string + base64url）
//
// envelope（schemaVersion + input）を JSON 化して圧縮する。
// 旧形式のトークン（envelope を持たない素の HousingInput）も
// 復号時に schema.ts の `unwrapEnvelope` でフォールバックさせる。

import LZString from "lz-string";
import type { HousingInput } from "@/lib/housing/types";
import { makeEnvelope, unwrapEnvelope } from "@/lib/housing/schema";

export function encodeInput(input: HousingInput): string {
  const json = JSON.stringify(makeEnvelope(input));
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeInput(token: string): HousingInput | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(token);
    if (!json) return null;
    return unwrapEnvelope(JSON.parse(json));
  } catch {
    return null;
  }
}
