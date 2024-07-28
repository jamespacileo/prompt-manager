import { z } from 'zod';

export const configSchema = z.object({
  promptsDir: z.string().describe('Directory for storing prompts'),
  outputDir: z.string().describe('Directory for storing output'),
  preferredModels: z.array(z.string()).describe('List of preferred AI models'),
  modelParams: z.record(z.object({
    temperature: z.number().min(0).max(1).optional().describe('AI model temperature parameter'),
    maxTokens: z.number().positive().optional().describe('Maximum number of tokens for AI model output'),
    topP: z.number().min(0).max(1).optional().describe('Top P parameter for AI model'),
    frequencyPenalty: z.number().min(-2).max(2).optional().describe('Frequency penalty for AI model'),
    presencePenalty: z.number().min(-2).max(2).optional().describe('Presence penalty for AI model'),
  })).describe('Parameters for different AI models'),
});

export type Config = z.infer<typeof configSchema>;
export { z };

export const DEFAULT_CONFIG: Config = {
  promptsDir: '',
  outputDir: '',
  preferredModels: ['gpt-4', 'gpt-4o-mini'],
  modelParams: {
    'gpt-4': {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    'gpt-4o-mini': {
      temperature: 0.8,
      maxTokens: 1500,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  },
};
