import { z } from 'zod';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const contentSchema = z.object({
  content: z.string().describe('The main content of the prompt'),
});

export const descriptionSchema = z.object({
  description: z.string().describe('A brief description of what the prompt does'),
});

const promptTemplate = `
You are an AI assistant helping to generate content for a prompt management system. 
Based on the user's query, generate appropriate content for the following schema:

{schema}

User Query: {query}

Please provide a response that fits the schema and addresses the user's query.
`;

export async function generateWithAI(query: string, type: 'content' | 'description'): Promise<string> {
  const schema = type === 'content' ? contentSchema : descriptionSchema;
  const formattedPrompt = promptTemplate
    .replace('{schema}', schema.describe('Schema').toString())
    .replace('{query}', query);

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: formattedPrompt }],
  });

  const generatedContent = response.choices[0].message.content;
  
  try {
    const parsedContent = schema.parse(JSON.parse(generatedContent));
    return parsedContent[type];
  } catch (error) {
    console.error('Failed to parse AI-generated content:', error);
    return generatedContent || '';
  }
}
