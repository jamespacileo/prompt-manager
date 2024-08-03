import { useInput } from "ink";
import { useEffect, useState } from "react";

interface UseOptionCardGridProps<T, M extends boolean = false> {
	options: T[];
	columns?: 1 | 2 | 3;
	itemsPerPage?: number;
	isFocused: boolean;
	onSelect: M extends true
		? (selectedOptions: T[]) => void
		: (selectedOption: T) => void;
	onCancel?: () => void;
	multiSelect: M;
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
	onCancel,
	multiSelect,
}: UseOptionCardGridProps<T, M>) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [currentPage, setCurrentPage] = useState(0);
	const [selectedOptions, setSelectedOptions] = useState<T[]>([]);

	const totalPages = Math.ceil(options.length / itemsPerPage);
	const rowsPerPage = Math.ceil(itemsPerPage / columns);
	const adjustedItemsPerPage = columns * rowsPerPage;

	useEffect(() => {
		setSelectedIndex(0);
		setCurrentPage(0);
		setSelectedOptions([]);
	}, []);

	const getVisibleOptions = () => {
		const startIndex = currentPage * adjustedItemsPerPage;
		return options.slice(startIndex, startIndex + adjustedItemsPerPage);
	};

	const visibleOptions = getVisibleOptions();

	const moveSelection = (direction: "up" | "down" | "left" | "right") => {
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
				newIndex = (selectedIndex - 1 + totalItems) % totalItems;
				break;
			case "right":
				newIndex = (selectedIndex + 1) % totalItems;
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
		if (multiSelect) {
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
			} else if (input === " ") {
				toggleSelection(visibleOptions[selectedIndex]);
			} else if (key.return) {
				if (multiSelect) {
					(onSelect as (selectedOptions: T[]) => void)(selectedOptions);
				} else {
					(onSelect as (selectedOption: T) => void)(
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
	};
};