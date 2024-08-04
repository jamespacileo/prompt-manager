import { THEME_COLORS } from "@/cli/uiConfig";
import { Box, Text } from "ink";
import type React from "react";
import type { Option } from "./types";

interface TableRowProps {
	option: Option;
	isSelected: boolean;
	isFocused: boolean;
	isMultiSelect: boolean;
	onSelect: () => void;
}

export const TableRow: React.FC<TableRowProps> = ({
	option,
	isSelected,
	isFocused,
	isMultiSelect,
	onSelect,
}) => {
	const borderColor = isFocused ? THEME_COLORS.primary : THEME_COLORS.secondary;
	const backgroundColor = isSelected ? THEME_COLORS.selected : undefined;

	return (
		<Box
			borderStyle="round"
			borderColor={borderColor}
			// backgroundColor={backgroundColor}
			paddingX={1}
			paddingY={0}
			marginY={0}
		>
			<Box width="100%" flexDirection="column">
				<Text
					color={
						isSelected
							? THEME_COLORS.selected
							: isFocused
								? THEME_COLORS.primary
								: undefined
					}
					bold={isFocused || isSelected}
				>
					{isMultiSelect ? (isSelected ? "✓ " : "  ") : ""}
					{option.label}
				</Text>
				{option.description && (
					<Text
						color={isFocused ? "#ffffff" : THEME_COLORS.secondary}
						dimColor={!isFocused}
					>
						{"  "}
						{option.description}
					</Text>
				)}
			</Box>
		</Box>
	);
};
