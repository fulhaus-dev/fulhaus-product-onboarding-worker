import conversion from '@worker/utils/conversion.js';
import productDimensionInfoGeneratorAi from '@worker/v1/ai/ai.product-dimension-info-generator.js';
import { productImageEmbeddingGeneratorAi } from '@worker/v1/ai/ai.product-image-embedding-generator.js';
import productIsoCodeInfoGeneratorAi from '@worker/v1/ai/ai.product-iso-code-info-generator.js';
import productMainImageDetectorAi from '@worker/v1/ai/ai.product-main-image-detector.js';
import productStyleInfoGeneratorAi from '@worker/v1/ai/ai.product-style-info-generator.js';
import { productTextEmbeddingGeneratorAi } from '@worker/v1/ai/ai.product-text-embedding-generator.js';
import productWeightInfoGeneratorAi from '@worker/v1/ai/ai.product-weight-info-generator.js';
import {
  FLAT_FILE_EXTS_TO_PROCESS,
  SPREADSHEET_FILE_EXTS_TO_PROCESS,
  ZIP_FILE_EXTS_TO_PROCESS,
} from '@worker/v1/processor/processor.constant.js';
import {
  FileConfig,
  ProductDataDimensionUnit,
  ProductDataWeightUnit,
} from '@worker/v1/processor/processor.type.js';
import {
  BaseProduct,
  ProductDimensionInfo,
  ProductStyleInfo,
  ProductWeightInfo,
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

export async function getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
  productDataLines: string[],
  fileConfig: FileConfig
) {
  const { headers, contents } = getProductHeadersAndContents(
    productDataLines,
    fileConfig
  );

  const initialBaseProducts: (
    | Omit<
        BaseProduct,
        | 'mainImageUrl'
        | 'category'
        | 'currencyCode'
        | 'warehouseCountryCodes'
        | 'shippingCountryCodes'
      >
    | undefined
  )[] = contents.map((row) => {
    const values = row.split(fileConfig.delimiter);
    const dataObj = Object.fromEntries(headers.map((h, i) => [h, values[i]]));

    const map = fileConfig.map.map
      ? parseFloat(dataObj[fileConfig.map.map])
      : NaN;

    const msrp = fileConfig.map.msrp
      ? parseFloat(dataObj[fileConfig.map.msrp])
      : NaN;

    const shippingPrice = fileConfig.map.shippingPrice
      ? parseFloat(dataObj[fileConfig.map.shippingPrice])
      : NaN;

    const unitPerBox = parseInt(dataObj[fileConfig.map.unitPerBox ?? '1']);

    const imageUrls = extractProductImageUrls(row);

    const stockQty = parseInt(dataObj[fileConfig.map.stockQty ?? '0']);
    const restockDate = fileConfig.map.restockDate
      ? new Date(dataObj[fileConfig.map.restockDate])
      : undefined;
    if (!restockDate && stockQty < 1) return undefined;

    const tradePrice = parseFloat(dataObj[fileConfig.map.tradePrice]);
    if (!tradePrice) return undefined;

    const sku = dataObj[fileConfig.map.sku];
    if (!sku) return undefined;

    return {
      line: row,
      sku: dataObj[fileConfig.map.sku],
      itemId: dataObj[fileConfig.map.itemId ?? 'NA'],
      gtin: dataObj[fileConfig.map.gtin ?? 'NA'],
      mpn: dataObj[fileConfig.map.mpn ?? 'NA'],
      brand: dataObj[fileConfig.map.brand ?? 'NA'],
      name: dataObj[fileConfig.map.name],
      description: dataObj[fileConfig.map.description],
      pdpLink: dataObj[fileConfig.map.pdpLink ?? 'NA'],
      tradePrice,
      map: isNaN(map) ? undefined : map <= 0 ? undefined : map,
      msrp: isNaN(msrp) ? undefined : msrp <= 0 ? undefined : msrp,
      shippingPrice: isNaN(shippingPrice)
        ? undefined
        : shippingPrice <= 0
        ? undefined
        : shippingPrice,
      unitPerBox: isNaN(unitPerBox) ? 1 : unitPerBox < 1 ? 1 : unitPerBox,
      stockQty,
      restockDate,
      imageUrls,
    };
  });

  const sanitizedInitialBaseProducts = initialBaseProducts.filter(
    (sanitizedInitialBaseProduct) => !!sanitizedInitialBaseProduct
  );

  const [productMainImageDetectorAiResponses, productsIsoCodeInfo] =
    await Promise.all([
      Promise.all(
        sanitizedInitialBaseProducts.map((initialBaseProduct) =>
          productMainImageDetectorAi(initialBaseProduct.imageUrls)
        )
      ),
      getProductsIsoCodeInfo(fileConfig.headerLine, productDataLines),
    ]);

  const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
    sanitizedInitialBaseProducts.map((initialBaseProduct, index) => {
      const mainImageHasSolidBackground =
        !!productMainImageDetectorAiResponses[index].data?.hasWhiteBackground &&
        !productMainImageDetectorAiResponses[index].data.noMainImage;

      const mainImageIndex = Number(
        productMainImageDetectorAiResponses[index].data?.mainImageImageIndex ??
          '0'
      );

      const mainImageUrl = initialBaseProduct.imageUrls[mainImageIndex];

      return {
        ...initialBaseProduct,
        mainImageUrl: mainImageHasSolidBackground ? mainImageUrl : undefined,
        ...(productsIsoCodeInfo[index] ?? {}),
      };
    });

  return initialBaseProductsWithMainImageUrlAndIsoCodeInfo.filter(
    (initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
      initialBaseProductWithMainImageUrlAndIsoCodeInfo.mainImageUrl !==
        undefined &&
      initialBaseProductWithMainImageUrlAndIsoCodeInfo.currencyCode !==
        undefined
  ) as Omit<BaseProduct, 'category'>[];
}

export function extractProductImageUrls(productLine: string) {
  const urlPattern = /https?:\/\/[^\s,]+/g;
  const imagePattern = /\.(jpg|jpeg|png|gif|svg|webp|bmp|tiff|ico)($|\?|#)/i;
  const cdnPattern =
    /(images?|img|cdn|static|media|assets|photos|gallery|resize|thumb)/i;

  const matches = productLine.match(urlPattern) || [];
  const urls = matches
    .filter((url) => imagePattern.test(url) || cdnPattern.test(url))
    .map((url) => url.trim());

  return [...new Set(urls)];
}

export async function getProductsIsoCodeInfo(
  headerLine: string,
  productDataLines: string[]
) {
  const productIsoCodeInfoResponses = await Promise.all(
    productDataLines.map((line) =>
      productIsoCodeInfoGeneratorAi({
        headerLine,
        productDataLine: line,
      })
    )
  );

  const productsIsoCodeInfo = productIsoCodeInfoResponses.map(
    (response) => response.data
  );

  return productsIsoCodeInfo;
}

export async function getProductsDimensionInfo(
  headerLine: string,
  productDataLines: string[]
) {
  const productDimensionInfoResponses = await Promise.all(
    productDataLines.map((line) =>
      productDimensionInfoGeneratorAi({
        headerLine,
        productDataLine: line,
      })
    )
  );

  const productDimensionInfo = productDimensionInfoResponses
    .map(
      (response) =>
        response.data ?? {
          dimension: undefined,
          width: null,
          height: null,
          depth: null,
          shippingDimension: null,
          shippingWidth: null,
          shippingHeight: null,
          shippingDepth: null,
          dimensionUnit: 'in' as ProductDataDimensionUnit,
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

      const mainDimensionValuesInInchesArray: {
        value: number;
        label: 'W' | 'H' | 'D';
      }[] = [];
      if (response.width)
        mainDimensionValuesInInchesArray.push({
          value: mainDimensionValuesInInches.width,
          label: 'W',
        });
      if (response.depth)
        mainDimensionValuesInInchesArray.push({
          value: mainDimensionValuesInInches.depth,
          label: 'D',
        });
      if (response.height)
        mainDimensionValuesInInchesArray.push({
          value: mainDimensionValuesInInches.height,
          label: 'H',
        });

      const mainDimensionStringFormat =
        mainDimensionValuesInInchesArray.length > 0
          ? mainDimensionValuesInInchesArray
              .map((dimension) => `${dimension.value}"${dimension.label}`)
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

      const shippingDimensionValuesInInchesArray: {
        value: number;
        label: 'W' | 'H' | 'D';
      }[] = [];
      if (shippingDimensionValuesInInches.width !== 0)
        shippingDimensionValuesInInchesArray.push({
          value: shippingDimensionValuesInInches.width,
          label: 'W',
        });
      if (shippingDimensionValuesInInches.depth !== 0)
        shippingDimensionValuesInInchesArray.push({
          value: shippingDimensionValuesInInches.depth,
          label: 'D',
        });
      if (shippingDimensionValuesInInches.height !== 0)
        shippingDimensionValuesInInchesArray.push({
          value: shippingDimensionValuesInInches.height,
          label: 'H',
        });

      const shippingDimensionStringFormat =
        shippingDimensionValuesInInchesArray.length > 0
          ? shippingDimensionValuesInInchesArray
              .map((dimension) => `${dimension.value}"${dimension.label}`)
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
      } as ProductDimensionInfo;
    });

  return productDimensionInfo;
}

export async function getProductsWeightInfo(
  headerLine: string,
  productDataLines: string[]
) {
  const productWeightInfoResponses = await Promise.all(
    productDataLines.map((line) =>
      productWeightInfoGeneratorAi({
        headerLine,
        productDataLine: line,
      })
    )
  );

  const productWeightInfo = productWeightInfoResponses
    .map(
      (response) =>
        response.data ?? {
          weight: null,
          shippingWeight: null,
          weightUnit: 'lb' as ProductDataWeightUnit,
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
      } as ProductWeightInfo;
    });

  return productWeightInfo;
}

