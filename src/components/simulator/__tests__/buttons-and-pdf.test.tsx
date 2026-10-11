/**
 * Tests for PdfExportButton / ShareUrlButton / ResultPdfDocument
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PdfExportButton } from "../results/PdfExportButton";
import { ShareUrlButton } from "../results/ShareUrlButton";
import { ResultPdfDocument } from "../results/ResultPdfDocument";
import { DEFAULT_INPUT } from "@/store/housingStore";
import { runSimulation } from "@/lib/housing/calculator";
import { buildAllScenarios } from "@/lib/housing/presets";

const { toBlob } = vi.hoisted(() => ({
  toBlob: vi.fn(() => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" }))),
}));

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
    pdf: () => ({ toBlob }),
    Font: { register: () => {} },
  };
});

const result = runSimulation(DEFAULT_INPUT, buildAllScenarios(DEFAULT_INPUT));

describe("ResultPdfDocument", () => {
  it("returns a Document", () => {
    const { container } = render(<ResultPdfDocument output={result} />);
    expect(container.querySelector('[data-pdf-tag="doc"]')).toBeTruthy();
  });
});

describe("PdfExportButton", () => {
  it("renders the button initially", () => {
    render(<PdfExportButton output={result} />);
    expect(screen.getByText(/PDF を保存/)).toBeTruthy();
  });

  it("generates and downloads a PDF blob on click", async () => {
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();

    render(<PdfExportButton output={result} />);
    const btn = screen.getByText(/PDF を保存/).closest("button")!;
    fireEvent.click(btn);
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("renders with data: fetches refused locally (the Yoga wasm loader tries one; CSP would report it)", async () => {
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
    const realFetch = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", realFetch);
    let wasmFetch: unknown;
    toBlob.mockImplementationOnce(async () => {
      wasmFetch = await fetch("data:application/octet-stream;base64,AGFzbQ==").catch((e: unknown) => e);
      return new Blob(["pdf"], { type: "application/pdf" });
    });
    try {
      render(<PdfExportButton output={result} />);
      fireEvent.click(screen.getByText(/PDF を保存/).closest("button")!);
      await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
      expect(wasmFetch).toBeInstanceOf(TypeError);
      expect(realFetch).not.toHaveBeenCalled();
      expect(globalThis.fetch).toBe(realFetch);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("ShareUrlButton", () => {
  it("shows the copy button initially", () => {
    render(<ShareUrlButton input={DEFAULT_INPUT} />);
    expect(screen.getByText(/URL をコピー|共有/i)).toBeTruthy();
  });

  it("switches the icon when clipboard.writeText succeeds", async () => {
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

  it("falls back to window.prompt when the clipboard fails", async () => {
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
