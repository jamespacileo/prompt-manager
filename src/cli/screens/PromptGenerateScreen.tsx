import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import FireSpinner from "../components/ui/FireSpinner";
import { generateTypes } from "../commands";
import { useAtom } from "jotai";
import { currentScreenAtom, alertMessageAtom } from "../atoms";

const PromptGenerateScreen: React.FC = () => {
  const [, setCurrentScreen] = useAtom(currentScreenAtom);
  const [, setAlertMessage] = useAtom(alertMessageAtom);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLogs([]);
    try {
      const generationLogs = await generateTypes();
      setLogs(Array.isArray(generationLogs) ? generationLogs : [generationLogs]);
      setAlertMessage("Types generated successfully");
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error("Error generating types:", error);
      setAlertMessage("Failed to generate types. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, []);

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
                <Text key={index}>{log}</Text>
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
