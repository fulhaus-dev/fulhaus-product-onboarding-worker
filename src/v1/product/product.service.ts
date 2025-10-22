import { api } from "@worker/config/convex/convex.type.js";
import { convexHttpClient } from "@worker/config/convex/index.js";
import { env } from "@worker/config/environment.js";
import type { ProcessorErrorRecord } from "@worker/shared/shared.type.js";
import { asyncTryCatch } from "@worker/utils/try-catch.js";
import type {
	CreateProduct,
	Product,
	ProductCategory,
	UpdateProduct,
} from "@worker/v1/product/product.type.js";

export async function getAllProductCategoryStatisticService() {
	return await asyncTryCatch<{
		data: {
			category: ProductCategory;
			countUSD: number;
			countCAD: number;
		}[];
	}>(() =>
		convexHttpClient.query(api.v1.product.statistics.query.getAllProductCategoryStatistic, {
			poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
		})
	);
}

export async function getProductsBySkusService(skus: string[]) {
	return await asyncTryCatch<{ data: Product[] }>(() =>
		convexHttpClient.query(api.v1.product.query.getPoProductsBySkus, {
			poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
			skus,
		})
	);
}

export async function createProductsService(data: CreateProduct[]) {
	return await asyncTryCatch<{ data: Product["_id"][] }>(() =>
		convexHttpClient.mutation(api.v1.product.mutation.createPoProducts, {
			poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
			data,
		})
	);
}

export async function updateProductsByIdService(data: UpdateProduct[]) {
	return await asyncTryCatch(() =>
		convexHttpClient.mutation(api.v1.product.mutation.updatePoProductsById, {
			poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
			data,
		})
	);
}

export async function logProductErrorService(errorRecord: ProcessorErrorRecord) {
	return await asyncTryCatch(() =>
		convexHttpClient.mutation(api.v1.product.error.mutation.logProductError, {
			poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
			data: errorRecord,
		})
	);
}
