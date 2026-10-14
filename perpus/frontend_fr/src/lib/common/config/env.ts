import { z } from 'zod';

// JWT_SECRET wajib diisi saat runtime production. Default hanya untuk dev/test & saat next build.
const requireJwtSecret =
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build';

// Define schema for environment variables with safe defaults for build time
const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://user:change-me@localhost:5432/perpusdig?schema=public'),
  JWT_SECRET: requireJwtSecret
    ? z.string().min(32)
    : z.string().min(32).default('dev-only-insecure-jwt-secret-change-me-0000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);
