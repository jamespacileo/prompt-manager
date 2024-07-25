import fs from 'fs-extra';
import path from 'path';
import { discoverPrompts, generateTypes, generateImplementation, generate } from '../scripts/generate';
import { jest } from '@jest/globals';

jest.mock('fs-extra');

describe('generate script', () => {
  const mockPrompts = [
    {
      name: 'PROMPT1',
      category: 'Category1',
      version: '1.0.0',
      content: 'This is prompt 1: {{param1}}',
      parameters: ['param1'],
    },
    {
      name: 'PROMPT2',
      category: 'Category2',
      version: '1.0.0',
      content: 'This is prompt 2: {{param2}}',
      parameters: ['param2'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('discoverPrompts discovers prompts correctly', async () => {
    (fs.readdir as jest.Mock).mockResolvedValueOnce(['Category1', 'Category2']);
    (fs.readdir as jest.Mock).mockResolvedValue(['prompt.json']);
    (fs.readJson as jest.Mock).mockResolvedValueOnce(mockPrompts[0]).mockResolvedValueOnce(mockPrompts[1]);

    const result = await discoverPrompts();
    expect(result).toEqual(mockPrompts);
  });

  test('generateTypes generates correct type definitions', () => {
    const result = generateTypes(mockPrompts);
    expect(result).toContain('export interface PromptManager');
    expect(result).toContain('Category1:');
    expect(result).toContain('Category2:');
    expect(result).toContain('PROMPT1:');
    expect(result).toContain('PROMPT2:');
  });

  test('generateImplementation generates correct implementation', () => {
    const result = generateImplementation(mockPrompts);
    expect(result).toContain('const promptManager: PromptManager = {');
    expect(result).toContain('Category1:');
    expect(result).toContain('Category2:');
    expect(result).toContain('PROMPT1:');
    expect(result).toContain('PROMPT2:');
    expect(result).toContain('format: (inputs) =>');
  });

  test('generate function runs the entire process', async () => {
    (fs.readdir as jest.Mock).mockResolvedValueOnce(['Category1', 'Category2']);
    (fs.readdir as jest.Mock).mockResolvedValue(['prompt.json']);
    (fs.readJson as jest.Mock).mockResolvedValueOnce(mockPrompts[0]).mockResolvedValueOnce(mockPrompts[1]);

    await generate();

    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledTimes(3); // types.ts, promptManager.ts, index.ts
  });
});
