import { PromptManager, getPromptManager } from '../src/promptManager';
import { jest } from '@jest/globals';

jest.mock('../src/promptManager', () => ({
  getPromptManager: jest.fn(() => ({
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
  })),
  PromptManager: jest.fn().mockImplementation(() => getPromptManager()),
}));

describe('PromptManager', () => {
  let manager: PromptManager;

  beforeEach(() => {
    manager = new PromptManager();
  });

  test('PromptManager returns the correct prompt', () => {
    expect(manager.Category1.PROMPT1).toBe(promptManager.Category1.PROMPT1);
    expect(manager.Category2.PROMPT2).toBe(promptManager.Category2.PROMPT2);
  });

  test('Prompt format function is called correctly', () => {
    const formattedPrompt = manager.Category1.PROMPT1.format({ param1: 'test' });
    expect(formattedPrompt).toBe('Formatted: test');
    expect(promptManager.Category1.PROMPT1.format).toHaveBeenCalledWith({ param1: 'test' });
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
});
