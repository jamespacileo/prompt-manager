import React, { type FC, useCallback, useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useAtom } from "jotai";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { AsyncInputHandler } from "../components/utils/AsyncInputHandler";
import { ConfirmationDialog } from "../components/utils/ConfirmationDialog";
import PromptView from "../components/prompt/PromptView";
import { PaginatedList } from "../components/utils/PaginatedList";
import FireSpinner from "../components/ui/FireSpinner";
import { THEME_COLORS } from "../uiConfig";
import { currentScreenAtom, selectedPromptAtom } from "../atoms";
import { updatePrompt } from "../commands";
import type { IPromptModel } from "../../types/interfaces";
import { updatePromptWithAI } from "../aiHelpers";

const amendOptions = [
	{ key: "all", name: "All" },
	{ key: "template", name: "Template" },
	{ key: "inputSchema", name: "Input Schema" },
	{ key: "outputSchema", name: "Output Schema" },
];

const PromptAmendScreen: FC = () => {
	const [, setCurrentScreen] = useAtom(currentScreenAtom);
	const [selectedPrompt] = useAtom(selectedPromptAtom);
	const [updatedPrompt, setUpdatedPrompt] =
		useState<Partial<IPromptModel> | null>(null);
	const [status, setStatus] = useState<"select" | "input" | "confirm">(
		"select",
	);
	const [selectedOption, setSelectedOption] = useState<
		(typeof amendOptions)[0] | null
	>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onAiSubmitSuccess = useCallback(
		async (promptData: Partial<IPromptModel>) => {
			setUpdatedPrompt(promptData);
			setStatus("confirm");
		},
		[],
	);

	const onAiSubmitRequest = useCallback(
		async (instruction: string) => {
			if (!selectedPrompt) return;
			try {
				const promptData = await updatePromptWithAI({
					currentPrompt: selectedPrompt,
					instruction,
					updateTemplate:
						selectedOption?.key === "all" || selectedOption?.key === "template",
					updateInputSchema:
						selectedOption?.key === "all" ||
						selectedOption?.key === "inputSchema",
					updateOutputSchema:
						selectedOption?.key === "all" ||
						selectedOption?.key === "outputSchema",
				});
				return promptData;
			} catch (error) {
				logger.error("Error updating prompt:", error);
				setError("Failed to update prompt. Please try again.");
			}
		},
		[selectedPrompt, selectedOption],
	);

	const handleSave = useCallback(async () => {
		if (updatedPrompt && selectedPrompt) {
			setIsLoading(true);
			setError(null);
			try {
				await updatePrompt({
					category: selectedPrompt.category,
					name: selectedPrompt.name,
					updates: updatedPrompt,
				});
				setCurrentScreen("detail");
			} catch (error) {
				logger.error("Error saving prompt:", error);
				setError("Failed to save prompt. Please try again.");
			} finally {
				setIsLoading(false);
			}
		}
	}, [updatedPrompt, selectedPrompt, setCurrentScreen]);

	const handleSelectOption = useCallback((option: (typeof amendOptions)[0]) => {
		setSelectedOption(option);
		setStatus("input");
	}, []);

	useInput((input) => {
		if (status === "confirm") {
			if (input === "q") setCurrentScreen("detail");
			if (input === "s") handleSave();
			if (input === "a") setStatus("select");
		}
	});

	if (!selectedPrompt) {
		return (
			<ScreenWrapper title="Amend Prompt">
				<Box flexDirection="column" alignItems="center" justifyContent="center">
					<Text color={THEME_COLORS.error}>No prompt selected.</Text>
					<Text color={THEME_COLORS.secondary}>
						Please select a prompt from the list.
					</Text>
					<Box marginTop={1}>
						<Text color={THEME_COLORS.primary}>
							Press any key to go back to the list.
						</Text>
					</Box>
				</Box>
			</ScreenWrapper>
		);
	}

	const renderLeftContent = () => {
		if (isLoading) {
			return <FireSpinner label="Processing..." />;
		}

		if (error) {
			return (
				<Box flexDirection="column">
					<Text color={THEME_COLORS.error}>{error}</Text>
					<Text color={THEME_COLORS.secondary}>Press any key to continue</Text>
				</Box>
			);
		}

		switch (status) {
			case "select":
				return (
					<Box flexDirection="column">
						<Text color={THEME_COLORS.primary} bold>
							Select what you want to amend:
						</Text>
						<PaginatedList
							items={amendOptions}
							itemsPerPage={amendOptions.length}
							renderItem={(item, index, isSelected) => (
								<Text
									color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}
								>
									{isSelected ? ">" : " "} {item.name}
								</Text>
							)}
							onSelectItem={handleSelectOption}
						/>
					</Box>
				);
			case "input":
				return (
					<Box flexDirection="column">
						<Text color={THEME_COLORS.primary} bold>
							Enter instructions to amend the{" "}
							{selectedOption?.name.toLowerCase()}:
						</Text>
						<AsyncInputHandler<IPromptModel>
							onSubmit={onAiSubmitRequest}
							onSuccess={onAiSubmitSuccess}
							placeholder={`Enter instructions to amend the ${selectedOption?.name.toLowerCase()}`}
							errorMessage="Failed to update prompt. Please try again."
							// context for the ai for auto complete
							context={`The current ${selectedOption?.name.toLowerCase()} is: ${selectedPrompt[selectedOption?.key as keyof IPromptModel]}`}
						/>
					</Box>
				);
			case "confirm":
				return (
					<Box flexDirection="column">
						<Text bold color={THEME_COLORS.primary}>
							Updated Prompt:
						</Text>
						<PromptView prompt={updatedPrompt || {}} />
						<ConfirmationDialog
							message="Do you want to save this updated prompt?"
							onConfirm={handleSave}
							onCancel={() => setStatus("select")}
						/>
					</Box>
				);
		}
	};

	const renderRightContent = () => (
		<Box flexDirection="column">
			<Text bold color={THEME_COLORS.primary}>
				Current Prompt:
			</Text>
			<PromptView prompt={selectedPrompt} />
		</Box>
	);

	return (
		<ScreenWrapper title="Amend Prompt">
			<Text bold color={THEME_COLORS.heading}>
				Amend Prompt: {selectedPrompt.name}
			</Text>
			<Box flexDirection="row">
				<Box
					width="50%"
					marginRight={1}
					borderStyle="single"
					borderColor={THEME_COLORS.secondary}
					padding={1}
				>
					{renderLeftContent()}
				</Box>
				<Box
					width="50%"
					marginLeft={1}
					borderStyle="single"
					borderColor={THEME_COLORS.secondary}
					padding={1}
				>
					{renderRightContent()}
				</Box>
			</Box>
		</ScreenWrapper>
	);
};

export default PromptAmendScreen;
