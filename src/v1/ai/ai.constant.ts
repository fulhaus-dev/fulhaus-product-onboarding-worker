export const AI_PRODUCT_DATA_MAP_GENERATOR_FIELD_NAMES = [
  {
    value: 'sku',
    required: true,
    description:
      'The vendor field that represents a unique product identifier or code',
  },
  {
    value: 'itemId',
    required: false,
    description:
      'The vendor field that represents a variant or specific item identifier',
  },
  {
    value: 'gtin',
    required: false,
    description:
      'The vendor field that contains a global trade item number, UPC, EAN, or similar barcode',
  },
  {
    value: 'mpn',
    required: false,
    description:
      'The vendor field that contains the manufacturer part number or model identifier',
  },
  {
    value: 'brand',
    required: false,
    description:
      'The vendor field that identifies the brand or manufacturer name',
  },
  {
    value: 'name',
    required: true,
    description: 'The vendor field that contains the product name or title',
  },
  {
    value: 'description',
    required: true,
    description:
      'The vendor field that contains the product description or detailed information',
  },
  {
    value: 'pdpLink',
    required: false,
    description:
      'The vendor field that contains a URL or link to the product detail page',
  },
  {
    value: 'tradePrice',
    required: true,
    description:
      'The vendor field that represents the wholesale or cost price (what you pay to purchase the product)',
  },
  {
    value: 'map',
    required: false,
    description:
      'The vendor field that represents the minimum advertised price or lowest allowed selling price',
  },
  {
    value: 'msrp',
    required: false,
    description:
      'The vendor field that represents the manufacturer suggested retail price or list price',
  },
  {
    value: 'retailPrice',
    required: false,
    description:
      'The vendor field that represents the standard retail selling price',
  },
  {
    value: 'shippingPrice',
    required: false,
    description:
      'The vendor field that contains shipping cost or freight information',
  },
  {
    value: 'unitPerBox',
    required: false,
    description:
      'The vendor field that indicates quantity per package, case pack, or units per container',
  },
  {
    value: 'stockQty',
    required: true,
    description:
      'The vendor field that represents current inventory quantity or stock level',
  },
  {
    value: 'restockDate',
    required: false,
    description:
      'The vendor field that indicates when the product will be restocked or available',
  },
] as const;
