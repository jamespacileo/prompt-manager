import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useAtom } from "jotai";
import FireSpinner from "../components/ui/FireSpinner";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { THEME_COLORS } from "../uiConfig";
import { IPromptModel } from "../../types/interfaces";
import { currentScreenAtom, selectedPromptAtom } from "../atoms";
import { listPrompts } from "../commands";
import InteractiveElement from "../components/ui/InteractiveElement";
import { PaginatedList } from "../components/utils/PaginatedList";

const ITEMS_PER_PAGE = 10;

const PromptListScreen: React.FC = () => {
  const [prompts, setPrompts] = useState<Partial<IPromptModel>[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setCurrentScreen] = useAtom(currentScreenAtom);
  const [, setSelectedPrompt] = useAtom(selectedPromptAtom);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPrompts = async () => {
      const fetchedPrompts = await listPrompts();
      setPrompts(fetchedPrompts);
      setLoading(false);
    };
    fetchPrompts();
  }, []);

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelectPrompt = useCallback(
    (prompt: IPromptModel) => {
      setSelectedPrompt(prompt);
      setCurrentScreen("detail");
    },
    [setSelectedPrompt, setCurrentScreen],
  );

  const renderPrompt = useCallback(
    (prompt: IPromptModel, index: number, isSelected: boolean) => (
      <Box>
        <Box width={3} marginRight={1}>
          <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.secondary}>{index + 1}</Text>
        </Box>
        <Box width={20} marginRight={1}>
          <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}>{prompt.category}</Text>
        </Box>
        <Box width={30} marginRight={1}>
          <InteractiveElement isSelected={isSelected}>
            <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}>{prompt.name}</Text>
          </InteractiveElement>
        </Box>
        <Box width={10} marginRight={1}>
          <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.secondary}>v{prompt.version}</Text>
        </Box>
        {/* <Box width={10}>
        <StatusIndicator status={prompt.isActive ? 'active' : 'inactive'} />
      </Box> */}
      </Box>
    ),
    [],
  );

  useInput((input, key) => {
    if (searchMode && key.escape) {
      setSearchMode(false);
      setSearchTerm("");
    } else if (!searchMode && input === "s") {
      setSearchMode(true);
    }
  });

  if (loading) {
    return (
      <Box>
        <FireSpinner label="Loading prompts" />
      </Box>
    );
  }

  return (
    <ScreenWrapper title="Prompt List">
      <Box flexDirection="column">
        <Text bold color={THEME_COLORS.heading}>
          Prompt List
        </Text>
        {searchMode ? (
          <TextInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search prompts..."
          />
        ) : (
          <Text color={THEME_COLORS.text}>Press (S) to search</Text>
        )}
        <Box flexDirection="column" marginY={1}>
          <Box>
            <Box width={3} marginRight={1}>
              <Text bold color={THEME_COLORS.heading}>
                #
              </Text>
            </Box>
            <Box width={20} marginRight={1}>
              <Text bold color={THEME_COLORS.heading}>
                Category
              </Text>
            </Box>
            <Box width={30} marginRight={1}>
              <Text bold color={THEME_COLORS.heading}>
                Name
              </Text>
            </Box>
            <Box width={10} marginRight={1}>
              <Text bold color={THEME_COLORS.heading}>
                Version
              </Text>
            </Box>
            <Box width={10}>
              <Text bold color={THEME_COLORS.heading}>
                Status
              </Text>
            </Box>
          </Box>
          <PaginatedList
            items={filteredPrompts as IPromptModel[]}
            itemsPerPage={ITEMS_PER_PAGE}
            renderItem={renderPrompt}
            onSelectItem={handleSelectPrompt}
          />
        </Box>
      </Box>
    </ScreenWrapper>
  );
};

export default PromptListScreen;
