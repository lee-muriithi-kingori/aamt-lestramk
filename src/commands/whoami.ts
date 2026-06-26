import { Command } from "commander";
import { get } from "../lib/api.js";
import { loadCredentials, getApiHost } from "../lib/config.js";
import { c, success, error, info, warning, header, withSpinner, outputKeyValue } from "../lib/ui.js";
import type { ApiResponse, UserProfile } from "../types.js";

export const whoamiCmd = new Command("whoami")
  .description("Show the current authenticated user")
  .action(async () => {
    const creds = loadCredentials();

    if (!creds?.apiKey) {
      header("Not Authenticated");
      console.log();
      console.log("You are not currently authenticated with AAMT.");
      console.log();
      console.log(`To get started:`);
      console.log(`  1. Visit ${c.secondary(getApiHost() + "/settings/security")}`);
      console.log(`  2. Create an API key`);
      console.log(`  3. Run ${c.bold("aamt auth login")}`);
      console.log();
      process.exit(1);
    }

    const res = await withSpinner("Fetching user info...", () =>
      get<ApiResponse<{ user: UserProfile; scopes: string[] }>>("/auth/me")
    );

    if (!res.success || !res.data) {
      error(res.error || "Failed to verify authentication");
      console.log();
      warning("Your stored credentials may be invalid.");
      info(`Run ${c.bold("aamt auth login")} to re-authenticate.`);
      process.exit(1);
    }

    const { user, scopes } = res.data;

    header("Authenticated User");
    console.log();

    outputKeyValue({
      Name: c.bold(user.name),
      Email: user.email,
      Role: c.bold(user.role),
      Verified: user.verified ? c.success("Yes") : c.warning("No"),
      Location: user.location || "—",
      Headline: user.headline || "—",
    });

    if (scopes?.length) {
      console.log();
      console.log(c.bold("API Scopes:"));
      scopes.forEach((s) => console.log(`  • ${s}`));
    }

    console.log();
    success(`Authenticated to ${getApiHost()}`);
  });

// ─── Status Command ──────────────────────────────────────────────────

export const statusCmd = new Command("status")
  .description("Check AAMT API status")
  .action(async () => {
    const start = Date.now();
    try {
      const res = await get<ApiResponse<{ version: string; status: string }>>("/uptime");
      const latency = Date.now() - start;

      if (res.success) {
        header("AAMT API Status");
        console.log();
        outputKeyValue({
          Status: c.success("Operational"),
          Latency: `${latency}ms`,
          Version: res.data?.version || "—",
          Host: getApiHost(),
        });
      } else {
        header("AAMT API Status");
        console.log();
        outputKeyValue({
          Status: c.warning("Degraded"),
          Latency: `${latency}ms`,
          Message: res.error || "API returned error",
        });
      }
    } catch (err) {
      header("AAMT API Status");
      console.log();
      const msg = err instanceof Error ? err.message : "Unknown error";
      outputKeyValue({
        Status: c.error("Unreachable"),
        Error: msg,
        Host: getApiHost(),
      });
    }
  });
