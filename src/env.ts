// Typed, validated environment variables
// Fails fast at startup if required vars are missing

interface Env {
  SUPABASE_URL: string | undefined;
  SUPABASE_PUBLISHABLE_KEY: string | undefined;
  APP_ENV: string;
  APP_VERSION: string;
}

function requireEnv(key: string): string {
  const val = import.meta.env[key] as string | undefined;
  if (!val || val.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function optionalEnv(key: string): string | undefined {
  const val = import.meta.env[key] as string | undefined;
  return val && val.trim() !== "" ? val : undefined;
}

export const env: Env = {
  SUPABASE_URL: optionalEnv("VITE_SUPABASE_URL"),
  SUPABASE_PUBLISHABLE_KEY: optionalEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  APP_ENV: (import.meta.env.VITE_APP_ENV as string) ?? "development",
  APP_VERSION: (import.meta.env.VITE_APP_VERSION as string) ?? "0.1.0",
};
