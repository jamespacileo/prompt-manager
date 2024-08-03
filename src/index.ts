import "reflect-metadata";
export * from "./generated";
export { PromptManager } from "./promptManager";
export * from "./cli/commands";
export { PromptFileSystem } from "./promptFileSystem";
export { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
export { initManager } from "./initializationManager";

import { Container } from "typedi";
import { PromptFileSystem } from "./promptFileSystem";
import { PromptManager } from "./promptManager";

export async function initializeSystem() {
	await Container.get(PromptFileSystem).initialize();
	await Container.get(PromptManager).initialize();
}
