import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepShell } from "../StepShell";
import { Field } from "../Field";

describe("StepShell", () => {
  it("renders title, description, children and the back/next buttons", () => {
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

  it("disables the back button without onBack", () => {
    render(
      <StepShell title="X" onNext={() => {}}>
        <p>c</p>
      </StepShell>
    );
    const back = screen.getByText("前へ").closest("button") as HTMLButtonElement;
    expect(back.disabled).toBe(true);
  });

  it("disables the next button without onNext", () => {
    render(
      <StepShell title="X" onBack={() => {}}>
        <p>c</p>
      </StepShell>
    );
    const next = screen.getByText("次へ").closest("button") as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("hides the next button with hideNext", () => {
    render(
      <StepShell title="X" hideNext onBack={() => {}}>
        <p>c</p>
      </StepShell>
    );
    expect(screen.queryByText("次へ")).toBeNull();
  });

  it("uses a custom nextLabel", () => {
    render(
      <StepShell title="X" nextLabel="計算する" onNext={() => {}}>
        <p>c</p>
      </StepShell>
    );
    expect(screen.getByText("計算する")).toBeTruthy();
  });

  it("renders without a description", () => {
    render(
      <StepShell title="X" onNext={() => {}}>
        <p>c</p>
      </StepShell>
    );
    expect(screen.getByText("X")).toBeTruthy();
  });

  it("calls onBack / onNext on button clicks", () => {
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

  it("renders without unit and hint", () => {
    render(
      <Field id="x" label="X">
        <input id="x" />
      </Field>
    );
    expect(screen.getByText("X")).toBeTruthy();
  });

  it("links htmlFor to the input id", () => {
    render(
      <Field id="email" label="メール">
        <input id="email" />
      </Field>
    );
    const label = screen.getByText("メール").closest("label");
    expect(label?.getAttribute("for")).toBe("email");
  });
});
