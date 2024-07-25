import { PromptManager, Prompt } from '../src/promptManager';
import fs from 'fs-extra';
import path from 'path';

jest.mock('fs-extra');

describe('PromptManager', () => {
  const mockPrompt: Prompt = {
    name: 'TEST_PROMPT',
    category: 'Test',
    version: '1.0.0',
    content: 'This is a test prompt: {{parameter}}',
    parameters: ['parameter'],
    metadata: {
      description: 'A test prompt',
      created: '2024-07-25T12:00:00Z',
      lastModified: '2024-07-25T12:00:00Z',
    },
    versions: ['1.0.0'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createPrompt creates a new prompt', async () => {
    await PromptManager.createPrompt(mockPrompt);
    expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining(mockPrompt.name));
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.stringContaining('prompt.json'),
      mockPrompt,
      expect.anything()
    );
  });

  test('getPrompt retrieves an existing prompt', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readJson as jest.Mock).mockResolvedValue(mockPrompt);

    const result = await PromptManager.getPrompt(mockPrompt.name);
    expect(result).toEqual(mockPrompt);
  });

  test('updatePrompt updates an existing prompt', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readJson as jest.Mock).mockResolvedValue(mockPrompt);

    const updates = { content: 'Updated content' };
    await PromptManager.updatePrompt(mockPrompt.name, updates);
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.stringContaining('prompt.json'),
      expect.objectContaining(updates),
      expect.anything()
    );
  });

  test('listPrompts returns a list of prompt names', async () => {
    const mockDirs = ['prompt1', 'prompt2'];
    (fs.readdir as jest.Mock).mockResolvedValue(mockDirs);
    (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

    const result = await PromptManager.listPrompts();
    expect(result).toEqual(mockDirs);
  });
});
