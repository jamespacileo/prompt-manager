import Fuse from "fuse.js";
import { Box, Text, useInput } from "ink";
import { render } from "ink";
import TextInput from "ink-text-input";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
	itemsPerPage?: number;
}

const SelectComponent = <T extends boolean>({
	options,
	onSelect,
	onSubmit,
	onCancel,
	label = "Select option(s):",
	helpText,
	separator = "─",
	itemsPerPage = 10,
	maxSelections = Number.POSITIVE_INFINITY,
	isFocused = false,
	isMultiSelect,
}: SelectComponentProps<T>) => {
	const [searchValue, setSearchValue] = useState("");
	const [gridFocused, setGridFocused] = useState(isFocused);

	const fuse = useMemo(
		() =>
			new Fuse(options, {
				keys: ["label", "value", "description"],
				threshold: 0.4,
			}),
		[options],
	);

	const filteredOptions = useMemo(() => {
		if (searchValue === "") return options;
		return fuse.search(searchValue).map((result) => result.item);
	}, [searchValue, options, fuse]);

	useInput((input, key) => {
		if (input === "s" && gridFocused) {
			setGridFocused(false);
		}
		if (input === "x" && gridFocused) {
			setSearchValue("");
			setGridFocused(true);
		}
	});

	const handleSearchChange = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	const handleSearchSubmit = useCallback(() => {
		setGridFocused(true);
	}, []);

	const handleClearSearch = useCallback(() => {
		setSearchValue("");
		setGridFocused(true);
	}, []);

	useEffect(() => {
		if (searchValue === "") {
			setGridFocused(true);
		}
	}, [searchValue]);

	return (
		<Box flexDirection="column">
			<Text bold>{label}</Text>
			{helpText && <Text color={THEME_COLORS.secondary}>{helpText}</Text>}
			<Text color={THEME_COLORS.secondary}>
				{isMultiSelect
					? "Use ↑↓ arrows to move, Space to select, Enter to confirm, C to cancel, ←→ to paginate, S to focus search"
					: "Use ↑↓ arrows to move, Enter to select, C to cancel, ←→ to paginate, S to focus search"}
			</Text>
			<Text>{separator.repeat(20)}</Text>
			<Box>
				<TextInput
					value={searchValue}
					onChange={handleSearchChange}
					onSubmit={handleSearchSubmit}
					placeholder="Type to search..."
					focus={!gridFocused}
				/>
				{searchValue && (
					<Text color={THEME_COLORS.secondary}>Press 'x' to clear</Text>
				)}
			</Box>
			<OptionCardGrid
				options={filteredOptions}
				onSelect={onSelect}
				onSubmit={onSubmit}
				onCancel={onCancel}
				isMultiSelect={isMultiSelect}
				itemsPerPage={itemsPerPage}
				isFocused={gridFocused}
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
		const handleSelect = (option: Option | Option[]) => {
			logger.log("Selected:", option);
		};

		const handleSubmit = (option: Option | Option[]) => {
			logger.log("Submitted:", option);
		};

		return (
			<SelectComponent
				options={testOptions}
				onSelect={handleSelect}
				onSubmit={handleSubmit}
				isMultiSelect={true}
				isFocused={true}
				itemsPerPage={10}
			/>
		);
	};

	await renderFullScreen(<TestComponent />);
}
import { logger } from "../../utils/logger";
