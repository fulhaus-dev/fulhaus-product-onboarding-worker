import conversion from '@worker/utils/conversion.js';
import productDimensionValuesGeneratorAi from '@worker/v1/ai/ai.product-dimension-values-generator.js';
import productIsoValuesGeneratorAi from '@worker/v1/ai/ai.product-iso-values-generator.js';
import productMainImageDetectorAi from '@worker/v1/ai/ai.product-main-image-detector.js';
import productStyleGeneratorAi from '@worker/v1/ai/ai.product-style-generator.js';
import productDescriptorAndCategorizerAi from '@worker/v1/ai/ai.product-descriptor-and-categorizer.js';
import productWeightValuesGeneratorAi from '@worker/v1/ai/ai.product-weight-value-generator.js';
import {
  FLAT_FILE_EXTS_TO_PROCESS,
  SPREADSHEET_FILE_EXTS_TO_PROCESS,
  ZIP_FILE_EXTS_TO_PROCESS,
} from '@worker/v1/processor/processor.constant.js';
import { FileConfig } from '@worker/v1/processor/processor.type.js';
import {
  BaseProductData,
  DimensionUnit,
  ProductDimensionData,
  ProductImageData,
  ProductIsoCodeData,
  ProductDescriptionAndCategoryData,
  ProductStyleData,
  ProductWeightData,
  WeightUnit,
} from '@worker/v1/product/product.type.js';

export function getVendorProductDataFileKeysThatCanBeProcessed(keys: string[]) {
  const flatFileKeys = keys.filter((key) =>
    FLAT_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
  );

  const spreadsheetFileKeys = keys.filter((key) =>
    SPREADSHEET_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
  );

  const zipFileKeys = keys.filter((key) =>
    ZIP_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
  );

  return {
    flatFileKeys,
    spreadsheetFileKeys,
    zipFileKeys,
  };
}

function getProductHeadersAndContents(
  productDataLines: string[],
  fileConfig: FileConfig
) {
  const mainLineExtractDelimiter = '<<::|::>>';

  const headers = fileConfig.headerLine.split(fileConfig.delimiter);

  const contents = productDataLines
    .join(mainLineExtractDelimiter)
    .replace(fileConfig.headerLine, '')
    .split(mainLineExtractDelimiter)
    .filter(Boolean);

  return {
    headers,
    contents,
  };
}

export function getBaseProductData(
  productDataLines: string[],
  fileConfig: FileConfig
) {
  const { headers, contents } = getProductHeadersAndContents(
    productDataLines,
    fileConfig
  );

  const baseProductData: BaseProductData[] = contents.map((row) => {
    const values = row.split(fileConfig.delimiter);
    const dataObj = Object.fromEntries(headers.map((h, i) => [h, values[i]]));

    return {
      sku: dataObj[fileConfig.map.sku],
      itemId: fileConfig.map.itemId ? dataObj[fileConfig.map.itemId] : null,
      gtin: fileConfig.map.gtin ? dataObj[fileConfig.map.gtin] : null,
      mpn: fileConfig.map.mpn ? dataObj[fileConfig.map.mpn] : null,
      brand: fileConfig.map.brand ? dataObj[fileConfig.map.brand] : null,
      name: dataObj[fileConfig.map.name],
      description: dataObj[fileConfig.map.description],
      pdpLink: fileConfig.map.pdpLink ? dataObj[fileConfig.map.pdpLink] : null,
      tradePrice: parseFloat(dataObj[fileConfig.map.tradePrice]) || 0,
      map:
        fileConfig.map.map && dataObj[fileConfig.map.map] !== 'null'
          ? parseFloat(dataObj[fileConfig.map.map])
          : null,
      msrp: fileConfig.map.msrp
        ? parseFloat(dataObj[fileConfig.map.msrp]) || null
        : null,
      retailPrice: fileConfig.map.retailPrice
        ? parseFloat(dataObj[fileConfig.map.retailPrice]) || null
        : null,
      shippingPrice: fileConfig.map.shippingPrice
        ? parseFloat(dataObj[fileConfig.map.shippingPrice]) || null
        : null,
      unitPerBox: parseInt(dataObj[fileConfig.map.unitPerBox ?? '1']),
      stockQty: parseInt(dataObj[fileConfig.map.stockQty]) || 0,
      restockDate:
        fileConfig.map.restockDate && dataObj[fileConfig.map.restockDate]
          ? new Date(dataObj[fileConfig.map.restockDate])
          : null,
    };
  });

  return baseProductData;
}

