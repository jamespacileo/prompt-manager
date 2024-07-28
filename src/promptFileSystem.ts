import fs from 'fs/promises';
import path from 'path';
import { IPromptFileSystem, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { configManager } from './config/PromptProjectConfigManager';
import { z } from 'zod';

export const PROMPT_FILENAME = "prompt.json";
export const TYPE_DEFINITION_FILENAME = "prompt.d.ts";

/**
 * PromptFileSystem handles all file system operations related to prompts.
 * Purpose: Provide a centralized interface for reading, writing, and managing prompt files.
 */
export class PromptFileSystem implements IPromptFileSystem {
  private basePath: string;

  constructor() {
    this.basePath = configManager.getConfig('promptsDir');
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
    const filePath = this.getFilePath({ category: promptData.category, promptName: promptData.name });
    const versionFilePath = this.getVersionFilePath({
      category: promptData.category,
      promptName: promptData.name,
      version: promptData.version
    });

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.mkdir(path.dirname(versionFilePath), { recursive: true });

    await fs.writeFile(filePath, JSON.stringify(promptData, null, 2));
    await fs.writeFile(versionFilePath, JSON.stringify(promptData, null, 2));

    // Generate and save TypeScript definition file
    const typeDefinitionPath = path.join(path.dirname(filePath), TYPE_DEFINITION_FILENAME);
    await this.generateTypeDefinitionFile(promptData, typeDefinitionPath);

    // Update the list of versions
    const versionsPath = path.join(this.basePath, promptData.category, promptData.name, '.versions');
    const versions = await this.getPromptVersions({ category: promptData.category, promptName: promptData.name });
    if (!versions.includes(promptData.version)) {
      versions.push(promptData.version);
      versions.sort((a, b) => this.compareVersions(b, a));
    }
    await fs.writeFile(path.join(versionsPath, 'versions.json'), JSON.stringify(versions, null, 2));
  }

  /**
   * Load a prompt from the file system.
   * Purpose: Retrieve stored prompt data for use in the application.
   */
  async loadPrompt(props: { category: string; promptName: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    const { category, promptName } = props;
    const filePath = this.getFilePath({ category, promptName });
    const data = await fs.readFile(filePath, 'utf-8');
    const parsedData = JSON.parse(data);

    // Validate the loaded data
    const promptSchema = z.object({
      name: z.string(),
      category: z.string(),
      description: z.string(),
      version: z.string(),
      template: z.string(),
      parameters: z.array(z.string()),
      inputSchema: z.object({}).passthrough(),
      outputSchema: z.object({}).passthrough(),
      metadata: z.object({
        created: z.string(),
        lastModified: z.string()
      }),
      configuration: z.object({
        modelName: z.string(),
        temperature: z.number(),
        maxTokens: z.number(),
        topP: z.number(),
        frequencyPenalty: z.number(),
        presencePenalty: z.number(),
        stopSequences: z.array(z.string())
      }),
      outputType: z.enum(['structured', 'plain'])
    });

    try {
      return promptSchema.parse(parsedData);
    } catch (error) {
      throw new Error(`Invalid prompt data: ${error.message}`);
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
  async listPrompts({ category }: { category?: string } = {}): Promise<Array<{ name: string; category: string; filePath: string }>> {
    const searchPath = category ? path.join(this.basePath, category) : this.basePath;
    const entries = await fs.readdir(searchPath, { withFileTypes: true });

    const prompts: Array<{ name: string; category: string; filePath: string }> = [];
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
              // const relativePath = path.relative(this.basePath, path.dirname(promptJsonPath)).replace(/\\/g, '/');
              // console.log({ promptDir, name: promptEntry.name, promptJsonPath, entry, category });
              prompts.push({
                name: promptEntry.name,
                category: categoryPath,
                filePath: promptJsonPath
              });
            } catch {
              // If prompt.json doesn't exist, skip this directory
            }
          }
        }
      }
    }
    // console.log("PROMPTSS", prompts)
    return prompts;
  }


  async listCategories(): Promise<string[]> {
    const entries = await fs.readdir(this.basePath, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  }

  async searchPrompts(props: { query: string }): Promise<Array<{ name: string; category: string; filePath: string }>> {
    const { query } = props;
    const allPrompts = await this.listPrompts();
    return allPrompts.filter(prompt =>
      prompt.name.toLowerCase().includes(query.toLowerCase()) ||
      prompt.category.toLowerCase().includes(query.toLowerCase()) ||
      prompt.filePath.toLowerCase().includes(query.toLowerCase())
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
