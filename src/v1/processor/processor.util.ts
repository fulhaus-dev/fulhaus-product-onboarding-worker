import conversion from "@worker/utils/conversion.js";
import { productImageEmbeddingGeneratorAi } from "@worker/v1/ai/ai.product-image-embedding-generator.js";
import productMainImageDetectorAi from "@worker/v1/ai/ai.product-main-image-detector.js";
import productMetricInfoGeneratorAi from "@worker/v1/ai/ai.product-metric-info-generator.js";
import productStyleInfoGeneratorAi from "@worker/v1/ai/ai.product-style-info-generator.js";
import {
	FLAT_FILE_EXTS_TO_PROCESS,
	SPREADSHEET_FILE_EXTS_TO_PROCESS,
	ZIP_FILE_EXTS_TO_PROCESS,
} from "@worker/v1/processor/processor.constant.js";
import type { FileConfig } from "@worker/v1/processor/processor.type.js";
import {
	getProductsBySkusService,
	logProductErrorService,
	updateProductsByIdService,
} from "@worker/v1/product/product.service.js";
import type {
	BaseProduct,
	Product,
	ProductDimensionInfo,
	ProductStyleInfo,
	ProductWeightInfo,
} from "@worker/v1/product/product.type.js";
import { wayfairProductLineContainsGroupId } from "@worker/wayfair/wayfair.util.js";

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

function getProductHeadersAndContents(productDataLines: string[], fileConfig: FileConfig) {
	const mainLineExtractDelimiter = "<<::|::>>";

	const headers = fileConfig.headerLine.split(fileConfig.delimiter);

	const contents = productDataLines
		.join(mainLineExtractDelimiter)
		.replace(fileConfig.headerLine, "")
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
	const validProductDataLines = productDataLines.filter((line) =>
		wayfairProductLineContainsGroupId(line)
	);
	if (validProductDataLines.length < 1) return [];

	const { headers, contents } = getProductHeadersAndContents(validProductDataLines, fileConfig);

	const initialBaseProducts = processProductRows(contents, fileConfig, headers);

	let sanitizedInitialBaseProducts = initialBaseProducts.filter(
		(sanitizedInitialBaseProduct) => !!sanitizedInitialBaseProduct
	);
	if (sanitizedInitialBaseProducts.length < 1) return [];

	const { filteredProducts, existingProducts } = await filterExistingProducts(
		sanitizedInitialBaseProducts
	);
	sanitizedInitialBaseProducts = filteredProducts;
	if (sanitizedInitialBaseProducts.length < 1) return [];

	const [productMainImageDetectorAiResponses, productsMetricInfo] = await Promise.all([
		Promise.all(
			sanitizedInitialBaseProducts.map((initialBaseProduct) =>
				productMainImageDetectorAi(initialBaseProduct.imageUrls, initialBaseProduct.name)
			)
		),
		getProductsMetricInfo(fileConfig.headerLine, productDataLines),
	]);

	const initialBaseProductsWithMainImageUrlAndMetricInfo = processMainImageData(
		productMainImageDetectorAiResponses,
		sanitizedInitialBaseProducts,
		productsMetricInfo
	);

	const finalInitialBaseProductsWithMainImageUrlAndMetricInfo = filterFinalProducts(
		initialBaseProductsWithMainImageUrlAndMetricInfo
	);

	if (existingProducts.length < 1)
		updateExistingProductPriceInfo(
			finalInitialBaseProductsWithMainImageUrlAndMetricInfo,
			existingProducts
		);

	return finalInitialBaseProductsWithMainImageUrlAndMetricInfo;
}

function createDataObject(row: string, headers: string[], fileConfig: FileConfig) {
	const values = row.split(fileConfig.delimiter);
	return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
}

function parseNumericValues(dataObj: Record<string, string>, fileConfig: FileConfig) {
	const map = fileConfig.map.map ? parseFloat(dataObj[fileConfig.map.map]) : NaN;
	const msrp = fileConfig.map.msrp ? parseFloat(dataObj[fileConfig.map.msrp]) : NaN;
	const shippingPrice = fileConfig.map.shippingPrice
		? parseFloat(dataObj[fileConfig.map.shippingPrice])
		: NaN;
	const unitPerBox = parseInt(dataObj[fileConfig.map.unitPerBox ?? "1"]);
	const stockQty = parseInt(dataObj[fileConfig.map.stockQty ?? "0"]);
	const tradePrice = parseFloat(dataObj[fileConfig.map.tradePrice]);

	return { map, msrp, shippingPrice, unitPerBox, stockQty, tradePrice };
}

