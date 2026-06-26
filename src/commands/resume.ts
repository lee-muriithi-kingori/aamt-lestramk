import { Command } from "commander";
import { existsSync } from "fs";
import { resolve } from "path";
import { get, post, del, uploadFile } from "../lib/api.js";
import { requireCredentials } from "../lib/config.js";
import { requireScope } from "../lib/auth.js";
import { c, success, error, info, header, withSpinner, outputTable, outputKeyValue, confirm, promptInput } from "../lib/ui.js";
import type { ApiResponse, Resume, CLIOptions } from "../types.js";
import { getOutputFormat } from "../lib/config.js";

export const resumeCmd = new Command("resume")
  .alias("resumes")
  .description("Manage your resumes");

// ─── List ────────────────────────────────────────────────────────────

resumeCmd
  .command("list")
  .alias("ls")
  .description("List your uploaded resumes")
  .option("-j, --json", "Output as JSON")
  .option("-c, --csv", "Output as CSV")
  .option("-l, --limit <n>", "Limit results", "20")
  .action(async (opts: CLIOptions) => {
    requireCredentials();
    requireScope("read:resumes");

    const { items, meta } = await withSpinner("Fetching resumes...", () =>
      get<ApiResponse<Resume[]>>("/resumes/primary/link").then((res) => ({
        items: res.data || [],
        meta: res.meta || {},
      }))
    );

    if (!items.length) {
      info("No resumes uploaded yet.");
      console.log(`Upload one with: ${c.bold("aamt resume upload <file>")}`);
      return;
    }

    const format = getOutputFormat(opts);
    outputTable(
      items.map((r) => ({
        id: r.id.slice(0, 8),
        title: r.title || r.filename,
        primary: r.isPrimary ? c.success("★") : "",
        size: r.fileSize ? formatBytes(r.fileSize) : "—",
        updated: formatDate(r.updatedAt),
      })),
      [
        { key: "id", header: "ID", width: 10 },
        { key: "title", header: "Title", width: 40 },
        { key: "primary", header: "", width: 3 },
        { key: "size", header: "Size", width: 10 },
        { key: "updated", header: "Updated", width: 12 },
      ],
      { format, title: `Resumes (${items.length})` }
    );
  });

// ─── Upload ──────────────────────────────────────────────────────────

resumeCmd
  .command("upload <file>")
  .description("Upload a resume PDF or DOCX")
  .option("-t, --title <title>", "Resume title")
  .option("-p, --primary", "Set as primary resume")
  .option("-y, --yes", "Skip confirmation")
  .action(async (filePath: string, opts: CLIOptions & { title?: string; primary?: boolean; yes?: boolean }) => {
    requireCredentials();
    requireScope("write:resumes");

    const resolved = resolve(filePath);
    if (!existsSync(resolved)) {
      error(`File not found: ${filePath}`);
      process.exit(1);
    }

    const title = opts.title || filePath;

    if (!opts.yes) {
      const ok = await confirm(`Upload "${title}"?`);
      if (!ok) {
        info("Cancelled.");
        return;
      }
    }

    const result = await withSpinner("Uploading resume...", () =>
      uploadFile<ApiResponse<Resume>>("/resumes/upload", resolved, {
        title,
        isPrimary: opts.primary ? "true" : "false",
      })
    );

    if (!result.success) {
      error(result.error || "Upload failed");
      process.exit(1);
    }

    success(`Resume uploaded: ${c.bold(result.data?.title || title)}`);
    info(`ID: ${result.data?.id}`);
    if (opts.primary) {
      info("Set as primary resume.");
    }
  });

// ─── Download ────────────────────────────────────────────────────────

resumeCmd
  .command("download <id>")
  .description("Download a resume")
  .option("-o, --output <path>", "Output file path")
  .action(async (id: string, opts: { output?: string }) => {
    requireCredentials();
    requireScope("read:resumes");

    // Get resume info first
    const res = await withSpinner("Fetching resume info...", () =>
      get<ApiResponse<Resume>>(`/resumes/${id}/link`)
    );

    if (!res.success || !res.data) {
      error(res.error || "Resume not found");
      process.exit(1);
    }

    const resume = res.data;
    const outputPath = opts.output || resume.filename;

    await withSpinner(`Downloading to ${outputPath}...`, async () => {
      // If fileUrl is a direct link, download it
      if (resume.fileUrl) {
        const { default: fetch } = await import("node-fetch");
        const { pipeline } = await import("stream/promises");
        const { createWriteStream } = await import("fs");

        const response = await fetch(resume.fileUrl);
        if (!response.ok) throw new Error("Download failed");
        if (response.body) {
          await pipeline(
            response.body as unknown as NodeJS.ReadableStream,
            createWriteStream(outputPath)
          );
        }
      }
    });

    success(`Resume downloaded: ${outputPath}`);
  });

// ─── Set Primary ─────────────────────────────────────────────────────

resumeCmd
  .command("primary <id>")
  .description("Set a resume as your primary resume")
  .action(async (id: string) => {
    requireCredentials();
    requireScope("write:resumes");

    const result = await withSpinner("Updating primary resume...", () =>
      post<ApiResponse<Resume>>(`/resumes/${id}/link`, { action: "setPrimary" })
    );

    if (!result.success) {
      error(result.error || "Failed to update");
      process.exit(1);
    }

    success("Primary resume updated.");
  });

// ─── Delete ──────────────────────────────────────────────────────────

resumeCmd
  .command("delete <id>")
  .description("Delete a resume")
  .option("-y, --yes", "Skip confirmation")
  .action(async (id: string, opts: { yes?: boolean }) => {
    requireCredentials();
    requireScope("write:resumes");

    if (!opts.yes) {
      const ok = await confirm(`Delete resume ${id}? This cannot be undone.`);
      if (!ok) {
        info("Cancelled.");
        return;
      }
    }

    const result = await withSpinner("Deleting resume...", () =>
      del<ApiResponse<void>>(`/resumes/${id}`)
    );

    if (!result.success) {
      error(result.error || "Failed to delete");
      process.exit(1);
    }

    success("Resume deleted.");
  });

// ─── Helpers ─────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