export async function getProductsStyleInfo(
  headerLine: string,
  info: {
    line: string;
    mainImageUrl: string;
  }[]
) {
  const productStyleInfoResponses = await Promise.all(
    info.map(({ line, mainImageUrl }) =>
      productStyleInfoGeneratorAi({
        headerLine,
        productDataLine: line,
        mainImageUrl,
      })
    )
  );

  const productsStyleInfo: ProductStyleInfo[] = productStyleInfoResponses.map(
    (response) =>
      response.data ?? {
        colorNames: [],
        hexColors: [],
        materials: [],
        styles: [],
      }
  );

  return productsStyleInfo;
}

export async function getProductsImageEmbedding(mainImageUrls: string[]) {
  const productImageEmbeddingResponses = await Promise.all(
    mainImageUrls.map((mainImageUrl) =>
      productImageEmbeddingGeneratorAi(mainImageUrl)
    )
  );

  return productImageEmbeddingResponses.map((response) => ({
    imageEmbedding: response.data,
  }));
}

export async function getProductsTextEmbedding(texts: string[]) {
  const productTextEmbeddingResponses = await Promise.all(
    texts.map((text) => productTextEmbeddingGeneratorAi(text))
  );

  return productTextEmbeddingResponses.map((response) => ({
    textEmbedding: response.data,
  }));
}

