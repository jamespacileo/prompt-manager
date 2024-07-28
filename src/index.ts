export * from './generated';
export { PromptManager } from './promptManager';
export * from './cli/commands';
export { PromptFileSystem } from './promptFileSystem';
export { PromptProjectConfigManager, configManager } from './config/PromptProjectConfigManager';
export { initManager } from './initializationManager';

import { initManager } from './initializationManager';
import { configManager } from './config/PromptProjectConfigManager';
import { PromptFileSystem } from './promptFileSystem';
import { PromptManager } from './promptManager';

export async function initializeSystem() {
  await initManager.initialize('configManager', () => configManager.initialize());
  await initManager.initialize('promptFileSystem', async () => await PromptFileSystem.getInstance(), ['configManager']);
  await initManager.initialize('promptManager', async () => await PromptManager.getInstance(), ['promptFileSystem']);
}
