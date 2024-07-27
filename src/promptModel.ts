import { IPromptModel, IPromptInput, IPromptOutput, IAsyncIterableStream } from './types/interfaces';
import { JSONSchema7 } from 'json-schema';
import { generateText, generateObject, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { PromptFileSystem } from './promptFileSystem';

export class PromptModel implements Omit<IPromptModel, 'loadPromptByName' | '_promptExists'> {
  name: string = '';
  category: string = '';
  description: string = '';
  version: string = '';
  template: string = '';
  parameters: string[] = [];
  metadata: {
    created: string;
    lastModified: string;
  } = {
      created: '',
      lastModified: ''
    };
  outputType: 'structured' | 'plain' = 'plain';
  defaultModelName?: string;
  compatibleModels?: string[];
  tags?: string[];
  inputSchema: JSONSchema7 = {};
  outputSchema: JSONSchema7 = {};
  configuration: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  } = {
      modelName: '',
      temperature: 0,
      maxTokens: 0,
      topP: 0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: []
    };

  constructor(promptData: Partial<PromptModel>, private fileSystem: PromptFileSystem) {
    Object.assign(this, promptData);
    this.fileSystem = fileSystem;
    this.initializeConfiguration();
  }

  private isLoadedFromStorage: boolean = false;

  static async loadPromptByName(name: string, fileSystem: PromptFileSystem): Promise<PromptModel> {
    const [category, promptName] = name.split('/');
    const promptData = await fileSystem.loadPrompt({ category, promptName });
    const prompt = new PromptModel(promptData, fileSystem);
    prompt.markAsLoadedFromStorage();
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

  static async promptExists(name: string): Promise<boolean> {
    const [category, promptName] = name.split('/');
    const fileSystem = new PromptFileSystem('path/to/prompts');
    return fileSystem.promptExists({ category, promptName });
  }

  private initializeConfiguration(): void {
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


  private markAsLoadedFromStorage(): void {
    this.isLoadedFromStorage = true;
  }

  format(inputs: IPromptInput): string {
    let formattedContent = this.template;
    for (const [key, value] of Object.entries(inputs)) {
      formattedContent = formattedContent.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
    }
    return formattedContent;
  }

  async stream(
    inputs: IPromptInput
  ): Promise<IAsyncIterableStream<string>> {
    const formattedPrompt = this.format(inputs);
    const { textStream } = await streamText({
      model: openai(this.configuration.modelName),
      prompt: formattedPrompt,
      temperature: this.configuration.temperature,
      maxTokens: this.configuration.maxTokens,
      topP: this.configuration.topP,
      frequencyPenalty: this.configuration.frequencyPenalty,
      presencePenalty: this.configuration.presencePenalty
    });
    return textStream as IAsyncIterableStream<string>;
  }

  async execute(inputs: IPromptInput): Promise<IPromptOutput> {
    if (this.outputType === 'structured') {
      const formattedPrompt = this.format(inputs);
      const schema = z.object(this.outputSchema as z.ZodRawShape);
      const { object } = await generateObject({
        model: openai(this.configuration.modelName),
        schema,
        prompt: formattedPrompt,
        temperature: this.configuration.temperature,
        maxTokens: this.configuration.maxTokens,
        topP: this.configuration.topP,
        frequencyPenalty: this.configuration.frequencyPenalty,
        presencePenalty: this.configuration.presencePenalty
      });
      return object as IPromptOutput;
    } else {
      const { text } = await generateText({
        model: openai(this.configuration.modelName),
        prompt: this.format(inputs),
        temperature: this.configuration.temperature,
        maxTokens: this.configuration.maxTokens,
        topP: this.configuration.topP,
        frequencyPenalty: this.configuration.frequencyPenalty,
        presencePenalty: this.configuration.presencePenalty
      });
      return { text };
    }
  }

  updateMetadata(props: { metadata: Partial<IPromptModel['metadata']> }): void {
    this.metadata = { ...this.metadata, ...props.metadata };
  }

  getSummary(): string {
    return `${this.name} (${this.category}): ${this.description}`;
  }

  async save(): Promise<void> {
    await this.fileSystem.savePrompt({ promptData: this });
    this.markAsLoadedFromStorage();
  }

  load(props: { filePath: string }): void {
    const promptData = this.fileSystem.loadPrompt({ category: this.category, promptName: this.name });
    Object.assign(this, promptData);
    this.markAsLoadedFromStorage();
  }

  versions(): string[] {
    // Assuming PromptFileSystem doesn't have a getVersions method, we'll need to implement this differently
    // For now, we'll return an empty array as a placeholder
    return [];
  }

  switchVersion(props: { version: string }): void {
    // Implement version switching logic
    // This is a placeholder and should be implemented based on your versioning strategy
    console.log(`Switching to version ${version}`);
  }

  isSaved(): boolean {
    return this.isLoadedFromStorage;
  }

  static async listPrompts(category?: string): Promise<string[]> {
    const fileSystem = new PromptFileSystem('path/to/prompts');
    return fileSystem.listPrompts({ category });
  }
}
