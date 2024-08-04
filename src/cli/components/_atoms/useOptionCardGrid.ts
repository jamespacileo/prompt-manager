import { useInput } from "ink";
import { useEffect, useMemo, useState } from "react";

interface UseOptionCardGridProps<T, M extends boolean = false> {
	options: T[];
	columns?: 1 | 2 | 3;
	itemsPerPage?: number;
	isFocused: boolean;
	onSelect: M extends true
		? (selectedOptions: T[]) => void
		: (selectedOption: T) => void;
	onSubmit: M extends true
		? (selectedOptions: T[]) => void
		: (selectedOption: T) => void;
	onCancel?: () => void;
	isMultiSelect: M;
}

export const useOptionCardGrid = <
	T extends { value: string },
	M extends boolean = false,
>({
	options,
	columns = 2,
	itemsPerPage = 6,
	isFocused,
	onSelect,
	onSubmit,
	onCancel,
	isMultiSelect,
}: UseOptionCardGridProps<T, M>) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [currentPage, setCurrentPage] = useState(0);
	const [selectedOptions, setSelectedOptions] = useState<T[]>([]);
	const [error, setError] = useState<string | null>(null);

	const totalPages = Math.ceil(options.length / itemsPerPage);
	const rowsPerPage = Math.ceil(itemsPerPage / columns);
	const adjustedItemsPerPage = columns * rowsPerPage;

	const startIndex = currentPage * adjustedItemsPerPage;
	const endIndex = startIndex + adjustedItemsPerPage;

	useEffect(() => {
		setSelectedIndex(0);
		setCurrentPage(0);
		setSelectedOptions([]);
		if (!Array.isArray(options) || options.length === 0) {
			setError("Invalid or empty options array");
		} else {
			setError(null);
		}
	}, [options]);

	const visibleOptions = useMemo(() => {
		const startIndex = currentPage * adjustedItemsPerPage;
		return options.slice(startIndex, startIndex + adjustedItemsPerPage);
	}, [options, currentPage, adjustedItemsPerPage]);

	const moveSelection = (
		direction: "up" | "down" | "left" | "right" | "home" | "end",
	) => {
		const totalItems = visibleOptions.length;
		const rows = Math.ceil(totalItems / columns);
		let currentRow = Math.floor(selectedIndex / columns);
		let currentCol = selectedIndex % columns;

		switch (direction) {
			case "up":
				currentRow = (currentRow - 1 + rows) % rows;
				break;
			case "down":
				currentRow = (currentRow + 1) % rows;
				break;
			case "left":
				if (currentCol === 0) {
					if (currentPage > 0) {
						const newPage = currentPage - 1;
						const newTotalItems = Math.min(
							adjustedItemsPerPage,
							options.length - newPage * adjustedItemsPerPage,
						);
						const newColumns = Math.min(columns, newTotalItems);
						const newSelectedIndex = currentRow * newColumns + (newColumns - 1);
						setCurrentPage(newPage);
						setSelectedIndex(newSelectedIndex);
						return;
					}
				} else {
					currentCol = (currentCol - 1 + columns) % columns;
				}
				break;
			case "right":
				if (currentCol === columns - 1) {
					if (currentPage < totalPages - 1) {
						changePage("next");
						return;
					}
				} else {
					currentCol = (currentCol + 1) % columns;
				}
				break;
			case "home":
				currentRow = 0;
				currentCol = 0;
				break;
			case "end":
				currentRow = rows - 1;
				currentCol = (totalItems - 1) % columns;
				break;
		}

		let newIndex = currentRow * columns + currentCol;
		if (newIndex >= totalItems) {
			newIndex = totalItems - 1;
		}

		setSelectedIndex(newIndex);
	};

	const changePage = (direction: "prev" | "next") => {
		let newPage = currentPage;
		if (direction === "prev" && currentPage > 0) {
			newPage = currentPage - 1;
		} else if (direction === "next" && currentPage < totalPages - 1) {
			newPage = currentPage + 1;
		}

		if (newPage !== currentPage) {
			setCurrentPage(newPage);
			const newTotalItems = Math.min(
				adjustedItemsPerPage,
				options.length - newPage * adjustedItemsPerPage,
			);
			const newSelectedIndex = direction === "prev" ? newTotalItems - 1 : 0;
			setSelectedIndex(newSelectedIndex);
		}
	};

	const toggleSelection = (option: T) => {
		if (isMultiSelect) {
			setSelectedOptions((prev) => {
				const isSelected = prev.some((o) => o.value === option.value);
				if (isSelected) {
					return prev.filter((o) => o.value !== option.value);
				}
				return [...prev, option];
			});
		} else {
			(onSelect as (selectedOption: T) => void)(option);
		}
	};

	useInput(
		(input, key) => {
			if (!isFocused) return;

			if (key.ctrl && key.leftArrow) {
				changePage("prev");
			} else if (key.ctrl && key.rightArrow) {
				changePage("next");
			} else if (key.upArrow) {
				moveSelection("up");
			} else if (key.downArrow) {
				moveSelection("down");
			} else if (key.leftArrow) {
				moveSelection("left");
			} else if (key.rightArrow) {
				moveSelection("right");
			} else if (key.pageUp) {
				moveSelection("home");
			} else if (key.pageDown) {
				moveSelection("end");
			} else if (input === " ") {
				toggleSelection(visibleOptions[selectedIndex]);
				if (!isMultiSelect) {
					(onSubmit as (selectedOption: T) => void)(
						visibleOptions[selectedIndex],
					);
				}
			} else if (key.return) {
				if (isMultiSelect) {
					(onSubmit as (selectedOptions: T[]) => void)(selectedOptions);
				} else {
					(onSubmit as (selectedOption: T) => void)(
						visibleOptions[selectedIndex],
					);
				}
			} else if (input === "c" && onCancel) {
				onCancel();
			}
		},
		{ isActive: isFocused },
	);

	return {
		visibleOptions,
		selectedIndex,
		currentPage,
		totalPages,
		selectedOptions,
		error,
		startIndex,
		endIndex,
	};
};
