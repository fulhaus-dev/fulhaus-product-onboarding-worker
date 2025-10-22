// import type { Readable } from "stream";

// import { env } from "@worker/config/environment.js";
// import logger from "@worker/utils/logger.js";
// import productFileSimpleHeaderMapGeneratorAi from "@worker/v1/ai/ai.product-file-simple-header-map-generator.js";
// import type { FileConfig } from "@worker/v1/processor/processor.type.js";
// import processProductLinesWorker, { productQueue } from "@worker/v1/processor/processor.worker.js";
// import { logProductErrorService } from "@worker/v1/product/product.service.js";

// export default async function processFlatFileProductDataStream({
// 	flatFileStream,
// 	vendorId,
// 	ownerId,
// 	fileName,
// }: {
// 	flatFileStream: NodeJS.ReadableStream;
// 	vendorId: string;
// 	ownerId?: string;
// 	fileName: string;
// }) {
// 	logger.info(`✅ Started processing lines from ${fileName} for vendor ${vendorId}`);

// 	return new Promise<void>((resolve, reject) => {
// 		let totalCount = 0;
// 		let buffer = "";
// 		let fileFieldMapLines: string[] = [];
// 		let fileConfig: FileConfig | null = null;
// 		let isPaused = false;

// 		const stream = flatFileStream as Readable;

// 		// Helper function to queue lines with backpressure handling
// 		const queueLinesWithBackpressure = async (
// 			lines: string[],
// 			config: FileConfig
// 		): Promise<void> => {
// 			const accepted = processProductLinesWorker(lines, config, {
// 				vendorId,
// 				ownerId,
// 			});

// 			if (!accepted) {
// 				stream.pause();
// 				isPaused = true;
// 				await waitForQueueSpace();
// 				isPaused = false;
// 				processProductLinesWorker(lines, config, {
// 					vendorId,
// 					ownerId,
// 				});
// 				stream.resume();
// 			}

// 			totalCount += lines.length;
// 		};

// 		stream.on("data", async (chunk) => {
// 			stream.pause();

// 			buffer += chunk.toString("utf8");
// 			const lines = buffer.split(/\r\n|\n|\r/);
// 			buffer = lines.pop() || "";

// 			if (!fileConfig) fileFieldMapLines.push(...lines);

// 			if (fileFieldMapLines.length > 1 && !fileConfig) {
// 				const { data, errorRecord } =
// 					await productFileSimpleHeaderMapGeneratorAi(fileFieldMapLines);

// 				if (errorRecord) {
// 					logProductErrorService({
// 						...errorRecord,
// 						details: [
// 							...(errorRecord.details ?? []),
// 							{
// 								function: "productFileSimpleHeaderMapGeneratorAi",
// 								extract: fileFieldMapLines,
// 							},
// 						],
// 					});
// 					stream.destroy();
// 					reject(new Error("Failed to generate file config"));
// 					return;
// 				}

// 				fileConfig = data;
// 				await queueLinesWithBackpressure(fileFieldMapLines, fileConfig);
// 				fileFieldMapLines = [];

// 				if (!isPaused) stream.resume();
// 				return;
// 			}

// 			if (!fileConfig) {
// 				if (!isPaused) stream.resume();
// 				return;
// 			}

// 			if (lines.length > 0) await queueLinesWithBackpressure(lines, fileConfig);

// 			if (!isPaused) stream.resume();
// 		});

// 		stream.on("end", async () => {
// 			// Process final buffer
// 			if (buffer.trim() && fileConfig) {
// 				await queueLinesWithBackpressure([buffer], fileConfig);
// 			}

// 			logger.info(`✅ Completed ${totalCount} lines from ${fileName} for vendor ${vendorId}`);
// 			resolve();
// 		});

// 		stream.on("error", (err) => {
// 			logger.error(`Error processing ${fileName}: ${err.message}`);
// 			reject(err);
// 		});
// 	});
// }

// async function waitForQueueSpace(): Promise<void> {
// 	return new Promise((resolve) => {
// 		const checkInterval = setInterval(() => {
// 			if (productQueue.hasSpace()) {
// 				clearInterval(checkInterval);
// 				resolve();
// 			}
// 		}, env.PROCESSOR_QUEUE_CHECK_WAIT_INTERVAL);
// 	});
// }

