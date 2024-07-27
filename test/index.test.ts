import { expect, test, describe } from "bun:test";
import * as index from '../src/index';
import { PromptManager } from '../src/promptManager';

describe.skip('index', () => {
  test('exports PromptManager', () => {
    expect(index.PromptManager).toBe(PromptManager);
  });

  test('exports generated content', () => {
    expect(index.PromptManager).toBeDefined();
  });
});