export function getProductComputedData(
  baseProductWithNoCategory: Omit<BaseProduct, 'category'>
) {
  const retailPrice =
    baseProductWithNoCategory.msrp ??
    baseProductWithNoCategory.map ??
    baseProductWithNoCategory.tradePrice * 2;

  const price = {
    currencyCode: baseProductWithNoCategory.currencyCode,
    retailPrice,
    msrp: baseProductWithNoCategory.msrp,
    map: baseProductWithNoCategory.map,
    tradePrice: baseProductWithNoCategory.tradePrice,
    shippingPrice: baseProductWithNoCategory.shippingPrice,
  };

  const hasCAD = price.currencyCode === 'CAD';
  const hasUSD = price.currencyCode === 'USD';
  const retailPriceCAD =
    price.currencyCode === 'CAD' ? price.retailPrice : undefined;
  const retailPriceUSD =
    price.currencyCode === 'USD' ? price.retailPrice : undefined;

  const stockQtyUSD =
    price.currencyCode === 'USD' ? baseProductWithNoCategory.stockQty : 0;
  const stockQtyCAD =
    price.currencyCode === 'CAD' ? baseProductWithNoCategory.stockQty : 0;
  const restockDateUSD =
    price.currencyCode === 'USD'
      ? baseProductWithNoCategory.restockDate
      : undefined;
  const restockDateCAD =
    price.currencyCode === 'CAD'
      ? baseProductWithNoCategory.restockDate
      : undefined;

  return {
    price,
    hasCAD,
    hasUSD,
    retailPriceCAD,
    retailPriceUSD,
    stockQtyUSD,
    stockQtyCAD,
    restockDateUSD,
    restockDateCAD,
    retailPrice: undefined,
    msrp: undefined,
    map: undefined,
    tradePrice: undefined,
    shippingPrice: undefined,
    stockQty: undefined,
    restockDate: undefined,
    currencyCode: undefined,
  };
}
