// import conversion from '@worker/utils/conversion.js';
// import productDimensionValuesGeneratorAi from '@worker/v1/ai/ai.product-dimension-values-generator.js';
// import productIsoValuesGeneratorAi from '@worker/v1/ai/ai.product-iso-values-generator.js';
// import productMainImageDetectorAi from '@worker/v1/ai/ai.product-main-image-detector.js';
// import productStyleGeneratorAi from '@worker/v1/ai/ai.product-style-generator.js';
// import productDescriptorAndCategorizerAi from '@worker/v1/ai/ai.product-descriptor-and-categorizer.js';
// import productWeightValuesGeneratorAi from '@worker/v1/ai/ai.product-weight-value-generator.js';
import {
  FLAT_FILE_EXTS_TO_PROCESS,
  SPREADSHEET_FILE_EXTS_TO_PROCESS,
  ZIP_FILE_EXTS_TO_PROCESS,
} from '@worker/v1/processor/processor.constant.js';
import { FileConfig } from '@worker/v1/processor/processor.type.js';
import {
  BaseProductData,
  // ProductDataDimensionUnit,
  // ProductDimensionData,
  // ProductImageData,
  // ProductIsoCodeData,
  // ProductDescriptionAndCategoryData,
  // ProductStyleData,
  // ProductWeightData,
  // ProductDataWeightUnit,
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
      itemId: dataObj[fileConfig.map.itemId ?? 'NA'],
      gtin: dataObj[fileConfig.map.gtin ?? 'NA'],
      mpn: dataObj[fileConfig.map.mpn ?? 'NA'],
      brand: dataObj[fileConfig.map.brand ?? 'NA'],
      name: dataObj[fileConfig.map.name],
      description: dataObj[fileConfig.map.description],
      pdpLink: dataObj[fileConfig.map.pdpLink ?? 'NA'],
      tradePrice: parseFloat(dataObj[fileConfig.map.tradePrice]) || 0,
      map: fileConfig.map.map
        ? parseFloat(dataObj[fileConfig.map.map])
        : undefined,
      msrp: fileConfig.map.msrp
        ? parseFloat(dataObj[fileConfig.map.msrp])
        : undefined,
      retailPrice: fileConfig.map.retailPrice
        ? parseFloat(dataObj[fileConfig.map.retailPrice])
        : undefined,
      shippingPrice: fileConfig.map.shippingPrice
        ? parseFloat(dataObj[fileConfig.map.shippingPrice])
        : undefined,
      unitPerBox: parseInt(dataObj[fileConfig.map.unitPerBox ?? '1']),
      stockQty: parseInt(dataObj[fileConfig.map.stockQty ?? '0']),
      restockDate: fileConfig.map.restockDate
        ? new Date(dataObj[fileConfig.map.restockDate])
        : undefined,
    };
  });

  return baseProductData;
}

// export function extractProductImageUrls(productContentLines: string[]) {
//   const urlPattern = /https?:\/\/[^\s,]+/g;
//   const imagePattern = /\.(jpg|jpeg|png|gif|svg|webp|bmp|tiff|ico)($|\?|#)/i;
//   const cdnPattern =
//     /(images?|img|cdn|static|media|assets|photos|gallery|resize|thumb)/i;

//   const productContentsImageUrls = productContentLines.map((line) => {
//     const matches = line.match(urlPattern) || [];
//     return matches
//       .filter((url) => imagePattern.test(url) || cdnPattern.test(url))
//       .map((url) => url.trim());
//   });

//   return productContentsImageUrls.map((urls) => [...new Set(urls)]);
// }

// export async function getProductImageData(
//   productDataLines: string[],
//   fileConfig: FileConfig
// ) {
//   const { contents } = getProductHeadersAndContents(
//     productDataLines,
//     fileConfig
//   );

//   const productContentsImageUrls = extractProductImageUrls(contents);

//   const productMainImageUrlResponses = await Promise.all(
//     productContentsImageUrls.map((imageUrls) =>
//       productMainImageDetectorAi(imageUrls)
//     )
//   );

//   const productMainImageUrls = productMainImageUrlResponses.map(
//     (response, index) =>
//       productContentsImageUrls[index][
//         Number(response.data?.mainImageImageIndex ?? '0')
//       ]
//   );

