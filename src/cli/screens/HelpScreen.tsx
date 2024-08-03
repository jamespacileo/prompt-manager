import { Box, Text } from "ink";
import React, { type FC } from "react";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { THEME_COLORS } from "../uiConfig";

const HelpScreen: FC = () => {
	return (
		<ScreenWrapper title="Help">
			<Box flexDirection="column">
				<Text bold color={THEME_COLORS.heading}>
					Help
				</Text>
				<Text>Welcome to the Prompt Manager Help Screen</Text>
				<Text>Here are some common commands and their descriptions:</Text>
				<Box marginLeft={2} flexDirection="column">
					<Text>
						<Text color={THEME_COLORS.primary}>List Prompts:</Text> View all
						available prompts
					</Text>
					<Text>
						<Text color={THEME_COLORS.primary}>Create New Prompt:</Text> Create
						a new prompt
					</Text>
					<Text>
						<Text color={THEME_COLORS.primary}>Status:</Text> View the current
						status of the Prompt Manager
					</Text>
					<Text>
						<Text color={THEME_COLORS.primary}>Help:</Text> Display this help
						screen
					</Text>
					<Text>
						<Text color={THEME_COLORS.primary}>Quit:</Text> Exit the Prompt
						Manager
					</Text>
				</Box>
				<Box marginTop={1}>
					<Text>
						Use arrow keys to navigate through menus and press Enter to select
						an option.
					</Text>
				</Box>
				<Text>
					Press Esc to go back to the previous screen or to the home screen.
				</Text>
			</Box>
		</ScreenWrapper>
	);
};

export default HelpScreen;
