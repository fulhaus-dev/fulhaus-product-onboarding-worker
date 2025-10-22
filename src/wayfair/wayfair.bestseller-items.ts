import r2 from "@worker/utils/r2.js";

const { data, errorRecord } = await r2.getWayfairBestsellerItemsGroupIds();

if (errorRecord) {
	console.error(
		`❌ Could not fetch wayfair bestseller item group ids. ${JSON.stringify(errorRecord, null, 4)}`
	);
	process.exit(1);
}

if (data) console.info(`Fetched ${data.split(",").length} wayfair bestseller item group ids.`);

export const bestSellerItemsGroupIdsSet = new Set(data?.split(",").map((groupId) => groupId));
