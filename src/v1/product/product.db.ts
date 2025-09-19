import db from '@worker/config/db/index.js';
import { env } from '@worker/config/environment.js';
import { NON_INDEXED_PRODUCT_FIELDS } from '@worker/v1/product/product.constant.js';
import { Product } from '@worker/v1/product/product.type.js';

export const dbProductCollection = await db.createCollection<Product>(
  'products2',
  {
    defaultId: { type: 'uuidv7' },
    vector: {
      dimension: env.LUDWIG_VECTOR_DIM,
      metric: env.LUDWIG_VECTOR_METRIC,
    },
    lexical: {
      enabled: true,
      analyzer: {
        tokenizer: {
          name: 'standard',
          args: {},
        },
        filters: [
          {
            name: 'lowercase',
          },
          {
            name: 'stop',
          },
          {
            name: 'porterstem',
          },
          {
            name: 'asciifolding',
          },
        ],
        charFilters: [],
      },
    },
    rerank: {
      enabled: true,
      service: {
        provider: env.PRODUCT_RERANK_PROVIDER,
        modelName: env.PRODUCT_RERANK_MODEL_NAME,
      },
    },
    indexing: {
      deny: NON_INDEXED_PRODUCT_FIELDS,
    },
  }
);
