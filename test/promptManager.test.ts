import { getPromptManager } from '../src';

describe('PromptManager', () => {
  it('should initialize and provide prompts', async () => {
    const promptManager = await getPromptManager();
    // Add more specific tests based on your prompt structure
    expect(promptManager).toBeDefined();
  });
});
