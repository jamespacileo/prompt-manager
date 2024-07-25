import { promptManager, PromptManager as GeneratedPromptManager } from './generated';

export class PromptManager implements GeneratedPromptManager {
  constructor() {}

  static getInstance(): PromptManager {
    return promptManager as unknown as PromptManager;
  }

  Category1: any;
  Category2: any;
}

export function getPromptManager(): PromptManager {
  return PromptManager.getInstance();
}
