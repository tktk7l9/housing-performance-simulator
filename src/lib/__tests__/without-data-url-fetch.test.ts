import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withoutDataUrlFetch } from "../without-data-url-fetch";

const WASM_DATA_URL = "data:application/octet-stream;base64,AGFzbQEAAAA=";

describe("withoutDataUrlFetch", () => {
  const realFetch = vi.fn<typeof fetch>();

  beforeEach(() => {
    realFetch.mockReset();
    realFetch.mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", realFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses data: URLs locally, so the browser never checks them against connect-src", async () => {
    await withoutDataUrlFetch(async () => {
      await expect(fetch(WASM_DATA_URL, { credentials: "same-origin" })).rejects.toThrow(TypeError);
      await expect(fetch(new URL(WASM_DATA_URL))).rejects.toThrow(/data: URLs are not fetched/);
      await expect(fetch(" DATA:text/plain,x")).rejects.toThrow(TypeError);
    });
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("passes every other request to the real fetch unchanged", async () => {
    const init = { credentials: "same-origin" as const };
    await withoutDataUrlFetch(async () => {
      await fetch("/_next/static/chunks/a.js", init);
      await fetch(new URL("https://example.test/font.ttf"));
      await fetch(new Request("https://example.test/image.png"));
    });
    expect(realFetch).toHaveBeenCalledTimes(3);
    expect(realFetch.mock.calls[0]).toEqual(["/_next/static/chunks/a.js", init]);
  });

  it("returns the task's result and puts the real fetch back", async () => {
    await expect(withoutDataUrlFetch(async () => 42)).resolves.toBe(42);
    expect(globalThis.fetch).toBe(realFetch);
  });

  it("puts the real fetch back when the task fails", async () => {
    await expect(
      withoutDataUrlFetch(async () => {
        throw new Error("layout failed");
      }),
    ).rejects.toThrow("layout failed");
    expect(globalThis.fetch).toBe(realFetch);
  });
});
