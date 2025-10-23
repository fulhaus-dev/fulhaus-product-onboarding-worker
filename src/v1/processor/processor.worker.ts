import { env } from '@worker/config/environment.js';
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

export default function processProductLinesWorker(
  productDataLines: string[],
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  fileConfig = fileConfig;
  idArgs = idArgs;

  queue.push(...productDataLines);

  if (queue.length > env.MAX_PROCESSING_QUEUE_SIZE) {
    queue.splice(env.MAX_PROCESSING_QUEUE_SIZE);
  }
}

function batchedQueue() {
  const batches = [];
  for (let i = 0; i < queue.length; i += env.MAX_PROCESSING_BATCH) {
    batches.push(queue.slice(i, i + env.MAX_PROCESSING_BATCH));
  }

  queue = [];
  return batches;
}

export async function doneLoadingProducts(
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  const batches = batchedQueue();

  for (const batch of batches) {
    await processProductLines(batch, fileConfig, idArgs);
  }
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
