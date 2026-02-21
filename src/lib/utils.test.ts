import { describe, test, expect } from "vitest";
import { cn } from "./utils";

describe("cn()", () => {
  test("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("handles conditional/falsy classes", () => {
    expect(cn("foo", false && "bar")).toBe("foo");
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  test("handles undefined/null inputs without crashing", () => {
    expect(cn(undefined)).toBe("");
    expect(cn(null)).toBe("");
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  test("merges conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("handles arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
    expect(cn(["foo"], "baz")).toBe("foo baz");
  });
});
