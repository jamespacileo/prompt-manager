import { useInput } from "ink";
import { useEffect, useState } from "react";
import type { Option } from "../types";

interface UseOptionNavigationProps {
	options: Option[];
	isMultiSelect: boolean;
	maxSelections: number;
	maxVisibleOptions: number;
	isFocused: boolean;
	onSelect: (selectedOptions: Option[]) => void;
	onCancel?: () => void;
}

export const useOptionNavigation = ({
	options,
	isMultiSelect,
	maxSelections,
	maxVisibleOptions,
	isFocused,
	onSelect,
	onCancel,
}: UseOptionNavigationProps) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
		null,
	);

	const [pageIndex, setPageIndex] = useState(0);

	const optionsPerPage = maxVisibleOptions;
	const totalPages = Math.ceil(options.length / optionsPerPage);

	useEffect(() => {
		if (!isMultiSelect && options.length > 0) {
			setSelectedOptions([options[0]]);
		}
	}, [isMultiSelect, options]);

	const toggleOption = (option: Option) => {
		setSelectedOptions((prev) => {
			if (prev.includes(option)) {
				return prev.filter((o) => o !== option);
			}
			if (prev.length < maxSelections) {
				return [...prev, option];
			}
			return prev;
		});
	};

	useInput(
		(input, key) => {
			if (!isFocused) return;

			if (key.upArrow) {
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
			} else if (key.downArrow) {
				setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
			} else if (input === " " && isMultiSelect) {
				toggleOption(options[selectedIndex]);
			} else if (key.return) {
				if (isMultiSelect) {
					onSelect(selectedOptions);
				} else {
					onSelect([options[selectedIndex]]);
				}
			} else if (input === "c" && onCancel) {
				onCancel();
			} else if (key.leftArrow) {
				setPageIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
			} else if (key.rightArrow) {
				setPageIndex((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
			} else {
				// Handle search by typing
				setSearchTerm((prev) => prev + input);
				if (searchTimeout) {
					clearTimeout(searchTimeout);
				}
				const newTimeout = setTimeout(() => setSearchTerm(""), 1000);
				setSearchTimeout(newTimeout as NodeJS.Timeout);

				const searchIndex = options.findIndex((option) =>
					option.label.toLowerCase().startsWith(searchTerm.toLowerCase()),
				);
				if (searchIndex !== -1) {
					setSelectedIndex(searchIndex);
				}
			}
		},
		{
			isActive: isFocused,
		},
	);

	const startIndex = pageIndex * optionsPerPage;
	const visibleOptions = options.slice(startIndex, startIndex + optionsPerPage);

	return {
		selectedIndex,
		selectedOptions,
		searchTerm,
		pageIndex,
		totalPages,
		visibleOptions,
		toggleOption,
	};
};
