// import { env } from '@worker/config/environment.js';
// import { error } from '@worker/utils/error.js';
// import logger from '@worker/utils/logger.js';
// import uid from '@worker/utils/uid.js';
// import productInfoGeneratorAi from '@worker/v1/ai/ai.product-info-generator.js';
// import type { FileConfig } from '@worker/v1/processor/processor.type.js';
// import {
//   getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo,
//   getProductComputedData,
//   getProductsImageEmbedding,
//   getProductsStyleInfo,
// } from '@worker/v1/processor/processor.util.js';
// import { productCategories } from '@worker/v1/product/product.constant.js';
// import {
//   createProductsService,
//   getAllProductCategoryStatisticService,
//   logProductErrorService,
// } from '@worker/v1/product/product.service.js';
// import type {
//   BaseProduct,
//   ProductCategoryCount,
//   ProductCategoryCountCurrency,
//   ProductCurrencyCode,
//   ProductInfo,
// } from '@worker/v1/product/product.type.js';

// let categoryCount = {} as ProductCategoryCount;

// class ProductLinesQueue {
//   private queue: string[] = [];
//   private isProcessing = false;
//   private fileConfig: FileConfig | null = null;
//   private idArgs: { vendorId: string; ownerId?: string } | null = null;
//   private totalProcessed = 0;
//   private processingPromise: Promise<void> | null = null;

//   addLines(
//     lines: string[],
//     fileConfig: FileConfig,
//     idArgs: { vendorId: string; ownerId?: string }
//   ): boolean {
//     if (this.queue.length + lines.length > env.MAX_PROCESSING_QUEUE_SIZE) {
//       return false;
//     }

//     this.queue.push(...lines);
//     this.fileConfig = fileConfig;
//     this.idArgs = idArgs;

//     if (!this.isProcessing) {
//       this.processingPromise = this.processQueue().catch((err) => {
//         logger.error(`Queue processing error: ${err}`);
//         this.isProcessing = false;
//         throw err;
//       });
//     }

//     return true;
//   }

//   hasSpace(): boolean {
//     return this.queue.length < env.MAX_PROCESSING_QUEUE_SIZE;
//   }

//   getQueueSize(): number {
//     return this.queue.length;
//   }

//   getTotalProcessed(): number {
//     return this.totalProcessed;
//   }

//   private async processQueue(): Promise<void> {
//     this.isProcessing = true;

//     try {
//       while (this.queue.length > 0) {
//         const batchSize = Math.min(env.MAX_PROCESSING_BATCH, this.queue.length);
//         const batch = this.queue.splice(0, batchSize);

//         if (!this.fileConfig || !this.idArgs) {
//           throw new Error('Missing fileConfig or idArgs for processing');
//         }

//         try {
//           await processProductLines(batch, this.fileConfig, this.idArgs);
//           this.totalProcessed += batch.length;
//         } catch (batchError) {
//           const errorRecord = error.exceptionErrorRecord(batchError);
//           logger.error(
//             `Batch processing failed: ${errorRecord.message}, batch size: ${batch.length}`
//           );
//         }

//         // Periodic GC for large datasets
//         if (this.totalProcessed % 50000 === 0 && global.gc) {
//           global.gc();
//         }
//       }
//     } catch (err) {
//       const errorRecord = error.exceptionErrorRecord(err);
//       logger.error(`Critical queue processing error: ${errorRecord.message}`);
//       throw err;
//     } finally {
//       this.isProcessing = false;
//       this.processingPromise = null;
//     }
//   }

//   isComplete(): boolean {
//     return !this.isProcessing && this.queue.length === 0;
//   }

//   async waitForCompletion(timeoutMs: number = 300000): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (this.isComplete()) {
//         resolve();
//         return;
//       }

//       const timeout = setTimeout(() => {
//         clearInterval(interval);
//         logger.error(
//           `Queue timeout after ${timeoutMs}ms. Processed: ${this.totalProcessed}, Remaining: ${this.queue.length}`
//         );
//         reject(new Error(`Queue processing timeout after ${timeoutMs}ms`));
//       }, timeoutMs);

//       const interval = setInterval(() => {
//         if (this.isComplete()) {
//           clearTimeout(timeout);
//           clearInterval(interval);
//           resolve();
//         }
//       }, 2000); // Check every 2 seconds instead of 1

//       if (this.processingPromise) {
//         this.processingPromise.catch((err) => {
//           clearTimeout(timeout);
//           clearInterval(interval);
//           reject(err);
//         });
//       }
//     });
//   }

//   async stop(): Promise<void> {
//     if (this.processingPromise) {
//       await this.processingPromise;
//     }
//   }

//   reset(): void {
//     this.queue = [];
//     this.totalProcessed = 0;
//     this.fileConfig = null;
//     this.idArgs = null;
//   }
// }

// export const productQueue = new ProductLinesQueue();

// export default function processProductLinesWorker(
//   productDataLines: string[],
//   fileConfig: FileConfig,
//   idArgs: { vendorId: string; ownerId?: string }
// ): boolean {
//   return productQueue.addLines(productDataLines, fileConfig, idArgs);
// }

// async function processProductLines(
//   productDataLines: string[],
//   fileConfig: FileConfig,
//   idArgs: { vendorId: string; ownerId?: string }
// ) {
//   // Cache category count once
//   if (Object.keys(categoryCount).length === 0) {
//     const { data: categoryCountResponse } =
//       await getAllProductCategoryStatisticService();

//     if (categoryCountResponse) {
//       categoryCount = categoryCountResponse.stats.reduce((acc, count) => {
//         acc[count.category] = {
//           countUSD: count.countUSD,
//           countCAD: count.countCAD,
//         } as ProductCategoryCountCurrency;
//         return acc;
//       }, {} as ProductCategoryCount);
//     }
//   }

//   const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
//     await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
//       productDataLines,
//       fileConfig
//     );

//   if (initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length < 1) return;

//   // OPTIMIZATION 1: Pre-convert productCategories array to Set for O(1) lookup
//   const productCategoriesSet = new Set(productCategories);

//   const productInfoResponses = await Promise.all(
//     initialBaseProductsWithMainImageUrlAndIsoCodeInfo.map(
//       (initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
//         productInfoGeneratorAi({
//           name: initialBaseProductWithMainImageUrlAndIsoCodeInfo.name,
//           description:
//             initialBaseProductWithMainImageUrlAndIsoCodeInfo.description,
//           mainImageUrl:
//             initialBaseProductWithMainImageUrlAndIsoCodeInfo.mainImageUrl,
//         })
//     )
//   );

//   // OPTIMIZATION 2: Combine map + filter into single reduce (KEEPING ORIGINAL TYPES)
//   const baseProducts = initialBaseProductsWithMainImageUrlAndIsoCodeInfo.reduce<
//     BaseProduct[]
//   >((acc, initialProduct, index) => {
//     const response = productInfoResponses[index];
//     const product = {
//       ...initialProduct,
//       name: response.data?.name,
//       description: response.data?.description,
//       category: response.data?.category,
//     };