function validateProductData(
	stockQty: number,
	restockDate: Date | undefined,
	tradePrice: number,
	sku: string
): boolean {
	if (!restockDate && stockQty < 1) return false;
	if (!tradePrice) return false;
	if (!sku) return false;
	return true;
}

function sanitizeNumericValues(
	map: number,
	msrp: number,
	shippingPrice: number,
	unitPerBox: number
) {
	return {
		map: isNaN(map) ? undefined : map <= 0 ? undefined : map,
		msrp: isNaN(msrp) ? undefined : msrp <= 0 ? undefined : msrp,
		shippingPrice: isNaN(shippingPrice)
			? undefined
			: shippingPrice <= 0
				? undefined
				: shippingPrice,
		unitPerBox: isNaN(unitPerBox) ? 1 : unitPerBox < 1 ? 1 : unitPerBox,
	};
}

function createBaseProduct(row: string, dataObj: Record<string, string>, fileConfig: FileConfig) {
	const { map, msrp, shippingPrice, unitPerBox, stockQty, tradePrice } = parseNumericValues(
		dataObj,
		fileConfig
	);

	const restockDate = fileConfig.map.restockDate
		? new Date(dataObj[fileConfig.map.restockDate])
		: undefined;

	const sku = dataObj[fileConfig.map.sku];

	if (!validateProductData(stockQty, restockDate, tradePrice, sku)) {
		return undefined;
	}

	const imageUrls = extractProductImageUrls(row);
	const sanitizedValues = sanitizeNumericValues(map, msrp, shippingPrice, unitPerBox);

	return {
		line: row,
		sku,
		itemId: dataObj[fileConfig.map.itemId ?? "NA"],
		gtin: dataObj[fileConfig.map.gtin ?? "NA"],
		mpn: dataObj[fileConfig.map.mpn ?? "NA"],
		brand: dataObj[fileConfig.map.brand ?? "NA"],
		name: dataObj[fileConfig.map.name],
		description: dataObj[fileConfig.map.description],
		pdpLink: dataObj[fileConfig.map.pdpLink ?? "NA"],
		tradePrice,
		map: sanitizedValues.map,
		msrp: sanitizedValues.msrp,
		shippingPrice: sanitizedValues.shippingPrice,
		unitPerBox: sanitizedValues.unitPerBox,
		stockQty,
		restockDate,
		imageUrls,
	};
}

function processProductRows(contents: string[], fileConfig: FileConfig, headers: string[]) {
	return contents.map((row) => {
		const dataObj = createDataObject(row, headers, fileConfig);
		return createBaseProduct(row, dataObj, fileConfig);
	});
}

