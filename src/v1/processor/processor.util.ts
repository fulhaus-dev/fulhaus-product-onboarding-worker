// import conversion from "@worker/utils/conversion.js";
// import { productImageEmbeddingGeneratorAi } from "@worker/v1/ai/ai.product-image-embedding-generator.js";
// import productMainImageDetectorAi from "@worker/v1/ai/ai.product-main-image-detector.js";
// import productMetricInfoGeneratorAi from "@worker/v1/ai/ai.product-metric-info-generator.js";
// import productStyleInfoGeneratorAi from "@worker/v1/ai/ai.product-style-info-generator.js";
// import {
// 	FLAT_FILE_EXTS_TO_PROCESS,
// 	SPREADSHEET_FILE_EXTS_TO_PROCESS,
// 	ZIP_FILE_EXTS_TO_PROCESS,
// } from "@worker/v1/processor/processor.constant.js";
// import type { FileConfig } from "@worker/v1/processor/processor.type.js";
// import {
// 	getProductsBySkusService,
// 	logProductErrorService,
// 	updateProductsByIdService,
// } from "@worker/v1/product/product.service.js";
// import type {
// 	BaseProduct,
// 	Product,
// 	ProductDimensionInfo,
// 	ProductStyleInfo,
// 	ProductWeightInfo,
// } from "@worker/v1/product/product.type.js";
// import { wayfairProductLineContainsGroupId } from "@worker/wayfair/wayfair.util.js";

// export function getVendorProductDataFileKeysThatCanBeProcessed(keys: string[]) {
// 	const flatFileKeys = keys.filter((key) =>
// 		FLAT_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
// 	);

// 	const spreadsheetFileKeys = keys.filter((key) =>
// 		SPREADSHEET_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
// 	);

// 	const zipFileKeys = keys.filter((key) =>
// 		ZIP_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
// 	);

// 	return {
// 		flatFileKeys,
// 		spreadsheetFileKeys,
// 		zipFileKeys,
// 	};
// }

// function getProductHeadersAndContents(productDataLines: string[], fileConfig: FileConfig) {
// 	const mainLineExtractDelimiter = "<<::|::>>";

// 	const headers = fileConfig.headerLine.split(fileConfig.delimiter);

// 	const contents = productDataLines
// 		.join(mainLineExtractDelimiter)
// 		.replace(fileConfig.headerLine, "")
// 		.split(mainLineExtractDelimiter)
// 		.filter(Boolean);

// 	return {
// 		headers,
// 		contents,
// 	};
// }

// export async function getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
// 	productDataLines: string[],
// 	fileConfig: FileConfig
// ) {
// 	const validProductDataLines = productDataLines.filter((line) =>
// 		wayfairProductLineContainsGroupId(line)
// 	);
// 	if (validProductDataLines.length < 1) return [];

// 	const { headers, contents } = getProductHeadersAndContents(validProductDataLines, fileConfig);

// 	const initialBaseProducts: (
// 		| Omit<
// 				BaseProduct,
// 				| "mainImageUrl"
// 				| "category"
// 				| "currencyCode"
// 				| "dimension"
// 				| "shippingDimension"
// 				| "dimensionUnit"
// 				| "weightUnit"
// 		  >
// 		| undefined
// 	)[] = contents.map((row) => {
// 		const values = row.split(fileConfig.delimiter);
// 		const dataObj = Object.fromEntries(headers.map((h, i) => [h, values[i]]));

// 		const map = fileConfig.map.map ? parseFloat(dataObj[fileConfig.map.map]) : NaN;

// 		const msrp = fileConfig.map.msrp ? parseFloat(dataObj[fileConfig.map.msrp]) : NaN;

// 		const shippingPrice = fileConfig.map.shippingPrice
// 			? parseFloat(dataObj[fileConfig.map.shippingPrice])
// 			: NaN;

// 		const unitPerBox = parseInt(dataObj[fileConfig.map.unitPerBox ?? "1"]);

// 		const imageUrls = extractProductImageUrls(row);

// 		const stockQty = parseInt(dataObj[fileConfig.map.stockQty ?? "0"]);
// 		const restockDate = fileConfig.map.restockDate
// 			? new Date(dataObj[fileConfig.map.restockDate])
// 			: undefined;
// 		if (!restockDate && stockQty < 1) return undefined;

// 		const tradePrice = parseFloat(dataObj[fileConfig.map.tradePrice]);
// 		if (!tradePrice) return undefined;

// 		const sku = dataObj[fileConfig.map.sku];
// 		if (!sku) return undefined;

// 		const res = {
// 			line: row,
// 			sku,
// 			itemId: dataObj[fileConfig.map.itemId ?? "NA"],
// 			gtin: dataObj[fileConfig.map.gtin ?? "NA"],
// 			mpn: dataObj[fileConfig.map.mpn ?? "NA"],
// 			brand: dataObj[fileConfig.map.brand ?? "NA"],
// 			name: dataObj[fileConfig.map.name],
// 			description: dataObj[fileConfig.map.description],
// 			pdpLink: dataObj[fileConfig.map.pdpLink ?? "NA"],
// 			tradePrice,
// 			map: isNaN(map) ? undefined : map <= 0 ? undefined : map,
// 			msrp: isNaN(msrp) ? undefined : msrp <= 0 ? undefined : msrp,
// 			shippingPrice: isNaN(shippingPrice)
// 				? undefined
// 				: shippingPrice <= 0
// 					? undefined
// 					: shippingPrice,
// 			unitPerBox: isNaN(unitPerBox) ? 1 : unitPerBox < 1 ? 1 : unitPerBox,
// 			stockQty,
// 			restockDate,
// 			imageUrls,
// 		};

// 		return res;
// 	});

// 	let sanitizedInitialBaseProducts = initialBaseProducts.filter(
// 		(sanitizedInitialBaseProduct) => !!sanitizedInitialBaseProduct
// 	);
// 	if (sanitizedInitialBaseProducts.length < 1) return [];

