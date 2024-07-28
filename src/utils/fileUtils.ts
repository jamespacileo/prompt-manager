import fs from 'fs/promises';

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
    await fs.access(dirPath);
    console.log(`Directory already exists: ${dirPath}`);
  } catch (error: Error | any) {
    if (error.code === 'ENOENT') {
      // Directory doesn't exist, create it
      try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
      } catch (mkdirError: Error | any) {
        if (mkdirError.code === 'EACCES') {
          console.warn(`Warning: Permission denied when creating directory: ${dirPath}. The application may not have write access to this location.`);
        } else {
          console.error(`Failed to create directory: ${dirPath}`, mkdirError);
          throw new Error(`Failed to create directory: ${dirPath}. Error: ${mkdirError.message}`);
        }
      }
    } else if (error.code === 'EACCES') {
      console.warn(`Warning: Permission denied when accessing directory: ${dirPath}. The application may not have read access to this location.`);
    } else {
      console.error(`Error accessing directory: ${dirPath}`, error);
      throw new Error(`Error accessing directory: ${dirPath}. Error: ${error.message}`);
    }
  }
}
