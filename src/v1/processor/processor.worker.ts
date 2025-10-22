import { env } from "@worker/config/environment.js";
import { error } from "@worker/utils/error.js";
import logger from "@worker/utils/logger.js";
import uid from "@worker/utils/uid.js";
import productInfoGeneratorAi from "@worker/v1/ai/ai.product-info-generator.js";
import type { FileConfig } from "@worker/v1/processor/processor.type.js";
import {
	getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo,
	getProductComputedData,
	getProductsDimensionInfo,
	getProductsImageEmbedding,
	getProductsStyleInfo,
	getProductsTextEmbedding,
	getProductsWeightInfo,
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
		if (this.queue.length + lines.length > env.MAX_PROCESSING_QUEUE_SIZE) {
			return false;
		}

		this.queue.push(...lines);
		this.fileConfig = fileConfig;
		this.idArgs = idArgs;

		// Start processing if not already running
		if (!this.isProcessing) {
			this.processQueue().catch((err) => {
				logger.error("Queue processing error:", err);
				// Don't throw here, just log the error
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

	private async processQueue() {
		this.isProcessing = true;

		try {
			while (this.queue.length > 0) {
				// Take next batch from queue
				const batch = this.queue.splice(0, env.MAX_PROCESSING_BATCH);

				// Process this batch and wait for completion
				await processProductLines(batch, this.fileConfig!, this.idArgs!);

				// Force cleanup
				if (global.gc) global.gc();

				// Log progress periodically
				if (totalProcessed % 500 === 0) {
					logger.info(`📦 Queue status: ${this.queue.length} lines remaining`);
				}
			}
		} catch (err) {
			const errorRecord = error.exceptionErrorRecord(err);
			logger.error(`Error in queue processing: ${errorRecord.message}`);
			// Continue processing despite errors in individual batches
		} finally {
			this.isProcessing = false;
		}
	}

	// Method to check if processing is complete
	isComplete(): boolean {
		return !this.isProcessing && this.queue.length === 0;
	}

	// Method to wait for completion
	async waitForCompletion(timeoutMs: number = 300000): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isComplete()) {
				resolve();
				return;
			}

			const timeout = setTimeout(() => {
				reject(new Error(`Queue processing timeout after ${timeoutMs}ms`));
			}, timeoutMs);

			const checkCompletion = () => {
				if (this.isComplete()) {
					clearTimeout(timeout);
					clearInterval(interval);
					resolve();
				}
			};

			const interval = setInterval(checkCompletion, 1000);
		});
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
	if (Object.keys(categoryCount).length === 0) {
		const { data: categoryCountResponse } = await getAllProductCategoryStatisticService();

		const productCategoryCount = categoryCountResponse?.data;
		if (productCategoryCount) {
			categoryCount = productCategoryCount.reduce((acc, count) => {
				acc[count.category] = {
					countUSD: count.countUSD,
					countCAD: count.countCAD,
				} as ProductCategoryCountCurrency;

				return acc;
			}, {} as ProductCategoryCount);
		}
	}

	const initialBaseProductsWithMainImageUrlAndIsoCodeInfo =
		await getInitialBaseProductsWithMainImageUrlAndIsoCodeInfo(productDataLines, fileConfig);

	const removedCount =
		productDataLines.length - initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length;

	totalRemoved += removedCount;

	if (removedCount > 0)
		logger.info(`📦 Removed ${removedCount} invalid products. Total removed: ${totalRemoved}`);

	if (initialBaseProductsWithMainImageUrlAndIsoCodeInfo.length < 1) return;

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
				(categoryCount[baseProduct.category]?.[`count${baseProduct.currencyCode}`] ?? 0) <=
					env.MAX_CATEGORIES
		) as BaseProduct[];
	if (baseProducts.length < 1) return;

	const baseProductsLine = baseProducts.map((baseProduct) => baseProduct.line);

	const [productsDimensionInfo, productsWeightInfo, productsStyleInfo, productsImageEmbedding] =
		await Promise.all([
			getProductsDimensionInfo(fileConfig.headerLine, baseProductsLine),
			getProductsWeightInfo(fileConfig.headerLine, baseProductsLine),
			getProductsStyleInfo(
				fileConfig.headerLine,
				baseProducts.map((baseProduct) => ({
					line: baseProduct.line,
					mainImageUrl: baseProduct.mainImageUrl,
				}))
			),
			getProductsImageEmbedding(baseProducts.map((baseProduct) => baseProduct.mainImageUrl)),
		]);

	const productsWithoutTextEmbedding = baseProducts.map((productWithoutTextEmbedding, index) => ({
		...productWithoutTextEmbedding,
		...productsDimensionInfo[index],
		...productsWeightInfo[index],
		...productsStyleInfo[index],
		...productsImageEmbedding[index],
	}));

	const productsTextEmbeddingParts = productsWithoutTextEmbedding.map(
		(productWithoutTextEmbedding) => {
			const textEmbeddingParts = [
				`SKU: ${productWithoutTextEmbedding.sku}`,
				`NAME: ${productWithoutTextEmbedding.name}`,
				`DESCRIPTION: ${productWithoutTextEmbedding.description}`,
			];

			if (productWithoutTextEmbedding.colorNames?.length > 0)
				textEmbeddingParts.push(`COLORS: ${productWithoutTextEmbedding.colorNames.join(", ")}`);

			if (productWithoutTextEmbedding.materials?.length > 0)
				textEmbeddingParts.push(`MATERIALS: ${productWithoutTextEmbedding.materials.join(", ")}`);

			if (productWithoutTextEmbedding.styles?.length > 0)
				textEmbeddingParts.push(`STYLES: ${productWithoutTextEmbedding.styles.join(", ")}`);

			return textEmbeddingParts.join("\n");
		}
	);

	const productsTextEmbedding = await getProductsTextEmbedding(productsTextEmbeddingParts);

	const productsWithUndefinedRequiredValues = productsWithoutTextEmbedding.map(
		(productWithoutTextEmbedding, index) => {
			if (!productsTextEmbedding[index]) return;
			if (!productWithoutTextEmbedding.currencyCode) return;
			if (!productWithoutTextEmbedding.dimension) return;

			const warehouseCountryCodes = productWithoutTextEmbedding.warehouseCountryCodes ?? [];
			const shippingCountryCodes = productWithoutTextEmbedding.shippingCountryCodes ?? [];

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
				currencyCode: productWithoutTextEmbedding.currencyCode,
			};
		}
	) as ((ProductInfo & { currencyCode: ProductCurrencyCode }) | undefined)[];

	const products = productsWithUndefinedRequiredValues.filter(
		(product) => product !== undefined
	) as (ProductInfo & { currencyCode: ProductCurrencyCode })[];
	if (products.length < 1) return;

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
			const { imageEmbedding, textEmbedding, currencyCode, ...productData } = product;

			return {
				productData,
				embeddingData: {
					imageEmbedding,
					textEmbedding,
				},
			};
		})
	);

	if (errorRecord) {
		logProductErrorService({
			...errorRecord,
			details: [
				...(errorRecord.details ?? []),
				{
					function: "createProductsService",
					createProductData: products.map((product) => product.sku),
				},
			],
		});
	}

	const productsProcessed = response?.data.length ?? 0;
	totalProcessed += productsProcessed;

	logger.info(`📦 Completed ${productsProcessed}. Total processed ${totalProcessed}`);
}
