import { googleGeminiEmbed004 } from '@worker/config/gemini.js';
import { asyncTryCatch } from '@worker/utils/try-catch.js';
import { embed } from 'ai';

export async function productTextEmbeddingGeneratorAi(text: string) {
  const { data: embeddingResult, errorRecord } = await asyncTryCatch(() =>
    embed({
      model: googleGeminiEmbed004,
      value: text,
    })
  );
  if (errorRecord) return { errorRecord };

  return { data: embeddingResult.embedding };
}
