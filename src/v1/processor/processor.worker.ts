import { env } from '@worker/config/environment.js';
import { error } from '@worker/utils/error.js';
import logger from '@worker/utils/logger.js';
import uid from '@worker/utils/uid.js';
import productInfoGeneratorAi from '@worker/v1/ai/ai.product-info-generator.js';
import { FileConfig } from '@worker/v1/processor/processor.type.js';
import {
  getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo,
  getProductComputedData,
  getProductsDimensionInfo,
  getProductsImageEmbedding,
  getProductsStyleInfo,
  getProductsTextEmbedding,
  getProductsWeightInfo,
} from '@worker/v1/processor/processor.util.js';
import { productCategories } from '@worker/v1/product/product.constant.js';
import {
  createProductsService,
  getProductCategoryCountAggregateService,
  getProductsBySkusService,
  updateProductsByIdService,
} from '@worker/v1/product/product.service.js';
import {
  BaseProduct,
  CreateProduct,
  Product,
  ProductCategoryCount,
} from '@worker/v1/product/product.type.js';

let totalProcessed = 0;
let totalRemoved = 0;

let categoryCount = {} as ProductCategoryCount;

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
    if (this.queue.length > env.MAX_PROCESSING_QUEUE_SIZE) return false;

    this.queue.push(...lines);
    this.fileConfig = fileConfig;
    this.idArgs = idArgs;

    // Start processing if not already running
    if (!this.isProcessing) this.processQueue();

    return true;
  }

  hasSpace(): boolean {
    return this.queue.length < env.MAX_PROCESSING_QUEUE_SIZE;
  }

  private async processQueue() {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Take next batch from queue
      const batch = this.queue.splice(0, env.MAX_PROCESSING_BATCH);

      // Process this batch and wait for completion
      await processProductLines(batch, this.fileConfig!, this.idArgs!);

      // Force cleanup
      if (global.gc) global.gc();

      // // Add delay between batches to prevent 502 errors
      // await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5 second delay
    }

    this.isProcessing = false;
  }
}

// Create global queue instance
export const productQueue = new ProductLinesQueue();

export default function processProductLinesWorker(
  productDataLines: string[],
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  return productQueue.addLines(productDataLines, fileConfig, idArgs);
}

