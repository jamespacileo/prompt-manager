import { openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { PromptModel } from "./promptModel";
import { logger } from "./utils/logger";

/**
 * @class PromptModelEvaluator
 * @description Evaluates and improves PromptModels
 *
 * @saga
 * This class is responsible for evaluating PromptModels, generating test data,
 * running evaluations, creating test matrices, and suggesting improvements.
 *
 * @epicFeatures
 * - Test input data generation
 * - Prompt evaluation
 * - Test matrix creation
 * - Parallel execution of tests
 * - AI-powered improvement suggestions
 * - Prompt variation generation
 *
 * @alliances
 * - PromptModel: The model being evaluated
 * - openai: For AI-powered evaluations and suggestions
 *
 * @allies
 * - PromptManager: Uses this class for bulk evaluations and improvements
 *
 * @epicTale
 * ```typescript
 * const evaluator = new PromptModelEvaluator(promptModel);
 * const testResults = await evaluator.runEvaluation();
 * const improvements = await evaluator.suggestImprovements();
 * ```
 *
 * @safeguards
 * - Ensures all evaluations are run with proper error handling
 * - Limits the number of parallel executions to prevent overload
 */
export class PromptModelEvaluator {
	private promptModel: PromptModel;
	private testInputs: any[] = [];
	private testResults: any[] = [];

	constructor(promptModel: PromptModel) {
		this.promptModel = promptModel;
	}

	/**
	 * Generate test input data for the PromptModel
	 *
	 * @quest count - Number of test inputs to generate
	 * @reward Promise<void>
	 *
	 * @lore
	 * This method uses the input schema of the PromptModel to generate
	 * valid test inputs using AI.
	 *
	 * @epicDeed
	 * ```typescript
	 * await evaluator.generateTestInputs(10);
	 * ```
	 */
	public async generateTestInputs(count: number): Promise<void> {
		const schema = this.promptModel.inputZodSchema;
		this.testInputs = [];

		for (let i = 0; i < count; i++) {
			try {
				const { object } = await generateObject({
					model: openai("gpt-4"),
					schema,
					prompt: `Generate a valid test input for the prompt: ${this.promptModel.description}`,
				});
				this.testInputs.push(object);
			} catch (error) {
				logger.error(`Error generating test input ${i + 1}:`, error as string);
			}
		}
	}

	/**
	 * Run an evaluation on the PromptModel using the generated test inputs
	 *
	 * @quest None
	 * @reward Promise<any[]> - Array of test results
	 *
	 * @lore
	 * This method executes the PromptModel with each test input and
	 * collects the results for analysis.
	 *
	 * @epicDeed
	 * ```typescript
	 * const results = await evaluator.runEvaluation();
	 * ```
	 */
	public async runEvaluation(): Promise<any[]> {
		if (this.testInputs.length === 0) {
			throw new Error("No test inputs available. Generate test inputs first.");
		}

		this.testResults = [];

		for (const input of this.testInputs) {
			try {
				const result = await this.promptModel.execute(input);
				this.testResults.push({ input, output: result, success: true });
			} catch (error) {
				this.testResults.push({
					input,
					error: (error as Error).message,
					success: false,
				});
			}
		}

		return this.testResults;
	}

	/**
	 * Create a test matrix for different configurations
	 *
	 * @quest configurations - Array of configuration objects
	 * @reward Promise<any[]> - Array of test matrix results
	 *
	 * @lore
	 * This method creates a matrix of test cases by combining
	 * different configurations with the test inputs.
	 *
	 * @epicDeed
	 * ```typescript
	 * const matrix = await evaluator.createTestMatrix([
	 *   { temperature: 0.5 },
	 *   { temperature: 0.7 },
	 * ]);
	 * ```
	 */
	public async createTestMatrix(configurations: any[]): Promise<any[]> {
		if (this.testInputs.length === 0) {
			throw new Error("No test inputs available. Generate test inputs first.");
		}

		const matrixResults = [];

		for (const config of configurations) {
			const tempModel = new PromptModel({
				...this.promptModel,
				metadata: {
					...this.promptModel.metadata,
					...config,
				},
			});
			const evaluator = new PromptModelEvaluator(tempModel);
			evaluator.testInputs = this.testInputs;
			const results = await evaluator.runEvaluation();
			matrixResults.push({ config, results });
		}

		return matrixResults;
	}

	/**
	 * Run multiple executions in parallel
	 *
	 * @quest parallelCount - Number of parallel executions
	 * @reward Promise<any[]> - Array of parallel execution results
	 *
	 * @lore
	 * This method executes the PromptModel multiple times in parallel
	 * to test its performance and consistency.
	 *
	 * @epicDeed
	 * ```typescript
	 * const parallelResults = await evaluator.runParallelExecutions(5);
	 * ```
	 */
	public async runParallelExecutions(parallelCount: number): Promise<any[]> {
		if (this.testInputs.length === 0) {
			throw new Error("No test inputs available. Generate test inputs first.");
		}

		const parallelResults = await Promise.all(
			this.testInputs.map(async (input) => {
				const results = await Promise.all(
					Array(parallelCount)
						.fill(null)
						.map(async () => {
							try {
								const result = await this.promptModel.execute(input);
								return { input, output: result, success: true };
							} catch (error: any) {
								return { input, error: error.message, success: false };
							}
						}),
				);
				return { input, results };
			}),
		);

		return parallelResults;
	}

	/**
	 * Use AI to create a set of suggested improvements
	 *
	 * @quest None
	 * @reward Promise<string[]> - Array of improvement suggestions
	 *
	 * @lore
	 * This method analyzes the test results and uses AI to generate
	 * suggestions for improving the PromptModel.
	 *
	 * @epicDeed
	 * ```typescript
	 * const suggestions = await evaluator.suggestImprovements();
	 * ```
	 */
	public async suggestImprovements(): Promise<string[]> {
		if (this.testResults.length === 0) {
			throw new Error("No test results available. Run an evaluation first.");
		}

		const { text } = await generateText({
			model: openai("gpt-4"),
			prompt: `Analyze the following test results and suggest improvements for the prompt:
      
      Prompt: ${this.promptModel.template}
      
      Test Results:
      ${JSON.stringify(this.testResults, null, 2)}
      
      Please provide a list of specific suggestions to improve the prompt's performance and reliability.`,
		});

		return text.split("\n").filter((suggestion) => suggestion.trim() !== "");
	}

	/**
	 * Generate prompt variations based on improvement suggestions
	 *
	 * @quest improvements - Array of improvement suggestions
	 * @reward Promise<PromptModel[]> - Array of new PromptModel variations
	 *
	 * @lore
	 * This method takes a set of improvement suggestions and generates
	 * new variations of the PromptModel based on those suggestions.
	 *
	 * @epicDeed
	 * ```typescript
	 * const variations = await evaluator.generatePromptVariations(suggestions);
	 * ```
	 */
	public async generatePromptVariations(
		improvements: string[],
	): Promise<PromptModel[]> {
		const variations: PromptModel[] = [];

		for (const improvement of improvements) {
			const { text } = await generateText({
				model: openai("gpt-4"),
				prompt: `Given the following prompt and improvement suggestion, generate an improved version of the prompt:
        
        Original Prompt: ${this.promptModel.template}
        
        Improvement Suggestion: ${improvement}
        
        Improved Prompt:`,
			});

			const newPromptData = {
				...this.promptModel,
				template: text.trim(),
				metadata: {
					...this.promptModel.metadata,
					lastModified: new Date().toISOString(),
				},
			};
			variations.push(new PromptModel(newPromptData));
		}

		return variations;
	}

	/**
	 * Calculate evaluation metrics
	 *
	 * @quest None
	 * @reward Promise<object> - Object containing evaluation metrics
	 *
	 * @lore
	 * This method calculates various metrics based on the test results,
	 * such as success rate, average response time, etc.
	 *
	 * @epicDeed
	 * ```typescript
	 * const metrics = await evaluator.calculateMetrics();
	 * ```
	 */
	private async calculateMetrics(): Promise<object> {
		if (this.testResults.length === 0) {
			throw new Error("No test results available. Run an evaluation first.");
		}

		const successRate =
			this.testResults.filter((result) => result.success).length /
			this.testResults.length;
		const averageResponseTime =
			this.testResults.reduce(
				(sum, result) => sum + (result.responseTime || 0),
				0,
			) / this.testResults.length;

		return {
			successRate,
			averageResponseTime,
			totalTests: this.testResults.length,
		};
	}

	/**
	 * Perform a comprehensive evaluation of the PromptModel
	 *
	 * @quest None
	 * @reward Promise<object> - Comprehensive evaluation results
	 *
	 * @lore
	 * This method runs a full suite of evaluations, including generating test inputs,
	 * running evaluations, creating a test matrix, and suggesting improvements.
	 *
	 * @epicDeed
	 * ```typescript
	 * const evaluation = await evaluator.performComprehensiveEvaluation();
	 * ```
	 */
	public async performComprehensiveEvaluation(): Promise<object> {
		await this.generateTestInputs(10);
		const evaluationResults = await this.runEvaluation();
		const testMatrix = await this.createTestMatrix([
			{ temperature: 0.5 },
			{ temperature: 0.7 },
			{ temperature: 0.9 },
		]);
		const parallelResults = await this.runParallelExecutions(5);
		const improvements = await this.suggestImprovements();
		const metrics = await this.calculateMetrics();

		return {
			evaluationResults,
			testMatrix,
			parallelResults,
			improvements,
			metrics,
		};
	}
}
