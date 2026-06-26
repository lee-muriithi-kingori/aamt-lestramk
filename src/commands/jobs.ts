import { Command } from "commander";
import { get, post, del } from "../lib/api.js";
import { requireCredentials } from "../lib/config.js";
import { requireScope } from "../lib/auth.js";
import { c, success, error, info, header, withSpinner, outputTable, confirm, promptInput } from "../lib/ui.js";
import type { ApiResponse, Job, CLIOptions } from "../types.js";
import { getOutputFormat } from "../lib/config.js";

export const jobsCmd = new Command("jobs").description("Browse and apply to jobs");

// ─── List ────────────────────────────────────────────────────────────

jobsCmd
  .command("list")
  .alias("ls")
  .description("List available jobs")
  .option("-j, --json", "Output as JSON")
  .option("-c, --csv", "Output as CSV")
  .option("-l, --limit <n>", "Limit results", "20")
  .option("--type <type>", "Filter by job type")
  .option("--location <location>", "Filter by location")
  .option("--remote", "Show only remote jobs")
  .option("--saved", "Show only saved jobs")
  .action(async (opts: CLIOptions & { type?: string; location?: string; remote?: boolean; saved?: boolean }) => {
    requireCredentials();
    requireScope("read:jobs");

    const query: Record<string, string> = {};
    if (opts.type) query.type = opts.type;
    if (opts.location) query.location = opts.location;
    if (opts.remote) query.remote = "true";
    if (opts.saved) query.saved = "true";

    const res = await withSpinner("Fetching jobs...", () =>
      get<ApiResponse<Job[]>>("/jobs", query)
    );

    if (!res.success || !res.data?.length) {
      info("No jobs found matching your criteria.");
      return;
    }

    const format = getOutputFormat(opts);
    outputTable(
      res.data.map((j) => ({
        id: j.id.slice(0, 8),
        title: j.title,
        company: j.company,
        location: j.location || c.muted("—"),
        type: j.type,
        status: j.status === "open" ? c.success("open") : c.error(j.status),
        posted: formatDate(j.postedAt),
      })),
      [
        { key: "id", header: "ID", width: 8 },
        { key: "title", header: "Title", width: 30 },
        { key: "company", header: "Company", width: 20 },
        { key: "location", header: "Location", width: 15 },
        { key: "type", header: "Type", width: 12 },
        { key: "status", header: "Status", width: 10 },
        { key: "posted", header: "Posted", width: 12 },
      ],
      { format, title: `Jobs (${res.data.length})` }
    );

    if (res.meta?.hasMore) {
      info("More jobs available. Use --limit to see more.");
    }
  });

// ─── View ────────────────────────────────────────────────────────────

jobsCmd
  .command("view <id>")
  .description("View job details")
  .option("-j, --json", "Output as JSON")
  .action(async (id: string, opts: { json?: boolean }) => {
    requireCredentials();
    requireScope("read:jobs");

    const res = await withSpinner("Fetching job details...", () =>
      get<ApiResponse<Job>>(`/jobs/${id}`)
    );

    if (!res.success || !res.data) {
      error(res.error || "Job not found");
      process.exit(1);
    }

    const job = res.data;

    if (opts.json) {
      console.log(JSON.stringify(job, null, 2));
      return;
    }

    header(job.title);
    console.log(`  ${c.bold(job.company)}`);
    if (job.location) console.log(`  ${c.muted(job.location)}`);
    console.log();

    const details: Record<string, string> = {
      Type: job.type,
      Status: job.status,
      Salary: job.salaryRange || "—",
      Posted: formatDate(job.postedAt),
    };
    if (job.closesAt) {
      details["Closes"] = formatDate(job.closesAt);
    }

    const format = getOutputFormat(opts);
    const { outputKeyValue } = await import("../lib/ui.js");
    outputKeyValue(details, { format });

    if (job.skills?.length) {
      console.log();
      console.log(c.bold("Skills:"));
      job.skills.forEach((s) => console.log(`  • ${s}`));
    }

    if (job.requirements?.length) {
      console.log();
      console.log(c.bold("Requirements:"));
      job.requirements.forEach((r) => console.log(`  • ${r}`));
    }

    if (job.description) {
      console.log();
      console.log(c.bold("Description:"));
      console.log(`  ${job.description}`);
    }

    console.log();
    console.log(
      `Apply with: ${c.bold(`aamt jobs apply ${id}`)}`
    );
  });

