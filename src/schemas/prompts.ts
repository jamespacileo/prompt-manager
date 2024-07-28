import { z } from 'zod';

const JSONSchema = z.object({
    type: z.string(),
    properties: z.record(z.any()).optional(),
    required: z.array(z.string()).optional(),
    additionalProperties: z.boolean().optional(),
}).passthrough();

export const PromptSchema = z.object({
    name: z.string().describe('Unique identifier for the prompt'),
    category: z.string().describe('Category the prompt belongs to'),
    description: z.string().describe('Brief description of the prompt\'s purpose'),
    version: z.string().describe('Version of the prompt'),
    template: z.string().describe('The actual content of the prompt'),
    parameters: z.array(z.string()).describe('List of parameters used in the prompt'),
    inputSchema: JSONSchema.describe('JSON Schema defining the structure of the input expected by the prompt'),
    outputSchema: JSONSchema.describe('JSON Schema defining the structure of the output produced by the prompt'),
    metadata: z.object({
        created: z.string(),
        lastModified: z.string()
    }).describe('Metadata about the prompt'),
    configuration: z.object({
        modelName: z.string(),
        temperature: z.number(),
        maxTokens: z.number(),
        topP: z.number(),
        frequencyPenalty: z.number(),
        presencePenalty: z.number(),
        stopSequences: z.array(z.string())
    }).describe('Configuration for the AI model'),
    outputType: z.enum(['structured', 'plain']).describe('Type of output expected from the model'),
    tags: z.array(z.string()).optional().describe('Optional list of tags or keywords associated with this prompt'),
});

export type IPrompt = z.infer<typeof PromptSchema>;
