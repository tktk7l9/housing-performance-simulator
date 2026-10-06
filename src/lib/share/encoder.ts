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

/**
 * The Next.js route param arrives percent-encoded ("+" becomes "%2B"), so a
 * token taken straight from `params` would fail to decompress. The lz-string
 * URI alphabet never contains "%", so decoding first is always safe.
 */
function unescapeToken(token: string): string {
  if (!token.includes("%")) return token;
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

/**
 * Size guards for tokens that arrive from a URL. The largest envelope the app
 * can produce (every field at its sanitizer limit) is about 3 KB of JSON and a
 * 1.1 KB token, while lz-string compresses repetitive text 500:1 and more, so a
 * crafted 8 KB token could otherwise expand to megabytes before JSON.parse runs.
 */
export const MAX_TOKEN_LENGTH = 8_192;
export const MAX_DECODED_JSON_LENGTH = 32_768;

export function decodeInput(token: string): HousingInput | null {
  if (token.length > MAX_TOKEN_LENGTH) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(unescapeToken(token));
    if (!json || json.length > MAX_DECODED_JSON_LENGTH) return null;
    return unwrapEnvelope(JSON.parse(json));
  } catch {
    return null;
  }
}