// import type { Readable } from 'stream';

// import { env } from '@worker/config/environment.js';
// import logger from '@worker/utils/logger.js';
// import productFileSimpleHeaderMapGeneratorAi from '@worker/v1/ai/ai.product-file-simple-header-map-generator.js';
// import type { FileConfig } from '@worker/v1/processor/processor.type.js';
// import processProductLinesWorker, {
//   productQueue,
// } from '@worker/v1/processor/processor.worker.js';
// import { logProductErrorService } from '@worker/v1/product/product.service.js';

// interface ProcessingState {
//   totalCount: number;
//   buffer: string;
//   fileFieldMapLines: string[];
//   fileConfig: FileConfig | null;
//   isProcessingChunk: boolean;
//   hasError: boolean;
// }

// export default async function processFlatFileProductDataStream({
//   flatFileStream,
//   vendorId,
//   ownerId,
//   fileName,
// }: {
//   flatFileStream: NodeJS.ReadableStream;
//   vendorId: string;
//   ownerId?: string;
//   fileName: string;
// }): Promise<void> {
//   return new Promise<void>((resolve, reject) => {
//     const state: ProcessingState = {
//       totalCount: 0,
//       buffer: '',
//       fileFieldMapLines: [],
//       fileConfig: null,
//       isProcessingChunk: false,
//       hasError: false,
//     };

//     const stream = flatFileStream as Readable;
//     const pendingChunks: Buffer[] = [];
//     const maxPendingChunks = 3;
//     const waitInterval = env.PROCESSOR_QUEUE_CHECK_WAIT_INTERVAL || 50;

//     const queueLines = async (
//       lines: string[],
//       config: FileConfig
//     ): Promise<void> => {
//       let retries = 0;
//       const maxRetries = 2;

//       while (retries < maxRetries) {
//         if (processProductLinesWorker(lines, config, { vendorId, ownerId })) {
//           state.totalCount += lines.length;
//           return;
//         }

//         retries++;
//         if (retries < maxRetries) {
//           await waitForQueueSpace(waitInterval);
//         }
//       }

//       throw new Error(
//         `Failed to queue ${lines.length} lines after ${maxRetries} attempts`
//       );
//     };

//     const processChunk = async (chunk: Buffer): Promise<void> => {
//       if (state.hasError) return;

//       state.buffer += chunk.toString('utf8');
//       const lines = state.buffer.split(/\r\n|\n|\r/);
//       state.buffer = lines.pop() || '';

//       if (!state.fileConfig) {
//         state.fileFieldMapLines.push(...lines);

//         if (state.fileFieldMapLines.length > 1) {
//           const { data, errorRecord } =
//             await productFileSimpleHeaderMapGeneratorAi(
//               state.fileFieldMapLines
//             );

//           if (errorRecord) {
//             logProductErrorService({
//               ...errorRecord,
//               details: [
//                 ...(errorRecord.details ?? []),
//                 {
//                   function: 'productFileSimpleHeaderMapGeneratorAi',
//                   extract: state.fileFieldMapLines,
//                 },
//               ],
//             });
//             throw new Error('Failed to generate file config');
//           }

//           state.fileConfig = data;
//           await queueLines(state.fileFieldMapLines, state.fileConfig);
//           state.fileFieldMapLines = [];
//         }
//         return;
//       }

//       if (lines.length > 0) {
//         await queueLines(lines, state.fileConfig);
//       }
//     };

//     const processPendingChunks = async (): Promise<void> => {
//       if (state.isProcessingChunk || state.hasError) return;

//       state.isProcessingChunk = true;

//       try {
//         while (pendingChunks.length > 0 && !state.hasError) {
//           const chunk = pendingChunks.shift()!;
//           await processChunk(chunk);
//         }
//       } catch (error) {
//         state.hasError = true;
//         stream.destroy();
//         reject(error);
//         return;
//       } finally {
//         state.isProcessingChunk = false;
//       }

//       if (
//         pendingChunks.length === 0 &&
//         !state.hasError &&
//         !stream.readableFlowing
//       ) {
//         stream.resume();
//       }
//     };

