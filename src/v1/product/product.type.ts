import { DbUuidString } from '@worker/config/db/db.type.js';
import { DbDataAPIVector, DbUUID } from '@worker/config/db/index.js';
import {
  CountryAlpha2Code,
  CurrencyCode,
  Nullable,
} from '@worker/shared/shared.type.js';
import {
  DimensionUnits,
  productCategories,
  productStyles,
  WeightUnits,
} from '@worker/v1/product/product.constant.js';

export type DimensionUnit = (typeof DimensionUnits)[number];
export type WeightUnit = (typeof WeightUnits)[number];

export type ProductCategory = (typeof productCategories)[number];
export type ProductStyle = (typeof productStyles)[number];

export type BaseProductData = {
  sku: string;
  itemId: Nullable<string>;
  gtin: Nullable<string>;
  mpn: Nullable<string>;
  brand: Nullable<string>;
  name: string;
  description: string;
  pdpLink: Nullable<string>;
  tradePrice: number;
  map: Nullable<number>;
  msrp: Nullable<number>;
  retailPrice: Nullable<number>;
  shippingPrice: Nullable<number>;
  unitPerBox: number;
  stockQty: number;
  restockDate: Nullable<Date>;
};

export type ProductImageData = {
  imageUrls: string[];
  mainImageUrl: string;
  ludwigImageUrl: string;
};

export type ProductIsoCodeData = {
  warehouseCountryCodes: CountryAlpha2Code[];
  shippingCountryCodes: CountryAlpha2Code[];
  currencyCode: CurrencyCode;
};

export type ProductDimensionData = {
  dimension: string;
  width: number;
  height: number;
  depth: number;
  shippingDimension: string;
  shippingWidth: number;
  shippingHeight: number;
  shippingDepth: number;
  dimensionUnit: 'in';
};

export type ProductWeightData = {
  weight: number;
  shippingWeight: number;
  weightUnit: 'lb';
};

export type ProductStyleData = {
  colorNames: Nullable<string[]>;
  hexColors: Nullable<string[]>;
  materials: string[];
  styles: ProductStyle[];
};

export type ProductDescriptionAndCategoryData = {
  name: string;
  description: string;
  category: ProductCategory;
};

export type CreateProduct = BaseProductData &
  ProductImageData &
  ProductIsoCodeData &
  ProductDimensionData &
  ProductWeightData &
  ProductStyleData &
  ProductDescriptionAndCategoryData & {
    vendorId: DbUuidString;
    ownerId: Nullable<DbUuidString>;
  };

export type Product = CreateProduct & {
  _id: DbUUID;
  fhSku: string;
  status: 'Active' | 'Inactive' | 'Discontinued';
  stockDate: Nullable<Date>;
  $vector: DbDataAPIVector;
  $lexical: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductFieldKey = keyof Product;
