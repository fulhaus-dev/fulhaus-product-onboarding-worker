// import { error } from '@worker/utils/error.js';
// import logger from '@worker/utils/logger.js';
import { FileConfig } from '@worker/v1/processor/processor.type.js';
import {
  getBaseProductData,
  // getProductDimensionData,
  // getProductImageData,
  // getProductIsoCodeData,
  // getProductDescriptionAndCategoryData,
  // getProductStyleData,
  // getProductWeightData,
} from '@worker/v1/processor/processor.util.js';
// import { createProductService } from '@worker/v1/product/product.service.js';
// import { CreateProduct } from '@worker/v1/product/product.type.js';
// import { appendFile } from 'fs/promises';

let count = 1;

class ProductLinesQueue {
  private queue: string[] = [];
  private isProcessing = false;
  private fileConfig: FileConfig | null = null;
  private idArgs: { vendorId: string; ownerId?: string } | null = null;

  // Add lines to the queue (called when new lines come in)
  addLines(
    lines: string[],
    fileConfig: FileConfig,
    idArgs: { vendorId: string; ownerId?: string }
  ) {
    this.queue.push(...lines);
    this.fileConfig = fileConfig;
    this.idArgs = idArgs;

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Take next 20 (or less) from queue
      const batch = this.queue.splice(0, 20);

      // Process this batch and wait for completion
      await processProductLines(batch, this.fileConfig!, this.idArgs!);

      // Force cleanup
      if (global.gc) global.gc();

      // Add delay between batches to prevent 502 errors
      await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5 second delay
    }

    this.isProcessing = false;
  }
}

// Create global queue instance
const productQueue = new ProductLinesQueue();

export default function processProductLinesWorker(
  productDataLines: string[],
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  productQueue.addLines(productDataLines, fileConfig, idArgs);
}

async function processProductLines(
  productDataLines: string[],
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  const baseProductData = getBaseProductData(productDataLines, fileConfig);

  console.log('baseProductData', baseProductData);

  //////////////////
  // const productImageData = await getProductImageData(
  //   productDataLines,
  //   fileConfig
  // );

  //   for (let i = 0; i < baseProductData.length; i++) {
  //     const sku = baseProductData[i].sku;
  //     const name = baseProductData[i].name;
  //     const imageUrls = productImageData[i].imageUrls;
  //     const mainImageUrl = productImageData[i].mainImageUrl;

  //     const dataToWrite = `
  // ${count} *******
  // SKU: ${sku}
  // NAME: ${name}

  // IMAGE URLS:
  // ${imageUrls.join('\n')}

  // DETECTED MAIN IMAGE URL: ${mainImageUrl}
  // `;

  //     count++;

  //     try {
  //       const jsonLine = dataToWrite + '\n';
  //       await appendFile('sample-image-data.txt', jsonLine, 'utf8');
  //     } catch (writeError) {
  //       console.error('Failed to write to error.txt:', writeError);
  //     }
  //   }
  //////////////////

  // const [
  //   productImageData,
  //   productIsoCodeData,
  //   productDimensionData,
  //   productWeightData,
  // ] = await Promise.all([
  //   getProductImageData(productDataLines, fileConfig),
  //   getProductIsoCodeData(productDataLines, fileConfig),
  //   getProductDimensionData(productDataLines, fileConfig),
  //   getProductWeightData(productDataLines, fileConfig),
  // ]);

  // const [productStyleData, productDescriptionAndCategoryData] =
  //   await Promise.all([
  //     getProductStyleData(productDataLines, fileConfig, productImageData),
  //     getProductDescriptionAndCategoryData(
  //       productDataLines,
  //       fileConfig,
  //       productImageData,
  //       baseProductData
  //     ),
  //   ]);

  // const productsToCreate: CreateProduct[] = baseProductData.map(
  //   (product, index) => ({
  //     vendorId: idArgs.vendorId,
  //     ownerId: idArgs.ownerId ?? null,
  //     ...product,
  //     ...productImageData[index],
  //     ...productIsoCodeData[index],
  //     ...productDimensionData[index],
  //     ...productWeightData[index],
  //     ...productStyleData[index],
  //     ...productDescriptionAndCategoryData[index],
  //   })
  // );

  // const createProductResponses = await Promise.all(
  //   productsToCreate.map((createProductData) =>
  //     createProductService(createProductData)
  //   )
  // );

  // logger.info(`✅ Added ${createProductResponses.length} products to DB`);

  // createProductResponses.forEach((response, index) => {
  //   if (response?.errorRecord) {
  //     writeErrorToFile(`${JSON.stringify(productsToCreate[index], null, 2)},`);

  //     error.sendErrorMessage({
  //       ...response.errorRecord,
  //       details: [
  //         ...(response.errorRecord.details ?? []),
  //         {
  //           function: 'createProductService',
  //           createProductData: productsToCreate[index],
  //         },
  //       ],
  //     });
  //   }
  // });
}

// async function writeErrorToFile(errorData: any) {
//   try {
//     const jsonLine = JSON.stringify(errorData) + '\n';
//     await appendFile('error.txt', jsonLine, 'utf8');
//   } catch (writeError) {
//     console.error('Failed to write to error.txt:', writeError);
//   }
// }
