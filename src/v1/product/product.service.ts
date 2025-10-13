// import { DbDataAPIVector } from '@worker/config/db/index.js';
// import { error } from '@worker/utils/error.js';
// import { asyncTryCatch } from '@worker/utils/try-catch.js';
// import uid from '@worker/utils/uid.js';
// import { dbProductCollection } from '@worker/v1/product/product.db.js';
// import { CreateProduct, Product } from '@worker/v1/product/product.type.js';
// import { getLudwigImageEmbeddings } from '@worker/v1/product/product.util.js';

// export async function createProductsService(args: ) {
//   const {
//     data: vectorNumberArray,
//     errorRecord: getLudwigImageEmbeddingsErrorRecord,
//   } = await getLudwigImageEmbeddings(createProductData.ludwigImageUrl);

//   if (getLudwigImageEmbeddingsErrorRecord) {
//     error.sendErrorMessage({
//       ...getLudwigImageEmbeddingsErrorRecord,
//       details: [
//         ...(getLudwigImageEmbeddingsErrorRecord.details ?? []),
//         {
//           function: 'getLudwigImageEmbeddings',
//           createProductData,
//         },
//       ],
//     });
//     return;
//   }

//   const newProduct: Omit<Product, '_id'> = {
//     ...createProductData,
//     fhSku: uid.generate(),
//     status: 'Active',
//     stockDate: new Date(),
//     $vector: new DbDataAPIVector(vectorNumberArray),
//     $lexical: createProductData.description,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//   };

//   const { data: result, errorRecord } = await asyncTryCatch(() =>
//     dbProductCollection.insertOne(newProduct)
//   );

//   if (errorRecord) return { errorRecord };

//   return {
//     data: { ...newProduct, _id: result.insertedId },
//   };
// }
