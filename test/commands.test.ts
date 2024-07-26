import { expect, test, describe, mock, jest } from "bun:test";
import { createPrompt, listPrompts, updatePrompt, generateTypes } from '../src/commands';
import { PromptManager } from '../src/promptManager';
import fs from 'fs-extra';
import { beforeEach } from "node:test";

mock.module('../src/promptManager', () => ({
  PromptManager: {
    createPrompt: jest.fn(),
    listPrompts: jest.fn(),
    updatePrompt: jest.fn(),
    getPrompt: jest.fn(),
  },
}));
mock.module('fs-extra', () => ({}));

describe('commands', () => {
  beforeEach(() => {
    mock.restore();
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
    mock.module('../src/promptManager', () => ({
      PromptManager: {
        listPrompts: () => Promise.resolve(['PROMPT1', 'PROMPT2']),
      },
    }));
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
    mock.module('../src/promptManager', () => ({
      PromptManager: {
        listPrompts: () => Promise.resolve(['PROMPT1', 'PROMPT2']),
        getPrompt: () => Promise.resolve({
          category: 'Test',
          name: 'PROMPT1',
          parameters: ['param1', 'param2'],
        }),
      },
    }));
    await generateTypes();
    expect(fs.writeFile).toHaveBeenCalledWith('prompts.d.ts', expect.any(String));
    expect(console.log).toHaveBeenCalledWith('Type definitions generated successfully.');
  });
});
