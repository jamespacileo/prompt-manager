import { logger } from "@/utils/logger";
import { Box, Text, useInput } from "ink";
import { useAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { alertMessageAtom, currentScreenAtom } from "../atoms";
import { generateTypes } from "../commands";
import FireSpinner from "../components/ui/FireSpinner";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";

const PromptGenerateScreen: React.FC = () => {
	const [, setCurrentScreen] = useAtom(currentScreenAtom);
	const [, setAlertMessage] = useAtom(alertMessageAtom);
	const [isGenerating, setIsGenerating] = useState(false);
	const [logs, setLogs] = useState<string[]>([]);

	const handleGenerate = useCallback(async () => {
		setIsGenerating(true);
		setLogs([]);
		try {
			const generationLogs = await generateTypes();
			setLogs(
				Array.isArray(generationLogs) ? generationLogs : [generationLogs],
			);
			setAlertMessage("Types generated successfully");
			setTimeout(() => setAlertMessage(null), 3000);
		} catch (error) {
			logger.error("Error generating types:", error);
			setAlertMessage(
				"Failed to generate types. Please try again." +
					(error instanceof Error ? `\n\n${error.message}` : ""),
			);
		} finally {
			setIsGenerating(false);
		}
	}, [setAlertMessage]);

	useEffect(() => {
		handleGenerate();
	}, [handleGenerate]);

	useInput((input, key) => {
		if (input === "b" || key.escape) {
			setCurrentScreen("home");
		}
	});

	return (
		<ScreenWrapper title="Generate Types">
			<Box flexDirection="column">
				<Text bold>Generate Types</Text>
				{isGenerating ? (
					<FireSpinner label="Generating types..." />
				) : (
					<>
						<Text>Generation complete. Logs:</Text>
						<Box flexDirection="column" marginY={1}>
							{logs.map((log, index) => (
								<Text key={`${index}-${log.slice(0, 10)}`}>{log}</Text>
							))}
						</Box>
					</>
				)}
				<Text>Press 'b' or 'Esc' to go back</Text>
			</Box>
		</ScreenWrapper>
	);
};

export default PromptGenerateScreen;
