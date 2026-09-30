/**
 * Landing page, root layout, 404 page, the route wrappers and the generated
 * icon / OG image routes: what a visitor can read and where they can go.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import Home from "../page";
import NotFound from "../not-found";
import RootLayout, { metadata, viewport } from "../layout";
import SharePage from "../share/[token]/page";
import SimulatorPage from "../simulator/page";
import OgImage, { alt as ogAlt, size as ogSize, contentType as ogType } from "../opengraph-image";
import AppleIcon, { size as iconSize, contentType as iconType } from "../apple-icon";
import { encodeInput } from "@/lib/share/encoder";
import { DEFAULT_INPUT } from "@/store/housingStore";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; prefetch?: boolean }) => {
    void rest;
    return <a href={href}>{children}</a>;
  },
}));

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/components/simulator/SimulatorApp", () => ({
  SimulatorApp: () => <div data-testid="sim-app-stub">simulator</div>,
}));

// The image routes hand JSX to next/og; capture it so the markup can be inspected in jsdom.
vi.mock("next/og", () => ({
  ImageResponse: class {
    element: ReactElement;
    options: unknown;
    constructor(element: ReactElement, options: unknown) {
      this.element = element;
      this.options = options;
    }
  },
}));

describe("Home (landing page)", () => {
  it("leads with the value proposition and a single primary call to action", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("30年でどちらが得か");
    const cta = screen.getByRole("link", { name: /シミュレーションを始める/ });
    expect(cta.getAttribute("href")).toBe("/simulator");
    expect(screen.getByText("登録不要 / ブラウザ内保存")).toBeTruthy();
  });

  it("in-page navigation points at the matching sections", () => {
    render(<Home />);
    const nav = screen.getByRole("navigation");
    for (const [label, id] of [
      ["特徴", "features"],
      ["使い方", "how"],
      ["注意", "disclaimer"],
    ] as const) {
      expect(within(nav).getByRole("link", { name: label }).getAttribute("href")).toBe(`#${id}`);
      expect(document.getElementById(id)).toBeTruthy();
    }
  });

  it("lists the three principles and the five steps in order", () => {
    render(<Home />);
    for (const title of ["中立性", "計算の透明性", "共有可能"]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    const steps = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(steps).toHaveLength(5);
    expect(steps[0]).toContain("STEP 1");
    expect(steps[0]).toContain("建物条件");
    expect(steps[4]).toContain("STEP 5");
    expect(steps[4]).toContain("比較・結果");
  });

  it("keeps the neutrality promise: no sales words on the page", () => {
    const { container } = render(<Home />);
    expect(container.textContent).not.toMatch(/おすすめ|最適/);
  });

  it("footer shows the current year and a second way into the simulator", () => {
    render(<Home />);
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()}`))).toBeTruthy();
    const links = screen.getAllByRole("link", { name: /シミュレーターへ/ });
    expect(links.some((l) => l.getAttribute("href") === "/simulator")).toBe(true);
  });
});

describe("NotFound", () => {
  it("explains the situation and offers both exits (SHIG 60)", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("ページが見つかりません");
    expect(screen.getByRole("link", { name: "トップページへ" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "シミュレーターへ" }).getAttribute("href")).toBe("/simulator");
  });
});

describe("RootLayout", () => {
  it("renders a Japanese document with the children in the body and the analytics beacon", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>child content</p>
      </RootLayout>
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.documentElement.getAttribute("lang")).toBe("ja");
    expect(doc.body.textContent).toContain("child content");
    const beacon = doc.querySelector('script[src*="cloudflareinsights"]');
    expect(beacon?.getAttribute("type")).toBe("module");
    expect(doc.querySelector('link[rel="preload"][href="/hero-house.svg"]')).toBeTruthy();
  });

  it("metadata: title template, canonical, indexable, no telephone auto-linking", () => {
    expect(metadata.title).toEqual({
      default: "住宅性能シミュレーター — 30年でどちらが得か、数字で確かめる。",
      template: "%s | 住宅性能シミュレーター",
    });
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.formatDetection).toEqual({ telephone: false, address: false, email: false });
    expect(String(metadata.metadataBase)).toMatch(/^https:\/\//);
  });

  it("viewport: device width and light/dark theme colours", () => {
    expect(viewport.width).toBe("device-width");
    expect(viewport.themeColor).toHaveLength(2);
  });
});

describe("route wrappers", () => {
  it("SharePage awaits the token param and hands it to SharedView", async () => {
    const token = encodeInput(DEFAULT_INPUT);
    const page = await SharePage({ params: Promise.resolve({ token }) });
    render(page);
    expect(screen.getByText(/共有された入力を読み込んで/)).toBeTruthy();
    expect(replace).toHaveBeenCalledWith("/simulator");
  });

  it("SimulatorPage mounts the simulator app", () => {
    render(<SimulatorPage />);
    expect(screen.getByTestId("sim-app-stub")).toBeTruthy();
  });
});

describe("generated images", () => {
  it("OG image carries the title and tagline at 1200x630", () => {
    const res = OgImage() as unknown as { element: ReactElement; options: { width: number; height: number } };
    render(res.element);
    expect(screen.getByText("HOUSING PERFORMANCE / SIMULATOR")).toBeTruthy();
    expect(screen.getByText(/30年でどちらが得か/)).toBeTruthy();
    for (const badge of ["登録不要", "計算根拠を全公開", "PDF / URL 共有"]) {
      expect(screen.getByText(badge)).toBeTruthy();
    }
    expect(res.options).toMatchObject({ width: 1200, height: 630 });
    expect(ogSize).toEqual({ width: 1200, height: 630 });
    expect(ogType).toBe("image/png");
    expect(ogAlt).toContain("住宅性能シミュレーター");
  });

  it("apple icon is a 180px square with the house mark", () => {
    const res = AppleIcon() as unknown as { element: ReactElement; options: { width: number; height: number } };
    const { container } = render(res.element);
    expect(container.querySelector("svg path")).toBeTruthy();
    expect(res.options).toMatchObject({ width: 180, height: 180 });
    expect(iconSize).toEqual({ width: 180, height: 180 });
    expect(iconType).toBe("image/png");
  });
});
