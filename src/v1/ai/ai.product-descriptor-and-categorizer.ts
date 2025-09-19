import { googleGemini2_5FlashLiteLlm } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { productCategories } from '@worker/v1/product/product.constant.js';
import { generateObject } from 'ai';
import z from 'zod';

const outputSchema = z.object({
  name: z.string().describe('A descriptive name for the product.'),
  description: z
    .string()
    .describe(
      'A detailed modern description of at least 2 sentences that is a complete product information.'
    ),
  category: z
    .string()
    .describe(
      'The category that best matches the product from the provided category list.'
    ),
});

const systemPrompt = `
You are an expert in naming and describing and categorizing product for e-commerce. The Categories are standard, and the category that matches the product is what you should assign to the product.

Category list: 
${productCategories.join('\n')}.

Your SOLE task is to provide a better, modern name and description for the product that is descriptive of the product based on the provided product data and main image and assign the category that best matches the product.
`;

export default async function productDescriptorAndCategorizerAi(args: {
  headerLine: string;
  productDataLine: string;
  mainImageUrl: string;
}) {
  const { data, errorRecord } = await asyncTryCatch(() =>
    generateObject({
      model: googleGemini2_5FlashLiteLlm,
      system: systemPrompt,
      schema: outputSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Provide a modern name and description for this product data and main image:
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
