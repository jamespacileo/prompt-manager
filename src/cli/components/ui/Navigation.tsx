import { Box, Text } from "ink";
import React, { FC } from "react";

import { currentScreenAtom } from "../../atoms";
import { logger } from "../../../utils/logger";
import { useAtom } from "jotai";
import { useInput } from "ink";

interface NavigationProps {
  onNavigate: (screen: string) => void;
}

const Navigation: FC<NavigationProps> = ({ onNavigate }) => {
  const [currentScreen, setCurrentScreen] = useAtom(currentScreenAtom);
  const isHome = currentScreen === "home";
  const isList = currentScreen === "list";
  const isCreate = currentScreen === "create";
  const isStatus = currentScreen === "status";

  useInput((input, key) => {
    console.log("Navigation useInput:", input, key);
    console.log(`isHome: ${isHome}`);
    if (!isHome) {
      return;
    }
    if (input === "q") {
      process.exit(0);
    }
    switch (input) {
      case "h":
        void onNavigate("home");
        break;
      case "l":
        void onNavigate("list");
        break;
      case "c":
        void onNavigate("create");
        break;
      case "s":
        void onNavigate("status");
        break;
    }
  });

  return (
    <Box>
      <Text>Home (h)</Text>
      <Text> | </Text>
      <Text>List (l)</Text>
      <Text> | </Text>
      <Text>Create (c)</Text>
      <Text> | </Text>
      <Text>Status (s)</Text>
    </Box>
  );
};

export default Navigation;
