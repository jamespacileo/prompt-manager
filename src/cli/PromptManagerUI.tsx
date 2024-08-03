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
	}, [
		initialScreen,
		initialPrompt,
		initialWizardStep,
		setCurrentScreen,
		setSelectedPrompt,
		setCurrentWizardStep,
	]);

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

	const screenComponents: Record<Screen, () => JSX.Element> = {
		home: () => (
			<HomeScreen onNavigate={(screen: Screen) => setCurrentScreen(screen)} />
		),
		list: () => <PromptListScreen />,
		detail: () =>
			selectedPrompt ? (
				<PromptDetailScreen
					prompt={selectedPrompt}
					onBack={() => setCurrentScreen("list")}
					initialVersion={initialVersion}
				/>
			) : (
				<Text>No prompt selected. Please select a prompt from the list.</Text>
			),
		create: () => <PromptCreateScreen />,
		status: () => <StatusScreen />,
		help: () => <HelpScreen />,
		amend: () => <PromptAmendScreen />,
		import: () => <PromptImportScreen />,
		evaluate: () =>
			selectedPrompt ? (
				<PromptEvaluationScreen
					prompt={selectedPrompt}
					onBack={() => setCurrentScreen("detail")}
				/>
			) : (
				<Text>No prompt selected. Please select a prompt from the list.</Text>
			),
		generate: () => <PromptGenerateScreen />,
		test: () => <TestScreen />,
	};

	const renderScreen = () => {
		const ScreenComponent = screenComponents[currentScreen as Screen];
		return ScreenComponent ? (
			<ScreenComponent />
		) : (
			<Text>Screen not found</Text>
		);
	};

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
