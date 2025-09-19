import { googleGemini2_5FlashLiteLlm } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { generateObject, ImagePart } from 'ai';
import z from 'zod';

const systemPrompt = `
You are an expert product image analyst. Your SOLE task is to identify and return the URL of the *Primary/Main* product image from a provided list.

**ABSOLUTE RULES (Mandatory Pre-conditions):**
1.  **Clear/Solid Background ONLY:** The main image MUST have a plain, solid, or clear white/light background.
2.  **NO Lifestyle/Context:** The main image absolutely CANNOT contain people, scenery, props, text, logos, or any 'lifestyle' elements or 'noise'.
3.  **Full, Frontal View:** The image MUST show the *entire* product from a primary, direct, frontal angle (NOT a side, back, or partial view).
4.  **Single Product:** The image MUST only feature the single product being sold.

**Primary Goal:** The ideal main image is the simplest, cleanest representation of the entire product against a plain background.

**Output:** ONLY return the URL of the image that adheres to ALL of the Absolute Rules. If multiple images qualify, choose the one with the most direct, full-product view.
`;

export default async function productMainImageDetectorAi(imageUrls: string[]) {
  const userPromptImagePart: ImagePart[] = imageUrls.map((imageUrl) => ({
    type: 'image',
    image: imageUrl,
  }));

  const { data, errorRecord } = await asyncTryCatch(() =>
    generateObject({
      model: googleGemini2_5FlashLiteLlm,
      system: systemPrompt,
      schema: z.object({
        mainImageImageUrl: z
          .enum(imageUrls)
          .describe('The front facing image URL'),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze the ${imageUrls.length} product images provided below. Based on the **ABSOLUTE RULES** in your system prompt (especially the requirement for a **clear, solid background** and **NO lifestyle elements**), determine the single best primary product image. Your final answer MUST be the URL chosen from the list provided`,
            },
            ...userPromptImagePart,
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