//     // Single-pass validation with Set lookup (O(1) instead of O(n))
//     if (
//       product.sku &&
//       product.name &&
//       product.description &&
//       product.category &&
//       productCategoriesSet.has(product.category) && // O(1) vs O(n)
//       (categoryCount[product.category]?.[`count${product.currencyCode}`] ??
//         0) <= env.MAX_CATEGORIES
//     ) {
//       acc.push(product as BaseProduct);
//     }
//     return acc;
//   }, []);

//   if (baseProducts.length < 1) return;

//   const [productsStyleInfo, productsImageEmbedding] = await Promise.all([
//     getProductsStyleInfo(
//       fileConfig.headerLine,
//       baseProducts.map((baseProduct) => ({
//         line: baseProduct.line,
//         mainImageUrl: baseProduct.mainImageUrl,
//       }))
//     ),
//     getProductsImageEmbedding(
//       baseProducts.map((baseProduct) => baseProduct.mainImageUrl)
//     ),
//   ]);

//   const productsWithEmbedding = baseProducts.map((baseProduct, index) => ({
//     ...baseProduct,
//     ...productsStyleInfo[index],
//     ...productsImageEmbedding[index],
//   }));

//   // KEEPING ORIGINAL LOGIC TO AVOID TYPE ERRORS
//   const productsWithUndefinedRequiredValues = productsWithEmbedding.map(
//     (productWithEmbedding) => {
//       if (!productWithEmbedding.imageEmbedding) return undefined;
//       if (!productWithEmbedding.currencyCode) return undefined;
//       if (!productWithEmbedding.dimension) return undefined;

//       const { price, ...otherProductComputedData } =
//         getProductComputedData(productWithEmbedding);

//       return {
//         ...productWithEmbedding,
//         vendorId: idArgs.vendorId as any, // Type cast to handle ID type mismatch
//         ownerId: idArgs.ownerId as any, // Type cast to handle ID type mismatch
//         fhSku: uid.generate(),
//         ...otherProductComputedData,
//         prices: [price],
//         line: undefined,
//         currencyCode: productWithEmbedding.currencyCode,
//       };
//     }
//   ) as ((ProductInfo & { currencyCode: ProductCurrencyCode }) | undefined)[];

//   const products = productsWithUndefinedRequiredValues.filter(
//     (product) => product !== undefined
//   ) as (ProductInfo & { currencyCode: ProductCurrencyCode })[];

//   if (products.length < 1) return;

//   // OPTIMIZATION 3: Batch category count updates with proper typing
//   const categoryUpdates: Record<string, Record<string, number>> = {};

//   for (const product of products) {
//     const category = product.category;
//     const currencyKey =
//       `count${product.currencyCode}` as keyof ProductCategoryCountCurrency;

//     if (!categoryUpdates[category]) {
//       categoryUpdates[category] = {};
//     }

//     categoryUpdates[category][currencyKey] =
//       (categoryUpdates[category][currencyKey] || 0) + 1;
//   }

//   // Apply batched updates with proper type handling
//   for (const [category, updates] of Object.entries(categoryUpdates)) {
//     const categoryKey = category as keyof ProductCategoryCount;

//     if (!categoryCount[categoryKey]) {
//       categoryCount[categoryKey] = {} as ProductCategoryCountCurrency;
//     }

//     for (const [currencyKey, increment] of Object.entries(updates)) {
//       const typedCurrencyKey =
//         currencyKey as keyof ProductCategoryCountCurrency;
//       categoryCount[categoryKey][typedCurrencyKey] =
//         (categoryCount[categoryKey][typedCurrencyKey] || 0) + increment;
//     }
//   }

//   // OPTIMIZATION 4: Pre-allocate array for service call
//   const createProductsData = new Array(products.length);

//   for (let i = 0; i < products.length; i++) {
//     const product = products[i];
//     const { imageEmbedding, currencyCode, ...productData } = product;

//     createProductsData[i] = {
//       productData,
//       imageEmbedding,
//     };
//   }

//   const { errorRecord } = await createProductsService(createProductsData);

//   if (errorRecord) {
//     logProductErrorService({
//       ...errorRecord,
//       details: [
//         ...(errorRecord.details ?? []),
//         {
//           function: 'createProductsService',
//           createProductData: products.map((product) => product.sku),
//         },
//       ],
//     });
//   }
// }

// // class ProductLinesQueue {
// //   private queue: string[] = [];
// //   private isProcessing = false;
// //   private fileConfig: FileConfig | null = null;
// //   private idArgs: { vendorId: string; ownerId?: string } | null = null;

// //   // Add lines to the queue (called when new lines come in)
// //   addLines(
// //     lines: string[],
// //     fileConfig: FileConfig,
// //     idArgs: { vendorId: string; ownerId?: string }
// //   ) {
// //     if (this.queue.length + lines.length > env.MAX_PROCESSING_QUEUE_SIZE) {
// //       return false;
// //     }

// //     this.queue.push(...lines);
// //     this.fileConfig = fileConfig;
// //     this.idArgs = idArgs;

// //     // Start processing if not already running
// //     if (!this.isProcessing) {
// //       this.processQueue().catch((err) => {
// //         logger.error('Queue processing error:', err);
// //         // Don't throw here, just log the error
// //       });
// //     }

// //     return true;
// //   }

// //   hasSpace(): boolean {
// //     return this.queue.length < env.MAX_PROCESSING_QUEUE_SIZE;
// //   }

// //   getQueueSize(): number {
// //     return this.queue.length;
// //   }

// //   private async processQueue() {
// //     this.isProcessing = true;

// //     try {
// //       while (this.queue.length > 0) {
// //         // Take next batch from queue
// //         const batch = this.queue.splice(0, env.MAX_PROCESSING_BATCH);

// //         // Process this batch and wait for completion
// //         await processProductLines(batch, this.fileConfig!, this.idArgs!);

// //         // Force cleanup
// //         if (global.gc) global.gc();

// //         // Log progress periodically
// //         if (totalProcessed % 500 === 0) {
// //           logger.info(`📦 Queue status: ${this.queue.length} lines remaining`);
// //         }
// //       }
// //     } catch (err) {
// //       const errorRecord = error.exceptionErrorRecord(err);
// //       logger.error(`Error in queue processing: ${errorRecord.message}`);
// //       // Continue processing despite errors in individual batches
// //     } finally {
// //       this.isProcessing = false;
// //     }
// //   }

// //   // Method to check if processing is complete
// //   isComplete(): boolean {
// //     return !this.isProcessing && this.queue.length === 0;
// //   }

// //   // Method to wait for completion
// //   async waitForCompletion(timeoutMs: number = 300000): Promise<void> {
// //     return new Promise((resolve, reject) => {
// //       if (this.isComplete()) {
// //         resolve();
// //         return;
// //       }

// //       const timeout = setTimeout(() => {
// //         reject(new Error(`Queue processing timeout after ${timeoutMs}ms`));
// //       }, timeoutMs);

// //       const checkCompletion = () => {
// //         if (this.isComplete()) {
// //           clearTimeout(timeout);
// //           clearInterval(interval);
// //           resolve();
// //         }
// //       };

// //       const interval = setInterval(checkCompletion, 1000);
// //     });
// //   }
// // }

// // // Create global queue instance
// // export const productQueue = new ProductLinesQueue();