// 	const currentSkus = sanitizedInitialBaseProducts.map(
// 		(sanitizedInitialBaseProduct) => sanitizedInitialBaseProduct.sku
// 	);

// 	const { data: existingProductSkusResponse } = await getProductsBySkusService(currentSkus);

// 	const existingProducts = sanitizedInitialBaseProducts
// 		.map((initialBaseProductWithMainImageUrlAndIsoCodeInfo) => {
// 			const existingProduct = existingProductSkusResponse?.products?.find(
// 				(existingProduct) =>
// 					existingProduct?.sku === initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
// 			);
// 			if (!existingProduct) return;

// 			return existingProduct;
// 		})
// 		.filter((existingProduct) => existingProduct !== undefined);

// 	sanitizedInitialBaseProducts = sanitizedInitialBaseProducts.filter(
// 		(initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
// 			!existingProducts.some(
// 				(existingProduct) =>
// 					existingProduct.sku === initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
// 			)
// 	);
// 	if (sanitizedInitialBaseProducts.length < 1) return [];

// 	const [productMainImageDetectorAiResponses, productsMetricInfo] = await Promise.all([
// 		Promise.all(
// 			sanitizedInitialBaseProducts.map((initialBaseProduct) =>
// 				productMainImageDetectorAi(initialBaseProduct.imageUrls, initialBaseProduct.name)
// 			)
// 		),
// 		getProductsMetricInfo(fileConfig.headerLine, productDataLines),
// 	]);

// 	const initialBaseProductsWithMainImageUrlAndMetricInfo = sanitizedInitialBaseProducts.map(
// 		(initialBaseProduct, index) => {
// 			const mainImageHasSolidBackground =
// 				!productMainImageDetectorAiResponses[index].data?.hasNoWhiteBackground &&
// 				!productMainImageDetectorAiResponses[index].data?.fitsRejectCriteria;

// 			const mainImageIndex = Number(
// 				productMainImageDetectorAiResponses[index].data?.mainImageImageIndex ?? "0"
// 			);

// 			const mainImageUrl = initialBaseProduct.imageUrls[mainImageIndex];

// 			const { currencyCode, dimensionInfo, weightInfo } = productsMetricInfo[index] ?? {};

// 			const sanitizedDimensionInfo = getProductDimensionInfo(dimensionInfo);
// 			const sanitizedWeightInfo = getProductWeightInfo(weightInfo);

// 			return {
// 				...initialBaseProduct,
// 				mainImageUrl: mainImageHasSolidBackground ? mainImageUrl : undefined,
// 				currencyCode,
// 				...sanitizedDimensionInfo,
// 				...sanitizedWeightInfo,
// 			};
// 		}
// 	);

// 	const finalInitialBaseProductsWithMainImageUrlAndMetricInfo =
// 		initialBaseProductsWithMainImageUrlAndMetricInfo.filter(
// 			(initialBaseProductWithMainImageUrlAndMetricInfo) =>
// 				initialBaseProductWithMainImageUrlAndMetricInfo.mainImageUrl !== undefined &&
// 				initialBaseProductWithMainImageUrlAndMetricInfo.currencyCode !== undefined &&
// 				initialBaseProductWithMainImageUrlAndMetricInfo.dimension !== undefined &&
// 				initialBaseProductWithMainImageUrlAndMetricInfo.weight !== undefined
// 		) as Omit<BaseProduct, "category">[];

// 	if (existingProducts.length < 1)
// 		updateExistingProductPriceInfo(
// 			finalInitialBaseProductsWithMainImageUrlAndMetricInfo,
// 			existingProducts
// 		);

// 	return finalInitialBaseProductsWithMainImageUrlAndMetricInfo;
// }

// async function updateExistingProductPriceInfo(
// 	initialBaseProductsWithMainImageUrlAndIsoCodeInfo: Omit<BaseProduct, "category">[],
// 	existingProducts: Product[]
// ) {
// 	const existingProductsToUpdate = initialBaseProductsWithMainImageUrlAndIsoCodeInfo
// 		.map((initialBaseProductWithMainImageUrlAndIsoCodeInfo) => {
// 			const existingProduct = existingProducts?.find(
// 				(product) => product?.sku === initialBaseProductWithMainImageUrlAndIsoCodeInfo.sku
// 			);
// 			if (!existingProduct) return;

// 			const productCurrencyExists = existingProduct.prices.some(
// 				(price) =>
// 					price.currencyCode === initialBaseProductWithMainImageUrlAndIsoCodeInfo.currencyCode
// 			);
// 			if (productCurrencyExists) return;

// 			return {
// 				existingProduct,
// 				currentProduct: initialBaseProductWithMainImageUrlAndIsoCodeInfo,
// 			};
// 		})
// 		.filter((existingProduct) => existingProduct !== undefined);
// 	if (existingProductsToUpdate.length < 1) return;

// 	const productsToUpdate = existingProductsToUpdate.map(({ existingProduct, currentProduct }) => {
// 		const { price, ...otherProductComputedData } = getProductComputedData(currentProduct);

// 		return {
// 			productId: existingProduct._id,
// 			updates: {
// 				prices: [...existingProduct.prices, price],
// 				...otherProductComputedData,
// 			},
// 		};
// 	});

// 	const { errorRecord } = await updateProductsByIdService(productsToUpdate);
// 	if (errorRecord)
// 		logProductErrorService({
// 			...errorRecord,
// 			details: [
// 				...(errorRecord.details ?? []),
// 				{
// 					function: "updateExistingProductPriceInfo",
// 					existingProducts,
// 					newProductsData: initialBaseProductsWithMainImageUrlAndIsoCodeInfo,
// 				},
// 			],
// 		});
// }

// export function extractProductImageUrls(productLine: string) {
// 	const urlPattern = /https?:\/\/[^\s,]+/g;
// 	const imagePattern = /\.(jpg|jpeg|png|gif|svg|webp|bmp|tiff|ico)($|\?|#)/i;
// 	const cdnPattern = /(images?|img|cdn|static|media|assets|photos|gallery|resize|thumb)/i;

