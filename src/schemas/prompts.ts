import { z } from 'zod';

export const PromptSchema = z.object({
    name: z.string().describe('Unique identifier for the prompt'),
    category: z.string().describe('Category the prompt belongs to'),
    content: z.string().describe('The actual content of the prompt'),
    description: z.string().describe('Brief description of the prompt\'s purpose'),
    outputType: z.union([z.literal('structured'), z.literal('plain')]).describe('Type of output expected from the model'),
    tags: z.array(z.string()).optional().describe('Optional list of tags or keywords associated with this prompt'),
    input: z.any().describe('Type of input expected by the prompt'), // Note: zod doesn't support JSONSchema7 out of the box, you might need to create a custom validator
    output: z.any().describe('Type of output expected by the prompt'), // Note: zod doesn't support JSONSchema7 out of the box, you might need to create a custom validator
});