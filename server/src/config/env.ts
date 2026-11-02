import { z } from 'zod';
import { todayISO, DEFAULT_TIMEZONE } from '@mal/shared';

/** Digits-only integer env var (rejects '', '5e3', '0x10', ' 1'), range-checked, with a default. */
const intVar = (min: number, max: number, def: number) =>
  z
    .string()
    .regex(/^\d{1,6}$/, `must be a whole number between ${min} and ${max}`)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max))
    .default(def);

const isTimezone = (tz: string) => {
  try {
    todayISO(tz);
    return true;
  } catch {
    return false;
  }
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: intVar(1, 65535, 5000),
  MONGODB_URI: z
    .string()
    .trim()
    .regex(/^mongodb(\+srv)?:\/\/\S+$/, 'must start with mongodb:// or mongodb+srv://')
    .default('mongodb://127.0.0.1:27017/meeting_action_log'),
  CLIENT_ORIGIN: z
    .url({ protocol: /^https?$/, error: 'must be an http(s) URL' })
    .default('http://localhost:5173'),
  APP_TIMEZONE: z
    .string()
    .refine(isTimezone, 'must be a valid IANA timezone')
    .default(DEFAULT_TIMEZONE),
  RATE_LIMIT_PER_MIN: intVar(1, 100_000, 300),
});

export type Env = Readonly<z.output<typeof envSchema>>;

/** Parses env vars; throws an Error listing every invalid key. */
export function parseEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return Object.freeze(result.data);
}

function loadEnv(): Env {
  try {
    return parseEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}

export const env = loadEnv();
