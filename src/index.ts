#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";
import {
  decodeJwtPayload,
  decodeScopes,
  joinUrl,
  requireToken,
  resolveBase,
  type WbResult,
  wbRequest
} from "./wb.js";

const program = new Command();

program
  .name("wbcli")
  .description("CLI for the official Wildberries Seller API")
  .version("0.1.0")
  .option("--token <token>", "WB API token; defaults to WB_TOKEN")
  .option("--json", "print raw JSON output", true)
  .option("--include-headers", "include response headers in output")
  .option("--rate-limit", "include parsed WB rate-limit headers in output")
  .option("--retry-on-429", "sleep and retry when WB returns 429 with X-Ratelimit-Retry")
  .option("--max-retries <count>", "maximum retries for --retry-on-429", parseNonNegativeInt, 1);

program
  .command("token:decode")
  .description("Decode WB JWT payload locally without sending it anywhere")
  .action(() => {
    const token = requireToken(program.opts().token);
    const payload = decodeJwtPayload(token);
    console.log(JSON.stringify({ payload, scopes: decodeScopes(payload.s) }, null, 2));
  });

program
  .command("ping")
  .description("Check WB API connectivity through /ping")
  .option("--base <name>", "base URL alias", "common")
  .action(async (options) => {
    const token = requireToken(program.opts().token);
    const url = joinUrl(resolveBase(options.base), "/ping");
    const result = await requestWithRetry({ token, method: "GET", url });
    printResult(result);
  });

program
  .command("seller-info")
  .description("Get seller information from the common API")
  .action(async () => {
    const token = requireToken(program.opts().token);
    const url = joinUrl(resolveBase("common"), "/api/v1/seller-info");
    const result = await requestWithRetry({ token, method: "GET", url });
    printResult(result);
  });

program
  .command("raw")
  .description("Call an arbitrary WB API endpoint")
  .argument("<method>", "HTTP method")
  .argument("<path-or-url>", "endpoint path or full URL")
  .option("--base <name>", "base URL alias for relative paths", "common")
  .option("--body <json>", "JSON request body")
  .action(async (method, pathOrUrl, options) => {
    const token = requireToken(program.opts().token);
    const body = parseBody(options.body);
    const url = joinUrl(resolveBase(options.base), pathOrUrl);
    const result = await requestWithRetry({ token, method: method.toUpperCase(), url, body });
    printResult(result);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

function parseBody(raw?: string): unknown {
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as unknown;
  return z.unknown().parse(parsed);
}

async function requestWithRetry(input: {
  token: string;
  method: string;
  url: string;
  body?: unknown;
}): Promise<WbResult> {
  const options = program.opts();
  const maxRetries = Number(options.maxRetries);

  for (let attempt = 0; ; attempt += 1) {
    const result = await wbRequest(input);
    const retrySeconds = result.rateLimit.retrySeconds;

    if (
      result.status !== 429 ||
      !options.retryOn429 ||
      attempt >= maxRetries ||
      retrySeconds === undefined
    ) {
      return result;
    }

    console.error(`WB API rate limit hit. Retrying in ${retrySeconds}s (${attempt + 1}/${maxRetries}).`);
    await sleep(retrySeconds * 1000);
  }
}

function parseNonNegativeInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("--max-retries must be a non-negative integer.");
  }
  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printResult(result: WbResult): void {
  const options = program.opts();
  const output = {
    data: result.data,
    ...(options.rateLimit ? { rateLimit: result.rateLimit } : {}),
    ...(options.includeHeaders ? { headers: result.headers } : {})
  };

  if (result.status >= 400) {
    console.error(JSON.stringify({ status: result.status, ...output }, null, 2));
    process.exit(1);
  }

  if (options.rateLimit || options.includeHeaders) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(JSON.stringify(result.data, null, 2));
  }
}
