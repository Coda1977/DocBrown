import { describe, test, expect } from "vitest";
import { generateShortCode } from "./shortCode";

const VALID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const AMBIGUOUS_CHARS = ["0", "O", "1", "I", "L"];

describe("generateShortCode", () => {
  test("returns a 6-character string", () => {
    const code = generateShortCode();
    expect(code).toHaveLength(6);
  });

  test("only contains characters from the valid charset", () => {
    const code = generateShortCode();
    for (const char of code) {
      expect(VALID_CHARS).toContain(char);
    }
  });

  test("never contains ambiguous characters (0, O, 1, I, L)", () => {
    // Generate many codes to increase confidence
    for (let i = 0; i < 100; i++) {
      const code = generateShortCode();
      for (const char of AMBIGUOUS_CHARS) {
        expect(code).not.toContain(char);
      }
    }
  });

  test("1000 generated codes are all 6 chars and valid charset", () => {
    for (let i = 0; i < 1000; i++) {
      const code = generateShortCode();
      expect(code).toHaveLength(6);
      for (const char of code) {
        expect(VALID_CHARS).toContain(char);
      }
    }
  });

  test("at least 900/1000 codes are unique (probabilistic)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateShortCode());
    }
    expect(codes.size).toBeGreaterThanOrEqual(900);
  });
});
