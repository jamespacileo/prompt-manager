import { Box, Text, render, useFocus } from "ink";

import React from "react";

//you need this
process.stdin.resume();

function Focus() {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text>
          Press Tab to focus next element, Shift+Tab to focus previous element,
          Esc to reset focus.
        </Text>
      </Box>
      <Item label="First" />
      <Item label="Second" />
      <Item label="Third" />
    </Box>
  );
}

function Item({ label }: any) {
  const { isFocused } = useFocus();
  return (
    <Text>
      {label} {isFocused && <Text color="green">(focused)</Text>}
    </Text>
  );
}

render(<Focus />);
