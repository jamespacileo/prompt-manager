import lockfile from "proper-lockfile";
import { logger } from "./logger";

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 100; // ms

type LockRelease = () => Promise<void>;

export async function retryLock(
	path: string,
	maxRetries: number,
	delay: number,
): Promise<LockRelease> {
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await lockfile.lock(path);
		} catch (error) {
			if (i === maxRetries - 1) throw error;
			logger.warn(
				`Lock acquisition failed for ${path}. Retrying in ${delay}ms...`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw new Error(`Failed to acquire lock after ${maxRetries} attempts`);
}

export async function withLock<T>(
	path: string,
	operation: () => Promise<T>,
	retries = MAX_RETRIES,
): Promise<T> {
	let release: LockRelease = async () => {};
	try {
		release = await retryLock(path, retries, INITIAL_RETRY_DELAY);
		return await operation();
	} finally {
		if (release) {
			await release();
		}
	}
}
