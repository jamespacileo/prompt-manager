import { promptManager, PromptManager as GeneratedPromptManager } from './generated';

export class PromptManager implements GeneratedPromptManager {
  constructor() {
    return promptManager as unknown as PromptManager;
  }
}

export function getPromptManager(): PromptManager {
  return new PromptManager();
}
