import { describe, expect, it } from "vitest";
import { decodeScopes, joinUrl, parseRateLimitHeaders } from "../src/wb.js";

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

describe("parseRateLimitHeaders", () => {
  it("parses WB rate-limit headers", () => {
    expect(
      parseRateLimitHeaders({
        "x-ratelimit-limit": "20",
        "x-ratelimit-remaining": "7",
        "x-ratelimit-reset": "12",
        "x-ratelimit-retry": "30"
      })
    ).toEqual({
      limit: 20,
      remaining: 7,
      resetSeconds: 12,
      retrySeconds: 30
    });
  });
});
