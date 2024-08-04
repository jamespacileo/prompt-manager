import Fuse from "fuse.js";
import { Box, Text, useInput } from "ink";
import Table, { CellProps } from "ink-table";
import TextInput from "ink-text-input";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { renderFullScreen } from "../Fullscreen";
import { THEME_COLORS } from "../uiConfig";
import type { Option } from "./types";

interface TableSelectComponentProps<T extends boolean> {
	options: Option[];
	onSelect: (selectedOptions: T extends true ? Option[] : Option) => void;
	onSubmit: (selectedOptions: T extends true ? Option[] : Option) => void;
	onCancel?: () => void;
	label?: string;
	helpText?: string;
	separator?: string;
	maxSelections?: number;
	isFocused?: boolean;
	isMultiSelect: T;
	itemsPerPage?: number;
}

export const TableSelectComponent = <T extends boolean>({
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
}: TableSelectComponentProps<T>) => {
	const [searchValue, setSearchValue] = useState("");
	const [gridFocused, setGridFocused] = useState(isFocused);
	const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

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
		if (input === "s") {
			setGridFocused(false);
		}
		if (input === "x") {
			setSearchValue("");
		}
		if (key.return) {
			if (isMultiSelect) {
				onSubmit(
					selectedIndices.map((index) => options[index]) as T extends true
						? Option[]
						: Option,
				);
			} else if (selectedIndices.length > 0) {
				onSubmit(
					options[selectedIndices[0]] as T extends true ? Option[] : Option,
				);
			}
		}
		if (input === "c" && onCancel) {
			onCancel();
		}
		if (key.upArrow || key.downArrow) {
			// Handle arrow key navigation
			const currentIndex = selectedIndices[0] || 0;
			const newIndex = key.upArrow
				? Math.max(0, currentIndex - 1)
				: Math.min(filteredOptions.length - 1, currentIndex + 1);
			handleSelect(filteredOptions[newIndex]);
		}
	});

	const handleSearchChange = useCallback((value: string) => {
		setSearchValue(value);
	}, []);

	const handleSearchSubmit = useCallback(() => {
		setGridFocused(true);
	}, []);

	const handleSelect = useCallback(
		(option: Option) => {
			const index = options.findIndex((o) => o.value === option.value);
			if (isMultiSelect) {
				setSelectedIndices((prev) => {
					const newIndices = prev.includes(index)
						? prev.filter((i) => i !== index)
						: [...prev, index];
					if (newIndices.length > maxSelections) {
						newIndices.shift();
					}
					onSelect(
						newIndices.map((i) => options[i]) as T extends true
							? Option[]
							: Option,
					);
					return newIndices;
				});
			} else {
				setSelectedIndices([index]);
				onSelect(option as T extends true ? Option[] : Option);
			}
		},
		[isMultiSelect, maxSelections, onSelect, options],
	);

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
					? "Use ↑↓←→ arrows to move, Space to select, Enter to confirm, C to cancel, S to focus search"
					: "Use ↑↓←→ arrows to move, Enter to select, C to cancel, S to focus search"}
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
			<Table
				data={filteredOptions.map((option, index) => ({
					...option,
					selected: selectedIndices.includes(index) ? "✓" : " ",
				}))}
				columns={["selected", "label", "value", "description"]}
			/>
		</Box>
	);
};

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
			console.log("Selected:", option);
		};

		const handleSubmit = (option: Option | Option[]) => {
			console.log("Submitted:", option);
		};

		return (
			<TableSelectComponent
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