// // export default function processProductLinesWorker(
// //   productDataLines: string[],
// //   fileConfig: FileConfig,
// //   idArgs: { vendorId: string; ownerId?: string }
// // ) {
// //   return productQueue.addLines(productDataLines, fileConfig, idArgs);
// // }

// ///////////////

// // async function processProductLines(
// //   productDataLines: string[],
// //   fileConfig: FileConfig,
// //   idArgs: { vendorId: string; ownerId?: string }
// // ) {
// //   if (Object.keys(categoryCount).length === 0) {
// //     const { data: categoryCountResponse } =
// //       await getAllProductCategoryStatisticService();

// //     if (categoryCountResponse) {
// //       categoryCount = categoryCountResponse.stats.reduce((acc, count) => {
// //         acc[count.category] = {
// //           countUSD: count.countUSD,
// //           countCAD: count.countCAD,
// //         } as ProductCategoryCountCurrency;

// //         return acc;
// //       }, {} as ProductCategoryCount);
// //     }
// //   }

// //   const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
// //     await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
// //       productDataLines,
// //       fileConfig
// //     );
// //   if (initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length < 1) return;

// //   const productInfoResponses = await Promise.all(
// //     initialBaseProductsWithMainImageUrlAndIsoCodeInfo.map(
// //       (initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
// //         productInfoGeneratorAi({
// //           name: initialBaseProductWithMainImageUrlAndIsoCodeInfo.name,
// //           description:
// //             initialBaseProductWithMainImageUrlAndIsoCodeInfo.description,
// //           mainImageUrl:
// //             initialBaseProductWithMainImageUrlAndIsoCodeInfo.mainImageUrl,
// //         })
// //     )
// //   );

// //   const baseProducts = initialBaseProductsWithMainImageUrlAndIsoCodeInfo
// //     .map((initialBaseProductWithMainImageUrlAndIsoCodeInfo, index) => ({
// //       ...initialBaseProductWithMainImageUrlAndIsoCodeInfo,
// //       name: productInfoResponses[index].data?.name,
// //       description: productInfoResponses[index].data?.description,
// //       category: productInfoResponses[index].data?.category,
// //     }))
// //     .filter(
// //       (baseProduct) =>
// //         !!baseProduct.sku &&
// //         !!baseProduct.name &&
// //         !!baseProduct.description &&
// //         !!baseProduct.category &&
// //         productCategories.includes(baseProduct.category) &&
// //         (categoryCount[baseProduct.category]?.[
// //           `count${baseProduct.currencyCode}`
// //         ] ?? 0) <= env.MAX_CATEGORIES
// //     ) as BaseProduct[];
// //   if (baseProducts.length < 1) return undefined;

// //   const [productsStyleInfo, productsImageEmbedding] = await Promise.all([
// //     getProductsStyleInfo(
// //       fileConfig.headerLine,
// //       baseProducts.map((baseProduct) => ({
// //         line: baseProduct.line,
// //         mainImageUrl: baseProduct.mainImageUrl,
// //       }))
// //     ),
// //     getProductsImageEmbedding(
// //       baseProducts.map((baseProduct) => baseProduct.mainImageUrl)
// //     ),
// //   ]);

// //   const productsWithEmbedding = baseProducts.map((baseProduct, index) => ({
// //     ...baseProduct,
// //     ...productsStyleInfo[index],
// //     ...productsImageEmbedding[index],
// //   }));

// //   const productsWithUndefinedRequiredValues = productsWithEmbedding.map(
// //     (productWithEmbedding) => {
// //       if (!productWithEmbedding.imageEmbedding) return undefined;
// //       if (!productWithEmbedding.currencyCode) return undefined;
// //       if (!productWithEmbedding.dimension) return undefined;

// //       const { price, ...otherProductComputedData } =
// //         getProductComputedData(productWithEmbedding);

// //       return {
// //         ...productWithEmbedding,
// //         vendorId: idArgs.vendorId,
// //         ownerId: idArgs.ownerId,
// //         fhSku: uid.generate(),
// //         ...otherProductComputedData,
// //         prices: [price],
// //         line: undefined,
// //         currencyCode: productWithEmbedding.currencyCode,
// //       };
// //     }
// //   ) as ((ProductInfo & { currencyCode: ProductCurrencyCode }) | undefined)[];

// //   const products = productsWithUndefinedRequiredValues.filter(
// //     (product) => product !== undefined
// //   ) as (ProductInfo & { currencyCode: ProductCurrencyCode })[];
// //   if (products.length < 1) return undefined;

// //   for (const product of products) {
// //     const currentCategoryCount = categoryCount?.[product.category];

// //     if (!currentCategoryCount)
// //       categoryCount[product.category] = {
// //         [`count${product.currencyCode}`]: 1,
// //       } as ProductCategoryCountCurrency;
// //     else
// //       categoryCount[product.category][`count${product.currencyCode}`] =
// //         (currentCategoryCount?.[`count${product.currencyCode}`] ?? 0) + 1;
// //   }

// //   const { errorRecord } = await createProductsService(
// //     products.map((product) => {
// //       const { imageEmbedding, ...productData } = product;
// //       (productData as any).currencyCode = undefined;

// //       return {
// //         productData,
// //         imageEmbedding,
// //       };
// //     })
// //   );

// //   if (errorRecord) {
// //     logProductErrorService({
// //       ...errorRecord,
// //       details: [
// //         ...(errorRecord.details ?? []),
// //         {
// //           function: 'createProductsService',
// //           createProductData: products.map((product) => product.sku),
// //         },
// //       ],
// //     });
// //   }
// // }

// import { env } from '@worker/config/environment.js';
// import { error } from '@worker/utils/error.js';
// import logger from '@worker/utils/logger.js';
// import uid from '@worker/utils/uid.js';
// import productInfoGeneratorAi from '@worker/v1/ai/ai.product-info-generator.js';
// import type { FileConfig } from '@worker/v1/processor/processor.type.js';
// import {
//   getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo,
//   getProductComputedData,
//   getProductsImageEmbedding,
//   getProductsStyleInfo,
// } from '@worker/v1/processor/processor.util.js';
// import { productCategories } from '@worker/v1/product/product.constant.js';
// import {
//   createProductsService,
//   getAllProductCategoryStatisticService,
//   logProductErrorService,
// } from '@worker/v1/product/product.service.js';
// import type {
//   BaseProduct,
//   ProductCategoryCount,
//   ProductCategoryCountCurrency,
//   ProductCurrencyCode,
//   ProductInfo,
// } from '@worker/v1/product/product.type.js';

// let categoryCount = {} as ProductCategoryCount;
// // OPTIMIZATION: Cache productCategories Set to avoid recreating it
// const productCategoriesSet = new Set(productCategories);

// class ProductLinesQueue {
//   private queue: string[] = [];
//   private isProcessing = false;
//   private fileConfig: FileConfig | null = null;
//   private idArgs: { vendorId: string; ownerId?: string } | null = null;
//   private totalProcessed = 0;
//   private processingPromise: Promise<void> | null = null;

//   addLines(
//     lines: string[],
//     fileConfig: FileConfig,
//     idArgs: { vendorId: string; ownerId?: string }
//   ): boolean {
//     if (this.queue.length + lines.length > env.MAX_PROCESSING_QUEUE_SIZE) {
//       return false;
//     }

