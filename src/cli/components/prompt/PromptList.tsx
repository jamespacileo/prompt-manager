import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import { listPrompts } from "../../commands";

interface PromptListProps {
  onSelectPrompt: (prompt: any) => void;
}

const PromptList: React.FC<PromptListProps> = ({ onSelectPrompt }) => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    listPrompts().then(setPrompts);
  }, []);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(prompts.length - 1, selectedIndex + 1));
    } else if (key.return) {
      onSelectPrompt(prompts[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column">
      {prompts.map((prompt, index) => (
        <Text key={index} color={index === selectedIndex ? "green" : undefined}>
          {prompt.category}/{prompt.name} (v{prompt.version})
        </Text>
      ))}
    </Box>
  );
};

export default PromptList;