// ─── Search ──────────────────────────────────────────────────────────

jobsCmd
  .command("search <query>")
  .description("Search for jobs by keyword")
  .option("-j, --json", "Output as JSON")
  .option("-c, --csv", "Output as CSV")
  .option("-l, --limit <n>", "Limit results", "20")
  .action(async (query: string, opts: CLIOptions) => {
    requireCredentials();
    requireScope("read:jobs");

    const res = await withSpinner(`Searching for "${query}"...`, () =>
      get<ApiResponse<Job[]>>("/jobs", { q: query, limit: opts.limit })
    );

    if (!res.success || !res.data?.length) {
      info(`No jobs found for "${query}".`);
      return;
    }

    const format = getOutputFormat(opts);
    outputTable(
      res.data.map((j) => ({
        id: j.id.slice(0, 8),
        title: j.title,
        company: j.company,
        location: j.location || c.muted("—"),
        type: j.type,
        posted: formatDate(j.postedAt),
      })),
      [
        { key: "id", header: "ID", width: 8 },
        { key: "title", header: "Title", width: 35 },
        { key: "company", header: "Company", width: 20 },
        { key: "location", header: "Location", width: 15 },
        { key: "type", header: "Type", width: 12 },
        { key: "posted", header: "Posted", width: 12 },
      ],
      { format, title: `Search results for "${query}" (${res.data.length})` }
    );
  });

// ─── Apply ───────────────────────────────────────────────────────────

jobsCmd
  .command("apply <id>")
  .description("Apply to a job")
  .option("-r, --resume <id>", "Resume ID to use")
  .option("-m, --message <text>", "Cover letter message")
  .option("-y, --yes", "Skip confirmation")
  .action(async (id: string, opts: { resume?: string; message?: string; yes?: boolean }) => {
    requireCredentials();
    requireScope("write:applications");

    // Fetch job info first
    const jobRes = await withSpinner("Fetching job details...", () =>
      get<ApiResponse<Job>>(`/jobs/${id}`)
    );

    if (!jobRes.success || !jobRes.data) {
      error(jobRes.error || "Job not found");
      process.exit(1);
    }

    const job = jobRes.data;
    console.log();
    console.log(`Applying to: ${c.bold(job.title)} at ${c.bold(job.company)}`);

    let resumeId = opts.resume;
    if (!resumeId) {
      // Try to get primary resume
      const resumesRes = await get<ApiResponse<{ id: string; title: string }[]>>(
        "/resumes/primary/link"
      );
      if (resumesRes.data?.length) {
        const primary = resumesRes.data.find((r) => r.id) || resumesRes.data[0];
        resumeId = primary.id;
        info(`Using resume: ${primary.title}`);
      }
    }

    let message = opts.message;
    if (!message) {
      message = await promptInput("Cover letter (optional):", { default: "" });
    }

    if (!opts.yes) {
      const ok = await confirm("Submit application?");
      if (!ok) {
        info("Cancelled.");
        return;
      }
    }

    const result = await withSpinner("Submitting application...", () =>
      post<ApiResponse<{ applicationId: string }>>(`/applications`, {
        jobId: id,
        resumeId,
        coverLetter: message,
      })
    );

    if (!result.success) {
      error(result.error || "Application failed");
      process.exit(1);
    }

    success(`Application submitted! ID: ${result.data?.applicationId?.slice(0, 8)}`);
  });

// ─── Save / Unsave ───────────────────────────────────────────────────

jobsCmd
  .command("save <id>")
  .description("Save a job to your list")
  .action(async (id: string) => {
    requireCredentials();

    const result = await withSpinner("Saving job...", () =>
      post<ApiResponse<void>>(`/saved-jobs`, { jobId: id })
    );

    if (!result.success) {
      error(result.error || "Failed to save job");
      process.exit(1);
    }

    success("Job saved.");
  });

jobsCmd
  .command("unsave <id>")
  .description("Remove a job from your saved list")
  .action(async (id: string) => {
    requireCredentials();

    const result = await withSpinner("Removing saved job...", () =>
      del<ApiResponse<void>>(`/saved-jobs/${id}`)
    );

    if (!result.success) {
      error(result.error || "Failed to remove job");
      process.exit(1);
    }

    success("Job removed from saved list.");
  });

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
