import { Command } from "commander";
import { get } from "../lib/api.js";
import { requireCredentials } from "../lib/config.js";
import { requireScope } from "../lib/auth.js";
import { c, success, error, info, header, withSpinner, outputTable } from "../lib/ui.js";
import type { ApiResponse, Application, CLIOptions } from "../types.js";
import { getOutputFormat } from "../lib/config.js";

export const applicationsCmd = new Command("applications")
  .alias("apps")
  .description("Manage your job applications");

// ─── List ────────────────────────────────────────────────────────────

applicationsCmd
  .command("list")
  .alias("ls")
  .description("List your applications")
  .option("-j, --json", "Output as JSON")
  .option("-c, --csv", "Output as CSV")
  .option("-l, --limit <n>", "Limit results", "20")
  .option("--status <status>", "Filter by status")
  .action(async (opts: CLIOptions & { status?: string }) => {
    requireCredentials();
    requireScope("read:applications");

    const query: Record<string, string> = {};
    if (opts.status) query.status = opts.status;

    const res = await withSpinner("Fetching applications...", () =>
      get<ApiResponse<Application[]>>("/applications", query)
    );

    if (!res.success || !res.data?.length) {
      info("No applications found.");
      console.log(`Find jobs with: ${c.bold("aamt jobs list")}`);
      return;
    }

    const format = getOutputFormat(opts);
    outputTable(
      res.data.map((a) => ({
        id: a.id.slice(0, 8),
        job: a.jobTitle,
        company: a.company,
        status: formatStatus(a.status),
        applied: formatDate(a.appliedAt),
      })),
      [
        { key: "id", header: "ID", width: 8 },
        { key: "job", header: "Job", width: 30 },
        { key: "company", header: "Company", width: 20 },
        { key: "status", header: "Status", width: 12 },
        { key: "applied", header: "Applied", width: 12 },
      ],
      { format, title: `Applications (${res.data.length})` }
    );
  });

// ─── Status ──────────────────────────────────────────────────────────

applicationsCmd
  .command("status <id>")
  .description("View application details")
  .option("-j, --json", "Output as JSON")
  .action(async (id: string, opts: { json?: boolean }) => {
    requireCredentials();
    requireScope("read:applications");

    const res = await withSpinner("Fetching application...", () =>
      get<ApiResponse<Application>>(`/applications/${id}`)
    );

    if (!res.success || !res.data) {
      error(res.error || "Application not found");
      process.exit(1);
    }

    const app = res.data;

    if (opts.json) {
      console.log(JSON.stringify(app, null, 2));
      return;
    }

    header(`Application: ${app.jobTitle}`);
    console.log(`  ${c.bold(app.company)}`);
    console.log();

    const details: Record<string, string> = {
      Status: formatStatus(app.status),
      Applied: formatDate(app.appliedAt),
      Updated: formatDate(app.updatedAt),
    };

    const { outputKeyValue } = await import("../lib/ui.js");
    outputKeyValue(details);

    if (app.coverLetter) {
      console.log();
      console.log(c.bold("Cover Letter:"));
      console.log(`  ${app.coverLetter}`);
    }
  });

// ─── Helpers ─────────────────────────────────────────────────────────

function formatStatus(status: string): string {
  switch (status) {
    case "pending":
      return c.warning("pending");
    case "reviewing":
      return c.info("reviewing");
    case "shortlisted":
      return c.secondary("shortlisted");
    case "hired":
      return c.success("hired");
    case "rejected":
      return c.error("rejected");
    default:
      return status;
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
