/**
 * Next.js page components の smoke test (server / metadata 部分のみ)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { metadata as simMetadata } from "../simulator/page";
import { metadata as shareMetadata } from "../share/[token]/page";
import { SharedView } from "../share/[token]/SharedView";
import { encodeInput } from "@/lib/share/encoder";
import { DEFAULT_INPUT } from "@/store/housingStore";

// Next.js navigation を mock
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

// SimulatorApp (heavy) は stub
vi.mock("@/components/simulator/SimulatorApp", () => ({
  SimulatorApp: () => <div data-testid="sim-app-stub" />,
}));

// next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("simulator/page metadata", () => {
  it("title=シミュレーター", () => {
    expect(simMetadata.title).toBe("シミュレーター");
  });
});

describe("share/[token]/page metadata", () => {
  it("title=共有された結果", () => {
    expect(shareMetadata.title).toBe("共有された結果");
  });
});

describe("SharedView", () => {
  it("有効な token で hydrate → replace", () => {
    const token = encodeInput(DEFAULT_INPUT);
    render(<SharedView token={token} />);
    expect(screen.getByText(/共有された入力を読み込んで/)).toBeTruthy();
    expect(replace).toHaveBeenCalledWith("/simulator");
  });

  it("無効な token でも /simulator に redirect", () => {
    render(<SharedView token="invalid!!!" />);
    expect(replace).toHaveBeenCalledWith("/simulator");
  });
});