// 	const matches = productLine.match(urlPattern) || [];
// 	const urls = matches
// 		.filter((url) => imagePattern.test(url) || cdnPattern.test(url))
// 		.map((url) => url.trim());

// 	return [...new Set(urls)];
// }

// async function getProductsMetricInfo(headerLine: string, productDataLines: string[]) {
// 	const productMetricInfoResponses = await Promise.all(
// 		productDataLines.map((line) =>
// 			productMetricInfoGeneratorAi({
// 				headerLine,
// 				productDataLine: line,
// 			})
// 		)
// 	);

// 	const productMetricInfo = productMetricInfoResponses.map((response) => response.data);

// 	return productMetricInfo;
// }

// function getProductDimensionInfo(dimensionInfo?: ProductDimensionInfo) {
// 	if (!dimensionInfo)
// 		return {
// 			dimensionUnit: "in" as const,
// 		};

// 	const mainDimensionValuesInInches = conversion.convertDimensionsToInches(
// 		{
// 			width: dimensionInfo.width,
// 			height: dimensionInfo.height,
// 			depth: dimensionInfo.depth,
// 		},
// 		dimensionInfo.dimensionUnit
// 	);

// 	const mainDimensionValuesInInchesArray: {
// 		value: number;
// 		label: "W" | "H" | "D";
// 	}[] = [];
// 	if (dimensionInfo.width)
// 		mainDimensionValuesInInchesArray.push({
// 			value: mainDimensionValuesInInches.width,
// 			label: "W",
// 		});
// 	if (dimensionInfo.depth)
// 		mainDimensionValuesInInchesArray.push({
// 			value: mainDimensionValuesInInches.depth,
// 			label: "D",
// 		});
// 	if (dimensionInfo.height)
// 		mainDimensionValuesInInchesArray.push({
// 			value: mainDimensionValuesInInches.height,
// 			label: "H",
// 		});

// 	const mainDimensionStringFormat =
// 		mainDimensionValuesInInchesArray.length > 0
// 			? mainDimensionValuesInInchesArray
// 					.map((dimension) => `${dimension.value}"${dimension.label}`)
// 					.join(" x ")
// 			: null;

// 	// Shipping Dimensions
// 	const shippingDimensionValuesInInches = conversion.convertDimensionsToInches(
// 		{
// 			width: dimensionInfo.shippingWidth ?? dimensionInfo.width,
// 			height: dimensionInfo.shippingHeight ?? dimensionInfo.height,
// 			depth: dimensionInfo.shippingDepth ?? dimensionInfo.depth,
// 		},
// 		dimensionInfo.dimensionUnit
// 	);

// 	const shippingDimensionValuesInInchesArray: {
// 		value: number;
// 		label: "W" | "H" | "D";
// 	}[] = [];
// 	if (shippingDimensionValuesInInches.width !== 0)
// 		shippingDimensionValuesInInchesArray.push({
// 			value: shippingDimensionValuesInInches.width,
// 			label: "W",
// 		});
// 	if (shippingDimensionValuesInInches.depth !== 0)
// 		shippingDimensionValuesInInchesArray.push({
// 			value: shippingDimensionValuesInInches.depth,
// 			label: "D",
// 		});
// 	if (shippingDimensionValuesInInches.height !== 0)
// 		shippingDimensionValuesInInchesArray.push({
// 			value: shippingDimensionValuesInInches.height,
// 			label: "H",
// 		});

// 	const shippingDimensionStringFormat =
// 		shippingDimensionValuesInInchesArray.length > 0
// 			? shippingDimensionValuesInInchesArray
// 					.map((dimension) => `${dimension.value}"${dimension.label}`)
// 					.join(" x ")
// 			: null;

// 	return {
// 		dimension: mainDimensionStringFormat ?? undefined,
// 		width: mainDimensionValuesInInches.width,
// 		height: mainDimensionValuesInInches.height,
// 		depth: mainDimensionValuesInInches.depth,
// 		shippingDimension: shippingDimensionStringFormat ?? undefined,
// 		shippingWidth: shippingDimensionValuesInInches.width,
// 		shippingHeight: shippingDimensionValuesInInches.height,
// 		shippingDepth: shippingDimensionValuesInInches.depth,
// 		dimensionUnit: "in" as const,
// 	};
// }

// function getProductWeightInfo(weightInfo?: ProductWeightInfo) {
// 	if (!weightInfo)
// 		return {
// 			weightUnit: "lb" as const,
// 		};

// 	// Main Weight
// 	const mainWeightValuesInLbs = conversion.convertWeightToLbs(
// 		weightInfo.weight,
// 		weightInfo.weightUnit
// 	);

// 	// Shipping Weight
// 	const shippingWeightValuesInLbs = conversion.convertWeightToLbs(
// 		weightInfo.shippingWeight ?? weightInfo.weight,
// 		weightInfo.weightUnit
// 	);

// 	return {
// 		weight: mainWeightValuesInLbs.weight,
// 		shippingWeight: shippingWeightValuesInLbs.weight,
// 		weightUnit: "lb" as const,
// 	};
// }

// export async function getProductsStyleInfo(
// 	headerLine: string,
// 	info: {
// 		line: string;
// 		mainImageUrl: string;
// 	}[]
// ) {
// 	const productStyleInfoResponses = await Promise.all(
// 		info.map(({ line, mainImageUrl }) =>
// 			productStyleInfoGeneratorAi({
// 				headerLine,
// 				productDataLine: line,
// 				mainImageUrl,
// 			})
// 		)
// 	);

// 	const productsStyleInfo: ProductStyleInfo[] = productStyleInfoResponses.map(
// 		(response) =>
// 			response.data ?? {
// 				colorNames: [],
// 				hexColors: [],
// 				materials: [],
// 				styles: [],
// 			}
// 	);

