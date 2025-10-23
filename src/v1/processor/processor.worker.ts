import { env } from '@worker/config/environment.js';
import logger from '@worker/utils/logger.js';
import uid from '@worker/utils/uid.js';
import productInfoGeneratorAi from '@worker/v1/ai/ai.product-info-generator.js';
import type { FileConfig } from '@worker/v1/processor/processor.type.js';
import {
  getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo,
  getProductComputedData,
  getProductsImageEmbedding,
  getProductsStyleInfo,
} from '@worker/v1/processor/processor.util.js';
import { productCategories } from '@worker/v1/product/product.constant.js';
import {
  createProductsService,
  getAllProductCategoryStatisticService,
  logProductErrorService,
} from '@worker/v1/product/product.service.js';
import type {
  BaseProduct,
  ProductCategoryCount,
  ProductCategoryCountCurrency,
  ProductCurrencyCode,
  ProductInfo,
} from '@worker/v1/product/product.type.js';

let categoryCount = {} as ProductCategoryCount;

let queue: string[] = [];
let receivedProductsCount = 0;
let startQueueingProductLines = false;

export default function processProductLinesWorker(productDataLines: string[]) {
  // Before queueing starts - count products
  if (!startQueueingProductLines) {
    receivedProductsCount += productDataLines.length;

    // Threshold not reached yet
    if (receivedProductsCount <= env.PROCESSING_START_COUNT) return;

    // Threshold just crossed - queue items after threshold
    const productLinesToKeep =
      receivedProductsCount - env.PROCESSING_START_COUNT;

    for (let i = productLinesToKeep; i < productDataLines.length; i++) {
      queue.push(productDataLines[i]);
    }

    startQueueingProductLines = true;
  } else {
    // After queueing started - push all items
    for (let i = 0; i < productDataLines.length; i++) {
      queue.push(productDataLines[i]);
    }
  }

  // Truncate to max size
  if (queue.length > env.MAX_PROCESSING_QUEUE_SIZE)
    queue.length = env.MAX_PROCESSING_QUEUE_SIZE;
}

export function getQueueSize() {
  return queue.length;
}

function batchedQueue() {
  if (queue.length === 0) return [];

  const batchCount = Math.ceil(queue.length / env.MAX_PROCESSING_BATCH);
  const batches: string[][] = new Array(batchCount);

  for (let i = 0; i < batchCount; i++) {
    const start = i * env.MAX_PROCESSING_BATCH;
    const end = Math.min(start + env.MAX_PROCESSING_BATCH, queue.length);
    batches[i] = queue.slice(start, end);
  }

  queue = [];
  return batches;
}

export async function startProcessingProducts(
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  const batches = batchedQueue();

  // Calculate total once instead of flattening array
  const totalProducts = batches.reduce((sum, batch) => sum + batch.length, 0);

  for (const batch of batches) {
    await processProductLines(batch, fileConfig, idArgs);
  }

  logger.info(
    `✅ Finished processing ${totalProducts} products for vendor ID - ${idArgs.vendorId}.}`
  );
}

async function processProductLines(
  productDataLines: string[],
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  if (Object.keys(categoryCount).length === 0) {
    const { data: categoryCountResponse } =
      await getAllProductCategoryStatisticService();

    if (categoryCountResponse) {
      categoryCount = categoryCountResponse.stats.reduce((acc, count) => {
        acc[count.category] = {
          countUSD: count.countUSD,
          countCAD: count.countCAD,
        } as ProductCategoryCountCurrency;

        return acc;
      }, {} as ProductCategoryCount);
    }
  }

  const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
    await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
      productDataLines,
      fileConfig
    );

  if (initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length < 1) return;

  const productInfoResponses = await Promise.all(
    initialBaseProductsWithMainImageUrlAndIsoCodeInfo.map(
      (initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
        productInfoGeneratorAi({
          name: initialBaseProductWithMainImageUrlAndIsoCodeInfo.name,
          description:
            initialBaseProductWithMainImageUrlAndIsoCodeInfo.description,
          mainImageUrl:
            initialBaseProductWithMainImageUrlAndIsoCodeInfo.mainImageUrl,
        })
    )
  );

  const baseProducts = initialBaseProductsWithMainImageUrlAndIsoCodeInfo
    .map((initialBaseProductWithMainImageUrlAndIsoCodeInfo, index) => ({
      ...initialBaseProductWithMainImageUrlAndIsoCodeInfo,
      name: productInfoResponses[index].data?.name,
      description: productInfoResponses[index].data?.description,
      category: productInfoResponses[index].data?.category,
    }))
    .filter(
      (baseProduct) =>
        !!baseProduct.sku &&
        !!baseProduct.name &&
        !!baseProduct.description &&
        !!baseProduct.category &&
        productCategories.includes(baseProduct.category) &&
        (categoryCount[baseProduct.category]?.[
          `count${baseProduct.currencyCode}`
        ] ?? 0) <= env.MAX_CATEGORIES
    ) as BaseProduct[];
  if (baseProducts.length < 1) return undefined;

  const [productsStyleInfo, productsImageEmbedding] = await Promise.all([
    getProductsStyleInfo(
      fileConfig.headerLine,
      baseProducts.map((baseProduct) => ({
        line: baseProduct.line,
        mainImageUrl: baseProduct.mainImageUrl,
      }))
    ),
    getProductsImageEmbedding(
      baseProducts.map((baseProduct) => baseProduct.mainImageUrl)
    ),
  ]);

  const productsWithEmbedding = baseProducts.map((baseProduct, index) => ({
    ...baseProduct,
    ...productsStyleInfo[index],
    ...productsImageEmbedding[index],
  }));

  const productsWithUndefinedRequiredValues = productsWithEmbedding.map(
    (productWithEmbedding) => {
      if (!productWithEmbedding.imageEmbedding) return undefined;
      if (!productWithEmbedding.currencyCode) return undefined;
      if (!productWithEmbedding.dimension) return undefined;

      const { price, ...otherProductComputedData } =
        getProductComputedData(productWithEmbedding);

      return {
        ...productWithEmbedding,
        vendorId: idArgs.vendorId,
        ownerId: idArgs.ownerId,
        fhSku: uid.generate(),
        ...otherProductComputedData,
        prices: [price],
        line: undefined,
        currencyCode: productWithEmbedding.currencyCode,
      };
    }
  ) as ((ProductInfo & { currencyCode: ProductCurrencyCode }) | undefined)[];

  const products = productsWithUndefinedRequiredValues.filter(
    (product) => product !== undefined
  ) as (ProductInfo & { currencyCode: ProductCurrencyCode })[];
  if (products.length < 1) return undefined;

  for (const product of products) {
    const currentCategoryCount = categoryCount?.[product.category];

    if (!currentCategoryCount)
      categoryCount[product.category] = {
        [`count${product.currencyCode}`]: 1,
      } as ProductCategoryCountCurrency;
    else
      categoryCount[product.category][`count${product.currencyCode}`] =
        (currentCategoryCount?.[`count${product.currencyCode}`] ?? 0) + 1;
  }

  const { data: response, errorRecord } = await createProductsService(
    products.map((product) => {
      const { imageEmbedding, ...productData } = product;
      (productData as any).currencyCode = undefined;

      return {
        productData,
        imageEmbedding,
      };
    })
  );

  if (errorRecord) {
    logProductErrorService({
      ...errorRecord,
      details: [
        ...(errorRecord.details ?? []),
        {
          function: 'createProductsService',
          createProductData: products.map((product) => product.sku),
        },
      ],
    });
  }
}
