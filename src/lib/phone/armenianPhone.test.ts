import { describe, expect, it } from "vitest";
import { normalizePhoneNumber } from "@/lib/phone/armenianPhone";

describe("normalizePhoneNumber", () => {
  it.each([
    ["091123456", "+37491123456"],
    ["091 12 34 56", "+37491123456"],
    ["(091) 12-34-56", "+37491123456"],
    ["91123456", "+37491123456"],
    ["37491123456", "+37491123456"],
    ["+374 91 123456", "+37491123456"],
    ["0037491123456", "+37491123456"]
  ])("Armenian %s -> %s", (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  it.each([
    ["+7 916 123-45-67", "+79161234567"],
    ["+1 (212) 555-0100", "+12125550100"],
    ["0079161234567", "+79161234567"]
  ])("keeps the country code of international %s", (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "12", "+", "++37491123456", "374+91123456", "+0123456789", "+1234567890123456"])(
    "rejects %j",
    (input) => {
      expect(normalizePhoneNumber(input)).toBeNull();
    }
  );
});
