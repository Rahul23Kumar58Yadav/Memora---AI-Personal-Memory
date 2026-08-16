import dotenv from "dotenv";
import { z } from "zod";

// ----------------------------------------------------------------------
// Memora Backend — env.js
// Validates all required environment variables ONCE at boot, with clear
// errors, instead of failing mysteriously deep in a request handler when
// `process.env.SOMETHING` turns out to be undefined. Every other file in
// the app should import `env` from here — never read `process.env`
// directly outside this file.
//
// dotenv.config({ override: true }) is used instead of the plain
// "dotenv/config" side-effect import: by default, dotenv refuses to
// overwrite a variable that already exists in process.env, which means
// a stale shell-level env var (e.g. from an earlier `$env:REDIS_URL=...`
// in a PowerShell session) silently wins over a corrected .env file,
// with no error or warning. override:true makes .env the single source
// of truth every time, matching what a developer actually expects when
// they edit the file.
// ----------------------------------------------------------------------

dotenv.config({ override: true });

const envSchema = z.object({
  // ---- Core ----
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  // ---- Database ----
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_VECTOR_INDEX: z.string().default("memora_embeddings_index"),

  // ---- Redis / job queue ----
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // ---- Auth ----
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // ---- Token/data encryption (OAuth tokens at rest) ----
  ENCRYPTION_KEY: z.string().length(32, "ENCRYPTION_KEY must be exactly 32 characters (AES-256)"),

  // ---- LLM provider ----
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  LLM_MODEL: z.string().default("claude-sonnet-4-6"),

  // ---- Embeddings ----
  EMBEDDING_PROVIDER: z.enum(["openai", "voyage"]).default("voyage"),
  EMBEDDING_API_KEY: z.string().min(1, "EMBEDDING_API_KEY is required"),
  EMBEDDING_MODEL: z.string().default("voyage-3"),

  // ---- Google OAuth (Gmail + Calendar) ----
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // ---- Slack OAuth ----
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().url().optional(),

  // ---- Notion OAuth ----
  NOTION_CLIENT_ID: z.string().optional(),
  NOTION_CLIENT_SECRET: z.string().optional(),
  NOTION_REDIRECT_URI: z.string().url().optional(),

  // ---- Webhooks ----
  GMAIL_WEBHOOK_SECRET: z.string().optional(), // shared-secret token embedded in the Pub/Sub push URL path
  SLACK_SIGNING_SECRET: z.string().optional(), // used to verify Slack Events API HMAC signatures

  // ---- Email delivery (digests, password reset) ----
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("noreply@memora.app"),

  // ---- Push notifications ----
  FCM_SERVER_KEY: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("\n❌ Invalid or missing environment variables:\n");
    for (const issue of parsed.error.issues) {
      console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nCheck your .env file against .env.example.\n");
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";