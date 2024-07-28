import { getConfigManager } from './config/PromptProjectConfigManager';
import { Config } from './schemas/config';

export async function initializeConfig(): Promise<void> {
  const configManager = await getConfigManager();
  await configManager.isInitialized();
}

export async function getConfig<K extends keyof Config>(key: K): Promise<Config[K]> {
  const configManager = await getConfigManager();
  return configManager.getConfigTyped(key);
}

export async function getAllConfig(): Promise<Config> {
  const configManager = await getConfigManager();
  return configManager.getAllConfig();
}

export async function updateConfig(updates: Partial<Config>): Promise<void> {
  const configManager = await getConfigManager();
  await configManager.updateConfig(updates);
}

export type { Config };