export function extractProductImageUrls(productContentLines: string[]) {
  const urlPattern = /https?:\/\/[^\s,]+/g;
  const imagePattern = /\.(jpg|jpeg|png|gif|svg|webp|bmp|tiff|ico)($|\?|#)/i;
  const cdnPattern =
    /(images?|img|cdn|static|media|assets|photos|gallery|resize|thumb)/i;

  return productContentLines.map((line) => {
    const matches = line.match(urlPattern) || [];
    return matches
      .filter((url) => imagePattern.test(url) || cdnPattern.test(url))
      .map((url) => url.trim());
  });
}

export async function getProductImageData(
  productDataLines: string[],
  fileConfig: FileConfig
) {
  const { contents } = getProductHeadersAndContents(
    productDataLines,
    fileConfig
  );

  const productContentsImageUrls = extractProductImageUrls(contents);

  const productMainImageUrlResponses = await Promise.all(
    productContentsImageUrls.map((imageUrls) =>
      productMainImageDetectorAi(imageUrls.reverse().slice(0, 5))
    )
  );

  const productMainImageUrls = productMainImageUrlResponses.map(
    (response) => response.data?.mainImageImageUrl ?? ''
  );

  const productImageData: ProductImageData[] = productContentsImageUrls.map(
    (imageUrls, index) => {
      let mainImageUrl = productMainImageUrls[index];

      if (mainImageUrl === '') mainImageUrl = imageUrls[0];

      return {
        imageUrls,
        mainImageUrl,
        ludwigImageUrl: mainImageUrl,
      };
    }
  );

  return productImageData;
}

export async function getProductIsoCodeData(
  productDataLines: string[],
  fileConfig: FileConfig
) {
  const { contents } = getProductHeadersAndContents(
    productDataLines,
    fileConfig
  );

  const productIsoValuesResponses = await Promise.all(
    contents.map((line) =>
      productIsoValuesGeneratorAi({
        headerLine: fileConfig.headerLine,
        productDataLine: line,
      })
    )
  );

  const productIsoValues = productIsoValuesResponses.map(
    (response) =>
      response.data ?? {
        warehouseCountryCodes: [],
        shippingCountryCodes: [],
        currencyCode: 'USD',
      }
  ) as ProductIsoCodeData[];

  return productIsoValues;
}

export async function getProductDimensionData(
  productDataLines: string[],
  fileConfig: FileConfig
) {
  const { contents } = getProductHeadersAndContents(
    productDataLines,
    fileConfig
  );

  const productDimensionValuesResponses = await Promise.all(
    contents.map((line) =>
      productDimensionValuesGeneratorAi({
        headerLine: fileConfig.headerLine,
        productDataLine: line,
      })
    )
  );

  const productDimensionData = productDimensionValuesResponses
    .map(
      (response) =>
        response.data ?? {
          dimension: null,
          width: null,
          height: null,
          depth: null,
          shippingDimension: null,
          shippingWidth: null,
          shippingHeight: null,
          shippingDepth: null,
          dimensionUnit: 'in' as DimensionUnit,
        }
    )
    .map((response) => {
      // Main Dimensions
      const mainDimensionValuesInInches = conversion.convertDimensionsToInches(
        {
          width: response.width,
          height: response.height,
          depth: response.depth,
        },
        response.dimensionUnit
      );

      const mainDimensionValuesInInchesArray: number[] = [];
      if (response.width)
        mainDimensionValuesInInchesArray.push(
          mainDimensionValuesInInches.width
        );
      if (response.height)
        mainDimensionValuesInInchesArray.push(
          mainDimensionValuesInInches.height
        );
      if (response.depth)
        mainDimensionValuesInInchesArray.push(
          mainDimensionValuesInInches.depth
        );

      const mainDimensionStringFormat =
        mainDimensionValuesInInchesArray.length > 0
          ? mainDimensionValuesInInchesArray
              .map((value) => `${value}"`)
              .join(' x ')
          : null;

      // Shipping Dimensions
      const shippingDimensionValuesInInches =
        conversion.convertDimensionsToInches(
          {
            width: response.shippingWidth ?? response.width,
            height: response.shippingHeight ?? response.height,
            depth: response.shippingDepth ?? response.depth,
          },
          response.dimensionUnit
        );

      const shippingDimensionValuesInInchesArray: number[] = [];
      if (shippingDimensionValuesInInches.width !== 0)
        shippingDimensionValuesInInchesArray.push(
          shippingDimensionValuesInInches.width
        );
      if (shippingDimensionValuesInInches.height !== 0)
        shippingDimensionValuesInInchesArray.push(
          shippingDimensionValuesInInches.height
        );
      if (shippingDimensionValuesInInches.depth !== 0)
        shippingDimensionValuesInInchesArray.push(
          shippingDimensionValuesInInches.depth
        );

      const shippingDimensionStringFormat =
        shippingDimensionValuesInInchesArray.length > 0
          ? shippingDimensionValuesInInchesArray
              .map((value) => `${value}"`)
              .join(' x ')
          : null;

      return {
        dimension: mainDimensionStringFormat,
        width: mainDimensionValuesInInches.width,
        height: mainDimensionValuesInInches.height,
        depth: mainDimensionValuesInInches.depth,
        shippingDimension: shippingDimensionStringFormat,
        shippingWidth: shippingDimensionValuesInInches.width,
        shippingHeight: shippingDimensionValuesInInches.height,
        shippingDepth: shippingDimensionValuesInInches.depth,
        dimensionUnit: 'in',
      } as ProductDimensionData;
    });

  return productDimensionData;
}

export async function getProductWeightData(
  productDataLines: string[],
  fileConfig: FileConfig
) {
  const { contents } = getProductHeadersAndContents(
    productDataLines,
    fileConfig
  );

  const productWeightValuesResponses = await Promise.all(
    contents.map((line) =>
      productWeightValuesGeneratorAi({
        headerLine: fileConfig.headerLine,
        productDataLine: line,
      })
    )
  );

  const productWeightData = productWeightValuesResponses
    .map(
      (response) =>
        response.data ?? {
          weight: null,
          shippingWeight: null,
          weightUnit: 'lb' as WeightUnit,
        }
    )
    .map((response) => {
      // Main Weight
      const mainWeightValuesInLbs = conversion.convertWeightToLbs(
        response.weight,
        response.weightUnit
      );

      // Shipping Weight
      const shippingWeightValuesInLbs = conversion.convertWeightToLbs(
        response.shippingWeight ?? response.weight,
        response.weightUnit
      );

      return {
        weight: mainWeightValuesInLbs.weight,
        shippingWeight: shippingWeightValuesInLbs.weight,
        weightUnit: 'lb',
      } as ProductWeightData;
    });

  return productWeightData;
}

export async function getProductStyleData(
  productDataLines: string[],
  fileConfig: FileConfig,
  productImageData: ProductImageData[]
) {
  const { contents } = getProductHeadersAndContents(
    productDataLines,
    fileConfig
  );

  const productStyleResponses = await Promise.all(
    contents.map((line, index) =>
      productStyleGeneratorAi({
        headerLine: fileConfig.headerLine,
        productDataLine: line,
        mainImageUrl: productImageData[index].mainImageUrl,
      })
    )
  );

  const productStyleData: ProductStyleData[] = productStyleResponses.map(
    (response) =>
      response.data ?? {
        colorNames: [],
        hexColors: [],
        materials: [],
        styles: [],
      }
  );

  return productStyleData;
}

export async function getProductDescriptionAndCategoryData(
  productDataLines: string[],
  fileConfig: FileConfig,
  productImageData: ProductImageData[],
  baseProductData: BaseProductData[]
) {
  const { contents } = getProductHeadersAndContents(
    productDataLines,
    fileConfig
  );
  const productTextResponses = await Promise.all(
    contents.map((line, index) =>
      productDescriptorAndCategorizerAi({
        headerLine: fileConfig.headerLine,
        productDataLine: line,
        mainImageUrl: productImageData[index].mainImageUrl,
      })
    )
  );

  const productDescriptionAndCategoryData = productTextResponses.map(
    (response, index) =>
      response.data ?? {
        name: baseProductData[index].name,
        description: baseProductData[index].description,
        category: '',
      }
  ) as ProductDescriptionAndCategoryData[];

  return productDescriptionAndCategoryData;
}
