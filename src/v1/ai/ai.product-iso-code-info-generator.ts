import { googleGemini2_5FlashLite } from "@worker/config/gemini.js";
import { ISO_3166 } from "@worker/shared/shared.constants/iso.3166.js";
import { ISO_4217 } from "@worker/shared/shared.constants/iso.4217.js";
import { asyncTryCatch } from "@worker/utils/try-catch.js";
import type { ProductIsoCodeInfo } from "@worker/v1/product/product.type.js";
import { generateObject } from "ai";
import z from "zod";

const systemPrompt = `
You are an expert in analyzing product data and returning the equivalent standard currency and country iso codes for various fields. You are capable of determining the equivalent country cose if the product uses a state code anywhere. Your SOLE task is to identify and return the equivalent ISO values of the specified fields. The ISO codes must be from this list:

Country Codes:
${ISO_3166.map((country) => country.alpha2).join(",\n")}

Currency Codes:
${ISO_4217.map((currency) => currency.code).join(",\n")}

If the product has a state code, use the equivalent country code from the provided list. Do not assign any code that is not in the provided Country Codes and Currency Codes list.

**Important**:
DO NOT assign state codes as country codes especially for shipping and warehouse codes, use the equivalent country code for that state (if you find a state code) from the provided list, it must be a country code.
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
						"A list of the equivalent country codes from the provided Country Codes for the warehouse locations of the product, do not assign state codes as country codes or any code not in the provided Country Codes list"
					),
				shippingCountryCodes: z
					.array(z.string())
					.describe(
						"A list of the equivalent country codes from the provided Country Codes for the shipping locations of the product, do not assign state codes as country codes or any code not in the provided Country Codes list"
					),
				currencyCode: z
					.string()
					.describe(
						"The equivalent ISO 4217 uppercase 3 letter currency code for the product currency from the Currency Codes list"
					),
			}),
			prompt: `Map the correct iso codes for this product data based on the Country Codes and Currency Codes list:
      ${args.headerLine}\n
      ${args.productDataLine}`,
		})
	);

	if (errorRecord)
		return {
			errorRecord,
		};

	const productIsoCodeInfo = data.object as ProductIsoCodeInfo;
	const { warehouseCountryCodes, shippingCountryCodes, currencyCode } = productIsoCodeInfo;

	const sanitizedWarehouseCountryCodes = warehouseCountryCodes.map((countryCode) => {
		const country = ISO_3166.find((country) => country.alpha2 === countryCode);

		if (!country) return currencyCode === "USD" ? "US" : currencyCode === "CAD" ? "CA" : "US";

		return countryCode;
	});

	const sanitizedShippingCountryCodes = shippingCountryCodes.map((countryCode) => {
		const country = ISO_3166.find((country) => country.alpha2 === countryCode);

		if (!country) return currencyCode === "USD" ? "US" : currencyCode === "CAD" ? "CA" : "US";

		return countryCode;
	});

	return {
		data: {
			...productIsoCodeInfo,
			warehouseCountryCodes: sanitizedWarehouseCountryCodes,
			shippingCountryCodes: sanitizedShippingCountryCodes,
		} as ProductIsoCodeInfo,
	};
}