//     this.queue.push(...lines);
//     this.fileConfig = fileConfig;
//     this.idArgs = idArgs;

//     if (!this.isProcessing) {
//       this.processingPromise = this.processQueue().catch((err) => {
//         logger.error(`Queue processing error: ${err}`);
//         this.isProcessing = false;
//         throw err;
//       });
//     }

//     return true;
//   }

//   hasSpace(): boolean {
//     return this.queue.length < env.MAX_PROCESSING_QUEUE_SIZE;
//   }

//   getQueueSize(): number {
//     return this.queue.length;
//   }

//   getTotalProcessed(): number {
//     return this.totalProcessed;
//   }

//   private async processQueue(): Promise<void> {
//     this.isProcessing = true;

//     try {
//       while (this.queue.length > 0) {
//         const batchSize = Math.min(env.MAX_PROCESSING_BATCH, this.queue.length);
//         const batch = this.queue.splice(0, batchSize);

//         if (!this.fileConfig || !this.idArgs) {
//           throw new Error('Missing fileConfig or idArgs for processing');
//         }

//         try {
//           await processProductLines(batch, this.fileConfig, this.idArgs);
//           this.totalProcessed += batch.length;
//         } catch (batchError) {
//           const errorRecord = error.exceptionErrorRecord(batchError);
//           logger.error(
//             `Batch processing failed: ${errorRecord.message}, batch size: ${batch.length}`
//           );
//         }

//         // Periodic GC for large datasets
//         if (this.totalProcessed % 50000 === 0 && global.gc) {
//           global.gc();
//         }
//       }
//     } catch (err) {
//       const errorRecord = error.exceptionErrorRecord(err);
//       logger.error(`Critical queue processing error: ${errorRecord.message}`);
//       throw err;
//     } finally {
//       this.isProcessing = false;
//       this.processingPromise = null;
//     }
//   }

//   isComplete(): boolean {
//     return !this.isProcessing && this.queue.length === 0;
//   }

//   async waitForCompletion(timeoutMs: number = 300000): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (this.isComplete()) {
//         resolve();
//         return;
//       }

//       const timeout = setTimeout(() => {
//         clearInterval(interval);
//         logger.error(
//           `Queue timeout after ${timeoutMs}ms. Processed: ${this.totalProcessed}, Remaining: ${this.queue.length}`
//         );
//         reject(new Error(`Queue processing timeout after ${timeoutMs}ms`));
//       }, timeoutMs);

//       const interval = setInterval(() => {
//         if (this.isComplete()) {
//           clearTimeout(timeout);
//           clearInterval(interval);
//           resolve();
//         }
//       }, 2000); // Check every 2 seconds instead of 1

//       if (this.processingPromise) {
//         this.processingPromise.catch((err) => {
//           clearTimeout(timeout);
//           clearInterval(interval);
//           reject(err);
//         });
//       }
//     });
//   }

//   async stop(): Promise<void> {
//     if (this.processingPromise) {
//       await this.processingPromise;
//     }
//   }

//   reset(): void {
//     this.queue = [];
//     this.totalProcessed = 0;
//     this.fileConfig = null;
//     this.idArgs = null;
//   }
// }

// export const productQueue = new ProductLinesQueue();

// export default function processProductLinesWorker(
//   productDataLines: string[],
//   fileConfig: FileConfig,
//   idArgs: { vendorId: string; ownerId?: string }
// ): boolean {
//   return productQueue.addLines(productDataLines, fileConfig, idArgs);
// }

// async function processProductLines(
//   productDataLines: string[],
//   fileConfig: FileConfig,
//   idArgs: { vendorId: string; ownerId?: string }
// ) {
//   // Cache category count once
//   if (Object.keys(categoryCount).length === 0) {
//     const { data: categoryCountResponse } =
//       await getAllProductCategoryStatisticService();

//     if (categoryCountResponse) {
//       categoryCount = categoryCountResponse.stats.reduce((acc, count) => {
//         acc[count.category] = {
//           countUSD: count.countUSD,
//           countCAD: count.countCAD,
//         } as ProductCategoryCountCurrency;
//         return acc;
//       }, {} as ProductCategoryCount);
//     }
//   }

//   const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
//     await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
//       productDataLines,
//       fileConfig
//     );

//   if (initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length < 1) return;

//   const productInfoResponses = await Promise.all(
//     initialBaseProductsWithMainImageUrlAndIsoCodeInfo.map(
//       (initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
//         productInfoGeneratorAi({
//           name: initialBaseProductWithMainImageUrlAndIsoCodeInfo.name,
//           description:
//             initialBaseProductWithMainImageUrlAndIsoCodeInfo.description,
//           mainImageUrl:
//             initialBaseProductWithMainImageUrlAndIsoCodeInfo.mainImageUrl,
//         })
//     )
//   );

//   // OPTIMIZATION: Single-pass reduce with validation using Set lookup - O(n) instead of multiple passes
//   const baseProducts = initialBaseProductsWithMainImageUrlAndIsoCodeInfo.reduce<
//     BaseProduct[]
//   >((acc, initialProduct, index) => {
//     const response = productInfoResponses[index];
//     const product = {
//       ...initialProduct,
//       name: response.data?.name,
//       description: response.data?.description,
//       category: response.data?.category,
//     };

//     // Single-pass validation with Set lookup (O(1) instead of O(n))
//     if (
//       product.sku &&
//       product.name &&
//       product.description &&
//       product.category &&
//       productCategoriesSet.has(product.category) && // O(1) vs O(n) with array.includes()
//       (categoryCount[product.category]?.[`count${product.currencyCode}`] ??
//         0) <= env.MAX_CATEGORIES
//     ) {
//       acc.push(product as BaseProduct);
//     }
//     return acc;
//   }, []);

//   if (baseProducts.length < 1) return;

//   // OPTIMIZATION: Pre-allocate arrays for Promise.all to avoid repeated map operations
//   const styleInfoInput = new Array(baseProducts.length);
//   const imageEmbeddingInput = new Array(baseProducts.length);

//   for (let i = 0; i < baseProducts.length; i++) {
//     const baseProduct = baseProducts[i];
//     styleInfoInput[i] = {
//       line: baseProduct.line,
//       mainImageUrl: baseProduct.mainImageUrl,
//     };
//     imageEmbeddingInput[i] = baseProduct.mainImageUrl;
//   }

//   const [productsStyleInfo, productsImageEmbedding] = await Promise.all([
//     getProductsStyleInfo(fileConfig.headerLine, styleInfoInput),
//     getProductsImageEmbedding(imageEmbeddingInput),
//   ]);

//   // OPTIMIZATION: Combine embedding and validation into single pass - O(n) instead of O(2n)
//   // Pre-allocate for better performance
//   const products: (ProductInfo & { currencyCode: ProductCurrencyCode })[] = [];
//   const categoryUpdates: Record<string, Record<string, number>> = {};

//   for (let i = 0; i < baseProducts.length; i++) {
//     const baseProduct = baseProducts[i];
//     const styleInfo = productsStyleInfo[i];
//     const imageEmbedding = productsImageEmbedding[i].imageEmbedding;

