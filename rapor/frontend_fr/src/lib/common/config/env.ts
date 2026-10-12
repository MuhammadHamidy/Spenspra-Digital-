import { z } from 'zod';

// Define schema for environment variables with safe defaults for build time
const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://user:change-me@localhost:5432/presdig?schema=public'),
  JWT_SECRET: z.string().min(32).default('spenspra-default-jwt-secret-key-2026-minimum-32-chars'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);
