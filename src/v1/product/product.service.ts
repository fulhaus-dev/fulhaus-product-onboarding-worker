import { api } from '@worker/config/convex/convex.type.js';
import { convexHttpClient } from '@worker/config/convex/index.js';
import { env } from '@worker/config/environment.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import {
  CreateProduct,
  Product,
  UpdateProduct,
} from '@worker/v1/product/product.type.js';

export async function getProductsBySkusService(skus: string[]) {
  return await asyncTryCatch<{ data: Product[] }>(() =>
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
