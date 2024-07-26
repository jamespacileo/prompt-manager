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
    content: z.string().describe('The actual content of the prompt'),
    description: z.string().describe('Brief description of the prompt\'s purpose'),
    outputType: z.union([z.literal('structured'), z.literal('plain')]).describe('Type of output expected from the model'),
    tags: z.array(z.string()).optional().describe('Optional list of tags or keywords associated with this prompt'),
    inputSchema: JSONSchema.describe('JSON Schema defining the structure of the input expected by the prompt'),
    outputSchema: JSONSchema.describe('JSON Schema defining the structure of the output produced by the prompt'),
});
