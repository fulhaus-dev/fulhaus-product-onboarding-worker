import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';
import { error } from '@worker/utils/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assumes this file is in 'src/config/' or 'dist/config/'
// Resolves to the project root.
const projectRoot = path.resolve(__dirname, '..', '..');

dotenv.config({
  path: path.resolve(
    projectRoot,
    `.env.${process.env.NODE_ENV || 'development'}`
  ),
});
dotenv.config({ path: path.resolve(projectRoot, '.env'), override: false });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
  CLOUDFLARE_R2_ENDPOINT: z.string(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string(),
  CLOUDFLARE_R2_VENDOR_PRODUCT_DATA_BUCKET_NAME: z.string(),
  GOOGLE_GEMINI_API_KEY: z.string(),
  LUDWIG_VECTOR_DIM: z.coerce.number().int().positive(),
  LUDWIG_VECTOR_METRIC: z.enum(['cosine', 'euclidean', 'dot_product']),
  LUDWIG_VECTOR_GENERATION_ENDPOINT: z.url(),
  REPLICATE_API_TOKEN: z.string(),
  CONVEX_DEPLOYMENT: z.string(),
  CONVEX_URL: z.string(),
  CONVEX_PRODUCT_ONBOARDING_API_KEY: z.string(),
  MAX_PROCESSING_BATCH: z.coerce.number(),
  MAX_PROCESSING_QUEUE_SIZE: z.coerce.number(),
  MAX_CATEGORIES: z.coerce.number(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    `❌ Invalid environment variables. ${JSON.stringify(
      error.zodErrorMessage(parsedEnv.error),
      null,
      4
    )}`
  );
  process.exit(1);
}

export const env = parsedEnv.data;
