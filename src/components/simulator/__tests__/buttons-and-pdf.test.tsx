/**
 * PdfExportButton / ShareUrlButton / ResultPdfDocument のテスト
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PdfExportButton } from "../results/PdfExportButton";
import { ShareUrlButton } from "../results/ShareUrlButton";
import { ResultPdfDocument } from "../results/ResultPdfDocument";
import { DEFAULT_INPUT } from "@/store/housingStore";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";

vi.mock("@react-pdf/renderer", () => {
  const factory = (tag: string) => {
    const MockTag = ({ children }: { children?: React.ReactNode }) => (
      <div data-pdf-tag={tag}>{children}</div>
    );
    return MockTag;
  };
  return {
    Document: factory("doc"),
    Page: factory("page"),
    Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
    View: factory("view"),
    StyleSheet: { create: (s: object) => s },
    pdf: () => ({ toBlob: () => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" })) }),
    Font: { register: () => {} },
  };
});

const result = runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));

describe("ResultPdfDocument", () => {
  it("Document を返す", () => {
    const { container } = render(<ResultPdfDocument output={result} />);
    expect(container.querySelector('[data-pdf-tag="doc"]')).toBeTruthy();
  });
});

describe("PdfExportButton", () => {
  it("初期状態: ボタンが描画される", () => {
    render(<PdfExportButton output={result} />);
    expect(screen.getByText(/PDF を保存/)).toBeTruthy();
  });

  it("クリックで PDF blob を生成・ダウンロード", async () => {
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();

    render(<PdfExportButton output={result} />);
    const btn = screen.getByText(/PDF を保存/).closest("button")!;
    fireEvent.click(btn);
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
});

describe("ShareUrlButton", () => {
  it("初期: コピーボタン表示", () => {
    render(<ShareUrlButton input={DEFAULT_INPUT} />);
    expect(screen.getByText(/URL をコピー|共有/i)).toBeTruthy();
  });

  it("clipboard.writeText 成功でアイコン切替", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: write },
      configurable: true,
    });
    render(<ShareUrlButton input={DEFAULT_INPUT} />);
    fireEvent.click(screen.getByText(/URL をコピー|共有/i).closest("button")!);
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(write.mock.calls[0][0]).toContain("/share/");
  });

  it("clipboard 失敗時は window.prompt にフォールバック", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
    });
    const promptSpy = vi.spyOn(window, "prompt").mockImplementation(() => null);
    render(<ShareUrlButton input={DEFAULT_INPUT} />);
    fireEvent.click(screen.getByText(/URL をコピー|共有/i).closest("button")!);
    await waitFor(() => expect(promptSpy).toHaveBeenCalled());
    promptSpy.mockRestore();
  });
});
