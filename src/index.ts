export * from './generated';
export { PromptManager } from './promptManager';
export * from './cli/commands';
export { PromptFileSystem, getFileSystemManager } from './promptFileSystem';
export { PromptProjectConfigManager, getConfigManager } from './config/PromptProjectConfigManager';
export { initManager } from './initializationManager';

import { initManager } from './initializationManager';
import { getConfigManager } from './config/PromptProjectConfigManager';
import { PromptFileSystem } from './promptFileSystem';
import { PromptManager } from './promptManager';

export async function initializeSystem() {
  // await initManager.initialize('configManager', () => configManager.initialize());
  // await initManager.initialize('promptFileSystem', async () => await (await PromptFileSystem.getInstance()).initialize(), ['configManager']);
  // await initManager.initialize('promptManager', async () => (await PromptManager.getInstance()), ['promptFileSystem']);
  await PromptFileSystem.getInstance();
  await PromptManager.getInstance();
}
