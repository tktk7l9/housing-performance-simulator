import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepShell } from "../StepShell";
import { Field } from "../Field";

describe("StepShell", () => {
  it("title / description / children / 前へ・次へを描画", () => {
    render(
      <StepShell title="タイトル" description="説明" onBack={() => {}} onNext={() => {}}>
        <p>本文</p>
      </StepShell>
    );
    expect(screen.getByText("タイトル")).toBeTruthy();
    expect(screen.getByText("説明")).toBeTruthy();
    expect(screen.getByText("本文")).toBeTruthy();
    expect(screen.getByText("前へ")).toBeTruthy();
    expect(screen.getByText("次へ")).toBeTruthy();
  });

  it("onBack 無しなら 前へ が disabled", () => {
    render(
      <StepShell title="X" onNext={() => {}}>
        <p>c</p>
      </StepShell>
    );
    const back = screen.getByText("前へ").closest("button") as HTMLButtonElement;
    expect(back.disabled).toBe(true);
  });

  it("onNext 無しなら 次へ が disabled", () => {
    render(
      <StepShell title="X" onBack={() => {}}>
        <p>c</p>
      </StepShell>
    );
    const next = screen.getByText("次へ").closest("button") as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("hideNext で 次へボタン非表示", () => {
    render(
      <StepShell title="X" hideNext onBack={() => {}}>
        <p>c</p>
      </StepShell>
    );
    expect(screen.queryByText("次へ")).toBeNull();
  });

  it("nextLabel をカスタマイズ", () => {
    render(
      <StepShell title="X" nextLabel="計算する" onNext={() => {}}>
        <p>c</p>
      </StepShell>
    );
    expect(screen.getByText("計算する")).toBeTruthy();
  });

  it("description なしでも描画", () => {
    render(
      <StepShell title="X" onNext={() => {}}>
        <p>c</p>
      </StepShell>
    );
    expect(screen.getByText("X")).toBeTruthy();
  });

  it("ボタンクリックで onBack / onNext", () => {
    const onBack = vi.fn();
    const onNext = vi.fn();
    render(
      <StepShell title="X" onBack={onBack} onNext={onNext}>
        <p>c</p>
      </StepShell>
    );
    fireEvent.click(screen.getByText("前へ"));
    fireEvent.click(screen.getByText("次へ"));
    expect(onBack).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });
});

describe("Field", () => {
  it("label / unit / hint / children", () => {
    render(
      <Field id="x" label="名前" unit="㎡" hint="ヒント">
        <input id="x" />
      </Field>
    );
    expect(screen.getByText("名前")).toBeTruthy();
    expect(screen.getByText("㎡")).toBeTruthy();
    expect(screen.getByText("ヒント")).toBeTruthy();
  });

  it("unit / hint なし", () => {
    render(
      <Field id="x" label="X">
        <input id="x" />
      </Field>
    );
    expect(screen.getByText("X")).toBeTruthy();
  });

  it("htmlFor が id に紐づく", () => {
    render(
      <Field id="email" label="メール">
        <input id="email" />
      </Field>
    );
    const label = screen.getByText("メール").closest("label");
    expect(label?.getAttribute("for")).toBe("email");
  });
});
