import fs from "fs-extra";
import path from "node:path";

async function cleanupTests() {
	const testDirs = [
		path.join(process.cwd(), "test-prompts"),
		path.join(process.cwd(), "test-prompts-manager"),
		path.join(process.cwd(), "test-prompts-cli"),
	];

	for (const dir of testDirs) {
		try {
			await fs.rm(dir, { recursive: true, force: true });
			logger.info(`Cleaned up test directory: ${dir}`);
		} catch (error) {
			logger.error(`Error cleaning up ${dir}:`, error);
		}
	}
}

cleanupTests().then(() => logger.info("Test cleanup completed."));
