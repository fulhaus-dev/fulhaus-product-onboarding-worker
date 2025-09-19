import { ProcessorErrorRecord } from '@worker/shared/shared.type.js';
import logger from '@worker/utils/logger.js';
import z from 'zod';

function zodErrorMessage(zodError: z.ZodError) {
  return z.prettifyError(zodError);
}

function exceptionErrorRecord(error: unknown) {
  const errorRecord: ProcessorErrorRecord = {
    message: 'An unknown error occurred',
  };

  // Check if the error is an instance of Error
  if (error instanceof Error) errorRecord.message = error.message;

  return errorRecord;
}

function sendErrorMessage(errorRecord: ProcessorErrorRecord) {
  // TODO Handle Slack Error
  console.error(JSON.stringify(errorRecord, null, 2));
}

export const error = {
  zodErrorMessage,
  exceptionErrorRecord,
  sendErrorMessage,
};
