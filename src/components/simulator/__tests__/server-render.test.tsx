// @vitest-environment node
/**
 * The prerendered /simulator HTML must carry the first step inline and none of the later steps'
 * code paths. A Suspense boundary around a large, ready subtree lets React's streaming renderer
 * outline it: the HTML then shows a "読み込み中…" placeholder until an inline script swaps it in.
 */
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { SimulatorApp } from "../SimulatorApp";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

async function prerender(node: ReactNode): Promise<string> {
  const { prelude } = await prerenderToNodeStream(node);
  let html = "";
  for await (const chunk of prelude) html += chunk.toString();
  return html;
}

describe("SimulatorApp server render", () => {
  it("streams the first step inline, never behind a loading placeholder", async () => {
    const html = await prerender(<SimulatorApp />);
    expect(html).toContain("建物条件");
    expect(html).toContain("延床面積");
    expect(html).not.toContain("読み込み中…");
    expect(html).not.toContain("<!--$?-->");
  });
});
