import {
  DataAPIClient,
  DataAPIVector,
  ObjectId,
  UUID,
  uuid,
  vector,
} from '@datastax/astra-db-ts';
import { env } from '@worker/config/environment.js';
import { error } from '@worker/utils/error.js';
import logger from '@worker/utils/logger.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';

// Initialize the client
const client = new DataAPIClient({
  logging: 'all',
});
const db = client.db(env.DATASTAX_FULHAUS_DB_URL, {
  token: env.DATASTAX_FULHAUS_DB_TOKEN,
});

export async function checkDbConnection() {
  const { errorRecord } = await asyncTryCatch(() => db.info());
  if (errorRecord) {
    logger.fatal(`❌ Could not connect to DB. ${errorRecord.message}`);
    error.sendErrorMessage(errorRecord);
    process.exit(1);
  }

  logger.info('🟢 DB is connected and ready');
}

export function toDbUUID(value: string) {
  return new UUID(value);
}

export {
  ObjectId as DbObjectId,
  UUID as DbUUID,
  uuid as dbUuid,
  DataAPIVector as DbDataAPIVector,
  vector as dbVector,
};
export default db;