// 	return productsStyleInfo;
// }

// export async function getProductsImageEmbedding(mainImageUrls: string[]) {
// 	const productImageEmbeddingResponses = await Promise.all(
// 		mainImageUrls.map((mainImageUrl) => productImageEmbeddingGeneratorAi(mainImageUrl))
// 	);

// 	return productImageEmbeddingResponses.map((response) => ({
// 		imageEmbedding: response.data,
// 	}));
// }

// export function getProductComputedData(baseProductWithNoCategory: Omit<BaseProduct, "category">) {
// 	const retailPrice =
// 		baseProductWithNoCategory.msrp ??
// 		baseProductWithNoCategory.map ??
// 		baseProductWithNoCategory.tradePrice * 2;

// 	const price = {
// 		currencyCode: baseProductWithNoCategory.currencyCode,
// 		retailPrice,
// 		msrp: baseProductWithNoCategory.msrp,
// 		map: baseProductWithNoCategory.map,
// 		tradePrice: baseProductWithNoCategory.tradePrice,
// 		shippingPrice: baseProductWithNoCategory.shippingPrice,
// 	};

// 	const hasCAD = price.currencyCode === "CAD";
// 	const hasUSD = price.currencyCode === "USD";
// 	const retailPriceCAD = price.currencyCode === "CAD" ? price.retailPrice : undefined;
// 	const retailPriceUSD = price.currencyCode === "USD" ? price.retailPrice : undefined;

// 	const stockQtyUSD = price.currencyCode === "USD" ? baseProductWithNoCategory.stockQty : 0;
// 	const stockQtyCAD = price.currencyCode === "CAD" ? baseProductWithNoCategory.stockQty : 0;
// 	const restockDateUSD =
// 		price.currencyCode === "USD" ? baseProductWithNoCategory.restockDate : undefined;
// 	const restockDateCAD =
// 		price.currencyCode === "CAD" ? baseProductWithNoCategory.restockDate : undefined;

// 	return {
// 		price,
// 		hasCAD,
// 		hasUSD,
// 		retailPriceCAD,
// 		retailPriceUSD,
// 		stockQtyUSD,
// 		stockQtyCAD,
// 		restockDateUSD,
// 		restockDateCAD,
// 		retailPrice: undefined,
// 		msrp: undefined,
// 		map: undefined,
// 		tradePrice: undefined,
// 		shippingPrice: undefined,
// 		stockQty: undefined,
// 		restockDate: undefined,
// 		currencyCode: undefined,
// 	};
// }

// import conversion from "@worker/utils/conversion.js";
// import { productImageEmbeddingGeneratorAi } from "@worker/v1/ai/ai.product-image-embedding-generator.js";
// import productMainImageDetectorAi from "@worker/v1/ai/ai.product-main-image-detector.js";
// import productMetricInfoGeneratorAi from "@worker/v1/ai/ai.product-metric-info-generator.js";
// import productStyleInfoGeneratorAi from "@worker/v1/ai/ai.product-style-info-generator.js";
// import {
// 	FLAT_FILE_EXTS_TO_PROCESS,
// 	SPREADSHEET_FILE_EXTS_TO_PROCESS,
// 	ZIP_FILE_EXTS_TO_PROCESS,
// } from "@worker/v1/processor/processor.constant.js";
// import type { FileConfig } from "@worker/v1/processor/processor.type.js";
// import {
// 	getProductsBySkusService,
// 	logProductErrorService,
// 	updateProductsByIdService,
// } from "@worker/v1/product/product.service.js";
// import type {
// 	BaseProduct,
// 	Product,
// 	ProductDimensionInfo,
// 	ProductStyleInfo,
// 	ProductWeightInfo,
// } from "@worker/v1/product/product.type.js";
// import { wayfairProductLineContainsGroupId } from "@worker/wayfair/wayfair.util.js";

// export function getVendorProductDataFileKeysThatCanBeProcessed(keys: string[]) {
// 	const flatFileKeys = keys.filter((key) =>
// 		FLAT_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
// 	);

// 	const spreadsheetFileKeys = keys.filter((key) =>
// 		SPREADSHEET_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
// 	);

// 	const zipFileKeys = keys.filter((key) =>
// 		ZIP_FILE_EXTS_TO_PROCESS.some((ext) => key.endsWith(ext))
// 	);

// 	return {
// 		flatFileKeys,
// 		spreadsheetFileKeys,
// 		zipFileKeys,
// 	};
// }

// function getProductHeadersAndContents(productDataLines: string[], fileConfig: FileConfig) {
// 	const mainLineExtractDelimiter = "<<::|::>>";

// 	const headers = fileConfig.headerLine.split(fileConfig.delimiter);

// 	const contents = productDataLines
// 		.join(mainLineExtractDelimiter)
// 		.replace(fileConfig.headerLine, "")
// 		.split(mainLineExtractDelimiter)
// 		.filter(Boolean);

// 	return {
// 		headers,
// 		contents,
// 	};
// }

// export async function getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(
// 	productDataLines: string[],
// 	fileConfig: FileConfig
// ) {
// 	const validProductDataLines = productDataLines.filter((line) =>
// 		wayfairProductLineContainsGroupId(line)
// 	);
// 	if (validProductDataLines.length < 1) return [];

// 	const { headers, contents } = getProductHeadersAndContents(validProductDataLines, fileConfig);

// 	// OPTIMIZATION: Single pass to create initial products - O(n)
// 	const initialBaseProducts: (
// 		| Omit<
// 				BaseProduct,
// 				| "mainImageUrl"
// 				| "category"
// 				| "currencyCode"
// 				| "dimension"
// 				| "shippingDimension"
// 				| "dimensionUnit"
// 				| "weightUnit"
// 		  >
// 		| undefined
// 	)[] = contents.map((row) => {
// 		const values = row.split(fileConfig.delimiter);
// 		const dataObj = Object.fromEntries(headers.map((h, i) => [h, values[i]]));

