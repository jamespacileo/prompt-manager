import { expect, test, describe, mock, jest } from "bun:test";
import { PromptManager, getPromptManager } from '../src/promptManager';

const mockPromptManager = {
  Category1: {
    PROMPT1: {
      name: 'PROMPT1',
      category: 'Category1',
      version: '1.0.0',
      content: 'This is prompt 1: {{param1}}',
      parameters: ['param1'],
      format: jest.fn((inputs: { param1: string }) => `Formatted: ${inputs.param1}`),
    },
  },
  Category2: {
    PROMPT2: {
      name: 'PROMPT2',
      category: 'Category2',
      version: '1.0.0',
      content: 'This is prompt 2: {{param2}}',
      parameters: ['param2'],
      format: jest.fn((inputs: { param2: string }) => `Formatted: ${inputs.param2}`),
    },
  },
};

mock.module('../src/promptManager', () => ({
  getPromptManager: () => mockPromptManager,
  PromptManager: jest.fn().mockImplementation(() => mockPromptManager),
}));

describe('PromptManager', () => {
  let manager: PromptManager;

  beforeEach(() => {
    manager = new PromptManager();
  });

  test('PromptManager returns the correct prompt', () => {
    expect(manager.Category1.PROMPT1).toBe(mockPromptManager.Category1.PROMPT1);
    expect(manager.Category2.PROMPT2).toBe(mockPromptManager.Category2.PROMPT2);
  });

  test('Prompt format function is called correctly', () => {
    const formattedPrompt = manager.Category1.PROMPT1.format({ param1: 'test' });
    expect(formattedPrompt).toBe('Formatted: test');
    expect(mockPromptManager.Category1.PROMPT1.format).toHaveBeenCalledWith({ param1: 'test' });
  });

  test('Accessing non-existent category throws an error', () => {
    expect(() => (manager as any).NonExistentCategory).toThrow();
  });

  test('Accessing non-existent prompt throws an error', () => {
    expect(() => (manager.Category1 as any).NON_EXISTENT_PROMPT).toThrow();
  });

  test('Prompt format function handles missing parameters', () => {
    const formattedPrompt = manager.Category1.PROMPT1.format({});
    expect(formattedPrompt).toBe('Formatted: undefined');
  });

  test('Prompt format function ignores extra parameters', () => {
    const formattedPrompt = manager.Category1.PROMPT1.format({ param1: 'test', extraParam: 'ignored' });
    expect(formattedPrompt).toBe('Formatted: test');
  });

  test('List all prompts', () => {
    const allPrompts = manager.listAllPrompts();
    expect(allPrompts).toEqual([
      { category: 'Category1', name: 'PROMPT1' },
      { category: 'Category2', name: 'PROMPT2' },
    ]);
  });

  test('List prompts by category', () => {
    const category1Prompts = manager.listPromptsByCategory('Category1');
    expect(category1Prompts).toEqual(['PROMPT1']);
  });

  test('Get prompt details', () => {
    const promptDetails = manager.getPromptDetails('Category1', 'PROMPT1');
    expect(promptDetails).toEqual({
      name: 'PROMPT1',
      category: 'Category1',
      version: '1.0.0',
      content: 'This is prompt 1: {{param1}}',
      parameters: ['param1'],
    });
  });

  test('Update prompt', () => {
    manager.updatePrompt('Category1', 'PROMPT1', {
      content: 'Updated prompt 1: {{param1}}',
      version: '1.1.0',
    });
    const updatedPrompt = manager.Category1.PROMPT1;
    expect(updatedPrompt.content).toBe('Updated prompt 1: {{param1}}');
    expect(updatedPrompt.version).toBe('1.1.0');
  });
});
