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
