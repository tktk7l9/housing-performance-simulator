/**
 * Smoke tests for Next.js page components (server / metadata parts only)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { metadata as simMetadata } from "../simulator/page";
import { metadata as shareMetadata } from "../share/[token]/page";
import { SharedView } from "../share/[token]/SharedView";
import { encodeInput } from "@/lib/share/encoder";
import { DEFAULT_INPUT } from "@/store/housingStore";

// Mock Next.js navigation
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

// Stub SimulatorApp (heavy)
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
  it("sets the simulator page title", () => {
    expect(simMetadata.title).toBe("シミュレーター");
  });
});

describe("share/[token]/page metadata", () => {
  it("sets the shared-result page title", () => {
    expect(shareMetadata.title).toBe("共有された結果");
  });
});

describe("SharedView", () => {
  it("hydrates from a valid token, then replaces the URL", () => {
    const token = encodeInput(DEFAULT_INPUT);
    render(<SharedView token={token} />);
    expect(screen.getByText(/共有された入力を読み込んで/)).toBeTruthy();
    expect(replace).toHaveBeenCalledWith("/simulator");
  });

  it("redirects to /simulator even for an invalid token", () => {
    render(<SharedView token="invalid!!!" />);
    expect(replace).toHaveBeenCalledWith("/simulator");
  });
});
