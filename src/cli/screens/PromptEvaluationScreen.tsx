import { logger } from "@/utils/logger";
import { Box, Text, useInput } from "ink";
import { useAtom } from "jotai";
import type React from "react";
import { useEffect, useState } from "react";
import { evaluatePrompt, generateUpdatedPrompt } from "../aiHelpers";
import { alertMessageAtom, currentScreenAtom } from "../atoms";
import { amendPrompt, getPromptDetails } from "../commands";
import MultiOptionSelect from "../components/MultiOptionSelect";
import PromptView from "../components/prompt/PromptView";
import FireSpinner from "../components/ui/FireSpinner";
import { ConfirmationDialog } from "../components/utils/ConfirmationDialog";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { THEME_COLORS } from "../uiConfig";

interface PromptEvaluationScreenProps {
	prompt: { category: string; name: string };
	onBack: () => void;
}

const PromptEvaluationScreen: React.FC<PromptEvaluationScreenProps> = ({
	prompt,
	onBack,
}) => {
	const [evaluation, setEvaluation] = useState<any>(null);
	const [selectedAdvice, setSelectedAdvice] = useState<string[]>([]);
	const [, setCurrentScreen] = useAtom(currentScreenAtom);
	const [, setAlertMessage] = useAtom(alertMessageAtom);
	const [currentPrompt, setCurrentPrompt] = useState<any>(null);
	const [updatedPrompt, setUpdatedPrompt] = useState<any>(null);
	const [stage, setStage] = useState<
		"evaluating" | "selecting" | "updating" | "confirming"
	>("evaluating");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		handleEvaluate();
		getPromptDetails({ category: prompt.category, name: prompt.name }).then(
			setCurrentPrompt,
		);
	}, [prompt.category, prompt.name]);

	const handleEvaluate = async () => {
		setEvaluation(null);
		setIsLoading(true);
		try {
			const result = await evaluatePrompt(prompt);
			setEvaluation(result);
			setStage("selecting");
		} catch (error) {
			logger.error("Error evaluating prompt:", error);
			setAlertMessage("Failed to evaluate prompt. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleApplyAdvice = async () => {
		setIsLoading(true);
		setStage("updating");
		if (selectedAdvice.length > 0 && currentPrompt) {
			try {
				const generatedPrompt = await generateUpdatedPrompt(
					currentPrompt,
					selectedAdvice.join(". "),
				);
				setUpdatedPrompt(generatedPrompt);
				setStage("confirming");
			} catch (error) {
				logger.error("Error generating updated prompt:", error);
				setAlertMessage("Failed to generate updated prompt. Please try again.");
				setStage("selecting");
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleConfirmUpdate = async () => {
		if (updatedPrompt) {
			setIsLoading(true);
			try {
				await amendPrompt({
					category: prompt.category,
					name: prompt.name,
					amendedPrompt: updatedPrompt,
				});
				setAlertMessage("Prompt updated with selected advice");
				setTimeout(() => setAlertMessage(null), 3000);
				setCurrentScreen("detail");
			} catch (error) {
				logger.error("Error updating prompt:", error);
				setAlertMessage("Failed to update prompt. Please try again.");
			} finally {
				setIsLoading(false);
			}
		}
	};

	useInput((input, key) => {
		if (input === "b" || key.escape) {
			if (stage === "confirming") {
				setStage("selecting");
			} else if (!isLoading) {
				onBack();
			}
		} else if (
			key.return &&
			selectedAdvice.length > 0 &&
			stage === "selecting" &&
			!isLoading
		) {
			handleApplyAdvice();
		}
	});

	const renderStageInstructions = () => {
		switch (stage) {
			case "evaluating":
				return <Text color={THEME_COLORS.secondary}>Evaluating prompt...</Text>;
			case "selecting":
				return (
					<Text color={THEME_COLORS.secondary}>
						Select advice to apply and press{" "}
						<Text color={THEME_COLORS.primary} bold>
							Enter
						</Text>{" "}
						to continue
					</Text>
				);
			case "updating":
				return (
					<Text color={THEME_COLORS.secondary}>
						Generating updated prompt...
					</Text>
				);
			case "confirming":
				return (
					<Text color={THEME_COLORS.secondary}>
						Review the updated prompt and press{" "}
						<Text color={THEME_COLORS.primary} bold>
							Y
						</Text>{" "}
						to confirm or{" "}
						<Text color={THEME_COLORS.primary} bold>
							N
						</Text>{" "}
						to go back
					</Text>
				);
			default:
				return null;
		}
	};

	return (
		<ScreenWrapper title={`Prompt Evaluation: ${prompt.name} - ${stage}`}>
			<Box flexDirection="column">
				<Text bold color={THEME_COLORS.heading}>
					Evaluating prompt: {prompt.name}
				</Text>
				{renderStageInstructions()}
				<Box flexDirection="row">
					<Box width="50%" flexDirection="column">
						{stage === "evaluating" && (
							<FireSpinner label="Evaluating prompt..." />
						)}
						{evaluation && (
							<>
								<Text>
									Clarity:{" "}
									<Text color={THEME_COLORS.primary}>
										{evaluation.clarity}/10
									</Text>
								</Text>
								<Text>
									Specificity:{" "}
									<Text color={THEME_COLORS.primary}>
										{evaluation.specificity}/10
									</Text>
								</Text>
								<Text>
									Relevance:{" "}
									<Text color={THEME_COLORS.primary}>
										{evaluation.relevance}/10
									</Text>
								</Text>
								<Text>
									Completeness:{" "}
									<Text color={THEME_COLORS.primary}>
										{evaluation.completeness}/10
									</Text>
								</Text>
								<Text bold color={THEME_COLORS.heading}>
									Actionable Advice:
								</Text>
								{stage === "selecting" && (
									<>
										<MultiOptionSelect
											isMultiSelect={true}
											options={evaluation.actionableAdvice.map(
												(advice: string) => ({ label: advice, value: advice }),
											)}
											onSelect={(selected) =>
												setSelectedAdvice(selected.map((s) => s.value))
											}
											label="Select advice to apply:"
										/>
										<Text>
											Press{" "}
											<Text color={THEME_COLORS.primary} bold>
												Enter
											</Text>{" "}
											to apply selected advice
										</Text>
									</>
								)}
							</>
						)}
						{stage === "updating" && (
							<FireSpinner label="Generating updated prompt..." />
						)}
						{stage === "confirming" && updatedPrompt && (
							<Box flexDirection="column" marginY={1}>
								<Text bold color={THEME_COLORS.heading}>
									Updated Prompt:
								</Text>
								<Text color={THEME_COLORS.secondary}>
									{updatedPrompt.template}
								</Text>
								<ConfirmationDialog
									message="Do you want to apply these changes?"
									onConfirm={handleConfirmUpdate}
									onCancel={() => setStage("selecting")}
								/>
							</Box>
						)}
						{stage !== "confirming" && (
							<Text>
								Press{" "}
								<Text color={THEME_COLORS.primary} bold>
									b
								</Text>{" "}
								to go back
							</Text>
						)}
					</Box>
					<Box width="50%" flexDirection="column" marginLeft={2}>
						<Text bold color={THEME_COLORS.heading}>
							Current Prompt:
						</Text>
						{currentPrompt && <PromptView prompt={currentPrompt} />}
					</Box>
				</Box>
			</Box>
		</ScreenWrapper>
	);
};

export default PromptEvaluationScreen;
