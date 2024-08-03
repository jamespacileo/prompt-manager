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
		let newIndex = selectedIndex;

		switch (direction) {
			case "up":
				newIndex = (selectedIndex - columns + totalItems) % totalItems;
				break;
			case "down":
				newIndex = (selectedIndex + columns) % totalItems;
				break;
			case "left":
				newIndex =
					selectedIndex % columns === 0
						? selectedIndex + columns - 1
						: selectedIndex - 1;
				break;
			case "right":
				newIndex =
					(selectedIndex + 1) % columns === 0
						? selectedIndex - columns + 1
						: (selectedIndex + 1) % totalItems;
				break;
			case "home":
				newIndex = 0;
				break;
			case "end":
				newIndex = totalItems - 1;
				break;
		}

		setSelectedIndex(newIndex);
	};

	const changePage = (direction: "prev" | "next") => {
		if (direction === "prev" && currentPage > 0) {
			setCurrentPage(currentPage - 1);
		} else if (direction === "next" && currentPage < totalPages - 1) {
			setCurrentPage(currentPage + 1);
		}
		setSelectedIndex(0);
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
	};
};
