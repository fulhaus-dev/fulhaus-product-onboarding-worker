import { error } from '@worker/utils/error.js';
import { FileConfig } from '@worker/v1/processor/processor.type.js';
import {
  getBaseProductData,
  getProductDimensionData,
  getProductImageData,
  getProductIsoCodeData,
  getProductDescriptionAndCategoryData,
  getProductStyleData,
  getProductWeightData,
} from '@worker/v1/processor/processor.util.js';
import { createProductService } from '@worker/v1/product/product.service.js';
import { CreateProduct } from '@worker/v1/product/product.type.js';

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 300;

export default function processProductLinesWorker(
  productDataLines: string[],
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  const batches = [];

  for (let i = 0; i < productDataLines.length; i += BATCH_SIZE) {
    batches.push(productDataLines.slice(i, i + BATCH_SIZE));
  }

  const processBatch = async (batch: string[], delay: number) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return processProductLines(batch, fileConfig, idArgs);
  };

  Promise.all(
    batches.map((batch, index) => processBatch(batch, index * BATCH_DELAY_MS))
  );
}

async function processProductLines(
  productDataLines: string[],
  fileConfig: FileConfig,
  idArgs: { vendorId: string; ownerId?: string }
) {
  const baseProductData = getBaseProductData(productDataLines, fileConfig);

  const [
    productImageData,
    productIsoCodeData,
    productDimensionData,
    productWeightData,
  ] = await Promise.all([
    getProductImageData(productDataLines, fileConfig),
    getProductIsoCodeData(productDataLines, fileConfig),
    getProductDimensionData(productDataLines, fileConfig),
    getProductWeightData(productDataLines, fileConfig),
  ]);

  const [productStyleData, productDescriptionAndCategoryData] =
    await Promise.all([
      getProductStyleData(productDataLines, fileConfig, productImageData),
      getProductDescriptionAndCategoryData(
        productDataLines,
        fileConfig,
        productImageData,
        baseProductData
      ),
    ]);

  const productsToCreate: CreateProduct[] = baseProductData.map(
    (product, index) => ({
      vendorId: idArgs.vendorId,
      ownerId: idArgs.ownerId ?? null,
      ...product,
      ...productImageData[index],
      ...productIsoCodeData[index],
      ...productDimensionData[index],
      ...productWeightData[index],
      ...productStyleData[index],
      ...productDescriptionAndCategoryData[index],
    })
  );

  const createProductResponses = await Promise.all(
    productsToCreate.map((createProductData) =>
      createProductService(createProductData)
    )
  );

  createProductResponses.forEach((response, index) => {
    if (response?.errorRecord)
      error.sendErrorMessage({
        ...response.errorRecord,
        details: [
          ...(response.errorRecord.details ?? []),
          {
            function: 'createProductService',
            createProductData: productsToCreate[index],
          },
        ],
      });
  });
}
