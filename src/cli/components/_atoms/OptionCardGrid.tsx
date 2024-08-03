import type React from "react";
import { Box, Text } from "ink";
import OptionCard from "./OptionCard";
import type { Option } from "../../types";
import { THEME_COLORS } from "@/cli/uiConfig";
import { useOptionCardGrid } from "./useOptionCardGrid";

interface OptionCardGridProps {
	options: Option[];
	columns?: 1 | 2 | 3;
	itemsPerPage?: number;
	isFocused: boolean;
	onSelect: (selectedOptions: Option[]) => void;
	onCancel?: () => void;
	multiSelect?: boolean;
}

const OptionCardGrid: React.FC<OptionCardGridProps> = ({
	options,
	columns = 2,
	itemsPerPage = 6,
	isFocused,
	onSelect,
	onCancel,
	multiSelect = false,
}) => {
	const {
		visibleOptions,
		selectedIndex,
		currentPage,
		totalPages,
		selectedOptions,
	} = useOptionCardGrid({
		options,
		columns,
		itemsPerPage,
		isFocused,
		onSelect,
		onCancel,
		multiSelect,
	});

	return (
		<Box flexDirection="column">
			<Box flexWrap="wrap" alignItems="flex-start">
				{visibleOptions.map((option: Option, index: number) => (
					<OptionCard
						key={option.value}
						label={option.label}
						description={option.description}
						isActive={index === selectedIndex}
						isSelected={selectedOptions.some((o) => o.value === option.value)}
						columns={columns}
					/>
				))}
			</Box>
			{totalPages > 1 && (
				<Box justifyContent="center" marginY={1}>
					<Text>
						Page {currentPage + 1} of {totalPages}
					</Text>
				</Box>
			)}
			<Box flexDirection="column">
				<Text>
					Use <Text color={THEME_COLORS.primary}>arrow keys</Text> to navigate,
					{multiSelect ? (
						<>
							<Text color={THEME_COLORS.primary}> Space</Text> to
							select/deselect, <Text color={THEME_COLORS.primary}>Enter</Text>{" "}
							to confirm,{" "}
						</>
					) : (
						<Text color={THEME_COLORS.primary}> Enter</Text>
					)}{" "}
					to choose
				</Text>
				<Text>
					<Text color={THEME_COLORS.primary}>Ctrl+Left/Right</Text> to change
					pages
				</Text>
			</Box>
		</Box>
	);
};

export default OptionCardGrid;