import fs from 'fs/promises';
import path from 'path';

async function cleanup() {
  const dirsToRemove = ['test_prompts', 'test_output'];
  const filesToRemove = ['test-fury-config.json'];

  for (const dir of dirsToRemove) {
    await fs.rm(dir, { recursive: true, force: true })
      .then(() => logger.info(`Removed ${dir}`))
      .catch(logger.error);
  }

  for (const file of filesToRemove) {
    await fs.unlink(file)
      .then(() => logger.info(`Removed ${file}`))
      .catch(logger.error);
  }
}

// cleanup().then(() => logger.info('Cleanup complete'));