//     // Early validation - skip if missing required values
//     if (
//       !imageEmbedding ||
//       !baseProduct.currencyCode ||
//       !baseProduct.dimension
//     ) {
//       continue;
//     }

//     const productWithEmbedding = {
//       ...baseProduct,
//       ...styleInfo,
//       imageEmbedding,
//     };

//     const { price, ...otherProductComputedData } =
//       getProductComputedData(productWithEmbedding);

//     const product = {
//       ...productWithEmbedding,
//       vendorId: idArgs.vendorId as any, // Type cast to handle ID type mismatch
//       ownerId: idArgs.ownerId as any, // Type cast to handle ID type mismatch
//       fhSku: uid.generate(),
//       ...otherProductComputedData,
//       prices: [price],
//       line: undefined,
//       currencyCode: baseProduct.currencyCode,
//     } as ProductInfo & { currencyCode: ProductCurrencyCode };

//     products.push(product);

//     // OPTIMIZATION: Batch category count updates inline - avoid second loop
//     const category = product.category;
//     const currencyKey =
//       `count${product.currencyCode}` as keyof ProductCategoryCountCurrency;

//     if (!categoryUpdates[category]) {
//       categoryUpdates[category] = {};
//     }

//     categoryUpdates[category][currencyKey] =
//       (categoryUpdates[category][currencyKey] || 0) + 1;
//   }

//   if (products.length < 1) return;

//   // Apply batched category count updates with proper type handling
//   for (const [category, updates] of Object.entries(categoryUpdates)) {
//     const categoryKey = category as keyof ProductCategoryCount;

//     if (!categoryCount[categoryKey]) {
//       categoryCount[categoryKey] = {} as ProductCategoryCountCurrency;
//     }

//     for (const [currencyKey, increment] of Object.entries(updates)) {
//       const typedCurrencyKey =
//         currencyKey as keyof ProductCategoryCountCurrency;
//       categoryCount[categoryKey][typedCurrencyKey] =
//         (categoryCount[categoryKey][typedCurrencyKey] || 0) + increment;
//     }
//   }

//   // OPTIMIZATION: Pre-allocate array and use for-loop instead of map for better performance
//   const createProductsData = new Array(products.length);

//   for (let i = 0; i < products.length; i++) {
//     const product = products[i];
//     const { imageEmbedding, currencyCode, ...productData } = product;

//     createProductsData[i] = {
//       productData,
//       imageEmbedding,
//     };
//   }

//   const { errorRecord } = await createProductsService(createProductsData);

//   if (errorRecord) {
//     // OPTIMIZATION: Pre-allocate SKU array instead of using map
//     const productSkus = new Array(products.length);
//     for (let i = 0; i < products.length; i++) {
//       productSkus[i] = products[i].sku;
//     }

//     logProductErrorService({
//       ...errorRecord,
//       details: [
//         ...(errorRecord.details ?? []),
//         {
//           function: 'createProductsService',
//           createProductData: productSkus,
//         },
//       ],
//     });
//   }
// }

// import { env } from '@worker/config/environment.js';
// import { error } from '@worker/utils/error.js';
// import logger from '@worker/utils/logger.js';
// import uid from '@worker/utils/uid.js';
// import productInfoGeneratorAi from '@worker/v1/ai/ai.product-info-generator.js';
// import type { FileConfig } from '@worker/v1/processor/processor.type.js';
// import {
//   getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo,
//   getProductComputedData,
//   getProductsImageEmbedding,
//   getProductsStyleInfo,
// } from '@worker/v1/processor/processor.util.js';
// import { productCategories } from '@worker/v1/product/product.constant.js';
// import {
//   createProductsService,
//   getAllProductCategoryStatisticService,
//   logProductErrorService,
// } from '@worker/v1/product/product.service.js';
// import type {
//   BaseProduct,
//   ProductCategoryCount,
//   ProductCategoryCountCurrency,
//   ProductCurrencyCode,
//   ProductInfo,
// } from '@worker/v1/product/product.type.js';

// let categoryCount = {} as ProductCategoryCount;
// // OPTIMIZATION: Cache productCategories Set to avoid recreating it
// const productCategoriesSet = new Set(productCategories);

// class ProductLinesQueue {
//   private queue: string[] = [];
//   private isProcessing = false;
//   private fileConfig: FileConfig | null = null;
//   private idArgs: { vendorId: string; ownerId?: string } | null = null;
//   private totalProcessed = 0;
//   private processingPromise: Promise<void> | null = null;

//   addLines(
//     lines: string[],
//     fileConfig: FileConfig,
//     idArgs: { vendorId: string; ownerId?: string }
//   ): boolean {
//     // OPTIMIZATION: Early exit check before calculation
//     const queueLength = this.queue.length;
//     const totalSize = queueLength + lines.length;

//     if (totalSize > env.MAX_PROCESSING_QUEUE_SIZE) {
//       return false;
//     }

//     this.queue.push(...lines);
//     this.fileConfig = fileConfig;
//     this.idArgs = idArgs;

//     if (!this.isProcessing) {
//       this.processingPromise = this.processQueue().catch((err) => {
//         logger.error(`Queue processing error: ${err}`);
//         this.isProcessing = false;
//         throw err;
//       });
//     }

//     return true;
//   }

//   hasSpace(): boolean {
//     return this.queue.length < env.MAX_PROCESSING_QUEUE_SIZE;
//   }

//   getQueueSize(): number {
//     return this.queue.length;
//   }

//   getTotalProcessed(): number {
//     return this.totalProcessed;
//   }

//   private async processQueue(): Promise<void> {
//     this.isProcessing = true;

//     try {
//       while (this.queue.length > 0) {
//         const queueLength = this.queue.length;
//         const batchSize =
//           queueLength < env.MAX_PROCESSING_BATCH
//             ? queueLength
//             : env.MAX_PROCESSING_BATCH;
//         const batch = this.queue.splice(0, batchSize);

//         if (!this.fileConfig || !this.idArgs) {
//           throw new Error('Missing fileConfig or idArgs for processing');
//         }

//         try {
//           await processProductLines(batch, this.fileConfig, this.idArgs);
//           this.totalProcessed += batchSize;
//         } catch (batchError) {
//           const errorRecord = error.exceptionErrorRecord(batchError);
//           logger.error(
//             `Batch processing failed: ${errorRecord.message}, batch size: ${batchSize}`
//           );
//         }

//         // Periodic GC for large datasets
//         if (this.totalProcessed % 50000 === 0 && global.gc) {
//           global.gc();
//         }
//       }
//     } catch (err) {
//       const errorRecord = error.exceptionErrorRecord(err);
//       logger.error(`Critical queue processing error: ${errorRecord.message}`);
//       throw err;
//     } finally {
//       this.isProcessing = false;
//       this.processingPromise = null;
//     }
//   }

//   isComplete(): boolean {
//     return !this.isProcessing && this.queue.length === 0;
//   }

//   async waitForCompletion(timeoutMs: number = 300000): Promise<void> {
//     return new Promise((resolve, reject) => {
//       if (this.isComplete()) {
//         resolve();
//         return;
//       }

