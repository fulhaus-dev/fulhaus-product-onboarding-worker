import { env } from '@worker/config/environment.js';
import { error } from '@worker/utils/error.js';
import logger from '@worker/utils/logger.js';
import productFileSimpleHeaderMapGeneratorAi from '@worker/v1/ai/ai.product-file-simple-header-map-generator.js';
import { FileConfig } from '@worker/v1/processor/processor.type.js';
import processProductLinesWorker, {
  productQueue,
} from '@worker/v1/processor/processor.worker.js';
import { Readable } from 'stream';

export default async function processFlatFileProductDataStream({
  flatFileStream,
  vendorId,
  ownerId,
  fileName,
}: {
  flatFileStream: NodeJS.ReadableStream;
  vendorId: string;
  ownerId?: string;
  fileName: string;
}) {
  logger.info(
    `✅ Started processing lines from ${fileName} for vendor ${vendorId}`
  );

  return new Promise<void>((resolve, reject) => {
    let totalCount = 0;
    let buffer = '';
    let fileFieldMapLines: string[] = [];
    let fileConfig: FileConfig | null = null;
    let isPaused = false;

    const stream = flatFileStream as Readable;

    // Helper function to queue lines with backpressure handling
    const queueLinesWithBackpressure = async (
      lines: string[],
      config: FileConfig
    ): Promise<void> => {
      const accepted = processProductLinesWorker(lines, config, {
        vendorId,
        ownerId,
      });

      if (!accepted) {
        stream.pause();
        isPaused = true;
        await waitForQueueSpace();
        isPaused = false;
        processProductLinesWorker(lines, config, {
          vendorId,
          ownerId,
        });
        stream.resume();
      }

      totalCount += lines.length;
    };

    const processLines = async (lines: string[]) => {
      if (!fileConfig) {
        fileFieldMapLines.push(...lines);

        if (fileFieldMapLines.length > 1) {
          const { data, errorRecord } =
            await productFileSimpleHeaderMapGeneratorAi(fileFieldMapLines);

          if (errorRecord) {
            error.sendErrorMessage({
              ...errorRecord,
              details: [
                ...(errorRecord.details ?? []),
                {
                  function: 'productFileSimpleHeaderMapGeneratorAi',
                  extract: fileFieldMapLines,
                },
              ],
            });
            stream.destroy();
            reject(new Error('Failed to generate file config'));
            return;
          }

          fileConfig = data;
          await queueLinesWithBackpressure(fileFieldMapLines, fileConfig);
          fileFieldMapLines = [];
        }
        return;
      }

      await queueLinesWithBackpressure(lines, fileConfig);
    };

    stream.on('data', async (chunk) => {
      stream.pause();

      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r\n|\n|\r/);
      buffer = lines.pop() || '';

      if (lines.length > 0) await processLines(lines);

      if (!isPaused) stream.resume();
    });

    stream.on('end', async () => {
      if (buffer.trim() && fileConfig) {
        await queueLinesWithBackpressure([buffer], fileConfig);
      }

      logger.info(
        `✅ Completed ${totalCount} lines from ${fileName} for vendor ${vendorId}`
      );
      resolve();
    });

    stream.on('error', (error) => {
      logger.error(`Error processing ${fileName}: ${error.message}`);
      reject(error);
    });
  });
}

async function waitForQueueSpace(): Promise<void> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (productQueue.hasSpace()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, env.PROCESSOR_QUEUE_CHECK_WAIT_INTERVAL);
  });
}
