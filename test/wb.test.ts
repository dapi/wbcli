import { describe, expect, it } from "vitest";
import { decodeScopes, joinUrl } from "../src/wb.js";

describe("joinUrl", () => {
  it("joins base and path", () => {
    expect(joinUrl("https://example.test/", "/ping")).toBe("https://example.test/ping");
    expect(joinUrl("https://example.test", "ping")).toBe("https://example.test/ping");
  });

  it("keeps absolute URLs", () => {
    expect(joinUrl("https://example.test", "https://other.test/x")).toBe("https://other.test/x");
  });
});

describe("decodeScopes", () => {
  it("decodes documented scope bit positions", () => {
    expect(decodeScopes((1 << 2) | (1 << 5))).toEqual(["Analytics", "Statistics"]);
  });
});
