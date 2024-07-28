import fs from 'fs/promises';
import path from 'path';
import { IPromptFileSystem, IPrompt, IPromptInput, IPromptOutput, IPromptModelRequired } from './types/interfaces';
import { configManager } from './config/PromptProjectConfigManager';
import { PromptSchema } from './schemas/prompts';
import { PromptModel } from './promptModel';

export const PROMPT_FILENAME = "prompt.json";
export const TYPE_DEFINITION_FILENAME = "prompt.d.ts";

/**
 * PromptFileSystem handles all file system operations related to prompts.
 * Purpose: Provide a centralized interface for reading, writing, and managing prompt files.
 */
export class PromptFileSystem implements IPromptFileSystem {
  private basePath: string;

  constructor() {
    this.basePath = path.resolve(configManager.getConfig('promptsDir'));
  }

  public async initialize(): Promise<void> {
    this.basePath = path.resolve(configManager.getConfig('promptsDir'));
    await fs.mkdir(this.basePath, { recursive: true });
  }

  private getFilePath({ category, promptName }: { category: string, promptName: string }): string {
    return path.join(this.basePath, category, promptName, 'prompt.json');
  }

  private getVersionFilePath({ category, promptName, version }: { category: string, promptName: string, version: string }): string {
    return path.join(this.basePath, category, promptName, '.versions', `v${version}.json`);
  }

  /**
   * Save a prompt to the file system.
   * Purpose: Persist prompt data and manage versioning.
   */
  async savePrompt(props: { promptData: IPrompt<IPromptInput, IPromptOutput> }): Promise<void> {
    const { promptData } = props;

    try {
      // Validate the prompt data against the schema
      const validatedPromptData = PromptSchema.parse(promptData) as IPrompt<IPromptInput, IPromptOutput>;

      const filePath = this.getFilePath({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      const versionFilePath = this.getVersionFilePath({
        category: validatedPromptData.category,
        promptName: validatedPromptData.name,
        version: validatedPromptData.version
      });

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.mkdir(path.dirname(versionFilePath), { recursive: true });

      await fs.writeFile(filePath, JSON.stringify(validatedPromptData, null, 2));
      await fs.writeFile(versionFilePath, JSON.stringify(validatedPromptData, null, 2));

      // Generate and save TypeScript definition file
      const typeDefinitionPath = path.join(path.dirname(filePath), TYPE_DEFINITION_FILENAME);
      await this.generateTypeDefinitionFile(validatedPromptData, typeDefinitionPath);

      // Update the list of versions
      const versionsPath = path.join(this.basePath, validatedPromptData.category, validatedPromptData.name, '.versions');
      const versions = await this.getPromptVersions({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      if (!versions.includes(validatedPromptData.version)) {
        versions.push(validatedPromptData.version);
        versions.sort((a, b) => this.compareVersions(b, a));
      }
      await fs.writeFile(path.join(versionsPath, 'versions.json'), JSON.stringify(versions, null, 2));
    } catch (error) {
      console.error('Error saving prompt:', error);
      throw new Error(`Failed to save prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load a prompt from the file system.
   * Purpose: Retrieve stored prompt data for use in the application.
   */
  async loadPrompt(props: { category: string; promptName: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    const { category, promptName } = props;
    const filePath = this.getFilePath({ category, promptName });

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsedData = JSON.parse(data);
      return PromptSchema.parse(parsedData) as IPrompt<IPromptInput, IPromptOutput>;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Prompt not found: ${category}/${promptName}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in prompt file: ${category}/${promptName}`);
      }
      throw new Error(`Failed to load prompt ${category}/${promptName}: ${error instanceof Error ? error.message : String(error)}`);
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
    const searchPath = category ? path.join(this.basePath, category) : this.basePath;
    const entries = await fs.readdir(searchPath, { withFileTypes: true });

    const prompts: PromptModel[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const categoryPath = category ? category : entry.name;
        const promptDir = path.join(this.basePath, categoryPath);
        const promptEntries = await fs.readdir(promptDir, { withFileTypes: true });

        for (const promptEntry of promptEntries) {
          if (promptEntry.isDirectory()) {
            const promptJsonPath = path.join(promptDir, promptEntry.name, PROMPT_FILENAME);
            try {
              await fs.access(promptJsonPath);
              const promptData = await this.loadPrompt({ category: categoryPath, promptName: promptEntry.name });
              const promptModel = new PromptModel(promptData as IPromptModelRequired);
              prompts.push(promptModel);
            } catch {
              // If prompt.json doesn't exist, skip this directory
            }
          }
        }
      }
    }
    return prompts;
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