//       const timeout = setTimeout(() => {
//         clearInterval(interval);
//         logger.error(
//           `Queue timeout after ${timeoutMs}ms. Processed: ${this.totalProcessed}, Remaining: ${this.queue.length}`
//         );
//         reject(new Error(`Queue processing timeout after ${timeoutMs}ms`));
//       }, timeoutMs);

//       const interval = setInterval(() => {
//         if (this.isComplete()) {
//           clearTimeout(timeout);
//           clearInterval(interval);
//           resolve();
//         }
//       }, 2000); // Check every 2 seconds instead of 1

//       if (this.processingPromise) {
//         this.processingPromise.catch((err) => {
//           clearTimeout(timeout);
//           clearInterval(interval);
//           reject(err);
//         });
//       }
//     });
//   }

//   async stop(): Promise<void> {
//     if (this.processingPromise) {
//       await this.processingPromise;
//     }
//   }

//   reset(): void {
//     this.queue = [];
//     this.totalProcessed = 0;
//     this.fileConfig = null;
//     this.idArgs = null;
//   }
// }

// export const productQueue = new ProductLinesQueue();

// export default function processProductLinesWorker(
//   productDataLines: string[],
//   fileConfig: FileConfig,
//   idArgs: { vendorId: string; ownerId?: string }
// ): boolean {
//   return productQueue.addLines(productDataLines, fileConfig, idArgs);
// }

// async function processProductLines(
//   productDataLines: string[],
//   fileConfig: FileConfig,
//   idArgs: { vendorId: string; ownerId?: string }
// ) {
//   // OPTIMIZATION: Cache category count check - avoid Object.keys() call every time
//   let categoryCountInitialized = Object.keys(categoryCount).length > 0;

//   if (!categoryCountInitialized) {
//     const { data: categoryCountResponse } =
//       await getAllProductCategoryStatisticService();

//     if (categoryCountResponse) {
//       const stats = categoryCountResponse.stats;
//       const statsLength = stats.length;

//       // OPTIMIZATION: Direct assignment instead of reduce for better performance
//       for (let i = 0; i < statsLength; i++) {
//         const count = stats[i];
//         categoryCount[count.category] = {
//           countUSD: count.countUSD,
//           countCAD: count.countCAD,
//         } as ProductCategoryCountCurrency;
//       }
//     }
//   }

//   const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
//     await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
//       productDataLines,
//       fileConfig
//     );

//   const initialProductsLength =
//     initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length;
//   if (initialProductsLength < 1) return;

//   const productInfoResponses = await Promise.all(
//     initialBaseProductsWithMainImageUrlAndIsoCodeInfo.map(
//       (initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
//         productInfoGeneratorAi({
//           name: initialBaseProductWithMainImageUrlAndIsoCodeInfo.name,
//           description:
//             initialBaseProductWithMainImageUrlAndIsoCodeInfo.description,
//           mainImageUrl:
//             initialBaseProductWithMainImageUrlAndIsoCodeInfo.mainImageUrl,
//         })
//     )
//   );

//   // OPTIMIZATION: Pre-allocate array with estimated capacity to reduce resizing
//   const baseProducts: BaseProduct[] = [];

//   // Single-pass validation with Set lookup - O(n)
//   for (let index = 0; index < initialProductsLength; index++) {
//     const initialProduct =
//       initialBaseProductsWithMainImageUrlAndIsoCodeInfo[index];
//     const response = productInfoResponses[index];

//     // OPTIMIZATION: Destructure only needed properties from response.data
//     const responseData = response.data;
//     const name = responseData?.name;
//     const description = responseData?.description;
//     const category = responseData?.category;

//     // Early validation - skip invalid products immediately
//     if (!initialProduct.sku || !name || !description || !category) {
//       continue;
//     }

//     // O(1) Set lookup
//     if (!productCategoriesSet.has(category)) {
//       continue;
//     }

//     // Check category count limit
//     const currencyKey =
//       `count${initialProduct.currencyCode}` as keyof ProductCategoryCountCurrency;
//     const currentCount = categoryCount[category]?.[currencyKey] ?? 0;
//     if (currentCount > env.MAX_CATEGORIES) {
//       continue;
//     }

//     // OPTIMIZATION: Avoid object spread, build object directly
//     const product = {
//       ...initialProduct,
//       name,
//       description,
//       category,
//     } as BaseProduct;

//     baseProducts.push(product);
//   }

//   const baseProductsLength = baseProducts.length;
//   if (baseProductsLength < 1) return;

//   // OPTIMIZATION: Pre-allocate arrays with exact size
//   const styleInfoInput = new Array(baseProductsLength);
//   const imageEmbeddingInput = new Array(baseProductsLength);

//   for (let i = 0; i < baseProductsLength; i++) {
//     const baseProduct = baseProducts[i];
//     styleInfoInput[i] = {
//       line: baseProduct.line,
//       mainImageUrl: baseProduct.mainImageUrl,
//     };
//     imageEmbeddingInput[i] = baseProduct.mainImageUrl;
//   }

//   const [productsStyleInfo, productsImageEmbedding] = await Promise.all([
//     getProductsStyleInfo(fileConfig.headerLine, styleInfoInput),
//     getProductsImageEmbedding(imageEmbeddingInput),
//   ]);

//   // OPTIMIZATION: Pre-allocate with estimated capacity
//   const products: (ProductInfo & { currencyCode: ProductCurrencyCode })[] = [];
//   const categoryUpdates: Record<string, Record<string, number>> = {};

//   // Cache idArgs to avoid repeated property access
//   const vendorId = idArgs.vendorId as any;
//   const ownerId = idArgs.ownerId as any;

//   for (let i = 0; i < baseProductsLength; i++) {
//     const baseProduct = baseProducts[i];
//     const styleInfo = productsStyleInfo[i];
//     const imageEmbedding = productsImageEmbedding[i].imageEmbedding;

//     // Early validation - skip if missing required values
//     if (
//       !imageEmbedding ||
//       !baseProduct.currencyCode ||
//       !baseProduct.dimension
//     ) {
//       continue;
//     }

//     // OPTIMIZATION: Reduce object spread operations
//     const productWithEmbedding = {
//       ...baseProduct,
//       ...styleInfo,
//       imageEmbedding,
//     };

//     const { price, ...otherProductComputedData } =
//       getProductComputedData(productWithEmbedding);

//     // OPTIMIZATION: Build product object more efficiently
//     const product = {
//       ...productWithEmbedding,
//       vendorId,
//       ownerId,
//       fhSku: uid.generate(),
//       ...otherProductComputedData,
//       prices: [price],
//       line: undefined,
//       currencyCode: baseProduct.currencyCode,
//     } as ProductInfo & { currencyCode: ProductCurrencyCode };

//     products.push(product);

//     // OPTIMIZATION: Batch category count updates inline
//     const category = product.category;
//     const currencyKey =
//       `count${product.currencyCode}` as keyof ProductCategoryCountCurrency;

//     // OPTIMIZATION: Use null coalescing for faster object initialization
//     const categoryUpdate =
//       categoryUpdates[category] ?? (categoryUpdates[category] = {});
//     categoryUpdate[currencyKey] = (categoryUpdate[currencyKey] || 0) + 1;
//   }

//   const productsLength = products.length;
//   if (productsLength < 1) return;

