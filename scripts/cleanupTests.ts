import fs from 'fs/promises';
import path from 'path';

async function cleanupTests() {
  const testDirs = [
    path.join(process.cwd(), 'test-prompts'),
    path.join(process.cwd(), 'test-prompts-manager'),
    path.join(process.cwd(), 'test-prompts-cli')
  ];

  for (const dir of testDirs) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      console.log(`Cleaned up test directory: ${dir}`);
    } catch (error) {
      console.error(`Error cleaning up ${dir}:`, error);
    }
  }
}

cleanupTests().then(() => console.log('Test cleanup completed.'));
