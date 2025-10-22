import processFlatFileProductDataStream from "@worker/v1/processor/processor.file.stream/processor.file.stream.flat-file.js";
import processSpreadsheetFileProductDataStream from "@worker/v1/processor/processor.file.stream/processor.file.stream.spreadsheet-file.js";
import unzipper from "unzipper";

export default async function processZipFileProductDataStream({
	zipFileStream,
	vendorId,
	ownerId,
	fileName,
}: {
	zipFileStream: NodeJS.ReadableStream;
	vendorId: string;
	ownerId?: string;
	fileName: string;
}) {
	const brands: Record<string, number> = {};
	const zipFileParseStream = zipFileStream.pipe(unzipper.Parse({ forceStream: true }));

	try {
		for await (const entry of zipFileParseStream) {
			const filePath = entry.path;
			const isDirectory = entry.type === "Directory";
			const fileExtension = filePath.toLowerCase().split(".").pop() || "";

			try {
				if (isDirectory) {
					entry.autodrain();
					continue;
				}

				if (["csv", "txt", "tsv"].includes(fileExtension)) {
					await processFlatFileProductDataStream({
						flatFileStream: entry,
						vendorId,
						ownerId,
						fileName: `${fileName}:${filePath}`,
					});
				} else if (["xlsx", "xls"].includes(fileExtension)) {
					await processSpreadsheetFileProductDataStream({
						spreadsheetFileStream: entry,
						vendorId,
						ownerId,
						fileName: `${fileName}:${filePath}`,
					});
				} else {
					entry.autodrain();
				}
			} catch (_) {
				entry.autodrain();
			}
		}

		return brands;
	} catch (_) {
		return brands;
	}
}
