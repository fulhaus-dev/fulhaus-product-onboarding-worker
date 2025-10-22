import { bestSellerItemsGroupIdsSet } from "@worker/wayfair/wayfair.bestseller-items.js";

export function wayfairProductLineContainsGroupId(line: string) {
	for (const groupId of bestSellerItemsGroupIdsSet) {
		if (line.includes(groupId)) return true;
	}

	return false;
}
