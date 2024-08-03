import { Box, Text } from "ink";
import { render } from "ink";
import type React from "react";
import { renderFullScreen } from "../Fullscreen";
import { THEME_COLORS } from "../uiConfig";
import OptionCardGrid from "./_atoms/OptionCardGrid";

export interface Option {
	label: string;
	value: string;
	description?: string;
}

interface SelectComponentProps<T extends boolean> {
	options: Option[];
	onSelect: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	onSubmit: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	onCancel?: () => void;
	label?: string;
	helpText?: string;
	separator?: string;
	maxSelections?: number;
	isFocused?: boolean;
	isMultiSelect: T;
	maxVisibleOptions?: number;
}

const SelectComponent = <T extends boolean>({
	options,
	onSelect,
	onSubmit,
	onCancel,
	label = "Select option(s):",
	helpText,
	separator = "─",
	maxSelections = Number.POSITIVE_INFINITY,
	isFocused = false,
	isMultiSelect,
	maxVisibleOptions = 9,
}: SelectComponentProps<T>) => {
	return (
		<Box flexDirection="column">
			<Text bold>{label}</Text>
			{helpText && <Text color={THEME_COLORS.secondary}>{helpText}</Text>}
			<Text color={THEME_COLORS.secondary}>
				{isMultiSelect
					? "Use ↑↓ arrows to move, Space to select, Enter to confirm, C to cancel, ←→ to paginate"
					: "Use ↑↓ arrows to move, Enter to select, C to cancel, ←→ to paginate"}
			</Text>
			<Text>{separator.repeat(20)}</Text>
			<OptionCardGrid
				options={options}
				onSelect={onSelect}
				onSubmit={onSubmit}
				onCancel={onCancel}
				isMultiSelect={isMultiSelect}
				// maxSelections={maxSelections}
				isFocused={isFocused}
				// maxVisibleOptions={maxVisibleOptions}
				columns={2}
			/>
		</Box>
	);
};

export default SelectComponent;

if (import.meta.main) {
	// Test code
	const generateRandomOptions = (count: number): Option[] => {
		return Array.from({ length: count }, (_, index) => ({
			label: `Option ${index + 1}`,
			value: `${index + 1}`,
			description: `This is a randomly generated option ${index + 1}`,
		}));
	};

	const testOptions: Option[] = generateRandomOptions(20);

	const TestComponent: React.FC = () => {
		const handleSelect = (option: Option) => {
			console.log("Selected:", option);
		};

		const handleSubmit = (option: Option) => {
			console.log("Submitted:", option);
		};

		return (
			<SelectComponent
				options={testOptions}
				onSelect={handleSelect}
				onSubmit={handleSubmit}
				isMultiSelect={false}
				isFocused={true}
			/>
		);
	};

	await renderFullScreen(<TestComponent />);
}
