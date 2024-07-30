import { Box, Text, useInput } from "ink";

import React from "react";
import { deletePrompt } from "../../commands";

interface PromptDeleteProps {
  prompt: any;
  onComplete: () => void;
}

const PromptDelete: React.FC<PromptDeleteProps> = ({ prompt, onComplete }) => {
  const handleDelete = async () => {
    await deletePrompt({ category: prompt.category, name: prompt.name });
    onComplete();
  };

  useInput((input, key) => {
    if (input === "y") {
      handleDelete();
    }
    if (input === "n") {
      onComplete();
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Are you sure you want to delete this prompt?</Text>
      <Text>
        {prompt.category}/{prompt.name}
      </Text>
      <Text color="green">(Y)es, delete</Text>
      <Text color="red">(N)o, cancel</Text>
    </Box>
  );
};

export default PromptDelete;
