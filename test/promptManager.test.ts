import { PromptManager } from '../src/promptManager';
import { promptManager } from '../src/generated';

jest.mock('../src/generated', () => ({
  promptManager: {
    Category1: {
      PROMPT1: {
        name: 'PROMPT1',
        category: 'Category1',
        version: '1.0.0',
        content: 'This is prompt 1: {{param1}}',
        parameters: ['param1'],
        format: jest.fn((inputs) => `Formatted: ${inputs.param1}`),
      },
    },
    Category2: {
      PROMPT2: {
        name: 'PROMPT2',
        category: 'Category2',
        version: '1.0.0',
        content: 'This is prompt 2: {{param2}}',
        parameters: ['param2'],
        format: jest.fn((inputs) => `Formatted: ${inputs.param2}`),
      },
    },
  },
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
});
