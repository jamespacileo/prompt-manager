import path from 'path';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { PromptModel } from '../promptModel';

export function getPromptFilePath(basePath: string, category: string, name: string): string {
  return path.join(basePath, category, name, 'prompt.json');
}

export function validateCategoryAndName(category: string, name: string): void {
  if (!category || !name || category.trim() === '' || name.trim() === '') {
    throw new Error('Prompt category and name are required and cannot be empty');
  }
}

export function mapPromptToFileInfo(prompt: PromptModel<any, any>, basePath: string): IPrompt<IPromptInput, IPromptOutput> & { filePath: string } {
  const promptData = prompt as unknown as IPrompt<IPromptInput, IPromptOutput>;
  return {
    ...promptData,
    filePath: promptData.category && promptData.name
      ? getPromptFilePath(basePath, promptData.category, promptData.name)
      : ''
  };
}

export function handlePromptNotFound(category: string, name: string): never {
  throw new Error(`Prompt "${name}" in category "${category}" does not exist`);
}