//     stream.on('data', (chunk: Buffer) => {
//       pendingChunks.push(chunk);

//       if (pendingChunks.length > maxPendingChunks) {
//         stream.pause();
//       }

//       if (!state.isProcessingChunk) {
//         processPendingChunks().catch(reject);
//       }
//     });

//     stream.on('end', async () => {
//       if (state.hasError) return;

//       try {
//         const pendingTimeout = 10000;
//         const startWait = Date.now();

//         while (
//           pendingChunks.length > 0 &&
//           !state.hasError &&
//           Date.now() - startWait < pendingTimeout
//         ) {
//           await new Promise((resolve) => setTimeout(resolve, waitInterval));
//         }

//         if (pendingChunks.length > 0) {
//           throw new Error(
//             `Timeout waiting for pending chunks: ${pendingChunks.length} remaining`
//           );
//         }

//         if (state.buffer.trim() && state.fileConfig) {
//           await queueLines([state.buffer], state.fileConfig);
//         }

//         await productQueue.waitForCompletion();

//         logger.info(
//           `Completed ${fileName}: ${state.totalCount} lines processed`
//         );
//         resolve();
//       } catch (error) {
//         logger.error(`Error completing ${fileName}: ${error}`);
//         reject(error);
//       }
//     });

//     stream.on('error', (err) => {
//       state.hasError = true;
//       logger.error(`Stream error processing ${fileName}: ${err.message}`);
//       reject(err);
//     });

//     stream.on('close', () => {
//       // Silent close handling
//     });
//   });
// }

// async function waitForQueueSpace(pollInterval: number = 50): Promise<void> {
//   const maxWaitTime = 15000;
//   const startTime = Date.now();

//   return new Promise((resolve, reject) => {
//     const checkInterval = setInterval(() => {
//       if (productQueue.hasSpace()) {
//         clearInterval(checkInterval);
//         resolve();
//       } else if (Date.now() - startTime > maxWaitTime) {
//         clearInterval(checkInterval);
//         reject(
//           new Error(`Timeout waiting for queue space after ${maxWaitTime}ms`)
//         );
//       }
//     }, pollInterval);
//   });
// }

// import type { Readable } from "stream";

// import { env } from "@worker/config/environment.js";
// import logger from "@worker/utils/logger.js";
// import productFileSimpleHeaderMapGeneratorAi from "@worker/v1/ai/ai.product-file-simple-header-map-generator.js";
// import type { FileConfig } from "@worker/v1/processor/processor.type.js";
// import processProductLinesWorker, { productQueue } from "@worker/v1/processor/processor.worker.js";
// import { logProductErrorService } from "@worker/v1/product/product.service.js";

// interface ProcessingState {
// 	totalCount: number;
// 	buffer: string;
// 	fileFieldMapLines: string[];
// 	fileConfig: FileConfig | null;
// 	isProcessingChunk: boolean;
// 	hasError: boolean;
// }

// export default async function processFlatFileProductDataStream({
// 	flatFileStream,
// 	vendorId,
// 	ownerId,
// 	fileName,
// }: {
// 	flatFileStream: NodeJS.ReadableStream;
// 	vendorId: string;
// 	ownerId?: string;
// 	fileName: string;
// }): Promise<void> {
// 	return new Promise<void>((resolve, reject) => {
// 		const state: ProcessingState = {
// 			totalCount: 0,
// 			buffer: "",
// 			fileFieldMapLines: [],
// 			fileConfig: null,
// 			isProcessingChunk: false,
// 			hasError: false,
// 		};

// 		const stream = flatFileStream as Readable;
// 		const pendingChunks: Buffer[] = [];
// 		const maxPendingChunks = 3;
// 		const waitInterval = env.PROCESSOR_QUEUE_CHECK_WAIT_INTERVAL || 50;

// 		// OPTIMIZATION: Pre-compile regex for better performance
// 		const lineBreakRegex = /\r\n|\n|\r/;

// 		// OPTIMIZATION: Cache idArgs to avoid creating new object each time
// 		const idArgs = { vendorId, ownerId };

