import { Text } from "ink";
import type React from "react";

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
