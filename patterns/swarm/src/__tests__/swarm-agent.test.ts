import { describe, it, expect } from "vitest";
import { parseHandoff, stripHandoff } from "../swarm-runner.js";

describe("parseHandoff", () => {
  it("returns correct name for valid sales directive", () => {
    expect(parseHandoff("Let me transfer you. [HANDOFF:sales]")).toBe("sales");
  });

  it("returns correct name for valid support directive", () => {
    expect(parseHandoff("I'll connect you with support. [HANDOFF:support]")).toBe("support");
  });

  it("returns correct name for valid billing directive", () => {
    expect(parseHandoff("Transferring to billing. [HANDOFF:billing]")).toBe("billing");
  });

  it("returns correct name for valid triage directive", () => {
    expect(parseHandoff("[HANDOFF:triage]")).toBe("triage");
  });

  it("returns null when no handoff directive is present", () => {
    expect(parseHandoff("I can help you with that directly.")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseHandoff("")).toBeNull();
  });

  it("returns null for invalid agent name", () => {
    expect(parseHandoff("[HANDOFF:unknown]")).toBeNull();
  });

  it("handles case insensitivity", () => {
    expect(parseHandoff("[HANDOFF:SALES]")).toBe("sales");
    expect(parseHandoff("[HANDOFF:Sales]")).toBe("sales");
    expect(parseHandoff("[handoff:billing]")).toBe("billing");
  });
});

describe("stripHandoff", () => {
  it("removes directive from end of output", () => {
    expect(stripHandoff("Let me transfer you. [HANDOFF:sales]")).toBe(
      "Let me transfer you.",
    );
  });

  it("removes directive from middle of output", () => {
    expect(stripHandoff("Before [HANDOFF:support] after")).toBe(
      "Before  after",
    );
  });

  it("removes multiple directives", () => {
    expect(
      stripHandoff("[HANDOFF:sales] text [HANDOFF:billing]"),
    ).toBe("text");
  });

  it("returns original text when no directive present", () => {
    expect(stripHandoff("No handoff here")).toBe("No handoff here");
  });

  it("returns empty string when only directive present", () => {
    expect(stripHandoff("[HANDOFF:triage]")).toBe("");
  });
});
