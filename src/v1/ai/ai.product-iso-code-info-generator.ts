import { googleGemini2_5FlashLite } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { ProductIsoCodeInfo } from '@worker/v1/product/product.type.js';
import { generateObject } from 'ai';
import z from 'zod';

const systemPrompt = `
You are an expert in analyzing product data and returning the equivalent standard iso values for various fields. Your SOLE task is to identify and return the equivalent ISO values of the specified fields.
`;

export default async function productIsoCodeInfoGeneratorAi(args: {
  headerLine: string;
  productDataLine: string;
}) {
  const { data, errorRecord } = await asyncTryCatch(() =>
    generateObject({
      model: googleGemini2_5FlashLite,
      system: systemPrompt,
      schema: z.object({
        warehouseCountryCodes: z
          .array(z.string())
          .describe(
            'A list of the equivalent ISO 3166 uppercase alpha 2 country codes for the warehouse locations of the product'
          ),
        shippingCountryCodes: z
          .array(z.string())
          .describe(
            'A list of the equivalent ISO 3166 uppercase alpha 2 country codes for the shipping locations of the product'
          ),
        currencyCode: z
          .string()
          .describe(
            'The equivalent ISO 4217 uppercase 3 letter currency code for the product currency'
          ),
      }),
      prompt: `Provide the correct iso codes for this product data:
      ${args.headerLine}\n
      ${args.productDataLine}`,
    })
  );

  if (errorRecord)
    return {
      errorRecord,
    };

  return {
    data: data.object as ProductIsoCodeInfo,
  };
}
