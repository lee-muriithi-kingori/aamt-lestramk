import { Command } from "commander";
import { get, patch } from "../lib/api.js";
import { requireCredentials } from "../lib/config.js";
import { requireScope } from "../lib/auth.js";
import { c, success, error, info, header, withSpinner, outputKeyValue, promptInput } from "../lib/ui.js";
import type { ApiResponse, UserProfile } from "../types.js";

export const profileCmd = new Command("profile").description("Manage your profile");

// ─── View ────────────────────────────────────────────────────────────

profileCmd
  .command("view")
  .description("View your profile")
  .option("-j, --json", "Output as JSON")
  .action(async (opts: { json?: boolean }) => {
    requireCredentials();
    requireScope("read:profile");

    const res = await withSpinner("Fetching profile...", () =>
      get<ApiResponse<UserProfile>>("/auth/me")
    );

    if (!res.success || !res.data) {
      error(res.error || "Failed to fetch profile");
      process.exit(1);
    }

    const p = res.data;

    if (opts.json) {
      console.log(JSON.stringify(p, null, 2));
      return;
    }

    header("Profile");
    console.log();

    if (p.avatarUrl) {
      console.log(`  Avatar: ${c.secondary(p.avatarUrl)}`);
    }

    outputKeyValue({
      Name: c.bold(p.name),
      Email: p.email,
      Role: c.bold(p.role),
      Headline: p.headline || "—",
      Location: p.location || "—",
      Verified: p.verified ? c.success("Yes") : c.warning("No"),
      "Member since": new Date(p.createdAt).toLocaleDateString(),
    });

    if (p.bio) {
      console.log();
      console.log(c.bold("Bio:"));
      console.log(`  ${p.bio}`);
    }

    if (p.skills?.length) {
      console.log();
      console.log(c.bold("Skills:"));
      console.log(`  ${p.skills.join(", ")}`);
    }
  });

// ─── Edit ────────────────────────────────────────────────────────────

profileCmd
  .command("edit")
  .description("Edit your profile interactively")
  .action(async () => {
    requireCredentials();
    requireScope("write:profile");

    const current = await withSpinner("Fetching current profile...", () =>
      get<ApiResponse<UserProfile>>("/auth/me")
    );

    if (!current.success || !current.data) {
      error(current.error || "Failed to fetch profile");
      process.exit(1);
    }

    const p = current.data;
    info("Press Enter to keep the current value.");
    console.log();

    const updates: Record<string, string> = {};

    const headline = await promptInput(`Headline [${p.headline || ""}]:`, {
      default: p.headline || "",
    });
    if (headline && headline !== p.headline) updates.headline = headline;

    const location = await promptInput(`Location [${p.location || ""}]:`, {
      default: p.location || "",
    });
    if (location && location !== p.location) updates.location = location;

    const bio = await promptInput(`Bio [${p.bio || ""}]:`, {
      default: p.bio || "",
    });
    if (bio && bio !== p.bio) updates.bio = bio;

    if (Object.keys(updates).length === 0) {
      info("No changes made.");
      return;
    }

    const result = await withSpinner("Updating profile...", () =>
      patch<ApiResponse<UserProfile>>("/profile/talent", updates)
    );

    if (!result.success) {
      error(result.error || "Update failed");
      process.exit(1);
    }

    success("Profile updated successfully.");
  });
