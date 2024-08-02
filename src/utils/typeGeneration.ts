import { JSONSchema7 } from 'json-schema';
import { jsonSchemaToZod } from "json-schema-to-zod";
import { format } from 'prettier';
import jsf from 'json-schema-faker';
import { IPrompt } from '../types/interfaces';
import { cleanName } from './promptManagerUtils';
import { zodToTs } from 'zod-to-ts';

export interface SchemaAndType {
    formattedSchemaTs: string;
    formattedSchemaTsNoImports: string;
}

/**
 * Generates TypeScript types from a JSON schema and formats them.
 * 
 * @param {Object} params - The parameters.
 * @param {JSONSchema7} params.schema - The JSON schema.
 * @param {string} params.name - The name for the generated type.
 * @returns {Promise<SchemaAndType>} The formatted TypeScript types.
 * 
 * @example
 * const schema = { type: "object", properties: { name: { type: "string" } } };
 * const result = await generateExportableSchemaAndType({ schema, name: "MyType" });
 * logger.info(result.formattedSchemaTs);
 * // Output: "export const MyType = z.object({ name: z.string() });"
 */
export async function generateExportableSchemaAndType({ schema, name }: { schema: JSONSchema7, name: string }): Promise<SchemaAndType> {
    const zodSchemaString = jsonSchemaToZod(schema, { module: "esm", name: name, type: true });
    const formatted = await format(zodSchemaString, { parser: "typescript" });
    const zodSchemaNoImports = formatted.replace(/import { z } from "zod";/g, "");
    return {
        formattedSchemaTs: zodSchemaNoImports,
        formattedSchemaTsNoImports: zodSchemaNoImports
    };
}

/**
 * Generates TypeScript interfaces for a given prompt.
 * 
 * @param {IPrompt<any, any>} prompt - The prompt object containing input and output schemas.
 * @returns {Promise<string>} The generated TypeScript content.
 * 
 * @example
 * const prompt = { name: "ExamplePrompt", inputSchema: { type: "object", properties: { input: { type: "string" } } }, outputSchema: { type: "object", properties: { output: { type: "string" } } } };
 * const result = await generatePromptTypeScript(prompt);
 * logger.info(result);
 * // Output:
 * // import {z} from "zod";
 * // export interface ExamplePromptInput { input: string; }
 * // export interface ExamplePromptOutput { output: string; }
 */
export async function generatePromptTypeScript(prompt: IPrompt<any, any>): Promise<string> {
    const inputTypes = await generateExportableSchemaAndType({
        schema: prompt.inputSchema, name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Input`
    });
    const outputTypes = await generateExportableSchemaAndType({
        schema: prompt.outputSchema, name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Output`
    });
    const content = `import { z } from "zod";
import { IAsyncIterableStream } from "../types/interfaces";

${inputTypes.formattedSchemaTsNoImports}

${outputTypes.formattedSchemaTsNoImports}

export interface ${cleanName(prompt.category)}${cleanName(prompt.name)}Prompt {
  format: (inputs: ${cleanName(prompt.category)}${cleanName(prompt.name)}Input) => Promise<string>;
  execute: (inputs: ${cleanName(prompt.category)}${cleanName(prompt.name)}Input) => Promise<${cleanName(prompt.category)}${cleanName(prompt.name)}Output>;
  stream: (inputs: ${cleanName(prompt.category)}${cleanName(prompt.name)}Input) => Promise<IAsyncIterableStream<string>>;
  description: string;
  version: string;
}
`;

    return content;
}

export async function generatePromptTypescriptDefinition(prompt: IPrompt<any, any>): Promise<string> {
    const zodInputSchema = eval(jsonSchemaToZod(prompt.inputSchema, { module: "esm" }));
    const inputDef = zodToTs(zodInputSchema, `${cleanName(prompt.name)}Input`)
    const zodOutputSchema = eval(jsonSchemaToZod(prompt.outputSchema, { module: "esm" }));
    const outputDef = zodToTs(zodOutputSchema, `${cleanName(prompt.name)}Output`)
    return `${inputDef}\n\n${outputDef}`
}

/**
 * Generates test inputs based on a JSON schema.
 * 
 * @param {JSONSchema7} schema - The JSON schema.
 * @param {number} [count=5] - The number of test inputs to generate.
 * @returns {any[]} The generated test inputs.
 * 
 * @example
 * const schema = { type: "object", properties: { name: { type: "string" } } };
 * const testInputs = generateTestInputs(schema, 3);
 * logger.info(testInputs);
 * // Output: [{ name: "John Doe" }, { name: "Jane Doe" }, { name: "Jim Doe" }]
 */
export function generateTestInputs(schema: JSONSchema7, count: number = 5): any[] {
    jsf.option({
        alwaysFakeOptionals: true,
        useDefaultValue: true,
    });
    
    const testInputs = [];
    for (let i = 0; i < count; i++) {
        testInputs.push(jsf.generate(schema));
    }
    return testInputs;
}
