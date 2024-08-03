import fs from "fs-extra";
import { logger } from "./logger";

/**
 * Utility functions for file system operations.
 * This module provides helper functions for common file and directory operations.
 */

/**
 * Ensures that a directory exists, creating it if necessary.
 * @param dirPath The path of the directory to ensure exists.
 * @throws Will throw an error if the directory cannot be created or accessed.
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
	try {
		await fs.mkdir(dirPath, { recursive: true });
		logger.debug(`Ensured directory exists: ${dirPath}`);
	} catch (error) {
		if (error instanceof Error) {
			if ("code" in error) {
				switch (error.code) {
					case "EEXIST":
						logger.debug(`Directory already exists: ${dirPath}`);
						return;
					case "EACCES":
						logger.warn(
							`Permission denied when creating directory: ${dirPath}`,
						);
						break;
					default:
						logger.error(`Failed to create directory: ${dirPath}`, error);
				}
			}
			throw new Error(
				`Failed to ensure directory exists: ${dirPath}. ${error.message}`,
			);
		}
		throw error;
	}
}