//   // OPTIMIZATION: Apply batched category count updates with reduced iterations
//   const categoryUpdateEntries = Object.entries(categoryUpdates);
//   const categoryUpdateEntriesLength = categoryUpdateEntries.length;

//   for (let i = 0; i < categoryUpdateEntriesLength; i++) {
//     const [category, updates] = categoryUpdateEntries[i];
//     const categoryKey = category as keyof ProductCategoryCount;

//     // OPTIMIZATION: Initialize if needed
//     const categoryData =
//       categoryCount[categoryKey] ??
//       (categoryCount[categoryKey] = {} as ProductCategoryCountCurrency);

//     const updateEntries = Object.entries(updates);
//     const updateEntriesLength = updateEntries.length;

//     for (let j = 0; j < updateEntriesLength; j++) {
//       const [currencyKey, increment] = updateEntries[j];
//       const typedCurrencyKey =
//         currencyKey as keyof ProductCategoryCountCurrency;
//       categoryData[typedCurrencyKey] =
//         (categoryData[typedCurrencyKey] || 0) + increment;
//     }
//   }

//   // OPTIMIZATION: Pre-allocate array with exact size
//   const createProductsData = new Array(productsLength);

//   for (let i = 0; i < productsLength; i++) {
//     const product = products[i];
//     const { imageEmbedding, currencyCode, ...productData } = product;

//     createProductsData[i] = {
//       productData,
//       imageEmbedding,
//     };
//   }

//   const { errorRecord } = await createProductsService(createProductsData);

//   if (errorRecord) {
//     // OPTIMIZATION: Pre-allocate SKU array with exact size
//     const productSkus = new Array(productsLength);
//     for (let i = 0; i < productsLength; i++) {
//       productSkus[i] = products[i].sku;
//     }

//     logProductErrorService({
//       ...errorRecord,
//       details: [
//         ...(errorRecord.details ?? []),
//         {
//           function: 'createProductsService',
//           createProductData: productSkus,
//         },
//       ],
//     });
//   }
// }

import { env } from "@worker/config/environment.js";
import { error } from "@worker/utils/error.js";
import logger from "@worker/utils/logger.js";
import uid from "@worker/utils/uid.js";
import productInfoGeneratorAi from "@worker/v1/ai/ai.product-info-generator.js";
import type { FileConfig } from "@worker/v1/processor/processor.type.js";
import {
	getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo,
	getProductComputedData,
	getProductsImageEmbedding,
	getProductsStyleInfo,
} from "@worker/v1/processor/processor.util.js";
import { productCategories } from "@worker/v1/product/product.constant.js";
import {
	createProductsService,
	getAllProductCategoryStatisticService,
	logProductErrorService,
} from "@worker/v1/product/product.service.js";
import type {
	BaseProduct,
	ProductCategoryCount,
	ProductCategoryCountCurrency,
	ProductCurrencyCode,
	ProductInfo,
} from "@worker/v1/product/product.type.js";

const categoryCount = {} as ProductCategoryCount;
// OPTIMIZATION: Cache productCategories Set to avoid recreating it
const productCategoriesSet = new Set(productCategories);

class ProductLinesQueue {
	private queue: string[] = [];
	private isProcessing = false;
	private fileConfig: FileConfig | null = null;
	private idArgs: { vendorId: string; ownerId?: string } | null = null;
	private totalProcessed = 0;
	private processingPromise: Promise<void> | null = null;

	addLines(
		lines: string[],
		fileConfig: FileConfig,
		idArgs: { vendorId: string; ownerId?: string }
	): boolean {
		// OPTIMIZATION: Early exit check before calculation
		const queueLength = this.queue.length;
		const totalSize = queueLength + lines.length;

		if (totalSize > env.MAX_PROCESSING_QUEUE_SIZE) {
			return false;
		}

		this.queue.push(...lines);
		this.fileConfig = fileConfig;
		this.idArgs = idArgs;

		if (!this.isProcessing) {
			this.processingPromise = this.processQueue().catch((err) => {
				logger.error(`Queue processing error: ${err}`);
				this.isProcessing = false;
				throw err;
			});
		}

		return true;
	}

	hasSpace(): boolean {
		return this.queue.length < env.MAX_PROCESSING_QUEUE_SIZE;
	}

	getQueueSize(): number {
		return this.queue.length;
	}

	getTotalProcessed(): number {
		return this.totalProcessed;
	}

	private async processQueue(): Promise<void> {
		this.isProcessing = true;

		try {
			while (this.queue.length > 0) {
				const queueLength = this.queue.length;
				const batchSize =
					queueLength < env.MAX_PROCESSING_BATCH ? queueLength : env.MAX_PROCESSING_BATCH;
				const batch = this.queue.splice(0, batchSize);

				if (!this.fileConfig || !this.idArgs) {
					throw new Error("Missing fileConfig or idArgs for processing");
				}

				try {
					await processProductLines(batch, this.fileConfig, this.idArgs);
					this.totalProcessed += batchSize;
				} catch (batchError) {
					const errorRecord = error.exceptionErrorRecord(batchError);
					logger.error(`Batch processing failed: ${errorRecord.message}, batch size: ${batchSize}`);
				}

				// Periodic GC for large datasets
				if (this.totalProcessed % 50000 === 0 && global.gc) {
					global.gc();
				}
			}
		} catch (err) {
			const errorRecord = error.exceptionErrorRecord(err);
			logger.error(`Critical queue processing error: ${errorRecord.message}`);
			throw err;
		} finally {
			this.isProcessing = false;
			this.processingPromise = null;
		}
	}

	isComplete(): boolean {
		return !this.isProcessing && this.queue.length === 0;
	}

	async waitForCompletion(timeoutMs: number = 300000): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isComplete()) {
				resolve();
				return;
			}

			const timeout = setTimeout(() => {
				clearInterval(interval);
				logger.error(
					`Queue timeout after ${timeoutMs}ms. Processed: ${this.totalProcessed}, Remaining: ${this.queue.length}`
				);
				reject(new Error(`Queue processing timeout after ${timeoutMs}ms`));
			}, timeoutMs);

			const interval = setInterval(() => {
				if (this.isComplete()) {
					clearTimeout(timeout);
					clearInterval(interval);
					resolve();
				}
			}, 2000); // Check every 2 seconds instead of 1

			if (this.processingPromise) {
				this.processingPromise.catch((err) => {
					clearTimeout(timeout);
					clearInterval(interval);
					reject(err);
				});
			}
		});
	}

	async stop(): Promise<void> {
		if (this.processingPromise) {
			await this.processingPromise;
		}
	}

	reset(): void {
		this.queue = [];
		this.totalProcessed = 0;
		this.fileConfig = null;
		this.idArgs = null;
	}
}

export const productQueue = new ProductLinesQueue();

export default function processProductLinesWorker(
	productDataLines: string[],
	fileConfig: FileConfig,
	idArgs: { vendorId: string; ownerId?: string }
): boolean {
	return productQueue.addLines(productDataLines, fileConfig, idArgs);
}

