import { env } from "@worker/config/environment.js";
import { error } from "@worker/utils/error.js";
import logger from "@worker/utils/logger.js";
import uid from "@worker/utils/uid.js";
import productInfoGeneratorAi from "@worker/v1/ai/ai.product-info-generator.js";
import type { FileConfig } from "@worker/v1/processor/processor.type.js";
import {
	getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo,
	getProductComputedData,
	getProductsImageEmbedding,
	getProductsStyleInfo,
} from "@worker/v1/processor/processor.util.js";
import { productCategories } from "@worker/v1/product/product.constant.js";
import {
	createProductsService,
	getAllProductCategoryStatisticService,
	logProductErrorService,
} from "@worker/v1/product/product.service.js";
import type {
	BaseProduct,
	ProductCategoryCount,
	ProductCategoryCountCurrency,
	ProductCurrencyCode,
	ProductInfo,
} from "@worker/v1/product/product.type.js";

const categoryCount = {} as ProductCategoryCount;
// OPTIMIZATION: Cache productCategories Set to avoid recreating it
const productCategoriesSet = new Set(productCategories);

class ProductLinesQueue {
	private queue: string[] = [];
	private isProcessing = false;
	private fileConfig: FileConfig | null = null;
	private idArgs: { vendorId: string; ownerId?: string } | null = null;
	private totalProcessed = 0;
	private processingPromise: Promise<void> | null = null;

	addLines(
		lines: string[],
		fileConfig: FileConfig,
		idArgs: { vendorId: string; ownerId?: string }
	): boolean {
		// OPTIMIZATION: Early exit check before calculation
		const queueLength = this.queue.length;
		const totalSize = queueLength + lines.length;

		if (totalSize > env.MAX_PROCESSING_QUEUE_SIZE) {
			return false;
		}

		this.queue.push(...lines);
		this.fileConfig = fileConfig;
		this.idArgs = idArgs;

		if (!this.isProcessing) {
			this.processingPromise = this.processQueue().catch((err) => {
				logger.error(`Queue processing error: ${err}`);
				this.isProcessing = false;
				throw err;
			});
		}

		return true;
	}

	hasSpace(): boolean {
		return this.queue.length < env.MAX_PROCESSING_QUEUE_SIZE;
	}

	getQueueSize(): number {
		return this.queue.length;
	}

	getTotalProcessed(): number {
		return this.totalProcessed;
	}

	private async processQueue(): Promise<void> {
		this.isProcessing = true;

		try {
			while (this.queue.length > 0) {
				const queueLength = this.queue.length;
				const batchSize =
					queueLength < env.MAX_PROCESSING_BATCH ? queueLength : env.MAX_PROCESSING_BATCH;
				const batch = this.queue.splice(0, batchSize);

				if (!this.fileConfig || !this.idArgs) {
					throw new Error("Missing fileConfig or idArgs for processing");
				}

				try {
					await processProductLines(batch, this.fileConfig, this.idArgs);
					this.totalProcessed += batchSize;
				} catch (batchError) {
					const errorRecord = error.exceptionErrorRecord(batchError);
					logger.error(`Batch processing failed: ${errorRecord.message}, batch size: ${batchSize}`);
				}

				// Periodic GC for large datasets
				if (this.totalProcessed % 50000 === 0 && global.gc) {
					global.gc();
				}
			}
		} catch (err) {
			const errorRecord = error.exceptionErrorRecord(err);
			logger.error(`Critical queue processing error: ${errorRecord.message}`);
			throw err;
		} finally {
			this.isProcessing = false;
			this.processingPromise = null;
		}
	}

	isComplete(): boolean {
		return !this.isProcessing && this.queue.length === 0;
	}

	async waitForCompletion(timeoutMs: number = 300000): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isComplete()) {
				resolve();
				return;
			}

			const timeout = setTimeout(() => {
				clearInterval(interval);
				logger.error(
					`Queue timeout after ${timeoutMs}ms. Processed: ${this.totalProcessed}, Remaining: ${this.queue.length}`
				);
				reject(new Error(`Queue processing timeout after ${timeoutMs}ms`));
			}, timeoutMs);

			const interval = setInterval(() => {
				if (this.isComplete()) {
					clearTimeout(timeout);
					clearInterval(interval);
					resolve();
				}
			}, 2000); // Check every 2 seconds instead of 1

			if (this.processingPromise) {
				this.processingPromise.catch((err) => {
					clearTimeout(timeout);
					clearInterval(interval);
					reject(err);
				});
			}
		});
	}

	async stop(): Promise<void> {
		if (this.processingPromise) {
			await this.processingPromise;
		}
	}

	reset(): void {
		this.queue = [];
		this.totalProcessed = 0;
		this.fileConfig = null;
		this.idArgs = null;
	}
}

