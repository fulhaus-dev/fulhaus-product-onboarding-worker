import type { PublicApiType } from "@worker/config/convex/convex.type.js";
import type {
	productCategories,
	productCurrencyCodes,
	productDataDimensionUnits,
	productDataWeightUnits,
	productStyles,
} from "@worker/v1/product/product.constant.js";
import type { GenericId } from "convex/values";

export type ProductCategory = (typeof productCategories)[number];
export type ProductStyle = (typeof productStyles)[number];
export type ProductCurrencyCode = (typeof productCurrencyCodes)[number];

export type ProductDataDimensionUnit = (typeof productDataDimensionUnits)[number];
export type ProductDataWeightUnit = (typeof productDataWeightUnits)[number];

export type ProductDimensionInfo = {
	width?: number;
	height?: number;
	depth?: number;
	shippingWidth?: number;
	shippingHeight?: number;
	shippingDepth?: number;
	dimensionUnit: ProductDataDimensionUnit;
};

export type ProductWeightInfo = {
	weight?: number;
	shippingWeight?: number;
	weightUnit: ProductDataWeightUnit;
};

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
	dimension: string;
	shippingDimension: string;
	currencyCode: ProductCurrencyCode;
	dimensionUnit: "in";
	weightUnit: "lb";
} & Omit<ProductDimensionInfo, "dimensionUnit"> &
	Omit<ProductWeightInfo, "weightUnit">;

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

export type ProductInfo = CreateProduct["productData"] & {
	imageEmbedding: CreateProduct["imageEmbedding"];
};
