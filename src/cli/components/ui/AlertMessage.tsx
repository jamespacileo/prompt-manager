import type React from "react";
import { Box, Text } from "ink";
import { useAtom } from "jotai";
import { alertMessageAtom } from "../../atoms";

const AlertMessage: React.FC = () => {
	const [alertMessage] = useAtom(alertMessageAtom);

	if (!alertMessage) return null;

	return (
		<Box marginY={1}>
			<Text color="yellow">{alertMessage}</Text>
		</Box>
	);
};

export default AlertMessage;
