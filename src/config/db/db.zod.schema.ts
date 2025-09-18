import z from 'zod';

const UUIDv7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dbUUIDStringValidationSchema = z.string().regex(UUIDv7_REGEX, {
  message: 'Invalid ID format',
});
