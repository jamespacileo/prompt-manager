import { useInput } from "ink";
import { useEffect, useState } from "react";
import type { Option } from "../types";

interface UseOptionNavigationProps<T extends boolean> {
	options: Option[];
	isMultiSelect: T;
	maxSelections: number;
	maxVisibleOptions: number;
	isFocused: boolean;
	onSelect: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	onSubmit?: (selectedOptions: T extends true ? Option[] : Option) => void;
	onCancel?: () => void;
}

export const useOptionNavigation = <T extends boolean>({
	options,
	isMultiSelect,
	maxSelections,
	maxVisibleOptions,
	isFocused,
	onSelect,
	onSubmit,
	onCancel,
}: UseOptionNavigationProps<T>) => {
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

	const handleSelect = () => {
		if (isMultiSelect) {
			(onSelect as (selectedOptions: Option[]) => void)(selectedOptions);
		} else {
			(onSelect as (selectedOption: Option) => void)(options[selectedIndex]);
		}
	};

	const handleSubmit = () => {
		if (onSubmit) {
			if (isMultiSelect) {
				(onSubmit as (selectedOptions: Option[]) => void)(selectedOptions);
			} else {
				(onSubmit as (selectedOption: Option) => void)(options[selectedIndex]);
			}
		}
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
				handleSelect();
				handleSubmit();
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
		handleSelect,
		handleSubmit,
	};
};
