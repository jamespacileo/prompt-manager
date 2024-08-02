import React, { useState, useEffect } from "react";
import { Box, Text, Newline, useInput } from "ink";
import {
  getPromptDetails,
  deletePrompt,
  listPromptVersions,
  switchPromptVersion,
  getGeneratedTypeScript,
} from "../commands";
import chalk from "chalk";
import FireSpinner from "../components/ui/FireSpinner";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import PromptView from "../components/prompt/PromptView";
import { ConfirmationDialog } from "../components/utils/ConfirmationDialog";
import { useAtom } from "jotai";
import { IPrompt } from "../../types/interfaces";
import { currentScreenAtom, alertMessageAtom, selectedPromptAtom } from "../atoms";

interface PromptDetailScreenProps {
  prompt: { category: string; name: string };
  onBack: () => void;
  initialVersion?: string;
}

const PromptDetailScreen: React.FC<PromptDetailScreenProps> = ({
  prompt,
  onBack,
  initialVersion,
}) => {
  const [details, setDetails] = useState<Partial<IPrompt<any, any>> | null>(null);
  const [comparisonVersion, setComparisonVersion] = useState<Partial<IPrompt<any, any>> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [versions, setVersions] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
  const [, setCurrentScreen] = useAtom(currentScreenAtom);
  const [, setAlertMessage] = useAtom(alertMessageAtom);
  const [generatedTypeScript, setGeneratedTypeScript] = useState<string | null>(null);
  const [showTypeScript, setShowTypeScript] = useState(false);
  const [, setSelectedPrompt] = useAtom(selectedPromptAtom);

  useEffect(() => {
    getPromptDetails({ category: prompt.category, name: prompt.name }).then(setDetails);
    listPromptVersions({ category: prompt.category, name: prompt.name }).then((versions) => {
      setVersions(versions);
      setCurrentVersion(versions[versions.length - 1]);
      setCurrentVersionIndex(versions.length - 1);
    });
    getGeneratedTypeScript({ category: prompt.category, name: prompt.name }).then(setGeneratedTypeScript);
  }, [prompt.category, prompt.name]);

  useInput((input, key) => {
    if (input === "b" || key.escape) {
      onBack();
    } else if (input === "a") {
      setCurrentScreen("amend");
    } else if (input === "d") {
      setIsDeleting(true);
    } else if (isDeleting && input === "y") {
      deletePrompt({ category: prompt.category, name: prompt.name }).then(() => setCurrentScreen("list"));
    } else if (isDeleting && input === "n") {
      setIsDeleting(false);
    } else if (key.leftArrow || key.rightArrow) {
      const newIndex = (currentVersionIndex + (key.leftArrow ? -1 : 1) + versions.length) % versions.length;
      setCurrentVersionIndex(newIndex);
      getPromptDetails({ category: prompt.category, name: prompt.name, version: versions[newIndex] }).then(setComparisonVersion);
    } else if (input === "v") {
      switchPromptVersion({
        category: prompt.category,
        name: prompt.name,
        version: versions[currentVersionIndex],
      }).then(() => {
        setDetails(comparisonVersion);
        setComparisonVersion(null);
        setCurrentVersion(versions[currentVersionIndex]);
        setAlertMessage(`Version changed to ${versions[currentVersionIndex]}`);
        setTimeout(() => setAlertMessage(null), 3000);
      });
    } else if (input === "t") {
      setShowTypeScript(!showTypeScript);
    } else if (input === "e") {
      setSelectedPrompt(prompt);
      setCurrentScreen("evaluate");
    }
  });

  if (!details) {
    return <FireSpinner label="Loading prompt details..." />;
  }

  return (
    <ScreenWrapper title="Prompt Details">
      <Box flexDirection="column">
        <Text bold>Current Version: {currentVersion}</Text>
        {showTypeScript ? (
          <Box flexDirection="column" marginY={1}>
            <Text bold>Generated TypeScript:</Text>
            <Box marginLeft={2}>
              <Text>{generatedTypeScript}</Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="row">
            <Box width="50%">
              <PromptView prompt={details} />
            </Box>
            {comparisonVersion && (
              <Box width="50%" marginLeft={2} flexDirection="column">
                <Text bold>Comparison Version:</Text>
                <PromptView prompt={comparisonVersion} />
              </Box>
            )}
          </Box>
        )}
      </Box>
      <Newline />
      <Text>
        Press {chalk.bold.yellow("b")} to go back, {chalk.bold.yellow("a")} to amend,{" "}
        {chalk.bold.yellow("d")} to delete, {chalk.bold.yellow("v")} to set current version,{" "}
        {chalk.bold.yellow("t")} to toggle TypeScript view, {chalk.bold.yellow("e")} to evaluate
      </Text>
      {isDeleting && (
        <ConfirmationDialog
          message="Are you sure you want to delete this prompt?"
          onConfirm={() =>
            deletePrompt({ category: prompt.category, name: prompt.name }).then(() => setCurrentScreen("list"))
          }
          onCancel={() => setIsDeleting(false)}
        />
      )}
      <Box marginTop={1} flexDirection="column">
        <Text>Versions: {versions.length}</Text>
        <Text>
          {versions
            .map((version, index) =>
              index === currentVersionIndex ? chalk.green(`[${version}]`) : chalk.gray(version)
            )
            .join(" ")}
        </Text>
        <Text>Use {chalk.bold.yellow("←")} {chalk.bold.yellow("→")} arrow keys to switch versions</Text>
      </Box>
    </ScreenWrapper>
  );
};

export default PromptDetailScreen;
