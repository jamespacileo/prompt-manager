import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import GridOptions, { type Option } from "./GridOptions";

interface MultiSelectProps {
	options: Option[];
	onSelect: (selectedOptions: Option[]) => void;
	maxDisplayedOptions?: number;
	descriptionMaxLength?: number;
	isFocused?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
	options,
	onSelect,
	maxDisplayedOptions = 10,
	descriptionMaxLength = 50,
	isFocused = true,
}) => {
	const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
		new Set(),
	);
	const [focusedIndex, setFocusedIndex] = useState(0);

	useInput(
		(input, key) => {
			if (key.return) {
				onSelect(
					Array.from(selectedOptions)
						.map((value) => options.find((option) => option.value === value))
						.filter((option): option is Option => option !== undefined),
				);
			} else if (key.upArrow) {
				setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
			} else if (key.downArrow) {
				setFocusedIndex((prev) =>
					prev < options.length - 1 ? prev + 1 : prev,
				);
			} else if (key.tab) {
				setSelectedOptions((prev) => {
					const newSet = new Set(prev);
					const focusedOption = options[focusedIndex];
					if (focusedOption) {
						if (newSet.has(focusedOption.value)) {
							newSet.delete(focusedOption.value);
						} else {
							newSet.add(focusedOption.value);
						}
					}
					return newSet;
				});
			}
		},
		{ isActive: isFocused },
	);

	const optionsWithSelection = options.map((option) => ({
		...option,
		label: `${selectedOptions.has(option.value) ? "[x]" : "[ ]"} ${option.label}`,
	}));

	return (
		<Box flexDirection="column">
			<GridOptions
				options={optionsWithSelection}
				selectedIndex={focusedIndex}
				maxDisplayedOptions={maxDisplayedOptions}
				descriptionMaxLength={descriptionMaxLength}
				showNumbers={false}
			/>
			<Text>Press Space to select, Enter to confirm</Text>
		</Box>
	);
};

export default MultiSelect;
