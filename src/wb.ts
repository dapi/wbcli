export const baseUrls = {
  common: "https://common-api.wildberries.ru",
  analytics: "https://seller-analytics-api.wildberries.ru",
  statistics: "https://statistics-api.wildberries.ru",
  promotion: "https://advert-api.wildberries.ru",
  marketplace: "https://marketplace-api.wildberries.ru",
  feedbacks: "https://feedbacks-api.wildberries.ru",
  prices: "https://discounts-prices-api.wildberries.ru",
  content: "https://content-api.wildberries.ru",
  finance: "https://seller-finance-api.wildberries.ru"
} as const;

export type BaseName = keyof typeof baseUrls;

export const tokenScopes: Record<number, string> = {
  1: "Content",
  2: "Analytics",
  3: "Prices and discounts",
  4: "Marketplace",
  5: "Statistics",
  6: "Promotion",
  7: "Feedbacks and Questions",
  9: "Buyers chat",
  10: "Supplies",
  11: "Buyers returns",
  12: "Documents",
  13: "Finance",
  16: "Users",
  30: "Read only token"
};

export type RateLimitInfo = {
  limit?: number;
  remaining?: number;
  resetSeconds?: number;
  retrySeconds?: number;
};

export type WbResult = {
  status: number;
  headers: Record<string, string>;
  rateLimit: RateLimitInfo;
  data: unknown;
};

export function resolveBase(name: string): string {
  if (!(name in baseUrls)) {
    const allowed = Object.keys(baseUrls).join(", ");
    throw new Error(`Unknown base "${name}". Allowed: ${allowed}`);
  }
  return baseUrls[name as BaseName];
}

export function joinUrl(base: string, pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function requireToken(explicit?: string): string {
  const token = explicit || process.env.WB_TOKEN;
  if (!token) {
    throw new Error("WB token is required. Set WB_TOKEN or pass --token.");
  }
  return token;
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  if (!payload) {
    throw new Error("Token does not look like a JWT.");
  }
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
}

export function decodeScopes(bitmask: unknown): string[] {
  if (typeof bitmask !== "number") return [];
  return Object.entries(tokenScopes)
    .filter(([bit]) => (bitmask & (1 << Number(bit))) !== 0)
    .map(([, scope]) => scope);
}

export function parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo {
  return {
    limit: parseOptionalNumber(headers["x-ratelimit-limit"]),
    remaining: parseOptionalNumber(headers["x-ratelimit-remaining"]),
    resetSeconds: parseOptionalNumber(headers["x-ratelimit-reset"]),
    retrySeconds: parseOptionalNumber(headers["x-ratelimit-retry"])
  };
}

export async function wbRequest(input: {
  token: string;
  method: string;
  url: string;
  body?: unknown;
}): Promise<WbResult> {
  const response = await fetch(input.url, {
    method: input.method,
    headers: {
      Authorization: input.token,
      Accept: "application/json",
      ...(input.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body)
  });

  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const data = text && contentType.includes("application/json") ? JSON.parse(text) : text;
  const headers = Object.fromEntries(response.headers.entries());
  return { status: response.status, headers, rateLimit: parseRateLimitHeaders(headers), data };
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