// 		const map = fileConfig.map.map ? parseFloat(dataObj[fileConfig.map.map]) : NaN;

// 		const msrp = fileConfig.map.msrp ? parseFloat(dataObj[fileConfig.map.msrp]) : NaN;

// 		const shippingPrice = fileConfig.map.shippingPrice
// 			? parseFloat(dataObj[fileConfig.map.shippingPrice])
// 			: NaN;

// 		const unitPerBox = parseInt(dataObj[fileConfig.map.unitPerBox ?? "1"]);

// 		const imageUrls = extractProductImageUrls(row);

// 		const stockQty = parseInt(dataObj[fileConfig.map.stockQty ?? "0"]);
// 		const restockDate = fileConfig.map.restockDate
// 			? new Date(dataObj[fileConfig.map.restockDate])
// 			: undefined;
// 		if (!restockDate && stockQty < 1) return undefined;

// 		const tradePrice = parseFloat(dataObj[fileConfig.map.tradePrice]);
// 		if (!tradePrice) return undefined;

// 		const sku = dataObj[fileConfig.map.sku];
// 		if (!sku) return undefined;

// 		const res = {
// 			line: row,
// 			sku,
// 			itemId: dataObj[fileConfig.map.itemId ?? "NA"],
// 			gtin: dataObj[fileConfig.map.gtin ?? "NA"],
// 			mpn: dataObj[fileConfig.map.mpn ?? "NA"],
// 			brand: dataObj[fileConfig.map.brand ?? "NA"],
// 			name: dataObj[fileConfig.map.name],
// 			description: dataObj[fileConfig.map.description],
// 			pdpLink: dataObj[fileConfig.map.pdpLink ?? "NA"],
// 			tradePrice,
// 			map: isNaN(map) ? undefined : map <= 0 ? undefined : map,
// 			msrp: isNaN(msrp) ? undefined : msrp <= 0 ? undefined : msrp,
// 			shippingPrice: isNaN(shippingPrice)
// 				? undefined
// 				: shippingPrice <= 0
// 					? undefined
// 					: shippingPrice,
// 			unitPerBox: isNaN(unitPerBox) ? 1 : unitPerBox < 1 ? 1 : unitPerBox,
// 			stockQty,
// 			restockDate,
// 			imageUrls,
// 		};

// 		return res;
// 	});

// 	// OPTIMIZATION: Filter once - O(n)
// 	let sanitizedInitialBaseProducts = initialBaseProducts.filter(
// 		(sanitizedInitialBaseProduct) => !!sanitizedInitialBaseProduct
// 	);
// 	if (sanitizedInitialBaseProducts.length < 1) return [];

// 	const currentSkus = sanitizedInitialBaseProducts.map(
// 		(sanitizedInitialBaseProduct) => sanitizedInitialBaseProduct.sku
// 	);

// 	const { data: existingProductSkusResponse } = await getProductsBySkusService(currentSkus);

// 	// OPTIMIZATION: Create Map for O(1) lookups instead of O(n) finds - O(n) space, O(1) lookup
// 	const existingProductsBySkuMap = new Map<string, Product>();
// 	if (existingProductSkusResponse?.products) {
// 		for (const product of existingProductSkusResponse.products) {
// 			if (product?.sku) {
// 				existingProductsBySkuMap.set(product.sku, product);
// 			}
// 		}
// 	}

// 	// OPTIMIZATION: Single pass to extract existing products and filter - O(n)
// 	const existingProducts: Product[] = [];
// 	const newProducts = [];

// 	for (const initialBaseProduct of sanitizedInitialBaseProducts) {
// 		const existingProduct = existingProductsBySkuMap.get(initialBaseProduct.sku);

// 		if (existingProduct) {
// 			existingProducts.push(existingProduct);
// 		} else {
// 			newProducts.push(initialBaseProduct);
// 		}
// 	}

// 	sanitizedInitialBaseProducts = newProducts;
// 	if (sanitizedInitialBaseProducts.length < 1) return [];

// 	// Parallel execution of AI calls - maintain existing behavior
// 	const [productMainImageDetectorAiResponses, productsMetricInfo] = await Promise.all([
// 		Promise.all(
// 			sanitizedInitialBaseProducts.map((initialBaseProduct) =>
// 				productMainImageDetectorAi(initialBaseProduct.imageUrls, initialBaseProduct.name)
// 			)
// 		),
// 		getProductsMetricInfo(fileConfig.headerLine, productDataLines),
// 	]);

// 	// OPTIMIZATION: Single pass to combine data - O(n)
// 	const initialBaseProductsWithMainImageUrlAndMetricInfo = sanitizedInitialBaseProducts.map(
// 		(initialBaseProduct, index) => {
// 			const mainImageHasSolidBackground =
// 				!productMainImageDetectorAiResponses[index].data?.hasNoWhiteBackground &&
// 				!productMainImageDetectorAiResponses[index].data?.fitsRejectCriteria;

// 			const mainImageIndex = Number(
// 				productMainImageDetectorAiResponses[index].data?.mainImageImageIndex ?? "0"
// 			);

// 			const mainImageUrl = initialBaseProduct.imageUrls[mainImageIndex];

// 			const { currencyCode, dimensionInfo, weightInfo } = productsMetricInfo[index] ?? {};

// 			const sanitizedDimensionInfo = getProductDimensionInfo(dimensionInfo);
// 			const sanitizedWeightInfo = getProductWeightInfo(weightInfo);

// 			return {
// 				...initialBaseProduct,
// 				mainImageUrl: mainImageHasSolidBackground ? mainImageUrl : undefined,
// 				currencyCode,
// 				...sanitizedDimensionInfo,
// 				...sanitizedWeightInfo,
// 			};
// 		}
// 	);

