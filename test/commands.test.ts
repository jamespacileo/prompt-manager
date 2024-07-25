import { createPrompt, listPrompts, updatePrompt, generateTypes } from '../src/commands';
import { PromptManager } from '../src/promptManager';
import fs from 'fs-extra';
import { jest } from '@jest/globals';

jest.mock('../src/promptManager');
jest.mock('fs-extra');

describe('commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  test('createPrompt creates a new prompt', async () => {
    await createPrompt('TEST_PROMPT', { category: 'Test' });
    expect(PromptManager.createPrompt).toHaveBeenCalledWith(expect.objectContaining({
      name: 'TEST_PROMPT',
      category: 'Test',
    }));
    expect(console.log).toHaveBeenCalledWith('Prompt "TEST_PROMPT" created successfully.');
  });

  test('listPrompts lists all prompts', async () => {
    (PromptManager.listPrompts as jest.Mock).mockResolvedValue(['PROMPT1', 'PROMPT2']);
    await listPrompts();
    expect(PromptManager.listPrompts).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Available prompts:');
    expect(console.log).toHaveBeenCalledWith('- PROMPT1');
    expect(console.log).toHaveBeenCalledWith('- PROMPT2');
  });

  test('updatePrompt updates an existing prompt', async () => {
    await updatePrompt('TEST_PROMPT', { content: 'Updated content' });
    expect(PromptManager.updatePrompt).toHaveBeenCalledWith('TEST_PROMPT', { content: 'Updated content' });
    expect(console.log).toHaveBeenCalledWith('Prompt "TEST_PROMPT" updated successfully.');
  });

  test('generateTypes generates type definitions', async () => {
    (PromptManager.listPrompts as jest.Mock).mockResolvedValue(['PROMPT1', 'PROMPT2']);
    (PromptManager.getPrompt as jest.Mock).mockResolvedValue({
      category: 'Test',
      name: 'PROMPT1',
      parameters: ['param1', 'param2'],
    });
    await generateTypes();
    expect(fs.writeFile).toHaveBeenCalledWith('prompts.d.ts', expect.any(String));
    expect(console.log).toHaveBeenCalledWith('Type definitions generated successfully.');
  });
});
