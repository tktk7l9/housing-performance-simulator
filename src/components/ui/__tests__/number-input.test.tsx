/**
 * SHIG 50 / 15 / 55 / 43: accept lenient number input, normalise it, clamp with a constructive message.
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberInput, normalizeNumeric, parseNumeric } from "../number-input";

describe("normalizeNumeric", () => {
  it("converts full-width digits and symbols to half-width", () => {
    expect(normalizeNumeric("１２０")).toBe("120");
    expect(normalizeNumeric("０．４６")).toBe("0.46");
    expect(normalizeNumeric("－５")).toBe("-5");
    expect(normalizeNumeric("ー5")).toBe("-5");
  });
  it("drops thousands separators and spaces", () => {
    expect(normalizeNumeric(" 1,200 ")).toBe("1200");
    expect(normalizeNumeric("1，200")).toBe("1200");
  });
});

describe("parseNumeric", () => {
  it("returns null for empty or non-numeric text", () => {
    expect(parseNumeric("")).toBeNull();
    expect(parseNumeric("abc")).toBeNull();
    expect(parseNumeric("1.2.3")).toBeNull();
  });
  it("parses normalised numbers", () => {
    expect(parseNumeric("１２０")).toBe(120);
    expect(parseNumeric("-0.5")).toBe(-0.5);
  });
});

function Harness({ initial = 120, onValueChange = () => {}, integer = false }: { initial?: number; onValueChange?: (n: number) => void; integer?: boolean }) {
  const [v, setV] = useState(initial);
  return (
    <NumberInput
      id="f"
      aria-label="延床面積"
      value={v}
      min={30}
      max={500}
      unit="㎡"
      integer={integer}
      onValueChange={(n) => {
        setV(n);
        onValueChange(n);
      }}
    />
  );
}

describe("NumberInput", () => {
  it("lets the field be cleared while typing without forcing 0", () => {
    const spy = vi.fn();
    render(<Harness onValueChange={spy} />);
    const input = screen.getByLabelText("延床面積") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(spy).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "90" } });
    expect(spy).toHaveBeenLastCalledWith(90);
  });

  it("accepts full-width digits and normalises on blur", () => {
    const spy = vi.fn();
    render(<Harness onValueChange={spy} />);
    const input = screen.getByLabelText("延床面積") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "１５０" } });
    expect(spy).toHaveBeenLastCalledWith(150);
    fireEvent.blur(input);
    expect(input.value).toBe("150");
  });

  it("clamps out-of-range values on blur and explains it", () => {
    const spy = vi.fn();
    render(<Harness onValueChange={spy} />);
    const input = screen.getByLabelText("延床面積") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "900" } });
    expect(spy).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(spy).toHaveBeenLastCalledWith(500);
    expect(input.value).toBe("500");
    expect(screen.getByText("30〜500㎡で入力してください。500にしました。")).toBeTruthy();
    // A valid edit clears the message
    fireEvent.change(input, { target: { value: "100" } });
    expect(screen.queryByText(/で入力してください/)).toBeNull();
  });

  it("clamps below the minimum too", () => {
    const spy = vi.fn();
    render(<Harness onValueChange={spy} />);
    const input = screen.getByLabelText("延床面積");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(spy).toHaveBeenLastCalledWith(30);
  });

  it("restores the previous value when left empty", () => {
    const spy = vi.fn();
    render(<Harness onValueChange={spy} />);
    const input = screen.getByLabelText("延床面積") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("120");
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText("数値を入力してください。元の値（120）に戻しました。")).toBeTruthy();
  });

  it("rounds integer fields", () => {
    const spy = vi.fn();
    render(<Harness onValueChange={spy} integer />);
    const input = screen.getByLabelText("延床面積");
    fireEvent.change(input, { target: { value: "120.6" } });
    expect(spy).toHaveBeenLastCalledWith(121);
  });

  it("selects the text on focus and follows external value changes", () => {
    const { rerender } = render(<NumberInput aria-label="x" value={5} onValueChange={() => {}} />);
    const input = screen.getByLabelText("x") as HTMLInputElement;
    const select = vi.spyOn(input, "select");
    fireEvent.focus(input);
    expect(select).toHaveBeenCalled();
    fireEvent.blur(input);
    rerender(<NumberInput aria-label="x" value={7} onValueChange={() => {}} />);
    expect(input.value).toBe("7");
  });

  it("keeps its own correction message but drops it when the value is replaced from outside", () => {
    function Outer() {
      const [v, setV] = useState(120);
      return (
        <>
          <NumberInput aria-label="area" value={v} min={30} max={500} unit="㎡" onValueChange={setV} />
          <button type="button" onClick={() => setV(80)}>
            restore
          </button>
        </>
      );
    }
    render(<Outer />);
    const input = screen.getByLabelText("area") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "900" } });
    fireEvent.blur(input);
    // The clamp commits 500 and the explanation survives that re-render
    expect(input.value).toBe("500");
    expect(screen.getByText("30〜500㎡で入力してください。500にしました。")).toBeTruthy();
    // A restore / undo elsewhere sets a new value: the old explanation must go
    fireEvent.click(screen.getByRole("button", { name: "restore" }));
    expect(input.value).toBe("80");
    expect(screen.queryByText(/で入力してください/)).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("without bounds accepts any number and uses the decimal keyboard", () => {
    const spy = vi.fn();
    render(<NumberInput aria-label="y" value={1} onValueChange={spy} />);
    const input = screen.getByLabelText("y");
    expect(input.getAttribute("inputmode")).toBe("decimal");
    fireEvent.change(input, { target: { value: "-3" } });
    expect(spy).toHaveBeenLastCalledWith(-3);
  });
});
