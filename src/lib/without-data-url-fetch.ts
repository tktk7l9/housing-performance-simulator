/**
 * Runs `task` while fetch() refuses data: URLs locally instead of sending them through the CSP.
 *
 * The Yoga WebAssembly loader inside @react-pdf/renderer (Emscripten, wasm inlined as a data:
 * URL) first tries fetch() on that URL and falls back to decoding it itself when the fetch fails.
 * connect-src has no data: (src/lib/csp.ts), so the fetch always fails, but the browser reports
 * every attempt as a CSP violation. Refusing data: URLs here takes the same fallback without the
 * report and without widening connect-src. Other URLs go to the real fetch unchanged.
 */
export async function withoutDataUrlFetch<T>(task: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.trimStart().toLowerCase().startsWith("data:")) {
      return Promise.reject(new TypeError("data: URLs are not fetched (CSP connect-src)"));
    }
    return original(input, init);
  };
  try {
    return await task();
  } finally {
    globalThis.fetch = original;
  }
}
