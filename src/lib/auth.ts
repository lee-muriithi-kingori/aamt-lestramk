import { get } from "./api.js";
import {
  loadCredentials,
  saveCredentials,
  clearCredentials,
} from "./config.js";
import type { Credentials, ApiResponse, UserProfile } from "../types.js";

export interface LoginResult {
  success: boolean;
  profile?: UserProfile;
  scopes?: string[];
  error?: string;
}

export async function verifyKey(apiKey: string, host?: string): Promise<LoginResult> {
  try {
    const { saveCredentials } = await import("./config.js");
    saveCredentials({ apiKey });

    const res = await get<ApiResponse<{ user: UserProfile; scopes: string[] }>>(
      "/auth/me"
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error || "Invalid API key" };
    }

    return {
      success: true,
      profile: res.data.user,
      scopes: res.data.scopes,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function loginInteractive(
  apiKey: string,
  name?: string
): Promise<LoginResult> {
  const result = await verifyKey(apiKey);

  if (!result.success || !result.profile) {
    return result;
  }

  const creds: Credentials = {
    apiKey,
    userId: result.profile.id,
    email: result.profile.email,
    name: result.profile.name,
    role: result.profile.role as "talent" | "employer" | "admin",
    scopes: result.scopes,
    lastVerified: new Date().toISOString(),
  };

  saveCredentials(creds);
  return { ...result, success: true };
}

export function logout(): void {
  clearCredentials();
}

export function getAuthStatus() {
  const creds = loadCredentials();
  if (!creds?.apiKey) {
    return { authenticated: false, creds: null };
  }
  return {
    authenticated: true,
    creds: {
      ...creds,
      apiKey: creds.apiKey.slice(0, 8) + "..." + creds.apiKey.slice(-4),
    },
    original: creds,
  };
}

export async function refreshAuth(): Promise<LoginResult> {
  const creds = loadCredentials();
  if (!creds?.apiKey) {
    return { success: false, error: "No credentials found" };
  }
  return verifyKey(creds.apiKey);
}

export function hasScope(scope: string): boolean {
  const creds = loadCredentials();
  if (!creds?.scopes) return false;
  if (creds.scopes.includes("admin:all")) return true;
  return creds.scopes.includes(scope);
}

export function requireScope(scope: string): void {
  if (!hasScope(scope)) {
    const { getApiHost } = require("./config.js");
    const err = new Error(
      `This action requires the "${scope}" scope. ` +
        `Generate a new API key with this scope at ${getApiHost()}/settings/security`
    );
    (err as Error & { exitCode?: number }).exitCode = 1;
    throw err;
  }
}
