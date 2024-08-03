import type React from "react";
import { Box, Text } from "ink";

export interface Option {
	value: string;
	label: string;
	description?: string;
}

interface GridOptionsProps {
	options: Option[];
	selectedIndex?: number;
	maxDisplayedOptions?: number;
	descriptionMaxLength?: number;
	showNumbers?: boolean;
	highlightColor?: string;
}

const GridOptions: React.FC<GridOptionsProps> = ({
	options,
	selectedIndex = -1,
	maxDisplayedOptions = 10,
	descriptionMaxLength = 50,
	showNumbers = true,
	highlightColor = "green",
}) => {
	const truncate = (str: string, maxLength: number) =>
		str.length > maxLength ? str.slice(0, maxLength) + "..." : str;

	return (
		<Box flexDirection="column">
			{options.slice(0, maxDisplayedOptions).map((option, index) => (
				<Box key={option.value}>
					<Text color={index === selectedIndex ? highlightColor : undefined}>
						{showNumbers && `${index + 1}. `}
						{option.label}
					</Text>
					{option.description && (
						<Text color="gray">
							{" "}
							- {truncate(option.description, descriptionMaxLength)}
						</Text>
					)}
				</Box>
			))}
		</Box>
	);
};

export default GridOptions;
