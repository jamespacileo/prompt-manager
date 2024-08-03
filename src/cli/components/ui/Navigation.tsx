import { Box, Text } from "ink";
import React, { type FC } from "react";

import { useInput } from "ink";
import { useAtom } from "jotai";
import { logger } from "../../../utils/logger";
import { currentScreenAtom } from "../../atoms";

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
		logger.info("Navigation useInput:", input, key);
		logger.info(`isHome: ${isHome}`);
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
