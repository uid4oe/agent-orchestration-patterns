import { describe, it, expect } from "vitest";
import { parseIntent } from "../router-agent.js";

describe("parseIntent", () => {
  it("parses BILLING from exact match", () => {
    expect(parseIntent("BILLING")).toBe("BILLING");
  });

  it("parses TECHNICAL from exact match", () => {
    expect(parseIntent("TECHNICAL")).toBe("TECHNICAL");
  });

  it("parses GENERAL from exact match", () => {
    expect(parseIntent("GENERAL")).toBe("GENERAL");
  });

  it("handles lowercase input", () => {
    expect(parseIntent("billing")).toBe("BILLING");
    expect(parseIntent("technical")).toBe("TECHNICAL");
    expect(parseIntent("general")).toBe("GENERAL");
  });

  it("handles mixed case input", () => {
    expect(parseIntent("Billing")).toBe("BILLING");
    expect(parseIntent("Technical")).toBe("TECHNICAL");
  });

  it("trims whitespace", () => {
    expect(parseIntent("  BILLING  ")).toBe("BILLING");
    expect(parseIntent("\nTECHNICAL\n")).toBe("TECHNICAL");
  });

  it("extracts category from longer text", () => {
    expect(parseIntent("I think this is a BILLING question")).toBe("BILLING");
    expect(parseIntent("Category: TECHNICAL")).toBe("TECHNICAL");
  });

  it("defaults to GENERAL for unrecognized input", () => {
    expect(parseIntent("UNKNOWN")).toBe("GENERAL");
    expect(parseIntent("")).toBe("GENERAL");
    expect(parseIntent("something random")).toBe("GENERAL");
  });

  it("prefers BILLING when multiple categories present", () => {
    // BILLING comes first in the check order
    expect(parseIntent("BILLING or TECHNICAL")).toBe("BILLING");
  });
});
