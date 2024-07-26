import { expect, test, describe, beforeEach } from "@jest/globals";
import { jest } from '@jest/globals';
import { createPrompt, listPrompts, updatePrompt, generateTypes } from '../src/commands';
import { PromptManager } from '../src/promptManager';
import fs from 'fs-extra';

jest.mock('../src/promptManager');
jest.mock('fs-extra', () => ({}));

const mockPromptManager = {
  createPrompt: jest.fn(),
  listPrompts: jest.fn(),
  updatePrompt: jest.fn(),
  getPrompt: jest.fn(),
};

describe('commands', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    console.log = jest.fn();
  });

  test('createPrompt creates a new prompt', async () => {
    await createPrompt('TEST_PROMPT', { category: 'Test' });
    expect(mockPromptManager.createPrompt).toHaveBeenCalledWith(expect.objectContaining({
      name: 'TEST_PROMPT',
      category: 'Test',
    }));
    expect(console.log).toHaveBeenCalledWith('Prompt "TEST_PROMPT" created successfully.');
  });

  test('listPrompts lists all prompts', async () => {
    mockPromptManager.listPrompts.mockResolvedValue(['PROMPT1', 'PROMPT2']);
    await listPrompts();
    expect(mockPromptManager.listPrompts).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Available prompts:');
    expect(console.log).toHaveBeenCalledWith('- PROMPT1');
    expect(console.log).toHaveBeenCalledWith('- PROMPT2');
  });

  test('updatePrompt updates an existing prompt', async () => {
    await updatePrompt('TEST_PROMPT', { content: 'Updated content' });
    expect(mockPromptManager.updatePrompt).toHaveBeenCalledWith('TEST_PROMPT', { content: 'Updated content' });
    expect(console.log).toHaveBeenCalledWith('Prompt "TEST_PROMPT" updated successfully.');
  });

  test('generateTypes generates type definitions', async () => {
    mockPromptManager.listPrompts.mockResolvedValue(['PROMPT1', 'PROMPT2']);
    mockPromptManager.getPrompt.mockResolvedValue({
      category: 'Test',
      name: 'PROMPT1',
      parameters: ['param1', 'param2'],
    });
    await generateTypes();
    expect(fs.writeFile).toHaveBeenCalledWith('prompts.d.ts', expect.any(String));
    expect(console.log).toHaveBeenCalledWith('Type definitions generated successfully.');
  });
});