// 	// Final filter - O(n)
// 	const finalInitialBaseProductsWithMainImageUrlAndMetricInfo =
// 		initialBaseProductsWithMainImageUrlAndMetricInfo.filter(
// 			(initialBaseProductWithMainImageUrlAndMetricInfo) =>
// 				initialBaseProductWithMainImageUrlAndMetricInfo.mainImageUrl !== undefined &&
// 				initialBaseProductWithMainImageUrlAndMetricInfo.currencyCode !== undefined &&
// 				initialBaseProductWithMainImageUrlAndMetricInfo.dimension !== undefined &&
// 				initialBaseProductWithMainImageUrlAndMetricInfo.weight !== undefined
// 		) as Omit<BaseProduct, "category">[];

// 	// Bug fix: Changed < to > to correctly check if there are existing products
// 	if (existingProducts.length > 0) {
// 		await updateExistingProductPriceInfo(
// 			finalInitialBaseProductsWithMainImageUrlAndMetricInfo,
// 			existingProducts
// 		);
// 	}

// 	return finalInitialBaseProductsWithMainImageUrlAndMetricInfo;
// }

// async function updateExistingProductPriceInfo(
// 	initialBaseProductsWithMainImageUrlAndIsoCodeInfo: Omit<BaseProduct, "category">[],
// 	existingProducts: Product[]
// ) {
// 	// OPTIMIZATION: Create Map for O(1) lookups - O(n) space, O(1) lookup
// 	const existingProductsBySku = new Map<string, Product>();
// 	for (const product of existingProducts) {
// 		if (product?.sku) {
// 			existingProductsBySku.set(product.sku, product);
// 		}
// 	}

// 	// OPTIMIZATION: Single pass with Map lookup instead of nested find - O(n) instead of O(n²)
// 	const existingProductsToUpdate = [];

// 	for (const initialBaseProduct of initialBaseProductsWithMainImageUrlAndIsoCodeInfo) {
// 		const existingProduct = existingProductsBySku.get(initialBaseProduct.sku);

// 		if (!existingProduct) continue;

// 		const productCurrencyExists = existingProduct.prices.some(
// 			(price) => price.currencyCode === initialBaseProduct.currencyCode
// 		);

// 		if (productCurrencyExists) continue;

// 		existingProductsToUpdate.push({
// 			existingProduct,
// 			currentProduct: initialBaseProduct,
// 		});
// 	}

// 	if (existingProductsToUpdate.length < 1) return;

// 	// Single pass to create updates - O(n)
// 	const productsToUpdate = existingProductsToUpdate.map(({ existingProduct, currentProduct }) => {
// 		const { price, ...otherProductComputedData } = getProductComputedData(currentProduct);

// 		return {
// 			productId: existingProduct._id,
// 			updates: {
// 				prices: [...existingProduct.prices, price],
// 				...otherProductComputedData,
// 			},
// 		};
// 	});

// 	const { errorRecord } = await updateProductsByIdService(productsToUpdate);
// 	if (errorRecord)
// 		logProductErrorService({
// 			...errorRecord,
// 			details: [
// 				...(errorRecord.details ?? []),
// 				{
// 					function: "updateExistingProductPriceInfo",
// 					existingProducts,
// 					newProductsData: initialBaseProductsWithMainImageUrlAndIsoCodeInfo,
// 				},
// 			],
// 		});
// }

// export function extractProductImageUrls(productLine: string) {
// 	const urlPattern = /https?:\/\/[^\s,]+/g;
// 	const imagePattern = /\.(jpg|jpeg|png|gif|svg|webp|bmp|tiff|ico)($|\?|#)/i;
// 	const cdnPattern = /(images?|img|cdn|static|media|assets|photos|gallery|resize|thumb)/i;

// 	const matches = productLine.match(urlPattern) || [];
// 	const urls = matches
// 		.filter((url) => imagePattern.test(url) || cdnPattern.test(url))
// 		.map((url) => url.trim());

// 	return [...new Set(urls)];
// }

// async function getProductsMetricInfo(headerLine: string, productDataLines: string[]) {
// 	const productMetricInfoResponses = await Promise.all(
// 		productDataLines.map((line) =>
// 			productMetricInfoGeneratorAi({
// 				headerLine,
// 				productDataLine: line,
// 			})
// 		)
// 	);

// 	const productMetricInfo = productMetricInfoResponses.map((response) => response.data);

// 	return productMetricInfo;
// }

// function getProductDimensionInfo(dimensionInfo?: ProductDimensionInfo) {
// 	if (!dimensionInfo)
// 		return {
// 			dimensionUnit: "in" as const,
// 		};

// 	const mainDimensionValuesInInches = conversion.convertDimensionsToInches(
// 		{
// 			width: dimensionInfo.width,
// 			height: dimensionInfo.height,
// 			depth: dimensionInfo.depth,
// 		},
// 		dimensionInfo.dimensionUnit
// 	);

// 	const mainDimensionValuesInInchesArray: {
// 		value: number;
// 		label: "W" | "H" | "D";
// 	}[] = [];
// 	if (dimensionInfo.width)
// 		mainDimensionValuesInInchesArray.push({
// 			value: mainDimensionValuesInInches.width,
// 			label: "W",
// 		});
// 	if (dimensionInfo.depth)
// 		mainDimensionValuesInInchesArray.push({
// 			value: mainDimensionValuesInInches.depth,
// 			label: "D",
// 		});
// 	if (dimensionInfo.height)
// 		mainDimensionValuesInInchesArray.push({
// 			value: mainDimensionValuesInInches.height,
// 			label: "H",
// 		});

// 	const mainDimensionStringFormat =
// 		mainDimensionValuesInInchesArray.length > 0
// 			? mainDimensionValuesInInchesArray
// 					.map((dimension) => `${dimension.value}"${dimension.label}`)
// 					.join(" x ")
// 			: null;

// 	// Shipping Dimensions
// 	const shippingDimensionValuesInInches = conversion.convertDimensionsToInches(
// 		{
// 			width: dimensionInfo.shippingWidth ?? dimensionInfo.width,
// 			height: dimensionInfo.shippingHeight ?? dimensionInfo.height,
// 			depth: dimensionInfo.shippingDepth ?? dimensionInfo.depth,
// 		},
// 		dimensionInfo.dimensionUnit
// 	);

