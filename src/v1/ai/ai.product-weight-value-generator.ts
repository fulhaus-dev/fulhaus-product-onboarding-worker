// import { googleGemini2_5FlashLiteLlm } from '@worker/config/gemini.js';
// import { asyncTryCatch } from '@worker/utils/try-catch.js';
// import { WeightUnits } from '@worker/v1/product/product.constant.js';
// import { generateObject } from 'ai';
// import z from 'zod';

// const outputSchema = z.object({
//   weight: z
//     .number()
//     .nullable()
//     .describe('The weight of the product if available'),
//   shippingWeight: z
//     .number()
//     .nullable()
//     .describe('The shipping weight of the product if available'),
//   weightUnit: z.enum(WeightUnits),
// });

// const systemPrompt = `
// You are an expert in analyzing product data and returning the weights value and weight unit. Your SOLE task is to identify and return the weight value and weight unit.
// `;

// export default async function productWeightValuesGeneratorAi(args: {
//   headerLine: string;
//   productDataLine: string;
// }) {
//   const { data, errorRecord } = await asyncTryCatch(() =>
//     generateObject({
//       model: googleGemini2_5FlashLiteLlm,
//       system: systemPrompt,
//       schema: outputSchema,
//       prompt: `Provide the weight value and weight unit for this product data:
//       ${args.headerLine}\n
//       ${args.productDataLine}`,
//     })
//   );

//   if (errorRecord)
//     return {
//       errorRecord,
//     };

//   return {
//     data: data.object,
//   };
// }
