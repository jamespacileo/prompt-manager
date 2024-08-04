import { useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import type { Option } from "./types";

interface UseTableGridProps<T extends boolean> {
	options: Option[];
	onSelect: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	onSubmit: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	isMultiSelect: T;
	itemsPerPage?: number;
	isFocused?: boolean;
}

export const useTableGrid = <T extends boolean>({
	options,
	onSelect,
	onSubmit,
	isMultiSelect,
	itemsPerPage = 10,
	isFocused = true,
}: UseTableGridProps<T>) => {
	const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [currentPage, setCurrentPage] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const totalPages = Math.ceil(options.length / itemsPerPage);

	const visibleOptions = options.slice(
		currentPage * itemsPerPage,
		(currentPage + 1) * itemsPerPage,
	);

	const handleKeyPress = useCallback(
		(input: string, key: any) => {
			if (!isFocused) return;

			if (key.upArrow) {
				setFocusedIndex((prev) =>
					prev > 0 ? prev - 1 : visibleOptions.length - 1,
				);
			} else if (key.downArrow) {
				setFocusedIndex((prev) =>
					prev < visibleOptions.length - 1 ? prev + 1 : 0,
				);
			} else if (key.return || (isMultiSelect && input === " ")) {
				handleSelect(focusedIndex);
			} else if (key.pageUp) {
				changePage("prev");
			} else if (key.pageDown) {
				changePage("next");
			} else if (key.home) {
				setFocusedIndex(0);
			} else if (key.end) {
				setFocusedIndex(visibleOptions.length - 1);
			} else if (input === "c") {
				// Cancel/Clear selection
				setSelectedIndices([]);
			} else if (input === "s") {
				handleSubmit();
			}
		},
		[visibleOptions, focusedIndex, isMultiSelect, isFocused],
	);

	useInput(handleKeyPress);

	const handleSelect = useCallback(
		(index: number) => {
			const actualIndex = currentPage * itemsPerPage + index;
			if (isMultiSelect) {
				setSelectedIndices((prev) =>
					prev.includes(actualIndex)
						? prev.filter((i) => i !== actualIndex)
						: [...prev, actualIndex],
				);
			} else {
				setSelectedIndices([actualIndex]);
			}
			const selectedOptions = options.filter((_, i) =>
				isMultiSelect ? selectedIndices.includes(i) : i === actualIndex,
			);
			(onSelect as (selected: Option | Option[]) => void)(
				isMultiSelect ? selectedOptions : selectedOptions[0],
			);
		},
		[
			options,
			selectedIndices,
			isMultiSelect,
			currentPage,
			itemsPerPage,
			onSelect,
		],
	);

	const handleSubmit = useCallback(() => {
		if (selectedIndices.length === 0) {
			setError("Please select at least one option before submitting.");
		} else {
			const selectedOptions = options.filter((_, i) =>
				selectedIndices.includes(i),
			);
			(onSubmit as (selected: Option | Option[]) => void)(
				isMultiSelect ? selectedOptions : selectedOptions[0],
			);
			setError(null);
		}
	}, [options, selectedIndices, onSubmit, isMultiSelect]);

	const changePage = (direction: "prev" | "next") => {
		setCurrentPage((prev) => {
			if (direction === "prev" && prev > 0) return prev - 1;
			if (direction === "next" && prev < totalPages - 1) return prev + 1;
			return prev;
		});
		setFocusedIndex(0);
	};

	useEffect(() => {
		if (options.length === 0) {
			setError("No options available.");
		} else {
			setError(null);
		}
	}, [options]);

	return {
		visibleOptions,
		selectedIndices,
		focusedIndex,
		currentPage,
		totalPages,
		error,
		handleSelect,
		handleSubmit,
	};
};
