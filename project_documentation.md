# Project Documentation

## Project Structure

```
generateTsProjectDocAndQualityReport.ts  [error opening dir]
tsup.config.ts  [error opening dir]
./src
├── cli
│   ├── components
│   │   ├── _atoms
│   │   ├── hooks
│   │   ├── prompt
│   │   ├── ui
│   │   └── utils
│   ├── screens
│   └── utils
├── config
├── fixtures
├── generated
├── schemas
├── scripts
├── test
│   └── __snapshots__
├── types
└── utils
    └── __snapshots__

20 directories, 2 files

```

## src/cli/PromptManagerUI.tsx

**Description:** No description available

```typescript
import chalk from "chalk";
import { Box, Text, useApp, useInput } from "ink";
import { useStdout } from "ink";
import { useAtom } from "jotai";
import type React from "react";
import { type FC, useEffect } from "react";
import type { Screen } from "../types/interfaces";
import { logger } from "../utils/logger";
import {
	currentScreenAtom,
	currentWizardStepAtom,
	selectedPromptAtom,
} from "./atoms";
import DebugPanel from "./components/DebugPanel";
import AlertMessage from "./components/ui/AlertMessage";
import Footer from "./components/ui/Footer";
import Header from "./components/ui/Header";
import Layout from "./components/ui/Layout";
import HelpScreen from "./screens/HelpScreen";
import HomeScreen from "./screens/HomeScreen";
import PromptAmendScreen from "./screens/PromptAmendScreen";
import PromptCreateScreen from "./screens/PromptCreateScreen";
import PromptDetailScreen from "./screens/PromptDetailScreen";
import PromptEvaluationScreen from "./screens/PromptEvaluationScreen";
import PromptGenerateScreen from "./screens/PromptGenerateScreen";
import PromptImportScreen from "./screens/PromptImportScreen";
import PromptListScreen from "./screens/PromptListScreen";
import StatusScreen from "./screens/StatusScreen";
import TestScreen from "./screens/TestScreen";

interface PromptManagerUIProps {
	initialScreen?: string;
	initialPrompt?: { category: string; name: string };
	initialVersion?: string;
	initialWizardStep?: number;
}

const PromptManagerUI: FC<PromptManagerUIProps> = ({
	initialScreen = "home",
	initialPrompt,
	initialVersion,
	initialWizardStep = 1,
}) => {
	const { exit } = useApp();
	const [currentScreen, setCurrentScreen] = useAtom(currentScreenAtom);
	const [selectedPrompt, setSelectedPrompt] = useAtom(selectedPromptAtom);
	const { write } = useStdout();
	const [currentWizardStep, setCurrentWizardStep] = useAtom(
		currentWizardStepAtom,
	);

	useEffect(() => {
		setCurrentScreen(initialScreen as any);
		if (initialPrompt) {
			setSelectedPrompt(initialPrompt);
		}
		if (initialScreen === "test") {
			setCurrentWizardStep(initialWizardStep);
		}
	}, []);

	useEffect(() => {
		const cleanup = () => {
			logger.info("Cleaning up...");
		};
		return cleanup;
	}, []);

	useInput((input, key) => {
		if (key.escape) {
			if (currentScreen !== "home") {
				setCurrentScreen("home");
			} else {
				exit();
			}
		}
	});

	const screenComponents: Record<Screen, React.ReactNode> = {
		home: (
			<HomeScreen onNavigate={(screen: Screen) => setCurrentScreen(screen)} />
		),
		list: <PromptListScreen />,
		detail: selectedPrompt ? (
			<PromptDetailScreen
				prompt={selectedPrompt}
				onBack={() => setCurrentScreen("list")}
				initialVersion={initialVersion}
			/>
		) : (
			<Text>No prompt selected. Please select a prompt from the list.</Text>
		),
		create: <PromptCreateScreen />,
		status: <StatusScreen />,
		help: <HelpScreen />,
		amend: <PromptAmendScreen />,
		import: <PromptImportScreen />,
		evaluate: selectedPrompt ? (
			<PromptEvaluationScreen
				prompt={selectedPrompt}
				onBack={() => setCurrentScreen("detail")}
			/>
		) : (
			<Text>No prompt selected. Please select a prompt from the list.</Text>
		),
		generate: <PromptGenerateScreen />,
		test: <TestScreen />,
	};

	const renderScreen = () =>
		screenComponents[currentScreen as Screen] ?? <Text>Screen not found</Text>;

	return (
		<Layout>
			<Header title={`Prompt Manager - ${chalk.green(currentScreen)}`} />
			<Box flexGrow={1} flexDirection="column">
				{renderScreen()}
			</Box>
			<DebugPanel />
			<Footer>
				<Text>Press 'Esc' to go back, 'q' to quit</Text>
			</Footer>
		</Layout>
	);
};

export default PromptManagerUI;

```

