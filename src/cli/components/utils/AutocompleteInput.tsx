import type React from "react";
import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import GridOptions, { type Option } from "./GridOptions";

interface AutocompleteInputProps {
	options: Option[];
	onSelect: (option: Option) => void;
	placeholder?: string;
	maxDisplayedOptions?: number;
	descriptionMaxLength?: number;
	isFocused?: boolean;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
	options,
	onSelect,
	placeholder = "Type to search...",
	maxDisplayedOptions = 5,
	descriptionMaxLength = 50,
	isFocused = true,
}) => {
	const [inputValue, setInputValue] = useState("");
	const [filteredOptions, setFilteredOptions] = useState(options);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		const filtered = options.filter(
			(option) =>
				option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
				option.value.toLowerCase().includes(inputValue.toLowerCase()),
		);
		setFilteredOptions(filtered);
		setSelectedIndex(0);
	}, [inputValue, options]);

	useInput(
		(input, key) => {
			if (key.return) {
				onSelect(filteredOptions[selectedIndex]);
			} else if (key.upArrow) {
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
			} else if (key.downArrow) {
				setSelectedIndex((prev) =>
					prev < filteredOptions.length - 1 ? prev + 1 : prev,
				);
			} else if (key.backspace) {
				setInputValue((prev) => prev.slice(0, -1));
			} else if (!key.ctrl && !key.meta) {
				setInputValue((prev) => prev + input);
			}
		},
		{
			isActive: isFocused,
		},
	);

	return (
		<Box flexDirection="column">
			<Box>
				<Text>❯ </Text>
				<Text>{inputValue || placeholder}</Text>
			</Box>
			<GridOptions
				options={filteredOptions}
				selectedIndex={selectedIndex}
				maxDisplayedOptions={maxDisplayedOptions}
				descriptionMaxLength={descriptionMaxLength}
			/>
		</Box>
	);
};

export default AutocompleteInput;
