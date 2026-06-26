import { Command } from "commander";
import { getConfig, setConfig, showConfig, configPath } from "../lib/config.js";
import { c, success, error, info, header, outputKeyValue } from "../lib/ui.js";

export const configCmd = new Command("config").description("Manage CLI configuration");

const VALID_KEYS = [
  "apiHost",
  "apiVersion",
  "defaultOutput",
  "theme",
] as const;

// ─── Get ─────────────────────────────────────────────────────────────

configCmd
  .command("get <key>")
  .description("Get a configuration value")
  .action((key: string) => {
    if (!VALID_KEYS.includes(key as typeof VALID_KEYS[number])) {
      error(`Unknown key: ${key}`);
      info(`Valid keys: ${VALID_KEYS.join(", ")}`);
      process.exit(1);
    }

    const config = getConfig();
    const value = config[key as keyof typeof config];
    console.log(value ?? "");
  });

// ─── Set ─────────────────────────────────────────────────────────────

configCmd
  .command("set <key> <value>")
  .description("Set a configuration value")
  .action((key: string, value: string) => {
    if (!VALID_KEYS.includes(key as typeof VALID_KEYS[number])) {
      error(`Unknown key: ${key}`);
      info(`Valid keys: ${VALID_KEYS.join(", ")}`);
      process.exit(1);
    }

    let parsed: string | number = value;
    if (key === "defaultOutput") {
      if (!["table", "json", "csv"].includes(value)) {
        error("defaultOutput must be one of: table, json, csv");
        process.exit(1);
      }
    }

    setConfig(key as typeof VALID_KEYS[number], parsed);
    success(`${key} set to ${value}`);
  });

// ─── List ────────────────────────────────────────────────────────────

configCmd
  .command("list")
  .alias("ls")
  .description("List all configuration")
  .action(() => {
    const config = getConfig();
    header("Configuration");
    outputKeyValue({
      "Config directory": configPath(),
      "API Host": config.apiHost,
      "API Version": config.apiVersion,
      "Default Output": config.defaultOutput,
      Theme: config.theme,
    });
  });

// ─── Show ────────────────────────────────────────────────────────────

configCmd
  .command("show")
  .description("Show full configuration (including credentials, masked)")
  .action(() => {
    const all = showConfig();
    header("Full Configuration");
    console.log(JSON.stringify(all, null, 2));
  });

// ─── Reset ───────────────────────────────────────────────────────────

configCmd
  .command("reset")
  .description("Reset configuration to defaults")
  .option("-y, --yes", "Skip confirmation")
  .action(async (opts: { yes?: boolean }) => {
    const { confirm } = await import("../lib/ui.js");
    if (!opts.yes) {
      const ok = await confirm("Reset all configuration to defaults?");
      if (!ok) {
        info("Cancelled.");
        return;
      }
    }

    const { setConfig } = await import("../lib/config.js");
    setConfig("apiHost", "https://aamt-lestramk.vercel.app");
    setConfig("apiVersion", "v1");
    setConfig("defaultOutput", "table");
    setConfig("theme", "auto");

    success("Configuration reset to defaults.");
  });
