import { googleGemini2_5FlashLite } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { productDataDimensionUnits } from '@worker/v1/processor/processor.constant.js';
import { generateObject } from 'ai';
import z from 'zod';

const outputSchema = z.object({
  width: z
    .number()
    .nullable()
    .describe('The width of the product if available'),
  height: z
    .number()
    .nullable()
    .describe('The height of the product if available'),
  depth: z
    .number()
    .nullable()
    .describe('The depth of the product if available'),
  weight: z
    .number()
    .nullable()
    .describe('The weight of the product if available'),
  shippingWidth: z
    .number()
    .nullable()
    .describe('The equivalent shipping width of the product if available'),
  shippingHeight: z
    .number()
    .nullable()
    .describe('The equivalent shipping height of the product if available'),
  shippingDepth: z
    .number()
    .nullable()
    .describe('The equivalent shipping depth of the product if available'),
  dimensionUnit: z.enum(productDataDimensionUnits),
});

const systemPrompt = `
You are an expert in analyzing product data and returning the equivalent dimension values and dimension unit. Your SOLE task is to identify and return the dimension values and dimension unit.
`;

export default async function productDimensionInfoGeneratorAi(args: {
  headerLine: string;
  productDataLine: string;
}) {
  const { data, errorRecord } = await asyncTryCatch(() =>
    generateObject({
      model: googleGemini2_5FlashLite,
      system: systemPrompt,
      schema: outputSchema,
      prompt: `Provide the dimension values dimension unit for this product data:
      ${args.headerLine}\n
      ${args.productDataLine}`,
    })
  );

  if (errorRecord)
    return {
      errorRecord,
    };

  return {
    data: data.object,
  };
}
