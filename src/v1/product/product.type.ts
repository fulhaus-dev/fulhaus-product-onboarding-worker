// import {
//   CountryAlpha2Code,
//   CurrencyCode,
//   Nullable,
// } from '@worker/shared/shared.type.js';
import {
  ProductDataDimensionUnits,
  ProductDataWeightUnits,
} from '@worker/v1/product/product.constant.js';

export type ProductDataDimensionUnit =
  (typeof ProductDataDimensionUnits)[number];
export type ProductDataWeightUnit = (typeof ProductDataWeightUnits)[number];

// export type ProductCategory = (typeof productCategories)[number];
// export type ProductStyle = (typeof productStyles)[number];

export type BaseProductData = {
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
  retailPrice?: number;
  shippingPrice?: number;
  unitPerBox: number;
  stockQty: number;
  restockDate?: Date;
};

// export type ProductImageData = {
//   imageUrls: string[];
//   mainImageUrl: Nullable<string>;
//   ludwigImageUrl: string;
// };

// export type ProductIsoCodeData = {
//   warehouseCountryCodes: CountryAlpha2Code[];
//   shippingCountryCodes: CountryAlpha2Code[];
//   currencyCode: CurrencyCode;
// };

// export type ProductDimensionData = {
//   dimension: string;
//   width: number;
//   height: number;
//   depth: number;
//   shippingDimension: string;
//   shippingWidth: number;
//   shippingHeight: number;
//   shippingDepth: number;
//   dimensionUnit: 'in';
// };

// export type ProductWeightData = {
//   weight: number;
//   shippingWeight: number;
//   weightUnit: 'lb';
// };

// export type ProductStyleData = {
//   colorNames: Nullable<string[]>;
//   hexColors: Nullable<string[]>;
//   materials: string[];
//   styles: ProductStyle[];
// };

// export type ProductDescriptionAndCategoryData = {
//   name: string;
//   description: string;
//   category: ProductCategory;
// };

// export type CreateProduct = BaseProductData &
//   ProductImageData &
//   ProductIsoCodeData &
//   ProductDimensionData &
//   ProductWeightData &
//   ProductStyleData &
//   ProductDescriptionAndCategoryData & {
//     vendorId: DbUuidString;
//     ownerId: Nullable<DbUuidString>;
//   };

// export type Product = CreateProduct & {
//   _id: DbUUID;
//   fhSku: string;
//   status: 'Active' | 'Inactive' | 'Discontinued';
//   stockDate: Nullable<Date>;
//   $vector: DbDataAPIVector;
//   $lexical: string;
//   createdAt: Date;
//   updatedAt: Date;
// };

// export type ProductFieldKey = keyof Product;

// export type ConvexProduct = {
//   [K in keyof Omit<
//     Product,
//     | '$vector'
//     | '$lexical'
//     | 'createdAt'
//     | 'updatedAt'
//     | 'status'
//     | '_id'
//     | 'workspaceId'
//     | 'vendorId'
//     | 'restockDate'
//     | 'stockDate'
//     | 'retailPrice'
//     | 'ownerId'
//   >]: Product[K] extends infer U | null
//     ? null extends Product[K]
//       ? U | undefined
//       : Product[K]
//     : Product[K];
// } & {
//   pId: string;
//   ownerId?: Id<'workspaces'>;
//   vendorId: Id<'productVendors'>;
//   restockDate?: number;
// };