//   const productImageData: ProductImageData[] = productContentsImageUrls.map(
//     (imageUrls, index) => {
//       let ludwigImageUrl = productMainImageUrls[index];

//       if (ludwigImageUrl === '') ludwigImageUrl = imageUrls[0];

//       return {
//         imageUrls,
//         mainImageUrl: null,
//         ludwigImageUrl,
//       };
//     }
//   );

//   return productImageData;
// }

// export async function getProductIsoCodeData(
//   productDataLines: string[],
//   fileConfig: FileConfig
// ) {
//   const { contents } = getProductHeadersAndContents(
//     productDataLines,
//     fileConfig
//   );

//   const productIsoValuesResponses = await Promise.all(
//     contents.map((line) =>
//       productIsoValuesGeneratorAi({
//         headerLine: fileConfig.headerLine,
//         productDataLine: line,
//       })
//     )
//   );

//   const productIsoValues = productIsoValuesResponses.map(
//     (response) =>
//       response.data ?? {
//         warehouseCountryCodes: [],
//         shippingCountryCodes: [],
//         currencyCode: 'USD',
//       }
//   ) as ProductIsoCodeData[];

//   return productIsoValues;
// }

// export async function getProductDimensionData(
//   productDataLines: string[],
//   fileConfig: FileConfig
// ) {
//   const { contents } = getProductHeadersAndContents(
//     productDataLines,
//     fileConfig
//   );

//   const productDimensionValuesResponses = await Promise.all(
//     contents.map((line) =>
//       productDimensionValuesGeneratorAi({
//         headerLine: fileConfig.headerLine,
//         productDataLine: line,
//       })
//     )
//   );

//   const productDimensionData = productDimensionValuesResponses
//     .map(
//       (response) =>
//         response.data ?? {
//           dimension: null,
//           width: null,
//           height: null,
//           depth: null,
//           shippingDimension: null,
//           shippingWidth: null,
//           shippingHeight: null,
//           shippingDepth: null,
//           dimensionUnit: 'in' as DimensionUnit,
//         }
//     )
//     .map((response) => {
//       // Main Dimensions
//       const mainDimensionValuesInInches = conversion.convertDimensionsToInches(
//         {
//           width: response.width,
//           height: response.height,
//           depth: response.depth,
//         },
//         response.dimensionUnit
//       );

//       const mainDimensionValuesInInchesArray: {
//         value: number;
//         label: 'W' | 'H' | 'D';
//       }[] = [];
//       if (response.width)
//         mainDimensionValuesInInchesArray.push({
//           value: mainDimensionValuesInInches.width,
//           label: 'W',
//         });
//       if (response.depth)
//         mainDimensionValuesInInchesArray.push({
//           value: mainDimensionValuesInInches.depth,
//           label: 'D',
//         });
//       if (response.height)
//         mainDimensionValuesInInchesArray.push({
//           value: mainDimensionValuesInInches.height,
//           label: 'H',
//         });

//       const mainDimensionStringFormat =
//         mainDimensionValuesInInchesArray.length > 0
//           ? mainDimensionValuesInInchesArray
//               .map((dimension) => `${dimension.value}"${dimension.label}`)
//               .join(' x ')
//           : null;

//       // Shipping Dimensions
//       const shippingDimensionValuesInInches =
//         conversion.convertDimensionsToInches(
//           {
//             width: response.shippingWidth ?? response.width,
//             height: response.shippingHeight ?? response.height,
//             depth: response.shippingDepth ?? response.depth,
//           },
//           response.dimensionUnit
//         );

//       const shippingDimensionValuesInInchesArray: {
//         value: number;
//         label: 'W' | 'H' | 'D';
//       }[] = [];
//       if (shippingDimensionValuesInInches.width !== 0)
//         shippingDimensionValuesInInchesArray.push({
//           value: shippingDimensionValuesInInches.width,
//           label: 'W',
//         });
//       if (shippingDimensionValuesInInches.depth !== 0)
//         shippingDimensionValuesInInchesArray.push({
//           value: shippingDimensionValuesInInches.depth,
//           label: 'D',
//         });
//       if (shippingDimensionValuesInInches.height !== 0)
//         shippingDimensionValuesInInchesArray.push({
//           value: shippingDimensionValuesInInches.height,
//           label: 'H',
//         });