// 		const queueLines = async (lines: string[], config: FileConfig): Promise<void> => {
// 			let retries = 0;
// 			const maxRetries = 2;

// 			while (retries < maxRetries) {
// 				// OPTIMIZATION: Pass cached idArgs instead of creating new object
// 				if (processProductLinesWorker(lines, config, idArgs)) {
// 					state.totalCount += lines.length;
// 					return;
// 				}

// 				retries++;
// 				if (retries < maxRetries) {
// 					await waitForQueueSpace(waitInterval);
// 				}
// 			}

// 			throw new Error(`Failed to queue ${lines.length} lines after ${maxRetries} attempts`);
// 		};

// 		const processChunk = async (chunk: Buffer): Promise<void> => {
// 			if (state.hasError) return;

// 			// OPTIMIZATION: Use Buffer.toString() with cached encoding
// 			state.buffer += chunk.toString("utf8");

// 			// OPTIMIZATION: Use pre-compiled regex
// 			const lines = state.buffer.split(lineBreakRegex);
// 			state.buffer = lines.pop() || "";

// 			if (!state.fileConfig) {
// 				// OPTIMIZATION: Use push.apply for better performance than spread
// 				Array.prototype.push.apply(state.fileFieldMapLines, lines);

// 				if (state.fileFieldMapLines.length > 1) {
// 					const { data, errorRecord } = await productFileSimpleHeaderMapGeneratorAi(
// 						state.fileFieldMapLines
// 					);

// 					if (errorRecord) {
// 						logProductErrorService({
// 							...errorRecord,
// 							details: [
// 								...(errorRecord.details ?? []),
// 								{
// 									function: "productFileSimpleHeaderMapGeneratorAi",
// 									extract: state.fileFieldMapLines,
// 								},
// 							],
// 						});
// 						throw new Error("Failed to generate file config");
// 					}

// 					state.fileConfig = data;
// 					await queueLines(state.fileFieldMapLines, state.fileConfig);

// 					// OPTIMIZATION: Clear array efficiently
// 					state.fileFieldMapLines.length = 0;
// 				}
// 				return;
// 			}

// 			if (lines.length > 0) {
// 				await queueLines(lines, state.fileConfig);
// 			}
// 		};

// 		const processPendingChunks = async (): Promise<void> => {
// 			if (state.isProcessingChunk || state.hasError) return;

// 			state.isProcessingChunk = true;

// 			try {
// 				// OPTIMIZATION: Cache length check and use while for better performance
// 				while (pendingChunks.length > 0 && !state.hasError) {
// 					const chunk = pendingChunks.shift()!;
// 					await processChunk(chunk);
// 				}
// 			} catch (error) {
// 				state.hasError = true;
// 				stream.destroy();
// 				reject(error);
// 				return;
// 			} finally {
// 				state.isProcessingChunk = false;
// 			}

// 			// OPTIMIZATION: Check conditions once instead of multiple property accesses
// 			const shouldResume = pendingChunks.length === 0 && !state.hasError && !stream.readableFlowing;
// 			if (shouldResume) {
// 				stream.resume();
// 			}
// 		};

// 		stream.on("data", (chunk: Buffer) => {
// 			pendingChunks.push(chunk);

// 			if (pendingChunks.length > maxPendingChunks) {
// 				stream.pause();
// 			}

// 			if (!state.isProcessingChunk) {
// 				processPendingChunks().catch(reject);
// 			}
// 		});

// 		stream.on("end", async () => {
// 			if (state.hasError) return;

// 			try {
// 				const pendingTimeout = 10000;
// 				const startWait = Date.now();

// 				// OPTIMIZATION: Cache Date.now() - startWait calculation
// 				while (pendingChunks.length > 0 && !state.hasError) {
// 					const elapsed = Date.now() - startWait;
// 					if (elapsed >= pendingTimeout) {
// 						throw new Error(
// 							`Timeout waiting for pending chunks: ${pendingChunks.length} remaining after ${elapsed}ms`
// 						);
// 					}
// 					await new Promise((resolve) => setTimeout(resolve, waitInterval));
// 				}

