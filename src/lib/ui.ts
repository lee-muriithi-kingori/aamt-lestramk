import chalk from "chalk";
import Table from "cli-table3";
import type { OutputFormat } from "../types.js";

// ─── Colors ──────────────────────────────────────────────────────────

export const c = {
  primary: chalk.hex("#E57035"),
  secondary: chalk.hex("#2563EB"),
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.cyan,
  muted: chalk.gray,
  bold: chalk.bold,
  dim: chalk.dim,
  italic: chalk.italic,
};

// ─── Output ──────────────────────────────────────────────────────────

export function header(text: string): void {
  console.log();
  console.log(c.bold(text));
  console.log(c.muted("─".repeat(text.length)));
}

export function success(msg: string): void {
  console.log(c.success("✔") + " " + msg);
}

export function error(msg: string): void {
  console.error(c.error("✖") + " " + msg);
}

export function warning(msg: string): void {
  console.log(c.warning("⚠") + " " + msg);
}

export function info(msg: string): void {
  console.log(c.info("ℹ") + " " + msg);
}

export function dim(msg: string): void {
  console.log(c.dim(msg));
}

// ─── Tables ──────────────────────────────────────────────────────────

export function createTable(
  head: string[],
  opts?: { style?: "clean" | "bordered" }
): Table.Table {
  const style = opts?.style || "clean";
  return new Table({
    head: head.map((h) => c.bold(h)),
    style:
      style === "clean"
        ? { border: [], head: ["cyan"] }
        : undefined,
    wordWrap: true,
    wrapOnWordBoundary: true,
  });
}

export function outputTable<T extends Record<string, unknown>>(
  items: T[],
  columns: { key: string; header: string; width?: number; format?: (v: unknown) => string }[],
  opts?: { format?: OutputFormat; title?: string }
): void {
  const format = opts?.format || "table";

  if (opts?.title) {
    header(opts.title);
  }

  if (format === "json") {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  if (format === "csv") {
    const headers = columns.map((c) => c.header).join(",");
    const rows = items.map((item) =>
      columns
        .map((col) => {
          const val = item[col.key];
          const str = col.format ? col.format(val) : String(val ?? "");
          return `"${str.replace(/"/g, "\\"")}"`;
        })
        .join(",")
    );
    console.log(headers);
    rows.forEach((r) => console.log(r));
    return;
  }

  // Table format
  const table = createTable(columns.map((c) => c.header));
  items.forEach((item) => {
    table.push(columns.map((col) => {
      const val = item[col.key];
      const str = col.format ? col.format(val) : String(val ?? c.muted("—"));
      return str.length > (col.width || 60) ? str.slice(0, (col.width || 60) - 3) + "..." : str;
    }));
  });
  console.log(table.toString());
}

// ─── Key-Value Output ────────────────────────────────────────────────

export function outputKeyValue(
  data: Record<string, string | undefined>,
  opts?: { format?: OutputFormat }
): void {
  const format = opts?.format || "table";

  if (format === "json") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const maxKey = Math.max(...Object.keys(data).map((k) => k.length));
  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined) {
      console.log(`  ${c.bold(key.padEnd(maxKey))}  ${val}`);
    }
  });
}

// ─── Pagination ──────────────────────────────────────────────────────

export function paginationInfo(opts: {
  page: number;
  limit: number;
  total?: number;
  hasMore?: boolean;
}): void {
  const { page, limit, total, hasMore } = opts;
  const start = page * limit + 1;
  const end = start + limit - 1;
  let msg = `Showing ${c.bold(String(start))}–${c.bold(String(end))}`;
  if (total !== undefined) msg += ` of ${c.bold(String(total))}`;
  if (hasMore) msg += `  ${c.muted("(more available)")}`;
  console.log(c.muted(msg));
}

// ─── Spinners ────────────────────────────────────────────────────────

export async function withSpinner<T>(
  msg: string,
  fn: () => Promise<T>
): Promise<T> {
  const { default: ora } = await import("ora");
  const spinner = ora(msg).start();
  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}

// ─── Confirmations ───────────────────────────────────────────────────

export async function confirm(msg: string): Promise<boolean> {
  const { default: inquirer } = await import("inquirer");
  const { yes } = await inquirer.prompt([
    {
      type: "confirm",
      name: "yes",
      message: msg,
      default: false,
    },
  ]);
  return yes;
}

export async function promptInput(
  message: string,
  opts?: { default?: string; validate?: (v: string) => boolean | string; password?: boolean }
): Promise<string> {
  const { default: inquirer } = await import("inquirer");
  const { value } = await inquirer.prompt([
    {
      type: opts?.password ? "password" : "input",
      name: "value",
      message,
      default: opts?.default,
      validate: opts?.validate,
      mask: opts?.password ? "•" : undefined,
    },
  ]);
  return value;
}

export async function promptSelect<T extends string>(
  message: string,
  choices: { name: string; value: T; disabled?: boolean }[]
): Promise<T> {
  const { default: inquirer } = await import("inquirer");
  const { value } = await inquirer.prompt([
    {
      type: "list",
      name: "value",
      message,
      choices,
    },
  ]);
  return value;
}

export async function promptCheckbox<T extends string>(
  message: string,
  choices: { name: string; value: T; checked?: boolean }[]
): Promise<T[]> {
  const { default: inquirer } = await import("inquirer");
  const { values } = await import("inquirer");
  const result = await inquirer.prompt([
    {
      type: "checkbox",
      name: "values",
      message,
      choices,
    },
  ]);
  return result.values;
}

// ─── Branding ────────────────────────────────────────────────────────

export function showBanner(): void {
  const lines = [
    chalk.hex("#E57035").bold("   ╔═══════════════════════════════════════╗"),
    chalk.hex("#E57035").bold("   ║") + "     " + chalk.bold("AAMT Lestramk CLI") + " v1.0.0         " + chalk.hex("#E57035").bold("║"),
    chalk.hex("#E57035").bold("   ║") + "     " + chalk.dim("Africa's Talent Marketplace") + "     " + chalk.hex("#E57035").bold("║"),
    chalk.hex("#E57035").bold("   ╚═══════════════════════════════════════╝"),
  ];
  console.log(lines.join("\n"));
  console.log();
}

export function showHelpFooter(): void {
  console.log();
  console.log(
    c.muted("Use") +
      " " +
      c.bold("aamt <command> --help") +
      " " +
      c.muted("for more information about a command.")
  );
  console.log(
    c.muted("Get started with") +
      " " +
      c.bold("aamt auth login") +
      " " +
      c.muted("to authenticate.")
  );
}
