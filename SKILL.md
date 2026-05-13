---
name: wbcli
description: "Use when working with the official Wildberries Seller API through the wbcli command-line tool: checking token scopes, testing connectivity, reading seller info, exploring read-only WB endpoints, planning data exports for Google Sheets, or debugging WB API access. This skill is for authorized seller API access only; do not use it for scraping private cabinet endpoints, bypassing permissions, or handling tokens insecurely."
---

# wbcli

Use `wbcli` for authorized, token-based access to the official Wildberries Seller API.

## Safety Rules

- Use only official WB Seller API tokens created in the seller cabinet.
- Never print, commit, paste, or send the token to online JWT decoders.
- Prefer read-only tokens for analytics work.
- Do not scrape private cabinet endpoints or reuse browser sessions.
- Store the token in `WB_TOKEN` or `.env`; keep `.env` out of git.

## Setup

If the CLI is not installed:

```bash
npm install -g github:dapi/wbcli
```

For local repo development:

```bash
cd ~/code/wbcli
npm install
npm run build
```

Set a token:

```bash
export WB_TOKEN='...'
```

## Common Checks

Decode token payload locally:

```bash
wbcli token:decode
```

Check API connectivity:

```bash
wbcli ping
```

Check seller identity:

```bash
wbcli seller-info
```

Call a read-only endpoint:

```bash
wbcli raw GET /ping --base common
```

Inspect WB rate-limit headers for a method:

```bash
wbcli ping --rate-limit
wbcli raw GET /ping --base common --rate-limit --include-headers
```

Retry a one-off request only when WB returns a short `X-Ratelimit-Retry`:

```bash
wbcli raw GET /ping --base common --retry-on-429 --max-retries 1
```

Do not use automatic retry on low-frequency endpoints such as `seller-info` when
the retry window is long. Cache those results instead.

## Endpoint Selection

Use base aliases instead of hardcoding domains when possible:

- `common`
- `analytics`
- `statistics`
- `promotion`
- `marketplace`
- `feedbacks`
- `prices`
- `content`
- `finance`

Before building a workflow, verify the required token scopes with `wbcli token:decode`, then test the smallest read-only endpoint first.

## Rate-Limit Handling

- WB API limits are endpoint- and token-type-specific; do not assume one global rate.
- Prefer `--rate-limit` during exploration to see parsed `X-Ratelimit-*` values.
- On `429`, read `rateLimit.retrySeconds`; wait that long or stop and report the limit.
- Avoid repeated `ping` and `seller-info` checks in loops. `seller-info` can have very low limits and should be cached after a successful check.
- For data exports, throttle requests according to the method documentation and add pagination/date-window checkpoints instead of firing parallel requests.

## TASK-10 Guidance

For Pappado TASK-10, use `wbcli` to investigate which WB endpoints can support:

- `nmID` / vendor code mapping;
- orders, sales, returns;
- buyout or funnel metrics;
- promotion campaign stats;
- finance/expense data.

Keep raw API findings out of canonical business docs until they are verified against WB cabinet exports or another reliable source.