// 				// OPTIMIZATION: Use trim once and cache result
// 				const trimmedBuffer = state.buffer.trim();
// 				if (trimmedBuffer && state.fileConfig) {
// 					await queueLines([state.buffer], state.fileConfig);
// 				}

// 				await productQueue.waitForCompletion();

// 				logger.info(`Completed ${fileName}: ${state.totalCount} lines processed`);
// 				resolve();
// 			} catch (error) {
// 				logger.error(`Error completing ${fileName}: ${error}`);
// 				reject(error);
// 			}
// 		});

// 		stream.on("error", (err) => {
// 			state.hasError = true;
// 			logger.error(`Stream error processing ${fileName}: ${err.message}`);
// 			reject(err);
// 		});

// 		stream.on("close", () => {
// 			// Silent close handling
// 		});
// 	});
// }

// // OPTIMIZATION: Improved waitForQueueSpace with better performance
// async function waitForQueueSpace(pollInterval: number = 50): Promise<void> {
// 	const maxWaitTime = 15000;
// 	const startTime = Date.now();

// 	return new Promise((resolve, reject) => {
// 		// OPTIMIZATION: Use arrow function to avoid 'this' binding overhead
// 		const checkInterval = setInterval(() => {
// 			if (productQueue.hasSpace()) {
// 				clearInterval(checkInterval);
// 				resolve();
// 				return; // Early return after resolve
// 			}

// 			const elapsed = Date.now() - startTime;
// 			if (elapsed > maxWaitTime) {
// 				clearInterval(checkInterval);
// 				reject(new Error(`Timeout waiting for queue space after ${elapsed}ms`));
// 			}
// 		}, pollInterval);
// 	});
// }

import type { Readable } from "stream";

import { env } from "@worker/config/environment.js";
import logger from "@worker/utils/logger.js";
import productFileSimpleHeaderMapGeneratorAi from "@worker/v1/ai/ai.product-file-simple-header-map-generator.js";
import type { FileConfig } from "@worker/v1/processor/processor.type.js";
import processProductLinesWorker, { productQueue } from "@worker/v1/processor/processor.worker.js";
import { logProductErrorService } from "@worker/v1/product/product.service.js";

interface ProcessingState {
	totalCount: number;
	buffer: string;
	fileFieldMapLines: string[];
	fileConfig: FileConfig | null;
	isProcessingChunk: boolean;
	hasError: boolean;
}

