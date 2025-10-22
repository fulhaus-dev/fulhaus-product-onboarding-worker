import { api } from "@worker/config/convex/convex.type.js";
import { convexHttpClient } from "@worker/config/convex/index.js";
import { env } from "@worker/config/environment.js";
import type { ProcessorErrorRecord } from "@worker/shared/shared.type.js";
import { asyncTryCatch } from "@worker/utils/try-catch.js";
import type { CreateProduct, UpdateProduct } from "@worker/v1/product/product.type.js";

export async function getAllProductCategoryStatisticService() {
	return await asyncTryCatch(() =>
		convexHttpClient.query(api.v1.product.statistics.query.getPoAllProductCategoryStatistic, {
			poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
		})
	);
}

export async function getProductsBySkusService(skus: string[]) {
	return await asyncTryCatch(() =>
		convexHttpClient.query(api.v1.product.query.getPoProductsBySkus, {
			poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
			skus,
		})
	);
}

export async function createProductsService(data: CreateProduct[]) {
	return await asyncTryCatch(() =>
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
		convexHttpClient.mutation(api.v1.product.error.mutation.logPoProductError, {
			poApiKey: env.CONVEX_PRODUCT_ONBOARDING_API_KEY,
			data: errorRecord,
		})
	);
}
