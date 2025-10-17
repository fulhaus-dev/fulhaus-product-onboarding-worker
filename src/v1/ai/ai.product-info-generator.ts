import { googleGemini2_5FlashLite } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { productCategories } from '@worker/v1/product/product.constant.js';
import { ProductCategory } from '@worker/v1/product/product.type.js';
import { generateObject } from 'ai';
import z from 'zod';

const outputSchema = z.object({
  name: z.string().describe('The generated descriptive name for the product.'),
  description: z
    .string()
    .describe(
      'The generated detailed description of at least 2 sentences that is a complete product information.'
    ),
  category: z
    .string()
    .describe(
      'The category that best matches the product from the provided category list.'
    ),
});

const systemPrompt = `
You are an expert in generating the best product information for furniture products. Namely the name, description and category (from a provided category list). The Categories are standard, and the category that matches the product is what you should assign to the product. The descriptive name must not contain dimensions or weights or anything of that nature. The assigned Category MUST come from the following list (find the best match), must not be anything else, made up or spelling correcting, must be exactly one of the categories verbatim in the following list.

Category list:
${productCategories.join('\n')}.

Your SOLE task is to provide the best name and description for a product that is descriptive of the product based on the provided product data and main image NOT including the white background and assign the category that best matches the product from the provided category list.
`;

export default async function productInfoGeneratorAi(args: {
  name: string;
  description: string;
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
              text: `Generate the best name and description and assign category for this product:\n
              **Product Name**:${args.name}\n
              **Product Description**:${args.description}.\n\n
              The main image is also attached for better context.
              `,
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
    data: data.object as {
      name: string;
      description: string;
      category: ProductCategory;
    },
  };
}
