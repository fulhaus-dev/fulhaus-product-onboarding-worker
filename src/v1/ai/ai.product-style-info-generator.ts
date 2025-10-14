import { googleGemini2_5FlashLite } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { productStyles } from '@worker/v1/product/product.constant.js';
import { generateObject } from 'ai';
import z from 'zod';

const outputSchema = z.object({
  colorNames: z
    .array(z.string())
    .describe('The applicable color names for the product'),
  hexColors: z
    .array(z.string())
    .describe('The applicable hex colors for the product'),
  materials: z
    .array(z.string())
    .describe('The applicable materials for the product'),
  styles: z
    .array(z.enum(productStyles))
    .describe('The applicable styles for the product'),
});

const systemPrompt = `
You are an expert in analyzing product data and main image and returning the applicable style data (color names, hex colors, materials, and styles form the style list), derived from the actual image NOT including the white background.

Style list:
${productStyles.join(', ')}.

Your SOLE task is to identify and return the applicable style for the product based on the provided product data and main image.
`;

export default async function productStyleInfoGeneratorAi(args: {
  headerLine: string;
  productDataLine: string;
  mainImageUrl: string;
}) {
  const { data, errorRecord } = await asyncTryCatch(() =>
    generateObject({
      model: googleGemini2_5FlashLite,
      system: systemPrompt,
      schema: outputSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Provide the applicable style data for this product data and main image:
              ${args.headerLine}\n
              ${args.productDataLine}`,
            },
            {
              type: 'image',
              image: args.mainImageUrl,
            },
          ],
        },
      ],
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
