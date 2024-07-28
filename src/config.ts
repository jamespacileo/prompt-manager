import { configManager, Config } from './config/PromptProjectConfigManager';

export async function initializeConfig(): Promise<void> {
  await configManager.initialize();
}

export function getConfig<K extends keyof Config>(key: K): Config[K] {
  return configManager.getConfig(key);
}

export function getAllConfig(): Config {
  return configManager.getAllConfig();
}

export async function updateConfig(updates: Partial<Config>): Promise<void> {
  await configManager.updateConfig(updates);
}

export type { Config };
