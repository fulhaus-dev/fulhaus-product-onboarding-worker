import type {
	ProductDataDimensionUnit,
	ProductDataWeightUnit,
} from "@worker/v1/processor/processor.type.js";

function convertDimensionsToInches(
	values: {
		width: number | null;
		height: number | null;
		depth: number | null;
	},
	fromUnit: ProductDataDimensionUnit = "in"
) {
	const conversionFactors = {
		in: 1,
		cm: 0.393701,
		ft: 12,
		m: 39.3701,
		yd: 36,
		mm: 0.0393701,
	};

	const factor = conversionFactors[fromUnit];

	return {
		width: !values.width ? 0 : roundMetricValue(values.width * factor),
		height: !values.height ? 0 : roundMetricValue(values.height * factor),
		depth: !values.depth ? 0 : roundMetricValue(values.depth * factor),
		dimensionUnit: "in",
	};
}

function convertWeightToLbs(value: number | null, fromUnit: ProductDataWeightUnit = "lb") {
	const conversionFactors = {
		lb: 1,
		kg: 2.20462,
		g: 0.00220462,
		oz: 0.0625,
		mg: 0.00000220462,
	};

	const factor = conversionFactors[fromUnit];

	return {
		weight: !value ? 0 : roundMetricValue(value * factor),
		weightUnit: "lb",
	};
}

function roundMetricValue(num: number) {
	return Number(num.toLocaleString("en-US", { maximumFractionDigits: 2 }));
}

const conversion = {
	convertDimensionsToInches,
	convertWeightToLbs,
};
export default conversion;
