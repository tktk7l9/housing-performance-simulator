/**
 * lazyStep: the code-splitting wrapper that keeps the later steps (and the chart library the
 * results step brings) out of the first paint.
 */
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { lazyStep } from "../lazy-step";

type Props = { onNext: () => void };

function Counter({ onNext }: Props) {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => (n === 2 ? onNext() : setN(n + 1))}>
      count {n}
    </button>
  );
}

describe("lazyStep", () => {
  it("shows its own loading status until the step's code arrives, then the step", async () => {
    let resolve!: (c: typeof Counter) => void;
    const Step = lazyStep<Props>(() => new Promise((r) => (resolve = r)));
    render(<Step onNext={() => {}} />);
    expect(screen.getByRole("status").textContent).toBe("読み込み中…");
    await act(async () => resolve(Counter));
    expect(await screen.findByText("count 0")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders without a loading state once preloaded, loading the code only once", async () => {
    const load = vi.fn(async () => Counter);
    const Step = lazyStep<Props>(load);
    await Step.preload();
    await Step.preload();
    expect(load).toHaveBeenCalledTimes(1);
    render(<Step onNext={() => {}} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("count 0")).toBeTruthy();
  });

  it("keeps the step mounted (and its state) when the parent re-renders after loading", async () => {
    let resolve!: (c: typeof Counter) => void;
    const Step = lazyStep<Props>(() => new Promise((r) => (resolve = r)));
    const onNext = vi.fn();
    function Parent({ tick }: { tick: number }) {
      return (
        <>
          <span>tick {tick}</span>
          <Step onNext={onNext} />
        </>
      );
    }
    const { rerender } = render(<Parent tick={0} />);
    await act(async () => resolve(Counter));
    fireEvent.click(await screen.findByText("count 0"));
    rerender(<Parent tick={1} />);
    expect(screen.getByText("count 1")).toBeTruthy();
    fireEvent.click(screen.getByText("count 1"));
    fireEvent.click(screen.getByText("count 2"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed preload", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(Counter);
    const Step = lazyStep<Props>(load);
    await expect(Step.preload()).rejects.toThrow("offline");
    await expect(Step.preload()).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
