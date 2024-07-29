import path from 'path';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { PromptModel } from '../promptModel';

export function cleanName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[a-z]/, (chr) => chr.toLowerCase());
}

export function getPromptFilePath(basePath: string, category: string, name: string): string {
  const cleanCategory = cleanName(category);
  const cleanPromptName = cleanName(name);
  return path.join(basePath, category, name, 'prompt.json');
}

export function validateCategoryAndName(category: string, name: string): void {
  if (!category || !name || category.trim() === '' || name.trim() === '') {
    throw new Error('Prompt category and name are required and cannot be empty');
  }
}

export function mapPromptToFileInfo(prompt: PromptModel<any, any>, basePath: string): IPrompt<IPromptInput, IPromptOutput> & { filePath: string; cleanCategory: string; cleanName: string } {
  const promptData = prompt as unknown as IPrompt<IPromptInput, IPromptOutput>;
  const cleanCategory = cleanName(promptData.category);
  const cleanPromptName = cleanName(promptData.name);
  return {
    ...promptData,
    filePath: promptData.category && promptData.name
      ? getPromptFilePath(basePath, promptData.category, promptData.name)
      : '',
    cleanCategory,
    cleanName: cleanPromptName
  };
}

export function handlePromptNotFound(category: string, name: string): never {
  const cleanCategory = cleanName(category);
  const cleanPromptName = cleanName(name);
  throw new Error(`Prompt "${cleanPromptName}" in category "${cleanCategory}" does not exist`);
}

export function getCleanNames(category: string, name: string): { cleanCategory: string; cleanName: string } {
  return {
    cleanCategory: cleanName(category),
    cleanName: cleanName(name)
  };
}
