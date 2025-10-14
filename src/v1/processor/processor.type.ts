import { zProductFieldMapGeneratorSchema } from '@worker/v1/ai/ai.product-file-simple-header-map-generator.js';
import {
  productDataDimensionUnits,
  productDataWeightUnits,
} from '@worker/v1/processor/processor.constant.js';
import z from 'zod';

export type FileConfig = {
  map: z.infer<typeof zProductFieldMapGeneratorSchema>['map'];
  delimiter: string;
  headerLine: string;
};

export type ProductDataDimensionUnit =
  (typeof productDataDimensionUnits)[number];
export type ProductDataWeightUnit = (typeof productDataWeightUnits)[number];
