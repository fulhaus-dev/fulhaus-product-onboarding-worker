import { env } from '@worker/config/environment.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import axios from 'axios';

export async function getLudwigImageEmbeddings(imageUrl: string) {
  const { data, errorRecord } = await asyncTryCatch<{ vector: number[] }>(() =>
    axios.post(
      env.LUDWIG_VECTOR_GENERATION_ENDPOINT,
      {
        image_url: imageUrl,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  );

  if (errorRecord) return { errorRecord };

  const embeddings = data.vector;

  return { data: Array.from(embeddings) };
}