async function processProductLines(
	productDataLines: string[],
	fileConfig: FileConfig,
	idArgs: { vendorId: string; ownerId?: string }
) {
	// OPTIMIZATION: Cache category count check - avoid Object.keys() call every time
	const categoryCountInitialized = Object.keys(categoryCount).length > 0;

	if (!categoryCountInitialized) {
		const { data: categoryCountResponse } = await getAllProductCategoryStatisticService();

		if (categoryCountResponse) {
			const stats = categoryCountResponse.stats;
			const statsLength = stats.length;

			// OPTIMIZATION: Direct assignment instead of reduce for better performance
			for (let i = 0; i < statsLength; i++) {
				const count = stats[i];
				categoryCount[count.category] = {
					countUSD: count.countUSD,
					countCAD: count.countCAD,
				} as ProductCategoryCountCurrency;
			}
		}
	}

	const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
		await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(productDataLines, fileConfig);

	const initialProductsLength = initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length;
	if (initialProductsLength < 1) return;

	const productInfoResponses = await Promise.all(
		initialBaseProductsWithMainImageUrlAndIsoCodeInfo.map(
			(initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
				productInfoGeneratorAi({
					name: initialBaseProductWithMainImageUrlAndIsoCodeInfo.name,
					description: initialBaseProductWithMainImageUrlAndIsoCodeInfo.description,
					mainImageUrl: initialBaseProductWithMainImageUrlAndIsoCodeInfo.mainImageUrl,
				})
		)
	);

	// OPTIMIZATION: Pre-allocate array with estimated capacity to reduce resizing
	const baseProducts: BaseProduct[] = [];

	// Single-pass validation with Set lookup - O(n)
	for (let index = 0; index < initialProductsLength; index++) {
		const initialProduct = initialBaseProductsWithMainImageUrlAndIsoCodeInfo[index];
		const response = productInfoResponses[index];

		// OPTIMIZATION: Destructure only needed properties from response.data
		const responseData = response.data;
		const name = responseData?.name;
		const description = responseData?.description;
		const category = responseData?.category;

		// Early validation - skip invalid products immediately
		if (!initialProduct.sku || !name || !description || !category) {
			continue;
		}

		// O(1) Set lookup
		if (!productCategoriesSet.has(category)) {
			continue;
		}

		// Check category count limit
		const currencyKey = `count${initialProduct.currencyCode}` as keyof ProductCategoryCountCurrency;
		const currentCount = categoryCount[category]?.[currencyKey] ?? 0;
		if (currentCount > env.MAX_CATEGORIES) {
			continue;
		}

		// OPTIMIZATION: Avoid object spread, build object directly
		const product = {
			...initialProduct,
			name,
			description,
			category,
		} as BaseProduct;

		baseProducts.push(product);
	}

	const baseProductsLength = baseProducts.length;
	if (baseProductsLength < 1) return;

	// OPTIMIZATION: Pre-allocate arrays with exact size
	const styleInfoInput = new Array(baseProductsLength);
	const imageEmbeddingInput = new Array(baseProductsLength);

	for (let i = 0; i < baseProductsLength; i++) {
		const baseProduct = baseProducts[i];
		styleInfoInput[i] = {
			line: baseProduct.line,
			mainImageUrl: baseProduct.mainImageUrl,
		};
		imageEmbeddingInput[i] = baseProduct.mainImageUrl;
	}

	const [productsStyleInfo, productsImageEmbedding] = await Promise.all([
		getProductsStyleInfo(fileConfig.headerLine, styleInfoInput),
		getProductsImageEmbedding(imageEmbeddingInput),
	]);

	// OPTIMIZATION: Pre-allocate with estimated capacity
	const products: (ProductInfo & { currencyCode: ProductCurrencyCode })[] = [];
	const categoryUpdates: Record<string, Record<string, number>> = {};

	// Cache idArgs to avoid repeated property access
	const vendorId = idArgs.vendorId as any;
	const ownerId = idArgs.ownerId as any;

	for (let i = 0; i < baseProductsLength; i++) {
		const baseProduct = baseProducts[i];
		const styleInfo = productsStyleInfo[i];
		const imageEmbedding = productsImageEmbedding[i].imageEmbedding;

		// Early validation - skip if missing required values
		if (!imageEmbedding || !baseProduct.currencyCode || !baseProduct.dimension) {
			continue;
		}

		// OPTIMIZATION: Reduce object spread operations
		const productWithEmbedding = {
			...baseProduct,
			...styleInfo,
			imageEmbedding,
		};

		const { price, ...otherProductComputedData } = getProductComputedData(productWithEmbedding);

		// OPTIMIZATION: Build product object more efficiently
		const product = {
			...productWithEmbedding,
			vendorId,
			ownerId,
			fhSku: uid.generate(),
			...otherProductComputedData,
			prices: [price],
			line: undefined,
			currencyCode: baseProduct.currencyCode,
		} as ProductInfo & { currencyCode: ProductCurrencyCode };

		products.push(product);

		// OPTIMIZATION: Batch category count updates inline
		const category = product.category;
		const currencyKey = `count${product.currencyCode}` as keyof ProductCategoryCountCurrency;

		// OPTIMIZATION: Initialize category update if needed
		if (!categoryUpdates[category]) {
			categoryUpdates[category] = {};
		}
		const categoryUpdate = categoryUpdates[category];
		categoryUpdate[currencyKey] = (categoryUpdate[currencyKey] || 0) + 1;
	}

	const productsLength = products.length;
	if (productsLength < 1) return;

	// OPTIMIZATION: Apply batched category count updates with reduced iterations
	const categoryUpdateEntries = Object.entries(categoryUpdates);
	const categoryUpdateEntriesLength = categoryUpdateEntries.length;

	for (let i = 0; i < categoryUpdateEntriesLength; i++) {
		const [category, updates] = categoryUpdateEntries[i];
		const categoryKey = category as keyof ProductCategoryCount;

		// OPTIMIZATION: Initialize if needed
		if (!categoryCount[categoryKey]) {
			categoryCount[categoryKey] = {} as ProductCategoryCountCurrency;
		}
		const categoryData = categoryCount[categoryKey];

		const updateEntries = Object.entries(updates);
		const updateEntriesLength = updateEntries.length;

		for (let j = 0; j < updateEntriesLength; j++) {
			const [currencyKey, increment] = updateEntries[j];
			const typedCurrencyKey = currencyKey as keyof ProductCategoryCountCurrency;
			categoryData[typedCurrencyKey] = (categoryData[typedCurrencyKey] || 0) + increment;
		}
	}

	// OPTIMIZATION: Pre-allocate array with exact size
	const createProductsData = new Array(productsLength);

	for (let i = 0; i < productsLength; i++) {
		const product = products[i];
		// biome-ignore lint/correctness/noUnusedVariables: currencyCode needed for type narrowing in destructuring
		const { imageEmbedding, currencyCode, ...productData } = product;

		createProductsData[i] = {
			productData,
			imageEmbedding,
		};
	}

	const { errorRecord } = await createProductsService(createProductsData);

	if (errorRecord) {
		// OPTIMIZATION: Pre-allocate SKU array with exact size
		const productSkus = new Array(productsLength);
		for (let i = 0; i < productsLength; i++) {
			productSkus[i] = products[i].sku;
		}

		logProductErrorService({
			...errorRecord,
			details: [
				...(errorRecord.details ?? []),
				{
					function: "createProductsService",
					createProductData: productSkus,
				},
			],
		});
	}
}
