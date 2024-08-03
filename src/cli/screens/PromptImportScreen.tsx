import { Box, Text, useInput } from "ink";
import { useAtom } from "jotai";
import type React from "react";
import { useState } from "react";
import { alertMessageAtom, currentScreenAtom } from "../atoms";
import { importPrompt } from "../commands";
import FireSpinner from "../components/ui/FireSpinner";
import { AsyncInputHandler } from "../components/utils/AsyncInputHandler";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";

const PromptImportScreen: React.FC = () => {
	const [, setCurrentScreen] = useAtom(currentScreenAtom);
	const [, setAlertMessage] = useAtom(alertMessageAtom);
	const [isLoading, setIsLoading] = useState(false);

	const handleImport = async (path: string) => {
		setIsLoading(true);
		try {
			await importPrompt(path);
			setAlertMessage("Prompt imported successfully");
			setTimeout(() => setAlertMessage(null), 3000);
			setCurrentScreen("list");
		} catch (error) {
			logger.error("Error importing prompt:", error);
			throw new Error(
				"Failed to import prompt. Please check the file path and try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	useInput((input, key) => {
		if (input === "b" || key.escape) {
			setCurrentScreen("home");
		}
	});

	if (isLoading) {
		return <FireSpinner label="Importing prompt..." />;
	}

	return (
		<ScreenWrapper title="Import Prompt">
			<Box flexDirection="column">
				<Text bold>Import Prompt</Text>
				<Text>Enter the file path of the prompt to import:</Text>
				<AsyncInputHandler
					onSubmit={handleImport}
					onSuccess={() => {}}
					placeholder="Enter file path"
					errorMessage="Failed to import prompt. Please check the file path and try again."
					context="Importing a prompt file"
				/>
				<Text>Press 'b' or 'Esc' to go back</Text>
			</Box>
		</ScreenWrapper>
	);
};

export default PromptImportScreen;