// 	const shippingDimensionValuesInInchesArray: {
// 		value: number;
// 		label: "W" | "H" | "D";
// 	}[] = [];
// 	if (shippingDimensionValuesInInches.width !== 0)
// 		shippingDimensionValuesInInchesArray.push({
// 			value: shippingDimensionValuesInInches.width,
// 			label: "W",
// 		});
// 	if (shippingDimensionValuesInInches.depth !== 0)
// 		shippingDimensionValuesInInchesArray.push({
// 			value: shippingDimensionValuesInInches.depth,
// 			label: "D",
// 		});
// 	if (shippingDimensionValuesInInches.height !== 0)
// 		shippingDimensionValuesInInchesArray.push({
// 			value: shippingDimensionValuesInInches.height,
// 			label: "H",
// 		});

// 	const shippingDimensionStringFormat =
// 		shippingDimensionValuesInInchesArray.length > 0
// 			? shippingDimensionValuesInInchesArray
// 					.map((dimension) => `${dimension.value}"${dimension.label}`)
// 					.join(" x ")
// 			: null;

// 	return {
// 		dimension: mainDimensionStringFormat ?? undefined,
// 		width: mainDimensionValuesInInches.width,
// 		height: mainDimensionValuesInInches.height,
// 		depth: mainDimensionValuesInInches.depth,
// 		shippingDimension: shippingDimensionStringFormat ?? undefined,
// 		shippingWidth: shippingDimensionValuesInInches.width,
// 		shippingHeight: shippingDimensionValuesInInches.height,
// 		shippingDepth: shippingDimensionValuesInInches.depth,
// 		dimensionUnit: "in" as const,
// 	};
// }

// function getProductWeightInfo(weightInfo?: ProductWeightInfo) {
// 	if (!weightInfo)
// 		return {
// 			weightUnit: "lb" as const,
// 		};

// 	// Main Weight
// 	const mainWeightValuesInLbs = conversion.convertWeightToLbs(
// 		weightInfo.weight,
// 		weightInfo.weightUnit
// 	);

// 	// Shipping Weight
// 	const shippingWeightValuesInLbs = conversion.convertWeightToLbs(
// 		weightInfo.shippingWeight ?? weightInfo.weight,
// 		weightInfo.weightUnit
// 	);

// 	return {
// 		weight: mainWeightValuesInLbs.weight,
// 		shippingWeight: shippingWeightValuesInLbs.weight,
// 		weightUnit: "lb" as const,
// 	};
// }

// export async function getProductsStyleInfo(
// 	headerLine: string,
// 	info: {
// 		line: string;
// 		mainImageUrl: string;
// 	}[]
// ) {
// 	const productStyleInfoResponses = await Promise.all(
// 		info.map(({ line, mainImageUrl }) =>
// 			productStyleInfoGeneratorAi({
// 				headerLine,
// 				productDataLine: line,
// 				mainImageUrl,
// 			})
// 		)
// 	);

// 	const productsStyleInfo: ProductStyleInfo[] = productStyleInfoResponses.map(
// 		(response) =>
// 			response.data ?? {
// 				colorNames: [],
// 				hexColors: [],
// 				materials: [],
// 				styles: [],
// 			}
// 	);

// 	return productsStyleInfo;
// }

// export async function getProductsImageEmbedding(mainImageUrls: string[]) {
// 	const productImageEmbeddingResponses = await Promise.all(
// 		mainImageUrls.map((mainImageUrl) => productImageEmbeddingGeneratorAi(mainImageUrl))
// 	);

// 	return productImageEmbeddingResponses.map((response) => ({
// 		imageEmbedding: response.data,
// 	}));
// }

// export function getProductComputedData(baseProductWithNoCategory: Omit<BaseProduct, "category">) {
// 	const retailPrice =
// 		baseProductWithNoCategory.msrp ??
// 		baseProductWithNoCategory.map ??
// 		baseProductWithNoCategory.tradePrice * 2;

// 	const price = {
// 		currencyCode: baseProductWithNoCategory.currencyCode,
// 		retailPrice,
// 		msrp: baseProductWithNoCategory.msrp,
// 		map: baseProductWithNoCategory.map,
// 		tradePrice: baseProductWithNoCategory.tradePrice,
// 		shippingPrice: baseProductWithNoCategory.shippingPrice,
// 	};

// 	const hasCAD = price.currencyCode === "CAD";
// 	const hasUSD = price.currencyCode === "USD";
// 	const retailPriceCAD = price.currencyCode === "CAD" ? price.retailPrice : undefined;
// 	const retailPriceUSD = price.currencyCode === "USD" ? price.retailPrice : undefined;

// 	const stockQtyUSD = price.currencyCode === "USD" ? baseProductWithNoCategory.stockQty : 0;
// 	const stockQtyCAD = price.currencyCode === "CAD" ? baseProductWithNoCategory.stockQty : 0;
// 	const restockDateUSD =
// 		price.currencyCode === "USD" ? baseProductWithNoCategory.restockDate : undefined;
// 	const restockDateCAD =
// 		price.currencyCode === "CAD" ? baseProductWithNoCategory.restockDate : undefined;

