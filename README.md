# wbcli

`wbcli` is a small command-line toolkit for the official Wildberries Seller API.

The first version is intentionally conservative: it uses the official REST API directly, keeps tokens local, and provides only safe read/debug commands plus a raw request escape hatch.

## Stack Decision

Use Node.js + TypeScript.

Why:

- npm gives the cleanest path to `npx`, global CLI installs, GitHub package installs, and later npm publication.
- WB API is HTTP/OpenAPI; Node 20+ has stable `fetch`, so the first version does not need a heavy SDK.
- Agent tooling and MCP servers around WB are already mostly Node/npm based.
- Python remains useful later for analytics, pandas, and Google Sheets export, but it is weaker for a first-class `npx` CLI package here.

## Library Choices

- `commander` — CLI routing.
- `dotenv` — local `.env` loading.
- `zod` — input validation.
- Node built-in `fetch` — direct official WB API calls.
- No unofficial WB SDK in core v0.1. Generated clients can be added later after endpoint coverage stabilizes.

## Plan

1. MVP foundation:
   - token loading from `WB_TOKEN` / `--token`;
   - local JWT payload decode;
   - `/ping`;
   - seller info;
   - `raw` command for arbitrary WB endpoints.
2. Read-only TASK-10 endpoints:
   - statistics/orders/sales;
   - analytics/funnel/buyouts;
   - promotion campaign stats;
   - finance/expenses if available by token.
3. Output contracts:
   - `--json` default;
   - CSV later for Google Sheet imports;
   - stable field names for `sku_map`, `fact_sku_day`, `unit_economics`.
4. Safety:
   - no token logging;
   - rate limit awareness;
   - read-only default;
   - write commands require explicit `--write` and should be added only after review.
5. Skill:
   - root `SKILL.md` teaches agents how to use `wbcli` safely for WB Seller API tasks.

## Install From GitHub

After this repository is published:

```bash
npm install -g github:dapi/wbcli
```

or run directly:

```bash
npx github:dapi/wbcli --help
```

## Use

```bash
cp .env.example .env
# edit .env and set WB_TOKEN

npm install
npm run build

wbcli token:decode
wbcli ping
wbcli seller-info
wbcli raw GET /ping --base common
```

## Official Access Model

Use only the official WB Seller API token from the seller account. Do not scrape private cabinet endpoints or reuse browser sessions. WB API requests authenticate through the `Authorization` header.
