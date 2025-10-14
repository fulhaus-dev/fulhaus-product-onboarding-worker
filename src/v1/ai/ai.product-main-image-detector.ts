import { googleGemini2_5FlashLite } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { generateObject, ImagePart } from 'ai';
import z from 'zod';

const systemPrompt = `You are a product image classifier specialized in furniture images. Your task is to identify the main furniture image with white solid background from a set of images.

MAIN PRODUCT IMAGE CRITERIA:
- Clean, white solid background
- Shows the ENTIRE product with no parts cut off
- Product is centered and clearly visible
- No lifestyle context (people, scenes, environments)
- No artistic angles or creative compositions
- Straight-on or standard product photography angle
- No props, decorations, or additional items
- Professional product photography style
- For products like curtains, blinds, rugs it must show the entire product
- For art, the entire artwork
- For lamps, pendants, sconce, floor lamp, ceiling lamps, chandelier or clocks, the entire product

REJECT these types:
- Lifestyle images (product in use, with people, in real environments)
- Partial views or close-ups of product details
- Angled or artistic shots
- Images with busy/textured backgrounds
- Images with multiple products unless they're a set
- Images with text overlays or graphics
- Packaging-only images (unless that IS the product)
- Art frames
`;

export default async function productMainImageDetectorAi(imageUrls: string[]) {
  const userPromptImagePart: ImagePart[] = imageUrls.map((imageUrl) => ({
    type: 'image',
    image: imageUrl,
  }));

  const { data, errorRecord } = await asyncTryCatch(() =>
    generateObject({
      model: googleGemini2_5FlashLite,
      system: systemPrompt,
      temperature: 0,
      schema: z.object({
        mainImageImageIndex: z
          .enum(imageUrls.map((_, index) => `${index}`))
          .nullable()
          .describe('The detected main image index (0-indexed)'),
        hasWhiteBackground: z
          .boolean()
          .describe('Whether the detected main image has a white background'),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze these ${imageUrls.length} product images and identify which one is the main product image according to the criteria.`,
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
