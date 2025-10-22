import type { PublicApiType } from "@worker/config/convex/convex.type.js";
import type { ISO_3166 } from "@worker/shared/shared.constants/iso.3166.js";
import type { ISO_4217 } from "@worker/shared/shared.constants/iso.4217.js";
import type { productCategories, productStyles } from "@worker/v1/product/product.constant.js";
import type { GenericId } from "convex/values";

export type ProductCategory = (typeof productCategories)[number];
export type ProductStyle = (typeof productStyles)[number];
export type ProductCurrencyCode = (typeof ISO_4217)[number]["code"];
export type ProductCountryCode = (typeof ISO_3166)[number]["alpha2"];

export type BaseProduct = {
	line: string;
	sku: string;
	itemId?: string;
	gtin?: string;
	mpn?: string;
	brand?: string;
	name: string;
	description: string;
	pdpLink?: string;
	tradePrice: number;
	map?: number;
	msrp?: number;
	shippingPrice?: number;
	unitPerBox: number;
	stockQty: number;
	restockDate?: Date;
	imageUrls: string[];
	mainImageUrl: string;
	category: ProductCategory;
	warehouseCountryCodes: ProductCountryCode[];
	shippingCountryCodes: ProductCountryCode[];
	currencyCode: ProductCurrencyCode;
};

export type ProductIsoCodeInfo = {
	warehouseCountryCodes: ProductCountryCode[];
	shippingCountryCodes: ProductCountryCode[];
	currencyCode: ProductCurrencyCode;
};

export type ProductDimensionInfo = {
	dimension: string;
	width: number;
	height: number;
	depth: number;
	shippingDimension: string;
	shippingWidth: number;
	shippingHeight: number;
	shippingDepth: number;
	dimensionUnit: "in";
};

export type ProductWeightInfo = {
	weight: number;
	shippingWeight: number;
	weightUnit: "lb";
};

export type ProductStyleInfo = {
	colorNames: string[];
	hexColors: string[];
	materials: string[];
	styles: ProductStyle[];
};

export type CreateProduct =
	PublicApiType["v1"]["product"]["mutation"]["createPoProducts"]["_args"]["data"][0];

export type UpdateProduct =
	PublicApiType["v1"]["product"]["mutation"]["updatePoProductsById"]["_args"]["data"][0];

export type Product = {
	_id: GenericId<"products">;
} & CreateProduct["productData"];

export type ProductCategoryCountCurrency = Record<`count${ProductCurrencyCode}`, number>;

export type ProductCategoryCount = Record<ProductCategory, ProductCategoryCountCurrency>;

export type ProductInfo = CreateProduct["productData"] & CreateProduct["embeddingData"];
