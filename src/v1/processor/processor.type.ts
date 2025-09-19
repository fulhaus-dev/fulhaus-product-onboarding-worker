import { zProductFieldMapGeneratorSchema } from '@worker/v1/ai/ai.product-file-simple-header-map-generator.js';
import z from 'zod';

export type FileConfig = {
  map: z.infer<typeof zProductFieldMapGeneratorSchema>['map'];
  delimiter: string;
  headerLine: string;
};
