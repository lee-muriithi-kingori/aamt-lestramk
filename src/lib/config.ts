import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import YAML from "yaml";
import type { Config, Credentials, OutputFormat } from "../types.js";

const CONFIG_DIR = join(homedir(), ".config", "aamt");
const CONFIG_FILE = join(CONFIG_DIR, "config.yml");
const CREDS_FILE = join(CONFIG_DIR, "credentials.yml");
const HOSTS_FILE = join(CONFIG_DIR, "hosts.yml");

const DEFAULT_CONFIG: Config = {
  apiHost: "https://aamt-lestramk.vercel.app",
  apiVersion: "v1",
  defaultOutput: "table",
  theme: "auto",
};

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function loadYaml<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return YAML.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

function saveYaml(path: string, data: unknown, mode = 0o600) {
  ensureDir();
  writeFileSync(path, YAML.stringify(data), { mode });
}

// ─── Config ──────────────────────────────────────────────────────────

export function getConfig(): Config {
  ensureDir();
  const saved = loadYaml<Partial<Config>>(CONFIG_FILE);
  return { ...DEFAULT_CONFIG, ...saved };
}

export function setConfig<K extends keyof Config>(key: K, value: Config[K]) {
  const config = { ...getConfig(), [key]: value };
  saveYaml(CONFIG_FILE, config, 0o644);
}

export function getApiHost(): string {
  return process.env.AAMT_HOST || getConfig().apiHost;
}

export function getOutputFormat(flags?: { json?: boolean; csv?: boolean }): OutputFormat {
  if (flags?.json) return "json";
  if (flags?.csv) return "csv";
  return getConfig().defaultOutput;
}

export function getApiBaseUrl(): string {
  const host = getApiHost().replace(/\/$/, "");
  return `${host}/api`;
}

// ─── Credentials ─────────────────────────────────────────────────────

export function loadCredentials(): Credentials | undefined {
  if (process.env.AAMT_TOKEN) {
    return { apiKey: process.env.AAMT_TOKEN };
  }
  return loadYaml<Credentials>(CREDS_FILE);
}

export function saveCredentials(creds: Credentials) {
  saveYaml(CREDS_FILE, creds, 0o600);
}

export function clearCredentials() {
  if (existsSync(CREDS_FILE)) {
    writeFileSync(CREDS_FILE, "", { mode: 0o600 });
  }
}

export function hasCredentials(): boolean {
  return !!loadCredentials()?.apiKey;
}

export function requireCredentials(): Credentials {
  const creds = loadCredentials();
  if (!creds?.apiKey) {
    const err = new Error(
      "Not authenticated. Run `aamt auth login` to authenticate."
    );
    (err as Error & { exitCode?: number }).exitCode = 1;
    throw err;
  }
  return creds;
}

// ─── Hosts (multi-host support) ──────────────────────────────────────

export function listHosts(): Record<string, { apiKey: string }> {
  return loadYaml(HOSTS_FILE) || {};
}

export function saveHost(name: string, apiKey: string) {
  const hosts = listHosts();
  hosts[name] = { apiKey };
  saveYaml(HOSTS_FILE, hosts, 0o600);
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function configPath(): string {
  return CONFIG_DIR;
}

export function showConfig(): Record<string, unknown> {
  return {
    config: getConfig(),
    credentials: loadCredentials()
      ? { ...loadCredentials(), apiKey: "***" }
      : undefined,
    hosts: Object.fromEntries(
      Object.entries(listHosts()).map(([k, v]) => [k, "***"])
    ),
  };
}
