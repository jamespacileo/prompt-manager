import { THEME_COLORS } from "@/cli/uiConfig";
import { Box, Text } from "ink";
import type React from "react";
import OptionCard from "./OptionCard";
import type { Option } from "./types";
import { useOptionCardGrid } from "./useOptionCardGrid";

interface OptionCardGridProps<T extends boolean> {
	options: Option[];
	columns?: 1 | 2 | 3;
	itemsPerPage?: number;
	isFocused: boolean;
	onSelect: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	onSubmit: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	onCancel?: () => void;
	isMultiSelect: T;
}

const OptionCardGrid = <T extends boolean>({
	options,
	columns = 2,
	itemsPerPage = 6,
	isFocused,
	onSelect,
	onSubmit,
	onCancel,
	isMultiSelect,
}: OptionCardGridProps<T>) => {
	const {
		visibleOptions,
		selectedIndex,
		currentPage,
		totalPages,
		selectedOptions,
		error,
	} = useOptionCardGrid({
		options,
		columns,
		itemsPerPage,
		isFocused,
		onSelect,
		onSubmit,
		onCancel,
		isMultiSelect: isMultiSelect,
	});

	if (error) {
		return (
			<Box>
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

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
					{isMultiSelect ? (
						<>
							<Text color={THEME_COLORS.primary}> Space</Text> to
							select/deselect, <Text color={THEME_COLORS.primary}>Enter</Text>{" "}
							to submit
						</>
					) : (
						<>
							<Text color={THEME_COLORS.primary}> Space</Text> to select,{" "}
							<Text color={THEME_COLORS.primary}>Enter</Text> to submit
						</>
					)}
				</Text>
				<Text>
					<Text color={THEME_COLORS.primary}>Ctrl+Left/Right</Text> to change
					pages, <Text color={THEME_COLORS.primary}>Home/End</Text> to jump to
					start/end
				</Text>
			</Box>
		</Box>
	);
};

export default OptionCardGrid;
