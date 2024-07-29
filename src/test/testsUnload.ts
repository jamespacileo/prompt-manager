import fs from 'fs/promises';
import path from 'path';

async function cleanup() {
  const dirsToRemove = ['test_prompts', 'test_output'];
  const filesToRemove = ['test-fury-config.json'];

  for (const dir of dirsToRemove) {
    await fs.rm(dir, { recursive: true, force: true })
      .then(() => console.log(`Removed ${dir}`))
      .catch(console.error);
  }

  for (const file of filesToRemove) {
    await fs.unlink(file)
      .then(() => console.log(`Removed ${file}`))
      .catch(console.error);
  }
}

// cleanup().then(() => console.log('Cleanup complete'));
