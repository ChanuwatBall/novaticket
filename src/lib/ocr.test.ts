import { describe, expect, it } from "vitest";
import { normalizeOcrText } from "./ocr";

describe("normalizeOcrText", () => {
  it("removes control characters and normalizes whitespace for Thai OCR output", () => {
    const input = "\u200fข้อความไทย\n1234\u200f\u200f";

    expect(normalizeOcrText(input)).toBe("ข้อความไทย 1234");
  });

  it("keeps a passport-like identifier with letters and numbers", () => {
    const input = "  P1234567  ";

    expect(normalizeOcrText(input)).toBe("P1234567");
  });
});
