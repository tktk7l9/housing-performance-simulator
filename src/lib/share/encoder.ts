// Turn input into a URL token (lz-string + base64url)
//
// Serialize the envelope (schemaVersion + input) to JSON and compress it.
// Old-format tokens (a bare HousingInput without an envelope) also
// fall back through `unwrapEnvelope` in schema.ts when decoded.

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
