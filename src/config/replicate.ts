import { env } from '@worker/config/environment.js';
import Replicate from 'replicate';

export const replicate = new Replicate({
  auth: env.REPLICATE_API_TOKEN,
});
