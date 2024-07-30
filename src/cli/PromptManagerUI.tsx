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

const PromptManagerUI: FC = () => {
  const { exit } = useApp();
  const [currentScreen, setCurrentScreen] = useAtom(currentScreenAtom);
  const [selectedPrompt] = useAtom(selectedPromptAtom);

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
