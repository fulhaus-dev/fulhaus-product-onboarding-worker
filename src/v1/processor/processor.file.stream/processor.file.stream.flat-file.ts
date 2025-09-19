import { error } from '@worker/utils/error.js';
import logger from '@worker/utils/logger.js';
import productFileSimpleHeaderMapGeneratorAi from '@worker/v1/ai/ai.product-file-simple-header-map-generator.js';
import { FileConfig } from '@worker/v1/processor/processor.type.js';
import processProductLinesWorker from '@worker/v1/processor/processor.worker.js';

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
        return;
      }

      fileConfig = data;

      await processProductLinesWorker(fileFieldMapLines, fileConfig, {
        vendorId,
        ownerId,
      });

      fileFieldMapLines = [];

      process.exit(1);
      //   const { data, errorRecord: extractFileFieldMapErrorRecord } =
      //     await extractFileFieldMap(currentLines);
      //   if (extractFileFieldMapErrorRecord) {
      //     sendErrorMessage(extractFileFieldMapErrorRecord, {
      //       function: 'extractFileFieldMap',
      //       extract: currentLines,
      //     });
      //     return;
      //   }

      //   fileConfig = {
      //     delimiter: data.productDataDelimiter,
      //     fieldMap: data.productFieldMap,
      //     headerFields: data.headerLines,
      //   };
      //   fileFieldMapLines = [];

      //   totalCount = totalCount + data.mainLines.length;

      //   sendFileDataForProcessing({
      //     fieldMap: fileConfig.fieldMap,
      //     headerFields: fileConfig.headerFields,
      //     mainLines: data.mainLines,
      //     vendorId,
      //     ownerId,
      //     fileName,
      //   });

      //   continue;
    }

    if (!fileConfig) continue;

    // const data = extractFileData(currentLines, fileConfig.delimiter);

    // totalCount = totalCount + data.length;

    // if (totalCount > 2000) return;

    // sendFileDataForProcessing({
    //   fieldMap: fileConfig.fieldMap,
    //   headerFields: fileConfig.headerFields,
    //   mainLines: data,
    //   vendorId,
    //   ownerId,
    //   fileName,
    // });
  }

  //   if (fileConfig) {
  //     sendFileDataForProcessing({
  //       fieldMap: fileConfig.fieldMap,
  //       headerFields: fileConfig.headerFields,
  //       mainLines: [],
  //       vendorId,
  //       ownerId,
  //       fileName,
  //       hasMore: false, // Signal completion
  //     });
  //   }

  logger.info(
    `✅ Completed ${totalCount} lines from ${fileName} for vendor ${vendorId}`
  );
}
