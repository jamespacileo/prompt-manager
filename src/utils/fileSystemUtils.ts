import fs from 'fs-extra';
import { logger } from './logger';

export async function checkDiskSpace(dir: string): Promise<void> {
  try {
    const stats = await fs.statfs(dir);
    const freeSpace = stats.bfree * stats.bsize;
    const minRequiredSpace = 1024 * 1024 * 100; // 100 MB

    if (freeSpace < minRequiredSpace) {
      throw new Error(`Insufficient disk space. Only ${freeSpace / (1024 * 1024)} MB available.`);
    }
  } catch (error) {
    logger.error(`Failed to check disk space: ${error.message}`);
    throw error;
  }
}
