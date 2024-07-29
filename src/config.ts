import { Container } from 'typedi';
import { PromptProjectConfigManager } from './config/PromptProjectConfigManager';
import { Config } from './schemas/config';

export async function initializeConfig(): Promise<void> {
  const configManager = Container.get(PromptProjectConfigManager);
  await configManager.initialize();
}

export async function getConfig<K extends keyof Config>(key: K): Promise<Config[K]> {
  const configManager = Container.get(PromptProjectConfigManager);
  return configManager.getConfig(key);
}

export async function getAllConfig(): Promise<Config> {
  const configManager = Container.get(PromptProjectConfigManager);
  return configManager.getAllConfig();
}

export async function updateConfig(updates: Partial<Config>): Promise<void> {
  const configManager = Container.get(PromptProjectConfigManager);
  await configManager.updateConfig(updates);
}

export type { Config };