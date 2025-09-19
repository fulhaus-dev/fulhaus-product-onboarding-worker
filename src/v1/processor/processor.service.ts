import { DbUuidString } from '@worker/config/db/db.type.js';
import r2 from '@worker/utils/r2.js';
import processFlatFileProductDataStream from '@worker/v1/processor/processor.file.stream/processor.file.stream.flat-file.js';
import processSpreadsheetFileProductDataStream from '@worker/v1/processor/processor.file.stream/processor.file.stream.spreadsheet-file.js';
import processZipFileProductDataStream from '@worker/v1/processor/processor.file.stream/processor.file.stream.zip-file.js';
import { getVendorProductDataFileKeysThatCanBeProcessed } from '@worker/v1/processor/processor.util.js';

const vendorId = '0198480a-b728-7365-9c9a-617f46037536' as DbUuidString;

export async function processVendorProductDataService(
  vendorProductDataR2FolderName: string
) {
  const allProductFileKeys =
    await r2.getAllFileKeysInVendorProductDataBucketFolder(
      vendorProductDataR2FolderName
    );

  const { flatFileKeys, spreadsheetFileKeys, zipFileKeys } =
    getVendorProductDataFileKeysThatCanBeProcessed(allProductFileKeys);

  for (const flatFileKey of flatFileKeys) {
    const { data: flatFileStream } = await r2.getProductDataFileStream(
      flatFileKey
    );
    if (!flatFileStream) continue;

    await processFlatFileProductDataStream({
      flatFileStream,
      vendorId,
      fileName: flatFileKey,
    });
  }

  for (const spreadsheetFileKey of spreadsheetFileKeys) {
    const { data: spreadsheetFileStream } = await r2.getProductDataFileStream(
      spreadsheetFileKey
    );
    if (!spreadsheetFileStream) continue;

    await processSpreadsheetFileProductDataStream({
      spreadsheetFileStream,
      vendorId,
      fileName: spreadsheetFileKey,
    });
  }

  for (const zipFileKey of zipFileKeys) {
    const { data: zipFileStream } = await r2.getProductDataFileStream(
      zipFileKey
    );
    if (!zipFileStream) continue;

    await processZipFileProductDataStream({
      zipFileStream,
      vendorId,
      fileName: zipFileKey,
    });
  }
}
