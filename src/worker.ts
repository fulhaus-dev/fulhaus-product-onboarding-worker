import { env } from "@worker/config/environment.js";
import logger from "@worker/utils/logger.js";
import { processVendorProductDataService } from "@worker/v1/processor/processor.service.js";

processVendorProductDataService(env.VENDOR_NAME);

logger.info("Worker started");