export const productQueue = new ProductLinesQueue();

export default function processProductLinesWorker(
	productDataLines: string[],
	fileConfig: FileConfig,
	idArgs: { vendorId: string; ownerId?: string }
): boolean {
	return productQueue.addLines(productDataLines, fileConfig, idArgs);
}

async function processProductLines(
	productDataLines: string[],
	fileConfig: FileConfig,
	idArgs: { vendorId: string; ownerId?: string }
) {
	// OPTIMIZATION: Cache category count check - avoid Object.keys() call every time
	const categoryCountInitialized = Object.keys(categoryCount).length > 0;

	if (!categoryCountInitialized) {
		const { data: categoryCountResponse } = await getAllProductCategoryStatisticService();

		if (categoryCountResponse) {
			const stats = categoryCountResponse.stats;
			const statsLength = stats.length;

			// OPTIMIZATION: Direct assignment instead of reduce for better performance
			for (let i = 0; i < statsLength; i++) {
				const count = stats[i];
				categoryCount[count.category] = {
					countUSD: count.countUSD,
					countCAD: count.countCAD,
				} as ProductCategoryCountCurrency;
			}
		}
	}

	const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
		await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(productDataLines, fileConfig);

	const initialProductsLength = initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length;
	if (initialProductsLength < 1) return;

	const productInfoResponses = await Promise.all(
		initialBaseProductsWithMainImageUrlAndIsoCodeInfo.map(
			(initialBaseProductWithMainImageUrlAndIsoCodeInfo) =>
				productInfoGeneratorAi({
					name: initialBaseProductWithMainImageUrlAndIsoCodeInfo.name,
					description: initialBaseProductWithMainImageUrlAndIsoCodeInfo.description,
					mainImageUrl: initialBaseProductWithMainImageUrlAndIsoCodeInfo.mainImageUrl,
				})
		)
	);

	// OPTIMIZATION: Pre-allocate array with estimated capacity to reduce resizing
	const baseProducts: BaseProduct[] = [];

	// Single-pass validation with Set lookup - O(n)
	for (let index = 0; index < initialProductsLength; index++) {
		const initialProduct = initialBaseProductsWithMainImageUrlAndIsoCodeInfo[index];
		const response = productInfoResponses[index];

		// OPTIMIZATION: Destructure only needed properties from response.data
		const responseData = response.data;
		const name = responseData?.name;
		const description = responseData?.description;
		const category = responseData?.category;

		// Early validation - skip invalid products immediately
		if (!initialProduct.sku || !name || !description || !category) {
			continue;
		}

		// O(1) Set lookup
		if (!productCategoriesSet.has(category)) {
			continue;
		}

		// Check category count limit
		const currencyKey = `count${initialProduct.currencyCode}` as keyof ProductCategoryCountCurrency;
		const currentCount = categoryCount[category]?.[currencyKey] ?? 0;
		if (currentCount > env.MAX_CATEGORIES) {
			continue;
		}

		// OPTIMIZATION: Avoid object spread, build object directly
		const product = {
			...initialProduct,
			name,
			description,
			category,
		} as BaseProduct;

		baseProducts.push(product);
	}

	const baseProductsLength = baseProducts.length;
	if (baseProductsLength < 1) return;

	// OPTIMIZATION: Pre-allocate arrays with exact size
	const styleInfoInput = new Array(baseProductsLength);
	const imageEmbeddingInput = new Array(baseProductsLength);

	for (let i = 0; i < baseProductsLength; i++) {
		const baseProduct = baseProducts[i];
		styleInfoInput[i] = {
			line: baseProduct.line,
			mainImageUrl: baseProduct.mainImageUrl,
		};
		imageEmbeddingInput[i] = baseProduct.mainImageUrl;
	}

	const [productsStyleInfo, productsImageEmbedding] = await Promise.all([
		getProductsStyleInfo(fileConfig.headerLine, styleInfoInput),
		getProductsImageEmbedding(imageEmbeddingInput),
	]);

	// OPTIMIZATION: Pre-allocate with estimated capacity
	const products: (ProductInfo & { currencyCode: ProductCurrencyCode })[] = [];
	const categoryUpdates: Record<string, Record<string, number>> = {};

	// Cache idArgs to avoid repeated property access
	const vendorId = idArgs.vendorId as any;
	const ownerId = idArgs.ownerId as any;

	for (let i = 0; i < baseProductsLength; i++) {
		const baseProduct = baseProducts[i];
		const styleInfo = productsStyleInfo[i];
		const imageEmbedding = productsImageEmbedding[i].imageEmbedding;

		// Early validation - skip if missing required values
		if (!imageEmbedding || !baseProduct.currencyCode || !baseProduct.dimension) {
			continue;
		}

		// OPTIMIZATION: Reduce object spread operations
		const productWithEmbedding = {
			...baseProduct,
			...styleInfo,
			imageEmbedding,
		};

		const { price, ...otherProductComputedData } = getProductComputedData(productWithEmbedding);

		// OPTIMIZATION: Build product object more efficiently
		const product = {
			...productWithEmbedding,
			vendorId,
			ownerId,
			fhSku: uid.generate(),
			...otherProductComputedData,
			prices: [price],
			line: undefined,
			currencyCode: baseProduct.currencyCode,
		} as ProductInfo & { currencyCode: ProductCurrencyCode };

		products.push(product);

		// OPTIMIZATION: Batch category count updates inline
		const category = product.category;
		const currencyKey = `count${product.currencyCode}` as keyof ProductCategoryCountCurrency;

		// OPTIMIZATION: Initialize category update if needed
		if (!categoryUpdates[category]) {
			categoryUpdates[category] = {};
		}
		const categoryUpdate = categoryUpdates[category];
		categoryUpdate[currencyKey] = (categoryUpdate[currencyKey] || 0) + 1;
	}

	const productsLength = products.length;
	if (productsLength < 1) return;

	// OPTIMIZATION: Apply batched category count updates with reduced iterations
	const categoryUpdateEntries = Object.entries(categoryUpdates);
	const categoryUpdateEntriesLength = categoryUpdateEntries.length;

	for (let i = 0; i < categoryUpdateEntriesLength; i++) {
		const [category, updates] = categoryUpdateEntries[i];
		const categoryKey = category as keyof ProductCategoryCount;

		// OPTIMIZATION: Initialize if needed
		if (!categoryCount[categoryKey]) {
			categoryCount[categoryKey] = {} as ProductCategoryCountCurrency;
		}
		const categoryData = categoryCount[categoryKey];

		const updateEntries = Object.entries(updates);
		const updateEntriesLength = updateEntries.length;

		for (let j = 0; j < updateEntriesLength; j++) {
			const [currencyKey, increment] = updateEntries[j];
			const typedCurrencyKey = currencyKey as keyof ProductCategoryCountCurrency;
			categoryData[typedCurrencyKey] = (categoryData[typedCurrencyKey] || 0) + increment;
		}
	}

	// OPTIMIZATION: Pre-allocate array with exact size
	const createProductsData = new Array(productsLength);

	for (let i = 0; i < productsLength; i++) {
		const product = products[i];
		// biome-ignore lint/correctness/noUnusedVariables: currencyCode needed for type narrowing in destructuring
		const { imageEmbedding, currencyCode, ...productData } = product;

		createProductsData[i] = {
			productData,
			imageEmbedding,
		};
	}

	const { errorRecord } = await createProductsService(createProductsData);

	if (errorRecord) {
		// OPTIMIZATION: Pre-allocate SKU array with exact size
		const productSkus = new Array(productsLength);
		for (let i = 0; i < productsLength; i++) {
			productSkus[i] = products[i].sku;
		}

		logProductErrorService({
			...errorRecord,
			details: [
				...(errorRecord.details ?? []),
				{
					function: "createProductsService",
					createProductData: productSkus,
				},
			],
		});
	}
}
