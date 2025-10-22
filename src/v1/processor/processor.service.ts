import { env } from "@worker/config/environment.js";
import r2 from "@worker/utils/r2.js";
import processFlatFileProductDataStream from "@worker/v1/processor/processor.file.stream/processor.file.stream.flat-file.js";
import processSpreadsheetFileProductDataStream from "@worker/v1/processor/processor.file.stream/processor.file.stream.spreadsheet-file.js";
import processZipFileProductDataStream from "@worker/v1/processor/processor.file.stream/processor.file.stream.zip-file.js";
import { getVendorProductDataFileKeysThatCanBeProcessed } from "@worker/v1/processor/processor.util.js";
import type { GenericId as Id } from "convex/values";

const allowedFiles = env.ALLOWED_VENDOR_FILES.split(",").map((f) => f.trim());

const vendorId = env.VENDOR_ID as Id<"productVendors">;

export async function processVendorProductDataService(vendorProductDataR2FolderName: string) {
	const allProductFileKeys = await r2.getAllFileKeysInVendorProductDataBucketFolder(
		vendorProductDataR2FolderName
	);

	const { flatFileKeys, spreadsheetFileKeys, zipFileKeys } =
		getVendorProductDataFileKeysThatCanBeProcessed(allProductFileKeys);

	for (const flatFileKey of flatFileKeys) {
		if (!allowedFiles.includes(flatFileKey)) continue;

		const { data: flatFileStream } = await r2.getProductDataFileStream(flatFileKey);
		if (!flatFileStream) continue;

		await processFlatFileProductDataStream({
			flatFileStream,
			vendorId,
			fileName: flatFileKey,
		});
	}

	for (const spreadsheetFileKey of spreadsheetFileKeys) {
		if (!allowedFiles.includes(spreadsheetFileKey)) continue;

		const { data: spreadsheetFileStream } = await r2.getProductDataFileStream(spreadsheetFileKey);
		if (!spreadsheetFileStream) continue;

		await processSpreadsheetFileProductDataStream({
			spreadsheetFileStream,
			vendorId,
			fileName: spreadsheetFileKey,
		});
	}

	for (const zipFileKey of zipFileKeys) {
		if (!allowedFiles.includes(zipFileKey)) continue;

		const { data: zipFileStream } = await r2.getProductDataFileStream(zipFileKey);
		if (!zipFileStream) continue;

		await processZipFileProductDataStream({
			zipFileStream,
			vendorId,
			fileName: zipFileKey,
		});
	}
}
