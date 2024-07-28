import { IPromptInput, IPromptOutput, IPrompt } from './interfaces';

declare class PromptManager<
  TInput extends IPromptInput<Record<string, any>> = IPromptInput<Record<string, any>>,
  TOutput extends IPromptOutput<Record<string, any> & string> = IPromptOutput<Record<string, any> & string>
> {
  constructor();
  initialize(props: {}): Promise<void>;
  getPrompt(props: { category: string; name: string }): PromptModel<TInput, TOutput>;
  createPrompt(props: { prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> }): Promise<void>;
  updatePrompt(props: { category: string; name: string; updates: Partial<IPrompt<IPromptInput, IPromptOutput>> }): Promise<void>;
  deletePrompt(props: { category: string; name: string }): Promise<void>;
  listPrompts(props: { category?: string }): Promise<IPrompt<IPromptInput, IPromptOutput>[]>;
  versionPrompt(props: { action: 'list' | 'create' | 'switch'; category: string; name: string; version?: string }): Promise<void>;
  formatPrompt(props: { category: string; name: string; params: TInput }): string;
  get categories(): { [category: string]: IPromptCategory<Record<string, PromptModel<TInput, TOutput>>> };
}

interface IPromptCategory<T> {
  [name: string]: {
    raw: string;
    version: string;
    format: (inputs: any) => string;
  };
}

declare class PromptModel<TInput, TOutput> {
  constructor(prompt: IPrompt<IPromptInput, IPromptOutput>);
  format(params: TInput): string;
  versions(): Promise<string[]>;
  switchVersion(props: { version: string }): Promise<void>;
  updateMetadata(props: { metadata: Partial<IPrompt<IPromptInput, IPromptOutput>['metadata']> }): void;
  get template(): string;
  get version(): string;
  set version(value: string);
}

export function getPromptManager(): PromptManager;

export { PromptManager, PromptModel };
