import { dbUUIDStringValidationSchema } from '@worker/config/db/db.zod.schema.js';
import type z from 'zod';

export type DbUuidString = z.infer<typeof dbUUIDStringValidationSchema>;