## src/cli/commands.ts

**Description:** No description available

```typescript
import axios from "axios";
import type {
	IPrompt,
	IPromptInput,
	IPromptModel,
	IPromptOutput,
} from "../types/interfaces";

import path from "node:path";
import fs from "fs-extra";
import { Container } from "typedi";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { PromptManager } from "../promptManager";
import { PromptSchema } from "../schemas/prompts";
import { cleanName } from "../utils/promptManagerUtils";
import {
	generateExportableSchemaAndType,
	generatePromptTypeScript,
} from "../utils/typeGeneration";

export const fetchContentFromUrl = async (url: string): Promise<string> => {
	const response = await axios.get(url);
	return response.data;
};

export const createPromptFromContent = async (
	content: string,
): Promise<Partial<IPromptModel>> => {
	// Implement the logic to send a request to the AI to create a prompt from the content
	// This is a placeholder implementation
	return {
		name: "Imported Prompt",
		category: "Imported",
		description: "This prompt was imported from external content.",
		template: content,
		version: "1.0",
		parameters: [],
		metadata: {
			created: new Date().toISOString(),
			lastModified: new Date().toISOString(),
		},
		outputType: "plain",
		inputSchema: {},
		outputSchema: {},
		configuration: {
			modelName: "default",
			temperature: 0.7,
			maxTokens: 100,
			topP: 1.0,
			frequencyPenalty: 0.0,
			presencePenalty: 0.0,
			stopSequences: [],
		},
	};
};

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
		return await promptManager.getPromptVersion({
			...props,
			version: props.version,
		});
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

export async function generateTypes(): Promise<string> {
	const configManager = Container.get(PromptProjectConfigManager);
	const outputDir = configManager.getConfig("outputDir");
	const promptManager = Container.get(PromptManager);
	const prompts = await promptManager.listPrompts({});
	let typeDefs =
		'import { IAsyncIterableStream } from "./types/interfaces";\n\n';
	typeDefs += 'declare module "prompt-manager" {\n';
	typeDefs += "  export class PromptManagerClient {\n";

	const categories = new Set<string>();

	for (const prompt of prompts) {
		categories.add(prompt.category);
		const inputTypes = await generateExportableSchemaAndType({
			schema: prompt.inputSchema,
			name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Input`,
		});
		const outputTypes = await generateExportableSchemaAndType({
			schema: prompt.outputSchema,
			name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Output`,
		});

		typeDefs += `    ${inputTypes.formattedSchemaTsNoImports}\n`;
		typeDefs += `    ${outputTypes.formattedSchemaTsNoImports}\n`;
	}

	for (const category of categories) {
		typeDefs += `    ${category}: {\n`;
		const categoryPrompts = prompts.filter((p) => p.category === category);
		for (const prompt of categoryPrompts) {
			typeDefs += `      ${cleanName(prompt.name)}: {\n`;
			typeDefs += `        format: (inputs: ${cleanName(category)}${cleanName(prompt.name)}Input) => Promise<string>;\n`;
			typeDefs += `        execute: (inputs: ${cleanName(category)}${cleanName(prompt.name)}Input) => Promise<${cleanName(category)}${cleanName(prompt.name)}Output>;\n`;
			typeDefs += `        stream: (inputs: ${cleanName(category)}${cleanName(prompt.name)}Input) => Promise<IAsyncIterableStream<string>>;\n`;
			typeDefs += "        description: string;\n";
			typeDefs += "        version: string;\n";
			typeDefs += "      };\n";
		}
		typeDefs += "    };\n";
	}

	typeDefs += "  }\n\n";
	typeDefs += "  export const promptManager: PromptManagerClient;\n";
	typeDefs += "}\n";

	await fs.writeFile(path.join(outputDir, "prompts.d.ts"), typeDefs);
	return typeDefs;
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
	}
	if (props.amendedPrompt) {
		// Save the amended prompt
		await promptManager.updatePrompt({
			...props,
			updates: props.amendedPrompt,
			bumpVersion: true,
		});
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
export const importPrompt = async (promptData: any) => {
	// Implementation here
};

```

## src/cli/components/prompt/PromptList.tsx

**Description:** No description available

```typescript
import { Box, Text, useInput } from "ink";
import type React from "react";
import { useEffect, useState } from "react";

import { listPrompts } from "../../commands";

interface PromptListProps {
	onSelectPrompt: (prompt: any) => void;
}

const PromptList: React.FC<PromptListProps> = ({ onSelectPrompt }) => {
	const [prompts, setPrompts] = useState<any[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		listPrompts().then(setPrompts);
	}, []);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		} else if (key.downArrow) {
			setSelectedIndex(Math.min(prompts.length - 1, selectedIndex + 1));
		} else if (key.return) {
			onSelectPrompt(prompts[selectedIndex]);
		}
	});

	return (
		<Box flexDirection="column">
			{prompts.map((prompt, index) => (
				<Text key={index} color={index === selectedIndex ? "green" : undefined}>
					{prompt.category}/{prompt.name} (v{prompt.version})
				</Text>
			))}
		</Box>
	);
};

export default PromptList;

```

## src/cli/components/prompt/PromptView.tsx

**Description:** No description available

```typescript
import chalk from "chalk";
import { Box, type BoxProps, Text } from "ink";
import yaml from "js-yaml";
import type React from "react";
import type { IPrompt } from "../../../types/interfaces";
import JsonSchemaTree from "../JSONSchemaTree";

interface RenderSectionProps extends BoxProps {
	title: string;
	content: string | string[] | undefined;
	color: string;
	showTitle?: boolean;
}

const RenderSection: React.FC<RenderSectionProps> = ({
	title,
	content,
	color,
	showTitle = true,
	flexDirection = "row",
	...boxProps
}) => (
	<Box flexDirection={flexDirection} {...boxProps}>
		{showTitle && (
			<Text bold color={color}>
				{title}:
			</Text>
		)}
		<Box paddingLeft={showTitle ? 1 : 0}>
			{Array.isArray(content) ? (
				content.map((item, index) => (
					<Text key={index}>{chalk.white(item)}</Text>
				))
			) : content ? (
				<Text>{chalk.white(content)}</Text>
			) : (
				<Text>{chalk.gray("Not specified")}</Text>
			)}
		</Box>
	</Box>
);

interface RenderObjectProps extends BoxProps {
	obj: Record<string, any>;
	indent?: number;
}

const RenderObject: React.FC<RenderObjectProps> = ({
	obj,
	indent = 1,
	...boxProps
}) => (
	<Box flexDirection="column" paddingLeft={indent} {...boxProps}>
		{Object.entries(obj).map(([key, value], index) => (
			<Text key={index}>
				{chalk.yellow(key)}:{" "}
				{typeof value === "object"
					? JSON.stringify(value, null, 2)
							.split("\n")
							.map((line, i) =>
								i === 0 ? line : " ".repeat(indent + key.length + 2) + line,
							)
							.join("\n")
					: chalk.white(JSON.stringify(value))}
			</Text>
		))}
	</Box>
);

interface RenderSchemaProps extends BoxProps {
	schema: Record<string, any>;
}

const RenderSchema: React.FC<RenderSchemaProps> = ({ schema, ...boxProps }) => {
	const yamlString = yaml.dump(schema, { indent: 2 });
	return (
		<Box flexDirection="column" {...boxProps}>
			{yamlString.split("\n").map((line, index) => (
				<Text key={index}>
					{line.startsWith(" ") ? chalk.cyan(line) : chalk.yellow(line)}
				</Text>
			))}
		</Box>
	);
};

interface RenderTemplateProps extends BoxProps {
	template: string;
}

const RenderTemplate: React.FC<RenderTemplateProps> = ({
	template,
	...boxProps
}) => (
	<Box {...boxProps}>
		<Text>
			{template
				.split(/(\{\{.*?\}\})/)
				.map((part, index) =>
					part.startsWith("{{") && part.endsWith("}}")
						? chalk.magenta(part)
						: chalk.white(part),
				)}
		</Text>
	</Box>
);

interface PromptViewProps {
	prompt: Partial<IPrompt<any, any>>;
	compact?: boolean;
}

const PromptView: React.FC<PromptViewProps> = ({ prompt, compact = true }) => {
	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="#ffedd5"
			padding={0}
		>
			<Box flexDirection="row" marginBottom={0}>
				<Box width="50%">
					<RenderSection title="Name" content={prompt.name} color="green" />
				</Box>
				<Box width="50%">
					<RenderSection
						title="Category"
						content={prompt.category}
						color="green"
					/>
				</Box>
			</Box>
			<Box flexDirection="row" marginBottom={0}>
				<Box width="50%" flexDirection="row">
					<RenderSection title="Ver" content={prompt.version} color="green" />
				</Box>
				<Box width="50%" flexDirection="row">
					<RenderSection
						title="Output Type"
						content={prompt.outputType}
						color="cyan"
					/>
				</Box>
			</Box>
			<RenderSection
				title="Description"
				showTitle={false}
				flexDirection="column"
				content={prompt.description}
				color="yellow"
				paddingLeft={0}
				paddingBottom={1}
			/>

			<Box marginY={0} borderStyle="round" borderColor="#ffedd5" paddingX={1}>
				{prompt.template && <RenderTemplate template={prompt.template} />}
			</Box>
			<Box flexDirection="row" marginY={0} paddingX={1}>
				<Box width="50%" flexDirection="column" marginRight={1}>
					<Text bold color="red">
						Input Schema:
					</Text>
					{prompt.inputSchema && <JsonSchemaTree schema={prompt.inputSchema} />}
				</Box>
				<Box width="50%" flexDirection="column" marginLeft={1}>
					<Text bold color="red">
						Output Schema:
					</Text>
					{prompt.outputSchema && (
						<JsonSchemaTree schema={prompt.outputSchema} />
					)}
				</Box>
			</Box>
			{!compact && (
				<>
					<Box flexDirection="column" marginY={1}>
						<Text bold color="red">
							Metadata:
						</Text>
						{prompt.metadata && <RenderObject obj={prompt.metadata} />}
					</Box>
					<Box flexDirection="column" marginY={1}>
						<Text bold color="red">
							Configuration:
						</Text>
						{prompt.configuration && (
							<RenderObject obj={prompt.configuration} />
						)}
					</Box>
				</>
			)}
		</Box>
	);
};

export default PromptView;

```

## src/cli/components/utils/KeyboardShortcuts.tsx

**Description:** No description available

```typescript
import { Box, Text, useInput } from "ink";

import chalk from "chalk";

interface Shortcut {
	key: string;
	description: string;
	action: () => void;
}

interface KeyboardShortcutsProps {
	shortcuts: Shortcut[];
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
	shortcuts,
}) => {
	useInput((input) => {
		const shortcut = shortcuts.find((s) => s.key === input);
		if (shortcut) {
			shortcut.action();
		}
	});

	return (
		<Box flexDirection="column">
			{shortcuts.map((shortcut, index) => (
				<Text key={index}>
					Press {chalk.bold(shortcut.key)} to {shortcut.description}
				</Text>
			))}
		</Box>
	);
};

```

## src/config/PromptProjectConfigManager.ts

**Description:** No description available

```typescript
import path from "node:path";
import chalk from "chalk";
import { type OptionsSync, cosmiconfig } from "cosmiconfig";
import { Service } from "typedi";
import { fromError } from "zod-validation-error";
import { DEFAULT_CONFIG, configSchema, z } from "../schemas/config";
import type { Config } from "../schemas/config";
import type { IPromptProjectConfigManager } from "../types/interfaces";
import { ensureDirectoryExists } from "../utils/fileUtils";
import { logger } from "../utils/logger";

const DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME = ".promptmanager.config.json";

export type { Config };

@Service()
export class PromptProjectConfigManager implements IPromptProjectConfigManager {
	private config: Config;
	private initialized = false;
	private explorer;
	private basePath: string;
	private configFilePath: string | undefined;

	constructor() {
		this.config = { ...DEFAULT_CONFIG };
		this.basePath = process.env.FURY_PROJECT_ROOT || process.cwd();
		const explorerOptions: OptionsSync = {
			searchPlaces: [
				"package.json",
				".promptmanagerrc",
				".promptmanagerrc.json",
				".promptmanagerrc.yaml",
				".promptmanagerrc.yml",
				".promptmanagerrc.js",
				"promptmanager.config.js",
			],
			loaders: {},
			transform: (result) => result,
			ignoreEmptySearchPlaces: true,
			cache: true,
			mergeImportArrays: true,
			mergeSearchPlaces: true,
			searchStrategy: "project",
		};
		this.explorer = cosmiconfig("promptmanager", explorerOptions);
		logger.debug(
			`Initializing PromptProjectConfigManager with basePath: ${this.basePath}`,
		);
	}

	public getBasePath(): string {
		return this.basePath;
	}

	public getPromptsDir(): string {
		if (!this.config.promptsDir) {
			throw new Error(
				"Prompts directory not set. Please set the prompts directory in your configuration file.",
			);
		}
		if (!path.isAbsolute(this.config.promptsDir)) {
			return path.join(this.basePath, this.config.promptsDir);
		}
		return this.config.promptsDir;
	}

	public getProjectConfigPath(): string {
		if (!this.configFilePath) {
			logger.warn("No configuration file found. Using default configuration.");
			throw new Error(
				"No configuration file found. Please set the configuration file in your project.",
			);
		}
		return this.configFilePath;
	}

	public async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			await this.loadConfig();
			await this.ensureConfigDirectories();
			this.prettyPrintConfig();
			this.initialized = true;
		} catch (error: any) {
			logger.error("Failed to initialize config:", error.message, error.stack);
			throw new Error(
				"Failed to initialize PromptProjectConfigManager. Please check your configuration and try again.",
				error.stack,
			);
		}
	}

	public async isInitialized(): Promise<boolean> {
		return this.initialized;
	}

	private async loadConfig(): Promise<void> {
		try {
			const result = await this.explorer.search();
			if (result?.config) {
				const validatedConfig = configSchema.parse({
					...DEFAULT_CONFIG,
					...result.config,
				});
				this.config = {
					...validatedConfig,
					promptsDir: path.resolve(this.basePath, validatedConfig.promptsDir),
					outputDir: path.resolve(this.basePath, validatedConfig.outputDir),
				};
				logger.debug(`Found configuration file at ${result.filepath}`);
				this.configFilePath = result.filepath;
			} else {
				logger.warn(
					"No configuration file found. Using default configuration.",
				);
				this.config = { ...DEFAULT_CONFIG };
			}
			if (!this.configFilePath) {
				logger.error(`No configuration file found at ${this.basePath}`);
				this.configFilePath = path.join(
					this.basePath,
					DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME,
				);
			} else {
				logger.debug(`Configuration file found at ${this.configFilePath}`);
			}
			logger.debug("Configuration loaded successfully");
			logger.debug(`Prompts directory: ${this.config.promptsDir}`);
			logger.debug(`Output directory: ${this.config.outputDir}`);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const validationError = fromError(error);
				logger.error(validationError.toString());
				logger.error("Invalid configuration:", error.errors);
				throw new Error(`Invalid configuration: ${error.message}`);
			}
			logger.error("Error loading configuration:", error);
			throw new Error(
				"Failed to load configuration. Please check your configuration file.",
			);
		}
	}

	private async ensureConfigDirectories(): Promise<void> {
		try {
			await ensureDirectoryExists(this.config.promptsDir);
			logger.success(
				`Created prompts directory: ${chalk.yellow(this.config.promptsDir)}`,
			);
			await ensureDirectoryExists(this.config.outputDir);
			logger.success(
				`Created output directory: ${chalk.yellow(this.config.outputDir)}`,
			);
		} catch (error: any) {
			logger.error("Error: Failed to create necessary directories.");
			logger.warn(
				"Please check that you have write permissions in the project directory.",
			);
			throw new Error(`Failed to create directories: ${error.message}`);
		}
	}

	private prettyPrintConfig(): void {
		if (this.config.verbosity > 99) {
			logger.info(chalk.bold("\nLoaded Configuration:"));
			logger.info(`prompts_dir:      ${chalk.cyan(this.config.promptsDir)}`);
			logger.info(`output_dir:       ${chalk.cyan(this.config.outputDir)}`);
			logger.info(
				`preferredModels:  ${chalk.cyan(this.config.preferredModels.join(", "))}`,
			);
			logger.info("modelParams:");
			Object.entries(this.config.modelParams).forEach(([model, params]) => {
				logger.info(`  ${model}:`);
				Object.entries(params).forEach(([key, value]) => {
					logger.info(`    ${key}: ${chalk.cyan(value)}`);
				});
			});
			logger.info(`verbosity:        ${chalk.cyan(this.config.verbosity)}`);
			logger.info("\n");
		}
	}

	public getConfig<K extends keyof Config>(key: K): Config[K] {
		return this.config[key];
	}

	public getAllConfig(): Config {
		return { ...this.config };
	}

	public async updateConfig(newConfig: Partial<Config>): Promise<void> {
		try {
			const updatedConfig = configSchema.parse({
				...this.config,
				...newConfig,
			});
			this.config = updatedConfig;
			this.prettyPrintConfig();
		} catch (error: any) {
			if (error instanceof z.ZodError) {
				const validationError = fromError(error);
				logger.error("Validation error:", validationError.toString());
				logger.error("Invalid configuration update:", error.errors);
				throw new Error(`Invalid configuration update: ${error.message}`);
			}
			throw error;
		}
	}
	setVerbosity(level: number): void {
		this.config.verbosity = level;
	}

	getVerbosity(): number {
		return this.config.verbosity;
	}
}

```

## src/cli/components/utils/MultiSelect.tsx

**Description:** No description available

```typescript
import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import GridOptions, { type Option } from "./GridOptions";

interface MultiSelectProps {
	options: Option[];
	onSelect: (selectedOptions: Option[]) => void;
	maxDisplayedOptions?: number;
	descriptionMaxLength?: number;
	isFocused?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
	options,
	onSelect,
	maxDisplayedOptions = 10,
	descriptionMaxLength = 50,
	isFocused = true,
}) => {
	const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
		new Set(),
	);
	const [focusedIndex, setFocusedIndex] = useState(0);

	useInput(
		(input, key) => {
			if (key.return) {
				onSelect(
					Array.from(selectedOptions).map(
						(value) => options.find((option) => option.value === value)!,
					),
				);
			} else if (key.upArrow) {
				setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
			} else if (key.downArrow) {
				setFocusedIndex((prev) =>
					prev < options.length - 1 ? prev + 1 : prev,
				);
			} else if (key.tab) {
				setSelectedOptions((prev) => {
					const newSet = new Set(prev);
					const focusedOption = options[focusedIndex];
					if (newSet.has(focusedOption.value)) {
						newSet.delete(focusedOption.value);
					} else {
						newSet.add(focusedOption.value);
					}
					return newSet;
				});
			}
		},
		{ isActive: isFocused },
	);

	const optionsWithSelection = options.map((option) => ({
		...option,
		label: `${selectedOptions.has(option.value) ? "[x]" : "[ ]"} ${option.label}`,
	}));

	return (
		<Box flexDirection="column">
			<GridOptions
				options={optionsWithSelection}
				selectedIndex={focusedIndex}
				maxDisplayedOptions={maxDisplayedOptions}
				descriptionMaxLength={descriptionMaxLength}
				showNumbers={false}
			/>
			<Text>Press Space to select, Enter to confirm</Text>
		</Box>
	);
};

export default MultiSelect;

```

## src/cli/components/utils/PaginatedList.tsx

**Description:** No description available

```typescript
import chalk from "chalk";
import { Box, Text, useInput } from "ink";
import { useState } from "react";

interface PaginatedListProps<T> {
	items: T[];
	itemsPerPage: number;
	renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
	onSelectItem: (item: T) => void;
}

export const PaginatedList = <T,>({
	items,
	itemsPerPage,
	renderItem,
	onSelectItem,
}: PaginatedListProps<T>) => {
	const [currentPage, setCurrentPage] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const paginatedItems = items.slice(
		currentPage * itemsPerPage,
		(currentPage + 1) * itemsPerPage,
	);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		} else if (key.downArrow) {
			setSelectedIndex(Math.min(paginatedItems.length - 1, selectedIndex + 1));
		} else if (key.return) {
			onSelectItem(paginatedItems[selectedIndex]);
		} else if (
			input === "n" &&
			currentPage < Math.floor(items.length / itemsPerPage) - 1
		) {
			setCurrentPage(currentPage + 1);
			setSelectedIndex(0);
		} else if (input === "p" && currentPage > 0) {
			setCurrentPage(currentPage - 1);
			setSelectedIndex(0);
		}
	});

	return (
		<Box flexDirection="column">
			{paginatedItems.map((item, index) => (
				<Box key={index}>
					{renderItem(item, index, index === selectedIndex)}
				</Box>
			))}
			<Text>
				Page {currentPage + 1} of {Math.ceil(items.length / itemsPerPage)}
			</Text>
			<Text>
				{chalk.gray(
					"Use ↑↓ to navigate, Enter to select, (N)ext/(P)revious page",
				)}
			</Text>
		</Box>
	);
};

```

## src/utils/typeGeneration.test.ts

**Description:** No description available

```typescript
import { describe, expect, test } from "bun:test";
import type { JSONSchema7 } from "json-schema";
import type { IPrompt } from "../types/interfaces";
import {
	generateExportableSchemaAndType,
	generatePromptTypeScript,
	generatePromptTypescriptDefinition,
	generateTestInputs,
} from "./typeGeneration";

describe("Type Generation Utilities", () => {
	const sampleSchema: JSONSchema7 = {
		type: "object",
		properties: {
			name: { type: "string" },
			age: { type: "number" },
			isStudent: { type: "boolean" },
		},
		required: ["name", "age"],
	};

	test("generateExportableSchemaAndType", async () => {
		const result = await generateExportableSchemaAndType({
			schema: sampleSchema,
			name: "Person",
		});
		expect(result.formattedSchemaTs).toContain(
			"export const Person = z.object({",
		);
		expect(result.formattedSchemaTs).toContain("name: z.string(),");
		expect(result.formattedSchemaTs).toContain("age: z.number(),");
		expect(result.formattedSchemaTs).toContain(
			"isStudent: z.boolean().optional(),",
		);
		expect(result.formattedSchemaTs).toContain(
			"export type Person = z.infer<typeof Person>;",
		);
		expect(result).toMatchSnapshot();
	});

	test("generatePromptTypeScript", async () => {
		const prompt: IPrompt<any, any> = {
			name: "ExamplePrompt",
			category: "exampleCategory",
			description: "An example prompt",
			version: "1.0.0",
			template: "Example template",
			inputSchema: {
				type: "object",
				properties: {
					input: { type: "string" },
				},
			},
			outputSchema: {
				type: "object",
				properties: {
					output: { type: "string" },
				},
			},
			// parameters: {}, // Add appropriate parameters
			metadata: {
				created: "2023-01-01T00:00:00.000Z",
				lastModified: "2023-01-01T00:00:00.000Z",
			}, // Add appropriate metadata
			outputType: "structured", // Add appropriate outputType
			// configuration: {} // Add appropriate configuration
		};
		const result = await generatePromptTypeScript(prompt);
		expect(result).toContain("export interface ExamplePromptInput");
		expect(result).toContain("export interface ExamplePromptOutput");
		expect(result).toMatchSnapshot();
	});

	test("generatePromptTypescriptDefinition", async () => {
		const prompt: IPrompt<any, any> = {
			name: "ExamplePrompt",
			category: "exampleCategory",
			description: "An example prompt",
			version: "1.0.0",
			template: "Example template",
			inputSchema: {
				type: "object",
				properties: {
					input: { type: "string" },
				},
			},
			outputSchema: {
				type: "object",
				properties: {
					output: { type: "string" },
				},
			},
			metadata: {
				created: "2023-01-01T00:00:00.000Z",
				lastModified: "2023-01-01T00:00:00.000Z",
			},
			outputType: "structured",
		};
		const result = await generatePromptTypescriptDefinition(prompt);
		expect(result).toContain("export interface ExamplePromptInput");
		expect(result).toContain("export interface ExamplePromptOutput");
		expect(result).toMatchSnapshot();
	});

	test("generateTestInputs", () => {
		const result = generateTestInputs(sampleSchema, 3);
		expect(result).toHaveLength(3);
		result.forEach((input) => {
			expect(input).toHaveProperty("name");
			expect(input).toHaveProperty("age");
			expect(input).toHaveProperty("isStudent");
		});
		expect(result).toMatchSnapshot();
	});
});

```

## src/utils/fileTransaction.ts

**Description:** No description available

```typescript
import path from "node:path";
import fs from "fs-extra";
import type lockfile from "proper-lockfile";
import { retryLock } from "./lockUtils";

type Operation = {
	type: "write" | "read" | "delete";
	path: string;
	data?: string;
};

export class FileTransaction {
	private operations: Operation[] = [];

	async write(filePath: string, data: string): Promise<void> {
		this.operations.push({ type: "write", path: filePath, data });
	}

	async read(filePath: string): Promise<string> {
		this.operations.push({ type: "read", path: filePath });
		return fs.readFile(filePath, "utf-8");
	}

	async delete(filePath: string): Promise<void> {
		this.operations.push({ type: "delete", path: filePath });
	}

	async commit(): Promise<void> {
		const lockPath = path.dirname(this.operations[0].path);
		let release: (() => Promise<void>) | undefined;

		try {
			release = await retryLock(lockPath, 5, 1000);

			for (const op of this.operations) {
				switch (op.type) {
					case "write":
						await fs.writeFile(op.path, op.data!);
						break;
					case "delete":
						await fs.remove(op.path);
						break;
					// "read" operations are not executed during commit
				}
			}
		} catch (error) {
			await this.rollback();
			throw error;
		} finally {
			if (release) {
				await release();
			}
		}
	}

	async rollback(): Promise<void> {
		for (let i = this.operations.length - 1; i >= 0; i--) {
			const op = this.operations[i];
			if (op.type === "write") {
				try {
					await fs.remove(op.path);
				} catch (error) {
					console.error(`Error rolling back write operation: ${error}`);
				}
			} else if (op.type === "delete") {
				try {
					if (op.data) {
						await fs.writeFile(op.path, op.data);
					}
				} catch (error) {
					console.error(`Error rolling back delete operation: ${error}`);
				}
			}
		}
	}
}

```

## src/utils/typeGeneration.ts

**Description:** No description available

```typescript
import type { JSONSchema7 } from "json-schema";
import jsf from "json-schema-faker";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { format } from "prettier";
import { zodToTs } from "zod-to-ts";
import type { IPrompt } from "../types/interfaces";
import { cleanName } from "./promptManagerUtils";

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
export async function generateExportableSchemaAndType({
	schema,
	name,
}: { schema: JSONSchema7; name: string }): Promise<SchemaAndType> {
	const zodSchemaString = jsonSchemaToZod(schema, {
		module: "esm",
		name: name,
		type: true,
	});
	const formatted = await format(zodSchemaString, { parser: "typescript" });
	const zodSchemaNoImports = formatted.replace(/import { z } from "zod";/g, "");
	return {
		formattedSchemaTs: zodSchemaNoImports,
		formattedSchemaTsNoImports: zodSchemaNoImports,
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
export async function generatePromptTypeScript(
	prompt: IPrompt<any, any>,
): Promise<string> {
	const inputTypes = await generateExportableSchemaAndType({
		schema: prompt.inputSchema,
		name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Input`,
	});
	const outputTypes = await generateExportableSchemaAndType({
		schema: prompt.outputSchema,
		name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Output`,
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

export async function generatePromptTypescriptDefinition(
	prompt: IPrompt<any, any>,
): Promise<string> {
	const zodInputSchema = eval(
		jsonSchemaToZod(prompt.inputSchema, { module: "esm" }),
	);
	const inputDef = zodToTs(zodInputSchema, `${cleanName(prompt.name)}Input`);
	const zodOutputSchema = eval(
		jsonSchemaToZod(prompt.outputSchema, { module: "esm" }),
	);
	const outputDef = zodToTs(zodOutputSchema, `${cleanName(prompt.name)}Output`);
	return `${inputDef}\n\n${outputDef}`;
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
export function generateTestInputs(schema: JSONSchema7, count = 5): any[] {
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

```

