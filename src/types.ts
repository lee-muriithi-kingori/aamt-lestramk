export interface Config {
  apiHost: string;
  apiVersion: string;
  defaultOutput: "table" | "json" | "csv";
  theme: "auto" | "dark" | "light";
}

export interface Credentials {
  apiKey?: string;
  apiKeyId?: string;
  token?: string;
  userId?: string;
  email?: string;
  name?: string;
  role?: "talent" | "employer" | "admin";
  scopes?: string[];
  lastVerified?: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  verified: boolean;
  createdAt: string;
}

export interface Resume {
  id: string;
  filename: string;
  title?: string;
  isPrimary: boolean;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  type: string;
  salaryRange?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  status: "open" | "closed" | "paused";
  postedAt: string;
  closesAt?: string;
  url?: string;
  isSaved?: boolean;
  isApplied?: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: "pending" | "reviewing" | "shortlisted" | "rejected" | "hired";
  appliedAt: string;
  updatedAt: string;
  coverLetter?: string;
  resumeId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface CLIOptions {
  json?: boolean;
  csv?: boolean;
  limit?: number;
  offset?: number;
  host?: string;
  verbose?: boolean;
  quiet?: boolean;
  yes?: boolean;
  output?: string;
}

export type OutputFormat = "table" | "json" | "csv";

export const API_SCOPES = [
  { value: "read:profile", description: "Read your profile information" },
  { value: "write:profile", description: "Update your profile" },
  { value: "read:resumes", description: "Read your resumes" },
  { value: "write:resumes", description: "Upload and manage resumes" },
  { value: "read:jobs", description: "Search and view jobs" },
  { value: "write:applications", description: "Apply to jobs" },
  { value: "read:applications", description: "View your applications" },
  { value: "read:notifications", description: "Read notifications" },
  { value: "read:messages", description: "Read messages" },
  { value: "write:messages", description: "Send messages" },
  { value: "read:earnings", description: "View earnings and payouts" },
] as const;
