import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// jsdom には matchMedia が無いので no-op スタブ
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ResizeObserver: Recharts / radix で使用される
if (typeof window !== "undefined" && typeof (window as { ResizeObserver?: unknown }).ResizeObserver === "undefined") {
  (window as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// IntersectionObserver
if (typeof window !== "undefined" && typeof (window as { IntersectionObserver?: unknown }).IntersectionObserver === "undefined") {
  (window as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
}

// hasPointerCapture: radix の slider/select で使用 (jsdom には無い)
if (typeof Element !== "undefined" && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

// scrollIntoView も jsdom に無い
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
