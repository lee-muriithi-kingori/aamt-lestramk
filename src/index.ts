#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { authCmd } from "./commands/auth.js";
import { resumeCmd } from "./commands/resume.js";
import { jobsCmd } from "./commands/jobs.js";
import { profileCmd } from "./commands/profile.js";
import { applicationsCmd } from "./commands/applications.js";
import { configCmd } from "./commands/config.js";
import { whoamiCmd, statusCmd } from "./commands/whoami.js";
import { showBanner, showHelpFooter, c, error } from "./lib/ui.js";
import { getApiHost } from "./lib/config.js";

// ─── Version ─────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf-8")
    );
    return pkg.version;
  } catch {
    return "1.0.0";
  }
}

// ─── CLI Setup ───────────────────────────────────────────────────────

const program = new Command("aamt")
  .description("AAMT Lestramk CLI — Africa's Talent Marketplace")
  .version(getVersion(), "-v, --version", "Show version number")
  .option("-H, --host <host>", "AAMT API host (overrides config)")
  .option("-j, --json", "Output results as JSON")
  .option("-c, --csv", "Output results as CSV")
  .option("--verbose", "Show verbose output")
  .option("--quiet", "Suppress non-error output")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.host) {
      process.env.AAMT_HOST = opts.host;
    }
  });

// ─── Commands ────────────────────────────────────────────────────────

program.addCommand(authCmd);
program.addCommand(resumeCmd);
program.addCommand(jobsCmd);
program.addCommand(profileCmd);
program.addCommand(applicationsCmd);
program.addCommand(configCmd);
program.addCommand(whoamiCmd);
program.addCommand(statusCmd);

// ─── Default ─────────────────────────────────────────────────────────

program.action(() => {
  showBanner();
  program.outputHelp();
  showHelpFooter();
});

// ─── Error Handling ──────────────────────────────────────────────────

program.exitOverride();

process.on("unhandledRejection", (err) => {
  if (err instanceof Error) {
    if (err.message.includes("ECONNREFUSED") || err.message.includes("ENOTFOUND")) {
      error(`Cannot connect to AAMT at ${getApiHost()}`);
      console.log();
      console.log("Possible causes:");
      console.log("  • Your internet connection is down");
      console.log("  • The AAMT server is temporarily unavailable");
      console.log(`  • The host is incorrect (current: ${c.bold(getApiHost())})`);
      console.log();
      console.log(`Check status: ${c.bold("aamt status")}`);
      process.exit(1);
    }
    error(err.message);
    const exitCode = (err as Error & { exitCode?: number }).exitCode;
    process.exit(exitCode ?? 1);
  }
});

// ─── Parse ───────────────────────────────────────────────────────────

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err instanceof Error && err.message !== "commander.helpDisplayed" && err.message !== "commander.version") {
    error(err.message);
    process.exit(1);
  }
}
