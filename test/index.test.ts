import * as index from '../src/index';
import { PromptManager } from '../src/promptManager';

describe('index', () => {
  test('exports PromptManager', () => {
    expect(index.PromptManager).toBe(PromptManager);
  });

  test('exports generated content', () => {
    expect(index.promptManager).toBeDefined();
  });
});
