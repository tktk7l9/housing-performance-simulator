import { readdirSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { describe, expect, it } from "vitest";
import { metadata as rootMetadata } from "../layout";
import { metadata as homeMetadata } from "../page";
import { metadata as shareMetadata } from "../share/[token]/page";
import { metadata as simulatorMetadata } from "../simulator/page";

const appDir = path.resolve(__dirname, "..");

/** The route of every page.tsx under src/app, e.g. "/", "/simulator", "/share/[token]". */
function pageRoutes(dir = appDir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : pageRoutes(path.join(dir, entry.name));
    if (entry.name !== "page.tsx") return [];
    const route = path.relative(appDir, dir).split(path.sep).join("/");
    return [`/${route}`];
  });
}

const pages: Record<string, Metadata> = {
  "/": homeMetadata,
  "/simulator": simulatorMetadata,
  "/share/[token]": shareMetadata,
};

describe("canonical URLs", () => {
  it("covers every page in src/app (add new pages here)", () => {
    expect(pageRoutes().sort()).toEqual(Object.keys(pages).sort());
  });

  it("the root layout sets no canonical, so no page inherits the home page's", () => {
    expect(rootMetadata.alternates).toBeUndefined();
  });

  it.each(["/", "/simulator"])("%s is its own canonical (and hreflang ja target)", (route) => {
    const { alternates, robots } = pages[route];
    expect(alternates?.canonical).toBe(route);
    expect(alternates?.languages).toEqual({ ja: route });
    expect(robots).toBeUndefined(); // inherits the layout's index, follow
    // metadataBase turns the path into the absolute URL that search engines see.
    expect(new URL(route, rootMetadata.metadataBase!).href).toBe(
      `https://housing-performance-simulator.saitotakuya0719.workers.dev${route}`,
    );
  });

  it("keeps per-user share links out of the index, without a conflicting canonical", () => {
    expect(shareMetadata.robots).toEqual({ index: false, follow: true });
    expect(shareMetadata.alternates).toBeUndefined();
  });
});
