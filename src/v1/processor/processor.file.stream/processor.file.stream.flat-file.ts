import { env } from '@worker/config/environment.js';
import logger from '@worker/utils/logger.js';
import productFileSimpleHeaderMapGeneratorAi from '@worker/v1/ai/ai.product-file-simple-header-map-generator.js';
import { FileConfig } from '@worker/v1/processor/processor.type.js';
import processProductLinesWorker, {
  getQueueSize,
  startProcessingProducts,
} from '@worker/v1/processor/processor.worker.js';
import { logProductErrorService } from '@worker/v1/product/product.service.js';
import { Readable } from 'stream';

export default async function processFlatFileProductDataStream({
  flatFileStream,
  vendorId,
  ownerId,
  fileName,
}: {
  flatFileStream: Readable;
  vendorId: string;
  ownerId?: string;
  fileName: string;
}) {
  logger.info(
    `✅ Started processing lines from ${fileName} for vendor ${vendorId}`
  );

  let totalCount = 0;
  let buffer = '';
  let fileFieldMapLines: string[] = [];
  let fileConfig: FileConfig | null = null;

  for await (const chunk of flatFileStream) {
    buffer += chunk.toString('utf8');

    // Split by newlines and process
    const lines = buffer.split(/\r\n|\n|\r/);
    buffer = lines.pop() || '';

    if (!fileConfig) fileFieldMapLines.push(...lines);

    if (fileFieldMapLines.length > 1 && !fileConfig) {
      const { data, errorRecord } = await productFileSimpleHeaderMapGeneratorAi(
        fileFieldMapLines
      );

      if (errorRecord) {
        logProductErrorService({
          ...errorRecord,
          details: [
            ...(errorRecord.details ?? []),
            {
              function: 'productFileSimpleHeaderMapGeneratorAi',
              extract: fileFieldMapLines,
            },
          ],
        });
        return;
      }

      fileConfig = data;

      processProductLinesWorker(fileFieldMapLines);

      fileFieldMapLines = [];

      continue;
    }

    if (!fileConfig) continue;

    processProductLinesWorker(lines);

    totalCount = getQueueSize();

    if (totalCount >= env.MAX_PROCESSING_QUEUE_SIZE) {
      flatFileStream.destroy();
      break;
    }
  }

  if (buffer.trim() && fileConfig) processProductLinesWorker([buffer]);

  logger.info(
    `✅ Completed ${totalCount} lines from ${fileName} for vendor ${vendorId}`
  );

  if (fileConfig)
    await startProcessingProducts(fileConfig, {
      vendorId,
      ownerId,
    });
}
