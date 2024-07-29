import path from 'path';
import { describe, it, expect } from 'bun:test';
import { getPromptFilePath, validateCategoryAndName, mapPromptToFileInfo, handlePromptNotFound } from '../utils/promptManagerUtils';
import { PromptModel } from '../promptModel';

describe('promptManagerUtils', () => {
  describe('getPromptFilePath', () => {
    it('should return the correct file path', () => {
      const result = getPromptFilePath('/base/path', 'category', 'name');
      expect(result).toEqual('/base/path/category/name/prompt.json');
    });
  });

  describe('validateCategoryAndName', () => {
    it('should not throw for valid inputs', () => {
      expect(() => validateCategoryAndName('category', 'name')).not.toThrow();
    });

    it('should throw for empty category', () => {
      expect(() => validateCategoryAndName('', 'name')).toThrow('Prompt category and name are required and cannot be empty');
    });

    it('should throw for empty name', () => {
      expect(() => validateCategoryAndName('category', '')).toThrow('Prompt category and name are required and cannot be empty');
    });
  });

  describe('mapPromptToFileInfo', () => {
    it('should map prompt to file info', () => {
      const mockPrompt = {
        category: 'testCategory',
        name: 'testName',
        description: 'Test description',
        template: 'Test template',
        version: '1.0.0',
      } as PromptModel<any, any>;

      const result = mapPromptToFileInfo(mockPrompt, '/base/path');
      expect(result).toMatchSnapshot();
    });
  });

  describe('handlePromptNotFound', () => {
    it('should throw an error with the correct message', () => {
      expect(() => handlePromptNotFound('category', 'name')).toThrow('Prompt "name" in category "category" does not exist');
    });
  });
});
