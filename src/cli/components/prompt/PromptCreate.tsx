import { Box, Text, useFocus, useInput } from "ink";
import React, { useState } from "react";
import { currentScreenAtom, selectedPromptAtom } from "../../atoms";

import TextInput from "ink-text-input";
import { createPrompt } from "../../commands";
import { useAtom } from "jotai";

interface PromptCreateProps {
  onComplete: () => void;
}

const PromptCreate: React.FC<PromptCreateProps> = ({ onComplete }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("");
  const [currentScreen, setCurrentScreen] = useAtom(currentScreenAtom);
  const [selectedPrompt, setSelectedPrompt] = useAtom(selectedPromptAtom);
  const { isFocused } = useFocus({ isActive: true });
  const isHome = currentScreen === "home";

  console.log(`isFocused: ${isFocused}`, isHome, currentScreen);

  useInput((input, key) => {
    if (!isFocused) {
      console.log(`PromptCreate isFocused: ${isFocused}`);
      return;
    }
    if (input === "q") {
      process.exit(0);
    }
    if (input === "c") {
      handleSubmit();
    }
  });

  const handleSubmit = async () => {
    await createPrompt({ name, category, description, template });
    onComplete();
  };

  return (
    <Box flexDirection="column">
      <Text>Create New Prompt</Text>
      <TextInput value={name} onChange={setName} placeholder="Name" />
      <TextInput
        value={category}
        onChange={setCategory}
        placeholder="Category"
      />
      <TextInput
        value={description}
        onChange={setDescription}
        placeholder="Description"
      />
      <TextInput
        value={template}
        onChange={setTemplate}
        placeholder="Template"
      />
      <Text color="green">(C)reate Prompt</Text>
    </Box>
  );
};

export default PromptCreate;
