import { IPrompt, IPromptInput, IPromptModel, IPromptOutput } from "../types/interfaces";

import { Container } from "typedi";
import { PromptManager } from "../promptManager";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { PromptSchema } from "../schemas/prompts";
import fs from "fs-extra";
import { generateExportableSchemaAndType, generatePromptTypeScript } from "../utils/typeGeneration";
import path from "path";

export async function createPrompt(
  promptData: Partial<Omit<IPrompt<IPromptInput, IPromptOutput>, "versions">>,
): Promise<void> {
  const promptManager = Container.get(PromptManager);
  const validatedPromptData = PromptSchema.parse(promptData);
  await promptManager.createPrompt({ prompt: validatedPromptData as any });
}

export async function listPrompts(): Promise<
  Array<
    {
      name: string;
      category: string;
      version: string;
      filePath: string;
    } & Partial<IPrompt<IPromptInput, IPromptOutput>>
  >
> {
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});
  return prompts;
  return prompts.map((prompt) => ({
    name: prompt.name,
    category: prompt.category,
    version: prompt.version || "1.0.0",
    filePath: prompt.filePath || "",
  }));
}

export async function getPromptDetails(props: {
  category: string;
  name: string;
  version?: string;
}): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>> {
  const promptManager = Container.get(PromptManager);

  if (props.version) {
    return await promptManager.getPromptVersion({ ...props, version: props.version });
  }
  return promptManager.getPrompt(props);
}

export async function updatePrompt(props: {
  category: string;
  name: string;
  updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
}): Promise<void> {
  const promptManager = Container.get(PromptManager);
  const validatedUpdates = PromptSchema.parse(props.updates);
  await promptManager.updatePrompt({ ...props, updates: validatedUpdates });
}

export async function generateTypes(): Promise<void> {
  const configManager = Container.get(PromptProjectConfigManager);
  const outputDir = configManager.getConfig("outputDir");
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});
  let typeDefs = 'declare module "prompt-manager" {\n';

  for (const prompt of prompts) {
    const inputTypes = await generateExportableSchemaAndType({
      schema: prompt.inputSchema,
      name: `${prompt.category}/${prompt.name}Input`,
    });
    const outputTypes = await generateExportableSchemaAndType({
      schema: prompt.outputSchema,
      name: `${prompt.category}/${prompt.name}Output`,
    });

    typeDefs += `  ${inputTypes.formattedSchemaTsNoImports};\n`;
    typeDefs += `  ${outputTypes.formattedSchemaTsNoImports};\n`;

    const promptData = prompt as IPrompt<IPromptInput, IPromptOutput>;
    typeDefs += `  export namespace ${promptData.category} {\n`;
    typeDefs += `    export const ${promptData.name}: {\n`;
    typeDefs += `      format: (inputs: ${promptData.name}Input) => ${promptData.name}Output;\n`;
    typeDefs += `      description: string;\n`;
    typeDefs += `      version: string;\n`;
    typeDefs += `    };\n`;
    typeDefs += `  }\n\n`;
  }

  typeDefs += "}\n";

  await fs.writeFile(path.join(outputDir, "prompts.d.ts"), typeDefs);
}

export async function getStatus(): Promise<{
  config: any;
  totalPrompts: number;
  categories: string[];
  lastGenerated: string | null;
  warnings: string[];
}> {
  const configManager = Container.get(PromptProjectConfigManager);
  const promptManager = Container.get(PromptManager);

  const config = {
    promptsDir: configManager.getConfig("promptsDir"),
    outputDir: configManager.getConfig("outputDir"),
    preferredModels: configManager.getConfig("preferredModels"),
    modelParams: configManager.getConfig("modelParams"),
  };

  const prompts = await promptManager.listPrompts({});
  const categories = [...new Set(prompts.map((prompt) => prompt.category))];

  let lastGenerated = null;
  try {
    const stats = await fs.stat(path.join(config.outputDir, "prompts.d.ts"));
    lastGenerated = stats.mtime.toISOString();
  } catch (error) {
    // File doesn't exist, which is fine
  }

  const warnings = [];
  if (prompts.length === 0) {
    warnings.push(
      'No prompts found. Use the "create" command to add new prompts.',
    );
  }
  if (!lastGenerated) {
    warnings.push(
      'Type definitions have not been generated yet. Use the "generate" command to create them.',
    );
  }

  return {
    config,
    totalPrompts: prompts.length,
    categories,
    lastGenerated,
    warnings,
  };
}

export async function deletePrompt(props: {
  category: string;
  name: string;
}): Promise<void> {
  const promptManager = Container.get(PromptManager);
  await promptManager.deletePrompt(props);
}

export async function amendPrompt(props: {
  category: string;
  name: string;
  amendQuery?: string;
  amendedPrompt?: Partial<IPromptModel>;
}): Promise<Partial<IPromptModel>> {
  const promptManager = Container.get(PromptManager);
  if (props.amendQuery) {
    // Generate amended prompt based on the query
    return await promptManager.generateAmendedPrompt(props);
  } else if (props.amendedPrompt) {
    // Save the amended prompt
    await promptManager.updatePrompt({ ...props, updates: props.amendedPrompt, bumpVersion: true });
    return props.amendedPrompt;
  }
  throw new Error("Invalid amendment operation");
}

export async function listPromptVersions(props: {
  category: string;
  name: string;
}): Promise<string[]> {
  const promptManager = Container.get(PromptManager);
  const versions = await promptManager.versionPrompt({
    ...props,
    action: "list",
  });
  return (versions.result as string[]).sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  });
}

export async function switchPromptVersion(props: {
  category: string;
  name: string;
  version: string;
}): Promise<void> {
  const promptManager = Container.get(PromptManager);
  await promptManager.versionPrompt({ ...props, action: "switch" });
}

export async function getGeneratedTypeScript(props: {
  category: string;
  name: string;
}): Promise<string> {
  const promptManager = Container.get(PromptManager);
  const prompt = await promptManager.getPrompt(props);
  return await generatePromptTypeScript(prompt);
}