async function filterExistingProducts(sanitizedInitialBaseProducts: any[]) {
	const currentSkus = sanitizedInitialBaseProducts.map(
		(sanitizedInitialBaseProduct) => sanitizedInitialBaseProduct.sku
	);

	const { data: existingProductSkusResponse } = await getProductsBySkusService(currentSkus);

	const existingProducts = sanitizedInitialBaseProducts
		.map((initialBaseProductWithMainImageUrlAndIsoCodeInfo) => {
			const existingProduct = existingProductSkusResponse?.products?.find(
				(existingProduct) =>
					existingProduct?.sku === initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
			);
			if (!existingProduct) return undefined;
			return existingProduct;
		})
		.filter((existingProduct) => existingProduct !== undefined);

	const filteredProducts = sanitizedInitialBaseProducts.filter(
		(initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
			!existingProducts.some(
				(existingProduct) =>
					existingProduct.sku === initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
			)
	);

	return { filteredProducts, existingProducts };
}

function processMainImageData(
	productMainImageDetectorAiResponses: any[],
	sanitizedInitialBaseProducts: any[],
	productsMetricInfo: any[]
) {
	return sanitizedInitialBaseProducts.map((initialBaseProduct, index) => {
		const mainImageHasSolidBackground =
			!productMainImageDetectorAiResponses[index].data?.hasNoWhiteBackground &&
			!productMainImageDetectorAiResponses[index].data?.fitsRejectCriteria;

		const mainImageIndex = Number(
			productMainImageDetectorAiResponses[index].data?.mainImageImageIndex ?? "0"
		);

		const mainImageUrl = initialBaseProduct.imageUrls[mainImageIndex];

		const { currencyCode, dimensionInfo, weightInfo } = productsMetricInfo[index] ?? {};

		const sanitizedDimensionInfo = getProductDimensionInfo(dimensionInfo);
		const sanitizedWeightInfo = getProductWeightInfo(weightInfo);

		return {
			...initialBaseProduct,
			mainImageUrl: mainImageHasSolidBackground ? mainImageUrl : undefined,
			currencyCode,
			...sanitizedDimensionInfo,
			...sanitizedWeightInfo,
		};
	});
}

function filterFinalProducts(initialBaseProductsWithMainImageUrlAndMetricInfo: any[]) {
	return initialBaseProductsWithMainImageUrlAndMetricInfo.filter(
		(initialBaseProductWithMainImageUrlAndMetricInfo) =>
			initialBaseProductWithMainImageUrlAndMetricInfo.mainImageUrl !== undefined &&
			initialBaseProductWithMainImageUrlAndMetricInfo.currencyCode !== undefined &&
			initialBaseProductWithMainImageUrlAndMetricInfo.dimension !== undefined &&
			initialBaseProductWithMainImageUrlAndMetricInfo.weight !== undefined
	) as Omit<BaseProduct, "category">[];
}

async function updateExistingProductPriceInfo(
	initialBaseProductsWithMainImageUrlAndIsoCodeInfo: Omit<BaseProduct, "category">[],
	existingProducts: Product[]
) {
	const existingProductsToUpdate = initialBaseProductsWithMainImageUrlAndIsoCodeInfo
		.map((initialBaseProductWithMainImageUrlAndIsoCodeInfo) => {
			const existingProduct = existingProducts?.find(
				(product) => product?.sku === initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
			);
			if (!existingProduct) return undefined;

			const productCurrencyExists = existingProduct.prices.some(
				(price) =>
					price.currencyCode === initialBaseProductWithMainImageUrlAndIsoCodeInfo.currencyCode
			);
			if (productCurrencyExists) return undefined;

			return {
				existingProduct,
				currentProduct: initialBaseProductWithMainImageUrlAndIsoCodeInfo,
			};
		})
		.filter((existingProduct) => existingProduct !== undefined);
	if (existingProductsToUpdate.length < 1) return undefined;

	const productsToUpdate = existingProductsToUpdate.map(({ existingProduct, currentProduct }) => {
		const { price, ...otherProductComputedData } = getProductComputedData(currentProduct);

		return {
			productId: existingProduct._id,
			updates: {
				prices: [...existingProduct.prices, price],
				...otherProductComputedData,
			},
		};
	});

	const { errorRecord } = await updateProductsByIdService(productsToUpdate);
	if (errorRecord)
		logProductErrorService({
			...errorRecord,
			details: [
				...(errorRecord.details ?? []),
				{
					function: "updateExistingProductPriceInfo",
					existingProducts,
					newProductsData: initialBaseProductsWithMainImageUrlAndIsoCodeInfo,
				},
			],
		});
}

export function extractProductImageUrls(productLine: string) {
	const urlPattern = /https?:\/\/[^\s,]+/g;
	const imagePattern = /\.(jpg|jpeg|png|gif|svg|webp|bmp|tiff|ico)($|\?|#)/i;
	const cdnPattern = /(images?|img|cdn|static|media|assets|photos|gallery|resize|thumb)/i;

	const matches = productLine.match(urlPattern) || [];
	const urls = matches
		.filter((url) => imagePattern.test(url) || cdnPattern.test(url))
		.map((url) => url.trim());

	return [...new Set(urls)];
}

async function getProductsMetricInfo(headerLine: string, productDataLines: string[]) {
	const productMetricInfoResponses = await Promise.all(
		productDataLines.map((line) =>
			productMetricInfoGeneratorAi({
				headerLine,
				productDataLine: line,
			})
		)
	);

	const productMetricInfo = productMetricInfoResponses.map((response) => response.data);

	return productMetricInfo;
}

function getProductDimensionInfo(dimensionInfo?: ProductDimensionInfo) {
	if (!dimensionInfo)
		return {
			dimensionUnit: "in" as const,
		};

	const mainDimensionValuesInInches = conversion.convertDimensionsToInches(
		{
			width: dimensionInfo.width,
			height: dimensionInfo.height,
			depth: dimensionInfo.depth,
		},
		dimensionInfo.dimensionUnit
	);

	const mainDimensionValuesInInchesArray: {
		value: number;
		label: "W" | "H" | "D";
	}[] = [];
	if (dimensionInfo.width)
		mainDimensionValuesInInchesArray.push({
			value: mainDimensionValuesInInches.width,
			label: "W",
		});
	if (dimensionInfo.depth)
		mainDimensionValuesInInchesArray.push({
			value: mainDimensionValuesInInches.depth,
			label: "D",
		});
	if (dimensionInfo.height)
		mainDimensionValuesInInchesArray.push({
			value: mainDimensionValuesInInches.height,
			label: "H",
		});

	const mainDimensionStringFormat =
		mainDimensionValuesInInchesArray.length > 0
			? mainDimensionValuesInInchesArray
					.map((dimension) => `${dimension.value}"${dimension.label}`)
					.join(" x ")
			: null;

	// Shipping Dimensions
	const shippingDimensionValuesInInches = conversion.convertDimensionsToInches(
		{
			width: dimensionInfo.shippingWidth ?? dimensionInfo.width,
			height: dimensionInfo.shippingHeight ?? dimensionInfo.height,
			depth: dimensionInfo.shippingDepth ?? dimensionInfo.depth,
		},
		dimensionInfo.dimensionUnit
	);

	const shippingDimensionValuesInInchesArray: {
		value: number;
		label: "W" | "H" | "D";
	}[] = [];
	if (shippingDimensionValuesInInches.width !== 0)
		shippingDimensionValuesInInchesArray.push({
			value: shippingDimensionValuesInInches.width,
			label: "W",
		});
	if (shippingDimensionValuesInInches.depth !== 0)
		shippingDimensionValuesInInchesArray.push({
			value: shippingDimensionValuesInInches.depth,
			label: "D",
		});
	if (shippingDimensionValuesInInches.height !== 0)
		shippingDimensionValuesInInchesArray.push({
			value: shippingDimensionValuesInInches.height,
			label: "H",
		});

	const shippingDimensionStringFormat =
		shippingDimensionValuesInInchesArray.length > 0
			? shippingDimensionValuesInInchesArray
					.map((dimension) => `${dimension.value}"${dimension.label}`)
					.join(" x ")
			: null;

	return {
		dimension: mainDimensionStringFormat ?? undefined,
		width: mainDimensionValuesInInches.width,
		height: mainDimensionValuesInInches.height,
		depth: mainDimensionValuesInInches.depth,
		shippingDimension: shippingDimensionStringFormat ?? undefined,
		shippingWidth: shippingDimensionValuesInInches.width,
		shippingHeight: shippingDimensionValuesInInches.height,
		shippingDepth: shippingDimensionValuesInInches.depth,
		dimensionUnit: "in" as const,
	};
}

function getProductWeightInfo(weightInfo?: ProductWeightInfo) {
	if (!weightInfo)
		return {
			weightUnit: "lb" as const,
		};

	// Main Weight
	const mainWeightValuesInLbs = conversion.convertWeightToLbs(
		weightInfo.weight,
		weightInfo.weightUnit
	);

	// Shipping Weight
	const shippingWeightValuesInLbs = conversion.convertWeightToLbs(
		weightInfo.shippingWeight ?? weightInfo.weight,
		weightInfo.weightUnit
	);

	return {
		weight: mainWeightValuesInLbs.weight,
		shippingWeight: shippingWeightValuesInLbs.weight,
		weightUnit: "lb" as const,
	};
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
		mainImageUrls.map((mainImageUrl) => productImageEmbeddingGeneratorAi(mainImageUrl))
	);

	return productImageEmbeddingResponses.map((response) => ({
		imageEmbedding: response.data,
	}));
}

export function getProductComputedData(baseProductWithNoCategory: Omit<BaseProduct, "category">) {
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

	const hasCAD = price.currencyCode === "CAD";
	const hasUSD = price.currencyCode === "USD";
	const retailPriceCAD = price.currencyCode === "CAD" ? price.retailPrice : undefined;
	const retailPriceUSD = price.currencyCode === "USD" ? price.retailPrice : undefined;

	const stockQtyUSD = price.currencyCode === "USD" ? baseProductWithNoCategory.stockQty : 0;
	const stockQtyCAD = price.currencyCode === "CAD" ? baseProductWithNoCategory.stockQty : 0;
	const restockDateUSD =
		price.currencyCode === "USD" ? baseProductWithNoCategory.restockDate : undefined;
	const restockDateCAD =
		price.currencyCode === "CAD" ? baseProductWithNoCategory.restockDate : undefined;

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
