import type { ProcessorFunctionResponse } from "@worker/shared/shared.type.js";
import { error } from "@worker/utils/error.js";

export function tryCatch<T>(fn: () => T): ProcessorFunctionResponse<T> {
	try {
		const data = fn();
		return { data };
	} catch (unknownError) {
		const errorRecord = error.exceptionErrorRecord(unknownError);
		return { errorRecord };
	}
}

export async function asyncTryCatch<T>(
	asyncFn: () => Promise<T>
): Promise<ProcessorFunctionResponse<T>> {
	try {
		const data = await asyncFn();
		return { data };
	} catch (unknownError) {
		const errorRecord = error.exceptionErrorRecord(unknownError);
		return { errorRecord };
	}
}
