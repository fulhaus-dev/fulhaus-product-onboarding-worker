import { googleGemini2_5FlashLite } from "@worker/config/gemini.js";
import { asyncTryCatch } from "@worker/utils/try-catch.js";
import {
	productCurrencyCodes,
	productDataDimensionUnits,
	productDataWeightUnits,
} from "@worker/v1/product/product.constant.js";
import { generateObject } from "ai";
import z from "zod";

const outputSchema = z.object({
	dimensionInfo: z.object({
		width: z.optional(z.number()).describe("The width of the product if available"),
		height: z.optional(z.number()).describe("The height of the product if available"),
		depth: z.optional(z.number()).describe("The depth of the product if available"),
		shippingWidth: z
			.optional(z.number())
			.describe("The equivalent shipping width of the product if available"),
		shippingHeight: z
			.optional(z.number())
			.describe("The equivalent shipping height of the product if available"),
		shippingDepth: z
			.optional(z.number())
			.describe("The equivalent shipping depth of the product if available"),
		dimensionUnit: z.enum(productDataDimensionUnits),
	}),
	weightInfo: z.object({
		weight: z.optional(z.number()).describe("The weight of the product if available"),
		shippingWeight: z
			.optional(z.number())
			.describe("The shipping weight of the product if available"),
		weightUnit: z.enum(productDataWeightUnits),
	}),
	currencyCode: z.enum(productCurrencyCodes),
});

const systemPrompt = `
You are an expert in analyzing product data and returning the equivalent dimension info, weight info and currency code with the associated standardized metric units. Your SOLE task is to identify and return the product dimension info, weight info and currency code and their associated standardized metric units.
`;

export default async function productMetricInfoGeneratorAi(args: {
	headerLine: string;
	productDataLine: string;
}) {
	const { data, errorRecord } = await asyncTryCatch(() =>
		generateObject({
			model: googleGemini2_5FlashLite,
			system: systemPrompt,
			schema: outputSchema,
			prompt: `Provide the dimension info, weight info and currency code and metric units for this product data:
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
