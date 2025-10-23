import { googleGemini2_5FlashLite } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { generateObject, type ImagePart } from 'ai';
import z from 'zod';

const systemPrompt = `You are a product image classifier specialized in furniture images. Your task is to identify the main furniture image with a white background from a set of images, using the following criteria as guide:

MAIN PRODUCT IMAGE CRITERIA:
- Clean, white solid background
- Shows the ENTIRE product with no parts cut off, not top, bottom, sides, etc. Most be a professional product photography style
- Product is centered and clearly visible
- No lifestyle context (people, scenes, environments)
- Straight-on or standard product photography angle
- No props, decorations, or additional items
- Professional product photography style
- For products like curtains, blinds, rugs it must be the image showing the entire product, no other elements or lifestyle features
- For an artwork product, it must be the image showing the entire artwork ONLY (with or without the frame)
- For lamps, pendants, sconce, floor lamp, ceiling lamps, chandelier or clocks, it must be the image showing the entire product, no other elements or lifestyle features

REJECT CRITERIA:
- Top, side, or bottom view
- Lifestyle images (product in use, with people, in real environments)
- Partial views or close-ups of product details
- Top views or overhead shots
- Angled or artistic shots
- Image with busy/textured backgrounds
- Image with multiple products unless they're a set
- Image with text overlays or graphics
- Packaging-only images (unless that IS the product)
- Image with dimension values or metrics
- Product not centered
- Image with non-professional photography style
- Image with props, decorations, or additional items
- Image with lifestyle context (people, scenes, environments)
- Artwork frame image
- Part of an image
- Artwork in space or lifestyle context
- Stone walls, Fireplace and Fire pit
`;

export default async function productMainImageDetectorAi(
  imageUrls: string[],
  name: string
) {
  const userPromptImagePart: ImagePart[] = imageUrls
    .slice(0, 5)
    .map((imageUrl) => ({
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
        hasNoWhiteBackground: z
          .optional(z.boolean().default(false))
          .describe('Whether the detected main image has no white background'),
        fitsRejectCriteria: z
          .optional(z.boolean().default(false))
          .describe('Whether the detected main image fits the reject criteria'),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze these ${userPromptImagePart.length} product images and identify which one is the main product image according to the criteria.

              **Product Name**: ${name}
              `,
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
