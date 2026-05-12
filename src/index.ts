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
  wbRequest
} from "./wb.js";

const program = new Command();

program
  .name("wbcli")
  .description("CLI for the official Wildberries Seller API")
  .version("0.1.0")
  .option("--token <token>", "WB API token; defaults to WB_TOKEN")
  .option("--json", "print raw JSON output", true);

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
    const result = await wbRequest({ token, method: "GET", url });
    printResult(result);
  });

program
  .command("seller-info")
  .description("Get seller information from the common API")
  .action(async () => {
    const token = requireToken(program.opts().token);
    const url = joinUrl(resolveBase("common"), "/api/v1/seller-info");
    const result = await wbRequest({ token, method: "GET", url });
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
    const result = await wbRequest({ token, method: method.toUpperCase(), url, body });
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

function printResult(result: { status: number; data: unknown }): void {
  if (result.status >= 400) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result.data, null, 2));
}
