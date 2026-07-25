import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  SHADOW_DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).default("dev-secret"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  EMAIL_SERVER_HOST: z.string().min(1).optional(),
  EMAIL_SERVER_PORT: z.coerce.number().default(587),
  EMAIL_SERVER_USER: z.string().min(1).optional(),
  EMAIL_SERVER_PASSWORD: z.string().min(1).optional(),
  // Accept either a plain email or a display-name with email in angle brackets, e.g. "Toko POS <no-reply@example.com>"
  EMAIL_FROM: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const match = v.match(/<([^>]+)>/);
      return match ? match[1] : v;
    })
    .refine(
      (val) => val === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      {
        message: "Invalid email address",
      },
    ),
  SUPABASE_URL: z.string().url().optional(),
  // New Supabase API keys (2025+). Publishable key replaces the legacy anon key.
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  // Legacy anon key, kept as a fallback until fully migrated.
  SUPABASE_ANON_KEY: z.string().optional(),
  STORE_NPWP: z.string().optional(),
  DISCOUNT_LIMIT_PERCENT: z.coerce.number().min(0).max(100).default(50),
  // Payment gateway configuration (all server-side)
  PAYMENT_GATEWAY_PROVIDER: z
    .enum(["xendit", "midtrans", "mock"])
    .default("mock"),
  PAYMENT_GATEWAY_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  XENDIT_SECRET_KEY: z.string().optional(),
  XENDIT_PUBLIC_KEY: z.string().optional(),
  XENDIT_API_URL: z.string().url().optional(),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  MIDTRANS_API_URL: z.string().url().optional(),
  EDC_PROVIDER: z.enum(["mock", "verifone", "ingenico"]).default("mock"),
  EDC_API_URL: z.string().url().optional(),
  EDC_TERMINAL_ID: z.string().optional(),
  EDC_MERCHANT_ID: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  // WhatsApp notifications (optional)
  WHATSAPP_PROVIDER: z
    .enum(["wablas", "fonnte", "custom", "mock"])
    .default("mock"),
  WHATSAPP_API_URL: z.string().url().optional(),
  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_DEVICE_ID: z.string().optional(),
  WHATSAPP_SENDER_ID: z.string().optional(),
});

// Helper: treat empty strings as undefined (helps when env var exists but is empty)
const maybe = (v: string | undefined): string | undefined =>
  v === undefined || v === null || v.trim() === "" ? undefined : v;

const parsed = envSchema.safeParse({
  DATABASE_URL: maybe(process.env.DATABASE_URL),
  SHADOW_DATABASE_URL: maybe(process.env.SHADOW_DATABASE_URL),
  NEXTAUTH_URL: maybe(process.env.NEXTAUTH_URL),
  NEXTAUTH_SECRET: maybe(process.env.NEXTAUTH_SECRET),
  GOOGLE_CLIENT_ID: maybe(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: maybe(process.env.GOOGLE_CLIENT_SECRET),
  EMAIL_SERVER_HOST: maybe(process.env.EMAIL_SERVER_HOST),
  EMAIL_SERVER_PORT: maybe(process.env.EMAIL_SERVER_PORT),
  EMAIL_SERVER_USER: maybe(process.env.EMAIL_SERVER_USER),
  EMAIL_SERVER_PASSWORD: maybe(process.env.EMAIL_SERVER_PASSWORD),
  EMAIL_FROM: maybe(process.env.EMAIL_FROM),
  SUPABASE_URL: maybe(process.env.SUPABASE_URL),
  SUPABASE_PUBLISHABLE_KEY: maybe(process.env.SUPABASE_PUBLISHABLE_KEY),
  SUPABASE_SECRET_KEY: maybe(process.env.SUPABASE_SECRET_KEY),
  SUPABASE_ANON_KEY: maybe(process.env.SUPABASE_ANON_KEY),
  STORE_NPWP: maybe(process.env.STORE_NPWP),
  DISCOUNT_LIMIT_PERCENT: maybe(process.env.DISCOUNT_LIMIT_PERCENT),
  PAYMENT_GATEWAY_PROVIDER: maybe(process.env.PAYMENT_GATEWAY_PROVIDER),
  PAYMENT_GATEWAY_MODE: maybe(process.env.PAYMENT_GATEWAY_MODE),
  XENDIT_SECRET_KEY: maybe(process.env.XENDIT_SECRET_KEY),
  XENDIT_PUBLIC_KEY: maybe(process.env.XENDIT_PUBLIC_KEY),
  XENDIT_API_URL: maybe(process.env.XENDIT_API_URL),
  MIDTRANS_SERVER_KEY: maybe(process.env.MIDTRANS_SERVER_KEY),
  MIDTRANS_CLIENT_KEY: maybe(process.env.MIDTRANS_CLIENT_KEY),
  MIDTRANS_API_URL: maybe(process.env.MIDTRANS_API_URL),
  EDC_PROVIDER: maybe(process.env.EDC_PROVIDER),
  EDC_API_URL: maybe(process.env.EDC_API_URL),
  EDC_TERMINAL_ID: maybe(process.env.EDC_TERMINAL_ID),
  EDC_MERCHANT_ID: maybe(process.env.EDC_MERCHANT_ID),
  PAYMENT_WEBHOOK_SECRET: maybe(process.env.PAYMENT_WEBHOOK_SECRET),
  WHATSAPP_PROVIDER: maybe(process.env.WHATSAPP_PROVIDER),
  WHATSAPP_API_URL: maybe(process.env.WHATSAPP_API_URL),
  WHATSAPP_API_KEY: maybe(process.env.WHATSAPP_API_KEY),
  WHATSAPP_DEVICE_ID: maybe(process.env.WHATSAPP_DEVICE_ID),
  WHATSAPP_SENDER_ID: maybe(process.env.WHATSAPP_SENDER_ID),
});

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Missing or invalid environment configuration");
}

export const env = parsed.data;

/**
 * The effective public Supabase key for browser/client use.
 * Prefers the new publishable key ("sb_publishable_...") and falls back to the
 * legacy anon key while the migration is in progress.
 */
export const supabasePublicKey =
  env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY;

/** True when Supabase is configured (URL + any public key present). */
export const hasSupabaseConfig = Boolean(env.SUPABASE_URL && supabasePublicKey);
