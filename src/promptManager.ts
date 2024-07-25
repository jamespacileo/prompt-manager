import { promptManager, PromptManager as GeneratedPromptManager } from './generated';

export class PromptManager implements GeneratedPromptManager {
  private constructor() {}

  static getInstance(): PromptManager {
    return promptManager as unknown as PromptManager;
  }
}

export function getPromptManager(): PromptManager {
  return PromptManager.getInstance();
}
