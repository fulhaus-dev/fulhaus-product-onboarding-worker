import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '@worker/config/environment.js';

const googleGemini = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GEMINI_API_KEY,
});

export const googleGemini2_5FlashLiteLlm = googleGemini.languageModel(
  'gemini-2.5-flash-lite'
);

export const googleGemini2_5FlashLlm =
  googleGemini.languageModel('gemini-2.5-flash');

export const googleGemini2_5ProLlm =
  googleGemini.languageModel('gemini-2.5-pro');
