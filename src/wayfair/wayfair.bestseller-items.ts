import { env } from "@worker/config/environment.js";

export const bestSellerItemsGroupIdsSet = new Set(
	env.WAYFAIR_BESTSELLER_ITEMS_GROUP_IDS.split(",").map((groupId) => groupId)
);
