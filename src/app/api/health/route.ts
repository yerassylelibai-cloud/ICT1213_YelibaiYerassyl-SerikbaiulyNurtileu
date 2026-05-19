const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "HUGGINGFACE_TOKEN",
] as const;

export async function GET() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]?.trim());

  return Response.json({
    ok: missing.length === 0,
    missing,
  });
}
