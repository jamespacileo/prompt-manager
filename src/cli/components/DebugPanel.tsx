import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAtomValue } from 'jotai';
import { currentScreenAtom, currentWizardStepAtom, selectedPromptAtom } from '../atoms';

const DebugPanel: React.FC = () => {
  const [lastInput, setLastInput] = useState<string>('');
  const [lastKey, setLastKey] = useState<string>('');

  const currentScreen = useAtomValue(currentScreenAtom);
  const currentWizardStep = useAtomValue(currentWizardStepAtom);
  const selectedPrompt = useAtomValue(selectedPromptAtom);

  const handleInput = useCallback((input: string, key: any) => {
    setLastInput(input);
    setLastKey(Object.keys(key).filter(k => key[k as keyof typeof key]).join(', '));
  }, []);

  useInput(handleInput);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
      <Text bold>Debug Panel</Text>
      <Text>Input: {lastInput} {"||"} Key: {lastKey}</Text>
      <Text>Screen: {currentScreen} {"||"} Wizard Step: {currentWizardStep}</Text>
      <Text>Selected Prompt: {JSON.stringify(selectedPrompt, null, 2)}</Text>
    </Box>
  );
};

export default DebugPanel;
