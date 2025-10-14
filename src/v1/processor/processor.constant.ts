export const FLAT_FILE_EXTS_TO_PROCESS = ['.txt', '.csv', '.tsv'] as const;

export const SPREADSHEET_FILE_EXTS_TO_PROCESS = ['.xlsx', '.xls'] as const;

export const ZIP_FILE_EXTS_TO_PROCESS = [
  '.zip',
  '.tar.gz',
  '.tar.xz',
  '.tar',
  '.zip',
  '.7z',
  '.rar',
  '.tar',
  '.gz',
  '.bz2',
] as const;

export const productDataDimensionUnits = [
  'in',
  'cm',
  'ft',
  'm',
  'yd',
  'mm',
] as const;
export const productDataWeightUnits = ['lb', 'kg', 'g', 'oz', 'mg'] as const;
