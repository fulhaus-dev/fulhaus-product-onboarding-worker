import { googleGemini2_5FlashLite } from "@worker/config/gemini.js";
import { asyncTryCatch } from "@worker/utils/try-catch.js";
import { productCategories } from "@worker/v1/product/product.constant.js";
import type { ProductCategory } from "@worker/v1/product/product.type.js";
import { generateObject } from "ai";
import z from "zod";

const outputSchema = z.object({
	name: z.string().describe("The generated descriptive name for the product."),
	description: z
		.string()
		.describe(
			"The generated detailed description of at least 2 sentences that is a complete product information."
		),
	category: z
		.optional(z.string())
		.describe(
			"The category that best matches the product from the provided category list if there is a match."
		),
});

const systemPrompt = `
You are an expert in generating the best product information for furniture products. Namely the name, description and category (from a provided category list) if there is it matches any of the provided categories. The Categories are standard, and the category that matches the product is what you should assign to the product if there is a match. The descriptive name must not contain dimensions or weights or anything of that nature. The assigned Category MUST come from the following list (find the best match) if any, must not be anything else, made up or spelling correcting, must be exactly one of the categories verbatim in the following list. If it does not match any of the provided categories, do not assign a category.

Category list:
${productCategories.join("\n")}.

Your SOLE task is to provide the best name and description for a product that is descriptive of the product based on the provided product data and main image NOT including the white background and assign the category that best matches the product from the provided category list if there is a match. Note that bathtubs are not beds and shower curtains are not curtains.

**Important (Do not assign any category if product meets these criteria):**:
 - If the image does not show the full product, centered and with a white background, do not assign a category.
 - If product does not match any category in the Category list, do not assign a category.
 - If product is for pets, do not assign a category.
 - If product is toys, do not assign a category.
 - If product is for flooring or wall tiles, do not assign a category.
 - If product is for special occasions, like Christmas, Easter, Halloweens etc, do not assign a category.
 - If the image is an electronic appliance, like Fridge, TV, Microwave, Dryer, Vacuum, laptop etc, do not assign a category.
 - If the image is a light bulb, do not assign a category.
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
					role: "user",
					content: [
						{
							type: "text",
							text: `Generate the best name and description and assign category for this product:\n
              **Product Name**:${args.name}\n
              **Product Description**:${args.description}.\n\n
              The main image is also attached for better context.
              `,
						},
						{
							type: "image",
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
			category?: ProductCategory;
		},
	};
}
