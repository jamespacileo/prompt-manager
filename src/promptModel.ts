import { IPromptModel, IPromptInput, IPromptOutput, IAsyncIterableStream } from './types/interfaces';
import { JSONSchema7 } from 'json-schema';
import fs from 'fs/promises';
import path from 'path';

export class PromptModel implements IPromptModel {
  name: string;
  category: string;
  description: string;
  version: string;
  template: string;
  parameters: string[];
  metadata: {
    created: string;
    lastModified: string;
  };
  outputType: 'structured' | 'plain';
  defaultModelName?: string;
  compatibleModels?: string[];
  tags?: string[];
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  configuration: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  };

  private isLoadedFromStorage: boolean = false;

  constructor(promptData: Partial<IPromptModel>) {
    Object.assign(this, promptData);
    this._initializeConfiguration();
  }

  static async loadPromptByName(name: string): Promise<PromptModel> {
    const [category, promptName] = name.split('/');
    const filePath = this._getFilePath(category, promptName);
    const promptData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    const prompt = new PromptModel(promptData);
    prompt._markAsLoadedFromStorage();
    return prompt;
  }

  validateInput(input: IPromptInput): boolean {
    // Implement input validation logic using this.inputSchema
    return true; // Placeholder
  }

  validateOutput(output: IPromptOutput): boolean {
    // Implement output validation logic using this.outputSchema
    return true; // Placeholder
  }

  static _promptExists(name: string): boolean {
    const [category, promptName] = name.split('/');
    const filePath = this._getFilePath(category, promptName);
    return fs.access(filePath).then(() => true).catch(() => false);
  }

  _initializeConfiguration(): void {
    // Initialize configuration based on prompt settings and project config
    this.configuration = {
      modelName: this.defaultModelName || 'default-model',
      temperature: 0.7,
      maxTokens: 100,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: [],
    };
  }

  _processContent(): void {
    // Process the prompt content if needed
  }

  static _getFilePath(category: string, promptName: string): string {
    return path.join(process.cwd(), 'prompts', category, `${promptName}.json`);
  }

  _markAsLoadedFromStorage(): void {
    this.isLoadedFromStorage = true;
  }

  format(inputs: IPromptInput): string {
    let formattedContent = this.template;
    for (const [key, value] of Object.entries(inputs)) {
      formattedContent = formattedContent.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
    }
    return formattedContent;
  }

  async streamText(
    inputs: IPromptInput,
    onData: (chunk: string) => void,
    onComplete: (result: IPromptOutput) => void
  ): Promise<IAsyncIterableStream<string>> {
    // Implement streaming logic
    return {} as IAsyncIterableStream<string>; // Placeholder
  }

  async execute(inputs: IPromptInput): Promise<IPromptOutput> {
    // Implement execution logic
    return {}; // Placeholder
  }

  updateMetadata(metadata: Partial<IPromptModel['metadata']>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  getSummary(): string {
    return `${this.name} (${this.category}): ${this.description}`;
  }

  async save(): Promise<void> {
    const filePath = PromptModel._getFilePath(this.category, this.name);
    await fs.writeFile(filePath, JSON.stringify(this, null, 2));
    this._markAsLoadedFromStorage();
  }

  async load(filePath: string): Promise<void> {
    const promptData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    Object.assign(this, promptData);
    this._markAsLoadedFromStorage();
  }

  versions(): string[] {
    return [this.version]; // Placeholder, implement version tracking if needed
  }

  switchVersion(version: string): void {
    // Implement version switching logic
  }

  _isSaved(): boolean {
    return this.isLoadedFromStorage;
  }
}
