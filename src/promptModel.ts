import { IPromptModel, IPromptModelRequired, IPromptModelStatic, IPromptInput, IPromptOutput, IAsyncIterableStream } from './types/interfaces';
import { JSONSchema7 } from 'json-schema';
import { generateText, generateObject, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { PROMPT_FILENAME, PromptFileSystem } from './promptFileSystem';

/**
 * Represents a single prompt model with all its properties and methods.
 */
export class PromptModel implements IPromptModel {
  name: string;
  category: string;
  description: string;
  version: string;
  template: string;
  parameters: string[];
  defaultModelName?: string;
  metadata: {
    created: string;
    lastModified: string;
  };
  configuration: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  };
  outputType: 'structured' | 'plain';
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  fileSystem: PromptFileSystem;
  _isSaved: boolean = false;
  isLoadedFromStorage: boolean = false;

  /**
   * Create a new PromptModel instance.
   * @param promptData Required data to initialize the prompt
   * @param fileSystem Optional PromptFileSystem instance for file operations
   */
  constructor(promptData: IPromptModelRequired, fileSystem?: PromptFileSystem) {
    this.name = promptData.name;
    this.category = promptData.category;
    this.description = promptData.description;
    this.template = promptData.template;
    this.parameters = promptData.parameters;
    this.inputSchema = promptData.inputSchema;
    this.outputSchema = promptData.outputSchema;
    this.fileSystem = fileSystem ?? new PromptFileSystem();
    this.version = '1.0.0';
    this.metadata = { created: new Date().toISOString(), lastModified: new Date().toISOString() };
    this.outputType = 'plain';
    this.configuration = this.initializeConfiguration();
  }

  private initializeConfiguration(): {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  } {
    return {
      modelName: this.defaultModelName || 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 100,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: [],
    };
  }


  /**
   * Validate the input against the input schema.
   * @param input The input to validate
   * @returns True if the input is valid, false otherwise
   */
  validateInput(input: IPromptInput): boolean {
    // TODO: Implement input validation logic using this.inputSchema
    return true; // Placeholder
  }

  /**
   * Validate the output against the output schema.
   * @param output The output to validate
   * @returns True if the output is valid, false otherwise
   */
  validateOutput(output: IPromptOutput): boolean {
    // TODO: Implement output validation logic using this.outputSchema
    return true; // Placeholder
  }

  /**
   * Format the prompt template by replacing placeholders with input values.
   * @param inputs The input values to use for formatting
   * @returns The formatted prompt string
   */
  format(inputs: IPromptInput): string {
    let formattedContent = this.template;
    for (const [key, value] of Object.entries(inputs)) {
      formattedContent = formattedContent.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
    }
    return formattedContent;
  }

  /**
   * Stream the prompt execution results.
   * @param inputs The input values for the prompt
   * @returns An async iterable stream of the generated text
   */
  async stream(inputs: IPromptInput): Promise<IAsyncIterableStream<string>> {
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

    return textStream;
  }

  /**
   * Execute the prompt and return the result.
   * @param inputs The input values for the prompt
   * @returns The execution result, either structured or plain text
   */
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
    this.metadata.lastModified = new Date().toISOString();
  }

  getSummary(): string {
    return `${this.name} (${this.category}): ${this.description}`;
  }

  async save(): Promise<void> {
    await this.fileSystem.savePrompt({ promptData: this });
    this._isSaved = true;
  }

  get inputZodSchema(): z.ZodObject<IPromptInput> {
    return z.object(this.inputSchema as z.ZodRawShape);
  }

  get outputZodSchema(): z.ZodObject<IPromptOutput> {
    return z.object(this.outputSchema as z.ZodRawShape);
  }

  async load(props: { filePath: string }): Promise<void> {
    const promptData = await this.fileSystem.loadPrompt({ category: this.category, promptName: this.name });
    Object.assign(this, promptData);
    this._isSaved = true;
  }

  versions(): string[] {
    // Assuming PromptFileSystem doesn't have a getVersions method, we'll need to implement this differently
    // For now, we'll return an empty array as a placeholder
    return [];
  }

  switchVersion(props: { version: string }): void {
    // Implement version switching logic
    // This is a placeholder and should be implemented based on your versioning strategy
    console.log(`Switching to version ${props.version}`);
  }

  get isSaved(): boolean {
    return this._isSaved;
  }

  static async loadPromptByName(name: string, fileSystem: PromptFileSystem): Promise<PromptModel> {
    const [category, promptName] = name.split('/');
    const promptData = await fileSystem.loadPrompt({ category, promptName });
    const prompt = new PromptModel(promptData as IPromptModelRequired, fileSystem);
    prompt.isLoadedFromStorage = true;
    return prompt;
  }

  static async promptExists(name: string, fileSystem: PromptFileSystem): Promise<boolean> {
    const [category, promptName] = name.split('/');
    return fileSystem.promptExists({ category, promptName });
  }

  static async listPrompts(category?: string, fileSystem?: PromptFileSystem): Promise<Array<{ name: string; category: string; relativeFilePath: string }>> {
    if (!fileSystem) {
      fileSystem = new PromptFileSystem();
    }
    return await fileSystem.listPrompts({ category });
  }
}
