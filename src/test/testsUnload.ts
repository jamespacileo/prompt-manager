import path from "node:path";
import fs from "fs-extra";

async function cleanup() {
	const dirsToRemove = ["test_prompts", "test_output"];
	const filesToRemove = ["test-fury-config.json"];

	for (const dir of dirsToRemove) {
		await fs
			.rm(dir, { recursive: true, force: true })
			.then(() => console.info(`Removed ${dir}`))
			.catch(console.error);
	}

	for (const file of filesToRemove) {
		await fs
			.unlink(file)
			.then(() => console.info(`Removed ${file}`))
			.catch(console.error);
	}
}

// cleanup().then(() => console.info('Cleanup complete'));
