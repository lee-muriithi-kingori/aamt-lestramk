import { Command } from "commander";
import open from "open";
import { loginInteractive, logout, getAuthStatus, refreshAuth, hasScope } from "../lib/auth.js";
import { getApiHost, setConfig } from "../lib/config.js";
import { c, success, error, info, header, promptInput, promptSelect, withSpinner, confirm } from "../lib/ui.js";
import { API_SCOPES } from "../types.js";

export const authCmd = new Command("auth").description("Authenticate with AAMT");

// ─── Login ───────────────────────────────────────────────────────────

authCmd
  .command("login")
  .description("Authenticate with your AAMT API key")
  .option("-h, --host <host>", "AAMT instance hostname")
  .option("-t, --token <token>", "API key to authenticate with")
  .option("--web", "Open the browser to create an API key")
  .action(async (opts) => {
    if (opts.web) {
      const host = opts.host || getApiHost();
      const url = `${host}/settings/security`;
      info(`Opening ${url}...`);
      await open(url);
      info("Create an API key in the browser, then run:");
      console.log(`  ${c.bold("aamt auth login")}`);
      return;
    }

    if (opts.host) {
      setConfig("apiHost", opts.host);
      info(`API host set to ${opts.host}`);
    }

    let token = opts.token;
    if (!token) {
      console.log();
      console.log(c.bold("Welcome to AAMT CLI!"));
      console.log();
      console.log(
        "You need an API key to authenticate. You can create one at:"
      );
      console.log(`  ${c.secondary(getApiHost() + "/settings/security")}`);
      console.log();
      console.log(
        c.muted(
          "Your API key stays on this machine and is never shared."
        )
      );
      console.log();

      token = await promptInput("Paste your API key:", {
        password: true,
        validate: (v) => v.trim().length > 0 || "API key is required",
      });
    }

    const result = await withSpinner("Verifying API key...", () =>
      loginInteractive(token.trim())
    );

    if (!result.success) {
      error(result.error || "Authentication failed");
      process.exit(1);
    }

    const profile = result.profile!;
    success(`Authenticated as ${c.bold(profile.name)} (${profile.email})`);
    info(`Role: ${c.bold(profile.role)}`);
    if (result.scopes?.length) {
      info(`Scopes: ${result.scopes.join(", ")}`);
    }
    console.log();
    console.log(`Run ${c.bold("aamt whoami")} to verify your session anytime.`);
  });

// ─── Logout ──────────────────────────────────────────────────────────

authCmd
  .command("logout")
  .description("Remove stored credentials")
  .option("-y, --yes", "Skip confirmation")
  .action(async (opts) => {
    const status = getAuthStatus();
    if (!status.authenticated) {
      info("You are not currently authenticated.");
      return;
    }

    if (!opts.yes) {
      const ok = await confirm("Remove stored credentials?");
      if (!ok) {
        info("Cancelled.");
        return;
      }
    }

    logout();
    success("Logged out successfully. Credentials removed.");
  });

// ─── Status ──────────────────────────────────────────────────────────

authCmd
  .command("status")
  .description("Show authentication status")
  .action(async () => {
    const status = getAuthStatus();

    header("Authentication Status");

    if (!status.authenticated) {
      console.log(`  Status: ${c.error("Not authenticated")}`);
      console.log();
      console.log(
        `Run ${c.bold("aamt auth login")} to authenticate with your API key.`
      );
      return;
    }

    console.log(`  Status:     ${c.success("Authenticated")}`);
    console.log(`  User:       ${c.bold(status.creds!.name || "—")}`);
    console.log(`  Email:      ${status.creds!.email || "—")}`);
    console.log(`  Role:       ${c.bold(status.creds!.role || "—")}`);
    console.log(`  API Key:    ${status.creds!.apiKey}`);
    console.log(`  Last verified: ${status.creds!.lastVerified || "—")}`);

    const refreshed = await refreshAuth();
    if (!refreshed.success) {
      console.log();
      warning("Your API key appears to be invalid or expired.");
      info(`Run ${c.bold("aamt auth login")} to re-authenticate.`);
    } else {
      console.log(`  Key valid:  ${c.success("Yes")}`);
      if (refreshed.scopes?.length) {
        console.log(`  Scopes:     ${refreshed.scopes.join(", ")}`);
      }
    }
  });

// ─── Refresh ─────────────────────────────────────────────────────────

authCmd
  .command("refresh")
  .description("Refresh and verify your API key")
  .action(async () => {
    const result = await withSpinner("Refreshing credentials...", () =>
      refreshAuth()
    );

    if (!result.success) {
      error(result.error || "Failed to refresh");
      process.exit(1);
    }

    success("Credentials refreshed successfully.");
    if (result.profile) {
      info(`Authenticated as ${c.bold(result.profile.name)}`);
    }
  });

// ─── Scopes ──────────────────────────────────────────────────────────

authCmd
  .command("scopes")
  .description("List available API scopes")
  .action(() => {
    header("Available API Scopes");
    console.log();
    console.log("When creating an API key in your dashboard, you can choose from:");
    console.log();

    API_SCOPES.forEach(
      (s) => {
        const active = hasScope(s.value);
        const marker = active ? c.success("✔") : c.muted("○");
        console.log(`  ${marker} ${c.bold(s.value.padEnd(28))} ${s.description}`);
      }
    );

    console.log();
    info(`${c.success("✔")} = Your current key has this scope`);
  });
