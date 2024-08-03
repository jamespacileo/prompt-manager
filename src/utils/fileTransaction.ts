import path from "node:path";
import fs from "fs-extra";
import type lockfile from "proper-lockfile";
import { retryLock } from "./lockUtils";

type Operation = {
	type: "write" | "read" | "delete";
	path: string;
	data?: string;
};

export class FileTransaction {
	private operations: Operation[] = [];

	async write(filePath: string, data: string): Promise<void> {
		this.operations.push({ type: "write", path: filePath, data });
	}

	async read(filePath: string): Promise<string> {
		this.operations.push({ type: "read", path: filePath });
		return fs.readFile(filePath, "utf-8");
	}

	async delete(filePath: string): Promise<void> {
		this.operations.push({ type: "delete", path: filePath });
	}

	async commit(): Promise<void> {
		const lockPath = path.dirname(this.operations[0].path);
		let release: (() => Promise<void>) | undefined;

		try {
			release = await retryLock(lockPath, 5, 1000);

			for (const op of this.operations) {
				switch (op.type) {
					case "write":
						if (op.data !== undefined) {
							await fs.writeFile(op.path, op.data);
						} else {
							console.error("Write operation missing data");
						}
						break;
					case "delete":
						await fs.remove(op.path);
						break;
					// "read" operations are not executed during commit
				}
			}
		} catch (error) {
			await this.rollback();
			throw error;
		} finally {
			if (release) {
				await release();
			}
		}
	}

	async rollback(): Promise<void> {
		for (let i = this.operations.length - 1; i >= 0; i--) {
			const op = this.operations[i];
			if (op.type === "write") {
				try {
					await fs.remove(op.path);
				} catch (error) {
					console.error(`Error rolling back write operation: ${error}`);
				}
			} else if (op.type === "delete") {
				try {
					if (op.data) {
						await fs.writeFile(op.path, op.data);
					}
				} catch (error) {
					console.error(`Error rolling back delete operation: ${error}`);
				}
			}
		}
	}
}
