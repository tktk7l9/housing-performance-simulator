/**
 * Behaviour of the small shadcn-style primitives: what a user sees, focuses and toggles.
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs";
import { Slider } from "../slider";
import { Separator } from "../separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../card";
import { Badge } from "../badge";
import { Button } from "../button";

describe("Tabs", () => {
  function renderTabs() {
    return render(
      <Tabs defaultValue="cost">
        <TabsList>
          <TabsTrigger value="cost">コスト</TabsTrigger>
          <TabsTrigger value="co2">CO2</TabsTrigger>
        </TabsList>
        <TabsContent value="cost">コストの内訳</TabsContent>
        <TabsContent value="co2">排出量の内訳</TabsContent>
      </Tabs>
    );
  }

  it("shows only the default panel until another tab is chosen", () => {
    renderTabs();
    expect(screen.getByText("コストの内訳")).toBeTruthy();
    expect(screen.queryByText("排出量の内訳")).toBeNull();
    expect(screen.getByRole("tab", { name: "コスト" }).getAttribute("aria-selected")).toBe("true");
  });

  it("clicking a tab swaps the visible panel", () => {
    renderTabs();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "CO2" }), { button: 0 });
    fireEvent.click(screen.getByRole("tab", { name: "CO2" }));
    expect(screen.getByText("排出量の内訳")).toBeTruthy();
    expect(screen.queryByText("コストの内訳")).toBeNull();
    expect(screen.getByRole("tab", { name: "CO2" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("Slider", () => {
  it("exposes its value to assistive tech and moves with the keyboard", () => {
    render(<Slider defaultValue={[4]} min={0} max={10} step={1} />);
    const thumb = screen.getByRole("slider");
    expect(thumb.getAttribute("aria-valuenow")).toBe("4");
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(thumb.getAttribute("aria-valuenow")).toBe("5");
    fireEvent.keyDown(thumb, { key: "Home" });
    expect(thumb.getAttribute("aria-valuenow")).toBe("0");
  });
});

describe("Separator", () => {
  it("is decorative by default and can be made a semantic vertical separator", () => {
    const { container, rerender } = render(<Separator />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("role")).toBe("none");
    expect(el.className).toContain("w-full");

    rerender(<Separator orientation="vertical" decorative={false} />);
    const sem = container.firstElementChild as HTMLElement;
    expect(sem.getAttribute("role")).toBe("separator");
    expect(sem.getAttribute("aria-orientation")).toBe("vertical");
    expect(sem.className).toContain("h-full");
  });
});

describe("Card", () => {
  it("renders header, description, content and footer in reading order", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>初期費用</CardTitle>
          <CardDescription>補助金控除後</CardDescription>
        </CardHeader>
        <CardContent>1,200万円</CardContent>
        <CardFooter>出典: 試算</CardFooter>
      </Card>
    );
    const text = container.textContent ?? "";
    expect(text.indexOf("初期費用")).toBeLessThan(text.indexOf("補助金控除後"));
    expect(text.indexOf("補助金控除後")).toBeLessThan(text.indexOf("1,200万円"));
    expect(text.indexOf("1,200万円")).toBeLessThan(text.indexOf("出典: 試算"));
  });
});

describe("Badge and Button", () => {
  it("Badge accepts a variant and extra classes", () => {
    render(<Badge variant="outline" className="extra">ZEH</Badge>);
    const badge = screen.getByText("ZEH");
    expect(badge.className).toContain("extra");
  });

  it("Button asChild renders the child element with button styling", () => {
    render(
      <Button asChild variant="outline">
        <a href="/simulator">開始</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "開始" });
    expect(link.getAttribute("href")).toBe("/simulator");
    expect(link.className).toContain("border");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
