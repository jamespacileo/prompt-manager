import { Box, Text } from "ink";

import FireSpinner from "./FireSpinner";
import React from "react";
import chalk from "chalk";

const Header: React.FC<{ title: string }> = ({ title }) => (
  <Box width="100%" borderColor="#ea580c" borderStyle="round" paddingX={1}>
    <Box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      width="100%"
      flexGrow={1}
      gap={1}
    >
      <Text>🔥 {title} 🔥</Text>
      <Text color="grey">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </Text>
    </Box>
  </Box>
);

export default Header;
