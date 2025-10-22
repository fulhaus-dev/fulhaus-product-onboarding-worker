import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@worker/config/environment.js";

export const r2Client = new S3Client({
	region: "auto",
	endpoint: env.CLOUDFLARE_R2_ENDPOINT,
	credentials: {
		accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
		secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
	},
	requestHandler: {
		requestTimeout: 0, // Set to 0 to disable timeout
	},
	// Fix for AWS SDK v3.729.0+ compatibility with R2
	// Only calculate checksums when required, not for all operations
	requestChecksumCalculation: "WHEN_REQUIRED",
	responseChecksumValidation: "WHEN_REQUIRED",
});
