import { Box, Text, useInput } from "ink";
import React, { type FC, useCallback, useState } from "react";

import { ConfirmationDialog } from "../components/utils/ConfirmationDialog";
import FireSpinner from "../components/ui/FireSpinner";
import type { IPromptModel } from "../../types/interfaces";
import PromptView from "../components/prompt/PromptView";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { THEME_COLORS } from "../uiConfig";
import { currentScreenAtom } from "../atoms";
import { createPrompt } from "../commands";
import { generatePromptWithAI } from "../aiHelpers";
import { useAtom } from "jotai";
import { AsyncInputHandler } from "../components/utils/AsyncInputHandler";
import OptionSelect from "../components/OptionSelect";
import MultiOptionSelect from "../components/MultiOptionSelect";
import AutoCompleteInput from "../components/AutoCompleteInput";

const promptTypeOptions = [
	{
		label: "Text Generation",
		value: "text",
		description: "Generate text based on a prompt",
	},
	{
		label: "Image Generation",
		value: "image",
		description: "Generate an image based on a description",
	},
	{
		label: "Code Generation",
		value: "code",
		description: "Generate code based on requirements",
	},
];

const promptTagOptions = [
	{ label: "Creative", value: "creative" },
	{ label: "Technical", value: "technical" },
	{ label: "Business", value: "business" },
	{ label: "Academic", value: "academic" },
	{ label: "Personal", value: "personal" },
];

const PromptCreateScreen: FC = () => {
	const [, setCurrentScreen] = useAtom(currentScreenAtom);
	const [generatedPrompt, setGeneratedPrompt] =
		useState<Partial<IPromptModel> | null>(null);
	const [status, setStatus] = useState<
		"type" | "tags" | "input" | "confirm" | "amend"
	>("type");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedType, setSelectedType] = useState<string | null>(null);
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [inputValue, setInputValue] = useState("");

	const onAiSubmitRequest = useCallback(async (description: string) => {
		setIsLoading(true);
		setError(null);
		try {
			const promptData = await generatePromptWithAI(description);
			setGeneratedPrompt(promptData);
			setStatus("confirm");
			return promptData;
		} catch (error) {
			logger.error("Error generating prompt:", error);
			setError("Failed to generate prompt. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleSave = useCallback(async () => {
		if (generatedPrompt) {
			setIsLoading(true);
			setError(null);
			try {
				await createPrompt(generatedPrompt);
				setCurrentScreen("list");
			} catch (error) {
				logger.error("Error saving prompt:", error);
				setError("Failed to save prompt. Please try again.");
			} finally {
				setIsLoading(false);
			}
		}
	}, [generatedPrompt, setCurrentScreen]);

	useInput((input) => {
		if (status === "confirm") {
			if (input === "q") setCurrentScreen("list");
			if (input === "s") handleSave();
			if (input === "a") setStatus("amend");
		}
	});

	const renderContent = () => {
		if (isLoading) {
			return <FireSpinner label="Processing..." />;
		}

		if (error) {
			return (
				<Box flexDirection="column">
					<Text color={THEME_COLORS.error}>{error}</Text>
					<Text>Press any key to continue</Text>
				</Box>
			);
		}

		switch (status) {
			case "type":
				return (
					<OptionSelect
						options={promptTypeOptions}
						onSelect={(option) => {
							setSelectedType(option.value);
							setStatus("tags");
						}}
						label="Select prompt type:"
						onCancel={() => setCurrentScreen("list")}
					/>
				);
			case "tags":
				return (
					<MultiOptionSelect
						options={promptTagOptions}
						onSelect={(options) => {
							setSelectedTags(options.map((o) => o.value));
							setStatus("input");
						}}
						label="Select prompt tags:"
						maxSelections={3}
						onCancel={() => setStatus("type")}
					/>
				);
			case "input":
				return (
					<Box flexDirection="column">
						<Text color={THEME_COLORS.primary}>
							Enter a description of the prompt you want:
						</Text>
						<AutoCompleteInput
							value={inputValue}
							onChange={setInputValue}
							onSubmit={onAiSubmitRequest}
							placeholder="Enter a description of the prompt you want"
							context={`User is describing a ${selectedType} prompt template. Think of typical usage of LLMs.`}
						/>
					</Box>
				);
			case "confirm":
				if (!generatedPrompt) {
					return <Text>No prompt generated</Text>;
				}
				return (
					<Box flexDirection="column">
						<Text bold color={THEME_COLORS.primary}>
							Generated Prompt:
						</Text>
						<PromptView prompt={generatedPrompt} />
						<ConfirmationDialog
							message="Do you want to save this prompt?"
							onConfirm={handleSave}
							onCancel={() => setStatus("amend")}
						/>
					</Box>
				);
			case "amend":
				return (
					<Box flexDirection="column">
						<Text color={THEME_COLORS.primary}>
							Enter additional instructions to refine the prompt:
						</Text>
						<AutoCompleteInput
							value={inputValue}
							onChange={setInputValue}
							onSubmit={onAiSubmitRequest}
							placeholder="Enter additional instructions to refine the prompt"
							context={`User is describing a ${selectedType} prompt template. Think of typical usage of LLMs.`}
						/>
					</Box>
				);
		}
	};

	return (
		<ScreenWrapper title="Create New Prompt">
			<Text bold color={THEME_COLORS.heading}>
				Create New Prompt
			</Text>
			{renderContent()}
		</ScreenWrapper>
	);
};

export default PromptCreateScreen;
