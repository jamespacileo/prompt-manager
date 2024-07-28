import fs from 'fs/promises';
import path from 'path';
import { IPromptFileSystem, IPrompt, IPromptInput, IPromptOutput, IPromptModelRequired, IPromptsFolderConfig } from './types/interfaces';
import { configManager } from './config/PromptProjectConfigManager';
import { PromptSchema } from './schemas/prompts';
import { PromptModel } from './promptModel';
import chalk from 'chalk';
import { z } from 'zod';

export const PROMPT_FILENAME = "prompt.json";
export const TYPE_DEFINITION_FILENAME = "prompt.d.ts";
export const PROMPTS_FOLDER_CONFIG_FILENAME = "prompts-config.json";

/**
 * PromptFileSystem handles all file system operations related to prompts.
 * 
 * Purpose: Provide a centralized interface for reading, writing, and managing prompt files.
 * 
 * This class encapsulates all interactions with the file system for prompt-related operations,
 * including saving, loading, listing, and managing versions of prompts. It also handles
 * the generation of TypeScript definition files for prompts.
 */
export class PromptFileSystem implements IPromptFileSystem {
  private static instance: PromptFileSystem;
  private basePath: string;
  private initialized: boolean = false;

  private constructor() {
    this.basePath = path.resolve(configManager.getConfig('promptsDir'));
  }

  public static getInstance(): PromptFileSystem {
    if (!PromptFileSystem.instance) {
      PromptFileSystem.instance = new PromptFileSystem();
    }
    return PromptFileSystem.instance;
  }

