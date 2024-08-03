import { THEME_COLORS } from "@/cli/uiConfig";
import { Box, Text } from "ink";
import type React from "react";

export interface OptionCardProps {
	label: string;
	description?: string;
	isActive: boolean;
	isSelected: boolean;
	columns: 1 | 2 | 3;
}

const OptionCard: React.FC<OptionCardProps> = ({
	label,
	description,
	isActive,
	isSelected,
	columns,
}) => {
	const borderColor = isActive ? THEME_COLORS.primary : THEME_COLORS.secondary;
	const width = `${100 / columns}%`;

	return (
		<Box
			width={width}
			flexDirection="column"
			justifyContent="space-between"
			borderStyle="round"
			borderColor={
				isSelected
					? THEME_COLORS.selected
					: isActive
						? borderColor
						: THEME_COLORS.deselected
			}
			paddingX={1}
			paddingY={0}
			marginX={0}
			marginY={0}
		>
			<Box width="100%">
				<Text
					color={
						isSelected
							? THEME_COLORS.selected
							: isActive
								? THEME_COLORS.primary
								: undefined
					}
					bold={isActive || isSelected}
				>
					{isSelected ? "✓ " : "  "}
					{label}
				</Text>
			</Box>
			{description && (
				<Box width="100%">
					<Text
						color={isActive ? "#ffffff" : THEME_COLORS.secondary}
						dimColor={!isActive}
					>
						{"  "}
						{description.length > 50
							? `${description.slice(0, 47)}...`
							: description}
					</Text>
				</Box>
			)}
		</Box>
	);
};

export default OptionCard;
