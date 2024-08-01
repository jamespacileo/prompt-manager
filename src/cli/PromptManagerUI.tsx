import React, { FC, useEffect } from "react";
import chalk from "chalk";
import { Box, Text, useApp, useInput } from "ink";
import { useAtom } from "jotai";
import Layout from "./components/ui/Layout";
import { logger } from "../utils/logger";
import { currentScreenAtom, selectedPromptAtom } from "./atoms";
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
import { useStdout } from 'ink';

const PromptManagerUI: FC = () => {
  const { exit } = useApp();
  const [currentScreen, setCurrentScreen] = useAtom(currentScreenAtom);
  const [selectedPrompt] = useAtom(selectedPromptAtom);
  const { write } = useStdout();

  useEffect(() => {
    const cleanup = () => {
      logger.info("Cleaning up...");
    };
    return cleanup;
  }, []);

  // useEffect(() => {
  //   // Clear the screen and reset cursor when the current screen changes
  //   write('\x1b[2J\x1b[0f');
  // }, [currentScreen, write]);

  useInput((input, key) => {
    if (key.escape) {
      if (currentScreen !== "home") {
        setCurrentScreen("home");
      } else {
        exit();
      }
    }
  });

  const screenComponents = {
    home: <HomeScreen onNavigate={setCurrentScreen} />,
    list: <PromptListScreen />,
    detail: selectedPrompt ? (
      <PromptDetailScreen
        prompt={selectedPrompt}
        onBack={() => setCurrentScreen("list")}
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
  };

  const renderScreen = () =>
    screenComponents[currentScreen as keyof typeof screenComponents] ?? (
      <Text>Screen not found</Text>
    );

  return (
    <Layout>
      <Header title={`Prompt Manager - ${chalk.green(currentScreen)}`} />
      <Box flexGrow={1} flexDirection="column">
        {renderScreen()}
      </Box>
      <Footer>
        <Text>Press 'Esc' to go back, 'q' to quit</Text>
      </Footer>
    </Layout>
  );
};

export default PromptManagerUI;
