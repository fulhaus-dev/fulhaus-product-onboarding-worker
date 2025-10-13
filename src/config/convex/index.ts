import { env } from '@worker/config/environment.js';
import { ConvexHttpClient } from 'convex/browser';

export const convexHttpClient = new ConvexHttpClient(env.CONVEX_URL);
