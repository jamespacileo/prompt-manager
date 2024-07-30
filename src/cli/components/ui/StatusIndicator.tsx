import React from "react";
import { Text } from "ink";

interface StatusIndicatorProps {
  status: "active" | "inactive" | "warning";
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const color = {
    active: "green",
    inactive: "gray",
    warning: "yellow",
  }[status];

  return <Text color={color}>●</Text>;
};

export default StatusIndicator;
