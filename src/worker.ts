// import { UUID } from '@datastax/astra-db-ts';
import { api } from '@worker/config/convex/convex.type.js';
import { convexHttpClient } from '@worker/config/convex/index.js';
import { env } from '@worker/config/environment.js';
import { replicate } from '@worker/config/replicate.js';
import logger from '@worker/utils/logger.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import productMainImageDetectorAi from '@worker/v1/ai/ai.product-main-image-detector.js';
import { processVendorProductDataService } from '@worker/v1/processor/processor.service.js';
// import { dbProductCollection } from '@worker/v1/product/product.db.js';
// import { ConvexProduct, Product } from '@worker/v1/product/product.type.js';
import { error } from 'console';
import { appendFile, writeFile } from 'fs/promises';
import { Id } from 'node_modules/convex/dist/esm-types/values/value.js';
import sharp from 'sharp';

// processVendorProductDataService('wayfair');

// const { data, errorRecord } = await productMainImageDetectorAi([
//   'https://assets.wfcdn.com/im/10546173/resize-h1080-w1080%5Ecompr-r85/1855/185502021/.jpg',
//   'https://assets.wfcdn.com/im/59586431/resize-h1080-w1080%5Ecompr-r85/1579/157959783/.jpg',
// ]);

// console.log('errorRecord', errorRecord);
// console.log('data', data);

// async function removeBackground(imageUrl: string) {
//   // 'recraft-ai/recraft-remove-background';

//   const output = await replicate.run('851-labs/background-remover', {
//     input: {
//       image: imageUrl,
//     },
//   });

//   console.log('output', output);

//   // Convert ReadableStream to Buffer
//   const stream = output as ReadableStream;
//   const reader = stream.getReader();
//   const chunks: Uint8Array[] = [];

//   while (true) {
//     const { done, value } = await reader.read();
//     if (done) break;
//     chunks.push(value);
//   }

//   const buffer = Buffer.concat(chunks);

//   await writeFile('output.png', buffer);

//   // Auto-crop transparent edges
//   const cropped = await sharp(buffer)
//     .trim() // Removes transparent padding
//     .toBuffer();

//   return cropped; // Returns cropped PNG as Buffer
// }

// const result = await removeBackground(
//   'https://assets.wfcdn.com/im/10546173/resize-h1080-w1080%5Ecompr-r85/1855/185502021/.jpg'
// );

// await writeFile('cropped.png', result);

// PRODUCT_ONBOARDING_API_KEY;

// async function createVendorInConvexDb() {
//   await convexHttpClient.mutation(api.v1.product.vendor.mutation.createVendor, {
//     poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
//     data: {
//       name: 'Wayfair',
//       r2FolderId: 'wayfair',
//       vId: '0198480a-b728-7365-9c9a-617f46037536',
//     },
//   });
// }

// createVendorInConvexDb();

// const fetchProducts = async (limit = 10, lastCreatedAt?: Date) => {
//   const query: { createdAt?: { $gt: Date } } = {};
//   if (lastCreatedAt) query.createdAt = { $gt: lastCreatedAt };

//   const cursor = dbProductCollection.find(
//     {},
//     {
//       limit,
//     }
//   );
//   console.log('cursor', cursor);

//   const products: Product[] = [];
//   for await (const result of cursor) {
//     products.push(result as Product);
//   }

//   console.log('products.length', products.length);

//   return products;
// };

// const insertBatch = async (products: ConvexProduct[]) => {
//   return await Promise.all(
//     products.map((product) =>
//       asyncTryCatch(() =>
//         convexHttpClient.mutation(api.v1.product.mutation.createProduct, {
//           poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
//           data: product,
//         })
//       )
//     )
//   );
// };

// const migrate = async () => {
//   let totalMigrated = 0;
//   const limit = 10;
//   let lastCreatedAt: Date | undefined = undefined;

//   while (true) {
//     const products = await fetchProducts(limit, lastCreatedAt);
//     console.log('fetchProducts.length', products.length);
//     // console.log('fetchProducts', products);
//     if (products.length === 0) break;

// const convexProducts: ConvexProduct[] = products.map((product) => ({
//   vendorId: 'm9766yye02p7d4v26rvtjbs01s7r7y3a' as Id<'productVendors'>,
//   pId: product._id.toString(),
//   sku: product.sku,
//   fhSku: product.fhSku,
//   itemId: product.itemId ?? undefined,
//   gtin: product.gtin ?? undefined,
//   mpn: product.mpn ?? undefined,
//   brand: product.brand ?? undefined,
//   name: product.name,
//   description: product.description,
//   pdpLink: product.pdpLink ?? undefined,
//   tradePrice: product.tradePrice,
//   map: product.map ?? undefined,
//   msrp: product.msrp ?? undefined,
//   shippingPrice: product.shippingPrice ?? undefined,
//   unitPerBox: product.unitPerBox ?? 1,
//   stockQty: product.stockQty,
//   restockDate: product.restockDate
//     ? new Date(product.restockDate).getTime()
//     : undefined,
//   imageUrls: product.imageUrls,
//   mainImageUrl: product.mainImageUrl ?? undefined,
//   ludwigImageUrl: product.ludwigImageUrl,
//   warehouseCountryCodes: product.warehouseCountryCodes,
//   shippingCountryCodes: product.shippingCountryCodes,
//   currencyCode: product.currencyCode,
//   dimension: product.dimension ?? '',
//   width: product.width,
//   height: product.height,
//   depth: product.depth,
//   shippingDimension: product.shippingDimension ?? '',
//   shippingWidth: product.shippingWidth,
//   shippingHeight: product.shippingHeight,
//   shippingDepth: product.shippingDepth,
//   dimensionUnit: product.dimensionUnit,
//   weight: product.weight,
//   shippingWeight: product.shippingWeight,
//   weightUnit: product.weightUnit,
//   colorNames: product.colorNames ?? [],
//   hexColors: product.hexColors ?? [],
//   materials: product.materials ?? [],
//   styles: product.styles,
//   category: product.category,
// }));

