import { ISO_3166 } from '@worker/shared/shared.iso-codes/iso.3166.js';
import { ISO_4217 } from '@worker/shared/shared.iso-codes/iso.4217.js';
import type z from 'zod';

export type ErrorDetails = Record<string, unknown>[];

export type ProcessorErrorRecord = {
  message: string;
  details?: ErrorDetails;
};

export type ProcessorFunctionResponse<T> =
  | {
      data: T;
      errorRecord?: undefined;
    }
  | {
      data?: undefined;
      errorRecord: ProcessorErrorRecord;
    };

export type AsyncProcessorFunctionResponse<T> = Promise<
  ProcessorFunctionResponse<T>
>;

export type Nullable<T> = T | null;

export type CountryAlpha2Code = (typeof ISO_3166)[number]['alpha2'];
export type CurrencyCode = (typeof ISO_4217)[number]['code'];
