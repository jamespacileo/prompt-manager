import type React from "react";
import { type FC, useEffect } from "react"
import chalk from "chalk";
import { Box, Text, useApp, useInput } from "ink";
import { useAtom } from "jotai";
import type { Screen } from "../types/interfaces";
import Layout from "./components/ui/Layout";
import { logger } from "../utils/logger";
import {
	currentScreenAtom,
	currentWizardStepAtom,
	selectedPromptAtom,
} from "./atoms";
import Footer from "./components/ui/Footer";
import Header from "./components/ui/Header";
import AlertMessage from "./components/ui/AlertMessage";
import HomeScreen from "./screens/HomeScreen";
import PromptCreateScreen from "./screens/PromptCreateScreen";
import PromptDetailScreen from "./screens/PromptDetailScreen";
import PromptListScreen from "./screens/PromptListScreen";
import StatusScreen from "./screens/StatusScreen";
import HelpScreen from "./screens/HelpScreen";
import PromptAmendScreen from "./screens/PromptAmendScreen";
import PromptImportScreen from "./screens/PromptImportScreen";
import PromptEvaluationScreen from "./screens/PromptEvaluationScreen";
import PromptGenerateScreen from "./screens/PromptGenerateScreen";
import TestScreen from "./screens/TestScreen";
import DebugPanel from "./components/DebugPanel";
import { useStdout } from "ink";

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