async function processProductLines(
  productDataLines: string[],
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  if (Object.keys(categoryCount).length > 0) {
    const { data: categoryCountResponse } =
      await getProductCategoryCountAggregateService();

    const productCategoryCount = categoryCountResponse?.data;
    if (productCategoryCount) categoryCount = productCategoryCount;
  }

  let initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
    await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
      productDataLines,
      fileConfig
    );
  totalRemoved +=
    productDataLines.length -
    initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length;
  logger.info(`📦 Total removed ${totalRemoved}.`);

  if (initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length < 1) return;

  const currentSkus = initialBaseProductsWithMainImageUrlAndIsoCodeInfo.map(
    (initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
      initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
  );

  const { data: existingProductSkusResponse } = await getProductsBySkusService(
    currentSkus
  );

  const existingProducts = initialBaseProductsWithMainImageUrlAndIsoCodeInfo
    .map((initialBaseProductWithMainImageUrlAndIsoCodeInfo) => {
      const existingProduct = existingProductSkusResponse?.data?.find(
        (existingProduct) =>
          existingProduct?.sku ===
          initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
      );
      if (!existingProduct) return;

      return existingProduct;
    })
    .filter((existingProduct) => existingProduct !== undefined);

  updateExistingProductPriceInfo(
    initialBaseProductsWithMainImageUrlAndIsoCodeInfo,
    existingProducts
  );

  initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
    initialBaseProductsWithMainImageUrlAndIsoCodeInfo.filter(
      (initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
        !existingProducts.some(
          (existingProduct) =>
            existingProduct.sku ===
            initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
        )
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

  let baseProducts = initialBaseProductsWithMainImageUrlAndIsoCodeInfo
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
        (categoryCount[baseProduct.category] ?? 0) <= env.MAX_CATEGORIES
    ) as BaseProduct[];
  if (baseProducts.length < 1) return;

  const baseProductsLine = baseProducts.map((baseProduct) => baseProduct.line);

  const [
    productsDimensionInfo,
    productsWeightInfo,
    productsStyleInfo,
    productsImageEmbedding,
  ] = await Promise.all([
    getProductsDimensionInfo(fileConfig.headerLine, baseProductsLine),
    getProductsWeightInfo(fileConfig.headerLine, baseProductsLine),
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

  const productsWithoutTextEmbedding = baseProducts.map(
    (productWithoutTextEmbedding, index) => ({
      ...productWithoutTextEmbedding,
      ...productsDimensionInfo[index],
      ...productsWeightInfo[index],
      ...productsStyleInfo[index],
      ...productsImageEmbedding[index],
    })
  );

  const productsTextEmbeddingParts = productsWithoutTextEmbedding.map(
    (productWithoutTextEmbedding) => {
      const textEmbeddingParts = [
        `SKU: ${productWithoutTextEmbedding.sku}`,
        `NAME: ${productWithoutTextEmbedding.name}`,
        `DESCRIPTION: ${productWithoutTextEmbedding.description}`,
      ];

      if (productWithoutTextEmbedding.colorNames?.length > 0)
        textEmbeddingParts.push(
          `COLORS: ${productWithoutTextEmbedding.colorNames.join(', ')}`
        );

      if (productWithoutTextEmbedding.materials?.length > 0)
        textEmbeddingParts.push(
          `MATERIALS: ${productWithoutTextEmbedding.materials.join(', ')}`
        );

      if (productWithoutTextEmbedding.styles?.length > 0)
        textEmbeddingParts.push(
          `STYLES: ${productWithoutTextEmbedding.styles.join(', ')}`
        );

      return textEmbeddingParts.join('\n');
    }
  );

  const productsTextEmbedding = await getProductsTextEmbedding(
    productsTextEmbeddingParts
  );

  const productsWithUndefinedRequiredValues = productsWithoutTextEmbedding.map(
    (productWithoutTextEmbedding, index) => {
      if (!productsTextEmbedding[index]) return;
      if (!productWithoutTextEmbedding.currencyCode) return;
      if (!productWithoutTextEmbedding.dimension) return;

      const warehouseCountryCodes =
        productWithoutTextEmbedding.warehouseCountryCodes ?? [];
      const shippingCountryCodes =
        productWithoutTextEmbedding.shippingCountryCodes ?? [];

      const { price, ...otherProductComputedData } = getProductComputedData(
        productWithoutTextEmbedding
      );

      return {
        ...productWithoutTextEmbedding,
        ...productsTextEmbedding[index],
        warehouseCountryCodes,
        shippingCountryCodes,
        vendorId: idArgs.vendorId,
        ownerId: idArgs.ownerId,
        fhSku: uid.generate(),
        ...otherProductComputedData,
        prices: [price],
        line: undefined,
      };
    }
  ) as (CreateProduct | undefined)[];

  const products = productsWithUndefinedRequiredValues.filter(
    (product) => product !== undefined
  ) as CreateProduct[];
  if (products.length < 1) return;

  for (const product of products) {
    const currentCategoryCount = categoryCount[product.category] ?? 0;
    categoryCount[product.category] = currentCategoryCount + 1;
  }

  const { data: response, errorRecord } = await createProductsService(products);
  if (errorRecord)
    error.sendErrorMessage({
      ...errorRecord,
      details: [
        ...(errorRecord.details ?? []),
        {
          function: 'createProductsService',
          createProductData: products.map((product) => product.sku),
        },
      ],
    });

  const productsProcessed = response?.data.length ?? 0;

  totalProcessed += productsProcessed;

  logger.info(
    `📦 Completed ${productsProcessed}. Total processed ${totalProcessed}`
  );
}

async function updateExistingProductPriceInfo(
  initialBaseProductsWithMainImageUrlAndIsoCodeInfo: Omit<
    BaseProduct,
    'category'
  >[],
  existingProducts: Product[]
) {
  const existingProductsToUpdate =
    initialBaseProductsWithMainImageUrlAndIsoCodeInfo
      .map((initialBaseProductWithMainImageUrlAndIsoCodeInfo) => {
        const existingProduct = existingProducts?.find(
          (product) =>
            product?.sku ===
            initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
        );
        if (!existingProduct) return;

        const productCurrencyExists = existingProduct.prices.some(
          (price) =>
            price.currencyCode ===
            initialBaseProductWithMainImageUrlAndIsoCodeInfo.currencyCode
        );
        if (productCurrencyExists) return;

        return {
          existingProduct,
          currentProduct: initialBaseProductWithMainImageUrlAndIsoCodeInfo,
        };
      })
      .filter((existingProduct) => existingProduct !== undefined);
  if (existingProductsToUpdate.length < 1) return;

  const productsToUpdate = existingProductsToUpdate.map(
    ({ existingProduct, currentProduct }) => {
      const { price, ...otherProductComputedData } =
        getProductComputedData(currentProduct);

      return {
        productId: existingProduct._id,
        updates: {
          prices: [...existingProduct.prices, price],
          ...otherProductComputedData,
        },
      };
    }
  );

  await updateProductsByIdService(productsToUpdate);
}