// const results = await insertBatch(convexProducts);
// const successful = results.filter((r, i) => {
//   if (r.errorRecord)
//     writeErrorToFile(
//       JSON.stringify(
//         {
//           errorRecord: r.errorRecord,
//           product: convexProducts[i],
//         },
//         null,
//         2
//       )
//     );

//   return !r.errorRecord;
// }).length;
// // const successful = results.filter((r) => r.status === 'fulfilled').length;

//     totalMigrated += successful;
//     lastCreatedAt = products[products.length - 1].createdAt;

//     logger.info(
//       `Migrated: ${successful}/${products.length}, Total: ${totalMigrated}`
//     );

//     await new Promise((r) => setTimeout(r, 500));
//   }

//   logger.info(`Migration complete: ${totalMigrated} products`);
// };

// async function writeErrorToFile(errorData: any) {
//   try {
//     const jsonLine = JSON.stringify(errorData) + '\n';
//     await appendFile('product-migration-error.txt', jsonLine, 'utf8');
//   } catch (writeError) {
//     console.error('Failed to write to error.txt:', writeError);
//   }
// }

// migrate().catch(console.error);

// async function migrateToConvex() {
//   const cursor = dbProductCollection.find({});

//   let totalMigrated = 0;
//   let batch: Product[] = [];

//   for await (const doc of cursor) {
//     const { data: existingConvexProduct } = await asyncTryCatch(() =>
//       convexHttpClient.query(api.v1.product.query.getPoProductByPId, {
//         poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
//         pId: doc._id.toString(),
//       })
//     );

//     if (!existingConvexProduct) batch.push(doc as Product);

//     if (batch.length === 10) {
//       const successful = await saveToConvex(batch);
//       totalMigrated += successful;

//       logger.info(
//         `Migrated: ${successful}/${batch.length}, Total: ${totalMigrated}`
//       );

//       batch = [];
//     }
//   }

//   logger.info(`Migration complete: ${totalMigrated} total documents`);
// }

// async function saveToConvex(products: Product[]) {
//   const convexProducts: ConvexProduct[] = products.map((product) => ({
//     vendorId: 'm9766yye02p7d4v26rvtjbs01s7r7y3a' as Id<'productVendors'>,
//     pId: product._id.toString(),
//     sku: product.sku,
//     fhSku: product.fhSku,
//     itemId: product.itemId ?? undefined,
//     gtin: product.gtin ?? undefined,
//     mpn: product.mpn ?? undefined,
//     brand: product.brand ?? undefined,
//     name: product.name,
//     description: product.description,
//     pdpLink: product.pdpLink ?? undefined,
//     tradePrice: product.tradePrice,
//     map: product.map ?? undefined,
//     msrp: product.msrp ?? undefined,
//     shippingPrice: product.shippingPrice ?? undefined,
//     unitPerBox: product.unitPerBox ?? 1,
//     stockQty: product.stockQty,
//     restockDate: product.restockDate
//       ? new Date(product.restockDate).getTime()
//       : undefined,
//     imageUrls: product.imageUrls,
//     mainImageUrl: product.mainImageUrl ?? undefined,
//     ludwigImageUrl: product.ludwigImageUrl,
//     warehouseCountryCodes: product.warehouseCountryCodes,
//     shippingCountryCodes: product.shippingCountryCodes,
//     currencyCode: product.currencyCode,
//     dimension: product.dimension ?? '',
//     width: product.width,
//     height: product.height,
//     depth: product.depth,
//     shippingDimension: product.shippingDimension ?? '',
//     shippingWidth: product.shippingWidth,
//     shippingHeight: product.shippingHeight,
//     shippingDepth: product.shippingDepth,
//     dimensionUnit: product.dimensionUnit,
//     weight: product.weight,
//     shippingWeight: product.shippingWeight,
//     weightUnit: product.weightUnit,
//     colorNames: product.colorNames ?? [],
//     hexColors: product.hexColors ?? [],
//     materials: product.materials ?? [],
//     styles: product.styles,
//     category: product.category,
//   }));

//   const results = await Promise.all(
//     convexProducts.map((convexProduct) =>
//       asyncTryCatch(() =>
//         convexHttpClient.mutation(api.v1.product.mutation.createProduct, {
//           poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
//           data: convexProduct,
//         })
//       )
//     )
//   );

//   const successful = results.filter((r, i) => {
//     if (r.errorRecord)
//       writeErrorToFile(
//         JSON.stringify(
//           {
//             errorRecord: r.errorRecord,
//             product: convexProducts[i],
//           },
//           null,
//           2
//         )
//       );

//     return !r.errorRecord;
//   }).length;

//   await new Promise((r) => setTimeout(r, 500));

//   return successful;
// }

// async function writeErrorToFile(errorData: any) {
//   try {
//     const jsonLine = JSON.stringify(errorData) + '\n';
//     await appendFile('product-migration-error.txt', jsonLine, 'utf8');
//   } catch (writeError) {
//     console.error(
//       'Failed to write to product-migration-error.txt:',
//       writeError
//     );
//   }
// }

// migrateToConvex().catch(console.error);
