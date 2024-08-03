import { Box, Text } from "ink";
import React, { type FC } from "react";
import type { Screen } from "../../types/interfaces";
import { PaginatedList } from "../components/utils/PaginatedList";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { THEME_COLORS } from "../uiConfig";

interface HomeScreenProps {
	onNavigate?: (screen: Screen) => void;
}

const menuItems = [
	{ key: "l", name: "List Prompts", screen: "list" },
	{ key: "c", name: "Create New Prompt", screen: "create" },
	{ key: "s", name: "Status", screen: "status" },
	{ key: "h", name: "Help", screen: "help" },
	{ key: "a", name: "Amend Prompt", screen: "amend" },
	{ key: "i", name: "Import Prompt", screen: "import" },
	{ key: "e", name: "Evaluate Prompt", screen: "evaluate" },
	{ key: "g", name: "Generate Prompt", screen: "generate" },
	{ key: "t", name: "Test Screen", screen: "test" }, // Added
	{ key: "q", name: "Quit", screen: "quit" },
];

const HomeScreen: FC<HomeScreenProps> = ({ onNavigate }) => {
	const handleSelectItem = (item: (typeof menuItems)[0]) => {
		if (item.screen === "quit") {
			process.exit(0);
		} else {
			void onNavigate?.(item.screen as Screen);
		}
	};

	const renderMenuItem = (
		item: (typeof menuItems)[0],
		index: number,
		isSelected: boolean,
	) => (
		<Box>
			<Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}>
				{item.key}: {item.name}
			</Text>
		</Box>
	);

	return (
		<ScreenWrapper title="Welcome to Prompt Manager">
			<Box flexDirection="column">
				<Text bold>Welcome to Prompt Manager</Text>
				<Text>Use arrow keys to navigate, Enter to select</Text>
				<PaginatedList
					items={menuItems}
					itemsPerPage={menuItems.length}
					renderItem={renderMenuItem}
					onSelectItem={handleSelectItem}
				/>
			</Box>
		</ScreenWrapper>
	);
};

export default HomeScreen;
