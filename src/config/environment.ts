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
  DATASTAX_FULHAUS_DB_TOKEN: z.string(),
  DATASTAX_FULHAUS_DB_URL: z.string(),
  LUDWIG_VECTOR_DIM: z.coerce.number().int().positive(),
  LUDWIG_VECTOR_METRIC: z.enum(['cosine', 'euclidean', 'dot_product']),
  PRODUCT_RERANK_PROVIDER: z.string(),
  PRODUCT_RERANK_MODEL_NAME: z.string(),
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
