import lockfile from "proper-lockfile";
import { logger } from "./logger";

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 100; // ms

export async function withLock<T>(
	path: string,
	operation: () => Promise<T>,
	retries = MAX_RETRIES,
): Promise<T> {
	let release;
	try {
		release = await acquireLock(path, retries);
		return await operation();
	} finally {
		if (release) {
			await release();
		}
	}
}

async function acquireLock(
	path: string,
	retriesLeft: number,
	delay: number = INITIAL_RETRY_DELAY,
): Promise<lockfile.ReleaseFn> {
	try {
		return await lockfile.lock(path, { retries: 0 });
	} catch (error) {
		if (retriesLeft === 0) {
			throw new Error(`Failed to acquire lock for ${path}: ${error}`);
		}
		logger.warn(
			`Lock acquisition failed for ${path}. Retrying in ${delay}ms...`,
		);
		await new Promise((resolve) => setTimeout(resolve, delay));
		return acquireLock(path, retriesLeft - 1, delay * 2);
	}
}
