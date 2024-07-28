import { configManager } from './config/PromptProjectConfigManager';
import { Config } from './schemas/config';

export async function initializeConfig(): Promise<void> {
  await configManager.initialize();
}

export function getConfig<K extends keyof Config>(key: K): Config[K] {
  return configManager.getConfigTyped(key);
}

export function getAllConfig(): Config {
  return configManager.getAllConfig();
}

export async function updateConfig(updates: Partial<Config>): Promise<void> {
  await configManager.updateConfig(updates);
}

export type { Config };