export default async function processFlatFileProductDataStream({
	flatFileStream,
	vendorId,
	ownerId,
	fileName,
}: {
	flatFileStream: NodeJS.ReadableStream;
	vendorId: string;
	ownerId?: string;
	fileName: string;
}): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const state: ProcessingState = {
			totalCount: 0,
			buffer: "",
			fileFieldMapLines: [],
			fileConfig: null,
			isProcessingChunk: false,
			hasError: false,
		};

		const stream = flatFileStream as Readable;
		const pendingChunks: Buffer[] = [];
		const maxPendingChunks = 3;
		const waitInterval = env.PROCESSOR_QUEUE_CHECK_WAIT_INTERVAL || 50;

		// OPTIMIZATION: Pre-compile regex for better performance
		const lineBreakRegex = /\r\n|\n|\r/;

		// OPTIMIZATION: Cache idArgs to avoid creating new object each time
		const idArgs = { vendorId, ownerId };

		const queueLines = async (lines: string[], config: FileConfig): Promise<void> => {
			let retries = 0;
			const maxRetries = 2;

			while (retries < maxRetries) {
				// OPTIMIZATION: Pass cached idArgs instead of creating new object
				if (processProductLinesWorker(lines, config, idArgs)) {
					state.totalCount += lines.length;
					return;
				}

				retries++;
				if (retries < maxRetries) {
					await waitForQueueSpace(waitInterval);
				}
			}

			throw new Error(`Failed to queue ${lines.length} lines after ${maxRetries} attempts`);
		};

		const processChunk = async (chunk: Buffer): Promise<void> => {
			if (state.hasError) return;

			// OPTIMIZATION: Use Buffer.toString() with cached encoding
			state.buffer += chunk.toString("utf8");

			// OPTIMIZATION: Use pre-compiled regex
			const lines = state.buffer.split(lineBreakRegex);
			state.buffer = lines.pop() || "";

			if (!state.fileConfig) {
				// OPTIMIZATION: Use push.apply for better performance than spread
				Array.prototype.push.apply(state.fileFieldMapLines, lines);

				if (state.fileFieldMapLines.length > 1) {
					const { data, errorRecord } = await productFileSimpleHeaderMapGeneratorAi(
						state.fileFieldMapLines
					);

					if (errorRecord) {
						logProductErrorService({
							...errorRecord,
							details: [
								...(errorRecord.details ?? []),
								{
									function: "productFileSimpleHeaderMapGeneratorAi",
									extract: state.fileFieldMapLines,
								},
							],
						});
						throw new Error("Failed to generate file config");
					}

					state.fileConfig = data;
					await queueLines(state.fileFieldMapLines, state.fileConfig);

					// OPTIMIZATION: Clear array efficiently
					state.fileFieldMapLines.length = 0;
				}
				return;
			}

			if (lines.length > 0) {
				await queueLines(lines, state.fileConfig);
			}
		};

		const processPendingChunks = async (): Promise<void> => {
			if (state.isProcessingChunk || state.hasError) return;

			state.isProcessingChunk = true;

			try {
				// OPTIMIZATION: Cache length check and use while for better performance
				while (pendingChunks.length > 0 && !state.hasError) {
					const chunk = pendingChunks.shift()!;
					await processChunk(chunk);
				}
			} catch (error) {
				state.hasError = true;
				stream.destroy();
				reject(error);
				return;
			} finally {
				state.isProcessingChunk = false;
			}

			// OPTIMIZATION: Check conditions once instead of multiple property accesses
			const shouldResume = pendingChunks.length === 0 && !state.hasError && !stream.readableFlowing;
			if (shouldResume) {
				stream.resume();
			}
		};

		stream.on("data", (chunk: Buffer) => {
			pendingChunks.push(chunk);

			if (pendingChunks.length > maxPendingChunks) {
				stream.pause();
			}

			if (!state.isProcessingChunk) {
				processPendingChunks().catch(reject);
			}
		});

		stream.on("end", async () => {
			if (state.hasError) return;

			try {
				const pendingTimeout = 10000;
				const startWait = Date.now();

				// OPTIMIZATION: Cache Date.now() - startWait calculation
				while (pendingChunks.length > 0 && !state.hasError) {
					const elapsed = Date.now() - startWait;
					if (elapsed >= pendingTimeout) {
						throw new Error(
							`Timeout waiting for pending chunks: ${pendingChunks.length} remaining after ${elapsed}ms`
						);
					}
					await new Promise((resolve) => setTimeout(resolve, waitInterval));
				}

				// OPTIMIZATION: Use trim once and cache result
				const trimmedBuffer = state.buffer.trim();
				if (trimmedBuffer && state.fileConfig) {
					await queueLines([state.buffer], state.fileConfig);
				}

				await productQueue.waitForCompletion();

				logger.info(`Completed ${fileName}: ${state.totalCount} lines processed`);
				resolve();
			} catch (error) {
				logger.error(`Error completing ${fileName}: ${error}`);
				reject(error);
			}
		});

		stream.on("error", (err) => {
			state.hasError = true;
			logger.error(`Stream error processing ${fileName}: ${err.message}`);
			reject(err);
		});

		stream.on("close", () => {
			// Silent close handling
		});
	});
}

// OPTIMIZATION: Improved waitForQueueSpace with better performance
async function waitForQueueSpace(pollInterval: number = 50): Promise<void> {
	const maxWaitTime = 15000;
	const startTime = Date.now();

	return new Promise((resolve, reject) => {
		// OPTIMIZATION: Use arrow function to avoid 'this' binding overhead
		const checkInterval = setInterval(() => {
			if (productQueue.hasSpace()) {
				clearInterval(checkInterval);
				resolve();
				return; // Early return after resolve
			}

			const elapsed = Date.now() - startTime;
			if (elapsed > maxWaitTime) {
				clearInterval(checkInterval);
				reject(new Error(`Timeout waiting for queue space after ${elapsed}ms`));
			}
		}, pollInterval);
	});
}