//       const shippingDimensionStringFormat =
//         shippingDimensionValuesInInchesArray.length > 0
//           ? shippingDimensionValuesInInchesArray
//               .map((dimension) => `${dimension.value}"${dimension.label}`)
//               .join(' x ')
//           : null;

//       return {
//         dimension: mainDimensionStringFormat,
//         width: mainDimensionValuesInInches.width,
//         height: mainDimensionValuesInInches.height,
//         depth: mainDimensionValuesInInches.depth,
//         shippingDimension: shippingDimensionStringFormat,
//         shippingWidth: shippingDimensionValuesInInches.width,
//         shippingHeight: shippingDimensionValuesInInches.height,
//         shippingDepth: shippingDimensionValuesInInches.depth,
//         dimensionUnit: 'in',
//       } as ProductDimensionData;
//     });

//   return productDimensionData;
// }

// export async function getProductWeightData(
//   productDataLines: string[],
//   fileConfig: FileConfig
// ) {
//   const { contents } = getProductHeadersAndContents(
//     productDataLines,
//     fileConfig
//   );

//   const productWeightValuesResponses = await Promise.all(
//     contents.map((line) =>
//       productWeightValuesGeneratorAi({
//         headerLine: fileConfig.headerLine,
//         productDataLine: line,
//       })
//     )
//   );

//   const productWeightData = productWeightValuesResponses
//     .map(
//       (response) =>
//         response.data ?? {
//           weight: null,
//           shippingWeight: null,
//           weightUnit: 'lb' as WeightUnit,
//         }
//     )
//     .map((response) => {
//       // Main Weight
//       const mainWeightValuesInLbs = conversion.convertWeightToLbs(
//         response.weight,
//         response.weightUnit
//       );

//       // Shipping Weight
//       const shippingWeightValuesInLbs = conversion.convertWeightToLbs(
//         response.shippingWeight ?? response.weight,
//         response.weightUnit
//       );

//       return {
//         weight: mainWeightValuesInLbs.weight,
//         shippingWeight: shippingWeightValuesInLbs.weight,
//         weightUnit: 'lb',
//       } as ProductWeightData;
//     });

//   return productWeightData;
// }

// export async function getProductStyleData(
//   productDataLines: string[],
//   fileConfig: FileConfig,
//   productImageData: ProductImageData[]
// ) {
//   const { contents } = getProductHeadersAndContents(
//     productDataLines,
//     fileConfig
//   );

//   const productStyleResponses = await Promise.all(
//     contents.map((line, index) =>
//       productStyleGeneratorAi({
//         headerLine: fileConfig.headerLine,
//         productDataLine: line,
//         mainImageUrl: productImageData[index].ludwigImageUrl,
//       })
//     )
//   );

//   const productStyleData: ProductStyleData[] = productStyleResponses.map(
//     (response) =>
//       response.data ?? {
//         colorNames: [],
//         hexColors: [],
//         materials: [],
//         styles: [],
//       }
//   );

//   return productStyleData;
// }

// export async function getProductDescriptionAndCategoryData(
//   productDataLines: string[],
//   fileConfig: FileConfig,
//   productImageData: ProductImageData[],
//   baseProductData: BaseProductData[]
// ) {
//   const { contents } = getProductHeadersAndContents(
//     productDataLines,
//     fileConfig
//   );
//   const productTextResponses = await Promise.all(
//     contents.map((line, index) =>
//       productDescriptorAndCategorizerAi({
//         headerLine: fileConfig.headerLine,
//         productDataLine: line,
//         mainImageUrl: productImageData[index].ludwigImageUrl,
//       })
//     )
//   );

//   const productDescriptionAndCategoryData = productTextResponses.map(
//     (response, index) =>
//       response.data ?? {
//         name: baseProductData[index].name,
//         description: baseProductData[index].description,
//         category: '',
//       }
//   ) as ProductDescriptionAndCategoryData[];

//   return productDescriptionAndCategoryData;
// }
