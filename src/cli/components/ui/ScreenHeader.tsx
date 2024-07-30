import { Box, Text } from "ink";

import React from "react";
import { currentScreenAtom } from "../../atoms";
import { useAtom } from "jotai";

interface ScreenHeaderProps {
  subtitle?: string;
  title?: string;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  subtitle,
  title = "No title",
}) => {
  const [currentScreen] = useAtom(currentScreenAtom);

  return (
    <Box flexDirection="row" alignItems="center" paddingLeft={1}>
      <Text bold color="cyan">
        {title}
      </Text>
      {subtitle && <Text color="gray">| {subtitle}</Text>}
    </Box>
  );
};

export default ScreenHeader;