  getFilePath(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.basePath, category, promptName, PROMPT_FILENAME);
  }

  getVersionFilePath(props: { category: string; promptName: string; version: string }): string {
    const { category, promptName, version } = props;
    return path.join(this.basePath, category, promptName, '.versions', `v${version}.json`);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    this.basePath = path.resolve(configManager.getConfig('promptsDir'));
    await fs.mkdir(this.basePath, { recursive: true });
    await this.initializePromptsFolderConfig();
    const isValid = await this.validatePromptsFolderConfig();
    if (!isValid) {
      console.error('Prompts folder configuration is invalid. Reinitializing...');
      await this.initializePromptsFolderConfig();
    }
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PromptFileSystem is not initialized. Call initialize() before using it.');
    }
  }

  private async initializePromptsFolderConfig(): Promise<void> {
    const configPath = path.join(this.basePath, PROMPTS_FOLDER_CONFIG_FILENAME);
    try {
      await fs.access(configPath);
      console.log(chalk.green('✔ Prompts folder configuration already exists'));
    } catch (error) {
      console.log(chalk.yellow('⚠ Prompts folder configuration not found. Creating a new one...'));
      const initialConfig: IPromptsFolderConfig = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        promptCount: 0
      };
      await fs.writeFile(configPath, JSON.stringify(initialConfig, null, 2));
      console.log(chalk.green('✔ Created new prompts folder configuration'));
    }
  }

  async validatePromptsFolderConfig(): Promise<boolean> {
    const configPath = path.join(this.basePath, PROMPTS_FOLDER_CONFIG_FILENAME);
    try {
      await fs.access(configPath);
      const configData = await fs.readFile(configPath, 'utf-8');
      const config: IPromptsFolderConfig = JSON.parse(configData);
      const isValid = (
        typeof config.version === 'string' &&
        typeof config.lastUpdated === 'string' &&
        typeof config.promptCount === 'number'
      );
      if (isValid) {
        console.log(chalk.green('✔ Prompts folder configuration is valid'));
      } else {
        console.warn(chalk.yellow('⚠ Invalid prompts folder configuration detected'));
      }
      return isValid;
    } catch (error) {
      console.error(chalk.red('Error validating prompts folder configuration:'), error);
      console.warn(chalk.yellow('Possible reasons for invalid prompts folder configuration:'));
      console.warn(chalk.yellow('• The configuration file might be corrupted or manually edited incorrectly'));
      console.warn(chalk.yellow('• The configuration file might be missing required fields'));
      console.warn(chalk.yellow('Actions to take:'));
      console.warn(chalk.yellow('• Check the file contents and ensure it\'s valid JSON'));
      console.warn(chalk.yellow('• Ensure all required fields (version, lastUpdated, promptCount) are present'));
      console.warn(chalk.yellow('• If issues persist, try reinitializing the configuration file'));
      return false;
    }
  }

  private async updatePromptsFolderConfig(updates: Partial<IPromptsFolderConfig>): Promise<void> {
    const configPath = path.join(this.basePath, PROMPTS_FOLDER_CONFIG_FILENAME);
    const currentConfig = await this.getPromptsFolderConfig();
    const updatedConfig = { ...currentConfig, ...updates, lastUpdated: new Date().toISOString() };
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
  }

  private async getPromptsFolderConfig(): Promise<IPromptsFolderConfig> {
    const configPath = path.join(this.basePath, PROMPTS_FOLDER_CONFIG_FILENAME);
    const configData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  }


  /**
   * Save a prompt to the file system.
   * 
   * Purpose: Persist prompt data and manage versioning.
   * 
   * This method saves the prompt data to the main file and a versioned file,
   * updates the list of versions, and generates a TypeScript definition file.
   * 
   * @param props An object containing the prompt data to be saved
   * @throws Error if the prompt data is invalid or if there's a file system error
   */
  async savePrompt(props: { promptData: IPrompt<IPromptInput, IPromptOutput> }): Promise<void> {
    const { promptData } = props;
    const validatedPromptData = PromptSchema.parse(promptData) as IPrompt<IPromptInput, IPromptOutput>;
    const filePath = path.join(this.basePath, validatedPromptData.category, validatedPromptData.name, PROMPT_FILENAME);

    try {
      const versionFilePath = path.join(this.basePath, validatedPromptData.category, validatedPromptData.name, '.versions', `v${validatedPromptData.version}.json`);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.mkdir(path.dirname(versionFilePath), { recursive: true });

      const existingPrompt = await this.loadPrompt({ category: validatedPromptData.category, promptName: validatedPromptData.name }).catch(() => null);

      await fs.writeFile(filePath, JSON.stringify(validatedPromptData, null, 2));
      await fs.writeFile(versionFilePath, JSON.stringify(validatedPromptData, null, 2));

      const typeDefinitionPath = path.join(path.dirname(filePath), TYPE_DEFINITION_FILENAME);
      await this.generateTypeDefinitionFile(validatedPromptData, typeDefinitionPath);

      const versionsPath = path.join(this.basePath, validatedPromptData.category, validatedPromptData.name, '.versions');
      await fs.mkdir(versionsPath, { recursive: true });
      const versions = await this.getPromptVersions({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      if (!versions.includes(validatedPromptData.version)) {
        versions.push(validatedPromptData.version);
        versions.sort((a, b) => this.compareVersions(b, a));
      }
      await fs.writeFile(path.join(versionsPath, 'versions.json'), JSON.stringify(versions, null, 2));

      if (!existingPrompt) {
        const config = await this.getPromptsFolderConfig();
        await this.updatePromptsFolderConfig({ promptCount: config.promptCount + 1 });
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      if (error instanceof Error) {
        if (error.message.includes('ENOSPC')) {
          throw new Error(`Failed to save prompt due to insufficient disk space. Please free up some space and try again.`);
        } else if (error.message.includes('EACCES')) {
          throw new Error(`Failed to save prompt due to insufficient permissions. Please check your file system permissions and try again.`);
        } else if (error.message.includes('EBUSY')) {
          throw new Error(`Failed to save prompt because the file is locked or in use. Please close any other applications that might be using the file and try again.`);
        } else {
          throw new Error(`Failed to save prompt to ${filePath}: ${error.message}. Please check the console for more details.`);
        }
      } else {
        throw new Error(`Failed to save prompt to ${filePath}: An unknown error occurred. Please check the console for more details.`);
      }
    }
  }

  /**
   * Load a prompt from the file system.
   * Purpose: Retrieve stored prompt data for use in the application.
   */
  async loadPrompt(props: { category: string; promptName: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    const { category, promptName } = props;
    const filePath = path.join(this.basePath, category, promptName, PROMPT_FILENAME);

    try {
      await fs.access(filePath);
      const data = await fs.readFile(filePath, 'utf-8');
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (jsonError: Error | any) {
        throw new Error(`Invalid JSON in prompt file: ${filePath}. The file may be corrupted or incorrectly edited. Please check the file contents or restore from a backup. Error details: ${jsonError.message}`);
      }
      const validatedData = PromptSchema.parse(parsedData);
      return validatedData as IPrompt<IPromptInput, IPromptOutput>;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Prompt not found at ${filePath}. Please verify that the prompt exists and the category (${category}) and promptName (${promptName}) are correct.`);
      }
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid prompt data structure in file: ${filePath}. The prompt data does not match the expected schema. Please check the file contents or recreate the prompt. Error details: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw new Error(`Failed to load prompt from ${filePath}: ${error instanceof Error ? error.message : String(error)}. Please check file permissions and system integrity.`);
    }
  }

  async promptExists(props: { category: string; promptName: string }): Promise<boolean> {
    const { category, promptName } = props;
    const filePath = this.getFilePath({ category, promptName });
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all prompts, optionally filtered by category.
   * Purpose: Provide an overview of available prompts for management and selection.
   */
  async listPrompts({ category }: { category?: string } = {}): Promise<PromptModel[]> {
    try {
      const searchPath = category ? path.join(this.basePath, category) : this.basePath;
      const entries = await fs.readdir(searchPath, { withFileTypes: true });

      const prompts: PromptModel[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const categoryPath = category ? category : entry.name;
          const promptDir = path.join(this.basePath, categoryPath);
          try {
            const promptEntries = await fs.readdir(promptDir, { withFileTypes: true });

            for (const promptEntry of promptEntries) {
              if (promptEntry.isDirectory()) {
                const promptJsonPath = path.join(promptDir, promptEntry.name, PROMPT_FILENAME);
                try {
                  await fs.access(promptJsonPath);
                  const promptData = await this.loadPrompt({ category: categoryPath, promptName: promptEntry.name });
                  const promptModel = new PromptModel(promptData as IPromptModelRequired);
                  prompts.push(promptModel);
                } catch (error) {
                  const promptPath = path.join(promptDir, promptEntry.name, PROMPT_FILENAME);
                  console.warn(`Failed to load prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}. 
                    This prompt will be skipped. This could be due to:
                    1. Corrupted prompt file.
                    2. Incompatible prompt structure from an older version.
                    
                    To resolve this:
                    - Check the contents of ${promptPath} for any obvious issues.
                    - Try running the 'validate-prompts' command to identify and fix structural issues.
                    - If the prompt is important, consider manually recreating it using the 'create' command.
                    - Remove this prompt file if it's no longer needed.`);
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to read prompt directory at ${promptDir}: ${error instanceof Error ? error.message : String(error)}. 
              This directory will be skipped. Please check if the directory exists and you have the necessary permissions. 
              If this is a critical directory, you may need to manually recreate it or restore from a backup.`);
          }
        }
      }
      return prompts;
    } catch (error) {
      console.error(`Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listCategories(): Promise<string[]> {
    const entries = await fs.readdir(this.basePath, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  }

  async searchPrompts(props: { query: string }): Promise<PromptModel[]> {
    const { query } = props;
    const allPrompts = await this.listPrompts();
    return allPrompts.filter(prompt =>
      prompt.name.toLowerCase().includes(query.toLowerCase()) ||
      prompt.category.toLowerCase().includes(query.toLowerCase()) ||
      prompt.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  async searchCategories(props: { query: string }): Promise<string[]> {
    const { query } = props;
    const categories = await this.listCategories();
    return categories.filter(category => category.toLowerCase().includes(query.toLowerCase()));
  }

  async getPromptVersions(props: { category: string; promptName: string }): Promise<string[]> {
    const { category, promptName } = props;
    const versionsPath = path.join(this.basePath, category, promptName, '.versions');
    try {
      const versionsFile = path.join(versionsPath, 'versions.json');
      const versionsData = await fs.readFile(versionsFile, 'utf-8');
      return JSON.parse(versionsData);
    } catch {
      return [];
    }
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }
    return 0;
  }

  async deletePrompt({ category, promptName }: { category: string, promptName: string }): Promise<void> {
    const promptDir = path.join(this.basePath, category, promptName);
    await fs.rm(promptDir, { recursive: true, force: true });
  }

  async renamePrompt(props: {
    currentCategory: string;
    currentName: string;
    newCategory: string;
    newName: string
  }): Promise<void> {
    const { currentCategory, currentName, newCategory, newName } = props;
    const oldPath = path.join(this.basePath, currentCategory, currentName);
    const newPath = path.join(this.basePath, newCategory, newName);

    // Ensure the new category directory exists
    await fs.mkdir(path.dirname(newPath), { recursive: true });

    // Rename (move) the directory
    await fs.rename(oldPath, newPath);

    // If the categories are different or the name has changed, we need to update the prompt data
    if (currentCategory !== newCategory || currentName !== newName) {
      const promptData = await this.loadPrompt({ category: newCategory, promptName: newName });
      promptData.category = newCategory;
      promptData.name = newName;
      await this.savePrompt({ promptData });
    }
  }

  async createCategory(props: { categoryName: string }): Promise<void> {
    const { categoryName } = props;
    const categoryPath = path.join(this.basePath, categoryName);
    await fs.mkdir(categoryPath, { recursive: true });
  }

  async deleteCategory(props: { categoryName: string }): Promise<void> {
    const { categoryName } = props;
    const categoryPath = path.join(this.basePath, categoryName);
    await fs.rm(categoryPath, { recursive: true, force: true });
  }

  async loadPromptVersion(props: { category: string; promptName: string; version: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    const { category, promptName, version } = props;
    const versionFilePath = this.getVersionFilePath({ category, promptName, version });
    const data = await fs.readFile(versionFilePath, 'utf-8');
    return JSON.parse(data);
  }

  private async generateTypeDefinitionFile(promptData: IPrompt<IPromptInput, IPromptOutput>, filePath: string): Promise<void> {
    const inputType = this.generateTypeFromSchema(promptData.inputSchema, 'Input');
    const outputType = this.generateTypeFromSchema(promptData.outputSchema, 'Output');

    const content = `
export interface ${promptData.name}Input ${inputType}

export interface ${promptData.name}Output ${outputType}
`;

    await fs.writeFile(filePath, content.trim());
  }

  private generateTypeFromSchema(schema: any, typeName: string): string {
    if (schema.type === 'object' && schema.properties) {
      const properties = Object.entries(schema.properties)
        .map(([key, value]: [string, any]) => `  ${key}: ${this.getTypeFromSchemaProperty(value)};`)
        .join('\n');
      return `{\n${properties}\n}`;
    }
    return '{}';
  }

  private getTypeFromSchemaProperty(property: any): string {
    switch (property.type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return `${this.getTypeFromSchemaProperty(property.items)}[]`;
      case 'object':
        return this.generateTypeFromSchema(property, '');
      default:
        return 'any';
    }
  }
}
