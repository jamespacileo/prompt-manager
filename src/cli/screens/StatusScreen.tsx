import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import FireSpinner from "../components/ui/FireSpinner";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { currentScreenAtom } from "../atoms";
import { getStatus } from "../commands";
import { useAtom } from "jotai";

const StatusScreen: React.FC = () => {
  const [, setCurrentScreen] = useAtom(currentScreenAtom);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    getStatus().then(setStatus);
  }, []);

  useInput(() => {
    setCurrentScreen("home");
  });

  if (!status) {
    return <FireSpinner label="Loading status..." />;
  }

  return (
    <ScreenWrapper title="Prompt Manager Status">
      <Text bold>Prompt Manager Status</Text>
      <Text>Total Prompts: {status.totalPrompts}</Text>
      <Text>Categories: {status.categories.join(", ")}</Text>
      <Text>Last Generated: {status.lastGenerated ?? "Never"}</Text>
      {status.warnings.map((warning: string, index: number) => (
        <Text key={index} color="yellow">{warning}</Text>
      ))}
      <Text>Press any key to go back</Text>
    </ScreenWrapper>
  );
};

export default StatusScreen;