// 	return {
// 		price,
// 		hasCAD,
// 		hasUSD,
// 		retailPriceCAD,
// 		retailPriceUSD,
// 		stockQtyUSD,
// 		stockQtyCAD,
// 		restockDateUSD,
// 		restockDateCAD,
// 		retailPrice: undefined,
// 		msrp: undefined,
// 		map: undefined,
// 		tradePrice: undefined,
// 		shippingPrice: undefined,
// 		stockQty: undefined,
// 		restockDate: undefined,
// 		currencyCode: undefined,
// 	};
// }

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

	// OPTIMIZATION: Single pass to create initial products - O(n)
	const initialBaseProducts: (
		| Omit<
				BaseProduct,
				| "mainImageUrl"
				| "category"
				| "currencyCode"
				| "dimension"
				| "shippingDimension"
				| "dimensionUnit"
				| "weightUnit"
		  >
		| undefined
	)[] = contents.map((row) => {
		const values = row.split(fileConfig.delimiter);
		const dataObj = Object.fromEntries(headers.map((h, i) => [h, values[i]]));

		const map = fileConfig.map.map ? parseFloat(dataObj[fileConfig.map.map]) : NaN;

		const msrp = fileConfig.map.msrp ? parseFloat(dataObj[fileConfig.map.msrp]) : NaN;

		const shippingPrice = fileConfig.map.shippingPrice
			? parseFloat(dataObj[fileConfig.map.shippingPrice])
			: NaN;

		const unitPerBox = parseInt(dataObj[fileConfig.map.unitPerBox ?? "1"]);

		const imageUrls = extractProductImageUrls(row);

		const stockQty = parseInt(dataObj[fileConfig.map.stockQty ?? "0"]);
		const restockDate = fileConfig.map.restockDate
			? new Date(dataObj[fileConfig.map.restockDate])
			: undefined;
		if (!restockDate && stockQty < 1) return undefined;

		const tradePrice = parseFloat(dataObj[fileConfig.map.tradePrice]);
		if (!tradePrice) return undefined;

		const sku = dataObj[fileConfig.map.sku];
		if (!sku) return undefined;

		const res = {
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

		return res;
	});

	// OPTIMIZATION: Filter once - O(n)
	let sanitizedInitialBaseProducts = initialBaseProducts.filter(
		(sanitizedInitialBaseProduct) => !!sanitizedInitialBaseProduct
	);
	if (sanitizedInitialBaseProducts.length < 1) return [];

	const currentSkus = sanitizedInitialBaseProducts.map(
		(sanitizedInitialBaseProduct) => sanitizedInitialBaseProduct.sku
	);

	const { data: existingProductSkusResponse } = await getProductsBySkusService(currentSkus);

	// OPTIMIZATION: Create Map for O(1) lookups instead of O(n) finds - O(n) space, O(1) lookup
	const existingProductsBySkuMap = new Map<string, Product>();
	if (existingProductSkusResponse?.products) {
		for (const product of existingProductSkusResponse.products) {
			if (product?.sku) {
				existingProductsBySkuMap.set(product.sku, product);
			}
		}
	}

	// OPTIMIZATION: Single pass to extract existing products and filter - O(n)
	const existingProducts: Product[] = [];
	const newProducts = [];

	for (const initialBaseProduct of sanitizedInitialBaseProducts) {
		const existingProduct = existingProductsBySkuMap.get(initialBaseProduct.sku);

		if (existingProduct) {
			existingProducts.push(existingProduct);
		} else {
			newProducts.push(initialBaseProduct);
		}
	}

	sanitizedInitialBaseProducts = newProducts;
	if (sanitizedInitialBaseProducts.length < 1) return [];

	// Parallel execution of AI calls - maintain existing behavior
	const [productMainImageDetectorAiResponses, productsMetricInfo] = await Promise.all([
		Promise.all(
			sanitizedInitialBaseProducts.map((initialBaseProduct) =>
				productMainImageDetectorAi(initialBaseProduct.imageUrls, initialBaseProduct.name)
			)
		),
		getProductsMetricInfo(fileConfig.headerLine, productDataLines),
	]);

	// OPTIMIZATION: Single pass to combine data - O(n)
	const initialBaseProductsWithMainImageUrlAndMetricInfo = sanitizedInitialBaseProducts.map(
		(initialBaseProduct, index) => {
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
		}
	);

	// Final filter - O(n)
	const finalInitialBaseProductsWithMainImageUrlAndMetricInfo =
		initialBaseProductsWithMainImageUrlAndMetricInfo.filter(
			(initialBaseProductWithMainImageUrlAndMetricInfo) =>
				initialBaseProductWithMainImageUrlAndMetricInfo.mainImageUrl !== undefined &&
				initialBaseProductWithMainImageUrlAndMetricInfo.currencyCode !== undefined &&
				initialBaseProductWithMainImageUrlAndMetricInfo.dimension !== undefined &&
				initialBaseProductWithMainImageUrlAndMetricInfo.weight !== undefined
		) as Omit<BaseProduct, "category">[];

	// Bug fix: Changed < to > to correctly check if there are existing products
	if (existingProducts.length > 0) {
		await updateExistingProductPriceInfo(
			finalInitialBaseProductsWithMainImageUrlAndMetricInfo,
			existingProducts
		);
	}

	return finalInitialBaseProductsWithMainImageUrlAndMetricInfo;
}

async function updateExistingProductPriceInfo(
	initialBaseProductsWithMainImageUrlAndIsoCodeInfo: Omit<BaseProduct, "category">[],
	existingProducts: Product[]
) {
	// OPTIMIZATION: Create Map for O(1) lookups - O(n) space, O(1) lookup
	const existingProductsBySku = new Map<string, Product>();
	for (const product of existingProducts) {
		if (product?.sku) {
			existingProductsBySku.set(product.sku, product);
		}
	}

	// OPTIMIZATION: Single pass with Map lookup instead of nested find - O(n) instead of O(n²)
	const existingProductsToUpdate = [];

	for (const initialBaseProduct of initialBaseProductsWithMainImageUrlAndIsoCodeInfo) {
		const existingProduct = existingProductsBySku.get(initialBaseProduct.sku);

		if (!existingProduct) continue;

		const productCurrencyExists = existingProduct.prices.some(
			(price) => price.currencyCode === initialBaseProduct.currencyCode
		);

		if (productCurrencyExists) continue;

		existingProductsToUpdate.push({
			existingProduct,
			currentProduct: initialBaseProduct,
		});
	}

	if (existingProductsToUpdate.length < 1) return;

	// Single pass to create updates - O(n)
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
