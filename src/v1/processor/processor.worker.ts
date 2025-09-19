import { error } from '@worker/utils/error.js';
import logger from '@worker/utils/logger.js';
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

export default async function processProductLinesWorker(
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

  //   const productImageData = await getProductImageData(
  //     productDataLines,
  //     fileConfig
  //   );

  //   const productIsoCodeData = await getProductIsoCodeData(
  //     productDataLines,
  //     fileConfig
  //   );

  //   const productDimensionData = await getProductDimensionData(
  //     productDataLines,
  //     fileConfig
  //   );

  //   const productWeightData = await getProductWeightData(
  //     productDataLines,
  //     fileConfig
  //   );

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

  //   const productStyleData = await getProductStyleData(
  //     productDataLines,
  //     fileConfig,
  //     productImageData
  //   );

  //   const productOptimizedTextData = await getProductOptimizedTextData(
  //     productDataLines,
  //     fileConfig,
  //     productImageData,
  //     baseProductData
  //   );

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

  console.log('Done!');
}
